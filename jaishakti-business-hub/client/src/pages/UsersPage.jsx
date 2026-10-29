import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  Users, UserPlus, Shield, Check, X, Lock, Pencil, Trash2,
  RotateCcw, AlertTriangle, CheckCircle2, Sliders, ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  PERMISSION_GROUPS,
  PERMISSIONS_LIST,
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions
} from '../permissions';

export function UsersPage() {
  const { lang, t } = useLanguage();
  const { user: currentUser, role: currentRole } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // New User Form State
  const [addFullName, setAddFullName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addUserRole, setAddUserRole] = useState('staff');
  const [addCustomPerms, setAddCustomPerms] = useState({ ...(DEFAULT_ROLE_PERMISSIONS.staff || {}) });
  const [showAddPermsCustomize, setShowAddPermsCustomize] = useState(false);

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState('staff');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPerms, setEditPerms] = useState({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/users');
      if (res.users) setUsers(res.users);
    } catch (e) {
      console.error('Failed to load users:', e);
      setErrorMsg(e.message || 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Open Edit Modal with user data
  const handleOpenEdit = (targetUser) => {
    clearMessages();
    setEditingUser(targetUser);
    setEditFullName(targetUser.full_name || '');
    setEditUsername(targetUser.username || '');
    setEditPassword('');
    setEditUserRole(targetUser.role || 'staff');
    setEditIsActive(targetUser.is_active);

    // If member has custom_permissions, load them; otherwise load standard defaults for their role
    if (targetUser.custom_permissions && typeof targetUser.custom_permissions === 'object') {
      setEditPerms({ ...targetUser.custom_permissions });
    } else {
      const defaults = DEFAULT_ROLE_PERMISSIONS[targetUser.role] || DEFAULT_ROLE_PERMISSIONS.staff;
      setEditPerms({ ...defaults });
    }
  };

  // Handle Role Change inside Edit modal
  const handleEditRoleChange = (newRole) => {
    setEditUserRole(newRole);
    // Auto-align permissions to the defaults of the newly selected role
    const defaults = DEFAULT_ROLE_PERMISSIONS[newRole] || DEFAULT_ROLE_PERMISSIONS.staff;
    setEditPerms({ ...defaults });
  };

  // Handle Reset to Role Defaults in Edit Modal
  const handleResetEditDefaults = () => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[editUserRole] || DEFAULT_ROLE_PERMISSIONS.staff;
    setEditPerms({ ...defaults });
  };

  // Toggle single permission checkbox
  const handleTogglePerm = (permKey) => {
    setEditPerms(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  // Grant All / Revoke All in Edit Modal
  const handleSetAllPerms = (grantAll) => {
    const updated = {};
    PERMISSIONS_LIST.forEach(p => {
      updated[p.key] = grantAll;
    });
    setEditPerms(updated);
  };

  // Submit Edit Member
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      const payload = {
        full_name: editFullName.trim(),
        username: editUsername.trim(),
        role: editUserRole,
        is_active: editIsActive,
        permissions: editUserRole === 'owner' ? null : editPerms
      };

      if (editPassword && editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) {
          throw new Error('New password must be at least 6 characters long');
        }
        payload.password = editPassword.trim();
      }

      await apiFetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(
        lang === 'gu'
          ? `સભ્ય "${editFullName}" ની વિગતો અને પરવાનગીઓ સફળતાપૂર્વક અપડેટ થઈ ગઈ!`
          : `Team member "${editFullName}" updated successfully with customized permissions!`
      );
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (targetUser) => {
    clearMessages();
    setDeletingUser(targetUser);
  };

  // Submit Delete Member
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    clearMessages();
    setSubmitting(true);

    try {
      await apiFetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE'
      });

      setSuccessMsg(
        lang === 'gu'
          ? `સભ્ય "${deletingUser.full_name}" ને સફળતાપૂર્વક કાઢી નાખવામાં આવ્યા.`
          : `Team member "${deletingUser.full_name}" has been permanently removed.`
      );
      setDeletingUser(null);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete member');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add New Member
  const handleCreateUser = async (e) => {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      const payload = {
        username: addUsername.trim(),
        password: addPassword,
        full_name: addFullName.trim(),
        role: addUserRole,
        permissions: showAddPermsCustomize && addUserRole !== 'owner' ? addCustomPerms : null
      };

      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setShowAddModal(false);
      setAddUsername('');
      setAddPassword('');
      setAddFullName('');
      setAddUserRole('staff');
      setShowAddPermsCustomize(false);
      setSuccessMsg(
        lang === 'gu'
          ? 'નવા સભ્યનું ખાતું સફળતાપૂર્વક બનાવી લેવામાં આવ્યું છે!'
          : 'New team member added successfully!'
      );
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick toggle active status from table
  const handleQuickToggleActive = async (u) => {
    clearMessages();
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !u.is_active })
      });
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user status');
    }
  };

  // Helper to count active permissions for a user
  const getPermissionSummary = (u) => {
    if (u.role === 'owner') {
      return {
        type: 'owner',
        count: PERMISSIONS_LIST.length,
        total: PERMISSIONS_LIST.length,
        labelEn: 'Full Access (All Privileges)',
        labelGu: 'સંપૂર્ણ અધિકાર (બધી પરવાનગી)'
      };
    }
    if (u.custom_permissions && typeof u.custom_permissions === 'object') {
      const activeCount = Object.values(u.custom_permissions).filter(Boolean).length;
      return {
        type: 'custom',
        count: activeCount,
        total: PERMISSIONS_LIST.length,
        labelEn: `Custom: ${activeCount}/${PERMISSIONS_LIST.length} Granted`,
        labelGu: `કસ્ટમ: ${activeCount}/${PERMISSIONS_LIST.length} અધિકારો`
      };
    }
    const roleDefs = DEFAULT_ROLE_PERMISSIONS[u.role] || {};
    const count = Object.values(roleDefs).filter(Boolean).length;
    return {
      type: 'default',
      count,
      total: PERMISSIONS_LIST.length,
      labelEn: `Role Defaults: ${count}/${PERMISSIONS_LIST.length}`,
      labelGu: `રોલ મુજબ: ${count}/${PERMISSIONS_LIST.length}`
    };
  };

  const activeOwnerCount = users.filter(u => u.role === 'owner' && u.is_active).length;

  if (currentRole !== 'owner' && currentRole !== 'manager') {
    return (
      <div className="p-8 text-center text-xs text-red-600 bg-red-50 rounded-2xl border border-red-200">
        Access Denied. Only business owners and managers can view team settings.
      </div>
    );
  }

  const isOwner = currentRole === 'owner';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="flex-1 font-medium">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {t('nav_users')}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'gu'
                ? 'દુકાન સ્ટાફ, મેનેજર અને એકાઉન્ટન્ટ પરવાનગી (વ્યક્તિગત અધિકારો માત્ર માલિક નક્કી કરશે)'
                : 'Manage staff, roles, and personalized granular permissions (Owner controlled)'}
            </p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => {
              clearMessages();
              setAddFullName('');
              setAddUsername('');
              setAddPassword('');
              setAddUserRole('staff');
              setAddCustomPerms({ ...(DEFAULT_ROLE_PERMISSIONS.staff || {}) });
              setShowAddPermsCustomize(false);
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('btn_add_team_member')}</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>
              {lang === 'gu' ? `કુલ ટીમ સભ્યો: ${users.length}` : `Team Members (${users.length})`}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {lang === 'gu' ? 'માલિક જ પરવાનગી બદલી અને સભ્ય કાઢી શકે છે' : 'Owner has exclusive rights to edit permissions & remove members'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5">Member / સભ્ય</th>
                <th className="px-4 py-3.5">Role / હોદ્દો</th>
                <th className="px-4 py-3.5">Permissions / પરવાનગીઓ</th>
                <th className="px-4 py-3.5">Status / સ્થિતિ</th>
                {isOwner && <th className="px-4 py-3.5 text-right">Actions / ક્રિયાઓ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 5 : 4} className="px-4 py-8 text-center text-slate-400">
                    {lang === 'gu' ? 'લોડ થઈ રહ્યું છે...' : 'Loading team members...'}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 5 : 4} className="px-4 py-8 text-center text-slate-400">
                    No team members found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const permSummary = getPermissionSummary(u);
                  const isCurrentLoggedIn = u.id === currentUser?.id;
                  const isSoleOwner = u.role === 'owner' && activeOwnerCount <= 1;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Username */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            u.role === 'owner' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'accountant' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {u.full_name ? u.full_name.slice(0, 1) : u.username.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrentLoggedIn && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                  {lang === 'gu' ? 'તમે' : 'You'}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          u.role === 'owner' ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300' :
                          u.role === 'manager' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          u.role === 'accountant' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {u.role === 'owner' && <Shield className="w-3 h-3 text-amber-600" />}
                          {u.role}
                        </span>
                      </td>

                      {/* Personal Permissions Badge */}
                      <td className="px-4 py-3.5">
                        {permSummary.type === 'owner' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{lang === 'gu' ? permSummary.labelGu : permSummary.labelEn}</span>
                          </div>
                        ) : permSummary.type === 'custom' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200">
                            <Sliders className="w-3 h-3 text-indigo-600" />
                            <span>{lang === 'gu' ? permSummary.labelGu : permSummary.labelEn}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span>{lang === 'gu' ? permSummary.labelGu : permSummary.labelEn}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.is_active ? (lang === 'gu' ? 'સક્રિય' : 'Active') : (lang === 'gu' ? 'બંધ' : 'Disabled')}
                        </span>
                      </td>

                      {/* Actions (Owner Only) */}
                      {isOwner && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit & Permissions Button */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title={lang === 'gu' ? 'વિગતો અને વ્યક્તિગત પરવાનગી બદલો' : 'Edit details & personal permissions'}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 transition"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">{lang === 'gu' ? 'પરવાનગી / એડિટ' : 'Edit'}</span>
                            </button>

                            {/* Delete Member Button */}
                            <button
                              disabled={isCurrentLoggedIn || isSoleOwner}
                              onClick={() => handleOpenDelete(u)}
                              title={
                                isCurrentLoggedIn
                                  ? (lang === 'gu' ? 'પોતાનું ખાતું ડિલીટ કરી શકાતું નથી' : 'Cannot delete your own account')
                                  : isSoleOwner
                                  ? (lang === 'gu' ? 'એકમાત્ર સક્રિય માલિક ખાતું ડિલીટ કરી શકાતું નથી' : 'Cannot delete the only active owner')
                                  : (lang === 'gu' ? 'સભ્યને કાયમ માટે કાઢી નાખો' : 'Permanently delete member')
                              }
                              className={`p-1.5 rounded-lg border transition ${
                                isCurrentLoggedIn || isSoleOwner
                                  ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                  : 'hover:bg-rose-50 text-slate-400 hover:text-rose-700 border-slate-200 hover:border-rose-300'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          EDIT TEAM MEMBER & PERSONAL PERMISSIONS MODAL
         ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-8 border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {lang === 'gu' ? 'ટીમ સભ્ય વિગતો અને વ્યક્તિગત પરવાનગી' : 'Edit Member & Personal Permissions'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    User ID: {editingUser.id} (@{editingUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <form id="edit-member-form" onSubmit={handleSaveEdit} className="space-y-5 text-xs overflow-y-auto pr-1 flex-1">
              {/* Basic Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'gu' ? 'પૂરું નામ (Full Name) *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Bhaveshbhai"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'gu' ? 'યુઝરનેમ (Login Username) *' : 'Username *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="e.g. bhavesh"
                    className="w-full px-3 py-2 bg-white font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'gu' ? 'મૂળ રોલ (Base Role) *' : 'Base Role *'}
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    disabled={editingUser.id === currentUser?.id && activeOwnerCount <= 1}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none capitalize"
                  >
                    <option value="staff">Staff (સ્ટાફ - ખર્ચ નોંધણી)</option>
                    <option value="accountant">Accountant (એકાઉન્ટન્ટ - રિપોર્ટ્સ અને એક્સપોર્ટ)</option>
                    <option value="manager">Manager (મેનેજર - મંજૂરી અને વેપારી)</option>
                    <option value="owner">Owner (માલિક - સંપૂર્ણ વહીવટ)</option>
                  </select>
                </div>

                {/* Change Password (Optional) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'gu' ? 'નવો પાસવર્ડ (બદલવો હોય તો જ લખો)' : 'Reset Password (Optional)'}
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={lang === 'gu' ? 'જૂનો પાસવર્ડ રાખવા ખાલી રાખો' : 'Leave empty to keep unchanged'}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Active Status Switch */}
                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {lang === 'gu' ? 'ખાતાની સક્રિયતા (Account Status)' : 'Account Status'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {editIsActive
                        ? (lang === 'gu' ? 'સભ્ય લોગિન કરી શકે છે' : 'User can login and perform allowed actions')
                        : (lang === 'gu' ? 'સભ્યનું લોગિન બંધ રહેશે' : 'User is blocked from logging in')}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={editingUser.id === currentUser?.id}
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                    } ${editingUser.id === currentUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editIsActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Personal Permissions Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                  <div>
                    <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>{t('lbl_personal_permissions')}</span>
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      {t('lbl_permissions_help')}
                    </p>
                  </div>

                  {editUserRole !== 'owner' && (
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleResetEditDefaults}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>{t('btn_reset_defaults')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllPerms(true)}
                        className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllPerms(false)}
                        className="px-2 py-1 text-[11px] font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>

                {editUserRole === 'owner' ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    <p className="font-bold mb-1">
                      {lang === 'gu'
                        ? 'માલિક (Owner) પાસે તમામ 14 પરવાનગીઓ કાયમ માટે સક્રિય હોય છે.'
                        : 'Business Owners always have unrestricted full administrative privileges across all modules.'}
                    </p>
                    <p className="text-[11px] text-amber-700">
                      {lang === 'gu'
                        ? 'જો આ સભ્ય માટે અમુક પરવાનગી મર્યાદિત કરવી હોય, તો રોલ બદલીને "મેનેજર", "એકાઉન્ટન્ટ" અથવા "સ્ટાફ" કરો.'
                        : 'To limit specific actions for this member, change their role to Manager, Accountant, or Staff.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((grp) => {
                      const groupPerms = PERMISSIONS_LIST.filter(p => p.group === grp.id);
                      if (groupPerms.length === 0) return null;

                      return (
                        <div key={grp.id} className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="bg-slate-100/70 px-3.5 py-2 border-b border-slate-200/80 font-bold text-slate-700 text-[11px] flex items-center justify-between">
                            <span>{lang === 'gu' ? grp.gu : grp.en}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {groupPerms.filter(p => editPerms[p.key]).length}/{groupPerms.length} Active
                            </span>
                          </div>

                          <div className="p-2.5 divide-y divide-slate-100">
                            {groupPerms.map((perm) => {
                              const isGranted = Boolean(editPerms[perm.key]);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition select-none ${
                                    isGranted ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isGranted}
                                    onChange={() => handleTogglePerm(perm.key)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <span>{lang === 'gu' ? perm.gu : perm.en}</span>
                                      {isGranted && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                          Granted
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight">
                                      {perm.description}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="submit"
                form="edit-member-form"
                disabled={submitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>{lang === 'gu' ? 'સાચવી રહ્યું છે...' : 'Saving...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'gu' ? 'ફેરફારો સાચવો' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
         ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                {t('lbl_confirm_delete_member')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('lbl_delete_member_warning')}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-800">{deletingUser.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono text-slate-800">@{deletingUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="uppercase font-bold text-amber-800">{deletingUser.role}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('btn_delete_member')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD NEW TEAM MEMBER MODAL
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {t('btn_add_team_member')}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'પૂરું નામ (Full Name) *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhaveshbhai (ભવેશભાઈ)"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'યુઝરનેમ (Username) *' : 'Username *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bhavesh"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'પાસવર્ડ (Password) *' : 'Password *'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'રોલ (Role) *' : 'Role *'}
                </label>
                <select
                  value={addUserRole}
                  onChange={(e) => {
                    const newR = e.target.value;
                    setAddUserRole(newR);
                    setAddCustomPerms({ ...(DEFAULT_ROLE_PERMISSIONS[newR] || {}) });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none capitalize"
                >
                  <option value="staff">Staff (ખર્ચ નોંધણી)</option>
                  <option value="accountant">Accountant (રિપોર્ટ્સ & એક્સપોર્ટ)</option>
                  <option value="manager">Manager (મંજૂરી & વેપારી)</option>
                  <option value="owner">Owner (સંપૂર્ણ અધિકાર)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : (lang === 'gu' ? 'ખાતું બનાવો' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
