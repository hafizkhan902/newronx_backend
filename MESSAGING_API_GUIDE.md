# StudentMate Messaging System API Guide

## 🚀 Overview

The StudentMate messaging system provides real-time group and direct messaging capabilities with advanced features like:
- **Real-time messaging** with Socket.IO
- **Group management** with role-based permissions
- **File sharing** with Cloudinary integration
- **Read receipts** and typing indicators
- **Message editing/deletion**
- **User presence** tracking

---

## 📋 Models

### Chat Model
```javascript
{
  name: String,                    // Group name (required for groups)
  description: String,             // Group description
  type: 'direct' | 'group',       // Chat type
  creator: ObjectId (User),        // Chat creator
  members: [{                      // Chat members
    user: ObjectId (User),
    role: 'creator' | 'admin' | 'member',
    joinedAt: Date,
    permissions: {
      canAddMembers: Boolean,
      canRemoveMembers: Boolean,
      canEditGroup: Boolean,
      canDeleteMessages: Boolean
    },
    isActive: Boolean
  }],
  settings: {
    isPrivate: Boolean,
    requireApproval: Boolean,
    maxMembers: Number,
    allowFileSharing: Boolean
  },
  avatar: String,                  // Group avatar URL
  lastMessage: ObjectId (Message), // Last message reference
  lastActivity: Date,              // Last activity timestamp
  relatedIdea: ObjectId (Idea)     // Optional: linked to an idea
}
```

### Message Model
```javascript
{
  content: String,                 // Message text
  sender: ObjectId (User),         // Message sender
  chat: ObjectId (Chat),           // Parent chat
  type: 'text' | 'image' | 'file' | 'system',
  replyTo: ObjectId (Message),     // Reply reference
  attachments: [{                  // File attachments
    url: String,
    filename: String,
    contentType: String,
    size: Number
  }],
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId (User),
  readBy: [{                       // Read receipts
    user: ObjectId (User),
    readAt: Date
  }],
  systemData: {                    // For system messages
    action: String,
    targetUser: ObjectId (User),
    metadata: Mixed
  }
}
```

---

## 🌐 REST API Endpoints

### Chat Management

#### `POST /api/chats`
Create a new chat or group.

**Request Body:**
```javascript
{
  "name": "Project Team",          // Required for groups
  "description": "Our project discussion",
  "type": "group",                 // 'direct' or 'group'
  "members": ["userId1", "userId2"], // User IDs to add
  "settings": {
    "isPrivate": false,
    "requireApproval": true,
    "maxMembers": 50
  },
  "relatedIdea": "ideaId"          // Optional: link to idea
}
```

**Response:**
```javascript
{
  "message": "Chat created successfully",
  "chat": { /* chat object */ }
}
```

#### `GET /api/chats`
Get user's chats with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```javascript
{
  "chats": [
    {
      /* chat object */
      "unreadCount": 5
    }
  ],
  "pagination": { /* pagination info */ }
}
```

#### `GET /api/chats/:chatId`
Get specific chat details.

#### `PATCH /api/chats/:chatId`
Update chat settings (admin/creator only).

#### `DELETE /api/chats/:chatId`
Delete chat (creator only).

### Member Management

#### `POST /api/chats/:chatId/members`
Add members to chat.

**Request Body:**
```javascript
{
  "userIds": ["userId1", "userId2"],
  "permissions": {
    "canAddMembers": true
  }
}
```

#### `DELETE /api/chats/:chatId/members/:userId`
Remove member or leave chat.

#### `PATCH /api/chats/:chatId/members/:userId`
Update member permissions.

**Request Body:**
```javascript
{
  "role": "admin",
  "permissions": {
    "canAddMembers": true,
    "canRemoveMembers": false
  }
}
```

### Message Management

#### `GET /api/messages/:chatId`
Get messages for a chat.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)

#### `POST /api/messages`
Send a new message.

**Request Body (Form Data):**
```javascript
{
  "chatId": "chatId",
  "content": "Hello everyone!",
  "type": "text",
  "replyTo": "messageId",          // Optional
  "attachment": File               // Optional file
}
```

#### `PATCH /api/messages/:messageId`
Edit a message (sender only).

#### `DELETE /api/messages/:messageId`
Delete a message (sender or admin).

#### `POST /api/messages/:messageId/read`
Mark message as read.

#### `POST /api/messages/bulk-read`
Mark multiple messages as read.

**Request Body:**
```javascript
{
  "messageIds": ["msgId1", "msgId2"],
  "chatId": "chatId"
}
```

#### `GET /api/messages/:chatId/unread`
Get unread message count for a chat.

#### `GET /api/messages/search`
Search messages across chats.

**Query Parameters:**
- `q` (search query)
- `chatId` (optional: specific chat)
- `limit` (default: 20)

---

## ⚡ Socket.IO Events

### Connection & Authentication

**Client connects with JWT token:**
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Connection Events

#### Client → Server

**`join_user_chats`**
Join all user's chat rooms.
```javascript
socket.emit('join_user_chats');
```

**`join_chat`**
Join specific chat room.
```javascript
socket.emit('join_chat', chatId);
```

**`leave_chat`**
Leave specific chat room.
```javascript
socket.emit('leave_chat', chatId);
```

#### Server → Client

**`connected`**
Connection successful.
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data.user);
});
```

