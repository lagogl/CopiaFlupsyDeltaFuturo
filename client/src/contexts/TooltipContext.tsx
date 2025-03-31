import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interfaccia per definire le proprietà di un tooltip
export interface TooltipInfo {
  id: string;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  persistent?: boolean; // Se true, il tooltip rimarrà visibile fino a quando l'utente non lo chiude
}

// Interfaccia per il contesto
interface TooltipContextType {
  showTooltip: (id: string, elementRef: React.RefObject<HTMLElement>, content?: string) => void;
  hideTooltip: (id: string) => void;
  hideAllTooltips: () => void;
  registerTooltip: (tooltipInfo: TooltipInfo) => void;
  isTooltipVisible: (id: string) => boolean;
  activeTooltips: Record<string, { content: string; element: HTMLElement; position?: 'top' | 'right' | 'bottom' | 'left'; }>;
  isFirstTimeUser: boolean;
  setFirstTimeUser: (value: boolean) => void;
  disableAllTooltips: () => void;
  enableAllTooltips: () => void;
  areTooltipsEnabled: boolean;
  markTooltipAsSeen: (id: string) => void;
  hasSeenTooltip: (id: string) => boolean;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [activeTooltips, setActiveTooltips] = useState<Record<string, { 
    content: string; 
    element: HTMLElement; 
    position?: 'top' | 'right' | 'bottom' | 'left';
  }>>({});
  
  const [tooltips, setTooltips] = useState<Record<string, TooltipInfo>>({});
  const [isFirstTimeUser, setFirstTimeUser] = useState<boolean>(false);
  const [areTooltipsEnabled, setAreTooltipsEnabled] = useState<boolean>(true);
  const [seenTooltips, setSeenTooltips] = useState<string[]>([]);

  // Effetto per caricare le preferenze dell'utente dal localStorage
  useEffect(() => {
    const checkFirstTimeUser = () => {
      const visited = localStorage.getItem('flupsy-app-visited');
      if (!visited) {
        localStorage.setItem('flupsy-app-visited', 'true');
        setFirstTimeUser(true);
        return true;
      }
      return false;
    };

    const loadTooltipPreferences = () => {
      const tooltipsEnabled = localStorage.getItem('flupsy-tooltips-enabled');
      if (tooltipsEnabled === 'false') {
        setAreTooltipsEnabled(false);
      }

      const seen = localStorage.getItem('flupsy-seen-tooltips');
      if (seen) {
        try {
          setSeenTooltips(JSON.parse(seen));
        } catch (e) {
          console.error('Errore nel parsing dei tooltip visualizzati:', e);
          setSeenTooltips([]);
        }
      }
    };

    const isFirstTime = checkFirstTimeUser();
    loadTooltipPreferences();

    // Se è un nuovo utente, possiamo mostrare automaticamente il tutorial o i tooltip principali
    if (isFirstTime) {
      // Logica per mostrare i tooltip introduttivi 
      // (implementata attraverso le pagine specifiche)
    }
  }, []);

  // Salva le preferenze quando cambiano
  useEffect(() => {
    localStorage.setItem('flupsy-tooltips-enabled', areTooltipsEnabled.toString());
  }, [areTooltipsEnabled]);

  // Salva i tooltip visti
  useEffect(() => {
    localStorage.setItem('flupsy-seen-tooltips', JSON.stringify(seenTooltips));
  }, [seenTooltips]);

  const registerTooltip = (tooltipInfo: TooltipInfo) => {
    setTooltips(prev => ({
      ...prev,
      [tooltipInfo.id]: tooltipInfo
    }));
  };

  const showTooltip = (id: string, elementRef: React.RefObject<HTMLElement>, content?: string) => {
    if (!areTooltipsEnabled) return;
    
    if (elementRef.current) {
      const tooltipContent = content || tooltips[id]?.content || 'Tooltip informativo';
      const position = tooltips[id]?.position || 'top';
      
      setActiveTooltips(prev => ({
        ...prev,
        [id]: {
          content: tooltipContent,
          element: elementRef.current!,
          position
        }
      }));

      // Se il tooltip ha un delay, lo nascondiamo dopo il tempo specificato
      if (tooltips[id]?.delay && !tooltips[id]?.persistent) {
        setTimeout(() => {
          hideTooltip(id);
        }, tooltips[id].delay);
      }
    }
  };

  const hideTooltip = (id: string) => {
    setActiveTooltips(prev => {
      const newTooltips = { ...prev };
      delete newTooltips[id];
      return newTooltips;
    });
  };

  const hideAllTooltips = () => {
    setActiveTooltips({});
  };

  const isTooltipVisible = (id: string) => {
    return id in activeTooltips;
  };

  const disableAllTooltips = () => {
    setAreTooltipsEnabled(false);
    hideAllTooltips();
  };

  const enableAllTooltips = () => {
    setAreTooltipsEnabled(true);
  };

  const markTooltipAsSeen = (id: string) => {
    if (!seenTooltips.includes(id)) {
      setSeenTooltips(prev => [...prev, id]);
    }
  };

  const hasSeenTooltip = (id: string) => {
    return seenTooltips.includes(id);
  };

  return (
    <TooltipContext.Provider 
      value={{ 
        showTooltip, 
        hideTooltip, 
        hideAllTooltips, 
        registerTooltip,
        isTooltipVisible,
        activeTooltips,
        isFirstTimeUser,
        setFirstTimeUser,
        disableAllTooltips,
        enableAllTooltips,
        areTooltipsEnabled,
        markTooltipAsSeen,
        hasSeenTooltip
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltip deve essere usato all\'interno di un TooltipProvider');
  }
  return context;
};