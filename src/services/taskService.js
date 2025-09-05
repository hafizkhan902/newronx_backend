import Task from '../models/task.model.js';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';

class TaskService {
  // Create a new task
  async createTask(userId, taskData) {
    const {
      ideaId,
      title,
      description,
      priority,
      category,
      estimatedHours,
      deadline,
      assignmentType,
      assignedUsers,
      tags
    } = taskData;

    // Verify idea exists and user has permission
    const idea = await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if user is the idea author or a team member
    const isAuthor = idea.author.toString() === userId.toString();
    const isTeamMember = idea.teamStructure.teamComposition.some(member => 
      member.user._id.toString() === userId.toString() && member.status === 'active'
    );

    if (!isAuthor && !isTeamMember) {
      throw new Error('Only idea author or team members can create tasks');
    }

    // Create the task
    const task = new Task({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      estimatedHours,
      deadline: new Date(deadline),
      createdBy: userId,
      idea: ideaId,
      assignmentType,
      tags: tags ? tags.map(tag => tag.trim().toLowerCase()) : [],
      watchers: [userId] // Creator is automatically a watcher
    });

    // Handle assignments based on type
    if (assignmentType === 'everyone') {
      // Assign to all active team members including author
      const allMembers = [
        idea.author,
        ...idea.teamStructure.teamComposition
          .filter(member => member.status === 'active')
          .map(member => member.user._id)
      ];
      
      // Remove duplicates
      const uniqueMembers = [...new Set(allMembers.map(id => id.toString()))];
      
      uniqueMembers.forEach(memberId => {
        if (memberId !== userId.toString()) { // Don't duplicate creator
          task.assignToUser(memberId, userId);
        }
      });
    } else if (assignmentType === 'specific' && assignedUsers && assignedUsers.length > 0) {
      // Validate assigned users are team members
      const teamMemberIds = [
        idea.author.toString(),
        ...idea.teamStructure.teamComposition
          .filter(member => member.status === 'active')
          .map(member => member.user._id.toString())
      ];

      for (const assignedUserId of assignedUsers) {
        if (!teamMemberIds.includes(assignedUserId.toString())) {
          throw new Error(`User ${assignedUserId} is not a team member`);
        }
        task.assignToUser(assignedUserId, userId);
      }
    }

    await task.save();

    // Populate the created task
    return await this.getTaskById(task._id, userId);
  }

  // Get task by ID with full population
  async getTaskById(taskId, userId) {
    const task = await Task.findById(taskId)
      .populate('createdBy', 'firstName fullName avatar')
      .populate('idea', 'title author')
      .populate('assignments.user', 'firstName fullName avatar online lastSeen')
      .populate('assignments.assignedBy', 'firstName fullName')
      .populate('comments.user', 'firstName fullName avatar')
      .populate('attachments.uploadedBy', 'firstName fullName')
      .populate('watchers', 'firstName fullName avatar')
      .populate('dependencies.task', 'title status priority')
      .lean();

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user has permission to view this task
    const hasAccess = await this.checkTaskAccess(task, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this task');
    }

    // Add view if user is viewing
    if (userId) {
      await Task.findByIdAndUpdate(taskId, {
        $inc: { viewCount: 1 },
        $addToSet: {
          lastViewedBy: {
            user: userId,
            viewedAt: new Date()
          }
        }
      });
    }

    return task;
  }

  // Get tasks for an idea with filters
  async getTasksForIdea(ideaId, userId, filters = {}) {
    // Verify user has access to the idea
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const hasAccess = await this.checkIdeaAccess(idea, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this idea');
    }

    const {
      status,
      priority,
      category,
      assignedTo,
      createdBy,
      tags,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      includeCompleted = true
    } = filters;

    // Build query
    const query = { idea: ideaId };

    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    } else if (!includeCompleted) {
      query.status = { $nin: ['completed'] };
    }

    if (priority) {
      query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }

