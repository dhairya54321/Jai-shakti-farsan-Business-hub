import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  Scale,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  History,
  Flame,
  ArrowRight,
  RotateCcw,
  Search,
  Sparkles,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Package,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

export function ProductionPage({ initialRecipe = null }) {
  const { user } = useAuth();
  const { lang, t, formatDate } = useLanguage();

  const [activeTab, setActiveTab] = useState('new_batch'); // 'new_batch' | 'history'
  const [recipes, setRecipes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batch Configuration Form
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRecipe?.id || '');
  const [targetWeight, setTargetWeight] = useState(50); // Default 50 kg batch
  const [chefName, setChefName] = useState('Sailesh Bhai (મુખ્ય રસોઈયા)');
  const [batchNotes, setBatchNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Digital Weighing Sheet View State
  const [weighingSheet, setWeighingSheet] = useState(null);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load recipes, workers and batches
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [recRes, wrkRes, batRes] = await Promise.all([
        apiFetch('/api/manufacturing/recipes'),
        apiFetch('/api/workers'),
        apiFetch('/api/manufacturing/batches?limit=40')
      ]);

      if (recRes.success) {
        setRecipes(recRes.recipes || []);
        if (!selectedRecipeId && recRes.recipes?.length > 0) {
          // Default to Bhakharwadi or first frequent recipe
          const def = recRes.recipes.find(r => r.is_frequent === 1) || recRes.recipes[0];
          setSelectedRecipeId(def.id);
        }
      }

      if (wrkRes.success && wrkRes.workers) {
        setWorkers(wrkRes.workers);
        // Look for Ramesh / Sailesh Maharaj in staff
        const chef = wrkRes.workers.find(w => w.role_title === 'head_chef' || w.name.includes('રમેશ') || w.name.includes('શૈલેષ'));
        if (chef) {
          setChefName(chef.name);
        }
      }

      if (batRes.success) {
        setBatches(batRes.batches || []);
      }
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When initialRecipe prop changes from RecipeVault navigation
  useEffect(() => {
    if (initialRecipe) {
      setSelectedRecipeId(initialRecipe.id);
      setActiveTab('new_batch');
      setWeighingSheet(null);
    }
  }, [initialRecipe]);

  // Generate Digital Weighing Sheet
  const handleGenerateWeighingSheet = async (recipeIdToUse = selectedRecipeId, weightToUse = targetWeight) => {
    if (!recipeIdToUse) {
      setErrorMessage('Please select a farsan or sweet item first.');
      return;
    }
    const weightNum = Number(weightToUse);
    if (!weightNum || weightNum <= 0) {
      setErrorMessage('Please enter a valid target batch weight.');
      return;
    }

    setGeneratingSheet(true);
    setErrorMessage('');
    setBatchSuccess(null);

    try {
      const res = await apiFetch('/api/manufacturing/weighing-sheet', {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeIdToUse,
          target_weight: weightNum
        })
      });

      if (res.success && res.sheet) {
        setWeighingSheet(res.sheet);
        // Reset interactive check state
        const initialChecks = {};
        res.sheet.ingredients.forEach((ing) => {
          initialChecks[ing.raw_material_id] = false;
        });
        setCheckedIngredients(initialChecks);
      } else {
        setErrorMessage(res.error || 'Failed to calculate weighing sheet.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error calculating scale weights.');
    } finally {
      setGeneratingSheet(false);
    }
  };

  // Toggle checkbox for weighed ingredient
  const handleToggleCheck = (matId) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [matId]: !prev[matId]
    }));
  };

  // Check all ingredients as weighed
  const handleMarkAllWeighed = () => {
    if (!weighingSheet) return;
    const allDone = {};
    weighingSheet.ingredients.forEach(ing => {
      allDone[ing.raw_material_id] = true;
    });
    setCheckedIngredients(allDone);
  };

  // Confirm and Complete Batch (Deduct Stock Engine)
  const handleConfirmBatch = async () => {
    if (!weighingSheet) return;

    setSubmittingBatch(true);
    setErrorMessage('');

    try {
      const consumptionsPayload = weighingSheet.ingredients.map(ing => ({
        raw_material_id: ing.raw_material_id,
        required_quantity: ing.required_quantity,
        actual_quantity: ing.required_quantity,
        is_checked: checkedIngredients[ing.raw_material_id] ? 1 : 0
      }));

      const res = await apiFetch('/api/manufacturing/batches', {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: weighingSheet.recipe.id,
          target_weight: weighingSheet.target_weight,
          chef_name: chefName,
          notes: batchNotes,
          consumptions: consumptionsPayload
        })
      });

      if (res.success) {
        setBatchSuccess(res.batch);
        setWeighingSheet(null);
        // Refresh batch history
        const updatedBatches = await apiFetch('/api/manufacturing/batches?limit=40');
        if (updatedBatches.success) {
          setBatches(updatedBatches.batches);
        }
      } else {
        setErrorMessage(res.error || 'Failed to complete production batch.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error completing batch.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  const frequentRecipes = recipes.filter(r => r.is_frequent === 1);
  const otherRecipes = recipes.filter(r => r.is_frequent !== 1);

  const filteredOtherRecipes = otherRecipes.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return r.name_en?.toLowerCase().includes(term) || r.name_gu?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/40 text-emerald-100 text-[11px] font-bold tracking-wide uppercase border border-emerald-400/30 flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" /> Sailesh Bhai's Kitchen Terminal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('production_title') || 'ઉત્પાદન અને વજન માપ'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
            {t('production_sub') || 'Mobile Batch Entry & High-Contrast Digital Weighing Scale Sheet'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-2xl backdrop-blur-xs">
          <button
            onClick={() => { setActiveTab('new_batch'); setBatchSuccess(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'new_batch'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>New Batch (નવો બેચ)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History ({batches.length})</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER ALERT */}
      {batchSuccess && (
        <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 shadow-md flex items-start justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500 text-white flex-shrink-0 mt-0.5">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-emerald-900">
                Batch {batchSuccess.batch_number} Completed Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                Produced <strong>{batchSuccess.target_weight} Kg</strong> of <strong>{batchSuccess.product_name_gu} ({batchSuccess.product_name_en})</strong>.
                All required raw materials have been automatically deducted from inventory!
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-emerald-700">
                <span>Chef: {batchSuccess.chef_name}</span>
                <span>•</span>
                <span>Date: {formatDate(batchSuccess.production_date)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setBatchSuccess(null)}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: BATCH HISTORY                       */}
      {/* ========================================== */}
      {activeTab === 'history' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Completed Production Batches Log
            </h3>
            <span className="text-xs text-slate-500">{batches.length} total batches</span>
          </div>

          <div className="divide-y divide-slate-100">
            {batches.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No production batches recorded yet. Complete a batch above to view logs.
              </div>
            ) : (
              batches.map(batch => (
                <div key={batch.id} className="p-5 hover:bg-slate-50/80 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {batch.batch_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(batch.production_date)} {batch.created_at?.slice(11, 16)}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {batch.product_name_gu} <span className="text-slate-500 font-normal text-xs">({batch.product_name_en})</span>
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-700">{batch.target_weight} Kg</span>
                        <span className="text-[11px] text-slate-400 block font-medium">Chef: {batch.chef_name}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* Consumed Ingredients Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(batch.consumptions || []).map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                      >
                        {c.material_name_gu}: <strong>{c.actual_quantity} {c.unit}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : weighingSheet ? (
        /* ========================================== */
        /* VIEW: DIGITAL WEIGHING SHEET (HIGH CONTRAST) */
        /* ========================================== */
        <div className="space-y-4">
          {/* Top Bar of Sheet */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Live Scale Terminal
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Scale Ratio: {weighingSheet.scale_factor.toFixed(2)}x
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight mt-1">
                {weighingSheet.recipe.name_gu}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {weighingSheet.recipe.name_en} • Target Batch: <strong className="text-white text-base font-extrabold">{weighingSheet.target_weight} Kg</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeighingSheet(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change Weight / Item</span>
              </button>

              <button
                onClick={handleMarkAllWeighed}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Weighed</span>
              </button>
            </div>
          </div>

          {/* Pre-Batch Stock Sufficiency Check Banner */}
          {weighingSheet.all_in_stock ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{t('badge_sufficient_stock') || 'All raw ingredients are available in inventory! Ready for scale weighing.'}</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs sm:text-sm flex items-start gap-3 font-medium shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 font-bold">
                  ⚠️ Pre-Batch Warning: Kitchen Raw Material Stock is Low!
                </strong>
                <span>
                  Some ingredients required for this batch exceed current recorded inventory:
                </span>
                <ul className="list-disc list-inside mt-1 font-bold text-amber-900">
                  {weighingSheet.ingredients.filter(i => !i.has_sufficient_stock).map((i, idx) => (
                    <li key={idx}>
                      {i.material_name_gu}: Available {i.current_stock} Kg, Required {i.required_quantity} Kg (Shortage: {i.shortage} Kg)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Chef preparation notes if any */}
          {weighingSheet.recipe.chef_notes && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/80 text-amber-950 text-xs sm:text-sm flex items-start gap-3">
              <Flame className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold uppercase tracking-wider text-[11px] text-amber-900 mb-0.5">
                  Chef Preparation & Frying Notes
                </strong>
                <p className="whitespace-pre-wrap leading-relaxed">{weighingSheet.recipe.chef_notes}</p>
              </div>
            </div>
          )}

          {/* High-Contrast Interactive Weighing Scale Cards (Readable 2-3 feet away) */}
          <div className="space-y-3">
            {weighingSheet.ingredients.map((ing) => {
              const isChecked = checkedIngredients[ing.raw_material_id];
              return (
                <div
                  key={ing.raw_material_id}
                  onClick={() => handleToggleCheck(ing.raw_material_id)}
                  className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${
                    isChecked
                      ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                      : 'bg-white border-slate-300 hover:border-amber-400 shadow-sm'
                  }`}
                >
                  {/* Left: Ingredient Name & Stock info */}
                  <div className="flex items-center gap-4">
                    {/* Big Touch Checkbox Button */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                          : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isChecked ? <Check className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" /> : <Scale className="w-6 h-6" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isChecked ? 'text-emerald-900 line-through decoration-emerald-600 decoration-2' : 'text-slate-900'}`}>
                          {ing.material_name_gu}
                        </h3>
                        <span className="text-xs text-slate-500 font-semibold">
                          ({ing.material_name_en})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Stock: {ing.formatted_stock}</span>
                        {ing.notes && <span className="text-amber-800 font-medium">• {ing.notes}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Giant Scale Reading (Designed for 2-3 feet visibility) */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      {/* HUGE FONT NUMBER */}
                      <div className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-mono leading-none ${isChecked ? 'text-emerald-700' : 'text-amber-900'}`}>
                        {ing.large_weight_label}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Exact Weight ({ing.required_quantity} Kg)
                      </div>
                    </div>

                    <div className="sm:hidden">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold ${isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {isChecked ? 'Weighed ✓' : 'Weigh [ ]'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Card: Confirm Batch & Deduct Stock */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl sticky bottom-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Head Chef in Charge:</span>
                <span className="text-base font-extrabold text-slate-900">{chefName}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWeighingSheet(null)}
                  className="px-4 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancel / Edit
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatch}
                  disabled={submittingBatch}
                  className="px-6 sm:px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm sm:text-base transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {submittingBatch ? 'Deducting Stock...' : 'Confirm & Complete Batch (સ્ટોક બાદ કરો)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* VIEW: NEW BATCH ENTRY FORM                */
        /* ========================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Fast Item Selection (Mobile First) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Quick Frequent Farsan Items */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                    Daily Frequent Farsan (નિયમિત ફરસાણ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quick-select tiles for fast everyday production batches
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  Fast Kitchen Order
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {frequentRecipes.map(r => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 flex flex-col justify-between h-28 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          {r.name_gu?.slice(0, 2) || 'ફર'}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm truncate">
                          {r.name_gu}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {r.name_en}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Festive & Seasonal Items Search */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Festive & Seasonal Specials (તહેવાર સ્પેશિયલ)
                </h3>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search festive items (કાજુ કતરી, મઠિયા, ચોળાફળી)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredOtherRecipes.map(r => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 font-bold'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs truncate">{r.name_gu}</div>
                      <div className="text-[11px] text-slate-500 truncate">{r.name_en}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Target Weight & Scale Generator */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Selected Item
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {selectedRecipe ? selectedRecipe.name_gu : 'Select an item from left'}
                </h3>
                {selectedRecipe && (
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedRecipe.name_en} • Base batch: {selectedRecipe.base_batch_size} Kg
                  </p>
                )}
              </div>

              {/* Target Finished Weight Input with Big Number & Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Finished Weight (બનાવવાનો વજન - કિલો) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 text-2xl font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-base">
                    Kg
                  </span>
                </div>

                {/* Quick Increment Chips */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[10, 20, 25, 40, 50, 100].map(kg => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => setTargetWeight(kg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        Number(targetWeight) === kg
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {kg} Kg
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTargetWeight(prev => Number(prev || 0) + 10)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 hover:bg-amber-100"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Head Chef Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chef / Production Karigar
                </label>
                <input
                  type="text"
                  value={chefName}
                  onChange={(e) => setChefName(e.target.value)}
                  placeholder="e.g. Sailesh Bhai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Optional Batch Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Production Notes (Optional)
                </label>
                <input
                  type="text"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Extra spicy for festival rush, morning order..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Big Green Button: Generate Digital Weighing Sheet */}
              <button
                type="button"
                onClick={() => handleGenerateWeighingSheet()}
                disabled={generatingSheet || !selectedRecipeId}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-base shadow-xl shadow-emerald-700/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Scale className="w-5 h-5" />
                <span>
                  {generatingSheet ? 'Calculating Weights...' : 'Open Weighing Scale Sheet (વજન માપ પત્રક)'}
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="text-[11px] text-slate-400 text-center">
                Calculates exact ingredients, displays 2-3 ft readable numbers & runs stock check.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductionPage;
