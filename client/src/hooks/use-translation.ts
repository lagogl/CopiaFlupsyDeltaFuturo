import { useState, useEffect } from 'react';
import { translations, MenuTranslations } from '../i18n/translations';

type Language = 'it' | 'en';

/**
 * Hook per la gestione delle traduzioni multilingue.
 * Supporta italiano e inglese con persistenza locale.
 */
export function useTranslation() {
  // Stato per la lingua corrente con valore di default 'it'
  const [currentLanguage, setCurrentLanguage] = useState<Language>('it');

  // Carica la lingua salvata dal localStorage all'avvio
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') as Language;
    if (savedLanguage && (savedLanguage === 'it' || savedLanguage === 'en')) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Funzione per cambiare lingua
  const changeLanguage = (language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('app-language', language);
  };

  // Funzione per ottenere le traduzioni della lingua corrente
  const getTranslations = (): MenuTranslations => {
    return translations[currentLanguage];
  };

  // Funzione di traduzione semplificata per compatibilità
  const t = (key: string, replacements: Record<string, string> = {}): string => {
    let translation = key;
    
    // Applica le sostituzioni se presenti
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(
        new RegExp(`{{${placeholder}}}`, 'g'), 
        replacements[placeholder]
      );
    });
    
    return translation;
  };

  return { 
    t, 
    currentLanguage, 
    changeLanguage, 
    translations: getTranslations() 
  };
}