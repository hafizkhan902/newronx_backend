import TeamPostService from '../services/teamPostService.js';
import { ResponseService } from '../services/responseService.js';
import BaseController from './baseController.js';

class TeamPostController extends BaseController {

  /**
   * Create a new team post
   */
  createPost = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { 
        ideaId, 
        content, 
        mentions, 
        links,
        isAnnouncement,
        isPinned 
      } = req.body;

      // Validate required fields
      if (!ideaId || !content) {
        return ResponseService.error(res, 'Idea ID and content are required', 400);
      }

      // Process mentions (convert string to array if needed)
      let processedMentions = [];
      if (mentions) {
        try {
          processedMentions = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
        } catch (error) {
          processedMentions = mentions.split(',').map(id => id.trim()).filter(id => id);
        }
      }

      // Process attachment links
      let processedLinks = [];
      if (links) {
        try {
          processedLinks = Array.isArray(links) ? links : JSON.parse(links);
        } catch (error) {
          console.error('Error parsing links:', error);
        }
      }

      // Validate links format
      if (processedLinks.length > 0) {
        for (const link of processedLinks) {
          if (!link.url || typeof link.url !== 'string') {
            return ResponseService.error(res, 'Invalid link format', 400);
          }
          
          // Basic URL validation
          try {
            new URL(link.url);
          } catch (error) {
            return ResponseService.error(res, `Invalid URL: ${link.url}`, 400);
          }
        }
      }

      // File upload validation
      const files = req.files || [];
      if (files.length > 10) {
        return ResponseService.error(res, 'Maximum 10 files allowed per post', 400);
      }

