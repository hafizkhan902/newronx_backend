import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Chat from '../models/chat.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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
    const chatId = req.params.chatId || req.body.chatId;
    const chat = await Chat.findById(chatId);
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

// Configure Cloudinary
const CLOUDINARY_CONFIG = {
  cloud_name: 'dysr0wotl',
  api_key: '556186415216556',
  api_secret: 'vFobJ4jaGdWeYmFZtsTwwBI-MpU'
};

cloudinary.config(CLOUDINARY_CONFIG);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'messages');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (filePath, messageId) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${messageId}_${timestamp}`;
    const str = `folder=messages&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.api_secret}`;
    const signature = crypto.createHash('sha1').update(str).digest('hex');

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'messages',
      public_id: publicId,
      timestamp: timestamp,
      signature: signature,
      api_key: CLOUDINARY_CONFIG.api_key,
      resource_type: 'auto' // Handles images, videos, and other files
    });

    return {
      url: result.secure_url,
      filename: path.basename(filePath),
      contentType: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary: ' + error.message);
  }
};

// GET /api/messages/:chatId - Get messages for a chat
router.get('/:chatId', authMiddleware, chatMemberMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({
      chat: req.params.chatId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'firstName fullName avatar')
      .populate('replyTo')
      .populate('readBy.user', 'firstName fullName avatar')
      .lean();
    
    // Reverse to get chronological order (oldest first)
    messages.reverse();
    
    const totalMessages = await Message.countDocuments({
      chat: req.params.chatId,
      isDeleted: false
    });
    
    res.json({
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasNextPage: page < Math.ceil(totalMessages / limit),
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// POST /api/messages - Send a new message
router.post('/', authMiddleware, upload.single('attachment'), async (req, res) => {
  try {
    const { chatId, content, type, replyTo } = req.body;
    
    // Validate chat membership
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this chat.' });
    }
    
    // Check if other chat members allow messages
    if (chat.type === 'direct') {
      const otherMemberId = chat.members.find(member => 
        member.user.toString() !== req.user._id.toString()
      )?.user;
      
      if (otherMemberId) {
        try {
          await checkUsersAllowMessages([otherMemberId]);
        } catch (error) {
          return res.status(403).json({ message: error.message });
        }
      }
    } else if (chat.type === 'group') {
      // For group chats, check if any members have disabled messages
      const memberIds = chat.members
        .filter(member => member.user.toString() !== req.user._id.toString())
        .map(member => member.user);
      
      if (memberIds.length > 0) {
        try {
          await checkUsersAllowMessages(memberIds);
        } catch (error) {
          return res.status(403).json({ message: error.message });
        }
      }
    }
    
    // Validate message content
    if (!content && !req.file) {
      return res.status(400).json({ message: 'Message content or attachment is required' });
    }
    
    // Create message
    const newMessage = new Message({
      content: content || '',
      sender: req.user._id,
      chat: chatId,
      type: type || 'text',
      replyTo: replyTo || undefined
    });
    
    // Handle file attachment
    if (req.file) {
      try {
        const uploadedFile = await uploadToCloudinary(req.file.path, newMessage._id);
        newMessage.attachments = [uploadedFile];
        newMessage.type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
        
        // Clean up local file
        fs.unlinkSync(req.file.path);
      } catch (error) {
        // Clean up local file on error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          message: 'Error uploading attachment',
          error: error.message
        });
      }
    }
    
    await newMessage.save();
    
    // Populate sender details
    await newMessage.populate('sender', 'firstName fullName avatar');
    await newMessage.populate('replyTo');
    
    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    // Clean up any uploaded file if there's an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// PATCH /api/messages/:messageId - Edit a message
router.patch('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Permission denied. You can only edit your own messages.' });
    }
    
    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }
    
    // Check if message has attachments (cannot edit file messages)
    if (message.attachments && message.attachments.length > 0) {
      return res.status(400).json({ message: 'Cannot edit messages with attachments' });
    }
    
    // Edit message
    await message.editMessage(content);
    await message.populate('sender', 'firstName fullName avatar');
    
    res.json({
      message: 'Message edited successfully',
      data: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Error editing message', error: error.message });
  }
});

// DELETE /api/messages/:messageId - Delete a message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Get chat to check permissions
    const chat = await Chat.findById(message.chat);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check permissions (sender or admin/creator with delete permission)
    const canDelete = message.sender.toString() === req.user._id.toString() || 
                     chat.hasPermission(req.user._id, 'delete_message');
    
    if (!canDelete) {
      return res.status(403).json({ message: 'Permission denied. Cannot delete this message.' });
    }
    
    // Soft delete message
    await message.deleteMessage(req.user._id);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
});

// POST /api/messages/:messageId/read - Mark message as read
router.post('/:messageId/read', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is member of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this chat.' });
    }
    
    // Mark as read
    await message.markAsRead(req.user._id);
    
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Error marking message as read', error: error.message });
  }
});

// POST /api/messages/bulk-read - Mark multiple messages as read
router.post('/bulk-read', authMiddleware, async (req, res) => {
  try {
    const { messageIds, chatId } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ message: 'Message IDs array is required' });
    }
    
    // Validate chat membership if chatId provided
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Access denied. You are not a member of this chat.' });
      }
    }
    
    // Mark all messages as read
    const updatePromises = messageIds.map(async (messageId) => {
      const message = await Message.findById(messageId);
      if (message && (!chatId || message.chat.toString() === chatId)) {
        return message.markAsRead(req.user._id);
      }
    });
    
    await Promise.all(updatePromises);
    
    res.json({ 
      message: `${messageIds.length} message(s) marked as read`,
      count: messageIds.length
    });
  } catch (error) {
    console.error('Bulk mark as read error:', error);
    res.status(500).json({ message: 'Error marking messages as read', error: error.message });
  }
});

// GET /api/messages/:chatId/unread - Get unread messages count
router.get('/:chatId/unread', authMiddleware, chatMemberMiddleware, async (req, res) => {
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

// GET /api/messages/search - Search messages across chats
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, chatId, limit = 20 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Build search filter
    const searchFilter = {
      content: { $regex: q, $options: 'i' },
      isDeleted: false,
      type: 'text'
    };
    
    // If specific chat, add chat filter
    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Access denied to this chat.' });
      }
      searchFilter.chat = chatId;
    } else {
      // Search only in chats where user is a member
      const userChats = await Chat.find({
        'members.user': req.user._id,
        'members.isActive': true
      }).select('_id');
      
      searchFilter.chat = { $in: userChats.map(chat => chat._id) };
    }
    
    const messages = await Message.find(searchFilter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'firstName fullName avatar')
      .populate('chat', 'name type')
      .lean();
    
    res.json({
      query: q,
      results: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Error searching messages', error: error.message });
  }
});

export default router; 