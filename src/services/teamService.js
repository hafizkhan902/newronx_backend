import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';
import RoleDefinition from '../models/roleDefinition.model.js';

class TeamService {
  // Check for role conflicts when accepting an approach
  async checkRoleConflict(ideaId, requestedRole, context = {}) {
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Use the idea's built-in conflict checking
    const basicConflict = idea.checkRoleConflict(requestedRole);
    
    if (basicConflict.hasConflict) {
      // Enhance with AI-powered suggestions
      const suggestions = await this.generateResolutionSuggestions(requestedRole, idea, context);
      
      return {
        ...basicConflict,
        suggestions,
        resolutionOptions: this.generateResolutionOptions(basicConflict, requestedRole, context)
      };
    }

    return basicConflict;
  }

  // Generate smart subrole suggestions
  async generateResolutionSuggestions(requestedRole, idea, context) {
    try {
      // Get role definition for suggestions
      const roleDefinitions = await RoleDefinition.findSimilarRoles(requestedRole);
      
      if (roleDefinitions.length === 0) {
        // Fallback to pattern-based suggestions
        return this.generatePatternBasedSuggestions(requestedRole);
      }

      const primaryRole = roleDefinitions[0];
      const suggestions = await RoleDefinition.suggestSubroles(requestedRole, {
        projectType: idea.category,
        existingTeam: idea.teamStructure.teamComposition,
        ideaScope: idea.description
      });

      return {
        subroles: suggestions.slice(0, 5),
        alternatives: await this.generateAlternativeRoles(requestedRole, idea),
        patterns: this.generatePatternBasedSuggestions(requestedRole)
      };
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return {
        subroles: this.generatePatternBasedSuggestions(requestedRole),
        alternatives: [],
        patterns: []
      };
    }
  }

  // Generate pattern-based suggestions as fallback
  generatePatternBasedSuggestions(baseRole) {
    const patterns = {
      'developer': ['Senior Developer', 'Junior Developer', 'Lead Developer', 'Full Stack Developer'],
      'frontend developer': ['Senior Frontend Developer', 'React Developer', 'UI Developer', 'Mobile Frontend Developer'],
      'backend developer': ['Senior Backend Developer', 'API Developer', 'Database Developer', 'DevOps Engineer'],
      'designer': ['UI Designer', 'UX Designer', 'Graphic Designer', 'Product Designer'],
      'marketing': ['Digital Marketing', 'Content Marketing', 'Growth Marketing', 'Social Media Marketing'],
      'business': ['Business Development', 'Strategy', 'Operations', 'Product Management'],
      'data scientist': ['Senior Data Scientist', 'ML Engineer', 'Data Analyst', 'AI Researcher']
    };

    const normalizedRole = baseRole.toLowerCase();
    
    // Find matching pattern
    for (const [pattern, suggestions] of Object.entries(patterns)) {
      if (normalizedRole.includes(pattern) || pattern.includes(normalizedRole)) {
        return suggestions.map(suggestion => ({
          name: suggestion,
          fullName: suggestion,
          description: `Specialized ${suggestion} role`,
          skillLevel: this.extractSkillLevel(suggestion)
        }));
      }
    }

    // Generic fallback
    return [
      { name: `Senior ${baseRole}`, fullName: `Senior ${baseRole}`, skillLevel: 'senior' },
      { name: `Lead ${baseRole}`, fullName: `Lead ${baseRole}`, skillLevel: 'lead' },
      { name: `${baseRole} Specialist`, fullName: `${baseRole} Specialist`, skillLevel: 'specialist' }
    ];
  }

  // Generate alternative role suggestions
  async generateAlternativeRoles(requestedRole, idea) {
    const existingRoles = idea.teamStructure.teamComposition.map(member => member.roleType);
    const neededRoles = idea.teamStructure.rolesNeeded
      .filter(role => role.currentPositions < role.maxPositions)
      .map(role => role.roleType);

    return neededRoles.filter(role => 
      !existingRoles.includes(role) && 
      role.toLowerCase() !== requestedRole.toLowerCase()
    ).slice(0, 3);
  }

