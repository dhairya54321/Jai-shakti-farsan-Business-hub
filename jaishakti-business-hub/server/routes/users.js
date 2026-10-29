import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';
import { resolveUserPermissions, PERMISSIONS_LIST, DEFAULT_ROLE_PERMISSIONS } from '../permissions.js';

const router = express.Router();
router.use(authenticateToken);

// Helper to log audit trail
function logUserAudit(db, { businessId, actorUserId, entityId, action, prevValues, newValues, reason }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (
        id, business_id, actor_user_id, entity_type, entity_id, action,
        previous_values, new_values, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'aud_' + crypto.randomUUID(),
      businessId,
      actorUserId,
      'user',
      entityId,
      action,
      prevValues ? JSON.stringify(prevValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason || null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Audit log error in users route:', err.message);
  }
}

// GET /api/users/permissions-schema - Predefined permission keys and groups
router.get('/permissions-schema', requireRole(['owner', 'manager']), (req, res) => {
  res.json({
    success: true,
    permissions: PERMISSIONS_LIST,
    roleDefaults: DEFAULT_ROLE_PERMISSIONS
  });
});

// GET /api/users - List users for the business (Owner/Manager only)
router.get('/', requireRole(['owner', 'manager']), (req, res) => {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.preferred_language, u.is_active, u.created_at,
           bm.role, bm.permissions
    FROM users u
    JOIN business_members bm ON bm.user_id = u.id AND bm.business_id = ?
    ORDER BY (bm.role = 'owner') DESC, u.created_at ASC
  `).all(req.user.business_id);

  const users = rows.map(r => {
    let customPerms = null;
    if (r.permissions) {
      try {
        customPerms = JSON.parse(r.permissions);
      } catch (_) {
        customPerms = null;
      }
    }
    return {
      id: r.id,
      username: r.username,
      full_name: r.full_name,
      role: r.role,
      is_active: Boolean(r.is_active),
      preferred_language: r.preferred_language,
      created_at: r.created_at,
      custom_permissions: customPerms,
      effective_permissions: resolveUserPermissions(r.role, customPerms)
    };
  });

  res.json({ success: true, users });
});

// POST /api/users - Create new team user (Owner only)
router.post('/', requireRole(['owner']), (req, res) => {
  const { username, password, full_name, role, preferred_language, permissions } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ success: false, error: 'Username, password, full name, and role are required.' });
  }

  const validRoles = ['owner', 'manager', 'accountant', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role selected.' });
  }

  const db = getDatabase();
  const cleanUsername = username.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username is already in use. Please pick another.' });
  }

  const userId = 'usr_' + crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const permsStr = permissions && typeof permissions === 'object' ? JSON.stringify(permissions) : null;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, preferred_language, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(userId, cleanUsername, hash, full_name.trim(), preferred_language || 'gu', now, now);

    db.prepare(`
      INSERT INTO business_members (id, business_id, user_id, role, permissions, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run('bm_' + crypto.randomUUID(), req.user.business_id, userId, role, permsStr, now, now);

    logUserAudit(db, {
      businessId: req.user.business_id,
      actorUserId: req.user.id,
      entityId: userId,
      action: 'create',
      prevValues: null,
      newValues: { username: cleanUsername, full_name: full_name.trim(), role, permissions },
      reason: `Created team member ${full_name.trim()} (${role})`
    });
  })();

  res.status(201).json({
    success: true,
    user: {
      id: userId,
      username: cleanUsername,
      full_name: full_name.trim(),
      role,
      is_active: true,
      custom_permissions: permissions || null,
      effective_permissions: resolveUserPermissions(role, permissions)
    }
  });
});

