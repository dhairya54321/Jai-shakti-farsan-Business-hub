import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getDatabase } from '../db/index.js';

export function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Allows secure authenticated downloads for receipts in <img> or <a> tags
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const db = getDatabase();

    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.preferred_language, u.is_active,
             bm.business_id, bm.role, b.name as business_name
      FROM users u
      JOIN business_members bm ON bm.user_id = u.id AND bm.is_active = 1
      JOIN businesses b ON b.id = bm.business_id
      WHERE u.id = ? AND u.is_active = 1
    `).get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session or user account inactive.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

export default {
  authenticateToken,
  requireRole
};
