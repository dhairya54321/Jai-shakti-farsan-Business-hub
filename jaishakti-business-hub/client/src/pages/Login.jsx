import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, User, Shield, AlertCircle, ArrowRight, BookOpen, Smartphone, KeyRound } from 'lucide-react';

export function Login() {
  const { login, workerLogin } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();

  // Mode: 'owner' | 'worker'
  const [loginMode, setLoginMode] = useState('owner');

  // Owner Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('adminpassword123');

  // Worker Login State
  const [workerList, setWorkerList] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerPin, setWorkerPin] = useState('1234');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch worker list for easy worker login
  useEffect(() => {
    async function loadWorkerList() {
      try {
        const res = await fetch('/api/auth/worker-list');
        const data = await res.json();
        if (data.success && data.workers) {
          setWorkerList(data.workers);
          if (data.workers.length > 0) {
            setSelectedWorkerId(data.workers[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not load worker list:', err);
      }
    }
    loadWorkerList();
  }, []);

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

  const handleOwnerSubmit = async (e) => {
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

  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await workerLogin({
        worker_id: selectedWorkerId || undefined,
        phone: workerPhone.trim() || undefined,
        pin: workerPin.trim()
      });
    } catch (err) {
      setError(err.message || 'Worker login failed. Incorrect PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
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

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-6 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-8">
          {/* Segmented Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setLoginMode('owner'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                loginMode === 'owner'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'gu' ? 'દુકાન માલિક / સ્ટાફ' : 'Owner / Staff'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('worker'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                loginMode === 'worker'
                  ? 'bg-white text-amber-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'gu' ? 'કારીગર ખાતાવહી' : 'Worker Passbook'}</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* MODE 1: OWNER / STAFF LOGIN */}
          {loginMode === 'owner' && (
            <form className="space-y-4" onSubmit={handleOwnerSubmit}>
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
            </form>
          )}

          {/* MODE 2: WORKER PASSBOOK LOGIN */}
          {loginMode === 'worker' && (
            <form className="space-y-4" onSubmit={handleWorkerSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'gu' ? 'તમારું નામ પસંદ કરો (Select Your Name)' : 'Select Your Name'}
                </label>
                <div className="mt-1 relative">
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => {
                      setSelectedWorkerId(e.target.value);
                      setError('');
                    }}
                    className="block w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {workerList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.diary_page ? `(ચોપડા પાના ${w.diary_page})` : ''} - {w.role_title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Worker Chips from Father's Diary */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  {lang === 'gu' ? 'ઝડપી કારીગર પસંદગી:' : 'Quick Diary Staff:'}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {workerList.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`p-2 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                        selectedWorkerId === w.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{w.name}</span>
                      {w.diary_page && (
                        <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded font-mono shrink-0 ml-1">
                          p.{w.diary_page}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'gu' ? '૪-આંકડાનો સુરક્ષા પિન (4-Digit PIN)' : '4-Digit PIN'}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    value={workerPin}
                    onChange={(e) => setWorkerPin(e.target.value)}
                    placeholder="1234"
                    required
                    className="block w-full pl-9 pr-3 py-2.5 text-base tracking-widest font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {lang === 'gu' ? 'ડિફોલ્ટ પિન 1234 છે. માલિક દ્વારા પિન બદલી શકાય છે.' : 'Default PIN is 1234. Owner can change it.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-md shadow-amber-600/25 transition disabled:opacity-50"
              >
                <BookOpen className="w-4 h-4" />
                <span>{loading ? 'ખોલી રહ્યું છે...' : (lang === 'gu' ? 'મારી ખાતાવહી પાસબુક ખોલો' : 'Open My Passbook')}</span>
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4 text-xs text-slate-400">
          Jai Shakti Farsan Mart • Shop PC & Mobile System
        </div>
      </div>
    </div>
  );
}

export default Login;
