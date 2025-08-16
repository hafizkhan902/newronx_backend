import mongoose from 'mongoose';

// Sub-schema for read receipts
const readReceiptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Sub-schema for message attachments
const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
}, { _id: false });

// Main message schema
const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: function() {
      return this.type === 'text' && !this.attachments?.length;
    },
    trim: true,
    maxlength: 2000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'voice', 'video'],
    default: 'text'
  },
  // For message replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // For file/image messages
  attachments: [attachmentSchema],
  // Message status
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Read receipts
  readBy: [readReceiptSchema],
  // For system messages (user joined, left, etc.)
  systemData: {
    action: {
      type: String,
      enum: ['user_joined', 'user_left', 'user_added', 'user_removed', 'group_created', 'group_updated']
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    metadata: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ replyTo: 1 });

// Virtual to check if message is read by specific user
messageSchema.virtual('isReadBy').get(function() {
  return (userId) => {
    return this.readBy.some(receipt => 
      receipt.user.toString() === userId.toString()
    );
  };
});

// Virtual to get unread count for a chat
messageSchema.virtual('unreadCount').get(function() {
  return (userId) => {
    return this.readBy.length === 0 || !this.isReadBy(userId);
  };
});

// Method to mark as read by user
messageSchema.methods.markAsRead = function(userId) {
  const existingReceipt = this.readBy.find(receipt => 
    receipt.user.toString() === userId.toString()
  );
  
  if (!existingReceipt) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to soft delete message
messageSchema.methods.deleteMessage = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = 'This message was deleted';
  return this.save();
};

// Pre-save middleware to update chat's last activity
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Chat = mongoose.model('Chat');
      await Chat.findByIdAndUpdate(this.chat, {
        lastMessage: this._id,
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error updating chat last activity:', error);
    }
  }
  next();
});

// Static method to get unread messages count for user
messageSchema.statics.getUnreadCount = async function(userId, chatId) {
  const messages = await this.find({
    chat: chatId,
    sender: { $ne: userId },
    isDeleted: false,
    'readBy.user': { $ne: userId }
  });
  
  return messages.length;
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 