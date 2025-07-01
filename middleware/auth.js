const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  console.log('=== ADMIN AUTH MIDDLEWARE ===');
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (user.role !== 'admin') {
      console.log('Access denied: Not admin', { role: user.role });
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.user = user;
    console.log('Admin auth passed for user:', user._id);
    next();
  } catch (error) {
    console.log('Admin auth error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { auth, adminAuth }; 