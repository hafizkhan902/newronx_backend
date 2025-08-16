import { createClient } from 'redis';

export class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour
    this.maxTTL = 86400; // 24 hours
    
    // Initialize Redis if available
    this.checkAndInitialize();
  }

  async checkAndInitialize() {
    try {
      const { isFeatureEnabled } = await import('../config/index.js');
      if (isFeatureEnabled('redis')) {
        await this.initialize();
      }
    } catch (error) {
      console.log('Redis not available, skipping initialization');
    }
  }

  // Initialize Redis connection
  async initialize() {
    try {
      const { config } = await import('../config/index.js');
      this.client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 10000,
          lazyConnect: true
        }
      });

      // Handle connection events
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('ready', () => {
        logger.info('Redis ready for operations');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis connection ended');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis cache service', error);
      this.isConnected = false;
    }
  }

  // Check if cache is available
  isAvailable() {
    return this.isConnected && this.client;
  }

  // Generate cache key with prefix
  async generateKey(key) {
    try {
      const { config } = await import('../config/index.js');
      return `${config.redis.keyPrefix}${key}`;
    } catch (error) {
      return `studentmate:${key}`;
    }
  }

  // Set cache value
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping set operation', { key });
      return false;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setEx(cacheKey, ttl, serializedValue);
      } else {
        await this.client.set(cacheKey, serializedValue);
      }

      console.log('Cache set successful', { key: cacheKey, ttl });
      return true;
    } catch (error) {
      console.error('Cache set failed', { key, error: error.message });
      return false;
    }
  }

  // Get cache value
  async get(key) {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping get operation', { key });
      return null;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const value = await this.client.get(cacheKey);
      
      if (value) {
        console.log('Cache hit', { key: cacheKey });
        return JSON.parse(value);
      } else {
        console.log('Cache miss', { key: cacheKey });
        return null;
      }
    } catch (error) {
      console.error('Cache get failed', { key, error: error.message });
      return null;
    }
  }

  // Delete cache key
  async delete(key) {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping delete operation', { key });
      return false;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.del(cacheKey);
      
      console.log('Cache delete successful', { key: cacheKey, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      console.error('Cache delete failed', { key, error: error.message });
      return false;
    }
  }

  // Delete multiple keys
  async deleteMultiple(keys) {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping delete multiple operation', { keys });
      return 0;
    }

    try {
      const cacheKeys = await Promise.all(keys.map(key => this.generateKey(key)));
      const result = await this.client.del(cacheKeys);
      
      console.log('Cache delete multiple successful', { keys: cacheKeys, deleted: result });
      return result;
    } catch (error) {
      console.error('Cache delete multiple failed', { keys, error: error.message });
      return 0;
    }
  }

  // Check if key exists
  async exists(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists check failed', { key, error: error.message });
      return false;
    }
  }

  // Get TTL for a key
  async getTTL(key) {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const ttl = await this.client.ttl(cacheKey);
      return ttl;
    } catch (error) {
      console.error('Cache TTL check failed', { key, error: error.message });
      return -1;
    }
  }

  // Set TTL for existing key
  async setTTL(key, ttl) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.expire(cacheKey, ttl);
      
      console.log('Cache TTL set successful', { key: cacheKey, ttl, result });
      return result;
    } catch (error) {
      console.error('Cache TTL set failed', { key, ttl, error: error.message });
      return false;
    }
  }

  // Increment counter
  async increment(key, amount = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.incrBy(cacheKey, amount);
      
      console.log('Cache increment successful', { key: cacheKey, amount, result });
      return result;
    } catch (error) {
      console.error('Cache increment failed', { key, amount, error: error.message });
      return null;
    }
  }

  // Decrement counter
  async decrement(key, amount = 1) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.decrBy(cacheKey, amount);
      
      console.log('Cache decrement successful', { key: cacheKey, amount, result });
      return result;
    } catch (error) {
      console.error('Cache decrement failed', { key, amount, error: error.message });
      return null;
    }
  }

  // Get counter value
  async getCounter(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const value = await this.client.get(cacheKey);
      return value ? parseInt(value) : 0;
    } catch (error) {
      console.error('Cache get counter failed', { key, error: error.message });
      return null;
    }
  }

  // Set counter with TTL
  async setCounter(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = await this.generateKey(key);
      const result = await this.client.setEx(cacheKey, ttl, value.toString());
      
      console.log('Cache counter set successful', { key: cacheKey, value, ttl });
      return result === 'OK';
    } catch (error) {
      console.error('Cache counter set failed', { key, value, ttl, error: error.message });
      return false;
    }
  }

  // Get or set with callback (cache-aside pattern)
  async getOrSet(key, callback, ttl = this.defaultTTL) {
    let value = await this.get(key);
    
    if (value === null) {
      try {
        value = await callback();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      } catch (error) {
        console.error('Cache getOrSet callback failed', { key, error: error.message });
        throw error;
      }
    }
    
    return value;
  }

  // Invalidate keys by pattern
  async invalidatePattern(pattern) {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping pattern invalidation', { pattern });
      return 0;
    }

    try {
      const searchPattern = await this.generateKey(pattern);
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length > 0) {
        const result = await this.client.del(keys);
        console.log('Cache pattern invalidation successful', { pattern: searchPattern, keys: keys.length, deleted: result });
        return result;
      }
      
      return 0;
    } catch (error) {
      console.error('Cache pattern invalidation failed', { pattern, error: error.message });
      return 0;
    }
  }

  // Clear all cache
  async clearAll() {
    if (!this.isAvailable()) {
      console.log('Cache not available, skipping clear all operation');
      return false;
    }

    try {
      const pattern = await this.generateKey('*');
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        const result = await this.client.del(keys);
        console.log('Cache clear all successful', { keys: keys.length, deleted: result });
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Cache clear all failed', { error: error.message });
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.isAvailable()) {
      return { error: 'Cache not available' };
    }

    try {
      const info = await this.client.info();
      const keys = await this.client.dbSize();
      
      return {
        connected: this.isConnected,
        keys,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache stats failed', { error: error.message });
      return { error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'unavailable', message: 'Cache service not initialized' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('Redis cache service shutdown successfully');
      } catch (error) {
        console.error('Redis cache service shutdown failed', { error: error.message });
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Export singleton and class
export default cacheService;
export { CacheService };

// Export convenience functions
export const cache = cacheService;
export const getCache = (key) => cacheService.get(key);
export const setCache = (key, value, ttl) => cacheService.set(key, value, ttl);
export const deleteCache = (key) => cacheService.delete(key);
export const invalidateCache = (pattern) => cacheService.invalidatePattern(pattern);
export const clearCache = () => cacheService.clearAll();
