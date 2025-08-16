import fs from 'fs';
import path from 'path';

export class LoggerService {
  static logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  static currentLevel = LoggerService.logLevels['info']; // Default to info level

  // Main logging method - optimized for performance
  static async log(level, message, meta = {}) {
    if (LoggerService.logLevels[level] > LoggerService.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };

    // Add request context if available
    if (meta.req) {
      logEntry.request = {
        method: meta.req.method,
        url: meta.req.originalUrl,
        ip: meta.req.ip,
        userAgent: meta.req.get('User-Agent'),
        userId: meta.req.user?._id || 'unauthenticated'
      };
      delete meta.req; // Remove from meta to avoid duplication
    }

    // Add error details if available
    if (meta.error) {
      logEntry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
        code: meta.error.code
      };
      delete meta.error; // Remove from meta to avoid duplication
    }

    // Format log entry
    const formattedLog = LoggerService.formatLog(logEntry, level);

    // Always output to console for immediate visibility
    LoggerService.consoleOutput(level, formattedLog);

    // Try to output to file if config is available (non-blocking)
    LoggerService.tryFileOutput(level, formattedLog).catch(() => {
      // Silently fail if file output fails
    });
  }

  // Non-blocking file output attempt
  static async tryFileOutput(level, formattedLog) {
    try {
      const { config } = await import('../config/index.js');
      if (config.logging.enableFile) {
        await LoggerService.fileOutput(level, formattedLog);
      }
    } catch (error) {
      // Silently fail - don't block logging
    }
  }

  // Console output with colors - optimized
  static consoleOutput(level, logEntry) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m'  // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    // Always use JSON format for consistency and performance
    console.log(`${color}${JSON.stringify(logEntry)}${reset}`);
  }

  // File output
  static async fileOutput(level, logEntry) {
    try {
      const { config } = await import('../config/index.js');
      const logDir = path.dirname(config.logging.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(config.logging.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Format log entry
  static formatLog(logEntry, level) {
    // Always return JSON format for consistency
    return logEntry;
  }

  // Log level methods
  static async error(message, error = null, meta = {}) {
    await LoggerService.log('error', message, { ...meta, error });
  }

  static async warn(message, meta = {}) {
    await LoggerService.log('warn', message, meta);
  }

  static async info(message, meta = {}) {
    await LoggerService.log('info', message, meta);
  }

  static async debug(message, meta = {}) {
    await LoggerService.log('debug', message, meta);
  }

  // Request logging - optimized for performance
  static logRequest(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      
      // Non-blocking log call
      LoggerService.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
        req,
        duration,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length') || 0
      }).catch(() => {
        // Silently fail if logging fails - don't affect response
      });
    });

    next();
  }

  // Error logging with context
  static logError(error, req = null, meta = {}) {
    LoggerService.error(error.message, error, {
      ...meta,
      req,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
  }

  // Database operation logging
  static logDatabase(operation, collection, duration, success = true, meta = {}) {
    const level = success ? 'debug' : 'error';
    LoggerService.log(level, `Database ${operation} on ${collection}`, {
      operation,
      collection,
      duration,
      success,
      ...meta
    });
  }

  // File operation logging
  static logFileOperation(operation, filename, success = true, meta = {}) {
    const level = success ? 'info' : 'error';
    LoggerService.log(level, `File ${operation}: ${filename}`, {
      operation,
      filename,
      success,
      ...meta
    });
  }

  // Authentication logging
  static logAuth(action, userId, success = true, meta = {}) {
    const level = success ? 'info' : 'warn';
    LoggerService.log(level, `Authentication ${action}`, {
      action,
      userId,
      success,
      ip: meta.ip,
      userAgent: meta.userAgent,
      ...meta
    });
  }

  // Performance logging
  static logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'debug';
    LoggerService.log(level, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...meta
    });
  }

  // Security logging
  static logSecurity(event, details, meta = {}) {
    LoggerService.warn(`Security event: ${event}`, {
      event,
      details,
      ip: meta.ip,
      userAgent: meta.userAgent,
      userId: meta.userId,
      ...meta
    });
  }

  // Business logic logging
  static logBusiness(action, entity, entityId, userId = null, meta = {}) {
    LoggerService.info(`Business action: ${action}`, {
      action,
      entity,
      entityId,
      userId,
      ...meta
    });
  }

  // API usage logging
  static logApiUsage(endpoint, method, userId = null, meta = {}) {
    LoggerService.debug(`API usage: ${method} ${endpoint}`, {
      endpoint,
      method,
      userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      ...meta
    });
  }

  // Clean up old log files
  static async cleanupOldLogs() {
    try {
      const { config } = await import('../config/index.js');
      if (!config.logging.enableFile) return;

      const logDir = path.dirname(config.logging.logFile);
      if (!fs.existsSync(logDir)) return;

      const files = fs.readdirSync(logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      if (logFiles.length <= config.logging.maxLogFiles) return;

      // Sort by modification time and remove old files
      const sortedFiles = logFiles
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const filesToRemove = sortedFiles.slice(config.logging.maxLogFiles);
      
      for (const file of filesToRemove) {
        fs.unlinkSync(file.path);
        LoggerService.info(`Removed old log file: ${file.name}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  // Get log statistics
  static async getLogStats() {
    try {
      const { config } = await import('../config/index.js');
      if (!config.logging.enableFile || !fs.existsSync(config.logging.logFile)) {
        return { error: 'Log file not found' };
      }

      const stats = fs.statSync(config.logging.logFile);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: config.logging.logFile
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Set log level dynamically
  static setLogLevel(level) {
    if (LoggerService.logLevels.hasOwnProperty(level)) {
      LoggerService.currentLevel = LoggerService.logLevels[level];
      LoggerService.info(`Log level changed to: ${level}`);
    } else {
      LoggerService.warn(`Invalid log level: ${level}`);
    }
  }

  // Health check for monitoring
  static async healthCheck() {
    try {
      const { config } = await import('../config/index.js');
      return {
        status: 'healthy',
        level: LoggerService.currentLevel,
        consoleEnabled: config.logging.enableConsole,
        fileEnabled: config.logging.enableFile,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message,
        level: LoggerService.currentLevel,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export convenience functions
export const logger = LoggerService;
export const logError = LoggerService.logError.bind(LoggerService);
export const logRequest = LoggerService.logRequest.bind(LoggerService);
export const logDatabase = LoggerService.logDatabase.bind(LoggerService);
export const logFileOperation = LoggerService.logFileOperation.bind(LoggerService);
export const logAuth = LoggerService.logAuth.bind(LoggerService);
export const logPerformance = LoggerService.logPerformance.bind(LoggerService);
export const logSecurity = LoggerService.logSecurity.bind(LoggerService);
export const logBusiness = LoggerService.logBusiness.bind(LoggerService);
export const logApiUsage = LoggerService.logApiUsage.bind(LoggerService);

export default LoggerService;
