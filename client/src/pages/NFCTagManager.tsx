import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import NFCWriter from '@/components/NFCWriter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { TagIcon, SearchIcon, PlusCircleIcon, InfoIcon, MapPinIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  nfcData: string | null;
}

interface Flupsy {
  id: number;
  name: string;
  location: string | null;
}

interface PositionFormData {
  row: string;
  position: string;
}

export default function NFCTagManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedBasketId, setSelectedBasketId] = useState<number | null>(null);
  const [isWriterOpen, setIsWriterOpen] = useState(false);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [selectedBasketForPosition, setSelectedBasketForPosition] = useState<Basket | null>(null);
  
  // Form per l'assegnazione della posizione
  const positionForm = useForm<PositionFormData>({
    defaultValues: {
      row: '',
      position: ''
    }
  });
  
  // Carica i cestelli
  const {
    data: baskets = [],
    isLoading: basketsLoading,
    error: basketsError
  } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Carica i flupsy
  const {
    data: flupsys = [],
    isLoading: flupsysLoading
  } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  // Mutation per aggiornare la posizione di un cestello
  const updateBasketPosition = useMutation({
    mutationFn: async (data: { basketId: number, row: string, position: number }) => {
      const response = await fetch(`/api/baskets/${data.basketId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row: data.row,
          position: data.position
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Si è verificato un errore durante l\'aggiornamento della posizione');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalida la cache per ricaricare i cestelli
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      // Chiudi il dialog
      setIsPositionDialogOpen(false);
      setSelectedBasketForPosition(null);
      
      // Mostra una notifica di successo
      toast({
        title: "Posizione aggiornata",
        description: "La posizione del cestello è stata aggiornata con successo.",
      });
      
      // Reset del form
      positionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filtra i cestelli in base alla ricerca e ai filtri
  const filteredBaskets = baskets.filter((basket) => {
    // Filtra per termine di ricerca
    const matchesSearch = 
      basket.physicalNumber.toString().includes(searchTerm) ||
      (basket.row && basket.row.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (basket.position && basket.position.toString().includes(searchTerm));
    
    // Filtra per stato del tag NFC
    if (filter === 'with-nfc' && !basket.nfcData) return false;
    if (filter === 'without-nfc' && basket.nfcData) return false;
    
    return matchesSearch;
  });

  // Gestisce l'apertura del writer NFC
  const handleOpenWriter = (basketId: number) => {
    setSelectedBasketId(basketId);
    setIsWriterOpen(true);
  };

  // Gestisce la chiusura del writer NFC
  const handleCloseWriter = () => {
    setIsWriterOpen(false);
  };

  // Gestisce il completamento della scrittura
  const handleWriteSuccess = () => {
    setIsWriterOpen(false);
    setSelectedBasketId(null);
    
    // Mostra una notifica di successo
    toast({
      title: "Tag NFC programmato",
      description: "Il tag NFC è stato programmato con successo.",
    });
  };
  
  // Gestisce l'apertura del dialogo per l'assegnazione della posizione
  const handleOpenPositionDialog = (basket: Basket) => {
    setSelectedBasketForPosition(basket);
    setIsPositionDialogOpen(true);
    
    // Se la cesta ha già una posizione, imposta i valori predefiniti
    if (basket.row) {
      positionForm.setValue('row', basket.row);
    }
    if (basket.position !== null) {
      positionForm.setValue('position', basket.position.toString());
    }
  };
  
  // Gestisce la chiusura del dialogo per l'assegnazione della posizione
  const handleClosePositionDialog = () => {
    setIsPositionDialogOpen(false);
    setSelectedBasketForPosition(null);
    positionForm.reset();
  };
  
  // Gestisce il salvataggio della posizione
  const handleSavePosition = positionForm.handleSubmit((data) => {
    if (!selectedBasketForPosition) return;
    
    // Converti i valori in string e number
    const row = data.row;
    const position = parseInt(data.position);
    
    if (isNaN(position)) {
      toast({
        title: "Errore",
        description: "La posizione deve essere un numero valido",
        variant: "destructive",
      });
      return;
    }
    
    // Esegui la mutation per aggiornare la posizione
    updateBasketPosition.mutate({
      basketId: selectedBasketForPosition.id,
      row,
      position
    });
  });

  // Trova il nome del flupsy di un cestello
  const getFlupsyName = (flupsyId: number): string => {
    const flupsy = flupsys.find(f => f.id === flupsyId);
    return flupsy ? flupsy.name : 'Sconosciuto';
  };

  // Ottiene la posizione completa del cestello
  const getBasketPosition = (basket: Basket): string => {
    if (basket.row && basket.position) {
      return `${basket.row}-${basket.position}`;
    }
    return 'Non assegnata';
  };
  
  // Trova il cestello selezionato
  const selectedBasket = baskets.find(b => b.id === selectedBasketId);

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Gestione Tag NFC</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Programma nuovi tag NFC</CardTitle>
          <CardDescription>
            Seleziona un cestello dalla lista e crea un nuovo tag NFC da attaccare alla cesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Ricerca */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                className="pl-10"
                placeholder="Cerca per numero o posizione..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtro */}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtra per stato NFC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i cestelli</SelectItem>
                <SelectItem value="with-nfc">Con tag NFC</SelectItem>
                <SelectItem value="without-nfc">Senza tag NFC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabella dei cestelli */}
      <Card>
        <CardHeader>
          <CardTitle>Lista cestelli</CardTitle>
          <CardDescription>
            {filteredBaskets.length} cestelli visualizzati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {basketsLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">N. Cestello</TableHead>
                    <TableHead>Flupsy</TableHead>
                    <TableHead>Posizione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Tag NFC</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBaskets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        Nessun cestello trovato con i filtri applicati
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBaskets.map((basket) => (
                      <TableRow key={basket.id}>
                        <TableCell className="font-medium">#{basket.physicalNumber}</TableCell>
                        <TableCell>{getFlupsyName(basket.flupsyId)}</TableCell>
                        <TableCell>{getBasketPosition(basket)}</TableCell>
                        <TableCell>
                          <Badge variant={basket.state === 'available' ? 'outline' : 'default'}>
                            {basket.state === 'available' ? 'Disponibile' : 'In uso'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {basket.nfcData ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                              Tag programmato
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Nessun tag
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPositionDialog(basket)}
                              className={basket.row && basket.position ? "bg-blue-50" : "bg-orange-50"}
                            >
                              <MapPinIcon className="mr-2 h-4 w-4" />
                              {basket.row && basket.position ? 'Modifica posizione' : 'Assegna posizione'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWriter(basket.id)}
                            >
                              <TagIcon className="mr-2 h-4 w-4" />
                              {basket.nfcData ? 'Riprogramma' : 'Programma'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog per il writer NFC */}
      <Dialog open={isWriterOpen} onOpenChange={setIsWriterOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedBasket && (
            <NFCWriter
              basketId={selectedBasket.id}
              basketNumber={selectedBasket.physicalNumber}
              onSuccess={handleWriteSuccess}
              onCancel={handleCloseWriter}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog per l'assegnazione della posizione */}
      <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedBasketForPosition?.row && selectedBasketForPosition?.position
                ? 'Modifica posizione del cestello'
                : 'Assegna posizione al cestello'}
            </DialogTitle>
            <DialogDescription>
              {selectedBasketForPosition && (
                <span>
                  Cestello #{selectedBasketForPosition.physicalNumber} - {getFlupsyName(selectedBasketForPosition.flupsyId)}
                  {selectedBasketForPosition.state === 'active' ? ' (In uso)' : ' (Disponibile)'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...positionForm}>
            <form onSubmit={handleSavePosition} className="space-y-4">
              <FormField
                control={positionForm.control}
                name="row"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fila</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. SX, DX, C" 
                        {...field} 
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={positionForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posizione</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. 1, 2, 3"
                        type="number"
                        min="1"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={handleClosePositionDialog}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateBasketPosition.isPending}>
                  {updateBasketPosition.isPending ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                      Salvataggio...
                    </>
                  ) : (
                    'Salva posizione'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}