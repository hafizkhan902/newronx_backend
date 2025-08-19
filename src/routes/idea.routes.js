import { Router } from 'express';
import multer from 'multer';
import ideaController from '../controllers/ideaController.js';

const router = Router();

// Configure multer for idea image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ideas/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public routes (no authentication required)
router.get('/', ideaController.getAllIdeas);
// Legacy feed endpoint for frontend compatibility
router.get('/feed', ideaController.getFeed);
router.get('/trending', ideaController.getTrendingIdeas);
router.get('/category/:category', ideaController.getIdeasByCategory);
router.get('/search', ideaController.searchIdeas);
router.get('/:id', ideaController.getIdeaById);
router.get('/:id/comments', ideaController.getIdeaComments);
router.get('/:id/stats', ideaController.getIdeaStats);

// Protected routes (authentication required)
router.post('/', upload.single('image'), ideaController.createIdea);
router.put('/:id', upload.single('image'), ideaController.updateIdea);
router.delete('/:id', ideaController.deleteIdea);

// Interaction routes
router.post('/:id/like', ideaController.likeIdea);
router.delete('/:id/like', ideaController.unlikeIdea);
router.post('/:id/comments', ideaController.commentOnIdea);
router.delete('/:id/comments/:commentId', ideaController.deleteComment);
router.post('/:id/share', ideaController.shareIdea);
// Submit approach/proposal
router.post('/:id/approach', ideaController.approachIdea);
// Legacy alias for frontends using "/propose"
router.post('/:id/propose', ideaController.approachIdea);

// User-specific routes
router.get('/user/me', ideaController.getUserIdeas);
router.get('/:id/insights', ideaController.getIdeaInsights);

// Reporting
router.post('/:id/report', ideaController.reportIdea);

export default router; 