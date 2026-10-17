import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../server/db/index.js';
import ExpenseService from '../server/services/expenseService.js';

describe('B. Payment Workflows and Overpayment Protection Tests', () => {
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };

  let categoryId;

  before(() => {
    const db = getDatabase();
    const cat = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? AND is_active = 1').get(testBizId);
    categoryId = cat.id;
  });

  test('Unpaid expense records zero paid amount and status unpaid', () => {
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 5000.00,
      payment_status: 'unpaid',
      description: 'Raw besan supply on credit (ઉધાર)'
    });

    assert.equal(expense.amount, 5000.00);
    assert.equal(expense.payment_status, 'unpaid');
    assert.equal(expense.total_paid, 0);
    assert.equal(expense.balance_due, 5000.00);
    assert.equal(expense.payments.length, 0);
  });

  test('Partial payment records initial installment and leaves accurate balance due', () => {
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 10000.00,
      payment_status: 'partially_paid',
      paid_amount: 4000.00,
      payment_method: 'upi',
      description: 'Packaging boxes order with advance'
    });

    assert.equal(expense.amount, 10000.00);
    assert.equal(expense.payment_status, 'partially_paid');
    assert.equal(expense.total_paid, 4000.00);
    assert.equal(expense.balance_due, 6000.00);
    assert.equal(expense.payments.length, 1);
    assert.equal(expense.payments[0].payment_method, 'upi');

    // Add second payment of ₹3,000
    const updated1 = ExpenseService.addPayment(ownerUser, expense.id, {
      amount: 3000.00,
      payment_method: 'bank_transfer',
      reference_number: 'NEFT78192'
    });

    assert.equal(updated1.payment_status, 'partially_paid');
    assert.equal(updated1.total_paid, 7000.00);
    assert.equal(updated1.balance_due, 3000.00);
    assert.equal(updated1.payments.length, 2);

    // Add final payment of ₹3,000 (completes obligation)
    const updated2 = ExpenseService.addPayment(ownerUser, expense.id, {
      amount: 3000.00,
      payment_method: 'cash'
    });

    assert.equal(updated2.payment_status, 'paid');
    assert.equal(updated2.total_paid, 10000.00);
    assert.equal(updated2.balance_due, 0);
    assert.equal(updated2.payments.length, 3);
  });

  test('Attempted overpayment is strictly prohibited', () => {
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 2000.00,
      payment_status: 'partially_paid',
      paid_amount: 1500.00,
      payment_method: 'cash'
    });

    assert.equal(expense.balance_due, 500.00);

    // Attempting to pay ₹600 when only ₹500 is due must throw an error
    assert.throws(() => {
      ExpenseService.addPayment(ownerUser, expense.id, {
        amount: 600.00,
        payment_method: 'cash'
      });
    }, /exceeds remaining obligation/);
  });
});
