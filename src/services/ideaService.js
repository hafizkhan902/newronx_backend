import jwt from 'jsonwebtoken';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';
import Chat from '../models/chat.model.js';
import TeamService from './teamService.js';
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
    
    // Initialize team service
    this.teamService = new TeamService();
  }

  // Normalize incoming payload to maintain backward compatibility with older frontends
  normalizeIdeaInput(rawData) {
    // If client sent a JSON string in a single field (e.g., "data" or "idea"), parse it
    let data = { ...rawData };
    try {
      if (typeof rawData?.data === 'string') {
        data = { ...data, ...JSON.parse(rawData.data) };
      }
    } catch {}
    try {
      if (typeof rawData?.idea === 'string') {
        data = { ...data, ...JSON.parse(rawData.idea) };
      }
    } catch {}

    // Map alternative field names
    const title =
      data.title ||
      data.tittle ||
      data.ideaTitle ||
      data.name ||
      data.heading ||
      '';

    const description =
      data.description ||
      data.content ||
      data.details ||
      data.ideaDescription ||
      '';

    const category =
      data.category ||
      data.categoryName ||
      data.type ||
      'general';

    // Tags may arrive as array, comma-separated string, or JSON string
    let tags = data.tags ?? data.tagList ?? data.tag;
    if (typeof tags === 'string') {
      // Try parse JSON array first
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          tags = parsed;
        } else {
          tags = tags.split(',');
        }
      } catch {
        tags = tags.split(',');
      }
    }
    if (Array.isArray(tags)) {
      tags = tags.map((t) => (typeof t === 'string' ? t.trim() : t)).filter(Boolean);
    } else if (!tags) {
      tags = [];
    }

    // Additional descriptive fields (legacy aliases supported)
    const targetAudience = (data.targetAudience || data.audience || data.target || '').toString().trim();
    const marketAlternatives = (data.marketAlternatives || data.alternatives || '').toString().trim();
    const problemStatement = (data.problemStatement || data.problem || '').toString().trim();
    const uniqueValue = (data.uniqueValue || data.uvp || data.uniqueSellingPoint || '').toString().trim();
    let neededRoles = data.neededRoles ?? data.roles ?? data.role;
    if (typeof neededRoles === 'string') {
      try {
        const parsed = JSON.parse(neededRoles);
        neededRoles = Array.isArray(parsed) ? parsed : neededRoles.split(',');
      } catch {
        neededRoles = neededRoles.split(',');
      }
    }
    if (Array.isArray(neededRoles)) {
      neededRoles = neededRoles.map(r => (typeof r === 'string' ? r.trim() : r)).filter(Boolean);
    } else if (!neededRoles) {
      neededRoles = [];
    }
    const pitch = (data.pitch || data.elevatorPitch || '').toString().trim();

    // Booleans may arrive as strings
    const toBool = (v, fallback) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v.toLowerCase() === 'true';
      if (v === 0 || v === 1) return Boolean(v);
      return fallback;
    };

    const isPublic = toBool(data.isPublic ?? data.public ?? data.privacy === 'public', true);
    const allowComments = toBool(data.allowComments ?? data.commentsAllowed, true);
    const allowSharing = toBool(data.allowSharing ?? data.sharingAllowed, true);

    // Normalize privacy to model enum: 'Public' | 'Team' | 'Private'
    let privacy = data.privacy || (isPublic ? 'Public' : 'Private');
    if (typeof privacy === 'string') {
      const p = privacy.toLowerCase();
      if (p === 'public') privacy = 'Public';
      else if (p === 'team' || p === 'team-only') privacy = 'Team';
      else privacy = 'Private';
    } else {
      privacy = isPublic ? 'Public' : 'Private';
    }

    return {
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim() || 'general',
      tags,
      isPublic,
      allowComments,
      allowSharing,
      privacy,
      targetAudience,
      marketAlternatives,
      problemStatement,
      uniqueValue,
      neededRoles,
      pitch
    };
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

    // Normalize payload to be compatible with legacy frontends
    const normalized = this.normalizeIdeaInput(ideaData);
    const { title, description, category, tags, privacy, targetAudience, marketAlternatives, problemStatement, uniqueValue, neededRoles, pitch } = normalized;

    // Validate required fields (category now defaults to 'general')
    if (!title || !description) {
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

    // Create idea mapped to current schema
    const idea = new Idea({
      title,
      description,
      privacy,
      author: user._id,
      tags: Array.isArray(tags) ? tags : [],
      targetAudience,
      marketAlternatives,
      problemStatement,
      uniqueValue,
      neededRoles,
      pitch
    });

    // Attach image to images array if present
    if (imageUrl) {
      idea.images = idea.images || [];
      idea.images.push({ url: imageUrl, contentType: file?.mimetype, size: file?.size });
    }

    // If frontend still sends a category, add it as a tag for discoverability
    if (category) {
      if (!idea.tags.includes(category)) idea.tags.push(category);
    }

    await idea.save();

    // Populate author information
    await idea.populate('author', 'firstName fullName avatar');

    return idea;
  }

  // Get all ideas with pagination and filters
  async getAllIdeas(filters) {
    const { page, limit, category, search, sortBy, sortOrder } = filters;
    
    // Build query using privacy enum (Public | Team | Private)
    const query = { privacy: 'Public' };
    
    if (category) {
      // Legacy support: we store category as a tag for discoverability
      query.tags = { $in: [category] };
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

  // Get approaches for a specific idea
  async getApproaches(ideaId) {
    const idea = await Idea.findById(ideaId)
      .select('approaches title')
      .populate('approaches.user', 'firstName fullName avatar')
      .lean();

    if (!idea) return null;

    const approaches = (idea.approaches || []).map((a) => ({
      _id: a._id?.toString(),
      user: a.user
        ? {
            _id: a.user._id?.toString(),
            firstName: a.user.firstName,
            fullName: a.user.fullName,
            avatar: a.user.avatar,
          }
        : undefined,
      role: a.role,
      description: a.description,
      createdAt: a.createdAt,
    }));

    return { ideaId: idea._id?.toString(), title: idea.title, approaches };
  }

  // Get all incoming approaches for ideas authored by current user
  async getIncomingApproaches(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const ideas = await Idea.find({ author: user._id })
      .select('title approaches')
      .populate('approaches.user', 'firstName fullName avatar')
      .lean();

    const items = [];
    for (const idea of ideas) {
      for (const a of idea.approaches || []) {
        items.push({
          ideaId: idea._id?.toString(),
          ideaTitle: idea.title,
          _id: a._id?.toString(),
          user: a.user
            ? {
                _id: a.user._id?.toString(),
                firstName: a.user.firstName,
                fullName: a.user.fullName,
                avatar: a.user.avatar,
              }
            : undefined,
          role: a.role,
          description: a.description,
          createdAt: a.createdAt,
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items;
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

  // Submit an approach/proposal to an idea with desired role
  async approachIdea(token, ideaId, role, description) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Prevent author from approaching their own idea
    if (idea.author.toString() === user._id.toString()) {
      throw new Error('You cannot approach your own idea');
    }

    const normalizedRole = (role || '').toString().trim();
    const normalizedDescription = (description || '').toString().trim();

    if (!normalizedRole) {
      throw new Error('Desired role is required');
    }
    if (!normalizedDescription) {
      throw new Error('Please include a brief description');
    }

    // Optional: prevent duplicate approach with same role by same user
    const alreadyApproached = (idea.approaches || []).some(a =>
      a.user && a.user.toString() === user._id.toString() && a.role === normalizedRole
    );
    if (alreadyApproached) {
      throw new Error('You have already approached this idea for the same role');
    }

    idea.approaches = idea.approaches || [];
    idea.approaches.push({
      user: user._id,
      role: normalizedRole,
      description: normalizedDescription,
      createdAt: new Date()
    });

    await idea.save();

    // Populate the last approach's user info
    await idea.populate('approaches.user', 'firstName fullName avatar');
    const created = idea.approaches[idea.approaches.length - 1];

    // Sanitize for frontend (convert ObjectIds to strings)
    const response = {
      _id: created._id ? created._id.toString() : undefined,
      user: created.user ? {
        _id: created.user._id ? created.user._id.toString() : undefined,
        firstName: created.user.firstName,
        fullName: created.user.fullName,
        avatar: created.user.avatar
      } : undefined,
      role: created.role,
      description: created.description,
      createdAt: created.createdAt
    };

    return response;
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

  // Helper method to create group chat when approach is accepted
  async createIdeaCollaborationChat(idea, approacher, ideaAuthor) {
    try {
      // Check if chat already exists for this idea and approacher combination
      const existingChat = await Chat.findOne({
        type: 'group',
        'metadata.ideaId': idea._id,
        'members.user': { $all: [ideaAuthor._id, approacher._id] }
      });

      if (existingChat) {
        console.log('Chat already exists for this idea collaboration');
        return existingChat;
      }

      // Create group chat with idea title
      const chatName = `💡 ${idea.title}`;
      const chatDescription = `Collaboration chat for the idea: ${idea.title}`;

      const chat = new Chat({
        type: 'group',
        name: chatName,
        description: chatDescription,
        members: [
          {
            user: ideaAuthor._id,
            role: 'admin', // Idea author is admin
            joinedAt: new Date(),
            isActive: true
          },
          {
            user: approacher._id,
            role: 'member', // Approacher is member
            joinedAt: new Date(),
            isActive: true
          }
        ],
        creator: ideaAuthor._id,
        metadata: {
          ideaId: idea._id,
          ideaTitle: idea.title,
          chatType: 'idea_collaboration',
          approachId: null // Will be set by caller
        }
      });

      await chat.save();

      // Populate member information
      await chat.populate('members.user', 'firstName fullName avatar');
      await chat.populate('creator', 'firstName fullName avatar');

      console.log(`Created collaboration chat: ${chatName} for idea: ${idea.title}`);
      return chat;

    } catch (error) {
      console.error('Error creating collaboration chat:', error);
      throw new Error('Failed to create collaboration chat');
    }
  }

  // Send notification about chat creation
  async notifyApproacherAboutChat(approacher, chat, idea) {
    try {
      // Import notification service dynamically to avoid circular dependencies
      const { default: NotificationService } = await import('./notificationService.js');
      const notificationService = new NotificationService();

      await notificationService.createNotification(approacher._id, {
        type: 'chat_created',
        title: 'Collaboration Chat Created',
        message: `Your approach for "${idea.title}" was accepted! A collaboration chat has been created.`,
        data: {
          chatId: chat._id,
          ideaId: idea._id,
          ideaTitle: idea.title,
          chatName: chat.name
        },
        relatedEntities: {
          idea: idea._id,
          chat: chat._id,
          user: ideaAuthor._id
        }
      });

      console.log(`Notification sent to ${approacher.fullName} about chat creation`);
    } catch (error) {
      console.error('Error sending chat notification:', error);
      // Don't throw error here as chat creation is more important than notification
    }
  }

  // Update approach status (select/decline/queue) with team conflict detection
  async updateApproachStatus(userId, ideaId, approachId, status, resolution = null) {
    // Find the idea with populated data
    const idea = await Idea.findById(ideaId)
      .populate('author', 'firstName fullName avatar email')
      .populate('approaches.user', 'firstName fullName avatar email')
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar');
    
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Check if user is the idea author
    if (idea.author._id.toString() !== userId.toString()) {
      throw new Error('Only the idea author can manage approaches');
    }

    // Find the approach
    const approach = idea.approaches.id(approachId);
    if (!approach) {
      throw new Error('Approach not found');
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['selected', 'declined', 'queued'],
      'queued': ['selected', 'declined'],
      'selected': ['declined', 'queued'],
      'declined': ['selected', 'queued']
    };

    if (!validTransitions[approach.status]?.includes(status)) {
      throw new Error(`Invalid status transition from ${approach.status} to ${status}`);
    }

    const previousStatus = approach.status;

    // If selecting approach, check for role conflicts
    if (status === 'selected') {
      const conflict = await this.teamService.checkRoleConflict(ideaId, approach.role);
      
      if (conflict.hasConflict && !resolution) {
        // Return conflict information for frontend to handle
        return {
          success: false,
          conflict: true,
          conflictData: conflict,
          approach: {
            id: approachId,
            user: approach.user,
            role: approach.role,
            description: approach.description
          }
        };
      }

      // If resolution provided, handle it
      if (conflict.hasConflict && resolution) {
        const resolutionResult = await this.teamService.acceptApproachWithResolution(
          ideaId, 
          approachId, 
          { ...resolution, authorId: userId }
        );
        
        return {
          success: true,
          approach: {
            ...approach.toObject(),
            status: 'selected',
            statusUpdatedAt: new Date(),
            statusUpdatedBy: userId
          },
          resolution: resolutionResult,
          teamMetrics: idea.getTeamMetrics(),
          message: `Approach accepted with resolution: ${resolutionResult.message}`
        };
      }

      // No conflict, proceed with normal team addition
      if (!conflict.hasConflict) {
        const roleData = {
          assignedRole: approach.role,
          roleType: approach.role
        };
        idea.addTeamMember(approach.user._id, roleData, userId);
      }
    }

    // Update approach status
    approach.status = status;
    approach.statusUpdatedAt = new Date();
    approach.statusUpdatedBy = userId;

    await idea.save();

    // If approach is being selected for the first time, create collaboration chat
    let createdChat = null;
    if (status === 'selected' && previousStatus !== 'selected') {
      try {
        // Get the approacher user details
        const approacher = await User.findById(approach.user).select('firstName fullName avatar email');
        if (approacher) {
          // Create collaboration chat
          createdChat = await this.createIdeaCollaborationChat(idea, approacher, idea.author);
          
          // Update chat metadata with approach ID
          if (createdChat) {
            createdChat.metadata.approachId = approachId;
            await createdChat.save();

            // Send notification to approacher
            await this.notifyApproacherAboutChat(approacher, createdChat, idea);
          }
        }
      } catch (chatError) {
        console.error('Error creating collaboration chat:', chatError);
        // Don't fail the entire operation if chat creation fails
        // The approach status update is more critical
      }
    }

    // Populate approach user info for response
    await idea.populate('approaches.user', 'firstName fullName avatar');
    await idea.populate('approaches.statusUpdatedBy', 'firstName fullName');

    const result = {
      approach: approach,
      message: `Approach ${status} successfully`,
      updatedAt: approach.statusUpdatedAt
    };

    // Include chat info in response if created
    if (createdChat) {
      result.collaborationChat = {
        chatId: createdChat._id,
        chatName: createdChat.name,
        message: 'Collaboration chat created successfully'
      };
    }

    return result;
  }
}

export default IdeaService;
