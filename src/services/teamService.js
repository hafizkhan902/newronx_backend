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
        teamComposition: this.buildHierarchicalTeamStructure(
          idea.teamStructure.teamComposition.filter(member => member.status === 'active'),
          userId,
          isAuthor
        ),
        flatComposition: idea.teamStructure.teamComposition.filter(member => member.status === 'active'), // Backward compatibility
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

  // Add subrole member manually (for team members)
  async addSubroleMember(ideaId, parentMemberId, newUserId, subroleData, requesterId) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if requester has permission (must be idea author or the parent member themselves)
    const isAuthor = idea.author.toString() === requesterId.toString();
    const parentMember = idea.teamStructure.teamComposition.find(member => 
      member._id.toString() === parentMemberId.toString() && member.status === 'active'
    );
    
    if (!parentMember) {
      throw new Error('Parent team member not found');
    }

    const isParentMember = parentMember.user._id.toString() === requesterId.toString();
    
    if (!isAuthor && !isParentMember) {
      throw new Error('Only idea author or the team member can add subroles');
    }

    // Check if new user exists
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      throw new Error('User not found');
    }

    // Check if user is already a team member
    const existingMember = idea.teamStructure.teamComposition.find(member =>
      member.user._id.toString() === newUserId.toString() && member.status === 'active'
    );

    if (existingMember) {
      throw new Error('User is already a team member');
    }

    // Create subrole based on parent role
    const subroleTitle = subroleData.title || `${subroleData.level || 'Junior'} ${parentMember.roleType}`;
    
    const roleData = {
      assignedRole: subroleTitle,
      roleType: subroleTitle,
      isLead: false,
      parentRoleId: parentMember._id
    };

    // Add team member with subrole
    const newMember = idea.addTeamMember(newUserId, roleData, requesterId);
    await idea.save();

    return {
      parentMember: {
        id: parentMember._id,
        user: parentMember.user,
        role: parentMember.assignedRole
      },
      newSubroleMember: {
        id: newMember._id,
        user: newUser,
        role: newMember.assignedRole,
        parentRoleId: newMember.parentRoleId
      },
      teamMetrics: idea.getTeamMetrics(),
      message: `${newUser.fullName} added as ${subroleTitle} under ${parentMember.user.fullName}`
    };
  }

  // Get available subrole options for a role
  async getSubroleOptions(roleType) {
    try {
      // Try to find role definition first
      const roleDefinition = await RoleDefinition.findOne({
        $or: [
          { normalizedName: roleType.toLowerCase() },
          { alternativeNames: roleType.toLowerCase() }
        ]
      });

      if (roleDefinition && roleDefinition.commonSubroles.length > 0) {
        return roleDefinition.commonSubroles.map(subrole => ({
          title: subrole.name,
          level: subrole.skillLevel,
          description: subrole.description || `${subrole.skillLevel} level ${roleType}`
        }));
      }

      // Fallback to pattern-based suggestions
      return this.generatePatternBasedSugroles(roleType);
    } catch (error) {
      console.error('Error getting subrole options:', error);
      return this.generatePatternBasedSugroles(roleType);
    }
  }

  // Generate pattern-based subroles for manual assignment
  generatePatternBasedSugroles(baseRole) {
    return [
      { title: `Junior ${baseRole}`, level: 'junior', description: `Entry level ${baseRole}` },
      { title: `Senior ${baseRole}`, level: 'senior', description: `Senior level ${baseRole}` },
      { title: `Lead ${baseRole}`, level: 'lead', description: `Lead ${baseRole}` },
      { title: `${baseRole} Specialist`, level: 'specialist', description: `Specialized ${baseRole}` },
      { title: `${baseRole} Assistant`, level: 'assistant', description: `Assistant ${baseRole}` }
    ];
  }

  // Search users for subrole assignment
  async searchUsersForSubrole(searchQuery, ideaId, excludeCurrentMembers = true) {
    let searchCriteria = {};

    if (searchQuery.trim()) {
      searchCriteria = {
        $or: [
          { firstName: { $regex: searchQuery, $options: 'i' } },
          { fullName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { skills: { $in: [new RegExp(searchQuery, 'i')] } },
          { interestedRoles: { $in: [new RegExp(searchQuery, 'i')] } }
        ]
      };
    }

    let users = await User.find(searchCriteria)
      .select('firstName fullName avatar email skills interestedRoles city country')
      .limit(20)
      .lean();

    // Exclude current team members if requested
    if (excludeCurrentMembers && ideaId) {
      const idea = await Idea.findById(ideaId).select('teamStructure.teamComposition author');
      if (idea) {
        const teamMemberIds = [
          idea.author.toString(),
          ...idea.teamStructure.teamComposition
            .filter(member => member.status === 'active')
            .map(member => member.user.toString())
        ];
        
        users = users.filter(user => !teamMemberIds.includes(user._id.toString()));
      }
    }

    return users.map(user => ({
      _id: user._id,
      name: user.fullName || user.firstName,
      avatar: user.avatar,
      email: user.email,
      skills: user.skills || [],
      interestedRoles: user.interestedRoles || [],
      location: user.city && user.country ? `${user.city}, ${user.country}` : null
    }));
  }

  // Get subroles for a specific parent member
  async getSubrolesForMember(ideaId, parentMemberId, requesterId) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar email');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if requester has access (must be team member or idea author)
    const isAuthor = idea.author.toString() === requesterId.toString();
    const isTeamMember = idea.teamStructure.teamComposition.some(member => 
      member.user._id.toString() === requesterId.toString() && member.status === 'active'
    );
    
    if (!isAuthor && !isTeamMember) {
      throw new Error('Access denied. Only team members can view subroles.');
    }

    // Find the parent member
    const parentMember = idea.teamStructure.teamComposition.find(member => 
      member._id.toString() === parentMemberId.toString() && member.status === 'active'
    );
    
    if (!parentMember) {
      throw new Error('Parent member not found');
    }

    // Get all subroles under this parent
    const subroles = idea.teamStructure.teamComposition.filter(member => 
      member.parentRoleId && 
      member.parentRoleId.toString() === parentMemberId.toString() && 
      member.status === 'active'
    );

    return {
      parentMember: {
        _id: parentMember._id,
        user: parentMember.user,
        assignedRole: parentMember.assignedRole,
        roleType: parentMember.roleType,
        isLead: parentMember.isLead,
        assignedAt: parentMember.assignedAt
      },
      subroles: subroles.map(subrole => ({
        _id: subrole._id,
        user: subrole.user,
        assignedRole: subrole.assignedRole,
        roleType: subrole.roleType,
        parentRoleId: subrole.parentRoleId,
        assignedAt: subrole.assignedAt,
        assignedBy: subrole.assignedBy
      })),
      subroleCount: subroles.length,
      canAddMore: true // You can add logic here for max subrole limits
    };
  }

  // Build hierarchical team structure with subroles
  buildHierarchicalTeamStructure(teamComposition, userId, isAuthor) {
    // Get main roles (no parent)
    const mainRoles = teamComposition.filter(member => !member.parentRoleId);
    
    // Find if current user is a team leader
    const currentUserMember = teamComposition.find(member => 
      member.user._id.toString() === userId.toString()
    );
    const isTeamLeader = currentUserMember && currentUserMember.isLead;
    
    // Build hierarchy with subroles
    return mainRoles.map(parent => {
      const subroles = teamComposition.filter(member => 
        member.parentRoleId && member.parentRoleId.toString() === parent._id.toString()
      );

      const canManageSubroles = isAuthor || parent.user._id.toString() === userId.toString();
      
      // Team member removal permissions
      const canRemoveThisMember = isAuthor || 
        (isTeamLeader && !parent.isLead); // Team leaders can remove non-leaders
      
      return {
        ...parent.toObject(),
        subroles: subroles.map(subrole => ({
          ...subrole.toObject(),
          canRemove: canManageSubroles, // For subrole removal
          canRemoveFromTeam: isAuthor || isTeamLeader, // For team member removal
          parentRole: {
            _id: parent._id,
            assignedRole: parent.assignedRole,
            user: parent.user
          }
        })),
        subroleCount: subroles.length,
        canAddSubroles: canManageSubroles,
        canManageSubroles: canManageSubroles,
        canRemoveFromTeam: canRemoveThisMember, // Permission to remove this main member
        hasSubroles: subroles.length > 0,
        isTeamLeader: parent.isLead,
        permissions: {
          canEdit: isAuthor || parent.user._id.toString() === userId.toString(),
          canRemove: canRemoveThisMember,
          canPromote: isAuthor, // Only author can promote to leader
          canDemote: isAuthor && parent.isLead // Only author can demote leaders
        }
      };
    });
  }

  // Remove subrole member
  async removeSubroleMember(ideaId, parentMemberId, subroleMemberId, requesterId) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Find parent and subrole members
    const parentMember = idea.teamStructure.teamComposition.find(member => 
      member._id.toString() === parentMemberId.toString() && member.status === 'active'
    );
    
    const subroleMember = idea.teamStructure.teamComposition.find(member => 
      member._id.toString() === subroleMemberId.toString() && 
      member.status === 'active'
    );

    if (!parentMember) {
      throw new Error('Parent member not found');
    }

    if (!subroleMember) {
      throw new Error('Subrole member not found');
    }

    // Verify it's actually a subrole under the parent
    if (!subroleMember.parentRoleId || subroleMember.parentRoleId.toString() !== parentMemberId.toString()) {
      throw new Error('Member is not a subrole of the specified parent');
    }

    // Check permissions (idea author or parent member can remove subroles)
    const isAuthor = idea.author.toString() === requesterId.toString();
    const isParentMember = parentMember.user._id.toString() === requesterId.toString();
    
    if (!isAuthor && !isParentMember) {
      throw new Error('Only idea author or parent member can remove subroles');
    }

    // Remove the subrole member (pass user ID, not member ID)
    const removedMember = idea.removeTeamMember(subroleMember.user._id);
    await idea.save();

    return {
      removedMember: {
        _id: removedMember._id,
        user: subroleMember.user,
        assignedRole: subroleMember.assignedRole,
        parentRole: {
          _id: parentMember._id,
          assignedRole: parentMember.assignedRole,
          user: parentMember.user
        }
      },
      parentMember: {
        _id: parentMember._id,
        user: parentMember.user,
        assignedRole: parentMember.assignedRole
      },
      teamMetrics: idea.getTeamMetrics(),
      message: `${subroleMember.user.fullName} removed from ${parentMember.assignedRole} subroles`
    };
  }

  // Remove team member (with leader permissions)
  async removeTeamMember(ideaId, memberId, requesterId) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar')
      .populate('author', 'firstName fullName');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Find the member to be removed
    const memberToRemove = idea.teamStructure.teamComposition.find(member => 
      member._id.toString() === memberId.toString() && member.status === 'active'
    );

    if (!memberToRemove) {
      throw new Error('Team member not found');
    }

    // Check permissions
    const isAuthor = idea.author._id.toString() === requesterId.toString();
    const requesterMember = idea.teamStructure.teamComposition.find(member => 
      member.user._id.toString() === requesterId.toString() && member.status === 'active'
    );
    const isTeamLeader = requesterMember && requesterMember.isLead;

    // Permission hierarchy:
    // 1. Idea author can remove anyone
    // 2. Team leaders can remove non-leader members
    // 3. Members cannot remove other members
    if (!isAuthor && !isTeamLeader) {
      throw new Error('Only idea author or team leaders can remove team members');
    }

    // Team leaders cannot remove other team leaders (only idea author can)
    if (!isAuthor && isTeamLeader && memberToRemove.isLead) {
      throw new Error('Team leaders cannot remove other team leaders. Only the idea author can remove team leaders.');
    }

    // Team leaders cannot remove the idea author (obviously)
    if (memberToRemove.user._id.toString() === idea.author._id.toString()) {
      throw new Error('Cannot remove the idea author from the team');
    }

    // Remove the member using the existing method
    const removedMember = idea.removeTeamMember(memberToRemove.user._id);
    
    // Also remove any subroles under this member
    const subrolesToRemove = idea.teamStructure.teamComposition.filter(member => 
      member.parentRoleId && 
      member.parentRoleId.toString() === memberId.toString() && 
      member.status === 'active'
    );

    // Remove all subroles
    for (const subrole of subrolesToRemove) {
      idea.removeTeamMember(subrole.user._id);
    }

    await idea.save();

    return {
      removedMember: {
        _id: memberToRemove._id,
        user: memberToRemove.user,
        assignedRole: memberToRemove.assignedRole,
        isLead: memberToRemove.isLead
      },
      removedSubroles: subrolesToRemove.map(subrole => ({
        _id: subrole._id,
        user: subrole.user,
        assignedRole: subrole.assignedRole
      })),
      removedBy: {
        _id: requesterId,
        isAuthor,
        isTeamLeader,
        role: requesterMember ? requesterMember.assignedRole : 'Idea Author'
      },
      teamMetrics: idea.getTeamMetrics(),
      message: `${memberToRemove.user.fullName} ${memberToRemove.isLead ? '(Team Leader)' : ''} removed from the team${subrolesToRemove.length > 0 ? ` along with ${subrolesToRemove.length} subrole(s)` : ''}`
    };
  }

  // Update team member leadership status
  async updateMemberLeadership(ideaId, memberId, isLead, requesterId) {
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar')
      .populate('author', 'firstName fullName');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Only idea author can promote/demote team leaders
    const isAuthor = idea.author._id.toString() === requesterId.toString();
    if (!isAuthor) {
      throw new Error('Only idea author can promote or demote team leaders');
    }

    // Find the member to update
    const member = idea.teamStructure.teamComposition.find(m => 
      m._id.toString() === memberId.toString() && m.status === 'active'
    );

    if (!member) {
      throw new Error('Team member not found');
    }

    // Cannot change leadership status of the idea author
    if (member.user._id.toString() === idea.author._id.toString()) {
      throw new Error('Cannot change leadership status of the idea author');
    }

    const previousStatus = member.isLead;
    member.isLead = isLead;
    idea.teamStructure.lastTeamUpdate = new Date();
    
    await idea.save();

    return {
      updatedMember: {
        _id: member._id,
        user: member.user,
        assignedRole: member.assignedRole,
        isLead: member.isLead,
        previousIsLead: previousStatus
      },
      action: isLead ? 'promoted' : 'demoted',
      message: `${member.user.fullName} ${isLead ? 'promoted to' : 'demoted from'} team leader`,
      teamMetrics: idea.getTeamMetrics()
    };
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
