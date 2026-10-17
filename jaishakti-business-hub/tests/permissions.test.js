import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../server/db/index.js';
import ExpenseService from '../server/services/expenseService.js';

describe('C & D. Permissions, Approvals, Voids, and Audit Trail Tests', () => {
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };
  const managerUser = { id: 'usr_manager_001', username: 'manager', role: 'manager', business_id: testBizId };
  const staffUser = { id: 'usr_staff_001', username: 'staff', role: 'staff', business_id: testBizId };

  let categoryId;

  before(() => {
    const db = getDatabase();
    const cat = db.prepare('SELECT id FROM expense_categories WHERE business_id = ? AND is_active = 1').get(testBizId);
    categoryId = cat.id;
  });

  test('Staff cannot approve pending transactions', () => {
    // Create pending expense
    const expense = ExpenseService.createExpense(staffUser, {
      category_id: categoryId,
      amount: 9000.00,
      payment_method: 'cash',
      payment_status: 'paid'
    });
    assert.equal(expense.approval_status, 'pending_approval');

    // Staff attempt to approve must throw permission error
    assert.throws(() => {
      ExpenseService.approveExpense(staffUser, expense.id);
    }, /Only owners and managers can approve/);
  });

  test('Manager can approve pending transaction and records audit log', () => {
    const expense = ExpenseService.createExpense(staffUser, {
      category_id: categoryId,
      amount: 6000.00,
      payment_method: 'cash',
      payment_status: 'paid'
    });

    const approved = ExpenseService.approveExpense(managerUser, expense.id);
    assert.equal(approved.approval_status, 'approved');
    assert.equal(approved.approved_by, managerUser.id);
    assert.ok(approved.approved_at);

    // Verify audit trail contains approval record
    const hasAudit = approved.audit_logs.some(l => l.action === 'approve' && l.actor_user_id === managerUser.id);
    assert.ok(hasAudit);
  });

  test('Rejection requires mandatory reason', () => {
    const expense = ExpenseService.createExpense(staffUser, {
      category_id: categoryId,
      amount: 7000.00,
      payment_method: 'cash',
      payment_status: 'paid'
    });

    // Empty reason throws
    assert.throws(() => {
      ExpenseService.rejectExpense(ownerUser, expense.id, '');
    }, /reason is mandatory/);

    // Valid rejection
    const rejected = ExpenseService.rejectExpense(ownerUser, expense.id, 'Bill voucher receipt missing');
    assert.equal(rejected.approval_status, 'rejected');
    assert.equal(rejected.rejection_reason, 'Bill voucher receipt missing');
  });

  test('Voiding an approved expense requires mandatory reason and preserves record', () => {
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 1200.00,
      payment_method: 'cash',
      payment_status: 'paid'
    });

    assert.equal(expense.approval_status, 'approved');

    // Voiding without reason fails
    assert.throws(() => {
      ExpenseService.voidExpense(ownerUser, expense.id, '');
    }, /reason is mandatory/);

    // Void with reason succeeds
    const voided = ExpenseService.voidExpense(ownerUser, expense.id, 'Entered by mistake, duplicate payment');
    assert.equal(voided.approval_status, 'voided');
    assert.equal(voided.void_reason, 'Entered by mistake, duplicate payment');

    // Physical row remains in database
    const db = getDatabase();
    const row = db.prepare('SELECT id, approval_status FROM expenses WHERE id = ?').get(expense.id);
    assert.ok(row);
    assert.equal(row.approval_status, 'voided');
  });

  test('Editing an approved transaction preserves audit trail with old and new values', () => {
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: categoryId,
      amount: 800.00,
      payment_method: 'cash',
      payment_status: 'paid',
      description: 'Shop cleaning supplies'
    });

    const updated = ExpenseService.updateExpense(ownerUser, expense.id, {
      description: 'Shop cleaning supplies and phenyl bottles'
    }, 'Added missing items description');

    assert.equal(updated.description, 'Shop cleaning supplies and phenyl bottles');

    const editLog = updated.audit_logs.find(l => l.action === 'edit');
    assert.ok(editLog);
    assert.equal(editLog.reason, 'Added missing items description');
  });
});
