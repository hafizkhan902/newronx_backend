import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // User who receives the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Notification type
  type: {
    type: String,
    enum: [
      'idea_liked',
      'idea_commented',
      'approach_submitted',
      'approach_accepted',
      'approach_declined',
      'chat_created',
      'message_received',
      'connection_request',
      'system_announcement'
    ],
    required: true
  },
  // Notification title
  title: {
    type: String,
    required: true,
    trim: true
  },
  // Notification message/content
  message: {
    type: String,
    required: true,
    trim: true
  },
  // Additional data (flexible for different notification types)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Read status
  read: {
    type: Boolean,
    default: false
  },
  // Read timestamp
  readAt: {
    type: Date,
    default: null
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Optional expiration date
  expiresAt: {
    type: Date,
    default: null
  },
  // Related entities for reference
  relatedEntities: {
    idea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea'
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 }); // For user's notifications timeline
notificationSchema.index({ recipient: 1, read: 1 }); // For unread notifications
notificationSchema.index({ type: 1, createdAt: -1 }); // For notification type queries
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Mark notification as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    return await this.save();
  }
  return this;
};

// Check if notification is expired
notificationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
