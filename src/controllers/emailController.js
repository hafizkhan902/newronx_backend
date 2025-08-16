import BaseController from './baseController.js';
import { EmailService } from '../services/emailService.js';

class EmailController extends BaseController {
  constructor() {
    super();
    this.emailService = new EmailService();
  }

  // Send email verification OTP
  sendEmailVerificationOTP = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return this.sendBadRequest(res, 'Email is required');
    }

    const result = await this.emailService.sendEmailVerificationOTP(email);
    
    this.sendSuccess(res, result, 'Verification email sent successfully.');
  });

  // Resend email verification OTP
  resendEmailVerificationOTP = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return this.sendBadRequest(res, 'Email is required');
    }

    const result = await this.emailService.resendEmailVerificationOTP(email);
    
    this.sendSuccess(res, result, 'Verification email resent successfully.');
  });

  // Send welcome email
  sendWelcomeEmail = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return this.sendBadRequest(res, 'Email is required');
    }

    const result = await this.emailService.sendWelcomeEmail(email);
    
    this.sendSuccess(res, result, 'Welcome email sent successfully.');
  });

  // Send password reset email
  sendPasswordResetEmail = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return this.sendBadRequest(res, 'Email is required');
    }

    const result = await this.emailService.sendPasswordResetEmail(email);
    
    this.sendSuccess(res, result, 'Password reset email sent successfully.');
  });

  // Send idea collaboration email
  sendIdeaCollaborationEmail = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to send collaboration emails');
    }

    const { recipientEmail, ideaId, message } = req.body;
    
    if (!recipientEmail || !ideaId) {
      return this.sendBadRequest(res, 'Recipient email and idea ID are required');
    }

    const result = await this.emailService.sendIdeaCollaborationEmail(token, recipientEmail, ideaId, message);
    
    this.sendSuccess(res, result, 'Collaboration email sent successfully.');
  });

  // Send connection request email
  sendConnectionRequestEmail = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'Please login to send connection requests');
    }

    const { recipientEmail, message } = req.body;
    
    if (!recipientEmail) {
      return this.sendBadRequest(res, 'Recipient email is required');
    }

    const result = await this.emailService.sendConnectionRequestEmail(token, recipientEmail, message);
    
    this.sendSuccess(res, result, 'Connection request email sent successfully.');
  });

  // Send test email
  sendTestEmail = this.asyncHandler(async (req, res) => {
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      return this.sendBadRequest(res, 'Email, subject, and message are required');
    }

    const result = await this.emailService.sendTestEmail(email, subject, message);
    
    this.sendSuccess(res, result, 'Test email sent successfully.');
  });

  // Get email templates
  getEmailTemplates = this.asyncHandler(async (req, res) => {
    const templates = await this.emailService.getEmailTemplates();
    
    this.sendSuccess(res, templates, 'Email templates retrieved successfully.');
  });

  // Update email template
  updateEmailTemplate = this.asyncHandler(async (req, res) => {
    const { templateName } = req.params;
    const { subject, html, text } = req.body;
    
    if (!subject || !html) {
      return this.sendBadRequest(res, 'Subject and HTML content are required');
    }

    const result = await this.emailService.updateEmailTemplate(templateName, { subject, html, text });
    
    this.sendSuccess(res, result, 'Email template updated successfully.');
  });

  // Get email statistics
  getEmailStats = this.asyncHandler(async (req, res) => {
    const stats = await this.emailService.getEmailStats();
    
    this.sendSuccess(res, stats, 'Email statistics retrieved successfully.');
  });

  // Get email logs
  getEmailLogs = this.asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query;
    
    const result = await this.emailService.getEmailLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    });
    
    this.sendSuccess(res, result, 'Email logs retrieved successfully.');
  });
}

export default new EmailController();
