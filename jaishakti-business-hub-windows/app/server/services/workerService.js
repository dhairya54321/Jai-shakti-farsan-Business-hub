import crypto from 'crypto';
import { getDatabase } from '../db/index.js';
import { logAudit, parseAndValidateAmount, ExpenseService } from './expenseService.js';

export const WORKER_ROLES = [
  { id: 'farsan_karigar', en: 'Farsan Karigar (Maker)', gu: 'ફરસાણ કારીગર' },
  { id: 'head_chef', en: 'Head Chef / Maharaj', gu: 'મુખ્ય રસોઈયા / મહારાજ' },
  { id: 'sweet_maker', en: 'Sweet / Mithai Maker', gu: 'મીઠાઈ કારીગર' },
  { id: 'packing_staff', en: 'Packing Staff', gu: 'પેકિંગ સ્ટાફ' },
  { id: 'counter_sales', en: 'Counter Sales Staff', gu: 'કાઉન્ટર સેલ્સ સ્ટાફ' },
  { id: 'helper_cleaning', en: 'Helper & Cleaning', gu: 'હેલ્પર અને સફાઈ' },
  { id: 'driver_delivery', en: 'Delivery / Driver', gu: 'ડિલિવરી / ડ્રાઈવર' },
  { id: 'other', en: 'Other Staff', gu: 'અન્ય સ્ટાફ' }
];

export const PHONE_REGEX = /^[6-9]\d{9}$/;

export function validateWorkerData(data) {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Worker name is required.');
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

  if (data.base_salary !== undefined && data.base_salary !== null && data.base_salary !== '') {
    const sal = Number(data.base_salary);
    if (isNaN(sal) || sal < 0) {
      errors.push('Base salary must be a valid positive number.');
    }
  }

  return errors;
}

