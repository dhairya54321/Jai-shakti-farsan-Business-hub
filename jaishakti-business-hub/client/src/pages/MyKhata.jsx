import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  LogOut,
  RefreshCw,
  Printer,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  UserCheck,
  CalendarDays,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Info
} from 'lucide-react';

export function MyKhata() {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, formatINR, formatDate } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchStatement();
  }, []);

  const fetchStatement = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/workers/my-statement', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('js_token')}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load passbook.');
      }
      setStatement(data);
    } catch (err) {
      setError(err.message || 'Error loading statement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!statement || !statement.worker) return;
    const w = statement.worker;
    const outstanding = w.outstanding_advance || 0;
    const salary = w.base_salary || 0;
    const cycleDay = w.salary_cycle_day || 1;
    const text = `*જય શક્તિ ફરસાણ માર્ટ - કારીગર ખાતાવહી સ્ટેટમેન્ટ*\n\n` +
      `👤 કારીગર: *${w.name}*\n` +
      `📖 ચોપડા પાના નં.: ${w.diary_page ? w.diary_page : '-'}\n` +
      `📅 હિસાબ તારીખ: દર મહિને ${cycleDay} તારીખે\n` +
      `💰 માસિક પગાર: ₹${salary.toLocaleString('en-IN')}\n` +
      `🔴 કુલ બાકી ઉપાડ: ₹${outstanding.toLocaleString('en-IN')}\n` +
      (w.totalFarsanAdvance > 0 ? `   - ફરસાણ/મીઠાઈ ઉપાડ: ₹${w.totalFarsanAdvance.toLocaleString('en-IN')}\n` : '') +
      `💵 અંદાજિત બાકી મળવાપાત્ર: ₹${Math.max(0, salary - outstanding).toLocaleString('en-IN')}\n\n` +
      `તારીખ: ${new Date().toLocaleDateString('gu-IN')}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4 animate-bounce">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          જય શક્તિ ફરસાણ માર્ટ
        </h2>
        <p className="text-sm font-semibold text-amber-700 mt-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          તમારું ખાતું અને પાસબુક લોડ થઈ રહ્યું છે...
        </p>
      </div>
    );
  }

  if (error || !statement || !statement.worker) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">ખાતાવહી ખૂલી શકી નથી</h3>
          <p className="text-xs sm:text-sm text-slate-600">{error || 'Something went wrong.'}</p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchStatement(false)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
            >
              ફરી પ્રયાસ કરો (Retry)
            </button>
            <button
              onClick={logout}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
            >
              લૉગ આઉટ (Logout)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { worker, transactions = [], attendance = {}, leaves = [] } = statement;
  const outstandingAdvance = worker.outstanding_advance || 0;
  const baseSalary = worker.base_salary || 0;
  const cycleDay = worker.salary_cycle_day || 1;
  const totalFarsanAdvance = worker.total_farsan_advance || worker.totalFarsanAdvance || 0;
  const totalCashAdvance = worker.total_cash_advance || worker.totalCashAdvance || Math.max(0, outstandingAdvance - totalFarsanAdvance);

  // Estimated salary left this cycle
  const estimatedRemaining = Math.max(0, baseSalary - outstandingAdvance);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upad') return tx.transaction_type === 'advance_given';
    if (activeFilter === 'farsan') return tx.category_type === 'farsan_item';
    if (activeFilter === 'salary') return tx.transaction_type === 'salary_paid';
    if (activeFilter === 'deduction') return tx.transaction_type === 'deduction';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans pb-16">
      {/* Mobile Top Header */}
      <header className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center font-black text-xl shadow-inner">
              જ
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                જય શક્તિ ફરસાણ માર્ટ
              </div>
              <h1 className="text-base sm:text-lg font-black leading-tight flex items-center gap-1.5">
                <span>{worker.name}</span>
                {worker.diary_page && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/40 border border-amber-300/40 font-mono">
                    પાના {worker.diary_page}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStatement(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Refresh Passbook"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold transition border border-white/20"
            >
              {lang === 'gu' ? 'EN' : 'ગુજ'}
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white transition border border-red-300/30"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Welcome Greeting Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-amber-500/25">
              {worker.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">
                  {lang === 'gu' ? 'હોદ્દો:' : 'Role:'}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {worker.role_title}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{worker.phone || 'મોબાઈલ નોંધાયેલ નથી'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'gu' ? 'વોટ્સએપ' : 'WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold border border-slate-300/80 transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{lang === 'gu' ? 'પ્રિન્ટ / PDF' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* 3 Prominent Passbook Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Outstanding Advance (Upad) */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-red-500/20 relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-100">
                  {lang === 'gu' ? 'કુલ બાકી ઉપાડ' : 'Outstanding Upad'}
                </span>
                <span className="p-1.5 bg-white/20 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4 text-white" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatINR(outstandingAdvance)}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/20 text-[11px] text-red-100 flex items-center justify-between relative z-10">
              <span>રોકડ: {formatINR(totalCashAdvance)}</span>
              {totalFarsanAdvance > 0 && (
                <span>ફરસાણ: {formatINR(totalFarsanAdvance)}</span>
              )}
            </div>
            {/* Background design */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 2: Monthly Salary & Cycle Date */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'gu' ? 'માસિક પગાર' : 'Monthly Salary'}
                </span>
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                  <IndianRupee className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatINR(baseSalary)}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {lang === 'gu'
                  ? `હિસાબ: દર મહિને ${cycleDay} તારીખે`
                  : `Cycle: ${cycleDay}th of every month`}
              </span>
            </div>
          </div>

          {/* Card 3: Estimated Net Remaining Salary */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-emerald-600/20 relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  {lang === 'gu' ? 'અંદાજિત બાકી મળવાપાત્ર' : 'Estimated Net Left'}
                </span>
                <span className="p-1.5 bg-white/20 rounded-xl">
                  <Sparkles className="w-4 h-4 text-white" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatINR(estimatedRemaining)}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/20 text-[11px] text-emerald-100 flex items-center justify-between relative z-10">
              <span>{lang === 'gu' ? 'પગારમાંથી ઉપાડ બાદ કરતાં' : 'Salary minus advances'}</span>
              <span className="font-bold">
                {outstandingAdvance === 0 ? 'પૂર્ણ બાકી' : 'ચાલુ હિસાબ'}
              </span>
            </div>
            {/* Background design */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>
        </div>

        {/* Farsan / Mithai Special Breakdown Alert (If Worker took farsan) */}
        {totalFarsanAdvance > 0 && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                  {lang === 'gu' ? 'દુકાનમાંથી લીધેલ ફરસાણ / મીઠાઈ ઉપાડ' : 'Shop Farsan / Sweets Advance'}
                </h4>
                <p className="text-[11px] text-amber-800">
                  {lang === 'gu'
                    ? `કુલ ${formatINR(totalFarsanAdvance)} નું ફરસાણ ઉપાડમાં નોંધાયેલ છે.`
                    : `Total ₹${totalFarsanAdvance} worth of shop items debited to your khata.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveFilter('farsan')}
              className="text-xs font-bold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition"
            >
              {lang === 'gu' ? 'યાદી જુઓ' : 'View Items'}
            </button>
          </div>
        )}

        {/* Passbook Transactions Ledger Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Filter Chips */}
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {lang === 'gu' ? 'ખાતાવહી પાસબુક સ્ટેટમેન્ટ' : 'Khata Passbook Ledger'}
                </h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredTransactions.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {[
                  { id: 'all', gu: 'બધા (All)', en: 'All' },
                  { id: 'upad', gu: 'ઉપાડ', en: 'Upad' },
                  { id: 'farsan', gu: '🥨 ફરસાણ', en: 'Farsan' },
                  { id: 'salary', gu: 'પગાર જમા', en: 'Salary' },
                  { id: 'deduction', gu: 'કપાત', en: 'Deductions' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                      activeFilter === f.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'gu' ? f.gu : f.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statement Entries List */}
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                {lang === 'gu' ? 'કોઈ વ્યવહાર મળ્યો નથી' : 'No transactions found'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'gu' ? 'પસંદ કરેલ ફિલ્ટરમાં કોઈ નોંધ થયેલ નથી.' : 'No entries matching this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isAdvance = tx.transaction_type === 'advance_given';
                const isReturned = tx.transaction_type === 'advance_returned';
                const isSalaryPaid = tx.transaction_type === 'salary_paid';
                const isBonus = tx.transaction_type === 'bonus';
                const isDeduction = tx.transaction_type === 'deduction';
                const isFarsan = tx.category_type === 'farsan_item';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isFarsan
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isAdvance
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : isReturned
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : isSalaryPaid
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : isBonus
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isFarsan ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : isAdvance ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : isReturned ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : isSalaryPaid ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <IndianRupee className="w-5 h-5" />
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isFarsan
                              ? 'bg-amber-100 text-amber-900'
                              : isAdvance
                              ? 'bg-red-50 text-red-700'
                              : isReturned
                              ? 'bg-emerald-50 text-emerald-800'
                              : isSalaryPaid
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {isFarsan
                              ? (lang === 'gu' ? 'દુકાનમાંથી ફરસાણ / મીઠાઈ' : 'Shop Farsan / Sweets')
                              : isAdvance
                              ? (lang === 'gu' ? 'રોકડ ઉપાડ લીધો' : 'Advance Taken')
                              : isReturned
                              ? (lang === 'gu' ? 'ઉપાડ જમા કર્યો' : 'Advance Returned')
                              : isSalaryPaid
                              ? (lang === 'gu' ? 'પગાર ચૂકવણી થઈ' : 'Salary Settled')
                              : isBonus
                              ? (lang === 'gu' ? 'બોનસ / ઈનામ' : 'Bonus')
                              : (lang === 'gu' ? 'કપાત' : 'Deduction')}
                          </span>

                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(tx.transaction_date)}
                          </span>
                        </div>

                        {/* Note / Item breakdown */}
                        {tx.notes && (
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">
                            {tx.notes}
                          </p>
                        )}

                        {/* Payment mode badge */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="capitalize">
                            {tx.payment_method === 'cash' ? 'રોકડ (Cash)' : tx.payment_method?.toUpperCase()}
                          </span>
                          {tx.recorded_by_name && (
                            <span>• નોંધણી: {tx.recorded_by_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <div className={`text-sm sm:text-base font-black ${
                        isAdvance || isDeduction
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}>
                        {isAdvance || isDeduction ? '-' : '+'} {formatINR(tx.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {isAdvance || isDeduction ? 'ઉપાડ ખાતે' : 'જમા ખાતે'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaves Record Section */}
        {leaves && leaves.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {lang === 'gu' ? 'રજાઓ અને કપાત વિગત' : 'Leaves & Absence Records'}
              </h3>
            </div>

            <div className="space-y-2">
              {leaves.map((lv) => (
                <div
                  key={lv.id}
                  className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs sm:text-sm"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      {lv.total_days} {lang === 'gu' ? 'દિવસ રજા' : 'Days Leave'}
                      {lv.reason && <span className="font-normal text-slate-600"> • {lv.reason}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(lv.start_date)} {lv.end_date !== lv.start_date ? `થી ${formatDate(lv.end_date)}` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    {lv.deduction_amount > 0 ? (
                      <span className="text-xs font-bold text-red-600">
                        -{formatINR(lv.deduction_amount)} કપાત
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700">
                        મંજૂર (No cut)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety Note & Shop Address Footer */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center justify-center gap-1 font-bold text-amber-950">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>જય શક્તિ ફરસાણ માર્ટ • અધિકૃત ખાતાવહી પાસબુક</span>
          </div>
          <p className="text-[11px] text-amber-800">
            {lang === 'gu'
              ? 'જો કોઈ વ્યવહાર અથવા રકમમાં વિસંગતતા જણાય તો તરત જ દુકાને માલિકનો સંપર્ક કરવો.'
              : 'For any ledger discrepancies, please contact shop management.'}
          </p>
        </div>
      </main>
    </div>
  );
}

export default MyKhata;
