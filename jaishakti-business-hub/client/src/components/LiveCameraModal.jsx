import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, FlipHorizontal, Zap, ZapOff, X, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function LiveCameraModal({ isOpen, onClose, onCapture, title }) {
  const { lang } = useLanguage();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Stop all active tracks
  const stopStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
      } catch (_) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setHasTorch(false);
    setTorchOn(false);
  };

  // Start media stream
  const startCamera = async (mode = facingMode) => {
    stopStream();
    setCameraError(null);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        lang === 'gu'
          ? 'આ બ્રાઉઝરમાં લાઇવ કૅમેરા સપોર્ટેડ નથી. કૃપા કરીને ફોટો લાઇબ્રેરી અથવા ફાઇલ પસંદ કરો.'
          : 'Live camera stream is not supported in this browser. Please use Photo Library or File Upload.'
      );
      return;
    }

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play caught:', playErr);
        }
      }

      setStreamActive(true);

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMsg = lang === 'gu'
        ? 'કૅમેરા ખોલવામાં નિષ્ફળતા. કૃપા કરીને બ્રાઉઝર પરમિશન ચકાસો અથવા ફોટો લાઇબ્રેરીમાંથી પસંદ કરો.'
        : 'Could not access camera. Please check camera permissions or select a photo from your library.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = lang === 'gu'
          ? 'કૅમેરાની પરવાનગી નકારી દેવામાં આવી છે. તમારા ફોન સેટિંગ્સમાં Safari / Chrome કૅમેરા પરવાનગી ચાલુ કરો, અથવા ફોટો લાઇબ્રેરી પસંદ કરો.'
          : 'Camera permission was denied. Please allow Camera access in your device/browser Settings, or choose from Photo Library.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = lang === 'gu'
          ? 'આ ઉપકરણ પર કોઈ કૅમેરો મળ્યો નથી.'
          : 'No camera hardware found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = lang === 'gu'
          ? 'કૅમેરા અન્ય કોઈ ઍપ દ્વારા વપરાય રહ્યો છે. અન્ય ઍપ્સ બંધ કરી ફરી પ્રયાસ કરો.'
          : 'Camera is currently locked by another application or process. Please close background camera apps and retry.';
      }

      setCameraError(errorMsg);
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Could not toggle torch:', e);
      }
    }
  };

  // Switch between back & front cameras
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture snapshot from current video frame
  const takeSnapshot = () => {
    if (!videoRef.current || !streamActive || capturing) return;

    setCapturing(true);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCapturing(false);
            setCameraError(
              lang === 'gu' ? 'ફોટો કેપ્ચર કરવામાં નિષ્ફળ.' : 'Failed to capture snapshot.'
            );
            return;
          }

          const file = new File([blob], `bill-scan-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Stop camera and return file
          stopStream();
          setCapturing(false);
          onCapture(file);
          onClose();
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error('Snapshot capture error:', err);
      setCapturing(false);
      setCameraError(lang === 'gu' ? 'ફોટો કેપ્ચર કરવામાં ભૂલ આવી.' : 'Error capturing photo.');
    }
  };

  // Fallback gallery selection
  const handleFallbackFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      stopStream();
      onCapture(file);
      onClose();
      e.target.value = '';
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Handle visibility change (tab hidden/resumed)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopStream();
      } else if (isOpen) {
        startCamera(facingMode);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-fade-in">
      {/* Hidden canvas for snapshot rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden fallback file input */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        onChange={handleFallbackFile}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
          opacity: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Fullscreen Camera Container */}
      <div className="relative w-full h-full max-w-xl mx-auto flex flex-col justify-between overflow-hidden">
        {/* Shutter White Flash Animation */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-40 animate-pulse pointer-events-none" />
        )}

        {/* TOP BAR */}
        <div className="relative z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent text-white">
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition active:scale-95"
            aria-label="Close Camera"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-xs sm:text-sm font-bold tracking-wide drop-shadow block">
              {title || (lang === 'gu' ? '📸 લાઇવ બિલ સ્કેનર' : '📸 Live Bill Camera')}
            </span>
            <span className="text-[10px] text-amber-300 font-medium">
              {lang === 'gu' ? 'બિલ ચોરસ ફ્રેમમાં રાખી ફોટો પાડો' : 'Keep bill inside frame & snap'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition active:scale-95 ${
                  torchOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/50' : 'bg-black/50 text-white hover:bg-white/20'
                }`}
                title="Toggle Torch/Flash"
              >
                {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={switchCamera}
              className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition active:scale-95"
              title="Switch Camera (Front/Back)"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MIDDLE VIEWPORT */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              streamActive && !cameraError ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* DOCUMENT GUIDE OVERLAY (If stream is active) */}
          {streamActive && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-10">
              <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

                {/* Center subtle crosshair / text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                    {lang === 'gu' ? 'બિલ અહીં ગોઠવો' : 'Align Bill Here'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ERROR OR CAMERA DENIED STATE */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 bg-slate-900/95 z-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <CameraOff className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-sm font-bold text-white">
                  {lang === 'gu' ? 'કૅમેરા ઉપલબ્ધ નથી' : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cameraError}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5 w-full max-w-xs">
                {/* Fallback Photo Library */}
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{lang === 'gu' ? '🖼️ ફોટો લાઇબ્રેરીમાંથી પસંદ કરો' : '🖼️ Pick from Photo Library'}</span>
                </button>

                {/* Retry Camera */}
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 border border-white/20 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'gu' ? 'ફરી પ્રયાસ કરો' : 'Try Camera Again'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="relative z-30 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around">
          {/* Gallery / Photo Library Fallback Button */}
          <button
            type="button"
            onClick={() => fallbackInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition"
            title="Pick from Gallery"
          >
            <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10">
              <ImageIcon className="w-5 h-5 text-amber-300" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">
              {lang === 'gu' ? 'ગેલેરી' : 'Photos'}
            </span>
          </button>

          {/* MAIN BIG SHUTTER BUTTON */}
          <button
            type="button"
            disabled={!streamActive || Boolean(cameraError) || capturing}
            onClick={takeSnapshot}
            className={`relative p-1 rounded-full border-4 border-white transition active:scale-90 ${
              !streamActive || Boolean(cameraError) || capturing
                ? 'opacity-40 pointer-events-none'
                : 'hover:scale-105 shadow-xl shadow-amber-500/20'
            }`}
            aria-label="Capture Bill"
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-inner">
              <div className="w-13 h-13 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </button>

          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={switchCamera}
            disabled={!streamActive || Boolean(cameraError)}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition disabled:opacity-40"
            title="Flip Camera"
          >
            <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10">
              <FlipHorizontal className="w-5 h-5 text-slate-200" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">
              {lang === 'gu' ? 'ફ્લિપ' : 'Flip'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiveCameraModal;
