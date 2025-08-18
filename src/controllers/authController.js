import BaseController from './baseController.js';
import AuthService from '../services/authService.js';
import { ResponseService } from '../services/responseService.js';

class AuthController extends BaseController {
  constructor() {
    super();
    this.authService = new AuthService();
  }

  // User registration
  register = this.asyncHandler(async (req, res) => {
    const { firstName, lastName, fullName, email, phone, password, confirmPassword } = req.body;
    
    const result = await this.authService.register({
      firstName, lastName, fullName, email, phone, password, confirmPassword
    });
    
    // Use legacy format for frontend compatibility
    // Ensure top-level userId and email are returned as frontend expects
    ResponseService.legacyRegisterSuccess(
      res,
      { userId: result?.userId, email: result?.email },
      'Registration initiated. Please check your email for verification code.',
      201
    );
  });

  // Check account type before login
  checkAccountType = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const result = await this.authService.checkAccountType(email);
    
    this.sendSuccess(res, result, 'Account type checked successfully.');
  });

  // User login
  login = this.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await this.authService.login(email, password);
    
    // Set JWT cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    
    // Use legacy format for frontend compatibility
    ResponseService.legacyAuthSuccess(res, result.user, result.token, 'Login successful.');
  });

  // User logout
  logout = (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    this.sendSuccess(res, null, 'Logout successful.');
  };

  // Email verification
  verifyEmail = this.asyncHandler(async (req, res) => {
    const { userId, otpCode } = req.body;
    
    const result = await this.authService.verifyEmail(userId, otpCode);
    
    this.sendSuccess(res, result, 'Email verified successfully! Welcome to StudentMate.');
  });

  // Resend verification OTP
  resendVerification = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const result = await this.authService.resendVerification(email);
    
    this.sendSuccess(res, result, 'Verification code resent successfully. Please check your email.');
  });

  // Forgot password
  forgotPassword = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    await this.authService.forgotPassword(email);
    
    this.sendSuccess(res, null, 'Password reset email sent successfully.');
  });

  // Reset password
  resetPassword = this.asyncHandler(async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    
    await this.authService.resetPassword(token, newPassword, confirmPassword);
    
    this.sendSuccess(res, null, 'Password reset successfully.');
  });

  // Google OAuth initiation
  googleAuth = (req, res, next) => {
    // This is handled by Passport middleware
    next();
  };

  // Google OAuth callback
  googleCallback = this.asyncHandler(async (req, res) => {
    const user = req.user;
    
    const result = await this.authService.handleGoogleCallback(user);
    
    // Set JWT token in cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    
    // Redirect to frontend success route
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://newronx.com'}/auth/success?provider=google`;
    res.redirect(redirectUrl);
  });

  // Google OAuth status
  googleStatus = (req, res) => {
    const status = this.authService.getGoogleStatus();
    this.sendSuccess(res, status, 'Google OAuth status retrieved.');
  };
}

export default new AuthController();
