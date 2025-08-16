# 🔔 Notification Settings API Endpoints

## 🔐 Authentication
All endpoints require authentication via JWT token in cookies.

---

## 📧 **EMAIL NOTIFICATIONS**

### **GET /api/users/profile/notifications**
Get current notification settings for both email and app notifications.

**Example Response:**
```json
{
  "notifications": {
    "email": {
      "enabled": true,
      "preferences": {
        "messages": true,
        "ideaCollaboration": false,
        "comments": true,
        "likes": false,
        "groupChats": true,
        "connectionRequests": true,
        "weeklyDigest": true
      }
    },
    "app": {
      "enabled": true,
      "browserPermission": "granted",
      "preferences": {
        "messages": true,
        "ideaCollaboration": false,
        "comments": true,
        "likes": false,
        "groupChats": true,
        "connectionRequests": false
      }
    }
  }
}
```

### **PATCH /api/users/profile/notifications/email**
Update email notification settings.

**Request Body:**
```json
{
  "enabled": true,
  "preferences": {
    "messages": true,
    "ideaCollaboration": false,
    "comments": true,
    "likes": false,
    "groupChats": true,
    "connectionRequests": true,
    "weeklyDigest": true
  }
}
```

**Available Email Preferences:**
- `messages` - New message notifications
- `ideaCollaboration` - Idea collaboration requests
- `comments` - Comment notifications
- `likes` - Like/reaction notifications
- `groupChats` - Group chat notifications
- `connectionRequests` - New connection requests
- `weeklyDigest` - Weekly summary emails

**Example Response:**
```json
{
  "message": "Email notification settings updated successfully.",
  "email": {
    "enabled": true,
    "preferences": {
      "messages": true,
      "ideaCollaboration": false,
      "comments": true,
      "likes": false,
      "groupChats": true,
      "connectionRequests": true,
      "weeklyDigest": true
    }
  }
}
```

---

## 📱 **APP NOTIFICATIONS**

### **PATCH /api/users/profile/notifications/app**
Update app notification settings.

**Request Body:**
```json
{
  "enabled": true,
  "browserPermission": "granted",
  "preferences": {
    "messages": true,
    "ideaCollaboration": false,
    "comments": true,
    "likes": false,
    "groupChats": true,
    "connectionRequests": false
  }
}
```

**Available App Preferences:**
- `messages` - New message notifications
- `ideaCollaboration` - Idea collaboration requests
- `comments` - Comment notifications
- `likes` - Like/reaction notifications
- `groupChats` - Group chat notifications
- `connectionRequests` - New connection requests

**Browser Permission Status:**
- `granted` - User allowed notifications
- `denied` - User blocked notifications
- `default` - Permission not yet requested

**Example Response:**
```json
{
  "message": "App notification settings updated successfully.",
  "app": {
    "enabled": true,
    "browserPermission": "granted",
    "preferences": {
      "messages": true,
      "ideaCollaboration": false,
      "comments": true,
      "likes": false,
      "groupChats": true,
      "connectionRequests": false
    }
  }
}
```

### **POST /api/users/profile/notifications/app/request-permission**
Request browser notification permission and update status.

**Request Body:**
```json
{
  "permission": "granted"
}
```

**Permission Values:**
- `granted` - User allowed notifications (enables app notifications)
- `denied` - User blocked notifications (disables app notifications)
- `default` - Permission not yet requested

**Example Response:**
```json
{
  "message": "Browser notification permission updated successfully.",
  "app": {
    "enabled": true,
    "browserPermission": "granted",
    "preferences": {
      "messages": true,
      "ideaCollaboration": true,
      "comments": true,
      "likes": true,
      "groupChats": true,
      "connectionRequests": true
    }
  },
  "requiresAction": false
}
```

---

## 🧪 **TEST NOTIFICATIONS**

### **POST /api/users/profile/notifications/test**
Send test notifications to verify settings.

**Request Body:**
```json
{
  "type": "email"
}
```
or
```json
{
  "type": "app"
}
```

**Example Response (Email):**
```json
{
  "message": "Test notification sent successfully.",
  "result": {
    "email": {
      "sent": true,
      "message": "Test email notification sent successfully"
    }
  }
}
```