  // Generate resolution options for conflicts
  generateResolutionOptions(conflict, requestedRole, context) {
    const options = [];

    // Option 1: Create subrole
    options.push({
      type: 'create_subrole',
      title: 'Add as Specialized Role',
      description: `Create a specialized version of ${requestedRole}`,
      action: 'subrole',
      suggestedRole: `Senior ${requestedRole}`,
      icon: '🎯'
    });

    // Option 2: Replace existing (if applicable)
    if (conflict.existingMember) {
      options.push({
        type: 'replace_existing',
        title: 'Replace Current Member',
        description: `Replace ${conflict.existingMember.assignedRole} with new applicant`,
        action: 'replace',
        currentMember: conflict.existingMember,
        icon: '🔄'
      });
    }

    // Option 3: Decline approach
    options.push({
      type: 'decline_approach',
      title: 'Decline Application',
      description: 'Politely decline this approach',
      action: 'decline',
      icon: '❌'
    });

    // Option 4: Increase capacity (if role exists in rolesNeeded)
    if (conflict.roleNeeded) {
      options.push({
        type: 'increase_capacity',
        title: 'Increase Team Capacity',
        description: `Allow multiple ${requestedRole}s on the team`,
        action: 'expand',
        currentCapacity: conflict.roleNeeded.maxPositions,
        icon: '📈'
      });
    }

    return options;
  }

  // Accept approach with conflict resolution
  async acceptApproachWithResolution(ideaId, approachId, resolution) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    const approach = idea.approaches.id(approachId);
    if (!approach) {
      throw new Error('Approach not found');
    }

    let result;

    switch (resolution.action) {
      case 'subrole':
        result = await this.acceptAsSubrole(idea, approach, resolution);
        break;
      case 'replace':
        result = await this.replaceExistingMember(idea, approach, resolution);
        break;
      case 'expand':
        result = await this.expandRoleCapacity(idea, approach, resolution);
        break;
      default:
        throw new Error('Invalid resolution action');
    }

    // Update approach status
    approach.status = 'selected';
    approach.statusUpdatedAt = new Date();
    approach.statusUpdatedBy = resolution.authorId;

    await idea.save();

