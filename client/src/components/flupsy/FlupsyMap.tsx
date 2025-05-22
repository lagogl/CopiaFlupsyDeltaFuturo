import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import FlupsyBasketRenderer from './FlupsyBasketRenderer';

const FlupsyMap = ({ 
  flupsy,
  baskets = [],
  operations = [],
  cycles = [],
  sizes = [],
  onBasketClick,
  showDetails = true,
  simulateDate = null,
  simulateSizeTarget = null,
  simulatedBaskets = null,
}) => {
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [renderedBaskets, setRenderedBaskets] = useState([]);
  
  // Log per debugging
  useEffect(() => {
    console.log("FlupsyMap - Cestelli ricevuti:", baskets);
    console.log("FlupsyMap - FLUPSY:", flupsy);
    setRenderedBaskets(baskets);
  }, [baskets, flupsy]);
  
  const flupsyMaxPositions = useMemo(() => {
    return flupsy?.maxPositions || 10;
  }, [flupsy]);

  const getBasketsForRow = (row) => {
    if (!baskets || baskets.length === 0) {
      console.log("FlupsyMap - Nessun cestello da filtrare");
      return [];
    }
    const result = baskets.filter(b => b && b.row === row && b.flupsyId === flupsy?.id);
    console.log(`FlupsyMap - Cestelli per fila ${row}:`, result);
    return result;
  };

  const getFlupsyBasketByPosition = (row, position) => {
    if (!baskets || baskets.length === 0) {
      return null;
    }
    try {
      const basket = baskets.find(b => 
        b && b.row === row && 
        b.position === position && 
        b.flupsyId === flupsy?.id
      );
      if (basket) {
        console.log(`FlupsyMap - Trovato cestello in posizione ${row}-${position}:`, basket);
      }
      return basket;
    } catch (error) {
      console.error("FlupsyMap - Errore nel trovare cestello per posizione:", error);
      return null;
    }
  };

  // Se ci sono cestelli simulati, preferiscili a quelli originali
  const renderBasket = (row, position) => {
    try {
      console.log(`FlupsyMap - Rendering cestello ${row}-${position}`);
      const originalBasket = getFlupsyBasketByPosition(row, position);
      
      if (simulatedBaskets) {
        const simulatedBasket = simulatedBaskets.find(b => 
          b && b.row === row && 
          b.position === position && 
          b.flupsyId === flupsy?.id
        );
        
        if (simulatedBasket) {
          return (
            <FlupsyBasketRenderer 
              key={`${row}-${position}-simulated`}
              basket={simulatedBasket}
              operations={operations}
              cycles={cycles}
              sizes={sizes}
              onClick={onBasketClick}
              simulateDate={simulateDate}
              simulateSizeTarget={simulateSizeTarget}
            />
          );
        }
      }
      
      if (originalBasket) {
        return (
          <FlupsyBasketRenderer 
            key={`${row}-${position}-original`}
            basket={originalBasket}
            operations={operations}
            cycles={cycles}
            sizes={sizes}
            onClick={onBasketClick}
            simulateDate={simulateDate}
            simulateSizeTarget={simulateSizeTarget}
          />
        );
      }
      
      // Posizione vuota - versione più robusta
      return (
        <div 
          key={`${row}-${position}-empty`}
          className="border border-dashed border-gray-300 rounded-md p-2 text-center min-h-[90px] flex items-center justify-center text-gray-400 text-xs"
          onMouseEnter={() => setHoveredPosition(`${row}-${position}`)}
          onMouseLeave={() => setHoveredPosition(null)}
        >
          {hoveredPosition === `${row}-${position}` ? 'Aggiungi cestello' : `Vuoto (${row}-${position})`}
        </div>
      );
    } catch (error) {
      console.error(`FlupsyMap - Errore nel renderizzare cestello ${row}-${position}:`, error);
      // Fallback in caso di errore
      return (
        <div 
          key={`${row}-${position}-error`}
          className="border-2 border-red-300 bg-red-50 rounded-md p-2 text-center min-h-[90px] flex items-center justify-center text-red-400 text-xs"
        >
          Errore
        </div>
      );
    }
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="bg-gray-50/70 border-b px-4 py-3">
        <CardTitle className="text-base font-medium flex items-center">
          {flupsy?.name}
          
          {flupsy?.active === false && (
            <Badge variant="outline" className="ml-2 text-gray-500">Inattivo</Badge>
          )}
          
          {flupsy?.productionCenter && (
            <Badge variant="secondary" className="ml-2">{flupsy.productionCenter}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        {flupsy?.description && (
          <p className="text-sm text-gray-600 mb-4">{flupsy.description}</p>
        )}
        
        <div className="space-y-4">
          {/* SX row (Left row) */}
          <div>
            <div className="flex items-center mb-1">
              <Badge variant="secondary" className="mr-2">Fila SX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                return (
                  <div key={`sx-${position}`}>
                    {renderBasket('SX', position)}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* DX row (Right row) */}
          <div>
            <div className="flex items-center mb-1">
              <Badge variant="secondary" className="mr-2">Fila DX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                return (
                  <div key={`dx-${position}`}>
                    {renderBasket('DX', position)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlupsyMap;