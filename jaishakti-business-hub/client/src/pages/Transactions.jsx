import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import ExpenseDetailsModal from './ExpenseDetailsModal';
import {
  Search,
  Filter,
  Receipt,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  SlidersHorizontal,
  LayoutGrid,
  ListCollapse,
  Layers,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

export const AVAILABLE_COLUMNS = [
  { id: 'date', key: 'col_date', default: true },
  { id: 'tx_no', key: 'col_tx_no', default: true },
  { id: 'category', key: 'col_category', default: true },
  { id: 'description', key: 'col_description', default: true },
  { id: 'purchased_items', key: 'col_purchased_items', default: true },
  { id: 'vendor', key: 'col_vendor', default: true },
  { id: 'amount', key: 'col_amount', default: true },
  { id: 'paid', key: 'col_paid', default: true },
  { id: 'balance', key: 'col_balance', default: false },
  { id: 'payment_status', key: 'col_payment_status', default: true },
  { id: 'payment_method', key: 'col_payment_method', default: false },
  { id: 'approval_status', key: 'col_approval_status', default: false },
  { id: 'invoice_no', key: 'col_invoice_no', default: false },
  { id: 'reference_no', key: 'col_reference_no', default: false },
  { id: 'actions', key: 'col_actions', default: true, required: true }
];

export const PRESETS = {
  standard: ['date', 'tx_no', 'category', 'description', 'purchased_items', 'vendor', 'amount', 'paid', 'payment_status', 'actions'],
  compact: ['date', 'category', 'vendor', 'amount', 'payment_status', 'actions'],
  full: AVAILABLE_COLUMNS.map(c => c.id)
};

const COLUMN_STORAGE_KEY = 'jaishakti_tx_visible_columns_v3';

export function extractPurchasedItems(tx) {
  if (!tx) return [];
  let items = [];

  // 1. Structured line items from bill_ocr_raw_text
  if (tx.bill_ocr_raw_text) {
    try {
      const parsed = typeof tx.bill_ocr_raw_text === 'string'
        ? JSON.parse(tx.bill_ocr_raw_text)
        : tx.bill_ocr_raw_text;
      if (parsed && Array.isArray(parsed.items)) {
        items = parsed.items
          .filter(it => it && (it.description || it.name))
          .map(it => {
            const name = (it.description || it.name || '').trim();
            const qtyStr = it.quantity != null && it.quantity !== '' ? String(it.quantity) : '';
            const unitStr = it.unit ? String(it.unit).trim() : '';
            const qty = (qtyStr + (unitStr ? ' ' + unitStr : '')).trim();
            return { name, qty };
          });
      }
    } catch (e) {}
  }

  // 2. Fallback to notes parsing if no structured line items found
  if (items.length === 0 && tx.notes) {
    const rawLines = tx.notes.split(/[;\n\r]+/);
    for (const line of rawLines) {
      const clean = line.replace(/^[•\s*-]+/, '').trim();
      const m = clean.match(/^([^:@]+?)\s*:\s*(\d+(?:\.\d+)?\s*[a-zA-Z\u0A80-\u0AFF]+)/);
      if (m) {
        items.push({ name: m[1].trim(), qty: m[2].trim() });
      }
    }
  }

  // Deduplicate identical items
  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    if (!it.name) continue;
    const key = (it.name + '||' + (it.qty || '')).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(it);
    }
  }
  return deduped;
}

const getInitialVisibleColumns = () => {
  try {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!parsed.includes('actions')) parsed.push('actions');
        return parsed;
      }
    }
    // Backward compatibility: upgrade existing v2 selections cleanly
    const savedV2 = localStorage.getItem('jaishakti_tx_visible_columns_v2');
    if (savedV2) {
      const parsedV2 = JSON.parse(savedV2);
      if (Array.isArray(parsedV2) && parsedV2.length > 0) {
        if (!parsedV2.includes('purchased_items')) {
          const descIdx = parsedV2.indexOf('description');
          if (descIdx !== -1) {
            parsedV2.splice(descIdx + 1, 0, 'purchased_items');
          } else {
            parsedV2.push('purchased_items');
          }
        }
        if (!parsedV2.includes('actions')) parsedV2.push('actions');
        return parsedV2;
      }
    }
  } catch (e) {}
  return PRESETS.standard;
};

