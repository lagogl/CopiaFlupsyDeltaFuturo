import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Filter, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { ScreeningOperation, Basket, Cycle, InsertScreeningSourceBasket, Size } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Il backend restituisce i dati sulla taglia di riferimento 
// anche se non è definito esplicitamente nel tipo ScreeningOperation
// Definiamo un tipo per gestire questa situazione
interface ScreeningOperationResponse extends ScreeningOperation {
  referenceSize?: Size;
}

export default function ScreeningAddSource() {
  // Routing
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>('/screening/:id/add-source');
  const screeningId = params?.id ? parseInt(params.id) : null;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [flupsyFilter, setFlupsyFilter] = useState<string>('all');
  const [filteredBaskets, setFilteredBaskets] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere i dettagli dell'operazione di vagliatura
  const {
    data: screeningOperation,
    isLoading: operationLoading,
    error: operationError,
  } = useQuery({
    queryKey: ['/api/screening/operations', screeningId],
    queryFn: async () => {
      if (!screeningId) return null;
      return apiRequest<ScreeningOperationResponse>({
        url: `/api/screening/operations/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId,
  });
  
  // Query per ottenere le ceste di origine già aggiunte
  const {
    data: sourceBaskets,
    isLoading: sourceBasketLoading,
  } = useQuery({
    queryKey: ['/api/screening/source-baskets', screeningId],
    queryFn: async () => {
      if (!screeningId) return [];
      return apiRequest<any[]>({
        url: `/api/screening/source-baskets/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId,
  });

  // Query per ottenere i cestelli attivi
  const {
    data: activeCycles,
    isLoading: cyclesLoading,
    error: cyclesError
  } = useQuery({
    queryKey: ['/api/cycles/active-with-details'],
    queryFn: async () => {
      return apiRequest<any[]>({
        url: '/api/cycles/active-with-details',
        method: 'GET'
      });
    },
  });
  
  // Query per ottenere tutti i FLUPSY
  const {
    data: flupsys,
    isLoading: flupsysLoading,
  } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: async () => {
      return apiRequest<any[]>({
        url: '/api/flupsys',
        method: 'GET'
      });
    },
  });

  // Mutation per aggiungere una cesta di origine
  const addSourceBasketMutation = useMutation({
    mutationFn: (data: InsertScreeningSourceBasket) =>
      apiRequest({
        url: '/api/screening/source-baskets',
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/source-baskets', screeningId] });
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations', screeningId] });
      
      toast({
        title: 'Cesta aggiunta',
        description: 'La cesta è stata aggiunta con successo alla vagliatura.',
      });
      
      // Ritorna alla pagina di dettaglio dell'operazione
      navigate(`/screening/${screeningId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'aggiunta della cesta.',
        variant: 'destructive',
      });
    },
  });

  // Calcola la distanza tra due taglie (più basso è meglio)
  const calculateSizeDistance = (cycle: any, referenceSize: Size) => {
    // Se il ciclo non ha una taglia, mettilo in fondo
    if (!cycle.size) return Number.MAX_SAFE_INTEGER;
    
    // Se le taglie sono identiche, distanza minima
    if (cycle.size.id === referenceSize.id) return 0;
    
    // Utilizziamo gli animali/kg per determinare la vicinanza tra le taglie
    const cycleMin = cycle.size.minAnimalsPerKg || 0;
    const referenceMin = referenceSize.minAnimalsPerKg || 0;
    
    // Calcolo della distanza relativa
    return Math.abs(cycleMin - referenceMin) / (referenceMin || 1);
  };

  // Filtra e ordina i cestelli in base alla ricerca, al FLUPSY selezionato e alla taglia di riferimento
  useEffect(() => {
    if (!activeCycles || !screeningOperation?.referenceSize) return;
    
    // Prima filtriamo in base ai termini di ricerca e al FLUPSY selezionato
    const filtered = activeCycles.filter(cycle => {
      const basket = cycle.basket;
      
      // Filtro per FLUPSY
      if (flupsyFilter !== 'all' && basket.flupsyId.toString() !== flupsyFilter) {
        return false;
      }
      
      // Filtro per termine di ricerca
      if (!searchTerm) return true;
      
      const term = searchTerm.toLowerCase();
      
      return (
        (basket.physicalNumber?.toString().includes(term)) ||
        (basket.cycleCode?.toLowerCase().includes(term)) ||
        (cycle.lot?.supplier?.toLowerCase().includes(term)) ||
        (cycle.lot?.notes?.toLowerCase().includes(term)) ||
        (cycle.size?.name?.toLowerCase().includes(term))
      );
    });
    
    // Poi ordiniamo in base alla vicinanza della taglia rispetto a quella di riferimento
    if (screeningOperation.referenceSize) {
      const sortedBySize = [...filtered].sort((a, b) => {
        const distanceA = calculateSizeDistance(a, screeningOperation.referenceSize as Size);
        const distanceB = calculateSizeDistance(b, screeningOperation.referenceSize as Size);
        return distanceA - distanceB; // Ordine crescente (il più vicino prima)
      });
      
      setFilteredBaskets(sortedBySize);
    } else {
      setFilteredBaskets(filtered);
    }
  }, [searchTerm, flupsyFilter, activeCycles, screeningOperation?.referenceSize]);

  // Handler per aggiungere una cesta di origine
  const handleAddSourceBasket = (cycleId: number, basketId: number) => {
    if (!screeningId) return;
    
    const cycle = activeCycles?.find(c => c.id === cycleId);
    if (!cycle) return;
    
    // Dati di base per l'aggiunta della cesta
    const sourceBasketData: InsertScreeningSourceBasket = {
      screeningId,
      basketId,
      cycleId,
      animalCount: cycle.lastOperation?.animalCount || null,
      totalWeight: cycle.lastOperation?.totalWeight || null,
      animalsPerKg: cycle.lastOperation?.animalsPerKg || null,
      sizeId: cycle.lastOperation?.sizeId || null,
      lotId: cycle.lot?.id || null
    };
    
    addSourceBasketMutation.mutate(sourceBasketData);
  };

  if (operationLoading || cyclesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(`/screening/${screeningId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (operationError || cyclesError) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-6 bg-red-50 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Errore</h3>
          <p className="text-red-600">
            Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(`/screening/${screeningId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  if (!screeningOperation || screeningOperation.status !== 'draft') {
    return (
      <div className="container mx-auto p-4">
        <div className="p-6 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Operazione non modificabile</h3>
          <p className="text-yellow-600">
            Non è possibile aggiungere ceste a un'operazione di vagliatura che non è in stato di bozza.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(`/screening/${screeningId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/screening/${screeningId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Aggiungi Cesta Origine</h1>
          <p className="text-muted-foreground">
            Vagliatura #{screeningOperation.screeningNumber}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona Cesta</CardTitle>
          <CardDescription>
            Seleziona una cesta attiva da aggiungere come cesta di origine per questa vagliatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-3 mb-4">
            {/* Riga di filtri */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="search-basket" className="sr-only">
                Cerca cesta
              </Label>
              <Input
                id="search-basket"
                placeholder="Cerca per numero, codice ciclo, fornitore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              
              {/* Selezione FLUPSY */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="flupsy-filter" className="whitespace-nowrap">
                  FLUPSY:
                </Label>
                <Select value={flupsyFilter} onValueChange={setFlupsyFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleziona FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                    {flupsys?.filter(f => f.active).map((flupsy) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Badge che mostra i filtri attivi */}
            <div className="flex flex-wrap gap-2">
              {flupsyFilter !== 'all' && flupsys && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>FLUPSY: {flupsys.find(f => f.id.toString() === flupsyFilter)?.name}</span>
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Ricerca: {searchTerm}</span>
                </Badge>
              )}
              {filteredBaskets.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  <span>{filteredBaskets.length} ceste disponibili</span>
                </Badge>
              )}
            </div>
          </div>

          {filteredBaskets?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || flupsyFilter !== 'all' ? 
                'Nessun risultato trovato con i filtri attuali. Prova a modificare i criteri di ricerca o cambiare il FLUPSY selezionato.' 
                : 'Nessuna cesta attiva disponibile.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cesta</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Posizione</TableHead>
                  <TableHead>Taglia</TableHead>
                  <TableHead>Animali</TableHead>
                  <TableHead>Lotto</TableHead>
                  <TableHead>Ultima operazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBaskets.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <div className="font-medium">#{cycle.basket.physicalNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cycle.basket.cycleCode || '-'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(cycle.startDate), 'dd/MM/yyyy', { locale: it })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cycle.basket.flupsyId && (
                        <Badge variant="outline" className="font-normal">
                          {cycle.flupsy?.name} - {cycle.basket.row || 'N/D'} - {cycle.basket.position || 'N/D'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {cycle.size && screeningOperation?.referenceSize ? (
                        <div>
                          <Badge 
                            variant={cycle.size.id === screeningOperation.referenceSize.id ? "default" : "secondary"} 
                            className={`font-normal ${cycle.size.id === screeningOperation.referenceSize.id ? "bg-green-500" : ""}`}
                          >
                            {cycle.size.name}
                          </Badge>
                          {cycle.size.id !== screeningOperation.referenceSize.id && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {(cycle.size.minAnimalsPerKg || 0) < (screeningOperation.referenceSize.minAnimalsPerKg || 0)
                                ? "Taglia maggiore" : "Taglia minore"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/D</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cycle.lastOperation ? (
                        <div>
                          <div className="font-medium text-sm">{cycle.lastOperation.animalCount?.toLocaleString() || 'N/D'}</div>
                          {cycle.lastOperation.animalsPerKg && (
                            <div className="text-xs text-muted-foreground">
                              {cycle.lastOperation.animalsPerKg.toLocaleString()} per kg
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/D</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cycle.lot ? (
                        <div>
                          <div className="font-medium">{cycle.lot.supplier}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(cycle.lot.arrivalDate), 'dd/MM/yyyy', { locale: it })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/D</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cycle.lastOperation ? (
                        <div>
                          <Badge>
                            {cycle.lastOperation.type === 'peso' ? 'Peso' : 
                             cycle.lastOperation.type === 'misura' ? 'Misura' : 
                             cycle.lastOperation.type === 'prima-attivazione' ? 'Attivazione' : 
                             cycle.lastOperation.type === 'pulizia' ? 'Pulizia' : 
                             cycle.lastOperation.type === 'vagliatura' ? 'Vagliatura' : 
                             cycle.lastOperation.type}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(cycle.lastOperation.date), 'dd/MM/yyyy', { locale: it })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/D</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {sourceBaskets?.some(sb => sb.cycleId === cycle.id) ? (
                        <Button
                          disabled={true}
                          variant="secondary"
                          className="opacity-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Già aggiunta
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddSourceBasket(cycle.id, cycle.basket.id)}
                          disabled={addSourceBasketMutation.isPending}
                        >
                          {addSourceBasketMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Aggiungi
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}