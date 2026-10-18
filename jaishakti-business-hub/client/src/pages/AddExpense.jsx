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
  Loader2
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
  const { lang, t, formatINR, formatDate } = useLanguage();
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
            vendor_id: vendorId || null,
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

      // Offer immediate "Add Another" while keeping category for rapid repetition
      setAmount('');
      setDescription('');
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

      if (onSaved) onSaved(res.expense);
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
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 animate-fade-in">
            {/* Header with AI Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{lang === 'gu' ? 'બિલ સ્કેન અને વધારાની વિગતો' : 'Attach Receipt & Additional Details'}</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                {lang === 'gu' ? 'AI ઓટો-ફિલ ઉપલબ્ધ' : 'AI Auto-Fill Enabled'}
              </span>
            </div>

            {/* 1. TOP ATTACH RECEIPT / BILL COMPONENT */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>{t('lbl_attach_receipt_top')}</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {lang === 'gu' ? 'JPG, PNG, PDF (મહત્તમ 10MB)' : 'JPG, PNG, PDF (Max 10MB)'}
                </span>
              </div>

              {/* Hidden Inputs for File and Camera */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleScanReceipt(e.target.files[0]);
                  }
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleScanReceipt(e.target.files[0]);
                  }
                }}
              />

              {/* Upload Zone / Active State / Preview */}
              {scanning ? (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-amber-50/60 rounded-2xl border-2 border-dashed border-amber-400 animate-pulse">
                  <Loader2 className="w-9 h-9 text-amber-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-900">{t('lbl_analyzing_bill')}</p>
                  <p className="text-xs text-slate-600 text-center max-w-md mt-1">
                    {t('lbl_extracting_items')}
                  </p>
                </div>
              ) : receiptFile ? (
                <div className="p-3.5 sm:p-4 bg-amber-50/50 rounded-2xl border border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="w-14 h-14 object-cover rounded-xl border border-amber-200 shrink-0 bg-white shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {receiptFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {lang === 'gu' ? 'જોડાયેલ' : 'Attached'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(receiptFile.size / 1024).toFixed(0)} KB • {lang === 'gu' ? 'બિલ સ્કેન થઈ ચૂક્યું છે' : 'Scanned & Decoded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-xl hover:bg-amber-100/50 transition shadow-xs"
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
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition shadow-xs"
                    >
                      {lang === 'gu' ? 'દૂર કરો' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-amber-50/30 rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-400 transition text-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      {lang === 'gu' ? 'બિલ અપલોડ કરો અથવા ફોટો પાડો' : 'Upload invoice or take a photo'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                      {t('lbl_attach_receipt_sub')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm shadow-amber-500/25 transition active:scale-[0.98]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('btn_choose_file')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition active:scale-[0.98]"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('btn_take_photo')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Duplicate Expense Warning Banner */}
              {duplicateExpense && (
                <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 flex items-start gap-3 shadow-sm">
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
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                  scanMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {scanMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">{scanMessage.text}</p>
                    {scanMessage.details && (
                      <p className="text-[11px] opacity-80 mt-0.5">{scanMessage.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Decoded Items Display */}
              {decodedItems.length > 0 && (
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {t('lbl_decoded_items')} ({decodedItems.length})
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/90 px-2 py-0.5 rounded-full">
                      {lang === 'gu' ? 'નોંધમાં ઉમેરાઈ ગયું' : 'Added to notes'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {decodedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2 rounded-lg border border-amber-200/60 flex items-center justify-between text-xs shadow-xs"
                      >
                        <div className="min-w-0 truncate pr-2">
                          <span className="font-bold text-slate-800">{item.description}</span>
                          {item.quantity && (
                            <span className="ml-1.5 text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                        {(item.amount || item.rate) && (
                          <span className="font-bold text-slate-900 shrink-0">
                            {item.amount ? `₹${item.amount}` : `@ ₹${item.rate}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
