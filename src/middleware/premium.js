import { ResponseService } from '../services/responseService.js';

/**
 * Premium Feature Access Control Middleware
 * Restricts access to premium features based on user subscription status
 */

/**
 * Check if user has premium access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requirePremium = (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return ResponseService.unauthorized(res, 'Authentication required for premium features');
    }
    
    // Check if user has premium subscription
    // In a real implementation, this would check actual subscription status
    const hasPremium = checkPremiumStatus(user);
    
    if (!hasPremium) {
      return ResponseService.forbidden(res, 'Premium subscription required to access performance analytics', {
        feature: 'performance_analytics',
        upgradeUrl: '/premium/upgrade',
        premiumFeatures: [
          'Team performance analytics',
          'Individual member insights',
          'Performance trends and history',
          'Automated recommendations',
          'Performance alerts'
        ]
      });
    }
    
    // User has premium access, continue
    next();
    
  } catch (error) {
    console.error('Premium middleware error:', error);
    return ResponseService.error(res, 'Failed to verify premium access', 500);
  }
};

/**
 * Check if user has premium access with trial support
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requirePremiumWithTrial = (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return ResponseService.unauthorized(res, 'Authentication required for premium features');
    }
    
    // Check premium status including trial
    const premiumStatus = checkPremiumStatusWithTrial(user);
    
    if (!premiumStatus.hasAccess) {
      const errorData = {
        feature: 'performance_analytics',
        upgradeUrl: '/premium/upgrade',
        premiumFeatures: [
          'Team performance analytics',
          'Individual member insights',
          'Performance trends and history',
          'Automated recommendations',
          'Performance alerts'
        ]
      };
      
      // Add trial info if available
      if (premiumStatus.trialAvailable) {
        errorData.trialAvailable = true;
        errorData.trialDuration = '7 days';
        errorData.startTrialUrl = '/premium/trial/start';
      }
      
      if (premiumStatus.trialExpired) {
        errorData.trialExpired = true;
        errorData.trialExpiredAt = premiumStatus.trialExpiredAt;
      }
      
      return ResponseService.forbidden(res, 'Premium subscription required to access performance analytics', errorData);
    }
    
    // Add premium status to request for use in controllers
    req.premiumStatus = premiumStatus;
    
    next();
    
  } catch (error) {
    console.error('Premium with trial middleware error:', error);
    return ResponseService.error(res, 'Failed to verify premium access', 500);
  }
};

/**
 * Rate limiting for premium features
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
export const premiumRateLimit = (options = {}) => {
  const {
    maxRequests = 100,     // Max requests per hour for premium users
    windowMs = 60 * 60 * 1000, // 1 hour
    freeUserLimit = 5,     // Max requests per hour for free users
    message = 'Rate limit exceeded for performance analytics'
  } = options;
  
  // In-memory store for rate limiting (use Redis in production)
  const requestCounts = new Map();
  
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return ResponseService.unauthorized(res, 'Authentication required');
      }
      
      const userId = user._id.toString();
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      for (const [key, data] of requestCounts.entries()) {
        if (data.timestamp < windowStart) {
          requestCounts.delete(key);
        }
      }
      
      // Get current count for user
      const userKey = `${userId}:${Math.floor(now / windowMs)}`;
      const currentCount = requestCounts.get(userKey)?.count || 0;
      
      // Check premium status
      const hasPremium = checkPremiumStatus(user);
      const limit = hasPremium ? maxRequests : freeUserLimit;
      
      if (currentCount >= limit) {
        const resetTime = new Date(Math.ceil(now / windowMs) * windowMs);
        
        return ResponseService.tooManyRequests(res, message, {
          limit,
          remaining: 0,
          resetTime,
          upgradeMessage: !hasPremium ? 'Upgrade to premium for higher limits' : undefined
        });
      }
      
      // Update count
      requestCounts.set(userKey, {
        count: currentCount + 1,
        timestamp: now
      });
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': limit - currentCount - 1,
        'X-RateLimit-Reset': Math.ceil(now / windowMs) * windowMs
      });
      
      next();
      
    } catch (error) {
      console.error('Premium rate limit middleware error:', error);
      return ResponseService.error(res, 'Rate limiting error', 500);
    }
  };
};

/**
 * Feature usage tracking for premium analytics
 * @param {string} featureName - Name of the feature being used
 * @returns {Function} Middleware function
 */
export const trackPremiumUsage = (featureName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return next();
      }
      
      // Track feature usage (implement actual tracking logic)
      await trackFeatureUsage(user._id, featureName, {
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        endpoint: req.originalUrl
      });
      
      next();
      
    } catch (error) {
      console.error('Premium usage tracking error:', error);
      // Don't block request if tracking fails
      next();
    }
  };
};

