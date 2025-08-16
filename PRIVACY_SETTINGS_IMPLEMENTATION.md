# Privacy Settings Implementation Guide

## Overview

This document explains how privacy settings are implemented in the StudentMate backend, with a specific focus on the "Allow Messages" feature that prevents users from receiving messages when disabled.

## Privacy Settings Structure

### User Model Privacy Fields

```javascript
privacy: {
  profileProtection: {
    type: Boolean,
    default: false
  },
  profileVisibility: {
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public'
  },
  allowMessages: {
    type: Boolean,
    default: true
  },
  showEmail: {
    type: Boolean,
    default: false
  },
  showPhone: {
    type: Boolean,
    default: false
  }
}
```

## Allow Messages Privacy Feature

### How It Works

The `allowMessages` privacy setting controls whether a user can receive messages from other users. When disabled:

1. **Direct Chats:** Cannot be created with users who have disabled messages
2. **Group Chats:** Users with disabled messages cannot be added to groups
3. **Message Sending:** Messages cannot be sent to users who have disabled messages

### Implementation Details

#### 1. Helper Function

```javascript
// Helper function to check if users allow messages
const checkUsersAllowMessages = async (userIds) => {
  const users = await User.find({ _id: { $in: userIds } });
  const usersNotAllowingMessages = users.filter(user => !user.privacy.allowMessages);
  
  if (usersNotAllowingMessages.length > 0) {
    const userNames = usersNotAllowingMessages.map(user => user.fullName || user.firstName).join(', ');
    throw new Error(`Cannot send messages to: ${userNames}. They have disabled message receiving.`);
  }
  
  return users;
};
```

#### 2. Chat Creation Protection

**Route:** `POST /api/chats`

**Check:** Before creating a chat, the system verifies that all intended members allow messages.

```javascript
// Validate members exist and check privacy settings
if (members && members.length > 0) {
  try {
    const validMembers = await checkUsersAllowMessages(members);
    if (validMembers.length !== members.length) {
      return res.status(400).json({ message: 'Some members do not exist' });
    }
  } catch (error) {
    return res.status(403).json({ message: error.message });
  }
}
```

#### 3. Adding Members Protection

**Route:** `POST /api/chats/:chatId/members`

**Check:** Before adding new members to a group, the system verifies they allow messages.

```javascript
// Validate users exist and check privacy settings
let users;
try {
  users = await checkUsersAllowMessages(userIds);
  if (users.length !== userIds.length) {
    return res.status(400).json({ message: 'Some users do not exist' });
  }
} catch (error) {
  return res.status(403).json({ message: error.message });
}
```

#### 4. Message Sending Protection

**Route:** `POST /api/messages`

**Check:** Before sending a message, the system verifies that all recipients allow messages.

```javascript
// Check if other chat members allow messages
if (chat.type === 'direct') {
  const otherMemberId = chat.members.find(member => 
    member.user.toString() !== req.user._id.toString()
  )?.user;
  
  if (otherMemberId) {
    try {
      await checkUsersAllowMessages([otherMemberId]);
    } catch (error) {
      return res.status(403).json({ message: error.message });
    }
  }
} else if (chat.type === 'group') {
  // For group chats, check if any members have disabled messages
  const memberIds = chat.members
    .filter(member => member.user.toString() !== req.user._id.toString())
    .map(member => member.user);
  
  if (memberIds.length > 0) {
    try {
      await checkUsersAllowMessages(memberIds);
    } catch (error) {
      return res.status(403).json({ message: error.message });
    }
  }
}
```

## API Endpoints Affected

### 1. Chat Creation
- **Route:** `POST /api/chats`
- **Protection:** Prevents creating chats with users who have disabled messages
- **Error:** `403 Forbidden` with specific user names

### 2. Adding Group Members
- **Route:** `POST /api/chats/:chatId/members`
- **Protection:** Prevents adding users who have disabled messages
- **Error:** `403 Forbidden` with specific user names