export const WorkerService = {
  /**
   * List all workers with calculated balances and today's attendance status
   */
  listWorkers(businessId, filters = {}) {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7); // YYYY-MM

    let query = `
      SELECT 
        w.*,
        u.full_name as creator_name,
        COALESCE((
          SELECT SUM(amount) FROM worker_transactions 
          WHERE worker_id = w.id AND transaction_type = 'advance_given'
        ), 0) as total_advance_given,
        COALESCE((
          SELECT SUM(amount) FROM worker_transactions 
          WHERE worker_id = w.id AND transaction_type = 'advance_returned'
        ), 0) as total_advance_returned,
        COALESCE((
          SELECT SUM(amount) FROM worker_transactions 
          WHERE worker_id = w.id AND transaction_type = 'salary_paid'
        ), 0) as total_salary_paid,
        COALESCE((
          SELECT SUM(amount) FROM worker_transactions 
          WHERE worker_id = w.id AND transaction_type = 'salary_paid' AND transaction_date LIKE ?
        ), 0) as month_salary_paid,
        (
          SELECT transaction_date FROM worker_transactions
          WHERE worker_id = w.id
          ORDER BY transaction_date DESC, created_at DESC LIMIT 1
        ) as last_transaction_date,
        (
          SELECT status FROM worker_attendance
          WHERE worker_id = w.id AND date = ?
        ) as today_attendance
      FROM workers w
      LEFT JOIN users u ON u.id = w.created_by
      WHERE w.business_id = ?
    `;

    const params = [`${currentMonth}%`, today, businessId];

    // Status filter: 'active', 'inactive', 'all' (default active)
    if (filters.status === 'active' || (!filters.status && filters.status !== 'all')) {
      query += ' AND w.is_active = 1';
    } else if (filters.status === 'inactive') {
      query += ' AND w.is_active = 0';
    }

    // Role filter
    if (filters.role && filters.role !== 'all') {
      query += ' AND w.role_title = ?';
      params.push(filters.role);
    }

    // Search filter (name or phone)
    if (filters.search && filters.search.trim()) {
      query += ' AND (w.name LIKE ? OR w.phone LIKE ? OR w.notes LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY w.is_active DESC, COALESCE(w.diary_page, 999) ASC, w.name ASC';

    const workers = db.prepare(query).all(...params).map(w => {
      const outstanding = Math.round((w.total_advance_given - w.total_advance_returned) * 100) / 100;
      return {
        ...w,
        outstanding_advance: outstanding
      };
    });

    // Compute aggregate business KPI summary
    const overallStats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_workers,
        COUNT(id) as total_workers
      FROM workers
      WHERE business_id = ?
    `).get(businessId);

    const txTotals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'advance_given' THEN amount ELSE 0 END), 0) as total_advances,
        COALESCE(SUM(CASE WHEN transaction_type = 'advance_returned' THEN amount ELSE 0 END), 0) as total_returns,
        COALESCE(SUM(CASE WHEN transaction_type = 'salary_paid' AND transaction_date LIKE ? THEN amount ELSE 0 END), 0) as this_month_salary
      FROM worker_transactions
      WHERE business_id = ?
    `).get(`${currentMonth}%`, businessId);

    const todayAttendanceCount = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_day_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
      FROM worker_attendance
      WHERE business_id = ? AND date = ?
    `).get(businessId, today);

    const totalOutstandingAdvance = Math.round(((txTotals?.total_advances || 0) - (txTotals?.total_returns || 0)) * 100) / 100;

    return {
      workers,
      summary: {
        totalWorkers: overallStats?.total_workers || 0,
        activeWorkers: overallStats?.active_workers || 0,
        totalOutstandingAdvance,
        thisMonthSalary: txTotals?.this_month_salary || 0,
        todayAttendance: {
          present: todayAttendanceCount?.present_count || 0,
          halfDay: todayAttendanceCount?.half_day_count || 0,
          absent: todayAttendanceCount?.absent_count || 0
        }
      }
    };
  },

  /**
   * Get full details for a worker including transaction ledger and current month attendance
   */
  getWorkerById(businessId, workerId) {
    const db = getDatabase();
    const worker = db.prepare(`
      SELECT w.*, u.full_name as creator_name
      FROM workers w
      LEFT JOIN users u ON u.id = w.created_by
      WHERE w.business_id = ? AND w.id = ?
    `).get(businessId, workerId);

    if (!worker) {
      throw new Error('Worker not found.');
    }

    // Ledger transactions ordered by date descending
    const transactions = db.prepare(`
      SELECT 
        t.*,
        u.full_name as recorded_by_name,
        e.transaction_number as expense_transaction_number
      FROM worker_transactions t
      LEFT JOIN users u ON u.id = t.recorded_by
      LEFT JOIN expenses e ON e.id = t.expense_id
      WHERE t.business_id = ? AND t.worker_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `).all(businessId, workerId);

    // Compute balance metrics
    let totalAdvanceGiven = 0;
    let totalCashAdvance = 0;
    let totalFarsanAdvance = 0;
    let totalAdvanceReturned = 0;
    let totalSalaryPaid = 0;
    let totalBonusPaid = 0;
    let totalDeductions = 0;

    for (const t of transactions) {
      if (t.transaction_type === 'advance_given') {
        totalAdvanceGiven += t.amount;
        if (t.category_type === 'farsan' || t.category_type === 'farsan_item') {
          totalFarsanAdvance += t.amount;
        } else {
          totalCashAdvance += t.amount;
        }
      }
      if (t.transaction_type === 'advance_returned') totalAdvanceReturned += t.amount;
      if (t.transaction_type === 'salary_paid') totalSalaryPaid += t.amount;
      if (t.transaction_type === 'bonus') totalBonusPaid += t.amount;
      if (t.transaction_type === 'deduction') totalDeductions += t.amount;
    }

    const outstandingAdvance = Math.round(((worker.initial_advance || 0) + totalAdvanceGiven - totalAdvanceReturned) * 100) / 100;

    // Calculate chronological running balance for passbook statement
    const chronological = [...transactions].sort((a, b) => {
      const dCmp = (a.transaction_date || '').localeCompare(b.transaction_date || '');
      if (dCmp !== 0) return dCmp;
      if (a.transaction_type !== b.transaction_type) {
        if (a.transaction_type === 'advance_given') return -1;
        if (b.transaction_type === 'advance_given') return 1;
      }
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    let runningBal = worker.initial_advance || 0;
    for (const t of chronological) {
      if (t.transaction_type === 'advance_given') {
        runningBal += t.amount;
      } else if (t.transaction_type === 'advance_returned' || t.transaction_type === 'salary_deduction') {
        runningBal -= t.amount;
      }
      t.running_balance = Math.round(runningBal * 100) / 100;
    }

    // Fetch leaves from worker_leaves
    const leaves = db.prepare(`
      SELECT l.*, u.full_name as recorded_by_name
      FROM worker_leaves l
      LEFT JOIN users u ON u.id = l.recorded_by
      WHERE l.business_id = ? AND l.worker_id = ?
      ORDER BY l.start_date DESC
    `).all(businessId, workerId);

    // Current month attendance summary
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    const monthAttendance = db.prepare(`
      SELECT date, status, notes
      FROM worker_attendance
      WHERE business_id = ? AND worker_id = ? AND date LIKE ?
      ORDER BY date ASC
    `).all(businessId, workerId, `${currentMonth}%`);

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;

    for (const a of monthAttendance) {
      if (a.status === 'present') presentDays += 1;
      else if (a.status === 'half_day') halfDays += 1;
      else if (a.status === 'absent') absentDays += 1;
    }

    // Estimated earned wages this month based on attendance
    let estimatedWagesThisMonth = 0;
    if (worker.wage_type === 'daily') {
      estimatedWagesThisMonth = (presentDays * worker.base_salary) + (halfDays * (worker.base_salary / 2));
    } else {
      // Monthly: proportional to days in month
      estimatedWagesThisMonth = worker.base_salary;
    }

    return {
      worker: {
        ...worker,
        outstanding_advance: outstandingAdvance,
        total_advance_given: totalAdvanceGiven,
        total_cash_advance: totalCashAdvance,
        total_farsan_advance: totalFarsanAdvance,
        totalCashAdvance,
        totalFarsanAdvance,
        total_advance_returned: totalAdvanceReturned,
        total_salary_paid: totalSalaryPaid,
        total_bonus_paid: totalBonusPaid,
        total_deductions: totalDeductions
      },
      transactions,
      leaves,
      attendance: {
        currentMonth,
        records: monthAttendance,
        presentDays,
        halfDays,
        absentDays,
        effectiveWorkingDays: presentDays + (halfDays * 0.5),
        estimatedWagesThisMonth: Math.round(estimatedWagesThisMonth * 100) / 100
      }
    };
  },

  /**
   * Create a new worker profile
   */
  createWorker(businessId, userId, data) {
    const db = getDatabase();
    const validationErrors = validateWorkerData(data);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    const workerId = 'wrk_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanPhone = data.phone ? data.phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const cleanAltPhone = data.alternate_phone ? data.alternate_phone.replace(/[^0-9]/g, '').slice(-10) : null;

    db.prepare(`
      INSERT INTO workers (
        id, business_id, name, phone, alternate_phone, role_title, wage_type,
        base_salary, joining_date, address, id_proof_number, notes, is_active,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workerId,
      businessId,
      data.name.trim(),
      cleanPhone,
      cleanAltPhone,
      data.role_title || 'farsan_karigar',
      data.wage_type || 'monthly',
      Number(data.base_salary) || 0,
      data.joining_date || now.slice(0, 10),
      data.address ? data.address.trim() : null,
      data.id_proof_number ? data.id_proof_number.trim() : null,
      data.notes ? data.notes.trim() : null,
      data.is_active === 0 ? 0 : 1,
      userId,
      now,
      now
    );

    logAudit(db, {
      businessId,
      actorUserId: userId,
      entityType: 'worker',
      entityId: workerId,
      action: 'create',
      prevValues: null,
      newValues: { name: data.name, role: data.role_title, wage_type: data.wage_type, base_salary: data.base_salary },
      reason: 'Created worker profile'
    });

    return this.getWorkerById(businessId, workerId);
  },

  /**
   * Update an existing worker profile
   */
  updateWorker(businessId, workerId, userId, data) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, workerId);
    if (!existing) {
      throw new Error('Worker not found.');
    }

    const validationErrors = validateWorkerData(data);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    const now = new Date().toISOString();
    const cleanPhone = data.phone ? data.phone.replace(/[^0-9]/g, '').slice(-10) : null;
    const cleanAltPhone = data.alternate_phone ? data.alternate_phone.replace(/[^0-9]/g, '').slice(-10) : null;

    db.prepare(`
      UPDATE workers SET
        name = ?,
        phone = ?,
        alternate_phone = ?,
        role_title = ?,
        wage_type = ?,
        base_salary = ?,
        joining_date = ?,
        address = ?,
        id_proof_number = ?,
        notes = ?,
        is_active = ?,
        updated_at = ?
      WHERE business_id = ? AND id = ?
    `).run(
      data.name.trim(),
      cleanPhone,
      cleanAltPhone,
      data.role_title || existing.role_title,
      data.wage_type || existing.wage_type,
      data.base_salary !== undefined ? Number(data.base_salary) : existing.base_salary,
      data.joining_date || existing.joining_date,
      data.address !== undefined ? data.address.trim() : existing.address,
      data.id_proof_number !== undefined ? data.id_proof_number.trim() : existing.id_proof_number,
      data.notes !== undefined ? data.notes.trim() : existing.notes,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
      now,
      businessId,
      workerId
    );

    logAudit(db, {
      businessId,
      actorUserId: userId,
      entityType: 'worker',
      entityId: workerId,
      action: 'update',
      prevValues: existing,
      newValues: data,
      reason: 'Updated worker profile'
    });

    return this.getWorkerById(businessId, workerId);
  },

  /**
   * Delete or deactivate worker
   */
  deleteWorker(businessId, workerId, userId) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, workerId);
    if (!existing) {
      throw new Error('Worker not found.');
    }

    // Check if worker has transactions
    const txCount = db.prepare('SELECT COUNT(id) as count FROM worker_transactions WHERE worker_id = ?').get(workerId)?.count || 0;

    if (txCount > 0) {
      // If transactions exist, soft delete (deactivate)
      db.prepare('UPDATE workers SET is_active = 0, updated_at = ? WHERE business_id = ? AND id = ?')
        .run(new Date().toISOString(), businessId, workerId);

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker',
        entityId: workerId,
        action: 'deactivate',
        prevValues: { is_active: 1 },
        newValues: { is_active: 0 },
        reason: 'Worker has existing financial transactions; soft-deactivated.'
      });

      return { success: true, deactivated: true, message: 'Worker has transactions; profile deactivated.' };
    } else {
      // Hard delete if no transactions
      db.prepare('DELETE FROM workers WHERE business_id = ? AND id = ?').run(businessId, workerId);

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker',
        entityId: workerId,
        action: 'delete',
        prevValues: existing,
        newValues: null,
        reason: 'Permanently deleted worker profile.'
      });

      return { success: true, deleted: true, message: 'Worker profile deleted permanently.' };
    }
  },

  /**
   * Add a ledger transaction (Advance Given, Advance Returned, Bonus, Deduction, Salary)
   */
  addTransaction(businessId, userId, data) {
    const db = getDatabase();
    const worker = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, data.worker_id);
    if (!worker) {
      throw new Error('Worker not found.');
    }

    const amount = parseAndValidateAmount(data.amount);
    const txType = data.transaction_type;
    const allowedTypes = ['advance_given', 'advance_returned', 'salary_paid', 'salary_earned', 'bonus', 'deduction'];
    if (!allowedTypes.includes(txType)) {
      throw new Error(`Invalid transaction type: ${txType}`);
    }

    const txDate = data.transaction_date || new Date().toISOString().slice(0, 10);
    const paymentMethod = data.payment_method || 'cash';
    const notes = data.notes ? data.notes.trim() : null;
    const now = new Date().toISOString();
    const txId = 'wtx_' + crypto.randomUUID();

    return db.transaction(() => {
      let linkedExpenseId = null;

      // Auto-sync with shop expenses if requested
      if (data.sync_to_expenses && (txType === 'advance_given' || txType === 'salary_paid')) {
        // Find suitable category: worker_advance_upad for advance, or people_wages
        let category = db.prepare(`
          SELECT id FROM expense_categories 
          WHERE business_id = ? AND (code = 'worker_advance_upad' OR classification = 'people_wages') 
          ORDER BY (code = 'worker_advance_upad') DESC LIMIT 1
        `).get(businessId);

        if (!category) {
          category = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? LIMIT 1').get(businessId);
        }

        if (category) {
          const userObj = db.prepare('SELECT u.*, bm.role FROM users u JOIN business_members bm ON bm.user_id = u.id WHERE u.id = ? AND bm.business_id = ?').get(userId, businessId) || { id: userId, role: 'owner' };
          userObj.business_id = businessId;
          
          const expenseTitle = txType === 'advance_given' 
            ? `કારીગર ઉપાડ: ${worker.name}${notes ? ' (' + notes + ')' : ''}`
            : `કારીગર પગાર ચૂકવણી: ${worker.name}${notes ? ' (' + notes + ')' : ''}`;

          const expenseRes = ExpenseService.createExpense(userObj, {
            category_id: category.id,
            worker_id: worker.id,
            skip_worker_khata_sync: true,
            amount: amount,
            transaction_date: txDate,
            payment_method: paymentMethod,
            payment_status: 'paid',
            description: expenseTitle,
            notes: `Worker ID: ${worker.id} | Auto-synced from Worker Khata`
          });

          if (expenseRes && expenseRes.id) {
            linkedExpenseId = expenseRes.id;
          }
        }
      }

      db.prepare(`
        INSERT INTO worker_transactions (
          id, business_id, worker_id, transaction_type, category_type, farsan_items, amount,
          transaction_date, payment_method, notes, expense_id,
          settlement_period, recorded_by, created_at, updated_at, diary_page
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        businessId,
        worker.id,
        txType,
        data.category_type || (data.farsan_items ? 'farsan' : 'cash'),
        data.farsan_items || null,
        amount,
        txDate,
        paymentMethod,
        notes,
        linkedExpenseId,
        data.settlement_period || null,
        userId,
        now,
        now,
        data.diary_page || (worker.diary_page ? String(worker.diary_page) : null)
      );

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_transaction',
        entityId: txId,
        action: 'create',
        prevValues: null,
        newValues: { worker_id: worker.id, worker_name: worker.name, type: txType, amount, date: txDate },
        reason: `Recorded ${txType} of ₹${amount} for worker ${worker.name}`
      });

      return this.getWorkerById(businessId, worker.id);
    })();
  },

  /**
   * Settle monthly salary with auto deduction of outstanding advance
   */
  settleMonthlySalary(businessId, userId, data) {
    const db = getDatabase();
    const worker = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, data.worker_id);
    if (!worker) {
      throw new Error('Worker not found.');
    }

    const month = data.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const grossSalary = parseAndValidateAmount(data.gross_salary || worker.base_salary);
    const advanceDeduction = data.advance_deduction !== undefined ? Number(data.advance_deduction) : 0;
    const bonusAmount = data.bonus_amount ? Number(data.bonus_amount) : 0;
    const deductionAmount = data.deduction_amount ? Number(data.deduction_amount) : 0;
    const paymentMethod = data.payment_method || 'cash';
    const txDate = data.payment_date || new Date().toISOString().slice(0, 10);
    const notes = data.notes ? data.notes.trim() : `પગાર હિસાબ (${month})`;
    const now = new Date().toISOString();

    const netCashPaid = Math.round((grossSalary - advanceDeduction + bonusAmount - deductionAmount) * 100) / 100;
    if (netCashPaid < 0) {
      throw new Error('Advance deduction cannot exceed gross salary plus bonus.');
    }

    return db.transaction(() => {
      // 1. If advance deduction > 0, record as advance_returned so worker's outstanding advance decreases
      if (advanceDeduction > 0) {
        db.prepare(`
          INSERT INTO worker_transactions (
            id, business_id, worker_id, transaction_type, amount,
            transaction_date, payment_method, notes, settlement_period,
            recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, 'advance_returned', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'wtx_' + crypto.randomUUID(),
          businessId,
          worker.id,
          advanceDeduction,
          txDate,
          paymentMethod,
          `પગાર સામે ઉપાડ કપાત (${month})`,
          month,
          userId,
          now,
          now
        );
      }

      // 2. If bonus > 0, record bonus transaction
      if (bonusAmount > 0) {
        db.prepare(`
          INSERT INTO worker_transactions (
            id, business_id, worker_id, transaction_type, amount,
            transaction_date, payment_method, notes, settlement_period,
            recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, 'bonus', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'wtx_' + crypto.randomUUID(),
          businessId,
          worker.id,
          bonusAmount,
          txDate,
          paymentMethod,
          `દિવાળી / માસિક બોનસ (${month})`,
          month,
          userId,
          now,
          now
        );
      }

      // 3. If deduction > 0, record deduction transaction
      if (deductionAmount > 0) {
        db.prepare(`
          INSERT INTO worker_transactions (
            id, business_id, worker_id, transaction_type, amount,
            transaction_date, payment_method, notes, settlement_period,
            recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, 'deduction', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'wtx_' + crypto.randomUUID(),
          businessId,
          worker.id,
          deductionAmount,
          txDate,
          paymentMethod,
          `પગાર કપાત (${month})`,
          month,
          userId,
          now,
          now
        );
      }

      // 4. Record net cash salary paid
      let linkedExpenseId = null;
      if (data.sync_to_expenses && netCashPaid > 0) {
        let category = db.prepare(`
          SELECT id FROM expense_categories 
          WHERE business_id = ? AND classification = 'people_wages' 
          LIMIT 1
        `).get(businessId);

        if (!category) {
          category = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? LIMIT 1').get(businessId);
        }

        if (category) {
          const userObj = db.prepare('SELECT u.*, bm.role FROM users u JOIN business_members bm ON bm.user_id = u.id WHERE u.id = ? AND bm.business_id = ?').get(userId, businessId) || { id: userId, role: 'owner' };
          userObj.business_id = businessId;
          const expRes = ExpenseService.createExpense(userObj, {
            category_id: category.id,
            worker_id: worker.id,
            skip_worker_khata_sync: true,
            amount: netCashPaid,
            transaction_date: txDate,
            payment_method: paymentMethod,
            payment_status: 'paid',
            description: `કારીગર ચોખ્ખો પગાર: ${worker.name} (${month}) [ગ્રોસ: ₹${grossSalary}, ઉપાડ કપાત: ₹${advanceDeduction}]`,
            notes: `Worker ID: ${worker.id} | Monthly settlement for ${month}`
          });
          if (expRes && expRes.id) {
            linkedExpenseId = expRes.id;
          }
        }
      }

      db.prepare(`
        INSERT INTO worker_transactions (
          id, business_id, worker_id, transaction_type, amount,
          transaction_date, payment_method, notes, expense_id,
          settlement_period, recorded_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'salary_paid', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'wtx_' + crypto.randomUUID(),
        businessId,
        worker.id,
        netCashPaid,
        txDate,
        paymentMethod,
        notes,
        linkedExpenseId,
        month,
        userId,
        now,
        now
      );

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_settlement',
        entityId: worker.id,
        action: 'settle_salary',
        prevValues: null,
        newValues: { worker_id: worker.id, month, grossSalary, advanceDeduction, bonusAmount, deductionAmount, netCashPaid },
        reason: `Settled salary for ${worker.name} for ${month}. Net paid: ₹${netCashPaid}`
      });

      return this.getWorkerById(businessId, worker.id);
    })();
  },

  /**
   * Delete a transaction from the worker's ledger
   */
  deleteTransaction(businessId, transactionId, userId) {
    const db = getDatabase();
    const tx = db.prepare('SELECT * FROM worker_transactions WHERE business_id = ? AND id = ?').get(businessId, transactionId);
    if (!tx) {
      throw new Error('Transaction not found.');
    }

    return db.transaction(() => {
      // If linked to an expense, void the expense
      if (tx.expense_id) {
        db.prepare(`
          UPDATE expenses SET 
            approval_status = 'voided',
            voided_by = ?,
            voided_at = ?,
            void_reason = 'Reverted due to worker transaction deletion',
            updated_at = ?
          WHERE business_id = ? AND id = ?
        `).run(userId, new Date().toISOString(), new Date().toISOString(), businessId, tx.expense_id);
      }

      db.prepare('DELETE FROM worker_transactions WHERE business_id = ? AND id = ?').run(businessId, transactionId);

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_transaction',
        entityId: transactionId,
        action: 'delete',
        prevValues: tx,
        newValues: null,
        reason: `Deleted worker transaction: ${tx.transaction_type} of ₹${tx.amount}`
      });

      return this.getWorkerById(businessId, tx.worker_id);
    })();
  },

  /**
   * Record batch attendance for a specific date
   */
  recordAttendance(businessId, userId, date, attendanceList) {
    const db = getDatabase();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Valid date in YYYY-MM-DD format is required.');
    }

    const now = new Date().toISOString();

    return db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO worker_attendance (
          id, business_id, worker_id, date, status, notes, recorded_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(business_id, worker_id, date) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          recorded_by = excluded.recorded_by,
          updated_at = excluded.updated_at
      `);

      for (const item of attendanceList) {
        if (!item.worker_id) continue;
        const status = ['present', 'absent', 'half_day', 'leave'].includes(item.status) ? item.status : 'present';
        stmt.run(
          'watt_' + crypto.randomUUID(),
          businessId,
          item.worker_id,
          date,
          status,
          item.notes ? item.notes.trim() : null,
          userId,
          now,
          now
        );
      }

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_attendance',
        entityId: date,
        action: 'batch_update',
        prevValues: null,
        newValues: { date, count: attendanceList.length },
        reason: `Updated attendance for ${attendanceList.length} workers on ${date}`
      });

      return this.getAttendanceForDate(businessId, date);
    })();
  },

  /**
   * Get attendance status of all active workers for a specific date
   */
  getAttendanceForDate(businessId, date) {
    const db = getDatabase();
    const queryDate = date || new Date().toISOString().slice(0, 10);

    const rows = db.prepare(`
      SELECT 
        w.id as worker_id,
        w.name,
        w.role_title,
        w.wage_type,
        w.base_salary,
        COALESCE(a.status, 'unmarked') as status,
        a.notes,
        a.updated_at
      FROM workers w
      LEFT JOIN worker_attendance a ON a.worker_id = w.id AND a.date = ?
      WHERE w.business_id = ? AND w.is_active = 1
      ORDER BY w.name ASC
    `).all(queryDate, businessId);

    const counts = {
      present: rows.filter(r => r.status === 'present').length,
      halfDay: rows.filter(r => r.status === 'half_day').length,
      absent: rows.filter(r => r.status === 'absent').length,
      unmarked: rows.filter(r => r.status === 'unmarked').length,
      total: rows.length
    };

    return {
      date: queryDate,
      attendance: rows,
      counts
    };
  },

  /**
   * Update worker login PIN
   */
  updateWorkerPin(businessId, workerId, pin) {
    const db = getDatabase();
    const cleanPin = String(pin).trim();
    if (!cleanPin || cleanPin.length < 4) {
      throw new Error('PIN must be at least 4 digits.');
    }
    db.prepare('UPDATE workers SET login_pin = ?, updated_at = ? WHERE business_id = ? AND id = ?')
      .run(cleanPin, new Date().toISOString(), businessId, workerId);
    return { success: true, pin: cleanPin };
  },

  /**
   * Record worker leave with optional automatic salary deduction
   */
  recordLeave(businessId, userId, data) {
    const db = getDatabase();
    const { worker_id, start_date, end_date, total_days, reason, deduction_amount } = data;
    const worker = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, worker_id);
    if (!worker) {
      throw new Error('Worker not found.');
    }

    const leaveId = 'wlv_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const parsedDays = Number(total_days) || 1;
    const parsedDeduction = Number(deduction_amount) || 0;
    const leaveReason = reason ? reason.trim() : 'ઘરે ગયા (Went home)';

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO worker_leaves (
          id, business_id, worker_id, start_date, end_date,
          total_days, reason, deduction_amount, is_approved, recorded_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        leaveId,
        businessId,
        worker.id,
        start_date || now.slice(0, 10),
        end_date || start_date || now.slice(0, 10),
        parsedDays,
        leaveReason,
        parsedDeduction,
        userId,
        now,
        now
      );

      // If deduction amount > 0, also record a deduction in the ledger
      if (parsedDeduction > 0) {
        db.prepare(`
          INSERT INTO worker_transactions (
            id, business_id, worker_id, transaction_type, category_type, amount,
            transaction_date, payment_method, notes, recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, 'deduction', 'leave_cut', ?, ?, 'cash', ?, ?, ?, ?)
        `).run(
          'wtx_' + crypto.randomUUID(),
          businessId,
          worker.id,
          parsedDeduction,
          start_date || now.slice(0, 10),
          `રજા કપાત: ${parsedDays} દિવસ રજા (${leaveReason})`,
          userId,
          now,
          now
        );
      }

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_leave',
        entityId: leaveId,
        action: 'create',
        prevValues: null,
        newValues: { worker_id: worker.id, days: parsedDays, deduction: parsedDeduction, reason: leaveReason },
        reason: `Recorded leave of ${parsedDays} days for worker ${worker.name}`
      });

      return this.getWorkerById(businessId, worker.id);
    })();
  },

  /**
   * Delete a recorded leave
   */
  deleteLeave(businessId, leaveId, userId) {
    const db = getDatabase();
    const leave = db.prepare('SELECT * FROM worker_leaves WHERE business_id = ? AND id = ?').get(businessId, leaveId);
    if (!leave) {
      throw new Error('Leave record not found.');
    }

    db.prepare('DELETE FROM worker_leaves WHERE business_id = ? AND id = ?').run(businessId, leaveId);
    return this.getWorkerById(businessId, leave.worker_id);
  },

  /**
   * Batch import multiple ledger transactions from scanned old diary
   */
  batchImportTransactions(businessId, userId, workerId, entries, fileInfo = null) {
    const db = getDatabase();
    const worker = db.prepare('SELECT * FROM workers WHERE business_id = ? AND id = ?').get(businessId, workerId);
    if (!worker) {
      throw new Error('Worker not found.');
    }

    const now = new Date().toISOString();
    let importedCount = 0;

    return db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO worker_transactions (
          id, business_id, worker_id, transaction_type, category_type,
          amount, transaction_date, payment_method, notes,
          recorded_by, created_at, updated_at, diary_page
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const allowedTxTypes = ['advance_given', 'advance_returned', 'salary_paid', 'salary_earned', 'bonus', 'deduction'];

      for (const entry of entries) {
        const amt = Number(entry.amount);
        if (isNaN(amt) || amt <= 0) continue;

        const txId = 'wtx_' + crypto.randomUUID();
        let txType = entry.transaction_type || 'advance_given';
        let note = (entry.notes || 'ડાયરી એન્ટ્રી').trim();

        if (txType === 'carry_forward_balance' || entry.is_carry_forward) {
          // If the worker has no prior transactions, record it as initial_advance
          const priorCount = db.prepare('SELECT COUNT(*) as c FROM worker_transactions WHERE worker_id = ?').get(worker.id).c;
          if (priorCount === 0 && (!worker.initial_advance || worker.initial_advance === 0)) {
            db.prepare('UPDATE workers SET initial_advance = ? WHERE id = ?').run(amt, worker.id);
          }
          // Do not insert as a fresh advance_given to prevent double-counting continuous pages
          continue;
        } else if (!allowedTxTypes.includes(txType)) {
          txType = 'advance_given';
        }

        const catType = entry.category_type || (entry.notes && /જલેબી|ગાંઠિયા|ખાખરા|ફરસાણ|farsan/i.test(entry.notes) ? 'farsan_item' : 'cash');
        const txDate = entry.transaction_date || now.slice(0, 10);
        
        // Sanitize payment method for SQLite CHECK constraint
        const allowedPayMethods = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];
        let payMethod = String(entry.payment_method || 'cash').toLowerCase().trim();
        if (['online', 'gpay', 'phonepe', 'paytm', 'googlepay', 'qr'].includes(payMethod)) {
          payMethod = 'upi';
        } else if (['bank', 'neft', 'rtgs', 'imps', 'transfer', 'account'].includes(payMethod)) {
          payMethod = 'bank_transfer';
        } else if (!allowedPayMethods.includes(payMethod)) {
          payMethod = 'other';
        }

        const diaryPageValue = entry.diary_page || (fileInfo && fileInfo.diaryPage) || (worker.diary_page ? String(worker.diary_page) : null);

        insertStmt.run(
          txId,
          businessId,
          worker.id,
          txType,
          catType,
          amt,
          txDate,
          payMethod,
          note,
          userId,
          now,
          now,
          diaryPageValue
        );
        importedCount++;
      }

      // If diary scan photo file info is attached, record it in worker_diary_scans
      if (fileInfo && fileInfo.path) {
        try {
          db.prepare(`
            INSERT INTO worker_diary_scans (
              id, business_id, worker_id, file_path, original_name,
              mime_type, file_size, diary_page, notes, uploaded_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'scan_' + crypto.randomUUID(),
            businessId,
            worker.id,
            fileInfo.path,
            fileInfo.originalName || fileInfo.name || null,
            fileInfo.mimeType || 'image/jpeg',
            fileInfo.size || null,
            fileInfo.diaryPage || worker.diary_page || null,
            fileInfo.notes || `ચોપડો સ્કેન - ${importedCount} એન્ટ્રીઓ`,
            userId,
            now,
            now
          );
        } catch (e) {
          console.warn('Failed to insert scan history record:', e.message);
        }
      }

      logAudit(db, {
        businessId,
        actorUserId: userId,
        entityType: 'worker_ledger',
        entityId: worker.id,
        action: 'import',
        prevValues: null,
        newValues: { count: importedCount },
        reason: `Batch imported ${importedCount} ledger entries from old diary for worker ${worker.name}`
      });

      return {
        importedCount,
        ...this.getWorkerById(businessId, worker.id)
      };
    })();
  },

  /**
   * Scanned Worker Diary History
   */
  getWorkerDiaryScans(businessId, workerId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.*, u.full_name as uploaded_by_name
      FROM worker_diary_scans s
      LEFT JOIN users u ON u.id = s.uploaded_by
      WHERE s.business_id = ? AND s.worker_id = ?
      ORDER BY COALESCE(CAST(s.diary_page AS INTEGER), 999) ASC, s.created_at ASC
    `).all(businessId, workerId);
  },

  addWorkerDiaryScan(businessId, userId, workerId, data) {
    const db = getDatabase();
    const id = 'scan_' + crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO worker_diary_scans (
        id, business_id, worker_id, file_path, original_name,
        mime_type, file_size, diary_page, notes, uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      businessId,
      workerId,
      data.file_path,
      data.original_name || null,
      data.mime_type || null,
      data.file_size || null,
      data.diary_page || null,
      data.notes || null,
      userId,
      now,
      now
    );
    return this.getWorkerDiaryScans(businessId, workerId);
  },

  deleteWorkerDiaryScan(businessId, scanId) {
    const db = getDatabase();
    db.prepare('DELETE FROM worker_diary_scans WHERE business_id = ? AND id = ?').run(businessId, scanId);
    return { success: true };
  }
};

export default WorkerService;
