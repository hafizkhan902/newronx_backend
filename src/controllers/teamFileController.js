import TeamFileService from '../services/teamFileService.js';
import { ResponseService } from '../services/responseService.js';
import BaseController from './baseController.js';

class TeamFileController extends BaseController {

  /**
   * Upload file (direct upload)
   */
  uploadFile = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId, description, tags, category } = req.body;
      const file = req.file;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      if (!file) {
        return ResponseService.error(res, 'File is required for direct upload', 400);
      }

      // File validation
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        return ResponseService.error(res, 'File size exceeds 50MB limit', 400);
      }

      const fileData = {
        ideaId,
        file,
        description: description || '',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
        category: category || 'other'
      };

      const uploadedFile = await TeamFileService.uploadFile(userId, fileData);

      return ResponseService.success(res, 'File uploaded successfully', uploadedFile, 201);
    } catch (error) {
      console.error('Upload file error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Upload file via link
   */
  uploadLink = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId, url, title, description, tags, category } = req.body;

      if (!ideaId || !url) {
        return ResponseService.error(res, 'Idea ID and URL are required', 400);
      }

      // URL validation
      try {
        new URL(url);
      } catch (error) {
        return ResponseService.error(res, 'Invalid URL format', 400);
      }

      const linkData = {
        ideaId,
        url,
        title: title || '',
        description: description || '',
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
        category: category || 'other'
      };

      const uploadedLink = await TeamFileService.uploadLink(userId, linkData);

      return ResponseService.success(res, 'Link uploaded successfully', uploadedLink, 201);
    } catch (error) {
      console.error('Upload link error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get team files
   */
  getTeamFiles = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        category, 
        fileType, 
        uploadedBy, 
        sortBy = 'createdAt', 
        sortOrder = -1,
        search 
      } = req.query;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const result = await TeamFileService.getTeamFiles(ideaId, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        fileType,
        uploadedBy,
        sortBy,
        sortOrder: parseInt(sortOrder),
        search
      });

      return ResponseService.success(res, 'Team files retrieved successfully', result);
    } catch (error) {
      console.error('Get team files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get single file by ID
   */
  getFileById = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileId } = req.params;

      if (!fileId) {
        return ResponseService.error(res, 'File ID is required', 400);
      }

      const file = await TeamFileService.getFileById(fileId, userId);

      return ResponseService.success(res, 'File retrieved successfully', file);
    } catch (error) {
      console.error('Get file error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Download/Access file
   */
  downloadFile = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileId } = req.params;

      if (!fileId) {
        return ResponseService.error(res, 'File ID is required', 400);
      }

      const downloadInfo = await TeamFileService.downloadFile(fileId, userId);

      if (downloadInfo.uploadMethod === 'link') {
        // For links, return the URL
        return ResponseService.success(res, 'File access URL retrieved', downloadInfo);
      } else {
        // For direct uploads, redirect to the file URL
        return res.redirect(downloadInfo.url);
      }
    } catch (error) {
      console.error('Download file error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Update file details
   */
  updateFile = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileId } = req.params;
      const { description, tags, category } = req.body;

      if (!fileId) {
        return ResponseService.error(res, 'File ID is required', 400);
      }

      const updateData = {
        description,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : undefined,
        category
      };

      const updatedFile = await TeamFileService.updateFile(fileId, userId, updateData);

      return ResponseService.success(res, 'File updated successfully', updatedFile);
    } catch (error) {
      console.error('Update file error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Delete file
   */
  deleteFile = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileId } = req.params;

      if (!fileId) {
        return ResponseService.error(res, 'File ID is required', 400);
      }

      const result = await TeamFileService.deleteFile(fileId, userId);

      return ResponseService.success(res, result.message);
    } catch (error) {
      console.error('Delete file error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get file statistics
   */
  getFileStats = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const stats = await TeamFileService.getFileStats(ideaId, userId);

      return ResponseService.success(res, 'File statistics retrieved successfully', stats);
    } catch (error) {
      console.error('Get file stats error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get files by category
   */
  getFilesByCategory = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId, category } = req.params;

      if (!ideaId || !category) {
        return ResponseService.error(res, 'Idea ID and category are required', 400);
      }

      const files = await TeamFileService.getFilesByCategory(ideaId, userId, category);

      return ResponseService.success(res, `${category} files retrieved successfully`, files);
    } catch (error) {
      console.error('Get files by category error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Search files
   */
  searchFiles = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { q, page = 1, limit = 20 } = req.query;

      if (!ideaId || !q) {
        return ResponseService.error(res, 'Idea ID and search query are required', 400);
      }

      const result = await TeamFileService.searchFiles(ideaId, userId, q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return ResponseService.success(res, 'Search results retrieved successfully', result);
    } catch (error) {
      console.error('Search files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get recent files
   */
  getRecentFiles = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { limit = 10 } = req.query;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const files = await TeamFileService.getRecentFiles(ideaId, userId, parseInt(limit));

      return ResponseService.success(res, 'Recent files retrieved successfully', files);
    } catch (error) {
      console.error('Get recent files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get popular files
   */
  getPopularFiles = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;
      const { limit = 10 } = req.query;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const files = await TeamFileService.getPopularFiles(ideaId, userId, parseInt(limit));

      return ResponseService.success(res, 'Popular files retrieved successfully', files);
    } catch (error) {
      console.error('Get popular files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get user's uploaded files
   */
  getUserFiles = this.asyncHandler(async (req, res) => {
    try {
      const requestingUserId = req.user._id;
      const { ideaId, userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!ideaId || !userId) {
        return ResponseService.error(res, 'Idea ID and User ID are required', 400);
      }

      const result = await TeamFileService.getUserFiles(
        ideaId, 
        userId, 
        requestingUserId, 
        { page: parseInt(page), limit: parseInt(limit) }
      );

      return ResponseService.success(res, 'User files retrieved successfully', result);
    } catch (error) {
      console.error('Get user files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Bulk delete files
   */
  bulkDeleteFiles = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return ResponseService.error(res, 'File IDs array is required', 400);
      }

      const results = await TeamFileService.bulkDeleteFiles(fileIds, userId);

      return ResponseService.success(res, 'Bulk delete operation completed', results);
    } catch (error) {
      console.error('Bulk delete files error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });

  /**
   * Get file categories
   */
  getCategories = this.asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
      const { ideaId } = req.params;

      if (!ideaId) {
        return ResponseService.error(res, 'Idea ID is required', 400);
      }

      const categories = await TeamFileService.getCategories(ideaId, userId);

      return ResponseService.success(res, 'File categories retrieved successfully', categories);
    } catch (error) {
      console.error('Get categories error:', error);
      return ResponseService.error(res, error.message, 400);
    }
  });
}

export default new TeamFileController();