    return result;
  }

  // Accept approach as subrole
  async acceptAsSubrole(idea, approach, resolution) {
    const roleData = {
      assignedRole: resolution.suggestedRole || `Senior ${approach.role}`,
      roleType: resolution.suggestedRole || `Senior ${approach.role}`,
      isLead: resolution.isLead || false
    };

    const newMember = idea.addTeamMember(approach.user._id, roleData, resolution.authorId);
    
    return {
      action: 'subrole_created',
      member: newMember,
      message: `${approach.user.fullName} added as ${roleData.assignedRole}`,
      teamMetrics: idea.getTeamMetrics()
    };
  }

  // Replace existing team member
  async replaceExistingMember(idea, approach, resolution) {
    // Remove existing member
    const removedMember = idea.removeTeamMember(resolution.currentMember.user);
    
    // Add new member with same role
    const roleData = {
      assignedRole: approach.role,
      roleType: approach.role,
      isLead: resolution.currentMember.isLead || false
    };

    const newMember = idea.addTeamMember(approach.user._id, roleData, resolution.authorId);

    return {
      action: 'member_replaced',
      removedMember,
      newMember,
      message: `${approach.user.fullName} replaced ${removedMember.assignedRole}`,
      teamMetrics: idea.getTeamMetrics()
    };
  }

  // Expand role capacity
  async expandRoleCapacity(idea, approach, resolution) {
    // Find and update the role capacity
    const roleNeeded = idea.teamStructure.rolesNeeded.find(role => 
      role.normalizedRoleType === approach.role.toLowerCase().trim()
    );

    if (roleNeeded) {
      roleNeeded.maxPositions += 1;
    } else {
      // Create new role entry
      idea.addRoleNeeded({
        roleType: approach.role,
        maxPositions: 2, // Expanding to 2
        priority: 2
      });
    }

    // Add team member
    const roleData = {
      assignedRole: approach.role,
      roleType: approach.role
    };

    const newMember = idea.addTeamMember(approach.user._id, roleData, resolution.authorId);

    return {
      action: 'capacity_expanded',
      member: newMember,
      expandedRole: roleNeeded || idea.teamStructure.rolesNeeded[idea.teamStructure.rolesNeeded.length - 1],
      message: `Team capacity expanded. ${approach.user.fullName} added as ${approach.role}`,
      teamMetrics: idea.getTeamMetrics()
    };
  }

  // Get team structure for an idea
  async getTeamStructure(ideaId, userId) {
    const idea = await Idea.findById(ideaId)
      .populate('author', 'firstName fullName avatar')
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar online lastSeen')
      .populate('teamStructure.teamComposition.assignedBy', 'firstName fullName')
      .populate('approaches.user', 'firstName fullName avatar');

    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if user has permission to view team structure
    const isAuthor = idea.author._id.toString() === userId.toString();
    const isMember = idea.teamStructure.teamComposition.some(member => 
      member.user._id.toString() === userId.toString() && member.status === 'active'
    );

    if (!isAuthor && !isMember && idea.team.accessLevel === 'private') {
      throw new Error('Access denied to team structure');
    }

    const teamMetrics = idea.getTeamMetrics();
    const pendingApproaches = idea.approaches.filter(approach => approach.status === 'pending');

    return {
      ideaId: idea._id,
      ideaTitle: idea.title,
      author: idea.author,
      teamMetrics,
      teamStructure: {
        rolesNeeded: idea.teamStructure.rolesNeeded.map(role => ({
          ...role.toObject(),
          applications: pendingApproaches.filter(approach => 
            approach.role.toLowerCase().trim() === role.normalizedRoleType
          ).length
        })),
        teamComposition: idea.teamStructure.teamComposition.filter(member => member.status === 'active'),
        isTeamComplete: idea.teamStructure.isTeamComplete,
        teamFormationDate: idea.teamStructure.teamFormationDate,
        lastUpdate: idea.teamStructure.lastTeamUpdate
      },
      permissions: {
        canManageTeam: isAuthor,
        canViewDetails: isAuthor || isMember,
        canApply: !isAuthor && !isMember
      }
    };
  }

  // Utility method to extract skill level from role name
  extractSkillLevel(roleName) {
    const skillLevels = ['junior', 'mid', 'senior', 'lead', 'specialist', 'principal'];
    const lowerName = roleName.toLowerCase();
    
    for (const level of skillLevels) {
      if (lowerName.includes(level)) {
        return level;
      }
    }
    
    return 'mid'; // default
  }

  // Add role to idea (for idea creation/editing)
  async addRoleToIdea(ideaId, roleData, authorId) {
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if user is the author
    if (idea.author.toString() !== authorId.toString()) {
      throw new Error('Only idea author can add roles');
    }

    const newRole = idea.addRoleNeeded(roleData);
    await idea.save();

    return {
      role: newRole,
      teamMetrics: idea.getTeamMetrics(),
      message: `${roleData.roleType} role added to team structure`
    };
  }

  // Remove role from idea
  async removeRoleFromIdea(ideaId, roleId, authorId) {
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if user is the author
    if (idea.author.toString() !== authorId.toString()) {
      throw new Error('Only idea author can remove roles');
    }

    const roleIndex = idea.teamStructure.rolesNeeded.findIndex(role => role._id.toString() === roleId);
    if (roleIndex === -1) {
      throw new Error('Role not found');
    }

    const removedRole = idea.teamStructure.rolesNeeded[roleIndex];
    
    // Check if role has active members
    const hasActiveMembers = idea.teamStructure.teamComposition.some(member => 
      member.normalizedRoleType === removedRole.normalizedRoleType && member.status === 'active'
    );

    if (hasActiveMembers) {
      throw new Error('Cannot remove role that has active team members');
    }

    idea.teamStructure.rolesNeeded.splice(roleIndex, 1);
    idea.teamStructure.maxTeamSize = idea.teamStructure.rolesNeeded.length + 1;
    idea.teamStructure.lastTeamUpdate = new Date();

    await idea.save();

    return {
      removedRole,
      teamMetrics: idea.getTeamMetrics(),
      message: `${removedRole.roleType} role removed from team structure`
    };
  }
}

export default TeamService;
