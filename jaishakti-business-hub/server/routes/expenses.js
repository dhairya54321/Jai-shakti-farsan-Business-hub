import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import ExpenseService from '../services/expenseService.js';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

const router = express.Router();

// All routes require valid authentication
router.use(authenticateToken);

// GET /api/expenses - List expenses with filters, search, pagination
router.get('/', (req, res) => {
  try {
    const result = ExpenseService.listExpenses(req.user.business_id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses - Create new expense (supports JSON or multipart/form-data)
router.post('/', uploadAttachment.single('receipt'), (req, res) => {
  try {
    const expense = ExpenseService.createExpense(req.user, req.body, req.file);
    res.status(201).json({ success: true, expense });
  } catch (err) {
    // If file was uploaded but save failed, clean up the orphaned file
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/expenses/:id - Fetch single expense with payments, attachments, and audit trail
router.get('/:id', (req, res) => {
  try {
    const expense = ExpenseService.getExpenseById(req.user.business_id, req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }
    res.json({ success: true, expense });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/expenses/:id - Update expense (requires reason)
router.put('/:id', (req, res) => {
  try {
    const { reason, ...data } = req.body;
    const updated = ExpenseService.updateExpense(req.user, req.params.id, data, reason);
    res.json({ success: true, expense: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses/:id/payments - Record an installment or additional payment
router.post('/:id/payments', (req, res) => {
  try {
    const updated = ExpenseService.addPayment(req.user, req.params.id, req.body);
    res.json({ success: true, expense: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses/:id/approve - Approve pending expense (Owner/Manager only)
router.post('/:id/approve', requireRole(['owner', 'manager']), (req, res) => {
  try {
    const approved = ExpenseService.approveExpense(req.user, req.params.id);
    res.json({ success: true, expense: approved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses/:id/reject - Reject pending expense (Owner/Manager only, requires reason)
router.post('/:id/reject', requireRole(['owner', 'manager']), (req, res) => {
  try {
    const { reason } = req.body;
    const rejected = ExpenseService.rejectExpense(req.user, req.params.id, reason);
    res.json({ success: true, expense: rejected });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses/:id/void - Void an approved expense (Owner/Manager only, requires reason)
router.post('/:id/void', requireRole(['owner', 'manager']), (req, res) => {
  try {
    const { reason } = req.body;
    const voided = ExpenseService.voidExpense(req.user, req.params.id, reason);
    res.json({ success: true, expense: voided });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/expenses/attachments/:id/download - Securely stream attachment to authorized user
router.get('/attachments/:id/download', (req, res) => {
  try {
    const db = getDatabase();
    const attachment = db.prepare(`
      SELECT * FROM expense_attachments
      WHERE id = ? AND business_id = ?
    `).get(req.params.id, req.user.business_id);

    if (!attachment) {
      return res.status(404).json({ success: false, error: 'Attachment not found.' });
    }

    const filePath = path.join(config.UPLOADS_DIR, attachment.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Attachment file missing from storage.' });
    }

    res.setHeader('Content-Type', attachment.content_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_filename)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve file.' });
  }
});

export default router;
