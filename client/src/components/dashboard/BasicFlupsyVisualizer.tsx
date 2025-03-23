import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function BasicFlupsyVisualizer() {
  // Fetch data
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({ 
    queryKey: ['/api/flupsys'] 
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({ 
    queryKey: ['/api/baskets'] 
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
  
  // Helper function to filter baskets by flupsy and row
  const getBasketsByRow = (flupsyId: number, row: string) => {
    if (!baskets) return [];
    return baskets.filter(b => 
      b.flupsyId === flupsyId && 
      b.row === row
    );
  };
  
  // Render basket cell
  const renderBasketPosition = (flupsyId: number, row: string, position: number) => {
    // Find basket at this position, if any
    const basket = baskets?.find(b => 
      b.flupsyId === flupsyId && 
      b.row === row && 
      b.position === position
    );
    
    // Styling based on whether a basket exists at this position
    const bgClass = basket ? 'bg-white border-blue-400 border-2' : 'bg-slate-50 border-dashed border-slate-300';
    
    return (
      <div key={`${flupsyId}-${row}-${position}`} className={`border ${bgClass} p-2 rounded-md text-center text-sm h-12`}>
        {basket ? (
          <div className="font-semibold">#{basket.physicalNumber}</div>
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