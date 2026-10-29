import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  X,
  Receipt,
  FileText,
  Calendar,
  Building2,
  Phone,
  MapPin,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Tag,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Check,
  Plus
} from 'lucide-react';

export function BillDetailModal({
  bill,
  vendor,
  isOpen,
  onClose,
  onOpenExpense,
  onBillUpdated
}) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role } = useAuth();

  const [currentBill, setCurrentBill] = useState(bill);
  const [loading, setLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Creating daily expense state
  const [linkingExpense, setLinkingExpense] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    setCurrentBill(bill);
    setZoomLevel(1);
    setRotation(0);
    setLinkSuccess(false);
    setLinkError('');
  }, [bill]);

  if (!isOpen || !currentBill) return null;

  // Extract items from OCR raw text if available
  let parsedItems = [];
  try {
    if (currentBill.ocr_raw_text) {
      const parsed = typeof currentBill.ocr_raw_text === 'string'
        ? JSON.parse(currentBill.ocr_raw_text)
        : currentBill.ocr_raw_text;
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        parsedItems = parsed.items;
      }
    }
  } catch (e) {}

  const token = localStorage.getItem('js_token') || '';
  const attachmentId = currentBill.attachment_id;
  const isImage = currentBill.content_type ? currentBill.content_type.startsWith('image/') : true;
  const isPdf = currentBill.content_type === 'application/pdf';
  const downloadUrl = attachmentId
    ? `/api/vendors/bills/attachments/${attachmentId}/download?token=${token}`
    : null;

  const vendorName = currentBill.vendor_name || vendor?.name || 'Vendor';
  const vendorGstin = currentBill.vendor_gstin || vendor?.gstin || vendor?.tax_identifier || '';
  const vendorPhone = currentBill.vendor_phone || vendor?.phone || '';
  const vendorAddress = currentBill.vendor_address || vendor?.address || '';
  const vendorCity = currentBill.vendor_city || vendor?.city || '';
  const vendorCategory = currentBill.vendor_category || vendor?.category || '';

  const handleCreateExpense = async () => {
    setLinkingExpense(true);
    setLinkError('');
    try {
      const res = await apiFetch(`/api/vendors/bills/${currentBill.id}/create-expense`, {
        method: 'POST',
        body: JSON.stringify({
          category_id: 'cat_raw_materials',
          payment_method: 'credit'
        })
      });
      if (res.expense) {
        setLinkSuccess(true);
        setCurrentBill((prev) => ({
          ...prev,
          expense_id: res.expense.id,
          transaction_number: res.expense.transaction_number
        }));
        if (onBillUpdated) onBillUpdated();
      }
    } catch (err) {
      setLinkError(err.message || 'Failed to link bill to daily expenses');
    } finally {
      setLinkingExpense(false);
    }
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.3, 0.7));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <>
      {/* Main Bill Details Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Pinned Header */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                    {currentBill.bill_number ? `BILL #${currentBill.bill_number}` : 'BILL / INVOICE'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentBill.payment_status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentBill.payment_status === 'partially_paid'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentBill.payment_status === 'paid'
                      ? (lang === 'gu' ? 'ચૂકવેલ' : 'Paid')
                      : currentBill.payment_status === 'partially_paid'
                      ? (lang === 'gu' ? 'અંશતઃ ચૂકવેલ' : 'Partially Paid')
                      : (lang === 'gu' ? 'બાકી ચૂકવણી' : 'Unpaid')}
                  </span>
                  {currentBill.ocr_confidence && (
                    <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OCR: {Math.round(currentBill.ocr_confidence)}%</span>
                    </span>
                  )}
                  {currentBill.expense_id && (
                    <span className="bg-blue-50 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200 inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-blue-600" />
                      <span>{currentBill.transaction_number || 'Daily Expense'}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {vendorName}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content: 2-Column Responsive View */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Actual Bill Photo / Document */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'gu' ? 'મૂળ બિલ / રસીદ ફોટો' : 'Original Scanned Bill'}</span>
                  </h4>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'gu' ? 'ડાઉનલોડ' : 'Download'}</span>
                    </a>
                  )}
                </div>

                {/* Bill Image Container with Click-to-Zoom */}
                <div className="relative group rounded-2xl border border-slate-200 bg-slate-950/5 overflow-hidden flex flex-col items-center justify-center min-h-[300px] max-h-[460px] p-2">
                  {downloadUrl ? (
                    isImage ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img
                          src={downloadUrl}
                          alt={`Bill ${currentBill.bill_number || ''}`}
                          className="max-h-[420px] w-auto max-w-full object-contain rounded-xl cursor-zoom-in transition-transform duration-200 hover:scale-[1.02]"
                          onClick={() => setLightboxOpen(true)}
                        />
                        {/* Hover Overlay Button */}
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>{lang === 'gu' ? 'મોટું કરીને જુઓ' : 'Click to Zoom'}</span>
                        </button>
                      </div>
                    ) : isPdf ? (
                      <div className="text-center p-6 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center font-black text-xl shadow-inner">
                          PDF
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{currentBill.original_filename || 'Bill Document.pdf'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {currentBill.file_size_bytes ? `${(currentBill.file_size_bytes / 1024).toFixed(1)} KB` : ''}
                          </div>
                        </div>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{lang === 'gu' ? 'નવી ટેબમાં PDF ખોલો' : 'Open PDF Viewer'}</span>
                        </a>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400 text-xs">
                        {lang === 'gu' ? 'ફાઇલ ફોર્મેટ ઉપલબ્ધ નથી' : 'Unsupported file format'}
                      </div>
                    )
                  ) : (
                    <div className="text-center p-8 text-slate-400 space-y-2">
                      <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-xs">
                        {lang === 'gu'
                          ? 'આ બિલ માટે કોઈ ફોટો કે ફાઇલ અપલોડ થયેલ નથી.'
                          : 'No scan or receipt image uploaded for this bill.'}
                      </p>
                    </div>
                  )}
                </div>

                {currentBill.original_filename && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                    <span className="truncate max-w-[200px]">{currentBill.original_filename}</span>
                    <span>
                      {currentBill.file_size_bytes
                        ? `${(currentBill.file_size_bytes / 1024).toFixed(1)} KB`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Invoice & Financial Breakdown */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Vendor & Invoice Header Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {lang === 'gu' ? 'વેપારી વિગત' : 'Merchant Details'}
                      </div>
                      <div className="font-bold text-slate-900 text-base mt-0.5">{vendorName}</div>
                      {vendorCategory && (
                        <div className="text-xs text-amber-800 font-semibold mt-0.5">
                          {vendorCategory}
                        </div>
                      )}
                    </div>
                    {vendorGstin && (
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          GSTIN
                        </div>
                        <div className="font-mono text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 mt-0.5">
                          {vendorGstin}
                        </div>
                      </div>
                    )}
                  </div>

                  {(vendorPhone || vendorAddress) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                      {vendorPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{vendorPhone}</span>
                        </div>
                      )}
                      {vendorAddress && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{vendorAddress}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Invoice Dates & Timing */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      <span>{lang === 'gu' ? 'બિલ તારીખ' : 'Bill Date'}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-1">
                      {formatDate(currentBill.bill_date)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{lang === 'gu' ? 'ચૂકવણી મુદત' : 'Due Date'}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-1">
                      {currentBill.due_date ? formatDate(currentBill.due_date) : '—'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'gu' ? 'ઇનવોઇસ નંબર' : 'Invoice / Bill No'}
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                      {currentBill.bill_number || '—'}
                    </div>
                  </div>
                </div>

                {/* 3. Decoded Line Items Table (if OCR extracted items) */}
                {parsedItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span>{lang === 'gu' ? 'બિલની આઇટમો અને જથ્થો' : 'Purchased Items & Quantities'}</span>
                      </h4>
                      <span className="text-[11px] font-bold text-slate-400">
                        {parsedItems.length} {lang === 'gu' ? 'વસ્તુઓ' : 'items'}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">{lang === 'gu' ? 'વિગત' : 'Item Description'}</th>
                            <th className="px-3 py-2 text-right">{lang === 'gu' ? 'જથ્થો' : 'Qty'}</th>
                            <th className="px-3 py-2 text-right">{lang === 'gu' ? 'ભાવ (₹)' : 'Rate (₹)'}</th>
                            <th className="px-3 py-2 text-right">{lang === 'gu' ? 'કુલ (₹)' : 'Amount (₹)'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parsedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2 font-medium text-slate-900">
                                {item.description}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                {item.quantity || '1'}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                {item.rate != null ? formatINR(item.rate) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">
                                {item.amount != null ? formatINR(item.amount) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Notes / Item Summary (if notes exist) */}
                {currentBill.notes && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-amber-50/40 text-xs space-y-1">
                    <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                      {lang === 'gu' ? 'બિલ નોંધ / વિગત' : 'Bill Notes & Summary'}
                    </div>
                    <div className="text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                      {currentBill.notes}
                    </div>
                  </div>
                )}

                {/* 5. Financial Summary Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{lang === 'gu' ? 'સબ-ટોટલ' : 'Subtotal'}</span>
                    <span className="font-mono font-semibold">
                      {formatINR(currentBill.subtotal || currentBill.taxable_amount || currentBill.total_amount)}
                    </span>
                  </div>

                  {(currentBill.cgst > 0 || currentBill.sgst > 0 || currentBill.igst > 0) && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{lang === 'gu' ? 'GST (CGST + SGST)' : 'GST Tax'}</span>
                      <span className="font-mono font-semibold">
                        {formatINR((currentBill.cgst || 0) + (currentBill.sgst || 0) + (currentBill.igst || 0))}
                      </span>
                    </div>
                  )}

                  {currentBill.discount > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-700">
                      <span>{lang === 'gu' ? 'ડિસ્કાઉન્ટ' : 'Discount'}</span>
                      <span className="font-mono font-semibold">-{formatINR(currentBill.discount)}</span>
                    </div>
                  )}

                  {currentBill.other_charges > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{lang === 'gu' ? 'અન્ય ચાર્જ' : 'Other Charges'}</span>
                      <span className="font-mono font-semibold">+{formatINR(currentBill.other_charges)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-900">
                        {lang === 'gu' ? 'કુલ બિલ રકમ' : 'Grand Total'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {currentBill.payment_status === 'paid'
                          ? (lang === 'gu' ? 'સંપૂર્ણ ચૂકવાયેલ' : 'Fully Paid')
                          : (lang === 'gu' ? 'ચૂકવવાપાત્ર બાકી' : 'Payment Due')}
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
                      {formatINR(currentBill.total_amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        {lang === 'gu' ? 'ચૂકવેલ રકમ' : 'Paid Amount'}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatINR(currentBill.paid_amount || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        {lang === 'gu' ? 'બાકી રકમ' : 'Balance Due'}
                      </span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {formatINR(Math.max(0, (currentBill.total_amount || 0) - (currentBill.paid_amount || 0)))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Accounting Connection to Daily Expenses */}
                <div className="pt-2">
                  {currentBill.expense_id ? (
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>{lang === 'gu' ? 'દૈનિક ખર્ચ ખાતાવહી સાથે જોડાયેલ' : 'Linked in Daily Expenses'}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                          {currentBill.transaction_number || 'Transaction Record'}
                        </div>
                      </div>

                      {onOpenExpense && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenExpense(currentBill.expense_id);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <span>{lang === 'gu' ? 'વ્યવહાર વિગત જુઓ' : 'View in Daily Expenses'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {lang === 'gu' ? 'દૈનિક ખર્ચ હિસાબ' : 'Daily Expense Accounting'}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {lang === 'gu'
                            ? 'આ બિલ હજુ દૈનિક ખર્ચ ખાતાવહીમાં ઉમેરાયું નથી.'
                            : 'This bill is not recorded in the daily expense ledger yet.'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateExpense}
                        disabled={linkingExpense || linkSuccess}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        {linkingExpense ? (
                          <span>{lang === 'gu' ? 'ઉમેરાઈ રહ્યું છે...' : 'Recording...'}</span>
                        ) : linkSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'gu' ? 'ઉમેરાઈ ગયું!' : 'Recorded!'}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{lang === 'gu' ? 'દૈનિક ખર્ચમાં ઉમેરો' : 'Record to Daily Expenses'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {linkError && (
                    <div className="mt-2 text-xs text-rose-700 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{linkError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {currentBill.created_by_name && (
                <span>
                  {lang === 'gu' ? 'નોંધનાર: ' : 'Recorded by: '}
                  <strong className="text-slate-700">{currentBill.created_by_name}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition"
            >
              {t('btn_cancel') || 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Lightbox Fullscreen Viewer */}
      {lightboxOpen && downloadUrl && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col animate-fade-in">
          {/* Top Lightbox Toolbar */}
          <div className="p-3 px-4 flex items-center justify-between text-white border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                {currentBill.bill_number ? `Bill #${currentBill.bill_number}` : 'Bill Viewer'}
              </span>
              <span className="text-xs text-white/50 hidden sm:inline">
                ({vendorName})
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Reset Zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <a
                href={downloadUrl}
                download={currentBill.original_filename || 'bill.jpg'}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition ml-2"
                title="Download Bill"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
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
              src={downloadUrl}
              alt="Bill Fullscreen"
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
    </>
  );
}

export default BillDetailModal;
