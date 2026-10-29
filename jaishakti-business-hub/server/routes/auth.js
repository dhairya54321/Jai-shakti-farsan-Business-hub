import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getDatabase } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { resolveUserPermissions } from '../permissions.js';

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
           bm.business_id, bm.role, bm.permissions, b.name as business_name
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
      permissions: resolveUserPermissions(user.role, user.permissions),
      business_id: user.business_id,
      business_name: user.business_name,
      preferred_language: user.preferred_language
    }
  });
});

// GET /api/auth/worker-list - Public list of active workers for easy phone login
router.get('/worker-list', (req, res) => {
  try {
    const db = getDatabase();
    const workers = db.prepare(`
      SELECT id, name, phone, role_title, diary_page
      FROM workers
      WHERE is_active = 1
      ORDER BY diary_page ASC, name ASC
    `).all();
    res.json({ success: true, workers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/worker-login - Worker login via Phone/Worker ID + 4-digit PIN
router.post('/worker-login', (req, res) => {
  const { worker_id, phone, pin } = req.body;

  if ((!worker_id && !phone) || !pin) {
    return res.status(400).json({
      success: false,
      error: 'Worker selection/phone and PIN are required.'
    });
  }

  const db = getDatabase();
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : null;

  let worker = null;
  if (worker_id) {
    worker = db.prepare(`
      SELECT w.*, b.name as business_name
      FROM workers w
      JOIN businesses b ON b.id = w.business_id
      WHERE w.id = ? AND w.is_active = 1
    `).get(worker_id);
  } else if (cleanPhone) {
    worker = db.prepare(`
      SELECT w.*, b.name as business_name
      FROM workers w
      JOIN businesses b ON b.id = w.business_id
      WHERE (w.phone = ? OR w.phone LIKE ?) AND w.is_active = 1
    `).get(cleanPhone, `%${cleanPhone}%`);
  }

  if (!worker) {
    return res.status(401).json({
      success: false,
      error: 'કારીગર ખાતું મળ્યું નથી અથવા નિષ્ક્રિય છે (Worker not found or inactive).'
    });
  }

  const workerPin = String(worker.login_pin || '1234').trim();
  const inputPin = String(pin).trim();

  if (workerPin !== inputPin) {
    return res.status(401).json({
      success: false,
      error: 'ખોટો પિન (Incorrect PIN). ડિફોલ્ટ પિન 1234 છે અથવા માલિકનો સંપર્ક કરો.'
    });
  }

  const token = jwt.sign(
    {
      userId: worker.id,
      workerId: worker.id,
      role: 'worker',
      businessId: worker.business_id,
      name: worker.name
    },
    config.JWT_SECRET,
    { expiresIn: '30d' } // Extended session for workers on their phones
  );

  return res.json({
    success: true,
    token,
    user: {
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
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      worker_id: req.user.worker_id || (req.user.role === 'worker' ? req.user.id : null),
      username: req.user.username,
      full_name: req.user.full_name,
      role: req.user.role,
      permissions: req.user.permissions || resolveUserPermissions(req.user.role),
      business_id: req.user.business_id,
      business_name: req.user.business_name,
      preferred_language: req.user.preferred_language,
      salary_cycle_day: req.user.salary_cycle_day,
      base_salary: req.user.base_salary,
      diary_page: req.user.diary_page
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
