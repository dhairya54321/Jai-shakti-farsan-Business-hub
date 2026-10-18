import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import AddVendorModal, { VENDOR_CATEGORIES } from './AddVendorModal';
import VendorDetailModal from './VendorDetailModal';
import BillOcrModal from './BillOcrModal';
import {
  Building2,
  Plus,
  Upload,
  Search,
  Phone,
  Tag,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  Receipt,
  UserCheck
} from 'lucide-react';

/**
 * Match vendor category by main title without considering brackets
 */
export function vendorMatchesCategory(vendorCategory, selectedCategory) {
  if (!selectedCategory) return true;
  if (!vendorCategory) return false;

  const raw = vendorCategory.toLowerCase().trim();
  const selected = selectedCategory.toLowerCase().trim();

  if (raw === selected) return true;

  // Extract base title by stripping bracketed details
  const rawBase = raw.replace(/\s*\([^)]*\).*/g, '').trim();
  const selectedBase = selected.replace(/\s*\([^)]*\).*/g, '').trim();

  if (selected === 'raw_materials' || selectedBase.startsWith('raw material')) {
    return rawBase.startsWith('raw material') || raw === 'raw_materials';
  }
  if (selected === 'finished_goods' || selectedBase.startsWith('finished good')) {
    return rawBase.startsWith('finished good') || raw === 'finished_goods';
  }
  if (selected === 'packaging_materials' || selectedBase.startsWith('packaging')) {
    return rawBase.startsWith('packaging') || raw === 'packaging_materials';
  }
  if (selected === 'vegetable_purchase' || selectedBase.startsWith('vegetable') || selectedBase.startsWith('produce')) {
    return rawBase.includes('vegetable') || rawBase.includes('produce') || raw === 'vegetable_purchase';
  }
  if (selected === 'dairy_products' || selectedBase.startsWith('dairy')) {
    return rawBase.startsWith('dairy') || raw === 'dairy_products';
  }
  if (selected === 'gas_utilities' || selectedBase.startsWith('gas')) {
    return rawBase.includes('gas') || rawBase.includes('utilit') || raw === 'gas_utilities';
  }
  if (selected === 'equipment_repairs' || selectedBase.startsWith('machin') || selectedBase.startsWith('equipment')) {
    return rawBase.includes('machin') || rawBase.includes('repair') || rawBase.includes('equipment') || raw === 'equipment_repairs';
  }
  if (selected === 'transport_logistics' || selectedBase.startsWith('transport')) {
    return rawBase.includes('transport') || rawBase.includes('deliver') || raw === 'transport_logistics';
  }
  if (selected === 'cleaning_supplies' || selectedBase.startsWith('cleaning')) {
    return rawBase.includes('clean') || rawBase.includes('hygiene') || raw === 'cleaning_supplies';
  }
  if (selected === 'other') {
    return rawBase.includes('other') || raw === 'other';
  }

  return rawBase.startsWith(selectedBase) || raw.includes(selected);
}

