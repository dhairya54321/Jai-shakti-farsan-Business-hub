import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import ExpenseService from '../services/expenseService.js';
import { processBillFile } from '../services/ocrService.js';
import { VendorService } from '../services/vendorService.js';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

const router = express.Router();

// All routes require valid authentication
router.use(authenticateToken);

// POST /api/expenses/scan-receipt - Scan receipt/bill with OCR & AI, decode items and quantities
router.post('/scan-receipt', uploadAttachment.any(), async (req, res) => {
  const uploadedFile = (req.files && req.files[0]) || req.file;
  if (!uploadedFile) {
    return res.status(400).json({ success: false, error: 'No receipt file uploaded. Please select a JPG, PNG, or PDF file.' });
  }

  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT gemini_api_key FROM business_settings WHERE business_id = ?').get(req.user.business_id);
    const geminiApiKey = req.body.geminiApiKey || req.headers['x-gemini-api-key'] || settings?.gemini_api_key || config.GEMINI_API_KEY || null;

    const ocrResult = await processBillFile(uploadedFile.path, uploadedFile.mimetype, { geminiApiKey });

    // Check potential duplicate / matching vendors
    const duplicateCheck = VendorService.checkDuplicates(req.user.business_id, {
      gstin: ocrResult.extracted.gstin,
      name: ocrResult.extracted.vendorName,
      phone: ocrResult.extracted.phone,
      email: ocrResult.extracted.email
    });

    // Check if an expense with this vendor and invoice already exists
    let matchedVendor = null;
    if (duplicateCheck.matches && duplicateCheck.matches.length > 0) {
      matchedVendor = duplicateCheck.matches[0].vendor;
    } else if (ocrResult.extracted.vendorName) {
      const vMatch = db.prepare(`
        SELECT * FROM vendors 
        WHERE business_id = ? AND (
          UPPER(TRIM(name)) = UPPER(TRIM(?)) OR
          UPPER(TRIM(?)) LIKE '%' || UPPER(TRIM(name)) || '%' OR
          UPPER(TRIM(name)) LIKE '%' || UPPER(TRIM(?)) || '%'
        )
      `).get(req.user.business_id, ocrResult.extracted.vendorName, ocrResult.extracted.vendorName, ocrResult.extracted.vendorName);
      if (vMatch) {
        matchedVendor = vMatch;
        duplicateCheck.matches.push({ vendor: vMatch, matchedFields: ['name'] });
        duplicateCheck.isDuplicate = true;
      }
    }

    if (matchedVendor) {
      ocrResult.extracted.vendorId = matchedVendor.id;
      ocrResult.extracted.vendorName = matchedVendor.name;
      if (matchedVendor.category) {
        ocrResult.extracted.vendorCategory = matchedVendor.category;
      }
    }

    let duplicateExpense = null;
    if (matchedVendor) {
      const dupeCheck = ExpenseService.checkDuplicateExpense(req.user.business_id, {
        vendor_id: matchedVendor.id,
        invoice_number: ocrResult.extracted.invoiceNumber,
        transaction_date: ocrResult.extracted.invoiceDate,
        amount: ocrResult.extracted.totalAmount
      });
      if (dupeCheck.isDuplicate) {
        duplicateExpense = dupeCheck.duplicate;
      }
    }

    res.json({
      success: true,
      file: {
        filename: uploadedFile.filename,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size
      },
      ocr: ocrResult,
      duplicates: duplicateCheck.matches,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateExpense: duplicateExpense,
      isDuplicateExpense: !!duplicateExpense
    });
  } catch (err) {
    console.error('Scan receipt error:', err);
    res.status(500).json({
      success: false,
      error: 'Receipt OCR processing failed: ' + err.message,
      file: uploadedFile ? {
        filename: uploadedFile.filename,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size
      } : null
    });
  }
});

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
    if (err.code === 'DUPLICATE_EXPENSE') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EXPENSE',
        error: err.message,
        duplicate: err.duplicate
      });
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

// DELETE /api/expenses/:id - Delete an unwanted transaction (Owner/Manager only)
router.delete('/:id', requireRole(['owner', 'manager']), (req, res) => {
  try {
    const reason = req.body?.reason || req.query?.reason || 'Deleted by user';
    const result = ExpenseService.deleteExpense(req.user, req.params.id, reason);
    res.json({ success: true, ...result });
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
