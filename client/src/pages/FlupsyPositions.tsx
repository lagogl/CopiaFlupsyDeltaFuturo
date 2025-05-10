import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, CircleX, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Position {
  row: string;
  position: number;
  occupied: boolean;
  basketId?: number;
  basketNumber?: number;
  active?: boolean;
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

  const isLoading = flupsyLoading || positionsLoading;

  // View mode: "grid" or "table"
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
                      <div
                        key={`${pos.row}-${pos.position}`}
                        className={`
                          aspect-square border rounded-md flex flex-col items-center justify-center
                          ${pos.occupied 
                            ? (pos.active 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                              : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800')
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}
                        `}
                      >
                        <p className="text-xs text-muted-foreground">Pos. {pos.position}</p>
                        {pos.occupied ? (
                          <>
                            <p className="font-semibold">#{pos.basketNumber || '?'}</p>
                            {pos.active ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                            ) : (
                              <Badge variant="outline" className="mt-1 text-xs py-0">inattivo</Badge>
                            )}
                          </>
                        ) : (
                          <CircleX className="h-6 w-6 text-slate-300 dark:text-slate-700 mt-1" />
                        )}
                      </div>
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