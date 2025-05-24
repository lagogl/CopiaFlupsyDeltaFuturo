import { useState, useEffect } from 'react';

/**
 * Hook semplificato per le traduzioni.
 * In una fase successiva potrebbe essere ampliato per supportare più lingue.
 */
export function useTranslation() {
  // Funzione di traduzione semplificata che restituisce il testo originale
  // In futuro potrebbe gestire un vero sistema di traduzione multilingua
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

  return { t };
}