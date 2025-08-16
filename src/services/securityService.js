import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class SecurityService {
  // Password hashing
  static async hashPassword(password, saltRounds = null) {
    try {
      let rounds = saltRounds || 12;
      let minLength = 6;
      
      try {
        const { config } = await import('../config/index.js');
        rounds = saltRounds || config.security.bcryptRounds;
        minLength = config.security.passwordMinLength;
      } catch (error) {
        // Use defaults if config is not available
      }
      
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (password.length < minLength) {
        throw new Error(`Password must be at least ${minLength} characters long`);
      }

      const start = Date.now();
      const hash = await bcrypt.hash(password, rounds);
      const duration = Date.now() - start;

      console.log('Password hashed successfully', { 
        rounds, 
        duration,
        passwordLength: password.length 
      });

      return hash;
    } catch (error) {
      console.error('Password hashing failed', { error: error.message });
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  // Password comparison
  static async comparePassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      const start = Date.now();
      const isMatch = await bcrypt.compare(password, hash);
      const duration = Date.now() - start;

      console.log('Password comparison completed', { 
        isMatch, 
        duration 
      });

      return isMatch;
    } catch (error) {
      console.error('Password comparison failed', { error: error.message });
      return false;
    }
  }

  // Generate secure random token
  static generateSecureToken(length = 32) {
    try {
      if (length < 16) {
        throw new Error('Token length must be at least 16 characters');
      }

      const token = crypto.randomBytes(length).toString('hex');
      
      console.log('Secure token generated', { length });
      return token;
    } catch (error) {
      console.error('Secure token generation failed', { error: error.message });
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  // Generate OTP (One-Time Password)
  static generateOTP(length = null) {
    try {
      const otpLength = length || config.security.otpLength;
      
      if (otpLength < 4 || otpLength > 10) {
        throw new Error('OTP length must be between 4 and 10 characters');
      }

      const otp = Math.floor(Math.random() * Math.pow(10, otpLength))
        .toString()
        .padStart(otpLength, '0');

      console.log('OTP generated', { length: otpLength });
      return otp;
    } catch (error) {
      console.error('OTP generation failed', { error: error.message });
      throw new Error(`OTP generation failed: ${error.message}`);
    }
  }

  // Generate secure random string
  static generateRandomString(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    try {
      if (length < 1) {
        throw new Error('Length must be at least 1');
      }

      let result = '';
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      console.log('Random string generated', { length });
      return result;
    } catch (error) {
      console.error('Random string generation failed', { error: error.message });
      throw new Error(`Random string generation failed: ${error.message}`);
    }
  }

  // Generate UUID v4
  static generateUUID() {
    try {
      const uuid = crypto.randomUUID();
      console.log('UUID generated');
      return uuid;
    } catch (error) {
      console.error('UUID generation failed', { error: error.message });
      // Fallback to manual UUID generation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input) {
    try {
      if (typeof input !== 'string') {
        return input;
      }

      // Remove potential HTML tags and dangerous characters
      const sanitized = input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/data:/gi, '') // Remove data: protocol
        .trim();

      console.log('Input sanitized', { 
        originalLength: input.length, 
        sanitizedLength: sanitized.length 
      });

      return sanitized;
    } catch (error) {
      console.error('Input sanitization failed', { error: error.message });
      return input; // Return original input if sanitization fails
    }
  }

  // Sanitize object recursively
  static sanitizeObject(obj) {
    try {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitizeObject(item));
      }

      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeInput(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    } catch (error) {
      console.error('Object sanitization failed', { error: error.message });
      return obj; // Return original object if sanitization fails
    }
  }

  // Validate password strength
  static async validatePasswordStrength(password) {
    try {
      if (!password || typeof password !== 'string') {
        return { isValid: false, errors: ['Password is required'] };
      }

      let minLength = 6;
      try {
        const { config } = await import('../config/index.js');
        minLength = config.security.passwordMinLength;
      } catch (error) {
        // Use default if config is not available
      }

      const errors = [];
      const checks = {
        length: password.length >= minLength,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      };

      if (!checks.length) {
        errors.push(`Password must be at least ${minLength} characters long`);
      }
      if (!checks.lowercase) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!checks.uppercase) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!checks.numbers) {
        errors.push('Password must contain at least one number');
      }
      if (!checks.special) {
        errors.push('Password must contain at least one special character');
      }

      const isValid = errors.length === 0;
      const score = Object.values(checks).filter(Boolean).length;

      console.log('Password strength validation completed', { 
        isValid, 
        score, 
        errors: errors.length 
      });

      return {
        isValid,
        score,
        errors,
        checks
      };
    } catch (error) {
      console.error('Password strength validation failed', { error: error.message });
      return { isValid: false, errors: ['Password validation failed'] };
    }
  }

  // Generate password hash with salt
  static async generatePasswordHash(password, salt = null) {
    try {
      const validation = await this.validatePasswordStrength(password);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
      const hash = await this.hashPassword(password + generatedSalt);

      console.log('Password hash with salt generated');
      return {
        hash,
        salt: generatedSalt
      };
    } catch (error) {
      console.error('Password hash with salt generation failed', { error: error.message });
      throw new Error(`Password hash generation failed: ${error.message}`);
    }
  }

  // Verify password with salt
  static async verifyPasswordWithSalt(password, hash, salt) {
    try {
      if (!password || !hash || !salt) {
        return false;
      }

      const saltedPassword = password + salt;
      const isValid = await this.comparePassword(saltedPassword, hash);

      console.log('Password with salt verification completed', { isValid });
      return isValid;
    } catch (error) {
      console.error('Password with salt verification failed', { error: error.message });
      return false;
    }
  }

  // Generate secure file hash
  static generateFileHash(buffer, algorithm = 'sha256') {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Input must be a Buffer');
      }

      const hash = crypto.createHash(algorithm);
      hash.update(buffer);
      const fileHash = hash.digest('hex');

      console.log('File hash generated', { algorithm, hashLength: fileHash.length });
      return fileHash;
    } catch (error) {
      console.error('File hash generation failed', { error: error.message });
      throw new Error(`File hash generation failed: ${error.message}`);
    }
  }

  // Generate HMAC signature
  static generateHMAC(data, secret, algorithm = 'sha256') {
    try {
      if (!data || !secret) {
        throw new Error('Data and secret are required');
      }

      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(typeof data === 'string' ? data : JSON.stringify(data));
      const signature = hmac.digest('hex');

      console.log('HMAC signature generated', { algorithm });
      return signature;
    } catch (error) {
      console.error('HMAC signature generation failed', { error: error.message });
      throw new Error(`HMAC signature generation failed: ${error.message}`);
    }
  }

  // Verify HMAC signature
  static verifyHMAC(data, signature, secret, algorithm = 'sha256') {
    try {
      if (!data || !signature || !secret) {
        return false;
      }

      const expectedSignature = this.generateHMAC(data, secret, algorithm);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      console.log('HMAC signature verification completed', { isValid });
      return isValid;
    } catch (error) {
      console.error('HMAC signature verification failed', { error: error.message });
      return false;
    }
  }

  // Generate secure random bytes
  static generateRandomBytes(length = 32) {
    try {
      if (length < 1 || length > 1024) {
        throw new Error('Length must be between 1 and 1024 bytes');
      }

      const bytes = crypto.randomBytes(length);
      console.log('Random bytes generated', { length });
      return bytes;
    } catch (error) {
      console.error('Random bytes generation failed', { error: error.message });
      throw new Error(`Random bytes generation failed: ${error.message}`);
    }
  }

  // Encrypt text (AES-256-GCM)
  static encryptText(text, secretKey) {
    try {
      if (!text || !secretKey) {
        throw new Error('Text and secret key are required');
      }

      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };

      console.log('Text encrypted successfully');
      return result;
    } catch (error) {
      console.error('Text encryption failed', { error: error.message });
      throw new Error(`Text encryption failed: ${error.message}`);
    }
  }

  // Decrypt text (AES-256-GCM)
  static decryptText(encryptedData, secretKey) {
    try {
      if (!encryptedData || !secretKey) {
        throw new Error('Encrypted data and secret key are required');
      }

      const { encrypted, iv, authTag } = encryptedData;
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('Text decrypted successfully');
      return decrypted;
    } catch (error) {
      console.error('Text decryption failed', { error: error.message });
      throw new Error(`Text decryption failed: ${error.message}`);
    }
  }

  // Rate limiting helper
  static createRateLimitKey(identifier, action) {
    try {
      const key = `rate_limit:${action}:${identifier}`;
      console.log('Rate limit key created', { identifier, action, key });
      return key;
    } catch (error) {
      console.error('Rate limit key creation failed', { error: error.message });
      throw new Error(`Rate limit key creation failed: ${error.message}`);
    }
  }

  // Validate email format
  static validateEmail(email) {
    try {
      if (!email || typeof email !== 'string') {
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      console.log('Email validation completed', { email, isValid });
      return isValid;
    } catch (error) {
      console.error('Email validation failed', { error: error.message });
      return false;
    }
  }

  // Validate phone number format
  static validatePhone(phone) {
    try {
      if (!phone || typeof phone !== 'string') {
        return false;
      }

      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const isValid = phoneRegex.test(phone);

      console.log('Phone validation completed', { phone, isValid });
      return isValid;
    } catch (error) {
      console.error('Phone validation failed', { error: error.message });
      return false;
    }
  }

  // Log security event
  static logSecurityEvent(event, details, meta = {}) {
    try {
          console.warn(`Security event: ${event}`, {
      event,
      details,
      timestamp: new Date().toISOString(),
      ...meta
    });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

// Export convenience functions
export const hashPassword = SecurityService.hashPassword.bind(SecurityService);
export const comparePassword = SecurityService.comparePassword.bind(SecurityService);
export const generateSecureToken = SecurityService.generateSecureToken.bind(SecurityService);
export const generateOTP = SecurityService.generateOTP.bind(SecurityService);
export const sanitizeInput = SecurityService.sanitizeInput.bind(SecurityService);
export const validatePasswordStrength = SecurityService.validatePasswordStrength.bind(SecurityService);
export const generateFileHash = SecurityService.generateFileHash.bind(SecurityService);
export const generateHMAC = SecurityService.generateHMAC.bind(SecurityService);
export const verifyHMAC = SecurityService.verifyHMAC.bind(SecurityService);
export const validateEmail = SecurityService.validateEmail.bind(SecurityService);
export const validatePhone = SecurityService.validatePhone.bind(SecurityService);

export default SecurityService;
