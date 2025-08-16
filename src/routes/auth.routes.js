import { Router } from 'express';
import passport from 'passport';
import authController from '../controllers/authController.js';
import { validateBody } from '../middleware/validation.js';
import { 
  registerSchema, 
  loginSchema, 
  emailVerificationSchema, 
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema 
} from '../validators/authValidators.js';

const router = Router();

// POST /api/auth/register - Step 1: Create unverified user and send OTP
router.post('/register', validateBody(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/verify-email - Step 2: Verify email with OTP
router.post('/verify-email', validateBody(emailVerificationSchema), authController.verifyEmail);

// POST /api/auth/resend-verification - Resend verification OTP
router.post('/resend-verification', validateBody(resendVerificationSchema), authController.resendVerification);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Google OAuth Routes

// GET /api/auth/google - Initiate Google OAuth login
router.get('/google', authController.googleAuth, passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { 
  failureRedirect: `${process.env.FRONTEND_URL || 'https://newronx.com'}/login?error=google_auth_failed`,
  session: false 
}), authController.googleCallback);

// GET /api/auth/google/status - Check Google OAuth status
router.get('/google/status', authController.googleStatus);

export default router; 