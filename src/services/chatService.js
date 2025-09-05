import jwt from 'jsonwebtoken';
import Chat from '../models/chat.model.js';
import User from '../models/user.model.js';

class ChatService {
  // Helper method to get user from token
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Create new chat
  async createChat(token, chatData) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { type, name, members, description } = chatData;

    // Validate chat type
    if (!['direct', 'group'].includes(type)) {
      throw new Error('Invalid chat type. Must be "direct" or "group"');
    }

    // Validate members
    if (!members || !Array.isArray(members) || members.length === 0) {
      throw new Error('Members array is required and cannot be empty');
    }

    // Check if all members exist
    const memberUsers = await User.find({ _id: { $in: members } });
    if (memberUsers.length !== members.length) {
      throw new Error('Some member IDs are invalid');
    }

    // Add current user to members if not already included
    if (!members.includes(currentUser._id.toString())) {
      members.push(currentUser._id);
    }

    // For direct chats, ensure only 2 members
    if (type === 'direct' && members.length !== 2) {
      throw new Error('Direct chats must have exactly 2 members');
    }

    // For group chats, ensure name is provided
    if (type === 'group' && (!name || name.trim() === '')) {
      throw new Error('Group chat name is required');
    }

    // Check if direct chat already exists between these users
    if (type === 'direct') {
      const existingChat = await Chat.findOne({
        type: 'direct',
        'members.user': { $all: members },
        'members.user': { $size: members.length }
      });

      if (existingChat) {
        throw new Error('Direct chat already exists between these users');
      }
    }

    // Create chat
    const chat = new Chat({
      type,
      name: type === 'group' ? name : undefined,
      description: type === 'group' ? description : undefined,
      members: members.map(memberId => ({
        user: memberId,
        role: memberId === currentUser._id.toString() ? 'admin' : 'member',
        joinedAt: new Date()
      })),
      createdBy: currentUser._id
    });

    await chat.save();

    // Populate member information
    await chat.populate('members.user', 'firstName fullName avatar');
    await chat.populate('createdBy', 'firstName fullName avatar');

