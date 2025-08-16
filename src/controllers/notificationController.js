import BaseController from './baseController.js';
import NotificationService from '../services/notificationService.js';

class NotificationController extends BaseController {
  constructor() {
    super();
    this.notificationService = new NotificationService();
  }

  // Get user notifications
  getNotifications = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view notifications');
    }

    const { page = 1, limit = 20, type, read } = req.query;
    
    const result = await this.notificationService.getNotifications(token, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      read: read === 'true' ? true : read === 'false' ? false : undefined
    });
    
    this.sendSuccess(res, result, 'Notifications retrieved successfully.');
  });

  // Mark notification as read
  markAsRead = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to mark notification as read');
    }

    const { notificationId } = req.params;
    
    const result = await this.notificationService.markAsRead(token, notificationId);
    
    this.sendSuccess(res, result, 'Notification marked as read.');
  });

  // Mark all notifications as read
  markAllAsRead = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to mark notifications as read');
    }

    const result = await this.notificationService.markAllAsRead(token);
    
    this.sendSuccess(res, result, 'All notifications marked as read.');
  });

  // Delete notification
  deleteNotification = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete this notification');
    }

    const { notificationId } = req.params;
    
    await this.notificationService.deleteNotification(token, notificationId);
    
    this.sendSuccess(res, null, 'Notification deleted successfully.');
  });

  // Delete all notifications
  deleteAllNotifications = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to delete notifications');
    }

    const result = await this.notificationService.deleteAllNotifications(token);
    
    this.sendSuccess(res, result, 'All notifications deleted successfully.');
  });

  // Get unread count
  getUnreadCount = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view unread count');
    }

    const count = await this.notificationService.getUnreadCount(token);
    
    this.sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully.');
  });

  // Update notification preferences
  updatePreferences = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to update preferences');
    }

    const result = await this.notificationService.updatePreferences(token, req.body);
    
    this.sendSuccess(res, result, 'Notification preferences updated successfully.');
  });

  // Get notification preferences
  getPreferences = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to view preferences');
    }

    const preferences = await this.notificationService.getPreferences(token);
    
    this.sendSuccess(res, preferences, 'Notification preferences retrieved successfully.');
  });

  // Send test notification
  sendTestNotification = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to send test notification');
    }

    const { type, message } = req.body;
    
    const result = await this.notificationService.sendTestNotification(token, type, message);
    
    this.sendSuccess(res, result, 'Test notification sent successfully.');
  });

  // Subscribe to push notifications
  subscribeToPush = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to subscribe to push notifications');
    }

    const { subscription } = req.body;
    
    const result = await this.notificationService.subscribeToPush(token, subscription);
    
    this.sendSuccess(res, result, 'Successfully subscribed to push notifications.');
  });

  // Unsubscribe from push notifications
  unsubscribeFromPush = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to unsubscribe from push notifications');
    }

    const result = await this.notificationService.unsubscribeFromPush(token);
    
    this.sendSuccess(res, result, 'Successfully unsubscribed from push notifications.');
  });
}

export default new NotificationController();
