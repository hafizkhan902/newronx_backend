// Custom error classes for different types of errors
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, true);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, true);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, true);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, true);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, true);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, false);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error') {
    super(message, 502, false);
    this.name = 'ExternalServiceError';
  }
}

// Error handler middleware
export const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let errors = error.errors || [];

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (error.name === 'DuplicateKeyError') {
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle MongoDB errors
  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue)[0];
    message = `${field} already exists`;
  }

  // Handle Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files';
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? req.user._id : 'unauthenticated'
    });
  }

  // Send error response with FRONTEND COMPATIBILITY
  // Frontend expects: { message: "...", errors: [...] }
  const response = { message };
  if (errors && errors.length > 0) response.errors = errors;
  
  // Add development info if needed
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.name = error.name;
  }
  
  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error logger
export const logError = (error, req = null) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    isOperational: error.isOperational !== false
  };

  if (req) {
    errorLog.request = {
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? req.user._id : 'unauthenticated',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Log:', errorLog);
  }

  // TODO: In production, you might want to log to a file or external service
  // logger.error(errorLog);

  return errorLog;
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log the error
  logError(new Error(`Unhandled Promise Rejection: ${reason}`));
  
  // In production, you might want to gracefully shutdown the server
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

// Handle uncaught exceptions
export const handleUncaughtException = (error) => {
  console.error('Uncaught Exception:', error);
  
  // Log the error
  logError(error);
  
  // In production, you might want to gracefully shutdown the server
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

// Initialize error handlers
export const initializeErrorHandlers = () => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
};

// Cleanup error handlers
export const cleanupErrorHandlers = () => {
  process.removeListener('unhandledRejection', handleUnhandledRejection);
  process.removeListener('uncaughtException', handleUncaughtException);
};
