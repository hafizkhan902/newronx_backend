import { Router } from 'express';
import messageController from '../controllers/messageController.js';

const router = Router();

// Send message
router.post('/', messageController.sendMessage);

// Get conversation with specific user
router.get('/conversation/:recipientId', messageController.getConversation);

// Get all conversations
router.get('/conversations', messageController.getConversations);

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