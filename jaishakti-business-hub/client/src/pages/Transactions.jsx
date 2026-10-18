import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';

export function Transactions({ onNavigate }) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('');

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

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });
      if (search) params.append('search', search);
      if (categoryId) params.append('category_id', categoryId);
      if (vendorId) params.append('vendor_id', vendorId);
      if (paymentStatus) params.append('payment_status', paymentStatus);
      if (approvalStatus) params.append('approval_status', approvalStatus);
      if (paymentMethod) params.append('payment_method', paymentMethod);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (sortBy) params.append('sort_by', sortBy);

      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      if (res.expenses) setExpenses(res.expenses);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndVendors();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [categoryId, vendorId, paymentStatus, approvalStatus, paymentMethod, startDate, endDate, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setVendorId('');
    setPaymentStatus('');
    setApprovalStatus('');
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
          <p className="text-xs text-slate-500">
            {lang === 'gu' ? 'કુલ વ્યવહારો:' : 'Total recorded transactions:'} {pagination.total}
          </p>
        </div>

        <button
          onClick={() => onNavigate('add_expense')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('btn_quick_add')}</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={lang === 'gu' ? 'શોધો: નંબર, વિગત, વેપારી, બિલ નંબર...' : 'Search by description, tx #, vendor, bill #...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            {t('btn_search')}
          </button>
        </form>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
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

          {/* Approval Status */}
          <select
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">{lang === 'gu' ? 'મંજૂરી સ્થિતિ' : 'All Approvals'}</option>
            <option value="approved">{t('as_approved')}</option>
            <option value="pending_approval">{t('as_pending_approval')}</option>
            <option value="rejected">{t('as_rejected')}</option>
            <option value="voided">{t('as_voided')}</option>
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">{t('th_date')}:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-amber-800 hover:underline font-semibold"
          >
            {t('btn_reset')}
          </button>
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
            {t('msg_no_records')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">{t('th_date')}</th>
                  <th className="px-4 py-3">{t('th_tx_no')}</th>
                  <th className="px-4 py-3">{t('th_category')}</th>
                  <th className="px-4 py-3">{t('th_description')}</th>
                  <th className="px-4 py-3">{t('th_vendor')}</th>
                  <th className="px-4 py-3">{t('th_amount')}</th>
                  <th className="px-4 py-3">{t('th_paid')}</th>
                  <th className="px-4 py-3">{t('th_status')}</th>
                  <th className="px-4 py-3 text-right">{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-500">
                      {tx.transaction_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                      {lang === 'gu' ? tx.category_name_gu : tx.category_name_en}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-slate-500">
                      {tx.description || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {tx.vendor_name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-black text-slate-900">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-700">
                      {formatINR(tx.total_paid || 0)}
                    </td>
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
                  </tr>
                ))}
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
    </div>
  );
}

export default Transactions;
