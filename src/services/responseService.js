// Centralized response formatting service
export class ResponseService {
  // Success responses
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode
    });
  }

  // COMPATIBILITY METHODS - Maintain old frontend format
  static async legacySuccess(res, data = null, message = 'Success', statusCode = 200) {
    // Check if frontend compatibility is enabled
    const { config } = await import('../config/index.js');
    if (!config.frontend.compatibility.enabled) {
      return this.success(res, data, message, statusCode);
    }
    
    // If data contains user and token, format for frontend compatibility
    if (data && typeof data === 'object') {
      if (data.user && data.token) {
        // Frontend expects: { user: {...}, token: "...", message: "..." }
        return res.status(statusCode).json({
          user: data.user,
          token: data.token,
          message: message
        });
      } else if (data.token) {
        // Frontend expects: { token: "...", message: "..." }
        return res.status(statusCode).json({
          token: data.token,
          message: message,
          ...data
        });
      }
    }
    
    // Fallback to new format
    return this.success(res, data, message, statusCode);
  }

  static legacyAuthSuccess(res, user, token, message = 'Authentication successful') {
    // Frontend expects: { user: {...}, token: "...", message: "..." }
    return res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        isEmailVerified: user.emailVerified,
        isAdmin: user.isAdmin,
        isInvestor: user.isInvestor,
        isMentor: user.isMentor,
        profilePicture: user.avatar,
        status: user.status
      },
      token,
      message
    });
  }

  static legacyError(res, message = 'Error occurred', statusCode = 500, errors = null) {
    // Frontend expects: { message: "...", errors: [...] }
    const response = { message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  // Legacy register success: return top-level userId and email
  static legacyRegisterSuccess(res, data = {}, message = 'Registration successful', statusCode = 201) {
    const { userId, email } = data || {};
    return res.status(statusCode).json({
      userId: userId || null,
      email: email || null,
      message
    });
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static updated(res, data = null, message = 'Resource updated successfully') {
    return this.success(res, data, message, 200);
  }

  static deleted(res, message = 'Resource deleted successfully') {
    return this.success(res, null, message, 200);
  }

  // Error responses
  static error(res, message = 'Internal server error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      statusCode
    });
  }

  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409);
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  static internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  static serviceUnavailable(res, message = 'Service unavailable') {
    return this.error(res, message, 503);
  }

  // Pagination responses
  static paginated(res, data, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  // File upload responses
  static fileUploaded(res, fileData, message = 'File uploaded successfully') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        filename: fileData.filename,
        originalName: fileData.originalname,
        size: fileData.size,
        mimetype: fileData.mimetype,
        url: fileData.url || null,
        publicId: fileData.publicId || null
      },
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  // Search responses
  static searchResults(res, data, query, total, message = 'Search completed successfully') {
    return res.status(200).json({
      success: true,
      message,
      data,
      search: {
        query,
        total,
        resultsCount: Array.isArray(data) ? data.length : 1
      },
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  // Validation error responses
  static validationError(res, errors, message = 'Validation failed') {
    return res.status(400).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString(),
      statusCode: 400
    });
  }

  // Authentication responses
  static authSuccess(res, user, token, message = 'Authentication successful') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          isAdmin: user.isAdmin,
          isInvestor: user.isInvestor,
          isMentor: user.isMentor,
          profilePicture: user.profilePicture,
          status: user.status
        },
        token
      },
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  static authFailure(res, message = 'Authentication failed') {
    return this.unauthorized(res, message);
  }

  // Logout response
  static logoutSuccess(res, message = 'Logged out successfully') {
    return res.status(200).json({
      success: true,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  // Email verification responses
  static emailVerificationSent(res, message = 'Verification email sent successfully') {
    return this.success(res, null, message, 200);
  }

  static emailVerified(res, message = 'Email verified successfully') {
    return this.success(res, null, message, 200);
  }

  static emailVerificationFailed(res, message = 'Email verification failed') {
    return this.badRequest(res, message);
  }

  // Password reset responses
  static passwordResetEmailSent(res, message = 'Password reset email sent successfully') {
    return this.success(res, null, message, 200);
  }

  static passwordResetSuccess(res, message = 'Password reset successfully') {
    return this.success(res, null, message, 200);
  }

  static passwordResetFailed(res, message = 'Password reset failed') {
    return this.badRequest(res, message);
  }

  // Profile update responses
  static profileUpdated(res, user, message = 'Profile updated successfully') {
    return this.success(res, {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        profilePicture: user.profilePicture,
        status: user.status
      }
    }, message, 200);
  }

  // Idea responses
  static ideaCreated(res, idea, message = 'Idea created successfully') {
    return this.created(res, { idea }, message);
  }

  static ideaUpdated(res, idea, message = 'Idea updated successfully') {
    return this.updated(res, { idea }, message);
  }

  static ideaDeleted(res, message = 'Idea deleted successfully') {
    return this.deleted(res, message);
  }

  static ideaLiked(res, message = 'Idea liked successfully') {
    return this.success(res, null, message, 200);
  }

  static ideaUnliked(res, message = 'Like removed successfully') {
    return this.success(res, null, message, 200);
  }

  // Message responses
  static messageSent(res, message, messageText = 'Message sent successfully') {
    return this.created(res, { message }, messageText);
  }

  static messageDeleted(res, messageText = 'Message deleted successfully') {
    return this.deleted(res, messageText);
  }

  // Chat responses
  static chatCreated(res, chat, message = 'Chat created successfully') {
    return this.created(res, { chat }, message);
  }

  static chatUpdated(res, chat, message = 'Chat updated successfully') {
    return this.updated(res, { chat }, message);
  }

  static chatDeleted(res, message = 'Chat deleted successfully') {
    return this.deleted(res, message);
  }

  // Notification responses
  static notificationMarkedAsRead(res, message = 'Notification marked as read') {
    return this.success(res, null, message, 200);
  }

  static notificationDeleted(res, message = 'Notification deleted successfully') {
    return this.deleted(res, message);
  }

  // Generic CRUD responses
  static list(res, data, message = 'Data retrieved successfully') {
    return this.success(res, data, message, 200);
  }

  static get(res, data, message = 'Data retrieved successfully') {
    return this.success(res, data, message, 200);
  }

  static create(res, data, message = 'Resource created successfully') {
    return this.created(res, data, message);
  }

  static update(res, data, message = 'Resource updated successfully') {
    return this.updated(res, data, message);
  }

  static remove(res, message = 'Resource deleted successfully') {
    return this.deleted(res, message);
  }

  // Health check response
  static healthCheck(res, status = 'healthy', uptime = process.uptime()) {
    return res.status(200).json({
      success: true,
      message: 'Service is running',
      data: {
        status,
        uptime: Math.floor(uptime),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString(),
      statusCode: 200
    });
  }

  // Rate limit response
  static rateLimitExceeded(res, retryAfter = 60) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      data: {
        retryAfter,
        retryAfterDate: new Date(Date.now() + retryAfter * 1000).toISOString()
      },
      timestamp: new Date().toISOString(),
      statusCode: 429
    });
  }
}

export default ResponseService;