export function Transactions({ onNavigate }) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Customizable Columns State
  const [visibleColumns, setVisibleColumns] = useState(getInitialVisibleColumns);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const toggleColumn = (colId) => {
    if (colId === 'actions') return;
    setVisibleColumns((prev) => {
      const next = prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId];
      try {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const applyPreset = (presetKey) => {
    const next = PRESETS[presetKey] || PRESETS.standard;
    setVisibleColumns(next);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  const isColVisible = (colId) => visibleColumns.includes(colId);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Date Preset Helpers (Today, Last Week, Last Month, This Month)
  const getDatePresetRanges = () => {
    const now = new Date();
    const toISO = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = toISO(now);

    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeek = toISO(lastWeekDate);

    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStart = toISO(prevMonthDate);
    const lastMonthEnd = toISO(prevMonthEnd);

    return {
      today: { start: today, end: today },
      last_week: { start: lastWeek, end: today },
      this_month: { start: thisMonthStart, end: today },
      last_month: { start: lastMonthStart, end: lastMonthEnd }
    };
  };

  const isPresetActive = (key) => {
    const presets = getDatePresetRanges();
    const target = presets[key];
    if (!target) return false;
    return startDate === target.start && endDate === target.end;
  };

  const applyDatePreset = (key) => {
    const presets = getDatePresetRanges();
    const target = presets[key];
    if (!target) return;
    if (startDate === target.start && endDate === target.end) {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate(target.start);
      setEndDate(target.end);
    }
  };

  const searchInputRef = useRef(null);

  // Live Summary Aggregate State
  const [summary, setSummary] = useState({
    total_count: 0,
    total_amount: 0,
    total_paid: 0,
    balance_due: 0,
    paid_count: 0,
    partial_count: 0,
    pending_count: 0
  });

  // Selected for Details Modal
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Quick Action feedback
  const [actionNotice, setActionNotice] = useState('');

  // Delete State
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchCategoriesAndVendors = async () => {
    try {
      const [cRes, vRes] = await Promise.all([
        apiFetch('/api/categories?all=true'),
        apiFetch('/api/vendors')
      ]);
      if (cRes.categories) setCategories(cRes.categories);
      if (vRes.vendors) setVendors(vRes.vendors);
    } catch (e) {}
  };

  const fetchTransactions = async (page = 1, searchQuery = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });
      const q = typeof searchQuery === 'string' ? searchQuery.trim() : (search || '').trim();
      if (q) params.append('search', q);
      if (categoryId) params.append('category_id', categoryId);
      if (vendorId) params.append('vendor_id', vendorId);
      if (paymentStatus) params.append('payment_status', paymentStatus);
      if (paymentMethod) params.append('payment_method', paymentMethod);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (sortBy) params.append('sort_by', sortBy);

      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      if (res.expenses) setExpenses(res.expenses);
      if (res.pagination) setPagination(res.pagination);
      if (res.summary) {
        setSummary(res.summary);
      } else {
        const bTotal = (res.expenses || []).reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
        const pTotal = (res.expenses || []).reduce((acc, x) => acc + (Number(x.total_paid) || 0), 0);
        setSummary({
          total_count: res.pagination?.total || (res.expenses || []).length,
          total_amount: Math.round(bTotal * 100) / 100,
          total_paid: Math.round(pTotal * 100) / 100,
          balance_due: Math.max(0, Math.round((bTotal - pTotal) * 100) / 100),
          paid_count: (res.expenses || []).filter(x => x.payment_status === 'paid').length,
          partial_count: (res.expenses || []).filter(x => x.payment_status === 'partially_paid').length,
          pending_count: (res.expenses || []).filter(x => x.payment_status !== 'paid' && x.payment_status !== 'partially_paid').length
        });
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndVendors();
  }, []);

  // Automatic real-time search with 120ms debounce (iOS Spotlight style)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(1, search);
    }, 120);
    return () => clearTimeout(timer);
  }, [search, categoryId, vendorId, paymentStatus, paymentMethod, startDate, endDate, sortBy]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchTransactions(1, search);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setVendorId('');
    setPaymentStatus('');
    setPaymentMethod('');
    setStartDate('');
    setEndDate('');
    setSortBy('');
  };

  const handleOpenDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await apiFetch(`/api/expenses/${id}`);
      if (res.expense) setSelectedExpense(res.expense);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiFetch(`/api/expenses/${id}/approve`, { method: 'POST' });
      setActionNotice(t('msg_approved_success'));
      setTimeout(() => setActionNotice(''), 3000);
      fetchTransactions(pagination.page);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt(lang === 'gu' ? 'નામંજૂર કરવાનું કારણ લખો:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      await apiFetch(`/api/expenses/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      setActionNotice(t('msg_rejected_success'));
      setTimeout(() => setActionNotice(''), 3000);
      fetchTransactions(pagination.page);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(`/api/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason.trim() })
      });
      setActionNotice(t('msg_tx_deleted_success'));
      setTimeout(() => setActionNotice(''), 4000);
      setExpenseToDelete(null);
      setDeleteReason('');
      if (selectedExpense && selectedExpense.id === expenseToDelete.id) {
        setSelectedExpense(null);
      }
      fetchTransactions(pagination.page);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete transaction');
    } finally {
      setDeleting(false);
    }
  };

  const isOwnerOrManager = ['owner', 'manager'].includes(role);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {t('nav_transactions')}
          </h2>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
            <span>{lang === 'gu' ? 'કુલ વ્યવહારો:' : 'Total recorded transactions:'} <strong>{pagination.total}</strong></span>
            {search && (
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 font-semibold text-[11px]">
                • {lang === 'gu' ? `"${search}" માટે` : `results for "${search}"`}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Customizable Columns Button */}
          <button
            type="button"
            onClick={() => setShowColumnModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-xs transition"
            title={lang === 'gu' ? 'કોષ્ટકની કૉલમ પસંદ કરો' : 'Customize Table Columns'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('btn_customize_columns')}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {visibleColumns.length}/{AVAILABLE_COLUMNS.length}
            </span>
          </button>

          <button
            onClick={() => onNavigate('add_expense')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn_quick_add')}</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Real-Time Search & Financial KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
        {/* Card 1: Total Billed */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'gu' ? 'કુલ બિલની રકમ' : 'Total Billed'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatINR(summary.total_amount)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {search
                ? (lang === 'gu' ? `"${search}" ના બિલો` : `Filtered by "${search}"`)
                : (lang === 'gu' ? 'બધા વ્યવહારોનો કુલ ખર્ચ' : 'Total of all transactions')}
            </div>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200/90 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {lang === 'gu' ? 'ચૂકવેલ રકમ' : 'Total Paid'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
              {formatINR(summary.total_paid)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">
              {summary.total_amount > 0
                ? `${Math.round((summary.total_paid / summary.total_amount) * 100)}% ${lang === 'gu' ? 'ચૂકવાયેલ' : 'settled'}`
                : (lang === 'gu' ? 'ચુકવણી નથી' : 'No payments')}
            </div>
          </div>
        </div>

        {/* Card 3: Pending Balance Due */}
        <div className={`p-3.5 sm:p-4 rounded-2xl shadow-xs transition flex flex-col justify-between ${
          summary.balance_due > 0
            ? 'bg-gradient-to-br from-white to-amber-50/60 border border-amber-300/90 hover:border-amber-400'
            : 'bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200/80 hover:border-emerald-300'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
              summary.balance_due > 0 ? 'text-amber-800' : 'text-emerald-800'
            }`}>
              {lang === 'gu' ? 'બાકી રકમ (ચૂકવવાની)' : 'Balance Due'}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              summary.balance_due > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {summary.balance_due > 0 ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </div>
          </div>
          <div>
            <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
              summary.balance_due > 0 ? 'text-amber-950' : 'text-emerald-700'
            }`}>
              {formatINR(summary.balance_due)}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium mt-0.5">
              {summary.balance_due > 0 ? (
                <span className="text-amber-700 font-semibold">
                  {lang === 'gu' ? 'વેપારીને ચૂકવવાની બાકી' : 'Pending to clear'}
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">
                  {lang === 'gu' ? 'સંપૂર્ણ ચૂકતે (All Clear)' : 'All cleared'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Filtered Bills & Status */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'gu' ? 'બિલોની સંખ્યા' : 'Invoices / Bills'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ListCollapse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              {summary.total_count} <span className="text-xs font-semibold text-slate-500 font-sans">{lang === 'gu' ? 'બિલો' : (summary.total_count === 1 ? 'Bill' : 'Bills')}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] font-semibold flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {summary.paid_count} {lang === 'gu' ? 'ચૂકતે' : 'Paid'}
              </span>
              {(summary.pending_count > 0 || summary.partial_count > 0) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {summary.pending_count + summary.partial_count} {lang === 'gu' ? 'બાકી' : 'Pending'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={lang === 'gu' ? 'તરત જ શોધો: વેપારી (ખુશી / Khushi), બિલ નંબર, વિગત, રકમ...' : 'Search instantly: Vendor (Khushi), bill #, description, amount...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50/60 hover:bg-white focus:bg-white transition placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition"
                title={lang === 'gu' ? 'શોધ સાફ કરો' : 'Clear search'}
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition">
                  <X className="w-3 h-3" />
                </div>
              </button>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-xl animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="hidden sm:inline">{lang === 'gu' ? 'શોધાઈ રહ્યું છે...' : 'Searching...'}</span>
            </div>
          )}
        </form>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'બધી કેટેગરી' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'gu' ? c.name_gu : c.name_en}
              </option>
            ))}
          </select>

          {/* Vendor */}
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'બધા વેપારી' : 'All Vendors'}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'ચૂકવણી સ્થિતિ' : 'All Payment Status'}</option>
            <option value="paid">{t('ps_paid')}</option>
            <option value="partially_paid">{t('ps_partially_paid')}</option>
            <option value="unpaid">{t('ps_unpaid')}</option>
          </select>

          {/* Payment Method */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'બધી પદ્ધતિ' : 'All Payment Methods'}</option>
            <option value="cash">{t('pm_cash')}</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank</option>
            <option value="credit">{t('pm_credit')}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'તારીખ (નવી પહેલા)' : 'Date (Newest)'}</option>
            <option value="date_asc">{lang === 'gu' ? 'તારીખ (જૂની પહેલા)' : 'Date (Oldest)'}</option>
            <option value="amount_desc">{lang === 'gu' ? 'રકમ (વધુથી ઓછી)' : 'Amount (High to Low)'}</option>
            <option value="amount_asc">{lang === 'gu' ? 'રકમ (ઓછીથી વધુ)' : 'Amount (Low to High)'}</option>
          </select>
        </div>

        {/* Date Filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold">{t('th_date')}:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />

            {/* Direct date preset buttons */}
            <div className="inline-flex items-center gap-1 ml-1 sm:ml-2 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isPresetActive('today')
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-900 hover:bg-white'
                }`}
                title={lang === 'gu' ? 'આજની તારીખ' : 'Today'}
              >
                {t('lbl_date_today')}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last_week')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isPresetActive('last_week')
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-900 hover:bg-white'
                }`}
                title={lang === 'gu' ? 'છેલ્લા ૭ દિવસ' : 'Last 7 days'}
              >
                {t('lbl_date_last_week')}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isPresetActive('last_month')
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-900 hover:bg-white'
                }`}
                title={lang === 'gu' ? 'ગયા મહિનાના બિલો' : 'Previous month'}
              >
                {t('lbl_date_last_month')}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isPresetActive('this_month')
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-900 hover:bg-white'
                }`}
                title={lang === 'gu' ? 'ચાલુ મહિનો' : 'This month'}
              >
                {t('lbl_date_this_month')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowColumnModal(true)}
              className="text-slate-600 hover:text-amber-800 font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('btn_customize_columns')}</span>
              <span className="text-[10px] text-slate-400">({visibleColumns.length} visible)</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-800 hover:underline font-semibold"
            >
              {t('btn_reset')}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span>Loading transactions...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {search ? (
              <div className="space-y-2">
                <p className="font-bold text-sm text-slate-700">
                  {lang === 'gu' ? `"${search}" માટે કોઈ વ્યવહાર મળ્યો નથી` : `No transactions matching "${search}"`}
                </p>
                <p className="text-slate-400">
                  {lang === 'gu' ? 'કૃપા કરીને અલગ વેપારીનું નામ અથવા વિગત લખીને પ્રયાસ કરો.' : 'Try checking the vendor name, bill number, or description.'}
                </p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs transition border border-amber-200"
                >
                  {lang === 'gu' ? '✕ શોધ સાફ કરો (બધા બતાવો)' : '✕ Clear search (Show all)'}
                </button>
              </div>
            ) : (
              t('msg_no_records')
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-100">
                <tr>
                  {isColVisible('date') && <th className="px-4 py-3 whitespace-nowrap">{t('col_date')}</th>}
                  {isColVisible('tx_no') && <th className="px-4 py-3 whitespace-nowrap">{t('col_tx_no')}</th>}
                  {isColVisible('category') && <th className="px-4 py-3 whitespace-nowrap">{t('col_category')}</th>}
                  {isColVisible('description') && <th className="px-4 py-3 min-w-[160px]">{t('col_description')}</th>}
                  {isColVisible('purchased_items') && <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">{t('col_purchased_items')}</th>}
                  {isColVisible('vendor') && <th className="px-4 py-3 whitespace-nowrap">{t('col_vendor')}</th>}
                  {isColVisible('amount') && <th className="px-4 py-3 whitespace-nowrap">{t('col_amount')}</th>}
                  {isColVisible('paid') && <th className="px-4 py-3 whitespace-nowrap">{t('col_paid')}</th>}
                  {isColVisible('balance') && <th className="px-4 py-3 whitespace-nowrap">{t('col_balance')}</th>}
                  {isColVisible('payment_status') && <th className="px-4 py-3 whitespace-nowrap">{t('col_payment_status')}</th>}
                  {isColVisible('payment_method') && <th className="px-4 py-3 whitespace-nowrap">{t('col_payment_method')}</th>}
                  {isColVisible('approval_status') && <th className="px-4 py-3 whitespace-nowrap">{t('col_approval_status')}</th>}
                  {isColVisible('invoice_no') && <th className="px-4 py-3 whitespace-nowrap">{t('col_invoice_no')}</th>}
                  {isColVisible('reference_no') && <th className="px-4 py-3 whitespace-nowrap">{t('col_reference_no')}</th>}
                  {isColVisible('actions') && <th className="px-4 py-3 text-right whitespace-nowrap">{t('col_actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((tx) => {
                  const dueBalance = Math.max(0, (Number(tx.amount) || 0) - (Number(tx.total_paid) || 0));
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      {isColVisible('date') && (
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                          {formatDate(tx.transaction_date)}
                        </td>
                      )}
                      {isColVisible('tx_no') && (
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">
                          {tx.transaction_number}
                        </td>
                      )}
                      {isColVisible('category') && (
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                          {lang === 'gu' ? tx.category_name_gu : tx.category_name_en}
                        </td>
                      )}
                      {isColVisible('description') && (
                        <td className="px-4 py-3 max-w-[220px] truncate text-slate-600" title={tx.description || ''}>
                          {tx.description || '—'}
                        </td>
                      )}
                      {isColVisible('purchased_items') && (
                        <td className="px-4 py-3 min-w-[180px] max-w-[280px]">
                          {(() => {
                            const items = extractPurchasedItems(tx);
                            if (!items || items.length === 0) {
                              return <span className="text-slate-300 font-mono">—</span>;
                            }
                            return (
                              <div className="flex flex-col gap-1.5 py-0.5">
                                {items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/80 text-xs shadow-2xs"
                                  >
                                    <span className="font-semibold text-slate-800 truncate" title={it.name}>
                                      {it.name}
                                    </span>
                                    {it.qty && (
                                      <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold font-mono">
                                        {it.qty}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      {isColVisible('vendor') && (
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {tx.worker_name ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                              <Users className="w-3 h-3 text-amber-600" />
                              <span>{tx.worker_name}</span>
                            </span>
                          ) : (
                            tx.vendor_name || '—'
                          )}
                        </td>
                      )}
                      {isColVisible('amount') && (
                        <td className="px-4 py-3 whitespace-nowrap font-black text-slate-900">
                          {formatINR(tx.amount)}
                        </td>
                      )}
                      {isColVisible('paid') && (
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">
                          {formatINR(tx.total_paid || 0)}
                        </td>
                      )}
                      {isColVisible('balance') && (
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">
                          {dueBalance > 0 ? (
                            <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {formatINR(dueBalance)}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                      )}
                      {isColVisible('payment_status') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.approval_status === 'voided' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                              {t('as_voided')}
                            </span>
                          ) : tx.approval_status === 'rejected' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              {t('as_rejected')}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5 items-start">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                                tx.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                                  : tx.payment_status === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200/80'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200/80'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  tx.payment_status === 'paid' ? 'bg-emerald-600' :
                                  tx.payment_status === 'partially_paid' ? 'bg-amber-600' : 'bg-rose-600'
                                }`} />
                                {tx.payment_status === 'paid'
                                  ? (lang === 'gu' ? 'ચૂકવેલ' : 'Paid')
                                  : tx.payment_status === 'partially_paid'
                                  ? (lang === 'gu' ? 'અંશતઃ ચૂકવેલ' : 'Partially Paid')
                                  : (lang === 'gu' ? 'બાકી ચૂકવણી' : 'Payment Pending')}
                              </span>
                              {tx.approval_status === 'pending_approval' && (
                                <span className="text-[9px] text-amber-700 font-semibold pl-1">
                                  • {t('as_pending_approval')}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      {isColVisible('payment_method') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                            {t(`pm_${tx.payment_method}`) || tx.payment_method || '—'}
                          </span>
                        </td>
                      )}
                      {isColVisible('approval_status') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.approval_status === 'approved' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {t('as_approved')}
                            </span>
                          ) : tx.approval_status === 'pending_approval' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {t('as_pending_approval')}
                            </span>
                          ) : tx.approval_status === 'rejected' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              {t('as_rejected')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                              {t('as_voided')}
                            </span>
                          )}
                        </td>
                      )}
                      {isColVisible('invoice_no') && (
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {tx.invoice_number ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                              #{tx.invoice_number}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      {isColVisible('reference_no') && (
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {tx.reference_number || '—'}
                        </td>
                      )}
                      {isColVisible('actions') && (
                        <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                          {isOwnerOrManager && tx.approval_status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => handleApprove(tx.id)}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                                title={t('btn_approve')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(tx.id)}
                                className="p-1 rounded text-red-600 hover:bg-red-50"
                                title={t('btn_reject')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenDetails(tx.id)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('btn_view_details')}</span>
                          </button>
                          {isOwnerOrManager && (
                            <button
                              onClick={() => {
                                setExpenseToDelete(tx);
                                setDeleteReason('');
                                setDeleteError('');
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition border border-red-200/60"
                              title={lang === 'gu' ? 'કાઢી નાખો' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t('btn_delete_entry')}</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          categories={categories}
          vendors={vendors}
          onClose={() => setSelectedExpense(null)}
          onRefresh={() => {
            fetchTransactions(pagination.page);
            handleOpenDetails(selectedExpense.id);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t('msg_confirm_delete_title')}</h3>
                  <p className="text-xs text-red-100">{expenseToDelete.reference_number || `EXP #${expenseToDelete.id}`}</p>
                </div>
              </div>
              <button
                onClick={() => setExpenseToDelete(null)}
                disabled={deleting}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/80 text-xs text-red-900 leading-relaxed">
                <p className="font-semibold">{t('msg_confirm_delete_desc')}</p>
                <div className="mt-2 pt-2 border-t border-red-200/60 text-slate-700 space-y-1">
                  <div><strong>{lang === 'gu' ? 'તારીખ:' : 'Date:'}</strong> {formatDate(expenseToDelete.expense_date)}</div>
                  <div><strong>{lang === 'gu' ? 'કેટેગરી:' : 'Category:'}</strong> {lang === 'gu' ? expenseToDelete.category_name_gu : expenseToDelete.category_name_en}</div>
                  <div><strong>{lang === 'gu' ? 'રકમ:' : 'Amount:'}</strong> <span className="font-bold text-red-700">{formatINR(expenseToDelete.amount)}</span></div>
                  {expenseToDelete.vendor_name && (
                    <div><strong>{lang === 'gu' ? 'વેપારી:' : 'Vendor:'}</strong> {expenseToDelete.vendor_name}</div>
                  )}
                  {expenseToDelete.description && (
                    <div><strong>{lang === 'gu' ? 'વિગત:' : 'Description:'}</strong> {expenseToDelete.description}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_delete_reason')}
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder={lang === 'gu' ? 'દા.ત. ભૂલથી ખોટી એન્ટ્રી થઈ ગઈ હતી' : 'e.g. Accidental duplicate or mistaken entry'}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                  disabled={deleting}
                />
              </div>

              {deleteError && (
                <div className="p-2.5 bg-red-100 text-red-800 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? (lang === 'gu' ? 'કાઢી રહ્યું છે...' : 'Deleting...') : t('btn_delete_tx')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Customization Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {t('lbl_customize_columns')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('lbl_visible_columns_count')
                      .replace('{count}', visibleColumns.length)
                      .replace('{total}', AVAILABLE_COLUMNS.length)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === 'gu' ? 'ઝડપી પ્રીસેટ્સ (Presets)' : 'Quick View Presets'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('standard')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition flex items-center gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('btn_preset_standard')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('compact')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition flex items-center gap-1.5"
                >
                  <ListCollapse className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('btn_preset_compact')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 transition flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('btn_preset_full')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('standard')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-100 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('btn_reset_columns')}</span>
                </button>
              </div>
            </div>

            {/* Column Checkboxes List (Grid of 2 columns) */}
            <div className="max-h-72 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_COLUMNS.map((col) => {
                  const isChecked = visibleColumns.includes(col.id);
                  const isRequired = col.required;
                  return (
                    <div
                      key={col.id}
                      onClick={() => !isRequired && toggleColumn(col.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-amber-400 bg-amber-50/70 text-amber-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      } ${isRequired ? 'opacity-85 cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{t(col.key)}</span>
                      </div>
                      {isRequired && (
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          {lang === 'gu' ? 'જરૂરી' : 'Locked'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                {lang === 'gu' ? 'સેટિંગ્સ આપોઆપ સેવ થાય છે' : 'Changes saved automatically'}
              </span>
              <button
                type="button"
                onClick={() => setShowColumnModal(false)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition"
              >
                {lang === 'gu' ? 'પૂર્ણ (Done)' : 'Done & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
