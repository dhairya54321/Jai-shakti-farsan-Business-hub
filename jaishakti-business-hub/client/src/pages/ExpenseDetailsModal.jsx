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
  Plus,
  Trash2,
  Edit,
  History,
  CreditCard,
  User,
  Users,
  AlertTriangle
} from 'lucide-react';

// Helper to guarantee line items extraction from ocr_raw_text, notes, or descriptions
function extractItems(currentExpense, currentBill, subtotal, grandTotal) {
  // 1. Try to read from ocr_raw_text
  const rawOcr = currentExpense?.ocr_raw_text || currentBill?.ocr_raw_text;
  if (rawOcr) {
    try {
      const parsed = typeof rawOcr === 'string' ? JSON.parse(rawOcr) : rawOcr;
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        return parsed.items.map((it) => ({
          description: it.description || 'Item',
          quantity: it.quantity != null ? it.quantity : 1,
          unit: it.unit || '',
          rate: it.rate != null ? Number(it.rate) : null,
          amount: it.amount != null ? Number(it.amount) : null
        }));
      }
    } catch (e) {}
  }

  // 2. Parse from notes, description, or summary
  const textSources = [
    currentExpense?.notes,
    currentBill?.notes,
    currentExpense?.description,
    currentBill?.description
  ].filter(Boolean).join('\n');

  if (textSources) {
    const lines = textSources.split(/[\r\n;]+/).map((l) => l.trim()).filter(Boolean);
    const parsedFromText = [];

    for (const line of lines) {
      if (/^(purchase of|purchased|total amount|payment|terms|buyer|seller)/i.test(line)) continue;

      // Pattern 1: Description: Qty [unit] [(extra)] @ [Rate] [= Amount]
      // e.g. '• COT RANI OIL 15 KG NEW TIN: 10 TIN @ ₹2,704.82 = ₹27,048.16'
      // e.g. '• POTATO: 100 KG (2 Bags) @ ₹20.25 = ₹2,025'
      let match = line.match(/^[-•*]?\s*(?:(\d+)\s*[\.\)]\s*)?([^:@]+?):\s*([0-9.]+)\s*([A-Za-z\s]+)?(?:\([^)]*\))?\s*[@|at]\s*(?:Rate)?\s*[₹Rs.]*\s*([0-9,.]+)\s*(?:per\s*[A-Za-z]+|\/[A-Za-z]+)?\s*(?:=|Amount:|\(Amount:)?\s*[₹Rs.]*\s*([0-9,.]+)?/i);
      if (match) {
        const desc = match[2].trim();
        const qty = parseFloat(match[3]) || 1;
        const unit = (match[4] || '').trim().replace(/^(each|per)\s*/i, '');
        const rate = parseFloat((match[5] || '').replace(/,/g, '')) || 0;
        const amt = match[6] ? parseFloat(match[6].replace(/,/g, '')) : Math.round(qty * rate * 100) / 100;
        if (desc && (rate > 0 || amt > 0)) {
          parsedFromText.push({ description: desc, quantity: qty, unit, rate, amount: amt });
          continue;
        }
      }

      // Pattern 2: [Qty] [unit] [of] [Description] @ [Rate] [= Amount]
      // e.g. '10 Tin of C.S.OIL15KTIN - RANI @ 2542.86 per Tin = 25428.5'
      match = line.match(/^[-•*]?\s*(?:(\d+)\s*[\.\)]\s*)?([0-9.]+)\s*([A-Za-z\s]+)\s+(?:of\s+)?([^:@]+?)\s*[@|at]\s*(?:Rate)?\s*[₹Rs.]*\s*([0-9,.]+)\s*(?:per\s*[A-Za-z]+|\/[A-Za-z]+)?\s*(?:=|Amount:|\(Amount:)?\s*(?:each)?\s*[₹Rs.]*\s*([0-9,.]+)?/i);
      if (match) {
        const qty = parseFloat(match[2]) || 1;
        const unit = (match[3] || '').trim();
        const desc = match[4].trim();
        const rate = parseFloat((match[5] || '').replace(/,/g, '')) || 0;
        const amt = match[6] ? parseFloat(match[6].replace(/,/g, '')) : Math.round(qty * rate * 100) / 100;
        if (desc && (rate > 0 || amt > 0)) {
          parsedFromText.push({ description: desc, quantity: qty, unit, rate, amount: amt });
          continue;
        }
      }

      // Pattern 3: Description: Qty [N] [unit], Amount [N]
      match = line.match(/^[-•*]?\s*([^:@]+?):\s*(?:Qty\s*)?([0-9.]+)\s*([A-Za-z\s]+)?,\s*(?:Amount\s*)?[₹Rs.]*\s*([0-9,.]+)/i);
      if (match) {
        const desc = match[1].trim();
        const qty = parseFloat(match[2]) || 1;
        const unit = (match[3] || '').trim();
        const amt = parseFloat(match[4].replace(/,/g, '')) || 0;
        const rate = qty > 0 ? Math.round((amt / qty) * 100) / 100 : amt;
        if (desc && amt > 0) {
          parsedFromText.push({ description: desc, quantity: qty, unit, rate, amount: amt });
          continue;
        }
      }
    }

    if (parsedFromText.length > 0) {
      return parsedFromText;
    }
  }

  // 3. Fallback: Guaranteed item display so that every invoice detail has the items table!
  const fallbackDesc =
    currentExpense?.description ||
    currentBill?.notes?.split('\n')[0]?.replace(/^[-•*]\s*/, '').trim() ||
    currentExpense?.notes?.split('\n')[0]?.replace(/^[-•*]\s*/, '').trim() ||
    currentExpense?.category_name_gu ||
    currentExpense?.category_name_en ||
    'Purchase Items / સામગ્રી ખરીદી';

  const effectiveAmt = subtotal > 0 ? subtotal : (grandTotal > 0 ? grandTotal : 0);

  return [
    {
      description: fallbackDesc,
      quantity: 1,
      unit: '',
      rate: effectiveAmt,
      amount: effectiveAmt
    }
  ];
}

