import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import emailService from '../services/emailService.js';
dotenv.config();

const router = Router();

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Optional auth middleware for feed
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId);
    }
  } catch (error) {
    req.user = null;
  }
  next();
};

// Place all /my endpoints FIRST, before any /:id or /user/:userId routes

// GET /api/ideas/my - Get all ideas authored by the logged-in user
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const ideas = await Idea.find({ author: userId })
      .populate('author', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar');
    res.json({ ideas });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching my ideas', error: error.message });
  }
});

// GET /api/ideas/my/contributed - Get all ideas the user has contributed to (not authored)
router.get('/my/contributed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const ideaIds = await Idea.find({
      author: { $ne: userId },
      $or: [
        { 'suggestions.user': userId },
        { 'approaches.user': userId },
        { likes: userId }
      ]
    }).distinct('_id');
    const ideas = await Idea.find({ _id: { $in: ideaIds } })
      .populate('author', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar');
    res.json({ ideas });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contributed ideas', error: error.message });
  }
});

// GET /api/ideas/my/stats - Get stats for the logged-in user's ideas
router.get('/my/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const ideas = await Idea.find({ author: userId }, 'appreciateCount approaches');
    const totalIdeas = ideas.length;
    const totalAppreciation = ideas.reduce((sum, idea) => sum + (idea.appreciateCount || 0), 0);
    const totalApproaches = ideas.reduce((sum, idea) => sum + (idea.approaches ? idea.approaches.length : 0), 0);

    res.json({
      totalIdeas,
      totalAppreciation,
      totalApproaches
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// GET /api/ideas/my/contributions - Get stats for the logged-in user's contributions
router.get('/my/contributions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Suggestions count
    const suggestionsCount = await Idea.countDocuments({ 'suggestions.user': userId });

    // Approaches count
    const approachesCount = await Idea.countDocuments({ 'approaches.user': userId });

    // Appreciations count (likes)
    const appreciationsCount = await Idea.countDocuments({ likes: userId });

    // Contributions: number of unique ideas where user has contributed (not as author)
    const contributedIdeas = await Idea.find({
      author: { $ne: userId },
      $or: [
        { 'suggestions.user': userId },
        { 'approaches.user': userId },
        { likes: userId }
      ]
    }).distinct('_id');
    const contributionsCount = contributedIdeas.length;

    res.json({
      contributions: contributionsCount,
      suggestions: suggestionsCount,
      approaches: approachesCount,
      appreciations: appreciationsCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contribution stats', error: error.message });
  }
});

// GET /api/ideas/my/appreciations - See who has appreciated your ideas
router.get('/my/appreciations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    // Find all ideas authored by the user that have likes
    const ideas = await Idea.find({ author: userId, likes: { $exists: true, $not: { $size: 0 } } })
      .populate('likes', 'firstName fullName avatar _id')
      .select('title likes');

    // Build the appreciation list
    const appreciations = [];
    for (const idea of ideas) {
      for (const user of idea.likes) {
        appreciations.push({
          user: {
            _id: user._id,
            avatar: user.avatar,
            fullName: user.fullName || user.firstName
          },
          message: `${user.fullName || user.firstName} has Appreciated you on : ${idea.title}`
        });
      }
    }

    res.json({ appreciations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appreciations', error: error.message });
  }
});

// GET /api/ideas/my/approaches - See all approaches received on your ideas
router.get('/my/approaches', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    // Find all ideas authored by the user that have approaches
    const ideas = await Idea.find({ author: userId, 'approaches.0': { $exists: true } })
      .populate('approaches.user', 'firstName fullName avatar')
      .select('title approaches');

    // Build the approaches list
    const approaches = [];
    for (const idea of ideas) {
      for (const approach of idea.approaches) {
        if (approach.user) {
          approaches.push({
            avatar: approach.user.avatar,
            message: `${approach.user.fullName || approach.user.firstName} has proposed an approach on : ${idea.title}`
          });
        }
      }
    }

    res.json({ approaches });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching approaches', error: error.message });
  }
});

// Configure Cloudinary with working credentials
const CLOUDINARY_CONFIG = {
  cloud_name: 'dysr0wotl',
  api_key: '556186415216556',
  api_secret: 'vFobJ4jaGdWeYmFZtsTwwBI-MpU'
};

cloudinary.config(CLOUDINARY_CONFIG);

// Verify Cloudinary configuration
console.log('Checking Cloudinary config...');
const cloudinaryConfig = cloudinary.config();
console.log('Cloudinary Configuration:', {
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key ? '✓ Set' : '✗ Missing',
  api_secret: cloudinaryConfig.api_secret ? '✓ Set' : '✗ Missing'
});

// Function to generate Cloudinary signature
const generateSignature = (publicId, timestamp) => {
  const str = `folder=ideas&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.api_secret}`;
  return crypto.createHash('sha1').update(str).digest('hex');
};

// Multer setup for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'ideas');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for multer
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (filePath, ideaId) => {
  try {
    console.log('Uploading to Cloudinary:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${ideaId}_${timestamp}`;
    const signature = generateSignature(publicId, timestamp);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'ideas',
      public_id: publicId,
      timestamp: timestamp,
      signature: signature,
      api_key: CLOUDINARY_CONFIG.api_key
    });

    console.log('Cloudinary upload result:', result);
    return {
      url: result.secure_url,
      contentType: result.format,
      size: result.bytes,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error details:', error);
    throw new Error('Failed to upload image to Cloudinary: ' + error.message);
  }
};

// POST /api/ideas - Create a new idea with image support
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    let uploadedImage = null;
    
    // Create new idea first to get the ID
    const {
      title,
      description,
      privacy,
      targetAudience,
      marketAlternatives,
      problemStatement,
      uniqueValue,
      neededRoles,
      pitch,
      tags,
      team,
      ndaProtection
    } = req.body;

    const newIdea = new Idea({
      title,
      description,
      privacy: privacy || 'Public',
      author: req.user._id,
      targetAudience,
      marketAlternatives,
      problemStatement,
      uniqueValue,
      neededRoles: neededRoles || [],
      pitch,
      tags: tags || [],
      status: 'published', // Set status to published on creation
      team: team || { accessLevel: 'public' },
      images: [],
      ndaProtection: ndaProtection || {
        enabled: false,
        requiresNDA: false,
        blurContent: true
      }
    });

    await newIdea.save();
    
    // Upload image to Cloudinary if present
    if (req.file) {
      try {
        console.log('Starting Cloudinary upload...');
        uploadedImage = await uploadToCloudinary(req.file.path, newIdea._id);
        console.log('Upload successful:', uploadedImage);
        
        // Update idea with the image
        newIdea.images = [uploadedImage];
        await newIdea.save();
        
        // Clean up local file
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        // Clean up local file even if upload fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ 
          message: 'Error uploading image', 
          error: error.message 
        });
      }
    } else {
      console.log('No image file in request');
    }

    await newIdea.populate('author', 'firstName fullName avatar');
    console.log('Idea created with image:', uploadedImage);

    res.status(201).json({
      message: 'Idea created successfully',
      idea: newIdea
    });
  } catch (error) {
    // Clean up any uploaded file if there's an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Create idea error:', error);
    res.status(500).json({ 
      message: 'Error creating idea', 
      error: error.message 
    });
  }
});

