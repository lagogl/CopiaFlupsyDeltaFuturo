import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { calculateAverageWeight } from '@/lib/utils';

export default function BasicFlupsyVisualizer() {
  const [, navigate] = useLocation();
  
  // Fetch data
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({ 
    queryKey: ['/api/flupsys'] 
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({ 
    queryKey: ['/api/baskets'] 
  });
  
  const { data: operations } = useQuery({ 
    queryKey: ['/api/operations'] 
  });
  
  if (isLoadingFlupsys || isLoadingBaskets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visualizzazione FLUPSY</CardTitle>
          <CardDescription>Caricamento in corso...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Helper function to get latest operation for a basket
  const getLatestOperation = (basketId: number) => {
    if (!operations) return null;
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    if (basketOperations.length === 0) return null;
    
    return basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };
  
  // Handle basket click
  const handleBasketClick = (basket: any) => {
    if (!basket) return;
    
    if (basket.state === 'active' && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    } else {
      navigate('/baskets');
    }
  };
  
  // Render basket cell
  const renderBasketPosition = (flupsyId: number, row: string, position: number) => {
    // Find all baskets at this position (resolve conflicts)
    const basketsAtPosition = baskets?.filter((b: any) => 
      b.flupsyId === flupsyId && 
      b.row === row && 
      b.position === position
    ) || [];
    
    // Prioritize active baskets over available ones
    const basket = basketsAtPosition.find((b: any) => b.state === 'active') || 
                  (basketsAtPosition.length > 0 ? basketsAtPosition[0] : undefined);
    
    // Get the latest operation for the basket to determine styling
    const latestOperation = basket ? getLatestOperation(basket.id) : null;
    const averageWeight = latestOperation?.animalsPerKg ? calculateAverageWeight(latestOperation.animalsPerKg) : null;
    
    // Base styling
    let borderClass = basket ? 'border' : 'border border-dashed border-slate-300';
    let bgClass = basket ? 'bg-white' : 'bg-slate-50';
    
    // Set different styles for active baskets
    if (basket && basket.state === 'active') {
      // Base styling for active baskets
      borderClass = 'border-blue-400 border-2';
      
      // Special styling for baskets with weight data
      if (latestOperation?.animalsPerKg) {
        // Clear weight info for console
        console.log(`Basket #${basket.physicalNumber} at position ${row}-${position} has weight data: ${latestOperation.animalsPerKg} animals/kg (${Math.round(averageWeight || 0)} mg)`);
        
        // Make active baskets with weight data stand out
        if (averageWeight && averageWeight >= 3000) {
          borderClass = 'border-red-500 border-4';
          bgClass = 'bg-red-50';
        } else if (averageWeight && averageWeight >= 1000) {
          borderClass = 'border-orange-500 border-2';
          bgClass = 'bg-orange-50';
        } else if (averageWeight && averageWeight >= 500) {
          borderClass = 'border-yellow-500 border-2';
          bgClass = 'bg-yellow-50';
        } else if (averageWeight) {
          borderClass = 'border-green-500 border-2';
          bgClass = 'bg-green-50';
        }
      }
    }
    
    return (
      <div 
        key={`${flupsyId}-${row}-${position}`} 
        onClick={() => basket && handleBasketClick(basket)}
        className={`${borderClass} rounded-md p-2 text-center text-sm h-12 
          ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${bgClass}`}
      >
        {basket ? (
          <div className="font-semibold">
            #{basket.physicalNumber}
            {averageWeight && (
              <div className="text-[10px] mt-1">{Math.round(averageWeight)} mg</div>
            )}
          </div>
        ) : (
          <div className="text-slate-400">Pos. {position}</div>
        )}
      </div>
    );
  };
  
  // Render a single flupsy
  const renderFlupsy = (flupsy: any) => {
    return (
      <div key={`flupsy-${flupsy.id}`} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{flupsy.name}</h3>
          <Badge variant="outline">{flupsy.location}</Badge>
        </div>
        
        {/* DX row */}
        <div className="bg-white rounded-md p-3 shadow-sm mb-4">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
              <span>DX</span>
            </div>
            <div className="text-sm font-medium">Fila DX</div>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => 
              renderBasketPosition(flupsy.id, 'DX', i + 1)
            )}
          </div>
        </div>
        
        {/* SX row */}
        <div className="bg-white rounded-md p-3 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
              <span>SX</span>
            </div>
            <div className="text-sm font-medium">Fila SX</div>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => 
              renderBasketPosition(flupsy.id, 'SX', i + 1)
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Disposizione delle ceste all'interno dell'unità FLUPSY
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {flupsys && flupsys.map((flupsy: any) => (
          <div key={flupsy.id}>
            {renderFlupsy(flupsy)}
            {flupsy.id !== flupsys[flupsys.length - 1].id && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}