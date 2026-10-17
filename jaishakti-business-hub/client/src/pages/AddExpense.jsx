import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  Coffee,
  Truck,
  Zap,
  Home,
  Wrench,
  Sparkles,
  Megaphone,
  Phone,
  CreditCard,
  MoreHorizontal,
  ShoppingBag,
  Package,
  Boxes,
  Navigation,
  Users,
  HandCoins,
  Clock,
  HeartHandshake,
  Hammer,
  Receipt,
  Wallet,
  ArrowRightLeft,
  FileText,
  Tag,
  Carrot,
  Store,
  Check,
  CheckCircle,
  Plus,
  ArrowRight,
  Upload,
  AlertCircle,
  Mic,
  Maximize2,
  Minimize2,
  Search,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

const ICON_MAP = {
  Coffee,
  Truck,
  Carrot,
  Package,
  Boxes,
  Store,
  HandCoins,
  Sparkles,
  Wrench,
  Zap,
  ShoppingBag,
  Home,
  Megaphone,
  Phone,
  CreditCard,
  MoreHorizontal,
  Navigation,
  Users,
  Clock,
  HeartHandshake,
  Hammer,
  Receipt,
  Wallet,
  ArrowRightLeft,
  FileText,
  Tag
};

export const APPROVED_CATEGORY_CODES = [
  'tea_refreshment',
  'transport_delivery',
  'vegetable_purchase',
  'raw_materials',
  'packaging_materials',
  'finished_goods',
  'worker_advance_upad',
  'cleaning_supplies',
  'repairs_maintenance',
  'electricity_utilities'
];

