import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';
import { VendorService } from '../services/vendorService.js';
import { processBillFile } from '../services/ocrService.js';
import ExpenseService from '../services/expenseService.js';
import ManufacturingService from '../services/manufacturingService.js';
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

    // Fetch active known vendors for instant profile auto-fill & fast 4-field extraction
    const knownVendors = db.prepare('SELECT id, name, category, phone, gstin, pan, address, city, contact_person FROM vendors WHERE business_id = ? AND is_active = 1').all(req.user.business_id);

    const ocrResult = await processBillFile(uploadedFile.path, uploadedFile.mimetype, { geminiApiKey, knownVendors });

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

    // Check if this bill/invoice is already in the record book (check bills, expenses, and image file hash)
    const dupeCheck = ExpenseService.checkBillDuplicate(req.user.business_id, {
      vendor_id: matchedVendorId,
      vendor_name: ocrResult.extracted.vendorName,
      gstin: ocrResult.extracted.gstin,
      bill_number: ocrResult.extracted.invoiceNumber,
      bill_date: ocrResult.extracted.invoiceDate,
      total_amount: ocrResult.extracted.totalAmount,
      file_path: uploadedFile.path,
      stored_filename: uploadedFile.filename
    });

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
      duplicateExpense: dupeCheck.isDuplicate ? dupeCheck.duplicate : null,
      isDuplicateExpense: dupeCheck.isDuplicate,
      duplicateBill: dupeCheck.isDuplicate ? dupeCheck.duplicate : null,
      isDuplicateBill: dupeCheck.isDuplicate,
      duplicateMessage: dupeCheck.isDuplicate ? dupeCheck.message : null
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
 * POST /api/vendors/bills/check-duplicate - Check if bill/invoice already exists in record book
 */
