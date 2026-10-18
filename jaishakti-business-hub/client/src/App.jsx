import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import VoiceModal from './components/VoiceModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import CategoriesSettings from './pages/CategoriesSettings';
import UsersPage from './pages/UsersPage';
import SystemHealth from './pages/SystemHealth';
import WindowsHelp from './pages/WindowsHelp';
import Vendors from './pages/Vendors';

import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  BarChart3,
  Building2,
  RefreshCw
} from 'lucide-react';

export function App() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [prefilledVoiceValues, setPrefilledVoiceValues] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-amber-800 font-bold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
          <span>Jai Shakti Business Hub...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleApplyVoice = (extracted) => {
    setPrefilledVoiceValues(extracted);
    setCurrentTab('add_expense');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenVoice={() => setVoiceModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setTab={setCurrentTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'add_expense' && (
            <AddExpense
              onSaved={() => setCurrentTab('dashboard')}
              initialValues={prefilledVoiceValues}
              onOpenVoice={() => setVoiceModalOpen(true)}
            />
          )}

          {currentTab === 'transactions' && (
            <Transactions onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'vendors' && (
            <Vendors />
          )}

          {currentTab === 'reports' && (
            <Reports />
          )}

          {currentTab === 'categories' && (
            <CategoriesSettings />
          )}

          {currentTab === 'users' && (
            <UsersPage />
          )}

          {currentTab === 'system' && (
            <SystemHealth />
          )}

          {currentTab === 'windows_help' && (
            <WindowsHelp />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 z-30 flex items-center justify-around h-16 px-1 shadow-lg">
        {[
          { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
          { id: 'add_expense', label: t('btn_quick_entry'), icon: PlusCircle, isMain: true },
          { id: 'transactions', label: t('nav_transactions'), icon: Receipt },
          { id: 'vendors', label: t('nav_vendors'), icon: Building2 },
          { id: 'reports', label: t('nav_reports'), icon: BarChart3 },
        ].map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center w-16 py-1 transition ${
                item.isMain
                  ? 'text-amber-600 font-bold -mt-3'
                  : active
                  ? 'text-amber-700 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl ${item.isMain ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : ''}`}>
                <Icon className={item.isMain ? 'w-6 h-6' : 'w-5 h-5'} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Voice Assistant Modal */}
      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onApplyExtracted={handleApplyVoice}
      />
    </div>
  );
}

export default App;
