# Google Login Backend Implementation Guide

## Overview

This document provides a comprehensive guide for implementing Google OAuth login functionality in the StudentMate backend. The implementation uses Passport.js with Google OAuth 2.0 strategy and JWT tokens for authentication.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Implementation](#backend-implementation)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Dependencies

The following packages are already installed in the project:

```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "jsonwebtoken": "^9.0.2",
  "express-session": "^1.18.2"
}
```

### Google OAuth Setup

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:2000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`

2. **Get Credentials:**
   - Copy the Client ID and Client Secret
   - These will be used in environment variables

## Environment Setup

### Required Environment Variables

Add the following variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRETE=your-google-client-secret
CALLBACK_URL=http://localhost:2000/api/auth/google/callback

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

## Backend Implementation

### 1. Passport Configuration (`src/config/passport.js`)

The Google OAuth strategy is already configured with the following features:

- **User Lookup:** Checks for existing users by Google ID or email
- **Account Linking:** Links Google accounts to existing email-based accounts
- **Auto-verification:** Google emails are automatically verified
- **Profile Data:** Extracts first name, last name, email, and profile picture (with automatic resolution optimization)
- **Welcome Emails:** Sends welcome emails to new Google users and newly linked accounts

```javascript
// Key features of the implementation:
// - Checks for existing users by googleId
// - Links accounts if email already exists
// - Creates new users with Google profile data
// - Sets emailVerified to true for Google users
// - Updates lastLogin timestamp
// - Automatically saves Google profile picture as avatar
// - Optimizes image resolution (s400-c instead of s96-c)
// - Updates avatar for existing users if they don't have one
// - Extracts and stores first name and last name from Google profile
// - Updates missing name fields for existing users
// - Sends welcome emails to new Google users
// - Sends welcome emails when linking existing accounts with Google
```

### 2. User Model Updates (`src/models/user.model.js`)

The User model includes Google OAuth fields and conditional validation:

```javascript
// Google OAuth fields
googleId: {
  type: String,
  unique: true,
  sparse: true
},
googleEmail: {
  type: String,
  unique: true,
  sparse: true
},
authProvider: {
  type: String,
  enum: ['local', 'google'],
  default: 'local'
}

// Conditional validation for phone, password, and lastName
phone: {
  type: String,
  required: function() {
    return this.authProvider === 'local';
  },
  trim: true
},
password: {
  type: String,
  required: function() {
    return this.authProvider === 'local';
  }
},
lastName: {
  type: String,
  required: function() {
    return this.authProvider === 'local';
  },
  trim: true
}
```

**Note:** The `phone`, `password`, and `lastName` fields are only required for local authentication. Google OAuth users don't need these fields as they authenticate through Google. If Google doesn't provide a last name, a default value will be used.

### Welcome Email Feature

The Google OAuth implementation automatically sends welcome emails in two scenarios:

1. **New Google Users:** When a user signs up for the first time using Google OAuth
2. **Account Linking:** When an existing email user links their account with Google for the first time

The welcome email includes:
- Personalized greeting with the user's name
- Welcome message and platform introduction
- Next steps for getting started
- Contact information for support

**Email Configuration:** Ensure your email service is properly configured in the `.env` file:
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 3. Authentication Routes (`src/routes/auth.routes.js`)

Three main endpoints are implemented for Google OAuth:

#### a. Initiate Google OAuth Login
```javascript
// GET /api/auth/google
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});
```

#### b. Google OAuth Callback
```javascript
// GET /api/auth/google/callback
router.get('/google/callback', passport.authenticate('google', { 
  failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  session: false 
}), async (req, res) => {
  // Generates JWT token and sets cookie
  // Redirects to frontend with success
});
```

#### c. Google OAuth Status Check
```javascript
// GET /api/auth/google/status
router.get('/google/status', (req, res) => {
  // Returns configuration status
});
```

## API Endpoints

### 1. Initiate Google Login
```http
GET /api/auth/google
```

**Purpose:** Redirects user to Google OAuth consent screen

**Response:** Redirects to Google OAuth URL

**Frontend Usage:**
```javascript
// Redirect user to Google OAuth
window.location.href = 'http://localhost:2000/api/auth/google';
```

### 2. Manual Registration (Updated)
```http
POST /api/auth/register
```

**Purpose:** Register new user with email/password

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response:**
```json
{
  "message": "Registration initiated. Please check your email for verification code.",
  "userId": "user_id_here",
  "email": "john@example.com"
}
```

**Note:** All fields including `lastName` are now required for manual registration.

### 3. Manual Login (Updated)
```http
POST /api/auth/login
```

**Purpose:** Login with email and password

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful.",
  "user": {
    "id": "user_id_here",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "emailVerified": true
  }
}
```

### 4. Google OAuth Callback
```http
GET /api/auth/google/callback
```

**Purpose:** Handles Google OAuth callback and user authentication

**Query Parameters:**
- `code` (provided by Google)
- `state` (provided by Google)

**Response:** 
- **Success:** Redirects to frontend with JWT cookie set
- **Failure:** Redirects to frontend with error parameter

**Redirect URLs:**
- Success: `${FRONTEND_URL}?login=success&provider=google`
- Failure: `${FRONTEND_URL}/login?error=google_auth_failed`

### 5. Check Google OAuth Status
```http
GET /api/auth/google/status
```

**Purpose:** Check if Google OAuth is properly configured

