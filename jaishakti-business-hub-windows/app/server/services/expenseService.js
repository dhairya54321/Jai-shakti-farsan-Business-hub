import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/index.js';
import config from '../config.js';

// Safe 2-decimal monetary parsing and validation
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
   * Check if an active expense with the same invoice number & vendor, or same scanned receipt file already exists
   */
  checkDuplicateExpense(businessId, { vendor_id, invoice_number, stored_filename, excludeExpenseId = null }) {
    const db = getDatabase();

    // 1. Check by vendor and invoice number (Strong match for bills & invoices)
    if (vendor_id && invoice_number && String(invoice_number).trim()) {
      const cleanInvoice = String(invoice_number).trim();
      let query = `
        SELECT e.id, e.transaction_number, e.transaction_date, e.amount, e.invoice_number, e.vendor_id, v.name as vendor_name
        FROM expenses e
        LEFT JOIN vendors v ON v.id = e.vendor_id
        WHERE e.business_id = ? 
          AND e.approval_status != 'voided'
          AND e.vendor_id = ?
          AND UPPER(TRIM(COALESCE(e.invoice_number, ''))) = UPPER(?)
      `;
      const params = [businessId, vendor_id, cleanInvoice];
      if (excludeExpenseId) {
        query += ' AND e.id != ?';
        params.push(excludeExpenseId);
      }
      const match = db.prepare(query).get(...params);
      if (match) {
        return {
          isDuplicate: true,
          matchType: 'invoice_number',
          duplicate: match,
          message: `An expense for Invoice #${match.invoice_number} from ${match.vendor_name || 'this vendor'} has already been recorded on ${match.transaction_date} for ₹${Number(match.amount).toFixed(2)} (${match.transaction_number}).`
        };
      }
    }

    // 2. Check by stored scanned receipt attachment (if the same scanned file is re-submitted)
    if (stored_filename && String(stored_filename).trim()) {
      let query = `
        SELECT e.id, e.transaction_number, e.transaction_date, e.amount, e.invoice_number, e.vendor_id, v.name as vendor_name
        FROM expense_attachments a
        JOIN expenses e ON e.id = a.expense_id
        LEFT JOIN vendors v ON v.id = e.vendor_id
        WHERE a.business_id = ? 
          AND e.approval_status != 'voided'
          AND a.storage_key = ?
      `;
      const params = [businessId, String(stored_filename).trim()];
      if (excludeExpenseId) {
        query += ' AND e.id != ?';
        params.push(excludeExpenseId);
      }
      const match = db.prepare(query).get(...params);
      if (match) {
        return {
          isDuplicate: true,
          matchType: 'stored_file',
          duplicate: match,
          message: `This receipt has already been attached to an existing expense on ${match.transaction_date} (${match.transaction_number}).`
        };
      }
    }

    return { isDuplicate: false, duplicate: null };
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
      SELECT id, classification, is_active FROM expense_categories
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
          id, business_id, transaction_number, category_id, vendor_id,
          transaction_type, description, transaction_date, amount, currency_code,
          payment_status, approval_status, payment_method, invoice_number,
          notes, created_by, approved_by, approved_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
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

      // If linked to vendor_bills, decouple
      db.prepare(`UPDATE vendor_bills SET expense_id = NULL WHERE expense_id = ?`).run(expenseId);

      // Delete payments and attachments
      db.prepare(`DELETE FROM expense_payments WHERE expense_id = ?`).run(expenseId);
      db.prepare(`DELETE FROM expense_attachments WHERE expense_id = ?`).run(expenseId);

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
      const description = data.description !== undefined ? data.description : current.description;
      const transactionDate = data.transaction_date || current.transaction_date;
      const invoiceNumber = data.invoice_number !== undefined ? data.invoice_number : current.invoice_number;
      const notes = data.notes !== undefined ? data.notes : current.notes;

      // Check that existing paid amount does not exceed new amount
      const paidRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as paid FROM expense_payments WHERE expense_id = ?
      `).get(expenseId);
      const totalPaid = Math.round(Number(paidRow.paid) * 100) / 100;
      if (totalPaid > amount) {
        throw new Error(`New amount of ₹${amount} cannot be less than already paid amount of ₹${totalPaid}.`);
      }

      let paymentStatus = current.payment_status;
      if (totalPaid === 0) paymentStatus = 'unpaid';
      else if (totalPaid >= amount) paymentStatus = 'paid';
      else paymentStatus = 'partially_paid';

      // Reapproval check if amount changed significantly or modified by staff
      let approvalStatus = current.approval_status;
      if (amount !== current.amount && current.approval_status === 'approved' && user.role === 'staff') {
        approvalStatus = 'pending_approval';
      }

      db.prepare(`
        UPDATE expenses SET
          amount = ?, category_id = ?, vendor_id = ?, description = ?,
          transaction_date = ?, invoice_number = ?, notes = ?,
          payment_status = ?, approval_status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        amount, categoryId, vendorId, description,
        transactionDate, invoiceNumber, notes,
        paymentStatus, approvalStatus, now, expenseId
      );

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
             v.name as vendor_name, v.phone as vendor_phone,
             u.full_name as creator_name,
             appr.full_name as approver_name,
             rej.full_name as rejector_name,
             void_u.full_name as voider_name
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN users appr ON appr.id = e.approved_by
      LEFT JOIN users rej ON rej.id = e.rejected_by
      LEFT JOIN users void_u ON void_u.id = e.voided_by
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
        v.name LIKE ?
      )`);
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (filters.category_id) {
      conditions.push('e.category_id = ?');
      params.push(filters.category_id);
    }

    if (filters.vendor_id) {
      conditions.push('e.vendor_id = ?');
      params.push(filters.vendor_id);
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
             u.full_name as creator_name,
             (SELECT COALESCE(SUM(amount), 0) FROM expense_payments WHERE expense_id = e.id) as total_paid
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
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
