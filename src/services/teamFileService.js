import mongoose from 'mongoose';
import TeamFile from '../models/teamFile.model.js';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';

class TeamFileService {
  
  /**
   * Upload a file to team storage
   */
  async uploadFile(userId, fileData) {
    const { 
      ideaId, 
      file, 
      description, 
      tags = [],
      category 
    } = fileData;

    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Only team members can upload files');
    }

    // Upload file to Cloudinary
    const { FileUploadService } = await import('./fileUploadService.js');
    const uploadResult = await FileUploadService.uploadToCloudinary(file, 'team-files');

    // Create team file record
    const teamFile = new TeamFile({
      ideaId,
      uploadedBy: userId,
      filename: uploadResult.publicId,
      originalName: file.originalname,
      description: description || '',
      uploadMethod: 'direct',
      fileType: file.mimetype,
      fileSize: file.size,
      url: uploadResult.url,
      category: category || 'other',
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      metadata: {
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height
      }
    });

    await teamFile.save();
    
    // Populate uploader info
    await teamFile.populate('uploadedBy', 'firstName fullName avatar');
    
    return teamFile;
  }

  /**
   * Upload a file via link
   */
  async uploadLink(userId, linkData) {
    const { 
      ideaId, 
      url, 
      title, 
      description, 
      tags = [],
      category = 'other' 
    } = linkData;

    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Only team members can upload files');
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL provided');
    }

    // Determine file type from URL
    let fileType = 'link';
    let originalName = title || url.split('/').pop() || 'Shared Link';
    
    // Try to detect file type from URL
    const urlLower = url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      fileType = 'video/youtube';
      category = 'video';
    } else if (urlLower.includes('drive.google.com')) {
      fileType = 'link/google-drive';
      category = 'document';
    } else if (urlLower.includes('dropbox.com')) {
      fileType = 'link/dropbox';
    } else if (urlLower.includes('github.com')) {
      fileType = 'link/github';
      category = 'code';
    }

    // Create team file record
    const teamFile = new TeamFile({
      ideaId,
      uploadedBy: userId,
      filename: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalName,
      description: description || '',
      uploadMethod: 'link',
      fileType,
      fileSize: 0,
      url,
      category,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())
    });

    await teamFile.save();
    
    // Populate uploader info
    await teamFile.populate('uploadedBy', 'firstName fullName avatar');
    
    return teamFile;
  }

  /**
   * Get team files
   */
  async getTeamFiles(ideaId, userId, options = {}) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Only team members can view team files');
    }

    const {
      page = 1,
      limit = 20,
      category = null,
      fileType = null,
      uploadedBy = null,
      sortBy = 'createdAt',
      sortOrder = -1,
      search = null
    } = options;

    const files = await TeamFile.getTeamFiles(ideaId, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      fileType,
      uploadedBy,
      sortBy,
      sortOrder: parseInt(sortOrder),
      search
    });

    // Get total count for pagination
    const totalFiles = await TeamFile.countDocuments({ 
      ideaId, 
      isActive: true,
      ...(category && { category }),
      ...(fileType && { fileType: new RegExp(fileType, 'i') }),
      ...(uploadedBy && { uploadedBy }),
      ...(search && {
        $or: [
          { originalName: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: new RegExp(search, 'i') }
        ]
      })
    });

    const totalPages = Math.ceil(totalFiles / limit);

    return {
      files,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFiles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single file by ID
   */
  async getFileById(fileId, userId) {
    const file = await TeamFile.findById(fileId)
      .populate('uploadedBy', 'firstName fullName avatar');

    if (!file || !file.isActive) {
      throw new Error('File not found');
    }

    // Verify user is a team member
    const idea = await Idea.findById(file.ideaId);
    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    return file;
  }

  /**
   * Download/Access file
   */
  async downloadFile(fileId, userId) {
    const file = await this.getFileById(fileId, userId);
    
    // Increment download count
    await file.incrementDownload();
    
    return {
      url: file.url,
      filename: file.originalName,
      fileType: file.fileType,
      uploadMethod: file.uploadMethod
    };
  }

  /**
   * Update file details
   */
  async updateFile(fileId, userId, updateData) {
    const file = await TeamFile.findById(fileId);
    if (!file || !file.isActive) {
      throw new Error('File not found');
    }

    // Only uploader can update file details
    if (file.uploadedBy.toString() !== userId.toString()) {
      throw new Error('Only file uploader can update file details');
    }

    const { description, tags, category } = updateData;

    if (description !== undefined) file.description = description;
    if (tags !== undefined) {
      file.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    if (category !== undefined) file.category = category;

    await file.save();
    
    return await this.getFileById(fileId, userId);
  }

  /**
   * Delete file
   */
  async deleteFile(fileId, userId) {
    const file = await TeamFile.findById(fileId);
    if (!file || !file.isActive) {
      throw new Error('File not found');
    }

    // Check if user can delete (uploader or idea owner)
    const idea = await Idea.findById(file.ideaId);
    const canDelete = file.uploadedBy.toString() === userId.toString() || 
                     idea.author.toString() === userId.toString();

    if (!canDelete) {
      throw new Error('Only file uploader or idea owner can delete files');
    }

    // Soft delete
    file.isActive = false;
    await file.save();

    // Clean up physical file if direct upload
    if (file.uploadMethod === 'direct') {
      try {
        const { FileUploadService } = await import('./fileUploadService.js');
        await FileUploadService.deleteFromCloudinary(file.filename);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
      }
    }

    return { message: 'File deleted successfully' };
  }

  /**
   * Get file statistics
   */
  async getFileStats(ideaId, userId) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    return await TeamFile.getFileStats(ideaId);
  }

  /**
   * Get files by category
   */
  async getFilesByCategory(ideaId, userId, category) {
    const files = await this.getTeamFiles(ideaId, userId, { category, limit: 100 });
    return files.files;
  }

  /**
   * Search files
   */
  async searchFiles(ideaId, userId, searchQuery, options = {}) {
    return await this.getTeamFiles(ideaId, userId, { 
      search: searchQuery, 
      ...options 
    });
  }

  /**
   * Get recent files
   */
  async getRecentFiles(ideaId, userId, limit = 10) {
    const result = await this.getTeamFiles(ideaId, userId, { 
      limit, 
      sortBy: 'createdAt', 
      sortOrder: -1 
    });
    return result.files;
  }

  /**
   * Get popular files (most downloaded)
   */
  async getPopularFiles(ideaId, userId, limit = 10) {
    const result = await this.getTeamFiles(ideaId, userId, { 
      limit, 
      sortBy: 'downloadCount', 
      sortOrder: -1 
    });
    return result.files;
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(ideaId, targetUserId, requestingUserId, options = {}) {
    // Verify requesting user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === requestingUserId.toString() || 
                        idea.team.some(member => member.user.toString() === requestingUserId.toString());
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    return await this.getTeamFiles(ideaId, requestingUserId, { 
      uploadedBy: targetUserId, 
      ...options 
    });
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(fileIds, userId) {
    const results = [];
    
    for (const fileId of fileIds) {
      try {
        const result = await this.deleteFile(fileId, userId);
        results.push({ fileId, success: true, message: result.message });
      } catch (error) {
        results.push({ fileId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get file categories with counts
   */
  async getCategories(ideaId, userId) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        idea.team.some(member => member.user.toString() === userId.toString());
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    const categories = await TeamFile.aggregate([
      { 
        $match: { 
          ideaId: new mongoose.Types.ObjectId(ideaId), 
          isActive: true 
        } 
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return categories.map(cat => ({
      category: cat._id,
      count: cat.count,
      totalSize: cat.totalSize
    }));
  }
}

export default new TeamFileService();
