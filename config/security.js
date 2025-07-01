/**
 * Security configuration for different environments
 */

const securityConfig = {
  development: {
    // Development environment - more permissive for debugging
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000 // Higher limit for development
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      cookie: {
        secure: false, // HTTP in development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    },
    logging: {
      level: 'debug',
      logSuspiciousActivity: true
    }
  },
  
  production: {
    // Production environment - strict security
    corsOrigins: [
      // Add your production domains here
      // 'https://yourdomain.com',
      // 'https://www.yourdomain.com'
    ],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100 // Lower limit for production
    },
    session: {
      secret: process.env.SESSION_SECRET,
      cookie: {
        secure: true, // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    },
    logging: {
      level: 'warn',
      logSuspiciousActivity: true
    }
  },
  
  test: {
    // Test environment - minimal security for testing
    corsOrigins: ['http://localhost:3000'],
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10000 // Very high limit for testing
    },
    session: {
      secret: 'test-secret-key',
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    },
    logging: {
      level: 'error',
      logSuspiciousActivity: false
    }
  }
};

// Get current environment configuration
const getSecurityConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return securityConfig[env] || securityConfig.development;
};

// Security constants
const SECURITY_CONSTANTS = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SPECIAL_CHARS: true,
  
  // JWT settings
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: ['pdf', 'mp3', 'mp4', 'jpg', 'jpeg', 'png'],
  
  // Session settings
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // API rate limiting
  API_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
};

// Input validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  URL: /^https?:\/\/.+/,
  FILENAME: /^[a-zA-Z0-9._-]+$/
};

// Blacklisted patterns for security
const BLACKLISTED_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /union\s+select/gi,
  /drop\s+table/gi,
  /delete\s+from/gi,
  /insert\s+into/gi,
  /update\s+set/gi,
  /--/g,
  /\/\*/g,
  /eval\s*\(/gi,
  /document\./gi,
  /window\./gi,
  /alert\s*\(/gi,
  /confirm\s*\(/gi,
  /prompt\s*\(/gi
];

module.exports = {
  getSecurityConfig,
  SECURITY_CONSTANTS,
  VALIDATION_PATTERNS,
  BLACKLISTED_PATTERNS
}; 