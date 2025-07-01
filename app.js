const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { securityHeaders, corsOptions, sanitizeInput, requestLogger, errorHandler } = require('./middleware/security');
const path = require('path');

dotenv.config();

const app = express();

// Serve uploaded files statically with CORS headers (BEFORE security headers)
app.use('/uploads', (req, res, next) => {
  // Disable CSP for static files
  res.removeHeader('Content-Security-Policy');
  
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Allow all origins for static files in development
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/uploads/covers', (req, res, next) => {
  // Disable CSP for static files
  res.removeHeader('Content-Security-Policy');
  
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Allow all origins for static files in development
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads/covers')));

app.use('/uploads/events', (req, res, next) => {
  // Disable CSP for static files
  res.removeHeader('Content-Security-Policy');
  
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Allow all origins for static files in development
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads/events')));

// Security headers
app.use(securityHeaders);

// CORS with enhanced configuration
app.use(cors(corsOptions));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Specific rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 55, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/events', require('./routes/events'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug route to check environment variables
app.get('/api/debug/env', (req, res) => {
  res.json({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
    api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set',
    mongo_uri: process.env.MONGO_URI ? 'Set' : 'Not set',
    jwt_secret: process.env.JWT_SECRET ? 'Set' : 'Not set'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

module.exports = app; 