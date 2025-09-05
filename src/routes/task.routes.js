import { Router } from 'express';
import taskController from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication middleware to all task routes
router.use(authenticateToken);

// Task CRUD operations
router.post('/', taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/search', taskController.searchTasks);
router.get('/:taskId', taskController.getTask);
router.put('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

// Task status management
router.patch('/:taskId/status', taskController.updateStatus);

// Task comments
router.post('/:taskId/comments', taskController.addComment);

// Idea-specific task operations
router.get('/idea/:ideaId', taskController.getTasksForIdea);
router.get('/idea/:ideaId/dashboard', taskController.getTaskDashboard);
router.get('/idea/:ideaId/stats', taskController.getTaskStats);

export default router;
