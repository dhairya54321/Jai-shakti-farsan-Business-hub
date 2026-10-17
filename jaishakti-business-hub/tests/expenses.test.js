import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runMigrations } from '../server/db/migrate.js';
import { seedDatabase } from '../server/db/seed.js';
import ExpenseService, { parseAndValidateAmount } from '../server/services/expenseService.js';
import VoiceParserService from '../server/services/voiceParserService.js';

describe('A. Expense Creation and Validation Tests', () => {
  let db;
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };
  const staffUser = { id: 'usr_staff_001', username: 'staff', role: 'staff', business_id: testBizId };

  before(() => {
    // In-memory or isolated test DB
    db = new Database(':memory:');
    runMigrations(db);
    seedDatabase(db);
  });

  after(() => {
    if (db) db.close();
  });

  test('Valid monetary amount parsing (exact 2 decimal places)', () => {
    assert.equal(parseAndValidateAmount(150), 150);
    assert.equal(parseAndValidateAmount('450.50'), 450.50);
    assert.equal(parseAndValidateAmount('1299.99'), 1299.99);

    // Negative, zero, NaN, or > 2 decimals must throw
    assert.throws(() => parseAndValidateAmount(0), /greater than zero/);
    assert.throws(() => parseAndValidateAmount(-50), /greater than zero/);
    assert.throws(() => parseAndValidateAmount('abc'), /Invalid monetary amount/);
    assert.throws(() => parseAndValidateAmount('10.999'), /more than 2 decimal places/);
    assert.throws(() => parseAndValidateAmount(null), /Amount is required/);
  });

  test('Voice Parser extracts amount, category, and payment method from Gujarati speech', () => {
    const result = VoiceParserService.parseSpokenText(testBizId, 'આજે ચા માટે ૧૫૦ રૂપિયા રોકડા આપ્યા');
    assert.equal(result.success, true);
    assert.equal(result.extracted.amount, 150);
    assert.equal(result.extracted.payment_method, 'cash');
    assert.ok(result.extracted.category_id);
    assert.equal(result.confidence, 'high');
  });

  test('Voice Parser extracts details from English speech', () => {
    const result = VoiceParserService.parseSpokenText(testBizId, 'Paid 450 rupees for transport by cash');
    assert.equal(result.success, true);
    assert.equal(result.extracted.amount, 450);
    assert.equal(result.extracted.payment_method, 'cash');
    assert.ok(result.extracted.category_id);
  });

  test('Voice-extracted fields require user review and are never auto-committed', () => {
    const result = VoiceParserService.parseSpokenText(testBizId, 'સવારે ચા નાસ્તો ૨૦૦ રૂપિયા');
    // Result is purely informational data structure awaiting form review
    assert.ok(result.extracted);
    assert.equal(result.extracted.amount, 200);
    // Check that no database row was inserted automatically by the voice parser
    const tx = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE amount = ? AND description LIKE ?').get(200, '%સવારે ચા%');
    assert.equal(tx.count, 0);
  });

  test('Owner can create Quick Expense and is auto-approved', () => {
    const categories = db.prepare('SELECT id FROM expense_categories WHERE business_id = ?').all(testBizId);
    assert.ok(categories.length > 0);

    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categories[0].id,
      amount: 150.00,
      payment_method: 'cash',
      payment_status: 'paid',
      description: 'Morning tea for staff (ચા-નાસ્તો)'
    });

    assert.ok(expense);
    assert.equal(expense.amount, 150.00);
    assert.equal(expense.approval_status, 'approved');
    assert.equal(expense.payment_status, 'paid');
    assert.equal(expense.total_paid, 150.00);
    assert.equal(expense.balance_due, 0);
    assert.ok(expense.transaction_number.startsWith('EXP-'));
  });

  test('Staff creating expense above ₹5,000 threshold requires approval', () => {
    const categories = db.prepare('SELECT id FROM expense_categories WHERE business_id = ?').all(testBizId);

    const expense = ExpenseService.createExpense(staffUser, {
      category_id: categories[0].id,
      amount: 7500.00,
      payment_method: 'cash',
      payment_status: 'paid',
      description: 'Large supplier payment by staff'
    });

    assert.equal(expense.amount, 7500.00);
    assert.equal(expense.approval_status, 'pending_approval');
    assert.equal(expense.approved_by, null);
  });

  test('Reject expense creation when missing category', () => {
    assert.throws(() => {
      ExpenseService.createExpense(ownerUser, {
        amount: 250.00,
        payment_method: 'cash'
      });
    }, /Expense category is required/);
  });
});
