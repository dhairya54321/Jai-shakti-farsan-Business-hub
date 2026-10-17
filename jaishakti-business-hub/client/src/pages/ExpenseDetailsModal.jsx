import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  X,
  Calendar,
  Receipt,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Download,
  CreditCard,
  History,
  Plus
} from 'lucide-react';

export function ExpenseDetailsModal({ expense, onClose, onRefresh }) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role, user } = useAuth();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const isOwnerOrManager = ['owner', 'manager'].includes(role);

  if (!expense) return null;

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
      await apiFetch(`/api/expenses/${expense.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          payment_method: paymentMethod,
          reference_number: paymentRef || null
        })
      });
      setPaymentAmount('');
      setPaymentRef('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleApprove = async () => {
    try {
      await apiFetch(`/api/expenses/${expense.id}/approve`, { method: 'POST' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(lang === 'gu' ? 'નામંજૂર કરવાનું કારણ લખો:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      await apiFetch(`/api/expenses/${expense.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVoid = async () => {
    const reason = window.prompt(lang === 'gu' ? 'વ્યવહાર રદ (Void) કરવાનું કારણ લખો:' : 'Enter reason for voiding transaction:');
    if (!reason || !reason.trim()) return;
    try {
      await apiFetch(`/api/expenses/${expense.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {expense.transaction_number}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                expense.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                expense.approval_status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                expense.approval_status === 'voided' ? 'bg-slate-200 text-slate-700' :
                'bg-red-100 text-red-800'
              }`}>
                {t(`as_${expense.approval_status}`)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold capitalize">
                {t(`ps_${expense.payment_status}`)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {lang === 'gu' ? expense.category_name_gu : expense.category_name_en}
            </h3>
            <p className="text-xs text-slate-500">
              {formatDate(expense.transaction_date)} • {lang === 'gu' ? 'નોંધનાર:' : 'Entered by:'} {expense.creator_name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Overview Card */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-center">
          <div>
            <span className="text-slate-500 text-[11px] block">{t('lbl_amount')}</span>
            <span className="text-base sm:text-xl font-black text-slate-900">
              {formatINR(expense.amount)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">{t('lbl_paid_amount')}</span>
            <span className="text-base sm:text-xl font-bold text-emerald-700">
              {formatINR(expense.total_paid || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">{t('lbl_balance_due')}</span>
            <span className={`text-base sm:text-xl font-bold ${
              (expense.balance_due || 0) > 0 ? 'text-red-600' : 'text-slate-400'
            }`}>
              {formatINR(expense.balance_due || 0)}
            </span>
          </div>
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200">
            <span className="text-slate-400 block mb-0.5">{t('lbl_vendor')}</span>
            <span className="font-semibold text-slate-800">
              {expense.vendor_name || '—'} {expense.vendor_phone ? `(${expense.vendor_phone})` : ''}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200">
            <span className="text-slate-400 block mb-0.5">{t('lbl_invoice_no')}</span>
            <span className="font-semibold text-slate-800">
              {expense.invoice_number || '—'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 col-span-2">
            <span className="text-slate-400 block mb-0.5">{t('lbl_description')}</span>
            <span className="text-slate-800">
              {expense.description || '—'}
            </span>
          </div>
          {expense.notes && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 col-span-2">
              <span className="text-slate-400 block mb-0.5">{t('lbl_notes')}</span>
              <span className="text-slate-800 italic">{expense.notes}</span>
            </div>
          )}
          {expense.void_reason && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 col-span-2 text-slate-800">
              <span className="font-bold text-slate-600 block">Void Reason:</span>
              <span>{expense.void_reason} (by {expense.voider_name})</span>
            </div>
          )}
          {expense.rejection_reason && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 col-span-2 text-red-800">
              <span className="font-bold text-red-600 block">Rejection Reason:</span>
              <span>{expense.rejection_reason} (by {expense.rejector_name})</span>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {expense.attachments && expense.attachments.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attached Receipts ({expense.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {expense.attachments.map((att) => {
                const token = localStorage.getItem('js_token');
                const downloadUrl = `/api/expenses/attachments/${att.id}/download?token=${token}`;
                const isImage = att.content_type.startsWith('image/');
                return (
                  <div key={att.id} className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    {isImage ? (
                      <img
                        src={downloadUrl}
                        alt="Receipt"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        PDF
                      </div>
                    )}
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800 max-w-[150px] truncate">{att.original_filename}</div>
                      <div className="text-slate-400 text-[10px]">{(att.file_size_bytes / 1024).toFixed(1)} KB</div>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:underline font-bold text-[11px] inline-flex items-center gap-0.5 mt-0.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>View / Download</span>
                      </a>
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
              Payment History ({expense.payments?.length || 0})
            </h4>
          </div>

          {expense.payments && expense.payments.length > 0 ? (
            <div className="space-y-1.5">
              {expense.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{formatINR(p.amount)}</span>{' '}
                    <span className="capitalize text-slate-600 font-semibold">({p.payment_method})</span>
                    {p.reference_number && (
                      <span className="text-[11px] text-slate-400 ml-1">Ref: {p.reference_number}</span>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>{formatDate(p.payment_date)}</div>
                    <div>By: {p.recorded_by_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No payments recorded yet.</div>
          )}

          {/* Add Installment Form (if balance due > 0 and not voided) */}
          {(expense.balance_due || 0) > 0 && expense.approval_status !== 'voided' && expense.approval_status !== 'rejected' && (
            <form onSubmit={handleAddPayment} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
              <div className="text-xs font-bold text-amber-900">
                {t('btn_add_payment')} (Remaining: {formatINR(expense.balance_due)})
              </div>
              {paymentError && (
                <div className="text-xs text-red-600">{paymentError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.01"
                  max={expense.balance_due}
                  required
                  placeholder="Amount (₹)"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                >
                  <option value="cash">{t('pm_cash')}</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank</option>
                  <option value="card">{t('pm_card')}</option>
                </select>
                <input
                  type="text"
                  placeholder="UTR / Ref No."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingPayment}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
              >
                {submittingPayment ? 'Recording...' : t('btn_add_payment')}
              </button>
            </form>
          )}
        </div>

        {/* Audit Trail Section */}
        {expense.audit_logs && expense.audit_logs.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Audit Trail ({expense.audit_logs.length})</span>
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {expense.audit_logs.map((log) => (
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

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {isOwnerOrManager && expense.approval_status === 'pending_approval' && (
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

            {isOwnerOrManager && expense.approval_status === 'approved' && (
              <button
                onClick={handleVoid}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                {t('btn_void')}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpenseDetailsModal;
