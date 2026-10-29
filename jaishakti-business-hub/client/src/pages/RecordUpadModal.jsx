import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  AlertTriangle,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Save,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';

export function RecordUpadModal({
  isOpen,
  onClose,
  worker,
  defaultType = 'advance_given',
  onTransactionSaved
}) {
  const { lang, t, formatINR } = useLanguage();

  const [txType, setTxType] = useState(defaultType);
  const [categoryType, setCategoryType] = useState('cash'); // 'cash' | 'farsan_item'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [diaryPage, setDiaryPage] = useState(worker?.diary_page ? String(worker.diary_page) : '');
  const [notes, setNotes] = useState('');
  const [syncToExpenses, setSyncToExpenses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTxType(defaultType);
      setCategoryType('cash');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('cash');
      setDiaryPage(worker?.diary_page ? String(worker.diary_page) : '');
      setNotes('');
      setSyncToExpenses(defaultType === 'advance_given');
      setError('');
    }
  }, [isOpen, defaultType, worker?.diary_page]);

  if (!isOpen || !worker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        transaction_type: txType,
        category_type: txType === 'advance_given' ? categoryType : 'cash',
        amount: parsedAmount,
        transaction_date: date,
        payment_method: paymentMethod,
        notes: notes.trim(),
        diary_page: diaryPage.trim() || undefined,
        sync_to_expenses: txType === 'advance_given' && categoryType === 'cash' ? syncToExpenses : false
      };

      const res = await apiFetch(`/api/workers/${worker.id}/transactions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (onTransactionSaved) {
        onTransactionSaved(res.worker || res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdvanceGiven = txType === 'advance_given';
  const isAdvanceReturned = txType === 'advance_returned';
  const isBonus = txType === 'bonus';
  const isDeduction = txType === 'deduction';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between transition-colors ${
          isAdvanceGiven
            ? 'bg-gradient-to-r from-red-600 to-rose-700'
            : isAdvanceReturned
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : isBonus
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : 'bg-gradient-to-r from-slate-700 to-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              {isAdvanceGiven && <ArrowDownLeft className="w-5 h-5 text-red-100" />}
              {isAdvanceReturned && <ArrowUpRight className="w-5 h-5 text-emerald-100" />}
              {isBonus && <Gift className="w-5 h-5 text-amber-100" />}
              {isDeduction && <AlertTriangle className="w-5 h-5 text-slate-100" />}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {isAdvanceGiven && (lang === 'gu' ? 'ઉપાડ આપ્યો (Advance Given)' : 'Give Advance (Upad)')}
                {isAdvanceReturned && (lang === 'gu' ? 'ઉપાડ પાછો જમા કર્યો (Advance Returned)' : 'Record Advance Repayment')}
                {isBonus && (lang === 'gu' ? 'બોનસ / ઈનામ (Bonus / Gift)' : 'Add Bonus / Gift')}
                {isDeduction && (lang === 'gu' ? 'કપાત / દંડ (Deduction)' : 'Record Deduction')}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {worker.name} • {worker.role_title}
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

        {/* Worker Balance Card */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">
            {lang === 'gu' ? 'હાલનો બાકી ઉપાડ:' : 'Current Outstanding Advance:'}
          </span>
          <span className={`font-bold text-sm sm:text-base ${
            (worker.outstanding_advance || 0) > 0 ? 'text-red-600' : 'text-slate-700'
          }`}>
            {formatINR(worker.outstanding_advance || 0)}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('th_tx_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setTxType('advance_given'); setCategoryType('cash'); setSyncToExpenses(true); }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                  isAdvanceGiven
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {lang === 'gu' ? 'ઉપાડ આપ્યો' : 'Give Advance'}
              </button>

              <button
                type="button"
                onClick={() => { setTxType('advance_returned'); setSyncToExpenses(false); }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                  isAdvanceReturned
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {lang === 'gu' ? 'ઉપાડ જમા' : 'Return Advance'}
              </button>

              <button
                type="button"
                onClick={() => { setTxType('bonus'); setSyncToExpenses(false); }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                  isBonus
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {lang === 'gu' ? 'બોનસ / ભેટ' : 'Bonus / Gift'}
              </button>

              <button
                type="button"
                onClick={() => { setTxType('deduction'); setSyncToExpenses(false); }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                  isDeduction
                    ? 'bg-slate-100 border-slate-500 text-slate-800 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {lang === 'gu' ? 'કપાત / ખોટ' : 'Deduction'}
              </button>
            </div>
          </div>

          {/* Sub-selector for Upad Type: Cash vs Shop Farsan / Sweets */}
          {isAdvanceGiven && (
            <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-950">
                {lang === 'gu' ? 'ઉપાડનો પ્રકાર પસંદ કરો:' : 'Select Advance Type:'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setCategoryType('cash'); setSyncToExpenses(true); }}
                  className={`py-2 px-3 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    categoryType === 'cash'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>{lang === 'gu' ? 'રોકડ / UPI ઉપાડ' : 'Cash / UPI Advance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setCategoryType('farsan_item'); setSyncToExpenses(false); }}
                  className={`py-2 px-3 rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    categoryType === 'farsan_item'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{lang === 'gu' ? 'દુકાનનું ફરસાણ / મીઠાઈ' : 'Shop Farsan / Sweets'}</span>
                </button>
              </div>

              {/* Quick Farsan / Mithai Chips from Father's Diary */}
              {categoryType === 'farsan_item' && (
                <div className="pt-1.5 border-t border-amber-200/60">
                  <span className="text-[11px] font-semibold text-amber-800 block mb-1.5">
                    {lang === 'gu' ? 'ઝડપી આઇટમ પસંદગી (ડાયરી મુજબ):' : 'Quick Items (from Diary):'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'ગાંઠિયા ૫૦૦ ગ્રામ', price: '120' },
                      { name: 'ગાંઠિયા ૨૫૦ ગ્રામ', price: '60' },
                      { name: 'જલેબી ૫૦૦ ગ્રામ', price: '260' },
                      { name: 'જલેબી ૨૫૦ ગ્રામ', price: '130' },
                      { name: 'ખાખરા', price: '150' },
                      { name: 'સેવ / ચવાણું', price: '100' },
                      { name: 'મીઠાઈ / પેંડા', price: '250' },
                      { name: 'સમોસા / કચોરી', price: '80' }
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setNotes((prev) => prev ? `${prev}, ${item.name}` : item.name);
                          if (!amount) setAmount(item.price);
                        }}
                        className="px-2 py-1 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>{item.name}</span>
                        <span className="text-amber-600 font-mono text-[10px]">₹{item.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount (₹) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {t('lbl_amount')} *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-lg">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2000"
                className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Date, Payment Method & Diary Page */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_date')}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_payment_method')}
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="cash">{lang === 'gu' ? 'રોકડ (Cash)' : 'Cash'}</option>
                  <option value="upi">{lang === 'gu' ? 'યુપીઆઈ (UPI / GPay)' : 'UPI / GPay'}</option>
                  <option value="bank_transfer">{lang === 'gu' ? 'બેંક ટ્રાન્સફર (NEFT/RTGS)' : 'Bank Transfer'}</option>
                  <option value="cheque">{lang === 'gu' ? 'ચેક (Cheque)' : 'Cheque'}</option>
                  <option value="other">{lang === 'gu' ? 'અન્ય (Other)' : 'Other'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {lang === 'gu' ? 'ચોપડા પાનું' : 'Diary Page'}
              </label>
              <input
                type="text"
                value={diaryPage}
                onChange={(e) => setDiaryPage(e.target.value)}
                placeholder="દા.ત. 19"
                className="w-full px-3 py-2 border border-purple-200 rounded-xl text-sm font-bold text-purple-900 bg-purple-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              {lang === 'gu' ? 'કારણ / વિગત (નોંધ)' : 'Purpose / Notes'}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isAdvanceGiven
                    ? (lang === 'gu' ? 'દા.ત. ઘર ખર્ચ, તહેવાર ખરીદી, દવા માટે' : 'e.g. Home expenses, Festival advance')
                    : isAdvanceReturned
                    ? (lang === 'gu' ? 'દા.ત. વધેલા રૂપિયા પાછા જમા કર્યા' : 'e.g. Returned unused cash')
                    : isBonus
                    ? (lang === 'gu' ? 'દા.ત. દિવાળી ઈનામ / સારો કારીગરી બોનસ' : 'e.g. Diwali bonus / Performance gift')
                    : (lang === 'gu' ? 'દા.ત. બિનઅધિકૃત રજા કપાત' : 'e.g. Fine or unapproved absence')
                }
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Auto Sync to Expenses Checkbox (only for Advance Given) */}
          {isAdvanceGiven && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="sync_exp_chk"
                checked={syncToExpenses}
                onChange={(e) => setSyncToExpenses(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="sync_exp_chk" className="cursor-pointer">
                <span className="block text-xs font-bold text-amber-900">
                  {t('lbl_sync_expenses')}
                </span>
                <span className="block text-[11px] text-amber-700">
                  {t('lbl_sync_expenses_help')}
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              className={`px-5 py-2 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 ${
                isAdvanceGiven
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                  : isAdvanceReturned
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : isBonus
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/30'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? t('btn_saving') : t('btn_confirm')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordUpadModal;
