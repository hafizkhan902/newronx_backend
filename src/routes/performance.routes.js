import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  requirePremiumWithTrial, 
  premiumRateLimit, 
  trackPremiumUsage, 
  validateTeamOwnership 
} from '../middleware/premium.js';
import performanceController from '../controllers/performanceController.js';
import { ResponseService } from '../services/responseService.js';

const router = express.Router();

// Apply authentication to all performance routes
router.use(authenticateToken);

// Apply premium access control to all routes
router.use(requirePremiumWithTrial);

// Apply rate limiting for performance endpoints
router.use(premiumRateLimit({
  maxRequests: 50,        // 50 requests per hour for premium users
  freeUserLimit: 5,       // 5 requests per hour for trial users
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Performance analytics rate limit exceeded'
}));

// Team ownership validation middleware for idea-specific routes
const validateIdeaOwnership = validateTeamOwnership;

// ===== TEAM PERFORMANCE ENDPOINTS =====

/**
 * @route   GET /api/performance/:ideaId/dashboard
 * @desc    Get comprehensive team performance dashboard
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @query   timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 * @query   includeMembers - 'true'/'false' (default: 'true')
 * @query   includeInsights - 'true'/'false' (default: 'true')
 */
router.get('/:ideaId/dashboard', 
  validateIdeaOwnership,
  trackPremiumUsage('performance_dashboard'),
  performanceController.getDashboard
);

/**
 * @route   POST /api/performance/:ideaId/recalculate
 * @desc    Trigger team performance recalculation
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @body    force - boolean (optional, default: false)
 * @body    timeRange - string (optional, default: '30d')
 */
router.post('/:ideaId/recalculate',
  validateIdeaOwnership,
  trackPremiumUsage('performance_recalculation'),
  performanceController.recalculatePerformance
);

/**
 * @route   GET /api/performance/:ideaId/stats
 * @desc    Get performance statistics and summary
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @query   timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 */
router.get('/:ideaId/stats',
  validateIdeaOwnership,
  trackPremiumUsage('performance_stats'),
  performanceController.getPerformanceStats
);

/**
 * @route   GET /api/performance/:ideaId/export
 * @desc    Export team performance data
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @query   format - 'json'/'csv' (default: 'json')
 * @query   timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 * @query   includeHistory - 'true'/'false' (default: 'false')
 */
router.get('/:ideaId/export',
  validateIdeaOwnership,
  trackPremiumUsage('performance_export'),
  performanceController.exportPerformanceData
);

// ===== INDIVIDUAL MEMBER PERFORMANCE ENDPOINTS =====

/**
 * @route   GET /api/performance/:ideaId/members/:memberId
 * @desc    Get individual member performance details
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @params  memberId - Team member ID
 * @query   timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 */
router.get('/:ideaId/members/:memberId',
  validateIdeaOwnership,
  trackPremiumUsage('member_performance'),
  performanceController.getMemberPerformance
);

// ===== PERFORMANCE HISTORY ENDPOINTS =====

/**
 * @route   GET /api/performance/:ideaId/history
 * @desc    Get performance history and trends
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 * @query   startDate - ISO date string (required)
 * @query   endDate - ISO date string (required)
 * @query   granularity - 'daily'/'weekly'/'monthly' (default: 'daily')
 * @query   userId - User ID for individual trends (optional)
 */
router.get('/:ideaId/history',
  validateIdeaOwnership,
  trackPremiumUsage('performance_history'),
  performanceController.getPerformanceHistory
);

// ===== PERFORMANCE ALERTS ENDPOINTS =====

/**
 * @route   GET /api/performance/:ideaId/alerts
 * @desc    Get performance alerts for specific team
 * @access  Premium (Idea Author Only)
 * @params  ideaId - Team/Idea ID
 */
router.get('/:ideaId/alerts',
  validateIdeaOwnership,
  trackPremiumUsage('performance_alerts'),
  performanceController.getPerformanceAlerts
);

/**
 * @route   GET /api/performance/alerts
 * @desc    Get all performance alerts for authenticated user
 * @access  Premium (User's Own Alerts)
 */
router.get('/alerts',
  trackPremiumUsage('all_performance_alerts'),
  performanceController.getAllPerformanceAlerts
);

/**
 * @route   PATCH /api/performance/alerts/:alertId/read
 * @desc    Mark performance alert as read
 * @access  Premium (Alert Owner Only)
 * @params  alertId - Alert ID
 */
router.patch('/alerts/:alertId/read',
  trackPremiumUsage('mark_alert_read'),
  performanceController.markAlertAsRead
);

/**
 * @route   PATCH /api/performance/alerts/:alertId/resolve
 * @desc    Resolve performance alert
 * @access  Premium (Alert Owner Only)
 * @params  alertId - Alert ID
 * @body    notes - Resolution notes (optional)
 */
router.patch('/alerts/:alertId/resolve',
  trackPremiumUsage('resolve_alert'),
  performanceController.resolveAlert
);

// ===== ERROR HANDLING MIDDLEWARE =====

/**
 * Performance-specific error handler
 */
router.use((error, req, res, next) => {
  console.error('Performance API Error:', error);
  
  // Handle specific performance-related errors
  if (error.message?.includes('Premium subscription required')) {
    return ResponseService.forbidden(res, error.message, {
      feature: 'performance_analytics',
      upgradeUrl: '/premium/upgrade'
    });
  }
  
  if (error.message?.includes('Rate limit exceeded')) {
    return ResponseService.tooManyRequests(res, error.message);
  }
  
  if (error.message?.includes('Team not found') || error.message?.includes('Idea not found')) {
    return ResponseService.notFound(res, 'Team or idea not found');
  }
  
  if (error.message?.includes('Access denied')) {
    return ResponseService.forbidden(res, 'Access denied. Performance analytics are only available to idea authors');
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return ResponseService.badRequest(res, 'Invalid request data', {
      validationErrors: Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }))
    });
  }
  
  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    console.error('Database error in performance API:', error);
    return ResponseService.error(res, 'Database error occurred', 500);
  }
  
  // Default error response
  return ResponseService.error(res, 'An unexpected error occurred in performance analytics', 500);
});

// ===== ROUTE NOT FOUND HANDLER =====

/**
 * Handle 404 for performance routes
 */
router.use('*', (req, res) => {
  return ResponseService.notFound(res, `Performance API endpoint ${req.originalUrl} not found`, {
    availableEndpoints: [
      'GET /:ideaId/dashboard - Get team performance dashboard',
      'POST /:ideaId/recalculate - Trigger performance recalculation',
      'GET /:ideaId/stats - Get performance statistics',
      'GET /:ideaId/export - Export performance data',
      'GET /:ideaId/members/:memberId - Get member performance',
      'GET /:ideaId/history - Get performance history',
      'GET /:ideaId/alerts - Get team performance alerts',
      'GET /alerts - Get all user alerts',
      'PATCH /alerts/:alertId/read - Mark alert as read',
      'PATCH /alerts/:alertId/resolve - Resolve alert'
    ]
  });
});

export default router;
