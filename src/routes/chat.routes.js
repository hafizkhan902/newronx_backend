import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

const router = Router();

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is chat member
const chatMemberMiddleware = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this chat.' });
    }
    
    req.chat = chat;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to check if users allow messages
const checkUsersAllowMessages = async (userIds) => {
  const users = await User.find({ _id: { $in: userIds } });
  const usersNotAllowingMessages = users.filter(user => !user.privacy.allowMessages);
  
  if (usersNotAllowingMessages.length > 0) {
    const userNames = usersNotAllowingMessages.map(user => user.fullName || user.firstName).join(', ');
    throw new Error(`Cannot send messages to: ${userNames}. They have disabled message receiving.`);
  }
  
  return users;
};

// POST /api/chats - Create new chat/group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, members, settings, relatedIdea } = req.body;
    
    // Validation
    if (!type || !['direct', 'group'].includes(type)) {
      return res.status(400).json({ message: 'Valid chat type is required (direct or group)' });
    }
    
    if (type === 'group' && !name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    if (type === 'direct' && (!members || members.length !== 1)) {
      return res.status(400).json({ message: 'Direct chat requires exactly one other member' });
    }
    
    // Check if direct chat already exists
    if (type === 'direct') {
      const otherUserId = members[0];
      const existingChat = await Chat.findOne({
        type: 'direct',
        'members.user': { $all: [req.user._id, otherUserId] }
      });
      
      if (existingChat) {
        return res.status(409).json({ 
          message: 'Direct chat already exists',
          chat: existingChat
        });
      }
    }
    
    // Validate members exist and check privacy settings
    if (members && members.length > 0) {
      try {
        const validMembers = await checkUsersAllowMessages(members);
        if (validMembers.length !== members.length) {
          return res.status(400).json({ message: 'Some members do not exist' });
        }
      } catch (error) {
        return res.status(403).json({ message: error.message });
      }
    }
    
    // Create chat
    const newChat = new Chat({
      name: type === 'group' ? name : undefined,
      description,
      type,
      creator: req.user._id,
      members: [],
      settings: settings || {},
      relatedIdea
    });
    
    // Add members
    if (members && members.length > 0) {
      for (const memberId of members) {
        newChat.members.push({
          user: memberId,
          role: 'member'
        });
      }
    }
    
    await newChat.save();
    
    // Populate member details
    await newChat.populate('members.user', 'firstName fullName avatar');
    await newChat.populate('creator', 'firstName fullName avatar');
    
    // Create system message for group creation
    if (type === 'group') {
      const systemMessage = new Message({
        chat: newChat._id,
        sender: req.user._id,
        type: 'system',
        content: `${req.user.fullName || req.user.firstName} created the group`,
        systemData: {
          action: 'group_created',
          metadata: { groupName: name }
        }
      });
      await systemMessage.save();
    }
    
    res.status(201).json({
      message: 'Chat created successfully',
      chat: newChat
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Error creating chat', error: error.message });
  }
});

// GET /api/chats - Get user's chats
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const chats = await Chat.find({
      'members.user': req.user._id,
      'members.isActive': true
    })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('members.user', 'firstName fullName avatar')
      .populate('creator', 'firstName fullName avatar')
      .populate('lastMessage')
      .lean();
    
    // Add unread message count for each chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.getUnreadCount(req.user._id, chat._id);
        return {
          ...chat,
          unreadCount
        };
      })
    );
    
    const totalChats = await Chat.countDocuments({
      'members.user': req.user._id,
      'members.isActive': true
    });
    
    res.json({
      chats: chatsWithUnread,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalChats / limit),
        totalChats,
        hasNextPage: page < Math.ceil(totalChats / limit),
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Error fetching chats', error: error.message });
  }
});

// GET /api/chats/:chatId - Get specific chat details
router.get('/:chatId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    await req.chat.populate('members.user', 'firstName fullName avatar');
    await req.chat.populate('creator', 'firstName fullName avatar');
    await req.chat.populate('relatedIdea', 'title');
    
    res.json({ chat: req.chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Error fetching chat', error: error.message });
  }
});

// PATCH /api/chats/:chatId - Update chat settings
router.patch('/:chatId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const { name, description, settings, avatar } = req.body;
    
    // Check permission
    if (!req.chat.hasPermission(req.user._id, 'edit_group')) {
      return res.status(403).json({ message: 'Permission denied. Cannot edit group settings.' });
    }
    
    // Update allowed fields
    if (name !== undefined) req.chat.name = name;
    if (description !== undefined) req.chat.description = description;
    if (avatar !== undefined) req.chat.avatar = avatar;
    if (settings) {
      req.chat.settings = { ...req.chat.settings, ...settings };
    }
    
    await req.chat.save();
    await req.chat.populate('members.user', 'firstName fullName avatar');
    
    // Create system message for group update
    const systemMessage = new Message({
      chat: req.chat._id,
      sender: req.user._id,
      type: 'system',
      content: `${req.user.fullName || req.user.firstName} updated the group`,
      systemData: {
        action: 'group_updated',
        metadata: { changes: Object.keys(req.body) }
      }
    });
    await systemMessage.save();
    
    res.json({
      message: 'Chat updated successfully',
      chat: req.chat
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ message: 'Error updating chat', error: error.message });
  }
});

// DELETE /api/chats/:chatId - Delete chat (creator only)
router.delete('/:chatId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    // Only creator can delete the chat
    if (req.chat.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Permission denied. Only creator can delete the chat.' });
    }
    
    // Delete all messages in the chat
    await Message.deleteMany({ chat: req.chat._id });
    
    // Delete the chat
    await Chat.findByIdAndDelete(req.chat._id);
    
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Error deleting chat', error: error.message });
  }
});

