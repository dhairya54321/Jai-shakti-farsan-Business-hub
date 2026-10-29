import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import { VENDOR_CATEGORIES, PAYMENT_TERMS_OPTIONS, BUSINESS_TYPES } from '../constants/vendorConstants.js';
import BillDetailModal from './BillDetailModal';
import ExpenseDetailsModal from './ExpenseDetailsModal';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  Download,
  Receipt,
  Calendar,
  DollarSign,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

const DEFAULT_FORM_VALUES = {
  name: '',
  category: 'raw_materials',
  phone: '',
  alternate_phone: '',
  email: '',
  contact_person: '',
  address: '',
  city: '',
  state: 'Gujarat',
  pin_code: '',
  gstin: '',
  pan: '',
  business_type: 'wholesaler',
  payment_terms: 'immediate',
  credit_limit: '',
  notes: '',
  is_active: 1
};

export function VendorDetailModal({ isOpen, vendorId, onClose, onVendorUpdated }) {
  const { lang, t, formatINR, formatDate } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);

  // Form edit state & baseline for dirty tracking
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES);
  const [baselineValues, setBaselineValues] = useState(DEFAULT_FORM_VALUES);
  const [isDirty, setIsDirty] = useState(false);

  // Active tab in Related Records: 'bills' | 'expenses'
  const [relatedTab, setRelatedTab] = useState('bills');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Unsaved changes confirmation dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Selected Bill & Expense for Details Modals
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  const handleOpenExpense = async (expenseId) => {
    setLoadingExpense(true);
    try {
      const res = await apiFetch(`/api/expenses/${expenseId}`);
      if (res.expense) {
        setSelectedExpense(res.expense);
      }
    } catch (err) {
      alert(err.message || 'Failed to load expense details');
    } finally {
      setLoadingExpense(false);
    }
  };

  useEffect(() => {
    if (isOpen && vendorId) {
      loadVendorProfile();
    }
  }, [isOpen, vendorId]);

  const loadVendorProfile = async () => {
    setLoading(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await apiFetch(`/api/vendors/${vendorId}`);
      if (res.vendor) {
        setVendorData(res.vendor);
        const uniqueBills = Array.from(new Map((res.bills || []).map(b => [b.id, b])).values());
        setBills(uniqueBills);
        setExpenses(res.expenses || []);
        setSummary(res.summary || null);

        const initial = {
          name: res.vendor.name || '',
          category: res.vendor.category || 'raw_materials',
          phone: res.vendor.phone || '',
          alternate_phone: res.vendor.alternate_phone || '',
          email: res.vendor.email || '',
          contact_person: res.vendor.contact_person || '',
          address: res.vendor.address || '',
          city: res.vendor.city || '',
          state: res.vendor.state || 'Gujarat',
          pin_code: res.vendor.pin_code || '',
          gstin: res.vendor.gstin || res.vendor.tax_identifier || '',
          pan: res.vendor.pan || '',
          business_type: res.vendor.business_type || 'wholesaler',
          payment_terms: res.vendor.payment_terms || 'immediate',
          credit_limit: res.vendor.credit_limit !== null && res.vendor.credit_limit !== undefined ? String(res.vendor.credit_limit) : '',
          notes: res.vendor.notes || '',
          is_active: res.vendor.is_active !== undefined ? res.vendor.is_active : 1
        };

        setFormValues(initial);
        setBaselineValues(initial);
        setIsDirty(false);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to load vendor details.');
    } finally {
      setLoading(false);
    }
  };

  // Check dirty state whenever formValues changes
  const checkDirty = (newValues) => {
    let dirty = false;
    for (const key of Object.keys(baselineValues)) {
      if (String(newValues[key] ?? '') !== String(baselineValues[key] ?? '')) {
        dirty = true;
        break;
      }
    }
    setIsDirty(dirty);
    if (dirty) {
      setSaveSuccess(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setFormValues(prev => {
      const updated = { ...prev, [key]: value };
      checkDirty(updated);
      return updated;
    });
  };

  // Auto-extract PAN from GSTIN if 15 chars
  const handleGstinChange = (value) => {
    const upper = value.toUpperCase().trim();
    let panVal = formValues.pan;
    if (upper.length >= 12 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(upper)) {
      panVal = upper.substring(2, 12);
    }
    setFormValues(prev => {
      const updated = { ...prev, gstin: upper, pan: panVal };
      checkDirty(updated);
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    if (!isDirty || saving) return;

    if (!formValues.name.trim()) {
      setSaveError(lang === 'gu' ? 'વેપારીનું નામ જરૂરી છે.' : 'Vendor name is required.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await apiFetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        body: JSON.stringify(formValues)
      });

      if (res.vendor) {
        setVendorData(res.vendor);
        setBaselineValues(formValues);
        setIsDirty(false);
        setSaveSuccess(true);
        if (onVendorUpdated) {
          onVendorUpdated(res.vendor);
        }
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setIsDirty(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5" />
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {formValues.name || (lang === 'gu' ? 'વેપારી વિગત' : 'Vendor Profile')}
              </h2>
              <span className="text-[11px] text-amber-100">
                {formValues.category
                  ? (VENDOR_CATEGORIES.find(c => c.id === formValues.category)?.[lang] || formValues.category)
                  : ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-amber-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-xs font-medium">Loading vendor profile...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Top Financial Overview Cards (Reconciled & Labeled) */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                    {lang === 'gu' ? 'બિલ કુલ રકમ (Phase 2)' : 'Bills Recorded (Phase 2)'}
                  </div>
                  <div className="text-base font-black text-amber-950 mt-0.5">
                    {formatINR(summary.totalBilled)}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    {summary.billsCount} {lang === 'gu' ? 'બિલ અપલોડ થયેલ' : 'bills attached'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    {lang === 'gu' ? 'દૈનિક ખર્ચ હિસાબ (Phase 1)' : 'Daily Expenses (Phase 1)'}
                  </div>
                  <div className="text-base font-black text-emerald-950 mt-0.5">
                    {formatINR(summary.totalExpenses)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    {summary.expensesCount} {lang === 'gu' ? 'ખર્ચ એન્ટ્રી' : 'entries recorded'}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {lang === 'gu' ? 'ક્રેડિટ મર્યાદા' : 'Credit Limit'}
                  </div>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {formValues.credit_limit ? formatINR(formValues.credit_limit) : (lang === 'gu' ? 'મર્યાદા નથી' : 'No Limit')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formValues.payment_terms
                      ? (PAYMENT_TERMS_OPTIONS.find(p => p.id === formValues.payment_terms)?.[lang] || formValues.payment_terms)
                      : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Basic Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{t('sec_basic_info')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_vendor_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_vendor_category')} *
                  </label>
                  <input
                    type="text"
                    list="detail-vendor-category-presets"
                    value={formValues.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    placeholder="e.g. Raw Materials (pulses and rice merchant)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium text-slate-800"
                  />
                  <datalist id="detail-vendor-category-presets">
                    <option value="Raw Materials (pulses and rice merchant)" />
                    <option value="Raw Materials (potatoes)" />
                    <option value="Raw Materials (besan, oil, spices)" />
                    <option value="Finished Goods (khakhra)" />
                    <option value="Finished Goods (sweets)" />
                    <option value="Packaging Materials (boxes and pouches)" />
                    <option value="Gas & Utilities (LPG Cylinders)" />
                    <option value="Dairy Products (milk, mawa, ghee)" />
                    <option value="Vegetables / Produce" />
                    <option value="Transport & Delivery" />
                  </datalist>
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_phone')}
                  </label>
                  <input
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_alt_phone')}
                  </label>
                  <input
                    type="tel"
                    value={formValues.alternate_phone}
                    onChange={(e) => handleFieldChange('alternate_phone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_contact_person')}
                  </label>
                  <input
                    type="text"
                    value={formValues.contact_person}
                    onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_email')}
                  </label>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Tax and Address */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('sec_tax_address')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* GSTIN */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_gstin')}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formValues.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {t('msg_gstin_disclaimer')}
                  </span>
                </div>

                {/* PAN */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_pan')}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formValues.pan}
                    onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase().trim())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_city')}
                  </label>
                  <input
                    type="text"
                    value={formValues.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_state')}
                  </label>
                  <input
                    type="text"
                    value={formValues.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_pin_code')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formValues.pin_code}
                    onChange={(e) => handleFieldChange('pin_code', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Business Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_business_type')}
                  </label>
                  <select
                    value={formValues.business_type}
                    onChange={(e) => handleFieldChange('business_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    {BUSINESS_TYPES.map(b => (
                      <option key={b.id} value={b.id}>
                        {lang === 'gu' ? b.gu : b.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full Address */}
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_address')}
                  </label>
                  <textarea
                    rows={2}
                    value={formValues.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Business Terms */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>{t('sec_business_terms')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Payment Terms */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_payment_terms')}
                  </label>
                  <select
                    value={formValues.payment_terms}
                    onChange={(e) => handleFieldChange('payment_terms', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    {PAYMENT_TERMS_OPTIONS.map(pt => (
                      <option key={pt.id} value={pt.id}>
                        {lang === 'gu' ? pt.gu : pt.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_credit_limit')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formValues.credit_limit}
                    onChange={(e) => handleFieldChange('credit_limit', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                {/* Active Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_status')}
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="radio"
                        name="detail_is_active"
                        checked={formValues.is_active === 1}
                        onChange={() => handleFieldChange('is_active', 1)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{t('status_active')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="radio"
                        name="detail_is_active"
                        checked={formValues.is_active === 0}
                        onChange={() => handleFieldChange('is_active', 0)}
                        className="text-slate-500 focus:ring-slate-400"
                      />
                      <span>{t('status_inactive')}</span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_notes')}
                  </label>
                  <textarea
                    rows={2}
                    value={formValues.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Related Records (Bills & Invoices / Daily Expenses) */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t('sec_related_records')}
                  </span>
                </div>

                {/* Tab switch */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRelatedTab('bills')}
                    className={`px-3 py-1 rounded-lg transition ${
                      relatedTab === 'bills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t('tab_bills')} ({bills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelatedTab('expenses')}
                    className={`px-3 py-1 rounded-lg transition ${
                      relatedTab === 'expenses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t('tab_expenses')} ({expenses.length})
                  </button>
                </div>
              </div>

              {/* Bills Tab Content */}
              {relatedTab === 'bills' && (
                <div className="space-y-2">
                  {bills.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      {lang === 'gu'
                        ? 'આ વેપારી માટે હજુ કોઈ બિલ અપલોડ થયેલ નથી.'
                        : 'No bills or invoices uploaded for this vendor yet.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">{t('lbl_invoice_no')}</th>
                            <th className="px-3 py-2">{t('lbl_invoice_date')}</th>
                            <th className="px-3 py-2">{t('lbl_amount')}</th>
                            <th className="px-3 py-2">{t('lbl_payment_status')}</th>
                            <th className="px-3 py-2 text-right">{lang === 'gu' ? 'કાર્યવાહી' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {bills.map((b) => {
                            const token = localStorage.getItem('js_token') || '';
                            const downloadUrl = b.attachment_id
                              ? `/api/vendors/bills/attachments/${b.attachment_id}/download?token=${token}`
                              : null;
                            return (
                              <tr
                                key={b.id}
                                onClick={() => setSelectedBill(b)}
                                className="hover:bg-amber-50/60 cursor-pointer transition group"
                                title={lang === 'gu' ? 'બિલ અને વિગતવાર ઇનવોઇસ જોવા માટે ક્લિક કરો' : 'Click to view bill and detailed invoice'}
                              >
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-900 group-hover:text-amber-800">
                                  <div className="flex items-center gap-1.5">
                                    <span>{b.bill_number || '—'}</span>
                                    {b.expense_id && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Linked to Daily Expense" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {formatDate(b.bill_date)}
                                </td>
                                <td className="px-3 py-2.5 font-black text-slate-900">
                                  {formatINR(b.total_amount)}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    b.payment_status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : b.payment_status === 'partially_paid'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {b.payment_status}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBill(b)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition"
                                      title={lang === 'gu' ? 'બિલ અને ઇનવોઇસ વિગત જુઓ' : 'View Bill & Invoice Details'}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>{t('btn_view_details') || 'View'}</span>
                                    </button>

                                    {downloadUrl && (
                                      <a
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                        title={lang === 'gu' ? 'બિલ ડાઉનલોડ કરો' : 'Download bill attachment'}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Expenses Tab Content */}
              {relatedTab === 'expenses' && (
                <div className="space-y-2">
                  {expenses.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      {lang === 'gu'
                        ? 'દૈનિક ખર્ચ મોડ્યુલમાં આ વેપારી માટે કોઈ ખર્ચ નોંધાયેલ નથી.'
                        : 'No daily expenses linked to this vendor.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">{t('th_tx_no')}</th>
                            <th className="px-3 py-2">{t('th_date')}</th>
                            <th className="px-3 py-2">{t('th_category')}</th>
                            <th className="px-3 py-2">{t('th_amount')}</th>
                            <th className="px-3 py-2">{t('th_status')}</th>
                            <th className="px-3 py-2 text-right">{lang === 'gu' ? 'કાર્યવાહી' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {expenses.map((e) => (
                            <tr
                              key={e.id}
                              onClick={() => handleOpenExpense(e.id)}
                              className="hover:bg-amber-50/60 cursor-pointer transition group"
                              title={lang === 'gu' ? 'દૈનિક ખર્ચ વ્યવહાર વિગત જોવા માટે ક્લિક કરો' : 'Click to view daily expense details'}
                            >
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-900 group-hover:text-amber-800">
                                {e.transaction_number}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {formatDate(e.transaction_date)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {lang === 'gu' ? e.category_name_gu : e.category_name_en}
                              </td>
                              <td className="px-3 py-2.5 font-black text-slate-900">
                                {formatINR(e.amount)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.payment_status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {e.payment_status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="flex items-center justify-end" onClick={(ev) => ev.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenExpense(e.id)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition"
                                    title={lang === 'gu' ? 'વ્યવહાર વિગત જુઓ' : 'View Transaction Details'}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{t('btn_view_details') || 'View'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer / Save Panel */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{t('msg_saved')}</span>
              </div>
            )}
            {isDirty && !saveSuccess && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Unsaved edits detected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              {t('btn_cancel')}
            </button>

            {/* Save Changes button ONLY enabled when form is dirty! */}
            {isDirty && (
              <button
                type="button"
                disabled={saving || !isDirty}
                onClick={handleSaveChanges}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('btn_saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('btn_save_changes')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discard Unsaved Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-700">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'gu' ? 'ફેરફારો સેવ કર્યા નથી' : 'Unsaved Changes'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {t('msg_unsaved_warning')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {lang === 'gu' ? 'ચાલુ રાખો' : 'Keep Editing'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                {lang === 'gu' ? 'રદ કરો (Discard)' : 'Discard Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill & Invoice Details Modal with Actual Bill Viewer */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          vendor={vendorData}
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          onOpenExpense={(expenseId) => {
            setSelectedBill(null);
            handleOpenExpense(expenseId);
          }}
          onBillUpdated={() => {
            loadVendorProfile();
            if (onVendorUpdated) onVendorUpdated();
          }}
        />
      )}

      {/* Daily Expense Details Modal */}
      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          categories={[]}
          vendors={vendorData ? [vendorData] : []}
          onClose={() => setSelectedExpense(null)}
          onRefresh={() => {
            loadVendorProfile();
            handleOpenExpense(selectedExpense.id);
            if (onVendorUpdated) onVendorUpdated();
          }}
        />
      )}
    </div>
  );
}

export default VendorDetailModal;
