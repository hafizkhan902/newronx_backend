import BaseController from './baseController.js';
import TaskService from '../services/taskService.js';
import Task from '../models/task.model.js';

class TaskController extends BaseController {
  constructor() {
    super();
    this.taskService = new TaskService();
  }

  // Create a new task
  createTask = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

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
    } = req.body;

    // Validate required fields
    if (!ideaId || !title || !description || !priority || !category || !estimatedHours || !deadline) {
      return this.sendBadRequest(res, 'Missing required fields: ideaId, title, description, priority, category, estimatedHours, deadline');
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return this.sendBadRequest(res, 'Priority must be one of: low, medium, high, urgent');
    }

    // Validate category
    const validCategories = [
      'development', 'design', 'marketing', 'research', 
      'planning', 'testing', 'documentation', 'meeting', 
      'review', 'deployment', 'maintenance', 'other'
    ];
    if (!validCategories.includes(category)) {
      return this.sendBadRequest(res, `Category must be one of: ${validCategories.join(', ')}`);
    }

    // Validate assignment type
    if (assignmentType && !['specific', 'everyone', 'unassigned'].includes(assignmentType)) {
      return this.sendBadRequest(res, 'Assignment type must be one of: specific, everyone, unassigned');
    }

    // Validate estimated hours
    if (estimatedHours < 0.5 || estimatedHours > 1000) {
      return this.sendBadRequest(res, 'Estimated hours must be between 0.5 and 1000');
    }

    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return this.sendBadRequest(res, 'Deadline must be in the future');
    }

    const taskData = {
      ideaId,
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      estimatedHours: parseFloat(estimatedHours),
      deadline: deadlineDate,
      assignmentType: assignmentType || 'specific',
      assignedUsers: assignedUsers || [],
      tags: tags || []
    };

    const task = await this.taskService.createTask(userId, taskData);
    
    this.sendSuccess(res, task, 'Task created successfully.', 201);
  });

  // Get task by ID
  getTask = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { taskId } = req.params;

    if (!taskId) {
      return this.sendBadRequest(res, 'Task ID is required');
    }

    const task = await this.taskService.getTaskById(taskId, userId);
    
    this.sendSuccess(res, task, 'Task retrieved successfully.');
  });

  // Get tasks for an idea
  getTasksForIdea = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const {
      status,
      priority,
      category,
      assignedTo,
      createdBy,
      tags,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
      includeCompleted
    } = req.query;

    if (!ideaId) {
      return this.sendBadRequest(res, 'Idea ID is required');
    }

    const filters = {
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      priority: priority ? (Array.isArray(priority) ? priority : [priority]) : undefined,
      category: category ? (Array.isArray(category) ? category : [category]) : undefined,
      assignedTo,
      createdBy,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined,
      search,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      includeCompleted: includeCompleted === 'true'
    };

    const result = await this.taskService.getTasksForIdea(ideaId, userId, filters);
    
    this.sendSuccess(res, result, 'Tasks retrieved successfully.');
  });

  // Update task
  updateTask = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { taskId } = req.params;
    const updateData = req.body;

    if (!taskId) {
      return this.sendBadRequest(res, 'Task ID is required');
    }

    // Validate deadline if provided
    if (updateData.deadline) {
      const deadlineDate = new Date(updateData.deadline);
      if (deadlineDate <= new Date()) {
        return this.sendBadRequest(res, 'Deadline must be in the future');
      }
    }

    // Validate completion percentage if provided
    if (updateData.completionPercentage !== undefined) {
      const percentage = parseFloat(updateData.completionPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return this.sendBadRequest(res, 'Completion percentage must be between 0 and 100');
      }
      updateData.completionPercentage = percentage;
    }

    const task = await this.taskService.updateTask(taskId, userId, updateData);
    
    this.sendSuccess(res, task, 'Task updated successfully.');
  });

  // Delete task
  deleteTask = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { taskId } = req.params;

    if (!taskId) {
      return this.sendBadRequest(res, 'Task ID is required');
    }

    const result = await this.taskService.deleteTask(taskId, userId);
    
    this.sendSuccess(res, result, 'Task deleted successfully.');
  });

  // Add comment to task
  addComment = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { taskId } = req.params;
    const { content } = req.body;

    if (!taskId || !content) {
      return this.sendBadRequest(res, 'Task ID and comment content are required');
    }

    if (content.trim().length === 0 || content.length > 1000) {
      return this.sendBadRequest(res, 'Comment content must be between 1 and 1000 characters');
    }

    const task = await this.taskService.addComment(taskId, userId, content.trim());
    
    this.sendSuccess(res, task, 'Comment added successfully.');
  });

  // Update task status
  updateStatus = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { taskId } = req.params;
    const { status } = req.body;

    if (!taskId || !status) {
      return this.sendBadRequest(res, 'Task ID and status are required');
    }

    const validStatuses = ['todo', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return this.sendBadRequest(res, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const task = await this.taskService.updateTaskStatus(taskId, userId, status);
    
    this.sendSuccess(res, task, 'Task status updated successfully.');
  });

  // Get tasks assigned to current user
  getMyTasks = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const {
      status,
      priority,
      ideaId,
      page,
      limit
    } = req.query;

    const filters = {
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      priority: priority ? (Array.isArray(priority) ? priority : [priority]) : undefined,
      ideaId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20
    };

    const result = await this.taskService.getAssignedTasks(userId, filters);
    
    this.sendSuccess(res, result, 'Assigned tasks retrieved successfully.');
  });

  // Get task dashboard for an idea
  getTaskDashboard = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;

    if (!ideaId) {
      return this.sendBadRequest(res, 'Idea ID is required');
    }

    const dashboard = await this.taskService.getTaskDashboard(ideaId, userId);
    
    this.sendSuccess(res, dashboard, 'Task dashboard retrieved successfully.');
  });

  // Get task statistics
  getTaskStats = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { ideaId } = req.params;
    const { assignedTo } = req.query;

    if (!ideaId) {
      return this.sendBadRequest(res, 'Idea ID is required');
    }

    const stats = await Task.getTaskStats(ideaId, assignedTo);
    
    this.sendSuccess(res, stats, 'Task statistics retrieved successfully.');
  });

  // Search tasks across all user's ideas
  searchTasks = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Invalid or expired token.');
    }

    const { q, page, limit } = req.query;

    if (!q || q.trim().length === 0) {
      return this.sendBadRequest(res, 'Search query is required');
    }

    // This would require a more complex implementation
    // For now, return a placeholder response
    this.sendSuccess(res, {
      tasks: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0
      }
    }, 'Search functionality coming soon.');
  });
}

export default new TaskController();
