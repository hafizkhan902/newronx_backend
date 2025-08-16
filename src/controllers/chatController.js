import BaseController from './baseController.js';
import ChatService from '../services/chatService.js';

class ChatController extends BaseController {
  constructor() {
    super();
    this.chatService = new ChatService();
  }

  // Create new chat
  createChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to create a chat');
    }

    const { type, name, members, description } = req.body;
    
    if (!type || !members || !Array.isArray(members)) {
      return this.sendBadRequest(res, 'Chat type and members array are required');
    }

    const result = await this.chatService.createChat(token, { type, name, members, description });
    
    this.sendSuccess(res, result, 'Chat created successfully.', 201);
  });

  // Get user's chats
  getUserChats = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view chats');
    }

    const { page = 1, limit = 20, type } = req.query;
    
    const result = await this.chatService.getUserChats(token, {
      page: parseInt(page),
      limit: parseInt(limit),
      type
    });
    
    this.sendSuccess(res, result, 'Chats retrieved successfully.');
  });

  // Get chat by ID
  getChatById = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view this chat');
    }

    const { chatId } = req.params;
    
    const chat = await this.chatService.getChatById(token, chatId);
    if (!chat) {
      return this.sendNotFound(res, 'Chat not found');
    }
    
    this.sendSuccess(res, chat, 'Chat retrieved successfully.');
  });

  // Update chat
  updateChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to update this chat');
    }

    const { chatId } = req.params;
    
    const result = await this.chatService.updateChat(token, chatId, req.body);
    
    this.sendSuccess(res, result, 'Chat updated successfully.');
  });

  // Delete chat
  deleteChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete this chat');
    }

    const { chatId } = req.params;
    
    await this.chatService.deleteChat(token, chatId);
    
    this.sendSuccess(res, null, 'Chat deleted successfully.');
  });

  // Add member to chat
  addMember = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to add members');
    }

    const { chatId } = req.params;
    const { userId, role = 'member' } = req.body;
    
    if (!userId) {
      return this.sendBadRequest(res, 'User ID is required');
    }

    const result = await this.chatService.addMember(token, chatId, userId, role);
    
    this.sendSuccess(res, result, 'Member added successfully.');
  });

  // Remove member from chat
  removeMember = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to remove members');
    }

    const { chatId, userId } = req.params;
    
    const result = await this.chatService.removeMember(token, chatId, userId);
    
    this.sendSuccess(res, result, 'Member removed successfully.');
  });

  // Update member role
  updateMemberRole = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to update member roles');
    }

    const { chatId, userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return this.sendBadRequest(res, 'Role is required');
    }

    const result = await this.chatService.updateMemberRole(token, chatId, userId, role);
    
    this.sendSuccess(res, result, 'Member role updated successfully.');
  });

  // Leave chat
  leaveChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to leave chat');
    }

    const { chatId } = req.params;
    
    const result = await this.chatService.leaveChat(token, chatId);
    
    this.sendSuccess(res, result, 'Successfully left the chat.');
  });

  // Get chat members
  getChatMembers = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view chat members');
    }

    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const result = await this.chatService.getChatMembers(token, chatId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Chat members retrieved successfully.');
  });

  // Search chats
  searchChats = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to search chats');
    }

    const { q, type, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return this.sendBadRequest(res, 'Search query is required');
    }
    
    const result = await this.chatService.searchChats(token, q, {
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Search results retrieved successfully.');
  });

  // Get chat statistics
  getChatStats = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view chat statistics');
    }

    const { chatId } = req.params;
    
    const stats = await this.chatService.getChatStats(token, chatId);
    if (!stats) {
      return this.sendNotFound(res, 'Chat not found');
    }
    
    this.sendSuccess(res, stats, 'Chat statistics retrieved successfully.');
  });

  // Archive chat
  archiveChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to archive this chat');
    }

    const { chatId } = req.params;
    
    const result = await this.chatService.archiveChat(token, chatId);
    
    this.sendSuccess(res, result, 'Chat archived successfully.');
  });

  // Unarchive chat
  unarchiveChat = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to unarchive this chat');
    }

    const { chatId } = req.params;
    
    const result = await this.chatService.unarchiveChat(token, chatId);
    
    this.sendSuccess(res, result, 'Chat unarchived successfully.');
  });
}

export default new ChatController();