    if (category) {
      query.category = Array.isArray(category) ? { $in: category } : category;
    }

    if (assignedTo) {
      query['assignments.user'] = assignedTo;
      query['assignments.status'] = { $ne: 'cancelled' };
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags.map(tag => tag.toLowerCase()) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const tasks = await Task.find(query)
      .populate('createdBy', 'firstName fullName avatar')
      .populate('assignments.user', 'firstName fullName avatar online lastSeen')
      .populate('assignments.assignedBy', 'firstName fullName')
      .populate('comments.user', 'firstName fullName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Task.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      stats: await Task.getTaskStats(ideaId, assignedTo)
    };
  }

  // Update task
  async updateTask(taskId, userId, updateData) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check permissions - if updating status or completion percentage, use restrictive access control
    if (updateData.status !== undefined || updateData.completionPercentage !== undefined) {
      const canUpdateStatus = await this.checkTaskStatusUpdateAccess(task, userId);
      if (!canUpdateStatus) {
        throw new Error('Only assigned users can update task status or completion percentage');
      }
    } else {
      // For other updates, use general access control
      const hasAccess = await this.checkTaskEditAccess(task, userId);
      if (!hasAccess) {
        throw new Error('Access denied to edit this task');
      }
    }

    // Handle assignment updates
    if (updateData.assignedUsers !== undefined) {
      // Clear existing assignments
      task.assignments.forEach(assignment => {
        if (assignment.status !== 'cancelled') {
          assignment.status = 'cancelled';
        }
      });

      // Add new assignments
      if (updateData.assignedUsers.length > 0) {
        for (const assignedUserId of updateData.assignedUsers) {
          task.assignToUser(assignedUserId, userId);
        }
      }
    }

    // Handle progress update
    if (updateData.completionPercentage !== undefined) {
      task.updateProgress(updateData.completionPercentage, userId);
    }