// PUT /api/users/:id - Update user details, role, status, and permissions (Owner only)
router.put('/:id', requireRole(['owner']), (req, res) => {
  const { role, is_active, full_name, username, password, permissions } = req.body;
  const db = getDatabase();
  const targetUserId = req.params.id;

  const member = db.prepare(`
    SELECT bm.*, u.username as current_username, u.full_name as current_full_name, u.is_active as user_active
    FROM business_members bm
    JOIN users u ON u.id = bm.user_id
    WHERE bm.user_id = ? AND bm.business_id = ?
  `).get(targetUserId, req.user.business_id);

  if (!member) {
    return res.status(404).json({ success: false, error: 'User not found in this business.' });
  }

  // Prevent owner from disabling their own account
  if (targetUserId === req.user.id && is_active === false) {
    return res.status(400).json({ success: false, error: 'You cannot deactivate your own account.' });
  }

  // Prevent owner from demoting themselves if they are the only active owner
  if (targetUserId === req.user.id && role && role !== 'owner') {
    const ownerCount = db.prepare(`
      SELECT COUNT(*) as count FROM business_members
      WHERE business_id = ? AND role = 'owner' AND is_active = 1
    `).get(req.user.business_id);
    if (!ownerCount || ownerCount.count <= 1) {
      return res.status(400).json({ success: false, error: 'Cannot demote the only active owner account.' });
    }
  }

  // Check username uniqueness if changed
  let cleanUsername = null;
  if (username && username.trim().toLowerCase() !== member.current_username.toLowerCase()) {
    cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(cleanUsername, targetUserId);
    if (existing) {
      return res.status(400).json({ success: false, error: `Username "${cleanUsername}" is already taken.` });
    }
  }

  const now = new Date().toISOString();
  let permsStr = undefined;
  if (permissions !== undefined) {
    permsStr = permissions && typeof permissions === 'object' ? JSON.stringify(permissions) : null;
  }

  db.transaction(() => {
    // 1. Update business_members (role, active status, permissions)
    if (role !== undefined || is_active !== undefined || permsStr !== undefined) {
      const updates = [];
      const params = [];
      if (role) { updates.push('role = ?'); params.push(role); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
      if (permsStr !== undefined) { updates.push('permissions = ?'); params.push(permsStr); }
      updates.push('updated_at = ?');
      params.push(now);
      params.push(member.id);

      db.prepare(`UPDATE business_members SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // 2. Update users core table (full_name, username, is_active, password)
    const userUpdates = [];
    const userParams = [];
    if (full_name) { userUpdates.push('full_name = ?'); userParams.push(full_name.trim()); }
    if (cleanUsername) { userUpdates.push('username = ?'); userParams.push(cleanUsername); }
    if (is_active !== undefined) { userUpdates.push('is_active = ?'); userParams.push(is_active ? 1 : 0); }
    if (password && password.trim().length >= 6) {
      const hash = bcrypt.hashSync(password, 10);
      userUpdates.push('password_hash = ?');
      userParams.push(hash);
    }

    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = ?');
      userParams.push(now);
      userParams.push(targetUserId);
      db.prepare(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`).run(...userParams);
    }

    logUserAudit(db, {
      businessId: req.user.business_id,
      actorUserId: req.user.id,
      entityId: targetUserId,
      action: 'edit',
      prevValues: {
        role: member.role,
        full_name: member.current_full_name,
        username: member.current_username,
        is_active: Boolean(member.is_active)
      },
      newValues: {
        role: role || member.role,
        full_name: full_name ? full_name.trim() : member.current_full_name,
        username: cleanUsername || member.current_username,
        is_active: is_active !== undefined ? is_active : Boolean(member.is_active),
        permissions: permissions !== undefined ? permissions : member.permissions
      },
      reason: `Updated member details/permissions for ${full_name || member.current_full_name}`
    });
  })();

  res.json({
    success: true,
    message: 'Team member updated successfully.'
  });
});

// DELETE /api/users/:id - Delete team member (Owner only)
router.delete('/:id', requireRole(['owner']), (req, res) => {
  const db = getDatabase();
  const targetUserId = req.params.id;

  // 1. Owner cannot delete their own account
  if (targetUserId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Security restriction: You cannot delete your own account while logged in.'
    });
  }

  // 2. Verify target user exists in this business
  const member = db.prepare(`
    SELECT bm.*, u.username, u.full_name
    FROM business_members bm
    JOIN users u ON u.id = bm.user_id
    WHERE bm.user_id = ? AND bm.business_id = ?
  `).get(targetUserId, req.user.business_id);

  if (!member) {
    return res.status(404).json({ success: false, error: 'User not found in this business.' });
  }

  // 3. Ensure we do not delete the only active owner
  if (member.role === 'owner') {
    const ownerCount = db.prepare(`
      SELECT COUNT(*) as count FROM business_members
      WHERE business_id = ? AND role = 'owner' AND user_id != ? AND is_active = 1
    `).get(req.user.business_id, targetUserId);

    if (!ownerCount || ownerCount.count === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the only remaining active owner of the business.'
      });
    }
  }

  db.transaction(() => {
    // 4. Remove business membership
    db.prepare('DELETE FROM business_members WHERE user_id = ? AND business_id = ?')
      .run(targetUserId, req.user.business_id);

    // 5. If user has no other business memberships, delete from users table
    const otherMemberships = db.prepare('SELECT COUNT(*) as count FROM business_members WHERE user_id = ?')
      .get(targetUserId);

    if (!otherMemberships || otherMemberships.count === 0) {
      db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);
    }

    logUserAudit(db, {
      businessId: req.user.business_id,
      actorUserId: req.user.id,
      entityId: targetUserId,
      action: 'delete',
      prevValues: { username: member.username, full_name: member.full_name, role: member.role },
      newValues: null,
      reason: `Deleted team member ${member.full_name} (${member.username})`
    });
  })();

  res.json({
    success: true,
    message: `Team member ${member.full_name} deleted successfully.`
  });
});

export default router;
