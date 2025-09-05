import { Router } from 'express';
import teamController from '../controllers/teamController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication middleware to all team routes
router.use(authenticateToken);

// Team structure management
router.get('/:ideaId/structure', teamController.getTeamStructure);
router.post('/:ideaId/roles', teamController.addRole);
router.delete('/:ideaId/roles/:roleId', teamController.removeRole);

// Role conflict and suggestions
router.get('/:ideaId/check-conflict', teamController.checkRoleConflict);
router.get('/:ideaId/role-suggestions', teamController.getRoleSuggestions);

// Team member management
router.patch('/:ideaId/members/:memberId/role', teamController.updateMemberRole);
router.delete('/:ideaId/members/:memberId', teamController.removeMember);

export default router;
