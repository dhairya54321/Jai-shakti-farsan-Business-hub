import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

// Safe 2-decimal monetary parsing and validation
export function matchWorkerFromText(text, workersList) {
  if (!text || typeof text !== 'string' || !workersList || !workersList.length) return null;
  const clean = text.toLowerCase()
    .replace(/[0-9]/g, ' ')
    .replace(/\b(upad|advance|cash|paid|pay|rs|inr|salary|wage|bhai|ben|maharaj|katila|karigar)\b/gi, ' ')
    .replace(/(ઉપાડ|એડવાન્સ|રોકડ|રોકડા|રૂપિયા|પગાર|ભાઈ|બેન|મહારાજ|કારીગર|કાતીલા|આપ્યા|આપ્યો)/g, ' ')
    .trim();

  const tokens = clean.split(/[\s,()/-]+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return null;

  for (const w of workersList) {
    const wLower = (w.name || '').toLowerCase();
    const wParts = wLower.split(/[\s,()/-]+/).filter(p => p.length >= 2);
    for (const tok of tokens) {
      const isMatch = wParts.some(p => p.includes(tok) || tok.includes(p) || (p.length >= 3 && tok.length >= 3 && (p.startsWith(tok.slice(0, 3)) || tok.startsWith(p.slice(0, 3)))));
      if (isMatch) return w;
    }
  }
  return null;
}

export function parseAndValidateAmount(val) {
  if (val === null || val === undefined || val === '') {
    throw new Error('Amount is required.');
  }

  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid monetary amount.');
  }

  // Check positive
  if (num <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  // Check maximum 2 decimal places
  const parts = val.toString().split('.');
  if (parts.length > 1 && parts[1].length > 2) {
    throw new Error('Amount cannot have more than 2 decimal places.');
  }

  // Return standard rounded number with 2 decimals
  return Math.round(num * 100) / 100;
}

// Generate unique sequential transaction number within business
export function generateTransactionNumber(db, businessId, dateStr) {
  const cleanDate = dateStr.replace(/[^0-9]/g, '').slice(0, 8); // YYYYMMDD
  const prefix = `EXP-${cleanDate}-`;

  const lastTx = db.prepare(`
    SELECT transaction_number FROM expenses
    WHERE business_id = ? AND transaction_number LIKE ?
    ORDER BY transaction_number DESC LIMIT 1
  `).get(businessId, `${prefix}%`);

  let seq = 1;
  if (lastTx && lastTx.transaction_number) {
    const lastSeq = parseInt(lastTx.transaction_number.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export function logAudit(db, { businessId, actorUserId, entityType, entityId, action, prevValues, newValues, reason }) {
  db.prepare(`
    INSERT INTO audit_logs (
      id, business_id, actor_user_id, entity_type, entity_id, action,
      previous_values, new_values, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud_' + crypto.randomUUID(),
    businessId,
    actorUserId,
    entityType,
    entityId,
    action,
    prevValues ? JSON.stringify(prevValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    reason || null,
    new Date().toISOString()
  );
}

export const ExpenseService = {
  /**
   * Universal duplicate check for bills, invoices, receipts, and scans.
   * Checks both vendor_bills and expenses tables, plus physical file hashes.
   */
  checkBillDuplicate(businessId, {
    vendor_id = null,
    vendor_name = null,
    gstin = null,
    bill_number = null,
    invoice_number = null,
    bill_date = null,
    transaction_date = null,
    total_amount = null,
    amount = null,
    stored_filename = null,
    file_path = null,
    excludeBillId = null,
    excludeExpenseId = null
  } = {}) {
    const db = getDatabase();

    const invNum = (bill_number || invoice_number || '').toString().trim();
    const cleanInv = invNum.replace(/^[#\s]+/, '').trim();
    const checkDate = (bill_date || transaction_date || '').toString().trim();
    const checkAmt = parseFloat(total_amount !== null && total_amount !== undefined ? total_amount : amount);

    // Resolve vendor if vendor_id was not provided
    let effectiveVendorId = vendor_id;
    let effectiveVendorName = vendor_name;

    if (!effectiveVendorId && (gstin || vendor_name)) {
      if (gstin && String(gstin).trim()) {
        const vByGstin = db.prepare('SELECT id, name FROM vendors WHERE business_id = ? AND UPPER(TRIM(gstin)) = UPPER(TRIM(?))').get(businessId, gstin);
        if (vByGstin) {
          effectiveVendorId = vByGstin.id;
          effectiveVendorName = vByGstin.name;
        }
      }
      if (!effectiveVendorId && vendor_name && String(vendor_name).trim()) {
        const cleanName = String(vendor_name).toLowerCase().replace(/^m\/s\.?\s*/i, '').trim();
        const vByName = db.prepare(`
          SELECT id, name FROM vendors 
          WHERE business_id = ? AND (
            LOWER(TRIM(name)) = ? 
            OR LOWER(TRIM(REPLACE(name, 'M/s', ''))) = ?
            OR LOWER(TRIM(REPLACE(name, 'M/S', ''))) = ?
          )
        `).get(businessId, cleanName, cleanName, cleanName);
        if (vByName) {
          effectiveVendorId = vByName.id;
          effectiveVendorName = vByName.name;
        }
      }
    } else if (effectiveVendorId && !effectiveVendorName) {
      const v = db.prepare('SELECT name FROM vendors WHERE id = ?').get(effectiveVendorId);
      if (v) effectiveVendorName = v.name;
    }

    // 1. Check by physical file hash / image duplicate
    if (file_path && fs.existsSync(file_path)) {
      try {
        const currentSize = fs.statSync(file_path).size;
        if (currentSize > 0) {
          const currentBuffer = fs.readFileSync(file_path);
          const currentHash = crypto.createHash('sha256').update(currentBuffer).digest('hex');

          // Check bill_attachments
          const billAtts = db.prepare(`
            SELECT a.id, a.storage_key, a.original_filename, b.id as bill_id, b.bill_number, b.bill_date, b.total_amount, b.expense_id, v.name as vendor_name, e.transaction_number
            FROM bill_attachments a
            JOIN vendor_bills b ON b.id = a.bill_id
            LEFT JOIN vendors v ON v.id = b.vendor_id
            LEFT JOIN expenses e ON e.id = b.expense_id
            WHERE a.business_id = ? AND a.file_size_bytes = ?
          `).all(businessId, currentSize);

          for (const att of billAtts) {
            if (excludeBillId && att.bill_id === excludeBillId) continue;
            const attPath = path.join(config.UPLOADS_DIR, att.storage_key);
            if (fs.existsSync(attPath)) {
              const attHash = crypto.createHash('sha256').update(fs.readFileSync(attPath)).digest('hex');
              if (attHash === currentHash) {
                return {
                  isDuplicate: true,
                  matchType: 'file_content',
                  duplicate: {
                    bill_id: att.bill_id,
                    expense_id: att.expense_id,
                    transaction_number: att.transaction_number,
                    bill_number: att.bill_number,
                    invoice_number: att.bill_number,
                    date: att.bill_date,
                    bill_date: att.bill_date,
                    amount: att.total_amount,
                    total_amount: att.total_amount,
                    vendor_name: att.vendor_name
                  },
                  message: `આ બિલનો ફોટો પહેલેથી જ સિસ્ટમમાં દાખલ થયેલ છે (${att.vendor_name || 'વેપારી'}, બિલ #${att.bill_number || 'N/A'}, રકમ ₹${att.total_amount}). ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
                };
              }
            }
          }

          // Check expense_attachments
          const expAtts = db.prepare(`
            SELECT a.id, a.storage_key, a.original_filename, e.id as expense_id, e.transaction_number, e.transaction_date, e.amount, e.invoice_number, v.name as vendor_name
            FROM expense_attachments a
            JOIN expenses e ON e.id = a.expense_id
            LEFT JOIN vendors v ON v.id = e.vendor_id
            WHERE a.business_id = ? AND a.file_size_bytes = ? AND e.approval_status != 'voided'
          `).all(businessId, currentSize);

          for (const att of expAtts) {
            if (excludeExpenseId && att.expense_id === excludeExpenseId) continue;
            const attPath = path.join(config.UPLOADS_DIR, att.storage_key);
            if (fs.existsSync(attPath)) {
              const attHash = crypto.createHash('sha256').update(fs.readFileSync(attPath)).digest('hex');
              if (attHash === currentHash) {
                return {
                  isDuplicate: true,
                  matchType: 'file_content',
                  duplicate: {
                    expense_id: att.expense_id,
                    transaction_number: att.transaction_number,
                    bill_number: att.invoice_number,
                    invoice_number: att.invoice_number,
                    date: att.transaction_date,
                    transaction_date: att.transaction_date,
                    amount: att.amount,
                    total_amount: att.amount,
                    vendor_name: att.vendor_name
                  },
                  message: `આ બિલની રસીદ પહેલેથી જ તારીખ ${att.transaction_date} ના રોજ દાખલ થયેલ છે (${att.vendor_name || 'ખર્ચ'}, રકમ ₹${att.amount}, એન્ટ્રી: ${att.transaction_number}). ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn('File hash duplicate check failed:', err.message);
      }
    }

    // 2. Check by Bill / Invoice Number
    if (cleanInv) {
      // 2A. Check expenses first
      let expQuery = `
        SELECT e.id as id, e.id as expense_id, e.transaction_number, e.transaction_date, e.amount, e.invoice_number, e.vendor_id, v.name as vendor_name
        FROM expenses e
        LEFT JOIN vendors v ON v.id = e.vendor_id
        WHERE e.business_id = ? AND e.approval_status != 'voided'
      `;
      const expParams = [businessId];

      if (effectiveVendorId) {
        expQuery += ` AND e.vendor_id = ? AND (
          UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(?))
          OR UPPER(REPLACE(TRIM(COALESCE(e.invoice_number, '')), '#', '')) = UPPER(TRIM(?))
        )`;
        expParams.push(effectiveVendorId, cleanInv, cleanInv);
      } else {
        expQuery += ` AND (
          UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(TRIM(?))
          OR UPPER(REPLACE(TRIM(COALESCE(e.invoice_number, '')), '#', '')) = UPPER(TRIM(?))
        )`;
        expParams.push(cleanInv, cleanInv);
      }

      if (excludeExpenseId) {
        expQuery += ' AND e.id != ?';
        expParams.push(excludeExpenseId);
      }

      const expMatch = db.prepare(expQuery).get(...expParams);
      if (expMatch) {
        return {
          isDuplicate: true,
          matchType: 'invoice_number',
          duplicate: {
            id: expMatch.expense_id,
            expense_id: expMatch.expense_id,
            transaction_number: expMatch.transaction_number,
            bill_number: expMatch.invoice_number,
            invoice_number: expMatch.invoice_number,
            date: expMatch.transaction_date,
            transaction_date: expMatch.transaction_date,
            amount: expMatch.amount,
            total_amount: expMatch.amount,
            vendor_name: expMatch.vendor_name || effectiveVendorName
          },
          message: `An expense for Invoice #${expMatch.invoice_number} from ${expMatch.vendor_name || 'this vendor'} has already been recorded on ${expMatch.transaction_date} for ₹${expMatch.amount} (${expMatch.transaction_number}). આ બિલ પહેલેથી જ ચોપડે નોંધાયેલ છે. ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
        };
      }

      // 2B. Check vendor_bills
      let billQuery = `
        SELECT b.id as id, b.id as bill_id, b.bill_number, b.bill_date, b.total_amount, b.vendor_id, b.expense_id, v.name as vendor_name, e.transaction_number
        FROM vendor_bills b
        LEFT JOIN vendors v ON v.id = b.vendor_id
        LEFT JOIN expenses e ON e.id = b.expense_id
        WHERE b.business_id = ?
      `;
      const billParams = [businessId];

      if (effectiveVendorId) {
        billQuery += ` AND b.vendor_id = ? AND (
          UPPER(TRIM(COALESCE(b.bill_number, ''))) = UPPER(TRIM(?))
          OR UPPER(REPLACE(TRIM(COALESCE(b.bill_number, '')), '#', '')) = UPPER(TRIM(?))
        )`;
        billParams.push(effectiveVendorId, cleanInv, cleanInv);
      } else {
        billQuery += ` AND (
          UPPER(TRIM(COALESCE(b.bill_number, ''))) = UPPER(TRIM(?))
          OR UPPER(REPLACE(TRIM(COALESCE(b.bill_number, '')), '#', '')) = UPPER(TRIM(?))
        )`;
        billParams.push(cleanInv, cleanInv);
      }

      if (excludeBillId) {
        billQuery += ' AND b.id != ?';
        billParams.push(excludeBillId);
      }

      const billMatch = db.prepare(billQuery).get(...billParams);
      if (billMatch) {
        return {
          isDuplicate: true,
          matchType: 'invoice_number',
          duplicate: {
            id: billMatch.expense_id || billMatch.bill_id,
            bill_id: billMatch.bill_id,
            expense_id: billMatch.expense_id,
            transaction_number: billMatch.transaction_number,
            bill_number: billMatch.bill_number,
            invoice_number: billMatch.bill_number,
            date: billMatch.bill_date,
            bill_date: billMatch.bill_date,
            amount: billMatch.total_amount,
            total_amount: billMatch.total_amount,
            vendor_name: billMatch.vendor_name || effectiveVendorName
          },
          message: `Bill #${billMatch.bill_number} from ${billMatch.vendor_name || 'this vendor'} has already been recorded on ${billMatch.bill_date} for ₹${billMatch.total_amount}${billMatch.transaction_number ? ` (${billMatch.transaction_number})` : ''}. આ બિલ પહેલેથી જ ચોપડે નોંધાયેલ છે. ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
        };
      }
    }

    // 3. Check by Vendor + Date + Amount Match (for handwritten challans/cash memos without clear bill numbers)
    if (effectiveVendorId && checkDate && !isNaN(checkAmt) && checkAmt > 0) {
      // Check vendor_bills
      let dateAmtBillQuery = `
        SELECT b.id as bill_id, b.bill_number, b.bill_date, b.total_amount, b.expense_id, v.name as vendor_name, e.transaction_number
        FROM vendor_bills b
        LEFT JOIN vendors v ON v.id = b.vendor_id
        LEFT JOIN expenses e ON e.id = b.expense_id
        WHERE b.business_id = ? AND b.vendor_id = ? AND b.bill_date = ? AND ABS(b.total_amount - ?) < 0.01
      `;
      const dateAmtBillParams = [businessId, effectiveVendorId, checkDate, checkAmt];
      if (excludeBillId) {
        dateAmtBillQuery += ' AND b.id != ?';
        dateAmtBillParams.push(excludeBillId);
      }
      const dateAmtBillMatch = db.prepare(dateAmtBillQuery).get(...dateAmtBillParams);
      if (dateAmtBillMatch) {
        return {
          isDuplicate: true,
          matchType: 'vendor_date_amount',
          duplicate: {
            bill_id: dateAmtBillMatch.bill_id,
            expense_id: dateAmtBillMatch.expense_id,
            transaction_number: dateAmtBillMatch.transaction_number,
            bill_number: dateAmtBillMatch.bill_number,
            invoice_number: dateAmtBillMatch.bill_number,
            date: dateAmtBillMatch.bill_date,
            bill_date: dateAmtBillMatch.bill_date,
            amount: dateAmtBillMatch.total_amount,
            total_amount: dateAmtBillMatch.total_amount,
            vendor_name: dateAmtBillMatch.vendor_name || effectiveVendorName
          },
          message: `આ વેપારી (${dateAmtBillMatch.vendor_name}) માટે તારીખ ${dateAmtBillMatch.bill_date} ના રોજ ₹${dateAmtBillMatch.total_amount} નું બિલ પહેલેથી જ ચોપડે નોંધાયેલ છે. ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
        };
      }

      // Check expenses
      let dateAmtExpQuery = `
        SELECT e.id as expense_id, e.transaction_number, e.transaction_date, e.amount, e.invoice_number, v.name as vendor_name
        FROM expenses e
        LEFT JOIN vendors v ON v.id = e.vendor_id
        WHERE e.business_id = ? AND e.vendor_id = ? AND e.transaction_date = ? AND ABS(e.amount - ?) < 0.01 AND e.approval_status != 'voided'
      `;
      const dateAmtExpParams = [businessId, effectiveVendorId, checkDate, checkAmt];
      if (excludeExpenseId) {
        dateAmtExpQuery += ' AND e.id != ?';
        dateAmtExpParams.push(excludeExpenseId);
      }
      const dateAmtExpMatch = db.prepare(dateAmtExpQuery).get(...dateAmtExpParams);
      if (dateAmtExpMatch) {
        return {
          isDuplicate: true,
          matchType: 'vendor_date_amount',
          duplicate: {
            expense_id: dateAmtExpMatch.expense_id,
            transaction_number: dateAmtExpMatch.transaction_number,
            bill_number: dateAmtExpMatch.invoice_number,
            invoice_number: dateAmtExpMatch.invoice_number,
            date: dateAmtExpMatch.transaction_date,
            transaction_date: dateAmtExpMatch.transaction_date,
            amount: dateAmtExpMatch.amount,
            total_amount: dateAmtExpMatch.amount,
            vendor_name: dateAmtExpMatch.vendor_name || effectiveVendorName
          },
          message: `આ વેપારી (${dateAmtExpMatch.vendor_name}) માટે તારીખ ${dateAmtExpMatch.transaction_date} ના રોજ ₹${dateAmtExpMatch.amount} નો ખર્ચ (${dateAmtExpMatch.transaction_number}) પહેલેથી જ નોંધાયેલ છે. ડબલ એન્ટ્રી પ્રતિબંધિત છે.`
        };
      }
    }

    return { isDuplicate: false, duplicate: null };
  },

  /**
   * Alias for backward compatibility
   */
  checkDuplicateExpense(businessId, params) {
    return this.checkBillDuplicate(businessId, params);
  },

  // Create expense (handles both Quick and Detailed entry)
  createExpense(user, data, file = null) {
    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    const amount = parseAndValidateAmount(data.amount);

    if (!data.category_id) {
      throw new Error('Expense category is required.');
    }

    // Verify category exists and is active for this business
    const category = db.prepare(`
      SELECT id, code, classification, is_active FROM expense_categories
      WHERE id = ? AND business_id = ?
    `).get(data.category_id, businessId);

    if (!category) {
      throw new Error('Selected category not found.');
    }
    if (!category.is_active) {
      throw new Error('Selected category is inactive and cannot be used for new expenses.');
    }

    // Verify vendor if provided
    if (data.vendor_id) {
      const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND business_id = ?').get(data.vendor_id, businessId);
      if (!vendor) {
        throw new Error('Selected vendor not found.');
      }
    }

    // Worker resolution:
    // 1. If explicitly passed, verify worker belongs to business
    let worker = null;
    let workerId = data.worker_id || null;
    if (workerId) {
      worker = db.prepare('SELECT id, name FROM workers WHERE id = ? AND business_id = ?').get(workerId, businessId);
      if (!worker) {
        throw new Error('Selected worker not found.');
      }
    } else if (category.code === 'worker_advance_upad' || category.code === 'worker_wages' || category.classification === 'people_wages') {
      // 2. Try auto-detecting worker name from description / notes
      const searchStr = `${data.description || ''} ${data.notes || ''}`.trim();
      if (searchStr) {
        const activeWorkers = db.prepare('SELECT id, name, phone, diary_page FROM workers WHERE business_id = ? AND is_active = 1').all(businessId);
        worker = matchWorkerFromText(searchStr, activeWorkers);
        if (worker) {
          workerId = worker.id;
        }
      }
    }

    // Transaction date defaults to today (YYYY-MM-DD)
    const transactionDate = data.transaction_date || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
      throw new Error('Transaction date must be in YYYY-MM-DD format.');
    }

    // Check for duplicate expense (by invoice number & vendor, or scanned receipt)
    if (!data.allow_duplicate) {
      const dupeCheck = this.checkDuplicateExpense(businessId, {
        vendor_id: data.vendor_id,
        invoice_number: data.invoice_number,
        stored_filename: data.stored_filename
      });
      if (dupeCheck.isDuplicate) {
        const error = new Error(dupeCheck.message);
        error.code = 'DUPLICATE_EXPENSE';
        error.duplicate = dupeCheck.duplicate;
        throw error;
      }
    }

    // Fetch business settings for approval workflow
    const settings = db.prepare('SELECT * FROM business_settings WHERE business_id = ?').get(businessId);
    const threshold = settings ? settings.approval_threshold : 5000.00;
    const requireApproval = settings ? settings.require_approval_above_threshold : 1;
    const autoApproveStaff = settings ? settings.auto_approve_staff_expenses : 0;

    let approvalStatus = 'approved';
    let approvedBy = user.id;
    let approvedAt = now;

    if (user.role === 'staff') {
      if (requireApproval && amount > threshold) {
        approvalStatus = 'pending_approval';
        approvedBy = null;
        approvedAt = null;
      } else if (!autoApproveStaff) {
        approvalStatus = 'pending_approval';
        approvedBy = null;
        approvedAt = null;
      }
    }

    // Payment status handling
    let paymentStatus = data.payment_status || (data.payment_method ? 'paid' : 'unpaid');
    let paymentMethod = data.payment_method || (paymentStatus === 'paid' ? 'cash' : null);
    let paidAmount = 0;

    if (paymentStatus === 'paid') {
      paidAmount = amount;
      if (!paymentMethod) {
        throw new Error('Payment method is required for paid expenses.');
      }
    } else if (paymentStatus === 'partially_paid') {
      if (data.paid_amount === undefined || data.paid_amount === null) {
        throw new Error('Paid amount is required for partially paid expenses.');
      }
      paidAmount = parseAndValidateAmount(data.paid_amount);
      if (paidAmount >= amount) {
        paymentStatus = 'paid';
        paidAmount = amount;
      }
      if (!paymentMethod) {
        throw new Error('Payment method is required when recording a payment.');
      }
    } else {
      // Unpaid
      paymentStatus = 'unpaid';
      paidAmount = 0;
      paymentMethod = null;
    }

    const expenseId = 'exp_' + crypto.randomUUID();

    return db.transaction(() => {
      const txNumber = generateTransactionNumber(db, businessId, transactionDate);

      db.prepare(`
        INSERT INTO expenses (
          id, business_id, transaction_number, category_id, vendor_id, worker_id,
          transaction_type, description, transaction_date, amount, currency_code,
          payment_status, approval_status, payment_method, invoice_number,
          notes, created_by, approved_by, approved_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'INR',
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `).run(
        expenseId,
        businessId,
        txNumber,
        data.category_id,
        data.vendor_id || null,
        workerId || null,
        data.transaction_type || category.classification,
        data.description || null,
        transactionDate,
        amount,
        paymentStatus,
        approvalStatus,
        paymentMethod,
        data.invoice_number || null,
        data.notes || null,
        user.id,
        approvedBy,
        approvedAt,
        now,
        now
      );

      // Auto-record linked Worker Khata transaction if worker is attached and sync not skipped
      if (workerId && !data.skip_worker_khata_sync) {
        const existingWtx = db.prepare('SELECT id FROM worker_transactions WHERE expense_id = ?').get(expenseId);
        if (!existingWtx) {
          const wtxId = 'wtx_' + crypto.randomUUID();
          const isWage = category.code === 'worker_wages';
          const txType = isWage ? 'salary_paid' : 'advance_given';
          const defaultNote = isWage ? `કારીગર પગાર ચૂકવણી (${txNumber})` : `કારીગર ઉપાડ (${txNumber})`;

          db.prepare(`
            INSERT INTO worker_transactions (
              id, business_id, worker_id, transaction_type, category_type, farsan_items,
              amount, transaction_date, payment_method, notes, expense_id,
              settlement_period, recorded_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            wtxId,
            businessId,
            workerId,
            txType,
            'cash',
            null,
            amount,
            transactionDate,
            paymentMethod || 'cash',
            data.description || defaultNote,
            expenseId,
            null,
            user.id,
            now,
            now
          );

          logAudit(db, {
            businessId,
            actorUserId: user.id,
            entityType: 'worker_transaction',
            entityId: wtxId,
            action: 'create',
            prevValues: null,
            newValues: { worker_id: workerId, worker_name: worker ? worker.name : null, type: txType, amount, expense_id: expenseId },
            reason: `Auto-recorded ${txType} of ₹${amount} into worker Khata from expense ${txNumber}`
          });
        }
      }

      // Create initial payment record if paid or partially paid
      if (paidAmount > 0) {
        const paymentId = 'pay_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO expense_payments (
            id, business_id, expense_id, payment_date, amount,
            payment_method, reference_number, notes, recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          paymentId,
          businessId,
          expenseId,
          transactionDate,
          paidAmount,
          paymentMethod,
          data.reference_number || null,
          data.payment_notes || null,
          user.id,
          now,
          now
        );
      }

      // Handle receipt attachment
      if (file) {
        const attachmentId = 'att_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO expense_attachments (
            id, business_id, expense_id, storage_key, original_filename,
            content_type, file_size_bytes, uploaded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          attachmentId,
          businessId,
          expenseId,
          file.filename,
          file.originalname,
          file.mimetype,
          file.size,
          user.id,
          now
        );
      } else if (data.stored_filename) {
        const attachmentId = 'att_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO expense_attachments (
            id, business_id, expense_id, storage_key, original_filename,
            content_type, file_size_bytes, uploaded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          attachmentId,
          businessId,
          expenseId,
          data.stored_filename,
          data.stored_originalname || data.stored_filename,
          data.stored_mimetype || 'image/jpeg',
          parseInt(data.stored_size, 10) || 0,
          user.id,
          now
        );
      }

      // Auto-record linked Vendor Bill if vendor is attached and sync not skipped
      if (data.vendor_id && !data.skip_vendor_bill_sync) {
        const existingBill = db.prepare('SELECT id FROM vendor_bills WHERE expense_id = ?').get(expenseId);
        if (!existingBill) {
          const billId = 'bill_' + crypto.randomUUID();
          const cleanBillNumber = data.invoice_number ? String(data.invoice_number).trim() : null;
          const billPaidAmount = paymentStatus === 'paid' ? amount : (paymentStatus === 'partially_paid' ? paidAmount : 0);
          const billAttachment = file || (data.stored_filename ? {
            filename: data.stored_filename,
            originalname: data.stored_originalname || data.stored_filename,
            mimetype: data.stored_mimetype || 'image/jpeg',
            size: parseInt(data.stored_size, 10) || 0
          } : null);

          db.prepare(`
            INSERT INTO vendor_bills (
              id, business_id, vendor_id, expense_id, bill_number, bill_date,
              due_date, po_number, subtotal, taxable_amount, cgst, sgst, igst,
              other_charges, discount, total_amount, payment_status, paid_amount,
              notes, ocr_status, ocr_raw_text, ocr_confidence, created_by,
              created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?
            )
          `).run(
            billId,
            businessId,
            data.vendor_id,
            expenseId,
            cleanBillNumber,
            transactionDate,
            null,
            data.reference_number || null,
            amount,
            amount,
            0, 0, 0, 0, 0,
            amount,
            paymentStatus,
            billPaidAmount,
            data.description || data.notes || null,
            billAttachment ? 'completed' : 'manual',
            null,
            null,
            user.id,
            now,
            now
          );

          if (billAttachment) {
            const billAttId = 'bat_' + crypto.randomUUID();
            db.prepare(`
              INSERT INTO bill_attachments (
                id, business_id, bill_id, storage_key, original_filename,
                content_type, file_size_bytes, uploaded_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              billAttId,
              businessId,
              billId,
              billAttachment.filename,
              billAttachment.originalname || billAttachment.filename,
              billAttachment.mimetype || 'image/jpeg',
              billAttachment.size || 0,
              user.id,
              now
            );
          }

          logAudit(db, {
            businessId,
            actorUserId: user.id,
            entityType: 'vendor_bill',
            entityId: billId,
            action: 'create',
            prevValues: null,
            newValues: { billId, vendor_id: data.vendor_id, total_amount: amount, bill_number: cleanBillNumber, expense_id: expenseId },
            reason: `Auto-recorded vendor bill from daily expense ${txNumber}`
          });
        }
      }

      // Log creation in audit trail
      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'create',
        prevValues: null,
        newValues: {
          txNumber,
          amount,
          categoryId: data.category_id,
          paymentStatus,
          approvalStatus
        },
        reason: 'Initial expense record'
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Record an additional payment against an unpaid or partially paid expense
  addPayment(user, expenseId, paymentData) {
    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    const paymentAmount = parseAndValidateAmount(paymentData.amount);
    if (!paymentData.payment_method) {
      throw new Error('Payment method is required.');
    }

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Cannot add payment to a voided expense.');
      }
      if (expense.approval_status === 'rejected') {
        throw new Error('Cannot add payment to a rejected expense.');
      }

      // Calculate already paid sum
      const paidSumRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM expense_payments WHERE expense_id = ? AND business_id = ?
      `).get(expenseId, businessId);

      const totalPaidSoFar = Math.round(Number(paidSumRow.total_paid) * 100) / 100;
      const newTotalPaid = Math.round((totalPaidSoFar + paymentAmount) * 100) / 100;

      if (newTotalPaid > expense.amount) {
        const remaining = Math.round((expense.amount - totalPaidSoFar) * 100) / 100;
        throw new Error(`Payment of ₹${paymentAmount} exceeds remaining obligation of ₹${remaining}. Overpayment is prohibited.`);
      }

      const paymentId = 'pay_' + crypto.randomUUID();
      const paymentDate = paymentData.payment_date || new Date().toISOString().slice(0, 10);

      db.prepare(`
        INSERT INTO expense_payments (
          id, business_id, expense_id, payment_date, amount,
          payment_method, reference_number, notes, recorded_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        businessId,
        expenseId,
        paymentDate,
        paymentAmount,
        paymentData.payment_method,
        paymentData.reference_number || null,
        paymentData.notes || null,
        user.id,
        now,
        now
      );

      // Update expense payment status
      const newStatus = newTotalPaid >= expense.amount ? 'paid' : 'partially_paid';
      db.prepare(`
        UPDATE expenses SET payment_status = ?, updated_at = ? WHERE id = ?
      `).run(newStatus, now, expenseId);

      // Keep linked vendor bill in sync
      const linkedBill = db.prepare('SELECT id, total_amount FROM vendor_bills WHERE expense_id = ?').get(expenseId);
      if (linkedBill) {
        db.prepare(`
          UPDATE vendor_bills SET payment_status = ?, paid_amount = ?, updated_at = ? WHERE id = ?
        `).run(newStatus, newTotalPaid, now, linkedBill.id);
      } else if (expense.vendor_id && expense.invoice_number) {
        const matchedBill = db.prepare(`
          SELECT id FROM vendor_bills 
          WHERE vendor_id = ? AND UPPER(TRIM(COALESCE(bill_number, ''))) = UPPER(TRIM(?))
        `).get(expense.vendor_id, expense.invoice_number);
        if (matchedBill) {
          db.prepare(`
            UPDATE vendor_bills SET payment_status = ?, paid_amount = ?, expense_id = ?, updated_at = ? WHERE id = ?
          `).run(newStatus, newTotalPaid, expenseId, now, matchedBill.id);
        }
      }

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'payment_added',
        prevValues: { paid: totalPaidSoFar, status: expense.payment_status },
        newValues: { paymentAdded: paymentAmount, newTotalPaid, status: newStatus },
        reason: paymentData.notes || 'Additional payment recorded'
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Update an existing payment installment
  updatePayment(user, expenseId, paymentId, paymentData) {
    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Cannot edit payment of a voided expense.');
      }

      const payment = db.prepare(`
        SELECT * FROM expense_payments WHERE id = ? AND expense_id = ? AND business_id = ?
      `).get(paymentId, expenseId, businessId);

      if (!payment) {
        throw new Error('Payment record not found.');
      }

      if (user.role === 'staff' && payment.recorded_by !== user.id) {
        throw new Error('Staff can only edit payments they recorded.');
      }

      const newAmount = paymentData.amount !== undefined 
        ? parseAndValidateAmount(paymentData.amount) 
        : payment.amount;

      const newMethod = paymentData.payment_method || payment.payment_method;
      if (!['cash', 'upi', 'bank_transfer', 'card'].includes(newMethod)) {
        throw new Error('Invalid payment method.');
      }

      const newDate = paymentData.payment_date || payment.payment_date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        throw new Error('Payment date must be in YYYY-MM-DD format.');
      }

      const newRef = paymentData.reference_number !== undefined ? paymentData.reference_number : payment.reference_number;
      const newNotes = paymentData.notes !== undefined ? paymentData.notes : payment.notes;

      // Sum of other payments
      const otherPaidRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expense_payments 
        WHERE expense_id = ? AND business_id = ? AND id != ?
      `).get(expenseId, businessId, paymentId);

      const otherPaid = Math.round(Number(otherPaidRow.total) * 100) / 100;
      const newTotalPaid = Math.round((otherPaid + newAmount) * 100) / 100;

      if (newTotalPaid > expense.amount) {
        const remaining = Math.round((expense.amount - otherPaid) * 100) / 100;
        throw new Error(`Updated payment of ₹${newAmount} exceeds allowable balance of ₹${remaining} (Total bill: ₹${expense.amount}).`);
      }

      db.prepare(`
        UPDATE expense_payments SET
          amount = ?,
          payment_method = ?,
          payment_date = ?,
          reference_number = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newAmount, newMethod, newDate, newRef || null, newNotes || null, now, paymentId);

      // Recalculate expense payment status
      const newStatus = newTotalPaid >= expense.amount ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : 'unpaid');
      db.prepare(`
        UPDATE expenses SET
          payment_status = ?,
          payment_method = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newStatus, newMethod, now, expenseId);

      // Synchronize linked vendor bill
      const linkedBill = db.prepare('SELECT id FROM vendor_bills WHERE expense_id = ?').get(expenseId);
      if (linkedBill) {
        db.prepare(`
          UPDATE vendor_bills SET
            payment_status = ?,
            paid_amount = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newStatus, newTotalPaid, now, linkedBill.id);
      } else if (expense.vendor_id && expense.invoice_number) {
        const matchedBill = db.prepare(`
          SELECT id FROM vendor_bills 
          WHERE vendor_id = ? AND UPPER(TRIM(COALESCE(bill_number, ''))) = UPPER(TRIM(?))
        `).get(expense.vendor_id, expense.invoice_number);
        if (matchedBill) {
          db.prepare(`
            UPDATE vendor_bills SET
              payment_status = ?,
              paid_amount = ?,
              updated_at = ?
            WHERE id = ?
          `).run(newStatus, newTotalPaid, now, matchedBill.id);
        }
      }

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'payment_updated',
        prevValues: { amount: payment.amount, payment_method: payment.payment_method, payment_date: payment.payment_date },
        newValues: { amount: newAmount, payment_method: newMethod, payment_date: newDate },
        reason: paymentData.notes || `Payment updated to ${newMethod.toUpperCase()} (₹${newAmount})`
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Delete an existing payment installment
  deletePayment(user, expenseId, paymentId, reason = 'Payment deleted by user') {
    if (!['owner', 'manager'].includes(user.role)) {
      throw new Error('Only owners and managers can delete payments.');
    }

    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Cannot delete payment from a voided expense.');
      }

      const payment = db.prepare(`
        SELECT * FROM expense_payments WHERE id = ? AND expense_id = ? AND business_id = ?
      `).get(paymentId, expenseId, businessId);

      if (!payment) {
        throw new Error('Payment record not found.');
      }

      db.prepare('DELETE FROM expense_payments WHERE id = ?').run(paymentId);

      // Remaining payments sum
      const paidRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total,
               MAX(payment_method) as last_method
        FROM expense_payments 
        WHERE expense_id = ? AND business_id = ?
      `).get(expenseId, businessId);

      const newTotalPaid = Math.round(Number(paidRow.total) * 100) / 100;
      const newStatus = newTotalPaid >= expense.amount ? 'paid' : (newTotalPaid > 0 ? 'partially_paid' : 'unpaid');
      const newMethod = newTotalPaid > 0 ? (paidRow.last_method || 'cash') : null;

      db.prepare(`
        UPDATE expenses SET
          payment_status = ?,
          payment_method = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newStatus, newMethod, now, expenseId);

      // Synchronize linked vendor bill
      const linkedBill = db.prepare('SELECT id FROM vendor_bills WHERE expense_id = ?').get(expenseId);
      if (linkedBill) {
        db.prepare(`
          UPDATE vendor_bills SET
            payment_status = ?,
            paid_amount = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newStatus, newTotalPaid, now, linkedBill.id);
      } else if (expense.vendor_id && expense.invoice_number) {
        const matchedBill = db.prepare(`
          SELECT id FROM vendor_bills 
          WHERE vendor_id = ? AND UPPER(TRIM(COALESCE(bill_number, ''))) = UPPER(TRIM(?))
        `).get(expense.vendor_id, expense.invoice_number);
        if (matchedBill) {
          db.prepare(`
            UPDATE vendor_bills SET
              payment_status = ?,
              paid_amount = ?,
              updated_at = ?
            WHERE id = ?
          `).run(newStatus, newTotalPaid, now, matchedBill.id);
        }
      }

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'payment_deleted',
        prevValues: { deletedPayment: payment },
        newValues: { newTotalPaid, paymentStatus: newStatus },
        reason: reason || `Payment of ₹${payment.amount} deleted`
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Approve a pending expense
  approveExpense(user, expenseId) {
    if (!['owner', 'manager'].includes(user.role)) {
      throw new Error('Only owners and managers can approve expenses.');
    }

    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'approved') {
        throw new Error('Expense is already approved.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Cannot approve a voided expense.');
      }

      db.prepare(`
        UPDATE expenses
        SET approval_status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(user.id, now, now, expenseId);

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'approve',
        prevValues: { approvalStatus: expense.approval_status },
        newValues: { approvalStatus: 'approved', approvedBy: user.id },
        reason: 'Authorized approval'
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Reject a pending expense (requires reason)
  rejectExpense(user, expenseId, reason) {
    if (!['owner', 'manager'].includes(user.role)) {
      throw new Error('Only owners and managers can reject expenses.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is mandatory when rejecting an expense.');
    }

    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Cannot reject a voided expense.');
      }

      db.prepare(`
        UPDATE expenses
        SET approval_status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(user.id, now, reason.trim(), now, expenseId);

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'reject',
        prevValues: { approvalStatus: expense.approval_status },
        newValues: { approvalStatus: 'rejected', rejectionReason: reason.trim() },
        reason: reason.trim()
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Void an approved expense (requires reason)
  voidExpense(user, expenseId, reason) {
    if (!['owner', 'manager'].includes(user.role)) {
      throw new Error('Only owners and managers can void expenses.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is mandatory when voiding an expense.');
    }

    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }
      if (expense.approval_status === 'voided') {
        throw new Error('Expense is already voided.');
      }

      db.prepare(`
        UPDATE expenses
        SET approval_status = 'voided', voided_by = ?, voided_at = ?, void_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(user.id, now, reason.trim(), now, expenseId);

      // Also remove linked worker khata transaction so worker ledger balance reflects voiding
      db.prepare('DELETE FROM worker_transactions WHERE expense_id = ?').run(expenseId);

      // Also clean up auto-linked vendor_bills so vendor ledger reflects voiding
      db.prepare('DELETE FROM bill_attachments WHERE bill_id IN (SELECT id FROM vendor_bills WHERE expense_id = ?)').run(expenseId);
      db.prepare('DELETE FROM vendor_bills WHERE expense_id = ?').run(expenseId);

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'void',
        prevValues: { approvalStatus: expense.approval_status },
        newValues: { approvalStatus: 'voided', voidReason: reason.trim() },
        reason: reason.trim()
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Delete an unwanted expense (Owner/Manager only)
  deleteExpense(user, expenseId, reason = 'Deleted by user') {
    if (!['owner', 'manager'].includes(user.role)) {
      throw new Error('Only owners and managers can delete transactions.');
    }

    const db = getDatabase();
    const businessId = user.business_id;

    return db.transaction(() => {
      const expense = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!expense) {
        throw new Error('Expense not found.');
      }

      // Check for attached physical files to remove from uploads
      const attachments = db.prepare(`
        SELECT storage_key FROM expense_attachments WHERE expense_id = ?
      `).all(expenseId);

      for (const att of attachments) {
        if (att.storage_key) {
          const filePath = path.join(config.UPLOADS_DIR, att.storage_key);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (_) {}
          }
        }
      }

      // Clean up auto-linked vendor bills and attachments
      db.prepare('DELETE FROM bill_attachments WHERE bill_id IN (SELECT id FROM vendor_bills WHERE expense_id = ?)').run(expenseId);
      db.prepare('DELETE FROM vendor_bills WHERE expense_id = ?').run(expenseId);

      // Delete payments and attachments
      db.prepare(`DELETE FROM expense_payments WHERE expense_id = ?`).run(expenseId);
      db.prepare(`DELETE FROM expense_attachments WHERE expense_id = ?`).run(expenseId);

      // Also remove linked worker khata transaction
      db.prepare(`DELETE FROM worker_transactions WHERE expense_id = ?`).run(expenseId);

      // Delete the expense record
      db.prepare(`DELETE FROM expenses WHERE id = ? AND business_id = ?`).run(expenseId, businessId);

      // Audit log the deletion
      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'delete',
        prevValues: {
          transaction_number: expense.transaction_number,
          amount: expense.amount,
          description: expense.description,
          transaction_date: expense.transaction_date,
          invoice_number: expense.invoice_number
        },
        newValues: null,
        reason: reason || 'Transaction deleted'
      });

      return { success: true, deletedId: expenseId, transactionNumber: expense.transaction_number };
    })();
  },

  // Edit an eligible expense
  updateExpense(user, expenseId, data, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is required when modifying a recorded expense.');
    }

    const db = getDatabase();
    const businessId = user.business_id;
    const now = new Date().toISOString();

    return db.transaction(() => {
      const current = db.prepare(`
        SELECT * FROM expenses WHERE id = ? AND business_id = ?
      `).get(expenseId, businessId);

      if (!current) {
        throw new Error('Expense not found.');
      }
      if (current.approval_status === 'voided') {
        throw new Error('Cannot edit a voided expense.');
      }

      // Check permissions: Staff can only edit their own draft or pending expenses
      if (user.role === 'staff') {
        if (current.created_by !== user.id) {
          throw new Error('Staff can only edit expenses they created.');
        }
        if (current.approval_status === 'approved') {
          throw new Error('Staff cannot edit approved expenses. Please request an owner or manager.');
        }
      }

      const amount = data.amount !== undefined ? parseAndValidateAmount(data.amount) : current.amount;
      const categoryId = data.category_id || current.category_id;
      const vendorId = data.vendor_id !== undefined ? (data.vendor_id || null) : current.vendor_id;
      const workerId = data.worker_id !== undefined ? (data.worker_id || null) : current.worker_id;
      const description = data.description !== undefined ? data.description : current.description;
      const transactionDate = data.transaction_date || current.transaction_date;
      const invoiceNumber = data.invoice_number !== undefined ? data.invoice_number : current.invoice_number;
      const notes = data.notes !== undefined ? data.notes : current.notes;

      // Check existing payments
      const existingPayments = db.prepare(`
        SELECT * FROM expense_payments WHERE expense_id = ? ORDER BY payment_date ASC, created_at ASC
      `).all(expenseId);
      let totalPaid = existingPayments.reduce((sum, p) => Math.round((sum + Number(p.amount)) * 100) / 100, 0);

      // If user provided a specific payment_amount or if single full payment existed and expense amount changed
      if (existingPayments.length === 1 && data.payment_amount !== undefined) {
        const newPayAmount = parseAndValidateAmount(data.payment_amount);
        db.prepare('UPDATE expense_payments SET amount = ?, updated_at = ? WHERE id = ?').run(newPayAmount, now, existingPayments[0].id);
        existingPayments[0].amount = newPayAmount;
        totalPaid = newPayAmount;
      } else if (existingPayments.length === 1 && totalPaid === current.amount && amount !== current.amount) {
        // Automatically sync single full payment to new total expense amount
        db.prepare('UPDATE expense_payments SET amount = ?, updated_at = ? WHERE id = ?').run(amount, now, existingPayments[0].id);
        existingPayments[0].amount = amount;
        totalPaid = amount;
      }

      // If payment_method was passed, update expenses.payment_method and sync existing payment(s)
      let paymentMethod = data.payment_method !== undefined ? data.payment_method : current.payment_method;
      if (data.payment_method && existingPayments.length > 0) {
        db.prepare('UPDATE expense_payments SET payment_method = ?, updated_at = ? WHERE expense_id = ?').run(data.payment_method, now, expenseId);
      }

      if (totalPaid > amount) {
        throw new Error(`New amount of ₹${amount} cannot be less than already paid amount of ₹${totalPaid}. Please adjust or delete the payment first.`);
      }

      let paymentStatus = current.payment_status;
      if (data.payment_status && ['paid', 'unpaid', 'partially_paid'].includes(data.payment_status)) {
        paymentStatus = data.payment_status;
      } else if (totalPaid === 0) {
        paymentStatus = 'unpaid';
      } else if (totalPaid >= amount) {
        paymentStatus = 'paid';
      } else {
        paymentStatus = 'partially_paid';
      }

      // Reapproval check if amount changed significantly or modified by staff
      let approvalStatus = current.approval_status;
      if (amount !== current.amount && current.approval_status === 'approved' && user.role === 'staff') {
        approvalStatus = 'pending_approval';
      }

      db.prepare(`
        UPDATE expenses SET
          amount = ?, category_id = ?, vendor_id = ?, worker_id = ?, description = ?,
          transaction_date = ?, invoice_number = ?, notes = ?,
          payment_status = ?, approval_status = ?, payment_method = ?, updated_at = ?
        WHERE id = ?
      `).run(
        amount, categoryId, vendorId, workerId, description,
        transactionDate, invoiceNumber, notes,
        paymentStatus, approvalStatus, paymentMethod, now, expenseId
      );

      // Keep linked worker transaction in sync if present
      db.prepare(`
        UPDATE worker_transactions SET
          amount = ?, transaction_date = ?, notes = ?, updated_at = ?
        WHERE expense_id = ?
      `).run(amount, transactionDate, description || `Updated expense ${current.transaction_number}`, now, expenseId);

      // Keep linked vendor bill in sync if present or create if vendor attached
      const billPaidAmount = paymentStatus === 'paid' ? amount : (paymentStatus === 'partially_paid' ? totalPaid : 0);
      const billSubtotal = data.subtotal !== undefined ? parseAndValidateAmount(data.subtotal) : amount;
      const billDueDate = data.due_date !== undefined ? (data.due_date || null) : null;
      let billOcrRawText = null;
      if (data.ocr_raw_text) {
        billOcrRawText = typeof data.ocr_raw_text === 'string' ? data.ocr_raw_text : JSON.stringify(data.ocr_raw_text, null, 2);
      } else if (Array.isArray(data.items)) {
        billOcrRawText = JSON.stringify({
          invoiceNumber: invoiceNumber || null,
          invoiceDate: transactionDate,
          dueDate: billDueDate,
          subtotal: billSubtotal,
          totalAmount: amount,
          items: data.items
        }, null, 2);
      }

      const linkedBill = db.prepare('SELECT id, ocr_raw_text FROM vendor_bills WHERE expense_id = ?').get(expenseId);
      if (linkedBill) {
        if (vendorId) {
          db.prepare(`
            UPDATE vendor_bills SET
              vendor_id = ?, bill_number = ?, bill_date = ?, due_date = COALESCE(?, due_date),
              subtotal = ?, taxable_amount = ?,
              total_amount = ?, payment_status = ?, paid_amount = ?, notes = ?,
              ocr_raw_text = COALESCE(?, ocr_raw_text), updated_at = ?
            WHERE id = ?
          `).run(
            vendorId,
            invoiceNumber || null,
            transactionDate,
            billDueDate,
            billSubtotal,
            billSubtotal,
            amount,
            paymentStatus,
            billPaidAmount,
            description || notes || null,
            billOcrRawText,
            now,
            linkedBill.id
          );
        } else {
          db.prepare('DELETE FROM bill_attachments WHERE bill_id = ?').run(linkedBill.id);
          db.prepare('DELETE FROM vendor_bills WHERE id = ?').run(linkedBill.id);
        }
      } else if (vendorId) {
        const matchedBill = invoiceNumber ? db.prepare(`
          SELECT id, ocr_raw_text FROM vendor_bills 
          WHERE vendor_id = ? AND UPPER(TRIM(COALESCE(bill_number, ''))) = UPPER(TRIM(?))
        `).get(vendorId, invoiceNumber) : null;

        if (matchedBill) {
          db.prepare(`
            UPDATE vendor_bills SET
              expense_id = ?, bill_date = ?, due_date = COALESCE(?, due_date),
              subtotal = ?, taxable_amount = ?,
              total_amount = ?, payment_status = ?, paid_amount = ?, notes = ?,
              ocr_raw_text = COALESCE(?, ocr_raw_text), updated_at = ?
            WHERE id = ?
          `).run(
            expenseId,
            transactionDate,
            billDueDate,
            billSubtotal,
            billSubtotal,
            amount,
            paymentStatus,
            billPaidAmount,
            description || notes || null,
            billOcrRawText,
            now,
            matchedBill.id
          );
        } else {
          const newBillId = 'bill_' + crypto.randomUUID();
          db.prepare(`
            INSERT INTO vendor_bills (
              id, business_id, vendor_id, expense_id, bill_number, bill_date, due_date,
              subtotal, taxable_amount, total_amount, payment_status, paid_amount,
              notes, ocr_status, ocr_raw_text, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newBillId,
            businessId,
            vendorId,
            expenseId,
            invoiceNumber || null,
            transactionDate,
            billDueDate,
            billSubtotal,
            billSubtotal,
            amount,
            paymentStatus,
            billPaidAmount,
            description || notes || null,
            billOcrRawText ? 'completed' : 'manual',
            billOcrRawText || null,
            user.id,
            now,
            now
          );
        }
      }

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'expense',
        entityId: expenseId,
        action: 'edit',
        prevValues: {
          amount: current.amount,
          categoryId: current.category_id,
          description: current.description,
          transactionDate: current.transaction_date
        },
        newValues: {
          amount,
          categoryId,
          description,
          transactionDate
        },
        reason: reason.trim()
      });

      return ExpenseService.getExpenseById(businessId, expenseId);
    })();
  },

  // Get full details of a single expense
  getExpenseById(businessId, expenseId) {
    const db = getDatabase();

    const expense = db.prepare(`
      SELECT e.*,
             c.name_en as category_name_en, c.name_gu as category_name_gu, c.icon as category_icon, c.classification as category_classification,
             v.name as vendor_name, v.phone as vendor_phone, v.gstin as vendor_gstin, v.category as vendor_category, v.address as vendor_address, v.city as vendor_city,
             w.name as worker_name, w.phone as worker_phone,
             u.full_name as creator_name,
             appr.full_name as approver_name,
             rej.full_name as rejector_name,
             void_u.full_name as voider_name,
             vb.id as bill_id, vb.bill_number, vb.bill_date, vb.due_date, vb.subtotal as bill_subtotal, vb.taxable_amount as bill_taxable_amount,
             vb.cgst, vb.sgst, vb.igst, vb.other_charges, vb.discount, vb.ocr_status, vb.ocr_confidence, vb.ocr_raw_text
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN workers w ON w.id = e.worker_id
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN users appr ON appr.id = e.approved_by
      LEFT JOIN users rej ON rej.id = e.rejected_by
      LEFT JOIN users void_u ON void_u.id = e.voided_by
      LEFT JOIN vendor_bills vb ON (vb.expense_id = e.id OR (vb.vendor_id = e.vendor_id AND vb.bill_number = e.invoice_number AND vb.bill_number IS NOT NULL AND vb.bill_number != ''))
      WHERE e.id = ? AND e.business_id = ?
    `).get(expenseId, businessId);

    if (!expense) return null;

    // Fetch payments
    const payments = db.prepare(`
      SELECT p.*, u.full_name as recorded_by_name
      FROM expense_payments p
      LEFT JOIN users u ON u.id = p.recorded_by
      WHERE p.expense_id = ? AND p.business_id = ?
      ORDER BY p.payment_date ASC, p.created_at ASC
    `).all(expenseId, businessId);

    // Fetch attachments
    const attachments = db.prepare(`
      SELECT a.id, a.storage_key, a.original_filename, a.content_type, a.file_size_bytes, a.created_at,
             u.full_name as uploaded_by_name
      FROM expense_attachments a
      LEFT JOIN users u ON u.id = a.uploaded_by
      WHERE a.expense_id = ? AND a.business_id = ?
      ORDER BY a.created_at DESC
    `).all(expenseId, businessId);

    // Also fetch bill attachments if linked bill exists and expense_attachments is empty
    if (attachments.length === 0 && expense.bill_id) {
      const billAtts = db.prepare(`
        SELECT ba.id, ba.storage_key, ba.original_filename, ba.content_type, ba.file_size_bytes, ba.created_at,
               u.full_name as uploaded_by_name,
               1 as is_bill_attachment
        FROM bill_attachments ba
        LEFT JOIN users u ON u.id = ba.uploaded_by
        WHERE ba.bill_id = ? AND ba.business_id = ?
        ORDER BY ba.created_at ASC
      `).all(expense.bill_id, businessId);
      attachments.push(...billAtts);
    }

    // Fetch audit trail
    const auditLogs = db.prepare(`
      SELECT al.*, u.full_name as actor_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.entity_id = ? AND al.business_id = ?
      ORDER BY al.created_at DESC
    `).all(expenseId, businessId);

    const totalPaid = payments.reduce((sum, p) => Math.round((sum + Number(p.amount)) * 100) / 100, 0);
    const balanceDue = Math.max(0, Math.round((Number(expense.amount) - totalPaid) * 100) / 100);

    return {
      ...expense,
      total_paid: totalPaid,
      balance_due: balanceDue,
      payments,
      attachments,
      audit_logs: auditLogs
    };
  },

  // Query expenses with search, filters, pagination, and sorting
  listExpenses(businessId, filters = {}) {
    const db = getDatabase();
    const conditions = ['e.business_id = ?'];
    const params = [businessId];

    if (filters.search) {
      conditions.push(`(
        e.transaction_number LIKE ? OR
        e.description LIKE ? OR
        e.invoice_number LIKE ? OR
        e.notes LIKE ? OR
        v.name LIKE ? OR
        v.phone LIKE ? OR
        w.name LIKE ?
      )`);
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (filters.category_id) {
      conditions.push('e.category_id = ?');
      params.push(filters.category_id);
    }

    if (filters.vendor_id) {
      conditions.push('e.vendor_id = ?');
      params.push(filters.vendor_id);
    }

    if (filters.worker_id) {
      conditions.push('e.worker_id = ?');
      params.push(filters.worker_id);
    }

    if (filters.payment_status) {
      conditions.push('e.payment_status = ?');
      params.push(filters.payment_status);
    }

    if (filters.approval_status) {
      conditions.push('e.approval_status = ?');
      params.push(filters.approval_status);
    }

    if (filters.payment_method) {
      conditions.push('e.payment_method = ?');
      params.push(filters.payment_method);
    }

    if (filters.start_date) {
      conditions.push('e.transaction_date >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('e.transaction_date <= ?');
      params.push(filters.end_date);
    }

    if (filters.min_amount) {
      conditions.push('e.amount >= ?');
      params.push(Number(filters.min_amount));
    }

    if (filters.max_amount) {
      conditions.push('e.amount <= ?');
      params.push(Number(filters.max_amount));
    }

    if (filters.created_by) {
      conditions.push('e.created_by = ?');
      params.push(filters.created_by);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM expenses e
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN workers w ON w.id = e.worker_id
      WHERE ${whereClause}
    `).get(...params);
    const totalCount = countRow.count;

    // Sorting
    let orderBy = 'e.transaction_date DESC, e.created_at DESC';
    if (filters.sort_by === 'amount_asc') orderBy = 'e.amount ASC';
    else if (filters.sort_by === 'amount_desc') orderBy = 'e.amount DESC';
    else if (filters.sort_by === 'date_asc') orderBy = 'e.transaction_date ASC';

    // Pagination
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];

    const rows = db.prepare(`
      SELECT e.*,
             c.name_en as category_name_en, c.name_gu as category_name_gu, c.icon as category_icon, c.classification as category_classification,
             v.name as vendor_name,
             w.name as worker_name, w.phone as worker_phone,
             u.full_name as creator_name,
             (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = e.id) as total_paid
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN workers w ON w.id = e.worker_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    return {
      expenses: rows.map(r => ({
        ...r,
        total_paid: Math.round(Number(r.total_paid) * 100) / 100,
        balance_due: Math.max(0, Math.round((Number(r.amount) - Number(r.total_paid)) * 100) / 100)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }
};

export default ExpenseService;
