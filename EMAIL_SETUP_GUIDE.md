# Email Service Setup Guide for StudentMate

This guide will help you set up the email service for StudentMate backend to send welcome emails and other notifications.

## Features Implemented

✅ **Welcome Emails** - Automatically sent when new users register  
✅ **Password Reset Emails** - For forgotten password functionality  
✅ **Custom Notification Emails** - For general notifications  
✅ **Beautiful HTML Templates** - Professional-looking email designs  
✅ **Multiple Email Provider Support** - Gmail, Outlook, custom SMTP  
✅ **Error Handling** - Graceful fallbacks if email fails  

## Environment Variables Required

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
FRONTEND_URL=http://localhost:3000

# JWT Secret (for password reset tokens)
JWT_SECRET=your-jwt-secret-key
```

## Email Provider Setup

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS`

```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

### Option 2: Outlook/Hotmail

```env
EMAIL_PROVIDER=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Option 3: Custom SMTP Server

```env
EMAIL_PROVIDER=custom
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-password
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Option 4: SendGrid (Production Recommended)

```env
EMAIL_PROVIDER=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
```

## Testing the Email Service

### 1. Test Email Connection

```bash
GET /api/email/test
```

### 2. Test Welcome Email

```bash
POST /api/email/test-welcome
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 3. Test Custom Notification

```bash
POST /api/email/send-notification
Content-Type: application/json

{
  "userId": "user-id-here",
  "subject": "Test Notification",
  "content": "<p>This is a test notification email.</p>"
}
```

## API Endpoints

### Authentication Routes (Enhanced)

- `POST /api/auth/register` - Now sends welcome email automatically
- `POST /api/auth/forgot-password` - Sends password reset email
- `POST /api/auth/reset-password` - Resets password with token

### Email Routes

- `GET /api/email/test` - Test email service connection
- `POST /api/email/test-welcome` - Send test welcome email
- `POST /api/email/send-notification` - Send custom notification

## Email Templates

The service includes three beautiful HTML email templates:

1. **Welcome Email** - Personalized welcome with feature highlights
2. **Password Reset** - Secure password reset with token
3. **Notification** - Custom notification template

All templates are responsive and include:
- Professional styling
- StudentMate branding
- Call-to-action buttons
- Social links
- Mobile-friendly design

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check your email credentials
   - For Gmail, ensure you're using an App Password, not your regular password
   - Enable "Less secure app access" if using regular password (not recommended)

2. **"Connection timeout"**
   - Check your internet connection
   - Verify SMTP host and port settings
   - Check firewall settings

3. **"Email not sending"**
   - Check console logs for detailed error messages
   - Verify all environment variables are set
   - Test with the `/api/email/test` endpoint

### Debug Mode

To enable detailed logging, add to your `.env`:

```env
DEBUG_EMAIL=true
```

## Production Considerations

1. **Use a Professional Email Service**:
   - SendGrid, Mailgun, or AWS SES for production
   - Better deliverability and monitoring

2. **Rate Limiting**:
   - Implement rate limiting for email endpoints
   - Prevent spam and abuse

3. **Email Queue**:
   - Consider using a queue system (Redis/Bull) for high volume
   - Prevents blocking user registration

4. **Monitoring**:
   - Track email delivery rates
   - Monitor bounce rates
   - Set up alerts for failures

## Security Best Practices

1. **Environment Variables**: Never commit email credentials to version control
2. **App Passwords**: Use app-specific passwords instead of main passwords
3. **Rate Limiting**: Implement rate limiting on email endpoints
4. **Token Expiration**: Password reset tokens expire after 1 hour
5. **Input Validation**: All email inputs are validated and sanitized

## Example Usage in Frontend

```javascript
// Register user (welcome email sent automatically)
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Request password reset
const requestPasswordReset = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// Reset password with token
const resetPassword = async (token, newPassword, confirmPassword) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword })
  });
  return response.json();
};
```

## Support

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify your email provider settings
3. Test with the provided test endpoints
4. Ensure all environment variables are correctly set

The email service is designed to be robust and will not break user registration if email sending fails. 