import jwt from 'jsonwebtoken';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

class IdeaService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: 'dysr0wotl',
      api_key: '556186415216556',
      api_secret: 'vFobJ4jaGdWeYmFZtsTwwBI-MpU'
    });
  }

  // Helper method to get user from token
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Create new idea
  async createIdea(token, ideaData, file) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { title, description, category, tags, isPublic, allowComments, allowSharing } = ideaData;

    // Validate required fields
    if (!title || !description || !category) {
      throw new Error('Title, description, and category are required');
    }

    // Handle image upload if provided
    let imageUrl = null;
    if (file) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'ideas',
          public_id: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        imageUrl = result.secure_url;
        
        // Clean up temporary file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (uploadError) {
        // Clean up temporary file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    }

    // Create idea
    const idea = new Idea({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      image: imageUrl,
      author: user._id,
      isPublic: isPublic === 'true',
      allowComments: allowComments !== 'false',
      allowSharing: allowSharing !== 'false'
    });

    await idea.save();

    // Populate author information
    await idea.populate('author', 'firstName fullName avatar');

    return idea;
  }

  // Get all ideas with pagination and filters
  async getAllIdeas(filters) {
    const { page, limit, category, search, sortBy, sortOrder } = filters;
    
    // Build query
    const query = { isPublic: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const ideas = await Idea.find(query)
      .populate('author', 'firstName fullName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Idea.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      ideas,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Get idea by ID
  async getIdeaById(id) {
    const idea = await Idea.findById(id)
      .populate('author', 'firstName fullName avatar bio company position')
      .populate('comments.author', 'firstName fullName avatar')
      .lean();

    if (!idea) {
      return null;
    }

    // Increment view count
    await Idea.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return idea;
  }

  // Update idea
  async updateIdea(token, ideaId, updateData, file) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check ownership
    if (idea.author.toString() !== user._id.toString()) {
      throw new Error('You can only update your own ideas');
    }

    // Handle image upload if provided
    if (file) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'ideas',
          public_id: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        updateData.image = result.secure_url;
        
        // Clean up temporary file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (uploadError) {
        // Clean up temporary file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    }

    // Update idea
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        idea[key] = updateData[key];
      }
    });

    idea.updatedAt = new Date();
    await idea.save();

    // Populate author information
    await idea.populate('author', 'firstName fullName avatar');

    return idea;
  }

  // Delete idea
  async deleteIdea(token, ideaId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check ownership
    if (idea.author.toString() !== user._id.toString()) {
      throw new Error('You can only delete your own ideas');
    }

    // Delete idea
    await Idea.findByIdAndDelete(ideaId);
  }

  // Like idea
  async likeIdea(token, ideaId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if already liked
    if (idea.likes.includes(user._id)) {
      throw new Error('You have already liked this idea');
    }

    // Add like
    idea.likes.push(user._id);
    await idea.save();

    return {
      likes: idea.likes.length,
      isLiked: true
    };
  }

  // Unlike idea
  async unlikeIdea(token, ideaId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if not liked
    if (!idea.likes.includes(user._id)) {
      throw new Error('You have not liked this idea');
    }

    // Remove like
    idea.likes = idea.likes.filter(id => id.toString() !== user._id.toString());
    await idea.save();

    return {
      likes: idea.likes.length,
      isLiked: false
    };
  }

  // Comment on idea
  async commentOnIdea(token, ideaId, content) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!content || content.trim() === '') {
      throw new Error('Comment content is required');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if comments are allowed
    if (!idea.allowComments) {
      throw new Error('Comments are not allowed on this idea');
    }

    // Add comment
    const comment = {
      author: user._id,
      content: content.trim(),
      createdAt: new Date()
    };

    idea.comments.push(comment);
    await idea.save();

    // Populate comment author
    await idea.populate('comments.author', 'firstName fullName avatar');

    return idea.comments[idea.comments.length - 1];
  }

  // Get idea comments
  async getIdeaComments(ideaId, pagination) {
    const { page, limit } = pagination;
    
    const idea = await Idea.findById(ideaId)
      .populate('comments.author', 'firstName fullName avatar')
      .select('comments')
      .lean();

    if (!idea) {
      return null;
    }

    const total = idea.comments.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const comments = idea.comments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    return {
      comments,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Delete comment
  async deleteComment(token, ideaId, commentId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const comment = idea.comments.id(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check ownership
    if (comment.author.toString() !== user._id.toString()) {
      throw new Error('You can only delete your own comments');
    }

    // Remove comment
    idea.comments.pull(commentId);
    await idea.save();
  }

  // Share idea
  async shareIdea(token, ideaId, platform, message) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if sharing is allowed
    if (!idea.allowSharing) {
      throw new Error('Sharing is not allowed on this idea');
    }

    // Increment share count
    idea.shares += 1;
    await idea.save();

    return {
      shares: idea.shares,
      platform,
      message: message || `Check out this idea: ${idea.title}`
    };
  }

  // Get user's ideas
  async getUserIdeas(token, pagination) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const ideas = await Idea.find({ author: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Idea.countDocuments({ author: user._id });
    const totalPages = Math.ceil(total / limit);

    return {
      ideas,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Get trending ideas
  async getTrendingIdeas(filters) {
    const { limit, timeframe } = filters;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
        break;
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
    }

    const ideas = await Idea.aggregate([
      { $match: { ...dateFilter, isPublic: true } },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$likes', 2] },
              { $multiply: ['$comments', 3] },
              { $multiply: ['$shares', 1] },
              { $multiply: ['$views', 0.1] }
            ]
          }
        }
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          image: 1,
          likes: 1,
          comments: 1,
          shares: 1,
          views: 1,
          createdAt: 1,
          'author.firstName': 1,
          'author.fullName': 1,
          'author.avatar': 1,
          score: 1
        }
      }
    ]);

    return { ideas, timeframe };
  }

  // Get ideas by category
  async getIdeasByCategory(category, filters) {
    const { page, limit, sortBy, sortOrder } = filters;
    
    const query = { category, isPublic: true };
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (page - 1) * limit;
    
    const ideas = await Idea.find(query)
      .populate('author', 'firstName fullName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Idea.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      ideas,
      category,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Search ideas
  async searchIdeas(filters) {
    const { query, category, tags, page, limit } = filters;
    
    const searchQuery = { isPublic: true };
    
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (category) {
      searchQuery.category = category;
    }
    
    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }
    
    const skip = (page - 1) * limit;
    
    const ideas = await Idea.find(searchQuery)
      .populate('author', 'firstName fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Idea.countDocuments(searchQuery);
    const totalPages = Math.ceil(total / limit);

    return {
      ideas,
      searchQuery: { query, category, tags },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Get idea statistics
  async getIdeaStats(ideaId) {
    const idea = await Idea.findById(ideaId)
      .select('likes comments shares views createdAt')
      .lean();

    if (!idea) {
      return null;
    }

    const now = new Date();
    const ageInDays = Math.floor((now - new Date(idea.createdAt)) / (1000 * 60 * 60 * 24));

    return {
      likes: idea.likes.length,
      comments: idea.comments.length,
      shares: idea.shares,
      views: idea.views,
      ageInDays,
      engagementRate: idea.views > 0 ? ((idea.likes.length + idea.comments.length) / idea.views * 100).toFixed(2) : 0
    };
  }

  // Report idea
  async reportIdea(token, ideaId, reason, description) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Add report
    const report = {
      reporter: user._id,
      reason,
      description,
      reportedAt: new Date()
    };

    idea.reports.push(report);
    await idea.save();
  }

  // Get idea insights
  async getIdeaInsights(token, ideaId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check ownership
    if (idea.author.toString() !== user._id.toString()) {
      throw new Error('You can only view insights for your own ideas');
    }

    const stats = await this.getIdeaStats(ideaId);
    
    // Get engagement trends
    const engagementTrends = await this.getEngagementTrends(ideaId);

    return {
      ...stats,
      engagementTrends,
      topCommenters: await this.getTopCommenters(ideaId),
      categoryPerformance: await this.getCategoryPerformance(idea.category)
    };
  }

  // Get engagement trends (placeholder)
  async getEngagementTrends(ideaId) {
    // This would typically involve time-series data analysis
    return {
      dailyViews: [],
      weeklyLikes: [],
      monthlyComments: []
    };
  }

  // Get top commenters (placeholder)
  async getTopCommenters(ideaId) {
    // This would aggregate comment data by user
    return [];
  }

  // Get category performance (placeholder)
  async getCategoryPerformance(category) {
    // This would compare performance against other ideas in the same category
    return {
      category,
      averageViews: 0,
      averageLikes: 0,
      averageComments: 0
    };
  }
}

export default IdeaService;
