import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';
import { parseAndValidateAmount } from '../services/expenseService.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/settings - Fetch business settings
router.get('/', (req, res) => {
  const db = getDatabase();
  const settings = db.prepare(`
    SELECT * FROM business_settings WHERE business_id = ?
  `).get(req.user.business_id);

  const business = db.prepare(`
    SELECT id, name, currency_code, timezone, default_language FROM businesses WHERE id = ?
  `).get(req.user.business_id);

  res.json({ success: true, settings: settings || {}, business: business || {} });
});

// PUT /api/settings - Update business settings (Owner only)
router.put('/', requireRole(['owner']), (req, res) => {
  const { approval_threshold, require_approval_above_threshold, auto_approve_staff_expenses } = req.body;
  const db = getDatabase();

  let threshold = 5000.00;
  if (approval_threshold !== undefined && approval_threshold !== null) {
    threshold = parseAndValidateAmount(approval_threshold);
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE business_settings SET
      approval_threshold = ?,
      require_approval_above_threshold = ?,
      auto_approve_staff_expenses = ?,
      updated_at = ?
    WHERE business_id = ?
  `).run(
    threshold,
    require_approval_above_threshold ? 1 : 0,
    auto_approve_staff_expenses ? 1 : 0,
    now,
    req.user.business_id
  );

  const updated = db.prepare('SELECT * FROM business_settings WHERE business_id = ?').get(req.user.business_id);
  res.json({ success: true, settings: updated });
});

export default router;
