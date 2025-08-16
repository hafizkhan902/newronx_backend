import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Middleware to verify JWT token and attach user to request
export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    }
    return res.status(500).json({ 
      success: false,
      message: 'Token verification failed.' 
    });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Check if user has specific role
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    const userRoles = [];
    if (req.user.isAdmin) userRoles.push('admin');
    if (req.user.isInvestor) userRoles.push('investor');
    if (req.user.isMentor) userRoles.push('mentor');
    userRoles.push('user'); // All authenticated users have 'user' role

    const hasRequiredRole = Array.isArray(roles) 
      ? roles.some(role => userRoles.includes(role))
      : userRoles.includes(roles);

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// Check if user owns the resource or has admin role
export const requireOwnership = (resourceField = 'author') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    // Admins can access everything
    if (req.user.isAdmin) {
      return next();
    }

    // Check if user owns the resource
    const resourceId = req.params.id || req.params.chatId || req.params.messageId;
    if (!resourceId) {
      return res.status(400).json({ 
        success: false,
        message: 'Resource ID required.' 
      });
    }

    try {
      // This will be implemented based on the specific resource type
      // For now, we'll let the controller handle the ownership check
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false,
        message: 'Ownership verification failed.' 
      });
    }
  };
};
