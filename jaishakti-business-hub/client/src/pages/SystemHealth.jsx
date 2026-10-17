import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  ShieldCheck,
  Database,
  HardDrive,
  Clock,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileArchive,
  RefreshCw
} from 'lucide-react';

export function SystemHealth() {
  const { lang, t, formatDate } = useLanguage();
  const { role } = useAuth();

  const [healthData, setHealthData] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [notice, setNotice] = useState('');

  const loadHealthAndBackups = async () => {
    setLoading(true);
    try {
      const [healthRes, bakRes] = await Promise.all([
        apiFetch('/api/system/health'),
        apiFetch('/api/system/backups')
      ]);
      setHealthData(healthRes);
      if (bakRes.backups) setBackups(bakRes.backups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthAndBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setNotice('');
    try {
      const res = await apiFetch('/api/system/backups', { method: 'POST' });
      setNotice(`Backup created successfully: ${res.fileName} (${(res.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
      loadHealthAndBackups();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = async (fileName) => {
    const ok = window.confirm(
      lang === 'gu'
        ? `ચેતવણી: શું તમે ${fileName} માંથી ડેટાબેઝ રીસ્ટોર કરવા માંગો છો? હાલના ડેટાનો આપમેળે સેફ્ટી બેકઅપ લેવાશે.`
        : `WARNING: Are you sure you want to restore from ${fileName}? A safety backup of the current database will be created automatically before restoring.`
    );
    if (!ok) return;

    try {
      const res = await apiFetch('/api/system/restore', {
        method: 'POST',
        body: JSON.stringify({ fileName, confirm: true })
      });
      alert(`Database successfully restored! Pre-restore safety backup saved as: ${res.safetyBackup}`);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {t('nav_system')}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'gu' ? 'ડેટાબેઝ સુરક્ષા, બેકઅપ અને ડાયગ્નોસ્ટિક્સ' : 'Database Security, Backup Archives, and Diagnostics'}
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creatingBackup}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <FileArchive className="w-4 h-4" />
          <span>{creatingBackup ? 'Creating Archive...' : t('btn_backup_now')}</span>
        </button>
      </div>

      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Diagnostics Cards */}
      {healthData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">System State</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-700 capitalize">
              {healthData.status}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Version {healthData.app_version} • {healthData.platform}
            </div>
          </div>

          {/* Database */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">SQLite Database</span>
              <Database className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-slate-900 capitalize">
              {healthData.database?.status}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              WAL Mode • {(healthData.database?.file_size_bytes / 1024).toFixed(0)} KB
            </div>
          </div>

          {/* Storage Access */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Storage Directories</span>
              <HardDrive className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-lg font-black text-slate-900">
              Writable
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              data, uploads, backups, logs
            </div>
          </div>

          {/* Uptime */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Process Uptime</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-lg font-black text-slate-900">
              {Math.floor(healthData.uptime_seconds / 60)} min
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Active local server process
            </div>
          </div>
        </div>
      )}

      {/* Backup Archives List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Available Backup Archives ({backups.length})
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'gu'
                ? 'બેકઅપમાં ડેટાબેઝ અને રસીદ ફાઈલો સુરક્ષિત સંગ્રહાયેલી હોય છે.'
                : 'Contains complete snapshot of database and receipt uploads.'}
            </p>
          </div>
          <button
            onClick={loadHealthAndBackups}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {backups.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No backup archives created yet. Click "Create Backup Now" above.
            </div>
          ) : (
            backups.map((b) => (
              <div
                key={b.fileName}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <FileArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs sm:text-sm font-mono">
                      {b.fileName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Size: {(b.sizeBytes / (1024 * 1024)).toFixed(2)} MB • Created: {new Date(b.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {role === 'owner' && (
                  <button
                    onClick={() => handleRestore(b.fileName)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold transition self-end sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('btn_restore')}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Important Shop PC Security & Disaster Recovery Notice:</span>
        </div>
        <p>
          Backups stored solely on the shop PC do not protect against physical damage, hardware failure, theft, or ransomware. We recommend copying the <code>backups/</code> folder to an external USB drive or off-site storage weekly.
        </p>
      </div>
    </div>
  );
}

export default SystemHealth;
