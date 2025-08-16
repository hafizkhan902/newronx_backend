import jwt from 'jsonwebtoken';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

class MessageService {
  // Helper method to get user from token
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Send message
  async sendMessage(token, recipientId, content, type = 'text') {
    const sender = await this.getUserFromToken(token);
    if (!sender) {
      throw new Error('User not found');
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Check if sender is trying to message themselves
    if (sender._id.toString() === recipientId) {
      throw new Error('Cannot send message to yourself');
    }

    // Create message
    const message = new Message({
      sender: sender._id,
      recipient: recipientId,
      content: content.trim(),
      type: type || 'text',
      read: false
    });

    await message.save();

    // Populate sender and recipient information
    await message.populate('sender', 'firstName fullName avatar');
    await message.populate('recipient', 'firstName fullName avatar');

    return message;
  }

  // Get conversation messages
  async getConversation(token, recipientId, pagination) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get messages between current user and recipient
    const messages = await Message.find({
      $or: [
        { sender: currentUser._id, recipient: recipientId },
        { sender: recipientId, recipient: currentUser._id }
      ]
    })
      .populate('sender', 'firstName fullName avatar')
      .populate('recipient', 'firstName fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({
      $or: [
        { sender: currentUser._id, recipient: recipientId },
        { sender: recipientId, recipient: currentUser._id }
      ]
    });

    const totalPages = Math.ceil(total / limit);

    // Mark unread messages as read
    await Message.updateMany(
      {
        sender: recipientId,
        recipient: currentUser._id,
        read: false
      },
      { read: true }
    );

    return {
      messages: messages.reverse(), // Show oldest first
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

  // Get all conversations
  async getConversations(token, pagination) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUser._id },
            { recipient: currentUser._id }
          ]
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', currentUser._id] },
              then: '$recipient',
              else: '$sender'
            }
          }
        }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', currentUser._id] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Populate user information for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUser = await User.findById(conversation._id)
          .select('firstName fullName avatar online lastSeen');

        return {
          otherUser,
          lastMessage: conversation.lastMessage,
          unreadCount: conversation.unreadCount
        };
      })
    );

    const total = await Message.distinct('otherUser', {
      $or: [
        { sender: currentUser._id },
        { recipient: currentUser._id }
      ]
    }).count();

    const totalPages = Math.ceil(total / limit);

    return {
      conversations: populatedConversations,
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

  // Mark message as read
  async markAsRead(token, messageId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if current user is the recipient
    if (message.recipient.toString() !== currentUser._id.toString()) {
      throw new Error('You can only mark messages sent to you as read');
    }

    // Mark as read
    message.read = true;
    message.readAt = new Date();
    await message.save();

    return message;
  }

  // Mark conversation as read
  async markConversationAsRead(token, recipientId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Mark all unread messages from this recipient as read
    const result = await Message.updateMany(
      {
        sender: recipientId,
        recipient: currentUser._id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    return {
      updatedCount: result.modifiedCount,
      message: 'Conversation marked as read'
    };
  }

  // Delete message
  async deleteMessage(token, messageId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check ownership
    if (message.sender.toString() !== currentUser._id.toString()) {
      throw new Error('You can only delete your own messages');
    }

    // Delete message
    await Message.findByIdAndDelete(messageId);
  }

  // Get unread count
  async getUnreadCount(token) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const count = await Message.countDocuments({
      recipient: currentUser._id,
      read: false
    });

    return count;
  }

  // Search messages
  async searchMessages(token, query, pagination) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Search in messages where current user is sender or recipient
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: currentUser._id },
            { recipient: currentUser._id }
          ]
        },
        {
          $or: [
            { content: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
      .populate('sender', 'firstName fullName avatar')
      .populate('recipient', 'firstName fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({
      $and: [
        {
          $or: [
            { sender: currentUser._id },
            { recipient: currentUser._id }
          ]
        },
        {
          $or: [
            { content: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    });

    const totalPages = Math.ceil(total / limit);

    return {
      messages,
      query,
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

  // Get message by ID
  async getMessageById(token, messageId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const message = await Message.findById(messageId)
      .populate('sender', 'firstName fullName avatar')
      .populate('recipient', 'firstName fullName avatar');

    if (!message) {
      return null;
    }

    // Check if current user is sender or recipient
    if (message.sender.toString() !== currentUser._id.toString() &&
        message.recipient.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied to this message');
    }

    return message;
  }

  // Forward message
  async forwardMessage(token, messageId, recipientIds) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    // Check if current user is sender or recipient of original message
    if (originalMessage.sender.toString() !== currentUser._id.toString() &&
        originalMessage.recipient.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied to this message');
    }

    // Validate recipient IDs
    const validRecipients = await User.find({
      _id: { $in: recipientIds }
    });

    if (validRecipients.length !== recipientIds.length) {
      throw new Error('Some recipient IDs are invalid');
    }

    // Create forwarded messages
    const forwardedMessages = [];
    for (const recipientId of recipientIds) {
      const forwardedMessage = new Message({
        sender: currentUser._id,
        recipient: recipientId,
        content: `[Forwarded] ${originalMessage.content}`,
        type: 'forwarded',
        originalMessage: messageId,
        read: false
      });

      await forwardedMessage.save();
      await forwardedMessage.populate('sender', 'firstName fullName avatar');
      await forwardedMessage.populate('recipient', 'firstName fullName avatar');

      forwardedMessages.push(forwardedMessage);
    }

    return {
      forwardedMessages,
      count: forwardedMessages.length
    };
  }

  // React to message
  async reactToMessage(token, messageId, reaction) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if current user is sender or recipient
    if (message.sender.toString() !== currentUser._id.toString() &&
        message.recipient.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied to this message');
    }

    // Add or update reaction
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === currentUser._id.toString()
    );

    if (existingReactionIndex !== -1) {
      // Update existing reaction
      message.reactions[existingReactionIndex].reaction = reaction;
      message.reactions[existingReactionIndex].updatedAt = new Date();
    } else {
      // Add new reaction
      message.reactions.push({
        user: currentUser._id,
        reaction,
        createdAt: new Date()
      });
    }

    await message.save();
    await message.populate('reactions.user', 'firstName fullName avatar');

    return message;
  }

  // Remove reaction
  async removeReaction(token, messageId) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if current user is sender or recipient
    if (message.sender.toString() !== currentUser._id.toString() &&
        message.recipient.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied to this message');
    }

    // Remove reaction
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== currentUser._id.toString()
    );

    await message.save();
    await message.populate('reactions.user', 'firstName fullName avatar');

    return message;
  }
}

export default MessageService;
