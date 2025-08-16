import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Import configuration and services
import { config, validateConfig } from './config/index.js';
import { logger } from './services/loggerService.js';
import passport, { initializeGoogleStrategy } from './config/passport.js';
import { initializeErrorHandlers } from './services/errorService.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import ideaRoutes from './routes/idea.routes.js';
import chatRoutes from './routes/chat.routes.js';
import messageRoutes from './routes/message.routes.js';
import emailRoutes from './routes/email.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

// Validate configuration
try {
  validateConfig();
  logger.info('Configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed', { error: error.message });
  if (config.app.isProduction) {
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Performance optimizations for single-core
if (config.performance.compression) {
  app.use(compression()); // Compress responses
}

app.use(express.json({ limit: config.performance.maxRequestBodySize })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: config.performance.maxRequestBodySize }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: config.rateLimit.message,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
  skipFailedRequests: config.rateLimit.skipFailedRequests
});

app.use(limiter);

// Initialize Redis client for session store
let redisClient = null;
let redisStore = null;

if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: config.redis.url });
    redisClient.connect().catch(error => {
      logger.warn('Redis connection failed, sessions will use memory store', { error: error.message });
    });
    redisStore = new RedisStore({ client: redisClient });
    logger.info('Redis session store configured successfully');
  } catch (error) {
    logger.warn('Redis not available for sessions, using memory store', { error: error.message });
  }
}

// Configure Cloudinary if available
if (config.cloudinary.apiSecret) {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret
    });
    logger.info('Cloudinary configured successfully');
  } catch (error) {
    logger.warn('Cloudinary configuration failed', { error: error.message });
  }
}

// Request logging middleware
app.use(logger.logRequest);

// Configure CORS
app.use(cors(config.cors));

// Session configuration for Passport
app.use(session({
  ...config.session,
  store: redisStore || undefined // Use Redis store if available
}));

// Initialize Google OAuth Strategy
initializeGoogleStrategy();

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { quickHealth } = await import('./services/healthService.js');
    const health = await quickHealth();
    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// Full health check endpoint
app.get('/health/full', async (req, res) => {
  try {
    const { healthCheck } = await import('./services/healthService.js');
    const health = await healthCheck();
    res.status(200).json(health);
  } catch (error) {
    logger.error('Full health check failed', { error: error.message });
    res.status(500).json({ status: 'error', message: 'Full health check failed' });
  }
});

// API status endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'StudentMate API is running',
    version: '1.0.0',
    environment: config.app.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  logger.warn('Route not found', { 
    method: req.method, 
    url: req.originalUrl, 
    ip: req.ip 
  });
  
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    statusCode: 404
  });
});

// Initialize global error handlers
initializeErrorHandlers();

// Global error handling middleware (must be last)
import { errorHandler } from './services/errorService.js';
app.use(errorHandler);

export default app; 