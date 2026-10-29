import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
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
  Package,
  Plus,
  Trash2,
  Clock,
  Layers,
  Boxes,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';

const UNIT_OPTIONS = [
  { value: 'kg', labelEn: 'Kilogram (Kg)', labelGu: 'કિલો (Kg)' },
  { value: 'gm', labelEn: 'Gram (gm)', labelGu: 'ગ્રામ (gm)' },
  { value: 'pcs', labelEn: 'Piece (pcs / નંગ)', labelGu: 'નંગ (Piece)' },
  { value: 'no.', labelEn: 'Number (no. / નંગ)', labelGu: 'નંબર / નંગ (no.)' },
  { value: 'pkg', labelEn: 'Packet / Pack (pkg)', labelGu: 'પેકેટ (Pkt)' },
  { value: 'bag', labelEn: 'Bag / Katta (કટ્ટો)', labelGu: 'કટ્ટો / બોરી' },
  { value: 'tin', labelEn: '15kg Tin (ડબ્બો)', labelGu: '૧૫ કિલો ડબ્બો' },
  { value: 'bag_50kg', labelEn: '50kg Bag (કટ્ટો)', labelGu: '૫૦ કિલો કટ્ટો' },
  { value: 'bag_30kg', labelEn: '30kg Bag (કટ્ટો)', labelGu: '૩૦ કિલો કટ્ટો' },
  { value: 'bag_25kg', labelEn: '25kg Bag (કટ્ટો)', labelGu: '૨૫ કિલો કટ્ટો' },
  { value: 'tin_15kg', labelEn: '15kg Tin (ડબ્બો)', labelGu: '૧૫ કિલો ડબ્બો' },
  { value: 'dabba', labelEn: '15kg Dabba (ડબ્બો)', labelGu: '૧૫ કિલો ડબ્બો' },
  { value: 'katta', labelEn: 'Katta (કટ્ટો)', labelGu: 'કટ્ટો' },
  { value: 'pkt', labelEn: 'Packet (પેકેટ)', labelGu: 'પેકેટ (Pkt)' },
  { value: 'piece', labelEn: 'Piece (નંગ)', labelGu: 'નંગ (Piece)' },
  { value: 'box', labelEn: 'Box (પેટી)', labelGu: 'બોક્સ / પેટી' },
  { value: 'ltr', labelEn: 'Liter (Ltr)', labelGu: 'લીટર (Ltr)' },
  { value: 'bottle', labelEn: 'Bottle (બોટલ)', labelGu: 'બોટલ' },
  { value: 'cylinder_19kg', labelEn: '19kg Cylinder', labelGu: '૧૯ કિલો સિલિન્ડર' },
  { value: 'qtl', labelEn: 'Quintal (૧૦૦ કિલો)', labelGu: 'ક્વિન્ટલ (૧૦૦ કિલો)' }
];

function normalizeUnitValue(raw) {
  if (!raw) return 'kg';
  const s = String(raw).trim().toLowerCase();
  if (['kg', 'kgs', 'kilogram', 'kilograms', 'કિલો', 'kilogra'].includes(s) || s.startsWith('kilo')) return 'kg';
  if (['gm', 'g', 'gram', 'grams', 'ગ્રામ'].includes(s)) return 'gm';
  if (['pcs', 'pc', 'piece', 'pieces', 'નંગ', 'પીસ'].includes(s)) return 'pcs';
  if (['no', 'no.', 'nos', 'number', 'numbers'].includes(s)) return 'no.';
  if (['pkg', 'pk', 'pkt', 'packet', 'pack', 'package', 'પેકેટ'].includes(s)) return 'pkg';
  if (['bag', 'bags', 'katta', 'bori', 'કટ્ટો', 'બોરી'].includes(s)) return 'bag';
  if (['tin', 'tins', 'dabba', 'can', 'ડબ્બો'].includes(s)) return 'tin';
  if (['box', 'boxes', 'peti', 'પેટી', 'બોક્સ'].includes(s)) return 'box';
  if (['ltr', 'lt', 'l', 'litre', 'liter', 'litres', 'liters', 'લીટર'].includes(s)) return 'ltr';
  if (['bottle', 'bottles', 'બોટલ'].includes(s)) return 'bottle';
  if (['qtl', 'qtl.', 'quintal', 'quintals', 'ક્વિન્ટલ'].includes(s)) return 'qtl';
  if (['cylinder', 'cylinder_19kg', 'બાટલો', 'સિલિન્ડર'].includes(s)) return 'cylinder_19kg';
  return raw;
}

const RAW_MATERIAL_CATEGORIES = [
  { value: 'oil', labelEn: 'Oils & Ghee', labelGu: 'તેલ અને ઘી' },
  { value: 'flour', labelEn: 'Grains & Flours', labelGu: 'અનાજ અને લોટ' },
  { value: 'spice', labelEn: 'Spices & Seasoning', labelGu: 'મરી-મસાલા' },
  { value: 'vegetable', labelEn: 'Vegetables & Produce', labelGu: 'શાકભાજી' },
  { value: 'packaging', labelEn: 'Packaging Materials', labelGu: 'પેકિંગ સામગ્રી' },
  { value: 'trading', labelEn: 'Trading / Resale Goods', labelGu: 'તૈયાર માલ / રિસેલ' },
  { value: 'fuel', labelEn: 'Fuel & Gas', labelGu: 'ગેસ અને ઈંધણ' },
  { value: 'other', labelEn: 'Other Raw Materials', labelGu: 'અન્ય સામગ્રી' }
];

/**
 * Enhanced keyword and fuzzy matching to map raw text / OCR line items
 * directly to the 28 real raw materials in the Jai Shakti database.
 */
