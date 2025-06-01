import { useQuery } from "@tanstack/react-query";

interface FlupsyMiniMapProps {
  flupsyId: number;
  showLegend?: boolean;
}

interface PositionInfo {
  basketId?: number;
  physicalNumber?: number;
  state?: 'active' | 'available';
  isEmpty: boolean;
}

export default function FlupsyMiniMap({ flupsyId, showLegend = false }: FlupsyMiniMapProps) {
  // Carica i cestelli per questo FLUPSY
  const { data: baskets = [], isLoading } = useQuery({
    queryKey: ['/api/baskets', flupsyId],
    queryFn: () => fetch(`/api/baskets?flupsyId=${flupsyId}&includeAll=true`).then(res => res.json()),
    enabled: !!flupsyId
  });

  // Carica i dati del FLUPSY per ottenere maxPositions
  const { data: flupsy } = useQuery({
    queryKey: ['/api/flupsys', flupsyId],
    queryFn: () => fetch(`/api/flupsys/${flupsyId}`).then(res => res.json()),
    enabled: !!flupsyId
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Caricamento mappa...</div>;
  }

  if (!flupsy || !baskets) {
    return <div className="text-sm text-gray-500">Nessun dato disponibile</div>;
  }

  const maxPositions = flupsy.maxPositions || 10;
  // Calcola posizioni per riga (divide maxPositions per 2)
  const positionsPerRow = Math.ceil(maxPositions / 2);
  
  // Crea mappa delle posizioni occupate
  const getPositionInfo = (row: string, position: number): PositionInfo => {
    const basket = baskets.find((b: any) => b.row === row && b.position === position);
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
    
    if (posInfo.isEmpty) {
      return (
        <div 
          key={`${row}-${position}`}
          className="w-8 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400"
          title={`Posizione ${row}-${position} libera`}
        >
          ⚪
        </div>
      );
    }

    const bgColor = posInfo.state === 'active' ? 'bg-green-100 border-green-400' : 'bg-yellow-100 border-yellow-400';
    const textColor = posInfo.state === 'active' ? 'text-green-700' : 'text-yellow-700';
    const emoji = posInfo.state === 'active' ? '🟢' : '🟡';

    return (
      <div 
        key={`${row}-${position}`}
        className={`w-8 h-6 rounded border ${bgColor} ${textColor} flex items-center justify-center text-xs font-medium`}
        title={`Cestello #${posInfo.physicalNumber} (${posInfo.state === 'active' ? 'Attivo' : 'Disponibile'})`}
      >
        {posInfo.physicalNumber}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Riga SX */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 w-6">SX:</span>
        <div className="flex gap-1">
          {Array.from({ length: positionsPerRow }, (_, i) => 
            renderPosition('SX', i + 1)
          )}
        </div>
      </div>
      
      {/* Riga DX */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 w-6">DX:</span>
        <div className="flex gap-1">
          {Array.from({ length: positionsPerRow }, (_, i) => 
            renderPosition('DX', i + 1)
          )}
        </div>
      </div>
      
      {/* Legenda - mostra solo se richiesta */}
      {showLegend && (
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-400"></div>
            <span>Attivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400"></div>
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-white border border-gray-300"></div>
            <span>Libero</span>
          </div>
        </div>
      )}
    </div>
  );
}