### 3. Sending Messages
- **Route:** `POST /api/messages`
- **Protection:** Prevents sending messages to users who have disabled messages
- **Error:** `403 Forbidden` with specific user names

## Error Responses

When privacy settings prevent an action, the API returns:

```json
{
  "message": "Cannot send messages to: John Doe, Jane Smith. They have disabled message receiving."
}
```

## Frontend Integration

### 1. User Settings Page

The frontend should provide a toggle for users to control their message privacy:

```javascript
// Example privacy settings form
const privacySettings = {
  allowMessages: true,  // Toggle for message receiving
  profileVisibility: 'public',
  showEmail: false,
  showPhone: false
};
```

### 2. Error Handling

Handle privacy-related errors gracefully:

```javascript
// Example error handling
try {
  const response = await fetch('/api/chats', {
    method: 'POST',
    body: JSON.stringify(chatData)
  });
  
  if (response.status === 403) {
    const error = await response.json();
    // Show user-friendly error message
    showError(error.message);
  }
} catch (error) {
  console.error('Chat creation failed:', error);
}
```

### 3. User Feedback

Provide clear feedback when actions are blocked:

```javascript
// Example user notification
const showPrivacyError = (message) => {
  // Show toast or modal with privacy restriction message
  toast.error(message, {
    duration: 5000,
    action: {
      label: 'Learn More',
      onClick: () => navigate('/privacy-settings')
    }
  });
};
```

## Testing Scenarios

### 1. User Disables Messages
1. User A sets `allowMessages: false`
2. User B tries to create direct chat with User A
3. **Expected:** 403 error with message about User A disabling messages

### 2. Group Chat Protection
1. User A sets `allowMessages: false`
2. User B tries to add User A to a group chat
3. **Expected:** 403 error with message about User A disabling messages

### 3. Message Sending Protection
1. User A sets `allowMessages: false`
2. User B tries to send message in existing chat with User A
3. **Expected:** 403 error with message about User A disabling messages

### 4. User Re-enables Messages
1. User A sets `allowMessages: true`
2. User B can now create chats and send messages to User A
3. **Expected:** Successful chat creation and message sending

## Security Considerations

1. **Server-Side Validation:** All privacy checks happen on the server
2. **No Client Bypass:** Frontend cannot bypass privacy restrictions
3. **Consistent Enforcement:** All messaging endpoints enforce the same rules
4. **Clear Error Messages:** Users understand why actions are blocked

## Performance Considerations

1. **Database Queries:** Privacy checks require additional user lookups
2. **Caching:** Consider caching user privacy settings for frequently accessed users
3. **Batch Operations:** Helper function handles multiple users efficiently

## Future Enhancements

1. **Granular Control:** Allow specific users to message even when disabled
2. **Temporary Override:** Allow temporary message receiving for specific time periods
3. **Notification Preferences:** Separate message receiving from notification preferences
4. **Admin Override:** Allow administrators to send important messages

## Troubleshooting

### Common Issues

1. **Messages Still Being Received**
   - Check if the user's privacy settings are properly saved
   - Verify the `allowMessages` field is `false` in the database
   - Ensure all messaging endpoints are using the privacy check

2. **False Positives**
   - Check if the user's privacy settings are properly loaded
   - Verify the helper function is working correctly
   - Check for any caching issues

3. **Performance Issues**
   - Monitor database queries for privacy checks
   - Consider implementing caching for frequently accessed users
   - Optimize the helper function for batch operations

### Debug Steps

1. **Check User Privacy Settings:**
   ```javascript
   const user = await User.findById(userId);
   console.log('User privacy settings:', user.privacy);
   ```

2. **Test Privacy Check Function:**
   ```javascript
   try {
     await checkUsersAllowMessages([userId]);
     console.log('User allows messages');
   } catch (error) {
     console.log('Privacy check failed:', error.message);
   }
   ```

3. **Monitor API Responses:**
   - Check for 403 errors in API logs
   - Verify error messages contain correct user names
   - Ensure proper error handling in frontend 