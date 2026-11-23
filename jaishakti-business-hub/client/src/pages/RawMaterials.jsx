import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Building2,
  X,
  Boxes,
  Layers,
  Barcode,
  ShoppingBag,
  Sparkles,
  Scale,
  Calendar,
  Clock,
  ChevronRight,
  Calculator,
  ArrowRightLeft,
  Check
} from 'lucide-react';

export function RawMaterials() {
  const { role, hasPermission } = useAuth();
  const { lang, t, formatINR, formatDate } = useLanguage();

  const isOwner = role === 'owner';
  const canManage = isOwner || hasPermission('can_manage_stock');
  const canRecordProduction = isOwner || hasPermission('can_record_production');

  // Main Tier Tab: 'raw_materials' | 'loose_products' | 'packaged_products' | 'packaging_runs' | 'transactions'
  const [activeTier, setActiveTier] = useState('raw_materials');

  // Data States
  const [materials, setMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [packagedProducts, setPackagedProducts] = useState([]);
  const [packagingRuns, setPackagingRuns] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [adjustingMaterial, setAdjustingMaterial] = useState(null);

  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [packagingSelectedProduct, setPackagingSelectedProduct] = useState(null);

  const [isAddFinishedProductModalOpen, setIsAddFinishedProductModalOpen] = useState(false);
  const [editingFinishedProduct, setEditingFinishedProduct] = useState(null);
  const [adjustingLooseProduct, setAdjustingLooseProduct] = useState(null);

  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false);
  const [variantParentProduct, setVariantParentProduct] = useState(null);
  const [adjustingPackagedVariant, setAdjustingPackagedVariant] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matRes, fpRes, pkgRes, prRes, txRes, statsRes, vendRes] = await Promise.all([
        apiFetch('/api/manufacturing/materials'),
        apiFetch('/api/manufacturing/finished-products'),
        apiFetch('/api/manufacturing/packaged-products'),
        apiFetch('/api/manufacturing/packaging-runs?limit=40'),
        apiFetch('/api/manufacturing/transactions?limit=60'),
        apiFetch('/api/manufacturing/dashboard-stats'),
        apiFetch('/api/vendors')
      ]);

      if (matRes.success) setMaterials(matRes.materials || []);
      if (fpRes.success) setFinishedProducts(fpRes.products || []);
      if (pkgRes.success) setPackagedProducts(pkgRes.products || []);
      if (prRes.success) setPackagingRuns(prRes.runs || []);
      if (txRes.success) setTransactions(txRes.transactions || []);
      if (statsRes.success) setDashboardStats(statsRes.stats || {});
      if (vendRes.success) setVendors(vendRes.vendors || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats
  const rawLowStockCount = materials.filter(m => m.is_low_stock).length;
  const looseLowStockCount = finishedProducts.filter(fp => fp.is_low_stock).length;
  const packagedLowStockCount = packagedProducts.filter(p => p.is_low_stock).length;
  const totalLowStockAlerts = rawLowStockCount + looseLowStockCount + packagedLowStockCount;

  const totalLooseKg = finishedProducts.reduce((sum, p) => sum + (Number(p.current_loose_stock) || 0), 0);
  const totalPackets = packagedProducts.reduce((sum, p) => sum + (Number(p.current_packet_stock) || 0), 0);

  // Filtered views
  const filteredMaterials = materials.filter(m => {
    if (filterLowStockOnly && !m.is_low_stock) return false;
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        m.name_en?.toLowerCase().includes(term) ||
        m.name_gu?.toLowerCase().includes(term) ||
        m.category?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredFinishedProducts = finishedProducts.filter(fp => {
    if (filterLowStockOnly && !fp.is_low_stock) return false;
    if (selectedCategory !== 'all' && fp.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        fp.name_en?.toLowerCase().includes(term) ||
        fp.name_gu?.toLowerCase().includes(term) ||
        fp.category?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredPackagedProducts = packagedProducts.filter(p => {
    if (filterLowStockOnly && !p.is_low_stock) return false;
    if (selectedProductFilter !== 'all' && p.finished_product_id !== selectedProductFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        p.product_name_en?.toLowerCase().includes(term) ||
        p.product_name_gu?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term) ||
        p.package_weight_label?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Open Packaging Station for a product
  const handleOpenPackagingStation = (product = null) => {
    setPackagingSelectedProduct(product || finishedProducts[0] || null);
    setIsPackagingModalOpen(true);
  };

  const handleDeleteMaterial = async (mat) => {
    if (!window.confirm(`Are you sure you want to delete ${mat.name_gu} (${mat.name_en})?`)) return;
    try {
      await apiFetch(`/api/manufacturing/materials/${mat.id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete raw material.');
    }
  };

  const handleDeleteFinishedProduct = async (fp) => {
    if (!window.confirm(`Are you sure you want to delete ${fp.name_gu} (${fp.name_en})?`)) return;
    try {
      await apiFetch(`/api/manufacturing/finished-products/${fp.id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete finished product.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* Top Header Card                                           */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/40 text-amber-100 text-[11px] font-bold tracking-wide uppercase border border-amber-400/30">
              3-Tier Farsan Inventory Hub • કાચો માલ & સ્ટોક
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('stock_title') || 'કાચો માલ & સ્ટોક મેનેજમેન્ટ'}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl">
            ૧. કાચો માલ (Raw Ingredients) • ૨. તૈયાર લૂઝ માલ (Bulk Farsan - Kg) • ૩. પેક્ડ તૈયાર માલ (Retail Packets & Barcodes)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Hero Button: Quick Packaging Station */}
          {(canManage || canRecordProduction) && finishedProducts.length > 0 && (
            <button
              onClick={() => handleOpenPackagingStation()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 text-amber-950 font-black text-xs sm:text-sm hover:bg-amber-300 transition shadow-lg shadow-black/20 active:scale-95"
            >
              <Package className="w-4 h-4 text-amber-950" />
              <span>પેકિંગ સ્ટેશન (Pack Farsan)</span>
            </button>
          )}

          {canManage && activeTier === 'raw_materials' && (
            <button
              onClick={() => { setEditingMaterial(null); setIsAddMaterialModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-50 transition shadow-md shadow-black/10 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ નવો કાચો માલ</span>
            </button>
          )}

          {canManage && activeTier === 'loose_products' && (
            <button
              onClick={() => { setEditingFinishedProduct(null); setIsAddFinishedProductModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-50 transition shadow-md shadow-black/10 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ નવો લૂઝ માલ</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3-Tier KPI Summary Cards                                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Raw Materials */}
        <div
          onClick={() => { setActiveTier('raw_materials'); setFilterLowStockOnly(false); }}
          className={`rounded-2xl p-4 border transition cursor-pointer ${
            activeTier === 'raw_materials'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold text-slate-700">Tier 1: કાચો માલ</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{materials.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {rawLowStockCount > 0 ? (
              <span className="text-rose-600 font-bold">{rawLowStockCount} ઓછો સ્ટોક</span>
            ) : (
              'બધો માલ પૂરતો છે'
            )}
          </div>
        </div>

        {/* KPI 2: Loose Finished Farsan (Kg) */}
        <div
          onClick={() => { setActiveTier('loose_products'); setFilterLowStockOnly(false); }}
          className={`rounded-2xl p-4 border transition cursor-pointer ${
            activeTier === 'loose_products'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold text-slate-700">Tier 2: લૂઝ ફરસાણ સ્ટોક</span>
            <Scale className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {totalLooseKg.toFixed(1)} <span className="text-base font-bold text-slate-600">Kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {finishedProducts.length} તૈયાર ફરસાણ આઇટમો
          </div>
        </div>

        {/* KPI 3: Packaged Retail Products */}
        <div
          onClick={() => { setActiveTier('packaged_products'); setFilterLowStockOnly(false); }}
          className={`rounded-2xl p-4 border transition cursor-pointer ${
            activeTier === 'packaged_products'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold text-slate-700">Tier 3: પેક્ડ તૈયાર માલ</span>
            <Barcode className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {totalPackets} <span className="text-base font-bold text-slate-600">નંગ / Pkts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {packagedProducts.length} બારકોડ SKU / વેરિઅન્ટ
          </div>
        </div>

        {/* KPI 4: Low Stock Alerts */}
        <div
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`rounded-2xl p-4 border transition cursor-pointer ${
            totalLowStockAlerts > 0
              ? filterLowStockOnly
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500'
                : 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/70'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${totalLowStockAlerts > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
              ઓછો સ્ટોક ચેતવણી
            </span>
            <AlertTriangle className={`w-4 h-4 ${totalLowStockAlerts > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black ${totalLowStockAlerts > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {totalLowStockAlerts}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {filterLowStockOnly ? 'ક્લિક કરીને ફિલ્ટર હટાવો' : totalLowStockAlerts > 0 ? 'તાત્કાલિક રિ-ઓર્ડર / પેકિંગ કરો' : 'બધા સ્તરો પર સ્ટોક પૂરતો'}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3-Tier Navigation Tab Bar & Search Controls                */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main Tier Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setActiveTier('raw_materials'); setSelectedCategory('all'); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTier === 'raw_materials'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>૧. કાચો માલ ({materials.length})</span>
            </button>

            <button
              onClick={() => { setActiveTier('loose_products'); setSelectedCategory('all'); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTier === 'loose_products'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>૨. તૈયાર લૂઝ સ્ટોક - Kg ({finishedProducts.length})</span>
            </button>

            <button
              onClick={() => { setActiveTier('packaged_products'); setSelectedCategory('all'); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTier === 'packaged_products'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>૩. પેક્ડ તૈયાર માલ ({packagedProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTier('packaging_runs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTier === 'packaging_runs'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>પેકિંગ હિસ્ટ્રી ({packagingRuns.length})</span>
            </button>

            <button
              onClick={() => setActiveTier('transactions')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTier === 'transactions'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>મૂવમેન્ટ લોગ</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTier !== 'packaging_runs' && activeTier !== 'transactions' && (
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTier === 'raw_materials'
                    ? "કાચો માલ શોધો (બેસન, તેલ, ખાંડ)..."
                    : activeTier === 'loose_products'
                    ? "લૂઝ ફરસાણ શોધો (ભાખરવડી, સેવ)..."
                    : "પેકેટ અથવા બારકોડ શોધો (JS-BHAK-250)..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Sub-Filters for Tier 1: Raw Materials */}
        {activeTier === 'raw_materials' && (
          <div className="flex flex-wrap gap-1.5 text-xs pt-1 border-t border-slate-100">
            {[
              { id: 'all', label: 'બધા કાચા માલ (All)' },
              { id: 'flour', label: 'લોટ (Flours)' },
              { id: 'oil', label: 'તેલ / ઘી (Oils)' },
              { id: 'spice', label: 'મસાલા (Spices)' },
              { id: 'vegetable', label: 'શાકભાજી (Veggies)' },
              { id: 'fuel', label: 'ગેસ બાટલો (Fuel)' },
              { id: 'packaging', label: 'પેકિંગ સાધન (Packaging)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-Filters for Tier 3: Packaged Products (Filter by Finished Product) */}
        {activeTier === 'packaged_products' && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-100">
            <span className="font-bold text-slate-500">ફરસાણ આઇટમ:</span>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">બધા ફરસાણ પેકેટો (All Products)</option>
              {finishedProducts.map(fp => (
                <option key={fp.id} value={fp.id}>
                  {fp.name_gu} ({fp.name_en})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TIER 1 VIEW: RAW MATERIALS (કાચો માલ)                     */}
      {/* ========================================================= */}
      {activeTier === 'raw_materials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              કાચો માલ સ્ટોક લોડ થઈ રહ્યો છે...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-400">
              <Boxes className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-600" />
              <p className="text-sm font-medium">કોઈ કાચો માલ મળ્યો નથી.</p>
            </div>
          ) : (
            filteredMaterials.map(mat => {
              const isLow = mat.is_low_stock;
              return (
                <div
                  key={mat.id}
                  className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                    isLow
                      ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    {/* Header: Name and Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block mb-1">
                          {mat.category}
                        </span>
                        <h3 className="font-black text-slate-900 text-lg leading-tight truncate">
                          {mat.name_gu}
                        </h3>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {mat.name_en}
                        </p>
                      </div>

                      {isLow ? (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1 border border-rose-300 flex-shrink-0 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> ઓછો સ્ટોક
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex-shrink-0">
                          હાજર સ્ટોક
                        </span>
                      )}
                    </div>

                    {/* Stock Value Card (Farsan Native UOM) */}
                    <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-[11px] text-slate-400 font-medium">Current Stock Balance</div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        {mat.formatted_stock}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>Alert Threshold:</span>
                        <span className="font-bold text-slate-700">&lt; {mat.min_stock_alert} {mat.base_unit}</span>
                      </div>
                    </div>

                    {/* Supplier info if linked */}
                    {mat.supplier_name && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-3">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Supplier: {mat.supplier_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => setAdjustingMaterial(mat)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200/80 transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                      <span>સ્ટોક એડજસ્ટ</span>
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingMaterial(mat); setIsAddMaterialModalOpen(true); }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(mat)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TIER 2 VIEW: LOOSE FINISHED PRODUCTS (તૈયાર લૂઝ માલ - Kg)  */}
      {/* ========================================================= */}
      {activeTier === 'loose_products' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  કિચન ઉત્પાદન & લૂઝ તૈયાર માલ (Kitchen Trays & Bulk Weight)
                </h4>
                <p className="text-xs text-amber-800">
                  જ્યારે કિચનમાં નવો બેચ તૈયાર થાય ત્યારે લૂઝ સ્ટોક આપોઆપ વધે છે. પેકિંગ સ્ટેશન દ્વારા આ લૂઝ વજનમાંથી રિટેલ પેકેટો તૈયાર થાય છે.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenPackagingStation()}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Package className="w-4 h-4" />
              <span>પેકિંગ સ્ટેશન ખોલો</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                તૈયાર લૂઝ સ્ટોક લોડ થઈ રહ્યો છે...
              </div>
            ) : filteredFinishedProducts.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-400">
                <Scale className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-600" />
                <p className="text-sm font-medium">કોઈ તૈયાર લૂઝ ફરસાણ મળ્યું નથી.</p>
              </div>
            ) : (
              filteredFinishedProducts.map(fp => {
                const isLow = fp.is_low_stock;
                const looseKg = Number(fp.current_loose_stock) || 0;
                return (
                  <div
                    key={fp.id}
                    className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                      isLow
                        ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block mb-1">
                            {fp.category}
                          </span>
                          <h3 className="font-black text-slate-900 text-lg leading-tight truncate">
                            {fp.name_gu}
                          </h3>
                          <p className="text-xs text-slate-500 truncate font-medium">
                            {fp.name_en}
                          </p>
                        </div>

                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1 border border-rose-300 flex-shrink-0 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> ઓછો લૂઝ સ્ટોક
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex-shrink-0">
                            લૂઝ હાજર
                          </span>
                        )}
                      </div>

                      {/* Bulk Weight Balance Card */}
                      <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/60">
                        <div className="text-[11px] text-amber-900/80 font-semibold flex items-center justify-between">
                          <span>તૈયાર લૂઝ વજન (Available Loose Stock)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 font-bold">ટ્રે / ડબ્બા</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                          {looseKg.toFixed(1)} <span className="text-base font-bold text-amber-800">Kg</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>અલર્ટ લિમિટ:</span>
                          <span className="font-bold text-slate-700">&lt; {fp.min_loose_stock_alert} Kg</span>
                        </div>
                      </div>

                      {/* Packaged Variants Summary */}
                      <div className="mb-3 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                          <span>પેકેટ્સ હાજર સ્ટોક:</span>
                          <span className="text-indigo-600 font-extrabold">{fp.total_packets || 0} Pkts</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fp.packages && fp.packages.length > 0 ? (
                            fp.packages.map(pkg => (
                              <span
                                key={pkg.id}
                                className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                              >
                                <span className="font-bold text-slate-900">{pkg.package_weight_label}:</span>
                                <span className={pkg.current_packet_stock <= pkg.min_packet_stock_alert ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                                  {pkg.current_packet_stock} નંગ
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">કોઈ પેકેટ વેરિઅન્ટ નથી</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 mt-2">
                      {/* Hero Action: Pack into Packets */}
                      <button
                        onClick={() => handleOpenPackagingStation(fp)}
                        disabled={looseKg <= 0}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 active:scale-95 shadow-sm ${
                          looseKg > 0
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-600/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        <span>📦 પેકિંગ કરો (Pack into Retail)</span>
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setAdjustingLooseProduct(fp)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center justify-center gap-1"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          <span>લૂઝ એડજસ્ટ</span>
                        </button>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setVariantParentProduct(fp);
                                setIsAddVariantModalOpen(true);
                              }}
                              className="px-2 py-1.5 rounded-xl text-amber-700 hover:bg-amber-50 text-[11px] font-bold border border-amber-200"
                              title="Add Packaged Size"
                            >
                              + વેરિઅન્ટ
                            </button>
                            <button
                              onClick={() => { setEditingFinishedProduct(fp); setIsAddFinishedProductModalOpen(true); }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFinishedProduct(fp)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TIER 3 VIEW: PACKAGED RETAIL PRODUCTS (પેક્ડ પેકેટો)        */}
      {/* ========================================================= */}
      {activeTier === 'packaged_products' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  રિટેલ કાઉન્ટર પેકેટો & બારકોડ ઇન્વેન્ટરી (Shelf-Ready Stock & POS Ready)
                </h4>
                <p className="text-xs text-indigo-800">
                  દરેક પેકેટ બારકોડ અને વેચાણ કિંમત (MRP) સાથે તૈયાર છે, જે ફેઝ ૨ ના POS સ્કેનર સાથે સીધું કનેક્ટ થઈ શકશે.
                </p>
              </div>
            </div>
            {canManage && finishedProducts.length > 0 && (
              <button
                onClick={() => {
                  setVariantParentProduct(finishedProducts[0]);
                  setIsAddVariantModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ નવો પેકેટ વેરિઅન્ટ</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                પેક્ડ તૈયાર માલ લોડ થઈ રહ્યો છે...
              </div>
            ) : filteredPackagedProducts.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-400">
                <Barcode className="w-12 h-12 mx-auto mb-2 opacity-40 text-indigo-600" />
                <p className="text-sm font-medium">કોઈ પેક્ડ પ્રોડક્ટ મળી નથી.</p>
              </div>
            ) : (
              filteredPackagedProducts.map(pkg => {
                const isLow = pkg.is_low_stock;
                const packets = Number(pkg.current_packet_stock) || 0;
                const weightKg = (packets * pkg.package_weight_grams) / 1000;
                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                      isLow
                        ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 inline-block">
                              {pkg.package_weight_label}
                            </span>
                            {pkg.barcode && (
                              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {pkg.barcode}
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight truncate">
                            {pkg.product_name_gu} - {pkg.package_weight_label}
                          </h3>
                          <p className="text-xs text-slate-500 truncate font-medium">
                            {pkg.product_name_en}
                          </p>
                        </div>

                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1 border border-rose-300 flex-shrink-0 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> ઓછો સ્ટોક
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex-shrink-0">
                            શેલ્ફ સ્ટોક
                          </span>
                        )}
                      </div>

                      {/* Packet Count Banner */}
                      <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-100">
                        <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                          <span>હાજર પેકેટો (Packet Count)</span>
                          <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg text-xs">
                            MRP ₹{pkg.selling_price || 0}
                          </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
                          {packets} <span className="text-base font-bold text-slate-600">નંગ / Pkts</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>કુલ વજન: {weightKg.toFixed(2)} Kg</span>
                          <span>અલર્ટ: &lt; {pkg.min_packet_stock_alert} Pkts</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => setAdjustingPackagedVariant(pkg)}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200/80 transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                        <span>પેકેટ સ્ટોક એડજસ્ટ</span>
                      </button>

                      {canManage && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete ${pkg.package_weight_label} variant of ${pkg.product_name_gu}?`)) return;
                            try {
                              await apiFetch(`/api/manufacturing/packaged-products/${pkg.id}`, { method: 'DELETE' });
                              loadData();
                            } catch (err) {
                              alert(err.message || 'Failed to delete variant.');
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PACKAGING RUNS HISTORY VIEW (પેકિંગ હિસ્ટ્રી)               */}
      {/* ========================================================= */}
      {activeTier === 'packaging_runs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              પેકિંગ સ્ટેશન રન હિસ્ટ્રી (Packaging Run Audit Log)
            </h3>
            <span className="text-xs text-slate-500">છેલ્લા {packagingRuns.length} પેકિંગ રેકોર્ડ્સ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">તારીખ & સમય</th>
                  <th className="py-2.5 px-4 font-semibold">રન નંબર</th>
                  <th className="py-2.5 px-4 font-semibold">ફરસાણ આઇટમ</th>
                  <th className="py-2.5 px-4 font-semibold text-right">કપાત થયેલ લૂઝ વજન</th>
                  <th className="py-2.5 px-4 font-semibold">તૈયાર થયેલ પેકેટો</th>
                  <th className="py-2.5 px-4 font-semibold">સ્ટાફ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packagingRuns.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      હજુ સુધી કોઈ પેકિંગ રન નોંધાયેલ નથી.
                    </td>
                  </tr>
                ) : (
                  packagingRuns.map(run => (
                    <tr key={run.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(run.created_at)} {run.created_at?.slice(11, 16)}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-900">
                        {run.run_number}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900">{run.product_name_gu}</span>
                        <span className="text-[11px] text-slate-500 block">{run.product_name_en}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="font-black text-rose-700">
                          -{run.total_weight_deducted} Kg
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          (બાકી: {run.loose_stock_after} Kg)
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {run.items && run.items.map((it, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold">
                              {it.package_weight_label}: +{it.packet_count} નંગ
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {run.packed_by_name || 'Hansaben / Staff'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STOCK TRANSACTIONS / MOVEMENT LOG VIEW                     */}
      {/* ========================================================= */}
      {activeTier === 'transactions' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              કાચો માલ સ્ટોક મૂવમેન્ટ & ઇનવર્ડ/આઉટવર્ડ લોગ
            </h3>
            <span className="text-xs text-slate-500">છેલ્લા ૬૦ મૂવમેન્ટ્સ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">તારીખ & સમય</th>
                  <th className="py-2.5 px-4 font-semibold">કાચો માલ</th>
                  <th className="py-2.5 px-4 font-semibold">પ્રકાર</th>
                  <th className="py-2.5 px-4 font-semibold text-right">જથ્થો</th>
                  <th className="py-2.5 px-4 font-semibold text-right">પહેલાનો સ્ટોક</th>
                  <th className="py-2.5 px-4 font-semibold text-right">પછીનો સ્ટોક</th>
                  <th className="py-2.5 px-4 font-semibold">સંદર્ભ / નોંધ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      કોઈ સ્ટોક ટ્રાન્ઝેક્શન નોંધાયેલ નથી.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const isPositive = tx.base_quantity > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 text-slate-500">
                          {formatDate(tx.created_at)} {tx.created_at?.slice(11, 16)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-800">{tx.material_name_gu}</span>
                          <span className="text-[11px] text-slate-500 block">{tx.material_name_en}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            tx.transaction_type === 'inward_ocr'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.transaction_type === 'outward_production'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.transaction_type === 'adjustment_loss'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tx.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`font-black ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isPositive ? '+' : ''}{tx.base_quantity} {tx.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          {tx.stock_before} {tx.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                          {tx.stock_after} {tx.unit}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                          {tx.notes || tx.reference_type}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PACKAGING STATION (લૂઝ માલમાંથી પેકેટો બનાવો)          */}
      {/* ========================================================= */}
      {isPackagingModalOpen && (
        <PackagingStationModal
          isOpen={isPackagingModalOpen}
          onClose={() => {
            setIsPackagingModalOpen(false);
            setPackagingSelectedProduct(null);
          }}
          initialProduct={packagingSelectedProduct}
          finishedProducts={finishedProducts}
          onSaved={() => {
            setIsPackagingModalOpen(false);
            setPackagingSelectedProduct(null);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT RAW MATERIAL                            */}
      {/* ========================================================= */}
      {isAddMaterialModalOpen && (
        <RawMaterialFormModal
          isOpen={isAddMaterialModalOpen}
          onClose={() => setIsAddMaterialModalOpen(false)}
          editingMaterial={editingMaterial}
          vendors={vendors}
          onSaved={() => {
            setIsAddMaterialModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADJUST RAW MATERIAL STOCK                          */}
      {/* ========================================================= */}
      {adjustingMaterial && (
        <StockAdjustmentModal
          isOpen={!!adjustingMaterial}
          onClose={() => setAdjustingMaterial(null)}
          material={adjustingMaterial}
          onSaved={() => {
            setAdjustingMaterial(null);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT FINISHED PRODUCT (લૂઝ માલ)               */}
      {/* ========================================================= */}
      {isAddFinishedProductModalOpen && (
        <FinishedProductFormModal
          isOpen={isAddFinishedProductModalOpen}
          onClose={() => setIsAddFinishedProductModalOpen(false)}
          editingProduct={editingFinishedProduct}
          onSaved={() => {
            setIsAddFinishedProductModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADJUST LOOSE STOCK (લૂઝ વજન એડજસ્ટ)                 */}
      {/* ========================================================= */}
      {adjustingLooseProduct && (
        <LooseStockAdjustmentModal
          isOpen={!!adjustingLooseProduct}
          onClose={() => setAdjustingLooseProduct(null)}
          product={adjustingLooseProduct}
          onSaved={() => {
            setAdjustingLooseProduct(null);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PACKAGED VARIANT (નવો પેકેટ વેરિઅન્ટ)          */}
      {/* ========================================================= */}
      {isAddVariantModalOpen && (
        <AddPackagedVariantModal
          isOpen={isAddVariantModalOpen}
          onClose={() => {
            setIsAddVariantModalOpen(false);
            setVariantParentProduct(null);
          }}
          finishedProduct={variantParentProduct}
          onSaved={() => {
            setIsAddVariantModalOpen(false);
            setVariantParentProduct(null);
            loadData();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADJUST PACKET COUNT (પેકેટ નંગ એડજસ્ટ)              */}
      {/* ========================================================= */}
      {adjustingPackagedVariant && (
        <PackagedStockAdjustmentModal
          isOpen={!!adjustingPackagedVariant}
          onClose={() => setAdjustingPackagedVariant(null)}
          variant={adjustingPackagedVariant}
          onSaved={() => {
            setAdjustingPackagedVariant(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// MODAL: PACKAGING STATION (લૂઝ માલમાંથી પેકેટો બનાવો - Sticker Counter)
// =========================================================================
function PackagingStationModal({ isOpen, onClose, initialProduct, finishedProducts, onSaved }) {
  const [selectedProductId, setSelectedProductId] = useState(
    initialProduct?.id || (finishedProducts.length > 0 ? finishedProducts[0].id : '')
  );
  const [packetCounts, setPacketCounts] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentProduct = finishedProducts.find(p => p.id === selectedProductId);
  const availableLooseKg = currentProduct ? Number(currentProduct.current_loose_stock) || 0 : 0;
  const packages = currentProduct?.packages || [];

  // Initialize or reset packet counts on product switch
  useEffect(() => {
    const initial = {};
    if (packages.length > 0) {
      packages.forEach(p => {
        initial[p.id] = '';
      });
    }
    setPacketCounts(initial);
    setError('');
  }, [selectedProductId]);

  // Compute live totals
  let totalDeductedWeightKg = 0;
  let totalPacketsCreated = 0;

  packages.forEach(p => {
    const count = parseInt(packetCounts[p.id], 10) || 0;
    if (count > 0) {
      totalDeductedWeightKg += (count * p.package_weight_grams) / 1000;
      totalPacketsCreated += count;
    }
  });

  totalDeductedWeightKg = Math.round(totalDeductedWeightKg * 1000) / 1000;
  const remainingLooseKg = Math.round((availableLooseKg - totalDeductedWeightKg) * 1000) / 1000;
  const isOverLimit = totalDeductedWeightKg > availableLooseKg;

  const handleCountChange = (packageId, value) => {
    setPacketCounts(prev => ({
      ...prev,
      [packageId]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProduct) {
      setError('કૃપા કરીને ફરસાણ આઇટમ પસંદ કરો.');
      return;
    }

    if (totalDeductedWeightKg <= 0) {
      setError('ઓછામાં ઓછા ૧ પેકેટ સાઇઝ માટે નંગ દાખલ કરો.');
      return;
    }

    if (isOverLimit) {
      setError(`લૂઝ સ્ટોક અપૂરતો છે! માંગેલ ${totalDeductedWeightKg} Kg ઉપલબ્ધ ${availableLooseKg} Kg કરતાં વધુ છે.`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const items = packages
        .map(p => ({
          packaged_product_id: p.id,
          packet_count: parseInt(packetCounts[p.id], 10) || 0
        }))
        .filter(item => item.packet_count > 0);

      const res = await apiFetch('/api/manufacturing/packaging-runs', {
        method: 'POST',
        body: JSON.stringify({
          finished_product_id: currentProduct.id,
          items,
          notes: notes || 'Packaging station run'
        })
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'પેકિંગ રેકોર્ડ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-black text-base sm:text-lg">
                પેકિંગ સ્ટેશન (Packaging Station)
              </h3>
              <p className="text-[11px] text-amber-100">
                લૂઝ ફરસાણમાંથી પેકેટો બનાવો • બારકોડ સ્ટીકર કાઉન્ટ એન્ટ્રી
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Select Dropdown */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ૧. ફરસાણ આઇટમ પસંદ કરો (Select Finished Product) *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:ring-2 focus:ring-amber-500"
            >
              {finishedProducts.map(fp => (
                <option key={fp.id} value={fp.id}>
                  {fp.name_gu} ({fp.name_en}) — હાજર લૂઝ: {(Number(fp.current_loose_stock) || 0).toFixed(1)} Kg
                </option>
              ))}
            </select>
          </div>

          {/* Available Loose Stock Display */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-800 font-bold block">
                કિચનમાં હાજર લૂઝ વજન (Available Loose Weight):
              </span>
              <span className="text-xl font-black text-amber-950">
                {availableLooseKg.toFixed(1)} Kg
              </span>
            </div>
            <Scale className="w-6 h-6 text-amber-600 opacity-60" />
          </div>

          {/* Packet Size Inputs */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              ૨. પેક કરેલા પેકેટોના નંગ દાખલ કરો (Enter Packet Counts):
            </label>

            {packages.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-center">
                આ પ્રોડક્ટ માટે કોઈ પેકેટ વેરિઅન્ટ નોંધાયેલ નથી. કૃપા કરીને પહેલા પેકેટ વેરિઅન્ટ ઉમેરો (દા.ત. 250g, 500g).
              </div>
            ) : (
              <div className="space-y-2.5">
                {packages.map(pkg => {
                  const count = parseInt(packetCounts[pkg.id], 10) || 0;
                  const itemWeightKg = (count * pkg.package_weight_grams) / 1000;
                  return (
                    <div
                      key={pkg.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black text-[11px]">
                            {pkg.package_weight_label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {pkg.barcode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          MRP: ₹{pkg.selling_price || 0} • હાજર: {pkg.current_packet_stock} નંગ
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={packetCounts[pkg.id] || ''}
                            onChange={(e) => handleCountChange(pkg.id, e.target.value)}
                            className="w-20 px-2.5 py-1.5 text-center rounded-xl border border-slate-300 text-sm font-black text-amber-900 bg-white focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            નંગ (Pkts)
                          </span>
                        </div>
                        <div className="w-16 text-right font-bold text-[11px] text-slate-700">
                          = {itemWeightKg.toFixed(2)} Kg
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Summary Calculation Card */}
          {totalDeductedWeightKg > 0 && (
            <div className={`p-4 rounded-2xl border transition ${
              isOverLimit ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">કુલ કપાત વજન</span>
                  <span className={`text-base font-black ${isOverLimit ? 'text-rose-700' : 'text-slate-900'}`}>
                    {totalDeductedWeightKg.toFixed(2)} Kg
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">કુલ પેકેટો</span>
                  <span className="text-base font-black text-indigo-900">
                    {totalPacketsCreated} નંગ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">બાકી લૂઝ વજન</span>
                  <span className={`text-base font-black ${remainingLooseKg < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {remainingLooseKg.toFixed(2)} Kg
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              નોંધ / સ્ટાફ વિગત (Notes)
            </label>
            <input
              type="text"
              placeholder="દા.ત. સવારનું પેકિંગ - હંસાબેન દ્વારા"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalDeductedWeightKg <= 0 || isOverLimit}
              className={`px-5 py-2.5 rounded-xl font-bold text-white transition shadow-sm ${
                submitting || totalDeductedWeightKg <= 0 || isOverLimit
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting ? 'સેવ થઈ રહ્યું છે...' : 'પેકિંગ સેવ કરો (Confirm Packaging)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADD / EDIT FINISHED PRODUCT (લૂઝ માલ)
// =========================================================================
function FinishedProductFormModal({ isOpen, onClose, editingProduct, onSaved }) {
  const [nameEn, setNameEn] = useState(editingProduct?.name_en || '');
  const [nameGu, setNameGu] = useState(editingProduct?.name_gu || '');
  const [category, setCategory] = useState(editingProduct?.category || 'namkeen');
  const [initialLooseStock, setInitialLooseStock] = useState(editingProduct?.current_loose_stock || 0);
  const [minAlert, setMinAlert] = useState(editingProduct?.min_loose_stock_alert || 10);
  const [shelfLife, setShelfLife] = useState(editingProduct?.shelf_life_days || 30);
  const [notes, setNotes] = useState(editingProduct?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameGu.trim()) {
      setError('ગુજરાતી અને અંગ્રેજી બંને નામો જરૂરી છે.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name_en: nameEn.trim(),
        name_gu: nameGu.trim(),
        category,
        initial_loose_stock: Number(initialLooseStock) || 0,
        min_loose_stock_alert: Number(minAlert) || 10,
        shelf_life_days: Number(shelfLife) || 30,
        notes: notes || null
      };

      const url = editingProduct
        ? `/api/manufacturing/finished-products/${editingProduct.id}`
        : '/api/manufacturing/finished-products';

      const res = await apiFetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'પ્રોડક્ટ સેવ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            <h3 className="font-bold text-base sm:text-lg">
              {editingProduct ? 'તૈયાર લૂઝ ફરસાણ એડિટ કરો' : 'નવો તૈયાર લૂઝ માલ ઉમેરો'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ગુજરાતી નામ *</label>
              <input
                type="text"
                required
                placeholder="દા.ત. રતલામી સેવ, ભાખરવડી"
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">English Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ratlami Sev, Bhakharwadi"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">કેટેગરી</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="namkeen">નમકીન / સેવ (Namkeen)</option>
                <option value="daily_farsan">રોજિંદુ ફરસાણ (Daily Farsan)</option>
                <option value="festive_sweet">તહેવાર મીઠાઈ (Sweets)</option>
                <option value="dry_snack">સૂકો નાસ્તો (Dry Snacks)</option>
                <option value="other">અન્ય (Other)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">શેલ્ફ લાઇફ (દિવસો)</label>
              <input
                type="number"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingProduct && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">શરૂઆતનો લૂઝ સ્ટોક (Kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={initialLooseStock}
                  onChange={(e) => setInitialLooseStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ઓછા સ્ટોકની અલર્ટ લિમિટ (Kg)</label>
              <input
                type="number"
                step="0.5"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">નોંધ / વિગત</label>
            <input
              type="text"
              placeholder="દા.ત. સ્પેશિયલ રતલામી સેવ, રોજિંદી ગરમ ખમણ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition shadow-sm"
            >
              {submitting ? 'Saving...' : 'પ્રોડક્ટ સેવ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADJUST LOOSE STOCK (લૂઝ વજન એડજસ્ટ)
// =========================================================================
function LooseStockAdjustmentModal({ isOpen, onClose, product, onSaved }) {
  const [type, setType] = useState('inward_manual');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('કૃપા કરીને માન્ય વજન (કિલો) દાખલ કરો.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch(`/api/manufacturing/finished-products/${product.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          transaction_type: type,
          quantity: qty,
          notes: notes || 'Manual loose stock adjustment'
        })
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'સ્ટોક એડજસ્ટ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            <h3 className="font-bold text-base">લૂઝ સ્ટોક એડજસ્ટ: {product.name_gu}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <span className="text-amber-800 font-bold">હાજર લૂઝ સ્ટોક:</span>
            <span className="font-black text-amber-950 text-lg">
              {(Number(product.current_loose_stock) || 0).toFixed(1)} Kg
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">પ્રકાર (Action)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('inward_manual')}
                className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  type === 'inward_manual'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>+ કિચન ઇનવર્ડ / ઉમેરો</span>
              </button>

              <button
                type="button"
                onClick={() => setType('adjustment_loss')}
                className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  type === 'adjustment_loss'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>- નુકસાન / સેમ્પલિંગ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">વજન (Kilograms - Kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              placeholder="e.g. 5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-amber-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">કારણ / નોંધ</label>
            <input
              type="text"
              placeholder="દા.ત. વધારાની ટ્રે, ટેસ્ટિંગ વેસ્ટ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition shadow-sm"
            >
              {submitting ? 'Applying...' : 'લૂઝ સ્ટોક બદલો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADD PACKAGED VARIANT (નવો પેકેટ વેરિઅન્ટ - 250g, 500g, 1kg)
// =========================================================================
function AddPackagedVariantModal({ isOpen, onClose, finishedProduct, onSaved }) {
  const [weightGrams, setWeightGrams] = useState(250);
  const [label, setLabel] = useState('250g');
  const [barcode, setBarcode] = useState('');
  const [sellingPrice, setSellingPrice] = useState(90);
  const [initialStock, setInitialStock] = useState(0);
  const [minAlert, setMinAlert] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate barcode when grams change
  const handleGramsChange = (g) => {
    const num = Number(g) || 250;
    setWeightGrams(num);
    const lbl = num >= 1000 ? `${num / 1000}kg` : `${num}g`;
    setLabel(lbl);
    if (finishedProduct) {
      setBarcode(`JS-${finishedProduct.name_en.slice(0, 4).toUpperCase()}-${num}`);
    }
  };

  useEffect(() => {
    if (finishedProduct) {
      setBarcode(`JS-${finishedProduct.name_en.slice(0, 4).toUpperCase()}-${weightGrams}`);
    }
  }, [finishedProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!finishedProduct) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch('/api/manufacturing/packaged-products', {
        method: 'POST',
        body: JSON.stringify({
          finished_product_id: finishedProduct.id,
          package_weight_grams: Number(weightGrams),
          package_weight_label: label.trim(),
          barcode: barcode.trim(),
          selling_price: Number(sellingPrice) || 0,
          initial_packet_stock: Number(initialStock) || 0,
          min_packet_stock_alert: Number(minAlert) || 10
        })
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'વેરિઅન્ટ ઉમેરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-700 text-white">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5" />
            <h3 className="font-bold text-base">
              નવો પેકેટ વેરિઅન્ટ: {finishedProduct?.name_gu}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div>
            <label className="block font-bold text-slate-700 mb-1">પેકેટ વજન પસંદ કરો</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { grams: 250, label: '250g' },
                { grams: 500, label: '500g' },
                { grams: 1000, label: '1kg' }
              ].map(opt => (
                <button
                  key={opt.grams}
                  type="button"
                  onClick={() => handleGramsChange(opt.grams)}
                  className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                    weightGrams === opt.grams
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">વજન (ગ્રામ) *</label>
              <input
                type="number"
                required
                value={weightGrams}
                onChange={(e) => handleGramsChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">વેચાણ કિંમત (MRP ₹) *</label>
              <input
                type="number"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-emerald-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">બારકોડ / SKU કોડ (Phase 2 POS Ready)</label>
            <input
              type="text"
              required
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-indigo-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">શરૂઆતનો સ્ટોક (નંગ)</label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">અલર્ટ લિમિટ (નંગ)</label>
              <input
                type="number"
                min="1"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition shadow-sm"
            >
              {submitting ? 'Saving...' : 'વેરિઅન્ટ સેવ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADJUST PACKAGED VARIANT STOCK (પેકેટ નંગ એડજસ્ટ)
// =========================================================================
function PackagedStockAdjustmentModal({ isOpen, onClose, variant, onSaved }) {
  const [type, setType] = useState('inward_manual');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('કૃપા કરીને માન્ય નંગ દાખલ કરો.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch(`/api/manufacturing/packaged-products/${variant.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          transaction_type: type,
          quantity: qty,
          notes: notes || 'Manual packet count adjustment'
        })
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'પેકેટ સ્ટોક એડજસ્ટ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-700 text-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            <h3 className="font-bold text-base">
              પેકેટ સ્ટોક એડજસ્ટ: {variant.product_name_gu} ({variant.package_weight_label})
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
            <span className="text-indigo-800 font-bold">હાજર પેકેટો (Shelf Stock):</span>
            <span className="font-black text-indigo-950 text-lg">
              {variant.current_packet_stock} નંગ (Pkts)
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">પ્રકાર (Action)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('inward_manual')}
                className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  type === 'inward_manual'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>+ પેકેટ ઉમેરો</span>
              </button>

              <button
                type="button"
                onClick={() => setType('adjustment_loss')}
                className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  type === 'adjustment_loss'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>- નુકસાન / ડેમેજ પેકેટ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">પેકેટ સંખ્યા (નંગ / Pkts) *</label>
            <input
              type="number"
              step="1"
              min="1"
              required
              placeholder="e.g. 5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-indigo-950"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">કારણ / નોંધ</label>
            <input
              type="text"
              placeholder="દા.ત. ફાટી ગયેલ પાઉચ, ફિઝિકલ ઓડિટ કાઉન્ટ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition shadow-sm"
            >
              {submitting ? 'Applying...' : 'પેકેટ સ્ટોક અપડેટ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADD / EDIT RAW MATERIAL FORM
// =========================================================================
function RawMaterialFormModal({ isOpen, onClose, editingMaterial, vendors, onSaved }) {
  const [nameEn, setNameEn] = useState(editingMaterial?.name_en || '');
  const [nameGu, setNameGu] = useState(editingMaterial?.name_gu || '');
  const [category, setCategory] = useState(editingMaterial?.category || 'flour');
  const [primaryUnit, setPrimaryUnit] = useState(editingMaterial?.primary_unit || 'bag_50kg');
  const [initialStock, setInitialStock] = useState(editingMaterial?.current_stock || 0);
  const [minAlert, setMinAlert] = useState(editingMaterial?.min_stock_alert || 50);
  const [costPerUnit, setCostPerUnit] = useState(editingMaterial?.cost_per_unit || 0);
  const [vendorId, setVendorId] = useState(editingMaterial?.supplier_vendor_id || '');
  const [notes, setNotes] = useState(editingMaterial?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (!editingMaterial) {
      if (newCat === 'flour') { setPrimaryUnit('bag_50kg'); setMinAlert(50); }
      else if (newCat === 'oil') { setPrimaryUnit('tin_15kg'); setMinAlert(30); }
      else if (newCat === 'fuel') { setPrimaryUnit('cylinder_19kg'); setMinAlert(2); }
      else if (newCat === 'packaging') { setPrimaryUnit('piece'); setMinAlert(200); }
      else { setPrimaryUnit('kg'); setMinAlert(10); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameGu.trim()) {
      setError('ગુજરાતી અને અંગ્રેજી બંને નામો જરૂરી છે.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name_en: nameEn.trim(),
        name_gu: nameGu.trim(),
        category,
        primary_unit: primaryUnit,
        initial_stock: Number(initialStock) || 0,
        min_stock_alert: Number(minAlert) || 0,
        cost_per_unit: Number(costPerUnit) || 0,
        supplier_vendor_id: vendorId || null,
        notes: notes || null
      };

      const url = editingMaterial
        ? `/api/manufacturing/materials/${editingMaterial.id}`
        : '/api/manufacturing/materials';

      const res = await apiFetch(url, {
        method: editingMaterial ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'કાચો માલ સેવ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5" />
            <h3 className="font-bold text-base sm:text-lg">
              {editingMaterial ? 'કાચો માલ એડિટ કરો' : 'નવો કાચો માલ ઉમેરો'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ગુજરાતી નામ *</label>
              <input
                type="text"
                required
                placeholder="દા.ત. ચણાનો લોટ / બેસન, સીંગતેલ"
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">English Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Besan (Gram Flour)"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">કેટેગરી</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="flour">લોટ અને અનાજ (Flours - બેસન, મેંદો)</option>
                <option value="oil">ખાદ્ય તેલ અને ઘી (Cooking Oils)</option>
                <option value="spice">મસાલા અને સીઝનીંગ (Spices & Seasoning)</option>
                <option value="vegetable">શાકભાજી (Vegetables - બટાકા, મરચાં)</option>
                <option value="fuel">બળતણ (Commercial LPG ૧૯ કિલો)</option>
                <option value="packaging">પેકિંગ સાધન (Pouches, Boxes)</option>
                <option value="other">અન્ય (Other)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">પ્રાથમિક માપ (Primary UOM)</label>
              <select
                value={primaryUnit}
                onChange={(e) => setPrimaryUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="bag_50kg">૫૦ કિલો કટ્ટા / બોરી (50 Kg Bag)</option>
                <option value="bag_30kg">૩૦ કિલો કટ્ટા / બોરી (30 Kg Bag)</option>
                <option value="bag_25kg">૨૫ કિલો કટ્ટા / બોરી (25 Kg Bag)</option>
                <option value="tin_15kg">૧૫ કિલો ડબ્બો (15 Kg Tin / Dabba)</option>
                <option value="cylinder_19kg">૧૯ કિલો ગેસ બાટલો (LPG Cylinder)</option>
                <option value="kg">કિલોગ્રામ (Kg)</option>
                <option value="g">ગ્રામ (g)</option>
                <option value="piece">નંગ (Piece / Pouch)</option>
                <option value="box">બોક્સ (Box)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingMaterial && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">શરૂઆતનો સ્ટોક (બેઝ યુનિટ દા.ત. Kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            )}
            <div>
              <label className="block font-bold text-slate-700 mb-1">ઓછા સ્ટોકની ચેતવણી (Alert Threshold)</label>
              <input
                type="number"
                step="0.5"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">વેપારી / સપ્લાયર (Preferred Vendor)</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">-- કોઈ ચોક્કસ વેન્ડર નથી --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">નોંધ / વિગત</label>
            <input
              type="text"
              placeholder="દા.ત. આનંદ બ્રાન્ડ બેસન, રાજકોટ તેલ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition shadow-sm"
            >
              {submitting ? 'Saving...' : 'કાચો માલ સેવ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// MODAL: ADJUST RAW MATERIAL STOCK
// =========================================================================
function StockAdjustmentModal({ isOpen, onClose, material, onSaved }) {
  const [type, setType] = useState('inward_manual');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(material.primary_unit);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('કૃપા કરીને માન્ય જથ્થો દાખલ કરો.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiFetch(`/api/manufacturing/materials/${material.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          transaction_type: type,
          quantity: qty,
          unit,
          notes: notes || 'Manual Stock Adjustment'
        })
      });

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'સ્ટોક એડજસ્ટ કરવામાં નિષ્ફળ.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            <h3 className="font-bold text-base">સ્ટોક એડજસ્ટ: {material.name_gu}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 font-bold">{error}</div>}

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-bold">હાજર સ્ટોક:</span>
            <span className="font-bold text-slate-900 text-sm">{material.formatted_stock}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">પ્રકાર (Action)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'inward_manual', label: '+ માલ આવક', icon: ArrowUpRight, color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
                { id: 'adjustment_loss', label: '- બગાડ / નુકસાન', icon: ArrowDownRight, color: 'text-rose-700 border-rose-300 bg-rose-50' },
                { id: 'adjustment_gain', label: '+ ઓડિટ વધારો', icon: Plus, color: 'text-blue-700 border-blue-300 bg-blue-50' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                    type === opt.id
                      ? `${opt.color} ring-2 ring-amber-500`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">જથ્થો (Quantity) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-amber-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">યુનિટ (Unit)</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value={material.primary_unit}>{material.primary_unit}</option>
                <option value={material.base_unit}>{material.base_unit}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">કારણ / નોંધ</label>
            <input
              type="text"
              placeholder="દા.ત. લોકલ ડિલિવરી, વધારાનો માલ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition shadow-sm"
            >
              {submitting ? 'Applying...' : 'સ્ટોક ફેરફાર લાગુ કરો'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RawMaterials;
