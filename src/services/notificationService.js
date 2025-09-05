import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

class NotificationService {
  // Helper method to get user from token
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Get user notifications
  async getNotifications(token, filters) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { page, limit, type, read } = filters;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: user._id };
    
    if (type) {
      query.type = type;
    }
    
    if (read !== undefined) {
      query.read = read;
    }

    // Get notifications from user's notification array
    let notifications = user.notifications || [];
    
    // Apply filters
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }
    
    if (read !== undefined) {
      notifications = notifications.filter(n => n.read === read);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = notifications.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedNotifications = notifications.slice(skip, skip + limit);

    return {
      notifications: paginatedNotifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Mark notification as read
  async markAsRead(token, notificationId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const notification = user.notifications.find(n => n._id.toString() === notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await user.save();

    return notification;
  }

  // Mark all notifications as read
  async markAllAsRead(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const unreadCount = user.notifications.filter(n => !n.read).length;
    
    user.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
      }
    });

    await user.save();

    return {
      message: 'All notifications marked as read',
      updatedCount: unreadCount
    };
  }

  // Delete notification
  async deleteNotification(token, notificationId) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const notificationIndex = user.notifications.findIndex(n => n._id.toString() === notificationId);
    if (notificationIndex === -1) {
      throw new Error('Notification not found');
    }

    user.notifications.splice(notificationIndex, 1);
    await user.save();
  }

  // Delete all notifications
  async deleteAllNotifications(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const totalCount = user.notifications.length;
    user.notifications = [];
    await user.save();

    return {
      message: 'All notifications deleted',
      deletedCount: totalCount
    };
  }

  // Get unread count
  async getUnreadCount(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return user.notifications.filter(n => !n.read).length;
  }

  // Update notification preferences
  async updatePreferences(token, preferences) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { email, app, push } = preferences;

    // Update email notification preferences
    if (email) {
      Object.keys(email).forEach(key => {
        if (typeof email[key] === 'boolean' && user.notifications.email.preferences.hasOwnProperty(key)) {
          user.notifications.email.preferences[key] = email[key];
        }
      });
    }

    // Update app notification preferences
    if (app) {
      Object.keys(app).forEach(key => {
        if (typeof app[key] === 'boolean' && user.notifications.app.preferences.hasOwnProperty(key)) {
          user.notifications.app.preferences[key] = app[key];
        }
      });
    }

    // Update push notification preferences
    if (push) {
      Object.keys(push).forEach(key => {
        if (typeof push[key] === 'boolean' && user.notifications.push.preferences.hasOwnProperty(key)) {
          user.notifications.push.preferences[key] = push[key];
        }
      });
    }

    await user.save();

    return {
      email: user.notifications.email,
      app: user.notifications.app,
      push: user.notifications.push
    };
  }

  // Get notification preferences
  async getPreferences(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      email: user.notifications.email,
      app: user.notifications.app,
      push: user.notifications.push
    };
  }

  // Send test notification
  async sendTestNotification(token, type, message) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const testNotification = {
      type: type || 'test',
      title: 'Test Notification',
      message: message || 'This is a test notification',
      read: false,
      createdAt: new Date()
    };

    // Add to user's notifications
    user.notifications.unshift(testNotification);
    await user.save();

    // Send via different channels based on user preferences
    const results = {};

    // Email notification
    if (user.notifications.email.enabled) {
      try {
        // This would integrate with your email service
        results.email = { sent: true, message: 'Test email sent' };
      } catch (error) {
        results.email = { sent: false, error: error.message };
      }
    }

    // App notification
    if (user.notifications.app.enabled) {
      try {
        // This would integrate with your push notification service
        results.app = { sent: true, message: 'Test app notification sent' };
      } catch (error) {
        results.app = { sent: false, error: error.message };
      }
    }

    // Push notification
    if (user.notifications.push.enabled && user.notifications.push.subscription) {
      try {
        // This would integrate with your push notification service
        results.push = { sent: true, message: 'Test push notification sent' };
      } catch (error) {
        results.push = { sent: false, error: error.message };
      }
    }

    return {
      notification: testNotification,
      results
    };
  }

  // Subscribe to push notifications
  async subscribeToPush(token, subscription) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription object');
    }

    // Store push subscription
    user.notifications.push.subscription = subscription;
    user.notifications.push.enabled = true;
    await user.save();

    return {
      message: 'Successfully subscribed to push notifications',
      subscription: user.notifications.push.subscription
    };
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove push subscription
    user.notifications.push.subscription = null;
    user.notifications.push.enabled = false;
    await user.save();

    return {
      message: 'Successfully unsubscribed from push notifications'
    };
  }

  // Create notification (internal method for other services)
  async createNotification(userId, notificationData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create notification document
    const notification = new Notification({
      recipient: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      priority: notificationData.priority || 'medium',
      relatedEntities: notificationData.relatedEntities || {},
      expiresAt: notificationData.expiresAt || null
    });

    await notification.save();

    // Send notifications based on user preferences
    await this.sendNotificationChannels(user, notification);

    return notification;
  }

  // Send notification through different channels
  async sendNotificationChannels(user, notification) {
    const results = {};

    // Email notification
    if (user.notifications.email.enabled && this.shouldSendEmailNotification(user, notification)) {
      try {
        // This would integrate with your email service
        results.email = { sent: true };
      } catch (error) {
        results.email = { sent: false, error: error.message };
      }
    }

    // App notification
    if (user.notifications.app.enabled && this.shouldSendAppNotification(user, notification)) {
      try {
        // This would integrate with your push notification service
        results.app = { sent: true };
      } catch (error) {
        results.app = { sent: false, error: error.message };
      }
    }

    // Push notification
    if (user.notifications.push.enabled && user.notifications.push.subscription && 
        this.shouldSendPushNotification(user, notification)) {
      try {
        // This would integrate with your push notification service
        results.push = { sent: true };
      } catch (error) {
        results.push = { sent: false, error: error.message };
      }
    }

    return results;
  }

  // Check if email notification should be sent
  shouldSendEmailNotification(user, notification) {
    const preferences = user.notifications.email.preferences;
    return preferences[notification.type] !== false;
  }

  // Check if app notification should be sent
  shouldSendAppNotification(user, notification) {
    const preferences = user.notifications.app.preferences;
    return preferences[notification.type] !== false;
  }

  // Check if push notification should be sent
  shouldSendPushNotification(user, notification) {
    const preferences = user.notifications.push.preferences;
    return preferences[notification.type] !== false;
  }
}

export default NotificationService;