// POST /api/chats/:chatId/members - Add members to chat
router.post('/:chatId/members', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const { userIds, permissions } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    
    // Check permission
    if (!req.chat.hasPermission(req.user._id, 'add_member')) {
      return res.status(403).json({ message: 'Permission denied. Cannot add members.' });
    }
    
    // Check max members limit
    const currentActiveMembers = req.chat.members.filter(m => m.isActive).length;
    if (currentActiveMembers + userIds.length > req.chat.settings.maxMembers) {
      return res.status(400).json({ 
        message: `Cannot add members. Maximum limit of ${req.chat.settings.maxMembers} members reached.` 
      });
    }
    
    // Validate users exist and check privacy settings
    let users;
    try {
      users = await checkUsersAllowMessages(userIds);
      if (users.length !== userIds.length) {
        return res.status(400).json({ message: 'Some users do not exist' });
      }
    } catch (error) {
      return res.status(403).json({ message: error.message });
    }
    
    const addedMembers = [];
    
    for (const userId of userIds) {
      // Check if user is already a member
      const existingMember = req.chat.getMember(userId);
      if (existingMember) {
        continue; // Skip if already a member
      }
      
      // Add member
      req.chat.members.push({
        user: userId,
        role: 'member',
        permissions: permissions || {}
      });
      
      addedMembers.push(userId);
      
      // Create system message
      const user = users.find(u => u._id.toString() === userId);
      const systemMessage = new Message({
        chat: req.chat._id,
        sender: req.user._id,
        type: 'system',
        content: `${req.user.fullName || req.user.firstName} added ${user.fullName || user.firstName}`,
        systemData: {
          action: 'user_added',
          targetUser: userId
        }
      });
      await systemMessage.save();
    }
    
    await req.chat.save();
    await req.chat.populate('members.user', 'firstName fullName avatar');
    
    res.json({
      message: `${addedMembers.length} member(s) added successfully`,
      chat: req.chat,
      addedMembers
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ message: 'Error adding members', error: error.message });
  }
});

// DELETE /api/chats/:chatId/members/:userId - Remove member from chat
router.delete('/:chatId/members/:userId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if target user is a member
    const targetMember = req.chat.getMember(userId);
    if (!targetMember) {
      return res.status(404).json({ message: 'User is not a member of this chat' });
    }
    
    // Check permissions (can remove others or leaving yourself)
    const canRemove = req.chat.hasPermission(req.user._id, 'remove_member') || 
                     req.user._id.toString() === userId;
    
    if (!canRemove) {
      return res.status(403).json({ message: 'Permission denied. Cannot remove member.' });
    }
    
    // Cannot remove creator
    if (targetMember.role === 'creator') {
      return res.status(400).json({ message: 'Cannot remove chat creator' });
    }
    
    // Remove member (soft delete)
    targetMember.isActive = false;
    
    await req.chat.save();
    
    // Create system message
    const targetUser = await User.findById(userId);
    const isLeaving = req.user._id.toString() === userId;
    const systemMessage = new Message({
      chat: req.chat._id,
      sender: req.user._id,
      type: 'system',
      content: isLeaving 
        ? `${req.user.fullName || req.user.firstName} left the group`
        : `${req.user.fullName || req.user.firstName} removed ${targetUser.fullName || targetUser.firstName}`,
      systemData: {
        action: isLeaving ? 'user_left' : 'user_removed',
        targetUser: userId
      }
    });
    await systemMessage.save();
    
    res.json({
      message: isLeaving ? 'Left chat successfully' : 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member', error: error.message });
  }
});

// PATCH /api/chats/:chatId/members/:userId - Update member permissions
router.patch('/:chatId/members/:userId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions } = req.body;
    
    // Only creator and admins can update permissions
    const currentMember = req.chat.getMember(req.user._id);
    if (!currentMember || !['creator', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ message: 'Permission denied. Only admins can update member permissions.' });
    }
    
    // Find target member
    const targetMember = req.chat.getMember(userId);
    if (!targetMember) {
      return res.status(404).json({ message: 'User is not a member of this chat' });
    }
    
    // Cannot modify creator
    if (targetMember.role === 'creator') {
      return res.status(400).json({ message: 'Cannot modify creator permissions' });
    }
    
    // Update role and permissions
    if (role && ['admin', 'member'].includes(role)) {
      targetMember.role = role;
    }
    
    if (permissions) {
      targetMember.permissions = { ...targetMember.permissions, ...permissions };
    }
    
    await req.chat.save();
    await req.chat.populate('members.user', 'firstName fullName avatar');
    
    res.json({
      message: 'Member permissions updated successfully',
      member: targetMember
    });
  } catch (error) {
    console.error('Update member permissions error:', error);
    res.status(500).json({ message: 'Error updating member permissions', error: error.message });
  }
});

// GET /api/chats/:chatId/unread-count - Get unread message count for specific chat
router.get('/:chatId/unread-count', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user._id, req.params.chatId);
    
    res.json({
      chatId: req.params.chatId,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// POST /api/chats/:chatId/read - Mark all messages in chat as read
router.post('/:chatId/read', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    // Get all unread messages in this chat for this user
    const unreadMessages = await Message.find({
      chat: req.params.chatId,
      sender: { $ne: req.user._id },
      isDeleted: false,
      'readBy.user': { $ne: req.user._id }
    });

    // Mark all as read
    const updatePromises = unreadMessages.map(message => message.markAsRead(req.user._id));
    await Promise.all(updatePromises);

    res.json({
      message: `${unreadMessages.length} message(s) marked as read`,
      count: unreadMessages.length
    });
  } catch (error) {
    console.error('Mark chat as read error:', error);
    res.status(500).json({ message: 'Error marking chat as read', error: error.message });
  }
});

export default router; 