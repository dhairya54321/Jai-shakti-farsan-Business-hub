import crypto from 'crypto';
import { getDatabase } from '../db/index.js';
import { logAudit } from './expenseService.js';

// Standard GSTIN regex (15 alphanumeric)
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const PIN_REGEX = /^[1-9][0-9]{5}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Normalize string for search and comparison
 */
export function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Validate vendor input fields
 */
export function validateVendorData(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Vendor name is required.');
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push('Vendor category is required.');
  }

  if (data.phone) {
    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
    const standardPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
    if (!PHONE_REGEX.test(standardPhone)) {
      errors.push('Phone number must be a valid 10-digit Indian mobile number.');
    }
  }

  if (data.alternate_phone) {
    const cleanPhone = data.alternate_phone.replace(/[^0-9]/g, '');
    const standardPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
    if (!PHONE_REGEX.test(standardPhone)) {
      errors.push('Alternate phone number must be a valid 10-digit mobile number.');
    }
  }

  if (data.email && data.email.trim().length > 0) {
    if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.push('Invalid email address format.');
    }
  }

  if (data.pin_code && data.pin_code.trim().length > 0) {
    if (!PIN_REGEX.test(data.pin_code.trim())) {
      errors.push('PIN code must be a valid 6-digit postal code.');
    }
  }

  if (data.gstin && data.gstin.trim().length > 0) {
    const cleanGstin = data.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(cleanGstin)) {
      errors.push('Invalid GSTIN format (15 characters: e.g. 24AAAAA0000A1Z5). Note: This is a format check only, not official GST verification.');
    }
  }

  if (data.pan && data.pan.trim().length > 0) {
    const cleanPan = data.pan.trim().toUpperCase();
    if (!PAN_REGEX.test(cleanPan)) {
      errors.push('Invalid PAN format (10 characters: e.g. ABCDE1234F).');
    }
  }

  if (data.credit_limit !== undefined && data.credit_limit !== null && data.credit_limit !== '') {
    const limit = Number(data.credit_limit);
    if (isNaN(limit) || limit < 0) {
      errors.push('Credit limit must be a positive number.');
    }
  }

  return errors;
}

