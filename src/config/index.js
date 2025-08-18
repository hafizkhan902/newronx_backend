import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Application configuration
  app: {
    port: parseInt(process.env.PORT) || 2000,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://newronx.com',
    apiUrl: process.env.API_URL || 'http://localhost:2000',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test'
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/studentmate',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10, // Increased from 5
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,  // Increased from 1
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
      bufferCommands: false
    }
  },

  // Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dysr0wotl',
    apiKey: process.env.CLOUDINARY_API_KEY || '556186415216556',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
    folder: process.env.CLOUDINARY_FOLDER || 'studentmate'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'studentmate-api',
    audience: process.env.JWT_AUDIENCE || 'studentmate-users'
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@studentmate.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@studentmate.com'
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'studentmate:'
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    avatarFolder: 'uploads/avatars/',
    ideaFolder: 'uploads/ideas/',
    ndaFolder: 'uploads/ndas/',
    messageFolder: 'uploads/messages/'
  },

  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:2000/api/auth/google/callback',
    scope: ['profile', 'email']
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    otpLength: parseInt(process.env.OTP_LENGTH) || 6,
    otpExpiry: parseInt(process.env.OTP_EXPIRY) || 10 * 60 * 1000, // 10 minutes
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 6,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000 // 15 minutes
  },

  // Notification configuration
  notification: {
    push: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || ''
    },
    email: {
      verificationTemplate: process.env.EMAIL_VERIFICATION_TEMPLATE || 'verification',
      passwordResetTemplate: process.env.EMAIL_PASSWORD_RESET_TEMPLATE || 'password-reset',
      welcomeTemplate: process.env.EMAIL_WELCOME_TEMPLATE || 'welcome'
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    logFile: process.env.LOG_FILE || 'logs/app.log',
    maxLogSize: process.env.LOG_MAX_SIZE || '10m',
    maxLogFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // Performance configuration
  performance: {
    compression: process.env.ENABLE_COMPRESSION !== 'false',
    cacheControl: process.env.ENABLE_CACHE_CONTROL === 'true',
    etag: process.env.ENABLE_ETAG !== 'false',
    maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE || '10mb',
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
  },

  // Frontend compatibility settings
  frontend: {
    compatibility: {
      enabled: process.env.FRONTEND_COMPATIBILITY !== 'false', // Default: true
      legacyResponseFormat: process.env.LEGACY_RESPONSE_FORMAT !== 'false', // Default: true
      legacyErrorFormat: process.env.LEGACY_ERROR_FORMAT !== 'false', // Default: true
    }
  }
};

// Validate required configuration
export const validateConfig = () => {
  const required = [
    'database.uri',
    'jwt.secret',
    'cloudinary.cloudName',
    'cloudinary.apiKey',
    'cloudinary.apiSecret'
  ];

  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    return !value || value === '';
  });

  if (missing.length > 0) {
    console.warn('Missing required configuration:', missing);
    if (config.app.isProduction) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  return config;
};

// Get nested configuration value
export const getConfig = (path, defaultValue = null) => {
  try {
    return path.split('.').reduce((obj, key) => obj[key], config) ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Check if feature is enabled
export const isFeatureEnabled = (featureName) => {
  const featureConfig = {
    redis: !!config.redis.url && config.redis.url !== 'redis://localhost:6379',
    cloudinary: !!config.cloudinary.apiSecret,
    googleOAuth: !!config.google.clientId && !!config.google.clientSecret,
    email: !!config.email.user && !!config.email.pass,
    pushNotifications: !!config.notification.push.vapidPublicKey
  };

  return featureConfig[featureName] || false;
};

export default config;
