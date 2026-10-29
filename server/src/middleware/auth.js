const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../models/db');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = db.users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: User account does not exist or was removed.'
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed: Token is expired or invalid.',
      error: err.message
    });
  }
}

// Optional Auth (for public/shared endpoints that can personalize if logged in)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = db.users.findById(decoded.id);
      if (user) {
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    } catch (_) {
      // Ignore token failure for optional auth
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
