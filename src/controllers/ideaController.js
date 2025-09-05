import BaseController from './baseController.js';
import IdeaService from '../services/ideaService.js';

class IdeaController extends BaseController {
  constructor() {
    super();
    this.ideaService = new IdeaService();
  }

  // Feed (legacy compatibility): return plain ideas array
  getFeed = this.asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await this.ideaService.getAllIdeas({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });
    // Return only the array to match legacy frontend expectations
    return res.status(200).json(result.ideas || []);
  });

  // Create new idea
  createIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to create an idea');
    }

    const result = await this.ideaService.createIdea(token, req.body, req.file);
    
    this.sendSuccess(res, result, 'Idea created successfully.', 201);
  });

  // Get all ideas with pagination and filters
  getAllIdeas = this.asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const result = await this.ideaService.getAllIdeas({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      sortBy,
      sortOrder
    });
    
    this.sendSuccess(res, result, 'Ideas retrieved successfully.');
  });

  // Get idea by ID
  getIdeaById = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const idea = await this.ideaService.getIdeaById(id);
    if (!idea) {
      return this.sendNotFound(res, 'Idea not found');
    }
    
    this.sendSuccess(res, idea, 'Idea retrieved successfully.');
  });

  // Update idea
  updateIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to update this idea');
    }

    const { id } = req.params;
    
    const result = await this.ideaService.updateIdea(token, id, req.body, req.file);
    
    this.sendSuccess(res, result, 'Idea updated successfully.');
  });

  // Delete idea
  deleteIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete this idea');
    }

    const { id } = req.params;
    
    await this.ideaService.deleteIdea(token, id);
    
    this.sendSuccess(res, null, 'Idea deleted successfully.');
  });

  // Like idea
  likeIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to like this idea');
    }

    const { id } = req.params;
    
    const result = await this.ideaService.likeIdea(token, id);
    
    this.sendSuccess(res, result, 'Idea liked successfully.');
  });

  // Unlike idea
  unlikeIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to unlike this idea');
    }

    const { id } = req.params;
    
    const result = await this.ideaService.unlikeIdea(token, id);
    
    this.sendSuccess(res, result, 'Idea unliked successfully.');
  });

  // Comment on idea
  commentOnIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to comment on this idea');
    }

    const { id } = req.params;
    const { content } = req.body;
    
    const result = await this.ideaService.commentOnIdea(token, id, content);
    
    this.sendSuccess(res, result, 'Comment added successfully.');
  });

  // Get idea comments
  getIdeaComments = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const result = await this.ideaService.getIdeaComments(id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Comments retrieved successfully.');
  });

  // Get approaches for an idea
  getApproaches = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.ideaService.getApproaches(id);
    if (!result) return this.sendNotFound(res, 'Idea not found');
    // Return legacy-friendly array
    return res.status(200).json(result.approaches || []);
  });

  // Get incoming approaches for current user (ideas they authored)
  getIncomingApproaches = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view approaches');
    }

    const items = await this.ideaService.getIncomingApproaches(token);
    // Return plain array for frontend
    return res.status(200).json(items);
  });

  // Delete comment
  deleteComment = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete this comment');
    }

    const { id, commentId } = req.params;
    
    await this.ideaService.deleteComment(token, id, commentId);
    
    this.sendSuccess(res, null, 'Comment deleted successfully.');
  });

  // Share idea
  shareIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to share this idea');
    }

    const { id } = req.params;
    const { platform, message } = req.body;
    
    const result = await this.ideaService.shareIdea(token, id, platform, message);
    
    this.sendSuccess(res, result, 'Idea shared successfully.');
  });

  // Approach idea (submit desired role and description)
  approachIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to approach this idea');
    }

    const { id } = req.params;
    const { role, description } = req.body;

    const result = await this.ideaService.approachIdea(token, id, role, description);

    // Legacy/Frontend-friendly response
    return res.status(201).json({
      message: 'Approach submitted successfully',
      approach: result
    });
  });

  // Get user's ideas
  getUserIdeas = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view your ideas');
    }

    const { page = 1, limit = 10 } = req.query;
    
    const result = await this.ideaService.getUserIdeas(token, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    this.sendSuccess(res, result, 'Your ideas retrieved successfully.');
  });

  // Get trending ideas
  getTrendingIdeas = this.asyncHandler(async (req, res) => {
    const { limit = 10, timeframe = 'week' } = req.query;
    
    const result = await this.ideaService.getTrendingIdeas({
      limit: parseInt(limit),
      timeframe
    });
    
    this.sendSuccess(res, result, 'Trending ideas retrieved successfully.');
  });

  // Get ideas by category
  getIdeasByCategory = this.asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const result = await this.ideaService.getIdeasByCategory(category, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });
    
    this.sendSuccess(res, result, `Ideas in ${category} category retrieved successfully.`);
  });

  // Search ideas
  searchIdeas = this.asyncHandler(async (req, res) => {
    const { q, category, tags, page = 1, limit = 10 } = req.query;

    // If no filters provided, return latest public ideas instead of 400
    if (!q && !category && !tags) {
      const result = await this.ideaService.getAllIdeas({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      return this.sendSuccess(res, result, 'Ideas retrieved successfully.');
    }

    const result = await this.ideaService.searchIdeas({
      query: q,
      category,
      tags: tags ? tags.split(',') : [],
      page: parseInt(page),
      limit: parseInt(limit)
    });

    this.sendSuccess(res, result, 'Search results retrieved successfully.');
  });

  // Get idea statistics
  getIdeaStats = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const stats = await this.ideaService.getIdeaStats(id);
    if (!stats) {
      return this.sendNotFound(res, 'Idea not found');
    }
    
    this.sendSuccess(res, stats, 'Idea statistics retrieved successfully.');
  });

  // Report idea
  reportIdea = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to report this idea');
    }

    const { id } = req.params;
    const { reason, description } = req.body;
    
    await this.ideaService.reportIdea(token, id, reason, description);
    
    this.sendSuccess(res, null, 'Idea reported successfully.');
  });

  // Get idea insights
  getIdeaInsights = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view idea insights');
    }

    const { id } = req.params;
    
    const insights = await this.ideaService.getIdeaInsights(token, id);
    if (!insights) {
      return this.sendNotFound(res, 'Idea not found or access denied');
    }
    
    this.sendSuccess(res, insights, 'Idea insights retrieved successfully.');
  });

  // Update approach status (select/decline/queue) with conflict resolution
  updateApproachStatus = this.asyncHandler(async (req, res) => {
    // Use authenticated user from middleware
    const userId = req.user && req.user._id;
    if (!userId) {
      return this.sendUnauthorized(res, 'Please login to manage approaches');
    }

    const { ideaId, approachId } = req.params;
    const { status, resolution } = req.body;

    // Validate status
    if (!status || !['selected', 'declined', 'queued'].includes(status)) {
      return this.sendBadRequest(res, 'Invalid status. Must be: selected, declined, or queued');
    }

    // Validate resolution if provided
    if (resolution && status === 'selected') {
      const validActions = ['subrole', 'replace', 'expand'];
      if (!resolution.action || !validActions.includes(resolution.action)) {
        return this.sendBadRequest(res, 'Invalid resolution action. Must be: subrole, replace, or expand');
      }
    }

    const result = await this.ideaService.updateApproachStatus(userId, ideaId, approachId, status, resolution);
    
    // Handle conflict response
    if (!result.success && result.conflict) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: 'Role conflict detected. Resolution required.',
        data: result,
        timestamp: new Date().toISOString(),
        statusCode: 409
      });
    }
    
    this.sendSuccess(res, result, result.message || `Approach ${status} successfully.`);
  });
}

export default new IdeaController();
