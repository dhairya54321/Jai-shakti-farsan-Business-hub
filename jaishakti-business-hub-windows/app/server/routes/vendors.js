import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import { VendorService } from '../services/vendorService.js';
import { processBillFile } from '../services/ocrService.js';
import ExpenseService from '../services/expenseService.js';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/vendors - List vendors with search, category filter, active filter, pagination
 */
router.get('/', (req, res) => {
  try {
    const result = VendorService.listVendors(req.user.business_id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vendors/check-duplicate - Check if vendor already exists by GSTIN, Name, Phone, Email
 */
router.post('/check-duplicate', (req, res) => {
  try {
    const { gstin, name, phone, email, excludeVendorId } = req.body;
    const result = VendorService.checkDuplicates(req.user.business_id, {
      gstin,
      name,
      phone,
      email,
      excludeVendorId
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vendors/scan-bill - Upload bill and run OCR data extraction
 */
router.post('/scan-bill', uploadAttachment.any(), async (req, res) => {
  const uploadedFile = (req.files && req.files[0]) || req.file;
  if (!uploadedFile) {
    return res.status(400).json({ success: false, error: 'No bill file uploaded. Please select a JPG, PNG, or PDF file.' });
  }

  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT gemini_api_key FROM business_settings WHERE business_id = ?').get(req.user.business_id);
    const geminiApiKey = req.body.geminiApiKey || req.headers['x-gemini-api-key'] || settings?.gemini_api_key || config.GEMINI_API_KEY || null;

    const ocrResult = await processBillFile(uploadedFile.path, uploadedFile.mimetype, { geminiApiKey });

    // Check potential duplicate vendors matching extracted vendor name, GSTIN, or phone
    const duplicateCheck = VendorService.checkDuplicates(req.user.business_id, {
      gstin: ocrResult.extracted.gstin,
      name: ocrResult.extracted.vendorName,
      phone: ocrResult.extracted.phone,
      email: ocrResult.extracted.email
    });

    // Check if an expense with this vendor and invoice already exists
    let matchedVendorId = null;
    if (duplicateCheck.matches && duplicateCheck.matches.length > 0) {
      matchedVendorId = duplicateCheck.matches[0].vendor.id;
    } else if (ocrResult.extracted.vendorName) {
      const vMatch = db.prepare(`
        SELECT id FROM vendors 
        WHERE business_id = ? AND UPPER(TRIM(name)) = UPPER(TRIM(?))
      `).get(req.user.business_id, ocrResult.extracted.vendorName);
      if (vMatch) matchedVendorId = vMatch.id;
    }

    let duplicateExpense = null;
    if (matchedVendorId) {
      const dupeCheck = ExpenseService.checkDuplicateExpense(req.user.business_id, {
        vendor_id: matchedVendorId,
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
    // Keep file in storage for user manual fallback
    console.error('Scan bill error:', err);
    res.status(500).json({
      success: false,
      error: 'OCR processing failed: ' + err.message,
      file: uploadedFile ? {
        filename: uploadedFile.filename,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size
      } : null
    });
  }
});

/**
 * GET /api/vendors/:id - Fetch single vendor profile with bills and expenses
 */
router.get('/:id', (req, res) => {
  try {
    const profile = VendorService.getVendorById(req.user.business_id, req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }
    res.json({ success: true, ...profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vendors - Create vendor manually or from OCR review
 */
router.post('/', (req, res) => {
  try {
    const { allowDuplicate, ...data } = req.body;
    if (!data.category) {
      data.category = 'raw_materials';
    }
    const vendor = VendorService.createVendor(req.user, data, { allowDuplicate: !!allowDuplicate });
    res.status(201).json({ success: true, vendor });
  } catch (err) {
    if (err.code === 'DUPLICATE_VENDOR') {
      return res.status(409).json({
        success: false,
        error: err.message,
        code: 'DUPLICATE_VENDOR',
        duplicates: err.duplicates
      });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/vendors/:id - Update vendor profile
 */
router.put('/:id', (req, res) => {
  try {
    const updated = VendorService.updateVendor(req.user, req.params.id, req.body);
    res.json({ success: true, vendor: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vendors/bills - Save reviewed bill and associate with vendor & file attachment
 */
router.post('/bills', uploadAttachment.single('bill'), (req, res) => {
  try {
    const {
      vendor_id,
      bill_number,
      bill_date,
      due_date,
      po_number,
      subtotal,
      taxable_amount,
      cgst,
      sgst,
      igst,
      other_charges,
      discount,
      total_amount,
      paid_amount,
      notes,
      ocr_status,
      ocr_raw_text,
      ocr_confidence,
      create_daily_expense,
      expense_category_id,
      expense_payment_method
    } = req.body;

    let file = req.file;

    // If file was uploaded previously via /scan-bill, it can be passed via stored_filename
    if (!file && req.body.stored_filename) {
      const storedPath = path.join(config.UPLOADS_DIR, req.body.stored_filename);
      if (fs.existsSync(storedPath)) {
        file = {
          filename: req.body.stored_filename,
          originalname: req.body.stored_originalname || req.body.stored_filename,
          mimetype: req.body.stored_mimetype || 'image/jpeg',
          size: fs.statSync(storedPath).size
        };
      }
    }

    let linkedExpenseId = null;

    // If user requested creating a corresponding Daily Expense entry
    if (create_daily_expense === true || create_daily_expense === 'true') {
      try {
        const createdExpense = ExpenseService.createExpense(
          req.user,
          {
            category_id: expense_category_id,
            amount: Number(total_amount),
            payment_method: expense_payment_method || 'credit',
            payment_status: Number(paid_amount) >= Number(total_amount) ? 'paid' : (Number(paid_amount) > 0 ? 'partially_paid' : 'unpaid'),
            paid_amount: Number(paid_amount) || 0,
            transaction_date: bill_date || new Date().toISOString().slice(0, 10),
            vendor_id,
            invoice_number: bill_number,
            description: `Bill ${bill_number || ''} from vendor`.trim(),
            notes: notes || null
          },
          file
        );
        linkedExpenseId = createdExpense.id;
      } catch (expErr) {
        console.warn('Could not auto-create linked expense:', expErr.message);
      }
    }

    const bill = VendorService.saveBill(
      req.user,
      {
        vendor_id,
        expense_id: linkedExpenseId,
        bill_number,
        bill_date,
        due_date,
        po_number,
        subtotal,
        taxable_amount,
        cgst,
        sgst,
        igst,
        other_charges,
        discount,
        total_amount,
        paid_amount,
        notes,
        ocr_status,
        ocr_raw_text,
        ocr_confidence
      },
      file
    );

    res.status(201).json({ success: true, bill, linkedExpenseId });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/vendors/bills/attachments/:id/download - Securely stream bill attachment to authorized user
 */
router.get('/bills/attachments/:id/download', (req, res) => {
  try {
    const db = getDatabase();
    const attachment = db.prepare(`
      SELECT * FROM bill_attachments
      WHERE id = ? AND business_id = ?
    `).get(req.params.id, req.user.business_id);

    if (!attachment) {
      return res.status(404).json({ success: false, error: 'Bill attachment not found.' });
    }

    const filePath = path.join(config.UPLOADS_DIR, attachment.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Bill file missing from secure storage.' });
    }

    res.setHeader('Content-Type', attachment.content_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_filename)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve bill file.' });
  }
});

export default router;
