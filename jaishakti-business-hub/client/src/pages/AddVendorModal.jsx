import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  User,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const VENDOR_CATEGORIES = [
  { id: 'raw_materials', en: 'Raw Materials', gu: 'કાચો માલ' },
  { id: 'packaging_materials', en: 'Packaging Materials', gu: 'પેકિંગ મટીરીયલ' },
  { id: 'finished_goods', en: 'Finished Goods', gu: 'તૈયાર માલ' },
  { id: 'vegetable_purchase', en: 'Vegetables / Produce', gu: 'શાકભાજી' },
  { id: 'dairy_products', en: 'Dairy Products', gu: 'ડેરી પ્રોડક્ટ્સ' },
  { id: 'gas_utilities', en: 'Gas & Utilities', gu: 'ગેસ અને વીજળી' },
  { id: 'equipment_repairs', en: 'Machinery & Equipment Repairs', gu: 'મશીનરી અને સમારકામ' },
  { id: 'transport_logistics', en: 'Transport & Delivery', gu: 'ટ્રાન્સપોર્ટ અને ડિલિવરી' },
  { id: 'cleaning_supplies', en: 'Cleaning & Hygiene Supplies', gu: 'સફાઈ અને સામાન' },
  { id: 'other', en: 'Other Services / Supplies', gu: 'અન્ય સેવા / સામાન' }
];

export const PAYMENT_TERMS_OPTIONS = [
  { id: 'immediate', en: 'Immediate / Cash on Delivery', gu: 'તરત / રોકડ (COD)' },
  { id: '7_days', en: '7 Days Credit', gu: '૭ દિવસ ઉધાર' },
  { id: '15_days', en: '15 Days Credit', gu: '૧૫ દિવસ ઉધાર' },
  { id: '30_days', en: '30 Days Credit', gu: '૩૦ દિવસ ઉધાર' },
  { id: 'credit', en: 'Monthly Credit (ખાતું)', gu: 'માસિક ખાતું (Credit)' }
];

export const BUSINESS_TYPES = [
  { id: 'wholesaler', en: 'Wholesaler / Trader', gu: 'જથ્થાબંધ વેપારી' },
  { id: 'manufacturer', en: 'Manufacturer / Mill', gu: 'ઉત્પાદક / મિલ' },
  { id: 'retailer', en: 'Retailer / Shop', gu: 'છૂટક વેપારી' },
  { id: 'service_provider', en: 'Service Provider / Contractor', gu: 'સર્વિસ પ્રોવાઇડર' }
];