      // Validate file types and sizes
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv'
      ];

      const maxFileSize = 10 * 1024 * 1024; // 10MB

      for (const file of files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return ResponseService.error(res, `File type ${file.mimetype} not allowed`, 400);
        }
        
        if (file.size > maxFileSize) {
          return ResponseService.error(res, `File ${file.originalname} exceeds 10MB limit`, 400);
        }
      }

      const postData = {
        ideaId,
        content: content.trim(),
        attachmentFiles: files,
        attachmentLinks: processedLinks,
        mentions: processedMentions,
        isAnnouncement: isAnnouncement === 'true' || isAnnouncement === true,
        isPinned: isPinned === 'true' || isPinned === true
      };

      const post = await TeamPostService.createPost(userId, postData);

      return ResponseService.success(res, 'Post created successfully', post, 201);
    } catch (error) {
      console.error('Create post error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get team posts for an idea
   */
  getTeamPosts = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = -1,
        includeComments = true 
      } = req.query;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const result = await TeamPostService.getTeamPosts(ideaId, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder: parseInt(sortOrder),
        includeComments: includeComments !== 'false'
      });

      return ResponseService.success(res, 'Team posts retrieved successfully', result);
    } catch (error) {
      console.error('Get team posts error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get a single post by ID
   */
  getPostById = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;

      if (!postId) {
        return ResponseService.error(res, 'Post ID is required', 400);
      }

      const post = await TeamPostService.getPostById(postId, userId);

      return ResponseService.success(res, 'Post retrieved successfully', post);
    } catch (error) {
      console.error('Get post error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Update a post
   */
  updatePost = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;
      const { content, mentions } = req.body;

      if (!postId) {
        return ResponseService.error(res, 'Post ID is required', 400);
      }

      // Process mentions
      let processedMentions = [];
      if (mentions) {
        try {
          processedMentions = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
        } catch (error) {
          processedMentions = mentions.split(',').map(id => id.trim()).filter(id => id);
        }
      }

      const updateData = {
        content: content ? content.trim() : undefined,
        mentions: processedMentions
      };

      const post = await TeamPostService.updatePost(postId, userId, updateData);

      return ResponseService.success(res, 'Post updated successfully', post);
    } catch (error) {
      console.error('Update post error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Delete a post
   */
  deletePost = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;

      if (!postId) {
        return ResponseService.error(res, 'Post ID is required', 400);
      }

      const result = await TeamPostService.deletePost(postId, userId);

      return ResponseService.success(res, result.message);
    } catch (error) {
      console.error('Delete post error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Toggle like on a post
   */
  toggleLike = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;

      if (!postId) {
        return ResponseService.error(res, 'Post ID is required', 400);
      }

      const result = await TeamPostService.toggleLike(postId, userId);

      return ResponseService.success(res, `Post ${result.action} successfully`, result);
    } catch (error) {
      console.error('Toggle like error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Add comment to a post
   */
  addComment = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;
      const { content, mentions } = req.body;

      if (!postId || !content) {
        return ResponseService.error(res, 'Post ID and content are required', 400);
      }

      // Process mentions
      let processedMentions = [];
      if (mentions) {
        try {
          processedMentions = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
        } catch (error) {
          processedMentions = mentions.split(',').map(id => id.trim()).filter(id => id);
        }
      }

      const commentData = {
        content: content.trim(),
        mentions: processedMentions
      };

      const comment = await TeamPostService.addComment(postId, userId, commentData);

      return ResponseService.success(res, 'Comment added successfully', comment, 201);
    } catch (error) {
      console.error('Add comment error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Update a comment
   */
  updateComment = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId, commentId } = req.params;
      const { content, mentions } = req.body;

      if (!postId || !commentId) {
        return ResponseService.error(res, 'Post ID and Comment ID are required', 400);
      }

      // Process mentions
      let processedMentions = [];
      if (mentions) {
        try {
          processedMentions = Array.isArray(mentions) ? mentions : JSON.parse(mentions);
        } catch (error) {
          processedMentions = mentions.split(',').map(id => id.trim()).filter(id => id);
        }
      }

      const updateData = {
        content: content ? content.trim() : undefined,
        mentions: processedMentions
      };

      const comment = await TeamPostService.updateComment(postId, commentId, userId, updateData);

      return ResponseService.success(res, 'Comment updated successfully', comment);
    } catch (error) {
      console.error('Update comment error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Delete a comment
   */
  deleteComment = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId, commentId } = req.params;

      if (!postId || !commentId) {
        return ResponseService.error(res, 'Post ID and Comment ID are required', 400);
      }

      const result = await TeamPostService.deleteComment(postId, commentId, userId);

      return ResponseService.success(res, result.message);
    } catch (error) {
      console.error('Delete comment error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Pin/Unpin a post
   */
  togglePin = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { postId } = req.params;

      if (!postId) {
        return ResponseService.error(res, 'Post ID is required', 400);
      }

      const result = await TeamPostService.togglePin(postId, userId);

      return ResponseService.success(res, `Post ${result.action} successfully`, result);
    } catch (error) {
      console.error('Toggle pin error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get team post statistics
   */
  getTeamPostStats = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const stats = await TeamPostService.getTeamPostStats(ideaId, userId);

      return ResponseService.success(res, 'Team post statistics retrieved successfully', stats);
    } catch (error) {
      console.error('Get team post stats error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get user's posts in a team
   */
  getUserPosts = this.asyncHandler(async (req, res) => {
    try {
      const requestingUserId = req.user._id;
      const { ideaId, userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!ideaId || !userId) {
        return ResponseService.error(res, 'Idea ID and User ID are required', 400);
      }

      const result = await TeamPostService.getUserPosts(
        ideaId, 
        userId, 
        requestingUserId, 
        { page: parseInt(page), limit: parseInt(limit) }
      );

      return ResponseService.success(res, 'User posts retrieved successfully', result);
    } catch (error) {
      console.error('Get user posts error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Search posts in team
   */
  searchTeamPosts = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { q, page = 1, limit = 10 } = req.query;

      if (!ideaId || !q) {
        return ResponseService.error(res, 'Idea ID and search query are required', 400);
      }

      const posts = await TeamPostService.searchTeamPosts(
        ideaId, 
        userId, 
        q, 
        { page: parseInt(page), limit: parseInt(limit) }
      );

      return ResponseService.success(res, 'Search results retrieved successfully', posts);
    } catch (error) {
      console.error('Search team posts error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });
}

export default new TeamPostController();
