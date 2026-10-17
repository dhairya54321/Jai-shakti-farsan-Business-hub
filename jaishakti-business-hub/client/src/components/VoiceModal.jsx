import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import apiFetch from '../api';
import { Mic, MicOff, Check, X, AlertCircle, Sparkles } from 'lucide-react';

export function VoiceModal({ isOpen, onClose, onApplyExtracted }) {
  const { lang, t, formatINR } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang === 'gu' ? 'gu-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
    };

    recognition.onresult = (event) => {
      let current = '';
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition notice:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Please allow microphone permissions in your browser.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [lang]);

  if (!isOpen) return null;

  const startListening = () => {
    setParsedResult(null);
    setTranscript('');
    setErrorMsg('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = lang === 'gu' ? 'gu-IN' : 'en-IN';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start retry:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
  };

  const handleParseTranscript = async (textToParse = transcript) => {
    if (!textToParse || !textToParse.trim()) {
      setErrorMsg('Please speak or type a sentence first.');
      return;
    }
    setParsing(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/voice/parse', {
        method: 'POST',
        body: JSON.stringify({ transcript: textToParse.trim() })
      });
      if (res.success && res.extracted) {
        setParsedResult(res.extracted);
      } else {
        setErrorMsg('Could not understand details. Please try again or type manually.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Parsing failed.');
    } finally {
      setParsing(false);
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyExtracted(parsedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-100 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {t('btn_voice_entry')}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'gu' ? 'ગુજરાતી / English અવાજ સહાયક' : 'Gujarati / English Speech Assistant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50/70 rounded-xl p-3 text-xs text-amber-900 border border-amber-200/50">
          <div className="font-semibold mb-1">
            {lang === 'gu' ? 'ઉદાહરણ તરીકે બોલો:' : 'Example phrases:'}
          </div>
          <p className="italic">
            {lang === 'gu'
              ? '“આજે ચા માટે ૧૫૦ રૂપિયા રોકડા આપ્યા” અથવા “તેલ ૫૦૦૦ રૂપિયા યુપીઆઈ”'
              : '“Paid 450 rupees for transport by cash” or “Raw materials 5000 UPI”'}
          </p>
        </div>

        {/* Microphone Button Area */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          {speechSupported ? (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/40 ring-4 ring-red-200'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-amber-500/30'
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          ) : (
            <div className="text-center text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              {t('msg_voice_not_supported')}
            </div>
          )}

          <div className="text-center">
            <div className="text-sm font-semibold text-slate-800">
              {isListening ? t('btn_listening') : t('btn_speak_now')}
            </div>
            <div className="text-xs text-slate-500">
              Language: {lang === 'gu' ? 'ગુજરાતી (gu-IN)' : 'English (en-IN)'}
            </div>
          </div>
        </div>

        {/* Transcript / Manual Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            {lang === 'gu' ? 'બોલેલા શબ્દો (અથવા જાતે લખો):' : 'Spoken Text (or type here):'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={lang === 'gu' ? 'અહીં બોલેલું લખાશે...' : 'Spoken words appear here...'}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button
              onClick={() => handleParseTranscript(transcript)}
              disabled={parsing || !transcript.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
            >
              {parsing ? '...' : (lang === 'gu' ? 'ઓળખો' : 'Parse')}
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Extracted Preview Card */}
        {parsedResult && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'gu' ? 'ઓળખાયેલી વિગતો:' : 'Extracted Details (Review before applying):'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block">{t('lbl_amount')}</span>
                <span className="font-bold text-slate-800 text-sm">
                  {parsedResult.amount ? formatINR(parsedResult.amount) : '—'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block">{t('lbl_payment_method')}</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {parsedResult.payment_method || '—'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100 col-span-2">
                <span className="text-slate-500 block">{t('lbl_description')}</span>
                <span className="text-slate-800">{parsedResult.description || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            {t('btn_cancel')}
          </button>
          {parsedResult && (
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition"
            >
              {t('btn_apply_voice')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VoiceModal;