// GET /api/ideas - Get all ideas (feed)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ideas = await Idea.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'firstName fullName avatar')
      .populate('comments.author', 'firstName fullName avatar');

    const total = await Idea.countDocuments({ status: 'published' });

    res.json({
      ideas,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalIdeas: total
    });
  } catch (error) {
    console.error('Fetch ideas error:', error);
    res.status(500).json({ message: 'Error fetching ideas', error: error.message });
  }
});

// GET /api/ideas/feed - Get public ideas feed with pagination
router.get('/feed', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all public ideas
    const ideas = await Idea.find({ privacy: 'Public' })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('author', '_id firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar')
      .lean();

    // Get total count for pagination
    const totalIdeas = await Idea.countDocuments({ privacy: 'Public' });
    const totalPages = Math.ceil(totalIdeas / limit);

    // Add engagement metrics and appreciated status, handle NDA protection
    const formattedIdeas = ideas.map(idea => {
      let formattedIdea = {
        ...idea,
        engagementMetrics: {
          appreciateCount: idea.appreciateCount || 0,
          proposeCount: idea.proposeCount || 0,
          suggestCount: idea.suggestCount || 0,
          collaboratorCount: idea.collaborators?.length || 0
        },
        appreciated: userId ? (idea.likes || []).some(id => id.toString() === userId) : false
      };

      // Handle NDA protection
      if (idea.ndaProtection && idea.ndaProtection.enabled) {
        const canView = req.user ? canViewNDAContent(idea, req.user) : false;
        
        if (!canView && idea.ndaProtection.blurContent) {
          formattedIdea.description = '[NDA PROTECTED - Sign NDA to view]';
          formattedIdea.problemStatement = '[NDA PROTECTED]';
          formattedIdea.uniqueValue = '[NDA PROTECTED]';
          formattedIdea.pitch = '[NDA PROTECTED]';
          formattedIdea.ndaProtection.contentBlurred = true;
          formattedIdea.ndaProtection.blurMessage = idea.ndaProtection.ndaMessage || 'This idea is protected by NDA. Please sign the NDA to view full details.';
        }
      }

      return formattedIdea;
    });

    res.json({
      ideas: formattedIdeas,
      pagination: {
        currentPage: page,
        totalPages,
        totalIdeas,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Feed fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching ideas feed', 
      error: error.message 
    });
  }
});

