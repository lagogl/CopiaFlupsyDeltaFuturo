import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowRightLeft, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface Flupsy {
  id: number;
  name: string;
  location?: string;
  maxPositions?: number;
}

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row?: string;
  position?: number;
  state: string;
}

interface BasketPosition {
  basketId: number;
  basketNumber: number;
  row: string;
  position: number;
}

interface SwitchPositionRequest {
  basket1Id: number;
  basket2Id: number;
  position1Row: string;
  position1Number: number;
  position2Row: string;
  position2Number: number;
}

export default function BasketPositionManager() {
  const { toast } = useToast();
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [sourceBasket, setSourceBasket] = useState<Basket | null>(null);
  const [targetBasket, setTargetBasket] = useState<Basket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableRows, setAvailableRows] = useState<string[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Record<string, number[]>>({});
  const [selectedSourceRow, setSelectedSourceRow] = useState<string>('');
  const [selectedSourcePosition, setSelectedSourcePosition] = useState<number | null>(null);
  const [selectedTargetRow, setSelectedTargetRow] = useState<string>('');
  const [selectedTargetPosition, setSelectedTargetPosition] = useState<number | null>(null);

  // Carica elenco FLUPSY
  const { data: flupsys = [] } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });

  // Carica cestelli per il FLUPSY selezionato
  const { data: baskets = [], refetch: refetchBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets', { flupsyId: selectedFlupsyId }],
    enabled: !!selectedFlupsyId,
  });

  // Carica posizioni disponibili per il FLUPSY selezionato
  const { data: positionsData, refetch: refetchPositions } = useQuery<{
    flupsyName: string;
    availableRows: string[];
    availablePositions: Record<string, number[]>;
  }>({
    queryKey: ['/api/flupsy-positions', selectedFlupsyId],
    enabled: !!selectedFlupsyId,
  });
  
  // Dettagli aggiuntivi sul FLUPSY selezionato
  const { data: flupsyDetails } = useQuery<Flupsy>({
    queryKey: ['/api/flupsys', selectedFlupsyId],
    enabled: !!selectedFlupsyId,
  });

  // Aggiorna le posizioni disponibili quando cambiano i dati
  useEffect(() => {
    if (positionsData) {
      // Se non ci sono file disponibili ma abbiamo cestelli,
      // creiamo le file standard SX e DX
      if (positionsData.availableRows.length === 0 && baskets.length > 0) {
        console.log("Nessuna fila disponibile ma abbiamo cestelli, creo file di default");
        setAvailableRows(['SX', 'DX']);
        
        const defaultPositions: Record<string, number[]> = {
          'SX': Array.from({ length: 5 }, (_, i) => i + 1),
          'DX': Array.from({ length: 5 }, (_, i) => i + 1)
        };
        setAvailablePositions(defaultPositions);
      } else {
        setAvailableRows(positionsData.availableRows);
        setAvailablePositions(positionsData.availablePositions);
      }
    }
  }, [positionsData, baskets]);

  // Gestione cambio FLUPSY
  const handleFlupsyChange = (value: string) => {
    const id = parseInt(value, 10);
    setSelectedFlupsyId(id);
    setSourceBasket(null);
    setTargetBasket(null);
    setSelectedSourceRow('');
    setSelectedSourcePosition(null);
    setSelectedTargetRow('');
    setSelectedTargetPosition(null);
  };

  // Trova cestello per una determinata posizione
  const findBasketAtPosition = (row: string, position: number): Basket | undefined => {
    return baskets.find(b => b.row === row && b.position === position);
  };
  
  // Ottieni tutti i cestelli disponibili, inclusi quelli senza posizione definita
  const getAllBaskets = () => {
    return baskets.map(basket => {
      // Se il cestello non ha fila o posizione assegnata, inizializziamo con valori di default
      if (!basket.row || basket.position === null || basket.position === undefined) {
        return {
          ...basket,
          row: basket.row || 'Non assegnata',
          position: basket.position || 0
        };
      }
      return basket;
    });
  };

  // Aggiorna la selezione del cestello sorgente
  const handleSourcePositionChange = (row: string, position: number) => {
    const basket = findBasketAtPosition(row, position);
    if (basket) {
      setSourceBasket(basket);
      setSelectedSourceRow(row);
      setSelectedSourcePosition(position);
    } else {
      toast({
        title: "Posizione vuota",
        description: "Non c'è alcun cestello in questa posizione.",
        variant: "destructive"
      });
    }
  };

  // Aggiorna la selezione del cestello destinazione
  const handleTargetPositionChange = (row: string, position: number) => {
    const basket = findBasketAtPosition(row, position);
    setTargetBasket(basket || null);
    setSelectedTargetRow(row);
    setSelectedTargetPosition(position);
  };

  // Esegue lo scambio di posizioni tra cestelli
  const handleSwitchPositions = async () => {
    if (!sourceBasket) {
      toast({
        title: "Seleziona cestello sorgente",
        description: "Seleziona prima un cestello da spostare",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTargetRow || !selectedTargetPosition) {
      toast({
        title: "Seleziona posizione destinazione",
        description: "Seleziona prima una posizione di destinazione",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const switchData: SwitchPositionRequest = {
        basket1Id: sourceBasket.id,
        basket2Id: targetBasket?.id || sourceBasket.id,
        position1Row: sourceBasket.row || '',
        position1Number: sourceBasket.position || 0,
        position2Row: selectedTargetRow,
        position2Number: selectedTargetPosition
      };

      console.log("INIZIO OPERAZIONE DI SCAMBIO CESTELLI");
      console.log("Cestello 1:", sourceBasket.id, "Posizione:", sourceBasket.row, sourceBasket.position, "FLUPSY:", sourceBasket.flupsyId);
      if (targetBasket) {
        console.log("Cestello 2:", targetBasket.id, "Posizione:", targetBasket.row, targetBasket.position, "FLUPSY:", targetBasket.flupsyId);
      } else {
        console.log("Posizione destinazione:", selectedTargetRow, selectedTargetPosition);
      }

      // Chiamata API per lo scambio posizioni
      const response = await fetch('/api/baskets/switch-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(switchData),
      });

      const result = await response.json();
      console.log("Risultato dell'operazione di scambio:", result);

      if (response.ok) {
        toast({
          title: "Posizioni scambiate",
          description: "I cestelli sono stati spostati con successo",
          variant: "default"
        });
        
        // Aggiorna i dati dopo lo scambio
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        refetchBaskets();
        refetchPositions();
        
        // Reset delle selezioni
        setSourceBasket(null);
        setTargetBasket(null);
        setSelectedSourceRow('');
        setSelectedSourcePosition(null);
        setSelectedTargetRow('');
        setSelectedTargetPosition(null);
      } else {
        toast({
          title: "Errore",
          description: result.message || "Si è verificato un errore durante lo scambio",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Errore durante lo scambio posizioni:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante lo scambio. Controlla la console per dettagli.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper per ottenere posizioni occupate e libere
  const getOccupiedPositions = (row: string): number[] => {
    return baskets
      .filter(b => b.row === row)
      .map(b => b.position || 0)
      .filter(p => p > 0);
  };

  const getFreePositions = (row: string): number[] => {
    const occupied = getOccupiedPositions(row);
    const positions = availablePositions[row] || [];
    const maxPos = Math.max(...positions, ...occupied, 0);
    
    return Array.from({ length: maxPos }, (_, i) => i + 1)
      .filter(pos => !occupied.includes(pos));
  };

  // Controlla se una posizione è occupata
  const isPositionOccupied = (row: string, position: number): boolean => {
    return baskets.some(b => b.row === row && b.position === position);
  };

  // Ottieni numero fisico del cestello in base alla posizione
  const getBasketNumberAtPosition = (row: string, position: number): number | null => {
    const basket = findBasketAtPosition(row, position);
    return basket ? basket.physicalNumber : null;
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Gestione Posizioni Cestelli</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleziona FLUPSY</CardTitle>
          <CardDescription>
            Seleziona il FLUPSY in cui gestire le posizioni dei cestelli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="flupsy">FLUPSY</Label>
              <Select 
                value={selectedFlupsyId?.toString() || ''}
                onValueChange={handleFlupsyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  {flupsys.map(flupsy => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedFlupsyId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pannello Cestello Sorgente */}
          <Card>
            <CardHeader>
              <CardTitle>Cestello da spostare</CardTitle>
              <CardDescription>
                Seleziona il cestello che vuoi spostare in un'altra posizione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sourceRow">Fila</Label>
                    <Select 
                      value={selectedSourceRow} 
                      onValueChange={setSelectedSourceRow}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRows.map(row => (
                          <SelectItem key={row} value={row}>
                            {row}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sourcePosition">Posizione</Label>
                    <Select 
                      value={selectedSourcePosition?.toString() || ''} 
                      onValueChange={(value) => {
                        const position = parseInt(value, 10);
                        handleSourcePositionChange(selectedSourceRow, position);
                      }}
                      disabled={!selectedSourceRow}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona posizione" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSourceRow && getOccupiedPositions(selectedSourceRow).map(pos => (
                          <SelectItem key={pos} value={pos.toString()}>
                            {pos} - Cestello #{getBasketNumberAtPosition(selectedSourceRow, pos)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {sourceBasket && (
                  <div className="border rounded p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cestello selezionato:</span>
                      <span className="px-2 py-1 bg-primary/10 rounded-md font-semibold">
                        #{sourceBasket.physicalNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>ID: {sourceBasket.id}</div>
                      <div>Stato: {sourceBasket.state}</div>
                      <div>Fila: {sourceBasket.row || '-'}</div>
                      <div>Posizione: {sourceBasket.position || '-'}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Pannello Posizione Destinazione */}
          <Card>
            <CardHeader>
              <CardTitle>Posizione destinazione</CardTitle>
              <CardDescription>
                Seleziona la posizione dove spostare il cestello
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetRow">Fila</Label>
                    <Select 
                      value={selectedTargetRow} 
                      onValueChange={setSelectedTargetRow}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRows.map(row => (
                          <SelectItem key={row} value={row}>
                            {row}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetPosition">Posizione</Label>
                    <Select 
                      value={selectedTargetPosition?.toString() || ''} 
                      onValueChange={(value) => {
                        const position = parseInt(value, 10);
                        handleTargetPositionChange(selectedTargetRow, position);
                      }}
                      disabled={!selectedTargetRow}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona posizione" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTargetRow && [...getOccupiedPositions(selectedTargetRow), ...getFreePositions(selectedTargetRow)]
                          .sort((a, b) => a - b)
                          .map(pos => {
                            const isOccupied = isPositionOccupied(selectedTargetRow, pos);
                            const basketNumber = getBasketNumberAtPosition(selectedTargetRow, pos);
                            return (
                              <SelectItem key={pos} value={pos.toString()}>
                                {pos}{isOccupied ? ` - Cestello #${basketNumber}` : ' (libera)'}
                              </SelectItem>
                            );
                          })
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {targetBasket ? (
                  <div className="border rounded p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cestello nella posizione:</span>
                      <span className="px-2 py-1 bg-primary/10 rounded-md font-semibold">
                        #{targetBasket.physicalNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>ID: {targetBasket.id}</div>
                      <div>Stato: {targetBasket.state}</div>
                      <div>Fila: {targetBasket.row || '-'}</div>
                      <div>Posizione: {targetBasket.position || '-'}</div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                      <AlertCircle className="inline-block w-4 h-4 mr-1" />
                      Le posizioni dei due cestelli verranno scambiate
                    </div>
                  </div>
                ) : (
                  selectedTargetRow && selectedTargetPosition ? (
                    <div className="border rounded p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Posizione libera:</span>
                        <span className="px-2 py-1 bg-primary/10 rounded-md font-semibold">
                          {selectedTargetRow}-{selectedTargetPosition}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-green-100 text-green-800 rounded text-sm">
                        <Check className="inline-block w-4 h-4 mr-1" />
                        Il cestello verrà spostato in questa posizione libera
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {sourceBasket && selectedTargetRow && selectedTargetPosition && (
        <div className="mt-6 flex justify-center">
          <Button 
            size="lg" 
            onClick={handleSwitchPositions}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {targetBasket ? 'Scambia posizioni' : 'Sposta cestello'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}