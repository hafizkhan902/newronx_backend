import Joi from 'joi';

// Generic validation middleware
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    console.log(`[Validation] Validating ${property}:`, JSON.stringify(req[property], null, 2));
    
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      console.log(`[Validation] Validation failed for ${property}:`, error.message);
      console.log(`[Validation] Error details:`, error.details);
      
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      // Frontend expects: { message: "...", errors: [...] }
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    console.log(`[Validation] Validation passed for ${property}`);
    console.log(`[Validation] Validated data:`, JSON.stringify(value, null, 2));

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Validate query parameters
export const validateQuery = (schema) => validate(schema, 'query');

// Validate URL parameters
export const validateParams = (schema) => validate(schema, 'params');

// Validate request body
export const validateBody = (schema) => validate(schema, 'body');

// Custom validation for file uploads
export const validateFile = (allowedTypes, maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check file type
    if (allowedTypes && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
      });
    }

    next();
  };
};

// Validate multiple files
export const validateFiles = (allowedTypes, maxSize = 5 * 1024 * 1024, maxCount = 5) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    if (req.files.length > maxCount) {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum allowed: ${maxCount}`
      });
    }

    // Check each file
    for (const file of req.files) {
      // Check file type
      if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type for ${file.originalname}. Allowed types: ${allowedTypes.join(', ')}`
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} is too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
        });
      }
    }

    next();
  };
};

// Validate pagination parameters
export const validatePagination = () => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page number must be greater than 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    req.pagination = { page, limit };
    next();
  };
};

// Validate search parameters
export const validateSearch = () => {
  return (req, res, next) => {
    const { q } = req.query;
    
    if (q && (typeof q !== 'string' || q.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be a non-empty string'
      });
    }

    if (q) {
      req.searchQuery = q.trim();
    }

    next();
  };
};

// Validate MongoDB ObjectId
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

// Validate email format
export const validateEmail = (paramName = 'email') => {
  return (req, res, next) => {
    const email = req.body[paramName] || req.query[paramName];
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    next();
  };
};

// Validate phone number format
export const validatePhone = (paramName = 'phone') => {
  return (req, res, next) => {
    const phone = req.body[paramName] || req.query[paramName];
    
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    next();
  };
};

// Validate URL format
export const validateUrl = (paramName = 'url') => {
  return (req, res, next) => {
    const url = req.body[paramName] || req.query[paramName];
    
    if (url) {
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }
    }

    next();
  };
};

// Validate date format
export const validateDate = (paramName = 'date') => {
  return (req, res, next) => {
    const date = req.body[paramName] || req.query[paramName];
    
    if (date && isNaN(Date.parse(date))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    next();
  };
};

// Validate numeric range
export const validateNumericRange = (paramName, min, max) => {
  return (req, res, next) => {
    const value = parseFloat(req.body[paramName] || req.query[paramName]);
    
    if (req.body[paramName] || req.query[paramName]) {
      if (isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: `${paramName} must be a valid number`
        });
      }
      
      if (value < min || value > max) {
        return res.status(400).json({
          success: false,
          message: `${paramName} must be between ${min} and ${max}`
        });
      }
    }

    next();
  };
};
