import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../api';
import {
  Smartphone,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Globe,
  RefreshCw,
  X,
  AlertCircle,
  ShieldCheck,
  Power
} from 'lucide-react';

export function RemoteAccessModal({ isOpen, onClose }) {
  const { lang, t } = useLanguage();
  const { role } = useAuth();

  const [tunnel, setTunnel] = useState({
    status: 'loading',
    url: null,
    available: true,
    error: null
  });
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTunnelStatus = async () => {
    try {
      const data = await apiFetch('/api/system/tunnel');
      setTunnel(data);
    } catch (err) {
      console.warn('Failed to fetch tunnel status:', err);
      setTunnel(prev => ({ ...prev, status: 'error', error: err.message }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTunnelStatus();
    }
  }, [isOpen]);

  // Poll while starting until connected
  useEffect(() => {
    if (!isOpen) return;
    if (tunnel.status === 'starting' || tunnel.status === 'loading') {
      const timer = setInterval(() => {
        fetchTunnelStatus();
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [isOpen, tunnel.status]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!tunnel.url) return;
    navigator.clipboard.writeText(tunnel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!tunnel.url) return;
    const msg = `*Jai Shakti Business Hub* - Remote Mobile Link:\n${tunnel.url}\n\n(Open this on your phone from anywhere)`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleStartTunnel = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/system/tunnel/start', { method: 'POST' });
      await fetchTunnelStatus();
    } catch (err) {
      alert(err.message || 'Failed to start tunnel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setActionLoading(true);
    try {
      await apiFetch('/api/system/tunnel/stop', { method: 'POST' });
      await fetchTunnelStatus();
    } catch (err) {
      alert(err.message || 'Failed to stop tunnel');
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = role === 'owner' || role === 'manager';
  const qrUrl = tunnel.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tunnel.url)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {t('lbl_remote_access')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('lbl_remote_access_sub')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Area */}
        {tunnel.status === 'connected' && tunnel.url ? (
          <div className="space-y-4">
            {/* Status Pill */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  {lang === 'gu' ? 'રિમોટ એક્સેસ લાઈવ છે (સુરક્ષિત HTTPS)' : 'Remote Access Live & Ready (Secure HTTPS)'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                Cloudflare Edge
              </span>
            </div>

            {/* QR Code and Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/90">
              {/* QR Image */}
              <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 shrink-0">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Scan to open on phone"
                    className="w-36 h-36 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                    <QrCode className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* Instructions and Share */}
              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-900">
                  {t('lbl_scan_phone_qr')}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {lang === 'gu'
                    ? 'તમારા મોબાઈલ કેમેરાથી આ ક્યૂઆર કોડ સ્કેન કરો અથવા નીચે આપેલા વોટ્સએપ બટનથી લિંક તમારા ફોનમાં મોકલો.'
                    : 'Point your phone camera at this QR code to open directly, or share the link to your WhatsApp.'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Share</span>
                  </button>
                  <a
                    href={tunnel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open in Tab</span>
                  </a>
                </div>
              </div>
            </div>

            {/* URL Display Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">
                {lang === 'gu' ? 'તમારું સુરક્ષિત વેબ સરનામું (Mobile URL):' : 'Your Secure Mobile Web URL:'}
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-300/80 font-mono text-xs">
                <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="flex-1 truncate select-all text-slate-800 font-semibold">
                  {tunnel.url}
                </span>
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-300'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t('lbl_copied') : t('btn_copy_link')}</span>
                </button>
              </div>
            </div>

            {/* How to add to Home Screen like an app */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>
                  {lang === 'gu' ? '💡 ફોનની હોમ સ્ક્રીન પર એપની જેમ ઉમેરો:' : '💡 Add to Phone Home Screen (Like an App):'}
                </span>
              </div>
              <ul className="text-[11px] text-amber-900 space-y-1 list-disc list-inside">
                <li>
                  <strong className="font-semibold">iPhone / Safari:</strong>{' '}
                  {lang === 'gu'
                    ? 'શેર બટન (Share icon) દબાવી "Add to Home Screen" પસંદ કરો.'
                    : 'Tap the Share icon (box with arrow up) ➔ tap "Add to Home Screen".'}
                </li>
                <li>
                  <strong className="font-semibold">Android / Chrome:</strong>{' '}
                  {lang === 'gu'
                    ? 'ઉપર જમણી બાજુ 3 ટપકાં (Menu) દબાવી "Add to Home screen" પસંદ કરો.'
                    : 'Tap 3 dots (top right menu) ➔ tap "Add to Home screen" / "Install app".'}
                </li>
              </ul>
            </div>
          </div>
        ) : tunnel.status === 'starting' || tunnel.status === 'loading' ? (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {t('lbl_tunnel_starting')}
              </p>
              <p className="text-xs text-slate-500">
                {lang === 'gu'
                  ? 'Cloudflare સાથે સિક્યોર કનેક્શન જોડાઈ રહ્યું છે (લગભગ 5-10 સેકન્ડ લાગશે)...'
                  : 'Establishing secure Cloudflare tunnel to Mumbai edge (takes ~5-10 seconds)...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {t('lbl_tunnel_offline')}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {lang === 'gu'
                  ? 'જ્યારે તમારું Mac mini ચાલુ હોય ત્યારે તમે દુકાન બહારથી ગમે ત્યાં તમારા મોબાઈલ પર હબ વાપરવા માટે આ લિંક શરૂ કરી શકો છો.'
                  : 'Start remote access to use Jai Shakti Business Hub on your mobile device from outside the shop over 4G/5G.'}
              </p>
            </div>

            {isOwner && (
              <button
                onClick={handleStartTunnel}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>{actionLoading ? 'Starting...' : t('btn_start_tunnel')}</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="text-[11px] text-slate-400">
            {lang === 'gu' ? 'મેક મિની ચાલુ રહેશે ત્યાં સુધી લિંક સક્રિય રહેશે' : 'Accessible anywhere while Mac mini is powered on'}
          </div>

          <div className="flex items-center gap-2">
            {tunnel.status === 'connected' && isOwner && (
              <button
                onClick={handleStartTunnel}
                disabled={actionLoading}
                title="Restart tunnel"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>{t('btn_restart_tunnel')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition"
            >
              {lang === 'gu' ? 'બંધ કરો' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RemoteAccessModal;
