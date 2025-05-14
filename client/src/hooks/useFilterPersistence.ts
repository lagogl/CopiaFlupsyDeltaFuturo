import { useState, useEffect } from 'react';

// Definizione di tipi per i filtri
export type FilterState = Record<string, any>;

/**
 * Hook personalizzato per gestire la persistenza dei filtri per pagina
 * 
 * @param pageKey Identificatore univoco della pagina
 * @param defaultFilters Valori di default per i filtri
 * @returns [filters, setFilters] - State e setter per i filtri
 */
export function useFilterPersistence(pageKey: string, defaultFilters: FilterState) {
  // Genera chiave univoca per il localStorage
  const storageKey = `app_filters_${pageKey}`;
  
  // Inizializza lo stato con i filtri salvati o default
  const [filters, setFiltersState] = useState<FilterState>(() => {
    try {
      // Tenta di caricare i filtri dal localStorage
      const savedFilters = localStorage.getItem(storageKey);
      
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (err) {
      console.error("Errore nel caricamento dei filtri salvati:", err);
    }
    
    // Se non ci sono filtri salvati o c'è un errore, usa i default
    return defaultFilters;
  });
  
  // Funzione per aggiornare i filtri
  const setFilters = (newFilters: FilterState | ((prev: FilterState) => FilterState)) => {
    setFiltersState((prevFilters) => {
      // Se newFilters è una funzione, chiamala con i filtri precedenti
      const updatedFilters = typeof newFilters === 'function' 
        ? newFilters(prevFilters) 
        : newFilters;
      
      try {
        // Salva i nuovi filtri nel localStorage
        localStorage.setItem(storageKey, JSON.stringify(updatedFilters));
      } catch (err) {
        console.error("Errore nel salvataggio dei filtri:", err);
      }
      
      return updatedFilters;
    });
  };
  
  // Effetto per reagire a eventuali cambiamenti nei filtri da altre schede
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setFiltersState(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Errore nell'aggiornamento dei filtri da un'altra scheda:", err);
        }
      }
    };
    
    // Ascolta gli eventi di modifica dello storage
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey]);
  
  return [filters, setFilters] as const;
}