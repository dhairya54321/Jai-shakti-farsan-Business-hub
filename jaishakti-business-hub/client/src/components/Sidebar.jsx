import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  BarChart3,
  Sliders,
  Users,
  ShieldCheck,
  HelpCircle,
  ShoppingBag,
  Package,
  HandCoins,
  Building2,
  ChefHat,
  BookOpen,
  Scale,
  KeyRound,
  X
} from 'lucide-react';

export function Sidebar({ currentTab, setTab, isOpen, onClose }) {
  const { role, hasPermission } = useAuth();
  const { lang, t } = useLanguage();

  const isOwnerOrManager = ['owner', 'manager'].includes(role);

  const allMainNav = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard, requiredPerm: null },
    { id: 'add_expense', label: t('nav_add_expense'), icon: PlusCircle, highlight: true, requiredPerm: 'can_add_expense' },
    { id: 'production', label: t('nav_production') || 'ઉત્પાદન અને વજન', icon: ChefHat, check: () => role === 'owner' || hasPermission('can_record_production') },
    { id: 'raw_materials', label: t('nav_raw_materials') || 'કાચો માલ & સ્ટોક', icon: Package, check: () => role === 'owner' || hasPermission('can_manage_stock') },
    { id: 'recipes', label: t('nav_recipes') || 'રેસિપી તિજોરી', icon: BookOpen, check: () => role === 'owner' || hasPermission('can_view_recipes') || hasPermission('can_manage_recipes') },
    { id: 'transactions', label: t('nav_transactions'), icon: Receipt, requiredPerm: null },
    { id: 'vendors', label: t('nav_vendors'), icon: Building2, requiredPerm: 'can_manage_vendors' },
    {
      id: 'workers',
      label: t('nav_workers'),
      icon: HandCoins,
      check: () => hasPermission('can_manage_workers') || hasPermission('can_record_attendance') || hasPermission('can_give_upad') || hasPermission('can_settle_salary')
    },
    { id: 'reports', label: t('nav_reports'), icon: BarChart3, requiredPerm: 'can_view_reports' },
    { id: 'categories', label: t('nav_categories'), icon: Sliders, requiredPerm: 'can_manage_categories' },
  ];

  const mainNav = allMainNav.filter(item => {
    if (role === 'owner') return true;
    if (item.check) return item.check();
    if (item.requiredPerm) return hasPermission(item.requiredPerm);
    return true;
  });

  const allAdminNav = [
    { id: 'users', label: t('nav_users'), icon: Users, check: () => role === 'owner' || hasPermission('can_manage_team') },
    { id: 'system', label: t('nav_system'), icon: ShieldCheck, check: () => role === 'owner' || hasPermission('can_manage_system') },
    { id: 'windows_help', label: t('nav_windows_help'), icon: HelpCircle, check: () => isOwnerOrManager },
  ];

  const adminNav = allAdminNav.filter(item => item.check());

  const futureModules = [
    { label: 'EZO Billing & POS Sales', icon: ShoppingBag },
  ];

  const handleSelect = (id) => {
    setTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <div className="font-bold text-slate-800 text-sm">
            {t('brand_name')}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Phase 1 & 2 Modules */}
          <div>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800/80">
              {lang === 'gu' ? 'દુકાન હિસાબ અને ખાતાવહી' : 'Shop Ledger & Operations'}
            </div>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      active
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : item.highlight
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : item.highlight ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Administration & Diagnostics */}
          {isOwnerOrManager && (
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Shop Administration
              </div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                        active
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Planned Future Modules (Explicitly marked as Coming in Phase 2) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Future Modules
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                Phase 2
              </span>
            </div>
            <div className="space-y-1">
              {futureModules.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 cursor-not-allowed bg-slate-50/50"
                    title={t('msg_future_module')}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-300" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] text-amber-700/60 font-medium">Soon</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 text-center">
          <div className="text-xs font-semibold text-slate-700">Jai Shakti Farsan Mart</div>
          <div className="text-[11px] text-slate-400">Phase 2 v1.1.0 • SQLite WAL</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
