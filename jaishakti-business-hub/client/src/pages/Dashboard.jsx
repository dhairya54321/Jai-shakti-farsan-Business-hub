import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  Wallet,
  Receipt,
  Banknote,
  Smartphone,
  Building,
  Clock,
  Calendar,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Package,
  ChefHat,
  Scale,
  Boxes,
  Layers,
  Camera
} from 'lucide-react';
import { BillOcrModal } from './BillOcrModal.jsx';

export function Dashboard({ onNavigate }) {
  const { role } = useAuth();
  const { lang, t, formatINR, formatDate } = useLanguage();

  const [metrics, setMetrics] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [isUltimateOcrOpen, setIsUltimateOcrOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, invData, venData] = await Promise.all([
        apiFetch('/api/reports/dashboard'),
        apiFetch('/api/manufacturing/dashboard-stats').catch(() => ({ success: false })),
        apiFetch('/api/vendors').catch(() => ({ vendors: [] }))
      ]);
      setMetrics(data);
      if (invData && invData.success) {
        setInventoryStats(invData.stats);
      }
      if (venData && Array.isArray(venData.vendors)) {
        setVendors(venData.vendors);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      await apiFetch(`/api/expenses/${id}/approve`, { method: 'POST' });
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt(lang === 'gu' ? 'નામંજૂર કરવાનું કારણ લખો:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;

    setActionLoadingId(id);
    try {
      await apiFetch(`/api/expenses/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-amber-800 font-semibold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
          <span>Loading Jai Shakti Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <h3 className="font-bold text-red-800">{error}</h3>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const today = metrics?.today || {};
  const pending = metrics?.pending_approval || {};
  const mtd = metrics?.month_to_date || {};
  const isOwnerOrManager = ['owner', 'manager'].includes(role);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 sm:p-6 rounded-2xl shadow-lg shadow-amber-500/15">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm mb-2">
            {formatDate(today.date)}
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t('brand_name')}
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
            {lang === 'gu' ? 'દૈનિક ખર્ચ હિસાબ અને વાઉચર મેનેજમેન્ટ' : 'Daily Expenses and Voucher Management'}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('add_expense')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-amber-800 hover:bg-amber-50 font-bold text-sm shadow-md active:scale-95 transition w-full sm:w-auto"
          >
            <PlusCircle className="w-5 h-5 text-amber-600" />
            <span>{t('btn_quick_add')}</span>
          </button>

          <button
            onClick={() => setIsUltimateOcrOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-950/95 hover:bg-black text-amber-200 hover:text-white font-black text-xs sm:text-sm shadow-lg border border-amber-400/40 active:scale-95 transition group w-full sm:w-auto"
          >
            <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>📸 Ultimate OCR Scan (બિલ સ્કેન)</span>
          </button>
        </div>
      </div>

      {/* Owner Low-Stock Warning Alert Banner for Bharat Rana */}
      {inventoryStats?.low_stock_count > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-2xl bg-rose-600 text-white flex-shrink-0 animate-pulse mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wider">
                  Urgent Stock Alert
                </span>
                <span className="text-xs font-bold text-rose-900">
                  {inventoryStats.low_stock_count} {lang === 'gu' ? 'કાચો માલ ઓછો છે' : 'Materials Below Minimum Threshold'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-800 mt-1 font-medium">
                {inventoryStats.low_stock_items.slice(0, 4).map(m => `${m.name_gu} (${m.formatted_stock})`).join(' • ')}
                {inventoryStats.low_stock_items.length > 4 ? ` + ${inventoryStats.low_stock_items.length - 4} more` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('raw_materials')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs transition shadow-md shadow-rose-600/30 flex-shrink-0 whitespace-nowrap"
          >
            {lang === 'gu' ? 'સ્ટોક જુઓ અને ઓર્ડર કરો' : 'View Stock & Re-Order'}
          </button>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Total Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t('kpi_today_expenses')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            {formatINR(today.expenses_total || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{today.transaction_count || 0}</span>
            <span>{lang === 'gu' ? 'વ્યવહારો નોંધાયા' : 'transactions today'}</span>
          </div>
        </div>

        {/* Cash Paid Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t('kpi_cash_paid')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700">
            {formatINR(today.cash_paid || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lang === 'gu' ? 'રોકડ ગલ્લામાંથી ચૂકવ્યા' : 'Direct cash drawer outlay'}
          </div>
        </div>

        {/* UPI Paid Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t('kpi_upi_paid')}</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-sky-700">
            {formatINR(today.upi_paid || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            GPay / PhonePe / Paytm
          </div>
        </div>

        {/* Month to Date Approved */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t('kpi_mtd_expenses')}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-950">
            {formatINR(mtd.total || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {mtd.count || 0} {lang === 'gu' ? 'કુલ મંજૂર થયેલ' : 'approved records'}
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pending Approval */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          pending.count > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div>
            <div className="text-xs font-semibold">{t('kpi_pending_approval')}</div>
            <div className="text-lg font-bold">
              {formatINR(pending.total || 0)}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
            {pending.count || 0} {lang === 'gu' ? 'બાકી' : 'pending'}
          </span>
        </div>

        {/* Bank Paid Today */}
        <div className="p-4 rounded-xl border bg-white border-slate-200 flex items-center justify-between text-slate-700">
          <div>
            <div className="text-xs font-semibold">{t('kpi_bank_paid')}</div>
            <div className="text-lg font-bold text-slate-900">
              {formatINR(today.bank_transfer_paid || 0)}
            </div>
          </div>
          <Building className="w-5 h-5 text-slate-400" />
        </div>

        {/* Total Outstanding Unpaid Due */}
        <div className="p-4 rounded-xl border bg-white border-slate-200 flex items-center justify-between text-slate-700">
          <div>
            <div className="text-xs font-semibold">{t('kpi_outstanding_due')}</div>
            <div className="text-lg font-bold text-red-600">
              {formatINR(metrics?.outstanding_due || 0)}
            </div>
          </div>
          <Receipt className="w-5 h-5 text-red-400" />
        </div>
      </div>

      {/* Pending Approvals Section for Owner/Manager */}
      {isOwnerOrManager && pending.items && pending.items.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                {t('sec_pending_approvals')} ({pending.items.length})
              </h3>
            </div>
            <span className="text-xs text-amber-800 font-medium">
              {lang === 'gu' ? 'મંજૂરી માટે રિવ્યૂ કરો' : 'Review & Authorize'}
            </span>
          </div>

          <div className="space-y-2">
            {pending.items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatINR(item.amount)}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {lang === 'gu' ? item.category_name_gu : item.category_name_en}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.transaction_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.description || (lang === 'gu' ? 'વિગત વિના' : 'No description')} • {lang === 'gu' ? 'નોંધનાર:' : 'Entered by:'} {item.creator_name}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={actionLoadingId === item.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t('btn_reject')}</span>
                  </button>
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={actionLoadingId === item.id}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{t('btn_approve')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle Grid: Category Breakdown + Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {t('sec_category_breakdown')}
            </h3>
            <span className="text-xs text-slate-400">
              {metrics?.category_breakdown?.length || 0} {lang === 'gu' ? 'કેટેગરી સક્રિય' : 'categories active'}
            </span>
          </div>

          {metrics?.category_breakdown?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('msg_no_records')}
            </div>
          ) : (
            <div className="space-y-3">
              {metrics?.category_breakdown?.slice(0, 6).map((cat) => {
                const totalMtd = mtd.total || 1;
                const pct = Math.min(100, Math.round((cat.total_amount / totalMtd) * 100));
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {lang === 'gu' ? cat.name_gu : cat.name_en}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatINR(cat.total_amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {t('sec_daily_trend')}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'gu' ? 'છેલ્લા ૭ દિવસ' : 'Past 7 days'}
            </span>
          </div>

          {metrics?.daily_trend?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('msg_no_records')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics?.daily_trend?.map((d) => (
                <div
                  key={d.transaction_date}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      {formatDate(d.transaction_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {d.tx_count} {lang === 'gu' ? 'એન્ટ્રી' : 'entries'}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(d.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phase 2 (Part B): Live Stock Status & Production Output Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Widget 1: Raw Materials Stock Status */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {lang === 'gu' ? 'કાચો માલ સ્ટોક સ્થિતિ' : 'Raw Materials Inventory'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {inventoryStats?.total_materials || 0} active materials tracked
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('raw_materials')}
                className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats mini-row */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">In Inventory</span>
                <span className="text-lg font-black text-slate-800">
                  {inventoryStats ? inventoryStats.total_materials - inventoryStats.low_stock_count : '—'} Items
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${
                inventoryStats?.low_stock_count > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-100 text-slate-800'
              }`}>
                <span className="text-[10px] uppercase font-semibold block">Low Stock Alert</span>
                <span className="text-lg font-black">
                  {inventoryStats?.low_stock_count || 0} Critical
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('raw_materials')}
            className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-2 border border-amber-200/80 mt-2"
          >
            <Boxes className="w-4 h-4 text-amber-700" />
            <span>{lang === 'gu' ? 'કાચો માલ અને સ્ટોક ખોલો' : 'Open Raw Materials & Stock'}</span>
          </button>
        </div>

        {/* Widget 2: Kitchen Production Today */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ChefHat className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {lang === 'gu' ? 'આજનું રસોડાનું ઉત્પાદન' : "Today's Kitchen Production"}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Sailesh Bhai & Karigars
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('production')}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Scale Sheet</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats mini-row */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Batches Today</span>
                <span className="text-lg font-black text-slate-800">
                  {inventoryStats?.today_batches_count || 0} Batches
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="text-[10px] uppercase font-semibold block">Total Finished Farsan</span>
                <span className="text-lg font-black">
                  {inventoryStats?.today_total_kg || 0} Kg
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('production')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            <Scale className="w-4 h-4" />
            <span>{lang === 'gu' ? 'નવો ઉત્પાદન બેચ શરૂ કરો' : 'Start New Production Batch'}</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            {t('sec_recent_transactions')}
          </h3>
          <button
            onClick={() => onNavigate('transactions')}
            className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            <span>{t('nav_transactions')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 text-slate-700 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">{t('th_date')}</th>
                <th className="px-4 py-3">{t('th_category')}</th>
                <th className="px-4 py-3">{t('th_description')}</th>
                <th className="px-4 py-3">{t('th_amount')}</th>
                <th className="px-4 py-3">{t('th_payment_method')}</th>
                <th className="px-4 py-3">{t('th_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.recent_transactions?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">
                    {t('msg_no_records')}
                  </td>
                </tr>
              ) : (
                metrics?.recent_transactions?.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {lang === 'gu' ? tx.category_name_gu : tx.category_name_en}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">
                      {tx.description || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap capitalize">
                      {tx.payment_method || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        tx.approval_status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                        tx.approval_status === 'voided' ? 'bg-slate-200 text-slate-700' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {t(`as_${tx.approval_status}`)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultimate OCR Scan Modal */}
      {isUltimateOcrOpen && (
        <BillOcrModal
          isOpen={isUltimateOcrOpen}
          onClose={() => setIsUltimateOcrOpen(false)}
          onBillSaved={() => {
            fetchDashboard();
          }}
          vendors={vendors}
        />
      )}
    </div>
  );
}

export default Dashboard;