export function AddVendorModal({ isOpen, onClose, onVendorCreated, onSelectExisting, initialData = null }) {
  const { lang, t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    category: 'raw_materials',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pin_code: '',
    gstin: '',
    pan: '',
    contact_person: '',
    business_type: 'wholesaler',
    payment_terms: 'immediate',
    credit_limit: '',
    notes: '',
    is_active: 1
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateModal, setDuplicateModal] = useState({
    open: false,
    duplicates: []
  });

  // Populate initial values (e.g. from OCR or parent caller)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.vendorName || initialData.name || '',
        category: initialData.category || 'raw_materials',
        phone: initialData.phone || '',
        alternate_phone: initialData.alternatePhone || initialData.alternate_phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || 'Gujarat',
        pin_code: initialData.pinCode || initialData.pin_code || '',
        gstin: initialData.gstin || '',
        pan: initialData.pan || '',
        contact_person: initialData.contact_person || '',
        payment_terms: initialData.payment_terms || 'immediate',
        credit_limit: initialData.credit_limit || '',
        notes: initialData.notes || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : 1
      }));
    } else {
      setFormData({
        name: '',
        category: 'raw_materials',
        phone: '',
        alternate_phone: '',
        email: '',
        address: '',
        city: '',
        state: 'Gujarat',
        pin_code: '',
        gstin: '',
        pan: '',
        contact_person: '',
        business_type: 'wholesaler',
        payment_terms: 'immediate',
        credit_limit: '',
        notes: '',
        is_active: 1
      });
    }
    setError('');
    setFieldErrors({});
    setDuplicateModal({ open: false, duplicates: [] });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Auto-extract PAN from 15-char GSTIN if user typed GSTIN
  const handleGstinChange = (val) => {
    const upper = val.toUpperCase().trim();
    let panVal = formData.pan;
    if (upper.length >= 12 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(upper)) {
      panVal = upper.substring(2, 12);
    }
    setFormData(prev => ({
      ...prev,
      gstin: upper,
      pan: panVal
    }));
  };

  // Client-side quick validation
  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = lang === 'gu' ? 'વેપારીનું નામ જરૂરી છે.' : 'Vendor name is required.';
    if (!formData.category.trim()) errs.category = lang === 'gu' ? 'કેટેગરી પસંદ કરો.' : 'Category is required.';

    if (formData.phone) {
      const clean = formData.phone.replace(/[^0-9]/g, '');
      if (clean.length < 10) {
        errs.phone = lang === 'gu' ? '૧૦ અંકનો માન્ય ફોન નંબર દાખલ કરો.' : 'Enter a valid 10-digit mobile number.';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = lang === 'gu' ? 'માન્ય ઈમેઈલ એડ્રેસ લખો.' : 'Enter a valid email address.';
    }

    if (formData.pin_code && !/^[1-9][0-9]{5}$/.test(formData.pin_code.trim())) {
      errs.pin_code = lang === 'gu' ? '૬ અંકનો માન્ય પીન કોડ લખો.' : 'Enter a valid 6-digit PIN code.';
    }

    if (formData.gstin) {
      const gstinClean = formData.gstin.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstinClean)) {
        errs.gstin = lang === 'gu'
          ? 'જીએસટી ફોર્મેટ ૧૫ અક્ષર હોવું જોઈએ (દા.ત. 24AAAAA0000A1Z5).'
          : 'GSTIN format must be 15 alphanumeric (e.g. 24AAAAA0000A1Z5).';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e, allowDuplicate = false) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch('/api/vendors', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          allowDuplicate
        })
      });

      if (res.vendor) {
        onVendorCreated(res.vendor);
        onClose();
      }
    } catch (err) {
      if (err.message && err.message.includes('duplicate')) {
        // Fetch matching duplicate vendors
        try {
          const dupeRes = await apiFetch('/api/vendors/check-duplicate', {
            method: 'POST',
            body: JSON.stringify({
              gstin: formData.gstin,
              name: formData.name,
              phone: formData.phone,
              email: formData.email
            })
          });
          setDuplicateModal({
            open: true,
            duplicates: dupeRes.matches || []
          });
          return;
        } catch (checkErr) {
          setError(err.message);
        }
      } else {
        setError(err.message || 'Failed to save vendor.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold">
              {t('btn_add_vendor')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-amber-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{t('sec_basic_info')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vendor Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_vendor_name')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Krishna Oil Mill, Gujarat Besan..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border ${
                    fieldErrors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-amber-200'
                  } focus:outline-none focus:ring-2`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_vendor_category')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="add-vendor-category-presets"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Raw Materials (pulses and rice merchant)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <datalist id="add-vendor-category-presets">
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

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_contact_person')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Govindbhai / Rajesh Patel"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_phone')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="98250 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                      fieldErrors.phone ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-amber-200'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_alt_phone')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Office / Landline"
                    value={formData.alternate_phone}
                    onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="orders@vendorcompany.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                      fieldErrors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-amber-200'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Tax and Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('sec_tax_address')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GSTIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_gstin')}
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="24AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  className={`w-full px-3 py-2 text-sm font-mono uppercase rounded-xl border ${
                    fieldErrors.gstin ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-amber-200'
                  } focus:outline-none focus:ring-2`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {t('msg_gstin_disclaimer')}
                </p>
                {fieldErrors.gstin && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.gstin}</p>
                )}
              </div>

              {/* PAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_pan')}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="AAAAA0000A"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase().trim() })}
                  className="w-full px-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Full Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_address')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot / Shop No, Street, Industrial Area, Landmark..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_city')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajkot, Gondal, Ahmedabad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* State (Default: Gujarat) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_state')}
                </label>
                <input
                  type="text"
                  placeholder="Gujarat"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_pin_code')}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="360001"
                  value={formData.pin_code}
                  onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/[^0-9]/g, '') })}
                  className={`w-full px-3 py-2 text-sm font-mono rounded-xl border ${
                    fieldErrors.pin_code ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-amber-200'
                  } focus:outline-none focus:ring-2`}
                />
                {fieldErrors.pin_code && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.pin_code}</p>
                )}
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_business_type')}
                </label>
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {BUSINESS_TYPES.map(b => (
                    <option key={b.id} value={b.id}>
                      {lang === 'gu' ? b.gu : b.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Business Terms & Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-amber-100 pb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{t('sec_business_terms')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Terms */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_payment_terms')}
                </label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_credit_limit')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Optional limit e.g. 50000"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Supplies Besan on credit; deliveries on Tuesdays..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_status')}
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === 1}
                      onChange={() => setFormData({ ...formData, is_active: 1 })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>{t('status_active')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === 0}
                      onChange={() => setFormData({ ...formData, is_active: 0 })}
                      className="text-slate-500 focus:ring-slate-400"
                    />
                    <span>{t('status_inactive')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e, false)}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/30 transition disabled:opacity-50"
          >
            {submitting ? t('btn_saving') : t('btn_add_vendor')}
          </button>
        </div>
      </div>

      {/* Duplicate Detection Alert Modal */}
      {duplicateModal.open && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-amber-900">
              <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">
                  {lang === 'gu' ? 'સંભવિત ડુપ્લિકેટ વેપારી મળી આવ્યા!' : 'Potential Duplicate Vendor Detected!'}
                </h3>
                <p className="text-xs text-amber-700">
                  {lang === 'gu'
                    ? 'તમે જે વિગતો દાખલ કરી છે તે નીચેના અગાઉથી નોંધાયેલ વેપારી સાથે મેળ ખાય છે.'
                    : 'The vendor details you entered match existing registered vendors.'}
                </p>
              </div>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto space-y-3">
              {duplicateModal.duplicates.map((dupe, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{dupe.vendor.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Matched by: {dupe.matchedFields.join(', ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-600 grid grid-cols-2 gap-1 text-[11px]">
                    <div>Phone: {dupe.vendor.phone || '—'}</div>
                    <div>GSTIN: {dupe.vendor.gstin || dupe.vendor.tax_identifier || '—'}</div>
                    <div>City: {dupe.vendor.city || '—'}</div>
                    <div>Category: {dupe.vendor.category || '—'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectExisting) onSelectExisting(dupe.vendor);
                      setDuplicateModal({ open: false, duplicates: [] });
                      onClose();
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>{t('btn_select_existing')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDuplicateModal({ open: false, duplicates: [] })}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                {t('btn_review_differences')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setDuplicateModal({ open: false, duplicates: [] });
                  handleSubmit(e, true); // bypass duplicate with explicit user authorization
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                {t('btn_continue_create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddVendorModal;
