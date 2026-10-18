import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runMigrations } from '../server/db/migrate.js';
import { seedDatabase } from '../server/db/seed.js';
import ExpenseService, { parseAndValidateAmount } from '../server/services/expenseService.js';
import VoiceParserService from '../server/services/voiceParserService.js';
import { parseInvoiceText } from '../server/services/ocrService.js';
import { getDatabase } from '../server/db/index.js';

describe('A. Expense Creation and Validation Tests', () => {
  let db;
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };
  const staffUser = { id: 'usr_staff_001', username: 'staff', role: 'staff', business_id: testBizId };

  before(() => {
    db = getDatabase();
  });

  after(() => {
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

  test('Expense receipt OCR decodes items, quantities, and attaches stored receipt file', () => {
    const rawBill = `
      TAX INVOICE
      Satguru Krupa Traders
      GSTIN: 24AAACS1234F1Z5
      Invoice No: SKT-9921
      Date: 15/10/2026
      Item: Kopra Sali 10.00 KG | 245.00 | 2450.00
      Total Amount: 2450.00
    `;

    const { extracted } = parseInvoiceText(rawBill);
    assert.equal(extracted.vendorName, 'Satguru Krupa Traders');
    assert.equal(extracted.totalAmount, 2450);
    assert.equal(extracted.invoiceDate, '2026-10-15');
    assert.ok(extracted.items.length > 0);
    assert.ok(extracted.notes.includes('Kopra Sali'));
    assert.ok(extracted.notes.includes('10.00 KG'));

    const rawCat = db.prepare("SELECT id FROM expense_categories WHERE code = 'raw_materials' AND business_id = ?").get(testBizId);

    const testStorageKey = 'scanned_receipt_test_' + Date.now() + '.jpg';

    // Create expense linking the scanned stored file
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: rawCat.id,
      amount: extracted.totalAmount,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: extracted.invoiceDate,
      invoice_number: extracted.invoiceNumber + '-' + Date.now(),
      notes: extracted.notes,
      stored_filename: testStorageKey,
      stored_originalname: 'kamya_bill.jpg',
      stored_mimetype: 'image/jpeg',
      stored_size: 102400
    });

    assert.equal(expense.amount, 2450);
    assert.ok(expense.invoice_number.startsWith('SKT-9921'));
    assert.ok(expense.notes.includes('Kopra Sali'));

    // Verify attachment record was created
    const realDb = getDatabase();
    const att = realDb.prepare('SELECT * FROM expense_attachments WHERE expense_id = ?').get(expense.id);
    assert.ok(att);
    assert.equal(att.storage_key, testStorageKey);
    assert.equal(att.original_filename, 'kamya_bill.jpg');
  });

  test('Strictly reject duplicate expense with same vendor and invoice number', () => {
    const rawCat = db.prepare("SELECT id FROM expense_categories WHERE code = 'raw_materials' AND business_id = ?").get(testBizId);
    const vendor = db.prepare('SELECT id FROM vendors WHERE business_id = ? LIMIT 1').get(testBizId);
    const testInv = 'INV-DUP-' + Date.now();

    // 1. Create first expense
    const firstExp = ExpenseService.createExpense(ownerUser, {
      category_id: rawCat.id,
      vendor_id: vendor.id,
      amount: 1500,
      payment_method: 'cash',
      payment_status: 'paid',
      transaction_date: '2026-10-18',
      invoice_number: testInv
    });
    assert.ok(firstExp);

    // 2. Check checkDuplicateExpense detects it
    const dupeCheck = ExpenseService.checkDuplicateExpense(testBizId, {
      vendor_id: vendor.id,
      invoice_number: testInv
    });
    assert.equal(dupeCheck.isDuplicate, true);
    assert.equal(dupeCheck.matchType, 'invoice_number');
    assert.equal(dupeCheck.duplicate.id, firstExp.id);

    // 3. Attempting to create duplicate expense throws error with DUPLICATE_EXPENSE code
    assert.throws(() => {
      ExpenseService.createExpense(ownerUser, {
        category_id: rawCat.id,
        vendor_id: vendor.id,
        amount: 1500,
        payment_method: 'cash',
        payment_status: 'paid',
        transaction_date: '2026-10-18',
        invoice_number: testInv
      });
    }, (err) => {
      assert.equal(err.code, 'DUPLICATE_EXPENSE');
      assert.ok(err.message.includes('already been recorded'));
      return true;
    });
  });

  test('Delete unwanted transaction removes expense, payments, attachments and logs audit', () => {
    const rawCat = db.prepare("SELECT id FROM expense_categories WHERE code = 'raw_materials' AND business_id = ?").get(testBizId);

    // 1. Create an unwanted expense with payment
    const unwanted = ExpenseService.createExpense(ownerUser, {
      category_id: rawCat.id,
      amount: 850.00,
      payment_method: 'cash',
      payment_status: 'paid',
      description: 'Mistaken duplicate entry to be deleted'
    });
    assert.ok(unwanted);

    // 2. Staff user cannot delete
    assert.throws(() => {
      ExpenseService.deleteExpense(staffUser, unwanted.id, 'Staff trying to delete');
    }, /Only owners and managers can delete transactions/);

    // 3. Owner deletes unwanted transaction
    const delResult = ExpenseService.deleteExpense(ownerUser, unwanted.id, 'Accidental duplicate test entry');
    assert.equal(delResult.success, true);
    assert.equal(delResult.deletedId, unwanted.id);

    // 4. Verify record is gone from DB
    const fetched = ExpenseService.getExpenseById(testBizId, unwanted.id);
    assert.equal(fetched, null);

    const paymentRows = db.prepare('SELECT * FROM expense_payments WHERE expense_id = ?').all(unwanted.id);
    assert.equal(paymentRows.length, 0);

    // 5. Verify audit log entry exists
    const auditRow = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_id = ? AND action = 'delete'
    `).get(unwanted.id);
    assert.ok(auditRow);
    assert.equal(auditRow.actor_user_id, ownerUser.id);
    assert.equal(auditRow.reason, 'Accidental duplicate test entry');
  });
});


