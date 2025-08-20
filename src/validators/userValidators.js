import Joi from 'joi';

// Update profile validation
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern': 'First name can only contain letters and spaces'
    }),
  
  fullName: Joi.string()
    .min(3)
    .max(100)
    .messages({
      'string.min': 'Full name must be at least 3 characters long',
      'string.max': 'Full name cannot exceed 100 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .messages({
      'string.pattern': 'Please provide a valid phone number'
    }),
  
  bio: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),
  
  address: Joi.string()
    .max(200)
    .allow('')  // Allow empty strings
    .messages({
      'string.max': 'Address cannot exceed 200 characters'
    }),
  
  city: Joi.string()
    .max(100)
    .allow('')  // Allow empty strings
    .messages({
      'string.max': 'City cannot exceed 100 characters'
    }),
  
  state: Joi.string()
    .max(100)
    .allow('')  // Allow empty strings
    .messages({
      'string.max': 'State cannot exceed 100 characters'
    }),
  
  country: Joi.string()
    .max(100)
    .allow('')  // Allow empty strings
    .messages({
      'string.max': 'Country cannot exceed 100 characters'
    }),
  
  zipCode: Joi.string()
    .max(20)
    .allow('')  // Allow empty strings
    .messages({
      'string.max': 'Zip code cannot exceed 20 characters'
    }),
  
  skills: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .messages({
      'array.max': 'Cannot have more than 20 skills',
      'string.max': 'Each skill cannot exceed 50 characters'
    }),
  
  socialLinks: Joi.alternatives().try(
    Joi.array().items(Joi.object({
      type: Joi.string().valid('linkedin', 'twitter', 'github', 'website', 'other').required(),
      value: Joi.string().uri().required()
    })).max(10),
    Joi.object().pattern(Joi.string(), Joi.string().uri()),
    Joi.string().allow(''),
    Joi.allow(null)
  )
    .messages({
      'object.unknown': 'Invalid social link format'
    }),

  interestedRoles: Joi.alternatives().try(
    Joi.array().items(Joi.string().valid('developer', 'designer', 'marketer', 'investor', 'mentor', 'other')).max(10),
    Joi.string().allow(''),
    Joi.string().pattern(/^[a-zA-Z\s,]+$/),
    Joi.allow(null)
  )
    .messages({
      'string.pattern': 'Invalid role format'
    }),
  
  resume: Joi.string()
    .uri()
    .allow('', null)
    .messages({
      'string.uri': 'Please provide a valid resume URL'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'busy', 'available', 'seeking')
    .messages({
      'any.only': 'Status must be one of: active, inactive, busy, available, seeking'
    })
});

// Update roles validation
export const updateRolesSchema = Joi.object({
  // Accept booleans and common truthy/falsy strings
  isInvestor: Joi.boolean().truthy('true', '1', 'yes', 'on').falsy('false', '0', 'no', 'off')
    .messages({ 'boolean.base': 'isInvestor must be a boolean value' }),

  isMentor: Joi.boolean().truthy('true', '1', 'yes', 'on').falsy('false', '0', 'no', 'off')
    .messages({ 'boolean.base': 'isMentor must be a boolean value' }),

  company: Joi.string().max(100)
    .messages({ 'string.max': 'Company name cannot exceed 100 characters' }),

  position: Joi.string().max(100)
    .messages({ 'string.max': 'Position cannot exceed 100 characters' }),

  // Allow any string for experience to avoid 400s from legacy UIs
  experience: Joi.string().max(50),

  // Accept arrays or comma/JSON strings; normalize in service
  investmentFocus: Joi.alternatives().try(
    Joi.array().items(Joi.string().max(50)).max(20),
    Joi.string()
  ),

  mentorshipAreas: Joi.alternatives().try(
    Joi.array().items(Joi.string().max(50)).max(20),
    Joi.string()
  )
}).unknown(true);

// Update privacy validation
export const updatePrivacySchema = Joi.object({
  profileProtection: Joi.boolean()
    .messages({
      'boolean.base': 'profileProtection must be a boolean value'
    }),
  
  profileVisibility: Joi.string()
    .valid('public', 'connections', 'private')
    .messages({
      'any.only': 'Profile visibility must be one of: public, connections, private'
    }),
  
  allowMessages: Joi.boolean()
    .messages({
      'boolean.base': 'allowMessages must be a boolean value'
    }),
  
  showEmail: Joi.boolean()
    .messages({
      'boolean.base': 'showEmail must be a boolean value'
    }),
  
  showPhone: Joi.boolean()
    .messages({
      'boolean.base': 'showPhone must be a boolean value'
    })
});

// Update notification preferences validation
export const updateNotificationPreferencesSchema = Joi.object({
  email: Joi.object({
    enabled: Joi.boolean()
      .messages({
        'boolean.base': 'Email enabled must be a boolean value'
      }),
    preferences: Joi.object({
      messages: Joi.boolean(),
      ideaCollaboration: Joi.boolean(),
      comments: Joi.boolean(),
      likes: Joi.boolean(),
      groupChats: Joi.boolean(),
      connectionRequests: Joi.boolean()
    })
  }),
  
  app: Joi.object({
    enabled: Joi.boolean()
      .messages({
        'boolean.base': 'App notifications enabled must be a boolean value'
      }),
    browserPermission: Joi.string()
      .valid('granted', 'denied', 'default')
      .messages({
        'any.only': 'Browser permission must be one of: granted, denied, default'
      }),
    preferences: Joi.object({
      messages: Joi.boolean(),
      ideaCollaboration: Joi.boolean(),
      comments: Joi.boolean(),
      likes: Joi.boolean(),
      groupChats: Joi.boolean(),
      connectionRequests: Joi.boolean()
    })
  }),
  
  push: Joi.object({
    enabled: Joi.boolean()
      .messages({
        'boolean.base': 'Push notifications enabled must be a boolean value'
      }),
    preferences: Joi.object({
      messages: Joi.boolean(),
      ideaCollaboration: Joi.boolean(),
      comments: Joi.boolean(),
      likes: Joi.boolean(),
      groupChats: Joi.boolean(),
      connectionRequests: Joi.boolean()
    })
  })
});

// Update theme validation
export const updateThemeSchema = Joi.object({
  mode: Joi.string()
    .valid('light', 'dark', 'auto')
    .messages({
      'any.only': 'Theme mode must be one of: light, dark, auto'
    }),
  
  accentColor: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .messages({
      'string.pattern': 'Accent color must be a valid hex color (e.g., #FF5733)'
    }),
  
  fontSize: Joi.string()
    .valid('small', 'medium', 'large')
    .messages({
      'any.only': 'Font size must be one of: small, medium, large'
    }),
  
  reducedMotion: Joi.boolean()
    .messages({
      'boolean.base': 'Reduced motion must be a boolean value'
    })
});

// Search users validation
export const searchUsersSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

// NDA generation validation
export const generateNDASchema = Joi.object({
  companyName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters',
      'any.required': 'Company name is required'
    }),
  
  projectName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Project name must be at least 2 characters long',
      'string.max': 'Project name cannot exceed 100 characters',
      'any.required': 'Project name is required'
    }),
  
  protectionScope: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Protection scope cannot exceed 500 characters'
    })
});
