import { Router } from 'express';
import multer from 'multer';
import userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateBody, validateFile, validateQuery } from '../middleware/validation.js';
import { 
  updateProfileSchema, 
  updateRolesSchema, 
  updatePrivacySchema,
  updateNotificationPreferencesSchema,
  updateThemeSchema,
  searchUsersSchema,
  generateNDASchema,
  updatePasswordSchema
} from '../validators/userValidators.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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

// NDA file upload configuration
const ndaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ndas/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'nda-' + uniqueSuffix + '.pdf');
  }
});

const ndaUpload = multer({ 
  storage: ndaStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Profile Management
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, validateBody(updateProfileSchema), userController.updateProfile);

// Avatar Management
// Accept any common image field name and formats (jpeg/png/gif/webp)
const pickImageFile = (req, res, next) => {
  if (!req.file && Array.isArray(req.files)) {
    const img = req.files.find(f => f.mimetype && f.mimetype.startsWith('image/'));
    if (img) req.file = img;
  }
  next();
};

router.post(
  '/profile/avatar',
  authenticateToken,
  upload.any(),
  pickImageFile,
  validateFile(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  userController.uploadAvatar
);
router.get('/profile/avatar', authenticateToken, userController.getAvatar);
router.get('/profile/avatar/:id', userController.getPublicAvatar);

// User Search and Public Profiles
router.get('/search', validateQuery(searchUsersSchema), userController.searchUsers);
router.get('/:id', userController.getPublicProfile);

// Account Settings
router.put('/profile/email', authenticateToken, validateBody(updateProfileSchema), userController.updateEmail);
router.put('/profile/password', authenticateToken, validateBody(updatePasswordSchema), userController.updatePassword);
router.put('/profile/roles', authenticateToken, validateBody(updateRolesSchema), userController.updateRoles);
router.get('/profile/roles', authenticateToken, userController.getRoles);

// Privacy Settings
router.get('/profile/privacy', authenticateToken, userController.getPrivacy);
router.put('/profile/privacy', authenticateToken, validateBody(updatePrivacySchema), userController.updatePrivacy);

// NDA Management
router.post('/profile/nda/upload', authenticateToken, ndaUpload.single('nda'), validateFile(['application/pdf']), userController.uploadNDA);
router.post('/profile/nda/generate', authenticateToken, validateBody(generateNDASchema), userController.generateNDA);
router.delete('/profile/nda', authenticateToken, userController.removeNDA);

// Notification Settings
router.get('/profile/notifications', authenticateToken, userController.getNotifications);
router.put('/profile/notifications/email', authenticateToken, validateBody(updateNotificationPreferencesSchema), userController.updateEmailNotifications);
router.put('/profile/notifications/app', authenticateToken, validateBody(updateNotificationPreferencesSchema), userController.updateAppNotifications);
router.post('/profile/notifications/permission', authenticateToken, userController.requestNotificationPermission);
router.post('/profile/notifications/test', authenticateToken, userController.sendTestNotification);

// Theme Settings
router.get('/profile/theme', authenticateToken, userController.getTheme);
router.put('/profile/theme', authenticateToken, validateBody(updateThemeSchema), userController.updateTheme);
router.patch('/profile/theme/mode', authenticateToken, validateBody(updateThemeSchema), userController.updateThemeMode);

// Data Export
router.get('/profile/download', authenticateToken, userController.downloadProfile);

export default router; 