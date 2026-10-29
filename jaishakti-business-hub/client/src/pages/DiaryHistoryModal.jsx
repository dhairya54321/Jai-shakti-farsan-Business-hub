import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import {
  X,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Trash2,
  Plus,
  Calendar,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Check,
  Upload
} from 'lucide-react';

export function DiaryHistoryModal({ isOpen, onClose, worker, onScansUpdated }) {
  const { lang, t, formatDate } = useLanguage();

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Zoom / Lightbox State
  const [activePhoto, setActivePhoto] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Upload modal / trigger state
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadPageNo, setUploadPageNo] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchScans = async () => {
    if (!worker?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/workers/${worker.id}/diary-scans`);
      if (res.success) {
        setScans(res.scans || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load diary scans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && worker?.id) {
      fetchScans();
      setActivePhoto(null);
      setZoomLevel(1);
      setRotation(0);
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadPageNo('');
      setUploadNotes('');
    }
  }, [isOpen, worker?.id]);

  if (!isOpen) return null;

  const handleOpenPhoto = (scan) => {
    setActivePhoto(scan);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleClosePhoto = () => {
    setActivePhoto(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => { setZoomLevel(1); setRotation(0); };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDeleteScan = async (scanId, e) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'gu' ? 'શું તમે આ ચોપડાનો ફોટો ડિલીટ કરવા માંગો છો?' : 'Are you sure you want to delete this scanned diary photo?')) {
      return;
    }
    try {
      await apiFetch(`/api/workers/${worker.id}/diary-scans/${scanId}`, { method: 'DELETE' });
      setScans(prev => prev.filter(s => s.id !== scanId));
      if (activePhoto?.id === scanId) {
        setActivePhoto(null);
      }
      if (onScansUpdated) onScansUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete photo.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert(lang === 'gu' ? 'કૃપા કરીને ફોટો પસંદ કરો.' : 'Please select an image file.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadPageNo) formData.append('diary_page', uploadPageNo);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const res = await apiFetch(`/api/workers/${worker.id}/diary-scans`, {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        setScans(res.scans || []);
        setShowUploadForm(false);
        setUploadFile(null);
        setUploadPageNo('');
        setUploadNotes('');
        if (onScansUpdated) onScansUpdated();
      }
    } catch (err) {
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-purple-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {lang === 'gu' ? 'જૂના ચોપડાના અસલ ફોટા (સ્કેન આર્કાઇવ)' : 'History of Scanned Diary Photos'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[11px] font-bold border border-purple-400/30">
                  {scans.length} {lang === 'gu' ? 'પાના' : 'Pages'}
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                {worker?.name} • {lang === 'gu' ? 'હાથથી લખેલી અસલ ચિઠ્ઠી / ચોપડો' : 'Original handwritten diary photo records'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 border border-purple-400/40 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'gu' ? 'નવો ફોટો ઉમેરો' : 'Add Photo'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Drawer / Form (Collapsible) */}
        {showUploadForm && (
          <form onSubmit={handleUploadSubmit} className="p-4 sm:p-5 bg-purple-50/70 border-b border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shrink-0">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'gu' ? 'ચોપડાના પાનાનો ફોટો પસંદ કરો' : 'Select Diary Photo'} *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                required
              />
            </div>

            <div className="w-full sm:w-28">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'gu' ? 'પાના નં.' : 'Page No.'}
              </label>
              <input
                type="text"
                placeholder="e.g. 15"
                value={uploadPageNo}
                onChange={(e) => setUploadPageNo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'gu' ? 'નોંધ / વિગત' : 'Notes / Period'}
              </label>
              <input
                type="text"
                placeholder={lang === 'gu' ? 'દા.ત. ડિસેમ્બર ઉપાડ હિસાબ' : 'e.g. Dec advance record'}
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {uploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'gu' ? 'અપલોડ' : 'Upload'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
              >
                {lang === 'gu' ? 'રદ' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">{lang === 'gu' ? 'ચોપડાના ફોટા લોડ થઈ રહ્યા છે...' : 'Loading scanned diary photos...'}</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-50 text-purple-500 flex items-center justify-center">
                <Camera className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-700 text-base">
                {lang === 'gu' ? 'કોઈ સ્કેન કરેલ ફોટા મળ્યા નથી' : 'No Scanned Diary Photos Yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === 'gu'
                  ? 'ચોપડો સ્કેન (Scan Diary) કરતી વખતે પાનાનો ફોટો આપમેળે અહીં સેવ થશે, અથવા ઉપર આપેલા બટનથી સીધો ફોટો ઉમેરી શકો છો.'
                  : 'Scanned diary photos will automatically appear here when scanned, or you can upload one manually.'}
              </p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'gu' ? 'ચોપડાનો ફોટો અપલોડ કરો' : 'Upload First Photo'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>{lang === 'gu' ? 'મોટો ફોટો જોવા અથવા વાંચવા માટે ફોટો પર ક્લિક કરો (ટેપ-ટુ-ઝૂમ)' : 'Click any photo to open full-screen high-res zoom viewer'}</span>
                <span className="font-semibold text-purple-700">🔍 Tap to Zoom</span>
              </div>

              {/* Photo Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scans.map((scan, idx) => (
                  <div
                    key={scan.id || idx}
                    onClick={() => handleOpenPhoto(scan)}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-purple-400 overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col"
                  >
                    {/* Image Preview Box with Zoom Overlay */}
                    <div className="relative h-60 bg-slate-900/90 overflow-hidden flex items-center justify-center">
                      <img
                        src={scan.file_path}
                        alt={scan.notes || `Diary Page ${scan.diary_page}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                        <span className="text-[11px] font-bold flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                          <ZoomIn className="w-3.5 h-3.5 text-purple-300" />
                          <span>{lang === 'gu' ? 'મોટું કરો' : 'Tap to Zoom'}</span>
                        </span>
                        <button
                          onClick={(e) => handleDeleteScan(scan.id, e)}
                          className="w-7 h-7 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center transition"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Page Badge */}
                      {scan.diary_page && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-purple-700/90 text-white font-black text-xs shadow-md backdrop-blur-md border border-purple-400/40">
                          {lang === 'gu' ? `પાના નં. ${scan.diary_page}` : `Page ${scan.diary_page}`}
                        </div>
                      )}
                    </div>

                    {/* Card Meta Info */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-white">
                      <div>
                        <div className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                          {scan.notes || (scan.diary_page ? `ચોપડા પાના નં. ${scan.diary_page}` : scan.original_name)}
                        </div>
                        {scan.original_name && scan.notes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                            {scan.original_name}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{scan.created_at ? formatDate(scan.created_at.slice(0, 10)) : ''}</span>
                        </span>
                        <span className="text-purple-700 font-bold hover:underline flex items-center gap-1">
                          <span>{lang === 'gu' ? 'વિસ્તૃત જુઓ' : 'Inspect'}</span>
                          <ZoomIn className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {lang === 'gu' ? 'દાદાના જૂના ચોપડાનો પાકો હિસાબી પુરાવો' : 'Permanent digital proof of handwritten physical diary'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            {lang === 'gu' ? 'બંધ કરો' : 'Close'}
          </button>
        </div>
      </div>

      {/* FULL-SCREEN / LIGHTBOX ZOOM VIEWER MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-3 sm:p-6 backdrop-blur-md">
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between text-white shrink-0 bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-3">
              {activePhoto.diary_page && (
                <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-black text-xs shadow-xs">
                  {lang === 'gu' ? `પાના નં. ${activePhoto.diary_page}` : `Page ${activePhoto.diary_page}`}
                </span>
              )}
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {activePhoto.notes || worker?.name}
                </h4>
                <p className="text-[11px] text-slate-300">
                  {activePhoto.original_name || 'Handwritten Diary Page'}
                </p>
              </div>
            </div>

            {/* Interactive Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <a
                href={activePhoto.file_path}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                title="Open original / Download"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={handleClosePhoto}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition ml-2"
                title="Close Viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Pan / Zoom Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center my-3 relative select-none">
            <div
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
                transformOrigin: 'center center'
              }}
              className="max-w-full max-h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <img
                src={activePhoto.file_path}
                alt={activePhoto.notes || 'Diary zoom'}
                className="max-h-[82vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="text-center text-[11px] text-slate-400 shrink-0">
            {lang === 'gu'
              ? 'ઝૂમ કરવા માટે ઉપર આપેલા બટનોનો ઉપયોગ કરો • ઝૂમ લેવલ: ' + Math.round(zoomLevel * 100) + '%'
              : 'Use toolbar buttons above to zoom in / rotate • Zoom: ' + Math.round(zoomLevel * 100) + '%'}
          </div>
        </div>
      )}
    </div>
  );
}

export default DiaryHistoryModal;
