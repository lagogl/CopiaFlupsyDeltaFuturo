import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  getOperationTypeLabel,
  getBorderThicknessByWeight,
  getBorderColorByWeight,
  formatAnimalCount,
  getBasketColorBySize,
  TARGET_SIZES,
  getTargetSizeForWeight
} from '@/lib/utils';
import { Filter, Edit, RotateCcw } from 'lucide-react';

export default function FlupsyVisualizer() {
  const [, navigate] = useLocation();
  const [showOriginalData, setShowOriginalData] = useState(false);
  const [customWeight, setCustomWeight] = useState<number | null>(5000);
  
  // Fetch baskets
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery<any[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Fetch operations
  const { data: operations, isLoading: isLoadingOperations } = useQuery<any[]>({
    queryKey: ['/api/operations'],
  });
  
  // Fetch cycles
  const { data: cycles, isLoading: isLoadingCycles } = useQuery<any[]>({
    queryKey: ['/api/cycles'],
  });
  
  // Fetch specific operation
  const { data: operationDetail, isLoading: isLoadingOperationDetail } = useQuery<any>({
    queryKey: ['/api/operations/24'],
  });
  
  // Handle basket click to navigate to cycle detail
  const handleBasketClick = (basketId: number) => {
    const basket = baskets?.find(b => b.id === basketId);
    if (basket && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    }
  };
  
  // Toggle between original and custom data
  const toggleDataSource = () => {
    setShowOriginalData(!showOriginalData);
  };
  
  // Handle weight change
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCustomWeight(isNaN(value) ? null : value);
  };
  
  if (isLoadingBaskets || isLoadingOperations || isLoadingCycles || isLoadingOperationDetail) {
    return <div className="text-center py-8">Caricamento in corso...</div>;
  }
  
  if (!baskets || !operations || !cycles || !operationDetail) {
    return <div className="text-center py-8">Nessun dato disponibile</div>;
  }
  
  // Get the target basket (basket 23 in position 3 row DX)
  const targetBasket = operationDetail.basket;
  
  if (!targetBasket) {
    return <div className="text-center py-8">Cestello target non trovato</div>;
  }
  
  // Use either original operation data or custom weight
  const averageWeight = showOriginalData ? operationDetail.averageWeight : customWeight;
  const animalsPerKg = showOriginalData ? operationDetail.animalsPerKg : (customWeight ? Math.round(1000000 / customWeight) : null);
  
  // Determine if basket has large animal size (TP-3000 or higher) based on animalsPerKg
  const isLargeSize = animalsPerKg !== null && animalsPerKg <= 32000;
  
  // Get size properties
  const targetSize = getTargetSizeForWeight(averageWeight || 0);
  const sizeCode = targetSize?.code || null;
  const borderThickness = getBorderThicknessByWeight(averageWeight);
  // Determina il colore del bordo in base al numero di animali per kg
  const borderColor = animalsPerKg !== null && animalsPerKg <= 32000 ? 'border-red-500' : 'border-slate-200';
  const bgColor = getBasketColorBySize(sizeCode);
  
  return (
    <div className="mb-8">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Test visualizzazione bordo rosso</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={toggleDataSource}
                title={showOriginalData ? "Usa peso personalizzato" : "Usa dati originali"}
              >
                {showOriginalData ? <Edit className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Cestello ID {targetBasket.id} nella posizione {targetBasket.position}, fila {targetBasket.row}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="text-sm mb-4 space-y-2 w-full">
              {!showOriginalData && (
                <div className="mb-4">
                  <label htmlFor="customWeight" className="block text-sm font-medium mb-1">
                    Peso personalizzato (mg):
                  </label>
                  <input
                    id="customWeight"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={customWeight || ''}
                    onChange={handleWeightChange}
                    min="0"
                    max="10000"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <strong>Peso medio:</strong> {averageWeight ? `${Math.round(averageWeight)} mg` : 'N/A'}
                </div>
                <div>
                  <strong>Animali per kg:</strong> {animalsPerKg || 'N/A'}
                </div>
                <div>
                  <strong>Bordo rosso:</strong> <span className={isLargeSize ? "text-red-500 font-bold" : ""}>{isLargeSize ? 'Sì' : 'No'}</span>
                </div>
                <div>
                  <strong>Spessore bordo:</strong> {borderThickness.replace('border-', '')}
                </div>
                <div>
                  <strong>Colore bordo:</strong> <span className={isLargeSize ? "text-red-500" : "text-slate-500"}>{isLargeSize ? 'Rosso' : 'Grigio'}</span>
                </div>
                <div>
                  <strong>Taglia:</strong> {sizeCode || 'N/A'}
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      relative p-3 rounded-md h-32 w-32 flex flex-col justify-center items-center
                      cursor-pointer transition-all
                      ${bgColor} ${borderThickness} ${borderColor}
                      hover:shadow-md
                    `}
                    onClick={() => handleBasketClick(targetBasket.id)}
                  >
                    <div className="text-xs font-medium">Pos. {targetBasket.position}</div>
                    <div className="text-sm font-semibold">
                      #{targetBasket.physicalNumber}
                    </div>
                    {targetBasket.currentCycleId && (
                      <>
                        <div className="mt-2 bg-blue-100 bg-opacity-50 rounded-md px-2 py-1 text-xs">
                          Ciclo {targetBasket.currentCycleId}
                        </div>
                        {sizeCode && (
                          <div className="mt-1 font-bold text-xs">
                            {sizeCode}
                          </div>
                        )}
                        {animalsPerKg && (
                          <div className="mt-1 bg-gray-100 bg-opacity-70 rounded-full px-2 py-0.5 text-xs">
                            {formatAnimalCount(animalsPerKg, averageWeight)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">Cestello #{targetBasket.physicalNumber}</p>
                    <p>Posizione: {targetBasket.row} {targetBasket.position}</p>
                    <p>Ciclo: {targetBasket.currentCycleId} (dal {format(new Date(operationDetail.cycle.startDate), 'dd/MM/yyyy')})</p>
                    <p>Ultima operazione: {getOperationTypeLabel(operationDetail.type)}</p>
                    <p>Data: {format(new Date(operationDetail.date), 'dd/MM/yyyy')}</p>
                    <p>Animali per kg: {animalsPerKg}</p>
                    <p>Peso medio: {averageWeight} mg</p>
                    {isLargeSize && (
                      <p className="font-bold text-red-500">Taglia Grande (≥ 3000mg)</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="mt-6 text-sm text-center text-gray-500">
              <p>Il cestello mostra bordo rosso quando il numero di animali per kg è ≤ 32000 (taglia ≥ TP-3000).</p>
              <p>Modifica il peso per testare diverse visualizzazioni.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}