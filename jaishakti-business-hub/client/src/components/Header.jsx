import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Mic, Globe, LogOut, Menu, Shield, User, Smartphone } from 'lucide-react';
import { RemoteAccessModal } from './RemoteAccessModal';

export function Header({ onToggleSidebar, onOpenVoice }) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const [showRemoteModal, setShowRemoteModal] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20 font-bold text-xl">
              જ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                  {t('brand_name')}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {t('shop_badge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t('brand_sub')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Voice Assistant Shortcut */}
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-xs sm:text-sm shadow-sm transition"
            title={t('btn_voice_entry')}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden md:inline">{t('btn_voice_entry')}</span>
          </button>

          {/* Bilingual Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 font-medium text-xs sm:text-sm transition"
            title="Switch Language / ભાષા બદલો"
          >
            <Globe className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-700">{t('lang_switch')}</span>
          </button>

          {/* Remote / Phone Link Shortcut */}
          <button
            onClick={() => setShowRemoteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs sm:text-sm transition shadow-2xs"
            title={lang === 'gu' ? 'મોબાઈલ અને બહારથી એક્સેસ QR કોડ' : 'Mobile Anywhere Access (4G/5G) QR Code'}
          >
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">{t('btn_open_phone_link')}</span>
          </button>

          {/* User Badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-800 leading-tight">{user.full_name}</div>
                <div className="text-amber-700 font-medium capitalize">{user.role}</div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700 transition"
            title={t('btn_logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Remote Mobile Access Modal */}
      <RemoteAccessModal
        isOpen={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
      />
    </header>
  );
}

export default Header;
