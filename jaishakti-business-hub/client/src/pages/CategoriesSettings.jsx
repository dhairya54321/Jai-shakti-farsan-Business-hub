import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  Sliders,
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  ShieldAlert,
  Save,
  AlertCircle
} from 'lucide-react';

export function CategoriesSettings() {
  const { lang, t, formatINR } = useLanguage();
  const { role } = useAuth();

  const isOwner = role === 'owner';

  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Category Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameGu, setNewNameGu] = useState('');
  const [newClassification, setNewClassification] = useState('operating_expense');
  const [newIcon, setNewIcon] = useState('Coffee');
  const [newSortOrder, setNewSortOrder] = useState('100');

  // Business settings state
  const [threshold, setThreshold] = useState('5000');
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoApproveStaff, setAutoApproveStaff] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, setRes] = await Promise.all([
        apiFetch('/api/categories?all=true'),
        apiFetch('/api/settings')
      ]);
      if (catRes.categories) setCategories(catRes.categories);
      if (setRes.settings) {
        setSettings(setRes.settings);
        setThreshold(String(setRes.settings.approval_threshold || 5000));
        setRequireApproval(!!setRes.settings.require_approval_above_threshold);
        setAutoApproveStaff(!!setRes.settings.auto_approve_staff_expenses);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCategoryActive = async (cat) => {
    try {
      await apiFetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: cat.is_active ? 0 : 1 })
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newNameEn.trim() || !newNameGu.trim()) return;

    try {
      await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name_en: newNameEn.trim(),
          name_gu: newNameGu.trim(),
          classification: newClassification,
          icon: newIcon,
          sort_order: parseInt(newSortOrder, 10) || 100
        })
      });
      setShowAddModal(false);
      setNewNameEn('');
      setNewNameGu('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsNotice('');
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          approval_threshold: parseFloat(threshold),
          require_approval_above_threshold: requireApproval,
          auto_approve_staff_expenses: autoApproveStaff
        })
      });
      setSettingsNotice('Settings updated successfully!');
      setTimeout(() => setSettingsNotice(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {t('nav_categories')}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'gu' ? 'ખર્ચ કેટેગરી અને મંજૂરી નીતિ નિયમો' : 'Expense Categories & Approval Policy Controls'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'gu' ? 'નવી કેટેગરી ઉમેરો' : 'Add Category'}</span>
          </button>
        )}
      </div>

      {/* Owner-Only Approval Policy Controls */}
      {isOwner && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>{lang === 'gu' ? 'મંજૂરી નીતિ અને મર્યાદા (Approval Threshold Policy)' : 'Approval Threshold & Staff Permissions Policy'}</span>
          </div>

          {settingsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
              {settingsNotice}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'gu' ? 'સ્ટાફ ખર્ચ મંજૂરી મર્યાદા (₹)' : 'Staff Approval Threshold (₹)'}
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {lang === 'gu' ? `આ રકમ (${formatINR(threshold || 0)}) થી વધુ ખર્ચ માલિક/મેનેજર મંજૂરી માંગશે.` : `Expenses above this amount will require owner/manager approval.`}
                </span>
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>Require approval above threshold</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoApproveStaff}
                    onChange={(e) => setAutoApproveStaff(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>Auto-approve staff expenses under threshold</span>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Policy'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm flex items-center justify-between">
          <span>Configured Categories ({categories.length})</span>
          <span className="text-xs text-slate-400 font-normal">Active categories show in Quick Entry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Gujarati Name</th>
                <th className="px-4 py-3">English Name</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Status</th>
                {isOwner && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 ${!c.is_active ? 'opacity-50 bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-slate-900 text-sm">{c.name_gu}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name_en}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {c.classification.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleCategoryActive(c)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          c.is_active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-900 text-base">
              Add New Expense Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Gujarati Name (ગુજરાતી નામ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="દા.ત. મીઠાઈના બોક્સ"
                  value={newNameGu}
                  onChange={(e) => setNewNameGu(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  English Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sweet Packaging Boxes"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Accounting Classification *
                </label>
                <select
                  value={newClassification}
                  onChange={(e) => setNewClassification(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                >
                  <option value="operating_expense">Operating Expense</option>
                  <option value="purchase_inventory">Purchases / Raw Materials</option>
                  <option value="people_wages">Worker Wages / Upad</option>
                  <option value="asset_purchase">Equipment & Assets</option>
                  <option value="owner_drawing">Owner Drawing</option>
                  <option value="transfer">Internal Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesSettings;