export function ExpenseDetailsModal({
  expense,
  bill,
  vendor,
  categories = [],
  vendors = [],
  isOpen = true,
  onClose,
  onRefresh,
  onBillUpdated,
  onOpenExpense
}) {
  const { lang, t, formatINR, formatDate } = useLanguage();
  const { role, user } = useAuth();

  // Local state for loaded models
  const [currentExpense, setCurrentExpense] = useState(expense || null);
  const [currentBill, setCurrentBill] = useState(bill || null);
  const [catList, setCatList] = useState(categories || []);
  const [venList, setVenList] = useState(vendors || []);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Lightbox & Attachment Viewer State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeAttachmentIdx, setActiveAttachmentIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Notice & Feedback banner
  const [notice, setNotice] = useState('');

  // Edit Mode State (Whole Transaction)
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editVendorId, setEditVendorId] = useState('');
  const [editTransactionDate, setEditTransactionDate] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Payment Add State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Payment Inline Edit State
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPayAmount, setEditPayAmount] = useState('');
  const [editPayMethod, setEditPayMethod] = useState('cash');
  const [editPayDate, setEditPayDate] = useState('');
  const [savingPaymentAction, setSavingPaymentAction] = useState(false);
  const [paymentActionError, setPaymentActionError] = useState('');

  // Linking Bill to Daily Expense State (when opened from an unlinked bill)
  const [linkingExpense, setLinkingExpense] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Sync incoming props
  useEffect(() => {
    setCurrentExpense(expense || null);
    setCurrentBill(bill || null);
    setZoomLevel(1);
    setRotation(0);
    setActiveAttachmentIdx(0);
    setIsEditing(false);
    setEditError('');
    setPaymentError('');
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setLinkSuccess(false);
    setLinkError('');
  }, [expense, bill]);

  // If a bill is provided and has an expense_id, automatically load the full enriched expense
  useEffect(() => {
    if (bill && bill.expense_id && (!currentExpense || currentExpense.id !== bill.expense_id)) {
      setLoadingDetails(true);
      apiFetch(`/api/expenses/${bill.expense_id}`)
        .then((res) => {
          if (res.expense) {
            setCurrentExpense(res.expense);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetails(false));
    }
  }, [bill]);

  // Load categories and vendors if not provided
  useEffect(() => {
    if (categories && categories.length > 0) {
      setCatList(categories);
    } else {
      apiFetch('/api/categories?all=true')
        .then((res) => {
          if (res.categories) setCatList(res.categories);
        })
        .catch(() => {});
    }

    if (vendors && vendors.length > 0) {
      setVenList(vendors);
    } else {
      apiFetch('/api/vendors')
        .then((res) => {
          if (res.vendors) setVenList(res.vendors);
        })
        .catch(() => {});
    }
  }, [categories, vendors]);

  if (!isOpen || (!currentExpense && !currentBill)) return null;

  // Active record resolution: prefer currentExpense if available, fallback to currentBill
  const activeRecord = currentExpense || currentBill;
  const isLinkedExpense = !!currentExpense;

  // Role permissions
  const isOwnerOrManager = ['owner', 'manager'].includes(role);
  const isDesignatedEditor = ['owner', 'manager', 'accountant'].includes(role);
  const canEdit = isDesignatedEditor && currentExpense && currentExpense.approval_status !== 'voided';

  // Vendor Information
  const vendorName =
    currentExpense?.vendor_name ||
    currentBill?.vendor_name ||
    vendor?.name ||
    (currentExpense?.worker_name ? currentExpense.worker_name : 'Merchant / Vendor');

  const vendorGstin =
    currentExpense?.vendor_gstin ||
    currentBill?.vendor_gstin ||
    vendor?.gstin ||
    vendor?.tax_identifier ||
    '';

  const vendorPhone =
    currentExpense?.vendor_phone ||
    currentBill?.vendor_phone ||
    vendor?.phone ||
    '';

  const vendorAddress =
    currentExpense?.vendor_address ||
    currentBill?.vendor_address ||
    vendor?.address ||
    '';

  const vendorCategory =
    currentExpense?.vendor_category ||
    currentBill?.vendor_category ||
    vendor?.category ||
    '';

  // Document metadata
  const billNumber =
    currentExpense?.bill_number ||
    currentBill?.bill_number ||
    currentExpense?.invoice_number ||
    '';

  const transactionNumber = currentExpense?.transaction_number || currentBill?.transaction_number || '';

  const billDate =
    currentExpense?.bill_date ||
    currentBill?.bill_date ||
    currentExpense?.transaction_date ||
    '';

  const dueDate = currentExpense?.due_date || currentBill?.due_date || '';

  const paymentStatus = currentExpense?.payment_status || currentBill?.payment_status || 'unpaid';
  const approvalStatus = currentExpense?.approval_status || null;
  const ocrConfidence = currentExpense?.ocr_confidence || currentBill?.ocr_confidence || null;

  // Financial Figures
  const grandTotal = currentExpense?.amount != null ? Number(currentExpense.amount) : Number(currentBill?.total_amount || 0);
  const subtotal = Number(
    currentExpense?.bill_subtotal ||
    currentBill?.subtotal ||
    currentBill?.taxable_amount ||
    currentExpense?.amount ||
    currentBill?.total_amount ||
    0
  );
  const cgst = Number(currentExpense?.cgst || currentBill?.cgst || 0);
  const sgst = Number(currentExpense?.sgst || currentBill?.sgst || 0);
  const igst = Number(currentExpense?.igst || currentBill?.igst || 0);
  const gstTax = cgst + sgst + igst;
  const discount = Number(currentExpense?.discount || currentBill?.discount || 0);
  const otherCharges = Number(currentExpense?.other_charges || currentBill?.other_charges || 0);

  const totalPaid = currentExpense?.total_paid != null ? Number(currentExpense.total_paid) : Number(currentBill?.paid_amount || 0);
  const balanceDue = currentExpense?.balance_due != null
    ? Number(currentExpense.balance_due)
    : Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

  // Attachments resolution
  const token = localStorage.getItem('js_token') || '';
  const attachmentsList = [];
  if (currentExpense?.attachments && currentExpense.attachments.length > 0) {
    attachmentsList.push(...currentExpense.attachments);
  } else if (currentBill?.attachment_id) {
    attachmentsList.push({
      id: currentBill.attachment_id,
      storage_key: currentBill.storage_key,
      original_filename: currentBill.original_filename || 'bill_document',
      content_type: currentBill.content_type || 'image/jpeg',
      file_size_bytes: currentBill.file_size_bytes || 0
    });
  }

  const activeAttachment = attachmentsList[activeAttachmentIdx] || attachmentsList[0] || null;
  const downloadUrl = activeAttachment
    ? `/api/expenses/attachments/${activeAttachment.id}/download?token=${token}`
    : null;
  const isImage = activeAttachment?.content_type ? activeAttachment.content_type.startsWith('image/') : true;
  const isPdf = activeAttachment?.content_type === 'application/pdf';

  // Line items (guaranteed to always return items for every invoice detail)
  const parsedItems = extractItems(currentExpense, currentBill, subtotal, grandTotal);

  // Trigger parent updates
  const notifyParentUpdate = () => {
    if (onRefresh) onRefresh();
    if (onBillUpdated) onBillUpdated();
  };

  // --- Actions ---

  // Create Daily Expense from Unlinked Bill
  const handleCreateExpense = async () => {
    if (!currentBill) return;
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
        // Fetch full expense details
        const fullExp = await apiFetch(`/api/expenses/${res.expense.id}`);
        if (fullExp.expense) {
          setCurrentExpense(fullExp.expense);
        }
        notifyParentUpdate();
      }
    } catch (err) {
      setLinkError(err.message || 'Failed to link bill to daily expenses');
    } finally {
      setLinkingExpense(false);
    }
  };

  // Start Transaction Edit
  const handleStartEditing = () => {
    if (!currentExpense) return;
    setEditCategoryId(currentExpense.category_id || '');
    setEditAmount(currentExpense.amount ? String(currentExpense.amount) : '');
    const initialMethod = currentExpense.payments?.[0]?.payment_method || currentExpense.payment_method || 'cash';
    setEditPaymentMethod(initialMethod);
    setEditVendorId(currentExpense.vendor_id || '');
    setEditTransactionDate(
      currentExpense.transaction_date ? currentExpense.transaction_date.slice(0, 10) : ''
    );
    setEditInvoiceNumber(currentExpense.invoice_number || '');
    setEditDescription(currentExpense.description || '');
    setEditNotes(currentExpense.notes || '');
    setEditReason('');
    setEditError('');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditError('');
  };

  // Save Transaction Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!currentExpense) return;
    setEditError('');

    const amtNum = parseFloat(editAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setEditError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid amount.');
      return;
    }
    const alreadyPaid = currentExpense.total_paid || 0;
    if (currentExpense.payments && currentExpense.payments.length > 1 && amtNum < alreadyPaid) {
      setEditError(
        lang === 'gu'
          ? `નવી રકમ ₹${amtNum} એ પહેલેથી ચૂકવાયેલ ₹${alreadyPaid} કરતાં ઓછી હોઈ શકે નહીં. કૃપા કરીને નીચે ચૂકવણી હિસ્ટ્રીમાંથી રકમ સુધારો.`
          : `New amount of ₹${amtNum} cannot be less than already paid amount of ₹${alreadyPaid}. Please adjust payment history first.`
      );
      return;
    }
    if (!editReason || !editReason.trim()) {
      setEditError(t('err_reason_required') || 'Reason for modification is mandatory');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category_id: editCategoryId,
          amount: amtNum,
          vendor_id: editVendorId || null,
          transaction_date: editTransactionDate,
          invoice_number: editInvoiceNumber.trim() || null,
          description: editDescription.trim() || null,
          notes: editNotes.trim() || null,
          payment_method: editPaymentMethod,
          payment_amount: (currentExpense.payments?.length === 1 && currentExpense.balance_due === 0) ? amtNum : undefined,
          reason: editReason.trim()
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setNotice(t('msg_edit_expense_success') || 'Transaction updated successfully!');
      setTimeout(() => setNotice(''), 3500);
      setIsEditing(false);
      notifyParentUpdate();
    } catch (err) {
      setEditError(err.message || 'Failed to update transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add Installment Payment
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!currentExpense) return;
    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) {
      setPaymentError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid payment amount.');
      return;
    }
    setSubmittingPayment(true);
    setPaymentError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          payment_method: paymentMethod,
          payment_date: paymentDate || new Date().toISOString().slice(0, 10)
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotice(t('msg_payment_added') || 'Payment recorded successfully!');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Start Edit Single Payment
  const handleStartEditPayment = (p) => {
    setEditingPaymentId(p.id);
    setEditPayAmount(String(p.amount));
    setEditPayMethod(p.payment_method || 'cash');
    setEditPayDate(p.payment_date ? p.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setPaymentActionError('');
  };

  const handleCancelEditPayment = () => {
    setEditingPaymentId(null);
    setPaymentActionError('');
  };

  // Save Single Payment Edit
  const handleSavePayment = async (paymentId) => {
    if (!currentExpense) return;
    const num = parseFloat(editPayAmount);
    if (isNaN(num) || num <= 0) {
      setPaymentActionError(lang === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો.' : 'Please enter a valid amount.');
      return;
    }
    setSavingPaymentAction(true);
    setPaymentActionError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: num,
          payment_method: editPayMethod,
          payment_date: editPayDate
        })
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setEditingPaymentId(null);
      setNotice(lang === 'gu' ? 'ચૂકવણી વિગત સફળતાપૂર્વક સુધારાઈ!' : 'Payment details updated successfully!');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      setPaymentActionError(err.message || 'Failed to update payment');
    } finally {
      setSavingPaymentAction(false);
    }
  };

  // Delete Single Payment
  const handleDeletePayment = async (paymentId, amount, method) => {
    if (!currentExpense) return;
    const confirmMsg = lang === 'gu'
      ? `શું તમે ખરેખર આ ₹${amount} (${(method || '').toUpperCase()}) ની ચૂકવણી કાઢી નાખવા માંગો છો? આનાથી બાકી રકમ ફરી ઉમેરાશે.`
      : `Are you sure you want to delete this payment of ₹${amount} (${(method || '').toUpperCase()})? This will restore the balance due.`;
    if (!window.confirm(confirmMsg)) return;

    setSavingPaymentAction(true);
    setPaymentActionError('');
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.expense) {
        setCurrentExpense(res.expense);
      }
      setNotice(lang === 'gu' ? 'ચૂકવણી સફળતાપૂર્વક કાઢી નાખવામાં આવી!' : 'Payment removed successfully!');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      setPaymentActionError(err.message || 'Failed to delete payment');
    } finally {
      setSavingPaymentAction(false);
    }
  };

  // Approval Workflow Actions
  const handleApprove = async () => {
    if (!currentExpense) return;
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/approve`, { method: 'POST' });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_approved_success') || 'Transaction approved successfully!');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!currentExpense) return;
    const reason = window.prompt(lang === 'gu' ? 'નામંજૂર કરવાનું કારણ લખો:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_rejected_success') || 'Transaction rejected.');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVoid = async () => {
    if (!currentExpense) return;
    const reason = window.prompt(lang === 'gu' ? 'વ્યવહાર રદ (Void) કરવાનું કારણ લખો:' : 'Enter reason for voiding transaction:');
    if (!reason || !reason.trim()) return;
    try {
      const res = await apiFetch(`/api/expenses/${currentExpense.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.expense) setCurrentExpense(res.expense);
      setNotice(t('msg_voided_success') || 'Transaction voided.');
      setTimeout(() => setNotice(''), 3000);
      notifyParentUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!currentExpense) return;
    const confirmMsg = lang === 'gu'
      ? 'શું તમે ખરેખર આ બિનજરૂરી વ્યવહાર કાઢી નાખવા માંગો છો? આ વ્યવહાર હિસાબમાંથી કાયમ માટે દૂર થઈ જશે.'
      : 'Are you sure you want to delete this unwanted transaction? This will permanently remove it from records.';
    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(
      lang === 'gu' ? 'કાઢી નાખવાનું કારણ લખો (વૈકલ્પિક):' : 'Enter reason for deletion (optional):'
    );
    try {
      await apiFetch(`/api/expenses/${currentExpense.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: (reason || '').trim() })
      });
      alert(t('msg_tx_deleted_success') || 'Transaction deleted successfully.');
      if (onClose) onClose();
      notifyParentUpdate();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  // Lightbox Zoom Controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.3, 0.7));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <>
      {/* Main Unified Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-2xl max-w-5xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Pinned Header */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {billNumber ? (
                    <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                      BILL #{billNumber}
                    </span>
                  ) : transactionNumber ? (
                    <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                      {transactionNumber}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                      VOUCHER
                    </span>
                  )}

                  {/* Payment Status Pill */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : paymentStatus === 'partially_paid'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {paymentStatus === 'paid'
                      ? (lang === 'gu' ? 'ચૂકવેલ' : 'Paid')
                      : paymentStatus === 'partially_paid'
                      ? (lang === 'gu' ? 'અંશતઃ ચૂકવેલ' : 'Partially Paid')
                      : (lang === 'gu' ? 'બાકી ચૂકવણી' : 'Unpaid')}
                  </span>

                  {/* Approval Status Pill */}
                  {approvalStatus && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        approvalStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : approvalStatus === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : approvalStatus === 'voided'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t(`as_${approvalStatus}`) || approvalStatus}
                    </span>
                  )}

                  {/* OCR Confidence Badge */}
                  {ocrConfidence && (
                    <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OCR: {Math.round(ocrConfidence)}%</span>
                    </span>
                  )}

                  {/* Linked Daily Expense Pill */}
                  {transactionNumber && (
                    <span className="bg-blue-50 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200 inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-blue-600" />
                      <span>{transactionNumber}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {currentExpense?.worker_name
                    ? `${currentExpense.worker_name} (${lang === 'gu' ? 'કારીગર' : 'Worker'})`
                    : vendorName}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Notice Banner */}
          {notice && (
            <div className="px-6 py-2.5 bg-emerald-50 text-emerald-800 border-b border-emerald-200 text-xs flex items-center gap-2 font-medium animate-fade-in shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Voided or Rejection Reason Banner */}
          {currentExpense?.void_reason && (
            <div className="px-6 py-2.5 bg-slate-100 text-slate-800 border-b border-slate-200 text-xs flex items-center gap-2 font-medium shrink-0">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Void Reason:</strong> {currentExpense.void_reason} (by {currentExpense.voider_name || 'Owner'})
              </span>
            </div>
          )}
          {currentExpense?.rejection_reason && (
            <div className="px-6 py-2.5 bg-rose-50 text-rose-800 border-b border-rose-200 text-xs flex items-center gap-2 font-medium shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Rejection Reason:</strong> {currentExpense.rejection_reason} (by {currentExpense.rejector_name || 'Approver'})
              </span>
            </div>
          )}

          {/* Scrollable Content: 2-Column Responsive View */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Actual Bill Photo / Document & Management Actions */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {downloadUrl
                        ? (lang === 'gu' ? 'મૂળ બિલ / રસીદ ફોટો' : 'Original Scanned Bill')
                        : (lang === 'gu' ? 'ડિજિટલ વાઉચર' : 'Digital Transaction Voucher')}
                    </span>
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

                {/* Bill Image Container with Click-to-Zoom OR Styled Voucher */}
                <div className="relative group rounded-2xl border border-slate-200 bg-slate-950/5 overflow-hidden flex flex-col items-center justify-center min-h-[300px] max-h-[460px] p-2">
                  {downloadUrl ? (
                    isImage ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <img
                          src={downloadUrl}
                          alt={`Bill ${billNumber}`}
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
                          <div className="font-bold text-slate-800 text-sm">{activeAttachment?.original_filename || 'Bill Document.pdf'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {activeAttachment?.file_size_bytes ? `${(activeAttachment.file_size_bytes / 1024).toFixed(1)} KB` : ''}
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
                    /* Styled Digital Transaction Voucher when no receipt image */
                    <div className="w-full h-full min-h-[260px] p-6 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-200/60 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shadow-inner">
                        <Receipt className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-amber-900">
                          Jai Shakti Business Hub
                        </div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">
                          {lang === 'gu' ? 'ડિજિટલ ખાતાવહી વાઉચર' : 'Official Digital Voucher'}
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-1">
                          {transactionNumber || billNumber || 'Manual Entry'}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-[240px] leading-relaxed">
                        {lang === 'gu'
                          ? 'આ વ્યવહાર માટે કોઈ ભૌતિક કાગળ કે બિલ ફોટો જોડાયેલ નથી.'
                          : 'Recorded as a direct digital voucher without physical paper receipt.'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Multiple Attachments Carousel / Selector */}
                {attachmentsList.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {attachmentsList.map((att, idx) => (
                      <button
                        key={att.id || idx}
                        type="button"
                        onClick={() => setActiveAttachmentIdx(idx)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                          activeAttachmentIdx === idx
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Attachment {idx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeAttachment?.original_filename && (
                  <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                    <span className="truncate max-w-[220px]">{activeAttachment.original_filename}</span>
                    <span>
                      {activeAttachment.file_size_bytes
                        ? `${(activeAttachment.file_size_bytes / 1024).toFixed(1)} KB`
                        : ''}
                    </span>
                  </div>
                )}

                {/* Management Action Controls */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'gu' ? 'વહીવટી કાર્યવાહી' : 'Management Controls'}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Inline Edit Mode Toggle */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={isEditing ? handleCancelEditing : handleStartEditing}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm ${
                          isEditing
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{isEditing ? (t('btn_cancel_edit') || 'Cancel Edit') : (t('btn_edit_expense') || 'Edit Details')}</span>
                      </button>
                    )}

                    {/* Approve Button */}
                    {isOwnerOrManager && currentExpense?.approval_status === 'pending_approval' && (
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('btn_approve') || 'Approve'}</span>
                      </button>
                    )}

                    {/* Reject Button */}
                    {isOwnerOrManager && currentExpense?.approval_status === 'pending_approval' && (
                      <button
                        type="button"
                        onClick={handleReject}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('btn_reject') || 'Reject'}</span>
                      </button>
                    )}

                    {/* Void Button */}
                    {isOwnerOrManager && currentExpense?.approval_status === 'approved' && (
                      <button
                        type="button"
                        onClick={handleVoid}
                        className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{t('btn_void') || 'Void'}</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    {isOwnerOrManager && currentExpense && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                        title={lang === 'gu' ? 'આ વ્યવહાર કાઢી નાખો' : 'Delete transaction'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('btn_delete_entry') || 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Trail Section */}
                {currentExpense?.audit_logs && currentExpense.audit_logs.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'gu' ? 'ઓડિટ હિસ્ટ્રી' : 'Audit Trail'} ({currentExpense.audit_logs.length})</span>
                      </span>
                    </h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {currentExpense.audit_logs.map((log) => (
                        <div key={log.id} className="text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 capitalize">
                              {log.action.replace('_', ' ')}
                            </span>{' '}
                            <span className="text-slate-500">by {log.actor_name}</span>
                            {log.reason && <div className="text-slate-600 italic mt-0.5">{log.reason}</div>}
                          </div>
                          <span className="text-slate-400 whitespace-nowrap text-[10px]">
                            {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Invoice & Financial Breakdown OR Edit Form */}
              <div className="lg:col-span-7 space-y-4">
                {isEditing ? (
                  /* Comprehensive Edit Mode Form */
                  <form onSubmit={handleSaveEdit} className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-amber-300 animate-fade-in text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                          <Edit className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{t('title_edit_expense') || 'Edit Transaction'}</h4>
                          <p className="text-[11px] text-slate-500">{transactionNumber || billNumber}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {role}
                      </span>
                    </div>

                    {editError && (
                      <div className="p-2.5 bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Category */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_category')} *
                        </label>
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          required
                        >
                          {catList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {lang === 'gu' ? c.name_gu : c.name_en}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_amount')} (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          required
                        />
                        {currentExpense?.total_paid > 0 && (
                          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">
                            {lang === 'gu' ? 'પહેલેથી ચૂકવેલ:' : 'Already paid:'} {formatINR(currentExpense.total_paid)}
                          </span>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {lang === 'gu' ? 'ચૂકવણી પદ્ધતિ (Payment Method)' : 'Payment Method'}
                        </label>
                        <select
                          value={editPaymentMethod}
                          onChange={(e) => setEditPaymentMethod(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                          <option value="cash">{t('pm_cash') || 'Cash'}</option>
                          <option value="bank_transfer">{t('pm_bank_transfer') || 'Bank Transfer'}</option>
                          <option value="card">{t('pm_card') || 'Card'}</option>
                        </select>
                      </div>

                      {/* Vendor */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_vendor')}
                        </label>
                        <select
                          value={editVendorId}
                          onChange={(e) => setEditVendorId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="">{t('lbl_no_vendor') || 'None'}</option>
                          {venList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.phone ? `(${v.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('th_date')} *
                        </label>
                        <input
                          type="date"
                          value={editTransactionDate}
                          onChange={(e) => setEditTransactionDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          required
                        />
                      </div>

                      {/* Invoice Number */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_invoice_no')}
                        </label>
                        <input
                          type="text"
                          value={editInvoiceNumber}
                          onChange={(e) => setEditInvoiceNumber(e.target.value)}
                          placeholder="e.g. 1076 / INV-001"
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_description')}
                        </label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Item summary or description"
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      {/* Notes */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">
                          {t('lbl_notes')} / {lang === 'gu' ? 'વસ્તુઓ અને જથ્થો' : 'Items & Quantities'}
                        </label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Bill notes or item breakdown"
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-xs"
                        />
                      </div>

                      {/* Reason for Modification (Mandatory) */}
                      <div className="sm:col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-300">
                        <label className="block text-amber-950 font-bold mb-1 flex items-center gap-1">
                          <span className="text-red-600">*</span>
                          <span>{t('lbl_edit_reason_required') || 'Reason for Modification'}</span>
                        </label>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder={t('ph_edit_reason') || 'e.g. Corrected invoice number and rate'}
                          className="w-full p-2.5 rounded-xl border border-amber-400 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleCancelEditing}
                        disabled={savingEdit}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
                      >
                        {t('btn_cancel_edit') || 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingEdit ? (lang === 'gu' ? 'સાચવી રહ્યું છે...' : 'Saving...') : (t('btn_save_changes') || 'Save Changes')}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* 1. Vendor & Invoice Header Card */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {currentExpense?.worker_name
                              ? (lang === 'gu' ? 'કારીગર વિગત' : 'Worker Details')
                              : (lang === 'gu' ? 'વેપારી વિગત' : 'Merchant Details')}
                          </div>
                          <div className="font-bold text-slate-900 text-base mt-0.5">
                            {currentExpense?.worker_name ? currentExpense.worker_name : vendorName}
                          </div>
                          {vendorCategory && !currentExpense?.worker_name && (
                            <div className="text-xs text-amber-800 font-semibold mt-0.5">
                              {vendorCategory}
                            </div>
                          )}
                          {currentExpense?.worker_name && (
                            <div className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-bold rounded">
                              {lang === 'gu' ? 'કારીગર ઉપાડ (Worker Advance)' : 'Worker / Karigar Advance'}
                            </div>
                          )}
                        </div>

                        {vendorGstin && !currentExpense?.worker_name && (
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

                      {(vendorPhone || vendorAddress || currentExpense?.worker_phone) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                          {(vendorPhone || currentExpense?.worker_phone) && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{vendorPhone || currentExpense?.worker_phone}</span>
                            </div>
                          )}
                          {vendorAddress && !currentExpense?.worker_name && (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{vendorAddress}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. Invoice Dates & Timing (3 Metadata Boxes) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>{lang === 'gu' ? 'બિલ તારીખ' : 'Bill Date'}</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-1">
                          {billDate ? formatDate(billDate) : '—'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{lang === 'gu' ? 'ચૂકવણી મુદત' : 'Due Date'}</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-1">
                          {dueDate ? formatDate(dueDate) : '—'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-slate-200 bg-white col-span-2 sm:col-span-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === 'gu' ? 'ઇનવોઇસ નંબર' : 'Invoice / Bill No'}
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {billNumber || '—'}
                        </div>
                      </div>
                    </div>

                    {/* 3. Decoded Line Items Table (Always visible in every invoice detail) */}
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
                                  {item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : '1'}
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

                    {/* 4. Financial Summary Breakdown */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{lang === 'gu' ? 'સબ-ટોટલ' : 'Subtotal'}</span>
                        <span className="font-mono font-semibold">
                          {formatINR(subtotal)}
                        </span>
                      </div>

                      {gstTax > 0 && (
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{lang === 'gu' ? 'GST (CGST + SGST)' : 'GST Tax'}</span>
                          <span className="font-mono font-semibold">
                            {formatINR(gstTax)}
                          </span>
                        </div>
                      )}

                      {discount > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-700">
                          <span>{lang === 'gu' ? 'ડિસ્કાઉન્ટ' : 'Discount'}</span>
                          <span className="font-mono font-semibold">-{formatINR(discount)}</span>
                        </div>
                      )}

                      {otherCharges > 0 && (
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{lang === 'gu' ? 'અન્ય ચાર્જ' : 'Other Charges'}</span>
                          <span className="font-mono font-semibold">+{formatINR(otherCharges)}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                        <div>
                          <span className="text-sm font-black text-slate-900">
                            {lang === 'gu' ? 'કુલ બિલ રકમ' : 'Grand Total'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {paymentStatus === 'paid'
                              ? (lang === 'gu' ? 'સંપૂર્ણ ચૂકવાયેલ' : 'Fully Paid')
                              : (lang === 'gu' ? 'ચૂકવવાપાત્ર બાકી' : 'Payment Due')}
                          </span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
                          {formatINR(grandTotal)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">
                            {lang === 'gu' ? 'ચૂકવેલ રકમ' : 'Paid Amount'}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {formatINR(totalPaid)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">
                            {lang === 'gu' ? 'બાકી રકમ' : 'Balance Due'}
                          </span>
                          <span className="font-mono font-black text-rose-700 text-sm">
                            {formatINR(balanceDue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5. Bill Notes & Summary (Positioned directly below Grand Total) */}
                    {(activeRecord.notes || activeRecord.description) && (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-amber-50/40 text-xs space-y-1">
                        <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                          {lang === 'gu' ? 'બિલ નોંધ / વિગત' : 'Bill Notes & Summary'}
                        </div>
                        {activeRecord.description && activeRecord.description !== activeRecord.notes && (
                          <div className="text-slate-800 font-semibold mb-1">
                            {activeRecord.description}
                          </div>
                        )}
                        {activeRecord.notes && (
                          <div className="text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                            {activeRecord.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. Accounting Connection to Daily Expenses (if not linked) */}
                    {!isLinkedExpense && !currentBill?.expense_id && (
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

                        {linkError && (
                          <div className="w-full text-xs text-rose-700 flex items-center gap-1 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{linkError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. Installment Payments & Payment History */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                          <span>{lang === 'gu' ? 'ચૂકવણી હિસ્ટ્રી' : 'Payment History'} ({currentExpense?.payments?.length || (totalPaid > 0 ? 1 : 0)})</span>
                        </h4>
                      </div>

                      {paymentActionError && (
                        <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{paymentActionError}</span>
                        </div>
                      )}

                      {/* Payment rows */}
                      {currentExpense?.payments && currentExpense.payments.length > 0 ? (
                        <div className="space-y-2">
                          {currentExpense.payments.map((p) => {
                            const isItemEditing = editingPaymentId === p.id;
                            if (isItemEditing) {
                              return (
                                <div key={p.id} className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3 animate-fade-in text-xs shadow-sm">
                                  <div className="flex items-center justify-between font-bold text-amber-950 pb-1.5 border-b border-amber-200/70">
                                    <span className="flex items-center gap-1.5">
                                      <Edit className="w-3.5 h-3.5 text-amber-700" />
                                      <span>{lang === 'gu' ? 'ચૂકવણી સુધારો' : 'Edit Payment Details'}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">ID: {p.id.slice(0, 10)}...</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        {t('lbl_amount')} (₹) *
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={editPayAmount}
                                        onChange={(e) => setEditPayAmount(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        {lang === 'gu' ? 'ચૂકવણી પદ્ધતિ' : 'Payment Method'} *
                                      </label>
                                      <select
                                        value={editPayMethod}
                                        onChange={(e) => setEditPayMethod(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                      >
                                        <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                        <option value="cash">{t('pm_cash') || 'Cash'}</option>
                                        <option value="bank_transfer">{t('pm_bank_transfer') || 'Bank Transfer'}</option>
                                        <option value="card">{t('pm_card') || 'Card'}</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        {lang === 'gu' ? 'ચૂકવણી તારીખ' : 'Payment Date'} *
                                      </label>
                                      <input
                                        type="date"
                                        value={editPayDate}
                                        onChange={(e) => setEditPayDate(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        required
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/50">
                                    <button
                                      type="button"
                                      onClick={handleCancelEditPayment}
                                      disabled={savingPaymentAction}
                                      className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                                    >
                                      {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSavePayment(p.id)}
                                      disabled={savingPaymentAction}
                                      className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{savingPaymentAction ? 'Saving...' : (lang === 'gu' ? 'સાચવો' : 'Save')}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            const methodBadgeColor = p.payment_method === 'upi'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : p.payment_method === 'cash'
                              ? 'bg-slate-100 text-slate-800 border-slate-200'
                              : p.payment_method === 'bank_transfer'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200';

                            return (
                              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs hover:border-slate-300 transition">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 text-sm">{formatINR(p.amount)}</span>
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${methodBadgeColor}`}>
                                        {p.payment_method === 'upi' ? 'UPI' : p.payment_method}
                                      </span>
                                    </div>
                                    {p.reference_number && (
                                      <span className="text-[11px] text-slate-400 mt-0.5">Ref: {p.reference_number}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right text-[11px] text-slate-500">
                                    <div className="font-medium text-slate-700">{formatDate(p.payment_date)}</div>
                                    <div className="text-[10px] text-slate-400">By: {p.recorded_by_name}</div>
                                  </div>
                                  {isOwnerOrManager && currentExpense.approval_status !== 'voided' && (
                                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPayment(p)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                        title={lang === 'gu' ? 'ચૂકવણી સુધારો' : 'Edit Payment'}
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(p.id, p.amount, p.payment_method)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                        title={lang === 'gu' ? 'ચૂકવણી રદ કરો' : 'Delete Payment'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : totalPaid > 0 ? (
                        /* Fallback single payment row from bill */
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{formatINR(totalPaid)}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider bg-emerald-100 text-emerald-800 border-emerald-200">
                              {paymentStatus}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{billDate ? formatDate(billDate) : ''}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">
                          {lang === 'gu' ? 'હજુ સુધી કોઈ ચૂકવણી નોંધાયેલ નથી.' : 'No payments recorded yet.'}
                        </div>
                      )}

                      {/* Add Installment Form (when balance due > 0 and expense is linked) */}
                      {isLinkedExpense && balanceDue > 0 && currentExpense?.approval_status !== 'voided' && currentExpense?.approval_status !== 'rejected' && (
                        <form onSubmit={handleAddPayment} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-amber-950">
                                {t('btn_add_payment') || 'Record Payment'} (Remaining: {formatINR(balanceDue)})
                              </span>
                              <button
                                type="button"
                                onClick={() => setPaymentAmount(balanceDue.toString())}
                                className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm transition flex items-center gap-1"
                                title={lang === 'gu' ? 'બાકી પૂરી રકમ આપોઆપ ભરો' : 'Auto-fill full remaining balance'}
                              >
                                <span>{lang === 'gu' ? 'ચૂકતે કરો (Full Pay)' : 'Full Pay'}</span>
                              </button>
                            </div>
                          </div>

                          {paymentError && (
                            <div className="text-xs text-red-600 font-semibold">{paymentError}</div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {t('lbl_amount')} (₹) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                max={balanceDue}
                                required
                                placeholder="Amount (₹)"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {t('lbl_payment_method')} *
                              </label>
                              <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                              >
                                <option value="cash">{t('pm_cash') || 'Cash'}</option>
                                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                                <option value="bank_transfer">{t('pm_bank_transfer') || 'Bank Transfer'}</option>
                                <option value="card">{t('pm_card') || 'Card'}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {lang === 'gu' ? 'ચૂકવણી તારીખ' : 'Payment Date'} *
                              </label>
                              <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={submittingPayment}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{submittingPayment ? 'Recording...' : (t('btn_add_payment') || 'Record Payment')}</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {(currentExpense?.creator_name || currentBill?.created_by_name) && (
                <span>
                  {lang === 'gu' ? 'નોંધનાર: ' : 'Recorded by: '}
                  <strong className="text-slate-700">
                    {currentExpense?.creator_name || currentBill?.created_by_name}
                  </strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              {t('btn_cancel') || 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Lightbox Fullscreen Viewer */}
      {lightboxOpen && downloadUrl && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col animate-fade-in">
          {/* Top Lightbox Toolbar */}
          <div className="p-3 px-4 flex items-center justify-between text-white border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                {billNumber ? `Bill #${billNumber}` : transactionNumber ? `Receipt — ${transactionNumber}` : 'Document Viewer'}
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
                download={activeAttachment?.original_filename || 'bill.jpg'}
                className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition ml-2"
                title="Download"
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
              alt="Document Fullscreen"
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

export default ExpenseDetailsModal;
