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

// Funzione per formattare i numeri con separatori italiani
const formatNumberItalian = (num: number): string => {
  return new Intl.NumberFormat('it-IT').format(num);
};

const formatDateEuropean = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT');
};

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Fish, ShoppingCart, MoveRight, Calendar, Hash } from 'lucide-react';

// Types
import { Flupsy, Basket, Selection, SourceBasket, DestinationBasket } from '@/types';
import { Size } from '@shared/schema';

// Componenti specifici per la vagliatura con mappa
import FlupsyMapVisualizer from '@/components/vagliatura-mappa/FlupsyMapVisualizer';
import DraggableCalculator from '@/components/DraggableCalculator';
import CompletionProgressDialog from '@/components/CompletionProgressDialog';

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
    screeningType: 'sopra_vaglio',
    referenceSizeId: null
  });
  
  // Flag per indicare se la data è stata confermata
  const [isDateConfirmed, setIsDateConfirmed] = useState(false);
  
  // Cestelli selezionati
  const [sourceBaskets, setSourceBaskets] = useState<SourceBasket[]>([]);
  const [destinationBaskets, setDestinationBaskets] = useState<DestinationBasket[]>([]);
  
  // Stato per gestire la selezione delle ceste da vendere
  const [isSaleSelectionMode, setIsSaleSelectionMode] = useState(false);
  
  // Calcola se tutti i cestelli destinazione sono stati posizionati
  const allDestinationsAssigned = React.useMemo(() => {
    if (destinationBaskets.length === 0) return false;
    
    // Verifica che tutti i cestelli destinazione abbiano una posizione assegnata
    const allHavePosition = destinationBaskets.every(basket => 
      basket.position && basket.position.trim() !== ''
    );
    
    console.log('Controllo cestelli destinazione posizionati:', {
      totalDestinations: destinationBaskets.length,
      allHavePosition,
      basketsWithPosition: destinationBaskets.filter(b => b.position && b.position.trim() !== '').length
    });
    
    return allHavePosition;
  }, [destinationBaskets]);
  
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

  // Stato per l'indicatore di avanzamento del completamento
  const [isCompletionInProgress, setIsCompletionInProgress] = useState(false);
  const [isScreeningCompleted, setIsScreeningCompleted] = useState(false);
  const [completionSteps, setCompletionSteps] = useState<Array<{
    id: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    description?: string;
  }>>([]);
  const [currentCompletionStep, setCurrentCompletionStep] = useState(0);
  
  // Query per i dati
  const { data: flupsys = [], isLoading: isLoadingFlupsys } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys', { includeAll: true }],
    enabled: true
  });
  
  // Query per recuperare i cestelli con i dati completi delle ultime operazioni
  const { data: baskets = [], isLoading: isLoadingBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets', { includeAll: true }],
    enabled: true
  });
  
  // Query specifica per recuperare le operazioni più recenti - ottimizzata per performance
  const { data: operations = [], isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations', { includeAll: true, pageSize: 100 }],
    enabled: true,
    staleTime: 60000 // Cache for 1 minute per performance
  });
  
  // Funzione per arricchire i cestelli con i dati delle operazioni e taglie
  function getEnhancedBaskets(mode: 'source' | 'destination' = 'source') {
    if (!baskets || !Array.isArray(operations) || !Array.isArray(sizes)) return baskets;
    
    // Stampa informazioni di debug
    console.log(`Arricchimento di ${baskets.length} cestelli con ${operations.length} operazioni (mode: ${mode})`);
    console.log(`FLUPSY selezionato: ${selectedFlupsyId}`);
    
    // Filtra i cestelli in base alla modalità:
    // - source: cestelli con ciclo attivo (origine per vagliatura)
    // - destination: tutti i cestelli del FLUPSY (disponibili + origine)
    const filteredBaskets = baskets.filter(b => {
      const matchesFlupsy = b.flupsyId === (selectedFlupsyId ? parseInt(selectedFlupsyId) : null);
      if (!matchesFlupsy) return false;
      
      if (mode === 'source') {
        return b.currentCycleId !== null; // Solo cestelli con ciclo attivo
      } else {
        // In destination: mostra cestelli disponibili O cestelli origine (che possono ricevere sotto-vaglio)
        const isAvailable = b.currentCycleId === null && b.state === 'available';
        const isSourceBasket = sourceBaskets.some(sb => sb.basketId === b.id);
        return isAvailable || isSourceBasket;
      }
    });
    
    console.log(`Cestelli filtrati per FLUPSY ${selectedFlupsyId} (mode: ${mode}): ${filteredBaskets.length}`);
    
    // Crea una mappa delle ultime operazioni per ogni cestello
    const lastOperationsMap: Record<number, any> = {};
    
    // Stampa alcune operazioni di esempio per debug
    if (operations.length > 0) {
      console.log("Esempio di operazione:", operations[0]);
    }
    
    // Popola la mappa SOLO se siamo in modalità 'source'
    // In modalità 'destination', i cestelli disponibili NON devono mostrare dati operativi
    if (mode === 'source') {
      operations.forEach((operation: any) => {
        const basketId = operation.basketId;
        
        // Se non c'è già un'operazione per questo cestello o questa è più recente, la memorizziamo
        // Confronta prima per data, poi per ID se le date sono uguali
        if (!lastOperationsMap[basketId]) {
          lastOperationsMap[basketId] = {
            animalCount: operation.animalCount,
            totalWeight: operation.totalWeight,
            animalsPerKg: operation.animalsPerKg,
            date: operation.date,
            sizeId: operation.sizeId,
            operationId: operation.id
          };
        } else {
          const existingDate = new Date(lastOperationsMap[basketId].date);
          const newDate = new Date(operation.date);
          
          // Se la nuova data è più recente, o se le date sono uguali ma l'ID è maggiore
          if (newDate > existingDate || 
              (newDate.getTime() === existingDate.getTime() && operation.id > lastOperationsMap[basketId].operationId)) {
            lastOperationsMap[basketId] = {
              animalCount: operation.animalCount,
              totalWeight: operation.totalWeight,
              animalsPerKg: operation.animalsPerKg,
              date: operation.date,
              sizeId: operation.sizeId,
              operationId: operation.id
            };
          }
        }
      });
    }
    
    // Log del numero di operazioni trovate
    console.log(`Operazioni uniche trovate (mode ${mode}): ${Object.keys(lastOperationsMap).length}`);
    
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
    
    // Crea una mappa delle taglie per ID per lookup rapido
    const sizesMap: Record<number, any> = {};
    sizes.forEach((size: any) => {
      sizesMap[size.id] = size;
    });
    
    // Arricchisci i cestelli con operazioni e taglie
    const enhancedBaskets = filteredBaskets.map(basket => {
      const lastOperation = lastOperationsMap[basket.id];
      let size;
      
      if (lastOperation?.sizeId) {
        // Se l'operazione ha un ID taglia, usiamo quello
        size = sizesMap[lastOperation.sizeId] || sizes.find((s: any) => s.id === lastOperation.sizeId);
      } else if (lastOperation?.animalsPerKg) {
        // Altrimenti proviamo a determinare la taglia dagli animali per kg
        size = findSizeByAnimalsPerKg(lastOperation.animalsPerKg);
      }
      
      // Registra informazioni di debug per cestello
      if (lastOperation) {
        console.log(`Cestello #${basket.physicalNumber} (${basket.row}-${basket.position}): ` +
                    `${lastOperation.animalCount} animali, ${lastOperation.animalsPerKg} per kg, ` + 
                    `Taglia: ${size?.code || 'Non determinata'}`);
      }
      
      return {
        ...basket,
        lastOperation: lastOperation || undefined,
        size: size || undefined
      };
    });
    
    // Registra risultati complessivi
    console.log(`Cestelli arricchiti: ${enhancedBaskets.length}`);
    
    return enhancedBaskets;
  };
  
  // Query per le taglie
  const { data: sizes = [], isLoading: isLoadingSizes } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
    enabled: true
  });

  // Funzione per ottenere il nome del FLUPSY selezionato
  const getSelectedFlupsyName = (): string | undefined => {
    if (!selectedFlupsyId || !flupsys) return undefined;
    const selectedFlupsy = flupsys.find(f => f.id === parseInt(selectedFlupsyId));
    return selectedFlupsy?.name;
  };
  
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
        animalsPerKg >= (size.minAnimalsPerKg ?? 0) && animalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
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
      screeningType: 'sopra_vaglio',
      referenceSizeId: null
    });
    setCurrentTab('selezione-origine');
  };
  
  // Funzione per verificare se un cestello ha operazioni future rispetto alla data di vagliatura
  const hasOperationsAfterDate = (basketId: number, date: string): boolean => {
    if (!operations || !Array.isArray(operations)) return false;
    
    const vagliaturaDate = new Date(date);
    vagliaturaDate.setHours(23, 59, 59, 999); // Imposta a fine giornata per includere tutto il giorno
    
    // Trova operazioni del cestello con data successiva
    const futureOperations = operations.filter((op: any) => 
      op.basketId === basketId && new Date(op.date) > vagliaturaDate
    );
    
    if (futureOperations.length > 0) {
      console.log(`Cestello #${basketId} ha ${futureOperations.length} operazioni future rispetto a ${date}:`, 
        futureOperations.map((op: any) => ({ id: op.id, date: op.date, type: op.type }))
      );
    }
    
    return futureOperations.length > 0;
  };
  
  // Funzione per selezionare/deselezionare un cestello origine
  const toggleSourceBasket = (basket: any) => {
    // Prima verifica che la data sia stata confermata
    if (!isDateConfirmed) {
      toast({
        title: "Data non confermata",
        description: "Devi confermare la data di vagliatura prima di selezionare i cestelli",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica che il cestello non abbia operazioni future
    if (hasOperationsAfterDate(basket.id, selection.date || '')) {
      toast({
        title: "Operazione non consentita",
        description: `Il cestello #${basket.physicalNumber} ha operazioni successive alla data di vagliatura ${selection.date}. Non può essere selezionato come origine.`,
        variant: "destructive"
      });
      return;
    }
    
    console.log('🎯 DEBUG - toggleSourceBasket chiamato:', {
      basket_id: basket.id,
      basket_physicalNumber: basket.physicalNumber,
      current_sourceBaskets_length: sourceBaskets.length
    });
    
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
  
  // Stato per il calcolatore draggable
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [measurementData, setMeasurementData] = useState({
    basketId: 0,
    physicalNumber: 0,
    flupsyId: 0,
    position: '',
    row: '',
    destinationType: 'placed' as 'placed' | 'sold',
    sampleWeight: 1, // grammi
    sampleCount: 100, // numero di animali vivi nel campione
    totalWeight: 1, // kg
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
    // Nota: nel campo sampleCount consideriamo solo gli animali vivi nel campione
    // Il totale degli animali nel campione è quindi sampleCount + deadCount
    if (newData.deadCount >= 0 && newData.sampleCount > 0) {
      // Calcolo del totale degli animali nel campione (vivi + morti)
      const totalSampleAnimals = newData.sampleCount + newData.deadCount;
      
      // La formula corretta è: (morti / totale animali nel campione) * 100
      // dove totale animali nel campione include sia vivi che morti
      if (totalSampleAnimals > 0) {
        // Calcolo percentuale: (morti / totale nel campione) * 100
        newData.mortalityRate = Math.round((newData.deadCount / totalSampleAnimals) * 100);
        
        // Verifica del calcolo per garantire che sia corretto
        console.log('Calcolo mortalità CORRETTO:', {
          'animali vivi nel campione': newData.sampleCount,
          'animali morti nel campione': newData.deadCount,
          'totale animali nel campione': totalSampleAnimals,
          'percentuale mortalità': newData.mortalityRate,
          formula: `(${newData.deadCount} / ${totalSampleAnimals}) * 100 = ${newData.mortalityRate}%`
        });
        
        // Esempio: in un campione di 100 animali totali, se 50 sono morti e 50 sono vivi
        // la mortalità sarà (50 / 100) * 100 = 50%
        console.log('Esempio verifica 50%:', {
          esempio: '50 morti, 50 vivi in un campione totale di 100',
          calcolo: `(50 / 100) * 100 = ${Math.round((50 / 100) * 100)}%`
        });
      } else {
        newData.mortalityRate = 0;
      }
      
      // Ora ricalcoliamo il numero totale di animali vivi considerando la mortalità
      if (newData.totalWeight > 0 && newData.animalsPerKg > 0) {
        // Calcola il totale teorico (considerando come se fossero tutti vivi)
        const totalTheoretical = Math.round(newData.totalWeight * newData.animalsPerKg);
        
        // Applica la percentuale di mortalità per ottenere i vivi reali
        const mortalityFactor = newData.mortalityRate / 100;
        newData.animalCount = Math.round(totalTheoretical * (1 - mortalityFactor));
        
        console.log('Calcolo animali vivi con mortalità:', {
          'peso totale (g)': newData.totalWeight,
          'animali per kg': newData.animalsPerKg,
          'totale teorico': totalTheoretical,
          'fattore mortalità': mortalityFactor,
          'animali vivi calcolati': newData.animalCount
        });
      }
    } else {
      newData.mortalityRate = 0;
    }
    
    // Determina la taglia in base agli animali per kg
    if (newData.animalsPerKg > 0 && sizes) {
      const matchingSize = sizes.find(size => 
        newData.animalsPerKg >= (size.minAnimalsPerKg ?? 0) && newData.animalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
      );
      if (matchingSize) {
        newData.sizeId = matchingSize.id;
      }
    }
    
    return newData;
  };

  // Funzione per selezionare/deselezionare un cestello destinazione
  const toggleDestinationBasket = (basket: any, clickedPosition?: { row: string; position: number }) => {
    // Se siamo in modalità selezione vendita, gestiamo in modo diverso il click
    if (isSaleSelectionMode) {
      // Trova il cestello nella lista dei cestelli destinazione
      const destBasketIndex = destinationBaskets.findIndex(db => db.basketId === basket.id);
      
      if (destBasketIndex >= 0) {
        // Il cestello esiste già, togliamo o aggiungiamo il flag "sold"
        setDestinationBaskets(prev => {
          const newBaskets = [...prev];
          const currentBasket = newBaskets[destBasketIndex];
          
          // Se già impostato come vendita, ripristina come normale posizionamento
          // altrimenti imposta come vendita
          newBaskets[destBasketIndex] = {
            ...currentBasket,
            destinationType: currentBasket.destinationType === 'sold' ? 'placed' : 'sold'
          };
          
          return newBaskets;
        });
      }
      return;
    }
    
    // Solo cestelli fisicamente esistenti possono essere selezionati come destinazione
    if (!basket || basket.id < 0) {
      toast({
        title: "Posizione non valida",
        description: "Puoi selezionare solo cestelli fisicamente esistenti, non posizioni vuote",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica se il cestello è già selezionato
    const isAlreadySelected = destinationBaskets.some(db => db.basketId === basket.id);
    
    if (isAlreadySelected) {
      // Rimuovi il cestello dalla selezione
      setDestinationBaskets(prev => prev.filter(db => db.basketId !== basket.id));
    } else {
      // Verifica se questo cestello è anche un cestello origine
      const isAlsoSource = sourceBaskets.some(sb => sb.basketId === basket.id);
      
      // USA LA POSIZIONE CLICCATA DALL'UTENTE, non quella del cestello nel DB
      const targetRow = clickedPosition?.row || basket.row || '';
      const targetPosition = clickedPosition?.position?.toString() || basket.position?.toString() || '';
      
      // Prepara i dati iniziali per il dialogo di misurazione
      const initialMeasurementData = {
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyId: basket.flupsyId || 0,
        position: targetPosition,  // ← Usa posizione cliccata
        row: targetRow,             // ← Usa fila cliccata
        destinationType: 'placed' as 'placed' | 'sold',
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
      
      // Apri il calcolatore draggable per posizionamento
      setMeasurementData(initialMeasurementData);
      setIsCalculatorOpen(true);
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

    // Previeni multiple esecuzioni
    if (isCompletionInProgress) {
      return;
    }
    
    // Definisci i passaggi per l'indicatore di avanzamento
    const steps = [
      { id: 'validate', label: 'Validazione dati', status: 'pending' as const, description: 'Controllo della correttezza dei dati inseriti' },
      { id: 'create-selection', label: 'Creazione vagliatura', status: 'pending' as const, description: 'Creazione della nuova vagliatura nel sistema' },
      { id: 'add-sources', label: 'Aggiunta cestelli origine', status: 'pending' as const, description: 'Registrazione dei cestelli di origine' },
      { id: 'add-destinations', label: 'Aggiunta cestelli destinazione', status: 'pending' as const, description: 'Registrazione dei cestelli di destinazione' },
      { id: 'complete', label: 'Completamento operazioni', status: 'pending' as const, description: 'Finalizzazione della vagliatura e creazione operazioni' }
    ];

    // Avvia l'indicatore di avanzamento
    setCompletionSteps(steps);
    setCurrentCompletionStep(0);
    setIsCompletionInProgress(true);

    const updateStep = (stepId: string, status: 'in-progress' | 'completed' | 'error', stepIndex: number) => {
      setCompletionSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      ));
      if (status === 'completed') {
        setCurrentCompletionStep(stepIndex + 1);
      }
    };
    
    try {
      // Passo 1: Validazione
      updateStep('validate', 'in-progress', 0);
      await new Promise(resolve => setTimeout(resolve, 500)); // Breve pausa per mostrare il progresso
      updateStep('validate', 'completed', 0);

      // Passo 2: Creare la selezione (vagliatura) se non esiste già
      updateStep('create-selection', 'in-progress', 1);
      let selectionId = selection.id;
      
      if (!selectionId) {
        const createSelectionData = {
          date: selection.date,
          purpose: selection.purpose,
          notes: selection.notes,
          screeningType: selection.screeningType,
          referenceSizeId: selection.referenceSizeId
        };
        
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
        selectionId = newSelection.selection.id;
        
        setSelection(prev => ({
          ...prev,
          id: selectionId,
          selectionNumber: newSelection.selectionNumber
        }));
      }
      updateStep('create-selection', 'completed', 1);

      // Passo 3: Aggiungere i cestelli origine
      updateStep('add-sources', 'in-progress', 2);
      
      // DEBUG: Log dettagliato per identificare il problema
      console.log('🔍 DEBUG - Cestelli origine prima dell\'invio:', {
        sourceBaskets,
        sourceBaskets_length: sourceBaskets.length,
        sourceBaskets_isArray: Array.isArray(sourceBaskets)
      });
      
      // Verifica di sicurezza aggiuntiva
      if (!sourceBaskets || sourceBaskets.length === 0) {
        throw new Error('Nessun cestello origine selezionato. Impossibile procedere.');
      }
      
      const sourceBasketData = sourceBaskets.map(basket => ({
        ...basket,
        selectionId
      }));
      
      console.log('🔍 DEBUG - Dati cestelli origine preparati per invio:', {
        sourceBasketData,
        sourceBasketData_length: sourceBasketData.length
      });
      
      const sourceResponse = await fetch(`/api/selections/${selectionId}/source-baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceBaskets: sourceBasketData })
      });
      
      if (!sourceResponse.ok) {
        const error = await sourceResponse.json();
        throw new Error(error.message || 'Errore durante l\'aggiunta dei cestelli origine');
      }
      updateStep('add-sources', 'completed', 2);
      
      // Passo 4: Aggiungere i cestelli destinazione
      updateStep('add-destinations', 'in-progress', 3);
      const destinationBasketData = destinationBaskets.map(basket => {
        // USA LE POSIZIONI SELEZIONATE DALL'UTENTE (già salvate in basket.row e basket.position)
        // NON cercare nel database, perché quelle sono le posizioni originali!
        const row = basket.row || 'DX';
        const formattedPosition = `${row}${basket.position}`;
        
        let finalAnimalsPerKg = basket.animalsPerKg || 0;
        if ((!finalAnimalsPerKg || finalAnimalsPerKg === 0) && basket.sampleWeight && basket.sampleCount && basket.sampleWeight > 0 && basket.sampleCount > 0) {
          finalAnimalsPerKg = Math.round((basket.sampleCount / basket.sampleWeight) * 1000);
        }
        
        let finalAnimalCount = basket.animalCount || 0;
        if (basket.totalWeight && basket.totalWeight > 0 && finalAnimalsPerKg > 0) {
          finalAnimalCount = Math.round(basket.totalWeight * finalAnimalsPerKg);
        }
        
        let finalSizeId = basket.sizeId || 0;
        if (finalAnimalsPerKg > 0 && sizes) {
          const matchingSize = sizes.find(size => 
            finalAnimalsPerKg >= (size.minAnimalsPerKg ?? 0) && finalAnimalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
          );
          if (matchingSize) {
            finalSizeId = matchingSize.id;
          }
        }
        
        return {
          ...basket,
          position: formattedPosition,
          selectionId,
          animalsPerKg: finalAnimalsPerKg,
          animalCount: finalAnimalCount,
          sizeId: finalSizeId
        };
      });
      
      const destinationResponse = await fetch(`/api/selections/${selectionId}/destination-baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destinationBaskets: destinationBasketData })
      });
      
      if (!destinationResponse.ok) {
        const error = await destinationResponse.json();
        throw new Error(error.message || 'Errore durante l\'aggiunta dei cestelli destinazione');
      }
      updateStep('add-destinations', 'completed', 3);
      
      // Passo 5: Completare la selezione
      updateStep('complete', 'in-progress', 4);
      
      const completeResponse = await fetch(`/api/selections/${selectionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectionId })
      });
      
      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.message || 'Errore durante il completamento della selezione');
      }
      
      updateStep('complete', 'completed', 4);
      
      // Imposta la vagliatura come completata con successo
      setIsScreeningCompleted(true);
      
      toast({
        title: "Vagliatura completata",
        description: "La vagliatura è stata completata con successo",
        variant: "default"
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/selections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      // Naviga alla dashboard dopo un breve ritardo per mostrare il successo
      setTimeout(() => {
        setIsCompletionInProgress(false);
        navigate('/');
      }, 2000);
      
    } catch (error: any) {
      // In caso di errore, aggiorna lo step corrente come errore
      const currentStep = completionSteps.find(step => step.status === 'in-progress');
      if (currentStep) {
        updateStep(currentStep.id, 'error', completionSteps.findIndex(s => s.id === currentStep.id));
      }
      
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message || 'Errore sconosciuto'}`,
        variant: "destructive"
      });
      
      // Chiudi il dialogo di progresso in caso di errore
      setTimeout(() => {
        setIsCompletionInProgress(false);
      }, 3000);
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
              {/* Sezione Data Vagliatura - OBBLIGATORIA PRIMA DI PROCEDERE */}
              {!isDateConfirmed && (
                <Alert className="border-blue-500 bg-blue-50">
                  <Calendar className="h-4 w-4" />
                  <AlertTitle>Impostare Data Vagliatura</AlertTitle>
                  <AlertDescription>
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="data-vagliatura">Data di Vagliatura *</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            id="data-vagliatura"
                            type="date"
                            value={selection.date}
                            onChange={(e) => setSelection(prev => ({ ...prev, date: e.target.value }))}
                            className="max-w-xs"
                          />
                          <Button 
                            onClick={() => {
                              if (!selection.date) {
                                toast({
                                  title: "Data mancante",
                                  description: "Inserisci una data di vagliatura valida",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Verifica che la data non sia nel futuro
                              if (new Date(selection.date) > new Date()) {
                                toast({
                                  title: "Data non valida",
                                  description: "La data di vagliatura non può essere nel futuro",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              setIsDateConfirmed(true);
                              toast({
                                title: "Data confermata",
                                description: `Data di vagliatura impostata: ${selection.date}`,
                              });
                            }}
                          >
                            Conferma Data
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          La data verrà applicata a tutte le operazioni della vagliatura.
                          Non sarà possibile selezionare cestelli con operazioni successive a questa data.
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Mostra data confermata */}
              {isDateConfirmed && (
                <div className="bg-green-50 border border-green-300 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-semibold text-green-800">Data Vagliatura Confermata: </span>
                      <span className="text-sm text-green-700">{selection.date}</span>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (sourceBaskets.length > 0 || destinationBaskets.length > 0) {
                          if (!confirm("Modificare la data cancellerà tutte le selezioni correnti. Continuare?")) {
                            return;
                          }
                          setSourceBaskets([]);
                          setDestinationBaskets([]);
                        }
                        setIsDateConfirmed(false);
                      }}
                    >
                      Modifica Data
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Selettore FLUPSY - Visibile solo dopo conferma data */}
              {isDateConfirmed && (
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
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                          {sourceBaskets.map(basket => {
                            const basketDetails = baskets.find(b => b.id === basket.basketId);
                            
                            // Trova la taglia dal sizeId o dagli animali/kg
                            const basketSize = basketDetails?.lastOperation?.sizeId 
                              ? sizes?.find(size => size.id === basketDetails.lastOperation!.sizeId)
                              : basketDetails?.lastOperation?.animalsPerKg 
                                ? sizes?.find(size => 
                                    basketDetails.lastOperation!.animalsPerKg! >= (size.minAnimalsPerKg ?? 0) && 
                                    basketDetails.lastOperation!.animalsPerKg! <= (size.maxAnimalsPerKg ?? Infinity)
                                  )
                                : null;

                            return (
                              <div key={basket.basketId} className="text-xs p-2 border rounded bg-gray-50">
                                <div className="font-medium">Cestello #{basketDetails?.physicalNumber}</div>
                                {basketSize && (
                                  <div className="text-blue-600 font-medium">{basketSize.code}</div>
                                )}
                                {basketDetails?.lastOperation?.animalCount && (
                                  <div className="text-gray-600">
                                    {formatNumberItalian(basketDetails.lastOperation.animalCount)} animali
                                  </div>
                                )}
                                {basketDetails?.lastOperation?.animalsPerKg && (
                                  <div className="text-gray-600">
                                    {formatNumberItalian(basketDetails.lastOperation.animalsPerKg)} animali/kg
                                  </div>
                                )}
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
                        <div className="text-right font-semibold">{formatNumberItalian(calculatedValues.totalAnimals)}</div>
                        <div>Animali/kg:</div>
                        <div className="text-right font-semibold">{formatNumberItalian(calculatedValues.animalsPerKg)}</div>
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
                        flupsyName={getSelectedFlupsyName()}
                        baskets={getEnhancedBaskets('source')}
                        selectedBaskets={sourceBaskets.map(b => b.basketId)}
                        onBasketClick={toggleSourceBasket}
                        mode="source"
                        showTooltips={true}
                      />
                    )}
                  </div>
                </div>
              </div>
              )}
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
                    
                    {/* Opzione per selezionare ceste per vendita (visibile solo dopo aver posizionato tutte le ceste destinazione) */}
                    {allDestinationsAssigned && !isSaleSelectionMode && (
                      <div className="border rounded-md p-3 bg-green-50 border-green-300">
                        <h3 className="text-sm font-semibold mb-2 text-green-800">Vendita Diretta</h3>
                        <p className="text-xs text-green-700 mb-2">
                          Tutte le ceste sono state posizionate correttamente. Ora puoi selezionare quali destinare alla vendita.
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full border-green-500 bg-white hover:bg-green-100"
                          onClick={() => setIsSaleSelectionMode(true)}
                        >
                          Seleziona per Vendita
                        </Button>

                      </div>
                    )}
                    
                    {/* Indicatore modalità selezione vendita */}
                    {isSaleSelectionMode && (
                      <div className="border rounded-md p-3 border-red-300 bg-red-50">
                        <h3 className="text-sm font-semibold mb-2">Modalità Vendita Attiva</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          Fai clic sulle ceste destinazione che vuoi destinare alla vendita
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setIsSaleSelectionMode(false)}
                        >
                          Termina Selezione Vendite
                        </Button>
                      </div>
                    )}
                    
                    {/* Pannello Bilancio in Tempo Reale */}
                    <div className="border rounded-md p-3 bg-blue-50 border-blue-300">
                      <h3 className="text-sm font-semibold mb-3 text-blue-800">📊 Bilancio Vagliatura</h3>
                      
                      {(() => {
                        // Calcola i totali usando i cestelli marcati come origine nella mappa
                        const enhancedBaskets = getEnhancedBaskets('source');
                        const originBaskets = enhancedBaskets.filter(basket => 
                          sourceBaskets.some(sb => sb.basketId === basket.id)
                        );
                        
                        const totalOriginAnimals = originBaskets.reduce((sum, basket) => {
                          return sum + (basket.lastOperation?.animalCount || 0);
                        }, 0);
                        
                        const totalDestinationAnimals = destinationBaskets.reduce((sum, basket) => {
                          return sum + (basket.animalCount || 0);
                        }, 0);
                        
                        const difference = totalDestinationAnimals - totalOriginAnimals;
                        const completionPercentage = totalOriginAnimals > 0 
                          ? Math.round((totalDestinationAnimals / totalOriginAnimals) * 100) 
                          : 0;
                        
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Animali Origine Selezionati:</span>
                              <span className="font-semibold">{formatNumberItalian(totalOriginAnimals)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700">Animali Destinazione:</span>
                              <span className="font-semibold">{formatNumberItalian(totalDestinationAnimals)}</span>
                            </div>
                            <hr className="border-blue-200"/>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Differenza:</span>
                              <span className={`font-bold ${difference > 0 ? 'text-orange-600' : difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {difference > 0 ? '+' : ''}{formatNumberItalian(difference)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Completamento:</span>
                              <span className={`font-bold ${completionPercentage >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                {completionPercentage}%
                              </span>
                            </div>
                            
                            {/* Barra di progresso */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  completionPercentage >= 100 ? 'bg-green-500' : 
                                  completionPercentage >= 80 ? 'bg-blue-500' : 'bg-orange-400'
                                }`}
                                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {destinationBaskets.length > 0 && (
                      <div className="border rounded-md p-3">
                        <h3 className="text-sm font-semibold mb-2">Cestelli Destinazione ({destinationBaskets.length})</h3>
                        <div className="max-h-[150px] overflow-y-auto space-y-2">
                          {destinationBaskets.map((basket, index) => {
                            const basketDetails = baskets.find(b => b.id === basket.basketId);
                            // Per le ceste virtuali, usa la posizione come identificatore univoco
                            const uniqueKey = basket.basketId < 0 ? `virtual-${basket.position || 'N'}` : basket.basketId;
                            const displayNumber = basketDetails?.physicalNumber || `Pos. ${basket.position}`;
                            
                            // 🔢 CALCOLA la taglia RICALCOLATA del cestello destinazione
                            // basandosi sui nuovi animali/kg dopo il trasferimento
                            let finalAnimalsPerKg = basket.animalsPerKg || 0;
                            
                            // Se animalsPerKg è 0 o non presente, calcolalo da sampleWeight e sampleCount
                            if ((!finalAnimalsPerKg || finalAnimalsPerKg === 0) && 
                                basket.sampleWeight && basket.sampleCount && 
                                basket.sampleWeight > 0 && basket.sampleCount > 0) {
                              finalAnimalsPerKg = Math.round((basket.sampleCount / basket.sampleWeight) * 1000);
                            }
                            
                            // Trova la taglia corrispondente agli animali/kg calcolati
                            const basketSize = finalAnimalsPerKg > 0
                              ? sizes?.find(size => 
                                  finalAnimalsPerKg >= (size.minAnimalsPerKg ?? 0) && 
                                  finalAnimalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
                                )
                              : null;
                            
                            return (
                              <div key={uniqueKey} className="text-xs p-2 border rounded bg-gray-50">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium">Cestello #{displayNumber}</div>
                                    {basketSize && (
                                      <div className="text-blue-600 font-medium">{basketSize.code}</div>
                                    )}
                                    <div className="text-gray-600">
                                      {formatNumberItalian(basket.animalCount || 0)} animali
                                    </div>
                                    {basket.animalsPerKg && (
                                      <div className="text-gray-600">
                                        {formatNumberItalian(basket.animalsPerKg)} animali/kg
                                      </div>
                                    )}
                                    {basket.destinationType === 'sold' && basket.saleClient && (
                                      <div className="text-gray-600">Cliente: {basket.saleClient}</div>
                                    )}
                                  </div>
                                  <div className="ml-2">
                                    <Badge variant={basket.destinationType === 'sold' ? 'destructive' : 'outline'}>
                                      {basket.destinationType === 'sold' ? 'Vendita' : 'Posto'}
                                    </Badge>
                                  </div>
                                </div>
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
                        flupsyId={String(selectedFlupsyId)}
                        flupsyName={getSelectedFlupsyName()}
                        baskets={getEnhancedBaskets('destination').map(b => ({
                          ...b,
                          // Aggiungiamo un flag per indicare se è un cestello origine
                          isSourceBasket: sourceBaskets.some(sb => sb.basketId === b.id)
                        }))}
                        selectedBaskets={(() => {
                          const selectedIds = destinationBaskets.map(b => b.basketId);
                          console.log('DEBUG: selectedBaskets passati a FlupsyMapVisualizer:', selectedIds);
                          console.log('DEBUG: destinationBaskets completa:', destinationBaskets);
                          return selectedIds;
                        })()}
                        soldBasketIds={destinationBaskets.filter(b => b.destinationType === 'sold').map(b => b.basketId)}
                        onBasketClick={(basket) => toggleDestinationBasket(basket)}
                        mode="destination"
                        showTooltips={true}
                        destinationData={destinationBaskets.map(basket => {
                          // Calcola animali/kg se non presente
                          let finalAnimalsPerKg = basket.animalsPerKg || 0;
                          if ((!finalAnimalsPerKg || finalAnimalsPerKg === 0) && 
                              basket.sampleWeight && basket.sampleCount && 
                              basket.sampleWeight > 0 && basket.sampleCount > 0) {
                            finalAnimalsPerKg = Math.round((basket.sampleCount / basket.sampleWeight) * 1000);
                          }
                          
                          // Trova la taglia corrispondente
                          const basketSize = finalAnimalsPerKg > 0
                            ? sizes?.find(size => 
                                finalAnimalsPerKg >= (size.minAnimalsPerKg ?? 0) && 
                                finalAnimalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
                              )
                            : null;
                          
                          return {
                            basketId: basket.basketId,
                            animalCount: basket.animalCount || 0,
                            animalsPerKg: finalAnimalsPerKg,
                            sizeCode: basketSize?.code
                          };
                        })}
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
              <div>
                <CardTitle>Riepilogo e Conferma</CardTitle>
                <CardDescription>
                  Verifica i dettagli della vagliatura prima di confermare
                </CardDescription>
              </div>
              
              {/* Pannello Statistiche Orizzontale Compatto */}
              {(() => {
                // Calcola gli arrays per le statistiche
                const soldBaskets = destinationBaskets.filter(basket => basket.destinationType === 'sold');
                const placedBaskets = destinationBaskets.filter(basket => basket.destinationType === 'placed');
                
                // Calcola i totali
                const originAnimals = sourceBaskets.reduce((sum: number, b: any) => sum + (b.animalCount || 0), 0);
                const originWeight = sourceBaskets.reduce((sum: number, b: any) => sum + (b.totalWeight || 0), 0);
                const soldAnimals = soldBaskets.reduce((sum: number, b: any) => sum + (b.animalCount || 0), 0);
                const soldWeight = soldBaskets.reduce((sum: number, b: any) => sum + (b.totalWeight || 0), 0);
                const placedAnimals = placedBaskets.reduce((sum: number, b: any) => sum + (b.animalCount || 0), 0);
                const placedWeight = placedBaskets.reduce((sum: number, b: any) => sum + (b.totalWeight || 0), 0);
                
                return (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    {/* Chip Origine */}
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <Fish className="w-4 h-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-blue-800 truncate">Cestelli Origine</div>
                        <div className="text-xs text-blue-600 tabular-nums">
                          {sourceBaskets.length} cest. • {formatNumberItalian(originAnimals)} anim. • {originWeight}kg
                        </div>
                      </div>
                    </div>

                    {/* Chip Venduti */}
                    {soldBaskets.length > 0 && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <ShoppingCart className="w-4 h-4 text-red-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 truncate">Cestelli Venduti</div>
                          <div className="text-xs text-red-600 tabular-nums">
                            {soldBaskets.length} cest. • {formatNumberItalian(soldAnimals)} anim. • {soldWeight}kg
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chip Riposizionati */}
                    {placedBaskets.length > 0 && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <MoveRight className="w-4 h-4 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-green-800 truncate">Cestelli Riposizionati</div>
                          <div className="text-xs text-green-600 tabular-nums">
                            {placedBaskets.length} cest. • {formatNumberItalian(placedAnimals)} anim. • {placedWeight}kg
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chip Informazioni Operazione */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">Operazione Vagliatura</div>
                        <div className="text-xs text-gray-600 tabular-nums">
                          {formatDateEuropean(new Date().toISOString().split('T')[0])} • {destinationBaskets.length} destinazioni
                        </div>
                      </div>
                    </div>

                    {/* Chip Totali */}
                    {(() => {
                      const destinationAnimals = soldAnimals + placedAnimals;
                      const difference = destinationAnimals - originAnimals;
                      const percentage = originAnimals > 0 ? ((difference / originAnimals) * 100) : 0;
                      const isPositive = difference > 0;
                      const isNeutral = difference === 0;
                      
                      return (
                        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 sm:col-span-2 lg:col-span-2 ${
                          isNeutral 
                            ? 'bg-indigo-50 border border-indigo-200' 
                            : isPositive 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-amber-50 border border-amber-200'
                        }`}>
                          <Hash className={`w-4 h-4 ${
                            isNeutral 
                              ? 'text-indigo-600' 
                              : isPositive 
                                ? 'text-green-600' 
                                : 'text-amber-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${
                              isNeutral 
                                ? 'text-indigo-800' 
                                : isPositive 
                                  ? 'text-green-800' 
                                  : 'text-amber-800'
                            }`}>
                              Riepilogo Totali
                            </div>
                            <div className={`text-xs tabular-nums ${
                              isNeutral 
                                ? 'text-indigo-600' 
                                : isPositive 
                                  ? 'text-green-600' 
                                  : 'text-amber-600'
                            }`}>
                              Origine: {formatNumberItalian(originAnimals)} anim. • Destinazioni: {formatNumberItalian(destinationAnimals)} anim.
                              <br />
                              <span className="font-medium">
                                Differenza: {difference > 0 ? '+' : ''}{formatNumberItalian(difference)} anim. 
                                ({percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%)
                                {isPositive && ' ↗️'} {difference < 0 && ' ↘️'} {isNeutral && ' ➡️'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
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
                        value={selection.notes || ''} 
                        onChange={(e) => setSelection({...selection, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Cestelli origine */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Cestelli Origine</h3>
                  {sourceBaskets.length === 0 ? (
                    <p className="text-muted-foreground">Nessun cestello origine selezionato</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden bg-blue-50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-blue-100">
                            <TableHead className="text-blue-800">Cestello</TableHead>
                            <TableHead className="text-blue-800">Taglia</TableHead>
                            <TableHead className="text-right text-blue-800">Animali</TableHead>
                            <TableHead className="text-right text-blue-800">Animali/kg</TableHead>
                            <TableHead className="text-right text-blue-800">Peso (kg)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sourceBaskets.map(basket => {
                            // Trova la taglia corrispondente usando priorità sizeId
                            const basketDetails = baskets.find(b => b.id === basket.basketId);
                            
                            // Trova la taglia corrispondente usando priorità sizeId
                            const basketSize = basketDetails?.lastOperation?.sizeId 
                              ? sizes?.find(size => size.id === basketDetails.lastOperation!.sizeId)
                              : basket.animalsPerKg 
                                ? sizes?.find(size => 
                                    basket.animalsPerKg! >= (size.minAnimalsPerKg ?? 0) && basket.animalsPerKg! <= (size.maxAnimalsPerKg ?? Infinity)
                                  )
                                : null;
                            
                            return (
                              <TableRow key={basket.basketId} className="bg-blue-25 hover:bg-blue-100">
                                <TableCell className="font-medium text-blue-900">#{basket.physicalNumber}</TableCell>
                                <TableCell>
                                  {basketSize ? (
                                    <Badge variant="outline" className="bg-blue-200 text-blue-800 border-blue-400">{basketSize.code}</Badge>
                                  ) : (
                                    <span className="text-blue-600">Non determinata</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-blue-900 font-medium">
                                  {formatNumberItalian(basket.animalCount || 0)}
                                </TableCell>
                                <TableCell className="text-right text-blue-900">
                                  {formatNumberItalian(basket.animalsPerKg || 0)}
                                </TableCell>
                                <TableCell className="text-right text-blue-900">
                                  {basket.totalWeight || 0}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                
                {/* Cestelli destinazione - Vendite */}
                {(() => {
                  const soldBaskets = destinationBaskets.filter(basket => basket.destinationType === 'sold');
                  return soldBaskets.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3 text-red-800">Cestelli Venduti ({soldBaskets.length})</h3>
                      <div className="border rounded-md overflow-hidden bg-red-50">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-100">
                              <TableHead className="text-red-800">Cestello</TableHead>
                              <TableHead className="text-red-800">Taglia</TableHead>
                              <TableHead className="text-red-800">Cliente</TableHead>
                              <TableHead className="text-red-800">Data</TableHead>
                              <TableHead className="text-right text-red-800">Animali</TableHead>
                              <TableHead className="text-right text-red-800">Animali/kg</TableHead>
                              <TableHead className="text-right text-red-800">Peso (kg)</TableHead>
                              <TableHead className="w-12 text-red-800"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {soldBaskets.map(basket => {
                              // Trova la taglia corrispondente usando priorità sizeId
                              const basketDetails = baskets.find(b => b.id === basket.basketId);
                              
                              // Calcola animalsPerKg se mancante, usando la stessa logica del completamento
                              let finalAnimalsPerKg = basket.animalsPerKg || 0;
                              if ((!finalAnimalsPerKg || finalAnimalsPerKg === 0) && basket.sampleWeight && basket.sampleCount && basket.sampleWeight > 0 && basket.sampleCount > 0) {
                                finalAnimalsPerKg = Math.round((basket.sampleCount / basket.sampleWeight) * 1000);
                              }
                              
                              const basketSize = basketDetails?.lastOperation?.sizeId 
                                ? sizes?.find(size => size.id === basketDetails.lastOperation!.sizeId)
                                : finalAnimalsPerKg > 0
                                  ? sizes?.find(size => 
                                      finalAnimalsPerKg >= (size.minAnimalsPerKg ?? 0) && finalAnimalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
                                    )
                                  : null;
                              
                              return (
                                <TableRow key={basket.basketId} className="bg-red-25 hover:bg-red-100">
                                  <TableCell className="font-medium text-red-900">
                                    #{basket.physicalNumber}
                                    {basket.isAlsoSource && (
                                      <Badge variant="secondary" className="ml-2 text-xs bg-blue-200 text-blue-800">Origine</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {basketSize ? (
                                      <Badge variant="outline" className="bg-red-200 text-red-800 border-red-400">{basketSize.code}</Badge>
                                    ) : (
                                      <span className="text-red-600 text-xs">Calcolata</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-red-900">{basket.saleClient || 'Non specificato'}</TableCell>
                                  <TableCell className="text-red-900">{formatDateEuropean(basket.saleDate || new Date().toISOString().split('T')[0])}</TableCell>
                                  <TableCell className="text-right text-red-900 font-medium">
                                    {formatNumberItalian(basket.animalCount || 0)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-900">
                                    {formatNumberItalian(finalAnimalsPerKg)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-900">
                                    {basket.totalWeight || 0}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-red-700 hover:bg-red-200"
                                      onClick={() => {
                                        // Precompila i dati di vendita
                                        setDirectSaleData({
                                          client: basket.saleClient || 'Cliente',
                                          date: basket.saleDate || new Date().toISOString().split('T')[0],
                                          animalCount: basket.animalCount || 0,
                                          totalWeight: basket.totalWeight || 0,
                                          animalsPerKg: basket.animalsPerKg || 0,
                                          selectedBasketId: basket.basketId
                                        });
                                        
                                        // Precompila anche i dati di misurazione per permettere il ricalcolo
                                        setMeasurementData(prev => ({
                                          ...prev,
                                          basketId: basket.basketId,
                                          sampleWeight: basket.sampleWeight || 0,
                                          sampleCount: basket.sampleCount || 0,
                                          totalWeight: basket.totalWeight || 0,
                                          animalCount: basket.animalCount || 0,
                                          animalsPerKg: basket.animalsPerKg || 0,
                                          deadCount: basket.deadCount || 0,
                                          mortalityRate: 0,
                                          destinationType: 'sold' as 'sold'
                                        }));
                                        
                                        setIsDirectSaleDialogOpen(true);
                                      }}
                                    >
                                      Modifica
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Cestelli destinazione - Riposizionamento */}
                {(() => {
                  const placedBaskets = destinationBaskets.filter(basket => basket.destinationType === 'placed');
                  return placedBaskets.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3 text-green-800">Cestelli Riposizionati ({placedBaskets.length})</h3>
                      <div className="border rounded-md overflow-hidden bg-green-50">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-100">
                              <TableHead className="text-green-800">Cestello</TableHead>
                              <TableHead className="text-green-800">Taglia</TableHead>
                              <TableHead className="text-green-800">Posizione</TableHead>
                              <TableHead className="text-right text-green-800">Animali</TableHead>
                              <TableHead className="text-right text-green-800">Animali/kg</TableHead>
                              <TableHead className="text-right text-green-800">Peso (kg)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {placedBaskets.map(basket => {
                              // Trova la taglia corrispondente usando priorità sizeId
                              const basketDetails = baskets.find(b => b.id === basket.basketId);
                              
                              // Calcola animalsPerKg se mancante, usando la stessa logica del completamento
                              let finalAnimalsPerKg = basket.animalsPerKg || 0;
                              if ((!finalAnimalsPerKg || finalAnimalsPerKg === 0) && basket.sampleWeight && basket.sampleCount && basket.sampleWeight > 0 && basket.sampleCount > 0) {
                                finalAnimalsPerKg = Math.round((basket.sampleCount / basket.sampleWeight) * 1000);
                              }
                              
                              const basketSize = basketDetails?.lastOperation?.sizeId 
                                ? sizes?.find(size => size.id === basketDetails.lastOperation!.sizeId)
                                : finalAnimalsPerKg > 0
                                  ? sizes?.find(size => 
                                      finalAnimalsPerKg >= (size.minAnimalsPerKg ?? 0) && finalAnimalsPerKg <= (size.maxAnimalsPerKg ?? Infinity)
                                    )
                                  : null;
                              
                              return (
                                <TableRow key={basket.basketId} className="bg-green-25 hover:bg-green-100">
                                  <TableCell className="font-medium text-green-900">
                                    #{basket.physicalNumber}
                                    {basket.isAlsoSource && (
                                      <Badge variant="secondary" className="ml-2 text-xs bg-blue-200 text-blue-800">Origine</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {basketSize ? (
                                      <Badge variant="outline" className="bg-green-200 text-green-800 border-green-400">{basketSize.code}</Badge>
                                    ) : (
                                      <span className="text-green-600 text-xs">Calcolata</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-200 text-green-800 border-green-400">{basket.position || 'Non specificata'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-green-900 font-medium">
                                    {formatNumberItalian(basket.animalCount || 0)}
                                  </TableCell>
                                  <TableCell className="text-right text-green-900">
                                    {formatNumberItalian(finalAnimalsPerKg)}
                                  </TableCell>
                                  <TableCell className="text-right text-green-900">
                                    {basket.totalWeight || 0}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentTab('selezione-destinazione')}>
                Indietro
              </Button>
              <Button 
                variant="default" 
                onClick={handleCompleteScreening}
                disabled={isCompletionInProgress || isScreeningCompleted}
              >
                {isCompletionInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completamento in corso...
                  </>
                ) : isScreeningCompleted ? (
                  'Vagliatura Completata ✓'
                ) : (
                  'Completa Vagliatura'
                )}
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
                  <div className="text-xs text-blue-600 mb-1">Inserisci solo gli animali vivi contati nel campione</div>
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
                  <div className="text-xs text-red-600 mb-1">Numero di animali morti nel campione</div>
                  <Input
                    id="deadCount"
                    type="number"
                    value={measurementData.deadCount}
                    className="border-red-200"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      // Chiamiamo direttamente il calcolo anche per gli animali morti
                      // per assicurarci che la mortalità venga calcolata
                      const updatedData = calculateMeasurementValues({
                        ...measurementData,
                        deadCount: value
                      });
                      console.log('Dati aggiornati dopo cambio animali morti:', updatedData);
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
              <div className="px-3 py-2 border rounded-md flex items-center bg-slate-50">
                <span>{measurementData.position}</span>
                <span className="ml-2 text-xs text-slate-500">(Cestello #{measurementData.physicalNumber})</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMeasurementDialogOpen(false)}>Annulla</Button>
            <Button onClick={() => {
              console.log('=== INIZIO CALCOLO FORZATO ===');
              console.log('Dati misurazione prima del calcolo:', measurementData);
              
              // FORZA sempre il ricalcolo per essere sicuri
              let finalAnimalsPerKg = 0;
              if (measurementData.sampleWeight > 0 && measurementData.sampleCount > 0) {
                finalAnimalsPerKg = Math.round((measurementData.sampleCount / measurementData.sampleWeight) * 1000);
                console.log(`CALCOLO FORZATO animalsPerKg: (${measurementData.sampleCount} / ${measurementData.sampleWeight}) * 1000 = ${finalAnimalsPerKg}`);
              } else {
                console.log('ERRORE: Non posso calcolare animalsPerKg perché:');
                console.log(`- sampleWeight: ${measurementData.sampleWeight}`);
                console.log(`- sampleCount: ${measurementData.sampleCount}`);
              }
              
              // FORZA sempre il ricalcolo del conteggio animali
              let finalAnimalCount = measurementData.animalCount;
              if (measurementData.totalWeight > 0 && finalAnimalsPerKg > 0) {
                finalAnimalCount = Math.round(measurementData.totalWeight * finalAnimalsPerKg);
                console.log(`CALCOLO FORZATO animalCount: ${measurementData.totalWeight} * ${finalAnimalsPerKg} = ${finalAnimalCount}`);
              }
              
              console.log('DATI FINALI DA INVIARE:', {
                sampleWeight: measurementData.sampleWeight,
                sampleCount: measurementData.sampleCount,
                totalWeight: measurementData.totalWeight,
                animalsPerKg: finalAnimalsPerKg,
                animalCount: finalAnimalCount
              });
              
              // Crea un nuovo cestello destinazione con i dati inseriti
              const newDestinationBasket: DestinationBasket = {
                basketId: measurementData.basketId,
                physicalNumber: measurementData.physicalNumber,
                flupsyId: measurementData.flupsyId,
                position: measurementData.position,
                destinationType: 'placed',
                animalCount: finalAnimalCount,
                deadCount: measurementData.deadCount,
                sampleWeight: measurementData.sampleWeight,
                sampleCount: measurementData.sampleCount,
                totalWeight: measurementData.totalWeight,
                animalsPerKg: finalAnimalsPerKg,
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
      
      {/* Calcolatore Draggable */}
      <DraggableCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onConfirm={(data) => {
          // Crea un nuovo cestello destinazione con i dati calcolati
          const newDestinationBasket: DestinationBasket = {
            basketId: measurementData.basketId,
            physicalNumber: measurementData.physicalNumber,
            flupsyId: measurementData.flupsyId,
            position: measurementData.position,
            row: measurementData.row,
            destinationType: 'placed',
            animalCount: data.animalCount,
            deadCount: data.deadCount,
            sampleWeight: data.sampleWeight,
            sampleCount: data.sampleCount,
            totalWeight: data.totalWeight,
            animalsPerKg: data.animalsPerKg,
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
          
          setIsCalculatorOpen(false);
        }}
        initialData={{
          sampleWeight: measurementData.sampleWeight,
          sampleCount: measurementData.sampleCount,
          totalWeight: measurementData.totalWeight,
          deadCount: measurementData.deadCount,
          animalsPerKg: measurementData.animalsPerKg,
          position: parseInt(measurementData.position) || 1
        }}
      />

      {/* Dialogo di progresso per il completamento vagliatura */}
      <CompletionProgressDialog
        isOpen={isCompletionInProgress}
        steps={completionSteps}
        currentStep={currentCompletionStep}
        totalSteps={completionSteps.length}
        onClose={() => setIsCompletionInProgress(false)}
      />
    </div>
  );
}