**`chats_joined`**
Successfully joined user's chats.
```javascript
socket.on('chats_joined', (data) => {
  console.log('Joined', data.count, 'chats');
});
```

### Messaging Events

#### Client → Server

**`send_message`**
Send a new message.
```javascript
socket.emit('send_message', {
  chatId: 'chatId',
  content: 'Hello!',
  type: 'text',
  replyTo: 'messageId'  // Optional
});
```

**`edit_message`**
Edit an existing message.
```javascript
socket.emit('edit_message', {
  messageId: 'messageId',
  content: 'Updated message'
});
```

**`delete_message`**
Delete a message.
```javascript
socket.emit('delete_message', {
  messageId: 'messageId'
});
```

#### Server → Client

**`new_message`**
New message received.
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
  // Update UI with new message
});
```

**`message_edited`**
Message was edited.
```javascript
socket.on('message_edited', (data) => {
  console.log('Message edited:', data.message);
  // Update message in UI
});
```

**`message_deleted`**
Message was deleted.
```javascript
socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
  // Remove message from UI
});
```

### Typing Indicators

#### Client → Server

**`typing_start`**
User started typing.
```javascript
socket.emit('typing_start', { chatId: 'chatId' });
```

**`typing_stop`**
User stopped typing.
```javascript
socket.emit('typing_stop', { chatId: 'chatId' });
```

#### Server → Client

**`user_typing`**
Someone is typing.
```javascript
socket.on('user_typing', (data) => {
  console.log(data.user.fullName, 'is typing...');
  // Show typing indicator
});
```

**`user_stop_typing`**
Someone stopped typing.
```javascript
socket.on('user_stop_typing', (data) => {
  // Hide typing indicator
});
```

### Read Receipts

#### Client → Server

**`mark_messages_read`**
Mark messages as read.
```javascript
socket.emit('mark_messages_read', {
  messageIds: ['msgId1', 'msgId2'],
  chatId: 'chatId'
});
```

#### Server → Client

**`messages_read`**
Messages were read by someone.
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read by:', data.userId);
  // Update read receipts in UI
});
```

### User Presence

#### Client → Server

**`update_status`**
Update user status.
```javascript
socket.emit('update_status', 'away'); // online, away, busy, offline
```

#### Server → Client

**`user_online`**
User came online.
```javascript
socket.on('user_online', (data) => {
  console.log(data.user.fullName, 'is online');
});
```

**`user_offline`**
User went offline.
```javascript
socket.on('user_offline', (data) => {
  console.log('User offline:', data.userId);
});
```

**`user_status_update`**
User status changed.
```javascript
socket.on('user_status_update', (data) => {
  console.log('Status update:', data.status);
});
```

### Error Handling

**`error`**
Error occurred.
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

---

## 🔗 Integration with Ideas

### Create Group from Idea
When users collaborate on an idea, you can create a dedicated group chat:

```javascript
// Create group for idea collaboration
const response = await fetch('/api/chats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: `${idea.title} - Team`,
    description: `Discussion for: ${idea.title}`,
    type: 'group',
    members: collaboratorIds,
    relatedIdea: idea._id
  })
});
```

### Auto-invite Collaborators
When someone approaches an idea, automatically add them to the group:

```javascript
// In your idea approach handler
const ideaChat = await Chat.findOne({ relatedIdea: ideaId });
if (ideaChat) {
  // Add user to chat
  await fetch(`/api/chats/${ideaChat._id}/members`, {
    method: 'POST',
    body: JSON.stringify({ userIds: [userId] })
  });
}
```

---

## 📱 Frontend Implementation Example

### React Hook for Messaging
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useMessaging = (token) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to messaging');
      newSocket.emit('join_user_chats');
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('user_online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  const sendMessage = (chatId, content) => {
    if (socket) {
      socket.emit('send_message', { chatId, content });
    }
  };

  return { socket, messages, onlineUsers, sendMessage };
};
```

---

## 🔒 Security Features

1. **JWT Authentication** - All Socket.IO connections require valid JWT
2. **Permission Checks** - Role-based permissions for all actions
3. **Chat Membership** - Users can only access chats they're members of
4. **File Upload Limits** - 10MB limit on message attachments
5. **Input Validation** - All inputs are validated and sanitized

---

## 🚀 Getting Started

1. **Install Dependencies** (already done):
   ```bash
   npm install socket.io
   ```

2. **Environment Variables**:
   ```
   JWT_SECRET=your-secret-key
   MONGODB_URI=your-mongodb-connection
   CORS=http://localhost:3000
   ```

3. **Start Server**:
   ```bash
   npm run dev
   ```

4. **Test Connection**:
   - Connect to `http://localhost:5000` with Socket.IO client
   - Use JWT token in auth header
   - Emit `join_user_chats` to start receiving messages

---

## 📊 Performance Considerations

- **Connection Pooling**: Socket.IO handles connection pooling automatically
- **Message Pagination**: Messages are paginated (50 per page)
- **Lazy Loading**: Only load messages when chat is opened
- **Cleanup**: Temporary files are automatically cleaned up
- **Indexing**: Database indexes on chat members and message timestamps

The messaging system is now fully integrated and ready for use! 🎉 