**Example Response (App):**
```json
{
  "message": "Test notification sent successfully.",
  "result": {
    "app": {
      "sent": true,
      "message": "Test push notification sent successfully"
    }
  }
}
```

---

## 🧪 **Testing Examples**

### **1. Get Current Notification Settings**
```bash
curl -X GET http://localhost:2000/api/users/profile/notifications \
  -b cookies.txt
```

### **2. Update Email Notifications**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/notifications/email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "enabled": true,
    "preferences": {
      "messages": true,
      "ideaCollaboration": false,
      "comments": true,
      "likes": false,
      "groupChats": true,
      "connectionRequests": true,
      "weeklyDigest": true
    }
  }'
```

### **3. Request Browser Permission**
```bash
curl -X POST http://localhost:2000/api/users/profile/notifications/app/request-permission \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "permission": "granted"
  }'
```

### **4. Update App Notifications**
```bash
curl -X PATCH http://localhost:2000/api/users/profile/notifications/app \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "enabled": true,
    "preferences": {
      "messages": true,
      "ideaCollaboration": false,
      "comments": true,
      "likes": false,
      "groupChats": true,
      "connectionRequests": false
    }
  }'
```

### **5. Send Test Notifications**
```bash
# Test email notification
curl -X POST http://localhost:2000/api/users/profile/notifications/test \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"type": "email"}'

# Test app notification
curl -X POST http://localhost:2000/api/users/profile/notifications/test \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"type": "app"}'
```

---

## 🔄 **Frontend Integration Workflow**

### **1. Browser Notification Permission Flow:**
```javascript
// Check if browser supports notifications
if ('Notification' in window) {
  // Request permission
  Notification.requestPermission().then(permission => {
    // Send permission status to backend
    fetch('/api/users/profile/notifications/app/request-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission })
    });
  });
}
```

### **2. App Notification Toggle:**
```javascript
// When user toggles app notifications
const toggleAppNotifications = async (enabled) => {
  if (enabled) {
    // Request browser permission first
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Update backend settings
      await updateAppNotifications({ enabled: true });
    }
  } else {
    // Disable app notifications
    await updateAppNotifications({ enabled: false });
  }
};
```

### **3. Email Notification Preferences:**
```javascript
// Update email notification preferences
const updateEmailPreferences = async (preferences) => {
  await fetch('/api/users/profile/notifications/email', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences })
  });
};
```

---

## 📋 **Notification Types Overview**

### **Email Notifications:**
- **Messages** - New direct messages
- **Idea Collaboration** - Collaboration requests
- **Comments** - Comments on ideas
- **Likes** - Reactions to ideas
- **Group Chats** - Group chat activity
- **Connection Requests** - New friend requests
- **Weekly Digest** - Weekly summary emails

### **App Notifications:**
- **Messages** - Real-time message alerts
- **Idea Collaboration** - Instant collaboration updates
- **Comments** - Comment notifications
- **Likes** - Like/reaction alerts
- **Group Chats** - Group chat notifications
- **Connection Requests** - New connection alerts

---

## ⚠️ **Error Responses**

### **400 Bad Request**
```json
{
  "message": "Valid notification type is required (email or app)."
}
```

### **401 Unauthorized**
```json
{
  "message": "No token, authorization denied."
}
```

### **404 Not Found**
```json
{
  "message": "User not found."
}
```

### **500 Internal Server Error**
```json
{
  "message": "Error updating notification settings",
  "error": "Detailed error description"
}
```

---

## 🔄 **Complete Notification Workflow**

1. **Get current settings:**
   ```
   GET /api/users/profile/notifications
   ```

2. **Update email preferences:**
   ```
   PATCH /api/users/profile/notifications/email
   {
     "enabled": true,
     "preferences": { ... }
   }
   ```

3. **Request browser permission:**
   ```
   POST /api/users/profile/notifications/app/request-permission
   {
     "permission": "granted"
   }
   ```

4. **Update app preferences:**
   ```
   PATCH /api/users/profile/notifications/app
   {
     "enabled": true,
     "preferences": { ... }
   }
   ```

5. **Test notifications:**
   ```
   POST /api/users/profile/notifications/test
   {
     "type": "email"
   }
   ```

All notification endpoints are now ready for frontend integration! 🚀 