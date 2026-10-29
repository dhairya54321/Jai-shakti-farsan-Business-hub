import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  Calculator,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Save,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  Clock
} from 'lucide-react';

export function SettleSalaryModal({
  isOpen,
  onClose,
  worker,
  attendance = null,
  onSettlementSaved
}) {
  const { lang, t, formatINR } = useLanguage();

  const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [month, setMonth] = useState(currentYearMonth);
  const [grossSalary, setGrossSalary] = useState('');
  const [advanceDeduction, setAdvanceDeduction] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [syncToExpenses, setSyncToExpenses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && worker) {
      setMonth(currentYearMonth);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('cash');
      setBonusAmount('');
      setDeductionAmount('');
      setNotes('');
      setSyncToExpenses(true);
      setError('');

      // Determine initial gross salary
      let initialGross = worker.base_salary || 0;
      if (worker.wage_type === 'daily' && attendance && attendance.effectiveWorkingDays) {
        initialGross = Math.round(attendance.effectiveWorkingDays * (worker.base_salary || 0));
      }
      setGrossSalary(String(initialGross));

      // Auto deduct upad up to gross salary
      const outstanding = worker.outstanding_advance || 0;
      const autoDeduct = Math.min(outstanding > 0 ? outstanding : 0, initialGross);
      setAdvanceDeduction(String(autoDeduct));
    }
  }, [isOpen, worker, attendance]);

  if (!isOpen || !worker) return null;

  const grossNum = Number(grossSalary) || 0;
  const advanceDedNum = Number(advanceDeduction) || 0;
  const bonusNum = Number(bonusAmount) || 0;
  const fineNum = Number(deductionAmount) || 0;

  const netCashPayout = Math.max(0, Math.round((grossNum - advanceDedNum + bonusNum - fineNum) * 100) / 100);
  const remainingUpad = Math.max(0, Math.round(((worker.outstanding_advance || 0) - advanceDedNum) * 100) / 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (grossNum <= 0) {
      setError(lang === 'gu' ? 'કૃપા કરીને માન્ય ગ્રોસ પગાર દાખલ કરો.' : 'Please enter a valid gross salary.');
      return;
    }

    if (advanceDedNum > grossNum + bonusNum) {
      setError(lang === 'gu' ? 'ઉપાડ કપાત ગ્રોસ પગાર કરતાં વધુ ન હોઈ શકે.' : 'Advance deduction cannot exceed gross salary plus bonus.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        month,
        gross_salary: grossNum,
        advance_deduction: advanceDedNum,
        bonus_amount: bonusNum,
        deduction_amount: fineNum,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes.trim() || `પગાર હિસાબ (${month})`,
        sync_to_expenses: syncToExpenses
      };

      const res = await apiFetch(`/api/workers/${worker.id}/settle-salary`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (onSettlementSaved) {
        onSettlementSaved(res.worker || res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to settle salary.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calculator className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {lang === 'gu' ? 'પગાર હિસાબ & ચૂકવણી' : 'Settle Monthly Salary'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {worker.name} • {worker.role_title} ({worker.wage_type === 'monthly' ? t('lbl_monthly_wage') : t('lbl_daily_wage')})
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

        {/* Attendance & Wage Info Banner */}
        {attendance && (
          <div className="bg-emerald-50/70 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'gu'
                  ? `હાજરી સારાંશ: ${attendance.presentDays} હાજર, ${attendance.halfDays} અડધો દિવસ, ${attendance.absentDays} ગેરહાજર`
                  : `Attendance: ${attendance.presentDays} Present, ${attendance.halfDays} Half-day, ${attendance.absentDays} Absent`}
              </span>
            </div>
            <span className="font-bold text-emerald-800">
              {attendance.effectiveWorkingDays} {lang === 'gu' ? 'કામના દિવસો' : 'Working Days'}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Month & Payment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_settlement_month')}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_date')}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Gross Salary & Advance Deduction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_gross_salary')} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(e.target.value)}
                  placeholder="18000"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {t('lbl_deduct_upad')}
                </label>
                <span className="text-[11px] text-red-600 font-bold">
                  {lang === 'gu' ? 'બાકી:' : 'Due:'} {formatINR(worker.outstanding_advance || 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-red-500 font-bold">-₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={worker.outstanding_advance || 0}
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 border border-red-200 rounded-xl text-base font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30"
                />
              </div>
            </div>
          </div>

          {/* Bonus & Deduction (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_bonus_gift')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-emerald-500 font-bold">+₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_deductions_fine')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">-₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Net Cash Payout Summary Box */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1.5">
              <span>{lang === 'gu' ? 'ચોખ્ખી રોકડ ચૂકવણી (Net Cash Payout):' : 'Net Cash Payout to Worker:'}</span>
              <span className="text-slate-500 text-[11px]">
                {lang === 'gu'
                  ? `(ગ્રોસ ₹${grossNum} - ઉપાડ કપાત ₹${advanceDedNum} + બોનસ ₹${bonusNum} - કપાત ₹${fineNum})`
                  : `(₹${grossNum} - ₹${advanceDedNum} + ₹${bonusNum} - ₹${fineNum})`}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-700">
                {formatINR(netCashPayout)}
              </span>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">
                  {lang === 'gu' ? 'બાકી ઉપાડ રહેશે:' : 'Remaining Upad:'}
                </span>
                <span className={`text-xs font-bold ${remainingUpad > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatINR(remainingUpad)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_payment_method')}
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="cash">{lang === 'gu' ? 'રોકડ (Cash)' : 'Cash'}</option>
                  <option value="upi">{lang === 'gu' ? 'યુપીઆઈ (UPI / GPay)' : 'UPI / GPay'}</option>
                  <option value="bank_transfer">{lang === 'gu' ? 'બેંક ટ્રાન્સફર (NEFT/RTGS)' : 'Bank Transfer'}</option>
                  <option value="cheque">{lang === 'gu' ? 'ચેક (Cheque)' : 'Cheque'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                {t('lbl_notes')}
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'gu' ? 'દા.ત. ઓક્ટોબર માસનો પૂરો પગાર' : 'e.g. October full month salary'}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Auto-sync to Expense Book */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="sync_salary_chk"
              checked={syncToExpenses}
              onChange={(e) => setSyncToExpenses(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="sync_salary_chk" className="cursor-pointer">
              <span className="block text-xs font-bold text-amber-900">
                {t('lbl_sync_expenses')}
              </span>
              <span className="block text-[11px] text-amber-700">
                {lang === 'gu'
                  ? 'ચોખ્ખી ચૂકવેલ પગાર રકમ દૈનિક દુકાન ખર્ચ ખાતામાં આપમેળે નોંધાઈ જશે'
                  : 'Net cash salary payout will be automatically recorded in shop expenses'}
              </span>
            </label>
          </div>

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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? t('btn_saving') : (lang === 'gu' ? 'પગાર ચૂકવો & સેવ કરો' : 'Settle & Pay Salary')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettleSalaryModal;