    // Update other fields
    const allowedFields = [
      'title', 'description', 'priority', 'category', 'estimatedHours', 
      'deadline', 'tags', 'status', 'assignmentType'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'tags') {
          task[field] = updateData[field].map(tag => tag.trim().toLowerCase());
        } else if (field === 'deadline') {
          task[field] = new Date(updateData[field]);
        } else {
          task[field] = updateData[field];
        }
      }
    });

    await task.save();

    return await this.getTaskById(taskId, userId);
  }

  // Delete task
  async deleteTask(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check permissions (only creator or idea author can delete)
    const idea = await Idea.findById(task.idea);
    const canDelete = task.createdBy.toString() === userId.toString() || 
                     idea.author.toString() === userId.toString();

    if (!canDelete) {
      throw new Error('Only task creator or idea author can delete tasks');
    }

    await Task.findByIdAndDelete(taskId);

    return { message: 'Task deleted successfully' };
  }

  // Add comment to task
  async addComment(taskId, userId, content) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const hasAccess = await this.checkTaskAccess(task, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this task');
    }

    task.addComment(userId, content);
    await task.save();

    return await this.getTaskById(taskId, userId);
  }

  // Update task status
  async updateTaskStatus(taskId, userId, status) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Only assigned users can update task status
    const canUpdateStatus = await this.checkTaskStatusUpdateAccess(task, userId);
    if (!canUpdateStatus) {
      throw new Error('Only assigned users can update task status');
    }

    task.status = status;

    // Update assignments based on status
    if (status === 'completed') {
      task.updateProgress(100, userId);
    } else if (status === 'in_progress') {
      task.assignments.forEach(assignment => {
        if (assignment.user.toString() === userId.toString() && 
            assignment.status === 'assigned') {
          assignment.status = 'in_progress';
          assignment.startedAt = new Date();
        }
      });
    }

    await task.save();

    return await this.getTaskById(taskId, userId);
  }

  // Get tasks assigned to a specific user
  async getAssignedTasks(userId, filters = {}) {
    const {
      status,
      priority,
      ideaId,
      page = 1,
      limit = 20
    } = filters;

    const query = {
      'assignments.user': userId,
      'assignments.status': { $ne: 'cancelled' }
    };

    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    }

    if (priority) {
      query.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }

    if (ideaId) {
      query.idea = ideaId;
    }

    const skip = (page - 1) * limit;

    const tasks = await Task.find(query)
      .populate('createdBy', 'firstName fullName avatar')
      .populate('idea', 'title author')
      .populate('assignments.user', 'firstName fullName avatar')
      .sort({ deadline: 1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Task.countDocuments(query);

    return {
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  // Helper method to check task access
  async checkTaskAccess(task, userId) {
    const idea = await Idea.findById(task.idea);
    if (!idea) return false;

    return this.checkIdeaAccess(idea, userId);
  }

  // Helper method to check idea access
  async checkIdeaAccess(idea, userId) {
    // Idea author has access
    if (idea.author.toString() === userId.toString()) {
      return true;
    }

    // Active team members have access
    const isTeamMember = idea.teamStructure.teamComposition.some(member => 
      member.user.toString() === userId.toString() && member.status === 'active'
    );

    return isTeamMember;
  }

  // Helper method to check task edit access (general editing)
  async checkTaskEditAccess(task, userId) {
    // Task creator can edit
    if (task.createdBy.toString() === userId.toString()) {
      return true;
    }

    // Assigned users can edit certain fields
    const isAssigned = task.assignments.some(assignment => 
      assignment.user.toString() === userId.toString() && 
      assignment.status !== 'cancelled'
    );

    if (isAssigned) {
      return true;
    }

    // Idea author can edit
    const idea = await Idea.findById(task.idea);
    return idea.author.toString() === userId.toString();
  }

  // Helper method to check task status update access (restrictive - only assigned users)
  async checkTaskStatusUpdateAccess(task, userId) {
    // Only assigned users can update task status
    const isAssigned = task.assignments.some(assignment => 
      assignment.user.toString() === userId.toString() && 
      assignment.status !== 'cancelled'
    );

    return isAssigned;
  }

  // Get task statistics for dashboard
  async getTaskDashboard(ideaId, userId) {
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const hasAccess = await this.checkIdeaAccess(idea, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this idea');
    }

    const stats = await Task.getTaskStats(ideaId);
    const categoryStats = await Task.getTasksByCategory(ideaId);
    
    // Get recent tasks
    const recentTasks = await Task.find({ idea: ideaId })
      .populate('createdBy', 'firstName fullName avatar')
      .populate('assignments.user', 'firstName fullName avatar')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get overdue tasks
    const overdueTasks = await Task.find({
      idea: ideaId,
      deadline: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    })
    .populate('assignments.user', 'firstName fullName avatar')
    .sort({ deadline: 1 })
    .limit(10)
    .lean();

    return {
      stats,
      categoryStats,
      recentTasks,
      overdueTasks,
      teamPerformance: await this.getTeamPerformance(ideaId)
    };
  }

  // Get team performance metrics
  async getTeamPerformance(ideaId) {
    const teamStats = await Task.aggregate([
      { $match: { idea: ideaId } },
      { $unwind: '$assignments' },
      { $match: { 'assignments.status': { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$assignments.user',
          totalTasks: { $sum: 1 },
          completedTasks: { 
            $sum: { $cond: [{ $eq: ['$assignments.status', 'completed'] }, 1, 0] } 
          },
          totalHours: { $sum: '$assignments.hoursLogged' },
          avgResponseTime: { $avg: { 
            $subtract: ['$assignments.startedAt', '$assignments.assignedAt'] 
          }}
        }
      }
    ]);

    // Populate user information
    for (let stat of teamStats) {
      const user = await User.findById(stat._id).select('firstName fullName avatar').lean();
      stat.user = user;
    }

    return teamStats;
  }
}

export default TaskService;
