import { getDatabase } from '../db/index.js';

export const ReportService = {
  // Dashboard summary KPIs and charts
  getDashboardMetrics(businessId, dateStr = null) {
    const db = getDatabase();
    const today = dateStr || new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7); // YYYY-MM

    // 1. Today's Approved Expenses
    const todayApproved = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE business_id = ? AND transaction_date = ? AND approval_status = 'approved'
    `).get(businessId, today);

    // 2. Today's Payments by Method (Actual money paid today via payments table)
    const todayPayments = db.prepare(`
      SELECT p.payment_method, COALESCE(SUM(p.amount), 0) as total
      FROM expense_payments p
      JOIN expenses e ON e.id = p.expense_id
      WHERE p.business_id = ? AND p.payment_date = ? AND e.approval_status != 'voided'
      GROUP BY p.payment_method
    `).all(businessId, today);

    let cashPaidToday = 0;
    let upiPaidToday = 0;
    let bankPaidToday = 0;
    for (const p of todayPayments) {
      if (p.payment_method === 'cash') cashPaidToday = Number(p.total);
      else if (p.payment_method === 'upi') upiPaidToday = Number(p.total);
      else if (p.payment_method === 'bank_transfer') bankPaidToday = Number(p.total);
    }

    // 3. Expenses Awaiting Approval
    const pendingApproval = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE business_id = ? AND approval_status = 'pending_approval'
    `).get(businessId);

    // 4. Month to Date Approved Expenses
    const mtdApproved = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE business_id = ? AND transaction_date LIKE ? AND approval_status = 'approved'
    `).get(businessId, `${monthPrefix}%`);

    // 5. Total Outstanding Unpaid Obligations (for approved expenses)
    const outstandingRow = db.prepare(`
      SELECT
        COALESCE(SUM(e.amount), 0) as total_approved,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM expense_payments p
          JOIN expenses exp ON exp.id = p.expense_id
          WHERE p.business_id = ? AND exp.approval_status = 'approved'
        ) as total_paid
      FROM expenses e
      WHERE e.business_id = ? AND e.approval_status = 'approved'
    `).get(businessId, businessId);

    const totalApprovedObligation = Number(outstandingRow.total_approved);
    const totalPaidObligation = Number(outstandingRow.total_paid);
    const totalOutstandingDue = Math.max(0, Math.round((totalApprovedObligation - totalPaidObligation) * 100) / 100);

    // 6. Category breakdown for this month
    const categoryBreakdown = db.prepare(`
      SELECT c.id, c.code, c.name_en, c.name_gu, c.icon, c.classification,
             COALESCE(SUM(e.amount), 0) as total_amount, COUNT(e.id) as tx_count
      FROM expense_categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.business_id = ?
        AND e.transaction_date LIKE ? AND e.approval_status = 'approved'
      WHERE c.business_id = ?
      GROUP BY c.id
      HAVING total_amount > 0
      ORDER BY total_amount DESC
    `).all(businessId, `${monthPrefix}%`, businessId);

    // 7. Last 7 Days Daily Expense Trend
    const dailyTrend = db.prepare(`
      SELECT transaction_date, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as tx_count
      FROM expenses
      WHERE business_id = ? AND approval_status = 'approved'
        AND transaction_date >= date(?, '-6 days') AND transaction_date <= ?
      GROUP BY transaction_date
      ORDER BY transaction_date ASC
    `).all(businessId, today, today);

    // 8. Recent 8 transactions
    const recentTransactions = db.prepare(`
      SELECT e.id, e.transaction_number, e.transaction_date, e.amount, e.payment_status,
             e.approval_status, e.payment_method, e.description,
             c.name_en as category_name_en, c.name_gu as category_name_gu, c.icon as category_icon,
             v.name as vendor_name, u.full_name as creator_name
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.business_id = ?
      ORDER BY e.transaction_date DESC, e.created_at DESC
      LIMIT 8
    `).all(businessId);

    // 9. Pending approvals list (top 5)
    const pendingList = db.prepare(`
      SELECT e.id, e.transaction_number, e.transaction_date, e.amount, e.description,
             c.name_en as category_name_en, c.name_gu as category_name_gu,
             u.full_name as creator_name
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.business_id = ? AND e.approval_status = 'pending_approval'
      ORDER BY e.created_at ASC
      LIMIT 5
    `).all(businessId);

    // 10. Last backup status
    const lastBackup = db.prepare(`
      SELECT * FROM system_backups
      WHERE business_id = ? AND status = 'success'
      ORDER BY completed_at DESC LIMIT 1
    `).get(businessId);

    return {
      today: {
        date: today,
        expenses_total: Math.round(Number(todayApproved.total) * 100) / 100,
        transaction_count: todayApproved.count,
        cash_paid: Math.round(cashPaidToday * 100) / 100,
        upi_paid: Math.round(upiPaidToday * 100) / 100,
        bank_transfer_paid: Math.round(bankPaidToday * 100) / 100
      },
      pending_approval: {
        total: Math.round(Number(pendingApproval.total) * 100) / 100,
        count: pendingApproval.count,
        items: pendingList
      },
      month_to_date: {
        total: Math.round(Number(mtdApproved.total) * 100) / 100,
        count: mtdApproved.count
      },
      outstanding_due: totalOutstandingDue,
      category_breakdown: categoryBreakdown.map(c => ({
        ...c,
        total_amount: Math.round(Number(c.total_amount) * 100) / 100
      })),
      daily_trend: dailyTrend.map(d => ({
        ...d,
        total_amount: Math.round(Number(d.total_amount) * 100) / 100
      })),
      recent_transactions: recentTransactions,
      last_backup: lastBackup || null
    };
  },

  // Detailed Expense Report with filter range
  getExpenseReport(businessId, { startDate, endDate, categoryId = null, vendorId = null }) {
    const db = getDatabase();
    const conditions = ['e.business_id = ?', 'e.transaction_date >= ?', 'e.transaction_date <= ?'];
    const params = [businessId, startDate, endDate];

    if (categoryId) {
      conditions.push('e.category_id = ?');
      params.push(categoryId);
    }
    if (vendorId) {
      conditions.push('e.vendor_id = ?');
      params.push(vendorId);
    }

    const whereClause = conditions.join(' AND ');

    // Aggregate summary
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN e.approval_status != 'voided' THEN e.amount ELSE 0 END), 0) as total_recorded,
        COALESCE(SUM(CASE WHEN e.approval_status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_total,
        COALESCE(SUM(CASE WHEN e.approval_status = 'pending_approval' THEN e.amount ELSE 0 END), 0) as pending_total,
        COALESCE(SUM(CASE WHEN e.approval_status = 'rejected' THEN e.amount ELSE 0 END), 0) as rejected_total,
        COALESCE(SUM(CASE WHEN e.approval_status = 'voided' THEN e.amount ELSE 0 END), 0) as voided_total,
        COUNT(CASE WHEN e.approval_status != 'voided' THEN 1 END) as active_count
      FROM expenses e
      WHERE ${whereClause}
    `).get(...params);

    // Actual payments made in this date window
    const paymentsSummary = db.prepare(`
      SELECT p.payment_method, COALESCE(SUM(p.amount), 0) as total
      FROM expense_payments p
      JOIN expenses e ON e.id = p.expense_id
      WHERE p.business_id = ? AND p.payment_date >= ? AND p.payment_date <= ?
        AND e.approval_status != 'voided'
      GROUP BY p.payment_method
    `).all(businessId, startDate, endDate);

    const paymentsByMethod = {};
    let totalPaymentsMade = 0;
    for (const p of paymentsSummary) {
      paymentsByMethod[p.payment_method] = Math.round(Number(p.total) * 100) / 100;
      totalPaymentsMade = Math.round((totalPaymentsMade + Number(p.total)) * 100) / 100;
    }

    // Category breakdown
    const categoryTotals = db.prepare(`
      SELECT c.id, c.code, c.name_en, c.name_gu, c.classification,
             COALESCE(SUM(e.amount), 0) as total_amount, COUNT(e.id) as count
      FROM expense_categories c
      JOIN expenses e ON e.category_id = c.id
      WHERE ${whereClause} AND e.approval_status = 'approved'
      GROUP BY c.id
      ORDER BY total_amount DESC
    `).all(...params);

    // Outstanding obligations for approved expenses in this range
    const approvedTotal = Math.round(Number(summary.approved_total) * 100) / 100;
    const outstandingObligations = Math.max(0, Math.round((approvedTotal - totalPaymentsMade) * 100) / 100);

    return {
      period: { startDate, endDate },
      summary: {
        total_recorded: Math.round(Number(summary.total_recorded) * 100) / 100,
        approved_total: approvedTotal,
        pending_total: Math.round(Number(summary.pending_total) * 100) / 100,
        rejected_total: Math.round(Number(summary.rejected_total) * 100) / 100,
        voided_total: Math.round(Number(summary.voided_total) * 100) / 100,
        actual_payments_made: totalPaymentsMade,
        outstanding_obligations: outstandingObligations,
        active_count: summary.active_count
      },
      payments_by_method: paymentsByMethod,
      category_breakdown: categoryTotals.map(c => ({
        ...c,
        total_amount: Math.round(Number(c.total_amount) * 100) / 100
      }))
    };
  },

  // Vendor / Recipient Report
  getVendorReport(businessId, { startDate = null, endDate = null }) {
    const db = getDatabase();
    let dateFilter = '';
    const params = [businessId];

    if (startDate && endDate) {
      dateFilter = 'AND e.transaction_date >= ? AND e.transaction_date <= ?';
      params.push(startDate, endDate);
    }

    const rows = db.prepare(`
      SELECT v.id, v.name, v.phone, v.tax_identifier,
             COUNT(e.id) as transaction_count,
             COALESCE(SUM(CASE WHEN e.approval_status = 'approved' THEN e.amount ELSE 0 END), 0) as total_billed,
             (
               SELECT COALESCE(SUM(p.amount), 0)
               FROM expense_payments p
               JOIN expenses exp ON exp.id = p.expense_id
               WHERE exp.vendor_id = v.id AND p.business_id = ? AND exp.approval_status = 'approved'
             ) as total_paid
      FROM vendors v
      LEFT JOIN expenses e ON e.vendor_id = v.id ${dateFilter}
      WHERE v.business_id = ?
      GROUP BY v.id
      ORDER BY total_billed DESC
    `).all(...params, businessId, businessId);

    return rows.map(r => {
      const billed = Math.round(Number(r.total_billed) * 100) / 100;
      const paid = Math.round(Number(r.total_paid) * 100) / 100;
      return {
        ...r,
        total_billed: billed,
        total_paid: paid,
        outstanding_balance: Math.max(0, Math.round((billed - paid) * 100) / 100)
      };
    });
  },

  // Staff Expense & Audit Activity Report
  getStaffReport(businessId, { startDate = null, endDate = null }) {
    const db = getDatabase();
    let dateFilter = '';
    const params = [businessId];

    if (startDate && endDate) {
      dateFilter = 'AND e.transaction_date >= ? AND e.transaction_date <= ?';
      params.push(startDate, endDate);
    }

    const rows = db.prepare(`
      SELECT u.id, u.username, u.full_name, bm.role,
             COUNT(e.id) as total_entered,
             COALESCE(SUM(CASE WHEN e.approval_status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_amount,
             COUNT(CASE WHEN e.approval_status = 'approved' THEN 1 END) as approved_count,
             COALESCE(SUM(CASE WHEN e.approval_status = 'pending_approval' THEN e.amount ELSE 0 END), 0) as pending_amount,
             COUNT(CASE WHEN e.approval_status = 'pending_approval' THEN 1 END) as pending_count,
             COUNT(CASE WHEN e.approval_status = 'rejected' THEN 1 END) as rejected_count,
             COUNT(CASE WHEN e.approval_status = 'voided' THEN 1 END) as voided_count
      FROM users u
      JOIN business_members bm ON bm.user_id = u.id AND bm.business_id = ?
      LEFT JOIN expenses e ON e.created_by = u.id AND e.business_id = ? ${dateFilter}
      GROUP BY u.id
      ORDER BY approved_amount DESC
    `).all(businessId, businessId, ...params.slice(1));

    return rows.map(r => ({
      ...r,
      approved_amount: Math.round(Number(r.approved_amount) * 100) / 100,
      pending_amount: Math.round(Number(r.pending_amount) * 100) / 100
    }));
  },

  // Cash Tracking & Outlay Report
  getCashReport(businessId, { startDate, endDate }) {
    const db = getDatabase();

    const cashRows = db.prepare(`
      SELECT p.id, p.payment_date, p.amount, p.reference_number, p.notes,
             e.transaction_number, e.description,
             c.name_en as category_name_en, c.name_gu as category_name_gu,
             v.name as vendor_name, u.full_name as recorded_by_name
      FROM expense_payments p
      JOIN expenses e ON e.id = p.expense_id
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN users u ON u.id = p.recorded_by
      WHERE p.business_id = ? AND p.payment_method = 'cash'
        AND p.payment_date >= ? AND p.payment_date <= ?
        AND e.approval_status != 'voided'
      ORDER BY p.payment_date ASC, p.created_at ASC
    `).all(businessId, startDate, endDate);

    const totalCashPaid = cashRows.reduce((sum, r) => Math.round((sum + Number(r.amount)) * 100) / 100, 0);

    // Group by date
    const dateGrouping = {};
    for (const r of cashRows) {
      if (!dateGrouping[r.payment_date]) {
        dateGrouping[r.payment_date] = { date: r.payment_date, total: 0, items: [] };
      }
      dateGrouping[r.payment_date].total = Math.round((dateGrouping[r.payment_date].total + Number(r.amount)) * 100) / 100;
      dateGrouping[r.payment_date].items.push(r);
    }

    return {
      period: { startDate, endDate },
      total_cash_paid: totalCashPaid,
      daily_breakdown: Object.values(dateGrouping),
      transactions: cashRows
    };
  },

  // Export Expenses to CSV with UTF-8 BOM for flawless Excel support
  generateCsvExport(businessId, filters = {}) {
    const db = getDatabase();
    const conditions = ['e.business_id = ?'];
    const params = [businessId];

    if (filters.start_date) {
      conditions.push('e.transaction_date >= ?');
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      conditions.push('e.transaction_date <= ?');
      params.push(filters.end_date);
    }
    if (filters.category_id) {
      conditions.push('e.category_id = ?');
      params.push(filters.category_id);
    }
    if (filters.payment_status) {
      conditions.push('e.payment_status = ?');
      params.push(filters.payment_status);
    }
    if (filters.approval_status) {
      conditions.push('e.approval_status = ?');
      params.push(filters.approval_status);
    }

    const rows = db.prepare(`
      SELECT e.transaction_number, e.transaction_date, e.amount, e.currency_code,
             e.payment_status, e.approval_status, e.payment_method,
             c.name_en as category_en, c.name_gu as category_gu,
             v.name as vendor_name, e.invoice_number, e.description,
             u.full_name as created_by_name, e.created_at
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.transaction_date DESC, e.created_at DESC
    `).all(...params);

    const headers = [
      'Transaction No',
      'Date (DD/MM/YYYY)',
      'Category (English)',
      'Category (ગુજરાતી)',
      'Description',
      'Vendor / Recipient',
      'Amount (₹)',
      'Payment Status',
      'Payment Method',
      'Approval Status',
      'Invoice No',
      'Created By',
      'Created At'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    for (const r of rows) {
      // Format date DD/MM/YYYY
      const [year, month, day] = r.transaction_date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      csvLines.push([
        escapeCsv(r.transaction_number),
        escapeCsv(formattedDate),
        escapeCsv(r.category_en),
        escapeCsv(r.category_gu),
        escapeCsv(r.description || ''),
        escapeCsv(r.vendor_name || ''),
        escapeCsv(Number(r.amount).toFixed(2)),
        escapeCsv(r.payment_status),
        escapeCsv(r.payment_method || ''),
        escapeCsv(r.approval_status),
        escapeCsv(r.invoice_number || ''),
        escapeCsv(r.created_by_name || ''),
        escapeCsv(r.created_at)
      ].join(','));
    }

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    return '\uFEFF' + csvLines.join('\r\n');
  }
};

export default ReportService;
