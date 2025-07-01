const multer = require('multer');

// Allowed file types
const ALLOWED_FILE_TYPES = {
  // Books
  'application/pdf': '.pdf',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'text/plain': '.txt',
  'application/epub+zip': '.epub',
  
  // Images
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  book: 50 * 1024 * 1024, // 50MB for books
  image: 5 * 1024 * 1024,  // 5MB for images
  default: 10 * 1024 * 1024 // 10MB default
};

// File validation middleware
const validateFile = (fileType = 'default') => {
  return (req, res, next) => {
    console.log('File validation started:', {
      fileType,
      hasFile: !!req.file,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    if (!req.file) {
      console.log('Validation failed: No file uploaded');
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const file = req.file;
    const maxSize = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;

    // Check file size
    if (file.size > maxSize) {
      console.log('Validation failed: File too large', { size: file.size, maxSize });
      return res.status(400).json({
        error: 'File too large',
        message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
      });
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
      console.log('Validation failed: Invalid file type', { mimetype: file.mimetype, allowedTypes: Object.keys(ALLOWED_FILE_TYPES) });
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'File type not allowed. Please upload a valid file.',
        allowedTypes: Object.values(ALLOWED_FILE_TYPES).join(', ')
      });
    }

    // Additional security checks
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      console.log('Validation failed: Invalid filename', { originalname: file.originalname });
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename contains invalid characters'
      });
    }

    // Check for potential malicious content in filename
    const maliciousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|dll|so|dylib)$/i;
    if (maliciousPatterns.test(file.originalname)) {
      console.log('Validation failed: Potentially malicious file', { originalname: file.originalname });
      return res.status(400).json({
        error: 'Potentially malicious file',
        message: 'This file type is not allowed for security reasons'
      });
    }

    console.log('File validation passed');
    next();
  };
};

// Multer configuration with file filtering
const createMulterConfig = (fileType = 'default') => {
  const maxSize = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
  
  return multer({
    limits: {
      fileSize: maxSize,
      files: 1 // Only allow 1 file at a time
    },
    fileFilter: (req, file, cb) => {
      // Check if file type is allowed
      if (!ALLOWED_FILE_TYPES[file.mimetype]) {
        return cb(new Error('Invalid file type'), false);
      }

      // Check for malicious patterns in filename
      const maliciousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|dll|so|dylib)$/i;
      if (maliciousPatterns.test(file.originalname)) {
        return cb(new Error('Potentially malicious file'), false);
      }

      cb(null, true);
    }
  });
};

module.exports = {
  validateFile,
  createMulterConfig,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
}; 