function matchItemToRawMaterial(desc, materials = []) {
  if (!desc || !materials || materials.length === 0) return null;
  const d = desc.toLowerCase().trim();

  // 1. Direct equality or substring match with material names
  const directMatch = materials.find(m => {
    const me = (m.name_en || '').toLowerCase().trim();
    const mg = (m.name_gu || '').trim();
    if (me && (d === me || d.includes(me) || (d.length >= 3 && me.includes(d)))) return true;
    if (mg && (d === mg || d.includes(mg) || (d.length >= 2 && mg.includes(d)))) return true;
    return false;
  });
  if (directMatch) return directMatch;

  const rules = [
    { id: 'rm_sugar_pulverised_25kg', terms: ['pulverised', 'pulverized', 'દળેલી ખાંડ', 'sugar pulverised', 'powder 25', 'powder (25kg)', 'powder.(25kg)', 'pulverised powder'] },
    { id: 'rm_sugar_kata_50kg', terms: ['sugar kata', 'kata 50', '50 kg sugar', 'shakar', 'sakkar', 'kata (50 kg)', 'kata.(50 kg)', 'sugar', 'ખાંડ'] },
    { id: 'rm_cottonseed_rani_15kg', terms: ['rani', 'cottonseed', 'cotton', 'કપાસિયા', 'રાણી', 'raani', 'c.oil', 'oil 15', '15kg tin', '15 kg tin'] },
    { id: 'rm_ghee_motherdairy_15kg', terms: ['mother dairy', 'motherdairy', 'pure ghee', 'dairy ghee', 'ઘી', 'ghee'] },
    { id: 'rm_maida_50kg', terms: ['maida', 'મેંદો', 'મેંદા', '50kg maida', 'flour'] },
    { id: 'rm_chana_dal_30kg', terms: ['chana dal', 'chana', 'ચણા દાળ', 'ચણાદાળ', 'ચણા'] },
    { id: 'rm_moong_doller_30kg', terms: ['moong', 'doller', 'મગ', 'મૂંગ', 'mung'] },
    { id: 'rm_potatoes_fresh', terms: ['potato', 'potatoes', 'બટાકા', 'બટાટા', 'alu', 'bataka'] },
    { id: 'rm_kopra_sali_5pct', terms: ['kopra', 'sali', 'કોપરા', 'સાલી', 'coconut', 'sali 5'] },
    { id: 'rm_pkg_pp_18x24', terms: ['18*24', '18x24', '18 x 24', '18/24'] },
    { id: 'rm_pkg_pp_8x10', terms: ['8*10', '8x10', '8 x 10', '8/10'] },
    { id: 'rm_pkg_pp_5x7', terms: ['5*7', '5x7', '5 x 7', '5/7'] },
    { id: 'rm_pkg_pp_6x8', terms: ['6*8', '6x8', '6 x 8', '6/8'] },
    { id: 'rm_pkg_bio_9x13', terms: ['9*13', '9x13', '9 x 13', 'bio'] },
    { id: 'rm_pkg_pouches_6x6', terms: ['6*6', '6x6', 'pouch', 'pouches'] },
    { id: 'rm_pkg_w_4x6', terms: ['4*6', '4x6', 'w. 4x6', 'w 4x6'] },
    { id: 'rm_pkg_cups_5x7', terms: ['cups', 'cup', 'કપ'] },
    { id: 'rm_pkg_bag_16x20', terms: ['16*20', '16x20', '16 x 20'] },
    { id: 'rm_pkg_dori_14', terms: ['dori', 'દોરી', '14 dori'] },
    { id: 'rm_pkg_pp_general', terms: ['pp bag', 'packaging', 'પ્લાસ્ટિક', 'plastic'] },
    { id: 'rm_trd_thepla', terms: ['thepla', 'થેપલા', 'થેપલાં'] },
    { id: 'rm_trd_khakhra_methi', terms: ['methi khakhra', 'મેથી ખાખરા', 'methi'] },
    { id: 'rm_trd_khakhra_masala', terms: ['masala khakhra', 'મસાલા ખાખરા', 'masala'] },
    { id: 'rm_trd_khakhra_jeera', terms: ['jeera khakhra', 'જીરા ખાખરા', 'jeera'] },
    { id: 'rm_trd_mag_jor', terms: ['mag jor', 'મગ જોર'] },
    { id: 'rm_trd_chana_jor', terms: ['chana jor', 'ચણા જોર'] },
    { id: 'rm_trd_mari_papad', terms: ['mari papad', 'મરી પાપડ', 'papad', 'પાપડ'] },
    { id: 'rm_trd_water_bottles', terms: ['water bottle', 'water', 'બોટલ', 'પાણી'] }
  ];

  for (const rule of rules) {
    if (rule.terms.some(t => d.includes(t))) {
      const found = materials.find(m => m.id === rule.id);
      if (found) return found;
    }
  }

  // Token fallback match
  for (const m of materials) {
    const enTokens = (m.name_en || '').toLowerCase().split(/[\s,()\-]+/).filter(t => t.length > 2);
    const guTokens = (m.name_gu || '').split(/[\s,()\-]+/).filter(t => t.length > 2);
    if (enTokens.some(t => d.includes(t)) || guTokens.some(t => d.includes(t))) {
      return m;
    }
  }

  return null;
}

