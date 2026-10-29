import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  Lock,
  Unlock,
  KeyRound,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ZoomIn,
  X,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Flame,
  ChefHat,
  Scale,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

export function RecipeVault({ onStartBatch }) {
  const { role, hasPermission } = useAuth();
  const { lang, t } = useLanguage();

  const isOwner = role === 'owner';
  const canManage = isOwner || hasPermission('can_manage_recipes');

  // Vault PIN Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Recipes & Materials State
  const [recipes, setRecipes] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState('');

  // Inactivity auto-lock timer (5 minutes = 300,000 ms)
  const timerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsUnlocked(false);
      setPin('');
      setPinError('Auto-locked due to 5 minutes of inactivity.');
    }, 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      resetInactivityTimer();
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      const handleActivity = () => resetInactivityTimer();
      events.forEach(e => window.addEventListener(e, handleActivity));

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        events.forEach(e => window.removeEventListener(e, handleActivity));
      };
    }
  }, [isUnlocked, resetInactivityTimer]);

  // Load recipes and raw materials once unlocked
  const loadData = async () => {
    setLoading(true);
    try {
      const [recipesRes, materialsRes] = await Promise.all([
        apiFetch('/api/manufacturing/recipes'),
        apiFetch('/api/manufacturing/materials')
      ]);
      if (recipesRes.success) {
        setRecipes(recipesRes.recipes);
        if (recipesRes.recipes.length > 0 && !selectedRecipe) {
          // Fetch full details of the first recipe
          loadRecipeDetails(recipesRes.recipes[0].id);
        }
      }
      if (materialsRes.success) {
        setRawMaterials(materialsRes.materials);
      }
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeDetails = async (id) => {
    try {
      const res = await apiFetch(`/api/manufacturing/recipes/${id}`);
      if (res.success) {
        setSelectedRecipe(res.recipe);
      }
    } catch (err) {
      console.error('Failed to load recipe detail:', err);
    }
  };

  const handleVerifyPin = async (pinToTest = pin) => {
    const cleanPin = String(pinToTest || '').trim();
    if (!cleanPin || cleanPin.length !== 4) {
      setPinError('Please enter a 4-digit PIN.');
      return;
    }
    setVerifyingPin(true);
    setPinError('');
    try {
      const res = await apiFetch('/api/manufacturing/recipes/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: cleanPin })
      });
      if (res.valid) {
        setIsUnlocked(true);
        setPin('');
        loadData();
      } else {
        setPinError(t('recipe_pin_error') || 'Incorrect PIN. Try again.');
        setPin('');
      }
    } catch (err) {
      setPinError(err.message || 'Verification failed. Try again.');
      setPin('');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleKeypadPress = (val) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        handleVerifyPin(newPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  // Physical Desktop Keyboard listener for PIN entry
  useEffect(() => {
    if (isUnlocked) return;

    const handleKeyDown = (e) => {
      // Don't intercept if an input modal or search is focused
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin(prev => {
          if (prev.length < 4) {
            const next = prev + e.key;
            if (next.length === 4) {
              handleVerifyPin(next);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
        setPinError('');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPin('');
        setPinError('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          handleVerifyPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, pin]);

  const handleLockVault = () => {
    setIsUnlocked(false);
    setPin('');
    setSelectedRecipe(null);
  };

  const handleDeleteRecipe = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove recipe "${name}"?`)) return;
    try {
      await apiFetch(`/api/manufacturing/recipes/${id}`, { method: 'DELETE' });
      setRecipes(recipes.filter(r => r.id !== id));
      if (selectedRecipe && selectedRecipe.id === id) {
        setSelectedRecipe(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete recipe.');
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchEn = r.name_en?.toLowerCase().includes(term);
      const matchGu = r.name_gu?.toLowerCase().includes(term);
      return matchEn || matchGu;
    }
    return true;
  });

  // ==========================================
  // RENDER: PIN SECURITY LOCK SCREEN
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-6 sm:my-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-amber-200/80 p-6 sm:p-8 text-center">
          {/* Lock Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 mb-5 shadow-inner">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {t('recipe_vault_title') || 'રેસિપી તિજોરી'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6 leading-relaxed">
            {t('recipe_vault_sub') || 'Secret Farsan & Sweet Formulas'}
          </p>

          {/* PIN Dots Display */}
          <div className="flex items-center justify-center gap-4 my-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-amber-600 border-amber-600 scale-110 shadow-sm shadow-amber-600/30'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <div className="p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Touch-Friendly Kitchen Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(String(num))}
                disabled={verifyingPin}
                className="h-14 sm:h-16 rounded-2xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 active:scale-95 text-xl sm:text-2xl font-bold text-slate-800 border border-slate-200 hover:border-amber-400 transition-all shadow-sm flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPin(''); setPinError(''); }}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs font-bold text-slate-500 border border-slate-200 transition-all flex items-center justify-center uppercase tracking-wider"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={verifyingPin}
              className="h-14 sm:h-16 rounded-2xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 active:scale-95 text-xl sm:text-2xl font-bold text-slate-800 border border-slate-200 hover:border-amber-400 transition-all shadow-sm flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-sm font-bold text-slate-700 border border-slate-200 transition-all flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* Unlock Button */}
          <button
            type="button"
            onClick={() => handleVerifyPin(pin)}
            disabled={pin.length !== 4 || verifyingPin}
            className={`w-full max-w-xs mx-auto py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 mb-4 transition-all shadow-md active:scale-98 ${
              pin.length === 4 && !verifyingPin
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 cursor-pointer animate-pulse'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {verifyingPin ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-500" />
                <span>{t('btn_unlock_vault') || 'Unlock Recipe Vault (તિજોરી ખોલો)'}</span>
              </span>
            )}
          </button>

          <div className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
            <div>⌨️ Type on keyboard or tap keypad • Default PIN: <strong className="text-amber-700">1984</strong></div>
            <div className="text-slate-400 text-[10px]">🔒 {t('recipe_pin_sub') || 'Auto-locks on tab switch or after 5 minutes of inactivity'}</div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: UNLOCKED RECIPE VAULT
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/40 text-amber-100 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1 border border-amber-400/30">
              <KeyRound className="w-3 h-3" /> PIN Verified • Secret Vault
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('recipe_vault_title') || 'રેસિપી તિજોરી'}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 max-w-xl">
            {t('recipe_vault_sub') || 'Authentic Farsan & Sweet Blueprints with Scalable Batch Ratios'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={() => { setEditingRecipe(null); setIsFormModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-amber-800 font-bold text-xs sm:text-sm hover:bg-amber-50 transition shadow-md shadow-black/10 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>{t('btn_add_recipe') || 'નવી રેસિપી'}</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setIsChangePinOpen(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/40 text-white hover:bg-amber-500/60 font-semibold text-xs transition border border-amber-400/40"
              title="Change PIN"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Change PIN</span>
            </button>
          )}

          <button
            onClick={handleLockVault}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/25 text-amber-100 hover:text-white hover:bg-black/40 font-semibold text-xs transition border border-white/10"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
            <span>{t('btn_lock_vault') || 'લૉક'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Recipe List on Left, Selected Profile on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipes Directory */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipe (ભાખરવડી, ચેવડો, ગાંઠિયા)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: 'all', label: 'All Recipes' },
                { id: 'daily_farsan', label: 'Daily Farsan' },
                { id: 'festive_sweet', label: 'Festive Sweets' },
                { id: 'namkeen', label: 'Namkeen' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedCategory === cat.id
                      ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipes Cards List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Loading secret recipe vault...
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No recipes found matching your search.</p>
              </div>
            ) : (
              filteredRecipes.map((r) => {
                const isSelected = selectedRecipe && selectedRecipe.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => loadRecipeDetails(r.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-1 ring-amber-400'
                        : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Photo Thumbnail or Icon */}
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-amber-200">
                        {r.photo_url ? (
                          <img src={r.photo_url} alt={r.name_en} className="w-full h-full object-cover" />
                        ) : (
                          <ChefHat className="w-6 h-6 text-amber-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {r.name_gu}
                          </h4>
                          {r.is_frequent === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                              Daily
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {r.name_en}
                        </p>
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Base: {r.base_batch_size} Kg • {r.ingredient_count || 0} Ingredients
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition ${isSelected ? 'text-amber-600 translate-x-1' : 'text-slate-300'}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Recipe Profile & Blueprint */}
        <div className="lg:col-span-7">
          {selectedRecipe ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Recipe Card Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-amber-50/40 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      {selectedRecipe.category === 'festive_sweet' ? 'Festive Special' : 'Farsan Formula'}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                      {selectedRecipe.name_gu}
                    </h2>
                    <p className="text-sm text-slate-600 font-medium">
                      {selectedRecipe.name_en}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2">
                    {onStartBatch && (
                      <button
                        onClick={() => onStartBatch(selectedRecipe)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm active:scale-95"
                      >
                        <Scale className="w-4 h-4" />
                        <span>Start Batch (ઉત્પાદન)</span>
                      </button>
                    )}

                    {canManage && (
                      <>
                        <button
                          onClick={() => { setEditingRecipe(selectedRecipe); setIsFormModalOpen(true); }}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition"
                          title="Edit Recipe"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(selectedRecipe.id, selectedRecipe.name_en)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700 transition"
                          title="Delete Recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Info Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Standard Batch Size</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedRecipe.base_batch_size} Kg</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Preparation Time</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedRecipe.prep_time_minutes || 60} Mins</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Ingredients Count</span>
                    <span className="font-bold text-slate-800 text-sm">{(selectedRecipe.ingredients || []).length} Items</span>
                  </div>
                </div>
              </div>

              {/* Original Handwritten Recipe Card Photo Section */}
              {selectedRecipe.photo_url && (
                <div className="p-6 border-b border-slate-100 bg-amber-50/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      {t('lbl_handwritten_card') || 'ઓરિજિનલ હાથથી લખેલી રેસિપી ચિઠ્ઠી'}
                    </h3>
                    <span className="text-[11px] text-amber-700 font-medium">
                      {t('lbl_tap_to_zoom') || 'Tap to Zoom'}
                    </span>
                  </div>

                  <div
                    onClick={() => { setZoomedPhotoUrl(selectedRecipe.photo_url); setIsPhotoZoomOpen(true); }}
                    className="relative rounded-2xl overflow-hidden border-2 border-amber-200/80 shadow-md group cursor-pointer max-h-56 bg-slate-900"
                  >
                    <img
                      src={selectedRecipe.photo_url}
                      alt="Handwritten Recipe Card"
                      className="w-full h-56 object-cover object-center group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs backdrop-blur-xs">
                      <ZoomIn className="w-5 h-5" /> Tap to Zoom Fullscreen
                    </div>
                  </div>
                </div>
              )}

              {/* Chef Notes & Secret Instructions */}
              {selectedRecipe.chef_notes && (
                <div className="p-6 border-b border-slate-100 bg-amber-50/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-2">
                    <Flame className="w-4 h-4 text-amber-600" />
                    {t('lbl_chef_notes') || 'રસોઈ નોંધ અને તળવાનું તાપમાન'}
                  </h3>
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-sm">
                    {selectedRecipe.chef_notes}
                  </div>
                </div>
              )}

              {/* Scalable Ingredient Blueprint Table */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    {t('lbl_ingredients_blueprint') || 'ઘટકોનું માપ પત્રક'}
                    <span className="text-slate-400 font-normal lowercase">
                      (for {selectedRecipe.base_batch_size} kg batch)
                    </span>
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Ingredient</th>
                        <th className="py-2.5 px-4 font-semibold">Quantity</th>
                        <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Current Stock</th>
                        <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedRecipe.ingredients || []).map((ing, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{ing.material_name_gu}</div>
                            <div className="text-[11px] text-slate-500">{ing.material_name_en}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-amber-900 text-sm">
                              {ing.quantity >= 1 ? `${ing.quantity} Kg` : `${Math.round(ing.quantity * 1000)} g`}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                              {ing.formatted_stock || `${ing.current_stock} Kg`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 hidden md:table-cell">
                            {ing.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-600" />
              <p className="text-sm font-medium">Select a recipe from the left to inspect its secret blueprint.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT RECIPE BLUEPRINT        */}
      {/* ========================================== */}
      {isFormModalOpen && (
        <RecipeFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          editingRecipe={editingRecipe}
          rawMaterials={rawMaterials}
          onSaved={(saved) => {
            setIsFormModalOpen(false);
            loadData();
            setSelectedRecipe(saved);
          }}
        />
      )}

      {/* ========================================== */}
      {/* MODAL: FULLSCREEN PHOTO ZOOM INSPECTOR     */}
      {/* ========================================== */}
      {isPhotoZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsPhotoZoomOpen(false)}
        >
          <button
            onClick={() => setIsPhotoZoomOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedPhotoUrl}
            alt="Handwritten Recipe Card Fullscreen"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CHANGE 4-DIGIT SECRET PIN          */}
      {/* ========================================== */}
      {isChangePinOpen && (
        <ChangePinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
        />
      )}
    </div>
  );
}

// Subcomponent: Add / Edit Recipe Form Modal
function RecipeFormModal({ isOpen, onClose, editingRecipe, rawMaterials, onSaved }) {
  const { t } = useLanguage();
  const [nameEn, setNameEn] = useState(editingRecipe?.name_en || '');
  const [nameGu, setNameGu] = useState(editingRecipe?.name_gu || '');
  const [category, setCategory] = useState(editingRecipe?.category || 'daily_farsan');
  const [baseBatchSize, setBaseBatchSize] = useState(editingRecipe?.base_batch_size || 10);
  const [prepTime, setPrepTime] = useState(editingRecipe?.prep_time_minutes || 60);
  const [chefNotes, setChefNotes] = useState(editingRecipe?.chef_notes || '');
  const [isFrequent, setIsFrequent] = useState(editingRecipe?.is_frequent === 1 || editingRecipe?.is_frequent === true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(editingRecipe?.photo_url || null);
  const [ingredients, setIngredients] = useState(
    editingRecipe?.ingredients?.map(ing => ({
      raw_material_id: ing.raw_material_id,
      quantity: ing.quantity,
      unit: ing.unit || 'kg',
      notes: ing.notes || ''
    })) || [
      { raw_material_id: rawMaterials[0]?.id || '', quantity: 1.0, unit: 'kg', notes: '' }
    ]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddIngredientRow = () => {
    setIngredients([
      ...ingredients,
      { raw_material_id: rawMaterials[0]?.id || '', quantity: 0.5, unit: 'kg', notes: '' }
    ]);
  };

  const handleRemoveIngredientRow = (idx) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx, field, val) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], [field]: val };
    setIngredients(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameGu.trim()) {
      setError('Please provide names in both English and Gujarati.');
      return;
    }
    if (ingredients.length === 0) {
      setError('At least one ingredient is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name_en', nameEn.trim());
      formData.append('name_gu', nameGu.trim());
      formData.append('category', category);
      formData.append('base_batch_size', String(baseBatchSize));
      formData.append('prep_time_minutes', String(prepTime));
      formData.append('chef_notes', chefNotes);
      formData.append('is_frequent', isFrequent ? '1' : '0');
      formData.append('ingredients', JSON.stringify(ingredients));

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const url = editingRecipe
        ? `/api/manufacturing/recipes/${editingRecipe.id}`
        : '/api/manufacturing/recipes';

      const res = await apiFetch(url, {
        method: editingRecipe ? 'PUT' : 'POST',
        body: formData
      });

      if (res.success) {
        onSaved(res.recipe);
      } else {
        setError(res.error || 'Failed to save recipe.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving recipe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-600 text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-bold text-base sm:text-lg">
              {editingRecipe ? 'Edit Recipe Blueprint' : 'Add New Recipe Blueprint'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Name (Gujarati) *
              </label>
              <input
                type="text"
                required
                placeholder="દા.ત. ભાખરવડી, નાયલોન ખમણ"
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bhakharwadi, Nylon Khaman"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Category & Batch Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="daily_farsan">Daily Farsan (રોજિંદુ ફરસાણ)</option>
                <option value="festive_sweet">Festive Sweet (તહેવાર મીઠાઈ)</option>
                <option value="dry_snack">Dry Snack (સૂકો નાસ્તો)</option>
                <option value="namkeen">Namkeen (નમકીન / સેવ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Batch Size (Kg) *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={baseBatchSize}
                onChange={(e) => setBaseBatchSize(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prep Time (Minutes)</label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Frequent Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFrequent"
              checked={isFrequent}
              onChange={(e) => setIsFrequent(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
            />
            <label htmlFor="isFrequent" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Frequent Daily Item (Show in quick-select tiles for kitchen chef)
            </label>
          </div>

          {/* Photo Upload for Handwritten Recipe Card */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Handwritten Recipe Card Photo (હસ્તલિખિત ચિઠ્ઠી ફોટો)
            </label>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-amber-300 flex-shrink-0 bg-slate-900">
                  <img src={photoPreview} alt="Recipe Card Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
                >
                  {photoPreview ? 'Change Photo' : 'Upload Recipe Card Photo'}
                </button>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload crisp handwritten card photo for archival & kitchen reference.
                </p>
              </div>
            </div>
          </div>

          {/* Chef Notes & Frying Secrets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chef's Preparation Notes & Frying Secrets
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Frying temperature (160°C), soaking time, resting dough, signature spices..."
              value={chefNotes}
              onChange={(e) => setChefNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Ingredients Blueprint Builder */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Ingredients Blueprint (ઘટકોનું પ્રમાણ)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Exact weights required for base {baseBatchSize} Kg batch
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold border border-amber-200 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={ing.raw_material_id}
                      onChange={(e) => handleIngredientChange(idx, 'raw_material_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {rawMaterials.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name_gu} ({rm.name_en})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      required
                      placeholder="Qty (Kg)"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-amber-900 bg-white"
                    />
                  </div>
                  <div className="w-28 hidden sm:block">
                    <input
                      type="text"
                      placeholder="Note (e.g. Fine)"
                      value={ing.notes}
                      onChange={(e) => handleIngredientChange(idx, 'notes', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredientRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Change PIN Modal
function ChangePinModal({ isOpen, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await apiFetch('/api/manufacturing/recipes/change-pin', {
        method: 'POST',
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin })
      });
      if (res.success) {
        setSuccess('Recipe Vault PIN updated successfully!');
        setTimeout(onClose, 1200);
      } else {
        setError(res.error || 'Failed to update PIN.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-800">Change Recipe PIN</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
        {success && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Current 4-Digit PIN</label>
            <input
              type="password"
              maxLength="4"
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center text-lg font-mono tracking-widest"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">New 4-Digit PIN</label>
            <input
              type="password"
              maxLength="4"
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center text-lg font-mono tracking-widest"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Confirm New PIN</label>
            <input
              type="password"
              maxLength="4"
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-center text-lg font-mono tracking-widest"
            />
          </div>
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-sm"
            >
              {saving ? 'Updating...' : 'Update PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecipeVault;
