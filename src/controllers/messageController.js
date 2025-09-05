import BaseController from './baseController.js';
import MessageService from '../services/messageService.js';

class MessageController extends BaseController {
  constructor() {
    super();
    this.messageService = new MessageService();
  }

  // Send message
  sendMessage = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { recipientId, content, type = 'text' } = req.body;
    
    if (!recipientId || !content) {
      return this.sendBadRequest(res, 'Recipient ID and content are required');
    }

    const result = await this.messageService.sendMessage(userId, recipientId, content, type);
    
    this.sendSuccess(res, result, 'Message sent successfully.');
  });

  // Get conversation messages
  getConversation = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view messages');
    }

    const { recipientId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const result = await this.messageService.getConversation(token, recipientId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Conversation retrieved successfully.');
  });

  // Get all conversations
  getConversations = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view conversations');
    }

    const { page = 1, limit = 20 } = req.query;
    
    const result = await this.messageService.getConversations(token, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Conversations retrieved successfully.');
  });

  // Mark message as read
  markAsRead = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to mark messages as read');
    }

    const { messageId } = req.params;
    
    const result = await this.messageService.markAsRead(token, messageId);
    
    this.sendSuccess(res, result, 'Message marked as read.');
  });

  // Mark conversation as read
  markConversationAsRead = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to mark conversation as read');
    }

    const { recipientId } = req.params;
    
    const result = await this.messageService.markConversationAsRead(token, recipientId);
    
    this.sendSuccess(res, result, 'Conversation marked as read.');
  });

  // Delete message
  deleteMessage = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete this message');
    }

    const { messageId } = req.params;
    
    await this.messageService.deleteMessage(token, messageId);
    
    this.sendSuccess(res, null, 'Message deleted successfully.');
  });

  // Get unread count
  getUnreadCount = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view unread count');
    }

    const count = await this.messageService.getUnreadCount(token);
    
    this.sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully.');
  });

  // Search messages
  searchMessages = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to search messages');
    }

    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return this.sendBadRequest(res, 'Search query is required');
    }
    
    const result = await this.messageService.searchMessages(token, q, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Search results retrieved successfully.');
  });

  // Get message by ID
  getMessageById = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view this message');
    }

    const { messageId } = req.params;
    
    const message = await this.messageService.getMessageById(token, messageId);
    if (!message) {
      return this.sendNotFound(res, 'Message not found');
    }
    
    this.sendSuccess(res, message, 'Message retrieved successfully.');
  });

  // Forward message
  forwardMessage = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to forward this message');
    }

    const { messageId } = req.params;
    const { recipientIds } = req.body;
    
    if (!recipientIds || !Array.isArray(recipientIds)) {
      return this.sendBadRequest(res, 'Recipient IDs array is required');
    }
    
    const result = await this.messageService.forwardMessage(token, messageId, recipientIds);
    
    this.sendSuccess(res, result, 'Message forwarded successfully.');
  });

  // React to message
  reactToMessage = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to react to this message');
    }

    const { messageId } = req.params;
    const { reaction } = req.body;
    
    if (!reaction) {
      return this.sendBadRequest(res, 'Reaction is required');
    }
    
    const result = await this.messageService.reactToMessage(token, messageId, reaction);
    
    this.sendSuccess(res, result, 'Reaction added successfully.');
  });

  // Remove reaction
  removeReaction = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to remove this reaction');
    }

    const { messageId } = req.params;
    
    const result = await this.messageService.removeReaction(token, messageId);
    
    this.sendSuccess(res, result, 'Reaction removed successfully.');
  });

  // === GROUP CHAT MESSAGING METHODS ===

  // Get messages for a specific chat
  getChatMessages = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    if (!chatId) {
      return this.sendBadRequest(res, 'Chat ID is required');
    }

    const result = await this.messageService.getChatMessages(userId, chatId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Chat messages retrieved successfully.');
  });

  // Send message to a specific chat
  sendChatMessage = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { chatId } = req.params;
    const { content, type = 'text', replyTo } = req.body;
    
    if (!chatId || !content) {
      return this.sendBadRequest(res, 'Chat ID and content are required');
    }

    const result = await this.messageService.sendChatMessage(userId, chatId, {
      content,
      type,
      replyTo
    });
    
    this.sendSuccess(res, result, 'Message sent successfully.', 201);
  });

  // Mark message as read in chat
  markChatMessageAsRead = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { chatId, messageId } = req.params;
    
    if (!chatId || !messageId) {
      return this.sendBadRequest(res, 'Chat ID and Message ID are required');
    }

    const result = await this.messageService.markChatMessageAsRead(userId, chatId, messageId);
    
    this.sendSuccess(res, result, 'Message marked as read successfully.');
  });
}

export default new MessageController();
