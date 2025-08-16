import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import pushNotificationService from '../services/pushNotificationService.js';

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

// POST /api/notifications/test - Test push notification
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const result = await pushNotificationService.testNotification(req.user._id);
    
    if (result.success) {
      res.json({ 
        message: 'Test notification sent successfully',
        result 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to send test notification',
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ 
      message: 'Error sending test notification', 
      error: error.message 
    });
  }
});

// GET /api/notifications/settings - Get user notification settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json({ 
      notifications: user.notifications 
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ 
      message: 'Error fetching notification settings', 
      error: error.message 
    });
  }
});

// PATCH /api/notifications/settings - Update user notification settings
router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const { notifications } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notifications },
      { new: true, runValidators: true }
    ).select('notifications');

    res.json({ 
      message: 'Notification settings updated successfully',
      notifications: user.notifications 
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ 
      message: 'Error updating notification settings', 
      error: error.message 
    });
  }
});

// POST /api/notifications/browser-permission - Update browser notification permission
router.post('/browser-permission', authMiddleware, async (req, res) => {
  try {
    const { permission } = req.body; // 'granted', 'denied', 'default'
    
    if (!['granted', 'denied', 'default'].includes(permission)) {
      return res.status(400).json({ 
        message: 'Invalid permission value. Must be granted, denied, or default.' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        'notifications.app.browserPermission': permission,
        'notifications.app.enabled': permission === 'granted'
      },
      { new: true, runValidators: true }
    ).select('notifications');

    res.json({ 
      message: 'Browser notification permission updated',
      notifications: user.notifications 
    });
  } catch (error) {
    console.error('Update browser permission error:', error);
    res.status(500).json({ 
      message: 'Error updating browser permission', 
      error: error.message 
    });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    
    const stats = {
      emailEnabled: user.notifications.email.enabled,
      appEnabled: user.notifications.app.enabled,
      browserPermission: user.notifications.app.browserPermission,
      preferences: {
        messages: user.notifications.email.preferences.messages,
        ideaCollaboration: user.notifications.email.preferences.ideaCollaboration,
        comments: user.notifications.email.preferences.comments,
        likes: user.notifications.email.preferences.likes,
        groupChats: user.notifications.email.preferences.groupChats,
        connectionRequests: user.notifications.email.preferences.connectionRequests
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      message: 'Error fetching notification statistics', 
      error: error.message 
    });
  }
});

export default router; 