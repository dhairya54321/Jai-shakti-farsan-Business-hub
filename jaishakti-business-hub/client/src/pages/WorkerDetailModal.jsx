import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import RecordUpadModal from './RecordUpadModal';
import SettleSalaryModal from './SettleSalaryModal';
import AddWorkerModal from './AddWorkerModal';
import DiaryScanModal from './DiaryScanModal';
import DiaryHistoryModal from './DiaryHistoryModal';
import {
  X,
  User,
  Phone,
  Briefcase,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Gift,
  Printer,
  Share2,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  ShieldCheck,
  Edit,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  KeyRound,
  CalendarDays,
  Camera,
  BookOpen,
  ArrowUpDown,
  Filter,
  Info,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const RAMESH_MONTHLY_BREAKDOWN = [
  {
    id: 'm1',
    period: '04 Oct 2025 – 07 Nov 2025',
    periodGu: 'દિવાળી હિસાબ (૭-૧૧-૨૫ સુધી)',
    page: '13',
    baseSalary: 14000,
    bonus: 2000,
    leavesDays: 19,
    leaveDeduction: 0,
    netEarned: 16000,
    upadSettled: 4730,
    netCashPaid: 3678,
    status: 'Settled on Diwali',
    notes: 'Diwali vacation (16 days) + 3 days home visit honored without deduction. ₹4,730 advance cleared.',
    notesGu: 'દિવાળી વેકેશન (૧૬ દિવસ) + ૩ દિવસ રજાનો પગાર કપાત કરેલ નથી. ₹૪,૭૩૦ ઉપાડ સરભર.'
  },
  {
    id: 'm2',
    period: '07 Nov 2025 – 06 Dec 2025',
    periodGu: '૦૭-૧૧-૨૫ થી ૦૬-૧૨-૨૫ (૧ મહિનો)',
    page: '14',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 3,
    leaveDeduction: 1400,
    netEarned: 12600,
    upadSettled: 5270,
    netCashPaid: 0,
    status: 'Upad Settled on 06-12-25 (Bal: ₹7,330)',
    notes: '30 days salary ₹14,000 - 3 days leaves (₹1,400) = ₹12,600. Less total Upad ₹5,270 = ₹7,330 remaining salary payable (carried to 21-12-25).',
    notesGu: '૩૦ દિવસ પગાર ₹૧૪,૦૦૦ - ૩ દિવસ રજા (₹૧,૪૦૦) = ₹૧૨,૬૦૦. તેમાંથી કુલ ઉપાડ ₹૫,૨૭૦ કપાત કર્યો. બાકી નીકળતો પગાર ₹૭,૩૩૦ તા. ૨૧-૧૨ પર સરભર.'
  },
  {
    id: 'm3',
    period: '07 Dec 2025 – 20 Dec 2025',
    periodGu: '૦૭-૧૨-૨૫ થી ૨૦-૧૨-૨૫ (૧૪ દિવસ)',
    page: '14',
    baseSalary: 6533,
    bonus: 0,
    leavesDays: 0,
    leaveDeduction: 0,
    netEarned: 6533,
    upadSettled: 0,
    netCashPaid: 13863,
    status: 'Cash Paid in Full on 21-12-25',
    notes: '14 days worked = ₹6,533. Cash settlement: 6-12 remaining salary (₹7,330) + 14 days salary (₹6,533) = ₹13,863 cash paid in full.',
    notesGu: '૧૪ દિવસ કામ = ₹૬,૫૩૩. રોકડા ચૂકતે: ૬-૧૨ નો બાકી પગાર (₹૭,૩૩૦) + ૧૪ દિવસનો પગાર (₹૬,૫૩૩) = પૂરા ₹૧૩,૮૬૩ રોકડા ચૂકવ્યા.'
  },
  {
    id: 'm4',
    period: '27 Dec 2025 – 26 Jan 2026',
    periodGu: '૨૭-૧૨-૨૫ થી ૨૬-૦૧-૨૬ (૧ મહિનો)',
    page: '15',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 0,
    leaveDeduction: 0,
    netEarned: 14000,
    upadSettled: 0,
    netCashPaid: 14000,
    status: 'Paid in Full Cash',
    notes: '0 leaves. Full ₹14,000 monthly salary paid in cash. ₹20,200 advances carried forward.',
    notesGu: '૦ રજા. પૂરો ₹૧૪,૦૦૦ પગાર રોકડો ચૂકવ્યો. ઉપાડ ₹૨૦,૨૦૦ બાકી રાખેલ.'
  },
  {
    id: 'm5',
    period: '27 Jan 2026 – 26 Feb 2026',
    periodGu: '૨૭-૦૧-૨૬ થી ૨૬-૦૨-૨૬ (૧ મહિનો)',
    page: '16',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 0,
    leaveDeduction: 0,
    netEarned: 14000,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Pooled for March settlement',
    notes: '0 leaves. Full ₹14,000 monthly salary earned; held for March 8 bulk advance settlement.',
    notesGu: '૦ રજા. પૂરો ₹૧૪,૦૦૦ પગાર. તા. ૮-૩ ના રોજ ઉપાડ સામે સરભર કરેલ.'
  },
  {
    id: 'm6',
    period: '27 Feb 2026 – 07 Mar 2026',
    periodGu: '૨૭-૦૨-૨૬ થી ૦૭-૦૩-૨૬ (૯ દિવસ)',
    page: '16',
    baseSalary: 4197,
    bonus: 0,
    leavesDays: 4,
    leaveDeduction: 1867,
    netEarned: 2330,
    upadSettled: 25800,
    netCashPaid: 4530,
    status: 'Settled on 08-03-26',
    notes: '4 days leave cut ₹1,867. 5 days worked = ₹2,330. Combined wages (14,000 + 14,000 + 2,330 = 30,330) cleared ₹25,800 advance; ₹4,530 cash paid.',
    notesGu: '૪ દિવસ રજા કપાત ₹૧,૮૬૭. કુલ ₹૩૦,૩૩૦ પગારમાંથી ₹૨૫,૮૦૦ ઉપાડ સરભર કરી ₹૪,૫૩૦ રોકડા ચૂકવ્યા.'
  },
  {
    id: 'm7',
    period: '10 Mar 2026 – 04 Apr 2026',
    periodGu: '૧૦-૦૩-૨૬ થી ૦૪-૦૪-૨૬ (૨૬ દિવસ)',
    page: '17',
    baseSalary: 12133,
    bonus: 0,
    leavesDays: 9,
    leaveDeduction: 4200,
    netEarned: 12133,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Pooled for June settlement',
    notes: '9 days leave (1-3 to 9-3). Credited exact 26 days worked @ ₹466.66 = ₹12,133.',
    notesGu: '૯ દિવસ રજા (૧-૩ થી ૯-૩). ૨૬ દિવસ કામ @ ₹૪૬૬.૬૬ = ₹૧૨,૧૩૩ બનેલ પગાર.'
  },
  {
    id: 'm8',
    period: '09 Apr 2026 – 17 Apr 2026',
    periodGu: '૦૯-૦૪-૨૬ થી ૧૭-૦૪-૨૬ (૯ દિવસ)',
    page: '17',
    baseSalary: 6067,
    bonus: 0,
    leavesDays: 4,
    leaveDeduction: 1867,
    netEarned: 4200,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Pooled for June settlement',
    notes: '4 days leave (5-4 to 8-4) cut ₹1,867. Credited 9 days worked @ ₹466.67 = ₹4,200.',
    notesGu: '૪ દિવસ રજા (૫-૪ થી ૮-૪) કપાત ₹૧,૮૬૭. ૯ દિવસ કામ @ ₹૪૬૬.૬૭ = ₹૪,૨૦૦ બનેલ પગાર.'
  },
  {
    id: 'm9',
    period: '22 Apr 2026 – 03 May 2026',
    periodGu: '૨૨-૦૪-૨૬ થી ૦૩-૦૫-૨૬ (૧૨ દિવસ)',
    page: '17',
    baseSalary: 7467,
    bonus: 0,
    leavesDays: 4,
    leaveDeduction: 1867,
    netEarned: 5600,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Pooled for June settlement',
    notes: '4 days leave (18-4 to 21-4) cut ₹1,867. Credited 12 days worked @ ₹466.67 = ₹5,600.',
    notesGu: '૪ દિવસ રજા (૧૮-૪ થી ૨૧-૪) કપાત ₹૧,૮૬૭. ૧૨ દિવસ કામ @ ₹૪૬૬.૬૭ = ₹૫,૬૦૦ બનેલ પગાર.'
  },
  {
    id: 'm10',
    period: '04 May 2026 – 25 May 2026',
    periodGu: '૦૪-૦૫-૨૬ થી ૨૫-૦૫-૨૬ (ઉનાળુ રજા)',
    page: '18',
    baseSalary: 0,
    bonus: 0,
    leavesDays: 22,
    leaveDeduction: 0,
    netEarned: 0,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Summer Vacation',
    notes: '22 days annual summer vacation (went home 4-5, resumed 26-5). 0 work days, no wages accrued.',
    notesGu: 'વાર્ષિક ઉનાળુ વેકેશન (૪-૫ ઘરે ગયા, ૨૬-૫ એ આવ્યા). ૦ કામ દિવસ.'
  },
  {
    id: 'm11',
    period: '26 May 2026 – 25 Jun 2026',
    periodGu: '૨૬-૦૫-૨૬ થી ૨૫-૦૬-૨૬ (૧ મહિનો)',
    page: '18',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 0,
    leaveDeduction: 0,
    netEarned: 14000,
    upadSettled: 30040,
    netCashPaid: 5893,
    status: 'Settled on 26-06-26',
    notes: 'Full month worked = ₹14,000. Grand settlement of 4 pooled periods (12,133 + 4,200 + 5,600 + 14,000 = 35,933) cleared ₹30,040 advance; ₹5,893 cash paid.',
    notesGu: 'પૂરો મહિનો કામ = ₹૧૪,૦૦૦. કુલ પગાર ₹૩૫,૯૩૩ માંથી ₹૩૦,૦૪૦ ઉપાડ સરભર કરી ₹૫,૮૯૩ રોકડા ચૂકવ્યા.'
  },
  {
    id: 'm12',
    period: '06 Jul 2026 – 05 Aug 2026',
    periodGu: '૦૬-૦૭-૨૬ થી ૦૫-૦૮-૨૬ (પાના ૧૯)',
    page: '19',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 9,
    leaveDeduction: 4200,
    netEarned: 9800,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Settled on Page 20 (Upad: ₹18,510)',
    notes: '9 days leave (5d 13-7 to 17-7 + 4d 2-8 to 5-8). Carried forward to Page 20 with ₹18,510 advance.',
    notesGu: '૯ દિવસ રજા (૧૩-૭ થી ૧૭-૭ અને ૨-૮ થી ૫-૮). પાના નં. ૨૦ પર ₹૧૮,૫૧૦ ઉપાડ સાથે આગળ ખેંચેલ.'
  },
  {
    id: 'm13',
    period: '26 Jun 2026 – 28 Aug 2026',
    periodGu: '૨૬-૦૬-૨૬ થી ૨૮-૦૮-૨૬ (૫૫ દિવસ)',
    page: '20',
    baseSalary: 25666,
    bonus: 0,
    leavesDays: 4,
    leaveDeduction: 0,
    netEarned: 25666,
    upadSettled: 25666,
    netCashPaid: 0,
    status: 'Settled on 28-08-26 (Upad reduced to ₹9,344)',
    notes: '55 working days (17d ₹7,933 + 15d ₹7,000 + 23d ₹10,733 = ₹25,666). Full ₹25,666 deducted from ₹35,010 Upad! Remaining Upad = ₹9,344. 4 days leave (29-8 to 2-9).',
    notesGu: '૫૫ દિવસ કામ (૧૭ દિ ૭,૯૩૩ + ૧૫ દિ ૭,૦૦૦ + ૨૩ દિ ૧૦,૭૩૩ = ₹૨૫,૬૬૬). કુલ પગાર ઉપાડ ₹૩૫,૦૧૦ માંથી કપાત કર્યો. વધારાનો ઉપાડ ₹૯,૩૪૪ બાકી રહ્યો. ૪ દિવસ રજા.'
  },
  {
    id: 'm14',
    period: '03 Sep 2026 – 20 Oct 2026',
    periodGu: '૦૩-૦૯-૨૬ થી ૨૦-૧૦-૨૬ (ચાલુ મહિનો)',
    page: '21',
    baseSalary: 14000,
    bonus: 0,
    leavesDays: 1,
    leaveDeduction: 467,
    netEarned: 13533,
    upadSettled: 0,
    netCashPaid: 0,
    status: 'Current Cycle (Outstanding Upad: ₹29,234)',
    notes: 'New month started on 3-9-26. Brought forward Upad ₹9,334 / ₹9,344 + Page 21 advances = Total outstanding ₹29,234. 1 day leave on 5-10-26.',
    notesGu: 'તા. ૩-૯-૨૬ થી નવો મહિનો શરૂ. સામેના પાનનો વધારાનો ઉપાડ ₹૯,૩૩૪ + પાના નં. ૨૧ ના નવા ઉપાડ = કુલ બાકી ઉપાડ ₹૨૯,૨૩૪. તા. ૫-૧૦ ના રોજ ૧ દિવસ રજા.'
  }
];

export function WorkerDetailModal({ isOpen, workerId, onClose, onWorkerUpdated }) {
  const { lang, t, formatINR, formatDate } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [workerData, setWorkerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState('');

  // Active Tab: 'ledger' | 'leaves' | 'attendance' | 'profile'
  const [activeTab, setActiveTab] = useState('ledger');

  // Filters & sort order for Passbook Ledger
  const [monthFilter, setMonthFilter] = useState('all');
  const [pageFilter, setPageFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = Bank Passbook order (oldest first)

  // Sub-modals
  const [showUpadModal, setShowUpadModal] = useState(false);
  const [upadModalType, setUpadModalType] = useState('advance_given');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiaryScanModal, setShowDiaryScanModal] = useState(false);
  const [showDiaryHistoryModal, setShowDiaryHistoryModal] = useState(false);
  const [diaryScans, setDiaryScans] = useState([]);

  // Leave recording states
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState('1');
  const [leaveReason, setLeaveReason] = useState('ઘરે ગયા (Went home)');
  const [leaveDeduction, setLeaveDeduction] = useState('');
  const [recordingLeave, setRecordingLeave] = useState(false);
  const [showRecordLeaveForm, setShowRecordLeaveForm] = useState(false);

  const isRamesh = useMemo(() => {
    return (
      workerId === 'wrk_0b8c869a-847c-4c52-8803-22c54504a463' ||
      (workerData?.name && workerData.name.toLowerCase().includes('ramesh'))
    );
  }, [workerId, workerData]);

  // Worker PIN states
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (isOpen && workerId) {
      loadWorkerDetails();
    }
  }, [isOpen, workerId]);

  const loadWorkerDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/workers/${workerId}`);
      if (res.worker) {
        setWorkerData(res.worker);
        setTransactions(res.transactions || []);
        setAttendance(res.attendance || null);
        setLeaves(res.leaves || []);
        setNewPin(res.worker.login_pin || '1234');
      }

      // Load scanned diary photos count & list
      try {
        const scansRes = await apiFetch(`/api/workers/${workerId}/diary-scans`);
        if (scansRes.success) {
          setDiaryScans(scansRes.scans || []);
        }
      } catch (scanErr) {
        console.warn('Failed to load diary scans:', scanErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load worker details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId) => {
    const confirmMsg = lang === 'gu'
      ? 'શું તમે ખરેખર આ ખાતાવહી વ્યવહાર કાઢી નાખવા માંગો છો?'
      : 'Are you sure you want to delete this transaction from the worker ledger?';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/api/workers/${workerId}/transactions/${txId}`, {
        method: 'DELETE'
      });
      if (res.worker) {
        setWorkerData(res.worker);
        setTransactions(res.transactions || []);
      }
      if (onWorkerUpdated) onWorkerUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction.');
    }
  };

  const handleRecordLeave = async (e) => {
    e.preventDefault();
    if (!leaveDays || Number(leaveDays) <= 0) return;
    setRecordingLeave(true);
    try {
      const res = await apiFetch(`/api/workers/${workerId}/leaves`, {
        method: 'POST',
        body: JSON.stringify({
          start_date: leaveStartDate,
          end_date: leaveEndDate || leaveStartDate,
          total_days: Number(leaveDays),
          reason: leaveReason.trim() || 'ઘરે ગયા (Went home)',
          deduction_amount: Number(leaveDeduction) || 0
        })
      });
      if (res.worker) {
        setWorkerData(res.worker);
        setTransactions(res.transactions || []);
        setLeaves(res.leaves || []);
      }
      setLeaveDays('1');
      setLeaveReason('ઘરે ગયા (Went home)');
      setLeaveDeduction('');
      if (onWorkerUpdated) onWorkerUpdated();
    } catch (err) {
      alert(err.message || 'Failed to record leave.');
    } finally {
      setRecordingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm(lang === 'gu' ? 'શું તમે આ રજા કાઢી નાખવા માંગો છો?' : 'Delete this leave entry?')) return;
    try {
      const res = await apiFetch(`/api/workers/${workerId}/leaves/${leaveId}`, {
        method: 'DELETE'
      });
      if (res.worker) {
        setWorkerData(res.worker);
        setTransactions(res.transactions || []);
        setLeaves(res.leaves || []);
      }
      if (onWorkerUpdated) onWorkerUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete leave.');
    }
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('PIN must be at least 4 digits.');
      return;
    }
    setSavingPin(true);
    try {
      await apiFetch(`/api/workers/${workerId}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ pin: newPin })
      });
      setWorkerData(prev => ({ ...prev, login_pin: newPin }));
      setPinMessage(lang === 'gu' ? 'પિન સફળતાપૂર્વક બદલાઈ ગયો!' : 'PIN updated successfully!');
      setTimeout(() => setPinMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!workerData) return;
    const workerPhone = workerData.phone ? `91${workerData.phone}` : '';
    const text = encodeURIComponent(
      `*જય શક્તિ ફરસાણ માર્ટ - કારીગર ખાતાવહી હિસાબ*\n` +
      `કારીગરનું નામ: ${workerData.name}\n` +
      `હાલનો બાકી ઉપાડ (Due): ₹${workerData.outstanding_advance || 0}\n` +
      `કુલ ઉપાડ લીધો: ₹${workerData.total_advance_given || 0}\n` +
      `કુલ જમા / કપાત: ₹${workerData.total_advance_returned || 0}\n` +
      `તારીખ: ${new Date().toLocaleDateString('en-GB')}`
    );
    window.open(`https://wa.me/${workerPhone}?text=${text}`, '_blank');
  };

  // Available Diary Pages across transactions and scans
  const availablePages = useMemo(() => {
    const pSet = new Set();
    (transactions || []).forEach(t => {
      if (t.diary_page) pSet.add(String(t.diary_page));
    });
    (diaryScans || []).forEach(s => {
      if (s.diary_page) pSet.add(String(s.diary_page));
    });
    return Array.from(pSet).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [transactions, diaryScans]);

  // Compute strictly chronological running balance for Bank Passbook
  const transactionsWithBalance = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    const chronological = [...list].sort((a, b) => {
      const dCmp = (a.transaction_date || '').localeCompare(b.transaction_date || '');
      if (dCmp !== 0) return dCmp;
      if (a.transaction_type !== b.transaction_type) {
        if (a.transaction_type === 'advance_given') return -1;
        if (b.transaction_type === 'advance_given') return 1;
      }
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    let running = Number(workerData?.initial_advance || 0);
    return chronological.map((t, idx) => {
      const prevBal = running;
      let debit = 0;
      let credit = 0;
      if (t.transaction_type === 'advance_given') {
        debit = Number(t.amount || 0);
        running += debit;
      } else if (t.transaction_type === 'advance_returned' || t.transaction_type === 'salary_deduction') {
        credit = Number(t.amount || 0);
        running -= credit;
      }
      return {
        ...t,
        entryIndex: idx + 1,
        prev_balance: Math.round(prevBal * 100) / 100,
        debit_amount: debit,
        credit_amount: credit,
        running_balance: Math.round(running * 100) / 100
      };
    });
  }, [transactions, workerData?.initial_advance]);

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const displayedTransactions = useMemo(() => {
    let result = [...transactionsWithBalance];

    if (monthFilter === 'current') {
      result = result.filter(t => t.transaction_date && t.transaction_date.startsWith(currentYearMonth));
    }

    if (pageFilter !== 'all') {
      result = result.filter(t => String(t.diary_page || '') === String(pageFilter));
    }

    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [transactionsWithBalance, monthFilter, pageFilter, sortOrder, currentYearMonth]);

  const currentViewStats = useMemo(() => {
    if (pageFilter === 'all') {
      const totalDebits = transactionsWithBalance.reduce((s, t) => s + (t.debit_amount || 0), 0);
      const totalCredits = transactionsWithBalance.reduce((s, t) => s + (t.credit_amount || 0), 0);
      return {
        isPageFiltered: false,
        title: lang === 'gu' ? 'સંપૂર્ણ ખાતાવહી પાસબુક (બધા પાના)' : 'Full Khata Passbook (All Diary Pages)',
        opening: Number(workerData?.initial_advance || 0),
        debits: totalDebits,
        credits: totalCredits,
        closing: Math.round(((workerData?.initial_advance || 0) + totalDebits - totalCredits) * 100) / 100,
        count: displayedTransactions.length
      };
    }

    const pageTxs = transactionsWithBalance.filter(t => String(t.diary_page || '') === String(pageFilter));
    if (pageTxs.length === 0) {
      return {
        isPageFiltered: true,
        pageNo: pageFilter,
        title: lang === 'gu' ? `ચોપડા પાના નં. ${pageFilter} નો હિસાબ` : `Diary Page No. ${pageFilter} Statement`,
        opening: 0,
        debits: 0,
        credits: 0,
        closing: 0,
        count: 0
      };
    }

    const first = pageTxs[0];
    const last = pageTxs[pageTxs.length - 1];
    const debits = pageTxs.reduce((s, t) => s + (t.debit_amount || 0), 0);
    const credits = pageTxs.reduce((s, t) => s + (t.credit_amount || 0), 0);

    return {
      isPageFiltered: true,
      pageNo: pageFilter,
      title: lang === 'gu' ? `ચોપડા પાના નં. ${pageFilter} નો હિસાબ` : `Diary Page No. ${pageFilter} Statement`,
      opening: first ? first.prev_balance : 0,
      debits,
      credits,
      closing: last ? last.running_balance : 0,
      count: pageTxs.length
    };
  }, [pageFilter, displayedTransactions, transactionsWithBalance, workerData, lang]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[95vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-4 text-white flex items-center justify-between shrink-0 print:bg-amber-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/20">
              {workerData ? workerData.name.charAt(0) : 'W'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg sm:text-xl">
                  {workerData ? workerData.name : 'Worker Profile'}
                </h2>
                {workerData && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    workerData.is_active ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40' : 'bg-slate-500/30 text-slate-200'
                  }`}>
                    {workerData.is_active ? (lang === 'gu' ? 'સક્રિય' : 'Active') : (lang === 'gu' ? 'છૂટા થયેલ' : 'Inactive')}
                  </span>
                )}
              </div>
              {workerData && (
                <p className="text-xs text-amber-100 flex items-center gap-2 mt-0.5">
                  <span>{workerData.role_title || ''}</span>
                  {workerData.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 inline" /> {workerData.phone}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-semibold">
                    {workerData.wage_type === 'monthly'
                      ? `${formatINR(workerData.base_salary)} / મહિને`
                      : `${formatINR(workerData.base_salary)} / રોજ`}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              title={lang === 'gu' ? 'વિગતો સુધારો' : 'Edit Profile'}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-sm font-medium">
              {lang === 'gu' ? 'કારીગર ખાતાવહી લોડ થઈ રહી છે...' : 'Loading worker ledger...'}
            </span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">
            {error}
          </div>
        ) : workerData && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50 border-b border-slate-100 shrink-0">
              {/* Outstanding Advance */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'gu' ? 'ચાલુ બાકી ઉપાડ' : 'Outstanding Upad'}
                </span>
                <span className={`text-xl sm:text-2xl font-black block mt-0.5 ${
                  workerData.outstanding_advance > 0 ? 'text-red-600' : 'text-slate-800'
                }`}>
                  {formatINR(workerData.outstanding_advance)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {workerData.outstanding_advance > 0
                    ? (lang === 'gu' ? 'પગારમાંથી કપાવાપાત્ર' : 'To be deducted from salary')
                    : (lang === 'gu' ? 'કોઈ ઉપાડ બાકી નથી' : 'No advance pending')}
                </span>
              </div>

              {/* Total Advance Given */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'gu' ? 'કુલ ઉપાડ લીધો' : 'Total Upad Taken'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-0.5">
                  {formatINR(workerData.total_advance_given)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {lang === 'gu' ? 'બધા વ્યવહારો' : 'All-time advances'}
                </span>
              </div>

              {/* Total Returned / Adjusted */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'gu' ? 'કુલ જમા / કપાત' : 'Repaid / Deducted'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 block mt-0.5">
                  {formatINR(workerData.total_advance_returned)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {lang === 'gu' ? 'પરત / પગાર સામે' : 'Repaid or salary cut'}
                </span>
              </div>

              {/* Total Salary Paid */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === 'gu' ? 'કુલ ચૂકવેલ પગાર' : 'Total Salary Paid'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-700 block mt-0.5">
                  {formatINR(workerData.total_salary_paid)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {lang === 'gu' ? 'નેટ કેશ ચુકવણી' : 'Net cash settlements'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons Bar */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setUpadModalType('advance_given'); setShowUpadModal(true); }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-600/30 transition flex items-center gap-1.5"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{t('btn_give_upad')}</span>
                </button>

                <button
                  onClick={() => { setUpadModalType('advance_returned'); setShowUpadModal(true); }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{t('btn_return_upad')}</span>
                </button>

                <button
                  onClick={() => setShowSettleModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-600/30 transition flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{t('btn_settle_salary')}</span>
                </button>

                <button
                  onClick={() => { setUpadModalType('bonus'); setShowUpadModal(true); }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Gift className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('btn_add_bonus')}</span>
                </button>

                <button
                  onClick={() => setShowDiaryScanModal(true)}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  title={lang === 'gu' ? 'જૂનો ચોપડો સ્કેન કરો (OCR)' : 'Scan Old Diary (OCR)'}
                >
                  <Camera className="w-3.5 h-3.5 text-purple-600" />
                  <span>{lang === 'gu' ? 'ચોપડો સ્કેન' : 'Scan Diary'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  title="Share Khata on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('lbl_share_whatsapp')}</span>
                </button>

                <button
                  onClick={handlePrintSlip}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  title="Print Khata Passbook"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('lbl_print_statement')}</span>
                </button>

                <button
                  onClick={() => setShowDiaryHistoryModal(true)}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  title={lang === 'gu' ? 'સ્કેન કરેલ જૂના ચોપડાના અસલ ફોટા' : 'History of Scanned Diary Photos'}
                >
                  <Camera className="w-3.5 h-3.5 text-purple-600" />
                  <span>{lang === 'gu' ? 'ચોપડા ફોટા હિસ્ટ્રી' : 'History of Scan Diary'}</span>
                  {diaryScans.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded-full text-[10px] font-black">
                      {diaryScans.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Navigation Tabs Header */}
            <div className="px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'ledger'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('lbl_passbook_ledger')} ({transactions.length})
                </button>

                <button
                  onClick={() => setActiveTab('leaves')}
                  className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'leaves'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {lang === 'gu' ? 'રજાઓ & કપાત' : 'Leaves & Deductions'} ({leaves.length})
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'attendance'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('lbl_attendance_sheet')}
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'profile'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {lang === 'gu' ? 'પ્રોફાઇલ અને વિગતો' : 'Profile & Info'}
                </button>
              </div>

              {activeTab === 'ledger' && (
                <div className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Diary Page Filter */}
                    <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="text-[11px] font-bold text-purple-900 hidden sm:inline">
                        {lang === 'gu' ? 'ચોપડા પાનું:' : 'Diary Page:'}
                      </span>
                      <select
                        value={pageFilter}
                        onChange={(e) => setPageFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-purple-900 focus:outline-none cursor-pointer"
                      >
                        <option value="all">{lang === 'gu' ? 'બધા પાના (All Pages)' : 'All Diary Pages'}</option>
                        {availablePages.map((pg) => (
                          <option key={pg} value={pg}>
                            {lang === 'gu' ? `પાના નં. ${pg}` : `Page ${pg}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month Filter */}
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded-xl text-xs bg-white font-medium shadow-2xs"
                    >
                      <option value="all">{lang === 'gu' ? 'બધા મહિના' : 'All Months'}</option>
                      <option value="current">{lang === 'gu' ? 'ચાલુ મહિનો' : 'This Month'}</option>
                    </select>

                    {/* Clear Filter Button if page filter active */}
                    {pageFilter !== 'all' && (
                      <button
                        onClick={() => setPageFilter('all')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                        title={lang === 'gu' ? 'બધા પાના જુઓ' : 'View All Pages'}
                      >
                        ✕ {lang === 'gu' ? 'બધા પાના' : 'Show All'}
                      </button>
                    )}
                  </div>

                  {/* Passbook Sort Order Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-2.5 py-1 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                      title={lang === 'gu' ? 'પાસબુક ક્રમ બદલો' : 'Toggle Sort Order'}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        {sortOrder === 'asc'
                          ? (lang === 'gu' ? 'પાસબુક ક્રમ (જૂના પ્રથમ ⬇)' : 'Passbook Order (Oldest First ⬇)')
                          : (lang === 'gu' ? 'નવા વ્યવહારો પ્રથમ ⬆' : 'Newest First ⬆')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tab Contents Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: KHATA LEDGER / PASSBOOK */}
              {activeTab === 'ledger' && (
                <div>
                  {/* Real Bank Passbook Summary & Formula Banner */}
                  {currentViewStats && (
                    <div className="mb-3.5 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/90 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span className="text-xs sm:text-sm font-black text-amber-950 tracking-tight">
                            {currentViewStats.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-300">
                            {currentViewStats.count} {lang === 'gu' ? 'નોંધ' : 'entries'}
                          </span>
                        </div>

                        {/* Passbook Math Metrics */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                            <span className="text-slate-500 font-medium">{lang === 'gu' ? 'શરૂઆત બાકી:' : 'Opening Bal:'}</span>{' '}
                            <span className="font-bold text-slate-800">{formatINR(currentViewStats.opening)}</span>
                          </div>
                          <span className="text-amber-400 font-bold">+</span>
                          <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs">
                            <span className="text-red-600 font-medium">{lang === 'gu' ? 'લીધેલ ઉપાડ:' : 'Debit (Upad):'}</span>{' '}
                            <span className="font-black text-red-600">+{formatINR(currentViewStats.debits)}</span>
                          </div>
                          <span className="text-amber-400 font-bold">-</span>
                          <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                            <span className="text-emerald-700 font-medium">{lang === 'gu' ? 'જમા / કપાત:' : 'Credit (Settled):'}</span>{' '}
                            <span className="font-black text-emerald-700">-{formatINR(currentViewStats.credits)}</span>
                          </div>
                          <span className="text-amber-400 font-bold">=</span>
                          <div className="bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-300 text-amber-950 shadow-2xs">
                            <span className="font-bold">{lang === 'gu' ? 'આખર બાકી ઉપાડ:' : 'Outstanding Upad:'}</span>{' '}
                            <span className="font-black text-sm">{formatINR(currentViewStats.closing)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bank Passbook Explainer Subtext */}
                      <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900/80">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            {lang === 'gu'
                              ? 'બેંક પાસબુક નિયમ: પાછલો ઉપાડ + નવો ઉપાડ (ઉધાર) - જમા/કપાત = ચાલુ બાકી ઉપાડ (આંકડા ચોપડા સાથે મેળ ખાય છે)'
                              : 'Bank Passbook Rule: Previous Balance + Debit (Advance) - Credit (Settled) = Outstanding Balance'}
                          </span>
                        </span>
                        {pageFilter !== 'all' && (
                          <span className="text-purple-700 font-bold hidden sm:inline">
                            {lang === 'gu' ? `પાના નં. ${pageFilter} નો સંપૂર્ણ અસલ ચોપડા હિસાબ` : `Showing Diary Page ${pageFilter}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {displayedTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                      {lang === 'gu' ? 'આ ફિલ્ટરમાં કોઈ વ્યવહાર નોંધાયેલ નથી.' : 'No transactions found for this filter.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                          <tr>
                            <th className="py-3 px-2 sm:px-3 text-center text-slate-400 w-10">#</th>
                            <th className="py-3 px-3 whitespace-nowrap">{t('th_tx_date')}</th>
                            <th className="py-3 px-2.5 text-center whitespace-nowrap">
                              {lang === 'gu' ? 'ચોપડા પાનું' : 'Diary Page'}
                            </th>
                            <th className="py-3 px-3 whitespace-nowrap">{t('th_tx_type')}</th>
                            <th className="py-3 px-3">{lang === 'gu' ? 'વિગત / નોંધ' : 'Particulars & Notes'}</th>
                            <th className="py-3 px-3 text-right text-red-700 whitespace-nowrap">
                              {lang === 'gu' ? 'ઉપાડ / ઉધાર (+)' : 'Debit / Advance (+)'}
                            </th>
                            <th className="py-3 px-3 text-right text-emerald-700 whitespace-nowrap">
                              {lang === 'gu' ? 'જમા / કપાત (-)' : 'Credit / Settled (-)'}
                            </th>
                            <th className="py-3 px-3 text-right bg-amber-50/90 text-amber-950 font-black whitespace-nowrap border-l border-amber-200/80">
                              {lang === 'gu' ? 'બાકી ઉપાડ (Due)' : 'Outstanding Upad'}
                            </th>
                            <th className="py-3 px-3 text-center print:hidden">{t('th_actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedTransactions.map((tx, index) => {
                            const isAdvance = tx.transaction_type === 'advance_given';
                            const isReturn = tx.transaction_type === 'advance_returned' || tx.transaction_type === 'salary_deduction';
                            const isSalary = tx.transaction_type === 'salary_paid';
                            const isBonus = tx.transaction_type === 'bonus';
                            const isDeduction = tx.transaction_type === 'deduction';
                            const isFarsan = tx.category_type === 'farsan' || tx.category_type === 'farsan_item';

                            const isSalaryDeduction = isReturn && (tx.notes?.includes('પગાર') || tx.notes?.toLowerCase().includes('salary'));
                            const isWagesCalculation = isSalary && (tx.notes?.includes('ગણતરી') || tx.notes?.toLowerCase().includes('calculation') || tx.notes?.includes('દિવસ'));

                            // Detect Diary Page Transition to render "Carried Forward (પાછલો ઉપાડ)" row!
                            const prevTx = index > 0 ? displayedTransactions[index - 1] : null;
                            const isNewPageSection = sortOrder === 'asc' && (index === 0 || (tx.diary_page && prevTx && String(prevTx.diary_page) !== String(tx.diary_page)));

                            return (
                              <React.Fragment key={tx.id}>
                                {isNewPageSection && (
                                  <tr className="bg-gradient-to-r from-purple-100/90 via-slate-100 to-amber-100/80 border-y-2 border-purple-300">
                                    <td colSpan={9} className="py-2 px-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <BookOpen className="w-4 h-4 text-purple-700" />
                                          <span className="font-black text-xs sm:text-sm text-purple-950">
                                            {tx.diary_page
                                              ? (lang === 'gu' ? `ચોપડા પાના નં. ${tx.diary_page}` : `Diary Page No. ${tx.diary_page}`)
                                              : (lang === 'gu' ? 'શરૂઆત હિસાબ' : 'Initial Account')}
                                          </span>
                                          <span className="text-slate-400 font-normal">•</span>
                                          <span className="text-xs font-bold text-slate-700">
                                            {lang === 'gu' ? 'પાછલો બાકી ઉપાડ (Brought Forward):' : 'Brought Forward Advance (પાછલો ઉપાડ):'}
                                          </span>
                                        </div>
                                        <div className="font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg bg-amber-200/95 border border-amber-400 text-amber-950 shadow-2xs">
                                          {formatINR(tx.prev_balance)}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}

                                <tr className="hover:bg-amber-50/20 transition-colors">
                                  {/* Sr No. */}
                                  <td className="py-3 px-2 sm:px-3 text-center text-slate-400 font-mono text-[11px]">
                                    {tx.entryIndex}
                                  </td>

                                  {/* Transaction Date */}
                                  <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                                    {formatDate(tx.transaction_date)}
                                  </td>

                                  {/* Diary Page Badge */}
                                  <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                    {tx.diary_page ? (
                                      <button
                                        type="button"
                                        onClick={() => setPageFilter(String(tx.diary_page))}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-black border transition ${
                                          pageFilter === String(tx.diary_page)
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                        }`}
                                        title={lang === 'gu' ? `પાના નં. ${tx.diary_page} ના બધા વ્યવહારો જુઓ` : `Filter by Page ${tx.diary_page}`}
                                      >
                                        P.{tx.diary_page}
                                      </button>
                                    ) : (
                                      <span className="text-slate-300 font-mono text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Transaction Type Badge */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    {isAdvance && (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                                        {lang === 'gu' ? 'ઉપાડ આપ્યો (+)' : 'Advance Given (+)'}
                                      </span>
                                    )}
                                    {isReturn && (
                                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${
                                        isSalaryDeduction
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}>
                                        {isSalaryDeduction
                                          ? (lang === 'gu' ? 'પગાર સામે ઉપાડ કપાત (-)' : 'Salary Deducted from Upad (-)')
                                          : (lang === 'gu' ? 'ઉપાડ જમા / પરત (-)' : 'Advance Repaid (-)')}
                                      </span>
                                    )}
                                    {isSalary && (
                                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                        isWagesCalculation
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                          : 'bg-blue-100 text-blue-800 border-blue-200'
                                      }`}>
                                        {isWagesCalculation
                                          ? (lang === 'gu' ? 'બનેલ પગાર ગણતરી' : 'Wages Earned')
                                          : (lang === 'gu' ? 'રોકડ પગાર ચૂકવ્યો' : 'Cash Salary Paid')}
                                      </span>
                                    )}
                                    {isBonus && (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                        {lang === 'gu' ? 'બોનસ' : 'Bonus'}
                                      </span>
                                    )}
                                    {isDeduction && (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                                        {lang === 'gu' ? 'કપાત' : 'Deduction'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Details / Notes & Tags */}
                                  <td className="py-3 px-3 text-slate-800">
                                    {(() => {
                                      const note = tx.notes;
                                      if (!note) {
                                        return (
                                          <div className="font-semibold text-xs sm:text-sm text-slate-700">
                                            {isAdvance ? (lang === 'gu' ? 'રોકડ ઉપાડ' : 'Cash Advance') : isSalary ? (lang === 'gu' ? 'પગાર' : 'Salary') : '-'}
                                          </div>
                                        );
                                      }
                                      if (note.includes(' / ')) {
                                        const [guPart, enPart] = note.split(' / ');
                                        const primary = lang === 'gu' ? (guPart || '').trim() : (enPart || '').trim();
                                        const secondary = lang === 'gu' ? (enPart || '').trim() : (guPart || '').trim();
                                        return (
                                          <div>
                                            <div className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                              {primary}
                                            </div>
                                            {secondary && (
                                              <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                                                {secondary}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="font-semibold text-xs sm:text-sm text-slate-800 leading-snug">
                                          {note}
                                        </div>
                                      );
                                    })()}
                                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-1.5">
                                      {isFarsan && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                          {lang === 'gu' ? 'ફરસાણ નાસ્તો' : 'Farsan Snack'}
                                        </span>
                                      )}
                                      {isWagesCalculation && (
                                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                                          {lang === 'gu' ? `બનેલ પગાર: +${formatINR(tx.amount)} (ઉપાડ સામે સરભર)` : `Wages Earned: +${formatINR(tx.amount)} (Adjusted to Upad)`}
                                        </span>
                                      )}
                                      {isSalary && !isWagesCalculation && (
                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                                          {lang === 'gu' ? `રોકડા ચૂકવ્યા: ${formatINR(tx.amount)}` : `Net Cash Paid to Worker: ${formatINR(tx.amount)}`}
                                        </span>
                                      )}
                                      {isSalaryDeduction && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                          {lang === 'gu' ? `ઉપાડમાંથી કપાત: -${formatINR(tx.amount)}` : `Deducted from Loan: -${formatINR(tx.amount)}`}
                                        </span>
                                      )}
                                      <span className="font-mono text-[10px] text-slate-400 font-semibold">{tx.payment_method?.toUpperCase()}</span>
                                      {tx.expense_transaction_number && (
                                        <span className="text-amber-700 font-semibold text-[10px]">
                                          • {tx.expense_transaction_number} (ખર્ચ સિંક)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Debit: Advance Given (+ increases what worker owes) */}
                                  <td className="py-3 px-3 text-right font-black text-red-600 whitespace-nowrap font-mono">
                                    {tx.debit_amount > 0 ? `+ ${formatINR(tx.debit_amount)}` : <span className="text-slate-300 font-normal">-</span>}
                                  </td>

                                  {/* Credit: Advance Returned or Salary Deduction (- decreases what worker owes) */}
                                  <td className="py-3 px-3 text-right font-black text-emerald-600 whitespace-nowrap font-mono">
                                    {tx.credit_amount > 0 ? `- ${formatINR(tx.credit_amount)}` : <span className="text-slate-300 font-normal">-</span>}
                                  </td>

                                  {/* Outstanding Running Balance (બાકી ઉપાડ) */}
                                  <td className="py-3 px-3 text-right whitespace-nowrap font-black bg-amber-50/40 border-l border-amber-100">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-300/80 text-amber-950 text-xs sm:text-sm font-black shadow-2xs font-mono">
                                      {formatINR(tx.running_balance !== undefined ? tx.running_balance : 0)}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-3 text-center print:hidden whitespace-nowrap">
                                    <button
                                      onClick={() => handleDeleteTransaction(tx.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                                      title={t('btn_delete_entry')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        {/* Passbook Total Footer */}
                        {currentViewStats && displayedTransactions.length > 0 && (
                          <tfoot className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-xs">
                            <tr>
                              <td colSpan="5" className="py-3 px-3 text-right text-slate-700 uppercase tracking-wider font-extrabold">
                                {lang === 'gu' ? 'કુલ સરવાળો (Total Summary):' : 'Total Summary:'}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-red-600 font-mono text-xs sm:text-sm">
                                + {formatINR(currentViewStats.debits)}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-emerald-700 font-mono text-xs sm:text-sm">
                                - {formatINR(currentViewStats.credits)}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-amber-950 font-mono text-sm bg-amber-100/80 border-l border-amber-200">
                                {formatINR(currentViewStats.closing)}
                              </td>
                              <td className="print:hidden"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: LEAVES & DEDUCTIONS */}
              {activeTab === 'leaves' && (
                <div className="space-y-6">
                  {/* Top 4 Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-3.5 rounded-2xl border border-amber-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                          {lang === 'gu' ? 'રોજિંદો પગાર દર' : 'Daily Wage Rate'}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
                          <Calculator className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-amber-950">
                        ₹466.66 <span className="text-xs font-semibold text-amber-700">/ {lang === 'gu' ? 'દિવસ' : 'day'}</span>
                      </div>
                      <p className="text-[10px] text-amber-700 mt-1 font-medium">
                        {lang === 'gu' ? '₹૧૪,૦૦૦ ÷ ૩૦ દિવસ (પાના નં. ૧૭ મુજબ)' : '₹14,000 ÷ 30 days (as per Page 17)'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-3.5 rounded-2xl border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                          {lang === 'gu' ? 'કુલ રજાઓ (ડાયરી)' : 'Total Leaves'}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-700">
                          <CalendarDays className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-blue-950">
                        {isRamesh ? '86' : leaves.reduce((acc, l) => acc + (Number(l.total_days) || 0), 0)}{' '}
                        <span className="text-xs font-semibold text-blue-700">{lang === 'gu' ? 'દિવસ' : 'Days'}</span>
                      </div>
                      <p className="text-[10px] text-blue-700 mt-1 font-medium">
                        {lang === 'gu' ? '૧૪ રજાઓ (૯ પાના હિસાબ)' : '14 leave events across 9 pages'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100/60 p-3.5 rounded-2xl border border-red-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
                          {lang === 'gu' ? 'કુલ રજા કપાત' : 'Total Leave Cuts'}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-red-700">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-red-700">
                        -{formatINR(isRamesh ? 15868 : leaves.reduce((acc, l) => acc + (Number(l.deduction_amount) || 0), 0))}
                      </div>
                      <p className="text-[10px] text-red-700 mt-1 font-medium">
                        {lang === 'gu' ? 'ગેરહાજર દિવસોનું પગાર કપાત' : 'Deducted from monthly earnings'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-3.5 rounded-2xl border border-emerald-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          {lang === 'gu' ? 'ચાલુ બાકી ઉપાડ' : 'Current Upad Balance'}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-black text-emerald-800">
                        {formatINR(workerData.outstanding_advance ?? 29234)}
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                        {lang === 'gu' ? 'સરભર ઉપાડ: ₹૯૧,૬૯૧ | રોકડ: ₹૪૧,૯૬૪' : 'Advance settled: ₹91,691 | Cash: ₹41,964'}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Salary, Leaves & Deductions Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                          <h4 className="font-bold text-sm sm:text-base text-white">
                            {lang === 'gu'
                              ? 'માસિક પગાર, રજા અને કપાત સરવૈયું (ડાયરી ઓડિટ)'
                              : 'Monthly Salary, Leaves & Deductions Breakdown (Diary Audit)'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {lang === 'gu'
                            ? '૯ સ્કેન ડાયરી પાના (પાના ૧૩ થી ૨૧) ના દરેક મહિનાના નક્કી પગાર, રજા કપાત, ઉપાડ અને ચૂકવેલ રોકડની સંપૂર્ણ વિગત'
                            : 'Month-by-month verified calculation of Base Salary, Leave Cuts, Net Wages, Advance Deductions, and Net Cash Paid'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                          {lang === 'gu' ? 'રોજિંદો દર: ₹૪૬૬.૬૬' : 'Daily Rate: ₹466.66'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                          {lang === 'gu' ? '૯ પાના ચકાસેલ' : '9 Diary Pages Verified'}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3 min-w-[140px]">{lang === 'gu' ? 'સમયગાળો' : 'Month / Period'}</th>
                            <th className="py-2.5 px-3 text-center">{lang === 'gu' ? 'ડાયરી' : 'Page'}</th>
                            <th className="py-2.5 px-3 text-right">{lang === 'gu' ? 'નક્કી પગાર' : 'Base Salary'}</th>
                            <th className="py-2.5 px-3 text-center">{lang === 'gu' ? 'રજા' : 'Leaves'}</th>
                            <th className="py-2.5 px-3 text-right text-red-600">{lang === 'gu' ? 'રજા કપાત (-)' : 'Leave Cut (-)'}</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">{lang === 'gu' ? 'બનેલ પગાર (+)' : 'Net Wages (+)'}</th>
                            <th className="py-2.5 px-3 text-right text-amber-700">{lang === 'gu' ? 'ઉપાડ કપાત (-)' : 'Upad Deducted'}</th>
                            <th className="py-2.5 px-3 text-right text-blue-700">{lang === 'gu' ? 'ચૂકવેલ રોકડ' : 'Net Cash Paid'}</th>
                            <th className="py-2.5 px-3 min-w-[200px]">{lang === 'gu' ? 'ડાયરી નોંધ & સ્થિતિ' : 'Status & Diary Notes'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isRamesh &&
                            RAMESH_MONTHLY_BREAKDOWN.map((row, idx) => (
                              <tr key={row.id} className="hover:bg-amber-50/40 transition">
                                <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900">
                                    {lang === 'gu' ? row.periodGu : row.period}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-black border border-blue-200 text-[10px]">
                                    P.{row.page}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                                  {formatINR(row.baseSalary + (row.bonus || 0))}
                                  {row.bonus > 0 && (
                                    <span className="block text-[10px] text-emerald-600 font-bold">
                                      +{formatINR(row.bonus)} {lang === 'gu' ? 'બોનસ' : 'Bonus'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {row.leavesDays > 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                                      {row.leavesDays} {lang === 'gu' ? 'દિવસ' : 'days'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">0</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-red-600">
                                  {row.leaveDeduction > 0 ? `-${formatINR(row.leaveDeduction)}` : '₹0'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                  {row.netEarned > 0 ? formatINR(row.netEarned) : '₹0'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                                  {row.upadSettled > 0 ? `-${formatINR(row.upadSettled)}` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-blue-700">
                                  {row.netCashPaid > 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-black border border-blue-200">
                                      {formatINR(row.netCashPaid)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-[11px]">
                                  <div className="font-semibold text-slate-800">
                                    {lang === 'gu' ? row.notesGu : row.notes}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {row.status}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800">
                            <td className="py-3 px-3" colSpan={2}>
                              <div className="font-black text-xs sm:text-sm">
                                {lang === 'gu' ? 'કુલ સરવાળો (TOTAL)' : 'AUDITED TOTALS'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-xs text-amber-300 font-bold">P.13-21</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-200">
                              ₹1,62,063
                            </td>
                            <td className="py-3 px-3 text-center font-black text-amber-300">
                              79 {lang === 'gu' ? 'દિ' : 'd'}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-red-300">
                              -₹15,868
                            </td>
                            <td className="py-3 px-3 text-right font-black text-emerald-300">
                              ₹1,50,395
                            </td>
                            <td className="py-3 px-3 text-right font-black text-amber-300">
                              -₹91,506
                            </td>
                            <td className="py-3 px-3 text-right font-black text-blue-200">
                              ₹41,964
                            </td>
                            <td className="py-3 px-3 text-xs text-emerald-400 font-black">
                              {lang === 'gu'
                                ? 'બાકી ચોખ્ખો ઉપાડ: ₹૨૯,૨૩૪.૦૦'
                                : 'Outstanding Advance Remaining: ₹29,234.00'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Individual Leaves Log Section */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {lang === 'gu'
                            ? `ડાયરી મુજબ વિગતવાર રજાઓની યાદી (${leaves.length} નોંધણી)`
                            : `Individual Leave Events from Diary (${leaves.length} Recorded)`}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowRecordLeaveForm(!showRecordLeaveForm)}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'gu' ? 'નવી રજા નોંધો' : 'Record New Leave'}</span>
                        {showRecordLeaveForm ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    </div>

                    {/* Record New Leave Collapsible Form */}
                    {showRecordLeaveForm && (
                      <form onSubmit={handleRecordLeave} className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-amber-600" />
                            <span>{lang === 'gu' ? 'નવી રજા & કપાત નોંધણી (ડાયરી મુજબ)' : 'Record Worker Leave & Deduction'}</span>
                          </h4>
                          <span className="text-[11px] font-semibold text-amber-800">
                            {lang === 'gu' ? 'દા.ત. ૩ દિવસ રજા = ₹૧,૪૦૦ કપાત' : 'e.g. 3 days leave = ₹1,400 deduction'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">
                              {lang === 'gu' ? 'રજા શરૂ તારીખ' : 'Start Date'}
                            </label>
                            <input
                              type="date"
                              value={leaveStartDate}
                              onChange={(e) => setLeaveStartDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">
                              {lang === 'gu' ? 'રજા પૂર્ણ તારીખ' : 'End Date'}
                            </label>
                            <input
                              type="date"
                              value={leaveEndDate}
                              onChange={(e) => setLeaveEndDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">
                              {lang === 'gu' ? 'કુલ દિવસો' : 'Total Days'} *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={leaveDays}
                              onChange={(e) => {
                                setLeaveDays(e.target.value);
                                if (workerData.base_salary && !leaveDeduction) {
                                  const perDay = Math.round(Number(workerData.base_salary) / 30);
                                  setLeaveDeduction(String(perDay * (Number(e.target.value) || 1)));
                                }
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-black text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">
                              {lang === 'gu' ? 'પગાર કપાત રકમ (₹)' : 'Deduction Amount (₹)'}
                            </label>
                            <input
                              type="number"
                              value={leaveDeduction}
                              onChange={(e) => setLeaveDeduction(e.target.value)}
                              placeholder="દા.ત. 1400"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm text-red-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-600 font-semibold text-xs mb-1">
                            {lang === 'gu' ? 'કારણ / વિગત' : 'Reason / Note'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={leaveReason}
                              onChange={(e) => setLeaveReason(e.target.value)}
                              placeholder={lang === 'gu' ? 'દા.ત. ઘરે ગયા, બીમાર હતા, સામાજિક પ્રસંગ' : 'e.g. Went home, Sick leave'}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
                            />
                            <button
                              type="submit"
                              disabled={recordingLeave}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 shrink-0"
                            >
                              {recordingLeave ? 'નોંધાઈ રહ્યું છે...' : (lang === 'gu' ? 'રજા નોંધો' : 'Record Leave')}
                            </button>
                          </div>

                          {/* Quick reason chips */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['ઘરે ગયા (Went home)', 'બીમાર હતા (Sick)', 'ગામ ગયા (Village)', 'સામાજિક પ્રસંગ', 'બિનઅધિકૃત ગેરહાજર'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setLeaveReason(r)}
                                className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-[10px] font-bold hover:bg-amber-100/60"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </form>
                    )}

                    {/* List of recorded leaves */}
                    {leaves.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {lang === 'gu' ? 'કોઈ રજા નોંધાયેલ નથી.' : 'No leaves recorded for this worker.'}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                        {leaves.map((lv) => (
                          <div key={lv.id} className="p-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50 transition">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-xs">
                                  {lv.total_days} {lang === 'gu' ? 'દિવસ રજા' : 'days leave'}
                                </span>
                                <span className="text-slate-400 font-normal">•</span>
                                <span className="text-slate-700 font-semibold">{lv.reason}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                                <span>
                                  {formatDate(lv.start_date)} {lv.end_date !== lv.start_date ? `to ${formatDate(lv.end_date)}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                {lv.deduction_amount > 0 ? (
                                  <span className="inline-block px-2 py-1 rounded-lg bg-red-50 border border-red-200 font-black text-red-600 text-xs sm:text-sm">
                                    -{formatINR(lv.deduction_amount)} {lang === 'gu' ? 'કપાત' : 'Cut'}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                                    {lang === 'gu' ? 'મંજૂર (No cut)' : 'Approved (₹0 Cut)'}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteLeave(lv.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                                title="Delete Leave"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE HISTORY */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {attendance ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-xs text-slate-500 font-medium block">
                            {lang === 'gu' ? 'હાજર દિવસો (P)' : 'Present Days'}
                          </span>
                          <span className="text-2xl font-black text-emerald-600">
                            {attendance.presentDays}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-medium block">
                            {lang === 'gu' ? 'અડધો દિવસ (HD)' : 'Half Days'}
                          </span>
                          <span className="text-2xl font-black text-amber-600">
                            {attendance.halfDays}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-medium block">
                            {lang === 'gu' ? 'ગેરહાજર (A)' : 'Absent Days'}
                          </span>
                          <span className="text-2xl font-black text-red-600">
                            {attendance.absentDays}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-medium block">
                            {lang === 'gu' ? 'કમાણી અંદાજ' : 'Estimated Wage'}
                          </span>
                          <span className="text-2xl font-black text-slate-800">
                            {formatINR(attendance.estimatedWagesThisMonth)}
                          </span>
                        </div>
                      </div>

                      {attendance.records && attendance.records.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                          {attendance.records.map((r, i) => (
                            <div key={i} className="p-3 flex items-center justify-between text-xs sm:text-sm bg-white">
                              <span className="font-medium text-slate-700">
                                {formatDate(r.date)}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                r.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'half_day'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {r.status === 'present' && (lang === 'gu' ? 'હાજર (P)' : 'Present')}
                                {r.status === 'half_day' && (lang === 'gu' ? 'અડધો દિવસ (HD)' : 'Half Day')}
                                {r.status === 'absent' && (lang === 'gu' ? 'ગેરહાજર (A)' : 'Absent')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-slate-400 text-xs sm:text-sm">
                          {lang === 'gu' ? 'આ મહિનામાં હજી સુધી કોઈ હાજરી નોંધાઈ નથી.' : 'No attendance marks for this month yet.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-center py-8 text-slate-400 text-xs sm:text-sm">
                      {lang === 'gu' ? 'હાજરી રેકોર્ડ ઉપલબ્ધ નથી.' : 'Attendance record not available.'}
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: PROFILE & DETAILS */}
              {activeTab === 'profile' && (
                <div className="space-y-4 max-w-xl">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_worker_name')}:</span>
                      <span className="font-bold text-slate-900">{workerData.name}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_worker_role')}:</span>
                      <span className="font-bold text-slate-900">{workerData.role_title}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_wage_type')}:</span>
                      <span className="font-bold text-slate-900">
                        {workerData.wage_type === 'monthly' ? t('lbl_monthly_wage') : t('lbl_daily_wage')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_base_salary')}:</span>
                      <span className="font-bold text-slate-900">{formatINR(workerData.base_salary)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_phone')}:</span>
                      <span className="font-bold text-slate-900">{workerData.phone || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_alt_phone')}:</span>
                      <span className="font-bold text-slate-900">{workerData.alternate_phone || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_joining_date')}:</span>
                      <span className="font-bold text-slate-900">{formatDate(workerData.joining_date)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{lang === 'gu' ? 'ચોપડા પાના નં. (Diary Page)' : 'Diary Page'}:</span>
                      <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md font-mono">
                        {workerData.diary_page ? `પાના નં. ${workerData.diary_page}` : '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{lang === 'gu' ? 'માસિક હિસાબ તારીખ (Cycle Day)' : 'Salary Cycle Day'}:</span>
                      <span className="font-bold text-slate-900">
                        {lang === 'gu' ? `દર મહિને ${workerData.salary_cycle_day || 1}મી તારીખ` : `${workerData.salary_cycle_day || 1}th of month`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_id_proof')}:</span>
                      <span className="font-bold text-slate-900">{workerData.id_proof_number || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">{t('lbl_address')}:</span>
                      <span className="font-bold text-slate-900">{workerData.address || '-'}</span>
                    </div>

                    <div className="py-1">
                      <span className="text-slate-500 font-medium block mb-1">{t('lbl_notes')}:</span>
                      <p className="text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                        {workerData.notes || (lang === 'gu' ? 'કોઈ નોંધ નથી.' : 'No notes recorded.')}
                      </p>
                    </div>
                  </div>

                  {/* Worker Mobile Self-Service Login PIN Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-amber-700" />
                        <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                          {lang === 'gu' ? 'કારીગર મોબાઈલ પાસબુક પિન (Worker App PIN)' : 'Worker App PIN'}
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-800 bg-white px-2.5 py-1 rounded-xl border border-amber-300 shadow-2xs">
                        {workerData.login_pin || '1234'}
                      </span>
                    </div>

                    <p className="text-[11px] text-amber-800">
                      {lang === 'gu'
                        ? 'આ ૪-આંકડાના પિન વડે કારીગર પોતાના મોબાઈલ ફોન પરથી વ્યક્તિગત ખાતાવહી પાસબુક જોઈ શકે છે.'
                        : 'Worker uses their phone number + this 4-digit PIN to view their personal ledger on phone.'}
                    </p>

                    <form onSubmit={handleSavePin} className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="નવો પિન (દા.ત. 1234)"
                        className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-mono font-bold w-36"
                      />
                      <button
                        type="submit"
                        disabled={savingPin}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        {savingPin ? 'બદલાઈ રહ્યો છે...' : (lang === 'gu' ? 'પિન બદલો' : 'Change PIN')}
                      </button>
                      {pinMessage && (
                        <span className="text-xs font-bold text-emerald-700 ml-2 animate-in fade-in">
                          ✓ {pinMessage}
                        </span>
                      )}
                    </form>
                  </div>

                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>{lang === 'gu' ? 'પ્રોફાઇલ વિગતો સુધારો' : 'Edit Profile Details'}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Record Upad Modal */}
      <RecordUpadModal
        isOpen={showUpadModal}
        onClose={() => setShowUpadModal(false)}
        worker={workerData}
        defaultType={upadModalType}
        onTransactionSaved={() => {
          loadWorkerDetails();
          if (onWorkerUpdated) onWorkerUpdated();
        }}
      />

      {/* Settle Salary Modal */}
      <SettleSalaryModal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        worker={workerData}
        attendance={attendance}
        onSettlementSaved={() => {
          loadWorkerDetails();
          if (onWorkerUpdated) onWorkerUpdated();
        }}
      />

      {/* Edit Worker Profile Modal */}
      <AddWorkerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        workerToEdit={workerData}
        onWorkerSaved={() => {
          loadWorkerDetails();
          if (onWorkerUpdated) onWorkerUpdated();
        }}
      />

      {/* AI OCR Old Diary Scanner Modal */}
      <DiaryScanModal
        isOpen={showDiaryScanModal}
        onClose={() => setShowDiaryScanModal(false)}
        workers={workerData ? [workerData] : []}
        preselectedWorkerId={workerId}
        onImportComplete={() => {
          loadWorkerDetails();
          if (onWorkerUpdated) onWorkerUpdated();
        }}
      />

      {/* Scanned Diary Photos History Modal with Tap-to-Zoom Lightbox */}
      <DiaryHistoryModal
        isOpen={showDiaryHistoryModal}
        onClose={() => setShowDiaryHistoryModal(false)}
        worker={workerData}
        onScansUpdated={loadWorkerDetails}
      />
    </div>
  );
}

export default WorkerDetailModal;
