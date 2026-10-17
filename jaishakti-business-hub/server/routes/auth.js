import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getDatabase } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  const db = getDatabase();

  const user = db.prepare(`
    SELECT u.id, u.username, u.password_hash, u.full_name, u.preferred_language, u.is_active,
           bm.business_id, bm.role, b.name as business_name
    FROM users u
    JOIN business_members bm ON bm.user_id = u.id AND bm.is_active = 1
    JOIN businesses b ON b.id = bm.business_id
    WHERE u.username = ?
  `).get(username.trim());

  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, error: 'Invalid username or inactive account.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, businessId: user.business_id },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      business_id: user.business_id,
      business_name: user.business_name,
      preferred_language: user.preferred_language
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      full_name: req.user.full_name,
      role: req.user.role,
      business_id: req.user.business_id,
      business_name: req.user.business_name,
      preferred_language: req.user.preferred_language
    }
  });
});

// POST /api/auth/language
router.post('/language', authenticateToken, (req, res) => {
  const { language } = req.body;
  if (!['gu', 'en'].includes(language)) {
    return res.status(400).json({ success: false, error: 'Language must be "gu" or "en".' });
  }

  const db = getDatabase();
  db.prepare('UPDATE users SET preferred_language = ?, updated_at = ? WHERE id = ?')
    .run(language, new Date().toISOString(), req.user.id);

  res.json({ success: true, language });
});

export default router;