export const VendorService = {
  /**
   * Check for duplicate vendors using GSTIN, Name, Phone, and Email
   */
  checkDuplicates(businessId, { gstin, name, phone, email, excludeVendorId = null }) {
    const db = getDatabase();
    const matchesMap = new Map();

    const normalizedGstin = gstin ? gstin.trim().toUpperCase() : null;
    const normalizedName = name ? normalizeString(name) : null;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    // 1. Check GSTIN match
    if (normalizedGstin && normalizedGstin.length > 0) {
      let gstinQuery = `
        SELECT * FROM vendors
        WHERE business_id = ? AND (
          UPPER(TRIM(COALESCE(gstin, ''))) = ? OR
          UPPER(TRIM(COALESCE(tax_identifier, ''))) = ?
        )
      `;
      const params = [businessId, normalizedGstin, normalizedGstin];
      if (excludeVendorId) {
        gstinQuery += ' AND id != ?';
        params.push(excludeVendorId);
      }
      const gstinMatches = db.prepare(gstinQuery).all(...params);
      for (const v of gstinMatches) {
        matchesMap.set(v.id, { vendor: v, matchedFields: ['gstin'] });
      }
    }

    // 2. Check Phone match
    if (cleanPhone && cleanPhone.length === 10) {
      let phoneQuery = `
        SELECT * FROM vendors
        WHERE business_id = ? AND (
          phone LIKE ? OR alternate_phone LIKE ?
        )
      `;
      const params = [businessId, `%${cleanPhone}`, `%${cleanPhone}`];
      if (excludeVendorId) {
        phoneQuery += ' AND id != ?';
        params.push(excludeVendorId);
      }
      const phoneMatches = db.prepare(phoneQuery).all(...params);
      for (const v of phoneMatches) {
        if (matchesMap.has(v.id)) {
          matchesMap.get(v.id).matchedFields.push('phone');
        } else {
          matchesMap.set(v.id, { vendor: v, matchedFields: ['phone'] });
        }
      }
    }

    // 3. Check Email match
    if (normalizedEmail && normalizedEmail.length > 0) {
      let emailQuery = `
        SELECT * FROM vendors
        WHERE business_id = ? AND LOWER(TRIM(COALESCE(email, ''))) = ?
      `;
      const params = [businessId, normalizedEmail];
      if (excludeVendorId) {
        emailQuery += ' AND id != ?';
        params.push(excludeVendorId);
      }
      const emailMatches = db.prepare(emailQuery).all(...params);
      for (const v of emailMatches) {
        if (matchesMap.has(v.id)) {
          matchesMap.get(v.id).matchedFields.push('email');
        } else {
          matchesMap.set(v.id, { vendor: v, matchedFields: ['email'] });
        }
      }
    }

    // 4. Check Normalized Name match
    if (normalizedName && normalizedName.length >= 3) {
      let nameQuery = `SELECT * FROM vendors WHERE business_id = ?`;
      const params = [businessId];
      if (excludeVendorId) {
        nameQuery += ' AND id != ?';
        params.push(excludeVendorId);
      }
      const allVendors = db.prepare(nameQuery).all(...params);
      for (const v of allVendors) {
        const vNorm = normalizeString(v.name);
        if (vNorm === normalizedName || (vNorm.length > 4 && (vNorm.includes(normalizedName) || normalizedName.includes(vNorm)))) {
          if (matchesMap.has(v.id)) {
            if (!matchesMap.get(v.id).matchedFields.includes('name')) {
              matchesMap.get(v.id).matchedFields.push('name');
            }
          } else {
            matchesMap.set(v.id, { vendor: v, matchedFields: ['name'] });
          }
        }
      }
    }

    const matches = Array.from(matchesMap.values());
    return {
      isDuplicate: matches.length > 0,
      matches
    };
  },

  /**
   * List all vendors with search, filter, pagination, and bill counts
   */
  listVendors(businessId, query = {}) {
    const db = getDatabase();
    const conditions = ['v.business_id = ?'];
    const params = [businessId];

    if (query.is_active !== undefined && query.is_active !== '') {
      conditions.push('v.is_active = ?');
      params.push(query.is_active === 'true' || query.is_active === '1' ? 1 : 0);
    }

    if (query.category) {
      const cat = query.category.trim().toLowerCase();
      // Extract main category title without bracketed sub-items
      const catBase = cat.replace(/\s*\([^)]*\).*/g, '').trim();

      if (cat === 'raw_materials' || catBase.startsWith('raw material')) {
        conditions.push(`(
          v.category = 'raw_materials' OR 
          v.category = 'Raw Materials' OR 
          LOWER(v.category) LIKE 'raw material%'
        )`);
      } else if (cat === 'finished_goods' || catBase.startsWith('finished good')) {
        conditions.push(`(
          v.category = 'finished_goods' OR 
          v.category = 'Finished Goods' OR 
          LOWER(v.category) LIKE 'finished good%'
        )`);
      } else if (cat === 'packaging_materials' || catBase.startsWith('packaging')) {
        conditions.push(`(
          v.category = 'packaging_materials' OR 
          v.category = 'Packaging Materials' OR 
          LOWER(v.category) LIKE 'packaging%'
        )`);
      } else if (cat === 'vegetable_purchase' || catBase.startsWith('vegetable') || catBase.startsWith('produce')) {
        conditions.push(`(
          v.category = 'vegetable_purchase' OR 
          LOWER(v.category) LIKE '%vegetable%' OR 
          LOWER(v.category) LIKE '%produce%'
        )`);
      } else if (cat === 'dairy_products' || catBase.startsWith('dairy')) {
        conditions.push(`(
          v.category = 'dairy_products' OR 
          LOWER(v.category) LIKE 'dairy%'
        )`);
      } else if (cat === 'gas_utilities' || catBase.startsWith('gas')) {
        conditions.push(`(
          v.category = 'gas_utilities' OR 
          LOWER(v.category) LIKE '%gas%' OR 
          LOWER(v.category) LIKE '%lpg%' OR 
          LOWER(v.category) LIKE '%utilit%'
        )`);
      } else if (cat === 'equipment_repairs' || catBase.startsWith('machin') || catBase.startsWith('equipment')) {
        conditions.push(`(
          v.category = 'equipment_repairs' OR 
          LOWER(v.category) LIKE '%machin%' OR 
          LOWER(v.category) LIKE '%repair%' OR 
          LOWER(v.category) LIKE '%equipment%'
        )`);
      } else if (cat === 'transport_logistics' || catBase.startsWith('transport')) {
        conditions.push(`(
          v.category = 'transport_logistics' OR 
          LOWER(v.category) LIKE '%transport%' OR 
          LOWER(v.category) LIKE '%deliver%'
        )`);
      } else if (cat === 'cleaning_supplies' || catBase.startsWith('cleaning')) {
        conditions.push(`(
          v.category = 'cleaning_supplies' OR 
          LOWER(v.category) LIKE '%clean%' OR 
          LOWER(v.category) LIKE '%hygiene%'
        )`);
      } else if (cat === 'other') {
        conditions.push(`(
          v.category = 'other' OR 
          LOWER(v.category) LIKE 'other%'
        )`);
      } else {
        conditions.push(`(
          v.category = ? OR 
          LOWER(v.category) LIKE ?
        )`);
        params.push(query.category, `${catBase}%`);
      }
    }

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(`(
        v.name LIKE ? OR
        v.phone LIKE ? OR
        v.alternate_phone LIKE ? OR
        v.gstin LIKE ? OR
        v.tax_identifier LIKE ? OR
        v.contact_person LIKE ? OR
        v.city LIKE ? OR
        v.category LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term, term);
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM vendors v WHERE ${whereClause}`).get(...params);
    const totalCount = countRow ? countRow.count : 0;

    // Sorting
    let orderBy = 'v.name ASC';
    if (query.sort_by === 'created_desc') orderBy = 'v.created_at DESC';
    if (query.sort_by === 'created_asc') orderBy = 'v.created_at ASC';

    // Pagination
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        v.*,
        (SELECT COUNT(*) FROM vendor_bills b WHERE b.vendor_id = v.id) as bills_count,
        (SELECT COUNT(*) FROM expenses e WHERE e.vendor_id = v.id) as expenses_count
      FROM vendors v
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const vendors = db.prepare(sql).all(...params, limit, offset);

    return {
      vendors,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  },

  /**
   * Get vendor by ID with complete details, bills, and linked daily expenses
   */
  getVendorById(businessId, vendorId) {
    const db = getDatabase();

    const vendor = db.prepare(`
      SELECT * FROM vendors
      WHERE id = ? AND business_id = ?
    `).get(vendorId, businessId);

    if (!vendor) return null;

    // Get associated bills
    const bills = db.prepare(`
      SELECT 
        b.*,
        a.id as attachment_id,
        a.original_filename,
        a.content_type,
        a.file_size_bytes,
        u.full_name as created_by_name
      FROM vendor_bills b
      LEFT JOIN bill_attachments a ON a.bill_id = b.id
      LEFT JOIN users u ON u.id = b.created_by
      WHERE b.vendor_id = ? AND b.business_id = ?
      ORDER BY b.bill_date DESC, b.created_at DESC
    `).all(vendorId, businessId);

    // Get associated expenses from Daily Expenses table
    const expenses = db.prepare(`
      SELECT 
        e.id,
        e.transaction_number,
        e.transaction_date,
        e.amount,
        e.payment_status,
        e.approval_status,
        e.payment_method,
        e.invoice_number,
        e.description,
        c.name_en as category_name_en,
        c.name_gu as category_name_gu,
        u.full_name as created_by_name
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.vendor_id = ? AND e.business_id = ? AND e.approval_status != 'voided'
      ORDER BY e.transaction_date DESC, e.created_at DESC
    `).all(vendorId, businessId);

    // Aggregate summary figures (without fabricating unverified balances)
    const totalBilled = bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const totalBillPaid = bills.reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      vendor,
      bills,
      expenses,
      summary: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalBillPaid: Math.round(totalBillPaid * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        billsCount: bills.length,
        expensesCount: expenses.length
      }
    };
  },

  /**
   * Create vendor manually or from OCR
   */
  createVendor(user, data, options = {}) {
    const db = getDatabase();
    const businessId = user.business_id;

    // Validate data
    const validationErrors = validateVendorData(data);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    // Check duplicates unless specifically bypassed by user confirmation
    if (!options.allowDuplicate) {
      const dupeCheck = this.checkDuplicates(businessId, {
        gstin: data.gstin,
        name: data.name,
        phone: data.phone,
        email: data.email
      });

      if (dupeCheck.isDuplicate) {
        const error = new Error('Possible duplicate vendor detected.');
        error.code = 'DUPLICATE_VENDOR';
        error.duplicates = dupeCheck.matches;
        throw error;
      }
    }

    const id = 'ven_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const gstin = data.gstin ? data.gstin.trim().toUpperCase() : null;
    const pan = data.pan ? data.pan.trim().toUpperCase() : (gstin && gstin.length === 15 ? gstin.substring(2, 12) : null);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO vendors (
          id, business_id, name, category, phone, alternate_phone, email,
          address, city, state, pin_code, gstin, pan, tax_identifier,
          contact_person, business_type, payment_terms, credit_limit, notes,
          is_active, created_by, updated_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        id,
        businessId,
        data.name.trim(),
        data.category.trim(),
        data.phone ? data.phone.trim() : null,
        data.alternate_phone ? data.alternate_phone.trim() : null,
        data.email ? data.email.trim().toLowerCase() : null,
        data.address ? data.address.trim() : null,
        data.city ? data.city.trim() : null,
        data.state ? data.state.trim() : 'Gujarat',
        data.pin_code ? data.pin_code.trim() : null,
        gstin,
        pan,
        gstin, // synchronize legacy tax_identifier
        data.contact_person ? data.contact_person.trim() : null,
        data.business_type ? data.business_type.trim() : null,
        data.payment_terms ? data.payment_terms.trim() : 'immediate',
        data.credit_limit !== undefined && data.credit_limit !== '' ? Number(data.credit_limit) : null,
        data.notes ? data.notes.trim() : null,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        user.id,
        user.id,
        now,
        now
      );

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'vendor',
        entityId: id,
        action: 'create',
        prevValues: null,
        newValues: data,
        reason: options.reason || 'Vendor profile created'
      });
    })();

    return db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  },

  /**
   * Update existing vendor details with dirty tracking and audit log
   */
  updateVendor(user, vendorId, data) {
    const db = getDatabase();
    const businessId = user.business_id;

    const existing = db.prepare('SELECT * FROM vendors WHERE id = ? AND business_id = ?')
      .get(vendorId, businessId);

    if (!existing) {
      throw new Error('Vendor not found.');
    }

    const validationErrors = validateVendorData({
      ...existing,
      ...data
    });
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    // Check duplicate if GSTIN or phone or email or name changed
    const gstin = data.gstin !== undefined ? (data.gstin ? data.gstin.trim().toUpperCase() : null) : existing.gstin;
    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const phone = data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone;
    const email = data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : existing.email;

    const pan = data.pan !== undefined
      ? (data.pan ? data.pan.trim().toUpperCase() : null)
      : (gstin && gstin.length === 15 ? gstin.substring(2, 12) : existing.pan);

    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        UPDATE vendors SET
          name = ?, category = ?, phone = ?, alternate_phone = ?, email = ?,
          address = ?, city = ?, state = ?, pin_code = ?, gstin = ?, pan = ?, tax_identifier = ?,
          contact_person = ?, business_type = ?, payment_terms = ?, credit_limit = ?, notes = ?,
          is_active = ?, updated_by = ?, updated_at = ?
        WHERE id = ? AND business_id = ?
      `).run(
        name,
        data.category !== undefined ? data.category.trim() : existing.category,
        phone,
        data.alternate_phone !== undefined ? (data.alternate_phone ? data.alternate_phone.trim() : null) : existing.alternate_phone,
        email,
        data.address !== undefined ? (data.address ? data.address.trim() : null) : existing.address,
        data.city !== undefined ? (data.city ? data.city.trim() : null) : existing.city,
        data.state !== undefined ? (data.state ? data.state.trim() : 'Gujarat') : existing.state,
        data.pin_code !== undefined ? (data.pin_code ? data.pin_code.trim() : null) : existing.pin_code,
        gstin,
        pan,
        gstin,
        data.contact_person !== undefined ? (data.contact_person ? data.contact_person.trim() : null) : existing.contact_person,
        data.business_type !== undefined ? (data.business_type ? data.business_type.trim() : null) : existing.business_type,
        data.payment_terms !== undefined ? (data.payment_terms ? data.payment_terms.trim() : 'immediate') : existing.payment_terms,
        data.credit_limit !== undefined ? (data.credit_limit !== '' && data.credit_limit !== null ? Number(data.credit_limit) : null) : existing.credit_limit,
        data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
        user.id,
        now,
        vendorId,
        businessId
      );

      logAudit(db, {
        businessId,
        actorUserId: user.id,
        entityType: 'vendor',
        entityId: vendorId,
        action: 'update',
        prevValues: existing,
        newValues: data,
        reason: 'Vendor profile details updated'
      });
    })();

    return db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
  },

  /**
   * Save a Bill / Invoice and associate with vendor and file attachment
   */
  saveBill(user, billData, file) {
    const db = getDatabase();
    const businessId = user.business_id;

    const vendorId = billData.vendor_id;
    if (!vendorId) {
      throw new Error('Vendor ID is required to associate bill.');
    }

    const vendor = db.prepare('SELECT id FROM vendors WHERE id = ? AND business_id = ?')
      .get(vendorId, businessId);
    if (!vendor) {
      throw new Error('Associated vendor not found.');
    }

    const billId = 'bill_' + crypto.randomUUID();
    const now = new Date().toISOString();

    const totalAmount = Number(billData.total_amount);
    if (isNaN(totalAmount) || totalAmount < 0) {
      throw new Error('Valid bill total amount is required.');
    }

    const subtotal = billData.subtotal !== undefined && billData.subtotal !== '' ? Number(billData.subtotal) : null;
    const taxableAmount = billData.taxable_amount !== undefined && billData.taxable_amount !== '' ? Number(billData.taxable_amount) : null;
    const cgst = billData.cgst !== undefined && billData.cgst !== '' ? Number(billData.cgst) : null;
    const sgst = billData.sgst !== undefined && billData.sgst !== '' ? Number(billData.sgst) : null;
    const igst = billData.igst !== undefined && billData.igst !== '' ? Number(billData.igst) : null;
    const otherCharges = billData.other_charges !== undefined && billData.other_charges !== '' ? Number(billData.other_charges) : null;
    const discount = billData.discount !== undefined && billData.discount !== '' ? Number(billData.discount) : null;
    const paidAmount = billData.paid_amount !== undefined && billData.paid_amount !== '' ? Number(billData.paid_amount) : 0;

    let paymentStatus = 'unpaid';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partially_paid';
    }

    return db.transaction(() => {
      // 1. Insert bill
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
        vendorId,
        billData.expense_id || null,
        billData.bill_number ? billData.bill_number.trim() : null,
        billData.bill_date ? billData.bill_date.trim() : null,
        billData.due_date ? billData.due_date.trim() : null,
        billData.po_number ? billData.po_number.trim() : null,
        subtotal,
        taxableAmount,
        cgst,
        sgst,
        igst,
        otherCharges,
        discount,
        totalAmount,
        paymentStatus,
        paidAmount,
        billData.notes ? billData.notes.trim() : null,
        billData.ocr_status || 'manual',
        billData.ocr_raw_text || null,
        billData.ocr_confidence ? Number(billData.ocr_confidence) : null,
        user.id,
        now,
        now
      );

      // 2. Insert attachment if file provided
      if (file) {
        const attachmentId = 'bat_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO bill_attachments (
            id, business_id, bill_id, storage_key, original_filename,
            content_type, file_size_bytes, uploaded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          attachmentId,
          businessId,
          billId,
          file.filename,
          file.originalname,
          file.mimetype,
          file.size,
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
        newValues: { billId, vendorId, totalAmount, billNumber: billData.bill_number },
        reason: 'Vendor bill recorded'
      });

      return db.prepare('SELECT * FROM vendor_bills WHERE id = ?').get(billId);
    })();
  }
};

export default VendorService;
