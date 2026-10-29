import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import AddWorkerModal, { WORKER_ROLE_OPTIONS } from './AddWorkerModal';
import WorkerDetailModal from './WorkerDetailModal';
import RecordUpadModal from './RecordUpadModal';
import SettleSalaryModal from './SettleSalaryModal';
import AttendanceModal from './AttendanceModal';
import DiaryScanModal from './DiaryScanModal';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Phone,
  Briefcase,
  IndianRupee,
  CalendarCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  HandCoins,
  Camera
} from 'lucide-react';

export function Workers() {
  const { lang, t, formatINR } = useLanguage();

  const [workers, setWorkers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modals state
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showDiaryScanModal, setShowDiaryScanModal] = useState(false);
  const [scanPreselectedWorkerId, setScanPreselectedWorkerId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  // Quick Action Modal states for cards
  const [quickActionWorker, setQuickActionWorker] = useState(null);
  const [showQuickUpadModal, setShowQuickUpadModal] = useState(false);
  const [quickUpadType, setQuickUpadType] = useState('advance_given');
  const [showQuickSettleModal, setShowQuickSettleModal] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, [roleFilter, statusFilter]);

  const fetchWorkers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await apiFetch(`/api/workers?${params.toString()}`);
      if (res.workers) {
        setWorkers(res.workers);
        setSummary(res.summary || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load workers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWorkers();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/30">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('lbl_worker_khata')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {t('lbl_worker_khata_sub')}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setScanPreselectedWorkerId(null);
              setShowDiaryScanModal(true);
            }}
            className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-2"
            title="Scan handwritten diary notebook with AI OCR"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t('btn_scan_diary')}</span>
          </button>

          <button
            onClick={() => setShowAttendanceModal(true)}
            className="px-3.5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm"
          >
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <span>{t('btn_mark_attendance')}</span>
          </button>

          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn_add_worker')}</span>
          </button>
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Active Workers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t('lbl_active_workers')}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-1">
              {summary ? summary.activeWorkers : 0}
            </span>
            <span className="text-[11px] text-slate-400">
              {lang === 'gu' ? `કુલ સ્ટાફ: ${summary?.totalWorkers || 0}` : `Total registered: ${summary?.totalWorkers || 0}`}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Outstanding Advance (Red Badge) */}
        <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-red-50/30">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">
              {t('lbl_total_outstanding_upad')}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-red-600 block mt-1">
              {formatINR(summary ? summary.totalOutstandingAdvance : 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              {lang === 'gu' ? 'દુકાનમાંથી કારીગરો પાસે બાકી' : 'Advances pending recovery'}
            </span>
          </div>
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* This Month Salary Paid */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              {t('lbl_month_salary_paid')}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 block mt-1">
              {formatINR(summary ? summary.thisMonthSalary : 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              {lang === 'gu' ? 'ચાલુ માસમાં ચોખ્ખી ચૂકવણી' : 'Settled net payouts'}
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Today's Attendance Overview */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t('lbl_today_attendance')}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-blue-700">
                {summary?.todayAttendance ? summary.todayAttendance.present : 0} {lang === 'gu' ? 'હાજર' : 'P'}
              </span>
              <span className="text-xs font-bold text-amber-600">
                {summary?.todayAttendance?.halfDay || 0} HD
              </span>
              <span className="text-xs font-bold text-red-600">
                {summary?.todayAttendance?.absent || 0} A
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'gu' ? 'કારીગરનું નામ અથવા મોબાઈલ નંબર શોધો...' : 'Search worker by name or phone...'}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">{lang === 'gu' ? 'બધા હોદ્દા (All Roles)' : 'All Roles'}</option>
              {WORKER_ROLE_OPTIONS.map(r => (
                <option key={r.id} value={r.id}>
                  {lang === 'gu' ? r.gu : r.en}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-36 px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">{lang === 'gu' ? 'સક્રિય સ્ટાફ' : 'Active Staff'}</option>
              <option value="inactive">{lang === 'gu' ? 'છૂટા થયેલ' : 'Inactive'}</option>
              <option value="all">{lang === 'gu' ? 'બધા સ્ટાફ' : 'All Staff'}</option>
            </select>

            <button
              type="submit"
              className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition shrink-0"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('active'); }}
              className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition shrink-0"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Workers Cards Grid */}
      {loading ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-amber-600" />
          <span className="text-sm font-semibold">
            {lang === 'gu' ? 'કારીગરોની યાદી અને ખાતાવહી લોડ થઈ રહી છે...' : 'Loading worker directory and ledger...'}
          </span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {lang === 'gu' ? 'કોઈ કારીગર મળ્યો નથી' : 'No workers found'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {lang === 'gu'
              ? 'નવા કારીગરની નોંધણી કરવા માટે ઉપર "નવો કારીગર ઉમેરો" બટન દબાવો.'
              : 'Add your shop workers to start maintaining their daily advances and monthly wage ledger.'}
          </p>
          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn_add_worker')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map((worker) => {
            const hasUpad = (worker.outstanding_advance || 0) > 0;
            const isTodayPresent = worker.today_attendance === 'present';
            const isTodayHalf = worker.today_attendance === 'half_day';
            const isTodayAbsent = worker.today_attendance === 'absent';

            return (
              <div
                key={worker.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-amber-500/20">
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 leading-tight">
                            {worker.name}
                          </h3>
                          {worker.diary_page && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-bold">
                              પાના {worker.diary_page}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {worker.role_title}
                        </p>
                      </div>
                    </div>

                    {/* Today Attendance Status Pill */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isTodayPresent
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isTodayHalf
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : isTodayAbsent
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {isTodayPresent && (lang === 'gu' ? 'હાજર (P)' : 'Present')}
                      {isTodayHalf && (lang === 'gu' ? 'અડધો દિવસ (HD)' : 'Half-day')}
                      {isTodayAbsent && (lang === 'gu' ? 'ગેરહાજર (A)' : 'Absent')}
                      {!worker.today_attendance && (lang === 'gu' ? 'હાજરી બાકી' : 'Not Marked')}
                    </span>
                  </div>

                  {/* Wage & Contact Info */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        {worker.wage_type === 'monthly' ? t('lbl_monthly_wage') : t('lbl_daily_wage')}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {formatINR(worker.base_salary)}
                      </span>
                      {worker.salary_cycle_day && (
                        <span className="text-[10px] text-amber-800 block font-semibold">
                          હિસાબ: {worker.salary_cycle_day} તારીખે
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        {t('lbl_phone')}
                      </span>
                      <span className="font-medium text-slate-700 block">
                        {worker.phone || '-'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        PIN: {worker.login_pin || '1234'}
                      </span>
                    </div>
                  </div>

                  {/* Outstanding Advance Highlight Box */}
                  <div className={`mt-3.5 p-3 rounded-xl border flex items-center justify-between ${
                    hasUpad
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-emerald-50/60 border-emerald-200'
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {t('th_upad_balance')}
                      </span>
                      <span className={`text-lg font-black ${
                        hasUpad ? 'text-red-600' : 'text-emerald-700'
                      }`}>
                        {formatINR(worker.outstanding_advance || 0)}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hasUpad ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {hasUpad ? t('badge_upad_due') : t('badge_settled')}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Quick Give Upad */}
                    <button
                      onClick={() => {
                        setQuickActionWorker(worker);
                        setQuickUpadType('advance_given');
                        setShowQuickUpadModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title={t('btn_give_upad')}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>{lang === 'gu' ? 'ઉપાડ' : 'Upad'}</span>
                    </button>

                    {/* Quick Settle Salary */}
                    <button
                      onClick={() => {
                        setQuickActionWorker(worker);
                        setShowQuickSettleModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title={t('btn_settle_salary')}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{lang === 'gu' ? 'પગાર' : 'Settle'}</span>
                    </button>

                    {/* Quick Scan Old Diary Page (OCR) */}
                    <button
                      onClick={() => {
                        setScanPreselectedWorkerId(worker.id);
                        setShowDiaryScanModal(true);
                      }}
                      className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title={lang === 'gu' ? 'આ કારીગરનો ચોપડો સ્કેન કરો' : 'Scan Diary for this worker'}
                    >
                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                      <span className="hidden sm:inline">OCR</span>
                    </button>
                  </div>

                  {/* View Full Ledger Button */}
                  <button
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <span>{lang === 'gu' ? 'ખાતાવહી જુઓ' : 'View Khata'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Worker Modal */}
      <AddWorkerModal
        isOpen={showAddWorkerModal}
        onClose={() => setShowAddWorkerModal(false)}
        onWorkerSaved={() => fetchWorkers()}
      />

      {/* Daily Attendance Modal */}
      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onAttendanceSaved={() => fetchWorkers()}
      />

      {/* AI OCR Old Diary Scanner Modal */}
      <DiaryScanModal
        isOpen={showDiaryScanModal}
        onClose={() => setShowDiaryScanModal(false)}
        workers={workers}
        preselectedWorkerId={scanPreselectedWorkerId}
        onImportComplete={() => fetchWorkers()}
      />

      {/* Worker Detail & Passbook Ledger Modal */}
      <WorkerDetailModal
        isOpen={!!selectedWorkerId}
        workerId={selectedWorkerId}
        onClose={() => setSelectedWorkerId(null)}
        onWorkerUpdated={() => fetchWorkers()}
      />

      {/* Quick Action: Record Upad Modal from card */}
      <RecordUpadModal
        isOpen={showQuickUpadModal}
        onClose={() => setShowQuickUpadModal(false)}
        worker={quickActionWorker}
        defaultType={quickUpadType}
        onTransactionSaved={() => fetchWorkers()}
      />

      {/* Quick Action: Settle Salary Modal from card */}
      <SettleSalaryModal
        isOpen={showQuickSettleModal}
        onClose={() => setShowQuickSettleModal(false)}
        worker={quickActionWorker}
        onSettlementSaved={() => fetchWorkers()}
      />
    </div>
  );
}

export default Workers;