export function Vendors() {
  const { lang, t } = useLanguage();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Live Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const searchInputRef = useRef(null);

  // Modal dialog states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const fetchVendors = async (currentPage = page) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '50'
      });
      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter) params.append('category', categoryFilter);
      if (activeFilter) params.append('is_active', activeFilter);

      const res = await apiFetch(`/api/vendors?${params.toString()}`);
      if (res.vendors) {
        setVendors(res.vendors);
        setPagination(res.pagination || { page: 1, limit: 50, total: res.vendors.length, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  // Automatic real-time search with 120ms debounce (iOS Spotlight style)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchVendors(1);
    }, 120);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, activeFilter]);

  // Instant in-memory filter for 0ms response across category, status, and search
  const displayedVendors = useMemo(() => {
    return vendors.filter(v => {
      // 1. Category filter by main title, ignoring brackets
      if (categoryFilter && !vendorMatchesCategory(v.category, categoryFilter)) {
        return false;
      }

      // 2. Active status filter
      if (activeFilter !== '') {
        const isActive = activeFilter === '1' || activeFilter === 'true';
        if (Boolean(v.is_active) !== isActive) return false;
      }

      // 3. Search text matching
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          (v.name && v.name.toLowerCase().includes(q)) ||
          (v.phone && v.phone.includes(q)) ||
          (v.alternate_phone && v.alternate_phone.includes(q)) ||
          (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
          (v.category && v.category.toLowerCase().includes(q)) ||
          (v.city && v.city.toLowerCase().includes(q)) ||
          (v.gstin && v.gstin.toLowerCase().includes(q));

        if (!matches) return false;
      }

      return true;
    });
  }, [vendors, search, categoryFilter, activeFilter]);

  const handleResetSearch = () => {
    setSearch('');
    setCategoryFilter('');
    setActiveFilter('');
    setPage(1);
  };

  const handleVendorCreated = (newVendor) => {
    fetchVendors(1);
    if (newVendor?.id) {
      setSelectedVendorId(newVendor.id);
    }
  };

  const handleVendorUpdated = () => {
    fetchVendors(page);
  };

  const handleBillSaved = () => {
    fetchVendors(page);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('nav_vendors')}
              </h1>
              <p className="text-xs text-slate-500">
                {lang === 'gu'
                  ? 'કાચો માલ, મસાલા, તેલ, બેસન અને પેકિંગ સપ્લાયર ડિરેક્ટરી'
                  : 'Directory of suppliers, raw materials, packaging, and bill records'}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Upload Bill / Scan Bill action */}
          <button
            type="button"
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-50 shadow-sm transition"
          >
            <Upload className="w-4 h-4 text-amber-600" />
            <span>{t('btn_upload_bill')}</span>
          </button>

          {/* + Add Vendor button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-sm shadow-amber-500/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn_add_vendor')}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar (iPhone / Spotlight Style) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          {/* iOS Style Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                lang === 'gu'
                  ? 'શોધો: Ranna, Satguru, બટાકા, ખાખરા, ફોન...'
                  : 'Search: Ranna, Satguru, item, phone, GSTIN...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                title="Clear search"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition">
                  <X className="w-3 h-3" />
                </div>
              </button>
            )}
          </div>

          {/* Filters Row (Side-by-side on mobile, compact on desktop) */}
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <div className="flex-1 sm:w-48 sm:flex-initial">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white focus:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition font-medium"
              >
                <option value="">
                  {lang === 'gu' ? 'બધી કેટેગરી' : 'All Categories'}
                </option>
                {VENDOR_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === 'gu' ? c.gu : c.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Status Filter */}
            <div className="w-28 sm:w-32">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white focus:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition font-medium"
              >
                <option value="">{lang === 'gu' ? 'બધા સ્ટેટસ' : 'All Status'}</option>
                <option value="1">{t('status_active')}</option>
                <option value="0">{t('status_inactive')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applied filters & live result count */}
        {(search || categoryFilter || activeFilter) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {displayedVendors.length} {displayedVendors.length === 1 ? 'matching vendor' : 'matching vendors'}
                {categoryFilter && (
                  <span className="text-slate-700"> • <strong className="text-amber-800">{VENDOR_CATEGORIES.find(c => c.id === categoryFilter)?.[lang] || categoryFilter}</strong></span>
                )}
                {search && (
                  <span className="text-slate-700"> for "<strong className="text-amber-800">{search}</strong>"</span>
                )}
              </span>
            </span>
            <button
              onClick={handleResetSearch}
              className="text-amber-700 hover:text-amber-900 font-bold text-[11px] hover:underline"
            >
              {t('btn_reset')}
            </button>
          </div>
        )}
      </div>

      {/* Main Vendor Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-xs font-medium">Loading vendor directory...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        ) : displayedVendors.length === 0 ? (
          /* Empty States */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                {search || categoryFilter ? t('msg_no_vendors_search') : t('msg_no_vendors')}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || categoryFilter
                  ? (lang === 'gu' ? 'તમારા ફિલ્ટર બદલીને ફરીથી શોધો.' : 'Try adjusting your search keywords or clearing category filters.')
                  : (lang === 'gu' ? 'નવા સપ્લાયર નોંધવા માટે ઉપર આપેલ બટનનો ઉપયોગ કરો.' : 'Register new suppliers or upload your first vendor bill to get started.')}
              </p>
            </div>
            {!search && !categoryFilter && (
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition"
                >
                  {t('btn_add_vendor')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanModal(true)}
                  className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-50 transition"
                >
                  {t('btn_upload_bill')}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* The Primary Table Layout */
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    {/* The 3 mandatory primary columns on one line */}
                    <th className="px-5 py-3.5">{t('th_vendor_name')}</th>
                    <th className="px-5 py-3.5">{t('th_category')}</th>
                    <th className="px-5 py-3.5">{t('th_phone')}</th>
                    <th className="px-5 py-3.5">{t('th_city')}</th>
                    <th className="px-5 py-3.5 text-center">{t('th_bills')}</th>
                    <th className="px-5 py-3.5 text-right">{t('th_status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedVendors.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVendorId(v.id)}
                      className="hover:bg-amber-50/40 cursor-pointer transition group"
                    >
                      {/* 1. Vendor Name (Clickable link to detail) */}
                      <td className="px-5 py-3.5 font-bold text-slate-900 group-hover:text-amber-800">
                        <div className="flex items-center gap-2">
                          <span>{v.name}</span>
                          {v.contact_person && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({v.contact_person})
                            </span>
                          )}
                        </div>
                        {v.gstin && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            GSTIN: {v.gstin}
                          </span>
                        )}
                      </td>

                      {/* 2. Category */}
                      <td className="px-5 py-3.5 text-slate-600">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 font-medium text-slate-700">
                          {VENDOR_CATEGORIES.find(c => c.id === v.category)?.[lang] || v.category || '—'}
                        </span>
                      </td>

                      {/* 3. Phone */}
                      <td className="px-5 py-3.5 text-slate-600 font-mono">
                        {v.phone || (v.alternate_phone ? v.alternate_phone : '—')}
                      </td>

                      {/* City */}
                      <td className="px-5 py-3.5 text-slate-500">
                        {v.city || '—'}
                      </td>

                      {/* Bills Count */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Receipt className="w-3.5 h-3.5 text-amber-600" />
                          <span>{v.bills_count || 0}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {v.is_active ? t('status_active') : t('status_inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedVendors.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVendorId(v.id)}
                  className="p-4 hover:bg-amber-50/50 active:bg-amber-100/50 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {v.name}
                      </h3>
                      {v.contact_person && (
                        <p className="text-[11px] text-slate-500">
                          {v.contact_person}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      v.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {v.is_active ? t('status_active') : t('status_inactive')}
                    </span>
                  </div>

                  {/* Primary 3 columns information in responsive display */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-700">
                      {VENDOR_CATEGORIES.find(c => c.id === v.category)?.[lang] || v.category || '—'}
                    </span>
                    {v.phone && (
                      <span className="font-mono text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{v.phone}</span>
                      </span>
                    )}
                    {v.city && (
                      <span className="text-slate-500">
                        {v.city}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                    <span>
                      {v.bills_count || 0} {t('th_bills')} • {v.expenses_count || 0} {t('th_expenses')}
                    </span>
                    <span className="font-semibold text-amber-700 flex items-center gap-0.5">
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => { setPage(p => p - 1); fetchVendors(page - 1); }}
                    className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => { setPage(p => p + 1); fetchVendors(page + 1); }}
                    className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      <AddVendorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVendorCreated={handleVendorCreated}
        onSelectExisting={(v) => setSelectedVendorId(v.id)}
      />

      {/* Bill OCR / Scan Modal */}
      <BillOcrModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onBillSaved={handleBillSaved}
        vendors={vendors}
      />

      {/* Dedicated Vendor Detail Profile Modal */}
      {selectedVendorId && (
        <VendorDetailModal
          isOpen={!!selectedVendorId}
          vendorId={selectedVendorId}
          onClose={() => setSelectedVendorId(null)}
          onVendorUpdated={handleVendorUpdated}
        />
      )}
    </div>
  );
}

export default Vendors;
