# 📬 Inbox/Messaging API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies or Authorization header.

---

## 📨 **CHAT ENDPOINTS**

### 1. Get User's Chats (Inbox)
```
GET /api/chats
```
**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Chats per page (default: 20)

**Example Response:**
```json
{
  "chats": [
    {
      "_id": "688b88808682014bd5c46754",
      "name": "Project Discussion",
      "type": "group",
      "creator": {
        "_id": "6880ba54d4796fae92b513cd",
        "firstName": "John",
        "fullName": "John Doe",
        "avatar": "https://res.cloudinary.com/avatar.jpg"
      },
      "members": [
        {
          "user": {
            "_id": "6880ba54d4796fae92b513cd",
            "firstName": "John",
            "fullName": "John Doe",
            "avatar": "https://res.cloudinary.com/avatar.jpg"
          },
          "role": "creator",
          "joinedAt": "2025-01-01T10:00:00.000Z",
          "isActive": true
        }
      ],
      "lastMessage": {
        "_id": "688c12345678901234567890",
        "content": "Hello everyone!",
        "sender": "6880ba54d4796fae92b513cd",
        "createdAt": "2025-01-01T15:30:00.000Z"
      },
      "lastActivity": "2025-01-01T15:30:00.000Z",
      "unreadCount": 3,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T15:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalChats": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### 2. Create New Chat/Group
```
POST /api/chats
```
**Request Body:**
```json
{
  "type": "direct",
  "participants": ["6880ba54d4796fae92b513cd"]
}
```
OR for group:
```json
{
  "type": "group",
  "name": "Study Group",
  "description": "CS students discussion",
  "participants": ["6880ba54d4796fae92b513cd", "6880ba54d4796fae92b513ce"]
}
```

**Example Response:**
```json
{
  "message": "Chat created successfully",
  "chat": {
    "_id": "688b88808682014bd5c46754",
    "name": "Study Group",
    "type": "group",
    "creator": "6880ba54d4796fae92b513cd",
    "members": [
      {
        "user": "6880ba54d4796fae92b513cd",
        "role": "creator",
        "joinedAt": "2025-01-01T10:00:00.000Z",
        "isActive": true
      }
    ],
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

### 3. Get Specific Chat Details
```
GET /api/chats/:chatId
```

**Example Response:**
```json
{
  "_id": "688b88808682014bd5c46754",
  "name": "Study Group",
  "type": "group",
  "creator": {
    "_id": "6880ba54d4796fae92b513cd",
    "firstName": "John",
    "fullName": "John Doe",
    "avatar": "https://res.cloudinary.com/avatar.jpg"
  },
  "members": [
    {
      "user": {
        "_id": "6880ba54d4796fae92b513cd",
        "firstName": "John",
        "fullName": "John Doe",
        "avatar": "https://res.cloudinary.com/avatar.jpg"
      },
      "role": "creator",
      "joinedAt": "2025-01-01T10:00:00.000Z",
      "permissions": {
        "canAddMembers": true,
        "canRemoveMembers": true,
        "canEditGroup": true,
        "canDeleteMessages": true
      },
      "isActive": true
    }
  ],
  "settings": {
    "isPrivate": false,
    "requireApproval": false,
    "maxMembers": 100,
    "allowFileSharing": true
  },
  "createdAt": "2025-01-01T10:00:00.000Z"
}
```

### 4. Add Members to Chat
```
POST /api/chats/:chatId/members
```
**Request Body:**
```json
{
  "userIds": ["6880ba54d4796fae92b513ce", "6880ba54d4796fae92b513cf"]
}
```

**Example Response:**
```json
{
  "message": "Members added successfully",
  "addedMembers": [
    {
      "user": "6880ba54d4796fae92b513ce",
      "role": "member",
      "joinedAt": "2025-01-01T11:00:00.000Z",
      "isActive": true
    }
  ]
}
```

### 5. Remove Member from Chat
```
DELETE /api/chats/:chatId/members/:userId
```

**Example Response:**
```json
{
  "message": "Member removed successfully"
}
```

### 6. Update Member Permissions
```
PATCH /api/chats/:chatId/members/:userId
```
**Request Body:**
```json
{
  "role": "admin",
  "permissions": {
    "canAddMembers": true,
    "canRemoveMembers": false,
    "canEditGroup": true,
    "canDeleteMessages": true
  }
}
```

**Example Response:**
```json
{
  "message": "Member permissions updated successfully",
  "member": {
    "user": "6880ba54d4796fae92b513ce",
    "role": "admin",
    "permissions": {
      "canAddMembers": true,
      "canRemoveMembers": false,
      "canEditGroup": true,
      "canDeleteMessages": true
    }
  }
}
```

### 7. Get Unread Count for Chat
```
GET /api/chats/:chatId/unread-count
```

**Example Response:**
```json
{
  "chatId": "688b88808682014bd5c46754",
  "unreadCount": 5
}
```

### 8. Mark Chat as Read
```
POST /api/chats/:chatId/read
```

**Example Response:**
```json
{
  "message": "Chat marked as read",
  "markedCount": 3
}
```

---

## 🔍 **USER SEARCH ENDPOINT**

### **GET /api/users/search**

Search for users to start conversations with.

**Query Parameters:**
- `q` (required) - Search query (name, email)
- `limit` (optional) - Results limit (default: 10)

**Example Request:**
```
GET /api/users/search?q=hasib&limit=5
```

**Example Response:**
```json
{
  "users": [
    {
      "_id": "6880ba54d4796fae92b513cd",
      "firstName": "Hasib",
      "fullName": "Hasib Ahmed",
      "email": "ahmed35-966@diu.edu.bd",
      "avatar": "https://res.cloudinary.com/dysr0wotl/image/upload/v1753286199/avatars/6880ba54d4796fae92b513cd.jpg",
      "status": "active"
    }
  ],
  "count": 1,
  "query": "hasib"
}
```

**Search Features:**
- Searches by `firstName`, `fullName`, and `email`
- Case-insensitive search
- Excludes current user from results
- Returns empty array for empty queries
- Supports partial matching

---

## 💬 **MESSAGE ENDPOINTS**

### 1. Get Messages for Chat
```
GET /api/messages/:chatId
```
**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Messages per page (default: 50)

**Example Response:**
```json
{
  "messages": [
    {
      "_id": "688c12345678901234567890",
      "content": "Hello everyone!",
      "sender": {
        "_id": "6880ba54d4796fae92b513cd",
        "firstName": "John",
        "fullName": "John Doe",
        "avatar": "https://res.cloudinary.com/avatar.jpg"
      },
      "chat": "688b88808682014bd5c46754",
      "type": "text",
      "isEdited": false,
      "isDeleted": false,
      "readBy": [
        {
          "user": "6880ba54d4796fae92b513cd",
          "readAt": "2025-01-01T15:30:00.000Z"
        }
      ],
      "createdAt": "2025-01-01T15:30:00.000Z",
      "updatedAt": "2025-01-01T15:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalMessages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### 2. Send New Message
```
POST /api/messages
```
**Request Body (Text Message):**
```json
{
  "chatId": "688b88808682014bd5c46754",
  "content": "Hello everyone!",
  "type": "text"
}
```

**Request Body (Reply Message):**
```json
{
  "chatId": "688b88808682014bd5c46754",
  "content": "I agree with that!",
  "type": "text",
  "replyTo": "688c12345678901234567890"
}
```

**Request Body (File Upload):**
```
Content-Type: multipart/form-data

chatId: 688b88808682014bd5c46754
type: file
attachment: [file]
```

**Example Response:**
```json
{
  "message": "Message sent successfully",
  "data": {
    "_id": "688c12345678901234567891",
    "content": "Hello everyone!",
    "sender": {
      "_id": "6880ba54d4796fae92b513cd",
      "firstName": "John",
      "fullName": "John Doe",
      "avatar": "https://res.cloudinary.com/avatar.jpg"
    },
    "chat": "688b88808682014bd5c46754",
    "type": "text",
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2025-01-01T15:35:00.000Z"
  }
}
```

### 3. Edit Message
```
PATCH /api/messages/:messageId
```
**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Example Response:**
```json
{
  "message": "Message updated successfully",
  "data": {
    "_id": "688c12345678901234567890",
    "content": "Updated message content",
    "isEdited": true,
    "editedAt": "2025-01-01T15:40:00.000Z"
  }
}
```

### 4. Delete Message
```
DELETE /api/messages/:messageId
```

**Example Response:**
```json
{
  "message": "Message deleted successfully"
}
```

### 5. Mark Message as Read
```
POST /api/messages/:messageId/read
```

**Example Response:**
```json
{
  "message": "Message marked as read",
  "readAt": "2025-01-01T15:45:00.000Z"
}
```

### 6. Mark Multiple Messages as Read
```
POST /api/messages/bulk-read
```
**Request Body:**
```json
{
  "messageIds": ["688c12345678901234567890", "688c12345678901234567891"]
}
```

**Example Response:**
```json
{
  "message": "Messages marked as read",
  "markedCount": 2
}
```

### 7. Get Unread Messages Count
```
GET /api/messages/:chatId/unread
```

**Example Response:**
```json
{
  "chatId": "688b88808682014bd5c46754",
  "unreadCount": 3
}
```

### 8. Search Messages
```
GET /api/messages/search
```
**Query Parameters:**
- `q` (required) - Search query
- `chatId` (optional) - Search in specific chat
- `limit` (optional) - Results limit (default: 20)

**Example Response:**
```json
{
  "query": "hello",
  "results": [
    {
      "_id": "688c12345678901234567890",
      "content": "Hello everyone!",
      "sender": {
        "_id": "6880ba54d4796fae92b513cd",
        "firstName": "John",
        "fullName": "John Doe",
        "avatar": "https://res.cloudinary.com/avatar.jpg"
      },
      "chat": {
        "_id": "688b88808682014bd5c46754",
        "name": "Study Group",
        "type": "group"
      },
      "createdAt": "2025-01-01T15:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 🔥 **REAL-TIME EVENTS (Socket.IO)**

### Connection
```javascript
const socket = io('http://localhost:2000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events to Emit:
- `join_user_chats` - Join all user's chat rooms
- `join_chat` - Join specific chat room
- `leave_chat` - Leave specific chat room
- `send_message` - Send real-time message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_messages_read` - Mark messages as read
- `update_status` - Update user status

### Events to Listen:
- `new_message` - Receive new message
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `messages_read` - Messages were read
- `user_status_updated` - User status changed
- `chat_updated` - Chat settings changed
- `member_added` - New member added to chat
- `member_removed` - Member removed from chat

---

## ⚠️ **Error Responses**

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "message": "Access denied. You are not a member of this chat."
}
```

### 404 Not Found
```json
{
  "message": "Chat not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Error message",
  "error": "Detailed error description"
}
``` 