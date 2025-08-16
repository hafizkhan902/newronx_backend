import User from '../models/user.model.js';
import emailService from './emailService.js';

class PushNotificationService {
  constructor() {
    this.supportedTypes = ['email', 'browser', 'mobile'];
  }

  // Send notification to offline users
  async sendToOfflineUsers(userIds, notificationData) {
    try {
      const users = await User.find({ 
        _id: { $in: userIds },
        'notifications.app.enabled': true 
      });

      const notifications = users.map(user => 
        this.createNotification(user, notificationData)
      );

      await Promise.all(notifications);
      
      console.log(`Sent ${notifications.length} push notifications`);
      return { success: true, sent: notifications.length };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create notification based on user preferences
  async createNotification(user, data) {
    const { type, title, message, actionUrl, priority = 'normal' } = data;

    // Email notifications
    if (user.notifications.email.enabled) {
      await this.sendEmailNotification(user, {
        subject: title,
        content: message,
        actionUrl,
        type
      });
    }

    // Browser notifications (placeholder for future implementation)
    if (user.notifications.app.enabled && user.notifications.app.browserPermission === 'granted') {
      await this.sendBrowserNotification(user, {
        title,
        message,
        actionUrl,
        priority
      });
    }

    // Mobile notifications (placeholder for future implementation)
    if (user.notifications.app.enabled && user.notifications.app.mobileToken) {
      await this.sendMobileNotification(user, {
        title,
        message,
        actionUrl,
        priority
      });
    }
  }

  // Send email notification
  async sendEmailNotification(user, data) {
    const { subject, content, actionUrl, type } = data;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${content}</p>
        ${actionUrl ? `<a href="${actionUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">
          You're receiving this because you have email notifications enabled for ${type} events.
          <br>
          <a href="${process.env.FRONTEND_URL}/settings/notifications">Manage notification preferences</a>
        </p>
      </div>
    `;

    return emailService.sendNotificationEmail(user, subject, emailContent);
  }

  // Send browser notification (placeholder)
  async sendBrowserNotification(user, data) {
    // This would integrate with a service like Firebase Cloud Messaging
    // For now, we'll just log it
    console.log(`Browser notification for ${user.email}:`, data);
    return { success: true, type: 'browser' };
  }

  // Send mobile notification (placeholder)
  async sendMobileNotification(user, data) {
    // This would integrate with mobile push services
    // For now, we'll just log it
    console.log(`Mobile notification for ${user.email}:`, data);
    return { success: true, type: 'mobile' };
  }

  // Send message notification
  async sendMessageNotification(sender, recipients, messageData) {
    const notificationData = {
      type: 'message',
      title: `New message from ${sender.firstName}`,
      message: `"${messageData.content.substring(0, 100)}${messageData.content.length > 100 ? '...' : ''}"`,
      actionUrl: `${process.env.FRONTEND_URL}/chats/${messageData.chatId}`,
      priority: 'high'
    };

    return this.sendToOfflineUsers(recipients, notificationData);
  }

  // Send idea interaction notification
  async sendIdeaInteractionNotification(actor, ideaOwner, idea, interactionType) {
    const interactionMessages = {
      'like': 'liked your idea',
      'comment': 'commented on your idea',
      'approach': 'wants to approach your idea',
      'suggest': 'suggested an improvement to your idea'
    };

    const notificationData = {
      type: 'idea_interaction',
      title: `${actor.firstName} ${interactionMessages[interactionType]}`,
      message: `"${idea.title}"`,
      actionUrl: `${process.env.FRONTEND_URL}/ideas/${idea._id}`,
      priority: 'normal'
    };

    return this.sendToOfflineUsers([ideaOwner], notificationData);
  }

  // Send connection request notification
  async sendConnectionRequestNotification(requester, recipient) {
    const notificationData = {
      type: 'connection_request',
      title: `${requester.firstName} wants to connect`,
      message: `${requester.fullName} sent you a connection request`,
      actionUrl: `${process.env.FRONTEND_URL}/connections`,
      priority: 'normal'
    };

    return this.sendToOfflineUsers([recipient], notificationData);
  }

  // Test notification service
  async testNotification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const testData = {
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification from StudentMate',
        actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
        priority: 'normal'
      };

      return this.createNotification(user, testData);
    } catch (error) {
      console.error('Test notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService; 