function SearchableCategoryDropdown({ categories, categoryId, onSelect, lang, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedCategory = categories.find(c => c.id === categoryId) || categories[0];
  const SelectedIcon = selectedCategory ? (ICON_MAP[selectedCategory.icon] || Tag) : Tag;

  const filteredCategories = categories.filter(cat => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (cat.name_en && cat.name_en.toLowerCase().includes(q)) ||
      (cat.name_gu && cat.name_gu.toLowerCase().includes(q)) ||
      (cat.code && cat.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1. Only ONE item visible: Logo and Title in the same line */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl shadow-xs transition text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-[0.99] ${
          isOpen ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-300 hover:border-amber-400'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-slate-900 truncate">
              {selectedCategory ? (lang === 'gu' ? selectedCategory.name_gu : selectedCategory.name_en) : t('lbl_category')}
            </span>
            {selectedCategory && (
              <span className="text-xs text-slate-400 font-medium truncate hidden sm:inline">
                ({lang === 'gu' ? selectedCategory.name_en : selectedCategory.name_gu})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 pl-2 shrink-0">
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200/60 hidden xs:inline">
            {lang === 'gu' ? 'બદલો' : 'Change'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* 2. Expanded Searchable Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={lang === 'gu' ? 'કેટેગરી શોધો (ચા, તેલ, શાકભાજી...)' : 'Search category (tea, oil, vegetable...)'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Vertical Scroll Option List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon] || Tag;
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelect(cat.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'hover:bg-amber-50 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-amber-700'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold">{lang === 'gu' ? cat.name_gu : cat.name_en}</span>
                        <span className={`text-[11px] ml-2 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          ({lang === 'gu' ? cat.name_en : cat.name_gu})
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0 ml-1.5 text-white" />}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                {lang === 'gu' ? 'કોઈ કેટેગરી મળી નથી' : 'No matching category'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddExpense({ onSaved, initialValues = null, onOpenVoice }) {
  const { lang, t, formatINR } = useLanguage();
  const { user } = useAuth();

  const [mode, setMode] = useState('quick'); // 'quick' | 'detailed'
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paidAmount, setPaidAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Add Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, venRes] = await Promise.all([
          apiFetch('/api/categories'),
          apiFetch('/api/vendors')
        ]);
        if (catRes.categories) {
          const approved = catRes.categories.filter(c => APPROVED_CATEGORY_CODES.includes(c.code));
          setCategories(approved);
          // Pre-select first category if none selected
          if (approved.length > 0 && !categoryId) {
            setCategoryId(approved[0].id);
          }
        }
        if (venRes.vendors) setVendors(venRes.vendors);
      } catch (e) {
        console.error('Failed to load form prerequisites:', e);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Sync initial values if passed from voice modal
  useEffect(() => {
    if (initialValues) {
      if (initialValues.category_id) setCategoryId(initialValues.category_id);
      if (initialValues.amount) setAmount(String(initialValues.amount));
      if (initialValues.payment_method) setPaymentMethod(initialValues.payment_method);
      if (initialValues.transaction_date) setTransactionDate(initialValues.transaction_date);
      if (initialValues.vendor_id) setVendorId(initialValues.vendor_id);
      if (initialValues.description) setDescription(initialValues.description);
    }
  }, [initialValues]);

  // Handle Quick Add Vendor
  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    try {
      const res = await apiFetch('/api/vendors', {
        method: 'POST',
        body: JSON.stringify({ name: newVendorName.trim(), phone: newVendorPhone.trim() })
      });
      if (res.vendor) {
        setVendors(prev => [...prev, res.vendor]);
        setVendorId(res.vendor.id);
        setShowVendorModal(false);
        setNewVendorName('');
        setNewVendorPhone('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessResult(null);

    // Validation
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setErrorMessage(lang === 'gu' ? 'કૃપા કરીને સાચી રકમ લખો (૦ થી વધુ).' : 'Please enter a valid positive amount.');
      return;
    }

    if (!categoryId) {
      setErrorMessage(lang === 'gu' ? 'કૃપા કરીને કેટેગરી પસંદ કરો.' : 'Please select an expense category.');
      return;
    }

    setSubmitting(true);

    try {
      let res;
      if (receiptFile) {
        // Send multipart form-data
        const formData = new FormData();
        formData.append('category_id', categoryId);
        formData.append('amount', amount);
        formData.append('payment_method', paymentMethod);
        formData.append('payment_status', paymentStatus);
        if (paymentStatus === 'partially_paid') formData.append('paid_amount', paidAmount);
        formData.append('transaction_date', transactionDate);
        if (vendorId) formData.append('vendor_id', vendorId);
        if (description) formData.append('description', description);
        if (invoiceNumber) formData.append('invoice_number', invoiceNumber);
        if (referenceNumber) formData.append('reference_number', referenceNumber);
        if (notes) formData.append('notes', notes);
        formData.append('receipt', receiptFile);

        res = await apiFetch('/api/expenses', {
          method: 'POST',
          body: formData
        });
      } else {
        // Send JSON
        res = await apiFetch('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            category_id: categoryId,
            amount: num,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            paid_amount: paymentStatus === 'partially_paid' ? parseFloat(paidAmount) : undefined,
            transaction_date: transactionDate,
            vendor_id: vendorId || null,
            description: description || null,
            invoice_number: invoiceNumber || null,
            reference_number: referenceNumber || null,
            notes: notes || null
          })
        });
      }

      setSuccessResult(res.expense);

      // Offer immediate "Add Another" while keeping category for rapid repetition
      setAmount('');
      setDescription('');
      setInvoiceNumber('');
      setReferenceNumber('');
      setReceiptFile(null);
      setPaidAmount('');
      setPaymentStatus('paid');

      if (onSaved) onSaved(res.expense);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {mode === 'quick' ? t('btn_quick_entry') : t('btn_detailed_entry')}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'quick'
              ? (lang === 'gu' ? 'માત્ર ૧-ક્લિકમાં કેટેગરી અને રકમ સેવ કરો' : 'Tap category, enter amount, and save in 1 step')
              : (lang === 'gu' ? 'બિલ ફોટો, વેપારી, UTR અને વિગતો સાથે' : 'Add bill receipt, vendor, UTR, and notes')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice button */}
          <button
            type="button"
            onClick={onOpenVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition"
          >
            <Mic className="w-4 h-4 text-amber-600" />
            <span>{t('btn_voice_entry')}</span>
          </button>

          {/* Mode switch */}
          <button
            type="button"
            onClick={() => setMode(mode === 'quick' ? 'detailed' : 'quick')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            {mode === 'quick' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{t('btn_detailed_entry')}</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{t('btn_quick_entry')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-emerald-900 text-sm">
                {t('msg_saved_success')}
              </div>
              <div className="text-xs text-emerald-700">
                {successResult.transaction_number} • {formatINR(successResult.amount)} •{' '}
                <span className="capitalize font-semibold">{t(`as_${successResult.approval_status}`)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccessResult(null)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition self-end sm:self-auto"
          >
            {t('btn_add_another')}
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unified Primary Expense Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          {/* 1. Title / Note of Expense */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              {t('lbl_expense_title')}
            </label>
            <input
              type="text"
              placeholder={t('lbl_expense_title_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white placeholder:text-slate-400 transition"
              autoFocus
            />
          </div>

          {/* 2. Category of Expense (Compact single line when closed, clickable with search & vertical scroll) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>{t('lbl_category')}</span>
              <span className="text-amber-500">*</span>
            </label>

            <SearchableCategoryDropdown
              categories={categories.filter(c => APPROVED_CATEGORY_CODES.includes(c.code))}
              categoryId={categoryId}
              onSelect={(id) => setCategoryId(id)}
              lang={lang}
              t={t}
            />
          </div>

          {/* 3. Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('lbl_amount')} *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-lg font-black text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* 4. Payment Method */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('lbl_payment_method')} *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'cash', label: t('pm_cash') },
                { id: 'upi', label: 'UPI (GPay)' },
                { id: 'bank_transfer', label: 'Bank' },
                { id: 'credit', label: t('pm_credit') },
                { id: 'card', label: t('pm_card') },
                { id: 'other', label: t('pm_other') }
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(pm.id);
                    if (pm.id === 'credit') setPaymentStatus('unpaid');
                    else setPaymentStatus('paid');
                  }}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center transition ${
                    paymentMethod === pm.id
                      ? 'border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Additional Detailed Fields (Only in Detailed Mode) */}
        {mode === 'detailed' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              {lang === 'gu' ? 'વધારાની વિગતો' : 'Additional Details'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_date')}
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_payment_status')}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="paid">{t('ps_paid')}</option>
                  <option value="partially_paid">{t('ps_partially_paid')}</option>
                  <option value="unpaid">{t('ps_unpaid')}</option>
                </select>
              </div>

              {/* Paid Amount if Partially Paid */}
              {paymentStatus === 'partially_paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('lbl_paid_amount')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}

              {/* Vendor Selector + Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t('lbl_vendor')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVendorModal(true)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'gu' ? 'નવા વેપારી ઉમેરો' : 'Add New'}</span>
                  </button>
                </div>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">{t('lbl_select_vendor')}</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.phone ? `(${v.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_invoice_no')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-9842"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* UTR / Reference Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_reference_no')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI 4291823901"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Receipt Attachment Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('lbl_receipt_attachment')}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>{receiptFile ? receiptFile.name : (lang === 'gu' ? 'ફોટો / ફાઈલ પસંદ કરો' : 'Choose file')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {receiptFile && (
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Max 10MB • Private storage
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('lbl_notes')}
              </label>
              <textarea
                rows="2"
                placeholder="Internal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        )}

        {/* Submit Button Area */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <span>{submitting ? t('btn_saving') : t('btn_save_expense')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Quick Add Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">
              {lang === 'gu' ? 'નવા વેપારી / સપ્લાયર ઉમેરો' : 'Add New Vendor / Supplier'}
            </h3>
            <form onSubmit={handleCreateVendor} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'વેપારીનું નામ' : 'Vendor Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhe Oil Traders"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {lang === 'gu' ? 'ફોન નંબર' : 'Phone'}
                </label>
                <input
                  type="text"
                  placeholder="98250..."
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg shadow-sm"
                >
                  {t('btn_confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddExpense;
