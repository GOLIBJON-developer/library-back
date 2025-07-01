const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/Event');
const { adminAuth } = require('../middleware/auth');
// const cloudinary = require('../config/cloudinary');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { createMulterConfig, validateFile } = require('../middleware/fileValidation');
const { eventValidation, idValidation } = require('../middleware/validation');
const XLSX = require('xlsx');

const router = express.Router();

// /* Cloudinary storage config for event images - commented out for future use */
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => ({
//     folder: 'events',
//     resource_type: 'image',
//     public_id: `${Date.now()}-${file.originalname}`,
//   }),
// });

// Local file system storage config for event images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/events');
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

// Create multer instance with local storage and file validation for images
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Check if file type is allowed for images
    const allowedTypes = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    
    if (!allowedTypes[file.mimetype]) {
      return cb(new Error('Invalid image file type'), false);
    }

    // Check for malicious patterns in filename
    const maliciousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|dll|so|dylib)$/i;
    if (maliciousPatterns.test(file.originalname)) {
      return cb(new Error('Potentially malicious file'), false);
    }

    cb(null, true);
  }
});

// Image upload endpoint (admin only) with validation
router.post('/upload', adminAuth, upload.single('image'), validateFile('image'), (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'Image upload failed' });
    }
    
    // Return local file path instead of Cloudinary URL
    const imageUrl = `/uploads/events/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(400).json({ 
      message: 'Image upload failed',
      error: error.message 
    });
  }
});

// Create a new event (admin only) with validation
router.post('/', adminAuth, eventValidation.create, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all events with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Default 12 events per page
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count for pagination
    const total = await Event.countDocuments(filter);
    
    // Get events with pagination
    const events = await Event.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      events,
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

// Download events as Excel file (admin only)
router.get('/download-excel', adminAuth, async (req, res) => {
  try {
    const events = await Event.find().lean();
    
    // Transform event data for Excel
    const excelData = events.map(event => ({
      'Event ID': event._id.toString(),
      'Title': event.title,
      'Description': event.description,
      'Date': new Date(event.date).toLocaleString(),
      'Location': event.location,
      'Image URL': event.image || '',
      'Created': new Date(event.createdAt).toLocaleDateString(),
      'Last Updated': new Date(event.updatedAt).toLocaleDateString()
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Event ID
      { wch: 30 }, // Title
      { wch: 40 }, // Description
      { wch: 20 }, // Date
      { wch: 25 }, // Location
      { wch: 40 }, // Image URL
      { wch: 15 }, // Created
      { wch: 15 }  // Last Updated
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    const filename = `events-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get an event by ID with validation
router.get('/:id', idValidation.mongoId, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an event (admin only) with validation
router.put('/:id', adminAuth, idValidation.mongoId, eventValidation.update, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an event (admin only) with validation
router.delete('/:id', adminAuth, idValidation.mongoId, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 