router.post('/bills/check-duplicate', (req, res) => {
  try {
    const dupeCheck = ExpenseService.checkBillDuplicate(req.user.business_id, req.body);
    res.json({
      success: true,
      isDuplicate: dupeCheck.isDuplicate,
      duplicate: dupeCheck.duplicate,
      message: dupeCheck.message
    });
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

    // STRICT RECORD BOOK CHECK: Block duplicate bill/invoice saving
    if (!req.body.allow_duplicate) {
      const dupeCheck = ExpenseService.checkBillDuplicate(req.user.business_id, {
        vendor_id,
        bill_number,
        bill_date,
        total_amount,
        stored_filename: req.body.stored_filename,
        file_path: file ? (file.path || path.join(config.UPLOADS_DIR, file.filename)) : null
      });

      if (dupeCheck.isDuplicate) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_BILL_BLOCKED',
          error: dupeCheck.message,
          duplicate: dupeCheck.duplicate
        });
      }
    }

    // Parse inward stock items if provided
    let inwardItems = [];
    if (req.body.inward_stock_items) {
      if (typeof req.body.inward_stock_items === 'string') {
        try {
          inwardItems = JSON.parse(req.body.inward_stock_items);
        } catch (_) {
          inwardItems = [];
        }
      } else if (Array.isArray(req.body.inward_stock_items)) {
        inwardItems = req.body.inward_stock_items;
      }
    }

    // Support creating new raw materials on the fly if needed
    for (const item of inwardItems) {
      if (item.is_new_material && item.new_material_data) {
        try {
          const newMat = ManufacturingService.createRawMaterial(req.user, item.new_material_data);
          item.raw_material_id = newMat.id;
        } catch (matErr) {
          console.warn('Could not auto-create raw material on the fly:', matErr.message);
        }
      }
    }

    let linkedExpenseId = null;

    // 1-WAY: If user requested creating a corresponding Daily Expense entry
    if (create_daily_expense === true || create_daily_expense === 'true') {
      try {
        let finalCategoryId = expense_category_id;
        const vendor = VendorService.getVendorById(req.user.business_id, vendor_id)?.vendor;
        const vCat = String(vendor?.category || '').toLowerCase();
        const vName = String(vendor?.name || '').toLowerCase();

        if (!finalCategoryId || finalCategoryId === 'cat_raw_materials') {
          if (vCat.includes('packag') || vCat.includes('plastic') || vCat.includes('print') || vName.includes('vallabh') || vName.includes('jagannath')) {
            finalCategoryId = 'cat_packaging_materials';
          } else if (vCat.includes('finish') || vCat.includes('sweet') || vCat.includes('namkeen') || vCat.includes('thepla') || vCat.includes('khakhra') || vCat.includes('papad') || vCat.includes('beverage') || vName.includes('kamya') || vName.includes('khushi') || vName.includes('ranna') || vName.includes('yogi') || vName.includes('krishna sweet')) {
            finalCategoryId = 'cat_finished_goods';
          } else if (vCat.includes('vegetab') || vCat.includes('potato') || vName.includes('popatlal')) {
            finalCategoryId = 'cat_vegetable_purchase';
          } else if (vCat.includes('diesel') || vCat.includes('fuel') || vName.includes('mehta fuel')) {
            finalCategoryId = 'cat_fuel_gas';
          } else if (vCat.includes('repair') || vCat.includes('service') || vName.includes('panchal')) {
            finalCategoryId = 'cat_repairs_maintenance';
          } else {
            finalCategoryId = 'cat_raw_materials';
          }
        }

        // Check if an expense with the same invoice_number and vendor already exists
        const db = getDatabase();
        let existingExpense = null;
        if (bill_number && String(bill_number).trim()) {
          existingExpense = db.prepare(`
            SELECT id FROM expenses
            WHERE business_id = ? AND vendor_id = ? AND UPPER(TRIM(COALESCE(invoice_number, ''))) = UPPER(TRIM(?)) AND approval_status != 'voided'
          `).get(req.user.business_id, vendor_id, bill_number);
        }

        if (existingExpense) {
          linkedExpenseId = existingExpense.id;
        } else {
          const createdExpense = ExpenseService.createExpense(
            req.user,
            {
              category_id: finalCategoryId,
              amount: Number(total_amount),
              payment_method: expense_payment_method || 'credit',
              payment_status: Number(paid_amount) >= Number(total_amount) ? 'paid' : (Number(paid_amount) > 0 ? 'partially_paid' : 'unpaid'),
              paid_amount: Number(paid_amount) || 0,
              transaction_date: bill_date || new Date().toISOString().slice(0, 10),
              vendor_id,
              invoice_number: bill_number,
              description: `Bill ${bill_number || ''} from vendor`.trim(),
              notes: notes || null,
              skip_vendor_bill_sync: true
            },
            file
          );
          linkedExpenseId = createdExpense.id;
        }
      } catch (expErr) {
        console.warn('Could not auto-create linked expense:', expErr.message);
      }
    }

    // 2-WAY: Save Vendor Bill & update vendor history
    let finalOcrRawText = ocr_raw_text;
    let finalSubtotal = subtotal;
    if (inwardItems && inwardItems.length > 0) {
      try {
        let base = finalOcrRawText ? JSON.parse(finalOcrRawText) : {};
        base.items = inwardItems.map(it => ({
          description: it.notes || it.detected_desc || it.material_name || 'Item',
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'kg',
          rate: it.rate !== '' && it.rate !== null && it.rate !== undefined ? parseFloat(it.rate) : null,
          amount: it.amount !== '' && it.amount !== null && it.amount !== undefined ? parseFloat(it.amount) : null
        }));
        base.totalAmount = Number(total_amount);
        if (!finalSubtotal) {
          const sum = base.items.reduce((s, it) => s + (Number(it.amount) || (Number(it.rate) * Number(it.quantity)) || 0), 0);
          finalSubtotal = sum > 0 ? sum : Number(total_amount);
        }
        base.subtotal = Number(finalSubtotal);
        finalOcrRawText = JSON.stringify(base, null, 2);
      } catch (_) {}
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
        subtotal: finalSubtotal,
        taxable_amount: taxable_amount || finalSubtotal,
        cgst,
        sgst,
        igst,
        other_charges,
        discount,
        total_amount,
        paid_amount,
        notes,
        ocr_status,
        ocr_raw_text: finalOcrRawText,
        ocr_confidence
      },
      file
    );

    // 3-WAY: Increment physical stock and log stock inward transaction
    let stockUpdated = 0;
    if (inwardItems.length > 0) {
      try {
        const inwardRes = ManufacturingService.inwardStockFromBill(req.user, bill.id, inwardItems);
        stockUpdated = inwardRes?.count || 0;
      } catch (stkErr) {
        console.warn('Could not auto-increment stock from bill:', stkErr.message);
      }
    }

    res.status(201).json({ success: true, bill, linkedExpenseId, stockUpdated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vendors/bills/:id/create-expense - Convert / Link an unlinked vendor bill into Daily Expenses
 */
router.post('/bills/:id/create-expense', (req, res) => {
  try {
    const db = getDatabase();
    const businessId = req.user.business_id;
    const bill = db.prepare(`SELECT * FROM vendor_bills WHERE id = ? AND business_id = ?`).get(req.params.id, businessId);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    // Check if already linked
    if (bill.expense_id) {
      const existing = db.prepare(`SELECT * FROM expenses WHERE id = ? AND business_id = ?`).get(bill.expense_id, businessId);
      if (existing) {
        return res.json({ success: true, expense: existing, message: 'Bill is already linked to an expense.' });
      }
    }

    // Check if an expense with the same invoice_number and vendor already exists (e.g. entered manually)
    if (bill.bill_number) {
      const matched = db.prepare(`
        SELECT * FROM expenses
        WHERE business_id = ? AND vendor_id = ? AND invoice_number = ? AND approval_status != 'voided'
      `).get(businessId, bill.vendor_id, bill.bill_number);

      if (matched) {
        db.prepare(`UPDATE vendor_bills SET expense_id = ?, updated_at = ? WHERE id = ?`)
          .run(matched.id, new Date().toISOString(), bill.id);
        return res.json({ success: true, expense: matched, message: 'Linked to existing expense transaction.' });
      }
    }

    // Resolve category from vendor or fallback
    const vendor = db.prepare(`SELECT * FROM vendors WHERE id = ? AND business_id = ?`).get(bill.vendor_id, businessId);
    let categoryId = req.body.category_id;
    if (!categoryId || categoryId === 'cat_raw_materials') {
      const vCat = String(vendor?.category || '').toLowerCase();
      const vName = String(vendor?.name || '').toLowerCase();
      if (vCat.includes('packag') || vCat.includes('plastic') || vCat.includes('print') || vName.includes('vallabh') || vName.includes('jagannath')) {
        categoryId = 'cat_packaging_materials';
      } else if (vCat.includes('finish') || vCat.includes('sweet') || vCat.includes('namkeen') || vCat.includes('thepla') || vCat.includes('khakhra') || vCat.includes('papad') || vCat.includes('beverage') || vName.includes('kamya') || vName.includes('khushi') || vName.includes('ranna') || vName.includes('yogi') || vName.includes('krishna sweet')) {
        categoryId = 'cat_finished_goods';
      } else if (vCat.includes('vegetab') || vCat.includes('potato') || vName.includes('popatlal')) {
        categoryId = 'cat_vegetable_purchase';
      } else if (vCat.includes('diesel') || vCat.includes('fuel') || vName.includes('mehta fuel')) {
        categoryId = 'cat_fuel_gas';
      } else if (vCat.includes('repair') || vCat.includes('service') || vName.includes('panchal')) {
        categoryId = 'cat_repairs_maintenance';
      } else {
        categoryId = 'cat_raw_materials';
      }
    }

    // Check for existing bill attachment to link to expense
    const attachment = db.prepare(`
      SELECT * FROM bill_attachments WHERE bill_id = ? AND business_id = ?
    `).get(bill.id, businessId);

    let file = null;
    if (attachment) {
      const filePath = path.join(config.UPLOADS_DIR, attachment.storage_key);
      if (fs.existsSync(filePath)) {
        file = {
          filename: attachment.storage_key,
          originalname: attachment.original_filename,
          mimetype: attachment.content_type,
          size: attachment.file_size_bytes
        };
      }
    }

    const createdExpense = ExpenseService.createExpense(
      req.user,
      {
        category_id: categoryId,
        amount: Number(bill.total_amount),
        payment_method: req.body.payment_method || 'credit',
        payment_status: Number(bill.paid_amount) >= Number(bill.total_amount) && Number(bill.total_amount) > 0
          ? 'paid'
          : (Number(bill.paid_amount) > 0 ? 'partially_paid' : 'unpaid'),
        paid_amount: Number(bill.paid_amount) || 0,
        transaction_date: bill.bill_date || new Date().toISOString().slice(0, 10),
        vendor_id: bill.vendor_id,
        invoice_number: bill.bill_number,
        description: `Bill ${bill.bill_number || ''} from ${vendor?.name || 'vendor'}`.trim(),
        notes: bill.notes || null,
        allow_duplicate: true
      },
      file
    );

    // Update vendor_bills with the new expense_id
    db.prepare(`UPDATE vendor_bills SET expense_id = ?, updated_at = ? WHERE id = ?`)
      .run(createdExpense.id, new Date().toISOString(), bill.id);

    res.status(201).json({ success: true, expense: createdExpense });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/vendors/bills/:id/payment-status - Update payment status of a vendor bill & sync linked expense
 */
router.put('/bills/:id/payment-status', (req, res) => {
  try {
    const db = getDatabase();
    const businessId = req.user.business_id;
    const { payment_status, payment_method, paid_amount } = req.body;

    if (!['paid', 'unpaid', 'partially_paid'].includes(payment_status)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status.' });
    }

    const bill = db.prepare(`SELECT * FROM vendor_bills WHERE id = ? AND business_id = ?`).get(req.params.id, businessId);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    const now = new Date().toISOString();
    let effectivePaidAmount = 0;
    if (payment_status === 'paid') {
      effectivePaidAmount = bill.total_amount;
    } else if (payment_status === 'partially_paid') {
      effectivePaidAmount = Number(paid_amount) || 0;
    }

    db.transaction(() => {
      // 1. Update bill
      db.prepare(`
        UPDATE vendor_bills SET payment_status = ?, paid_amount = ?, updated_at = ? WHERE id = ?
      `).run(payment_status, effectivePaidAmount, now, bill.id);

      // 2. If linked to an expense, sync the expense
      if (bill.expense_id) {
        ExpenseService.updateExpense(
          req.user,
          bill.expense_id,
          {
            payment_status,
            payment_method: payment_method || 'cash',
            paid_amount: effectivePaidAmount
          },
          'Payment status updated from vendor bills profile'
        );

        if (payment_status === 'paid' && effectivePaidAmount > 0) {
          const existingPay = db.prepare('SELECT id FROM expense_payments WHERE expense_id = ?').get(bill.expense_id);
          if (!existingPay) {
            db.prepare(`
              INSERT INTO expense_payments (
                id, business_id, expense_id, payment_date, amount,
                payment_method, reference_number, notes, recorded_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              'pay_' + crypto.randomUUID(),
              businessId,
              bill.expense_id,
              bill.bill_date || now.slice(0, 10),
              effectivePaidAmount,
              payment_method || 'cash',
              bill.bill_number ? `Bill #${bill.bill_number}` : null,
              'Payment recorded from Vendor Bill profile',
              req.user.id,
              now,
              now
            );
          }
        }
      }
    })();

    res.json({ success: true, message: 'Payment status updated successfully.' });
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
