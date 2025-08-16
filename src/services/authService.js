import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import emailService from './emailService.js';
import { generateOTP, isOTPExpired, isOTPAttemptsExceeded, getOTPExpirationTime, validateOTPFormat } from '../utils/otpUtils.js';

class AuthService {
  // User registration
  async register(userData) {
    const { firstName, lastName, fullName, email, phone, password, confirmPassword } = userData;

    // Basic validation
    if (!firstName || !lastName || !fullName || !email || !phone || !password || !confirmPassword) {
      throw new Error('All fields are required.');
    }
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new Error('Email already in use.');
      } else {
        throw new Error('Email already registered but not verified. Please verify your email or use a different email.');
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
      if (!emailResult.success) {
        // If email fails, delete the user and throw error
        await User.findByIdAndDelete(user._id);
        throw new Error('Failed to send verification email. Please try again.');
      }
    } catch (emailError) {
      // If email fails, delete the user and throw error
      await User.findByIdAndDelete(user._id);
      throw new Error('Failed to send verification email. Please try again.');
    }

    return {
      userId: user._id,
      email: user.email
    };
  }

  // User login
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in.');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  }

  // Email verification
  async verifyEmail(userId, otpCode) {
    if (!userId || !otpCode) {
      throw new Error('User ID and OTP code are required.');
    }

    if (!validateOTPFormat(otpCode)) {
      throw new Error('Invalid OTP format. Please enter a 6-digit code.');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new Error('Email is already verified.');
    }

    // Check if OTP is expired
    if (isOTPExpired(user.emailVerificationOTP.expiresAt)) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Check if attempts exceeded
    if (isOTPAttemptsExceeded(user.emailVerificationOTP.attempts)) {
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (user.emailVerificationOTP.code !== otpCode) {
      // Increment attempts
      user.emailVerificationOTP.attempts += 1;
      await user.save();
      
      throw new Error(`Invalid OTP code. Please try again. Remaining attempts: ${5 - user.emailVerificationOTP.attempts}`);
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

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified
    };
  }

  // Resend verification OTP
  async resendVerification(email) {
    if (!email) {
      throw new Error('Email is required.');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found.');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new Error('Email is already verified.');
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
      if (!emailResult.success) {
        throw new Error('Failed to resend verification email. Please try again.');
      }
    } catch (emailError) {
      throw new Error('Failed to resend verification email. Please try again.');
    }

    return {
      userId: user._id,
      email: user.email
    };
  }

  // Forgot password
  async forgotPassword(email) {
    if (!email) {
      throw new Error('Email is required.');
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found.');
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(email, resetToken);
    
    if (!emailResult.success) {
      throw new Error('Failed to send password reset email.');
    }
  }

  // Reset password
  async resetPassword(token, newPassword, confirmPassword) {
    if (!token || !newPassword || !confirmPassword) {
      throw new Error('All fields are required.');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found.');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      user.password = hashedPassword;
      await user.save();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new Error('Invalid or expired token.');
      }
      throw error;
    }
  }

  // Handle Google OAuth callback
  async handleGoogleCallback(user) {
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return { token };
  }

  // Get Google OAuth status
  getGoogleStatus() {
    return {
      googleEnabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not_configured',
      callbackUrl: process.env.CALLBACK_URL || 'http://localhost:2000/api/auth/google/callback',
      availableStrategies: ['session', 'google'],
      passportInitialized: true
    };
  }
}

export default AuthService;
