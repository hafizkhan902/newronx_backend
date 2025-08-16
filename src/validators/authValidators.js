import Joi from 'joi';

// User registration validation
export const registerSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  
  fullName: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 3 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required'
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .required()
    .messages({
      'string.pattern': 'Please provide a valid phone number',
      'any.required': 'Phone number is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
});

// User login validation
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Email verification validation
export const emailVerificationSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'Invalid user ID format',
      'string.length': 'User ID must be 24 characters long',
      'any.required': 'User ID is required'
    }),
  
  otpCode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern': 'OTP code must be exactly 6 digits',
      'any.required': 'OTP code is required'
    })
});

// Resend verification validation
export const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Forgot password validation
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Reset password validation
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your new password'
    })
});

// Update password validation
export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    })
});

// Update email validation
export const updateEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'New email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    })
});
