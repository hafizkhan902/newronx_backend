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
router.patch('/:ideaId/members/:memberId/leadership', teamController.updateMemberLeadership);
router.delete('/:ideaId/members/:memberId', teamController.removeMember);

// Manual subrole management
router.post('/:ideaId/members/:memberId/subroles', teamController.addSubroleMember);
router.get('/subrole-options', teamController.getSubroleOptions);
router.get('/:ideaId/search-users', teamController.searchUsersForSubrole);
router.get('/:ideaId/members/:memberId/subroles', teamController.getSubrolesForMember);
router.delete('/:ideaId/members/:memberId/subroles/:subroleMemberId', teamController.removeSubroleMember);

export default router;
