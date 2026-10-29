import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  Upload,
  Camera,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  Calendar,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export function DiaryScanModal({ isOpen, onClose, workers = [], preselectedWorkerId = null, onImportComplete }) {
  const { lang, t, formatINR, formatDate } = useLanguage();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Steps: 'upload' | 'scanning' | 'review' | 'success'
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  // Parsed OCR data
  const [workerId, setWorkerId] = useState(preselectedWorkerId || '');
  const [diaryPage, setDiaryPage] = useState('');
  const [detectedWorkerName, setDetectedWorkerName] = useState('');
  const [scannedFileInfo, setScannedFileInfo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setFilePreview(null);
      setScanning(false);
      setImporting(false);
      setError('');
      setEntries([]);
      setWorkerId(preselectedWorkerId || (workers.length > 0 ? workers[0].id : ''));
      setDiaryPage('');
      setDetectedWorkerName('');
    }
  }, [isOpen, preselectedWorkerId, workers]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/') && selected.type !== 'application/pdf') {
      setError(lang === 'gu' ? 'કૃપા કરીને ફોટો (JPG, PNG) અથવા PDF ફાઇલ પસંદ કરો.' : 'Please select an image (JPG, PNG) or PDF file.');
      return;
    }

    setFile(selected);
    setError('');

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const handleStartScan = async () => {
    if (!file) {
      setError(lang === 'gu' ? 'કૃપા કરીને પહેલા ચોપડાના પાનાનો ફોટો પસંદ કરો.' : 'Please select a diary page image first.');
      return;
    }

    setScanning(true);
    setStep('scanning');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/api/workers/scan-diary', {
        method: 'POST',
        body: formData
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to scan diary page.');
      }

      setDetectedWorkerName(res.workerName || '');
      setDiaryPage(res.diaryPage || '');
      if (res.file) {
        setScannedFileInfo(res.file);
      }

      // Auto-assign worker if detected
      if (res.matchedWorkerId) {
        setWorkerId(res.matchedWorkerId);
      } else if (res.workerName && workers.length > 0) {
        const lower = res.workerName.toLowerCase();
        const found = workers.find(w => w.name.toLowerCase().includes(lower) || lower.includes(w.name.toLowerCase()));
        if (found) setWorkerId(found.id);
      }

      setEntries((res.entries || []).map(e => ({
        ...e,
        selected: !e.is_carry_forward && e.transaction_type !== 'carry_forward_balance'
      })));
      setStep('review');
    } catch (err) {
      setError(err.message || 'Scanning failed. You can add entries manually.');
      setStep('upload');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateEntry = (index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteRow = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    setEntries(prev => [
      ...prev,
      {
        transaction_date: new Date().toISOString().slice(0, 10),
        transaction_type: 'advance_given',
        category_type: 'cash',
        notes: 'ડાયરી ઉપાડ',
        amount: 500,
        payment_method: 'cash'
      }
    ]);
  };

  const handleImportAll = async () => {
    if (!workerId) {
      setError(lang === 'gu' ? 'કૃપા કરીને કારીગર પસંદ કરો.' : 'Please select a worker for this ledger.');
      return;
    }

    const validEntries = entries.filter(e => e.selected !== false && Number(e.amount) > 0);
    if (validEntries.length === 0) {
      setError(lang === 'gu' ? 'ઓછામાં ઓછી એક એન્ટ્રી પસંદ કરો.' : 'Please select at least one valid entry with amount to import.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const res = await apiFetch('/api/workers/batch-import-ledger', {
        method: 'POST',
        body: JSON.stringify({
          worker_id: workerId,
          entries: validEntries,
          file_info: scannedFileInfo ? {
            ...scannedFileInfo,
            diaryPage: diaryPage || null
          } : null
        })
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to import entries.');
      }

      setImportedCount(res.importedCount || validEntries.length);
      setStep('success');

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err.message || 'Failed to import into ledger.');
    } finally {
      setImporting(false);
    }
  };

  const selectedEntries = entries.filter(e => e.selected !== false);

  const totalAdvanceAmount = entries
    .filter(e => e.selected !== false && (e.transaction_type === 'advance_given' || e.transaction_type === 'carry_forward_balance'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalSalaryAmount = entries
    .filter(e => e.selected !== false && (e.transaction_type === 'salary_paid' || e.transaction_type === 'advance_returned'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
              <Camera className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>{lang === 'gu' ? 'જૂનો ચોપડો / ડાયરી સ્કેન કરો (OCR AI)' : 'Scan Old Diary Page (OCR AI)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/40 border border-amber-300/40 uppercase font-mono tracking-wider">
                  Gemini + OCR
                </span>
              </h3>
              <p className="text-xs text-white/80">
                {lang === 'gu'
                  ? 'પિતાશ્રીની હાથથી લખેલી ડાયરીનો ફોટો પાડીને બધા જૂના વ્યવહારો 1-ક્લિકમાં આયાત કરો.'
                  : 'Upload handwritten staff diary page photo to auto-extract all past ledger entries.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & SELECT */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Native Offscreen Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  border: 0,
                  opacity: 0,
                  pointerEvents: 'none'
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  border: 0,
                  opacity: 0,
                  pointerEvents: 'none'
                }}
              />

              {/* 2 Clean Options: Take Photo & Choose Photo/PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Take Photo */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-amber-400 hover:border-amber-600 bg-amber-50/70 hover:bg-amber-100 flex flex-col items-center justify-center gap-3 transition group active:scale-98 shadow-sm cursor-pointer select-none text-center"
                >
                  <div className="p-3.5 rounded-2xl bg-amber-900 text-amber-200 group-hover:scale-110 transition shadow-sm">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-800 block">
                      {lang === 'gu' ? 'કૅમેરાથી ફોટો લો (Take Photo)' : 'Take Photo'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {lang === 'gu' ? 'ચોપડાના પાનાનો સીધો ફોટો પાડો' : 'Opens camera directly to take photo'}
                    </span>
                  </div>
                </button>

                {/* Option 2: Choose Photo / PDF */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-3 transition group active:scale-98 shadow-sm cursor-pointer select-none text-center"
                >
                  <div className="p-3.5 rounded-2xl bg-slate-200 text-slate-700 group-hover:scale-110 transition shadow-sm">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-800 block">
                      {lang === 'gu' ? 'લાઇબ્રેરી અથવા ફાઇલ પસંદ કરો' : 'Choose from Library or Files'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {lang === 'gu' ? 'ગેલેરી ફોટો અથવા PDF' : 'Photo Library, Gallery, or PDF'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Selected File Banner */}
              {file && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">{file.name}</span>
                    <span className="text-emerald-700 font-normal shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (filePreview) URL.revokeObjectURL(filePreview);
                      setFilePreview(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold shrink-0 ml-2"
                  >
                    {lang === 'gu' ? 'બદલો' : 'Change'}
                  </button>
                </div>
              )}

              {/* Image Preview if selected */}
              {filePreview && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={filePreview}
                    alt="Diary Page Preview"
                    className="w-16 h-20 object-cover rounded-lg border border-slate-300 shadow-sm"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {lang === 'gu' ? 'પસંદ કરેલ ચોપડો તૈયાર છે' : 'Diary page ready for OCR scanning'}
                    </span>
                    <span className="text-slate-400">
                      {file?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Start Scan Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={!file || scanning}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{lang === 'gu' ? 'એઆઈ સ્કેન શરૂ કરો (Start Scan)' : 'Start AI Diary Scan'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING IN PROGRESS */}
          {step === 'scanning' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                {lang === 'gu' ? 'હાથથી લખેલ ડાયરી વંચાઈ રહી છે...' : 'Analyzing handwritten ledger diary...'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {lang === 'gu'
                  ? 'ગુજરાતી/અંગ્રેજી અક્ષરો, તારીખો, ઉપાડ અને ફરસાણની રકમ આપમેળે અલગ તારવવામાં આવી રહી છે.'
                  : 'AI is reading dates, cash advances, farsan items, and amounts from the page.'}
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & BATCH IMPORT TABLE */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Assignment Banner */}
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    {lang === 'gu' ? '૧. આ પાનું કયા કારીગરનું છે? (Select Worker)' : '1. Which worker does this page belong to?'} *
                  </label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="w-full sm:w-80 px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">{lang === 'gu' ? '-- કારીગર પસંદ કરો --' : '-- Select Worker --'}</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.diary_page ? `(ચોપડા પાના ${w.diary_page})` : ''} - {w.role_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36">
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    {lang === 'gu' ? '૨. ચોપડા પાના નં.' : '2. Diary Page No.'}
                  </label>
                  <input
                    type="text"
                    value={diaryPage}
                    onChange={(e) => setDiaryPage(e.target.value)}
                    placeholder={lang === 'gu' ? 'દા.ત. ૧૯' : 'e.g. 19'}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {detectedWorkerName && (
                  <div className="text-xs text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200 shrink-0">
                    <span className="font-bold block">
                      {lang === 'gu' ? 'ડાયરીમાં મળેલું નામ:' : 'Detected Name:'} {detectedWorkerName}
                    </span>
                    {diaryPage && <span>પાના નં.: {diaryPage}</span>}
                  </div>
                )}
              </div>

              {/* Total extracted statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-slate-500 font-semibold block">
                    {lang === 'gu' ? 'કુલ ઉપાડ (Advances):' : 'Total Advances:'}
                  </span>
                  <span className="text-lg font-black text-red-600">
                    {formatINR(totalAdvanceAmount)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-slate-500 font-semibold block">
                    {lang === 'gu' ? 'પગાર / જમા:' : 'Salary / Repaid:'}
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatINR(totalSalaryAmount)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-2 sm:col-span-1 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-semibold block">
                      {lang === 'gu' ? 'કુલ વ્યવહારો:' : 'Total Rows:'}
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {entries.length} {lang === 'gu' ? 'એન્ટ્રી' : 'entries'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'gu' ? 'નવી લીટી' : 'Add Row'}</span>
                  </button>
                </div>
              </div>

              {/* Extracted Rows Table - Mobile scrollable */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto overflow-x-auto shadow-inner bg-slate-50/50">
                <table className="min-w-[680px] w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-2 w-12 text-center">પસંદ</th>
                      <th className="py-2.5 px-3 w-36">તારીખ (Date)</th>
                      <th className="py-2.5 px-3 w-48">પ્રકાર (Type)</th>
                      <th className="py-2.5 px-3">વિગત / આઇટમ (Notes)</th>
                      <th className="py-2.5 px-3 w-32 text-right">રકમ (Amount ₹)</th>
                      <th className="py-2.5 px-2 w-12 text-center">રદ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {entries.map((entry, idx) => (
                      <tr key={idx} className={`transition ${entry.selected === false ? 'opacity-50 bg-slate-50' : 'hover:bg-amber-50/40'}`}>
                        {/* Checkbox */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={entry.selected !== false}
                            onChange={(e) => handleUpdateEntry(idx, 'selected', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            title="Toggle inclusion"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <input
                            type="date"
                            value={entry.transaction_date || ''}
                            onChange={(e) => handleUpdateEntry(idx, 'transaction_date', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs bg-white text-slate-800 focus:ring-1 focus:ring-amber-500"
                          />
                        </td>

                        {/* Type */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <select
                            value={entry.transaction_type}
                            onChange={(e) => handleUpdateEntry(idx, 'transaction_type', e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:ring-1 focus:ring-amber-500 ${
                              entry.transaction_type === 'salary_paid'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : entry.transaction_type === 'advance_returned'
                                ? 'border-purple-300 bg-purple-50 text-purple-800'
                                : entry.transaction_type === 'carry_forward_balance'
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : entry.transaction_type === 'advance_given'
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : 'border-blue-300 bg-blue-50 text-blue-800'
                            }`}
                          >
                            <option value="advance_given">ઉપાડ આપ્યો (Advance)</option>
                            <option value="advance_returned">ઉપાડ કપાત / જમા (Advance Deduction)</option>
                            <option value="salary_paid">પગાર ચૂકવ્યો (Salary)</option>
                            <option value="carry_forward_balance">પાછલો ઉપાડ (Carry Forward)</option>
                            <option value="deduction">કપાત (Deduction)</option>
                            <option value="bonus">બોનસ (Bonus)</option>
                          </select>
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={entry.notes || ''}
                            onChange={(e) => handleUpdateEntry(idx, 'notes', e.target.value)}
                            placeholder="દા.ત. રોકડ ઉપાડ, ૫૦૦ ગ્રામ પાત્રા, પગાર ચૂકતે"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:ring-1 focus:ring-amber-500"
                          />
                          {(entry.is_carry_forward || /પાછલો\s*ઉપાડ|પાછલી\s*નોટ|પાછલી\s*બાકી|carry\s*forward|previous\s*balance/i.test(entry.notes || '')) && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>⚠️ પાછલો ઉપાડ (Carry Forward) — અગાઉનું પાનું સ્કેન થયેલું હોવાથી અનચેક રાખેલ છે</span>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="relative inline-block w-28">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={entry.amount || ''}
                              onChange={(e) => handleUpdateEntry(idx, 'amount', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black text-right focus:ring-1 focus:ring-amber-500 ${
                                entry.transaction_type === 'salary_paid'
                                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-700'
                                  : entry.transaction_type === 'advance_returned'
                                  ? 'border-purple-300 bg-purple-50/60 text-purple-700'
                                  : entry.transaction_type === 'advance_given'
                                  ? 'border-red-300 bg-red-50/60 text-red-600'
                                  : 'border-blue-300 bg-blue-50/60 text-blue-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Delete row */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {lang === 'gu' ? '← બીજો ફોટો પસંદ કરો' : '← Choose another photo'}
                </button>

                <button
                  type="button"
                  onClick={handleImportAll}
                  disabled={importing || selectedEntries.length === 0 || !workerId}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {importing
                      ? (lang === 'gu' ? 'ખાતાવહીમાં આયાત થઈ રહ્યું છે...' : 'Importing to ledger...')
                      : (lang === 'gu' ? `પસંદ કરેલ ${selectedEntries.length} વ્યવહારો ખાતાવહીમાં આયાત કરો` : `Import ${selectedEntries.length} Selected Entries into Ledger`)}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS BANNER */}
          {step === 'success' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                {lang === 'gu' ? 'બધા વ્યવહારો ખાતાવહીમાં સેવ થઈ ગયા!' : 'All Ledger Entries Successfully Imported!'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {lang === 'gu'
                  ? `કુલ ${importedCount} એન્ટ્રીઓ કારીગરના ચોપડા અને પાસબુકમાં અપડેટ થઈ ગઈ છે.`
                  : `Successfully recorded ${importedCount} transactions into the worker passbook & balance.`}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
                >
                  {lang === 'gu' ? 'ખાતાવહી જુઓ (Done)' : 'Done (View Updated Khata)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiaryScanModal;
