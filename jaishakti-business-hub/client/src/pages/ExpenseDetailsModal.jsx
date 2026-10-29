import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  X,
  Calendar,
  Receipt,
  User,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Download,
  CreditCard,
  History,
  Plus,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react';

export function ExpenseDetailsModal({
  expense,
  categories = [],
  vendors = [],
  onClose,
  onRefresh
}) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role, user } = useAuth();

  const [currentExpense, setCurrentExpense] = useState(expense);
  const [catList, setCatList] = useState(categories);
  const [venList, setVenList] = useState(vendors);

  // Lightbox Viewer State
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editVendorId, setEditVendorId] = useState('');
  const [editTransactionDate, setEditTransactionDate] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Payment Inline Edit & Delete State
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPayAmount, setEditPayAmount] = useState('');
  const [editPayMethod, setEditPayMethod] = useState('cash');
  const [editPayDate, setEditPayDate] = useState('');
  const [savingPaymentAction, setSavingPaymentAction] = useState(false);
  const [paymentActionError, setPaymentActionError] = useState('');

  useEffect(() => {
    setCurrentExpense(expense);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentAmount('');
  }, [expense]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCatList(categories);
    } else {
      apiFetch('/api/categories?all=true').then(res => {
        if (res.categories) setCatList(res.categories);
      }).catch(() => {});
    }

    if (vendors && vendors.length > 0) {
      setVenList(vendors);
    } else {
      apiFetch('/api/vendors').then(res => {
        if (res.vendors) setVenList(res.vendors);
      }).catch(() => {});
    }
  }, [categories, vendors]);

  const isOwnerOrManager = ['owner', 'manager'].includes(role);
  const isDesignatedEditor = ['owner', 'manager', 'accountant'].includes(role);
  const canEdit = isDesignatedEditor && currentExpense && currentExpense.approval_status !== 'voided';

  if (!currentExpense) return null;

  const handleStartEditing = () => {
    setEditCategoryId(currentExpense.category_id || '');
    setEditAmount(currentExpense.amount ? String(currentExpense.amount) : '');
    const initialMethod = currentExpense.payments?.[0]?.payment_method || currentExpense.payment_method || 'cash';
    setEditPaymentMethod(initialMethod);
    setEditVendorId(currentExpense.vendor_id || '');
    setEditTransactionDate(
      currentExpense.transaction_date ? currentExpense.transaction_date.slice(0, 10) : ''
    );
    setEditInvoiceNumber(currentExpense.invoice_number || '');
    setEditDescription(currentExpense.description || '');
    setEditNotes(currentExpense.notes || '');
    setEditReason('');
    setEditError('');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    const amtNum = parseFloat(editAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setEditError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid amount.');
      return;
    }
    const totalPaid = currentExpense.total_paid || 0;
    if (currentExpense.payments && currentExpense.payments.length > 1 && amtNum < totalPaid) {
      setEditError(
        lang === 'gu'
          ? `નવી રકમ ₹${amtNum} એ પહેલેથી ચૂકવાયેલ ₹${totalPaid} કરતાં ઓછી હોઈ શકે નહીં. કૃપા કરીને નીચે ચૂકવણી હિસ્ટ્રીમાંથી રકમ સુધારો.`
          : `New amount of ₹${amtNum} cannot be less than already paid amount of ₹${totalPaid}. Please adjust payment history first.`
      );
      return;
    }
    if (!editReason || !editReason.trim()) {
      setEditError(t('err_reason_required'));
      return;
    }

    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category_id: editCategoryId,
          amount: amtNum,
          vendor_id: editVendorId || null,
          transaction_date: editTransactionDate,
          invoice_number: editInvoiceNumber.trim() || null,
          description: editDescription.trim() || null,
          notes: editNotes.trim() || null,
          payment_method: editPaymentMethod,
          payment_amount: (currentExpense.payments?.length === 1 && currentExpense.balance_due === 0) ? amtNum : undefined,
          reason: editReason.trim()
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setNotice(t('msg_edit_expense_success'));
      setTimeout(() => setNotice(''), 3500);
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStartEditPayment = (p) => {
    setEditingPaymentId(p.id);
    setEditPayAmount(String(p.amount));
    setEditPayMethod(p.payment_method || 'cash');
    setEditPayDate(p.payment_date ? p.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setPaymentActionError('');
  };

  const handleCancelEditPayment = () => {
    setEditingPaymentId(null);
    setPaymentActionError('');
  };

  const handleSavePayment = async (paymentId) => {
    const num = parseFloat(editPayAmount);
    if (isNaN(num) || num <= 0) {
      setPaymentActionError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid amount.');
      return;
    }
    setSavingPaymentAction(true);
    setPaymentActionError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: num,
          payment_method: editPayMethod,
          payment_date: editPayDate
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setEditingPaymentId(null);
      setNotice(lang === 'gu' ? 'ચૂકવણી વિગત સફળતાપૂર્વક સુધારાઈ!' : 'Payment details updated successfully!');
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      setPaymentActionError(err.message || 'Failed to update payment');
    } finally {
      setSavingPaymentAction(false);
    }
  };

  const handleDeletePayment = async (paymentId, amount, method) => {
    const confirmMsg = lang === 'gu'
      ? `શું તમે ખરેખર આ ₹${amount} (${(method || '').toUpperCase()}) ની ચૂકવણી કાઢી નાખવા માંગો છો? આનાથી બાકી રકમ ફરી ઉમેરાશે.`
      : `Are you sure you want to delete this payment of ₹${amount} (${(method || '').toUpperCase()})? This will restore the balance due.`;
    if (!window.confirm(confirmMsg)) return;

    setSavingPaymentAction(true);
    setPaymentActionError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setNotice(lang === 'gu' ? 'ચૂકવણી સફળતાપૂર્વક કાઢી નાખવામાં આવી!' : 'Payment removed successfully!');
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      setPaymentActionError(err.message || 'Failed to delete payment');
    } finally {
      setSavingPaymentAction(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }
    setSubmittingPayment(true);
    setPaymentError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          payment_method: paymentMethod,
          payment_date: paymentDate || new Date().toISOString().slice(0, 10)
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotice(t('msg_payment_added'));
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/approve`, { method: 'POST' });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_approved_success'));
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(lang === 'gu' ? 'નામંજૂર કરવાનું કારણ લખો:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_rejected_success'));
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVoid = async () => {
    const reason = window.prompt(lang === 'gu' ? 'વ્યવહાર રદ (Void) કરવાનું કારણ લખો:' : 'Enter reason for voiding transaction:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_voided_success'));
      setTimeout(() => setNotice(''), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    const confirmMsg = lang === 'gu'
      ? 'શું તમે ખરેખર આ બિનજરૂરી વ્યવહાર કાઢી નાખવા માંગો છો? આ વ્યવહાર હિસાબમાંથી કાયમ માટે દૂર થઈ જશે.'
      : 'Are you sure you want to delete this unwanted transaction? This will permanently remove it from records.';
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(
      lang === 'gu' ? 'કાઢી નાખવાનું કારણ લખો (વૈકલ્પિક):' : 'Enter reason for deletion (optional):'
    );
    try {
      await apiFetch(`/api/expenses/${currentExpense.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: (reason || '').trim() })
      });
      alert(t('msg_tx_deleted_success'));
      if (onClose) onClose();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-start sm:items-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Top Header (Pinned) */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {currentExpense.transaction_number}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  currentExpense.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  currentExpense.approval_status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                  currentExpense.approval_status === 'voided' ? 'bg-slate-200 text-slate-700' :
                  'bg-red-100 text-red-800'
                }`}>
                  {t(`as_${currentExpense.approval_status}`)}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 border ${
                  currentExpense.payment_status === 'paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : currentExpense.payment_status === 'partially_paid'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentExpense.payment_status === 'paid' ? 'bg-emerald-600' :
                    currentExpense.payment_status === 'partially_paid' ? 'bg-amber-600' : 'bg-rose-600'
                  }`} />
                  {currentExpense.payment_status === 'paid'
                    ? (lang === 'gu' ? 'ચૂકવેલ' : 'Paid')
                    : currentExpense.payment_status === 'partially_paid'
                    ? (lang === 'gu' ? 'અંશતઃ ચૂકવેલ' : 'Partially Paid')
                    : (lang === 'gu' ? 'બાકી ચૂકવણી' : 'Payment Pending')}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {lang === 'gu' ? currentExpense.category_name_gu : currentExpense.category_name_en}
              </h3>
              <p className="text-xs text-slate-500">
                {formatDate(currentExpense.transaction_date)} • {lang === 'gu' ? 'નોંધનાર:' : 'Entered by:'} {currentExpense.creator_name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Notice (Pinned in Header for immediate visibility) */}
          {notice && (
            <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 font-medium animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Modal Body: Either EDIT FORM or READ-ONLY VIEW */}
          {isEditing ? (
            <form id="edit-expense-form" onSubmit={handleSaveEdit} className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-amber-200 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t('title_edit_expense')}</h4>
                  <p className="text-[11px] text-slate-500">{currentExpense.transaction_number}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {role}
              </span>
            </div>

            {editError && (
              <div className="p-2.5 bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Category */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_category')} *
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                >
                  {catList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'gu' ? c.name_gu : c.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_amount')} (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                />
                {currentExpense.total_paid > 0 && (
                  <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">
                    {lang === 'gu' ? 'પહેલેથી ચૂકવેલ:' : 'Already paid:'} {formatINR(currentExpense.total_paid)}
                  </span>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'gu' ? 'ચૂકવણી પદ્ધતિ (Payment Method)' : 'Payment Method'}
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">{t('pm_cash')}</option>
                  <option value="bank_transfer">{t('pm_bank_transfer')}</option>
                  <option value="card">{t('pm_card')}</option>
                </select>
                {currentExpense.payments?.length > 0 && (
                  <span className="text-[10px] text-blue-600 mt-0.5 block font-semibold">
                    {lang === 'gu' ? 'ચૂકવણી હિસ્ટ્રીમાં પદ્ધતિ પણ બદલાશે' : 'Syncs with payment history'}
                  </span>
                )}
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_vendor')}
                </label>
                <select
                  value={editVendorId}
                  onChange={(e) => setEditVendorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">{t('lbl_no_vendor')}</option>
                  {venList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.phone ? `(${v.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('th_date')} *
                </label>
                <input
                  type="date"
                  value={editTransactionDate}
                  onChange={(e) => setEditTransactionDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_invoice_no')}
                </label>
                <input
                  type="text"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  placeholder="e.g. 4133 / INV-001"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_description')}
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. COT RANI OIL 15 KG NEW TIN"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Notes / Items */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  {t('lbl_notes')} / {lang === 'gu' ? 'વસ્તુઓ અને જથ્થો' : 'Items & Quantities'}
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. 10 TIN COT RANI OIL @ ₹2761.96"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {/* Reason for Modification (Mandatory for audit trail) */}
              <div className="sm:col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-300">
                <label className="block text-amber-950 font-bold mb-1 flex items-center gap-1">
                  <span className="text-red-600">*</span>
                  <span>{t('lbl_edit_reason_required')}</span>
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder={t('ph_edit_reason')}
                  className="w-full p-2.5 rounded-xl border border-amber-400 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-medium"
                  required
                />
              </div>
            </div>

            {/* Edit Mode Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
              >
                {t('btn_cancel_edit')}
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingEdit ? (lang === 'gu' ? 'સાચવી રહ્યું છે...' : 'Saving...') : t('btn_save_changes')}</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Financial Overview Card */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-center">
              <div>
                <span className="text-slate-500 text-[11px] block">{t('lbl_amount')}</span>
                <span className="text-base sm:text-xl font-black text-slate-900">
                  {formatINR(currentExpense.amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">{t('lbl_paid_amount')}</span>
                <span className="text-base sm:text-xl font-bold text-emerald-700">
                  {formatINR(currentExpense.total_paid || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">{t('lbl_balance_due')}</span>
                <span className={`text-base sm:text-xl font-bold ${
                  (currentExpense.balance_due || 0) > 0 ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {formatINR(currentExpense.balance_due || 0)}
                </span>
              </div>
            </div>

            {/* Transaction Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {currentExpense.worker_name ? (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300">
                  <span className="text-amber-900 font-bold block mb-0.5">{lang === 'gu' ? 'કારીગર (Worker)' : 'Worker / Karigar'}</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{currentExpense.worker_name}</span>
                    {currentExpense.worker_phone && <span className="text-slate-500 font-normal">({currentExpense.worker_phone})</span>}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">{t('lbl_vendor')}</span>
                  <span className="font-semibold text-slate-800">
                    {currentExpense.vendor_name || '—'} {currentExpense.vendor_phone ? `(${currentExpense.vendor_phone})` : ''}
                  </span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 block mb-0.5">{t('lbl_invoice_no')}</span>
                <span className="font-semibold text-slate-800">
                  {currentExpense.invoice_number || '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 col-span-2">
                <span className="text-slate-400 block mb-0.5">{t('lbl_description')}</span>
                <span className="text-slate-800">
                  {currentExpense.description || '—'}
                </span>
              </div>
              {currentExpense.notes && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 col-span-2">
                  <span className="text-slate-400 block mb-0.5">{t('lbl_notes')}</span>
                  <span className="text-slate-800 whitespace-pre-wrap">{currentExpense.notes}</span>
                </div>
              )}
              {currentExpense.void_reason && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 col-span-2 text-slate-800">
                  <span className="font-bold text-slate-600 block">Void Reason:</span>
                  <span>{currentExpense.void_reason} (by {currentExpense.voider_name})</span>
                </div>
              )}
              {currentExpense.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 col-span-2 text-red-800">
                  <span className="font-bold text-red-600 block">Rejection Reason:</span>
                  <span>{currentExpense.rejection_reason} (by {currentExpense.rejector_name})</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Attachments Section */}
        {currentExpense.attachments && currentExpense.attachments.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>{lang === 'gu' ? 'જોડાયેલ બિલ / રસીદ' : 'Attached Receipts'} ({currentExpense.attachments.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentExpense.attachments.map((att) => {
                const token = localStorage.getItem('js_token');
                const downloadUrl = `/api/expenses/attachments/${att.id}/download?token=${token}`;
                const isImage = att.content_type.startsWith('image/');
                return (
                  <div key={att.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 group hover:border-amber-300 transition">
                    {isImage ? (
                      <div
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-zoom-in bg-slate-200"
                        onClick={() => {
                          setLightboxUrl(downloadUrl);
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                      >
                        <img
                          src={downloadUrl}
                          alt="Receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                    )}
                    <div className="text-xs flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate" title={att.original_filename}>
                        {att.original_filename}
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        {(att.file_size_bytes / 1024).toFixed(1)} KB
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {isImage && (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxUrl(downloadUrl);
                              setZoomLevel(1);
                              setRotation(0);
                            }}
                            className="text-amber-800 hover:text-amber-900 font-bold text-[11px] inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition"
                          >
                            <ZoomIn className="w-3 h-3" />
                            <span>{lang === 'gu' ? 'જુઓ' : 'Preview'}</span>
                          </button>
                        )}
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-600 hover:text-slate-900 font-bold text-[11px] inline-flex items-center gap-1 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>{lang === 'gu' ? 'ડાઉનલોડ' : 'Download'}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Installments Section */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment History ({currentExpense.payments?.length || 0})
            </h4>
          </div>

          {paymentActionError && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{paymentActionError}</span>
            </div>
          )}

          {currentExpense.payments && currentExpense.payments.length > 0 ? (
            <div className="space-y-2">
              {currentExpense.payments.map((p) => {
                const isItemEditing = editingPaymentId === p.id;
                if (isItemEditing) {
                  return (
                    <div key={p.id} className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3 animate-fade-in text-xs shadow-sm">
                      <div className="flex items-center justify-between font-bold text-amber-950 pb-1.5 border-b border-amber-200/70">
                        <span className="flex items-center gap-1.5">
                          <Edit className="w-3.5 h-3.5 text-amber-700" />
                          {lang === 'gu' ? 'ચૂકવણી સુધારો (Edit Payment)' : 'Edit Payment Details'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {p.id.slice(0, 10)}...</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">
                            {t('lbl_amount')} (₹) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editPayAmount}
                            onChange={(e) => setEditPayAmount(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">
                            {lang === 'gu' ? 'ચૂકવણી પદ્ધતિ' : 'Payment Method'} *
                          </label>
                          <select
                            value={editPayMethod}
                            onChange={(e) => setEditPayMethod(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                            <option value="cash">{t('pm_cash')}</option>
                            <option value="bank_transfer">{t('pm_bank_transfer')}</option>
                            <option value="card">{t('pm_card')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">
                            {lang === 'gu' ? 'ચૂકવણી તારીખ' : 'Payment Date'} *
                          </label>
                          <input
                            type="date"
                            value={editPayDate}
                            onChange={(e) => setEditPayDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/50">
                        <button
                          type="button"
                          onClick={handleCancelEditPayment}
                          disabled={savingPaymentAction}
                          className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                        >
                          {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePayment(p.id)}
                          disabled={savingPaymentAction}
                          className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{savingPaymentAction ? 'Saving...' : (lang === 'gu' ? 'સાચવો' : 'Save')}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                const methodBadgeColor = p.payment_method === 'upi'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : p.payment_method === 'cash'
                  ? 'bg-slate-100 text-slate-800 border-slate-200'
                  : p.payment_method === 'bank_transfer'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200';

                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs hover:border-slate-300 transition">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{formatINR(p.amount)}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${methodBadgeColor}`}>
                            {p.payment_method === 'upi' ? 'UPI' : p.payment_method}
                          </span>
                        </div>
                        {p.reference_number && (
                          <span className="text-[11px] text-slate-400 mt-0.5">Ref: {p.reference_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-[11px] text-slate-500">
                        <div className="font-medium text-slate-700">{formatDate(p.payment_date)}</div>
                        <div className="text-[10px] text-slate-400">By: {p.recorded_by_name}</div>
                      </div>
                      {isOwnerOrManager && currentExpense.approval_status !== 'voided' && (
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleStartEditPayment(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title={lang === 'gu' ? 'ચૂકવણી સુધારો (Edit Payment Method / Amount)' : 'Edit Payment Method / Amount'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id, p.amount, p.payment_method)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title={lang === 'gu' ? 'ચૂકવણી રદ કરો (Delete Payment)' : 'Delete Payment'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No payments recorded yet.</div>
          )}

          {/* Add Installment Form (if balance due > 0 and not voided and not currently editing) */}
          {!isEditing && (currentExpense.balance_due || 0) > 0 && currentExpense.approval_status !== 'voided' && currentExpense.approval_status !== 'rejected' && (
            <form onSubmit={handleAddPayment} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-950">
                    {t('btn_add_payment')} (Remaining: {formatINR(currentExpense.balance_due)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const bal = currentExpense.balance_due || 0;
                      setPaymentAmount(bal.toString());
                    }}
                    className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm transition flex items-center gap-1"
                    title={lang === 'gu' ? 'બાકી પૂરી રકમ આપોઆપ ભરો' : 'Auto-fill full remaining balance'}
                  >
                    <span>{lang === 'gu' ? 'ચૂકતે કરો (Full Pay)' : 'Full Pay'}</span>
                  </button>
                </div>
              </div>

              {paymentError && (
                <div className="text-xs text-red-600 font-semibold">{paymentError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t('lbl_amount')} (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={currentExpense.balance_due}
                    required
                    placeholder="Amount (₹)"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t('lbl_payment_method')} *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="cash">{t('pm_cash')}</option>
                    <option value="upi">UPI (GPay / PhonePe)</option>
                    <option value="bank_transfer">{t('pm_bank_transfer')}</option>
                    <option value="card">{t('pm_card')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {lang === 'gu' ? 'ચૂકવણી તારીખ (Date)' : 'Payment Date'} *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingPayment}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                {submittingPayment ? 'Recording...' : t('btn_add_payment')}
              </button>
            </form>
          )}
        </div>

        {/* Audit Trail Section */}
        {currentExpense.audit_logs && currentExpense.audit_logs.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Audit Trail ({currentExpense.audit_logs.length})</span>
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {currentExpense.audit_logs.map((log) => (
                <div key={log.id} className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-200/50 flex justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 capitalize">{log.action.replace('_', ' ')}</span> by {log.actor_name}
                    {log.reason && <span className="text-slate-500 italic block">{log.reason}</span>}
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        {/* Modal Actions Footer (Pinned) */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          {isEditing ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
              >
                {t('btn_cancel_edit')}
              </button>
              <button
                type="submit"
                form="edit-expense-form"
                disabled={savingEdit}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingEdit ? (lang === 'gu' ? 'સાચવી રહ્યું છે...' : 'Saving...') : t('btn_save_changes')}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                    title={t('btn_edit_expense')}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{t('btn_edit_expense')}</span>
                  </button>
                )}

                {isOwnerOrManager && currentExpense.approval_status === 'pending_approval' && (
                  <>
                    <button
                      onClick={handleApprove}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      {t('btn_approve')}
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition"
                    >
                      {t('btn_reject')}
                    </button>
                  </>
                )}

                {isOwnerOrManager && currentExpense.approval_status === 'approved' && (
                  <button
                    onClick={handleVoid}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    {t('btn_void')}
                  </button>
                )}

                {isOwnerOrManager && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-red-200"
                    title={lang === 'gu' ? 'આ વ્યવહાર કાઢી નાખો' : 'Delete this transaction'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('btn_delete_entry')}</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Lightbox Fullscreen Viewer */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col animate-fade-in">
          {/* Top Lightbox Toolbar */}
          <div className="p-3 px-4 flex items-center justify-between text-white border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                {currentExpense.transaction_number ? `Receipt — ${currentExpense.transaction_number}` : 'Receipt Viewer'}
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Reset Zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <a
                href={lightboxUrl}
                download="receipt.jpg"
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition ml-2"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition ml-2"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={lightboxUrl}
              alt="Receipt Fullscreen"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-h-[88vh] max-w-[92vw] object-contain shadow-2xl rounded select-none cursor-grab active:cursor-grabbing"
            />
          </div>

          {/* Bottom Zoom Indicator */}
          <div className="p-2 text-center text-xs text-white/50 border-t border-white/10">
            {Math.round(zoomLevel * 100)}% zoom • Click and drag or use toolbar controls
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseDetailsModal;
