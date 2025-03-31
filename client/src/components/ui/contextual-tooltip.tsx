import React, { useEffect, useState } from 'react';
import * as Portal from '@radix-ui/react-portal';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTooltip } from '@/contexts/TooltipContext';

interface PositionStyles {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  transform?: string;
}

interface ArrowStyles {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  transform?: string;
}

const ContextualTooltip: React.FC = () => {
  const { activeTooltips, hideTooltip, markTooltipAsSeen } = useTooltip();
  const [tooltipsWithPositions, setTooltipsWithPositions] = useState<Record<string, {
    content: string;
    positionStyles: PositionStyles;
    arrowStyles: ArrowStyles;
    position: 'top' | 'right' | 'bottom' | 'left';
  }>>({});

  // Calcola le posizioni dei tooltip quando cambiano
  useEffect(() => {
    const newTooltipsWithPositions: Record<string, {
      content: string;
      positionStyles: PositionStyles;
      arrowStyles: ArrowStyles;
      position: 'top' | 'right' | 'bottom' | 'left';
    }> = {};

    Object.entries(activeTooltips).forEach(([id, { content, element, position = 'top' }]) => {
      const rect = element.getBoundingClientRect();
      const tooltipWidth = 300; // Stima della larghezza del tooltip in px
      const tooltipHeight = 80; // Stima dell'altezza del tooltip in px
      const spacing = 10; // Spazio tra elemento e tooltip

      let positionStyles: PositionStyles = {};
      let arrowStyles: ArrowStyles = {};

      // Calcola la posizione in base alla preferenza
      switch (position) {
        case 'top':
          positionStyles = {
            top: `${rect.top - tooltipHeight - spacing}px`,
            left: `${rect.left + (rect.width / 2) - (tooltipWidth / 2)}px`,
          };
          arrowStyles = {
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
          };
          break;
        case 'right':
          positionStyles = {
            top: `${rect.top + (rect.height / 2) - (tooltipHeight / 2)}px`,
            left: `${rect.right + spacing}px`,
          };
          arrowStyles = {
            left: '-8px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
          };
          break;
        case 'bottom':
          positionStyles = {
            top: `${rect.bottom + spacing}px`,
            left: `${rect.left + (rect.width / 2) - (tooltipWidth / 2)}px`,
          };
          arrowStyles = {
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
          };
          break;
        case 'left':
          positionStyles = {
            top: `${rect.top + (rect.height / 2) - (tooltipHeight / 2)}px`,
            left: `${rect.left - tooltipWidth - spacing}px`,
          };
          arrowStyles = {
            right: '-8px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
          };
          break;
      }

      // Adatta la posizione se il tooltip esce dalla viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Fix orizzontale
      const left = parseFloat(positionStyles.left || '0');
      if (left < 20) {
        positionStyles.left = '20px';
      } else if (left + tooltipWidth > viewportWidth - 20) {
        positionStyles.left = `${viewportWidth - tooltipWidth - 20}px`;
      }
      
      // Fix verticale
      const top = parseFloat(positionStyles.top || '0');
      if (top < 20) {
        positionStyles.top = '20px';
      } else if (top + tooltipHeight > viewportHeight - 20) {
        positionStyles.top = `${viewportHeight - tooltipHeight - 20}px`;
      }

      newTooltipsWithPositions[id] = {
        content,
        positionStyles,
        arrowStyles,
        position,
      };
    });

    setTooltipsWithPositions(newTooltipsWithPositions);
  }, [activeTooltips]);

  const handleClose = (id: string) => {
    markTooltipAsSeen(id);
    hideTooltip(id);
  };

  return (
    <>
      {Object.entries(tooltipsWithPositions).map(([id, { content, positionStyles, arrowStyles, position }]) => (
        <Portal.Root key={id}>
          <div 
            className={cn(
              "fixed z-50 p-4 bg-white rounded-lg shadow-lg w-[300px] animate-in fade-in-50 dark:bg-slate-900 dark:text-white",
              position === 'top' && "slide-in-from-top-3",
              position === 'right' && "slide-in-from-right-3",
              position === 'bottom' && "slide-in-from-bottom-3",
              position === 'left' && "slide-in-from-left-3",
            )}
            style={positionStyles}
          >
            <div 
              className="absolute w-4 h-4 bg-white rotate-45 dark:bg-slate-900"
              style={arrowStyles}
            />
            
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Suggerimento
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => handleClose(id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Chiudi</span>
              </Button>
            </div>
            
            <div className="text-sm">{content}</div>
            
            <div className="mt-2 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs h-7"
                onClick={() => handleClose(id)}
              >
                Ho capito
              </Button>
            </div>
          </div>
        </Portal.Root>
      ))}
    </>
  );
};

export { ContextualTooltip };