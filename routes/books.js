const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const { adminAuth, auth } = require('../middleware/auth');
// const cloudinary = require('../config/cloudinary');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { createMulterConfig, validateFile } = require('../middleware/fileValidation');
const { bookValidation, idValidation } = require('../middleware/validation');
const XLSX = require('xlsx');

const router = express.Router();

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'Books route is working' });
});

// /* Cloudinary storage config - commented out for future use */
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     let folder = 'books';
//     let resource_type = 'auto';
//     return {
//       folder,
//       resource_type,
//       public_id: `${Date.now()}-${file.originalname}`,
//     };
//   },
// });

// Local file system storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/books');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer instance with local storage and file validation for books
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for books
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter checking:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Check if file type is allowed for books
    const allowedBookTypes = {
      'application/pdf': '.pdf',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'text/plain': '.txt',
      'application/epub+zip': '.epub'
    };
    
    console.log('Allowed book types:', Object.keys(allowedBookTypes));
    console.log('File mimetype:', file.mimetype);
    console.log('Is allowed:', !!allowedBookTypes[file.mimetype]);
    
    if (!allowedBookTypes[file.mimetype]) {
      console.log('File type rejected:', file.mimetype);
      return cb(new Error('Invalid file type'), false);
    }

    // Check for malicious patterns in filename
    const maliciousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|dll|so|dylib)$/i;
    if (maliciousPatterns.test(file.originalname)) {
      console.log('Malicious file pattern detected:', file.originalname);
      return cb(new Error('Potentially malicious file'), false);
    }

    console.log('File accepted');
    cb(null, true);
  }
});

// Create multer instance for cover images
const uploadCover = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/covers');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log('Cover file filter checking:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Check if file type is allowed for images
    const allowedImageTypes = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    
    console.log('Allowed image types:', Object.keys(allowedImageTypes));
    console.log('File mimetype:', file.mimetype);
    console.log('Is allowed:', !!allowedImageTypes[file.mimetype]);
    
    if (!allowedImageTypes[file.mimetype]) {
      console.log('Image type rejected:', file.mimetype);
      return cb(new Error('Invalid image file type'), false);
    }

    // Check for malicious patterns in filename
    const maliciousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|dll|so|dylib)$/i;
    if (maliciousPatterns.test(file.originalname)) {
      console.log('Malicious file pattern detected:', file.originalname);
      return cb(new Error('Potentially malicious file'), false);
    }

    console.log('Cover image accepted');
    cb(null, true);
  }
});

// File upload endpoint (admin only) with validation
router.post('/upload', adminAuth, upload.single('file'), (req, res, next) => {
  console.log('=== BOOK FILE UPLOAD ENDPOINT HIT ===');
  console.log('Headers:', req.headers);
  console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
  console.log('File:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    filename: req.file.filename,
    path: req.file.path
  } : 'No file');
  next();
}, validateFile('book'), (req, res) => {
  try {
    console.log('req.body', req.body);
    console.log('Upload request received:', {
      user: req.user ? { id: req.user._id, role: req.user.role } : 'No user',
      file: req.file ? { 
        originalname: req.file.originalname, 
        mimetype: req.file.mimetype, 
        size: req.file.size,
        filename: req.file.filename,
        path: req.file.path
      } : 'No file',
      body: req.body
    });
    
    if (!req.file || !req.file.path) {
      console.log('File upload failed - no file or path');
      return res.status(400).json({ message: 'File upload failed' });
    }
    
    // Return local file path instead of Cloudinary URL
    const fileUrl = `/uploads/books/${req.file.filename}`;
    console.log('File upload successful:', fileUrl);
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ 
      message: 'File upload failed',
      error: error.message 
    });
  }
});

// Cover image upload endpoint (admin only)
router.post('/upload-cover', adminAuth, uploadCover.single('cover'), (req, res) => {
  try {
    console.log('=== COVER IMAGE UPLOAD ENDPOINT HIT ===');
    console.log('File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
      path: req.file.path
    } : 'No file');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Cover image upload failed' });
    }
    
    // Return local file path
    const coverUrl = `/uploads/covers/${req.file.filename}`;
    console.log('Cover upload successful:', coverUrl);
    res.json({ url: coverUrl });
  } catch (error) {
    console.error('Cover upload error:', error);
    res.status(400).json({ 
      message: 'Cover image upload failed',
      error: error.message 
    });
  }
});

// Create a new book (admin only) with validation
router.post('/', adminAuth, bookValidation.create, async (req, res) => {
  try {
    console.log('Creating book with data:', req.body);
    const book = new Book(req.body);
    console.log('Book object created:', book);
    await book.save();
    console.log('Book saved successfully:', book._id);
    res.status(201).json(book);
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all books with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Default 12 books per page
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.genre) filter.genre = req.query.genre;
    if (req.query.year) filter.year = parseInt(req.query.year);
    if (req.query.author) filter.author = { $regex: req.query.author, $options: 'i' };
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { author: { $regex: req.query.search, $options: 'i' } },
        { genre: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count for pagination
    const total = await Book.countDocuments(filter);
    
    // Get books with pagination
    const books = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download books as Excel file (admin only)
router.get('/download-excel', adminAuth, async (req, res) => {
  try {
    const books = await Book.find().lean();
    
    // Transform book data for Excel
    const excelData = books.map(book => ({
      'Book ID': book._id.toString(),
      'Title': book.title,
      'Author': book.author,
      'Genre': book.genre,
      'Year': book.year || '',
      'File Type': book.fileType.toUpperCase(),
      'File URL': book.fileUrl,
      'Cover URL': book.coverUrl || '',
      'Uploaded': new Date(book.createdAt).toLocaleDateString(),
      'Last Updated': new Date(book.updatedAt).toLocaleDateString()
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Book ID
      { wch: 30 }, // Title
      { wch: 20 }, // Author
      { wch: 15 }, // Genre
      { wch: 10 }, // Year
      { wch: 10 }, // File Type
      { wch: 40 }, // File URL
      { wch: 40 }, // Cover URL
      { wch: 15 }, // Uploaded
      { wch: 15 }  // Last Updated
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    const filename = `books-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a book by ID with validation
router.get('/:id', idValidation.mongoId, auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    // Track access if user is authenticated
    if (req.user) {
      // Only add if not already the most recent entry for this book
      const lastEntry = req.user.history && req.user.history.length > 0 ? req.user.history[req.user.history.length - 1] : null;
      if (!lastEntry || String(lastEntry.book) !== String(book._id)) {
        req.user.history.push({ book: book._id, accessedAt: new Date() });
        await req.user.save();
      }
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a book (admin only) with validation
router.put('/:id', adminAuth, idValidation.mongoId, bookValidation.update, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a book (admin only) with validation
router.delete('/:id', adminAuth, idValidation.mongoId, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 