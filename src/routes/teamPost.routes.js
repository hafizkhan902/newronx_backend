import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import TeamPostController from '../controllers/teamPostController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
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

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Team Post Routes

/**
 * @route   POST /api/team-posts
 * @desc    Create a new team post
 * @access  Private (Team Members Only)
 * @body    {ideaId, content, mentions?, links?, isAnnouncement?, isPinned?}
 * @files   attachments[] (optional, max 10 files, 10MB each)
 */
router.post('/', upload.array('attachments', 10), TeamPostController.createPost);

/**
 * @route   GET /api/team-posts/idea/:ideaId
 * @desc    Get all posts for a team/idea
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   page?, limit?, sortBy?, sortOrder?, includeComments?
 */
router.get('/idea/:ideaId', TeamPostController.getTeamPosts);

/**
 * @route   GET /api/team-posts/idea/:ideaId/stats
 * @desc    Get team post statistics for an idea
 * @access  Private (Team Members Only)
 * @params  ideaId
 */
router.get('/idea/:ideaId/stats', TeamPostController.getTeamPostStats);

/**
 * @route   GET /api/team-posts/idea/:ideaId/search
 * @desc    Search posts in a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   q (search query), page?, limit?
 */
router.get('/idea/:ideaId/search', TeamPostController.searchTeamPosts);

/**
 * @route   GET /api/team-posts/idea/:ideaId/user/:userId
 * @desc    Get user's posts in a team
 * @access  Private (Team Members Only)
 * @params  ideaId, userId
 * @query   page?, limit?
 */
router.get('/idea/:ideaId/user/:userId', TeamPostController.getUserPosts);

/**
 * @route   GET /api/team-posts/:postId
 * @desc    Get a single post by ID
 * @access  Private (Team Members Only)
 * @params  postId
 */
router.get('/:postId', TeamPostController.getPostById);

/**
 * @route   PUT /api/team-posts/:postId
 * @desc    Update a post
 * @access  Private (Post Author Only)
 * @params  postId
 * @body    {content?, mentions?}
 */
router.put('/:postId', TeamPostController.updatePost);

/**
 * @route   DELETE /api/team-posts/:postId
 * @desc    Delete a post
 * @access  Private (Post Author or Idea Author)
 * @params  postId
 */
router.delete('/:postId', TeamPostController.deletePost);

/**
 * @route   POST /api/team-posts/:postId/like
 * @desc    Toggle like on a post
 * @access  Private (Team Members Only)
 * @params  postId
 */
router.post('/:postId/like', TeamPostController.toggleLike);

/**
 * @route   POST /api/team-posts/:postId/pin
 * @desc    Toggle pin status of a post
 * @access  Private (Idea Author Only)
 * @params  postId
 */
router.post('/:postId/pin', TeamPostController.togglePin);

// Comment Routes

/**
 * @route   POST /api/team-posts/:postId/comments
 * @desc    Add a comment to a post
 * @access  Private (Team Members Only)
 * @params  postId
 * @body    {content, mentions?}
 */
router.post('/:postId/comments', TeamPostController.addComment);

/**
 * @route   PUT /api/team-posts/:postId/comments/:commentId
 * @desc    Update a comment
 * @access  Private (Comment Author Only)
 * @params  postId, commentId
 * @body    {content?, mentions?}
 */
router.put('/:postId/comments/:commentId', TeamPostController.updateComment);

/**
 * @route   DELETE /api/team-posts/:postId/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (Comment Author, Post Author, or Idea Author)
 * @params  postId, commentId
 */
router.delete('/:postId/comments/:commentId', TeamPostController.deleteComment);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB per file.',
        errors: null,
        timestamp: new Date().toISOString(),
        statusCode: 400
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed per post.',
        errors: null,
        timestamp: new Date().toISOString(),
        statusCode: 400
      });
    }

    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
      errors: null,
      timestamp: new Date().toISOString(),
      statusCode: 400
    });
  }

  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: null,
      timestamp: new Date().toISOString(),
      statusCode: 400
    });
  }

  next(error);
});

export default router;