    return chat;
  }

  // Get user's chats
  async getUserChats(userId, filters) {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { page, limit, type } = filters;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      'members.user': currentUser._id,
      'members.isActive': true
    };

    if (type) {
      query.type = type;
    }

    // Get chats
    const chats = await Chat.find(query)
      .populate('members.user', 'firstName fullName avatar online lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Chat.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      chats,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Get chat by ID
  async getChatById(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId)
      .populate('members.user', 'firstName fullName avatar online lastSeen')
      .populate('createdBy', 'firstName fullName avatar')
      .populate('lastMessage')
      .lean();

    if (!chat) {
      return null;
    }

    // Check if user is a member
    const isMember = chat.members.some(member => 
      member.user._id.toString() === currentUser._id.toString() && member.isActive
    );

    if (!isMember) {
      throw new Error('Access denied to this chat');
    }

    return chat;
  }

  // Update chat
  async updateChat(token, chatId, updateData) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is admin or creator
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    if (member.role !== 'admin' && chat.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Only admins can update chat settings');
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'settings'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        chat[field] = updateData[field];
      }
    });

    chat.updatedAt = new Date();
    await chat.save();

    // Populate member information
    await chat.populate('members.user', 'firstName fullName avatar');
    await chat.populate('createdBy', 'firstName fullName avatar');

    return chat;
  }

  // Delete chat
  async deleteChat(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is creator
    if (chat.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Only chat creator can delete the chat');
    }

    // Soft delete chat
    chat.isDeleted = true;
    chat.deletedAt = new Date();
    await chat.save();
  }

  // Add member to chat
  async addMember(token, chatId, userId, role = 'member') {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is admin
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    if (member.role !== 'admin' && chat.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Only admins can add members');
    }

    // Check if user is already a member
    const existingMember = chat.members.find(m => 
      m.user.toString() === userId
    );

    if (existingMember) {
      if (existingMember.isActive) {
        throw new Error('User is already a member of this chat');
      } else {
        // Reactivate member
        existingMember.isActive = true;
        existingMember.role = role;
        existingMember.joinedAt = new Date();
        existingMember.leftAt = undefined;
      }
    } else {
      // Add new member
      chat.members.push({
        user: userId,
        role,
        joinedAt: new Date()
      });
    }

    await chat.save();

    // Populate member information
    await chat.populate('members.user', 'firstName fullName avatar');

    return chat;
  }

  // Remove member from chat
  async removeMember(token, chatId, userId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is admin
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    if (member.role !== 'admin' && chat.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Only admins can remove members');
    }

    // Check if trying to remove creator
    if (chat.createdBy.toString() === userId) {
      throw new Error('Cannot remove chat creator');
    }

    // Check if trying to remove self
    if (currentUser._id.toString() === userId) {
      throw new Error('Use leaveChat to remove yourself from the chat');
    }

    // Find and deactivate member
    const targetMember = chat.members.find(m => 
      m.user.toString() === userId
    );

    if (!targetMember || !targetMember.isActive) {
      throw new Error('User is not an active member of this chat');
    }

    targetMember.isActive = false;
    targetMember.leftAt = new Date();

    await chat.save();

    return {
      message: 'Member removed successfully',
      removedMember: targetMember
    };
  }

  // Update member role
  async updateMemberRole(token, chatId, userId, role) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is admin
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    if (member.role !== 'admin' && chat.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Only admins can update member roles');
    }

    // Validate role
    if (!['member', 'admin', 'moderator'].includes(role)) {
      throw new Error('Invalid role. Must be member, admin, or moderator');
    }

    // Find target member
    const targetMember = chat.members.find(m => 
      m.user.toString() === userId
    );

    if (!targetMember || !targetMember.isActive) {
      throw new Error('User is not an active member of this chat');
    }

    // Check if trying to change creator's role
    if (chat.createdBy.toString() === userId) {
      throw new Error('Cannot change chat creator\'s role');
    }

    // Update role
    targetMember.role = role;
    targetMember.roleUpdatedAt = new Date();

    await chat.save();

    return {
      message: 'Member role updated successfully',
      updatedMember: targetMember
    };
  }

  // Leave chat
  async leaveChat(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is a member
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('You are not a member of this chat');
    }

    // Check if user is creator
    if (chat.createdBy.toString() === currentUser._id.toString()) {
      throw new Error('Chat creator cannot leave. Transfer ownership or delete the chat instead.');
    }

    // Deactivate member
    member.isActive = false;
    member.leftAt = new Date();

    await chat.save();

    return {
      message: 'Successfully left the chat',
      leftChat: chat
    };
  }

  // Get chat members
  async getChatMembers(token, chatId, pagination) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(chatId)
      .populate('members.user', 'firstName fullName avatar online lastSeen')
      .lean();

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is a member
    const isMember = chat.members.some(member => 
      member.user._id.toString() === currentUser._id.toString() && member.isActive
    );

    if (!isMember) {
      throw new Error('Access denied to this chat');
    }

    // Get active members
    const activeMembers = chat.members.filter(member => member.isActive);

    // Apply pagination
    const total = activeMembers.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedMembers = activeMembers.slice(skip, skip + limit);

    return {
      members: paginatedMembers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Search chats
  async searchChats(token, query, filters) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { type, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {
      'members.user': currentUser._id,
      'members.isActive': true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    if (type) {
      searchQuery.type = type;
    }

    // Search chats
    const chats = await Chat.find(searchQuery)
      .populate('members.user', 'firstName fullName avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Chat.countDocuments(searchQuery);
    const totalPages = Math.ceil(total / limit);

    return {
      chats,
      query,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Get chat statistics
  async getChatStats(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return null;
    }

    // Check if user is a member
    const isMember = chat.members.some(member => 
      member.user.toString() === currentUser._id.toString() && member.isActive
    );

    if (!isMember) {
      throw new Error('Access denied to this chat');
    }

    // Calculate statistics
    const stats = {
      totalMembers: chat.members.filter(m => m.isActive).length,
      activeMembers: chat.members.filter(m => m.isActive && m.user.online).length,
      admins: chat.members.filter(m => m.isActive && m.role === 'admin').length,
      moderators: chat.members.filter(m => m.isActive && m.role === 'moderator').length,
      regularMembers: chat.members.filter(m => m.isActive && m.role === 'member').length,
      chatType: chat.type,
      createdAt: chat.createdAt,
      lastActivity: chat.updatedAt
    };

    return stats;
  }

  // Archive chat
  async archiveChat(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is a member
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    // Archive chat for this user
    member.archived = true;
    member.archivedAt = new Date();

    await chat.save();

    return {
      message: 'Chat archived successfully',
      archived: true
    };
  }

  // Unarchive chat
  async unarchiveChat(token, chatId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Check if user is a member
    const member = chat.members.find(m => 
      m.user.toString() === currentUser._id.toString()
    );

    if (!member || !member.isActive) {
      throw new Error('Access denied to this chat');
    }

    // Unarchive chat for this user
    member.archived = false;
    member.archivedAt = undefined;

    await chat.save();

    return {
      message: 'Chat unarchived successfully',
      archived: false
    };
  }
}

export default ChatService;
