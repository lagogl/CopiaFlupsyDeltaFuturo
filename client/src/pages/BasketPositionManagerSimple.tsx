import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft, Check, Loader2, AlertCircle } from 'lucide-react';
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

export default function BasketPositionManagerSimple() {
  const { toast } = useToast();
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBasket, setSelectedBasket] = useState<Basket | null>(null);
  const [targetRow, setTargetRow] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState<number | null>(null);

  // Carica elenco FLUPSY
  const { data: flupsys = [] } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });

  // Carica cestelli per il FLUPSY selezionato
  const { data: baskets = [], refetch: refetchBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets', { flupsyId: selectedFlupsyId }],
    enabled: !!selectedFlupsyId,
  });

  // File standard (se non esplicitate nei dati)
  const standardRows = ['SX', 'DX', 'C'];
  
  // Determina le file effettivamente in uso
  const getAvailableRows = (): string[] => {
    const usedRows = baskets
      .filter(b => b.row)
      .map(b => b.row as string);
    
    // Rimuovi duplicati manualmente per evitare problemi con Set
    const uniqueRows: string[] = [];
    usedRows.forEach(row => {
      if (!uniqueRows.includes(row)) {
        uniqueRows.push(row);
      }
    });
    
    // Ritorna le file in uso o le file standard
    return uniqueRows.length > 0 ? uniqueRows : standardRows;
  };

  // Gestione cambio FLUPSY
  const handleFlupsyChange = (value: string) => {
    const id = parseInt(value, 10);
    setSelectedFlupsyId(id);
    setSelectedBasket(null);
    setTargetRow('');
    setTargetPosition(null);
  };

  // Gestione scambio posizioni
  const handleUpdatePosition = async () => {
    if (!selectedBasket) {
      toast({
        title: "Seleziona cestello",
        description: "Seleziona prima un cestello da spostare",
        variant: "destructive"
      });
      return;
    }

    if (!targetRow || !targetPosition) {
      toast({
        title: "Seleziona posizione",
        description: "Seleziona la fila e la posizione di destinazione",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Cerca se c'è già un cestello nella posizione target
      const targetBasket = baskets.find(b => 
        b.row === targetRow && 
        b.position === targetPosition &&
        b.id !== selectedBasket.id
      );

      const switchData = {
        basket1Id: selectedBasket.id,
        basket2Id: targetBasket?.id || 0,
        position1Row: selectedBasket.row || '',
        position1Number: selectedBasket.position || 0,
        position2Row: targetRow,
        position2Number: targetPosition
      };

      console.log("Richiesta di aggiornamento posizione:", switchData);

      // Chiamata API per lo scambio posizioni
      const response = await fetch('/api/baskets/switch-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(switchData),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Posizione aggiornata",
          description: "La posizione del cestello è stata aggiornata con successo",
          variant: "default"
        });
        
        // Aggiorna i dati dopo lo scambio
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        refetchBaskets();
        
        // Reset delle selezioni
        setSelectedBasket(null);
        setTargetRow('');
        setTargetPosition(null);
      } else {
        toast({
          title: "Errore",
          description: result.message || "Si è verificato un errore durante l'aggiornamento",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento posizione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento. Controlla la console per dettagli.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Genera le posizioni possibili (1-10 di default o posizioni massime del FLUPSY)
  const getAvailablePositions = (row: string): number[] => {
    const maxPositionsInRow = Math.max(
      ...baskets.filter(b => b.row === row).map(b => b.position || 0),
      0
    );
    
    const selectedFlupsy = flupsys.find(f => f.id === selectedFlupsyId);
    const defaultMaxPositions = selectedFlupsy?.maxPositions || 10;
    
    // Usa il massimo tra le posizioni esistenti e il valore di default/configurato
    const maxPos = Math.max(maxPositionsInRow, defaultMaxPositions);
    
    return Array.from({ length: maxPos }, (_, i) => i + 1);
  };

  // Verifica se una posizione è occupata
  const isPositionOccupied = (row: string, position: number): boolean => {
    return baskets.some(b => b.row === row && b.position === position);
  };

  // Ottieni il cestello in una determinata posizione
  const getBasketAtPosition = (row: string, position: number): Basket | undefined => {
    return baskets.find(b => b.row === row && b.position === position);
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
        <>
          {/* Visualizzazione avviso se i cestelli non hanno posizione */}
          {baskets.length > 0 && !baskets.some(b => b.row && b.position) && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Cestelli senza posizione definita</h3>
                  <p className="text-sm">
                    Questo FLUPSY ha {baskets.length} cestelli, ma nessuno di essi ha una posizione assegnata.
                    Seleziona un cestello dalla tabella qui sotto e assegnagli una posizione.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabella con tutti i cestelli */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Cestelli nel FLUPSY</CardTitle>
              <CardDescription>
                Tutti i cestelli presenti in questo FLUPSY
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Numero</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Fila</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Posizione</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Stato</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baskets.map(basket => (
                      <tr 
                        key={basket.id} 
                        className={`border-b ${selectedBasket?.id === basket.id ? 'bg-primary/10' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm">{basket.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">#{basket.physicalNumber}</td>
                        <td className="px-4 py-3 text-sm">
                          {basket.row || <span className="text-muted-foreground italic">Non assegnata</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {basket.position || <span className="text-muted-foreground italic">Non assegnata</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            basket.state === 'active' ? 'bg-green-100 text-green-800' : 
                            basket.state === 'empty' ? 'bg-gray-100 text-gray-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {basket.state === 'active' ? 'Attivo' : 
                             basket.state === 'empty' ? 'Vuoto' : 
                             basket.state}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button 
                            variant={selectedBasket?.id === basket.id ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setSelectedBasket(basket)}
                          >
                            {selectedBasket?.id === basket.id ? 'Selezionato' : 'Seleziona'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pannello per assegnare la posizione */}
          {selectedBasket && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Assegna posizione al cestello #{selectedBasket.physicalNumber}</CardTitle>
                <CardDescription>
                  Scegli la fila e la posizione dove vuoi spostare questo cestello
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="targetRow">Fila</Label>
                      <Select 
                        value={targetRow} 
                        onValueChange={setTargetRow}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona fila" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRows().map(row => (
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
                        value={targetPosition?.toString() || ''} 
                        onValueChange={(value) => {
                          setTargetPosition(parseInt(value, 10));
                        }}
                        disabled={!targetRow}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona posizione" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetRow && getAvailablePositions(targetRow).map(pos => {
                            const isOccupied = isPositionOccupied(targetRow, pos);
                            const basketAtPosition = getBasketAtPosition(targetRow, pos);
                            // Non mostrare la posizione se è già occupata dal cestello selezionato
                            if (basketAtPosition?.id === selectedBasket.id) {
                              return null;
                            }
                            return (
                              <SelectItem key={pos} value={pos.toString()}>
                                {pos}
                                {isOccupied ? 
                                  ` - Cestello #${basketAtPosition?.physicalNumber} (scambio)` : 
                                  ' (libera)'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {targetRow && targetPosition && (
                    <div className="border rounded-md p-4 bg-muted/20">
                      <div className="flex items-start">
                        {isPositionOccupied(targetRow, targetPosition) && 
                         getBasketAtPosition(targetRow, targetPosition)?.id !== selectedBasket.id ? (
                          <>
                            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 text-yellow-600" />
                            <div>
                              <p className="font-medium">Posizione occupata</p>
                              <p className="text-sm text-muted-foreground">
                                La posizione {targetRow}-{targetPosition} è occupata dal cestello 
                                #{getBasketAtPosition(targetRow, targetPosition)?.physicalNumber}.
                                I due cestelli verranno scambiati di posizione.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2 mt-0.5 text-green-600" />
                            <div>
                              <p className="font-medium">Posizione libera</p>
                              <p className="text-sm text-muted-foreground">
                                La posizione {targetRow}-{targetPosition} è libera.
                                Il cestello verrà spostato in questa posizione.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpdatePosition}
                      disabled={isLoading || !targetRow || !targetPosition}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Elaborazione...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Aggiorna posizione
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}