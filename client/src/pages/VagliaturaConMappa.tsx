import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  const [, navigate] = useLocation();
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
  
  // Query per recuperare i cestelli con i dati completi delle ultime operazioni
  const { data: baskets = [], isLoading: isLoadingBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets', { includeAll: true }],
    enabled: true
  });
  
  // Query specifica per recuperare le operazioni più recenti
  const { data: operations = [], isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations', { includeAll: true }],
    enabled: true
  });
  
  // Funzione per arricchire i cestelli con i dati delle operazioni e taglie
  function getEnhancedBaskets() {
    if (!baskets || !Array.isArray(operations) || !Array.isArray(sizes)) return baskets;
    
    // Crea una mappa delle ultime operazioni per ogni cestello
    const lastOperationsMap: Record<number, any> = {};
    
    // Popola la mappa con le operazioni più recenti per ogni cestello
    operations.forEach((operation: any) => {
      const basketId = operation.basketId;
      
      // Se non c'è già un'operazione per questo cestello o questa è più recente, la memorizziamo
      if (!lastOperationsMap[basketId] || new Date(operation.date) > new Date(lastOperationsMap[basketId].date)) {
        lastOperationsMap[basketId] = {
          animalCount: operation.animalCount,
          totalWeight: operation.totalWeight,
          animalsPerKg: operation.animalsPerKg,
          date: operation.date,
          sizeId: operation.sizeId
        };
      }
    });
    
    // Determina la taglia in base agli animali per kg
    function findSizeByAnimalsPerKg(animalsPerKg: number) {
      // Valori basati sulla tabella sizes
      const sizeRanges = [
        { id: 27, code: 'TP-10000', min: 801, max: 1200 },
        { id: 26, code: 'TP-9000', min: 1201, max: 1800 },
        { id: 25, code: 'TP-8000', min: 1801, max: 2300 },
        { id: 24, code: 'TP-7000', min: 2301, max: 3000 },
        { id: 23, code: 'TP-6000', min: 3001, max: 3900 },
        { id: 22, code: 'TP-5000', min: 3901, max: 7500 },
        { id: 21, code: 'TP-4000', min: 7501, max: 12500 },
        { id: 20, code: 'TP-3500', min: 12501, max: 19000 },
        { id: 19, code: 'TP-3000', min: 19001, max: 32000 },
        { id: 18, code: 'TP-2800', min: 32001, max: 40000 },
        { id: 17, code: 'TP-2500', min: 40001, max: 60000 },
        { id: 16, code: 'TP-2200', min: 60001, max: 70000 },
        { id: 15, code: 'TP-2000', min: 70001, max: 97000 },
        { id: 14, code: 'TP-1900', min: 97001, max: 120000 },
        { id: 13, code: 'TP-1800', min: 120001, max: 190000 },
        { id: 12, code: 'TP-1500', min: 190001, max: 300000 },
        { id: 11, code: 'TP-1260', min: 300001, max: 350000 },
        { id: 10, code: 'TP-1140', min: 350001, max: 600000 },
        { id: 9, code: 'TP-1000', min: 600001, max: 880000 },
        { id: 8, code: 'TP-800', min: 880001, max: 1500000 },
        { id: 7, code: 'TP-700', min: 1500001, max: 1800000 },
        { id: 6, code: 'TP-600', min: 1800001, max: 3400000 },
        { id: 1, code: 'TP-500', min: 3400001, max: 5000000 },
        { id: 5, code: 'TP-450', min: 5000001, max: 7600000 },
        { id: 4, code: 'TP-315', min: 7600001, max: 16000000 },
        { id: 3, code: 'TP-200', min: 16000001, max: 42000000 },
        { id: 2, code: 'TP-180', min: 42000001, max: 100000000 }
      ];
      
      const sizeRange = sizeRanges.find(range => 
        animalsPerKg >= range.min && animalsPerKg <= range.max
      );
      
      if (sizeRange) {
        return {
          id: sizeRange.id,
          code: sizeRange.code,
          min: sizeRange.min,
          max: sizeRange.max
        };
      }
      
      return undefined;
    }
    
    // Arricchisci i cestelli con operazioni e taglie
    return baskets.map(basket => {
      const lastOperation = lastOperationsMap[basket.id];
      let size;
      
      if (lastOperation?.sizeId) {
        // Se l'operazione ha un ID taglia, usiamo quello
        size = sizes.find((s: any) => s.id === lastOperation.sizeId);
      } else if (lastOperation?.animalsPerKg) {
        // Altrimenti proviamo a determinare la taglia dagli animali per kg
        size = findSizeByAnimalsPerKg(lastOperation.animalsPerKg);
      }
      
      return {
        ...basket,
        lastOperation: lastOperation || undefined,
        size: size || undefined
      };
    });
  };
  
  // Query per le taglie
  const { data: sizes = [], isLoading: isLoadingSizes } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
    enabled: true
  });
  
  // Mutazione per completare la vagliatura
  const completeScreeningMutation = useMutation({
    mutationFn: async (screeningData: any) => {
      // Prima completa la selezione
      const response = await fetch(`/api/selections/${screeningData.selectionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(screeningData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il completamento della selezione');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vagliatura completata",
        description: "La vagliatura è stata completata con successo",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/selections'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  });
  
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

  // Funzione per iniziare una nuova vagliatura
  const handleStartNewScreening = async () => {
    setSelection({
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      selectionNumber: 0,
      notes: '',
      purpose: 'vagliatura',
      screeningType: 'standard',
      referenceSizeId: null
    });
    setCurrentTab('selezione-origine');
  };
  
  // Funzione per selezionare/deselezionare un cestello origine
  const toggleSourceBasket = (basket: any) => {
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
  
  // Stato per il dialogo di misurazione (sia posizionamento che vendita)
  const [isMeasurementDialogOpen, setIsMeasurementDialogOpen] = useState(false);
  const [measurementData, setMeasurementData] = useState({
    basketId: 0,
    physicalNumber: 0,
    flupsyId: 0,
    position: '',
    destinationType: 'placed' as 'placed' | 'sold',
    sampleWeight: 100, // grammi
    sampleCount: 0,
    totalWeight: 0, // kg
    deadCount: 0,
    animalCount: 0,
    animalsPerKg: 0,
    mortalityRate: 0,
    saleDate: new Date().toISOString().split('T')[0],
    saleClient: 'Cliente',
    isAlsoSource: false,
    sizeId: 0
  });

  // Funzione per calcolare i valori basati sui dati di misurazione
  const calculateMeasurementValues = (data: any) => {
    const newData = { ...data };
    
    // Calcola animali per kg
    if (newData.sampleWeight > 0 && newData.sampleCount > 0) {
      newData.animalsPerKg = Math.round((newData.sampleCount / newData.sampleWeight) * 1000);
    }
    
    // Calcola numero totale di animali
    if (newData.totalWeight > 0 && newData.animalsPerKg > 0) {
      newData.animalCount = Math.round(newData.totalWeight * newData.animalsPerKg);
    }
    
    // Calcola percentuale di mortalità
    if (newData.animalCount > 0 && newData.deadCount > 0) {
      newData.mortalityRate = Math.round((newData.deadCount / (newData.animalCount + newData.deadCount)) * 10000) / 100;
    } else {
      newData.mortalityRate = 0;
    }
    
    // Determina la taglia in base agli animali per kg
    if (newData.animalsPerKg > 0 && sizes) {
      const matchingSize = sizes.find(size => 
        newData.animalsPerKg >= size.min && newData.animalsPerKg <= size.max
      );
      if (matchingSize) {
        newData.sizeId = matchingSize.id;
      }
    }
    
    return newData;
  };

  // Funzione per selezionare/deselezionare un cestello destinazione
  const toggleDestinationBasket = (basket: any, destinationType: 'placed' | 'sold' = 'placed') => {
    // Verifica se il cestello è già selezionato
    const isAlreadySelected = destinationBaskets.some(db => db.basketId === basket.id);
    
    if (isAlreadySelected) {
      // Rimuovi il cestello dalla selezione
      setDestinationBaskets(prev => prev.filter(db => db.basketId !== basket.id));
    } else {
      // Verifica se questo cestello è anche un cestello origine
      const isAlsoSource = sourceBaskets.some(sb => sb.basketId === basket.id);
      
      // Prepara i dati iniziali per il dialogo di misurazione
      let initialMeasurementData = {
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyId: destinationType === 'sold' ? (basket.flupsyId || 0) : basket.flupsyId,
        position: basket.position?.toString() || '',
        destinationType: destinationType,
        sampleWeight: 100, // grammi
        sampleCount: 0,
        totalWeight: 0, // kg
        deadCount: 0,
        animalCount: 0,
        animalsPerKg: calculatedValues.animalsPerKg || 0,
        mortalityRate: 0,
        saleDate: new Date().toISOString().split('T')[0],
        saleClient: 'Cliente',
        isAlsoSource: isAlsoSource,
        sizeId: calculatedValues.sizeId || 0
      };
      
      // Se è vendita diretta, calcola i valori in base ai cestelli origine
      if (destinationType === 'sold' && calculatedValues.totalAnimals > 0) {
        // Dividi gli animali equamente tra i cestelli venduti (considerando anche questo nuovo)
        const existingSoldBaskets = destinationBaskets.filter(db => db.destinationType === 'sold').length;
        const estimatedAnimalCount = Math.floor(calculatedValues.totalAnimals / (existingSoldBaskets + 1));
        
        // Stima del peso totale
        let estimatedTotalWeight = 0;
        if (calculatedValues.animalsPerKg > 0) {
          estimatedTotalWeight = Math.round((estimatedAnimalCount / calculatedValues.animalsPerKg) * 1000) / 1000; // Arrotonda a 3 decimali
        }
        
        // Aggiorna i dati iniziali
        initialMeasurementData = {
          ...initialMeasurementData,
          animalCount: estimatedAnimalCount,
          totalWeight: estimatedTotalWeight,
          animalsPerKg: calculatedValues.animalsPerKg,
          sizeId: calculatedValues.sizeId || 0
        };
        
        // Apri il dialogo di vendita diretta
        setMeasurementData(initialMeasurementData);
        setDirectSaleData({
          client: 'Cliente',
          date: new Date().toISOString().split('T')[0],
          animalCount: estimatedAnimalCount,
          totalWeight: estimatedTotalWeight,
          animalsPerKg: calculatedValues.animalsPerKg,
          selectedBasketId: basket.id
        });
        
        setIsDirectSaleDialogOpen(true);
      } else {
        // Per posizionamento normale, apri il dialogo di misurazione
        setMeasurementData(initialMeasurementData);
        setIsMeasurementDialogOpen(true);
      }
    }
  };
  
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
          purpose: selection.purpose,
          notes: selection.notes,
          screeningType: selection.screeningType,
          referenceSizeId: selection.referenceSizeId
        };
        
        // Crea la selezione
        const selectionResponse = await fetch('/api/selections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createSelectionData)
        });
        
        if (!selectionResponse.ok) {
          const error = await selectionResponse.json();
          throw new Error(error.message || 'Errore durante la creazione della selezione');
        }
        
        const newSelection = await selectionResponse.json();
        selectionId = newSelection.id;
        
        // Aggiorna lo stato locale con l'ID della selezione creata
        setSelection(prev => ({
          ...prev,
          id: selectionId,
          selectionNumber: newSelection.selectionNumber
        }));
        
        // Passo 2: Aggiungere i cestelli origine
        const sourceBasketData = sourceBaskets.map(basket => ({
          ...basket,
          selectionId
        }));
        
        const sourceResponse = await fetch(`/api/selections/${selectionId}/source-baskets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sourceBasketData)
        });
        
        if (!sourceResponse.ok) {
          const error = await sourceResponse.json();
          throw new Error(error.message || 'Errore durante l\'aggiunta dei cestelli origine');
        }
        
        // Passo 3: Aggiungere i cestelli destinazione
        const destinationBasketData = destinationBaskets.map(basket => ({
          ...basket,
          selectionId
        }));
        
        const destinationResponse = await fetch(`/api/selections/${selectionId}/destination-baskets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(destinationBasketData)
        });
        
        if (!destinationResponse.ok) {
          const error = await destinationResponse.json();
          throw new Error(error.message || 'Errore durante l\'aggiunta dei cestelli destinazione');
        }
      }
      
      // Passo 4: Completare la selezione
      completeScreeningMutation.mutate({ selectionId });
      
    } catch (error: any) {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Helmet>
        <title>Vagliatura con Mappa | Flupsy Manager</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vagliatura con Mappa</h1>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="selezione-origine">1. Cestelli Origine</TabsTrigger>
          <TabsTrigger value="selezione-destinazione">2. Cestelli Destinazione</TabsTrigger>
          <TabsTrigger value="riepilogo">3. Riepilogo e Conferma</TabsTrigger>
        </TabsList>
        
        <TabsContent value="selezione-origine" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Cestelli Origine</CardTitle>
              <CardDescription>
                Seleziona i cestelli origine dalla mappa del FLUPSY. I cestelli origine saranno evidenziati in blu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selettore FLUPSY */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1">
                  <div className="space-y-4 sticky top-4">
                    <div>
                      <Label htmlFor="flupsy">Seleziona FLUPSY</Label>
                      <Select 
                        value={selectedFlupsyId || undefined} 
                        onValueChange={setSelectedFlupsyId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un FLUPSY" />
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
                    
                    {sourceBaskets.length > 0 && (
                      <div className="border rounded-md p-3">
                        <h3 className="text-sm font-semibold mb-2">Cestelli Selezionati ({sourceBaskets.length})</h3>
                        <div className="max-h-[200px] overflow-y-auto">
                          {sourceBaskets.map(basket => {
                            const basketDetails = baskets.find(b => b.id === basket.basketId);
                            return (
                              <div key={basket.basketId} className="text-xs p-1 border-b last:border-b-0">
                                Cestello #{basketDetails?.physicalNumber} 
                                {basketDetails?.lastOperation?.animalCount && 
                                  ` - ${basketDetails.lastOperation.animalCount.toLocaleString()} animali`
                                }
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold mb-2">Cestelli Totali</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Animali totali:</div>
                        <div className="text-right font-semibold">{calculatedValues.totalAnimals.toLocaleString()}</div>
                        <div>Animali/kg:</div>
                        <div className="text-right font-semibold">{calculatedValues.animalsPerKg}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Visualizzatore FLUPSY - Sempre in primo piano */}
                <div className="lg:col-span-3">
                  <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] flex items-center justify-center">
                    {isLoadingFlupsys || isLoadingBaskets ? (
                      <Spinner className="h-8 w-8" />
                    ) : !selectedFlupsyId ? (
                      <p className="text-muted-foreground">Seleziona un FLUPSY per visualizzare i cestelli</p>
                    ) : (
                      <FlupsyMapVisualizer 
                        flupsyId={String(selectedFlupsyId)}
                        baskets={getEnhancedBaskets()}
                        selectedBaskets={sourceBaskets.map(b => b.basketId)}
                        onBasketClick={toggleSourceBasket}
                        mode="source"
                        showTooltips={true}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/')}>
                Annulla
              </Button>
              <Button 
                variant="default" 
                onClick={() => setCurrentTab('selezione-destinazione')}
                disabled={sourceBaskets.length === 0}
              >
                Avanti: Cestelli Destinazione
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="selezione-destinazione" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Cestelli Destinazione</CardTitle>
              <CardDescription>
                Seleziona i cestelli destinazione dalla mappa del FLUPSY o scegli l'opzione vendita. I cestelli destinazione saranno evidenziati in verde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1">
                  <div className="space-y-4 sticky top-4">
                    <div>
                      <Label htmlFor="flupsy">Seleziona FLUPSY</Label>
                      <Select 
                        value={selectedFlupsyId || undefined} 
                        onValueChange={setSelectedFlupsyId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un FLUPSY" />
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
                    
                    {/* Opzione vendita diretta */}
                    <div className="border rounded-md p-3">
                      <h3 className="text-sm font-semibold mb-2">Vendita Diretta</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Seleziona questa opzione se i cestelli devono essere venduti direttamente
                      </p>
                      <Button 
                        variant="outline" 
                        className="border-dashed border-2 w-full"
                        onClick={handleAddDirectSale}
                      >
                        Aggiungi Vendita Diretta
                      </Button>
                    </div>
                    
                    {destinationBaskets.length > 0 && (
                      <div className="border rounded-md p-3">
                        <h3 className="text-sm font-semibold mb-2">Cestelli Selezionati ({destinationBaskets.length})</h3>
                        <div className="max-h-[200px] overflow-y-auto">
                          {destinationBaskets.map(basket => {
                            const basketDetails = baskets.find(b => b.id === basket.basketId);
                            return (
                              <div key={basket.basketId} className="text-xs p-1 border-b last:border-b-0 flex justify-between">
                                <span>Cestello #{basketDetails?.physicalNumber}</span>
                                <Badge variant={basket.destinationType === 'sold' ? 'destructive' : 'outline'}>
                                  {basket.destinationType === 'sold' ? 'Vendita' : 'Posizionamento'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Visualizzatore FLUPSY - Sempre in primo piano */}
                <div className="lg:col-span-3">
                  <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] flex items-center justify-center">
                    {isLoadingFlupsys || isLoadingBaskets ? (
                      <Spinner className="h-8 w-8" />
                    ) : !selectedFlupsyId ? (
                      <p className="text-muted-foreground">Seleziona un FLUPSY per visualizzare i cestelli</p>
                    ) : (
                      <FlupsyMapVisualizer 
                        flupsyId={selectedFlupsyId}
                        baskets={baskets}
                        selectedBaskets={destinationBaskets.map(b => b.basketId)}
                        onBasketClick={(basket) => toggleDestinationBasket(basket)}
                        mode="destination"
                        showTooltips={true}
                      />
                    )}
                  </div>
                </div>
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
                        <div key={basket.basketId} className="p-3">
                          <div className="flex justify-between items-center mb-2">
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
                            <Badge variant="outline">{basket.animalCount || 0} animali</Badge>
                          </div>
                          
                          {/* Dettagli aggiuntivi per tutti i cestelli */}
                          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>
                              <span className="text-muted-foreground">Posizione: </span>
                              <span>{basket.position || 'Non specificata'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Animali/kg: </span>
                              <span>{basket.animalsPerKg || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Peso totale: </span>
                              <span>{basket.totalWeight || 0} kg</span>
                            </div>
                            
                            {/* Dettagli specifici per i cestelli in vendita */}
                            {basket.destinationType === 'sold' && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">Cliente: </span>
                                  <span>{basket.saleClient || 'Non specificato'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Data vendita: </span>
                                  <span>{basket.saleDate || new Date().toISOString().split('T')[0]}</span>
                                </div>
                                <div className="col-span-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                                    onClick={() => {
                                      setDirectSaleData({
                                        client: basket.saleClient || 'Cliente',
                                        date: basket.saleDate || new Date().toISOString().split('T')[0],
                                        animalCount: basket.animalCount || 0,
                                        totalWeight: basket.totalWeight || 0,
                                        animalsPerKg: basket.animalsPerKg || 0,
                                        selectedBasketId: basket.basketId
                                      });
                                      setIsDirectSaleDialogOpen(true);
                                    }}
                                  >
                                    Modifica dettagli vendita
                                  </Button>
                                </div>
                              </>
                            )}
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
      
      {/* Dialogo per la misurazione (posizionamento) */}
      <Dialog open={isMeasurementDialogOpen} onOpenChange={setIsMeasurementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Cesta Destinazione</DialogTitle>
            <DialogDescription>
              Inserisci i dati di misurazione per questo cestello.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Destinazione</h3>
              <Select 
                value="posiziona"
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue>Posiziona in FLUPSY</SelectValue>
                </SelectTrigger>
              </Select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="text-sm font-medium mb-3 text-center">Calcolatrice Misurazioni</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 bg-green-50 p-3 rounded-md">
                  <Label htmlFor="sampleWeight" className="text-green-700">Peso Campione (g)</Label>
                  <Input
                    id="sampleWeight"
                    type="number"
                    value={measurementData.sampleWeight}
                    className="border-green-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        sampleWeight: value
                      });
                      setMeasurementData(updatedData);
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                  <Label htmlFor="sampleCount" className="text-blue-700">N° Animali nel Campione</Label>
                  <Input
                    id="sampleCount"
                    type="number"
                    value={measurementData.sampleCount}
                    className="border-blue-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        sampleCount: value
                      });
                      setMeasurementData(updatedData);
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-yellow-50 p-3 rounded-md">
                  <Label htmlFor="totalWeight" className="text-yellow-700">Peso Totale Cesta (kg)</Label>
                  <Input
                    id="totalWeight"
                    type="number"
                    step="0.001"
                    value={measurementData.totalWeight}
                    className="border-yellow-200"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        totalWeight: value
                      });
                      setMeasurementData(updatedData);
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-red-50 p-3 rounded-md">
                  <Label htmlFor="deadCount" className="text-red-700">Animali Morti</Label>
                  <Input
                    id="deadCount"
                    type="number"
                    value={measurementData.deadCount}
                    className="border-red-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        deadCount: value
                      });
                      setMeasurementData(updatedData);
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-purple-50 p-3 rounded-md">
                  <Label htmlFor="animalsPerKg" className="text-purple-700">Animali per Kg</Label>
                  <Input
                    id="animalsPerKg"
                    type="number"
                    value={measurementData.animalsPerKg}
                    className="border-purple-200"
                    readOnly
                  />
                </div>
                
                <div className="space-y-2 bg-cyan-50 p-3 rounded-md">
                  <Label htmlFor="animalCount" className="text-cyan-700">Numero Totale Animali</Label>
                  <Input
                    id="animalCount"
                    type="number"
                    value={measurementData.animalCount}
                    className="border-cyan-200"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="mt-4 bg-orange-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <Label htmlFor="mortalityRate" className="text-orange-700">Percentuale Mortalità:</Label>
                  <div className="text-right font-bold text-orange-700">{measurementData.mortalityRate}%</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Posizione nel FLUPSY</h3>
              <Select 
                value={measurementData.position || undefined}
                onValueChange={(value) => setMeasurementData({...measurementData, position: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una posizione disponibile" />
                </SelectTrigger>
                <SelectContent>
                  {['DX1', 'DX2', 'DX3', 'DX4', 'DX5', 'SX1', 'SX2', 'SX3', 'SX4', 'SX5'].map(pos => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMeasurementDialogOpen(false)}>Annulla</Button>
            <Button onClick={() => {
              // Crea un nuovo cestello destinazione con i dati inseriti
              const newDestinationBasket: DestinationBasket = {
                basketId: measurementData.basketId,
                physicalNumber: measurementData.physicalNumber,
                flupsyId: measurementData.flupsyId,
                position: measurementData.position,
                destinationType: 'placed',
                animalCount: measurementData.animalCount,
                deadCount: measurementData.deadCount,
                sampleWeight: measurementData.sampleWeight,
                sampleCount: measurementData.sampleCount,
                totalWeight: measurementData.totalWeight,
                animalsPerKg: measurementData.animalsPerKg,
                saleDate: null,
                saleClient: null,
                selectionId: 0,
                sizeId: measurementData.sizeId,
                isAlsoSource: measurementData.isAlsoSource
              };
              
              setDestinationBaskets(prev => [...prev, newDestinationBasket]);
              
              toast({
                title: "Cestello aggiunto",
                description: `Cestello #${measurementData.physicalNumber} aggiunto come destinazione`,
              });
              
              setIsMeasurementDialogOpen(false);
            }}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogo per la vendita diretta */}
      <Dialog open={isDirectSaleDialogOpen} onOpenChange={setIsDirectSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Cesta Destinazione</DialogTitle>
            <DialogDescription>
              Inserisci i dati per la vendita diretta di questo cestello.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Destinazione</h3>
              <Select 
                value="vendita"
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue>Vendita Diretta</SelectValue>
                </SelectTrigger>
              </Select>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="text-sm font-medium mb-3 text-center">Calcolatrice Misurazioni</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 bg-green-50 p-3 rounded-md">
                  <Label htmlFor="sampleWeight" className="text-green-700">Peso Campione (g)</Label>
                  <Input
                    id="sampleWeight"
                    type="number"
                    value={measurementData.sampleWeight}
                    className="border-green-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        sampleWeight: value
                      });
                      setMeasurementData(updatedData);
                      setDirectSaleData({
                        ...directSaleData,
                        animalCount: updatedData.animalCount,
                        totalWeight: updatedData.totalWeight,
                        animalsPerKg: updatedData.animalsPerKg
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                  <Label htmlFor="sampleCount" className="text-blue-700">N° Animali nel Campione</Label>
                  <Input
                    id="sampleCount"
                    type="number"
                    value={measurementData.sampleCount}
                    className="border-blue-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        sampleCount: value
                      });
                      setMeasurementData(updatedData);
                      setDirectSaleData({
                        ...directSaleData,
                        animalCount: updatedData.animalCount,
                        totalWeight: updatedData.totalWeight,
                        animalsPerKg: updatedData.animalsPerKg
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-yellow-50 p-3 rounded-md">
                  <Label htmlFor="totalWeight" className="text-yellow-700">Peso Totale Cesta (kg)</Label>
                  <Input
                    id="totalWeight"
                    type="number"
                    step="0.001"
                    value={directSaleData.totalWeight}
                    className="border-yellow-200"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setDirectSaleData({
                        ...directSaleData,
                        totalWeight: value
                      });
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        totalWeight: value
                      });
                      setMeasurementData(updatedData);
                      setDirectSaleData(prev => ({
                        ...prev,
                        animalCount: updatedData.animalCount
                      }));
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-purple-50 p-3 rounded-md">
                  <Label htmlFor="animalsPerKg" className="text-purple-700">Animali per Kg</Label>
                  <Input
                    id="animalsPerKg"
                    type="number"
                    value={directSaleData.animalsPerKg}
                    className="border-purple-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setDirectSaleData({
                        ...directSaleData,
                        animalsPerKg: value
                      });
                      // Ricalcola il numero di animali
                      if (value > 0 && directSaleData.totalWeight > 0) {
                        setDirectSaleData(prev => ({
                          ...prev,
                          animalCount: Math.round(prev.totalWeight * value)
                        }));
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-2 bg-cyan-50 p-3 rounded-md">
                  <Label htmlFor="animalCount" className="text-cyan-700">Numero Totale Animali</Label>
                  <Input
                    id="animalCount"
                    type="number"
                    value={directSaleData.animalCount}
                    className="border-cyan-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setDirectSaleData({
                        ...directSaleData,
                        animalCount: value
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Data Vendita</h3>
              <Input
                id="saleDate"
                type="date"
                value={directSaleData.date}
                onChange={(e) => setDirectSaleData({...directSaleData, date: e.target.value})}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Cliente</h3>
              <Input
                id="client"
                value={directSaleData.client}
                onChange={(e) => setDirectSaleData({...directSaleData, client: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDirectSaleDialogOpen(false)}>Annulla</Button>
            <Button onClick={() => {
              if (!directSaleData.selectedBasketId) return;
              
              const selectedBasket = baskets.find(b => b.id === directSaleData.selectedBasketId);
              if (!selectedBasket) return;
              
              // Verifica se il cestello è già nella lista delle destinazioni
              const existingIndex = destinationBaskets.findIndex(db => db.basketId === directSaleData.selectedBasketId);
              
              // Crea un nuovo cestello destinazione di tipo vendita con i dati inseriti
              const updatedDestinationBasket: DestinationBasket = {
                basketId: selectedBasket.id,
                physicalNumber: selectedBasket.physicalNumber,
                // Mantieni il flupsyId per evitare errori di vincolo nel database
                flupsyId: selectedBasket.flupsyId || 0,
                position: selectedBasket.position?.toString() || '',
                destinationType: 'sold',
                animalCount: directSaleData.animalCount,
                deadCount: 0,
                sampleWeight: measurementData.sampleWeight,
                sampleCount: measurementData.sampleCount,
                totalWeight: directSaleData.totalWeight,
                animalsPerKg: directSaleData.animalsPerKg,
                saleDate: directSaleData.date,
                saleClient: directSaleData.client,
                selectionId: 0,
                sizeId: measurementData.sizeId || 0,
                isAlsoSource: sourceBaskets.some(sb => sb.basketId === selectedBasket.id)
              };
              
              if (existingIndex >= 0) {
                // Aggiorna il cestello esistente
                setDestinationBaskets(prev => prev.map((basket, index) => 
                  index === existingIndex ? updatedDestinationBasket : basket
                ));
                
                toast({
                  title: "Vendita diretta aggiornata",
                  description: `Dettagli vendita aggiornati per il cestello #${selectedBasket.physicalNumber}`,
                });
              } else {
                // Aggiungi il nuovo cestello
                setDestinationBaskets(prev => [...prev, updatedDestinationBasket]);
                
                toast({
                  title: "Vendita diretta aggiunta",
                  description: `Cestello #${selectedBasket.physicalNumber} aggiunto come vendita diretta`,
                });
              }
              
              setIsDirectSaleDialogOpen(false);
            }}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}