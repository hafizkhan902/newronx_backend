import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import TeamFileController from '../controllers/teamFileController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 1 // Maximum 1 file per request for team files
  },
  fileFilter: (req, file, cb) => {
    // Allow most file types for team collaboration
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
      
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/rtf',
      
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'application/x-tar', 'application/gzip',
      
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac',
      
      // Video
      'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      
      // Code files
      'text/javascript', 'text/html', 'text/css', 'application/json',
      'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-php',
      
      // Design files
      'application/x-photoshop', 'application/postscript'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed for team file uploads`), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Team File Management Routes

/**
 * @route   POST /api/team-files/upload
 * @desc    Upload a file directly to team storage
 * @access  Private (Team Members Only)
 * @body    {ideaId, description?, tags?, category?}
 * @file    file (required, max 50MB)
 */
router.post('/upload', upload.single('file'), TeamFileController.uploadFile);

/**
 * @route   POST /api/team-files/upload-link
 * @desc    Upload a file via link to team storage
 * @access  Private (Team Members Only)
 * @body    {ideaId, url, title?, description?, tags?, category?}
 */
router.post('/upload-link', TeamFileController.uploadLink);

/**
 * @route   GET /api/team-files/idea/:ideaId
 * @desc    Get all files for a team/idea
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   page?, limit?, category?, fileType?, uploadedBy?, sortBy?, sortOrder?, search?
 */
router.get('/idea/:ideaId', TeamFileController.getTeamFiles);

/**
 * @route   GET /api/team-files/idea/:ideaId/stats
 * @desc    Get file statistics for a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 */
router.get('/idea/:ideaId/stats', TeamFileController.getFileStats);

/**
 * @route   GET /api/team-files/idea/:ideaId/categories
 * @desc    Get file categories with counts for a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 */
router.get('/idea/:ideaId/categories', TeamFileController.getCategories);

/**
 * @route   GET /api/team-files/idea/:ideaId/recent
 * @desc    Get recent files for a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   limit?
 */
router.get('/idea/:ideaId/recent', TeamFileController.getRecentFiles);

/**
 * @route   GET /api/team-files/idea/:ideaId/popular
 * @desc    Get popular files (most downloaded) for a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   limit?
 */
router.get('/idea/:ideaId/popular', TeamFileController.getPopularFiles);

/**
 * @route   GET /api/team-files/idea/:ideaId/search
 * @desc    Search files in a team
 * @access  Private (Team Members Only)
 * @params  ideaId
 * @query   q (search query), page?, limit?
 */
router.get('/idea/:ideaId/search', TeamFileController.searchFiles);

/**
 * @route   GET /api/team-files/idea/:ideaId/category/:category
 * @desc    Get files by category for a team
 * @access  Private (Team Members Only)
 * @params  ideaId, category
 */
router.get('/idea/:ideaId/category/:category', TeamFileController.getFilesByCategory);

/**
 * @route   GET /api/team-files/idea/:ideaId/user/:userId
 * @desc    Get files uploaded by a specific user in a team
 * @access  Private (Team Members Only)
 * @params  ideaId, userId
 * @query   page?, limit?
 */
router.get('/idea/:ideaId/user/:userId', TeamFileController.getUserFiles);

/**
 * @route   GET /api/team-files/:fileId
 * @desc    Get a single file by ID
 * @access  Private (Team Members Only)
 * @params  fileId
 */
router.get('/:fileId', TeamFileController.getFileById);

/**
 * @route   GET /api/team-files/:fileId/download
 * @desc    Download/Access a file
 * @access  Private (Team Members Only)
 * @params  fileId
 */
router.get('/:fileId/download', TeamFileController.downloadFile);

/**
 * @route   PUT /api/team-files/:fileId
 * @desc    Update file details
 * @access  Private (File Uploader Only)
 * @params  fileId
 * @body    {description?, tags?, category?}
 */
router.put('/:fileId', TeamFileController.updateFile);

/**
 * @route   DELETE /api/team-files/:fileId
 * @desc    Delete a file
 * @access  Private (File Uploader or Idea Author)
 * @params  fileId
 */
router.delete('/:fileId', TeamFileController.deleteFile);

/**
 * @route   DELETE /api/team-files/bulk
 * @desc    Bulk delete multiple files
 * @access  Private (File Uploader or Idea Author for each file)
 * @body    {fileIds: []}
 */
router.delete('/bulk', TeamFileController.bulkDeleteFiles);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB per file.',
        errors: null,
        timestamp: new Date().toISOString(),
        statusCode: 400
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 1 file allowed per upload.',
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
