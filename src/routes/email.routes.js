import { Router } from 'express';
import emailService from '../services/emailService.js';
import User from '../models/user.model.js';

const router = Router();

// GET /api/email/test - Test email service connection
router.get('/test', async (req, res) => {
  try {
    const isConnected = await emailService.testConnection();
    if (isConnected) {
      res.status(200).json({ message: 'Email service is connected and ready.' });
    } else {
      res.status(500).json({ message: 'Email service connection failed.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Email service error.', error: error.message });
  }
});

// POST /api/email/test-welcome - Test welcome email (for development)
router.post('/test-welcome', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // Create a test user object
    const testUser = {
      firstName: 'Test',
      fullName: 'Test User',
      email: email
    };

    const result = await emailService.sendWelcomeEmail(testUser);
    
    if (result.success) {
      res.status(200).json({ 
        message: 'Test welcome email sent successfully.',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to send test welcome email.',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/email/send-notification - Send custom notification email
router.post('/send-notification', async (req, res) => {
  const { userId, subject, content } = req.body;

  if (!userId || !subject || !content) {
    return res.status(400).json({ message: 'User ID, subject, and content are required.' });
  }

  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const result = await emailService.sendNotificationEmail(user, subject, content);
    
    if (result.success) {
      res.status(200).json({ 
        message: 'Notification email sent successfully.',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to send notification email.',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

export default router; 