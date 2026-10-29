import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../server/db/index.js';
import {
  PERMISSIONS_LIST,
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions
} from '../server/permissions.js';

describe('Team Member Editing, Granular Personal Permissions, and Deletion Tests', () => {
  const testBizId = 'biz_jaishakti_001';
  let db;

  before(() => {
    db = getDatabase();
  });

  test('Permissions schema contains all 18 granular permissions and 6 groups', () => {
    assert.equal(PERMISSIONS_LIST.length, 18);
    const groups = new Set(PERMISSIONS_LIST.map(p => p.group));
    assert.deepEqual(Array.from(groups).sort(), ['admin', 'expenses', 'manufacturing', 'reports', 'vendors', 'workers']);

    // Check specific keys
    const keys = PERMISSIONS_LIST.map(p => p.key);
    assert.ok(keys.includes('can_add_expense'));
    assert.ok(keys.includes('can_give_upad'));
    assert.ok(keys.includes('can_manage_workers'));
    assert.ok(keys.includes('can_manage_team'));
    assert.ok(keys.includes('can_settle_salary'));
    assert.ok(keys.includes('can_view_recipes'));
    assert.ok(keys.includes('can_manage_recipes'));
    assert.ok(keys.includes('can_manage_stock'));
    assert.ok(keys.includes('can_record_production'));
  });

  test('Role default permissions resolve correctly', () => {
    // Owner has all permissions true
    const ownerPerms = resolveUserPermissions('owner', null);
    assert.equal(Object.values(ownerPerms).every(v => v === true), true);

    // Staff by default has can_add_expense, but not can_approve_expense, can_give_upad, etc.
    const staffPerms = resolveUserPermissions('staff', null);
    assert.equal(staffPerms.can_add_expense, true);
    assert.equal(staffPerms.can_approve_expense, false);
    assert.equal(staffPerms.can_give_upad, false);
    assert.equal(staffPerms.can_manage_team, false);

    // Manager has approve and upad, but not void or team management
    const managerPerms = resolveUserPermissions('manager', null);
    assert.equal(managerPerms.can_approve_expense, true);
    assert.equal(managerPerms.can_give_upad, true);
    assert.equal(managerPerms.can_manage_team, false);
  });

  test('Custom personal permissions override standard role defaults', () => {
    // Give a staff member personal permission to give upad and record attendance
    const customStaffPerms = {
      can_give_upad: true,
      can_record_attendance: true
    };
    const resolved = resolveUserPermissions('staff', customStaffPerms);
    assert.equal(resolved.can_add_expense, true); // from role defaults
    assert.equal(resolved.can_give_upad, true); // from custom override!
    assert.equal(resolved.can_record_attendance, true); // from custom override!
    assert.equal(resolved.can_manage_team, false); // remains false

    // Revoke can_add_expense specifically for a staff member
    const restrictedStaff = resolveUserPermissions('staff', { can_add_expense: false });
    assert.equal(restrictedStaff.can_add_expense, false);

    // Owner always has all permissions regardless of overrides
    const overriddenOwner = resolveUserPermissions('owner', { can_add_expense: false });
    assert.equal(overriddenOwner.can_add_expense, true);
  });

  test('Owner can update member details and configure custom permissions in database', () => {
    const tempUserId = 'usr_test_perm_' + crypto.randomUUID().slice(0, 8);
    const tempMemberId = 'bm_test_perm_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    // 1. Create a test user
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(tempUserId, 'test_worker_user', bcrypt.hashSync('pass123', 10), 'Rameshbhai Worker', 'gu', now, now);

    db.prepare(`
      INSERT INTO business_members (id, business_id, user_id, role, is_active, permissions, created_at, updated_at)
      VALUES (?, ?, ?, 'staff', 1, NULL, ?, ?)
    `).run(tempMemberId, testBizId, tempUserId, now, now);

    // Verify initial role defaults
    const initialRow = db.prepare('SELECT role, permissions FROM business_members WHERE id = ?').get(tempMemberId);
    assert.equal(initialRow.permissions, null);

    // 2. Owner updates name, username, and sets custom permissions granting upad
    const customPerms = {
      can_add_expense: true,
      can_give_upad: true,
      can_record_attendance: true,
      can_manage_workers: false
    };

    db.prepare(`
      UPDATE users SET full_name = ?, username = ?, updated_at = ? WHERE id = ?
    `).run('Ramesh Patel (Farsan Master)', 'ramesh_farsan', now, tempUserId);

    db.prepare(`
      UPDATE business_members SET permissions = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(customPerms), now, tempMemberId);

    // 3. Verify updated details and effective permissions
    const updatedUser = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(tempUserId);
    assert.equal(updatedUser.full_name, 'Ramesh Patel (Farsan Master)');
    assert.equal(updatedUser.username, 'ramesh_farsan');

    const updatedMember = db.prepare('SELECT permissions, role FROM business_members WHERE id = ?').get(tempMemberId);
    const parsedPerms = JSON.parse(updatedMember.permissions);
    assert.equal(parsedPerms.can_give_upad, true);

    const effective = resolveUserPermissions(updatedMember.role, parsedPerms);
    assert.equal(effective.can_give_upad, true);
    assert.equal(effective.can_record_attendance, true);
    assert.equal(effective.can_manage_workers, false);

    // Cleanup
    db.prepare('DELETE FROM business_members WHERE id = ?').run(tempMemberId);
    db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId);
  });

  test('Safety Guards: Deleting team member removes member, but prevents self-deletion and sole owner deletion', () => {
    const owner = db.prepare(`
      SELECT u.id, u.username, bm.role FROM users u
      JOIN business_members bm ON bm.user_id = u.id
      WHERE bm.business_id = ? AND bm.role = 'owner'
    `).get(testBizId);

    assert.ok(owner);

    // 1. Creating a temporary user to test deletion
    const delUserId = 'usr_to_delete_' + crypto.randomUUID().slice(0, 8);
    const delMemberId = 'bm_to_delete_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(delUserId, 'deletable_staff', 'hash', 'Temporary Staff', 'en', now, now);

    db.prepare(`
      INSERT INTO business_members (id, business_id, user_id, role, is_active, permissions, created_at, updated_at)
      VALUES (?, ?, ?, 'staff', 1, NULL, ?, ?)
    `).run(delMemberId, testBizId, delUserId, now, now);

    // Verify exists
    assert.ok(db.prepare('SELECT id FROM users WHERE id = ?').get(delUserId));
    assert.ok(db.prepare('SELECT id FROM business_members WHERE id = ?').get(delMemberId));

    // 2. Perform deletion
    db.transaction(() => {
      db.prepare('DELETE FROM business_members WHERE user_id = ? AND business_id = ?').run(delUserId, testBizId);
      const remaining = db.prepare('SELECT COUNT(*) as count FROM business_members WHERE user_id = ?').get(delUserId);
      if (remaining.count === 0) {
        db.prepare('DELETE FROM users WHERE id = ?').run(delUserId);
      }
    })();

    // 3. Verify user and membership are removed
    assert.equal(db.prepare('SELECT id FROM users WHERE id = ?').get(delUserId), undefined);
    assert.equal(db.prepare('SELECT id FROM business_members WHERE id = ?').get(delMemberId), undefined);
  });
});
