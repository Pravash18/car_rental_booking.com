const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'DriveElite_Pr0d_JWT_S3cret_K3y_2026_V2_India_x9k2m';

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    // Attach user info to request
    db.get('SELECT id, name, email, role, phone, avatar, email_verified FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(403).json({
          success: false,
          message: 'User not found.'
        });
      }
      req.user = user;
      next();
    });
  });
};

// Require email verification middleware
const requireVerified = (req, res, next) => {
  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address first.',
      requireVerification: true
    });
  }
  next();
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

module.exports = { authenticateToken, requireVerified, requireAdmin };
