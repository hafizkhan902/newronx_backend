import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ideaController from '../controllers/ideaController.js';

const router = Router();

// Apply authentication middleware to all contribution routes
router.use(authenticateToken);

// Get user's contributions
router.get('/my', ideaController.getMyContributions);

export default router;
