import { Router } from 'express';
import chatController from '../controllers/chatController.js';

const router = Router();

// Chat management
router.post('/', chatController.createChat);
router.get('/', chatController.getUserChats);
router.get('/:chatId', chatController.getChatById);
router.put('/:chatId', chatController.updateChat);
router.delete('/:chatId', chatController.deleteChat);

// Member management
router.post('/:chatId/members', chatController.addMember);
router.delete('/:chatId/members/:userId', chatController.removeMember);
router.patch('/:chatId/members/:userId/role', chatController.updateMemberRole);
router.post('/:chatId/leave', chatController.leaveChat);
router.get('/:chatId/members', chatController.getChatMembers);

// Chat operations
router.get('/search', chatController.searchChats);
router.get('/:chatId/stats', chatController.getChatStats);
router.post('/:chatId/archive', chatController.archiveChat);
router.post('/:chatId/unarchive', chatController.unarchiveChat);

export default router; 