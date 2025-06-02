import { useQuery } from "@tanstack/react-query";

interface FlupsyMiniMapOptimizedProps {
  flupsyId: number;
  maxPositions: number;
  baskets?: any[]; // Cestelli precaricati per evitare query duplicate
  showLegend?: boolean;
  onPositionClick?: (row: string, position: number) => void;
  selectedRow?: string;
  selectedPosition?: number;
}

interface PositionInfo {
  basketId?: number;
  physicalNumber?: number;
  state?: 'active' | 'available';
  isEmpty: boolean;
}

export default function FlupsyMiniMapOptimized({ flupsyId, maxPositions, baskets: preloadedBaskets, showLegend = false, onPositionClick, selectedRow, selectedPosition }: FlupsyMiniMapOptimizedProps) {
  // Carica solo i cestelli per questo FLUPSY specifico se non sono già forniti
  const { data: basketsResponse, isLoading } = useQuery({
    queryKey: ['/api/baskets', flupsyId],
    queryFn: () => fetch(`/api/baskets?flupsyId=${flupsyId}&includeAll=true`).then(res => res.json()),
    enabled: !!flupsyId && !preloadedBaskets, // Disabilita query se cestelli già forniti
    staleTime: 0, // Nessuna cache - aggiornamento immediato per visualizzazione real-time
    refetchOnWindowFocus: true,
  });

  if (isLoading && !preloadedBaskets) {
    return <div className="text-sm text-gray-500">Caricamento mappa...</div>;
  }

  // Usa cestelli precaricati se disponibili, altrimenti usa quelli dalla query
  const baskets = preloadedBaskets || basketsResponse || [];
  
  // Debug per verificare i cestelli ricevuti
  console.log("🗺️ MINI-MAPPA Debug:", {
    flupsyId,
    preloadedBaskets: preloadedBaskets ? preloadedBaskets.length : 'non forniti',
    basketsResponse: basketsResponse ? basketsResponse.length : 'non caricati',
    finalBaskets: baskets.length,
    activeBaskets: baskets.filter((b: any) => b.state === 'active').length,
    availableBaskets: baskets.filter((b: any) => b.state === 'available').length
  });
  
  // Mostra i primi 3 cestelli per debug
  baskets.slice(0, 3).forEach((basket: any, index: number) => {
    console.log(`🗺️ Cestello ${index + 1}:`, {
      id: basket.id,
      physicalNumber: basket.physicalNumber,
      state: basket.state,
      row: basket.row,
      position: basket.position,
      currentCycleId: basket.currentCycleId
    });
  });
  
  // Calcola posizioni per riga (divide maxPositions per 2)
  const positionsPerRow = Math.ceil(maxPositions / 2);
  
  // Crea mappa delle posizioni occupate
  const getPositionInfo = (row: string, position: number): PositionInfo => {
    const basket = baskets.find((b: any) => b.row === row && b.position === position);
    
    // Debug per ogni posizione richiesta
    if (position <= 3) { // Solo per le prime 3 posizioni per non intasare i log
      console.log(`🗺️ Cerca posizione ${row}-${position}:`, {
        found: !!basket,
        basketId: basket?.id,
        physicalNumber: basket?.physicalNumber,
        state: basket?.state
      });
    }
    
    if (basket) {
      return {
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        state: basket.state,
        isEmpty: false
      };
    }
    return { isEmpty: true };
  };

  // Render singola posizione
  const renderPosition = (row: string, position: number) => {
    const posInfo = getPositionInfo(row, position);
    
    const isSelected = selectedRow === row && selectedPosition === position;
    
    const handleDoubleClick = () => {
      if (onPositionClick) {
        if (posInfo.isEmpty) {
          if (isSelected) {
            // Annulla la selezione se è già selezionata
            onPositionClick('', 0);
          } else {
            // Seleziona la posizione libera
            onPositionClick(row, position);
          }
        }
      }
    };
    
    if (posInfo.isEmpty) {
      const selectedStyle = isSelected ? 'bg-blue-200 border-blue-500 text-blue-700' : 'bg-white text-gray-400';
      return (
        <div 
          key={`${row}-${position}`}
          className={`w-8 h-6 rounded border border-gray-300 ${selectedStyle} flex items-center justify-center text-xs ${
            onPositionClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300' : ''
          } ${isSelected ? 'ring-2 ring-blue-300' : ''}`}
          title={`Posizione ${row}-${position} ${isSelected ? 'selezionata' : 'libera'}${onPositionClick ? ' (doppio click per selezionare/deselezionare)' : ''}`}
          onDoubleClick={handleDoubleClick}
        >
          {isSelected ? position : '⚪'}
        </div>
      );
    }

    const bgColor = posInfo.state === 'active' ? 'bg-green-100 border-green-400' : 'bg-yellow-100 border-yellow-400';
    const textColor = posInfo.state === 'active' ? 'text-green-700' : 'text-yellow-700';
    
    const handleOccupiedClick = () => {
      if (onPositionClick) {
        if (isSelected) {
          // Deseleziona se già selezionato
          onPositionClick('', 0);
        } else {
          // Seleziona il cestello occupato
          onPositionClick(row, position);
        }
      }
    };

    return (
      <div 
        key={`${row}-${position}`}
        className={`w-8 h-6 rounded border ${bgColor} ${textColor} flex items-center justify-center text-xs font-medium ${
          onPositionClick ? 'cursor-pointer hover:opacity-80' : ''
        } ${isSelected ? 'ring-2 ring-blue-300 bg-blue-200 border-blue-500 text-blue-700' : ''}`}
        title={`Cestello #${posInfo.physicalNumber} (${posInfo.state === 'active' ? 'Attivo' : 'Disponibile'})${onPositionClick ? ' - doppio click per selezionare/deselezionare' : ''}`}
        onDoubleClick={handleOccupiedClick}
      >
        {posInfo.physicalNumber}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {/* Riga DX - in alto */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 w-5">DX:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: positionsPerRow }, (_, i) => 
            renderPosition('DX', i + 1)
          )}
        </div>
      </div>
      
      {/* Riga SX - in basso */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 w-5">SX:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: positionsPerRow }, (_, i) => 
            renderPosition('SX', i + 1)
          )}
        </div>
      </div>
      
      {/* Legenda - versione compatta */}
      {showLegend && (
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-green-100 border border-green-400"></div>
            <span>Attivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-yellow-100 border border-yellow-400"></div>
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-white border border-gray-300"></div>
            <span>Libero</span>
          </div>
        </div>
      )}
    </div>
  );
}