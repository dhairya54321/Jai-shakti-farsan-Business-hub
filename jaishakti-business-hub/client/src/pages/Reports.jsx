import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Building,
  Banknote,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export function Reports() {
  const { lang, t, formatINR, formatDate } = useLanguage();

  const [activeReportTab, setActiveReportTab] = useState('summary'); // 'summary' | 'vendor' | 'staff' | 'cash'
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = todayStr.slice(0, 7) + '-01';

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'summary') {
        const res = await apiFetch(`/api/reports/expenses?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res);
      } else if (activeReportTab === 'vendor') {
        const res = await apiFetch(`/api/reports/vendors?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res.vendors || []);
      } else if (activeReportTab === 'staff') {
        const res = await apiFetch(`/api/reports/staff?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res.staff || []);
      } else if (activeReportTab === 'cash') {
        const res = await apiFetch(`/api/reports/cash?start_date=${startDate}&end_date=${endDate}`);
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReportTab, startDate, endDate]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('js_token');
      const url = `/api/reports/export-csv?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `JaiShakti_Expenses_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {t('nav_reports')}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'gu' ? 'દૈનિક, માસિક, વેપારી અને રોકડ હિસાબ રિપોર્ટ' : 'Daily, Monthly, Vendor, Staff, and Cash Reports'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : t('btn_export_csv')}</span>
          </button>
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'summary', label: lang === 'gu' ? 'ખર્ચ સારાંશ' : 'Expense Summary', icon: BarChart3 },
          { id: 'vendor', label: lang === 'gu' ? 'વેપારી / લેનાર રિપોર્ટ' : 'Vendor / Payee Report', icon: Building },
          { id: 'staff', label: lang === 'gu' ? 'સ્ટાફ એન્ટ્રી રિપોર્ટ' : 'Staff Activity', icon: Users },
          { id: 'cash', label: lang === 'gu' ? 'રોકડ ગલ્લા રિપોર્ટ' : 'Cash Drawer Outlays', icon: Banknote }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
                active
                  ? 'border-amber-500 text-amber-800 font-bold bg-amber-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
          <span>Generating report...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: SUMMARY REPORT */}
          {activeReportTab === 'summary' && reportData && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Recorded</span>
                  <span className="text-xl font-black text-slate-900">
                    {formatINR(reportData.summary?.total_recorded || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {reportData.summary?.active_count || 0} active transactions
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Approved Expenses</span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatINR(reportData.summary?.approved_total || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">Valid business cost</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Actual Paid</span>
                  <span className="text-xl font-black text-slate-900">
                    {formatINR(reportData.summary?.actual_payments_made || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">Money outlaid</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Outstanding Due</span>
                  <span className="text-xl font-black text-red-600">
                    {formatINR(reportData.summary?.outstanding_obligations || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">Unpaid obligations</span>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Payment Methods Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(reportData.payments_by_method || {}).map(([method, amt]) => (
                    <div key={method} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500 uppercase font-bold text-[10px] block">{method}</span>
                      <span className="font-black text-slate-900 text-sm">{formatINR(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Category-Wise Approved Outlays
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Classification</th>
                        <th className="px-4 py-3 text-right">Count</th>
                        <th className="px-4 py-3 text-right">Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.category_breakdown?.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {lang === 'gu' ? cat.name_gu : cat.name_en}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-500">
                            {cat.classification.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-right">{cat.count}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {formatINR(cat.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VENDOR REPORT */}
          {activeReportTab === 'vendor' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Vendor / Payee</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-right">Transactions</th>
                      <th className="px-4 py-3 text-right">Billed Amount</th>
                      <th className="px-4 py-3 text-right">Paid Amount</th>
                      <th className="px-4 py-3 text-right">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-6 text-slate-400">No vendor transactions recorded in this range.</td></tr>
                    ) : (
                      reportData.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{v.name}</td>
                          <td className="px-4 py-3 text-slate-500">{v.phone || '—'}</td>
                          <td className="px-4 py-3 text-right">{v.transaction_count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(v.total_billed)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(v.total_paid)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">{formatINR(v.outstanding_balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STAFF REPORT */}
          {activeReportTab === 'staff' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Staff Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Total Entered</th>
                      <th className="px-4 py-3 text-right">Approved Amount</th>
                      <th className="px-4 py-3 text-right">Pending Amount</th>
                      <th className="px-4 py-3 text-right">Rejected Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{s.full_name} ({s.username})</td>
                        <td className="px-4 py-3 capitalize text-slate-500">{s.role}</td>
                        <td className="px-4 py-3 text-right">{s.total_entered}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatINR(s.approved_amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">{formatINR(s.pending_amount)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-bold">{s.rejected_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CASH DRAWER REPORT */}
          {activeReportTab === 'cash' && reportData && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-semibold block">Total Cash Drawer Payments</span>
                  <span className="text-2xl font-black text-emerald-950">{formatINR(reportData.total_cash_paid || 0)}</span>
                </div>
                <Banknote className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Daily Cash Outlay Details
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Tx #</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Payee / Description</th>
                        <th className="px-4 py-3">Recorded By</th>
                        <th className="px-4 py-3 text-right">Cash Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.transactions?.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-6 text-slate-400">No cash transactions in this date range.</td></tr>
                      ) : (
                        reportData.transactions?.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{formatDate(r.payment_date)}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{r.transaction_number}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {lang === 'gu' ? r.category_name_gu : r.category_name_en}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {r.vendor_name ? `${r.vendor_name} • ` : ''}{r.description || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{r.recorded_by_name}</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{formatINR(r.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;
