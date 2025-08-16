import { Router } from 'express';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import emailService from '../services/emailService.js';
import { generateOTP, isOTPExpired, isOTPAttemptsExceeded, getOTPExpirationTime, validateOTPFormat } from '../utils/otpUtils.js';

const router = Router();

// POST /api/auth/register - Step 1: Create unverified user and send OTP
router.post('/register', async (req, res) => {
  const { firstName, lastName, fullName, email, phone, password, confirmPassword } = req.body;

  // Basic validation
  if (!firstName || !lastName || !fullName || !email || !phone || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(409).json({ message: 'Email already in use.' });
      } else {
        // If user exists but not verified, we can resend OTP
        return res.status(409).json({ 
          message: 'Email already registered but not verified. Please verify your email or use a different email.',
          needsVerification: true 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiration = getOTPExpirationTime();

    // Create unverified user
    const user = new User({
      firstName,
      lastName,
      fullName,
      email,
      phone,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationOTP: {
        code: otpCode,
        expiresAt: otpExpiration,
        attempts: 0
      }
    });
    await user.save();

    // Send email verification OTP
    try {
      const emailResult = await emailService.sendEmailVerificationOTP(user, otpCode);
      if (emailResult.success) {
        res.status(201).json({ 
          message: 'Registration initiated. Please check your email for verification code.',
          userId: user._id,
          email: user.email
        });
      } else {
        // If email fails, delete the user and return error
        await User.findByIdAndDelete(user._id);
        res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
      }
    } catch (emailError) {
      // If email fails, delete the user and return error
      await User.findByIdAndDelete(user._id);
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({ 
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        userId: user._id,
        email: user.email
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set JWT as httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.status(200).json({ 
      message: 'Login successful.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({ message: 'Logout successful.' });
});

// POST /api/auth/verify-email - Step 2: Verify email with OTP
router.post('/verify-email', async (req, res) => {
  const { userId, otpCode } = req.body;

  if (!userId || !otpCode) {
    return res.status(400).json({ message: 'User ID and OTP code are required.' });
  }

  if (!validateOTPFormat(otpCode)) {
    return res.status(400).json({ message: 'Invalid OTP format. Please enter a 6-digit code.' });
  }

  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.emailVerificationOTP.expiresAt)) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check if attempts exceeded
    if (isOTPAttemptsExceeded(user.emailVerificationOTP.attempts)) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (user.emailVerificationOTP.code !== otpCode) {
      // Increment attempts
      user.emailVerificationOTP.attempts += 1;
      await user.save();
      
      return res.status(400).json({ 
        message: 'Invalid OTP code. Please try again.',
        remainingAttempts: 5 - user.emailVerificationOTP.attempts
      });
    }

    // OTP is correct - verify email
    user.emailVerified = true;
    user.emailVerificationOTP = {
      code: null,
      expiresAt: null,
      attempts: 0
    };
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    res.status(200).json({ 
      message: 'Email verified successfully! Welcome to StudentMate.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/auth/resend-verification - Resend verification OTP
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiration = getOTPExpirationTime();

    // Update user with new OTP
    user.emailVerificationOTP = {
      code: otpCode,
      expiresAt: otpExpiration,
      attempts: 0
    };
    await user.save();

    // Send new verification OTP
    try {
      const emailResult = await emailService.resendEmailVerificationOTP(user, otpCode);
      if (emailResult.success) {
        res.status(200).json({ 
          message: 'Verification code resent successfully. Please check your email.',
          userId: user._id,
          email: user.email
        });
      } else {
        res.status(500).json({ message: 'Failed to resend verification email. Please try again.' });
      }
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({ message: 'Failed to resend verification email. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
    
    if (emailResult.success) {
      res.status(200).json({ message: 'Password reset email sent successfully.' });
    } else {
      res.status(500).json({ message: 'Failed to send password reset email.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// Note: Make sure to set JWT_SECRET in your .env file for JWT signing.

// Google OAuth Routes

// GET /api/auth/google - Initiate Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('Google OAuth route accessed');
  console.log('Available strategies:', Object.keys(passport._strategies || {}));
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { 
  failureRedirect: `${process.env.FRONTEND_URL || 'https://newronx.com'}/login?error=google_auth_failed`,
  session: false 
}), async (req, res) => {
  try {
    const user = req.user;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set JWT token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Redirect to frontend success route (configured via FRONTEND_URL)
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://newronx.com'}/auth/success?provider=google`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://newronx.com'}/login?error=google_auth_failed`;
    res.redirect(redirectUrl);
  }
});

// GET /api/auth/google/status - Check Google OAuth status
router.get('/google/status', (req, res) => {
  res.json({
    googleEnabled: true,
    clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not_configured',
    callbackUrl: process.env.CALLBACK_URL || 'http://localhost:2000/api/auth/google/callback',
    availableStrategies: Object.keys(passport._strategies || {}),
    passportInitialized: !!passport._strategies
  });
});

export default router; 