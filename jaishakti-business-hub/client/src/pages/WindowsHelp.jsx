import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  HelpCircle,
  Monitor,
  Terminal,
  FolderTree,
  ShieldCheck,
  Wifi,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function WindowsHelp() {
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-amber-600" />
          <span>{t('nav_windows_help')}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {lang === 'gu'
            ? 'દુકાનના વિન્ડોઝ કમ્પ્યુટર પર એપ્લિકેશન ચલાવવાની સંપૂર્ણ માર્ગદર્શિકા'
            : 'Operational guide for running Jai Shakti Business Hub on the Windows shop PC'}
        </p>
      </div>

      {/* Step-by-Step Cards */}
      <div className="space-y-4">
        {/* Step 1: Copying */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
              1
            </span>
            <span>{lang === 'gu' ? 'ફોલ્ડર કોપી કરવું' : 'Copying the Application Package'}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pl-8">
            {lang === 'gu'
              ? 'પેન્ડ્રાઈવ અથવા એક્સટર્નલ એસએસડીમાંથી સંપૂર્ણ `jaishakti-business-hub-windows` ફોલ્ડરને દુકાનના કમ્પ્યુટર પર કોપી કરો (જેમ કે C:\\Users\\Shop Owner\\Documents\\Jai Shakti Business Hub). ફોલ્ડરના નામમાં સ્પેસ હોય તો પણ એપ્લિકેશન વ્યવસ્થિત ચાલશે.'
              : 'Copy the entire `jaishakti-business-hub-windows` folder to the shop PC (e.g. C:\\Users\\Shop Owner\\Documents\\Jai Shakti Business Hub). Space-containing directory paths are natively supported.'}
          </p>
        </div>

        {/* Step 2: Starting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
              2
            </span>
            <span>{lang === 'gu' ? 'એપ્લિકેશન શરૂ કરવી (Start)' : 'Starting the Application'}</span>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-2">
            <p>
              {lang === 'gu'
                ? 'ફોલ્ડરમાં આવેલ `START-JAI-SHAKTI.bat` ફાઈલ પર ડબલ ક્લિક કરો.'
                : 'Double-click `START-JAI-SHAKTI.bat` in the Windows folder.'}
            </p>
            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs flex items-center justify-between">
              <span>START-JAI-SHAKTI.bat</span>
              <span className="text-amber-400">Opens http://localhost:3000</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              {lang === 'gu'
                ? 'બ્રાઉઝર (Google Chrome અથવા Microsoft Edge) આપમેળે ખુલી જશે.'
                : 'The shop browser (Google Chrome or Microsoft Edge) will automatically open to http://localhost:3000.'}
            </p>
          </div>
        </div>

        {/* Step 3: Architecture Separation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
              3
            </span>
            <span>{lang === 'gu' ? 'ડેટા સુરક્ષા અને અપડેટ્સ' : 'Data Isolation & Safe Updates'}</span>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-2">
            <p>
              {lang === 'gu'
                ? 'લાઇવ બિઝનેસ ડેટા એપ્લિકેશન કોડથી અલગ ફોલ્ડર્સમાં સચવાય છે:'
                : 'Live business records and uploads are physically isolated from replaceable application files:'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-mono">
                <span className="font-bold text-amber-900 block">data/</span>
                <span className="text-[10px] text-amber-700">jaishakti.sqlite</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 font-mono">
                <span className="font-bold text-indigo-900 block">uploads/</span>
                <span className="text-[10px] text-indigo-700">Receipt images</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-mono">
                <span className="font-bold text-emerald-900 block">backups/</span>
                <span className="text-[10px] text-emerald-700">ZIP archives</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono">
                <span className="font-bold text-slate-900 block">logs/</span>
                <span className="text-[10px] text-slate-600">Server output</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'gu'
                ? 'જ્યારે પણ નવી સુવિધાઓ અપડેટ કરો, ત્યારે `UPDATE-JAI-SHAKTI.bat` ચલાવવાથી માત્ર `app/` અપડેટ થશે, તમારો ડેટાબેઝ સુરક્ષિત રહેશે.'
                : 'When updating the application using `UPDATE-JAI-SHAKTI.bat`, only the `app/` files are updated—your live database, uploads, and backups are never overwritten.'}
            </p>
          </div>
        </div>

        {/* Step 4: Local Network Access */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Wifi className="w-5 h-5 text-indigo-600" />
            <span>{lang === 'gu' ? 'દુકાનમાં મોબાઇલ / ટેબ્લેટ પર વાપરવું' : 'Accessing from Mobile / Tablet over Shop Wi-Fi'}</span>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-2">
            <p>
              {lang === 'gu'
                ? 'દુકાનના વાઇફાઇ (Wi-Fi) સાથે જોડાયેલા કોઈપણ મોબાઇલમાં બ્રાઉઝર ખોલીને વિન્ડોઝ પીસીનો લોકલ આઇપી એડ્રેસ નાખો:'
                : 'Any phone or tablet connected to the shop Wi-Fi network can access the system by opening the PC local IP in the phone browser:'}
            </p>
            <div className="p-2.5 bg-slate-50 rounded-xl font-mono text-xs text-indigo-950 font-bold border border-slate-200">
              http://192.168.1.XX:3000
            </div>
            <p className="text-slate-500 text-[11px]">
              {lang === 'gu'
                ? '(જો મોબાઇલ પર ન ખુલે તો વિન્ડોઝ ફાયરવોલમાં પોર્ટ ૩૦૦૦ ને પરવાનગી આપો).'
                : '(If blocked, allow Node.js / Port 3000 through the Windows Defender Firewall prompt).'}
            </p>
          </div>
        </div>

        {/* Available Batch Scripts Reference */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="font-bold text-slate-900 text-sm">
            Windows Batch Scripts Summary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-mono font-bold text-slate-900 block">START-JAI-SHAKTI.bat</span>
              <span className="text-slate-500">Starts local server and opens browser</span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-mono font-bold text-slate-900 block">STOP-JAI-SHAKTI.bat</span>
              <span className="text-slate-500">Gracefully stops running background service</span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-mono font-bold text-slate-900 block">BACKUP-DATA.bat</span>
              <span className="text-slate-500">Creates timestamped ZIP backup of DB + receipts</span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-mono font-bold text-slate-900 block">HEALTH-CHECK.bat</span>
              <span className="text-slate-500">Verifies server, SQLite DB, and directories</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WindowsHelp;
