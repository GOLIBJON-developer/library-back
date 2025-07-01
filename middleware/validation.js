const { body, param, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules for authentication
const authValidation = {
  signup: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ]
};

// Validation rules for books
const bookValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('author')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Author must be between 1 and 100 characters'),
    body('genre')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Genre must be between 1 and 50 characters'),
    body('fileType')
      .isIn(['pdf', 'mp3', 'mp4'])
      .withMessage('File type must be pdf, mp3, or mp4'),
    body('fileUrl')
      .matches(/^\/uploads\/books\/.+$/)
      .withMessage('File URL must be a valid upload path'),
    body('coverUrl')
      .optional()
      .matches(/^\/uploads\/covers\/.+$/)
      .withMessage('Cover URL must be a valid upload path'),
    body('year')
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
      .withMessage('Year must be between 1800 and ' + (new Date().getFullYear() + 5)),
    (req, res, next) => {
      console.log('=== BOOK VALIDATION ===');
      console.log('Request body:', req.body);
      console.log('Validation errors:', validationResult(req).array());
      handleValidationErrors(req, res, next);
    }
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('author')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Author must be between 1 and 100 characters'),
    body('genre')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Genre must be between 1 and 50 characters'),
    body('fileType')
      .optional()
      .isIn(['pdf', 'mp3', 'mp4'])
      .withMessage('File type must be pdf, mp3, or mp4'),
    body('fileUrl')
      .optional()
      .matches(/^\/uploads\/books\/.+$/)
      .withMessage('File URL must be a valid upload path'),
    body('coverUrl')
      .optional()
      .matches(/^\/uploads\/covers\/.+$/)
      .withMessage('Cover URL must be a valid upload path'),
    body('year')
      .optional()
      .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
      .withMessage('Year must be between 1800 and ' + (new Date().getFullYear() + 5)),
    handleValidationErrors
  ]
};

// Validation rules for events
const eventValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be between 1 and 1000 characters'),
    body('date')
      .isISO8601()
      .withMessage('Date must be a valid ISO date'),
    body('location')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Location must be between 1 and 200 characters'),
    body('image')
      .optional()
      .matches(/^\/uploads\/events\/.+$/)
      .withMessage('Image must be a valid upload path'),
    handleValidationErrors
  ],
  
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be between 1 and 1000 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO date'),
    body('location')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Location must be between 1 and 200 characters'),
    body('image')
      .optional()
      .matches(/^\/uploads\/events\/.+$/)
      .withMessage('Image must be a valid upload path'),
    handleValidationErrors
  ]
};

// Validation rules for chatbot
const chatbotValidation = {
  message: [
    body('message')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
    handleValidationErrors
  ]
};

// Validation rules for ID parameters
const idValidation = {
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format'),
    handleValidationErrors
  ]
};

// Validation rules for users
const userValidation = {
  delete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin'),
    handleValidationErrors
  ]
};

module.exports = {
  authValidation,
  bookValidation,
  eventValidation,
  chatbotValidation,
  idValidation,
  userValidation,
  handleValidationErrors
}; 