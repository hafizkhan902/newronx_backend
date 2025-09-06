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

  // Remove team member (for idea authors and team leaders)
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

    const result = await this.teamService.removeTeamMember(ideaId, memberId, userId);
    
    this.sendSuccess(res, result, result.message);
  });

  // Add subrole member manually
  addSubroleMember = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId } = req.params;
    const { newUserId, subroleData } = req.body;
    
    if (!ideaId || !memberId || !newUserId || !subroleData) {
      return this.sendBadRequest(res, 'Idea ID, Member ID, new user ID, and subrole data are required');
    }

    // Validate subrole data
    if (!subroleData.title && !subroleData.level) {
      return this.sendBadRequest(res, 'Subrole data must include either title or level');
    }

    const result = await this.teamService.addSubroleMember(ideaId, memberId, newUserId, subroleData, userId);
    
    this.sendSuccess(res, result, result.message, 201);
  });

  // Get subrole options for a role
  getSubroleOptions = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { roleType } = req.query;
    
    if (!roleType) {
      return this.sendBadRequest(res, 'Role type is required');
    }

    const options = await this.teamService.getSubroleOptions(roleType);
    
    this.sendSuccess(res, { subroleOptions: options }, 'Subrole options retrieved successfully.');
  });

  // Search users for subrole assignment
  searchUsersForSubrole = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const { q: searchQuery, excludeMembers } = req.query;
    
    if (!ideaId) {
      return this.sendBadRequest(res, 'Idea ID is required');
    }

    const users = await this.teamService.searchUsersForSubrole(
      searchQuery || '', 
      ideaId, 
      excludeMembers !== 'false'
    );
    
    this.sendSuccess(res, { users }, 'User search completed successfully.');
  });

  // Get subroles for a specific parent member
  getSubrolesForMember = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId } = req.params;
    
    if (!ideaId || !memberId) {
      return this.sendBadRequest(res, 'Idea ID and Member ID are required');
    }

    const result = await this.teamService.getSubrolesForMember(ideaId, memberId, userId);
    
    this.sendSuccess(res, result, 'Subroles retrieved successfully.');
  });

  // Remove subrole member
  removeSubroleMember = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId, subroleMemberId } = req.params;
    
    if (!ideaId || !memberId || !subroleMemberId) {
      return this.sendBadRequest(res, 'Idea ID, Member ID, and Subrole Member ID are required');
    }

    const result = await this.teamService.removeSubroleMember(ideaId, memberId, subroleMemberId, userId);
    
    this.sendSuccess(res, result, result.message);
  });

  // Update member leadership status
  updateMemberLeadership = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId, memberId } = req.params;
    const { isLead } = req.body;
    
    if (!ideaId || !memberId) {
      return this.sendBadRequest(res, 'Idea ID and Member ID are required');
    }

    if (typeof isLead !== 'boolean') {
      return this.sendBadRequest(res, 'isLead must be a boolean value');
    }

    const result = await this.teamService.updateMemberLeadership(ideaId, memberId, isLead, userId);
    
    this.sendSuccess(res, result, result.message);
  });
}

export default new TeamController();
