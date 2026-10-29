import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  CalendarCheck,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Save,
  CheckCheck
} from 'lucide-react';

export function AttendanceModal({ isOpen, onClose, onAttendanceSaved }) {
  const { lang, t } = useLanguage();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAttendance(date);
    }
  }, [isOpen, date]);

  const loadAttendance = async (targetDate) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/api/workers/attendance?date=${targetDate}`);
      if (res.attendance) {
        setAttendanceList(
          res.attendance.map(w => ({
            worker_id: w.worker_id,
            name: w.name,
            role_title: w.role_title,
            wage_type: w.wage_type,
            status: w.status === 'unmarked' ? 'present' : w.status,
            notes: w.notes || ''
          }))
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleStatusChange = (workerId, newStatus) => {
    setAttendanceList(prev =>
      prev.map(w => (w.worker_id === workerId ? { ...w, status: newStatus } : w))
    );
  };

  const handleNotesChange = (workerId, notes) => {
    setAttendanceList(prev =>
      prev.map(w => (w.worker_id === workerId ? { ...w, notes } : w))
    );
  };

  const handleMarkAll = (status) => {
    setAttendanceList(prev => prev.map(w => ({ ...w, status })));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        date,
        attendance: attendanceList.map(a => ({
          worker_id: a.worker_id,
          status: a.status,
          notes: a.notes
        }))
      };

      const res = await apiFetch('/api/workers/attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(lang === 'gu' ? 'હાજરી સફળતાપૂર્વક સાચવવામાં આવી!' : 'Attendance saved successfully!');
      if (onAttendanceSaved) {
        onAttendanceSaved(res);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = attendanceList.filter(a => a.status === 'present').length;
  const halfDayCount = attendanceList.filter(a => a.status === 'half_day').length;
  const absentCount = attendanceList.filter(a => a.status === 'absent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <CalendarCheck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {t('btn_mark_attendance')}
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {lang === 'gu' ? 'દૈનિક હાજરી પત્રક (Daily Attendance Register)' : 'Daily staff attendance sheet'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector & Quick Mark All Bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'gu' ? 'ઝડપી સેટ:' : 'Quick Mark:'}
            </span>
            <button
              type="button"
              onClick={() => handleMarkAll('present')}
              className="px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-lg text-xs transition flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{lang === 'gu' ? 'બધા હાજર' : 'All Present'}</span>
            </button>
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
          <span className="text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {presentCount} {t('status_present')}
          </span>
          <span className="text-amber-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {halfDayCount} {t('status_half_day')}
          </span>
          <span className="text-red-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {absentCount} {t('status_absent')}
          </span>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
              {lang === 'gu' ? 'હાજરી લોડ થઈ રહી છે...' : 'Loading attendance register...'}
            </div>
          ) : attendanceList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
              {lang === 'gu' ? 'કોઈ સક્રિય કારીગરો મળ્યા નથી.' : 'No active workers found.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendanceList.map(worker => (
                <div key={worker.worker_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {worker.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {worker.role_title} • {worker.wage_type === 'monthly' ? t('lbl_monthly_wage') : t('lbl_daily_wage')}
                    </p>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(worker.worker_id, 'present')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        worker.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t('status_present')} (P)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(worker.worker_id, 'half_day')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        worker.status === 'half_day'
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30 ring-2 ring-amber-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t('status_half_day')} (HD)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(worker.worker_id, 'absent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        worker.status === 'absent'
                          ? 'bg-red-600 text-white shadow-sm shadow-red-600/30 ring-2 ring-red-500'
                          : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('status_absent')} (A)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-white transition"
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || attendanceList.length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('btn_saving') : t('btn_save_attendance')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceModal;
