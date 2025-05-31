import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, CircleX, CheckCircle, Calendar, Box, Tag, Weight, Scale, Info } from "lucide-react";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Position {
  row: string;
  position: number;
  occupied: boolean;
  basketId?: number;
  basketNumber?: number;
  active?: boolean;
}

interface BasketDetail {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  cycleCode: string;
  state: string;
  currentCycleId: number;
  row: string;
  position: number;
}

interface Operation {
  id: number;
  date: string;
  type: string;
  basketId: number;
  cycleId: number;
  sizeId: number | null;
  sgrId: number | null;
  lotId: number | null;
  animalCount: number | null;
  totalWeight: number | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  deadCount: number | null;
  mortalityRate: number | null;
  notes: string | null;
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: string;
  basket: BasketDetail;
  operations: Operation[];
}

interface Lot {
  id: number;
  arrivalDate: string;
  supplier: string;
  supplierLotNumber: string;
  quality: string;
  animalCount: number;
  weight: number;
  sizeId: number;
  state: string;
  size: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number;
  maxAnimalsPerKg: number;
  notes: string;
  color: string;
}

export default function FlupsyPositions() {
  const { id } = useParams();
  const flupsyId = id ? parseInt(id) : null;
  
  const { data: flupsy, isLoading: flupsyLoading } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}`],
    enabled: !!flupsyId
  });

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}/positions`],
    enabled: !!flupsyId
  });
  
  // Stato per tenere traccia del cestello selezionato per il tooltip
  const [selectedBasketId, setSelectedBasketId] = useState<number | null>(null);
  
  // Query per ottenere i dettagli del cestello selezionato
  const { data: basketDetail } = useQuery<BasketDetail>({
    queryKey: [`/api/baskets/${selectedBasketId}`],
    enabled: !!selectedBasketId
  });
  
  // Query per ottenere i dettagli del ciclo attuale del cestello
  const { data: cycleDetail } = useQuery<Cycle>({
    queryKey: [`/api/cycles/${basketDetail?.currentCycleId}`],
    enabled: !!basketDetail?.currentCycleId
  });
  
  // Query per ottenere i dettagli del lotto (se presente nell'operazione)
  const { data: lotDetail } = useQuery<Lot>({
    queryKey: [`/api/lots/${cycleDetail?.operations[0]?.lotId}`],
    enabled: !!cycleDetail?.operations?.[0]?.lotId
  });
  
  // Query per ottenere i dettagli della taglia (se presente nell'operazione)
  const { data: sizeDetail } = useQuery<Size>({
    queryKey: [`/api/sizes/${cycleDetail?.operations[0]?.sizeId}`],
    enabled: !!cycleDetail?.operations?.[0]?.sizeId
  });

  const isLoading = flupsyLoading || positionsLoading;

  // View mode: "grid" or "table"
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  // Funzione per formattare la data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT');
  };
  
  // Funzione per trovare l'ultima operazione di un tipo specifico
  const getLastOperationByType = (operations: Operation[] | undefined, type: string) => {
    if (!operations || operations.length === 0) return null;
    
    // Ordina le operazioni per data in ordine decrescente
    const sortedOps = [...operations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Trova la prima operazione del tipo specificato
    return sortedOps.find(op => op.type === type) || null;
  };
  
  // Funzione per formattare il peso con unità di misura
  const formatWeight = (weight: number | null | undefined) => {
    if (weight === null || weight === undefined) return "N/D";
    return `${weight} g`;
  };
  
  // Funzione per calcolare i giorni di ciclo
  const calculateCycleDays = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flupsy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Errore nel caricamento dei dati</h2>
        <p className="text-muted-foreground">
          Non è stato possibile caricare le informazioni del FLUPSY.
        </p>
        <Button asChild>
          <Link to="/flupsys">Torna all'elenco FLUPSY</Link>
        </Button>
      </div>
    );
  }
  
  // Utilizziamo i dati delle posizioni se disponibili, altrimenti creiamo un array fittizio
  const positions = positionsData?.positions || [];
  
  // Organizziamo le posizioni per riga (DX/SX)
  const positionsByRow: Record<string, Position[]> = {};
  
  positions.forEach((pos: Position) => {
    if (!positionsByRow[pos.row]) {
      positionsByRow[pos.row] = [];
    }
    positionsByRow[pos.row].push(pos);
  });
  
  // Se non abbiamo dati, creiamo un layout basato sul maxPositions
  if (positions.length === 0 && flupsy.maxPositions) {
    const positionsPerRow = Math.ceil(flupsy.maxPositions / 2);
    
    ['DX', 'SX'].forEach(row => {
      positionsByRow[row] = [];
      for (let i = 1; i <= positionsPerRow; i++) {
        if ((row === 'DX' ? i : i + positionsPerRow) <= flupsy.maxPositions) {
          positionsByRow[row].push({
            row,
            position: i,
            occupied: false
          });
        }
      }
    });
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/flupsys">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Posizioni FLUPSY</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base py-1 px-3">
            {flupsy.name}
          </Badge>
          <Badge variant={flupsy.active ? "default" : "secondary"}>
            {flupsy.active ? "Attivo" : "Inattivo"}
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Mappa delle Posizioni</h2>
          <p className="text-sm text-muted-foreground">
            Visualizzazione delle posizioni e dello stato di occupazione per il FLUPSY {flupsy.name}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            size="sm"
          >
            Griglia
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
            size="sm"
          >
            Tabella
          </Button>
        </div>
      </div>
      
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(positionsByRow).map(([row, positions]) => (
            <Card key={row}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Fila {row}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {positions
                    .sort((a, b) => a.position - b.position)
                    .map((pos) => (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              key={`${pos.row}-${pos.position}`}
                              className={`
                                aspect-square border rounded-md flex flex-col items-center justify-between cursor-pointer p-2 relative
                                ${pos.occupied 
                                  ? (pos.active 
                                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900' 
                                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900')
                                  : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}
                              `}
                              onMouseEnter={() => pos.basketId ? setSelectedBasketId(pos.basketId) : null}
                              onMouseLeave={() => setSelectedBasketId(null)}
                            >
                              {/* Header con numero posizione */}
                              <div className="text-center w-full">
                                <p className="text-xs text-muted-foreground">Pos. {pos.position}</p>
                                {pos.occupied && (
                                  <p className="font-semibold">#{pos.basketNumber || '?'}</p>
                                )}
                              </div>

                              {/* QR Code centrale */}
                              <div className="flex-1 flex items-center justify-center">
                                <QRCodeGenerator
                                  data={{
                                    flupsyId: flupsy.id,
                                    flupsyName: flupsy.name,
                                    row: pos.row,
                                    position: pos.position
                                  }}
                                  size={50}
                                  className="opacity-80"
                                />
                              </div>

                              {/* Footer con stato */}
                              <div className="text-center w-full">
                                {pos.occupied ? (
                                  pos.active ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <Badge variant="outline" className="text-xs py-0">inattivo</Badge>
                                  )
                                ) : (
                                  <CircleX className="h-4 w-4 text-slate-300 dark:text-slate-700 mx-auto" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          {pos.basketId && pos.basketId === selectedBasketId && basketDetail && (
                            <TooltipContent side="right" className="w-72 p-0 overflow-hidden">
                              <div className="flex flex-col divide-y divide-border">
                                {/* Intestazione tooltip con numero cestello e codice ciclo */}
                                <div className="p-3 bg-muted/50">
                                  <div className="flex justify-between items-center">
                                    <div className="font-semibold flex items-center gap-2">
                                      <Box className="h-4 w-4" />
                                      Cestello #{basketDetail.physicalNumber}
                                    </div>
                                    <Badge variant={basketDetail.state === 'active' ? 'default' : 'secondary'}>
                                      {basketDetail.state === 'active' ? 'Attivo' : 'Inattivo'}
                                    </Badge>
                                  </div>
                                  {basketDetail.cycleCode && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <span className="font-medium">Codice:</span> {basketDetail.cycleCode}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Dati del ciclo attuale */}
                                {cycleDetail && (
                                  <div className="p-3">
                                    <div className="flex items-center gap-2 font-medium mb-2">
                                      <Calendar className="h-4 w-4" />
                                      Ciclo attuale
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      <div className="text-muted-foreground">Inizio:</div>
                                      <div>{formatDate(cycleDetail.startDate)}</div>
                                      
                                      <div className="text-muted-foreground">Durata:</div>
                                      <div>{calculateCycleDays(cycleDetail.startDate)} giorni</div>
                                      
                                      {cycleDetail.operations && cycleDetail.operations.length > 0 && (
                                        <>
                                          <div className="text-muted-foreground">Ultima operazione:</div>
                                          <div className="capitalize">
                                            {cycleDetail.operations[0].type.replace(/-/g, ' ')}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Dati del lotto */}
                                {lotDetail && (
                                  <div className="p-3">
                                    <div className="flex items-center gap-2 font-medium mb-2">
                                      <Tag className="h-4 w-4" />
                                      Dati lotto
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      <div className="text-muted-foreground">Fornitore:</div>
                                      <div>{lotDetail.supplier}</div>
                                      
                                      <div className="text-muted-foreground">Qualità:</div>
                                      <div>{lotDetail.quality}</div>
                                      
                                      <div className="text-muted-foreground">Arrivo:</div>
                                      <div>{formatDate(lotDetail.arrivalDate)}</div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Dati operazione e taglia */}
                                {cycleDetail?.operations && cycleDetail.operations.length > 0 && (
                                  <div className="p-3">
                                    <div className="flex items-center gap-2 font-medium mb-2">
                                      <Scale className="h-4 w-4" />
                                      Dati misura
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      {sizeDetail && (
                                        <>
                                          <div className="text-muted-foreground">Taglia:</div>
                                          <div className="flex items-center gap-1">
                                            <div 
                                              className="w-3 h-3 rounded-full" 
                                              style={{ backgroundColor: sizeDetail.color }}
                                            />
                                            {sizeDetail.name}
                                          </div>
                                        </>
                                      )}
                                      
                                      {cycleDetail.operations[0].animalCount && (
                                        <>
                                          <div className="text-muted-foreground">Capi:</div>
                                          <div>{cycleDetail.operations[0].animalCount.toLocaleString('it-IT')}</div>
                                        </>
                                      )}
                                      
                                      {cycleDetail.operations[0].totalWeight && (
                                        <>
                                          <div className="text-muted-foreground">Peso:</div>
                                          <div>{formatWeight(cycleDetail.operations[0].totalWeight)}</div>
                                        </>
                                      )}
                                      
                                      {cycleDetail.operations[0].averageWeight && (
                                        <>
                                          <div className="text-muted-foreground">Peso medio:</div>
                                          <div>{cycleDetail.operations[0].averageWeight.toFixed(6)} g</div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Footer con pulsante per dettagli */}
                                <div className="p-2 flex justify-end bg-muted/30">
                                  <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                                    <Link to={`/baskets/${basketDetail.id}`}>
                                      <Info className="h-3 w-3 mr-1" /> Dettagli cestello
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Posizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Cestello #</TableHead>
                  <TableHead>Attivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(positionsByRow).flatMap(([row, positions]) => 
                  positions
                    .sort((a, b) => a.position - b.position)
                    .map((pos) => (
                      <TableRow key={`${pos.row}-${pos.position}`}>
                        <TableCell>{pos.row}</TableCell>
                        <TableCell>{pos.position}</TableCell>
                        <TableCell>
                          {pos.occupied ? (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                              Occupato
                            </Badge>
                          ) : (
                            <Badge variant="outline">Libero</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pos.basketNumber || '-'}
                        </TableCell>
                        <TableCell>
                          {pos.occupied ? (
                            pos.active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <CircleX className="h-4 w-4 text-amber-500" />
                            )
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-between">
        <Button asChild variant="outline">
          <Link to={`/flupsys/${flupsy.id}`}>
            Dettagli FLUPSY
          </Link>
        </Button>
        <Button asChild>
          <Link to="/flupsys">
            Torna all'elenco
          </Link>
        </Button>
      </div>
    </div>
  );
}