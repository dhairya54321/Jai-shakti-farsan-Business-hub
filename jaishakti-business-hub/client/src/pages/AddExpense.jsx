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
  X,
  Camera,
  Loader2,
  Banknote,
  Smartphone,
  Landmark
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

const PAYMENT_METHODS = [
  { id: 'cash', labelKey: 'pm_cash', icon: Banknote },
  { id: 'upi', labelKey: 'pm_upi', icon: Smartphone },
  { id: 'bank_transfer', labelKey: 'pm_bank_transfer', icon: Landmark },
  { id: 'credit', labelKey: 'pm_credit', icon: Clock },
  { id: 'card', labelKey: 'pm_card', icon: CreditCard },
  { id: 'other', labelKey: 'pm_other', icon: MoreHorizontal }
];

function PaymentMethodDropdown({ paymentMethod, onSelect, lang, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod) || PAYMENT_METHODS[0];
  const SelectedIcon = selectedMethod.icon;

  return (
    <div className="relative" ref={dropdownRef}>
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
          <span className="text-sm font-bold text-slate-900 truncate">
            {t(selectedMethod.labelKey)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 pl-2 shrink-0">
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200/60 hidden xs:inline">
            {lang === 'gu' ? 'બદલો' : 'Change'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in p-1.5 space-y-1">
          {PAYMENT_METHODS.map((pm) => {
            const IconComp = pm.icon;
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => {
                  onSelect(pm.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'hover:bg-amber-50 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-amber-700'
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="truncate font-bold">{t(pm.labelKey)}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 shrink-0 ml-1.5 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AddExpense({ onSaved, initialValues = null, onOpenVoice, onClearInitialValues }) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { user } = useAuth();

  const [mode, setMode] = useState('quick'); // 'quick' | 'detailed'
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [isManualCategorySelect, setIsManualCategorySelect] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paidAmount, setPaidAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [autoMatchedWorker, setAutoMatchedWorker] = useState(null);
  const [isManualWorkerSelect, setIsManualWorkerSelect] = useState(false);
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  // Bill OCR / Scanning State
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [storedFileInfo, setStoredFileInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [decodedItems, setDecodedItems] = useState([]);
  const [duplicateExpense, setDuplicateExpense] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [successKhataNotice, setSuccessKhataNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Add Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, venRes, wrkRes] = await Promise.all([
          apiFetch('/api/categories'),
          apiFetch('/api/vendors'),
          apiFetch('/api/workers')
        ]);
        if (catRes.categories) {
          const active = catRes.categories.filter(c => c.is_active !== 0);
          active.sort((a, b) => {
            const indexA = APPROVED_CATEGORY_CODES.indexOf(a.code);
            const indexB = APPROVED_CATEGORY_CODES.indexOf(b.code);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return (a.sort_order || 99) - (b.sort_order || 99);
          });
          setCategories(active);
          // Pre-select first category if none selected
          if (active.length > 0 && !categoryId) {
            setCategoryId(active[0].id);
          }
        }
        if (venRes.vendors) setVendors(venRes.vendors);
        if (wrkRes.workers) setWorkers(wrkRes.workers.filter(w => w.is_active));
      } catch (e) {
        console.error('Failed to load form prerequisites:', e);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Worker name rectification & matching helper
  const matchWorkerFromText = (text, workersList) => {
    if (!text || typeof text !== 'string' || !workersList || !workersList.length) return null;
    const clean = text.toLowerCase()
      .replace(/[0-9]/g, ' ')
      .replace(/\b(upad|advance|cash|paid|pay|rs|inr|salary|wage|bhai|ben|maharaj|katila|karigar)\b/gi, ' ')
      .replace(/(ઉપાડ|એડવાન્સ|રોકડ|રોકડા|રૂપિયા|પગાર|ભાઈ|બેન|મહારાજ|કારીગર|કાતીલા|આપ્યા|આપ્યો)/g, ' ')
      .trim();

    const tokens = clean.split(/[\s,()/-]+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return null;

    for (const w of workersList) {
      const wLower = (w.name || '').toLowerCase();
      const wParts = wLower.split(/[\s,()/-]+/).filter(p => p.length >= 2);
      for (const tok of tokens) {
        const isMatch = wParts.some(p => p.includes(tok) || tok.includes(p) || (p.length >= 3 && tok.length >= 3 && (p.startsWith(tok.slice(0, 3)) || tok.startsWith(p.slice(0, 3)))));
        if (isMatch) return w;
      }
    }
    return null;
  };

  const [autoDetectedCategory, setAutoDetectedCategory] = useState(null);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isWorkerCategory = selectedCategory && (
    selectedCategory.code === 'worker_advance_upad' ||
    selectedCategory.code === 'worker_wages' ||
    selectedCategory.classification === 'people_wages'
  );

  const isVendorCategory = selectedCategory && [
    'raw_materials',
    'vegetable_purchase',
    'packaging_materials',
    'finished_goods',
    'repairs_maintenance',
    'cleaning_supplies'
  ].includes(selectedCategory.code);

  // Smart auto-rectify/match worker and category whenever description changes
  useEffect(() => {
    if (!description || typeof description !== 'string') return;
    const trimmed = description.trim();
    if (trimmed.length < 2) return;

    // 1. Worker Detection: check if any worker name or upad keyword is typed
    if (workers.length > 0 && !isManualWorkerSelect) {
      const matchedWorker = matchWorkerFromText(trimmed, workers);
      const isUpadKeyword = /\b(upad|advance|karigar|katila|maharaj|કારીગર|ઉપાડ|એડવાન્સ|કાતીલા|મહારાજ|પગાર)\b/i.test(trimmed);

      if (matchedWorker || isUpadKeyword) {
        const workerCat = categories.find(c => c.code === 'worker_advance_upad');
        if (workerCat && categoryId !== workerCat.id) {
          setCategoryId(workerCat.id);
          setAutoDetectedCategory(workerCat);
        }
        if (matchedWorker) {
          setWorkerId(matchedWorker.id);
          setAutoMatchedWorker(matchedWorker);
        }
        return;
      }
    }

    // 2. Category Keyword Auto-Detection if not manual worker select
    if (!isManualWorkerSelect && !isManualCategorySelect) {
      const lower = trimmed.toLowerCase();
      let suggestedCode = null;

      if (/packag|box|pouch|bag|carton|bardana|પેકિંગ|બોક્સ|કોથળી/i.test(lower)) {
        suggestedCode = 'packaging_materials';
      } else if (/finished|khakhra|farsan|sweet|snack|gathiya|sev|chavanu|thepla|થેપલા|તૈયાર|ખાખરા/i.test(lower)) {
        suggestedCode = 'finished_goods';
      } else if (/vegetable|potato|onion|tomato|ginger|chilli|bataka|dungri|shakbhaji|શાકભાજી|બટાકા|ડુંગળી/i.test(lower)) {
        suggestedCode = 'vegetable_purchase';
      } else if (/clean|detergent|soap|acid|phenyl|wipe|સફાઈ|સાબુ|ફિનાઈલ/i.test(lower)) {
        suggestedCode = 'cleaning_supplies';
      } else if (/electric|power|lpg|gas|cylinder|utility|torrent|ugvcl|pgvcl|વીજળી|ગેસ|લાઇટ/i.test(lower)) {
        suggestedCode = 'electricity_utilities';
      } else if (/repair|maint|spare|machine|welding|grease|bearing|સમારકામ|રીપેરીંગ/i.test(lower)) {
        suggestedCode = 'repairs_maintenance';
      } else if (/transport|delivery|freight|tempo|rickshaw|cartage|ટ્રાન્સપોર્ટ|ભાડું|ટેમ્પો|રિક્ષા/i.test(lower)) {
        suggestedCode = 'transport_delivery';
      } else if (/tea|coffee|milk|snack|refreshment|ચા|નાસ્તો|દૂધ|કોફી/i.test(lower)) {
        suggestedCode = 'tea_refreshment';
      } else if (/besan|maida|oil|tel|singtel|sugar|khand|flour|તેલ|લોટ|બેસન|ખાંડ|મેંદો|સીંગતેલ/i.test(lower)) {
        suggestedCode = 'raw_materials';
      }

      if (suggestedCode) {
        const foundCat = categories.find(c => c.code === suggestedCode);
        if (foundCat && categoryId !== foundCat.id) {
          setCategoryId(foundCat.id);
          setAutoDetectedCategory(foundCat);
        }
      }
    }
  }, [description, workers, categories, isManualWorkerSelect, isManualCategorySelect]);

  // Keep worker matched if user switches into worker category manually
  useEffect(() => {
    if (isWorkerCategory && !isManualWorkerSelect && workers.length > 0 && !workerId) {
      const matched = matchWorkerFromText(description, workers);
      if (matched) {
        setWorkerId(matched.id);
        setAutoMatchedWorker(matched);
      }
    }
  }, [isWorkerCategory, isManualWorkerSelect, workers, description, workerId]);

  // Sync initial values if passed from voice modal
  useEffect(() => {
    if (initialValues) {
      if (initialValues.category_id) {
        setCategoryId(initialValues.category_id);
        setIsManualCategorySelect(true);
      }
      if (initialValues.amount) setAmount(String(initialValues.amount));
      if (initialValues.payment_method) setPaymentMethod(initialValues.payment_method);
      if (initialValues.transaction_date) setTransactionDate(initialValues.transaction_date);
      if (initialValues.vendor_id) setVendorId(initialValues.vendor_id);
      if (initialValues.worker_id) {
        setWorkerId(initialValues.worker_id);
        setIsManualWorkerSelect(true);
      }
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

  const mapExtractedToCategory = (extracted, availableCategories) => {
    const text = `${extracted.vendorCategory || ''} ${extracted.vendorName || ''} ${extracted.notes || ''} ${extracted.itemsSummary || ''} ${(extracted.items || []).map(i => i.description).join(' ')}`.toLowerCase();

    if (/packag|box|pouch|bag|carton|bardana|પેકિંગ|બોક્સ|કોથળી/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'packaging_materials');
      if (cat) return cat.id;
    }
    if (/finished|khakhra|farsan|sweet|snack|gathiya|sev|chavanu|thepla|થેપલા|તૈયાર|ખાખરા/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'finished_goods');
      if (cat) return cat.id;
    }
    if (/vegetable|potato|onion|tomato|ginger|chilli|bataka|dungri|shakbhaji|શાકભાજી|બટાકા/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'vegetable_purchase');
      if (cat) return cat.id;
    }
    if (/clean|detergent|soap|acid|phenyl|wipe|સફાઈ|સાબુ/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'cleaning_supplies');
      if (cat) return cat.id;
    }
    if (/electric|power|lpg|gas|cylinder|utility|torrent|ugvcl|pgvcl|વીજળી|ગેસ/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'electricity_utilities');
      if (cat) return cat.id;
    }
    if (/repair|maint|spare|machine|welding|grease|bearing|સમારકામ/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'repairs_maintenance');
      if (cat) return cat.id;
    }
    if (/transport|delivery|freight|tempo|rickshaw|cartage|ટ્રાન્સપોર્ટ|ભાડું/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'transport_delivery');
      if (cat) return cat.id;
    }
    if (/tea|coffee|milk|snack|refreshment|ચા|નાસ્તો/i.test(text)) {
      const cat = availableCategories.find(c => c.code === 'tea_refreshment');
      if (cat) return cat.id;
    }
    const rawCat = availableCategories.find(c => c.code === 'raw_materials');
    return rawCat ? rawCat.id : null;
  };

  const handleScanReceipt = async (file) => {
    if (!file) return;

    setReceiptFile(file);
    if (file.type && file.type.startsWith('image/')) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setScanning(true);
    setScanMessage(null);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('bill', file);
      const activeKey = localStorage.getItem('js_gemini_api_key') || '';
      if (activeKey) {
        formData.append('geminiApiKey', activeKey);
      }

      let res;
      try {
        res = await apiFetch('/api/expenses/scan-receipt', {
          method: 'POST',
          body: formData,
          headers: activeKey ? { 'x-gemini-api-key': activeKey } : {}
        });
      } catch (errScan) {
        console.warn('scan-receipt route note, falling back to /api/vendors/scan-bill:', errScan.message);
        res = await apiFetch('/api/vendors/scan-bill', {
          method: 'POST',
          body: formData,
          headers: activeKey ? { 'x-gemini-api-key': activeKey } : {}
        });
      }

      if (res.file) {
        setStoredFileInfo(res.file);
      }

      const extracted = res.ocr?.extracted || {};
      const itemsList = Array.isArray(extracted.items) ? extracted.items : [];
      setDecodedItems(itemsList);

      // 1. Amount
      if (extracted.totalAmount !== null && extracted.totalAmount !== undefined && Number(extracted.totalAmount) > 0) {
        setAmount(String(extracted.totalAmount));
      }

      // 2. Date
      if (extracted.invoiceDate) {
        setTransactionDate(extracted.invoiceDate);
      }

      // 3. Invoice Number
      if (extracted.invoiceNumber) {
        setInvoiceNumber(extracted.invoiceNumber);
      }

      // 4. Notes & Decoded Items Summary
      if (extracted.notes) {
        setNotes(extracted.notes);
      } else if (extracted.itemsSummary) {
        setNotes(extracted.itemsSummary);
      }

      // 5. Title / Description
      const autoDesc = extracted.vendorName && itemsList.length > 0 && itemsList[0].description
        ? `${itemsList[0].description} - ${extracted.vendorName}`
        : (extracted.vendorName ? `Bill from ${extracted.vendorName}` : (itemsList[0]?.description || ''));
      if (autoDesc) {
        setDescription(autoDesc);
      }

      // 6. Category Auto-detection
      const matchedCatId = mapExtractedToCategory(extracted, categories);
      if (matchedCatId) {
        setCategoryId(matchedCatId);
      }

      // 7. Vendor Matching or Auto-creation
      let matchedVendor = null;
      if (extracted.vendorId) {
        matchedVendor = vendors.find(v => v.id === extracted.vendorId) || { id: extracted.vendorId, name: extracted.vendorName };
      }
      if (!matchedVendor && res.duplicates && res.duplicates.length > 0) {
        matchedVendor = res.duplicates[0].vendor;
      }
      if (!matchedVendor && extracted.vendorName) {
        const cleanName = extracted.vendorName.trim().toLowerCase();
        matchedVendor = vendors.find(v =>
          (v.name && v.name.trim().toLowerCase() === cleanName) ||
          (extracted.gstin && v.gstin && v.gstin.toUpperCase() === extracted.gstin.toUpperCase()) ||
          (extracted.phone && v.phone && v.phone.replace(/\D/g, '') === extracted.phone.replace(/\D/g, '')) ||
          (v.name && cleanName.length >= 4 && (v.name.toLowerCase().includes(cleanName) || cleanName.includes(v.name.toLowerCase())))
        );
      }

      if (matchedVendor) {
        setVendorId(matchedVendor.id);
      } else if (extracted.vendorName && extracted.vendorName.trim()) {
        // Auto-create vendor so it appears in the select dropdown immediately
        try {
          const cleanPhone = extracted.phone ? extracted.phone.replace(/[^0-9]/g, '').slice(-10) : null;
          const validPhone = cleanPhone && cleanPhone.length === 10 ? cleanPhone : null;
          const cleanGstin = extracted.gstin ? extracted.gstin.trim().toUpperCase() : null;
          const validGstin = cleanGstin && cleanGstin.length === 15 ? cleanGstin : null;

          const newVenRes = await apiFetch('/api/vendors', {
            method: 'POST',
            body: JSON.stringify({
              name: extracted.vendorName.trim(),
              category: extracted.vendorCategory || 'Raw Materials',
              phone: validPhone,
              gstin: validGstin,
              address: extracted.address || null,
              city: extracted.city || null,
              state: extracted.state || 'Gujarat',
              allowDuplicate: true
            })
          });
          if (newVenRes.vendor) {
            setVendors(prev => [...prev, newVenRes.vendor]);
            setVendorId(newVenRes.vendor.id);
          }
        } catch (vErr) {
          console.warn('Vendor auto-create note:', vErr.message);
        }
      }

      // 8. Duplicate Expense Detection
      if (res.isDuplicateExpense && res.duplicateExpense) {
        setDuplicateExpense(res.duplicateExpense);
      } else {
        setDuplicateExpense(null);
      }

      const itemCount = itemsList.length;
      const countMsg = itemCount > 0 
        ? (lang === 'gu' ? `${itemCount} વસ્તુઓ અને જથ્થો વિગતોમાં ઉમેરાયો` : `${itemCount} items & quantities decoded into notes`)
        : '';

      if (res.isDuplicateExpense && res.duplicateExpense) {
        setScanMessage({
          type: 'warning',
          text: lang === 'gu'
            ? `ચેતવણી: આ બિલ માટેનો ખર્ચ પહેલેથી જ નોંધાઈ ગયો છે (${res.duplicateExpense.transaction_number})`
            : `Warning: This bill was already recorded (${res.duplicateExpense.transaction_number})`,
          details: lang === 'gu'
            ? `ઇન્વોઇસ #${res.duplicateExpense.invoice_number || 'N/A'}, રકમ ₹${res.duplicateExpense.amount}`
            : `Invoice #${res.duplicateExpense.invoice_number || 'N/A'}, Amount ₹${res.duplicateExpense.amount}`
        });
      } else {
        setScanMessage({
          type: 'success',
          text: lang === 'gu'
            ? `બિલ સ્કેન સફળ! રકમ ${extracted.totalAmount ? '₹' + extracted.totalAmount : ''} અને તમામ વિગતો ભરાઈ ગઈ છે.`
            : `Bill scanned successfully! Amount ${extracted.totalAmount ? '₹' + extracted.totalAmount : ''} and criteria filled.`,
          details: countMsg
        });
      }

    } catch (err) {
      console.error('Scan receipt error:', err);
      setScanMessage({
        type: 'warning',
        text: lang === 'gu'
          ? 'બિલ અસ્પષ્ટ છે અથવા વિગતો સ્કેન કરવામાં વિલંબ થયો. તમે વિગતો જાતે ચકાસીને ભરી શકો છો.'
          : 'Could not auto-extract all fields from bill. Please verify and fill details manually.'
      });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessResult(null);
    setSuccessKhataNotice(null);

    // Validation
    const cleanAmount = typeof amount === 'string' ? amount.replace(/,/g, '').trim() : String(amount);
    const num = parseFloat(cleanAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMessage(lang === 'gu' ? 'કૃપા કરીને સાચી રકમ લખો (૦ થી વધુ).' : 'Please enter a valid positive amount.');
      return;
    }

    if (!categoryId) {
      setErrorMessage(lang === 'gu' ? 'કૃપા કરીને કેટેગરી પસંદ કરો.' : 'Please select an expense category.');
      return;
    }

    if (paymentStatus === 'partially_paid') {
      const cleanPaid = typeof paidAmount === 'string' ? paidAmount.replace(/,/g, '').trim() : String(paidAmount);
      const pNum = parseFloat(cleanPaid);
      if (isNaN(pNum) || pNum <= 0) {
        setErrorMessage(lang === 'gu' ? 'કૃપા કરીને ચૂકવેલ રકમ લખો.' : 'Please enter the paid amount.');
        return;
      }
      if (pNum >= num) {
        setErrorMessage(lang === 'gu' ? 'ચૂકવેલ રકમ કુલ રકમ કરતાં ઓછી હોવી જોઈએ.' : 'Paid amount must be less than total amount for partial payment.');
        return;
      }
    }

    // Resolve final worker id
    let finalWorkerId = workerId;
    if (isWorkerCategory && !finalWorkerId) {
      const autoM = matchWorkerFromText(description, workers);
      if (autoM) finalWorkerId = autoM.id;
    }

    if (isWorkerCategory && !finalWorkerId) {
      setErrorMessage(lang === 'gu' ? 'કૃપા કરીને કારીગર પસંદ કરો.' : 'Please select the worker receiving this advance.');
      return;
    }

    setSubmitting(true);

    try {
      let res;
      if (receiptFile) {
        // Send multipart form-data
        const formData = new FormData();
        formData.append('category_id', categoryId);
        formData.append('amount', cleanAmount);
        formData.append('payment_method', paymentMethod);
        formData.append('payment_status', paymentStatus);
        if (paymentStatus === 'partially_paid') formData.append('paid_amount', paidAmount);
        formData.append('transaction_date', transactionDate);
        if (isWorkerCategory && finalWorkerId) {
          formData.append('worker_id', finalWorkerId);
        } else if (vendorId) {
          formData.append('vendor_id', vendorId);
        }
        if (description) formData.append('description', description);
        if (invoiceNumber) formData.append('invoice_number', invoiceNumber);
        if (referenceNumber) formData.append('reference_number', referenceNumber);
        if (notes) formData.append('notes', notes);
        if (receiptFile) formData.append('receipt', receiptFile);
        if (storedFileInfo?.filename) {
          formData.append('stored_filename', storedFileInfo.filename);
          formData.append('stored_originalname', storedFileInfo.originalname || '');
          formData.append('stored_mimetype', storedFileInfo.mimetype || '');
          formData.append('stored_size', String(storedFileInfo.size || 0));
        }

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
            vendor_id: isWorkerCategory ? null : (vendorId || null),
            worker_id: isWorkerCategory ? finalWorkerId : null,
            description: description || null,
            invoice_number: invoiceNumber || null,
            reference_number: referenceNumber || null,
            notes: notes || null,
            stored_filename: storedFileInfo?.filename || null,
            stored_originalname: storedFileInfo?.originalname || null,
            stored_mimetype: storedFileInfo?.mimetype || null,
            stored_size: storedFileInfo?.size || null
          })
        });
      }

      setSuccessResult(res.expense);
      if (isWorkerCategory && finalWorkerId) {
        const wrk = workers.find(w => w.id === finalWorkerId);
        setSuccessKhataNotice(
          lang === 'gu'
            ? `✓ ખર્ચ ₹${num} સેવ થયો અને કારીગર ${wrk ? wrk.name : ''} ના ખાતાવહીમાં ઉપાડ જમા થયો!`
            : `✓ Expense ₹${num} saved & advance logged into ${wrk ? wrk.name : 'worker'}'s Khata Book!`
        );
      }

      // Offer immediate "Add Another" while keeping category for rapid repetition
      setAmount('');
      setDescription('');
      setVendorId('');
      setWorkerId('');
      setAutoMatchedWorker(null);
      setIsManualWorkerSelect(false);
      setIsManualCategorySelect(false);
      setInvoiceNumber('');
      setReferenceNumber('');
      setNotes('');
      setReceiptFile(null);
      setStoredFileInfo(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setDecodedItems([]);
      setScanMessage(null);
      setDuplicateExpense(null);
      setPaidAmount('');
      setPaymentStatus('paid');

      if (onClearInitialValues) {
        onClearInitialValues();
      }
    } catch (err) {
      if (err.message && (err.message.includes('already been recorded') || err.message.includes('DUPLICATE_EXPENSE'))) {
        setErrorMessage(
          lang === 'gu'
            ? 'તમે આ ખર્ચ પહેલેથી જ અપલોડ કરી ચૂક્યા છો. ડુપ્લિકેટ એન્ટ્રી મંજૂર નથી.'
            : 'You uploaded this expense already. Duplicate entries are not permitted.'
        );
      } else {
        setErrorMessage(err.message || 'Failed to save expense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden File and Camera Inputs - Using offscreen layout to protect iOS WebKit presentation flow */}
      <input
        id="add_expense_file_input"
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
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
        onClick={(e) => {
          e.target.value = '';
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleScanReceipt(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <input
        id="add_expense_camera_input"
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
        onClick={(e) => {
          e.target.value = '';
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleScanReceipt(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Choose File (OCR) */}
          <label
            htmlFor="add_expense_file_input"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-bold shadow-xs shadow-amber-500/20 transition cursor-pointer select-none ${scanning ? 'opacity-50 pointer-events-none' : ''}`}
            title={lang === 'gu' ? 'બિલ સ્કેન કરો (OCR)' : 'Scan Bill with OCR'}
          >
            {scanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{t('btn_choose_file')}</span>
          </label>

          {/* Take Photo (OCR - Direct Native Camera) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer select-none ${scanning ? 'opacity-50 pointer-events-none' : ''}`}
            title={lang === 'gu' ? 'કેમેરાથી બિલનો ફોટો પાડો' : 'Take photo of bill'}
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('btn_take_photo')}</span>
          </button>

          {/* Voice button */}
          <button
            type="button"
            onClick={onOpenVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition cursor-pointer"
          >
            <Mic className="w-4 h-4 text-amber-600" />
            <span>{t('btn_voice_entry')}</span>
          </button>

          {/* Mode switch */}
          <button
            type="button"
            onClick={() => setMode(mode === 'quick' ? 'detailed' : 'quick')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
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

      {/* Active OCR Scanning Banner */}
      {scanning && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 shadow-xs flex items-center gap-3 animate-pulse">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900">{t('lbl_analyzing_bill')}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{t('lbl_extracting_items')}</p>
          </div>
        </div>
      )}

      {/* Attached Receipt / Scanned File Preview Banner */}
      {receiptFile && !scanning && (
        <div className="p-3.5 sm:p-4 bg-amber-50/60 rounded-2xl border border-amber-300/80 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-12 h-12 object-cover rounded-xl border border-amber-200 shrink-0 bg-white shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                  {receiptFile.name}
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'gu' ? 'જોડાયેલ' : 'Attached'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(receiptFile.size / 1024).toFixed(0)} KB • {lang === 'gu' ? 'બિલ સ્કેન સફળ' : 'OCR Decoded'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-xl hover:bg-amber-100/50 transition shadow-2xs cursor-pointer"
            >
              {lang === 'gu' ? 'બદલો' : 'Change'}
            </button>
            <button
              type="button"
              onClick={() => {
                setReceiptFile(null);
                setStoredFileInfo(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setDecodedItems([]);
                setScanMessage(null);
                setDuplicateExpense(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition shadow-2xs cursor-pointer"
            >
              {lang === 'gu' ? 'દૂર કરો' : 'Remove'}
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Expense Warning Banner */}
      {duplicateExpense && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <div className="font-bold text-red-800 text-sm sm:text-base flex items-center gap-1.5">
              <span>{t('msg_duplicate_expense_title')}</span>
            </div>
            <p className="mt-1 text-red-700 leading-relaxed">
              {lang === 'gu'
                ? `આ બિલ/ખર્ચ પહેલેથી જ તારીખ ${formatDate(duplicateExpense.transaction_date)} ના રોજ નોંધાઈ ગયો છે (ઇન્વોઇસ #${duplicateExpense.invoice_number || 'N/A'}, રકમ ${formatINR(duplicateExpense.amount)}, રેફરન્સ: ${duplicateExpense.transaction_number}). ડુપ્લિકેટ એન્ટ્રી મંજૂર નથી.`
                : `An expense for this bill has already been recorded on ${formatDate(duplicateExpense.transaction_date)} (Invoice #${duplicateExpense.invoice_number || 'N/A'}, Amount ${formatINR(duplicateExpense.amount)}, Ref: ${duplicateExpense.transaction_number}). Duplicate entries are not permitted.`}
            </p>
            <div className="mt-2 text-xs font-bold text-red-700 bg-white/80 inline-block px-2.5 py-1 rounded-md border border-red-200">
              {t('btn_duplicate_blocked')}
            </div>
          </div>
        </div>
      )}

      {/* Scan Feedback Banner */}
      {scanMessage && !duplicateExpense && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-fade-in shadow-xs ${
          scanMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          {scanMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold">{scanMessage.text}</p>
            {scanMessage.details && (
              <p className="text-[11px] opacity-80 mt-0.5">{scanMessage.details}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setScanMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Decoded Items Display */}
      {decodedItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 rounded-3xl border-2 border-amber-300 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs font-black text-amber-950">
            <span className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{lang === 'gu' ? 'બિલમાંથી ઓળખાયેલ વસ્તુઓની વિગત (Decoded Particulars)' : 'Decoded Bill Particulars & Items'} ({decodedItems.length})</span>
            </span>
            <span className="text-[11px] text-amber-900 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
              {lang === 'gu' ? 'નોંધમાં આપોઆપ ઉમેરાઈ ગયું' : 'Auto-filled into notes & description'}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-amber-950 font-black border-b border-amber-200">
                <tr>
                  <th className="p-2.5">Particulars (વસ્તુ)</th>
                  <th className="p-2.5 w-24">Qty (જથ્થો)</th>
                  <th className="p-2.5 w-28">Rate (ભાવ)</th>
                  <th className="p-2.5 w-28 text-right">Amount (રકમ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decodedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/40">
                    <td className="p-2.5 font-bold text-slate-800">
                      {item.description}
                    </td>
                    <td className="p-2.5 font-bold text-amber-900">
                      {item.quantity ? `${item.quantity} ${item.unit || ''}` : '—'}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {item.rate ? `₹${item.rate}` : '—'}
                    </td>
                    <td className="p-2.5 text-right font-black text-slate-900">
                      {item.amount ? `₹${item.amount}` : (item.rate && item.quantity ? `₹${(parseFloat(item.rate) * parseFloat(item.quantity)).toFixed(2)}` : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              {successKhataNotice && (
                <div className="text-xs font-bold text-emerald-900 mt-1.5 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300 inline-block shadow-xs">
                  {successKhataNotice}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              + {t('btn_add_another')}
            </button>
            {onSaved && (
              <button
                type="button"
                onClick={() => onSaved(successResult)}
                className="px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                {lang === 'gu' ? 'ડેશબોર્ડ પર જાઓ' : 'Go to Dashboard'}
              </button>
            )}
          </div>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                {t('lbl_expense_title')}
              </label>
              {autoMatchedWorker && (
                <span className="text-[11px] font-bold text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs animate-fade-in">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>{lang === 'gu' ? `ઓળખાયેલ: ${autoMatchedWorker.name.split(' ')[0]} (ઉપાડ)` : `Karigar: ${autoMatchedWorker.name.split(' ')[0]} (Upad)`}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder={t('lbl_expense_title_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white placeholder:text-slate-400 transition"
              autoFocus
            />
          </div>

          {/* 2. Expense Category (1-Tap Selection Grid) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>{t('lbl_category')}</span>
              <span className="text-amber-500">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                const IconComp = ICON_MAP[cat.icon] || Tag;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setIsManualCategorySelect(true);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                    <span className="truncate">{lang === 'gu' ? cat.name_gu : cat.name_en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worker Selector (Dynamic when category is Worker Advance / Upad / Wages) */}
          {isWorkerCategory && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2.5 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'gu' ? 'કારીગર પસંદ કરો (Worker)' : 'Select Worker / Karigar'}</span>
                  <span className="text-red-500">*</span>
                </label>

                {autoMatchedWorker && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'gu' ? `ઓળખાયેલ: ${autoMatchedWorker.name.split(' ')[0]}` : `Auto: ${autoMatchedWorker.name.split(' ')[0]}`}</span>
                  </span>
                )}
              </div>

              {/* Quick 1-Tap Worker Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                {workers.map((w) => {
                  const isSelected = workerId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setWorkerId(w.id);
                        setIsManualWorkerSelect(true);
                        setAutoMatchedWorker(w);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40'
                          : 'bg-white text-slate-700 hover:bg-amber-100/70 border border-slate-200'
                      }`}
                    >
                      <span>{w.name}</span>
                      {w.outstanding_advance > 0 && (
                        <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-800'}`}>
                          ₹{w.outstanding_advance}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Worker Dropdown for comprehensive list */}
              <select
                value={workerId}
                onChange={(e) => {
                  setWorkerId(e.target.value);
                  setIsManualWorkerSelect(true);
                  const found = workers.find(w => w.id === e.target.value);
                  setAutoMatchedWorker(found || null);
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">{lang === 'gu' ? '-- કારીગર પસંદ કરો --' : '-- Select Worker --'}</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.role_title ? `(${w.role_title})` : ''} {w.outstanding_advance > 0 ? `• બાકી ઉપાડ: ₹${w.outstanding_advance}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vendor Selector (Dynamic when category is Raw Materials, Vegetables, Packaging, etc.) */}
          {isVendorCategory && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2.5 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'gu' ? 'વેપારી / સપ્લાયર પસંદ કરો (Vendor)' : 'Select Vendor / Supplier'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer bg-amber-100 hover:bg-amber-200/80 px-2 py-0.5 rounded-full transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'gu' ? 'નવા વેપારી ઉમેરો' : 'Add New'}</span>
                </button>
              </div>

              {/* Quick 1-Tap Vendor Chips (for fast tap) */}
              {vendors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                  {vendors.slice(0, 8).map((v) => {
                    const isSelected = vendorId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVendorId(isSelected ? '' : v.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40'
                            : 'bg-white text-slate-700 hover:bg-amber-100/70 border border-slate-200'
                        }`}
                      >
                        <span>{v.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Vendor Dropdown */}
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">{t('lbl_select_vendor')}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.phone ? `(${v.phone})` : ''} {v.category ? `• ${v.category}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* 4. Payment Method (Clean Dropdown Selector) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>{t('lbl_payment_method')}</span>
              <span className="text-amber-500">*</span>
            </label>
            <PaymentMethodDropdown
              paymentMethod={paymentMethod}
              onSelect={(pmId) => {
                setPaymentMethod(pmId);
                if (pmId === 'credit') setPaymentStatus('unpaid');
                else setPaymentStatus('paid');
              }}
              lang={lang}
              t={t}
            />
          </div>
        </div>

        {/* Section: Additional Detailed Fields (Only in Detailed Mode) */}
        {mode === 'detailed' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 animate-fade-in">
            {/* Header with AI Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{lang === 'gu' ? 'વધારાની હિસાબી વિગતો (તારીખ, વેપારી, UTR)' : 'Additional Accounting Details (Date, Vendor, UTR)'}</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                {lang === 'gu' ? 'વિસ્તૃત મોડ' : 'Detailed Mode'}
              </span>
            </div>

            {/* 2. CRITERIA FIELDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
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

              {/* Optional Vendor Selector for general operating expenses (utilities, transport, maintenance) if not already picked */}
              {!isWorkerCategory && !isVendorCategory && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t('lbl_vendor')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVendorModal(true)}
                      className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5 cursor-pointer"
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
              )}

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lbl_invoice_no')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-9842"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (duplicateExpense && duplicateExpense.invoice_number !== e.target.value) {
                      setDuplicateExpense(null);
                    }
                  }}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {duplicateExpense ? (
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl w-full sm:w-auto">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{t('btn_duplicate_blocked')}</span>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0 || !!duplicateExpense}
            className={`w-full sm:w-auto px-8 py-3.5 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 ${
              duplicateExpense
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-amber-500/25'
            }`}
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
