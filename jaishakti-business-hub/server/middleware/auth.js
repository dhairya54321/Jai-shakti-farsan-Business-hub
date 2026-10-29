import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getDatabase } from '../db/index.js';
import { resolveUserPermissions } from '../permissions.js';

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

    if (decoded.role === 'worker') {
      const worker = db.prepare(`
        SELECT w.*, b.name as business_name
        FROM workers w
        JOIN businesses b ON b.id = w.business_id
        WHERE w.id = ? AND w.is_active = 1
      `).get(decoded.workerId || decoded.userId);

      if (!worker) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session or worker account inactive.'
        });
      }

      req.user = {
        id: worker.id,
        worker_id: worker.id,
        username: worker.phone || worker.name,
        full_name: worker.name,
        role: 'worker',
        business_id: worker.business_id,
        business_name: worker.business_name,
        preferred_language: 'gu',
        salary_cycle_day: worker.salary_cycle_day,
        base_salary: worker.base_salary,
        diary_page: worker.diary_page
      };

      // Strict security barrier: Workers can ONLY access their own passbook statement and session
      const allowedWorkerPrefixes = ['/api/workers/my-statement', '/api/auth/me', '/api/auth/language'];
      const currentPath = (req.originalUrl || req.path || '').split('?')[0];
      if (!allowedWorkerPrefixes.some(p => currentPath === p || currentPath.startsWith(p))) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Workers are only authorized to view their own personal passbook statement.'
        });
      }

      return next();
    }

    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.preferred_language, u.is_active,
             bm.business_id, bm.role, bm.permissions, b.name as business_name
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

    user.permissions = resolveUserPermissions(user.role, user.permissions);
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

export function requirePermission(permKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Owner always has full access
    if (req.user.role === 'owner') {
      return next();
    }
    if (req.user.permissions && req.user.permissions[permKey]) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `Access denied. You do not have permission (${permKey}) for this action. Please contact the owner.`
    });
  };
}

export default {
  authenticateToken,
  requireRole,
  requirePermission
};
