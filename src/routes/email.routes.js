import { Router } from 'express';
import emailController from '../controllers/emailController.js';

const router = Router();

// Email verification
router.post('/verification/send', emailController.sendEmailVerificationOTP);
router.post('/verification/resend', emailController.resendEmailVerificationOTP);

// Welcome and password reset
router.post('/welcome', emailController.sendWelcomeEmail);
router.post('/password-reset', emailController.sendPasswordResetEmail);

// Collaboration and connection
router.post('/idea-collaboration', emailController.sendIdeaCollaborationEmail);
router.post('/connection-request', emailController.sendConnectionRequestEmail);

// Testing and administration
router.post('/test', emailController.sendTestEmail);
router.get('/templates', emailController.getEmailTemplates);
router.put('/templates/:templateName', emailController.updateEmailTemplate);
router.get('/stats', emailController.getEmailStats);
router.get('/logs', emailController.getEmailLogs);

export default router; 