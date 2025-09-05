import { Router } from 'express';
import messageController from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication middleware to all message routes
router.use(authenticateToken);

// Send message
router.post('/', messageController.sendMessage);

// Get conversation with specific user
router.get('/conversation/:recipientId', messageController.getConversation);

// Get all conversations
router.get('/conversations', messageController.getConversations);

// === GROUP CHAT MESSAGING ENDPOINTS ===
// Get messages for a specific chat
router.get('/chat/:chatId', messageController.getChatMessages);

// Send message to a specific chat
router.post('/chat/:chatId', messageController.sendChatMessage);

// Mark message as read in chat
router.patch('/chat/:chatId/messages/:messageId/read', messageController.markChatMessageAsRead);

// Mark message as read
router.patch('/:messageId/read', messageController.markAsRead);

// Mark conversation as read
router.patch('/conversation/:recipientId/read', messageController.markConversationAsRead);

// Delete message
router.delete('/:messageId', messageController.deleteMessage);

// Get unread count
router.get('/unread/count', messageController.getUnreadCount);

// Search messages
router.get('/search', messageController.searchMessages);

// Get specific message
router.get('/:messageId', messageController.getMessageById);

// Forward message
router.post('/:messageId/forward', messageController.forwardMessage);

// React to message
router.post('/:messageId/reactions', messageController.reactToMessage);

// Remove reaction
router.delete('/:messageId/reactions', messageController.removeReaction);

export default router; 