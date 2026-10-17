import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/users - List users for the business (Owner/Manager only)
router.get('/', requireRole(['owner', 'manager']), (req, res) => {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.preferred_language, u.is_active, u.created_at,
           bm.role
    FROM users u
    JOIN business_members bm ON bm.user_id = u.id AND bm.business_id = ?
    ORDER BY u.created_at ASC
  `).all(req.user.business_id);

  res.json({ success: true, users });
});

// POST /api/users - Create new team user (Owner only)
router.post('/', requireRole(['owner']), (req, res) => {
  const { username, password, full_name, role, preferred_language } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ success: false, error: 'Username, password, full name, and role are required.' });
  }

  const validRoles = ['owner', 'manager', 'accountant', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role.' });
  }

  const db = getDatabase();
  const cleanUsername = username.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username already in use.' });
  }

  const userId = 'usr_' + crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(userId, cleanUsername, hash, full_name.trim(), preferred_language || 'gu', now, now);

    db.prepare(`
      INSERT INTO business_members (id, business_id, user_id, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run('bm_' + crypto.randomUUID(), req.user.business_id, userId, role, now, now);
  })();

  res.status(201).json({
    success: true,
    user: {
      id: userId,
      username: cleanUsername,
      full_name: full_name.trim(),
      role,
      preferred_language: preferred_language || 'gu'
    }
  });
});

// PUT /api/users/:id - Update user role or status (Owner only)
router.put('/:id', requireRole(['owner']), (req, res) => {
  const { role, is_active, full_name, password } = req.body;
  const db = getDatabase();
  const targetUserId = req.params.id;

  const member = db.prepare('SELECT * FROM business_members WHERE user_id = ? AND business_id = ?')
    .get(targetUserId, req.user.business_id);

  if (!member) {
    return res.status(404).json({ success: false, error: 'User not found in this business.' });
  }

  // Prevent owner from disabling their own account
  if (targetUserId === req.user.id && is_active === false) {
    return res.status(400).json({ success: false, error: 'You cannot deactivate your own account.' });
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    if (role) {
      db.prepare('UPDATE business_members SET role = ?, updated_at = ? WHERE id = ?')
        .run(role, now, member.id);
    }
    if (is_active !== undefined) {
      db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
        .run(is_active ? 1 : 0, now, targetUserId);
      db.prepare('UPDATE business_members SET is_active = ?, updated_at = ? WHERE id = ?')
        .run(is_active ? 1 : 0, now, member.id);
    }
    if (full_name) {
      db.prepare('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?')
        .run(full_name.trim(), now, targetUserId);
    }
    if (password && password.trim().length >= 6) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .run(hash, now, targetUserId);
    }
  })();

  res.json({ success: true, message: 'User updated successfully.' });
});

export default router;
