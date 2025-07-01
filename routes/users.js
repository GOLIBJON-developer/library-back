const express = require('express');
const User = require('../models/User');
const { adminAuth, auth } = require('../middleware/auth');
const { userValidation } = require('../middleware/validation');
const XLSX = require('xlsx');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all users (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new user (admin only) with validation
router.post('/', adminAuth, [
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
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    
    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password,
      role
    });
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Download users as Excel file (admin only)
router.get('/download-excel', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    // Transform user data for Excel
    const excelData = users.map(user => ({
      'User ID': user._id.toString(),
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
      'Member Since': new Date(user.createdAt).toLocaleDateString(),
      'Last Updated': new Date(user.updatedAt).toLocaleDateString(),
      'Books Accessed': user.history ? user.history.length : 0
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // User ID
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 10 }, // Role
      { wch: 15 }, // Member Since
      { wch: 15 }, // Last Updated
      { wch: 15 }  // Books Accessed
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    const filename = `users-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a user by ID (admin only) with validation
router.delete('/:id', adminAuth, userValidation.delete, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a user by ID (admin only) with validation
router.put('/:id', adminAuth, userValidation.update, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get authenticated user's access history (populated with book details)
router.get('/me/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'history.book',
      select: 'title author genre year coverUrl fileType',
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.history || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 