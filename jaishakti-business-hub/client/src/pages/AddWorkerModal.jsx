import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  User,
  Phone,
  Briefcase,
  IndianRupee,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Save,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

export const WORKER_ROLE_OPTIONS = [
  { id: 'farsan_karigar', en: 'Farsan Karigar (Maker)', gu: 'ફરસાણ કારીગર' },
  { id: 'head_chef', en: 'Head Chef / Maharaj', gu: 'મુખ્ય રસોઈયા / મહારાજ' },
  { id: 'sweet_maker', en: 'Sweet / Mithai Maker', gu: 'મીઠાઈ કારીગર' },
  { id: 'packing_staff', en: 'Packing Staff', gu: 'પેકિંગ સ્ટાફ' },
  { id: 'counter_sales', en: 'Counter Sales Staff', gu: 'કાઉન્ટર સેલ્સ સ્ટાફ' },
  { id: 'helper_cleaning', en: 'Helper & Cleaning', gu: 'હેલ્પર અને સફાઈ' },
  { id: 'driver_delivery', en: 'Delivery / Driver', gu: 'ડિલિવરી / ડ્રાઈવર' },
  { id: 'other', en: 'Other Staff', gu: 'અન્ય સ્ટાફ' }
];

const DEFAULT_WORKER_FORM = {
  name: '',
  role_title: 'farsan_karigar',
  wage_type: 'monthly',
  base_salary: '',
  phone: '',
  alternate_phone: '',
  joining_date: new Date().toISOString().slice(0, 10),
  address: '',
  id_proof_number: '',
  notes: '',
  is_active: 1
};

export function AddWorkerModal({ isOpen, onClose, onWorkerSaved, workerToEdit = null }) {
  const { lang, t } = useLanguage();

  const [formData, setFormData] = useState(DEFAULT_WORKER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (workerToEdit) {
        setFormData({
          name: workerToEdit.name || '',
          role_title: workerToEdit.role_title || 'farsan_karigar',
          wage_type: workerToEdit.wage_type || 'monthly',
          base_salary: workerToEdit.base_salary !== undefined ? String(workerToEdit.base_salary) : '',
          phone: workerToEdit.phone || '',
          alternate_phone: workerToEdit.alternate_phone || '',
          joining_date: workerToEdit.joining_date || new Date().toISOString().slice(0, 10),
          address: workerToEdit.address || '',
          id_proof_number: workerToEdit.id_proof_number || '',
          notes: workerToEdit.notes || '',
          is_active: workerToEdit.is_active !== undefined ? workerToEdit.is_active : 1
        });
      } else {
        setFormData({
          ...DEFAULT_WORKER_FORM,
          joining_date: new Date().toISOString().slice(0, 10)
        });
      }
      setError('');
    }
  }, [isOpen, workerToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(lang === 'gu' ? 'કૃપા કરીને કારીગરનું નામ દાખલ કરો.' : 'Please enter worker name.');
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.replace(/[^0-9]/g, '').slice(-10))) {
      setError(lang === 'gu' ? 'માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        base_salary: formData.base_salary ? Number(formData.base_salary) : 0
      };

      let res;
      if (workerToEdit) {
        res = await apiFetch(`/api/workers/${workerToEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/workers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (onWorkerSaved) {
        onWorkerSaved(res.worker || res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save worker.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <User className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {workerToEdit
                  ? (lang === 'gu' ? 'કારીગર વિગત સુધારો' : 'Edit Worker Profile')
                  : (lang === 'gu' ? 'નવો કારીગર ઉમેરો' : 'Add New Worker')}
              </h3>
              <p className="text-xs text-amber-100">
                {lang === 'gu' ? 'જય શક્તિ સ્ટાફ અને ખાતાવહી ડિરેક્ટરી' : 'Staff ledger profile for Jai Shakti Farsan Mart'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {t('lbl_worker_name')} *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={lang === 'gu' ? 'દા.ત. રમેશભાઈ મહારાજ / સુરેશભાઈ કારીગર' : 'e.g. Rameshbhai Maharaj'}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Role & Wage Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_worker_role')}
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  name="role_title"
                  value={formData.role_title}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {WORKER_ROLE_OPTIONS.map(r => (
                    <option key={r.id} value={r.id}>
                      {lang === 'gu' ? r.gu : r.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_wage_type')}
              </label>
              <select
                name="wage_type"
                value={formData.wage_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                <option value="monthly">{t('lbl_monthly_wage')}</option>
                <option value="daily">{t('lbl_daily_wage')}</option>
              </select>
            </div>
          </div>

          {/* Base Salary & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {formData.wage_type === 'monthly' ? t('lbl_monthly_wage') : t('lbl_daily_wage')}
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="any"
                  name="base_salary"
                  value={formData.base_salary}
                  onChange={handleChange}
                  placeholder={formData.wage_type === 'monthly' ? '18000' : '600'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_joining_date')}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_phone')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  maxLength={10}
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9825012345"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_alt_phone')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  maxLength={10}
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleChange}
                  placeholder={lang === 'gu' ? 'પરિવાર / ઘરનો ફોન' : 'Family / home contact'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Address & Aadhaar / ID Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_id_proof')}
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="id_proof_number"
                  value={formData.id_proof_number}
                  onChange={handleChange}
                  placeholder={lang === 'gu' ? 'આધાર નંબર / ચૂંટણી કાર્ડ' : 'Aadhaar / Voter ID'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_address')}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={lang === 'gu' ? 'વતન / સરનામું' : 'Hometown / Local address'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {t('lbl_notes')}
            </label>
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder={lang === 'gu' ? 'કારીગરની વિશેષતા અથવા વધારાની નોંધ...' : 'Specialty or notes...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_chk"
              name="is_active"
              checked={formData.is_active === 1}
              onChange={handleChange}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="is_active_chk" className="text-xs font-semibold text-slate-700 cursor-pointer">
              {lang === 'gu' ? 'આ કારીગર હાલ દુકાનમાં સક્રિય છે (Active Staff)' : 'Worker is actively employed in shop'}
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? t('btn_saving') : (workerToEdit ? t('btn_edit') : t('btn_confirm'))}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddWorkerModal;
