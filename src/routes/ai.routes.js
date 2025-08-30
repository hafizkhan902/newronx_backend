import express from 'express';
import rateLimit from 'express-rate-limit';
import aiService from '../services/aiService.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../services/loggerService.js';
import ResponseService from '../services/responseService.js';

const router = express.Router();

// Rate limiting specifically for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 AI requests per windowMs
  message: {
    success: false,
    message: 'Too many AI analysis requests, please try again later. Limit: 10 requests per 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + user ID if authenticated
    return req.user ? `${req.ip}_${req.user.userId}` : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for service status endpoint
    return req.path === '/status';
  }
});

/**
 * @route POST /api/ai/analyze-roles
 * @desc Analyze idea and suggest team roles using AI
 * @access Private
 */
router.post('/analyze-roles', [
  aiRateLimit,
  authenticateToken
], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { title, description, targetAudience, problemStatement, uniqueValue, neededRoles } = req.body;
    const userId = req.user.userId;
    
    // Validation - at least title or description required
    if (!title?.trim() && !description?.trim()) {
      return ResponseService.badRequest(res, 'Title or description is required for analysis');
    }

    // Prepare idea data for analysis
    const ideaData = {
      title: title?.trim() || '',
      description: description?.trim() || '',
      targetAudience: targetAudience?.trim() || '',
      problemStatement: problemStatement?.trim() || '',
      uniqueValue: uniqueValue?.trim() || '',
      neededRoles: neededRoles?.trim() || ''
    };

    logger.info('AI role analysis requested', {
      userId,
      ideaTitle: ideaData.title.substring(0, 50) + '...',
      hasDescription: !!ideaData.description,
      ip: req.ip
    });

    // Perform AI analysis
    const result = await aiService.analyzeRolesForIdea(ideaData);
    const processingTime = Date.now() - startTime;

    // Log usage for analytics
    logger.info('AI role analysis completed', {
      userId,
      success: result.success,
      rolesCount: result.roles.length,
      fallback: result.fallback,
      processingTime,
      totalTime: processingTime
    });

    // Return success response
    return ResponseService.success(res, {
      roles: result.roles,
      aiGenerated: result.success,
      fallback: result.fallback || false,
      processingTime,
      metadata: {
        rolesCount: result.roles.length,
        analysisMethod: result.success ? 'ai' : 'fallback'
      }
    }, result.message || (result.success ? 'Roles analyzed successfully with AI' : 'Roles generated with smart fallback logic'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('AI role analysis endpoint error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      processingTime,
      ip: req.ip
    });

    return ResponseService.internalError(res, 'Failed to analyze roles');
  }
});

/**
 * @route GET /api/ai/status
 * @desc Get AI service status
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = aiService.getServiceStatus();
    
    return ResponseService.success(res, status, 'AI service status retrieved successfully');
  } catch (error) {
    logger.error('AI status endpoint error:', error);
    
    return ResponseService.internalError(res, 'Failed to get AI service status');
  }
});

/**
 * @route POST /api/ai/test
 * @desc Test AI service connectivity
 * @access Private (Admin only)
 */
router.post('/test', [
  authenticateToken,
  // Add admin check if you have role-based access
  // requireRole(['admin'])
], async (req, res) => {
  try {
    const testResult = await aiService.testService();
    
    logger.info('AI service test performed', {
      userId: req.user.userId,
      success: testResult.success,
      ip: req.ip
    });
    
    if (testResult.success) {
      return ResponseService.success(res, testResult, 'AI service test completed successfully');
    } else {
      return ResponseService.serviceUnavailable(res, testResult.message);
    }
  } catch (error) {
    logger.error('AI test endpoint error:', error);
    
    return ResponseService.internalError(res, 'AI service test failed');
  }
});

/**
 * @route GET /api/ai/usage
 * @desc Get AI usage statistics (if implemented)
 * @access Private
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    // This could be implemented to show usage statistics
    // For now, return basic info
    const usage = {
      userRequests: 0, // Could track in database
      totalRequests: 0,
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10
      },
      features: {
        roleAnalysis: true,
        serviceTesting: true
      }
    };
    
    return ResponseService.success(res, usage, 'AI usage statistics retrieved successfully');
  } catch (error) {
    logger.error('AI usage endpoint error:', error);
    
    return ResponseService.internalError(res, 'Failed to get AI usage statistics');
  }
});

export default router;