const helmet = require('helmet');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "http://localhost:5000", "http://127.0.0.1:5000"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  xssFilter: true
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      // Add your production domains here
      // 'https://yourdomain.com',
      // 'https://www.yourdomain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Enhanced input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS vectors and SQL injection patterns
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/union\s+select/gi, '')
          .replace(/drop\s+table/gi, '')
          .replace(/delete\s+from/gi, '')
          .replace(/insert\s+into/gi, '')
          .replace(/update\s+set/gi, '')
          .replace(/--/g, '')
          .replace(/\/\*/g, '')
          .replace(/\*\//g, '')
          .trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/union\s+select/gi, '')
          .replace(/drop\s+table/gi, '')
          .replace(/delete\s+from/gi, '')
          .replace(/insert\s+into/gi, '')
          .replace(/update\s+set/gi, '')
          .replace(/--/g, '')
          .replace(/\/\*/g, '')
          .replace(/\*\//g, '')
          .trim();
      }
    });
  }

  next();
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }

  next();
};

// Rate limiting by IP address
const rateLimitByIP = new Map();
const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 100;

const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitByIP.has(clientIP)) {
    rateLimitByIP.set(clientIP, { count: 1, resetTime: now + rateLimitWindow });
  } else {
    const clientData = rateLimitByIP.get(clientIP);
    
    if (now > clientData.resetTime) {
      // Reset window
      clientData.count = 1;
      clientData.resetTime = now + rateLimitWindow;
    } else {
      clientData.count++;
      
      if (clientData.count > maxRequestsPerWindow) {
        return res.status(429).json({ 
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.'
        });
      }
    }
  }
  
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`${new Date().toISOString()} - ${clientIP} - ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

// Security audit logging
const securityAuditLogger = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i
  ];
  
  const requestString = JSON.stringify(req.body) + JSON.stringify(req.query);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn(`SUSPICIOUS ACTIVITY DETECTED - IP: ${clientIP}, User-Agent: ${userAgent}, Pattern: ${pattern}`);
      // In production, you might want to send this to a security monitoring service
    }
  }
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  console.error(`Error from ${clientIP}:`, err);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Something went wrong'
    });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
};

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitByIP.entries()) {
    if (now > data.resetTime) {
      rateLimitByIP.delete(ip);
    }
  }
}, 60 * 1000); // Clean up every minute

module.exports = {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  csrfProtection,
  rateLimitMiddleware,
  requestLogger,
  securityAuditLogger,
  errorHandler
}; 