import React, { useRef, useEffect } from 'react';
import { useTooltip, TooltipInfo } from '@/contexts/TooltipContext';

interface TooltipTriggerProps {
  tooltip: Omit<TooltipInfo, 'id'> & { id?: string };
  children: React.ReactNode;
  showOnMount?: boolean;
  onlyFirstTime?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  tooltip,
  children,
  showOnMount = false,
  onlyFirstTime = false,
  className,
  style,
  ...props
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { 
    registerTooltip, 
    showTooltip, 
    hideTooltip, 
    isFirstTimeUser,
    hasSeenTooltip
  } = useTooltip();
  
  const tooltipId = tooltip.id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  
  // Registra il tooltip quando il componente viene montato
  useEffect(() => {
    registerTooltip({
      id: tooltipId,
      content: tooltip.content,
      position: tooltip.position,
      delay: tooltip.delay,
      persistent: tooltip.persistent
    });

    // Mostra il tooltip automaticamente se richiesto
    if (showOnMount) {
      // Se onlyFirstTime è true, mostra solo per i nuovi utenti o se non è stato visto
      if (!onlyFirstTime || (isFirstTimeUser && !hasSeenTooltip(tooltipId))) {
        setTimeout(() => {
          if (elementRef.current) {
            showTooltip(tooltipId, elementRef);
          }
        }, 500); // Ritardo breve per assicurarsi che il componente sia renderizzato
      }
    }

    return () => {
      hideTooltip(tooltipId);
    };
  }, []);

  const handleMouseEnter = () => {
    // Non mostrare il tooltip al passaggio del mouse se è configurato
    // per essere mostrato solo ai nuovi utenti e l'utente l'ha già visto
    if (onlyFirstTime && (!isFirstTimeUser || hasSeenTooltip(tooltipId))) {
      return;
    }
    
    showTooltip(tooltipId, elementRef);
  };

  const handleMouseLeave = () => {
    // Se il tooltip è persistente, lascialo visibile
    if (!tooltip.persistent) {
      hideTooltip(tooltipId);
    }
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

export { TooltipTrigger };