/**
 * Validate team ownership for premium features
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const validateTeamOwnership = async (req, res, next) => {
  try {
    const user = req.user;
    const { ideaId } = req.params;
    
    if (!user || !ideaId) {
      return ResponseService.badRequest(res, 'User authentication and idea ID required');
    }
    
    // Import Idea model dynamically to avoid circular dependencies
    const { default: Idea } = await import('../models/idea.model.js');
    
    const idea = await Idea.findById(ideaId).select('author title').lean();
    
    if (!idea) {
      return ResponseService.notFound(res, 'Team/Idea not found');
    }
    
    if (idea.author.toString() !== user._id.toString()) {
      return ResponseService.forbidden(res, 'Access denied. Performance analytics are only available to idea authors', {
        reason: 'not_author',
        message: 'Only the idea author can access team performance data'
      });
    }
    
    // Add idea info to request for use in controllers
    req.idea = idea;
    
    next();
    
  } catch (error) {
    console.error('Team ownership validation error:', error);
    return ResponseService.error(res, 'Failed to validate team ownership', 500);
  }
};

// Helper functions

/**
 * Check if user has premium subscription
 * @param {Object} user - User object
 * @returns {boolean} Has premium access
 */
function checkPremiumStatus(user) {
  // Check if user has subscription object
  if (!user.subscription) {
    return false;
  }
  
  const { subscription } = user;
  const now = new Date();
  
  // Check if subscription is explicitly marked as premium
  if (subscription.isPremium) {
    // Additional validation for active status
    if (subscription.status === 'active') {
      // Check if subscription hasn't expired
      if (!subscription.endDate || subscription.endDate > now) {
        return true;
      }
    }
    
    // Check if user is in trial period
    if (subscription.status === 'trial') {
      if (!subscription.trialEndDate || subscription.trialEndDate > now) {
        return true;
      }
    }
  }
  
  // Check premium plans
  const premiumPlans = ['premium', 'pro', 'enterprise'];
  if (premiumPlans.includes(subscription.plan) && subscription.status === 'active') {
    // Verify subscription hasn't expired
    if (!subscription.endDate || subscription.endDate > now) {
      return true;
    }
  }
  
  return false; // Default to false
}

/**
 * Check premium status with trial support
 * @param {Object} user - User object
 * @returns {Object} Premium status with trial info
 */
function checkPremiumStatusWithTrial(user) {
  const hasPremium = checkPremiumStatus(user);
  
  if (hasPremium) {
    return {
      hasAccess: true,
      isPremium: true,
      trialAvailable: false,
      trialExpired: false
    };
  }
  
  // Check trial status
  const trialStatus = checkTrialStatus(user);
  
  return {
    hasAccess: trialStatus.isActive,
    isPremium: false,
    isTrial: trialStatus.isActive,
    trialAvailable: trialStatus.available,
    trialExpired: trialStatus.expired,
    trialExpiredAt: trialStatus.expiredAt,
    trialDaysRemaining: trialStatus.daysRemaining
  };
}

/**
 * Check user's trial status
 * @param {Object} user - User object
 * @returns {Object} Trial status
 */
function checkTrialStatus(user) {
  // Check if user has trial data
  if (!user.trial) {
    return {
      available: true,
      isActive: false,
      expired: false,
      daysRemaining: 0
    };
  }
  
  const now = new Date();
  const trialStart = new Date(user.trial.startedAt);
  const trialEnd = new Date(user.trial.expiresAt);
  
  const isActive = now >= trialStart && now <= trialEnd;
  const expired = now > trialEnd;
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
  
  return {
    available: !user.trial.used,
    isActive,
    expired,
    expiredAt: expired ? user.trial.expiresAt : null,
    daysRemaining
  };
}

/**
 * Track feature usage for analytics
 * @param {string} userId - User ID
 * @param {string} featureName - Feature name
 * @param {Object} metadata - Usage metadata
 */
async function trackFeatureUsage(userId, featureName, metadata) {
  try {
    // In a real implementation, this would:
    // - Save to database (usage analytics table)
    // - Send to analytics service (Google Analytics, Mixpanel, etc.)
    // - Update user's usage quotas
    // - Generate usage reports
    
    console.log(`📊 Feature usage tracked: ${featureName} by user ${userId}`, {
      feature: featureName,
      userId,
      timestamp: metadata.timestamp,
      endpoint: metadata.endpoint
    });
    
    // Example: Save to database
    // await UsageTracking.create({
    //   userId,
    //   feature: featureName,
    //   metadata,
    //   createdAt: new Date()
    // });
    
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    // Don't throw error as tracking is not critical
  }
}

// Export middleware functions
export default {
  requirePremium,
  requirePremiumWithTrial,
  premiumRateLimit,
  trackPremiumUsage,
  validateTeamOwnership
};