// GET /api/ideas/public - Public ideas browsing (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, sort = 'latest' } = req.query;
    
    // Build query for published AND public ideas only
    const query = { 
      status: 'published',
      privacy: 'Public'
    };
    
    // Add category filter if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Add search filter if provided
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    
    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'latest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        // For public view, we'll sort by total engagement count
        sortOptions = { 
          $expr: { 
            $add: [
              { $size: { $ifNull: ['$approaches', []] } },
              { $size: { $ifNull: ['$suggestions', []] } }
            ]
          }
        };
        break;
      case 'trending':
        // For public view, sort by recent activity (simplified)
        sortOptions = { updatedAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get ideas with author information (limited fields for privacy)
    const ideas = await Idea.find(query)
      .populate('author', '_id firstName fullName avatar bio company position')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Idea.countDocuments(query);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    // Format response for public viewing
    const formattedIdeas = ideas.map(idea => ({
      _id: idea._id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      image: idea.image,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      author: {
        _id: idea.author._id,
        firstName: idea.author.firstName,
        fullName: idea.author.fullName,
        avatar: idea.author.avatar,
        bio: idea.author.bio,
        company: idea.author.company,
        position: idea.author.position
      },
      stats: {
        approaches: idea.approaches ? idea.approaches.length : 0,
        suggestions: idea.suggestions ? idea.suggestions.length : 0
      },
      // Don't include actual approaches/suggestions content for public view
      // Only show counts to encourage login for full interaction
      requiresLogin: true
    }));
    
    res.json({
      ideas: formattedIdeas,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      filters: {
        category: category || 'all',
        search: search || '',
        sort
      }
    });
    
  } catch (error) {
    console.error('Public ideas error:', error);
    res.status(500).json({ message: 'Error fetching public ideas', error: error.message });
  }
});

// GET /api/ideas/public/:id - Get single public idea (no authentication required)
router.get('/public/:id', async (req, res) => {
  try {
    const idea = await Idea.findOne({ 
      _id: req.params.id, 
      status: 'published',
      privacy: 'Public'
    })
      .populate('author', '_id firstName fullName avatar bio company position isInvestor isMentor')
      .lean();
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found or not published.' });
    }
    
    // Format response for public viewing
    const formattedIdea = {
      _id: idea._id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      image: idea.image,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      author: {
        _id: idea.author._id,
        firstName: idea.author.firstName,
        fullName: idea.author.fullName,
        avatar: idea.author.avatar,
        bio: idea.author.bio,
        company: idea.author.company,
        position: idea.author.position,
        isInvestor: idea.author.isInvestor,
        isMentor: idea.author.isMentor
      },
      stats: {
        approaches: idea.approaches ? idea.approaches.length : 0,
        suggestions: idea.suggestions ? idea.suggestions.length : 0
      },
      // Show limited interaction data to encourage login
      preview: {
        hasApproaches: idea.approaches && idea.approaches.length > 0,
        hasSuggestions: idea.suggestions && idea.suggestions.length > 0,
        requiresLogin: true
      }
    };
    
    res.json(formattedIdea);
    
  } catch (error) {
    console.error('Public idea error:', error);
    res.status(500).json({ message: 'Error fetching public idea', error: error.message });
  }
});