export function BillOcrModal({ isOpen, onClose, onBillSaved, vendors = [] }) {
  const { lang, t, formatINR } = useLanguage();

  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
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

  // Vendor list & choice
  const [vendorList, setVendorList] = useState(vendors || []);
  const [vendorChoice, setVendorChoice] = useState('new'); // 'existing' | 'new'
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
    paymentStatus: 'unpaid', // 'paid' | 'unpaid'
    paidAmount: '0',
    notes: '',
    createDailyExpense: true,
    expensePaymentMethod: 'credit'
  });

  const [fieldConfidence, setFieldConfidence] = useState({});
  const [detectedDuplicates, setDetectedDuplicates] = useState([]);

  // Raw Materials Inward Stock Integration
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [inwardStockItems, setInwardStockItems] = useState([]);
  const [autoIncrementStock, setAutoIncrementStock] = useState(true);

  // Duplicate Record Guard (Record Book double entry denial)
  const [duplicateRecord, setDuplicateRecord] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Modal to Add New Raw Material on-the-fly
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [targetItemIdxForNewMaterial, setTargetItemIdxForNewMaterial] = useState(null);
  const [newMaterialForm, setNewMaterialForm] = useState({
    name_en: '',
    name_gu: '',
    category: 'flour',
    primary_unit: 'kg',
    base_unit: 'kg',
    unit_ratio: 1,
    min_stock_threshold: 5
  });
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  // Load vendors & materials when opened
  useEffect(() => {
    if (isOpen) {
      if (!vendors || vendors.length === 0) {
        apiFetch('/api/vendors')
          .then(res => {
            if (res.vendors) setVendorList(res.vendors);
          })
          .catch(() => {});
      } else {
        setVendorList(vendors);
      }

      apiFetch('/api/manufacturing/materials')
        .then(res => {
          if (res.success && res.materials) {
            setAvailableMaterials(res.materials);
          }
        })
        .catch(err => console.warn('Could not load materials for bill OCR:', err.message));
    }
  }, [isOpen, vendors]);

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
    setInwardStockItems([]);
    setAutoIncrementStock(true);
    setDuplicateRecord(null);
    setCheckingDuplicate(false);
    setShowAddMaterialModal(false);
  };

  // Live Record-Book Duplicate Verification
  useEffect(() => {
    if (step !== 'review') return;
    const inv = (reviewFields.invoiceNumber || '').trim();
    const vendorId = vendorChoice === 'existing' ? selectedExistingVendorId : null;
    const vendorName = vendorChoice === 'new' ? reviewFields.vendorName : (vendorList.find(v => v.id === selectedExistingVendorId)?.name || reviewFields.vendorName);
    const date = reviewFields.invoiceDate;
    const amt = reviewFields.totalAmount;

    // Only query if we have at least an invoice number or (vendor + date + amount)
    if (!inv && (!vendorId && !vendorName)) {
      setDuplicateRecord(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const res = await apiFetch('/api/vendors/bills/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({
            vendor_id: vendorId,
            vendor_name: vendorName,
            gstin: reviewFields.gstin,
            bill_number: inv,
            bill_date: date,
            total_amount: amt,
            stored_filename: storedFileInfo ? storedFileInfo.filename : null
          })
        });
        if (res.isDuplicate && res.duplicate) {
          setDuplicateRecord({
            ...res.duplicate,
            message: res.message
          });
        } else {
          setDuplicateRecord(null);
        }
      } catch (err) {
        console.warn('Live duplicate check failed:', err);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    step,
    reviewFields.invoiceNumber,
    reviewFields.vendorName,
    selectedExistingVendorId,
    vendorChoice,
    reviewFields.invoiceDate,
    reviewFields.totalAmount,
    reviewFields.gstin,
    storedFileInfo
  ]);

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

      // Duplicate Record Guard check from OCR
      if (res.isDuplicateBill && res.duplicateBill) {
        setDuplicateRecord({
          ...res.duplicateBill,
          message: res.duplicateMessage || res.duplicateBill.message
        });
      } else {
        setDuplicateRecord(null);
      }

      // Vendor matching
      if (extracted.vendorId) {
        setVendorChoice('existing');
        setSelectedExistingVendorId(extracted.vendorId);
        setDetectedDuplicates([]);
      } else if (res.duplicates && res.duplicates.length > 0) {
        // Only treat as existing if there is an exact GSTIN/phone match or exact name match
        const exactDupes = res.duplicates.filter(d => 
          d.matchedFields?.includes('gstin') || 
          d.matchedFields?.includes('phone') || 
          (d.matchedFields?.includes('name') && (d.vendor?.name || '').toLowerCase().trim().replace(/^m\/s\.?\s*/i, '') === (extracted.vendorName || '').toLowerCase().trim().replace(/^m\/s\.?\s*/i, ''))
        );
        if (exactDupes.length > 0) {
          setDetectedDuplicates(exactDupes);
          setVendorChoice('existing');
          setSelectedExistingVendorId(exactDupes[0].vendor.id);
        } else {
          setDetectedDuplicates([]);
          setVendorChoice('new');
          setSelectedExistingVendorId('');
        }
      } else {
        const extractedName = (extracted.vendorName || '').toLowerCase().trim().replace(/^m\/s\.?\s*/i, '');
        const found = vendorList.find(v => {
          const vName = (v.name || '').toLowerCase().trim().replace(/^m\/s\.?\s*/i, '');
          return extractedName && vName === extractedName;
        });
        if (found) {
          setVendorChoice('existing');
          setSelectedExistingVendorId(found.id);
          setDetectedDuplicates([]);
        } else {
          setVendorChoice('new');
          setSelectedExistingVendorId('');
          setDetectedDuplicates([]);
        }
      }

      const isPaid = extracted.paymentStatus === 'paid';
      const parsedTotal = extracted.totalAmount !== null && extracted.totalAmount !== undefined ? String(extracted.totalAmount) : '';

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
        totalAmount: parsedTotal,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        paidAmount: isPaid ? parsedTotal : '0',
        notes: extracted.notes || '',
        createDailyExpense: true,
        expensePaymentMethod: isPaid ? 'cash' : 'credit'
      });

      // Parse and match line-items against raw materials
      const rawItems = Array.isArray(extracted.items) ? extracted.items : [];
      const parsed = [];
      for (const it of rawItems) {
        const desc = (it.description || '').trim();
        const matchedMat = matchItemToRawMaterial(desc, availableMaterials);
        const numQty = parseFloat(String(it.quantity || '').replace(/[^0-9.]/g, '')) || 1;

        parsed.push({
          raw_material_id: matchedMat?.id || '',
          material_name: matchedMat ? `${matchedMat.name_gu} (${matchedMat.name_en})` : desc,
          detected_desc: desc,
          quantity: numQty,
          unit: matchedMat?.primary_unit || normalizeUnitValue(it.unit) || 'kg',
          rate: it.rate !== null && it.rate !== undefined ? it.rate : '',
          amount: it.amount !== null && it.amount !== undefined ? it.amount : '',
          inward_enabled: true
        });
      }

      setInwardStockItems(parsed);
      setStep('review');
    } catch (err) {
      console.error('Scan bill error:', err);
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

  const handleOpenAddMaterialModal = (itemIdx = null, prefillName = '') => {
    setTargetItemIdxForNewMaterial(itemIdx);
    setNewMaterialForm({
      name_en: prefillName || '',
      name_gu: prefillName || '',
      category: 'flour',
      primary_unit: 'kg',
      base_unit: 'kg',
      unit_ratio: 1,
      min_stock_threshold: 5
    });
    setShowAddMaterialModal(true);
  };

  const handleCreateNewMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialForm.name_en.trim() || !newMaterialForm.name_gu.trim()) {
      alert(lang === 'gu' ? 'કૃપા કરીને અંગ્રેજી અને ગુજરાતી બંને નામ દાખલ કરો.' : 'Please provide both English and Gujarati names.');
      return;
    }

    setCreatingMaterial(true);
    try {
      const res = await apiFetch('/api/manufacturing/materials', {
        method: 'POST',
        body: JSON.stringify(newMaterialForm)
      });

      if (res.success && res.material) {
        const created = res.material;
        setAvailableMaterials(prev => [...prev, created]);

        if (targetItemIdxForNewMaterial !== null) {
          setInwardStockItems(prev => {
            const next = [...prev];
            next[targetItemIdxForNewMaterial] = {
              ...next[targetItemIdxForNewMaterial],
              raw_material_id: created.id,
              material_name: `${created.name_gu} (${created.name_en})`,
              unit: created.primary_unit
            };
            return next;
          });
        } else {
          setInwardStockItems(prev => [
            ...prev,
            {
              raw_material_id: created.id,
              material_name: `${created.name_gu} (${created.name_en})`,
              detected_desc: created.name_en,
              quantity: 1,
              unit: created.primary_unit,
              rate: '',
              amount: '',
              inward_enabled: true
            }
          ]);
        }

        setShowAddMaterialModal(false);
        setTargetItemIdxForNewMaterial(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to create raw material');
    } finally {
      setCreatingMaterial(false);
    }
  };

  const itemsTotalSum = useMemo(() => {
    return inwardStockItems.reduce((acc, it) => {
      const amt = parseFloat(it.amount);
      if (!isNaN(amt)) return acc + amt;
      const q = parseFloat(it.quantity);
      const r = parseFloat(it.rate);
      if (!isNaN(q) && !isNaN(r)) return acc + (q * r);
      return acc;
    }, 0);
  }, [inwardStockItems]);

  const handleUpdateItemField = (idx, field, value) => {
    setInwardStockItems(prev => {
      const next = [...prev];
      const current = { ...next[idx], [field]: value };

      if (field === 'detected_desc') {
        const val = String(value || '').trim();
        const matched = matchItemToRawMaterial(val, availableMaterials);
        if (matched) {
          current.raw_material_id = matched.id;
          current.material_name = `${matched.name_gu} (${matched.name_en})`;
          if (!current.unit) {
            current.unit = matched.primary_unit || 'kg';
          }
        }
      }

      if (field === 'raw_material_id') {
        const sel = availableMaterials.find(m => m.id === value);
        if (sel) {
          current.material_name = `${sel.name_gu} (${sel.name_en})`;
          current.unit = sel.primary_unit || current.unit || 'kg';
          if (!current.detected_desc || current.detected_desc === 'Manual Line Item') {
            current.detected_desc = sel.name_en;
          }
        } else {
          current.raw_material_id = '';
          current.material_name = '';
        }
      }

      // Auto recalculate amount if quantity or rate changed
      if (field === 'quantity' || field === 'rate') {
        const q = parseFloat(current.quantity);
        const r = parseFloat(current.rate);
        if (!isNaN(q) && !isNaN(r) && q >= 0 && r >= 0) {
          current.amount = (q * r).toFixed(2);
        }
      }

      // If user directly edits amount, auto recalculate rate if qty > 0
      if (field === 'amount') {
        const a = parseFloat(current.amount);
        const q = parseFloat(current.quantity);
        if (!isNaN(a) && !isNaN(q) && q > 0) {
          current.rate = (a / q).toFixed(2);
        }
      }

      next[idx] = current;
      return next;
    });
  };

  const handleAddItemRow = () => {
    setInwardStockItems(prev => [
      ...prev,
      {
        raw_material_id: '',
        material_name: '',
        detected_desc: '',
        quantity: 1,
        unit: 'kg',
        rate: '',
        amount: '',
        inward_enabled: true
      }
    ]);
  };

  const handleConfirmSave = async () => {
    if (duplicateRecord) {
      setErrorMessage(
        lang === 'gu'
          ? 'આ બિલ પહેલેથી જ ચોપડે નોંધાયેલ હોવાથી ડબલ એન્ટ્રી સેવ કરી શકાશે નહીં.'
          : 'Cannot save duplicate bill. This bill has already been recorded in the system.'
      );
      return;
    }

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
        const safeTrim = (val) => (val && typeof val === 'string' ? val.trim() : '');
        const vName = safeTrim(reviewFields.vendorName);
        if (!vName) {
          throw new Error(lang === 'gu' ? 'વેપારીનું નામ જરૂરી છે.' : 'Vendor name is required.');
        }

        const newVendorRes = await apiFetch('/api/vendors', {
          method: 'POST',
          body: JSON.stringify({
            name: vName,
            category: safeTrim(reviewFields.vendorCategory) || 'Raw Materials',
            contact_person: safeTrim(reviewFields.contactPerson) || null,
            phone: safeTrim(reviewFields.phone) || null,
            email: safeTrim(reviewFields.email) || null,
            address: safeTrim(reviewFields.address) || null,
            city: safeTrim(reviewFields.city) || null,
            state: safeTrim(reviewFields.state) || 'Gujarat',
            pin_code: safeTrim(reviewFields.pinCode) || null,
            gstin: safeTrim(reviewFields.gstin) || null,
            pan: safeTrim(reviewFields.pan) || null,
            allowDuplicate: true
          })
        });

        if (!newVendorRes.vendor || !newVendorRes.vendor.id) {
          throw new Error('Failed to create new vendor profile.');
        }
        finalVendorId = newVendorRes.vendor.id;
        setVendorList(prev => [...prev, newVendorRes.vendor]);
      }

      if (!finalVendorId) {
        throw new Error(lang === 'gu' ? 'કૃપા કરીને વેપારી પસંદ કરો.' : 'Please select or create a vendor.');
      }

      // Filter active inward stock items
      const activeInwardItems = autoIncrementStock
        ? inwardStockItems
            .filter(it => it.inward_enabled && it.raw_material_id)
            .map(it => ({
              raw_material_id: it.raw_material_id,
              material_name: it.material_name,
              quantity: parseFloat(it.quantity) || 1,
              unit: it.unit || 'kg',
              rate: it.rate ? parseFloat(it.rate) : null,
              amount: it.amount ? parseFloat(it.amount) : null,
              notes: it.detected_desc || ''
            }))
        : [];

      // Construct definitive line items list reflecting all user edits
      const finalItemsList = inwardStockItems.map(it => {
        const qty = parseFloat(it.quantity) || 1;
        const rate = it.rate !== '' && it.rate !== null && it.rate !== undefined ? parseFloat(it.rate) : null;
        const amt = it.amount !== '' && it.amount !== null && it.amount !== undefined
          ? parseFloat(it.amount)
          : (rate !== null ? Math.round(qty * rate * 100) / 100 : null);
        return {
          description: (it.detected_desc || it.material_name || 'Item').trim(),
          quantity: qty,
          unit: it.unit || 'kg',
          rate: rate,
          amount: amt
        };
      });

      // Construct dynamic items summary
      const dynamicItemsSummary = finalItemsList.map(it => {
        const rateStr = it.rate !== null ? ` @ ${Number(it.rate).toFixed(2)}` : '';
        const amtStr = it.amount !== null ? ` = ${Number(it.amount).toFixed(2)}` : '';
        return `- ${it.description}: ${it.quantity} ${it.unit}${rateStr}${amtStr}`;
      }).join('\n');

      // Preserve user custom remarks while updating items list
      let finalNotes = reviewFields.notes || '';
      if (dynamicItemsSummary) {
        if (finalNotes.includes('- ') || !finalNotes) {
          const userRemarks = finalNotes
            .split('\n')
            .filter(line => !line.trim().startsWith('-'))
            .join('\n')
            .trim();
          finalNotes = userRemarks ? `${dynamicItemsSummary}\n\n${userRemarks}` : dynamicItemsSummary;
        } else {
          finalNotes = `${dynamicItemsSummary}\n\n${finalNotes}`;
        }
      }

      // Reconstruct ocr_raw_text with edited items, rates, quantities, and totals
      let updatedOcrJson = null;
      try {
        const base = ocrData && ocrData.rawText ? JSON.parse(ocrData.rawText) : {};
        base.items = finalItemsList;
        base.totalAmount = total;
        base.subtotal = itemsTotalSum > 0 ? itemsTotalSum : total;
        base.itemsSummary = dynamicItemsSummary;
        base.notes = finalNotes;
        updatedOcrJson = JSON.stringify(base, null, 2);
      } catch (_) {
        updatedOcrJson = JSON.stringify({
          items: finalItemsList,
          totalAmount: total,
          subtotal: itemsTotalSum > 0 ? itemsTotalSum : total,
          itemsSummary: dynamicItemsSummary,
          notes: finalNotes
        }, null, 2);
      }

      const finalSubtotal = itemsTotalSum > 0
        ? itemsTotalSum
        : (parseFloat(reviewFields.subtotal) || total);

      // Determine payment amount & method
      let paidAmt = 0;
      let expMethod = reviewFields.expensePaymentMethod;
      if (reviewFields.paymentStatus === 'paid') {
        paidAmt = parseFloat(reviewFields.paidAmount) || total;
        if (expMethod === 'credit') expMethod = 'cash';
      } else {
        paidAmt = parseFloat(reviewFields.paidAmount) || 0;
        expMethod = 'credit';
      }

      // Save Bill with 3-way atomic sync
      const billPayload = {
        vendor_id: finalVendorId,
        bill_number: reviewFields.invoiceNumber || null,
        bill_date: reviewFields.invoiceDate || null,
        due_date: reviewFields.dueDate || null,
        po_number: reviewFields.poNumber || null,
        subtotal: finalSubtotal,
        taxable_amount: reviewFields.taxableAmount || finalSubtotal,
        cgst: reviewFields.cgst || null,
        sgst: reviewFields.sgst || null,
        igst: reviewFields.igst || null,
        other_charges: reviewFields.otherCharges || null,
        discount: reviewFields.discount || null,
        total_amount: total,
        paid_amount: paidAmt,
        notes: finalNotes || null,
        ocr_status: ocrData ? ocrData.ocrStatus : 'manual',
        ocr_confidence: ocrData ? ocrData.ocrConfidence : null,
        ocr_raw_text: updatedOcrJson,
        stored_filename: storedFileInfo ? storedFileInfo.filename : null,
        stored_originalname: storedFileInfo ? storedFileInfo.originalname : (selectedFile ? selectedFile.name : null),
        stored_mimetype: storedFileInfo ? storedFileInfo.mimetype : (selectedFile ? selectedFile.type : null),
        create_daily_expense: reviewFields.createDailyExpense,
        expense_category_id: 'cat_raw_materials',
        expense_payment_method: expMethod,
        inward_stock_items: activeInwardItems
      };

      const billRes = await apiFetch('/api/vendors/bills', {
        method: 'POST',
        body: JSON.stringify(billPayload)
      });

      setSuccessInfo({
        bill: billRes.bill,
        vendorName: vendorChoice === 'new'
          ? reviewFields.vendorName
          : (vendorList.find(v => v.id === finalVendorId)?.name || reviewFields.vendorName),
        linkedExpenseId: billRes.linkedExpenseId,
        stockUpdated: billRes.stockUpdated || activeInwardItems.length,
        inwardItems: activeInwardItems,
        totalAmount: total,
        paidAmount: paidAmt,
        paymentStatus: reviewFields.paymentStatus
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
              <Camera className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  📸 Ultimate OCR Scan (બિલ સ્કેન)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
                  3-Way Sync
                </span>
              </div>
              <p className="text-[11px] text-amber-200 font-medium">
                {lang === 'gu'
                  ? 'ખર્ચ • વેપારી ખાતાવહી • કાચો માલ સ્ટોક આપોઆપ અપડેટ થશે'
                  : 'Automated 3-Way Atomic Sync: Expenses • Vendor Ledger • Physical Stock'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload or Capture */}
        {step === 'upload' && (
          <div className="p-6 sm:p-8 text-center space-y-6 overflow-y-auto">
            <div className="max-w-md mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 inline-block">
                All Formats Supported
              </span>
              <h3 className="text-lg font-black text-slate-800">
                {lang === 'gu' ? 'બિલ, પહોંચ અથવા ચલણ અપલોડ કરો' : 'Upload or Capture Bill / Invoice / Challan'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'gu'
                  ? 'તેલ, ઘી, લોટ, દાળ, શાકભાજી કે પેકિંગનું કોઈપણ બિલ, GST ઇન્વૉઇસ અથવા હાથે લખેલ ચલણ સ્કેન કરો.'
                  : 'Supports any printed bill, GST invoice, cash memo, or handwritten delivery challan (Gujarati / Hindi / English).'}
              </p>
            </div>

            {/* AI Engine Status & Key Config */}
            <div className="max-w-lg mx-auto p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${geminiApiKey ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      {geminiApiKey
                        ? (lang === 'gu' ? 'ગુગલ જેમિની AI વિઝન મોડેલ સક્રિય' : 'Google Gemini AI Vision Active')
                        : (lang === 'gu' ? 'લોકલ ઓટો-ઓરિએન્ટેશન OCR સક્રિય' : 'Local Auto-Orientation OCR Active')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {geminiApiKey
                        ? (lang === 'gu' ? '૧૦૦% સચોટતા સાથે તમામ આઇટમો અને સ્ટોક આપોઆપ વાંચશે' : 'Direct Vision AI extraction — 100% precision')
                        : (lang === 'gu' ? '૧૦૦% સચોટતા અને હાથે લખેલ ગુજરાતી માટે જેમિની કી જોડો' : 'For 100% precision on handwritten bills, add a Gemini Key')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(prev => !prev)}
                  className="px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition flex items-center gap-1 shrink-0"
                >
                  <Key className="w-3 h-3" />
                  <span>{geminiApiKey ? (lang === 'gu' ? 'કી બદલો' : 'Change Key') : (lang === 'gu' ? '+ API Key' : '+ Add Key')}</span>
                  {showApiKeyInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showApiKeyInput && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{lang === 'gu' ? 'Google AI Studio ફ્રી API કી (AIzaSy...):' : 'Google AI Studio Free API Key (AIzaSy...):'}</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline flex items-center gap-1"
                    >
                      <span>Get Free Key</span>
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyInputVal}
                      onChange={(e) => setKeyInputVal(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition"
                    >
                      Save Key
                    </button>
                  </div>
                  {keySavedMessage && (
                    <p className="text-[11px] text-emerald-600 font-bold">API Key saved successfully!</p>
                  )}
                </div>
              )}
            </div>

            {/* Exactly 2 Clean Options: Take Photo & Choose from Library or Files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* Option 1: Take Photo (Direct Camera Launch, Zero Popups) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-6 sm:p-7 rounded-3xl border-2 border-dashed border-amber-400 hover:border-amber-600 bg-amber-50/80 hover:bg-amber-100 flex flex-col items-center justify-center gap-3 transition group active:scale-98 shadow-sm cursor-pointer select-none text-center"
              >
                <div className="p-4 rounded-2xl bg-amber-900 text-amber-200 group-hover:scale-110 transition shadow-sm">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black text-slate-900 block">
                    {lang === 'gu' ? 'કૅમેરાથી ફોટો લો (Take Photo)' : 'Take Photo'}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    {lang === 'gu' ? 'બિલનો સીધો ફોટો પાડો' : 'Opens camera directly to take photo'}
                  </span>
                </div>
              </button>

              {/* Option 2: Choose from Library or Files */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-6 sm:p-7 rounded-3xl border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-3 transition group active:scale-98 shadow-sm cursor-pointer select-none text-center"
              >
                <div className="p-4 rounded-2xl bg-slate-200 text-slate-700 group-hover:scale-110 transition shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black text-slate-900 block">
                    {lang === 'gu' ? 'લાઇબ્રેરી અથવા ફાઇલ પસંદ કરો' : 'Choose from Library or Files'}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    {lang === 'gu' ? 'ગેલેરી ફોટો અથવા PDF બિલ' : 'Photo Library, Gallery, or PDF'}
                  </span>
                </div>
              </button>
            </div>

            {/* Compact Helper Note */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-left text-xs max-w-lg mx-auto flex items-start gap-2.5 shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold block">
                  {lang === 'gu' ? 'કૅમેરા માર્ગદર્શન:' : 'Camera Permission Tip:'}
                </span>
                <span>
                  {lang === 'gu'
                    ? 'જો ફોનમાં કૅમેરો બ્લેક દેખાય, તો Settings > Google (અથવા Safari) માં જઈ Camera પરમિશન ચાલુ કરો, અથવા ફોટો પાડીને "લાઇબ્રેરી અથવા ફાઇલ પસંદ કરો" માંથી અપલોડ કરો.'
                    : 'If your camera opens black or denied, ensure Camera access is enabled in iPhone Settings > Google (or Safari), or choose your photo using "Choose from Library or Files".'}
                </span>
              </div>
            </div>

            {/* Native Offscreen Inputs */}
            <input
              id="bill_ocr_camera_input"
              type="file"
              name="bill_camera"
              ref={cameraInputRef}
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
                  handleFileChosen(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <input
              id="bill_ocr_file_input"
              type="file"
              name="bill_file"
              ref={fileInputRef}
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
                  handleFileChosen(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'gu' ? 'બિલ સ્કેન થતાની સાથે જ ખર્ચ, વેપારી અને કાચો માલ સ્ટોક ૩-વે સિંક થશે.' : 'Scanned bills automatically sync to expenses, vendors, and raw material stock.'}</span>
            </div>
          </div>
        )}

        {/* Step 2: Processing OCR */}
        {step === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-amber-600 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                {lang === 'gu' ? 'બિલ સ્કેન અને વિશ્લેષણ થઈ રહ્યું છે...' : 'Scanning & Analyzing Bill...'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {geminiApiKey
                  ? (lang === 'gu' ? 'ગુગલ જેમિની AI વિઝન મોડેલ દ્વારા વેપારી, રકમ અને કાચો માલ વિગતો વાંચવામાં આવી રહી છે...' : 'Analyzing bill with Google Gemini Vision AI to extract items, vendor, and amounts...')
                  : (lang === 'gu' ? 'ઓસીઆર એન્જિન બિલમાંથી વેપારી, તારીખ અને રકમ વાંચી રહ્યું છે...' : 'Running OCR engine to extract vendor, GSTIN, amounts, and item lines.')}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Edit Extracted Fields */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* DUPLICATE BILL GUARD BANNER */}
            {duplicateRecord && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 space-y-3 shadow-md animate-fade-in">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 font-black text-rose-800 text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{lang === 'gu' ? '🛑 આ બિલ પહેલેથી જ ચોપડે નોંધાયેલ છે! (ડબલ એન્ટ્રી પ્રતિબંધિત)' : '🛑 DUPLICATE BILL DETECTED! (Double Entry Blocked)'}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wider">
                    {lang === 'gu' ? 'સેવ બંધ કરેલ છે' : 'Save Denied'}
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  {lang === 'gu'
                    ? 'આ ઇન્વોઇસ/બિલ પહેલેથી જ ચોપડામાં દાખલ થયેલું છે. હિસાબમાં ડબલ એન્ટ્રી અને ખોટો સ્ટોક અટકાવવા માટે સિસ્ટમ આ બિલને ફરીથી સેવ કરવાની પરવાનગી આપશે નહીં.'
                    : 'This invoice/bill is already present in your record book. Saving has been automatically denied to prevent duplicate expenses and duplicate inventory.'}
                </p>
                <div className="p-3 bg-white/95 rounded-xl border border-rose-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-semibold shadow-inner">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{lang === 'gu' ? 'વેપારી (Vendor)' : 'Vendor'}</span>
                    <span className="text-slate-900 font-bold">{duplicateRecord.vendor_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{lang === 'gu' ? 'બિલ નં (Bill No)' : 'Bill No'}</span>
                    <span className="text-slate-900 font-mono font-bold">#{duplicateRecord.bill_number || duplicateRecord.invoice_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{lang === 'gu' ? 'બિલ તારીખ (Date)' : 'Bill Date'}</span>
                    <span className="text-slate-900 font-bold">{duplicateRecord.date || duplicateRecord.bill_date || duplicateRecord.transaction_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{lang === 'gu' ? 'કુલ રકમ (Amount)' : 'Total Amount'}</span>
                    <span className="text-emerald-700 font-black">{formatINR(duplicateRecord.amount || duplicateRecord.total_amount)}</span>
                  </div>
                </div>
                {duplicateRecord.transaction_number && (
                  <div className="text-[11px] text-rose-700 font-mono font-bold flex items-center justify-between pt-0.5">
                    <span>
                      {lang === 'gu' ? 'ચોપડા નોંધણી રેફરન્સ:' : 'Existing Ledger Ref:'} {duplicateRecord.transaction_number}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* OCR Engine Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Attached Bill'}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({(selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) : '0')} KB)
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                ocrData?.ocrEngine === 'gemini'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5'
              }`}>
                {ocrData?.ocrEngine === 'gemini' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{lang === 'gu' ? 'ગુગલ જેમિની AI દ્વારા વિશ્લેષણ' : 'Google Gemini AI Analyzed'}</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Local OCR</span>
                    <span className="opacity-75 font-normal">
                      ({ocrData?.ocrConfidence}% confidence)
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* SECTION 1: Vendor Selection */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>{lang === 'gu' ? '૧. વેપારી પસંદગી (Vendor Association)' : '1. Vendor Association'}</span>
              </div>

              {vendorChoice === 'existing' && detectedDuplicates.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>
                    {lang === 'gu'
                      ? 'ઓસીઆર વિગતો હયાત વેપારી સાથે મેળ ખાય છે:'
                      : 'OCR matches existing vendor:'}{' '}
                    <strong>{detectedDuplicates[0].vendor.name}</strong>
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 flex-1">
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
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 flex-1">
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

              {vendorChoice === 'existing' ? (
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('lbl_select_vendor')} *
                  </label>
                  <select
                    value={selectedExistingVendorId}
                    onChange={(e) => setSelectedExistingVendorId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 font-medium"
                  >
                    <option value="">{t('lbl_select_vendor')}</option>
                    {vendorList.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.phone ? `(${v.phone})` : ''} {v.city ? `- ${v.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('lbl_vendor_name')} *
                    </label>
                    <input
                      type="text"
                      value={reviewFields.vendorName}
                      onChange={(e) => setReviewFields({ ...reviewFields, vendorName: e.target.value })}
                      placeholder="e.g. M/S. JAY AGENCIES"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('lbl_vendor_category')}
                    </label>
                    <input
                      type="text"
                      value={reviewFields.vendorCategory}
                      onChange={(e) => setReviewFields({ ...reviewFields, vendorCategory: e.target.value })}
                      placeholder="e.g. Raw Materials (sugar merchant)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('lbl_phone')} / Mobile
                    </label>
                    <input
                      type="text"
                      value={reviewFields.phone}
                      onChange={(e) => setReviewFields({ ...reviewFields, phone: e.target.value })}
                      placeholder="e.g. 9099354000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('lbl_gstin')} (GST Number)
                    </label>
                    <input
                      type="text"
                      value={reviewFields.gstin}
                      onChange={(e) => setReviewFields({ ...reviewFields, gstin: e.target.value })}
                      placeholder="e.g. 24AADFJ1126H1ZV"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Invoice Details & Financial Breakdown */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>{lang === 'gu' ? '૨. બિલ હિસાબ અને પેમેન્ટ સ્ટેટસ' : '2. Invoice Breakdown & Payment Status'}</span>
              </div>

              {/* Payment Status Toggle */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {lang === 'gu' ? 'પેમેન્ટ સ્ટેટસ (Payment Status)' : 'Payment Status'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {reviewFields.paymentStatus === 'paid'
                      ? (lang === 'gu' ? 'રોકડા/યુપીઆઇ ચૂકવી દીધેલ છે (ખર્ચમાં ડેબિટ થશે)' : 'Fully Paid — debited immediately')
                      : (lang === 'gu' ? 'બાકી / ઉધાર (વેપારી ખાતામાં જમા રહેશે)' : 'Unpaid / Credit — credited to vendor payable ledger')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewFields(prev => ({
                        ...prev,
                        paymentStatus: 'paid',
                        paidAmount: prev.totalAmount || '',
                        expensePaymentMethod: prev.expensePaymentMethod === 'credit' ? 'cash' : prev.expensePaymentMethod
                      }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                      reviewFields.paymentStatus === 'paid'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{lang === 'gu' ? 'ચૂકવેલ (Paid)' : 'Paid (રોકડા / UPI)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewFields(prev => ({
                        ...prev,
                        paymentStatus: 'unpaid',
                        paidAmount: '0',
                        expensePaymentMethod: 'credit'
                      }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                      reviewFields.paymentStatus === 'unpaid'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{lang === 'gu' ? 'બાકી / ઉધાર (Unpaid)' : 'Unpaid (બાકી)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                {/* Invoice Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('lbl_invoice_no')}
                  </label>
                  <input
                    type="text"
                    value={reviewFields.invoiceNumber}
                    onChange={(e) => setReviewFields({ ...reviewFields, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-4133"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
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

                {/* Payment Method */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('lbl_payment_method')}
                  </label>
                  <select
                    value={reviewFields.expensePaymentMethod}
                    onChange={(e) => setReviewFields({ ...reviewFields, expensePaymentMethod: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="credit">{t('pm_credit')} (બાકી)</option>
                    <option value="cash">{t('pm_cash')} (રોકડા)</option>
                    <option value="upi">{t('pm_upi')} (Google Pay / PhonePe)</option>
                    <option value="bank_transfer">{t('pm_bank_transfer')}</option>
                  </select>
                </div>

                {/* Total Invoice Amount */}
                <div className="bg-amber-100/70 p-2.5 rounded-2xl border border-amber-300">
                  <label className="block font-black text-amber-950 mb-1">
                    {t('lbl_invoice_total')} (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={reviewFields.totalAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReviewFields(prev => ({
                        ...prev,
                        totalAmount: val,
                        paidAmount: prev.paymentStatus === 'paid' ? val : prev.paidAmount
                      }));
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-400 font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Detected Raw Materials for Stock Inward */}
            <div className="p-4 rounded-3xl border-2 border-amber-300 bg-amber-50/50 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-600 text-white">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950">
                      ૩. Detected Items & Raw Materials (કાચો માલ / સ્ટોક ઇનવર્ડ)
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      {lang === 'gu'
                        ? 'બિલમાં દર્શાવેલ વસ્તુનું નામ, જથ્થો અને ભાવ સીધા સુધારી શકાય છે'
                        : 'Every detail (name, quantity, rate, unit) is fully editable like an invoice before saving'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddMaterialModal(null, '')}
                    className="px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-black text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Add New Material</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Add Item Row</span>
                  </button>
                </div>
              </div>

              {/* Inward Items Container */}
              <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm p-3">
                {inwardStockItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>{lang === 'gu' ? 'કોઈ વસ્તુ ઓળખાઈ નથી.' : 'No items detected yet.'}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Item Row" or "+ Add New Material" above to add items.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE VIEW (< md): Clean Bill Voucher Cards */}
                    <div className="block md:hidden space-y-3">
                      {inwardStockItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            item.inward_enabled
                              ? 'bg-amber-50/20 border-amber-300 shadow-xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          {/* Card Top: Checkbox + Item Number + Trash */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-100">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.inward_enabled}
                                onChange={(e) => handleUpdateItemField(idx, 'inward_enabled', e.target.checked)}
                                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-900">
                                {lang === 'gu' ? `આઇટમ #${idx + 1}` : `Item #${idx + 1}`}
                              </span>
                              {item.inward_enabled ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                  {lang === 'gu' ? 'સ્ટોક ઇનવર્ડ ઓકે' : 'Stock Inward'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-md">
                                  {lang === 'gu' ? 'સ્ટોક છોડો' : 'Skip Stock'}
                                </span>
                              )}
                            </label>

                            <button
                              type="button"
                              onClick={() => setInwardStockItems(inwardStockItems.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {/* Item Name on Bill (EDITABLE!) */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                                  <span>{lang === 'gu' ? 'વસ્તુનું નામ (બિલ મુજબ)' : 'Item Name on Bill'}</span>
                                  <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                                  {lang === 'gu' ? 'સુધારી શકાય છે' : 'Editable'}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={item.detected_desc || ''}
                                onChange={(e) => handleUpdateItemField(idx, 'detected_desc', e.target.value)}
                                placeholder="દા.ત. મકાઈ વડા / Makka Vada / Thepla"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                              />
                            </div>

                            {/* Raw Material Inventory Mapping */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-black text-slate-700">
                                  {lang === 'gu' ? 'કાચો માલ લિંક કરો (ઇન્વેન્ટરી)' : 'Map to Raw Material (Inventory)'}
                                </label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={item.raw_material_id || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'raw_material_id', e.target.value)}
                                  className={`flex-1 px-2.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                                    item.raw_material_id
                                      ? 'border-slate-300 bg-white text-slate-800'
                                      : 'border-amber-400 bg-amber-50 text-amber-950 font-bold'
                                  }`}
                                >
                                  <option value="">-- {lang === 'gu' ? 'કાચો માલ પસંદ કરો' : 'Select Raw Material'} --</option>
                                  {availableMaterials.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.name_gu} ({m.name_en})
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleOpenAddMaterialModal(idx, item.detected_desc)}
                                  title="Add new raw material definition"
                                  className="px-2.5 py-2 rounded-xl bg-amber-900 hover:bg-black text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{lang === 'gu' ? 'નવું' : '+ New'}</span>
                                </button>
                              </div>
                            </div>

                            {/* 3 Columns: Qty, Unit, Rate */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-black text-slate-700 mb-1 text-center">
                                  {lang === 'gu' ? 'જથ્થો (Qty)' : 'Quantity'}
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-xl border border-slate-300 font-black text-xs text-slate-900 bg-white text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-700 mb-1 text-center">
                                  {lang === 'gu' ? 'એકમ (Unit)' : 'Unit'}
                                </label>
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItemField(idx, 'unit', e.target.value)}
                                  className="w-full px-1.5 py-1.5 rounded-xl border border-slate-300 text-[11px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                  {UNIT_OPTIONS.map(u => (
                                    <option key={u.value} value={u.value}>
                                      {lang === 'gu' ? u.labelGu : u.labelEn}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-700 mb-1 text-right">
                                  {lang === 'gu' ? 'ભાવ (₹ Rate)' : 'Rate (₹)'}
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={item.rate || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'rate', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white text-right focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </div>
                            </div>

                            {/* Row Total */}
                            <div className="flex items-center justify-between pt-1 text-xs bg-amber-100/40 px-3 py-2 rounded-xl border border-amber-200">
                              <span className="font-bold text-amber-950">
                                {lang === 'gu' ? 'આઇટમ રકમ (Total ₹):' : 'Line Total (₹):'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-amber-800">₹</span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={item.amount || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'amount', e.target.value)}
                                  className="w-24 px-2 py-1 rounded-lg border border-amber-300 text-right font-black text-xs text-amber-950 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>
                            </div>

                            {item.inward_enabled && !item.raw_material_id && (
                              <p className="text-[10px] text-amber-800 bg-amber-100/60 p-1.5 rounded-lg font-medium">
                                💡 {lang === 'gu' ? 'સ્ટોક ઇનવર્ડ માટે કાચો માલ પસંદ કરો અથવા "+ નવું" પર ક્લિક કરો.' : 'Select raw material or tap "+ New" to increment physical stock.'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP VIEW (>= md): Full Responsive Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-100/70 text-amber-950 font-black border-b border-amber-200">
                          <tr>
                            <th className="p-2.5 w-10 text-center">Inward</th>
                            <th className="p-2.5 min-w-[160px]">
                              {lang === 'gu' ? 'બિલ આઇટમનું નામ' : 'Item Name (on Bill)'}
                            </th>
                            <th className="p-2.5 min-w-[200px]">
                              {lang === 'gu' ? 'કાચો માલ (ઇન્વેન્ટરી)' : 'Raw Material (Stock)'}
                            </th>
                            <th className="p-2.5 w-20 text-center">Qty</th>
                            <th className="p-2.5 w-28">Unit (એકમ)</th>
                            <th className="p-2.5 w-24 text-right">Rate (₹)</th>
                            <th className="p-2.5 w-28 text-right">Total (₹)</th>
                            <th className="p-2.5 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inwardStockItems.map((item, idx) => (
                            <tr key={idx} className={item.inward_enabled ? 'hover:bg-amber-50/30' : 'bg-slate-50 opacity-60'}>
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.inward_enabled}
                                  onChange={(e) => handleUpdateItemField(idx, 'inward_enabled', e.target.checked)}
                                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={item.detected_desc || ''}
                                  placeholder="e.g. Makka Vada, Thepla"
                                  onChange={(e) => handleUpdateItemField(idx, 'detected_desc', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={item.raw_material_id || ''}
                                    onChange={(e) => handleUpdateItemField(idx, 'raw_material_id', e.target.value)}
                                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200 ${
                                      item.raw_material_id ? 'border-slate-300 bg-white text-slate-800' : 'border-amber-400 bg-amber-50 text-amber-950 font-black'
                                    }`}
                                  >
                                    <option value="">-- {lang === 'gu' ? 'કાચો માલ પસંદ કરો' : 'Select Raw Material'} --</option>
                                    {availableMaterials.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {m.name_gu} ({m.name_en})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddMaterialModal(idx, item.detected_desc)}
                                    title="Add new raw material definition"
                                    className="px-2 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] shrink-0"
                                  >
                                    + New
                                  </button>
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemField(idx, 'quantity', e.target.value)}
                                  className="w-20 px-2 py-1.5 rounded-xl border border-slate-300 font-black text-slate-900 bg-white text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </td>
                              <td className="p-2.5">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItemField(idx, 'unit', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                  {UNIT_OPTIONS.map(u => (
                                    <option key={u.value} value={u.value}>
                                      {lang === 'gu' ? u.labelGu : u.labelEn}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={item.rate || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'rate', e.target.value)}
                                  className="w-24 px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-right bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={item.amount || ''}
                                  onChange={(e) => handleUpdateItemField(idx, 'amount', e.target.value)}
                                  className="w-24 px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-black text-amber-950 text-right bg-amber-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setInwardStockItems(inwardStockItems.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section 3 Footer Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-amber-200">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-bold text-slate-600">
                          {lang === 'gu' ? 'કુલ આઇટમ્સ:' : 'Total Items:'}{' '}
                          <strong className="text-slate-900">{inwardStockItems.length}</strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-800">
                          {lang === 'gu' ? 'સ્ટોક ઇનવર્ડ માટે:' : 'Inward to Stock:'}{' '}
                          <strong>{inwardStockItems.filter(it => it.inward_enabled && it.raw_material_id).length}</strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-amber-950">
                          {lang === 'gu' ? 'આઇટમ સરવાળો:' : 'Items Sum:'}{' '}
                          <strong className="text-sm font-black text-amber-900">
                            ₹{itemsTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </span>
                      </div>

                      {itemsTotalSum > 0 && Math.abs(itemsTotalSum - (parseFloat(reviewFields.totalAmount) || 0)) > 0.01 && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewFields(prev => ({
                              ...prev,
                              totalAmount: itemsTotalSum.toFixed(2),
                              paidAmount: prev.paymentStatus === 'paid' ? itemsTotalSum.toFixed(2) : prev.paidAmount
                            }));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'gu'
                              ? `બિલ ટોટલમાં લાગુ કરો (₹${itemsTotalSum.toFixed(2)})`
                              : `Apply Items Sum to Bill Total (₹${itemsTotalSum.toFixed(2)})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SECTION 4: 3-Way Atomic Sync Visual Breakdown */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-700/10 border-2 border-amber-400/50 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>3-Way Atomic Synchronization Guarantee</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm space-y-1">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>૧. Daily Expenses</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Records ₹{reviewFields.totalAmount || '0'} debit entry ({reviewFields.paymentStatus === 'paid' ? 'Paid / Cash' : 'Unpaid / Credit'})
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm space-y-1">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>૨. Vendor Khata</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Links bill #{reviewFields.invoiceNumber || 'NEW'} to vendor and updates ledger balance
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm space-y-1">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>૩. Raw Material Stock</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Automatically increments physical stock for {inwardStockItems.filter(it => it.inward_enabled).length} materials & logs inward transaction
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success Message */}
        {step === 'success' && successInfo && (
          <div className="p-8 text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                {lang === 'gu' ? 'બિલ અને કાચો માલ સ્ટોક સફળતાપૂર્વક સેવ થયો!' : 'Bill & Stock Inward Saved Successfully!'}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {lang === 'gu'
                  ? `બિલ ${successInfo.bill?.bill_number || ''} વેપારી ${successInfo.vendorName} ના ખાતામાં સેવ થઈ ગયું છે.`
                  : `Bill ${successInfo.bill?.bill_number || ''} recorded under vendor ${successInfo.vendorName}.`}
              </p>
            </div>

            {/* 3-Way Confirmation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-xs text-left">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="font-black text-emerald-900 block">✅ Daily Expense</span>
                <span className="text-[11px] text-emerald-700">₹{successInfo.totalAmount} recorded in ledger</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="font-black text-emerald-900 block">✅ Vendor Ledger</span>
                <span className="text-[11px] text-emerald-700">Synced to {successInfo.vendorName}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="font-black text-emerald-900 block">✅ Physical Stock</span>
                <span className="text-[11px] text-emerald-700">{successInfo.stockUpdated} materials incremented</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm transition shadow-lg shadow-amber-600/30"
              >
                {t('btn_confirm')} (ડૅશબોર્ડ પર પાછા જાઓ)
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
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              {lang === 'gu' ? 'ફરી સ્કેન કરો' : 'Re-scan / Upload Again'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                disabled={submitting || !!duplicateRecord}
                onClick={handleConfirmSave}
                className={`px-6 py-2.5 text-xs font-black rounded-xl transition flex items-center gap-2 ${
                  duplicateRecord
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-300 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-600/30 disabled:opacity-50'
                }`}
                title={duplicateRecord ? (lang === 'gu' ? 'ડબલ એન્ટ્રી અટકાવવા માટે સેવ બંધ કરેલ છે' : 'Save blocked to prevent duplicate bill entry') : ''}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('btn_saving')}</span>
                  </>
                ) : duplicateRecord ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{lang === 'gu' ? '🛑 ડબલ એન્ટ્રી અટકાવેલ છે (Save Blocked)' : '🛑 Duplicate Bill - Save Blocked'}</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Save (3-Way Sync)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Modal: Add New Raw Material On-The-Fly */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">
                + Add New Raw Material (નવો કાચો માલ ઉમેરો)
              </h3>
              <button
                onClick={() => setShowAddMaterialModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Besan 50kg Bag"
                  value={newMaterialForm.name_en}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Name (Gujarati / ગુજરાતી) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="દા.ત. બેસન ૫૦ કિલો કટ્ટો"
                  value={newMaterialForm.name_gu}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name_gu: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newMaterialForm.category}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    {RAW_MATERIAL_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {lang === 'gu' ? c.labelGu : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Unit</label>
                  <select
                    value={newMaterialForm.primary_unit}
                    onChange={(e) => {
                      const u = e.target.value;
                      let ratio = 1;
                      let base = 'kg';
                      if (u === 'bag_50kg' || u === 'katta') { ratio = 50; base = 'kg'; }
                      else if (u === 'bag_30kg') { ratio = 30; base = 'kg'; }
                      else if (u === 'bag_25kg') { ratio = 25; base = 'kg'; }
                      else if (u === 'tin_15kg' || u === 'dabba') { ratio = 15; base = 'kg'; }
                      else if (u === 'piece' || u === 'pkt' || u === 'cylinder_19kg') { ratio = 1; base = 'piece'; }
                      setNewMaterialForm({
                        ...newMaterialForm,
                        primary_unit: u,
                        base_unit: base,
                        unit_ratio: ratio
                      });
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u.value} value={u.value}>
                        {lang === 'gu' ? u.labelGu : u.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMaterial}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5"
                >
                  {creatingMaterial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillOcrModal;
