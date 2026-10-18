import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import { VENDOR_CATEGORIES, PAYMENT_TERMS_OPTIONS } from './AddVendorModal';
import {
  X,
  Upload,
  Camera,
  FileText,
  AlertCircle,
  CheckCircle,
  Building2,
  Receipt,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  Check,
  UserCheck,
  Sparkles,
  Key,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

export function BillOcrModal({ isOpen, onClose, onBillSaved, vendors = [] }) {
  const { lang, t, formatINR } = useLanguage();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'review' | 'success'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [storedFileInfo, setStoredFileInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Gemini AI Key state
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('js_gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [keyInputVal, setKeyInputVal] = useState(() => localStorage.getItem('js_gemini_api_key') || '');
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Vendor association choice: 'new' | 'existing'
  const [vendorChoice, setVendorChoice] = useState('new');
  const [selectedExistingVendorId, setSelectedExistingVendorId] = useState('');

  // Editable Review Form State
  const [reviewFields, setReviewFields] = useState({
    vendorName: '',
    contactPerson: '',
    vendorCategory: 'Raw Materials',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pinCode: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    poNumber: '',
    subtotal: '',
    taxableAmount: '',
    cgst: '',
    sgst: '',
    igst: '',
    otherCharges: '',
    discount: '',
    totalAmount: '',
    paidAmount: '',
    notes: '',
    createDailyExpense: false,
    expensePaymentMethod: 'credit'
  });

  const [fieldConfidence, setFieldConfidence] = useState({});
  const [detectedDuplicates, setDetectedDuplicates] = useState([]);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOcrData(null);
    setStoredFileInfo(null);
    setErrorMessage('');
    setSuccessInfo(null);
    setVendorChoice('new');
    setSelectedExistingVendorId('');
    setDetectedDuplicates([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSaveApiKey = async () => {
    const trimmed = keyInputVal.trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('js_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('js_gemini_api_key');
    }
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ gemini_api_key: trimmed })
      });
    } catch (_) {}
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setShowApiKeyInput(false);
    }, 2000);
  };

  const handleFileChosen = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setStep('processing');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('bill', file);
    const activeKey = geminiApiKey || localStorage.getItem('js_gemini_api_key') || '';
    if (activeKey) {
      formData.append('geminiApiKey', activeKey);
    }

    try {
      const res = await apiFetch('/api/vendors/scan-bill', {
        method: 'POST',
        body: formData,
        headers: activeKey ? { 'x-gemini-api-key': activeKey } : {}
      });

      if (res.file) {
        setStoredFileInfo(res.file);
      }

      const extracted = res.ocr ? res.ocr.extracted : {};
      const conf = res.ocr ? res.ocr.fieldConfidence : {};

      setOcrData(res.ocr);
      setFieldConfidence(conf || {});

      // Check if duplicate matches existing vendor
      if (res.duplicates && res.duplicates.length > 0) {
        setDetectedDuplicates(res.duplicates);
        setVendorChoice('existing');
        setSelectedExistingVendorId(res.duplicates[0].vendor.id);
      } else {
        setDetectedDuplicates([]);
        // Try to match vendor by exact name among available vendors
        const found = vendors.find(v => v.name.toLowerCase() === (extracted.vendorName || '').toLowerCase());
        if (found) {
          setVendorChoice('existing');
          setSelectedExistingVendorId(found.id);
        } else {
          setVendorChoice('new');
        }
      }

      setReviewFields({
        vendorName: extracted.vendorName || '',
        contactPerson: extracted.contactPerson || '',
        vendorCategory: extracted.vendorCategory || 'Raw Materials',
        gstin: extracted.gstin || '',
        pan: extracted.pan || '',
        phone: extracted.phone || '',
        email: extracted.email || '',
        address: extracted.address || '',
        city: extracted.city || '',
        state: extracted.state || 'Gujarat',
        pinCode: extracted.pinCode || '',
        invoiceNumber: extracted.invoiceNumber || '',
        invoiceDate: extracted.invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: extracted.dueDate || '',
        poNumber: extracted.poNumber || '',
        subtotal: extracted.subtotal !== null && extracted.subtotal !== undefined ? String(extracted.subtotal) : '',
        taxableAmount: extracted.taxableAmount !== null && extracted.taxableAmount !== undefined ? String(extracted.taxableAmount) : '',
        cgst: extracted.cgst !== null && extracted.cgst !== undefined ? String(extracted.cgst) : '',
        sgst: extracted.sgst !== null && extracted.sgst !== undefined ? String(extracted.sgst) : '',
        igst: extracted.igst !== null && extracted.igst !== undefined ? String(extracted.igst) : '',
        otherCharges: extracted.otherCharges !== null && extracted.otherCharges !== undefined ? String(extracted.otherCharges) : '',
        discount: extracted.discount !== null && extracted.discount !== undefined ? String(extracted.discount) : '',
        totalAmount: extracted.totalAmount !== null && extracted.totalAmount !== undefined ? String(extracted.totalAmount) : '',
        paidAmount: '',
        notes: extracted.notes || '',
        createDailyExpense: false,
        expensePaymentMethod: 'credit'
      });

      setStep('review');
    } catch (err) {
      console.error('Scan bill error:', err);
      // Fallback: file is kept, let user review and fill manually
      setErrorMessage(
        lang === 'gu'
          ? 'ઓસીઆર પ્રોસેસિંગમાં સમસ્યા આવી અથવા બિલ અસ્પષ્ટ છે. તમે વિગતો જાતે ચકાસીને ભરી શકો છો.'
          : 'OCR was unable to extract all fields automatically. You can review and enter details manually below.'
      );
      setReviewFields(prev => ({
        ...prev,
        invoiceDate: new Date().toISOString().slice(0, 10)
      }));
      setStep('review');
    }
  };

  const handleConfirmSave = async () => {
    // Validate amounts and vendor choice
    const total = parseFloat(reviewFields.totalAmount);
    if (isNaN(total) || total <= 0) {
      setErrorMessage(lang === 'gu' ? 'કુલ બિલ રકમ (₹) માન્ય હોવી જોઈએ.' : 'A valid total invoice amount is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      let finalVendorId = selectedExistingVendorId;

      // 1. If user chose to create new vendor
      if (vendorChoice === 'new') {
        if (!reviewFields.vendorName.trim()) {
          throw new Error(lang === 'gu' ? 'વેપારીનું નામ જરૂરી છે.' : 'Vendor name is required.');
        }

        const newVendorRes = await apiFetch('/api/vendors', {
          method: 'POST',
          body: JSON.stringify({
            name: reviewFields.vendorName.trim(),
            category: reviewFields.vendorCategory?.trim() || 'Raw Materials',
            contact_person: reviewFields.contactPerson?.trim() || null,
            phone: reviewFields.phone.trim() || null,
            email: reviewFields.email.trim() || null,
            address: reviewFields.address.trim() || null,
            city: reviewFields.city.trim() || null,
            state: reviewFields.state.trim() || 'Gujarat',
            pin_code: reviewFields.pinCode.trim() || null,
            gstin: reviewFields.gstin.trim() || null,
            pan: reviewFields.pan.trim() || null,
            allowDuplicate: true
          })
        });

        if (!newVendorRes.vendor || !newVendorRes.vendor.id) {
          throw new Error('Failed to create new vendor profile.');
        }
        finalVendorId = newVendorRes.vendor.id;
      }

      if (!finalVendorId) {
        throw new Error(lang === 'gu' ? 'કૃપા કરીને વેપારી પસંદ કરો.' : 'Please select or create a vendor.');
      }

      // 2. Save Bill and link attachment
      const billPayload = {
        vendor_id: finalVendorId,
        bill_number: reviewFields.invoiceNumber || null,
        bill_date: reviewFields.invoiceDate || null,
        due_date: reviewFields.dueDate || null,
        po_number: reviewFields.poNumber || null,
        subtotal: reviewFields.subtotal || null,
        taxable_amount: reviewFields.taxableAmount || null,
        cgst: reviewFields.cgst || null,
        sgst: reviewFields.sgst || null,
        igst: reviewFields.igst || null,
        other_charges: reviewFields.otherCharges || null,
        discount: reviewFields.discount || null,
        total_amount: total,
        paid_amount: parseFloat(reviewFields.paidAmount) || 0,
        notes: reviewFields.notes || null,
        ocr_status: ocrData ? ocrData.ocrStatus : 'manual',
        ocr_confidence: ocrData ? ocrData.ocrConfidence : null,
        ocr_raw_text: ocrData ? ocrData.rawText : null,
        stored_filename: storedFileInfo ? storedFileInfo.filename : null,
        stored_originalname: storedFileInfo ? storedFileInfo.originalname : (selectedFile ? selectedFile.name : null),
        stored_mimetype: storedFileInfo ? storedFileInfo.mimetype : (selectedFile ? selectedFile.type : null),
        create_daily_expense: reviewFields.createDailyExpense,
        expense_category_id: 'cat_raw_materials',
        expense_payment_method: reviewFields.expensePaymentMethod
      };

      const billRes = await apiFetch('/api/vendors/bills', {
        method: 'POST',
        body: JSON.stringify(billPayload)
      });

      setSuccessInfo({
        bill: billRes.bill,
        vendorName: vendorChoice === 'new'
          ? reviewFields.vendorName
          : (vendors.find(v => v.id === finalVendorId)?.name || reviewFields.vendorName),
        linkedExpenseId: billRes.linkedExpenseId
      });

      setStep('success');
      if (onBillSaved) {
        onBillSaved(billRes.bill);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save bill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold">
              {t('btn_upload_bill')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-amber-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload or Capture */}
        {step === 'upload' && (
          <div className="p-8 text-center space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-slate-800">
                {lang === 'gu' ? 'બિલ અથવા ઇન્વૉઇસ ફોટો પસંદ કરો' : 'Upload or Capture Bill / Invoice'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'gu'
                  ? 'દુકાને આવેલ કાચા માલ, તેલ, બેસન કે પેકિંગનું બિલ અપલોડ કરો. સિસ્ટમ આપોઆપ વેપારી અને રકમની વિગતો વાંચી લેશે.'
                  : 'Upload an invoice photo or PDF. The system will automatically extract vendor details, GSTIN, and amount breakdown for your review.'}
              </p>
            </div>

            {/* AI Engine Status & Key Config */}
            <div className="max-w-lg mx-auto p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-xs space-y-2.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${geminiApiKey ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      {geminiApiKey
                        ? (lang === 'gu' ? 'ગુગલ જેમિની AI ઓસીઆર સક્રિય' : 'Google Gemini AI OCR Active')
                        : (lang === 'gu' ? 'લોકલ ઓસીઆર (Auto-Orientation)' : 'Local OCR (Auto-Orientation)')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {geminiApiKey
                        ? (lang === 'gu' ? '૧૦૦% ચોકસાઈ સાથે તમામ વિગતો આપમેળે ભરાશે' : 'Direct AI extraction — 100% precision')
                        : (lang === 'gu' ? 'જેમિની જેવી ૧૦૦% ચોકસાઈ માટે ફ્રી API Key જોડો' : 'For 100% Gemini accuracy, connect a free API key')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(prev => !prev)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition flex items-center gap-1 shrink-0"
                >
                  <Key className="w-3 h-3" />
                  <span>{geminiApiKey ? (lang === 'gu' ? 'કી બદલો' : 'Change Key') : (lang === 'gu' ? '+ API Key ઉમેરો' : '+ Add Gemini Key')}</span>
                  {showApiKeyInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showApiKeyInput && (
                <div className="pt-2.5 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{lang === 'gu' ? 'Google AI Studio ફ્રી API કી (AIzaSy...):' : 'Google AI Studio Free API Key (AIzaSy...):'}</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>{lang === 'gu' ? 'ફ્રી કી મેળવો' : 'Get Free Key'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={keyInputVal}
                      onChange={(e) => setKeyInputVal(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition"
                    >
                      {lang === 'gu' ? 'સાચવો' : 'Save'}
                    </button>
                  </div>
                  {keySavedMessage && (
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{lang === 'gu' ? 'API Key સાચવવામાં આવી!' : 'Gemini API Key saved successfully!'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-1/2 p-6 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 flex flex-col items-center justify-center gap-3 transition group"
              >
                <div className="p-3 rounded-full bg-amber-100 text-amber-700 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-amber-900 block">
                    {lang === 'gu' ? 'ફાઈલ પસંદ કરો (File)' : 'Choose File / PDF'}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 10MB</span>
                </div>
              </button>

              {/* Camera capture button (mobile devices) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-1/2 p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 flex flex-col items-center justify-center gap-3 transition group"
              >
                <div className="p-3 rounded-full bg-slate-100 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-700 group-hover:scale-110 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 block">
                    {lang === 'gu' ? 'કૅમેરાથી ફોટો લો (Camera)' : 'Take Photo with Camera'}
                  </span>
                  <span className="text-[10px] text-slate-400">Mobile / Tablet Live Capture</span>
                </div>
              </button>
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChosen(e.target.files[0]);
                }
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChosen(e.target.files[0]);
                }
              }}
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('msg_ocr_disclaimer')}</span>
            </div>
          </div>
        )}

        {/* Step 2: Processing OCR */}
        {step === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {lang === 'gu' ? 'બિલ પ્રોસેસ થઈ રહ્યું છે...' : 'Scanning & Analyzing Bill...'}
              </h3>
              <p className="text-xs text-slate-500">
                {geminiApiKey
                  ? (lang === 'gu' ? 'ગુગલ જેમિની AI વિઝન મોડેલ દ્વારા બિલ વાંચવામાં આવી રહ્યું છે...' : 'Analyzing bill with Google Gemini Vision AI model...')
                  : (lang === 'gu' ? 'ઓસીઆર એન્જિન બિલમાંથી વેપારી, તારીખ, GSTIN અને રકમ વાંચી રહ્યું છે.' : 'Running auto-orientation OCR engine to extract vendor, GSTIN, and amounts.')}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Edit Extracted Fields */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Top Bar: Attachment badge & OCR status */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Attached Bill'}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({(selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) : '0')} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  ocrData?.ocrEngine === 'gemini'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5'
                }`}>
                  {ocrData?.ocrEngine === 'gemini' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>{lang === 'gu' ? 'ગુગલ જેમિની AI દ્વારા વિશ્લેષણ' : 'Google Gemini AI Analyzed'}</span>
                      <span className="opacity-75 font-normal">(100% precision)</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Local OCR</span>
                      <span className="opacity-75 font-normal">
                        ({ocrData?.ocrConfidence}% confidence{ocrData?.detectedRotation ? `, ${ocrData.detectedRotation}° auto-rotated` : ''})
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Optional AI Tip if local OCR used */}
            {ocrData?.ocrEngine !== 'gemini' && !geminiApiKey && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    {lang === 'gu'
                      ? 'સંપૂર્ણ ૧૦૦% સચોટતા અને વિગતો આપમેળે ભરવા માટે ફ્રી Google Gemini API Key જોડો.'
                      : 'Tip: For 100% precision on handwritten/complex bills, connect a free Google Gemini API Key.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setShowApiKeyInput(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shrink-0 transition"
                >
                  {lang === 'gu' ? '+ કી ઉમેરો' : '+ Add Key'}
                </button>
              </div>
            )}

            {/* Vendor Choice: Existing vs New */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{lang === 'gu' ? 'વેપારી ખાતું પસંદ કરો' : 'Vendor Association'}</span>
              </div>

              {detectedDuplicates.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>
                    {lang === 'gu'
                      ? 'ઓસીઆર વિગતો હયાત વેપારી સાથે મેળ ખાય છે:'
                      : 'OCR matches existing vendor in directory:'}{' '}
                    <strong>{detectedDuplicates[0].vendor.name}</strong>
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 flex-1">
                  <input
                    type="radio"
                    name="vendorChoice"
                    value="existing"
                    checked={vendorChoice === 'existing'}
                    onChange={() => setVendorChoice('existing')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{lang === 'gu' ? 'હયાત વેપારી સાથે જોડો' : 'Associate with Existing Vendor'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 flex-1">
                  <input
                    type="radio"
                    name="vendorChoice"
                    value="new"
                    checked={vendorChoice === 'new'}
                    onChange={() => setVendorChoice('new')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{lang === 'gu' ? 'નવો વેપારી પ્રોફાઇલ બનાવો' : 'Create New Vendor Profile'}</span>
                </label>
              </div>

              {vendorChoice === 'existing' && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('lbl_select_vendor')}
                  </label>
                  <select
                    value={selectedExistingVendorId}
                    onChange={(e) => setSelectedExistingVendorId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="">{t('lbl_select_vendor')}</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.phone ? `(${v.phone})` : ''} {v.city ? `- ${v.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Extracted Fields - Vendor Info (if creating new) */}
            {vendorChoice === 'new' && (
              <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === 'gu' ? 'નવા વેપારીની વિગતો (તપાસો)' : 'New Vendor Details (Extracted)'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_vendor_name')} *
                    </label>
                    <input
                      type="text"
                      value={reviewFields.vendorName}
                      onChange={(e) => setReviewFields({ ...reviewFields, vendorName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_vendor_category')} *
                    </label>
                    <input
                      type="text"
                      list="ocr-vendor-category-presets"
                      value={reviewFields.vendorCategory}
                      onChange={(e) => setReviewFields({ ...reviewFields, vendorCategory: e.target.value })}
                      placeholder="e.g. Raw Materials (pulses and rice merchant)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium text-slate-800"
                    />
                    <datalist id="ocr-vendor-category-presets">
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

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'gu' ? 'સંપર્ક વ્યક્તિ (Contact Person)' : 'Contact Person'}
                    </label>
                    <input
                      type="text"
                      value={reviewFields.contactPerson}
                      onChange={(e) => setReviewFields({ ...reviewFields, contactPerson: e.target.value })}
                      placeholder={lang === 'gu' ? 'દા.ત. વિજયભાઈ' : 'e.g. Vijaybhai'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_phone')}
                    </label>
                    <input
                      type="tel"
                      value={reviewFields.phone}
                      onChange={(e) => setReviewFields({ ...reviewFields, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_gstin')}
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={reviewFields.gstin}
                      onChange={(e) => setReviewFields({ ...reviewFields, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_city')}
                    </label>
                    <input
                      type="text"
                      value={reviewFields.city}
                      onChange={(e) => setReviewFields({ ...reviewFields, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t('lbl_pin_code')}
                    </label>
                    <input
                      type="text"
                      value={reviewFields.pinCode}
                      onChange={(e) => setReviewFields({ ...reviewFields, pinCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Invoice & Amount Breakdown */}
            <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>{lang === 'gu' ? 'ઇન્વૉઇસ વિગતો અને હિસાબ' : 'Invoice & Financial Breakdown'}</span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">
                  * editable inputs for review
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Invoice Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_invoice_no')}
                  </label>
                  <input
                    type="text"
                    value={reviewFields.invoiceNumber}
                    onChange={(e) => setReviewFields({ ...reviewFields, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_invoice_date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewFields.invoiceDate}
                    onChange={(e) => setReviewFields({ ...reviewFields, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_due_date')}
                  </label>
                  <input
                    type="date"
                    value={reviewFields.dueDate}
                    onChange={(e) => setReviewFields({ ...reviewFields, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Taxable Subtotal */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_subtotal')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewFields.taxableAmount}
                    onChange={(e) => setReviewFields({ ...reviewFields, taxableAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* CGST */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_cgst')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewFields.cgst}
                    onChange={(e) => setReviewFields({ ...reviewFields, cgst: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* SGST */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_sgst')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewFields.sgst}
                    onChange={(e) => setReviewFields({ ...reviewFields, sgst: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* IGST */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_igst')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewFields.igst}
                    onChange={(e) => setReviewFields({ ...reviewFields, igst: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('lbl_discount')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewFields.discount}
                    onChange={(e) => setReviewFields({ ...reviewFields, discount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Total Invoice Amount */}
                <div className="sm:col-span-1 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-900 mb-1">
                    {t('lbl_invoice_total')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={reviewFields.totalAmount}
                    onChange={(e) => setReviewFields({ ...reviewFields, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-amber-400 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  />
                </div>
              </div>

              {/* Optional: Link with Daily Expenses */}
              <div className="pt-2 border-t border-slate-200 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={reviewFields.createDailyExpense}
                    onChange={(e) => setReviewFields({ ...reviewFields, createDailyExpense: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>{t('lbl_create_daily_expense')}</span>
                </label>
                {reviewFields.createDailyExpense && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pl-6">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t('lbl_payment_method')}
                      </label>
                      <select
                        value={reviewFields.expensePaymentMethod}
                        onChange={(e) => setReviewFields({ ...reviewFields, expensePaymentMethod: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="credit">{t('pm_credit')}</option>
                        <option value="cash">{t('pm_cash')}</option>
                        <option value="upi">{t('pm_upi')}</option>
                        <option value="bank_transfer">{t('pm_bank_transfer')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success Message */}
        {step === 'success' && successInfo && (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {lang === 'gu' ? 'બિલ સફળતાપૂર્વક સેવ થઈ ગયું!' : 'Bill Saved Successfully!'}
              </h3>
              <p className="text-xs text-slate-600">
                {lang === 'gu'
                  ? `બિલ ${successInfo.bill?.bill_number || ''} વેપારી ${successInfo.vendorName} ના ખાતામાં સેવ કરવામાં આવ્યું છે.`
                  : `Bill ${successInfo.bill?.bill_number || ''} recorded under vendor ${successInfo.vendorName}.`}
              </p>
              {successInfo.linkedExpenseId && (
                <p className="text-[11px] text-amber-700 font-medium">
                  {lang === 'gu' ? 'દૈનિક ખર્ચ હિસાબમાં પણ નોંધ થઈ ગઈ છે.' : 'Linked entry recorded in Daily Expenses module.'}
                </p>
              )}
            </div>
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition"
              >
                {t('btn_confirm')}
              </button>
            </div>
          </div>
        )}

        {/* Footer for Review Step */}
        {step === 'review' && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              {lang === 'gu' ? 'ફરી સ્કેન કરો' : 'Re-scan / Change File'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSave}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('btn_saving')}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'gu' ? 'બિલ સેવ કરો' : 'Confirm & Save Bill'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BillOcrModal;
