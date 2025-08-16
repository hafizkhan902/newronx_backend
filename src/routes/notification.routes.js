import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';

const router = Router();

// Get user notifications
router.get('/', notificationController.getNotifications);

// Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Delete all notifications
router.delete('/', notificationController.deleteAllNotifications);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// Update notification preferences
router.put('/preferences', notificationController.updatePreferences);

// Get notification preferences
router.get('/preferences', notificationController.getPreferences);

// Send test notification
router.post('/test', notificationController.sendTestNotification);

// Subscribe to push notifications
router.post('/push/subscribe', notificationController.subscribeToPush);

// Unsubscribe from push notifications
router.delete('/push/subscribe', notificationController.unsubscribeFromPush);

export default router; 