// GET /api/ideas/categories - Get available categories for public browsing
router.get('/categories', async (req, res) => {
  try {
    const categories = await Idea.distinct('category', { 
      status: 'published',
      privacy: 'Public'
    });
    const categoryCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Idea.countDocuments({ 
          category, 
          status: 'published',
          privacy: 'Public'
        });
        return { category, count };
      })
    );
    
    res.json({
      categories: categoryCounts,
      total: categoryCounts.reduce((sum, cat) => sum + cat.count, 0)
    });
    
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// GET /api/ideas/:id/share - Generate shareable link for an idea
router.get('/:id/share', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const idea = await Idea.findById(req.params.id)
      .populate('author', '_id firstName fullName')
      .lean();
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found.' });
    }
    
    // Check if user is the author or if idea is public
    const isAuthor = idea.author._id.toString() === user._id.toString();
    const isPublic = idea.privacy === 'Public' && idea.status === 'published';
    
    if (!isAuthor && !isPublic) {
      return res.status(403).json({ 
        message: 'You can only share your own ideas or public ideas.' 
      });
    }
    
    // Generate shareable link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareableLink = `${baseUrl}/ideas/public/${idea._id}`;
    
    // Generate social media sharing data
    const shareData = {
      title: idea.title,
      description: idea.description.length > 160 ? 
        idea.description.substring(0, 157) + '...' : 
        idea.description,
      url: shareableLink,
      author: idea.author.fullName,
      image: idea.images && idea.images.length > 0 ? idea.images[0].url : null,
      category: idea.category || 'Innovation',
      engagement: {
        approaches: idea.approaches ? idea.approaches.length : 0,
        suggestions: idea.suggestions ? idea.suggestions.length : 0
      }
    };
    
    // Generate different share formats
    const shareFormats = {
      direct: shareableLink,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this idea: ${idea.title}`)}&url=${encodeURIComponent(shareableLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableLink)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareableLink)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out this idea: ${idea.title} - ${shareableLink}`)}`,
      email: `mailto:?subject=${encodeURIComponent(`Check out this idea: ${idea.title}`)}&body=${encodeURIComponent(`I found this interesting idea on StudentMate:\n\n${idea.title}\n\n${idea.description}\n\nView it here: ${shareableLink}`)}`
    };
    
    res.json({
      success: true,
      message: 'Shareable link generated successfully.',
      data: {
        ideaId: idea._id,
        ideaTitle: idea.title,
        shareableLink,
        shareData,
        shareFormats,
        privacy: idea.privacy,
        status: idea.status,
        isAuthor,
        canShare: isAuthor || isPublic
      }
    });
    
  } catch (error) {
    console.error('Generate share link error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error generating share link', error: error.message });
  }
});

// POST /api/ideas/:id/share/copy - Copy shareable link to clipboard (frontend simulation)
router.post('/:id/share/copy', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const idea = await Idea.findById(req.params.id)
      .populate('author', '_id firstName fullName')
      .lean();
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found.' });
    }
    
    // Check if user is the author or if idea is public
    const isAuthor = idea.author._id.toString() === user._id.toString();
    const isPublic = idea.privacy === 'Public' && idea.status === 'published';
    
    if (!isAuthor && !isPublic) {
      return res.status(403).json({ 
        message: 'You can only share your own ideas or public ideas.' 
      });
    }
    
    // Generate shareable link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareableLink = `${baseUrl}/ideas/public/${idea._id}`;
    
    // Log the copy action (for analytics)
    console.log(`User ${user._id} copied share link for idea ${idea._id}: ${shareableLink}`);
    
    res.json({
      success: true,
      message: 'Link copied to clipboard successfully.',
      data: {
        ideaId: idea._id,
        ideaTitle: idea.title,
        shareableLink,
        copiedAt: new Date().toISOString(),
        user: {
          id: user._id,
          name: user.fullName
        }
      }
    });
    
  } catch (error) {
    console.error('Copy share link error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error copying share link', error: error.message });
  }
});

// GET /api/ideas/:id/share/stats - Get sharing statistics for an idea
router.get('/:id/share/stats', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const idea = await Idea.findById(req.params.id)
      .populate('author', '_id firstName fullName')
      .lean();
    
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found.' });
    }
    
    // Check if user is the author
    const isAuthor = idea.author._id.toString() === user._id.toString();
    
    if (!isAuthor) {
      return res.status(403).json({ 
        message: 'You can only view sharing stats for your own ideas.' 
      });
    }
    
    // Generate shareable link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareableLink = `${baseUrl}/ideas/public/${idea._id}`;
    
    // Mock sharing statistics (in a real app, you'd track these in the database)
    const shareStats = {
      totalShares: Math.floor(Math.random() * 50) + 5, // Mock data
      socialShares: {
        twitter: Math.floor(Math.random() * 20) + 2,
        facebook: Math.floor(Math.random() * 15) + 1,
        linkedin: Math.floor(Math.random() * 10) + 1,
        whatsapp: Math.floor(Math.random() * 8) + 1,
        email: Math.floor(Math.random() * 5) + 1
      },
      directCopies: Math.floor(Math.random() * 30) + 3,
      lastShared: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      shareableLink
    };
    
    res.json({
      success: true,
      message: 'Sharing statistics retrieved successfully.',
      data: {
        ideaId: idea._id,
        ideaTitle: idea.title,
        shareStats,
        isPublic: idea.privacy === 'Public' && idea.status === 'published',
        canShare: idea.privacy === 'Public' && idea.status === 'published'
      }
    });
    
  } catch (error) {
    console.error('Share stats error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error fetching share statistics', error: error.message });
  }
});

// GET /api/ideas/search?q=keyword - Search ideas by keyword using MongoDB text search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query is required.' });

    const ideas = await Idea.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .populate('author', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar')
      .lean();

    res.json({ ideas });
  } catch (error) {
    res.status(500).json({ message: 'Error searching ideas', error: error.message });
  }
});

// POST /api/ideas/:id/like - Like/Unlike an idea (with enhanced unauthenticated handling)
router.post('/:id/like', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is authenticated
    const token = req.cookies.token;
    if (!token) {
      // Return specific error for unauthenticated users
      return res.status(401).json({ 
        message: 'Please login to like this idea',
        requiresAuth: true,
        action: 'like',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'Please login to like this idea',
        requiresAuth: true,
        action: 'like',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // User is authenticated, proceed with like/unlike
    const likeIndex = idea.likes.indexOf(user._id);
    if (likeIndex > -1) {
      // Unlike
      idea.likes.splice(likeIndex, 1);
    } else {
      // Like
      idea.likes.push(user._id);
    }

    await idea.save();
    res.json({ message: 'Like updated', likes: idea.likes.length });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Please login to like this idea',
        requiresAuth: true,
        action: 'like',
        ideaId: req.params.id,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }
    console.error('Like idea error:', error);
    res.status(500).json({ message: 'Error updating like', error: error.message });
  }
});

// POST /api/ideas/:id/unlike - Unlike an idea
router.post('/:id/unlike', authMiddleware, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    const userId = req.user._id.toString();
    const likeIndex = idea.likes.findIndex(id => id.toString() === userId);

    if (likeIndex > -1) {
      idea.likes.splice(likeIndex, 1);
      await idea.save();
    }

    res.json({
      message: 'Idea unliked',
      likes: idea.likes.length,
      appreciated: false
    });
  } catch (error) {
    console.error('Unlike idea error:', error);
    res.status(500).json({ message: 'Error unliking idea', error: error.message });
  }
});

// POST /api/ideas/:id/comment - Add a comment (with enhanced unauthenticated handling)
router.post('/:id/comment', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is authenticated
    const token = req.cookies.token;
    if (!token) {
      // Return specific error for unauthenticated users
      return res.status(401).json({ 
        message: 'Please login to comment on this idea',
        requiresAuth: true,
        action: 'comment',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'Please login to comment on this idea',
        requiresAuth: true,
        action: 'comment',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // User is authenticated, proceed with comment
    idea.comments.push({
      text,
      author: user._id
    });

    await idea.save();
    await idea.populate('comments.author', 'firstName fullName avatar');

    res.json({
      message: 'Comment added',
      comments: idea.comments
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Please login to comment on this idea',
        requiresAuth: true,
        action: 'comment',
        ideaId: req.params.id,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
});

// POST /api/ideas/:id/approach - Add an approach to an idea (with enhanced unauthenticated handling)
router.post('/:id/approach', async (req, res) => {
  try {
    const { role, description } = req.body;
    if (!role || !description) {
      return res.status(400).json({ message: 'Role and description are required.' });
    }
    const idea = await Idea.findById(req.params.id).populate('author');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found.' });
    }

    // Check if user is authenticated
    const token = req.cookies.token;
    if (!token) {
      // Return specific error for unauthenticated users
      return res.status(401).json({ 
        message: 'Please login to approach this idea',
        requiresAuth: true,
        action: 'approach',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'Please login to approach this idea',
        requiresAuth: true,
        action: 'approach',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // Check if user is approaching their own idea
    if (idea.author._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot approach your own idea.' });
    }

    // User is authenticated, proceed with approach
    idea.approaches.push({ user: user._id, role, description });
    idea.proposeCount = (idea.proposeCount || 0) + 1;
    await idea.save();

    // Send email notification to idea holder (only if email notifications are enabled)
    let emailSent = false;
    try {
      // Debug: Log notification settings
      console.log('Notification settings for idea author:', {
        userId: idea.author._id,
        email: idea.author.email,
        notifications: JSON.stringify(idea.author.notifications, null, 2),
        emailEnabled: idea.author.notifications?.email?.enabled,
        ideaCollaboration: idea.author.notifications?.email?.preferences?.ideaCollaboration,
        emailEnabledType: typeof idea.author.notifications?.email?.enabled
      });

      // Check if idea holder has email notifications enabled
      const shouldSendEmail = idea.author.notifications && 
          idea.author.notifications.email && 
          idea.author.notifications.email.enabled === true &&
          idea.author.notifications.email.preferences &&
          idea.author.notifications.email.preferences.ideaCollaboration === true;
      
      console.log('Email notification decision:', {
        shouldSendEmail,
        hasNotifications: !!idea.author.notifications,
        hasEmailSettings: !!idea.author.notifications?.email,
        emailEnabled: idea.author.notifications?.email?.enabled,
        ideaCollaborationEnabled: idea.author.notifications?.email?.preferences?.ideaCollaboration
      });

      if (shouldSendEmail) {
        
        const emailContent = `
          <p><strong>${user.firstName} ${user.fullName}</strong> has approached you to help as <strong>${role}</strong> in your idea: <strong>"${idea.title}"</strong></p>
          
          <p><strong>Their message:</strong></p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            ${description}
          </div>
          
          <p>You can view and respond to this approach in your StudentMate dashboard.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/approaches" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Approach
            </a>
          </div>
        `;

        await emailService.sendNotificationEmail(
          idea.author,
          `New Approach: ${user.firstName} wants to help with "${idea.title}"`,
          emailContent
        );
        
        emailSent = true;
        console.log(`Email notification sent to ${idea.author.email} for approach on idea: ${idea.title}`);
      } else {
        console.log(`Email notification skipped for ${idea.author.email} - notifications disabled or ideaCollaboration preference disabled`);
      }
    } catch (emailError) {
      console.error('Failed to send approach notification email:', emailError);
      // Don't fail the approach if email fails
    }

    res.status(201).json({ 
      message: 'Approach added successfully.', 
      approaches: idea.approaches,
      emailSent: emailSent
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Please login to approach this idea',
        requiresAuth: true,
        action: 'approach',
        ideaId: req.params.id,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }
    console.error('Add approach error:', error);
    res.status(500).json({ message: 'Error adding approach', error: error.message });
  }
});

// POST /api/ideas/:id/suggestion - Add a suggestion to an idea (with enhanced unauthenticated handling)
router.post('/:id/suggestion', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Suggestion content is required.' });
    }
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found.' });
    }

    // Check if user is authenticated
    const token = req.cookies.token;
    if (!token) {
      // Return specific error for unauthenticated users
      return res.status(401).json({ 
        message: 'Please login to suggest on this idea',
        requiresAuth: true,
        action: 'suggestion',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'Please login to suggest on this idea',
        requiresAuth: true,
        action: 'suggestion',
        ideaId: req.params.id,
        ideaTitle: idea.title,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }

    // User is authenticated, proceed with suggestion
    idea.suggestions.push({ user: user._id, content });
    await idea.save();
    res.status(201).json({ message: 'Suggestion added successfully.', suggestions: idea.suggestions });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Please login to suggest on this idea',
        requiresAuth: true,
        action: 'suggestion',
        ideaId: req.params.id,
        authEndpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        }
      });
    }
    console.error('Add suggestion error:', error);
    res.status(500).json({ message: 'Error adding suggestion', error: error.message });
  }
});

// GET /api/ideas/:id - Get a single idea
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id)
      .populate('author', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar');

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check NDA protection
    let responseIdea = idea.toObject();
    
    if (idea.ndaProtection && idea.ndaProtection.enabled) {
      // Check if user can view NDA content
      const canView = req.user ? canViewNDAContent(idea, req.user) : false;
      
      if (!canView && idea.ndaProtection.blurContent) {
        // Blur sensitive content
        responseIdea.description = '[NDA PROTECTED - Sign NDA to view]';
        responseIdea.problemStatement = '[NDA PROTECTED]';
        responseIdea.uniqueValue = '[NDA PROTECTED]';
        responseIdea.pitch = '[NDA PROTECTED]';
        responseIdea.ndaProtection.contentBlurred = true;
        responseIdea.ndaProtection.blurMessage = idea.ndaProtection.ndaMessage || 'This idea is protected by NDA. Please sign the NDA to view full details.';
      }
    }

    res.json(responseIdea);
  } catch (error) {
    console.error('Fetch idea error:', error);
    res.status(500).json({ message: 'Error fetching idea', error: error.message });
  }
});

// PUT /api/ideas/:id - Edit an idea (only by the author)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user._id;
    
    // Find the idea
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is the author
    if (idea.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own ideas' });
    }

    // Extract updatable fields
    const {
      title,
      description,
      privacy,
      targetAudience,
      marketAlternatives,
      problemStatement,
      uniqueValue,
      neededRoles,
      pitch,
      tags,
      status,
      ndaProtection
    } = req.body;

    // Update fields if provided
    if (title !== undefined) idea.title = title;
    if (description !== undefined) idea.description = description;
    if (privacy !== undefined) idea.privacy = privacy;
    if (targetAudience !== undefined) idea.targetAudience = targetAudience;
    if (marketAlternatives !== undefined) idea.marketAlternatives = marketAlternatives;
    if (problemStatement !== undefined) idea.problemStatement = problemStatement;
    if (uniqueValue !== undefined) idea.uniqueValue = uniqueValue;
    if (neededRoles !== undefined) idea.neededRoles = neededRoles;
    if (pitch !== undefined) idea.pitch = pitch;
    if (tags !== undefined) idea.tags = tags;
    if (status !== undefined) idea.status = status;
    if (ndaProtection !== undefined) idea.ndaProtection = ndaProtection;

    // Save the updated idea
    await idea.save();

    // Populate author info for response
    await idea.populate('author', 'firstName fullName avatar');

    res.json({
      message: 'Idea updated successfully',
      idea: idea
    });
  } catch (error) {
    console.error('Update idea error:', error);
    res.status(500).json({ message: 'Error updating idea', error: error.message });
  }
});

// PATCH /api/ideas/:id - Partial update of an idea (only by the author)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user._id;
    
    // Find the idea
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is the author
    if (idea.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own ideas' });
    }

    // Update only the fields that are provided in the request
    const updateData = {};
    const allowedFields = [
      'title', 'description', 'privacy', 'targetAudience', 
      'marketAlternatives', 'problemStatement', 'uniqueValue', 
      'neededRoles', 'pitch', 'tags', 'status', 'ndaProtection'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Update the idea
    const updatedIdea = await Idea.findByIdAndUpdate(
      ideaId,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'firstName fullName avatar');

    res.json({
      message: 'Idea updated successfully',
      idea: updatedIdea
    });
  } catch (error) {
    console.error('Patch idea error:', error);
    res.status(500).json({ message: 'Error updating idea', error: error.message });
  }
});

// GET /api/ideas/user/:userId - Get all ideas by a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const ideas = await Idea.find({ author: userId })
      .populate('author', 'firstName fullName avatar')
      .populate('approaches.user', 'firstName fullName avatar')
      .populate('suggestions.user', 'firstName fullName avatar');
    res.json({ ideas, total: ideas.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user ideas', error: error.message });
  }
});

// GET /api/ideas/user/:userId/count - Get total idea count by a user
router.get('/user/:userId/count', async (req, res) => {
  try {
    const userId = req.params.userId;
    const count = await Idea.countDocuments({ author: userId });
    res.json({ total: count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user idea count', error: error.message });
  }
});

// GET /api/ideas/test-notifications/:userId - Test notification settings for a user
router.get('/test-notifications/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      notifications: user.notifications,
      emailEnabled: user.notifications?.email?.enabled,
      ideaCollaboration: user.notifications?.email?.preferences?.ideaCollaboration
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user notification settings', error: error.message });
  }
});

// POST /api/ideas/:id/sign-nda - Sign NDA for an idea
router.post('/:id/sign-nda', authMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user._id;
    const { ndaFormData } = req.body; // New: Accept NDA form data
    
    // Find the idea
    const idea = await Idea.findById(ideaId).populate('author', 'firstName fullName email nda');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if idea has NDA protection
    if (!idea.ndaProtection || !idea.ndaProtection.enabled) {
      return res.status(400).json({ message: 'This idea does not require NDA signing' });
    }

    // Check if user is the author (authors don't need to sign their own NDAs)
    if (idea.author._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot sign NDA for your own idea' });
    }

    // Get the signing user
    const signingUser = await User.findById(userId);
    if (!signingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If NDA form data is provided, store it for the author
    if (ndaFormData) {
      // Store NDA signing record
      const ndaSigning = {
        ideaId: ideaId,
        ideaTitle: idea.title,
        signedBy: {
          userId: signingUser._id,
          firstName: signingUser.firstName,
          fullName: signingUser.fullName,
          email: signingUser.email
        },
        signedAt: new Date(),
        formData: ndaFormData,
        status: 'signed'
      };

      // Add to author's NDA signings (you might want to create a separate collection for this)
      // For now, we'll store it in the idea document
      if (!idea.ndaSignings) {
        idea.ndaSignings = [];
      }
      idea.ndaSignings.push(ndaSigning);
      await idea.save();

      // Send email notification to idea author
      try {
        const emailContent = `
          <p><strong>${signingUser.firstName} ${signingUser.fullName}</strong> has signed the NDA for your idea: <strong>"${idea.title}"</strong></p>
          <p><strong>Signer Details:</strong></p>
          <ul>
            <li>Name: ${signingUser.firstName} ${signingUser.fullName}</li>
            <li>Email: ${signingUser.email}</li>
            <li>Signed At: ${new Date().toLocaleString()}</li>
          </ul>
          <p>You can view the signed NDA details in your dashboard.</p>
        `;

        await emailService.sendNotificationEmail(
          idea.author,
          `NDA Signed: ${signingUser.firstName} signed NDA for "${idea.title}"`,
          emailContent
        );
      } catch (emailError) {
        console.error('Failed to send NDA signing notification:', emailError);
        // Don't fail the NDA signing if email fails
      }
    }

    res.json({
      message: 'NDA signed successfully. You can now view the full idea content.',
      ideaId: ideaId,
      signedAt: new Date(),
      canViewContent: true,
      ndaSigned: true
    });
  } catch (error) {
    console.error('Sign NDA error:', error);
    res.status(500).json({ message: 'Error signing NDA', error: error.message });
  }
});

// GET /api/ideas/:id/nda-status - Check NDA status for an idea
router.get('/:id/nda-status', optionalAuthMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user?._id;
    
    // Find the idea
    const idea = await Idea.findById(ideaId).populate('author', 'firstName fullName');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if idea has NDA protection
    if (!idea.ndaProtection || !idea.ndaProtection.enabled) {
      return res.json({
        hasNDAProtection: false,
        canViewContent: true,
        message: 'This idea does not require NDA protection'
      });
    }

    // If user is not authenticated
    if (!userId) {
      return res.json({
        hasNDAProtection: true,
        canViewContent: false,
        requiresAuth: true,
        message: 'Please login to view NDA-protected content'
      });
    }

    // Check if user is the author
    if (idea.author._id.toString() === userId.toString()) {
      return res.json({
        hasNDAProtection: true,
        canViewContent: true,
        isAuthor: true,
        message: 'You are the author of this idea'
      });
    }

    // Check if user can view NDA content
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const canView = canViewNDAContent(idea, user);
    
    res.json({
      hasNDAProtection: true,
      canViewContent: canView,
      requiresNDA: !canView,
      message: canView ? 'You can view this NDA-protected content' : 'You need to sign NDA to view this content'
    });
  } catch (error) {
    console.error('NDA status error:', error);
    res.status(500).json({ message: 'Error checking NDA status', error: error.message });
  }
});

// GET /api/ideas/:id/nda-form - Get NDA form data for an idea
router.get('/:id/nda-form', optionalAuthMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user?._id;
    
    // Find the idea
    const idea = await Idea.findById(ideaId).populate('author', 'firstName fullName email nda');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if idea has NDA protection
    if (!idea.ndaProtection || !idea.ndaProtection.enabled) {
      return res.status(400).json({ message: 'This idea does not require NDA protection' });
    }

    // If user is not authenticated
    if (!userId) {
      return res.status(401).json({ 
        message: 'Please login to access NDA form',
        requiresAuth: true
      });
    }

    // Check if user is the author
    if (idea.author._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot sign NDA for your own idea' });
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already signed NDA for this idea
    const alreadySigned = idea.ndaSignings?.some(signing => 
      signing.signedBy.userId.toString() === userId.toString()
    );

    if (alreadySigned) {
      return res.json({
        alreadySigned: true,
        message: 'You have already signed the NDA for this idea'
      });
    }

    // Return NDA form data
    res.json({
      ideaId: ideaId,
      ideaTitle: idea.title,
      authorName: idea.author.fullName,
      ndaMessage: idea.ndaProtection.ndaMessage,
      formFields: {
        signerName: user.fullName,
        signerEmail: user.email,
        companyName: '',
        position: '',
        agreeToTerms: false,
        agreeToConfidentiality: false
      },
      ndaTemplate: idea.author.nda?.ndaGeneratedContent || 'Standard NDA terms apply'
    });
  } catch (error) {
    console.error('Get NDA form error:', error);
    res.status(500).json({ message: 'Error getting NDA form', error: error.message });
  }
});

// GET /api/ideas/:id/nda-signings - Get NDA signings for an idea (author only)
router.get('/:id/nda-signings', authMiddleware, async (req, res) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user._id;
    
    // Find the idea
    const idea = await Idea.findById(ideaId).populate('author', 'firstName fullName');
    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is the author
    if (idea.author._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the idea author can view NDA signings' });
    }

    res.json({
      ideaId: ideaId,
      ideaTitle: idea.title,
      ndaSignings: idea.ndaSignings || [],
      totalSignings: (idea.ndaSignings || []).length
    });
  } catch (error) {
    console.error('Get NDA signings error:', error);
    res.status(500).json({ message: 'Error getting NDA signings', error: error.message });
  }
});

// Helper function to check if user can view NDA-protected content
const canViewNDAContent = (idea, user) => {
  // If idea doesn't have NDA protection, always allow
  if (!idea.ndaProtection || !idea.ndaProtection.enabled) {
    return true;
  }
  
  // If user is the author, always allow
  if (idea.author.toString() === user._id.toString()) {
    return true;
  }
  
  // Check if user has signed NDA for this specific idea
  if (idea.ndaSignings && idea.ndaSignings.length > 0) {
    const hasSignedForThisIdea = idea.ndaSignings.some(signing => 
      signing.signedBy.userId.toString() === user._id.toString() && 
      signing.status === 'signed'
    );
    if (hasSignedForThisIdea) {
      return true;
    }
  }
  
  // Fallback: Check if user has general NDA on file (legacy support)
  return user.nda && user.nda.hasNDA && user.nda.ideaProtection;
};

export default router; 