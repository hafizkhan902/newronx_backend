import mongoose from 'mongoose';

export class DatabaseService {
  // Performance monitoring
  static queryMetrics = new Map();
  static slowQueryThreshold = 100; // ms
  static maxQueryTime = 5000; // ms

  // Connection pool monitoring
  static poolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0
  };

  // Query caching for performance
  static queryCache = new Map();
  static cacheTTL = 5 * 60 * 1000; // 5 minutes

  // ===== ENHANCED QUERY METHODS WITH PERFORMANCE MONITORING =====

  // Generic find one with population and performance tracking
  static async findOne(model, query, populate = [], options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      // Check cache first if enabled
      if (options.useCache !== false) {
        const cacheKey = this.generateCacheKey('findOne', model.modelName, query, populate, options);
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          this.trackQueryPerformance(queryId, 'findOne-cached', Date.now() - startTime, model.modelName, query);
          return cached.data;
        }
      }

      let queryBuilder = model.findOne(query);
      
      // Apply population with optimization
      populate.forEach(field => {
        if (typeof field === 'string') {
          queryBuilder = queryBuilder.populate(field);
        } else if (typeof field === 'object') {
          queryBuilder = queryBuilder.populate(field);
        }
      });
      
      // Apply options with performance optimization
      if (options.select) {
        queryBuilder = queryBuilder.select(options.select);
      }
      
      if (options.lean) {
        queryBuilder = queryBuilder.lean();
      }

      // Add query hints for index optimization
      if (options.hint) {
        queryBuilder = queryBuilder.hint(options.hint);
      }

      // Add explain for performance analysis
      if (options.explain) {
        const explanation = await queryBuilder.explain('executionStats');
        this.logQueryPerformance(queryId, 'explain', Date.now() - startTime, explanation);
        return explanation;
      }
      
      const result = await queryBuilder.exec();
      
      // Cache result if enabled
      if (options.useCache !== false) {
        const cacheKey = this.generateCacheKey('findOne', model.modelName, query, populate, options);
        this.queryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'findOne', duration, model.modelName, query);
      
      return result;
    } catch (error) {
      this.trackQueryError(queryId, 'findOne', error, model.modelName, query);
      throw new Error(`Database findOne failed: ${error.message}`);
    }
  }

  // Generic find many with advanced pagination and performance optimization
  static async findMany(model, query = {}, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const {
        populate = [],
        select = null,
        sort = { createdAt: -1 },
        page = 1,
        limit = 10,
        lean = false,
        skip = null,
        hint = null,
        explain = false,
        maxTimeMS = 30000 // 30 second timeout
      } = options;

      let queryBuilder = model.find(query);
      
      // Apply population with optimization
      populate.forEach(field => {
        if (typeof field === 'string') {
          queryBuilder = queryBuilder.populate(field);
        } else if (typeof field === 'object') {
          queryBuilder = queryBuilder.populate(field);
        }
      });
      
      // Apply selection with field optimization
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }
      
      // Apply sorting with index optimization
      if (sort) {
        queryBuilder = queryBuilder.sort(sort);
      }
      
      // Apply pagination with cursor-based optimization for large datasets
      if (skip !== null) {
        queryBuilder = queryBuilder.skip(skip);
      } else if (page && limit) {
        // Use cursor-based pagination for better performance
        if (page > 1 && options.lastId) {
          queryBuilder = queryBuilder.where('_id').gt(options.lastId);
        } else {
          queryBuilder = queryBuilder.skip((page - 1) * limit);
        }
      }
      
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }
      
      // Apply lean option for better performance
      if (lean) {
        queryBuilder = queryBuilder.lean();
      }

      // Add query hints for index optimization
      if (hint) {
        queryBuilder = queryBuilder.hint(hint);
      }

      // Add max time for query timeout
      queryBuilder = queryBuilder.maxTimeMS(maxTimeMS);

      // Add explain for performance analysis
      if (explain) {
        const explanation = await queryBuilder.explain('executionStats');
        this.logQueryPerformance(queryId, 'explain', Date.now() - startTime, explanation);
        return explanation;
      }
      
      const results = await queryBuilder.exec();
      
      // Get total count with optimization
      let total = null;
      if (page && limit && !options.lastId) {
        // Use estimated count for better performance on large collections
        if (options.useEstimatedCount) {
          total = await model.estimatedDocumentCount();
        } else {
          total = await model.countDocuments(query).maxTimeMS(10000);
        }
      }
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'findMany', duration, model.modelName, query, results.length);
      
      return {
        results,
        total,
        page,
        limit,
        totalPages: total ? Math.ceil(total / limit) : null,
        queryId,
        performance: {
          duration,
          resultCount: results.length,
          estimatedTotal: total
        }
      };
    } catch (error) {
      this.trackQueryError(queryId, 'findMany', error, model.modelName, query);
      throw new Error(`Database findMany failed: ${error.message}`);
    }
  }

  // Enhanced create with validation and performance tracking
  static async create(model, data, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const document = new model(data);
      
      // Apply validation options
      if (options.validate !== false) {
        await document.validate();
      }
      
      const result = await document.save(options);
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'create', duration, model.modelName, { operation: 'create' });
      
      return result;
    } catch (error) {
      this.trackQueryError(queryId, 'create', error, model.modelName, { operation: 'create' });
      throw new Error(`Database create failed: ${error.message}`);
    }
  }

  // Enhanced update with performance tracking and optimization
  static async update(model, query, updateData, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const {
        upsert = false,
        multi = false,
        returnNew = false,
        runValidators = true,
        hint = null
      } = options;

      let updateBuilder = model.updateMany(query, updateData, {
        upsert,
        multi,
        new: returnNew,
        runValidators
      });

      // Add query hints for index optimization
      if (hint) {
        updateBuilder = updateBuilder.hint(hint);
      }

      const result = await updateBuilder.exec();
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'update', duration, model.modelName, query, result.modifiedCount);
      
      return result;
    } catch (error) {
      this.trackQueryError(queryId, 'update', error, model.modelName, query);
      throw new Error(`Database update failed: ${error.message}`);
    }
  }

  // Enhanced delete with performance tracking
  static async delete(model, query, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const { hint = null } = options;
      
      let deleteBuilder = model.deleteMany(query);
      
      // Add query hints for index optimization
      if (hint) {
        deleteBuilder = deleteBuilder.hint(hint);
      }

      const result = await deleteBuilder.exec();
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'delete', duration, model.modelName, query, result.deletedCount);
      
      return result;
    } catch (error) {
      this.trackQueryError(queryId, 'delete', error, model.modelName, query);
      throw new Error(`Database delete failed: ${error.message}`);
    }
  }

  // ===== ADVANCED QUERY OPTIMIZATION METHODS =====

  // Aggregation with performance optimization
  static async aggregate(model, pipeline, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const {
        hint = null,
        maxTimeMS = 60000, // 60 second timeout for aggregations
        allowDiskUse = false,
        explain = false
      } = options;

      let aggregationBuilder = model.aggregate(pipeline);

      // Add query hints for index optimization
      if (hint) {
        aggregationBuilder = aggregationBuilder.hint(hint);
      }

      // Add performance options
      aggregationBuilder = aggregationBuilder.maxTimeMS(maxTimeMS);
      aggregationBuilder = aggregationBuilder.allowDiskUse(allowDiskUse);

      // Add explain for performance analysis
      if (explain) {
        const explanation = await aggregationBuilder.explain('executionStats');
        this.logQueryPerformance(queryId, 'explain', Date.now() - startTime, explanation);
        return explanation;
      }

      const results = await aggregationBuilder.exec();
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'aggregate', duration, model.modelName, { pipeline }, results.length);
      
      return results;
    } catch (error) {
      this.trackQueryError(queryId, 'aggregate', error, model.modelName, { pipeline });
      throw new Error(`Database aggregation failed: ${error.message}`);
    }
  }

  // Bulk operations for better performance
  static async bulkWrite(model, operations, options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const {
        ordered = false, // Unordered for better performance
        writeConcern = null
      } = options;

      const bulkOptions = { ordered };
      if (writeConcern) bulkOptions.writeConcern = writeConcern;

      const result = await model.bulkWrite(operations, bulkOptions);
      
      // Track query performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryId, 'bulkWrite', duration, model.modelName, { operations }, result.insertedCount + result.modifiedCount);
      
      return result;
    } catch (error) {
      this.trackQueryError(queryId, 'bulkWrite', error, model.modelName, { operations });
      throw new Error(`Database bulkWrite failed: ${error.message}`);
    }
  }

  // ===== PERFORMANCE MONITORING METHODS =====

  // Track query performance
  static trackQueryPerformance(queryId, operation, duration, modelName, query, resultCount = 0) {
    const metric = {
      queryId,
      operation,
      duration,
      modelName,
      query: JSON.stringify(query).substring(0, 200), // Truncate long queries
      resultCount,
      timestamp: new Date(),
      isSlow: duration > this.slowQueryThreshold
    };

    this.queryMetrics.set(queryId, metric);

    // Log slow queries
    if (metric.isSlow) {
      console.warn(`🐌 Slow query detected: ${operation} on ${modelName} took ${duration}ms`, {
        queryId,
        duration,
        modelName,
        operation
      });
    }

    // Clean up old metrics (keep last 1000)
    if (this.queryMetrics && this.queryMetrics.size > 1000) {
      const keys = Array.from(this.queryMetrics.keys());
      keys.slice(0, 100).forEach(key => this.queryMetrics.delete(key));
    }
  }

  // Track query errors
  static trackQueryError(queryId, operation, error, modelName, query) {
    const errorMetric = {
      queryId,
      operation,
      error: error.message,
      modelName,
      query: JSON.stringify(query).substring(0, 200),
      timestamp: new Date(),
      stack: error.stack
    };

    console.error(`❌ Database query error: ${operation} on ${modelName}`, errorMetric);
  }

  // Log query performance for analysis
  static logQueryPerformance(queryId, operation, duration, data) {
    console.log(`📊 Query performance: ${operation} took ${duration}ms`, {
      queryId,
      duration,
      data: data ? JSON.stringify(data).substring(0, 500) : null
    });
  }

  // ===== CONNECTION POOL MONITORING =====

  // Get connection pool statistics
  static getPoolStats() {
    const connection = mongoose.connection;
    if (connection && connection.db) {
      // Safely access pool properties
      const pool = connection.pool;
      if (pool) {
        this.poolStats = {
          totalConnections: pool.size || 0,
          activeConnections: pool.available || 0,
          idleConnections: (pool.size || 0) - (pool.available || 0),
          waitingRequests: pool.pending || 0
        };
      } else {
        // Pool not available, use default values
        this.poolStats = {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingRequests: 0
        };
      }
    } else {
      // Connection not ready, use default values
      this.poolStats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0
      };
    }
    return this.poolStats;
  }

  // Monitor connection pool health
  static async monitorPoolHealth() {
    const stats = this.getPoolStats();
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      ...stats
    };

    // Check for connection pool issues
    if (stats.waitingRequests > 10) {
      health.status = 'warning';
      health.message = 'High number of waiting requests';
    }

    if (stats.activeConnections === 0 && stats.totalConnections > 0) {
      health.status = 'critical';
      health.message = 'No active connections available';
    }

    return health;
  }

  // ===== UTILITY METHODS =====

  // Generate unique query ID
  static generateQueryId() {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate cache key for query results
  static generateCacheKey(operation, modelName, query, populate, options) {
    const queryString = JSON.stringify(query);
    const populateString = JSON.stringify(populate);
    const optionsString = JSON.stringify(options);
    return `${operation}_${modelName}_${queryString}_${populateString}_${optionsString}`;
  }

  // Get query performance metrics
  static getQueryMetrics() {
    const metrics = Array.from(this.queryMetrics.values());
    
    // Handle case where there are no metrics
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        slowestQuery: { duration: 0 },
        queriesByModel: {},
        queriesByOperation: {}
      };
    }
    
    const summary = {
      totalQueries: metrics.length,
      slowQueries: metrics.filter(m => m.isSlow).length,
      averageDuration: Math.round(metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length),
      slowestQuery: metrics.reduce((max, m) => (m.duration || 0) > (max.duration || 0) ? m : max, { duration: 0 }),
      queriesByModel: {},
      queriesByOperation: {}
    };

    // Group by model
    metrics.forEach(m => {
      if (m.modelName) {
        summary.queriesByModel[m.modelName] = (summary.queriesByModel[m.modelName] || 0) + 1;
      }
    });

    // Group by operation
    metrics.forEach(m => {
      if (m.operation) {
        summary.queriesByOperation[m.operation] = (summary.queriesByOperation[m.operation] || 0) + 1;
      }
    });

    return summary;
  }

  // Clear query metrics
  static clearQueryMetrics() {
    this.queryMetrics.clear();
  }

  // Clear query cache
  static clearQueryCache() {
    this.queryCache.clear();
  }

  // Get database health status
  static async getHealthStatus() {
    try {
      const poolHealth = await this.monitorPoolHealth();
      const queryMetrics = this.getQueryMetrics();
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        connection: poolHealth,
        performance: queryMetrics,
        recommendations: this.generateOptimizationRecommendations(queryMetrics)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  // Generate optimization recommendations
  static generateOptimizationRecommendations(metrics) {
    const recommendations = [];

    if (metrics.slowQueries > metrics.totalQueries * 0.1) {
      recommendations.push('More than 10% of queries are slow. Consider adding database indexes.');
    }

    if (metrics.averageDuration > 100) {
      recommendations.push('Average query duration is high. Review query patterns and indexes.');
    }

    if (metrics.queriesByModel) {
      Object.entries(metrics.queriesByModel).forEach(([model, count]) => {
        if (count > 100) {
          recommendations.push(`High query volume on ${model}. Consider implementing caching.`);
        }
      });
    }

    return recommendations;
  }
}

// Export convenience functions
export const findOne = DatabaseService.findOne.bind(DatabaseService);
export const findMany = DatabaseService.findMany.bind(DatabaseService);
export const create = DatabaseService.create.bind(DatabaseService);
export const update = DatabaseService.update.bind(DatabaseService);
export const deleteDoc = DatabaseService.delete.bind(DatabaseService);
export const aggregate = DatabaseService.aggregate.bind(DatabaseService);
export const bulkWrite = DatabaseService.bulkWrite.bind(DatabaseService);
export const getQueryMetrics = DatabaseService.getQueryMetrics.bind(DatabaseService);
export const getHealthStatus = DatabaseService.getHealthStatus.bind(DatabaseService);
export const monitorPoolHealth = DatabaseService.monitorPoolHealth.bind(DatabaseService);
export const clearQueryCache = DatabaseService.clearQueryCache.bind(DatabaseService);
