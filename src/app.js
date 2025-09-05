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
import teamRoutes from './routes/team.routes.js';
import taskRoutes from './routes/task.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Trust  (safely) for correct client IP detection
// Use a non-permissive value to satisfy express-rate-limit validation
// - In production, trust the first proxy hop (e.g., nginx/Heroku/Cloudflare)
// - In development, trust only loopback addresses
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback');

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

// Always enable compression in production for better performance
if (process.env.NODE_ENV === 'production') {
  app.use(compression({
    level: 6, // Optimal compression level
    threshold: 1024, // Compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for all other responses
      return compression.filter(req, res);
    }
  }));
} else if (config.performance.compression) {
  app.use(compression()); // Use config setting in development
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
    const { healthCheck } = await import('./services/healthService.js');
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Full health check endpoint
app.get('/health/full', async (req, res) => {
  try {
    const { healthCheck } = await import('./services/healthService.js');
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Database performance monitoring endpoint
app.get('/health/database', async (req, res) => {
  try {
    const { getHealthStatus, getQueryMetrics, monitorPoolHealth } = await import('./services/databaseService.js');
    
    const [dbHealth, queryMetrics, poolHealth] = await Promise.all([
      getHealthStatus(),
      getQueryMetrics(),
      monitorPoolHealth()
    ]);

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      queries: queryMetrics,
      connectionPool: poolHealth,
      recommendations: dbHealth.recommendations || []
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// Database optimization recommendations endpoint
app.get('/health/database/optimize', async (req, res) => {
  try {
    const { getQueryMetrics, monitorPoolHealth } = await import('./services/databaseService.js');
    
    const [queryMetrics, poolHealth] = await Promise.all([
      getQueryMetrics(),
      monitorPoolHealth()
    ]);

    const recommendations = [];

    // Query performance recommendations
    if (queryMetrics.slowQueries > queryMetrics.totalQueries * 0.1) {
      recommendations.push({
        type: 'warning',
        category: 'query_performance',
        message: 'More than 10% of queries are slow',
        impact: 'high',
        suggestion: 'Review and optimize database indexes, consider query caching'
      });
    }

    if (queryMetrics.averageDuration > 100) {
      recommendations.push({
        type: 'warning',
        category: 'query_performance',
        message: 'Average query duration is high',
        impact: 'medium',
        suggestion: 'Optimize query patterns and add missing indexes'
      });
    }

    // Connection pool recommendations
    if (poolHealth.waitingRequests > 10) {
      recommendations.push({
        type: 'warning',
        category: 'connection_pool',
        message: 'High number of waiting database requests',
        impact: 'high',
        suggestion: 'Increase connection pool size or optimize query patterns'
      });
    }

    if (poolHealth.activeConnections === 0 && poolHealth.totalConnections > 0) {
      recommendations.push({
        type: 'critical',
        category: 'connection_pool',
        message: 'No active database connections available',
        impact: 'critical',
        suggestion: 'Check database connectivity and connection pool configuration'
      });
    }

    // Index recommendations
    if (queryMetrics.queriesByModel) {
      Object.entries(queryMetrics.queriesByModel).forEach(([model, count]) => {
        if (count > 100) {
          recommendations.push({
            type: 'info',
            category: 'indexing',
            message: `High query volume on ${model} model`,
            impact: 'medium',
            suggestion: `Consider adding compound indexes for frequently queried fields in ${model}`
          });
        }
      });
    }

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      recommendations,
      metrics: {
        queries: queryMetrics,
        connectionPool: poolHealth
      },
      summary: {
        totalRecommendations: recommendations.length,
        critical: recommendations.filter(r => r.type === 'critical').length,
        warnings: recommendations.filter(r => r.type === 'warning').length,
        info: recommendations.filter(r => r.type === 'info').length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database optimization analysis failed',
      error: error.message
    });
  }
});

// Cache management endpoint
app.post('/health/cache/clear', async (req, res) => {
  try {
    const { clearQueryCache } = await import('./services/databaseService.js');
    clearQueryCache();
    
    res.json({
      status: 'success',
      message: 'Query cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// Performance monitoring endpoint
app.get('/health/performance', async (req, res) => {
  try {
    const { getQueryMetrics, monitorPoolHealth } = await import('./services/databaseService.js');
    
    // Get system performance metrics
    const systemMetrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    // Get database performance metrics
    const [queryMetrics, poolHealth] = await Promise.all([
      getQueryMetrics(),
      monitorPoolHealth()
    ]);

    // Calculate performance scores
    const performanceScore = {
      database: Math.max(0, 100 - (queryMetrics.averageDuration || 0) / 2), // Higher score for faster queries
      connections: Math.max(0, 100 - (poolHealth.waitingRequests || 0) * 5), // Higher score for fewer waiting requests
      memory: Math.max(0, 100 - (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100), // Higher score for lower memory usage
      overall: 0
    };

    // Calculate overall score
    performanceScore.overall = Math.round(
      (performanceScore.database + performanceScore.connections + performanceScore.memory) / 3
    );

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      performance: {
        score: performanceScore,
        system: systemMetrics,
        database: {
          queries: queryMetrics,
          connections: poolHealth
        }
      },
      recommendations: []
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Performance monitoring failed',
      error: error.message
    });
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
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

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