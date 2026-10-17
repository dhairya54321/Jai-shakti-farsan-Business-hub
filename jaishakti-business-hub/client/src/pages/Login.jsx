import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, User, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('adminpassword123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickUsers = [
    { label: 'Owner (માલિક)', user: 'admin', pass: 'adminpassword123', role: 'owner' },
    { label: 'Manager (મેનેજર)', user: 'manager', pass: 'managerpassword123', role: 'manager' },
    { label: 'Staff (સ્ટાફ)', user: 'staff', pass: 'staffpassword123', role: 'staff' },
    { label: 'Accountant (એકાઉન્ટન્ટ)', user: 'accountant', pass: 'accountantpassword123', role: 'accountant' },
  ];

  const handleSelectQuick = (u) => {
    setUsername(u.user);
    setPassword(u.pass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top language switch */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl border border-amber-200 bg-white shadow-sm text-xs font-semibold text-amber-800 hover:bg-amber-50"
        >
          {lang === 'gu' ? 'English' : 'ગુજરાતી'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xl shadow-amber-500/25 font-bold text-3xl mx-auto mb-3">
          જ
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {t('brand_name')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {t('brand_sub')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'gu' ? 'યુઝરનેમ (Username)' : 'Username'}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'gu' ? 'પાસવર્ડ (Password)' : 'Password'}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-md shadow-amber-500/25 transition disabled:opacity-50"
            >
              <span>{loading ? 'Logging in...' : (lang === 'gu' ? 'સાઇન ઇન કરો' : 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Account Switcher for easy shop PC / testing verification */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              {lang === 'gu' ? 'ટેસ્ટિંગ માટે ઝડપી એકાઉન્ટ પસંદ કરો:' : 'Quick Test Accounts:'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickUsers.map((u) => (
                <button
                  key={u.user}
                  type="button"
                  onClick={() => handleSelectQuick(u)}
                  className={`text-left p-2 rounded-lg border text-xs transition ${
                    username === u.user
                      ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="truncate">{u.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{u.user}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-slate-400">
          Jai Shakti Farsan Mart • Shop PC & Mobile System
        </div>
      </div>
    </div>
  );
}

export default Login;
