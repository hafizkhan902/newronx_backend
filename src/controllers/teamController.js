import BaseController from './baseController.js';
import TeamService from '../services/teamService.js';

class TeamController extends BaseController {
  constructor() {
    super();
    this.teamService = new TeamService();
  }

  // Get team structure for an idea
  getTeamStructure = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    
    if (!ideaId) {
      return this.sendBadRequest(res, 'Idea ID is required');
    }

    const teamStructure = await this.teamService.getTeamStructure(ideaId, userId);
    
    this.sendSuccess(res, teamStructure, 'Team structure retrieved successfully.');
  });

  // Add role to idea (for idea authors)
  addRole = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const { roleType, isCore, maxPositions, priority, skillsRequired, description } = req.body;
    
    if (!ideaId || !roleType) {
      return this.sendBadRequest(res, 'Idea ID and role type are required');
    }

    // Validate priority
    if (priority && ![1, 2, 3].includes(priority)) {
      return this.sendBadRequest(res, 'Priority must be 1 (Critical), 2 (Important), or 3 (Nice-to-have)');
    }

    const roleData = {
      roleType: roleType.trim(),
      isCore: isCore !== undefined ? isCore : true,
      maxPositions: maxPositions || 1,
      priority: priority || 2,
      skillsRequired: skillsRequired || [],
      description: description || ''
    };

    const result = await this.teamService.addRoleToIdea(ideaId, roleData, userId);
    
    this.sendSuccess(res, result, result.message, 201);
  });

  // Remove role from idea (for idea authors)
  removeRole = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, roleId } = req.params;
    
    if (!ideaId || !roleId) {
      return this.sendBadRequest(res, 'Idea ID and Role ID are required');
    }

    const result = await this.teamService.removeRoleFromIdea(ideaId, roleId, userId);
    
    this.sendSuccess(res, result, result.message);
  });

  // Check role conflict (utility endpoint for frontend)
  checkRoleConflict = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const { role } = req.query;
    
    if (!ideaId || !role) {
      return this.sendBadRequest(res, 'Idea ID and role are required');
    }

    const conflict = await this.teamService.checkRoleConflict(ideaId, role, {
      userId,
      checkOnly: true
    });
    
    this.sendSuccess(res, conflict, 'Role conflict check completed.');
  });

  // Get role suggestions (AI-powered)
  getRoleSuggestions = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const { baseRole, context } = req.query;
    
    if (!ideaId || !baseRole) {
      return this.sendBadRequest(res, 'Idea ID and base role are required');
    }

    // Parse context if provided
    let parsedContext = {};
    if (context) {
      try {
        parsedContext = JSON.parse(context);
      } catch (error) {
        return this.sendBadRequest(res, 'Invalid context format');
      }
    }

    const suggestions = await this.teamService.generateResolutionSuggestions(
      baseRole, 
      { _id: ideaId }, 
      parsedContext
    );
    
    this.sendSuccess(res, suggestions, 'Role suggestions generated successfully.');
  });

  // Update team member role (for idea authors)
  updateMemberRole = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId } = req.params;
    const { newRole, isLead } = req.body;
    
    if (!ideaId || !memberId || !newRole) {
      return this.sendBadRequest(res, 'Idea ID, Member ID, and new role are required');
    }

    // This would require additional implementation in TeamService
    // For now, return a placeholder response
    this.sendSuccess(res, { 
      message: 'Member role update functionality coming soon',
      ideaId,
      memberId,
      newRole,
      isLead
    }, 'Feature in development.');
  });

  // Remove team member (for idea authors)
  removeMember = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId } = req.params;
    
    if (!ideaId || !memberId) {
      return this.sendBadRequest(res, 'Idea ID and Member ID are required');
    }

    // This would require additional implementation in TeamService
    // For now, return a placeholder response
    this.sendSuccess(res, { 
      message: 'Member removal functionality coming soon',
      ideaId,
      memberId
    }, 'Feature in development.');
  });
}

export default new TeamController();
