import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/user.model.js';
import Chat from './models/chat.model.js';
import Message from './models/message.model.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> { socketId, lastSeen, status }
const userSockets = new Map(); // socketId -> userId
const chatRooms = new Map(); // chatId -> Set of userIds

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.IO
const initializeSocket = async (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Redis adapter for clustering support
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter configured for clustering');
    } catch (error) {
      console.warn('Redis not available, using in-memory adapter:', error.message);
    }
  }
  
  // Apply authentication middleware
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.fullName} connected: ${socket.id}`);
    
    // Store user connection
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      status: 'online',
      user: socket.user
    });
    userSockets.set(socket.id, socket.userId);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Get user's chats and join chat rooms
    socket.on('join_user_chats', async () => {
      try {
        const userChats = await Chat.find({
          'members.user': socket.userId,
          'members.isActive': true
        }).select('_id');
        
        for (const chat of userChats) {
          const chatId = chat._id.toString();
          socket.join(`chat_${chatId}`);
          
          // Track users in chat rooms
          if (!chatRooms.has(chatId)) {
            chatRooms.set(chatId, new Set());
          }
          chatRooms.get(chatId).add(socket.userId);
          
          // Notify other members that user is online
          socket.to(`chat_${chatId}`).emit('user_online', {
            userId: socket.userId,
            user: {
              _id: socket.userId,
              firstName: socket.user.firstName,
              fullName: socket.user.fullName,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });
        }
        
        socket.emit('chats_joined', { count: userChats.length });
      } catch (error) {
        console.error('Error joining user chats:', error);
        socket.emit('error', { message: 'Failed to join chats' });
      }
    });
    
    // Join specific chat room
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isMember(socket.userId)) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }
        
        socket.join(`chat_${chatId}`);
        
        // Track user in chat room
        if (!chatRooms.has(chatId)) {
          chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId).add(socket.userId);
        
        // Notify others in chat
        socket.to(`chat_${chatId}`).emit('user_joined_chat', {
          userId: socket.userId,
          user: {
            _id: socket.userId,
            firstName: socket.user.firstName,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar
          },
          chatId,
          timestamp: new Date()
        });
        
        socket.emit('chat_joined', { chatId });
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });
    
    // Leave specific chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      
      // Remove user from chat room tracking
      if (chatRooms.has(chatId)) {
        chatRooms.get(chatId).delete(socket.userId);
      }
      
      // Notify others in chat
      socket.to(`chat_${chatId}`).emit('user_left_chat', {
        userId: socket.userId,
        chatId,
        timestamp: new Date()
      });
      
      socket.emit('chat_left', { chatId });
    });
    
    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, type, replyTo } = data;
        
        // Validate chat membership
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isMember(socket.userId)) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }
        
        // Create message
        const message = new Message({
          content,
          sender: socket.userId,
          chat: chatId,
          type: type || 'text',
          replyTo: replyTo || undefined
        });
        
        await message.save();
        await message.populate('sender', 'firstName fullName avatar');
        await message.populate('replyTo');
        
        // Emit to all chat members
        io.to(`chat_${chatId}`).emit('new_message', {
          message,
          chatId,
          timestamp: new Date()
        });
        
        // Send push notification to offline users
        const offlineMembers = chat.members.filter(member => 
          member.isActive && 
          member.user.toString() !== socket.userId &&
          !activeUsers.has(member.user.toString())
        );
        
        // Send push notifications to offline members
        if (offlineMembers.length > 0) {
          try {
            const pushNotificationService = (await import('./services/pushNotificationService.js')).default;
            const offlineUserIds = offlineMembers.map(member => member.user);
            
            await pushNotificationService.sendMessageNotification(
              socket.user,
              offlineUserIds,
              {
                content: content,
                chatId: chatId
              }
            );
          } catch (error) {
            console.error('Failed to send push notifications:', error);
          }
        }
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle message editing
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, content } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        if (message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }
        
        await message.editMessage(content);
        await message.populate('sender', 'firstName fullName avatar');
        
        // Emit to all chat members
        io.to(`chat_${message.chat}`).emit('message_edited', {
          message,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });
    
    // Handle message deletion
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        const chat = await Chat.findById(message.chat);
        const canDelete = message.sender.toString() === socket.userId || 
                         chat.hasPermission(socket.userId, 'delete_message');
        
        if (!canDelete) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }
        
        await message.deleteMessage(socket.userId);
        
        // Emit to all chat members
        io.to(`chat_${message.chat}`).emit('message_deleted', {
          messageId,
          chatId: message.chat.toString(),
          deletedBy: socket.userId,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        userId: socket.userId,
        user: {
          _id: socket.userId,
          firstName: socket.user.firstName,
          fullName: socket.user.fullName,
          avatar: socket.user.avatar
        },
        chatId,
        timestamp: new Date()
      });
    });
    
    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_stop_typing', {
        userId: socket.userId,
        chatId,
        timestamp: new Date()
      });
    });
    
    // Handle read receipts
    socket.on('mark_messages_read', async (data) => {
      try {
        const { messageIds, chatId } = data;
        
        if (!Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Invalid message IDs' });
          return;
        }
        
        // Mark messages as read
        const updatePromises = messageIds.map(async (messageId) => {
          const message = await Message.findById(messageId);
          if (message && message.chat.toString() === chatId) {
            return message.markAsRead(socket.userId);
          }
        });
        
        await Promise.all(updatePromises);
        
        // Notify other chat members about read receipts
        socket.to(`chat_${chatId}`).emit('messages_read', {
          userId: socket.userId,
          messageIds,
          chatId,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });
    
    // Handle user status updates
    socket.on('update_status', (status) => {
      if (['online', 'away', 'busy', 'offline'].includes(status)) {
        const userData = activeUsers.get(socket.userId);
        if (userData) {
          userData.status = status;
          userData.lastSeen = new Date();
          
          // Broadcast status update to all user's chats
          socket.broadcast.emit('user_status_update', {
            userId: socket.userId,
            status,
            lastSeen: userData.lastSeen
          });
        }
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user.fullName} disconnected: ${reason}`);
      
      // Update user status
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.status = 'offline';
        userData.lastSeen = new Date();
      }
      
      // Remove from active users after a delay (in case of quick reconnection)
      setTimeout(() => {
        activeUsers.delete(socket.userId);
        userSockets.delete(socket.id);
        
        // Remove from all chat rooms
        for (const [chatId, users] of chatRooms.entries()) {
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
            // Notify other members
            socket.to(`chat_${chatId}`).emit('user_offline', {
              userId: socket.userId,
              chatId,
              lastSeen: new Date()
            });
          }
        }
      }, 5000); // 5 second delay
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Send initial connection success
    socket.emit('connected', {
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date()
    });
  });
  
  // Helper function to get online users in a chat
  const getOnlineUsersInChat = (chatId) => {
    const users = chatRooms.get(chatId);
    if (!users) return [];
    
    return Array.from(users).map(userId => {
      const userData = activeUsers.get(userId);
      return userData ? {
        userId,
        user: userData.user,
        status: userData.status,
        lastSeen: userData.lastSeen
      } : null;
    }).filter(Boolean);
  };
  
  // Helper function to broadcast to specific users
  const broadcastToUsers = (userIds, event, data) => {
    userIds.forEach(userId => {
      const userData = activeUsers.get(userId);
      if (userData) {
        io.to(userData.socketId).emit(event, data);
      }
    });
  };
  
  // Expose helper functions
  io.getOnlineUsersInChat = getOnlineUsersInChat;
  io.broadcastToUsers = broadcastToUsers;
  io.activeUsers = activeUsers;
  
  return io;
};

export default initializeSocket; 