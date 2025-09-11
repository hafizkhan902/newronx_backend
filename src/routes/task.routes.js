import { Router } from 'express';
import multer from 'multer';
import taskController from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Apply authentication middleware to all task routes
router.use(authenticateToken);

// Task CRUD operations
router.post('/', upload.array('attachments', 5), taskController.createTask);
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
