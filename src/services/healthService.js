import mongoose from 'mongoose';
import { createClient } from 'redis';

export class HealthService {
  // Database health check
  static async checkDatabase() {
    const start = Date.now();
    
    try {
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          error: 'Database not connected',
          responseTime: Date.now() - start,
          details: {
            name: mongoose.connection.name || 'unknown',
            host: mongoose.connection.host || 'unknown',
            port: mongoose.connection.port || 'unknown',
            readyState: mongoose.connection.readyState
          }
        };
      }

      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      const responseTime = Date.now() - start;
      
      if (result.ok === 1) {
        logger.debug('Database health check passed', { responseTime });
        return {
          status: 'healthy',
          responseTime,
          details: {
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            readyState: mongoose.connection.readyState,
            database: mongoose.connection.db.databaseName
          }
        };
      } else {
        logger.warn('Database health check failed', { result, responseTime });
        return {
          status: 'unhealthy',
          error: 'Database ping failed',
          responseTime,
          details: { result }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - start;
      logger.error('Database health check error', { error: error.message, responseTime });
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        details: {
          name: mongoose.connection.name || 'unknown',
          host: mongoose.connection.host || 'unknown',
          port: mongoose.connection.port || 'unknown',
          readyState: mongoose.connection.readyState
        }
      };
    }
  }

  // Redis health check
  static async checkRedis() {
    const start = Date.now();
    
    try {
      const { isFeatureEnabled, config } = await import('../config/index.js');
      if (!isFeatureEnabled('redis')) {
        return {
          status: 'disabled',
          message: 'Redis not configured',
          responseTime: Date.now() - start
        };
      }

      const client = createClient({ url: config.redis.url });
      await client.connect();
      
      const result = await client.ping();
      await client.disconnect();
      
      const responseTime = Date.now() - start;
      
      if (result === 'PONG') {
        console.log('Redis health check passed', { responseTime });
        return {
          status: 'healthy',
          responseTime,
          details: {
            url: config.redis.url,
            response: result
          }
        };
      } else {
        console.warn('Redis health check failed', { result, responseTime });
        return {
          status: 'unhealthy',
          error: 'Redis ping failed',
          responseTime,
          details: { response: result }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - start;
      console.error('Redis health check error', { error: error.message, responseTime });
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        details: { url: 'redis://localhost:6379' }
      };
    }
  }

  // Cloudinary health check
  static async checkCloudinary() {
    const start = Date.now();
    
    try {
      const { isFeatureEnabled, config } = await import('../config/index.js');
      if (!isFeatureEnabled('cloudinary')) {
        return {
          status: 'disabled',
          message: 'Cloudinary not configured',
          responseTime: Date.now() - start
        };
      }

      // Configure Cloudinary
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret
      });

      // Test with a simple API call
      const result = await cloudinary.api.ping();
      
      const responseTime = Date.now() - start;
      
      if (result.status === 'ok') {
        console.log('Cloudinary health check passed', { responseTime });
        return {
          status: 'healthy',
          responseTime,
          details: {
            cloudName: config.cloudinary.cloudName,
            status: result.status
          }
        };
      } else {
        console.warn('Cloudinary health check failed', { result, responseTime });
        return {
          status: 'unhealthy',
          error: 'Cloudinary ping failed',
          responseTime,
          details: { result }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - start;
      console.error('Cloudinary health check error', { error: error.message, responseTime });
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        details: { cloudName: 'unknown' }
      };
    }
  }

  // Cache service health check
  static async checkCacheService() {
    const start = Date.now();
    
    try {
      const cacheService = await import('./cacheService.js');
      const result = await cacheService.default.healthCheck();
      const responseTime = Date.now() - start;
      
      return {
        ...result,
        responseTime,
        service: 'cache'
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      console.error('Cache service health check error', { error: error.message, responseTime });
      
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        service: 'cache'
      };
    }
  }

  // System resources health check
  static async checkSystemResources() {
    try {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate memory usage percentages
      const memoryUsage = {
        rss: {
          used: usage.rss,
          usedMB: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
          limit: process.env.NODE_OPTIONS?.includes('--max-old-space-size') 
            ? parseInt(process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/)?.[1] || '0') * 1024 * 1024
            : null
        },
        heapTotal: {
          used: usage.heapTotal,
          usedMB: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100
        },
        heapUsed: {
          used: usage.heapUsed,
          usedMB: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100
        },
        external: {
          used: usage.external,
          usedMB: Math.round(usage.external / 1024 / 1024 * 100) / 100
        }
      };

      // Determine memory status
      let memoryStatus = 'healthy';
      if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB
        memoryStatus = 'warning';
      }
      if (usage.heapUsed > 200 * 1024 * 1024) { // 200MB
        memoryStatus = 'critical';
      }

      return {
        status: memoryStatus,
        details: {
          memory: memoryUsage,
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
            userMS: Math.round(cpuUsage.user / 1000 * 100) / 100,
            systemMS: Math.round(cpuUsage.system / 1000 * 100) / 100
          },
          uptime: process.uptime(),
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
    } catch (error) {
      logger.error('System resources health check error', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Environment health check
  static async checkEnvironment() {
    try {
      const { isFeatureEnabled } = await import('../config/index.js');
      const requiredVars = [
        'MONGODB_URI',
        'JWT_SECRET',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET'
      ];

      const missing = requiredVars.filter(varName => !process.env[varName]);
      const optional = [
        'REDIS_URL',
        'EMAIL_HOST',
        'EMAIL_USER',
        'EMAIL_PASS',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET'
      ];

      const optionalMissing = optional.filter(varName => !process.env[varName]);

      const status = missing.length === 0 ? 'healthy' : 'critical';
      
      return {
        status,
        details: {
          nodeEnv: process.env.NODE_ENV || 'development',
          required: {
            total: requiredVars.length,
            missing,
            status: missing.length === 0 ? 'complete' : 'incomplete'
          },
          optional: {
            total: optional.length,
            missing: optionalMissing,
            status: optionalMissing.length === 0 ? 'complete' : 'partial'
          },
          features: {
            redis: isFeatureEnabled('redis'),
            cloudinary: isFeatureEnabled('cloudinary'),
            googleOAuth: isFeatureEnabled('googleOAuth'),
            email: isFeatureEnabled('email'),
            pushNotifications: isFeatureEnabled('pushNotifications')
          }
        }
      };
    } catch (error) {
      console.error('Environment health check error', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Full system health check
  static async getFullHealth() {
    const start = Date.now();
    
    try {
      const [
        database,
        redis,
        cloudinary,
        cacheService,
        systemResources,
        environment
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkCloudinary(),
        this.checkCacheService(),
        this.checkSystemResources(),
        this.checkEnvironment()
      ]);

      // Determine overall status
      const results = [database, redis, cloudinary, cacheService, systemResources, environment];
      const criticalServices = [database, environment];
      const importantServices = [redis, cloudinary, cacheService];
      
      let overallStatus = 'healthy';
      
      // Check critical services
      if (criticalServices.some(result => result.status === 'rejected' || result.value?.status === 'critical')) {
        overallStatus = 'critical';
      } else if (criticalServices.some(result => result.status === 'rejected' || result.value?.status === 'unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (importantServices.some(result => result.status === 'rejected' || result.value?.status === 'unhealthy')) {
        overallStatus = 'degraded';
      }

      const responseTime = Date.now() - start;
      
      const healthReport = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        responseTime,
        services: {
          database: database.status === 'fulfilled' ? database.value : { status: 'error', error: database.reason?.message },
          redis: redis.status === 'fulfilled' ? redis.value : { status: 'error', error: redis.reason?.message },
          cloudinary: cloudinary.status === 'fulfilled' ? cloudinary.value : { status: 'error', error: cloudinary.reason?.message },
          cacheService: cacheService.status === 'fulfilled' ? cacheService.value : { status: 'error', error: cacheService.reason?.message },
          systemResources: systemResources.status === 'fulfilled' ? systemResources.value : { status: 'error', error: systemResources.reason?.message },
          environment: environment.status === 'fulfilled' ? environment.value : { status: 'error', error: environment.reason?.message }
        },
        summary: {
          total: results.length,
          healthy: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'healthy').length,
          unhealthy: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'unhealthy').length,
          critical: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'critical').length,
          disabled: results.filter(r => r.status === 'fulfilled' && r.value?.status === 'disabled').length,
          errors: results.filter(r => r.status === 'rejected').length
        }
      };

      // Log health check results
      if (overallStatus === 'healthy') {
        console.log('Full health check completed successfully', { overallStatus, responseTime });
      } else if (overallStatus === 'degraded') {
        console.warn('Full health check shows degraded service', { overallStatus, responseTime });
      } else {
        console.error('Full health check shows critical issues', { overallStatus, responseTime });
      }

      return healthReport;
    } catch (error) {
      const responseTime = Date.now() - start;
      console.error('Full health check failed', { error: error.message, responseTime });
      
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime
      };
    }
  }

  // Quick health check (lightweight)
  static async getQuickHealth() {
    try {
      const database = await this.checkDatabase();
      const environment = await this.checkEnvironment();
      
      const overallStatus = (database.status === 'healthy' && environment.status === 'healthy') 
        ? 'healthy' 
        : 'unhealthy';
      
      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          database,
          environment
        }
      };
    } catch (error) {
      console.error('Quick health check failed', { error: error.message });
      
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Health check for specific service
  static async checkService(serviceName) {
    const serviceChecks = {
      database: this.checkDatabase,
      redis: this.checkRedis,
      cloudinary: this.checkCloudinary,
      cache: this.checkCacheService,
      system: this.checkSystemResources,
      environment: this.checkEnvironment
    };

    if (!serviceChecks[serviceName]) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    return await serviceChecks[serviceName]();
  }

  // Get health check statistics
  static async getHealthStats() {
    try {
      const fullHealth = await this.getFullHealth();
      
      return {
        lastCheck: fullHealth.timestamp,
        overallStatus: fullHealth.status,
        responseTime: fullHealth.responseTime,
        summary: fullHealth.summary,
        uptime: process.uptime(),
        environment: config.app.env,
        version: process.version
      };
    } catch (error) {
      console.error('Health stats failed', { error: error.message });
      
      return {
        error: error.message,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.version
      };
    }
  }
}

// Export convenience functions
export const healthCheck = HealthService.getFullHealth.bind(HealthService);
export const quickHealth = HealthService.getQuickHealth.bind(HealthService);
export const checkService = HealthService.checkService.bind(HealthService);
export const getHealthStats = HealthService.getHealthStats.bind(HealthService);

export default HealthService;
