import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/vendors - List vendors
router.get('/', (req, res) => {
  const db = getDatabase();
  const vendors = db.prepare(`
    SELECT * FROM vendors
    WHERE business_id = ? AND is_active = 1
    ORDER BY name ASC
  `).all(req.user.business_id);

  res.json({ success: true, vendors });
});

// POST /api/vendors - Create vendor
router.post('/', (req, res) => {
  const { name, phone, address, tax_identifier, notes } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Vendor name is required.' });
  }

  const db = getDatabase();
  const id = 'ven_' + crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO vendors (id, business_id, name, phone, address, tax_identifier, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    req.user.business_id,
    name.trim(),
    phone ? phone.trim() : null,
    address ? address.trim() : null,
    tax_identifier ? tax_identifier.trim() : null,
    notes ? notes.trim() : null,
    now,
    now
  );

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  res.status(201).json({ success: true, vendor });
});

// PUT /api/vendors/:id - Update vendor
router.put('/:id', (req, res) => {
  const { name, phone, address, tax_identifier, notes, is_active } = req.body;
  const db = getDatabase();

  const current = db.prepare('SELECT * FROM vendors WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.user.business_id);

  if (!current) {
    return res.status(404).json({ success: false, error: 'Vendor not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE vendors SET
      name = ?, phone = ?, address = ?, tax_identifier = ?, notes = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : current.name,
    phone !== undefined ? (phone ? phone.trim() : null) : current.phone,
    address !== undefined ? (address ? address.trim() : null) : current.address,
    tax_identifier !== undefined ? (tax_identifier ? tax_identifier.trim() : null) : current.tax_identifier,
    notes !== undefined ? (notes ? notes.trim() : null) : current.notes,
    is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
    now,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  res.json({ success: true, vendor: updated });
});

export default router;
