import ResponseService from '../services/responseService.js';
import { asyncHandler } from '../services/errorService.js';

class BaseController {
  // Use ResponseService for consistent responses with FRONTEND COMPATIBILITY
  sendSuccess = async (res, data, message = 'Success', statusCode = 200) => {
    // Use legacy format for frontend compatibility
    return await ResponseService.legacySuccess(res, data, message, statusCode);
  };

  sendError = (res, error, statusCode = 500) => {
    // Use legacy format for frontend compatibility
    return ResponseService.legacyError(res, error.message || 'Internal server error', statusCode, error.errors);
  };

  sendNotFound = (res, message = 'Resource not found') => {
    return ResponseService.notFound(res, message);
  };

  sendUnauthorized = (res, message = 'Unauthorized') => {
    return ResponseService.unauthorized(res, message);
  };

  sendForbidden = (res, message = 'Forbidden') => {
    return ResponseService.forbidden(res, message);
  };

  sendBadRequest = (res, message = 'Bad request', errors = null) => {
    return ResponseService.badRequest(res, message, errors);
  };

  // Use asyncHandler from error service
  asyncHandler = asyncHandler;
}

export default BaseController;
