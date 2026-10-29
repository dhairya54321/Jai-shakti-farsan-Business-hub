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
  Filter,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Flame,
  Truck,
  Building2,
  X,
  FileText,
  Boxes,
  Layers,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

export function RawMaterials() {
  const { role, hasPermission } = useAuth();
  const { lang, t, formatINR, formatDate } = useLanguage();

  const isOwner = role === 'owner';
  const canManage = isOwner || hasPermission('can_manage_stock');

  // Materials & Vendors State
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'low_stock' | 'transactions'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [adjustingMaterial, setAdjustingMaterial] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matRes, vendRes, txRes] = await Promise.all([
        apiFetch('/api/manufacturing/materials'),
        apiFetch('/api/vendors'),
        apiFetch('/api/manufacturing/transactions?limit=60')
      ]);

      if (matRes.success) setMaterials(matRes.materials);
      if (vendRes.success) setVendors(vendRes.vendors || []);
      if (txRes.success) setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('Failed to load raw materials data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lowStockCount = materials.filter(m => m.is_low_stock).length;

  const filteredMaterials = materials.filter(m => {
    if (activeTab === 'low_stock' && !m.is_low_stock) return false;
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchEn = m.name_en?.toLowerCase().includes(term);
      const matchGu = m.name_gu?.toLowerCase().includes(term);
      const matchCat = m.category?.toLowerCase().includes(term);
      return matchEn || matchGu || matchCat;
    }
    return true;
  });

  const handleDelete = async (mat) => {
    if (!window.confirm(`Are you sure you want to delete ${mat.name_gu} (${mat.name_en})?`)) return;
    try {
      await apiFetch(`/api/manufacturing/materials/${mat.id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete raw material.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/40 text-amber-100 text-[11px] font-bold tracking-wide uppercase border border-amber-400/30">
              Live Stock Inventory • WAL Enabled
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('stock_title') || 'કાચો માલ અને સ્ટોક'}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 max-w-xl">
            {t('stock_sub') || 'Real-time inventory tracking, Farsan-native UOMs & low-stock warnings'}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingMaterial(null); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-50 transition shadow-md shadow-black/10 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>{t('btn_add_material') || 'નવો કાચો માલ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Materials</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{materials.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active inventory items</div>
        </div>

        <div
          onClick={() => setActiveTab('low_stock')}
          className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition ${
            lowStockCount > 0
              ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/70'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-semibold ${lowStockCount > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
              Low Stock Alerts
            </span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {lowStockCount > 0 ? 'Require immediate re-order' : 'All materials sufficient'}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Cooking Oils & Flours</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {materials.filter(m => m.category === 'flour' || m.category === 'oil').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Core farsan ingredients</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Stock Movements</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{transactions.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Audit log records</div>
        </div>
      </div>

      {/* Tabs Navigation & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Materials ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('low_stock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'low_stock'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : lowStockCount > 0
                  ? 'text-rose-700 hover:text-rose-800 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Low Stock</span>
              {lowStockCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'low_stock' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'}`}>
                  {lowStockCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'transactions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Movement Log</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'transactions' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search raw material (બેસન, તેલ, ખાંડ)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Category Pills Filter */}
        {activeTab !== 'transactions' && (
          <div className="flex flex-wrap gap-1.5 text-xs pt-1 border-t border-slate-100">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'flour', label: 'Flours (લોટ)' },
              { id: 'oil', label: 'Oils (તેલ)' },
              { id: 'spice', label: 'Spices & Seasoning' },
              { id: 'vegetable', label: 'Vegetables (શાકભાજી)' },
              { id: 'fuel', label: 'Fuel (ગેસ બાટલો)' },
              { id: 'packaging', label: 'Packaging (પેકિંગ)' }
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
      </div>

      {/* Main Content View */}
      {activeTab === 'transactions' ? (
        /* Stock Movement Log / Audit Trail */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              Stock Movement & Inward/Outward Log
            </h3>
            <span className="text-xs text-slate-500">Last 60 movements</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-4 font-semibold">Raw Material</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Stock Before</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Stock After</th>
                  <th className="py-2.5 px-4 font-semibold">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No stock transactions recorded yet.
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
      ) : (
        /* Raw Materials Grid / Table View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              Loading raw materials inventory...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-600" />
              <p className="text-sm font-medium">No raw materials found.</p>
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
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex-shrink-0">
                          In Stock
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
                      <span>{t('btn_adjust_stock') || 'સ્ટોક એડજસ્ટ'}</span>
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingMaterial(mat); setIsAddModalOpen(true); }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(mat)}
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

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT RAW MATERIAL             */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <RawMaterialFormModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          editingMaterial={editingMaterial}
          vendors={vendors}
          onSaved={() => {
            setIsAddModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* ========================================== */}
      {/* MODAL: ADJUST STOCK LEVEL (IN/OUT/AUDIT)   */}
      {/* ========================================== */}
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
    </div>
  );
}

// Subcomponent: Add / Edit Material Form Modal
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

  // Auto configure sensible unit when category changes
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
      setError('Please provide material names in both Gujarati and English.');
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
        setError(res.error || 'Failed to save material.');
      }
    } catch (err) {
      setError(err.message || 'Error saving material.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="font-bold text-base sm:text-lg">
              {editingMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Name in Gujarati *</label>
              <input
                type="text"
                required
                placeholder="દા.ત. બેસન, સીંગતેલ"
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Name in English *</label>
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
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="flour">Flours (લોટ - બેસન, મેંદો)</option>
                <option value="oil">Oils (ખાદ્ય તેલ - સીંગતેલ)</option>
                <option value="spice">Spices (મસાલા - તલ, અજમો)</option>
                <option value="vegetable">Vegetables (બટાકા, મરચાં)</option>
                <option value="fuel">Fuel (૧૯ કિલો ગેસ બાટલો)</option>
                <option value="packaging">Packaging (પાઉચ, બોક્સ)</option>
                <option value="other">Other Materials</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Farsan UOM</label>
              <select
                value={primaryUnit}
                onChange={(e) => setPrimaryUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="bag_50kg">50 Kg Bag / Katta (૫૦ કિલો કટ્ટા)</option>
                <option value="bag_25kg">25 Kg Bag / Katta (૨૫ કિલો કટ્ટા)</option>
                <option value="tin_15kg">15 Kg Tin / Dabba (૧૫ કિલો ડબ્બો)</option>
                <option value="cylinder_19kg">19 Kg LPG Cylinder (ગેસ બાટલો)</option>
                <option value="kg">Kilogram (કિલો)</option>
                <option value="g">Gram (ગ્રામ)</option>
                <option value="piece">Piece / Pouch (નંગ / પાઉચ)</option>
                <option value="box">Box (બોક્સ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editingMaterial && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Stock (in base unit, e.g. Kg)</label>
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
              <label className="block font-bold text-slate-700 mb-1">Low-Stock Alert Level</label>
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
            <label className="block font-bold text-slate-700 mb-1">Preferred Vendor / Supplier</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">-- No specific vendor linked --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
            <input
              type="text"
              placeholder="e.g. Anand brand besan, Rajkot oil..."
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
              {submitting ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Adjust Stock Modal
function StockAdjustmentModal({ isOpen, onClose, material, onSaved }) {
  const [type, setType] = useState('inward_manual'); // 'inward_manual' | 'adjustment_loss' | 'adjustment_gain'
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(material.primary_unit);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid positive quantity.');
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
        setError(res.error || 'Failed to adjust stock.');
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
            <h3 className="font-bold text-base">Adjust Stock: {material.name_gu}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700">{error}</div>}

          {/* Current Stock Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Current Stock:</span>
            <span className="font-bold text-slate-900 text-sm">{material.formatted_stock}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Adjustment Action</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'inward_manual', label: '+ Inward Arrival', icon: ArrowUpRight, color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
                { id: 'adjustment_loss', label: '- Spoilage / Loss', icon: ArrowDownRight, color: 'text-rose-700 border-rose-300 bg-rose-50' },
                { id: 'adjustment_gain', label: '+ Audit Gain', icon: Plus, color: 'text-blue-700 border-blue-300 bg-blue-50' }
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
              <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
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
              <label className="block font-bold text-slate-700 mb-1">Unit</label>
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
            <label className="block font-bold text-slate-700 mb-1">Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Weekly local delivery, frying pan waste..."
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
              {submitting ? 'Applying...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RawMaterials;
