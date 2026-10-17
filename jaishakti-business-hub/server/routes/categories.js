import express from 'express';
import crypto from 'crypto';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/categories - List categories
router.get('/', (req, res) => {
  const db = getDatabase();
  const includeInactive = req.query.all === 'true';

  let query = `
    SELECT * FROM expense_categories
    WHERE business_id = ?
  `;
  if (!includeInactive) {
    query += ' AND is_active = 1';
  }
  query += ' ORDER BY sort_order ASC, name_en ASC';

  const categories = db.prepare(query).all(req.user.business_id);
  res.json({ success: true, categories });
});

// POST /api/categories - Create category (Owner/Manager only)
router.post('/', requireRole(['owner', 'manager']), (req, res) => {
  const { code, name_en, name_gu, classification, icon, sort_order } = req.body;

  if (!name_en || !name_gu) {
    return res.status(400).json({ success: false, error: 'English and Gujarati names are required.' });
  }

  const validClassifications = [
    'operating_expense',
    'purchase_inventory',
    'people_wages',
    'asset_purchase',
    'owner_drawing',
    'transfer',
    'other'
  ];

  if (!classification || !validClassifications.includes(classification)) {
    return res.status(400).json({ success: false, error: 'Valid classification is required.' });
  }

  const db = getDatabase();
  const categoryCode = (code || name_en.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();

  // Check unique code
  const existing = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? AND code = ?')
    .get(req.user.business_id, categoryCode);
  if (existing) {
    return res.status(400).json({ success: false, error: 'A category with this code already exists.' });
  }

  const id = 'cat_' + crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO expense_categories (
      id, business_id, code, name_en, name_gu, classification, icon,
      is_active, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    id,
    req.user.business_id,
    categoryCode,
    name_en.trim(),
    name_gu.trim(),
    classification,
    icon || 'MoreHorizontal',
    sort_order ? parseInt(sort_order, 10) : 999,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id);
  res.status(201).json({ success: true, category: created });
});

// PUT /api/categories/:id - Update category
router.put('/:id', requireRole(['owner', 'manager']), (req, res) => {
  const { name_en, name_gu, classification, icon, sort_order, is_active } = req.body;
  const db = getDatabase();

  const current = db.prepare('SELECT * FROM expense_categories WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.user.business_id);

  if (!current) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE expense_categories SET
      name_en = ?, name_gu = ?, classification = ?, icon = ?,
      sort_order = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name_en !== undefined ? name_en.trim() : current.name_en,
    name_gu !== undefined ? name_gu.trim() : current.name_gu,
    classification || current.classification,
    icon !== undefined ? icon : current.icon,
    sort_order !== undefined ? parseInt(sort_order, 10) : current.sort_order,
    is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(req.params.id);
  res.json({ success: true, category: updated });
});

// DELETE /api/categories/:id - Deactivate category (safe against deletion of referenced categories)
router.delete('/:id', requireRole(['owner', 'manager']), (req, res) => {
  const db = getDatabase();
  const current = db.prepare('SELECT * FROM expense_categories WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.user.business_id);

  if (!current) {
    return res.status(404).json({ success: false, error: 'Category not found.' });
  }

  // Check if referenced by existing transactions
  const txCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?')
    .get(req.params.id).count;

  if (txCount > 0) {
    // Cannot delete physically: deactivate it so historical records remain intact
    db.prepare('UPDATE expense_categories SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);
    return res.json({
      success: true,
      message: `Category deactivated. It has ${txCount} historical transactions so it was preserved for reporting.`
    });
  }

  // Not referenced, can be safely removed
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Category removed permanently.' });
});

export default router;
