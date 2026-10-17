import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import { Users, UserPlus, Shield, Check, X, Lock } from 'lucide-react';

export function UsersPage() {
  const { lang, t } = useLanguage();
  const { role } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userRole, setUserRole] = useState('staff');
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/users');
      if (res.users) setUsers(res.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleActive = async (u) => {
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !u.is_active })
      });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          full_name: fullName.trim(),
          role: userRole
        })
      });
      setShowAddModal(false);
      setUsername('');
      setPassword('');
      setFullName('');
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user');
    }
  };

  if (role !== 'owner' && role !== 'manager') {
    return (
      <div className="p-8 text-center text-xs text-red-600 bg-red-50 rounded-2xl border border-red-200">
        Access Denied. Only business owners and managers can view team settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {t('nav_users')}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'gu' ? 'દુકાન સ્ટાફ, મેનેજર અને એકાઉન્ટન્ટ પરવાનગી' : 'Shop Staff, Manager, and Accountant Permissions'}
          </p>
        </div>

        {role === 'owner' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'gu' ? 'નવા સભ્ય ઉમેરો' : 'Add Team Member'}</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                {role === 'owner' && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  {role === 'owner' && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          u.is_active ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 text-base">
              Add New Team Member
            </h3>

            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhaveshbhai (ભવેશભાઈ)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bhavesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none capitalize"
                >
                  <option value="staff">Staff (Can record expenses)</option>
                  <option value="manager">Manager (Can approve expenses & add vendors)</option>
                  <option value="accountant">Accountant (Can view reports & export CSV)</option>
                  <option value="owner">Owner (Full administrative rights)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Create Account
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
