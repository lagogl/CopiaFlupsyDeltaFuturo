import React from 'react';
import { format } from 'date-fns';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// Definizione dei tipi
interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  cycleCode?: string | null;
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: string;
}

interface Operation {
  id: number;
  basketId: number;
  date: string;
  type: string;
  animalCount?: number | null;
  animalsPerKg?: number | null;
  averageWeight?: number | null;
  sizeId?: number | null;
}

interface Size {
  id: number;
  code: string;
  name: string;
  color?: string;
}

interface Props {
  basket: Basket | null;
  cycle?: Cycle | null;
  operation?: Operation | null;
  size?: Size | null;
  width: string;
  height: string;
  onClick?: (basketId: number) => void;
}

// Helper per determinare la colorazione corretta della cella
const getBasketColor = (size: Size | null | undefined, isActive: boolean) => {
  if (!isActive) {
    return 'bg-gray-50 border-gray-200';
  }

  // Se non c'è una taglia definita o il codice è nullo, usiamo un colore predefinito
  if (!size || !size.code) {
    return 'bg-blue-50 border-blue-300';
  }
  
  // Utilizziamo le classi Tailwind predefinite invece di classi personalizzate
  // per garantire maggiore compatibilità
  if (size.color && !size.color.startsWith('[')) {
    // Se esiste un colore custom già formattato correttamente nella definizione della taglia
    return size.color;
  } else if (size.color) {
    // Gestione colori definiti come valori esadecimali
    const colorName = size.color.replace(/\[|\]/g, '').replace('#', '');
    return `bg-gray-50 border-gray-300`;  // Fallback sicuro
  }
  
  // Colorazioni basate sul codice taglia
  if (size.code.startsWith('TP-')) {
    const sizeNum = parseInt(size.code.replace('TP-', '')) || 0;
    
    if (sizeNum <= 500) {
      return 'bg-purple-50 border-purple-300';
    } else if (sizeNum <= 1000) {
      return 'bg-pink-50 border-pink-300';
    } else if (sizeNum <= 2000) {
      return 'bg-rose-50 border-rose-300';
    } else if (sizeNum <= 3000) {
      return 'bg-red-50 border-red-300';
    } else if (sizeNum <= 4000) {
      return 'bg-orange-50 border-orange-300';
    } else if (sizeNum <= 5000) {
      return 'bg-amber-50 border-amber-300';
    } else if (sizeNum <= 6000) {
      return 'bg-yellow-50 border-yellow-300';
    } else if (sizeNum <= 7000) {
      return 'bg-lime-50 border-lime-300';
    } else if (sizeNum <= 8000) {
      return 'bg-green-50 border-green-300';
    } else {
      return 'bg-emerald-50 border-emerald-300';
    }
  } else if (size.code.startsWith('T')) {
    // Per taglie tipo T1, T2, T3...
    const sizeNum = parseInt(size.code.replace('T', '')) || 0;
    
    switch (sizeNum) {
      case 1: return 'bg-blue-50 border-blue-300';
      case 2: return 'bg-cyan-50 border-cyan-300';
      case 3: return 'bg-teal-50 border-teal-300';
      case 4: return 'bg-green-50 border-green-300';
      case 5: return 'bg-lime-50 border-lime-300';
      case 6: return 'bg-amber-50 border-amber-300';
      case 7: return 'bg-orange-50 border-orange-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  }
  
  // Default per altre taglie
  return 'bg-gray-50 border-gray-300';
};

// Componente per il tooltip ad alto contrasto
const HighContrastTooltip = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <TooltipContent className={`bg-white text-gray-900 border-2 border-gray-300 shadow-md ${className}`}>
    {children}
  </TooltipContent>
);

// Componente principale che renderizza un singolo cestello
const FlupsyBasketRenderer: React.FC<Props> = ({ 
  basket, 
  cycle, 
  operation, 
  size, 
  width, 
  height,
  onClick
}) => {
  // Se non c'è un cestello, mostriamo uno spazio vuoto
  if (!basket) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-2 rounded border-2 border-dashed border-gray-300 ${height} ${width} flex items-center justify-center text-gray-400 text-xs cursor-pointer`}
            >
              Vuoto
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            <div className="p-2 max-w-xs">
              <div className="font-medium text-gray-700 mb-1">Posizione non assegnata</div>
              <div className="text-sm text-gray-600">
                Nessun cestello presente in questa posizione.
              </div>
            </div>
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Determina se il cestello ha un ciclo attivo
  const isActive = Boolean(basket.currentCycleId);
  
  // Calcola il peso medio (in mg)
  const currentWeight = operation?.animalsPerKg && operation.animalsPerKg > 0
    ? Math.round(1000000 / operation.animalsPerKg)
    : operation?.averageWeight || null;
  
  // Ottieni il colore appropriato in base alla taglia
  const colorClass = getBasketColor(size, isActive);
  
  // Se è un cestello con ciclo attivo ma senza operazioni
  if (isActive && cycle && !operation) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-2 rounded border-2 border-solid border-blue-300 bg-blue-50 ${height} ${width} flex flex-col items-center justify-center cursor-pointer`}
              onClick={() => onClick && onClick(basket.id)}
            >
              <div className="font-medium text-sm">Cesta #{basket.physicalNumber}</div>
              <div className="text-xs text-blue-700">Ciclo attivo</div>
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            <div className="p-2 max-w-xs">
              <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
              <div className="text-sm text-gray-600">
                Ciclo attivo dal {cycle ? format(new Date(cycle.startDate), 'dd/MM/yyyy') : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Dati animali non disponibili
              </div>
            </div>
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Cestello disponibile, non attivo
  if (!isActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 ${height} ${width} flex flex-col items-center justify-center cursor-pointer`}
              onClick={() => onClick && onClick(basket.id)}
            >
              <div className="font-medium text-gray-500">Cesta #{basket.physicalNumber}</div>
              <div className="text-xs text-gray-400">Disponibile</div>
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            <div className="p-2 max-w-xs">
              <div className="font-medium text-gray-700 mb-1">Cestello #{basket.physicalNumber}</div>
              <div className="text-sm text-gray-600">
                Cestello disponibile, nessun ciclo attivo.
              </div>
            </div>
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Cestello con ciclo attivo e operazioni - renderizzazione completa
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`basket-card p-2 rounded border-2 border-solid ${colorClass} ${height} ${width} flex flex-col cursor-pointer`}
            onClick={() => onClick && onClick(basket.id)}
            data-basket-id={basket.id}
            data-basket-number={basket.physicalNumber}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="font-bold text-xs">CESTA #{basket.physicalNumber}</div>
              <div className="text-[9px] bg-white px-1 rounded border border-current">
                {size?.code || 'N/D'}
              </div>
            </div>
            
            {operation?.animalsPerKg ? (
              <div className="text-[9px] text-gray-600">
                <span className="font-medium">{operation.animalsPerKg.toLocaleString('it-IT')}/kg</span>
              </div>
            ) : (
              <div className="text-[9px] text-gray-600">
                <span className="font-medium">N/D /kg</span>
              </div>
            )}
            
            {operation?.animalCount ? (
              <div className="text-[9px] mt-auto text-gray-700">
                <span className="font-medium">{operation.animalCount.toLocaleString('it-IT')}</span> animali
              </div>
            ) : (
              <div className="text-[9px] mt-auto text-gray-700">
                <span className="font-medium">N/D</span> animali
              </div>
            )}
            
            {currentWeight ? (
              <div className="text-[9px] text-gray-700">
                <span className="font-medium">{currentWeight.toLocaleString('it-IT')} mg</span>
              </div>
            ) : (
              <div className="text-[9px] text-gray-700">
                <span className="font-medium">N/D mg</span>
              </div>
            )}
            
            {cycle && (
              <div className="text-[8px] mt-auto text-gray-500">
                Op: {operation ? format(new Date(operation.date), 'dd/MM') : format(new Date(cycle.startDate), 'dd/MM')} 
              </div>
            )}
          </div>
        </TooltipTrigger>
        <HighContrastTooltip>
          <div className="p-2 max-w-xs">
            <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              <div className="text-gray-500">Taglia:</div>
              <div>{size?.code || 'N/D'} - {size?.name || 'Non disponibile'}</div>
              
              <div className="text-gray-500">Peso medio:</div>
              <div>{currentWeight ? `${currentWeight.toLocaleString('it-IT')} mg` : 'N/D'}</div>
              
              <div className="text-gray-500">Animali/kg:</div>
              <div>{operation?.animalsPerKg?.toLocaleString('it-IT') || 'N/D'}</div>
              
              <div className="text-gray-500">Numero animali:</div>
              <div>{operation?.animalCount?.toLocaleString('it-IT') || 'N/D'}</div>
              
              <div className="text-gray-500">Ciclo attivo dal:</div>
              <div>{cycle ? format(new Date(cycle.startDate), 'dd/MM/yyyy') : 'N/D'}</div>
              
              <div className="text-gray-500">Ultima operazione:</div>
              <div>{operation ? format(new Date(operation.date), 'dd/MM/yyyy') : 'N/D'}</div>
            </div>
          </div>
        </HighContrastTooltip>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FlupsyBasketRenderer;