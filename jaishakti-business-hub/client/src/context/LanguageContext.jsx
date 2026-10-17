import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, formatINR, formatDate } from '../translations.js';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('js_lang') || 'gu';
  });

  const toggleLanguage = async () => {
    const nextLang = lang === 'gu' ? 'en' : 'gu';
    setLang(nextLang);
    localStorage.setItem('js_lang', nextLang);

    // Sync to backend if token present
    const token = localStorage.getItem('js_token');
    if (token) {
      try {
        await fetch('/api/auth/language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: nextLang })
        });
      } catch (e) {}
    }
  };

  const setExplicitLanguage = (newLang) => {
    if (newLang === 'gu' || newLang === 'en') {
      setLang(newLang);
      localStorage.setItem('js_lang', newLang);
    }
  };

  const t = (key) => {
    const dict = translations[lang] || translations.gu;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setExplicitLanguage, t, formatINR, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
