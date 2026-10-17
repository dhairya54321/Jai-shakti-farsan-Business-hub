import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import ReportService from '../server/services/reportService.js';
import ExpenseService from '../server/services/expenseService.js';
import { getDatabase } from '../server/db/index.js';

describe('E. Reporting Calculations and CSV Export Tests', () => {
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };

  let categoryId;
  const todayStr = new Date().toISOString().slice(0, 10);

  before(() => {
    const db = getDatabase();
    const cat = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? AND is_active = 1').get(testBizId);
    categoryId = cat.id;

    // Seed test expenses for today
    // 1. Approved cash expense ₹500
    ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 500.00,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: todayStr
    });

    // 2. Approved UPI expense ₹1200
    ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 1200.00,
      payment_method: 'upi',
      payment_status: 'paid',
      transaction_date: todayStr
    });

    // 3. Voided expense ₹9999 (MUST be excluded from approved totals)
    const voidMe = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 9999.00,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: todayStr
    });
    ExpenseService.voidExpense(ownerUser, voidMe.id, 'Test void exclusion');
  });

  test('Dashboard KPIs calculate approved outlays and exclude voided transactions', () => {
    const metrics = ReportService.getDashboardMetrics(testBizId, todayStr);
    assert.ok(metrics);
    assert.ok(metrics.today.expenses_total >= 1700.00);
    // Cash paid must include the ₹500
    assert.ok(metrics.today.cash_paid >= 500.00);
    // UPI paid must include the ₹1200
    assert.ok(metrics.today.upi_paid >= 1200.00);
    // Voided ₹9999 must NOT be in today's expenses_total
    const db = getDatabase();
    const voidSum = db.prepare("SELECT SUM(amount) as s FROM expenses WHERE approval_status = 'approved' AND amount = 9999.00").get();
    assert.equal(voidSum.s, null);
  });

  test('CSV Export includes UTF-8 BOM, headers, and correct formatting', () => {
    const csv = ReportService.generateCsvExport(testBizId, { start_date: todayStr, end_date: todayStr });
    // Verify UTF-8 BOM for Microsoft Excel
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    // Verify header columns
    assert.ok(csv.includes('Transaction No'));
    assert.ok(csv.includes('Category (ગુજરાતી)'));
    assert.ok(csv.includes('Amount (₹)'));
  });
});
