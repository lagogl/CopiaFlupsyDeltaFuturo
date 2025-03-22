import { useState } from 'react';
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
import { getOperationTypeLabel } from '@/lib/utils';
import { Filter } from 'lucide-react';

export default function FlupsyVisualizer() {
  const [, navigate] = useLocation();
  
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
  
  // Handle basket click to navigate to cycle detail
  const handleBasketClick = (basketId: number) => {
    const basket = baskets?.find(b => b.id === basketId);
    if (basket && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    }
  };
  
  if (isLoadingBaskets || isLoadingOperations || isLoadingCycles) {
    return <div className="text-center py-8">Caricamento in corso...</div>;
  }
  
  if (!baskets || !operations || !cycles) {
    return <div className="text-center py-8">Nessun dato disponibile</div>;
  }
  
  // Get all baskets with position 3 in row DX
  const position3DxBaskets = baskets.filter(b => b.position === 3 && b.row === "DX");
  // Find basket with id 23
  const targetBasket = position3DxBaskets.find(b => b.id === 23);
  
  if (!targetBasket) {
    return <div className="text-center py-8">Cestello target non trovato</div>;
  }
  
  // Get the latest operation for this basket
  const basketOperations = operations.filter(op => op.basketId === targetBasket.id);
  const sortedOperations = [...basketOperations].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
  
  // Get the current cycle
  const cycle = cycles.find(c => c.id === targetBasket.currentCycleId);
  
  // Calculate average weight
  const averageWeight = latestOperation?.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : null;
  
  // Determine if border should be red (TP-3000 or higher)
  const isLargeSize = averageWeight !== null && averageWeight >= 3000;
  
  return (
    <div className="mb-8">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Test visualizzazione bordo rosso</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Cestello ID {targetBasket.id} nella posizione {targetBasket.position}, fila {targetBasket.row}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="text-sm mb-4">
              <strong>Peso medio:</strong> {averageWeight ? `${Math.round(averageWeight)} mg` : 'N/A'}
              <br />
              <strong>Animali per kg:</strong> {latestOperation?.animalsPerKg || 'N/A'}
              <br />
              <strong>Applicazione bordo rosso:</strong> {isLargeSize ? 'Sì' : 'No'}
            </div>
            
            <div 
              style={{
                width: "150px",
                height: "150px",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                padding: "12px",
                textAlign: "center",
                cursor: "pointer",
                borderWidth: "6px",
                borderStyle: "solid",
                borderColor: isLargeSize ? "#ef4444" : "#e2e8f0",
              }}
              onClick={() => handleBasketClick(targetBasket.id)}
            >
              <div>Pos. {targetBasket.position}</div>
              <div className="font-semibold mt-2">
                #{targetBasket.physicalNumber}
                {targetBasket.currentCycleId && (
                  <>
                    <div className="mt-2 bg-blue-100 rounded px-1">
                      Ciclo {targetBasket.currentCycleId}
                    </div>
                    {averageWeight && (
                      <div className="mt-2 font-bold">
                        {averageWeight >= 3000 ? 'TP-3000+' : 'Taglia inferiore'}
                      </div>
                    )}
                    {latestOperation?.animalsPerKg && (
                      <div className="mt-2 bg-gray-100 rounded-full px-1 text-xs">
                        ~{Math.round(1000000 / (latestOperation.animalsPerKg * 1000))} animali
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}