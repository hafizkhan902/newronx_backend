import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure email transporter based on environment
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    // Debug: Log the configuration (without password)
    console.log('Email Configuration:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
      provider: process.env.EMAIL_PROVIDER
    });

    // For Gmail, you might need to use an App Password
    if (process.env.EMAIL_PROVIDER === 'gmail') {
      emailConfig.service = 'gmail';
    }

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const { firstName, email, fullName } = user;
    
    const mailOptions = {
      from: `"StudentMate Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to StudentMate! 🎉',
      html: this.getWelcomeEmailTemplate(firstName, fullName)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"StudentMate Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - StudentMate',
      html: this.getPasswordResetTemplate(resetUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification email
  async sendNotificationEmail(user, subject, content) {
    const mailOptions = {
      from: `"StudentMate Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: subject,
      html: this.getNotificationTemplate(user.firstName, content)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Notification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send notification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification OTP
  async sendEmailVerificationOTP(user, otpCode) {
    const mailOptions = {
      from: `"StudentMate Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email - StudentMate',
      html: this.getEmailVerificationTemplate(user.firstName, otpCode)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email verification OTP sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email verification OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Resend email verification OTP
  async resendEmailVerificationOTP(user, otpCode) {
    const mailOptions = {
      from: `"StudentMate Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Email Verification Code - StudentMate',
      html: this.getEmailVerificationTemplate(user.firstName, otpCode)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email verification OTP resent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to resend email verification OTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Welcome email template
  getWelcomeEmailTemplate(firstName, fullName) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to StudentMate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
          }
          .welcome-text {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .content {
            margin-bottom: 30px;
          }
          .feature-list {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .feature-item {
            margin: 10px 0;
            padding-left: 20px;
            position: relative;
          }
          .feature-item:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            position: absolute;
            left: 0;
          }
          .cta-button {
            display: inline-block;
            background-color: #3B82F6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-links a {
            color: #3B82F6;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 StudentMate</div>
            <div class="welcome-text">Welcome, ${firstName}! 👋</div>
          </div>
          
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>Welcome to StudentMate! We're excited to have you join our community of students, mentors, and innovators.</p>
            
            <p>StudentMate is your platform for:</p>
            
            <div class="feature-list">
              <div class="feature-item">Sharing and collaborating on innovative ideas</div>
              <div class="feature-item">Connecting with mentors and investors</div>
              <div class="feature-item">Building meaningful professional relationships</div>
              <div class="feature-item">Accessing resources and opportunities</div>
              <div class="feature-item">Growing your entrepreneurial skills</div>
            </div>
            
            <p>To get started:</p>
            <ol>
              <li>Complete your profile to showcase your skills and interests</li>
              <li>Explore ideas shared by other students</li>
              <li>Connect with mentors and potential collaborators</li>
              <li>Share your own innovative ideas</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">Get Started</a>
            </div>
          </div>
          
          <div class="footer">
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <div class="social-links">
              <a href="#">Website</a> |
              <a href="#">Support</a> |
              <a href="#">Privacy Policy</a>
            </div>
            
            <p>© 2024 StudentMate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Password reset email template
  getPasswordResetTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - StudentMate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
          }
          .reset-button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 StudentMate</div>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>You requested a password reset for your StudentMate account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="reset-button">Reset Password</a>
            </div>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 StudentMate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Notification email template
  getNotificationTemplate(firstName, content) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification - StudentMate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 StudentMate</div>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            ${content}
          </div>
          
          <div class="footer">
            <p>© 2024 StudentMate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email verification template
  getEmailVerificationTemplate(firstName, otpCode) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - StudentMate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
          }
          .otp-container {
            background-color: #f8fafc;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #3B82F6;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #92400e;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎓 StudentMate</div>
            <h2>Email Verification</h2>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you for registering with StudentMate! To complete your account setup, please verify your email address.</p>
            
            <p>Your verification code is:</p>
            
            <div class="otp-container">
              <div class="otp-code">${otpCode}</div>
            </div>
            
            <p>Please enter this code in the verification form to complete your registration.</p>
            
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This code will expire in 10 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 StudentMate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

// For clustering: ensure each worker has its own instance
if (process.env.NODE_ENV === 'production') {
  console.log(`Email service initialized on worker ${process.pid}`);
}

export default emailService; 