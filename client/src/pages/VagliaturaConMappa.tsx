import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
// Utilizziamo un hook di traduzione semplificato
const useTranslation = () => {
  const t = (key: string) => key;
  return { t };
};

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

// Types
import { Flupsy, Basket, Selection, SourceBasket, DestinationBasket, Size } from '@/types';

// Componenti specifici per la vagliatura con mappa
import FlupsyMapVisualizer from '@/components/vagliatura-mappa/FlupsyMapVisualizer';

/**
 * Componente principale per la Vagliatura con Mappa
 * 
 * Questo componente implementa una nuova interfaccia per la vagliatura
 * che utilizza una rappresentazione visuale dei FLUPSY e dei cestelli.
 */
export default function VagliaturaConMappa() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Stato della vagliatura
  const [currentTab, setCurrentTab] = useState('selezione-origine');
  const [selection, setSelection] = useState<Partial<Selection>>({
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    selectionNumber: 0,
    notes: '',
    purpose: 'vagliatura',
    screeningType: 'standard',
    // Necessario per calcoli animali per taglia
    referenceSizeId: null
  });
  
  // Cestelli selezionati
  const [sourceBaskets, setSourceBaskets] = useState<SourceBasket[]>([]);
  const [destinationBaskets, setDestinationBaskets] = useState<DestinationBasket[]>([]);
  
  // FLUPSY selezionato per la visualizzazione
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<string | null>(null);
  
  // Valori calcolati per il numero di animali
  const [calculatedValues, setCalculatedValues] = useState({
    totalAnimals: 0,
    animalsPerKg: 0,
    mortalityRate: 0,
    sizeId: null as number | null
  });
  
  // Stato per il dialogo di vendita diretta
  const [isDirectSaleDialogOpen, setIsDirectSaleDialogOpen] = useState(false);
  const [directSaleData, setDirectSaleData] = useState({
    client: 'Cliente',
    date: new Date().toISOString().split('T')[0],
    animalCount: 0,
    totalWeight: 0,
    animalsPerKg: 0,
    selectedBasketId: null as number | null
  });
  
  // Query per i dati
  const { data: flupsys = [], isLoading: isLoadingFlupsys } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
    enabled: true
  });
  
  const { data: baskets = [], isLoading: isLoadingBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets', { includeAll: true }],
    enabled: true
  });
  
  // Query per le taglie
  const { data: sizes = [], isLoading: isLoadingSizes } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
    enabled: true
  });
  
  // Mutazione per completare la vagliatura
  const completeScreeningMutation = useMutation({
    mutationFn: async (screeningData: any) => {
      // Prima completa la selezione
      return await apiRequest(`/api/selections/${screeningData.selectionId}/complete`, 'POST', screeningData);
    },
    onSuccess: () => {
      toast({
        title: "Vagliatura completata",
        description: "La vagliatura è stata completata con successo",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/selections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  });
  
  // Funzione per aggiungere vendita diretta
  const handleAddDirectSale = () => {
    // Ottieni tutti i cestelli disponibili che non sono già selezionati come destinazione
    const availableBaskets = baskets.filter(basket => 
      !destinationBaskets.some(db => db.basketId === basket.id)
    );
    
    if (availableBaskets.length === 0) {
      toast({
        title: "Nessun cestello disponibile",
        description: "Non ci sono cestelli disponibili per la vendita diretta",
        variant: "destructive"
      });
      return;
    }
    
    // Calcola i valori predefiniti per la vendita
    let animalCount = 0;
    let animalsPerKg = 0;
    let totalWeight = 0;
    
    if (sourceBaskets.length > 0) {
      // Calcola il numero di animali dividendo equamente
      const existingSoldBaskets = destinationBaskets.filter(db => db.destinationType === 'sold').length;
      animalCount = Math.floor(calculatedValues.totalAnimals / (existingSoldBaskets + 1));
      animalsPerKg = calculatedValues.animalsPerKg;
      
      // Stima del peso totale
      if (animalsPerKg > 0) {
        totalWeight = Math.round((animalCount / animalsPerKg) * 1000) / 1000;
      }
    }
    
    // Imposta i dati di vendita e apri il dialogo
    setDirectSaleData({
      client: 'Cliente',
      date: new Date().toISOString().split('T')[0],
      animalCount,
      totalWeight,
      animalsPerKg,
      selectedBasketId: availableBaskets[0].id
    });
    
    setIsDirectSaleDialogOpen(true);
  };
  
  // Funzione per confermare l'aggiunta di un cestello vendita dopo la compilazione del form
  const confirmDirectSale = () => {
    if (!directSaleData.selectedBasketId) return;
    
    const selectedBasket = baskets.find(b => b.id === directSaleData.selectedBasketId);
    if (!selectedBasket) return;
    
    // Crea un nuovo cestello destinazione di tipo vendita con i dati inseriti
    const newDestinationBasket: DestinationBasket = {
      basketId: selectedBasket.id,
      physicalNumber: selectedBasket.physicalNumber,
      // Mantieni il flupsyId per evitare errori di vincolo nel database
      flupsyId: selectedBasket.flupsyId || 0,
      position: selectedBasket.position?.toString() || '',
      destinationType: 'sold',
      animalCount: directSaleData.animalCount,
      deadCount: 0,
      sampleWeight: 0,
      sampleCount: 0,
      totalWeight: directSaleData.totalWeight,
      animalsPerKg: directSaleData.animalsPerKg,
      saleDate: directSaleData.date,
      saleClient: directSaleData.client,
      selectionId: 0,
      sizeId: calculatedValues.sizeId || 0,
      isAlsoSource: sourceBaskets.some(sb => sb.basketId === selectedBasket.id)
    };
    
    setDestinationBaskets(prev => [...prev, newDestinationBasket]);
    setIsDirectSaleDialogOpen(false);
    
    toast({
      title: "Vendita diretta aggiunta",
      description: `Cestello #${selectedBasket.physicalNumber} aggiunto come vendita diretta`,
    });
  };
  
  // Funzione per iniziare una nuova vagliatura
  const handleStartNewScreening = async () => {
    // Qui implementeremo la logica per iniziare una nuova vagliatura
    toast({
      title: "Nuova vagliatura iniziata",
      description: "Seleziona i cestelli origine dalla mappa"
    });
    setCurrentTab('selezione-origine');
  };
  
  // Funzione per selezionare/deselezionare un cestello origine
  const toggleSourceBasket = (basket: Basket) => {
    // Verifica se il cestello è già selezionato
    const isAlreadySelected = sourceBaskets.some(sb => sb.basketId === basket.id);
    
    if (isAlreadySelected) {
      // Rimuovi il cestello dalla selezione
      setSourceBaskets(prev => {
        const newSourceBaskets = prev.filter(sb => sb.basketId !== basket.id);
        // Ricalcola i valori totali
        updateCalculatedValues(newSourceBaskets);
        return newSourceBaskets;
      });
    } else {
      // Aggiungi il cestello alla selezione
      const newSourceBasket: SourceBasket = {
        basketId: basket.id,
        cycleId: basket.currentCycleId || 0,
        animalCount: basket.lastOperation?.animalCount || 0,
        totalWeight: basket.lastOperation?.totalWeight || 0,
        animalsPerKg: basket.lastOperation?.animalsPerKg || 0,
        flupsyId: basket.flupsyId,
        position: basket.position?.toString() || '',
        physicalNumber: basket.physicalNumber,
        selectionId: 0 // Sarà aggiornato quando la selezione viene salvata
      };
      
      const newSourceBaskets = [...sourceBaskets, newSourceBasket];
      setSourceBaskets(newSourceBaskets);
      
      // Ricalcola i valori totali
      updateCalculatedValues(newSourceBaskets);
    }
  };
  
  // Funzione per calcolare i valori aggregati dai cestelli origine
  const updateCalculatedValues = (baskets: SourceBasket[]) => {
    if (baskets.length === 0) {
      setCalculatedValues({
        totalAnimals: 0,
        animalsPerKg: 0,
        mortalityRate: 0,
        sizeId: null
      });
      return;
    }
    
    // Calcola il totale degli animali
    const totalAnimals = baskets.reduce((sum, basket) => sum + (basket.animalCount || 0), 0);
    
    // Calcola animali per kg (media ponderata)
    const totalWeightSum = baskets.reduce((sum, basket) => sum + (basket.totalWeight || 0), 0);
    let animalsPerKg = 0;
    
    if (totalWeightSum > 0) {
      const weightedSum = baskets.reduce((sum, basket) => {
        if (basket.totalWeight && basket.totalWeight > 0 && basket.animalsPerKg) {
          return sum + (basket.animalsPerKg * basket.totalWeight);
        }
        return sum;
      }, 0);
      animalsPerKg = Math.round(weightedSum / totalWeightSum);
    }
    
    // Determina la taglia in base agli animali per kg
    let sizeId = null;
    if (animalsPerKg > 0 && sizes) {
      const matchingSize = sizes.find(size => 
        animalsPerKg >= size.min && animalsPerKg <= size.max
      );
      if (matchingSize) {
        sizeId = matchingSize.id;
      }
    }
    
    // Aggiorna i valori calcolati
    setCalculatedValues({
      totalAnimals,
      animalsPerKg,
      mortalityRate: 0, // Per ora lo impostiamo a 0
      sizeId
    });
    
    // Aggiorna anche la taglia di riferimento nella selezione
    setSelection(prev => ({
      ...prev,
      referenceSizeId: sizeId
    }));
  };
  
  // Funzione per selezionare/deselezionare un cestello destinazione
  const toggleDestinationBasket = (basket: Basket, destinationType: 'placed' | 'sold' = 'placed') => {
    // Verifica se il cestello è già selezionato
    const isAlreadySelected = destinationBaskets.some(db => db.basketId === basket.id);
    
    if (isAlreadySelected) {
      // Rimuovi il cestello dalla selezione
      setDestinationBaskets(prev => prev.filter(db => db.basketId !== basket.id));
    } else {
      // Verifica se questo cestello è anche un cestello origine
      const isAlsoSource = sourceBaskets.some(sb => sb.basketId === basket.id);
      
      // Calcola i valori predefiniti in base al tipo di destinazione
      let animalCount = 0;
      let deadCount = 0;
      let sampleWeight = 0;
      let sampleCount = 0;
      let totalWeight = 0;
      let animalsPerKg = 0;
      let sizeId = null;
      
      // Se è vendita diretta, calcola i valori in base ai cestelli origine
      if (destinationType === 'sold' && calculatedValues.totalAnimals > 0) {
        // Dividi gli animali equamente tra i cestelli venduti (considerando anche questo nuovo)
        const existingSoldBaskets = destinationBaskets.filter(db => db.destinationType === 'sold').length;
        animalCount = Math.floor(calculatedValues.totalAnimals / (existingSoldBaskets + 1));
        animalsPerKg = calculatedValues.animalsPerKg;
        sizeId = calculatedValues.sizeId;
        
        // Stima del peso totale
        if (animalsPerKg > 0) {
          totalWeight = Math.round((animalCount / animalsPerKg) * 1000) / 1000; // Arrotonda a 3 decimali
        }
        
        // Mostra un messaggio di conferma per la vendita
        toast({
          title: "Cestello per vendita",
          description: `Cestello #${basket.physicalNumber} aggiunto come vendita diretta con ${animalCount} animali`,
        });
      }
      
      // Aggiungi il cestello alla selezione
      const newDestinationBasket: DestinationBasket = {
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        // Per vendita, impostiamo flupsyId a un valore predefinito (non null)
        flupsyId: destinationType === 'sold' ? (basket.flupsyId || 0) : basket.flupsyId,
        position: basket.position?.toString() || '',
        destinationType: destinationType,
        animalCount: animalCount, 
        deadCount: deadCount,
        sampleWeight: sampleWeight,
        sampleCount: sampleCount,
        totalWeight: totalWeight,
        animalsPerKg: animalsPerKg,
        saleDate: destinationType === 'sold' ? new Date().toISOString().split('T')[0] : null,
        saleClient: destinationType === 'sold' ? 'Cliente' : null,
        selectionId: 0, // Sarà aggiornato quando la selezione viene salvata
        sizeId: sizeId || 0, // Usa la taglia calcolata o 0 come valore predefinito
        isAlsoSource: isAlsoSource // Flag per riconoscere cestelli che sono anche origine
      };
      
      setDestinationBaskets(prev => [...prev, newDestinationBasket]);
    }
  };
  
  // Funzione per completare la vagliatura
  const handleCompleteScreening = async () => {
    if (sourceBaskets.length === 0) {
      toast({
        title: "Errore",
        description: "Devi selezionare almeno un cestello origine",
        variant: "destructive"
      });
      return;
    }
    
    if (destinationBaskets.length === 0) {
      toast({
        title: "Errore",
        description: "Devi selezionare almeno un cestello destinazione",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Passo 1: Creare la selezione (vagliatura) se non esiste già
      let selectionId = selection.id;
      
      if (!selectionId) {
        // Preparazione dei dati per la creazione della selezione
        const createSelectionData = {
          date: selection.date,
          notes: selection.notes || "",
          purpose: "vagliatura",
          screeningType: selection.screeningType || "standard",
          referenceSizeId: selection.referenceSizeId
        };
        
        const createResponse = await fetch('/api/selections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createSelectionData)
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.message || 'Si è verificato un errore durante la creazione della vagliatura');
        }
        
        selectionId = createData.id;
        
        // Aggiorna l'ID della selezione nel componente
        setSelection(prev => ({
          ...prev,
          id: selectionId,
          selectionNumber: createData.selectionNumber
        }));
      }
      
      // Passo 2: Aggiungere i cestelli origine
      const sourceResponse = await fetch(`/api/selections/${selectionId}/source-baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          sourceBaskets: sourceBaskets.map(sb => ({
            ...sb,
            selectionId
          }))
        })
      });
      
      if (!sourceResponse.ok) {
        const sourceError = await sourceResponse.json();
        throw new Error(sourceError.message || 'Si è verificato un errore durante l\'aggiunta dei cestelli origine');
      }
      
      // Passo 3: Aggiungere i cestelli destinazione
      const destinationResponse = await fetch(`/api/selections/${selectionId}/destination-baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          destinationBaskets: destinationBaskets.map(db => ({
            ...db,
            selectionId
          }))
        })
      });
      
      if (!destinationResponse.ok) {
        const destError = await destinationResponse.json();
        throw new Error(destError.message || 'Si è verificato un errore durante l\'aggiunta dei cestelli destinazione');
      }
      
      // Passo 4: Completare la selezione (attiva le operazioni e chiude i cicli)
      const completeResponse = await fetch(`/api/selections/${selectionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const completeData = await completeResponse.json();
      
      if (!completeResponse.ok) {
        throw new Error(completeData.message || 'Si è verificato un errore durante il completamento della vagliatura');
      }
      
      toast({
        title: "Vagliatura completata",
        description: `Vagliatura #${selection.selectionNumber || completeData.selection?.selectionNumber} completata con successo!`,
        variant: "success"
      });
      
      // Reindirizza alla pagina di dettaglio della selezione
      window.location.href = `/selection/${selectionId}`;
    } catch (error) {
      console.error('Errore durante il completamento della vagliatura:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : 'Si è verificato un errore sconosciuto',
        variant: "destructive"
      });
    }
  };
  
  // Funzione per annullare la vagliatura
  const handleCancelScreening = async () => {
    // Qui implementeremo la logica per annullare la vagliatura
    toast({
      title: "Vagliatura annullata",
      description: "Tutte le modifiche sono state annullate"
    });
  };
  
  // Renderizza il componente
  return (
    <div className="container mx-auto py-6">
      <Helmet>
        <title>Vagliatura con Mappa - FLUPSY Manager</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vagliatura con Mappa</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleCancelScreening}>
            Annulla
          </Button>
          <Button variant="default" onClick={handleStartNewScreening}>
            Nuova Vagliatura
          </Button>
        </div>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selezione-origine">1. Cestelli Origine</TabsTrigger>
          <TabsTrigger value="selezione-destinazione">2. Cestelli Destinazione</TabsTrigger>
          <TabsTrigger value="riepilogo">3. Riepilogo e Conferma</TabsTrigger>
        </TabsList>
        
        <TabsContent value="selezione-origine" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Cestelli Origine</CardTitle>
              <CardDescription>
                Seleziona i cestelli origine dalla mappa del FLUPSY. 
                I cestelli selezionati saranno evidenziati in blu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="flupsySelect">Seleziona FLUPSY</Label>
                <Select 
                  value={selectedFlupsyId || ''} 
                  onValueChange={setSelectedFlupsyId}
                >
                  <SelectTrigger id="flupsySelect">
                    <SelectValue placeholder="Seleziona un FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFlupsys ? (
                      <div className="flex justify-center py-2">
                        <Spinner size="sm" />
                      </div>
                    ) : flupsys.map((flupsy: Flupsy) => (
                      <SelectItem 
                        key={flupsy.id} 
                        value={flupsy.id.toString()}
                      >
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Qui andrà la mappa visuale del FLUPSY */}
              <div className="mt-4 border rounded-md p-4">
                <p className="text-center text-muted-foreground">
                  {selectedFlupsyId 
                    ? "Seleziona i cestelli origine cliccando sui riquadri" 
                    : "Seleziona prima un FLUPSY"}
                </p>
                
                {/* Visualizzatore della mappa del FLUPSY */}
                <div className="min-h-[400px] mt-4 rounded-md">
                  {isLoadingFlupsys || isLoadingBaskets ? (
                    <div className="flex justify-center items-center h-80 bg-muted/20">
                      <Spinner />
                    </div>
                  ) : !selectedFlupsyId ? (
                    <div className="flex justify-center items-center h-80 bg-muted/20 rounded-md">
                      <p>Seleziona un FLUPSY per visualizzare la mappa</p>
                    </div>
                  ) : (
                    <FlupsyMapVisualizer
                      flupsy={(flupsys || []).find(f => f.id.toString() === selectedFlupsyId) || { id: 0, name: '', maxPositions: 0 }}
                      baskets={(baskets || []).filter(b => b.flupsyId?.toString() === selectedFlupsyId)}
                      sourceBaskets={sourceBaskets.map(sb => sb.basketId)}
                      destinationBaskets={destinationBaskets.map(db => db.basketId)}
                      onBasketClick={(basket, position) => toggleSourceBasket(basket)}
                      mode="source"
                      showTooltips={true}
                    />
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {}}>
                Indietro
              </Button>
              <Button 
                variant="default" 
                onClick={() => setCurrentTab('selezione-destinazione')}
                disabled={sourceBaskets.length === 0}
              >
                Avanti: Seleziona Destinazioni
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="selezione-destinazione" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Cestelli Destinazione</CardTitle>
              <CardDescription>
                Seleziona i cestelli destinazione dalla mappa del FLUPSY o scegli l'opzione vendita.
                I cestelli destinazione saranno evidenziati in verde.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="flupsySelectDest">Seleziona FLUPSY</Label>
                <Select 
                  value={selectedFlupsyId || ''} 
                  onValueChange={setSelectedFlupsyId}
                >
                  <SelectTrigger id="flupsySelectDest">
                    <SelectValue placeholder="Seleziona un FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFlupsys ? (
                      <div className="flex justify-center py-2">
                        <Spinner size="sm" />
                      </div>
                    ) : flupsys.map((flupsy: Flupsy) => (
                      <SelectItem 
                        key={flupsy.id} 
                        value={flupsy.id.toString()}
                      >
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Qui andrà la mappa visuale del FLUPSY */}
              <div className="mt-4 border rounded-md p-4">
                <p className="text-center text-muted-foreground">
                  {selectedFlupsyId 
                    ? "Seleziona i cestelli destinazione cliccando sui riquadri" 
                    : "Seleziona prima un FLUPSY"}
                </p>
                
                {/* Visualizzatore della mappa del FLUPSY */}
                <div className="min-h-[400px] mt-4 rounded-md">
                  {isLoadingFlupsys || isLoadingBaskets ? (
                    <div className="flex justify-center items-center h-80 bg-muted/20">
                      <Spinner />
                    </div>
                  ) : !selectedFlupsyId ? (
                    <div className="flex justify-center items-center h-80 bg-muted/20 rounded-md">
                      <p>Seleziona un FLUPSY per visualizzare la mappa</p>
                    </div>
                  ) : (
                    <FlupsyMapVisualizer
                      flupsy={(flupsys || []).find(f => f.id.toString() === selectedFlupsyId) || { id: 0, name: '', maxPositions: 0 }}
                      baskets={(baskets || []).filter(b => b.flupsyId?.toString() === selectedFlupsyId)}
                      sourceBaskets={sourceBaskets.map(sb => sb.basketId)}
                      destinationBaskets={destinationBaskets.map(db => db.basketId)}
                      onBasketClick={(basket, position) => toggleDestinationBasket(basket)}
                      mode="destination"
                      showTooltips={true}
                    />
                  )}
                </div>
              </div>
              
              {/* Opzione vendita diretta */}
              <div className="mt-6">
                <h3 className="text-lg font-medium">Vendita Diretta</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Seleziona questa opzione se i cestelli devono essere venduti direttamente
                </p>
                <Button 
                  variant="outline" 
                  className="border-dashed border-2"
                  onClick={() => {
                    // Ottieni tutti i cestelli disponibili che non sono già selezionati come destinazione
                    const availableBaskets = baskets.filter(basket => 
                      !destinationBaskets.some(db => db.basketId === basket.id)
                    );
                    
                    if (availableBaskets.length === 0) {
                      toast({
                        title: "Nessun cestello disponibile",
                        description: "Non ci sono cestelli disponibili per la vendita diretta",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Calcola i valori predefiniti per la vendita
                    let animalCount = 0;
                    let animalsPerKg = 0;
                    let totalWeight = 0;
                    
                    if (sourceBaskets.length > 0) {
                      // Calcola il numero di animali dividendo equamente
                      const existingSoldBaskets = destinationBaskets.filter(db => db.destinationType === 'sold').length;
                      animalCount = Math.floor(calculatedValues.totalAnimals / (existingSoldBaskets + 1));
                      animalsPerKg = calculatedValues.animalsPerKg;
                      
                      // Stima del peso totale
                      if (animalsPerKg > 0) {
                        totalWeight = Math.round((animalCount / animalsPerKg) * 1000) / 1000;
                      }
                    }
                    
                    // Imposta i dati di vendita e apri il dialogo
                    setDirectSaleData({
                      client: 'Cliente',
                      date: new Date().toISOString().split('T')[0],
                      animalCount,
                      totalWeight,
                      animalsPerKg,
                      selectedBasketId: availableBaskets[0].id
                    });
                    
                    setIsDirectSaleDialogOpen(true);
                  }}
                >
                  Aggiungi Vendita Diretta
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentTab('selezione-origine')}>
                Indietro
              </Button>
              <Button 
                variant="default" 
                onClick={() => setCurrentTab('riepilogo')}
                disabled={destinationBaskets.length === 0}
              >
                Avanti: Riepilogo
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="riepilogo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo e Conferma</CardTitle>
              <CardDescription>
                Verifica i dettagli della vagliatura prima di confermare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Informazioni generali */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Informazioni Generali</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Data</Label>
                      <Input 
                        id="date" 
                        type="date" 
                        value={selection.date} 
                        onChange={(e) => setSelection({...selection, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Note</Label>
                      <Input 
                        id="notes" 
                        value={selection.notes} 
                        onChange={(e) => setSelection({...selection, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Cestelli origine */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Cestelli Origine</h3>
                  {sourceBaskets.length === 0 ? (
                    <p className="text-muted-foreground">Nessun cestello origine selezionato</p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {sourceBaskets.map(basket => (
                        <div key={basket.basketId} className="p-3 flex justify-between items-center">
                          <div>
                            <span className="font-medium">Cestello #{basket.physicalNumber}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {basket.animalsPerKg ? `${basket.animalsPerKg} animali/kg` : ''}
                            </span>
                          </div>
                          <Badge variant="outline">{basket.animalCount} animali</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Cestelli destinazione */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Cestelli Destinazione</h3>
                  {destinationBaskets.length === 0 ? (
                    <p className="text-muted-foreground">Nessun cestello destinazione selezionato</p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {destinationBaskets.map(basket => (
                        <div key={basket.basketId} className="p-3 flex justify-between items-center">
                          <div>
                            <span className="font-medium">Cestello #{basket.physicalNumber}</span>
                            <span className="text-sm ml-2">
                              {basket.destinationType === 'sold' ? (
                                <Badge variant="destructive">Vendita</Badge>
                              ) : (
                                <Badge variant="outline">Posizionamento</Badge>
                              )}
                            </span>
                            {basket.isAlsoSource && (
                              <Badge variant="secondary" className="ml-2">Anche origine</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm">{basket.position || 'Posizione non specificata'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentTab('selezione-destinazione')}>
                Indietro
              </Button>
              <Button 
                variant="default" 
                onClick={handleCompleteScreening}
              >
                Completa Vagliatura
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}