**Response:**
```json
{
  "googleEnabled": true,
  "clientId": "configured",
  "callbackUrl": "http://localhost:2000/api/auth/google/callback",
  "availableStrategies": ["google"],
  "passportInitialized": true
}
```

## Frontend Integration

### 1. Basic Google Login Button

```javascript
// React component example
const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = 'http://localhost:2000/api/auth/google';
  };

  return (
    <button onClick={handleGoogleLogin}>
      Login with Google
    </button>
  );
};
```

### 2. Handle OAuth Callback

```javascript
// Check for OAuth callback parameters on app load
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const loginStatus = urlParams.get('login');
  const provider = urlParams.get('provider');
  const error = urlParams.get('error');

  if (loginStatus === 'success' && provider === 'google') {
    // Google login successful
    // JWT token is automatically set as httpOnly cookie
    // Redirect to dashboard or home page
    navigate('/dashboard');
  } else if (error === 'google_auth_failed') {
    // Handle Google login failure
    setError('Google login failed. Please try again.');
  }
}, []);
```

### 3. Check Authentication Status

```javascript
// Check if user is authenticated (JWT cookie is set)
const checkAuthStatus = async () => {
  try {
    const response = await fetch('http://localhost:2000/api/auth/me', {
      credentials: 'include' // Include cookies
    });
    
    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
      setIsAuthenticated(true);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
};
```

### 4. Logout

```javascript
const handleLogout = async () => {
  try {
    await fetch('http://localhost:2000/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    // Clear local state
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

## Testing

### 1. Test Google OAuth Configuration

```bash
# Check if Google OAuth is properly configured
curl http://localhost:2000/api/auth/google/status
```

Expected response:
```json
{
  "googleEnabled": true,
  "clientId": "configured",
  "callbackUrl": "http://localhost:2000/api/auth/google/callback",
  "availableStrategies": ["google"],
  "passportInitialized": true
}
```

### 2. Test Google Login Flow

1. Start the backend server
2. Navigate to `http://localhost:2000/api/auth/google`
3. Complete Google OAuth flow
4. Verify redirect to frontend with success parameter
5. Check that JWT cookie is set

### 3. Test Error Handling

1. Test with invalid Google credentials
2. Test with disabled Google OAuth
3. Verify proper error redirects

## Troubleshooting

### Common Issues

#### 1. "Google OAuth credentials not found"
**Cause:** Missing environment variables
**Solution:** Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRETE` are set

#### 2. "Invalid redirect URI"
**Cause:** Mismatch between configured and actual callback URL
**Solution:** Update Google OAuth credentials with correct callback URL

#### 3. "Passport strategy not found"
**Cause:** Passport not properly initialized
**Solution:** Ensure `initializeGoogleStrategy()` is called in server startup

#### 4. "JWT token not set"
**Cause:** Cookie settings issue
**Solution:** Check cookie settings (httpOnly, secure, sameSite)

#### 5. "User validation failed: password/phone required"
**Cause:** User model validation requiring fields that Google OAuth doesn't provide
**Solution:** Ensure `authProvider` is set to 'google' and conditional validation is in place

#### 6. "Error 400: redirect_uri_mismatch"
**Cause:** Google OAuth redirect URI doesn't match the configured callback URL
**Solution:** 
1. Check your Google Cloud Console OAuth credentials
2. Ensure the authorized redirect URI is exactly: `http://localhost:2000/api/auth/google/callback`
3. Verify your `.env` file has: `CALLBACK_URL=http://localhost:2000/api/auth/google/callback`
4. For production, use: `https://yourdomain.com/api/auth/google/callback`

#### 7. "Google profile image not being stored"
**Cause:** Google profile picture not being properly extracted or saved
**Solution:** 
1. Check server logs for "Google Profile Data" debug output
2. Verify Google OAuth scope includes 'profile' (should be automatic)
3. Ensure user has a profile picture on their Google account
4. Check if avatar field is being saved in database
5. Verify the avatar URL is accessible (not blocked by CORS)

#### 8. "Last name missing from Google OAuth users"
**Cause:** Google profile doesn't provide familyName or displayName parsing fails
**Solution:** 
1. Check server logs for "Extracted name components" debug output
2. Verify Google profile has familyName set
3. Check if displayName contains both first and last name
4. Ensure user has completed their Google profile information

### Debug Steps

1. **Check Environment Variables:**
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRETE
   ```

2. **Check Passport Initialization:**
   ```bash
   curl http://localhost:2000/api/auth/google/status
   ```

3. **Check Server Logs:**
   Look for Google OAuth initialization messages in server console

4. **Test Individual Components:**
   - Test Google OAuth credentials manually
   - Test JWT token generation
   - Test cookie setting

### Production Considerations

1. **HTTPS Required:** Google OAuth requires HTTPS in production
2. **Secure Cookies:** Set `secure: true` for production
3. **Domain Configuration:** Update Google OAuth redirect URIs for production domain
4. **Environment Variables:** Use proper secret management in production

## Security Best Practices

1. **Environment Variables:** Never commit OAuth secrets to version control
2. **HTTPS:** Always use HTTPS in production
3. **Cookie Security:** Use httpOnly, secure, and sameSite cookie attributes
4. **Token Expiration:** Set appropriate JWT token expiration times
5. **Error Handling:** Don't expose sensitive information in error messages

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [JWT Documentation](https://jwt.io/)

## Support

For issues or questions regarding this implementation:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify Google OAuth configuration in Google Cloud Console
4. Test with the provided debugging endpoints 