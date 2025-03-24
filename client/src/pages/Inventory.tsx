import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  calculateSizeTimeline, 
  getTargetSizeReachDate, 
  getFutureWeightAtDate,
  getSizeFromAnimalsPerKg
} from "@/lib/utils";
import { CalendarIcon, Search, TrendingUp, LineChart, BarChart3, ListFilter, Database, Fish, Scale } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, addMonths, isValid, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

// Importazione dei componenti
import InventorySummary from "@/components/inventory/InventorySummary";
import BasketDetailTable from "@/components/inventory/BasketDetailTable";
import GrowthPrediction from "@/components/inventory/GrowthPrediction";
import GrowthComparison from "@/components/inventory/GrowthComparison";
import SalesTimeline from "@/components/inventory/SalesTimeline";

// Interfacce dei dati
interface SizeInventory {
  sizeCode: string;
  sizeName: string;
  color: string;
  count: number;
  totalAnimals: number;
  averageAnimalsPerKg: number;
  averageWeight: number;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
}

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  flupsyName: string;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  sizeCode: string | null;
  sizeName: string | null;
  color: string | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  totalAnimals: number | null;
  lastOperationDate: string | null;
  lastOperationType: string | null;
  cycleStartDate: string | null;
  cycleDuration: number | null;
  growthRate: number | null;
}

interface GrowthPrediction {
  basketId: number;
  physicalNumber: number;
  flupsyName: string;
  currentWeight: number;
  currentAnimalsPerKg: number;
  currentSizeCode: string;
  currentSizeName: string;
  predictedWeight: number;
  predictedAnimalsPerKg: number;
  predictedSizeCode: string | null;
  predictedSizeName: string | null;
  growthPercentage: number;
  daysToTarget: number | null;
  targetDate: Date | null;
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
  notes: string | null;
  color?: string;
}

interface MortalityRate {
  id: number;
  month: string;
  sizeId: number;
  percentage: number;
  sizeName?: string;
  sizeCode?: string;
}

export default function Inventory() {
  // Stato per le statistiche di inventario
  const [inventoryStats, setInventoryStats] = useState<{
    totalBaskets: number;
    totalAnimals: number;
    averageWeight: number;
    sizeDistribution: SizeInventory[];
  }>({
    totalBaskets: 0,
    totalAnimals: 0,
    averageWeight: 0,
    sizeDistribution: [],
  });

  // Stato per i dati delle ceste
  const [basketsData, setBasketsData] = useState<BasketData[]>([]);
  
  // Stato per le previsioni di crescita
  const [growthPredictions, setGrowthPredictions] = useState<GrowthPrediction[]>([]);
  
  // Stato per i filtri delle previsioni
  const [targetSize, setTargetSize] = useState<string>("");
  const [targetDate, setTargetDate] = useState<Date | undefined>(addMonths(new Date(), 3));
  const [sgr, setSgr] = useState<number>(5); // Tasso di crescita mensile predefinito (%)
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sizeFilter, setSizeFilter] = useState<string>("");
  const [flupsyFilter, setFlupsyFilter] = useState<string>("");
  
  // Filtri per la tabella di dettaglio
  const [detailSizeFilter, setDetailSizeFilter] = useState<string>("");
  const [detailFlupsyFilter, setDetailFlupsyFilter] = useState<string>("");
  const [detailSearchTerm, setDetailSearchTerm] = useState<string>("");
  
  // Numero di mesi per le proiezioni
  const [projectionMonths, setProjectionMonths] = useState<number>(6);

  // Carica dati necessari
  const { data: baskets, isLoading: loadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: operations, isLoading: loadingOperations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: sizes, isLoading: loadingSizes } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  const { data: flupsys, isLoading: loadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['/api/cycles'],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  const { data: sgrs, isLoading: loadingSgrs } = useQuery({
    queryKey: ['/api/sgrs'],
    queryFn: getQueryFn({ on401: "throw" })
  });
  
  const { data: mortalityRates, isLoading: loadingMortalityRates } = useQuery({
    queryKey: ['/api/mortality-rates'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Prepara le opzioni per i filtri
  const sizeOptions = useMemo(() => {
    if (!sizes) return [];
    return (sizes as Size[]).map((size: Size) => ({
      value: size.code,
      label: `${size.code} - ${size.name}`,
      minAnimalsPerKg: size.minAnimalsPerKg,
      maxAnimalsPerKg: size.maxAnimalsPerKg
    }));
  }, [sizes]);
  
  const flupsyOptions = useMemo(() => {
    if (!flupsys) return [];
    return (flupsys as any[]).map((flupsy: any) => ({
      value: flupsy.id.toString(),
      label: flupsy.name
    }));
  }, [flupsys]);

  // Calcola le statistiche di inventario quando i dati sono disponibili
  useEffect(() => {
    if (baskets && operations && sizes && flupsys && cycles) {
      calculateInventoryStats();
      prepareBasketData();
    }
  }, [baskets, operations, sizes, flupsys, cycles]);
  
  // Calcola le previsioni di crescita quando cambiano i parametri
  useEffect(() => {
    if (basketsData.length > 0) {
      calculateGrowthPredictions();
    }
  }, [basketsData, targetSize, targetDate, sgr, projectionMonths]);

  // Funzione per calcolare le statistiche di inventario
  const calculateInventoryStats = () => {
    if (!baskets || !operations || !sizes) return;
    
    // Filtra solo le ceste attive con un ciclo
    const activeBaskets = (baskets as any[]).filter((basket: any) => 
      basket.state === 'active' && basket.currentCycleId !== null
    );

    // Prepara un map per le dimensioni
    const sizeMap = new Map();
    (sizes as Size[]).forEach((size: Size) => {
      sizeMap.set(size.id, size);
    });

    // Prepara la struttura per la distribuzione delle taglie
    const sizeDistribution: Record<string, SizeInventory> = {};
    
    // Inizializza con tutte le taglie dal database 
    (sizes as Size[]).forEach(size => {
      sizeDistribution[size.code] = {
        sizeCode: size.code,
        sizeName: size.name,
        color: getColorForSize(size),
        count: 0,
        totalAnimals: 0,
        averageAnimalsPerKg: 0,
        averageWeight: 0,
        minAnimalsPerKg: size.minAnimalsPerKg,
        maxAnimalsPerKg: size.maxAnimalsPerKg
      };
    });

    let totalAnimals = 0;
    let totalWeight = 0;
    let validBasketCount = 0;

    // Calcola statistiche per ogni cesta
    activeBaskets.forEach((basket: any) => {
      // Trova l'ultima operazione di questa cesta
      const basketOperations = (operations as any[])
        .filter((op: any) => op.basketId === basket.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (basketOperations.length === 0) return;
      
      const lastOperation = basketOperations[0];
      if (!lastOperation.animalsPerKg) return;

      // Calcola il peso medio
      const averageWeight = lastOperation.averageWeight || (1000000 / lastOperation.animalsPerKg);
      
      // Determina la taglia in base al numero di animali per kg (usando i dati del db)
      const matchingSize = findSizeFromAnimalsPerKg(lastOperation.animalsPerKg);
      if (!matchingSize) return;
      
      // Calcola il numero totale di animali nella cesta
      const animalCount = lastOperation.animalCount || calculateAnimalCount(lastOperation);
      
      // Aggiorna la distribuzione delle taglie
      if (sizeDistribution[matchingSize.code]) {
        sizeDistribution[matchingSize.code].count++;
        sizeDistribution[matchingSize.code].totalAnimals += animalCount;
        sizeDistribution[matchingSize.code].averageAnimalsPerKg += lastOperation.animalsPerKg;
        sizeDistribution[matchingSize.code].averageWeight += averageWeight;
      }
      
      totalAnimals += animalCount;
      totalWeight += averageWeight;
      validBasketCount++;
    });

    // Calcola medie per ogni taglia
    Object.values(sizeDistribution).forEach(size => {
      if (size.count > 0) {
        size.averageAnimalsPerKg = size.averageAnimalsPerKg / size.count;
        size.averageWeight = size.averageWeight / size.count;
      }
    });

    // Filtra solo le taglie con conteggio > 0 e converti in array
    const filteredSizeDistribution = Object.values(sizeDistribution)
      .filter(size => size.count > 0)
      .sort((a, b) => {
        // Ordina per animalsPerKg (dal più grande al più piccolo - dalle taglie più piccole alle più grandi)
        const aValue = a.averageAnimalsPerKg || 0;
        const bValue = b.averageAnimalsPerKg || 0;
        return bValue - aValue; 
      });

    setInventoryStats({
      totalBaskets: validBasketCount,
      totalAnimals,
      averageWeight: validBasketCount > 0 ? totalWeight / validBasketCount : 0,
      sizeDistribution: filteredSizeDistribution,
    });
  };
  
  // Funzione per preparare i dati dettagliati delle ceste
  const prepareBasketData = () => {
    if (!baskets || !operations || !sizes || !flupsys || !cycles) return;
    
    // Filtra solo le ceste attive con un ciclo
    const activeBaskets = (baskets as any[]).filter((basket: any) => 
      basket.state === 'active' && basket.currentCycleId !== null
    );
    
    // Prepara mappe per ricerca veloce
    const flupsyMap = new Map();
    (flupsys as any[]).forEach((flupsy: any) => {
      flupsyMap.set(flupsy.id, flupsy);
    });
    
    const cycleMap = new Map();
    (cycles as any[]).forEach((cycle: any) => {
      cycleMap.set(cycle.id, cycle);
    });
    
    const sizeMap = new Map();
    (sizes as Size[]).forEach((size: Size) => {
      sizeMap.set(size.id, size);
    });
    
    // Prepara dati per ogni cesta
    const basketsDataArray: BasketData[] = [];
    
    activeBaskets.forEach((basket: any) => {
      // Trova l'ultima operazione di questa cesta
      const basketOperations = (operations as any[])
        .filter((op: any) => op.basketId === basket.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (basketOperations.length === 0) return;
      
      const lastOperation = basketOperations[0];
      if (!lastOperation.animalsPerKg) return;
      
      // Ottieni il ciclo corrente
      const currentCycle = cycleMap.get(basket.currentCycleId);
      if (!currentCycle) return;
      
      // Ottieni il FLUPSY
      const flupsy = flupsyMap.get(basket.flupsyId);
      if (!flupsy) return;
      
      // Calcola il peso medio e la taglia
      const averageWeight = lastOperation.averageWeight || (1000000 / lastOperation.animalsPerKg);
      const matchingSize = findSizeFromAnimalsPerKg(lastOperation.animalsPerKg);
      
      // Calcola la durata del ciclo in giorni
      const cycleDuration = differenceInDays(
        new Date(), 
        new Date(currentCycle.startDate)
      );
      
      // Calcola il tasso di crescita se ci sono almeno due operazioni
      let growthRate: number | null = null;
      if (basketOperations.length >= 2) {
        const firstMeasureOp = basketOperations
          .filter(op => op.type === 'misura' || op.type === 'peso')
          .pop(); // Prende la prima operazione di misura
          
        const lastMeasureOp = basketOperations
          .filter(op => op.type === 'misura' || op.type === 'peso')
          .shift(); // Prende l'ultima operazione di misura
          
        if (firstMeasureOp && lastMeasureOp && 
            firstMeasureOp.averageWeight && lastMeasureOp.averageWeight) {
          const daysDiff = differenceInDays(
            new Date(lastMeasureOp.date),
            new Date(firstMeasureOp.date)
          );
          
          if (daysDiff > 0) {
            // Calcola SGR come percentuale mensile
            const dailyGrowthRate = Math.pow(
              lastMeasureOp.averageWeight / firstMeasureOp.averageWeight, 
              1 / daysDiff
            ) - 1;
            growthRate = dailyGrowthRate * 30 * 100; // Converti in percentuale mensile
          }
        }
      }
      
      // Calcola il numero totale di animali nella cesta
      const totalAnimals = lastOperation.animalCount || calculateAnimalCount(lastOperation);
      
      basketsDataArray.push({
        id: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyId: basket.flupsyId,
        flupsyName: flupsy.name,
        row: basket.row,
        position: basket.position,
        state: basket.state,
        currentCycleId: basket.currentCycleId,
        sizeCode: matchingSize?.code || null,
        sizeName: matchingSize?.name || null,
        color: matchingSize ? getColorForSize(matchingSize) : null,
        animalsPerKg: lastOperation.animalsPerKg,
        averageWeight,
        totalAnimals,
        lastOperationDate: lastOperation.date,
        lastOperationType: lastOperation.type,
        cycleStartDate: currentCycle.startDate,
        cycleDuration,
        growthRate
      });
    });
    
    // Ordina per numero fisico della cesta
    basketsDataArray.sort((a, b) => a.physicalNumber - b.physicalNumber);
    
    setBasketsData(basketsDataArray);
  };
  
  // Funzione per calcolare le previsioni di crescita
  const calculateGrowthPredictions = () => {
    if (!targetDate && !targetSize) return;
    
    const predictions: GrowthPrediction[] = [];
    
    // Ottiene la taglia target se specificata
    let targetSizeObj: Size | undefined;
    if (targetSize) {
      targetSizeObj = (sizes as Size[]).find((s: Size) => s.code === targetSize);
    }
    
    // Calcola le previsioni per ogni cesta
    basketsData.forEach(basket => {
      if (!basket.averageWeight || !basket.animalsPerKg) return;
      
      // Usa il tasso di crescita specifico della cesta se disponibile, altrimenti usa quello generale
      const growthRateToUse = basket.growthRate !== null ? basket.growthRate : sgr;
      
      let predictedWeight, predictedAnimalsPerKg, daysToTarget = null, targetReachDate = null;
      let predictedSizeCode = null, predictedSizeName = null;
      
      if (targetDate) {
        // Calcola il peso previsto alla data target
        predictedWeight = getFutureWeightAtDate(
          basket.averageWeight,
          new Date(basket.lastOperationDate || new Date()),
          growthRateToUse,
          targetDate
        );
        
        // Calcola gli animali per kg previsti
        predictedAnimalsPerKg = 1000000 / predictedWeight;
        
        // Determina la taglia prevista
        const predictedSize = findSizeFromAnimalsPerKg(predictedAnimalsPerKg);
        if (predictedSize) {
          predictedSizeCode = predictedSize.code;
          predictedSizeName = predictedSize.name;
        }
      }
      
      if (targetSize && targetSizeObj) {
        // Calcola i giorni per raggiungere la taglia target
        if (targetSizeObj.minAnimalsPerKg && targetSizeObj.maxAnimalsPerKg) {
          // Usa il valore medio della taglia target per i calcoli
          const targetAnimalsPerKg = (targetSizeObj.minAnimalsPerKg + targetSizeObj.maxAnimalsPerKg) / 2;
          const targetWeight = 1000000 / targetAnimalsPerKg;
          
          // Calcola la data prevista per raggiungere la taglia target
          const result = getTargetSizeReachDate(
            basket.averageWeight,
            new Date(basket.lastOperationDate || new Date()),
            growthRateToUse,
            targetSizeObj.code
          );
          
          if (result) {
            targetReachDate = result;
            daysToTarget = differenceInDays(result, new Date());
          }
        }
      }
      
      // Crescita percentuale
      const growthPercentage = targetDate 
        ? (predictedWeight! / basket.averageWeight - 1) * 100
        : 0;
      
      predictions.push({
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyName: basket.flupsyName,
        currentWeight: basket.averageWeight,
        currentAnimalsPerKg: basket.animalsPerKg,
        currentSizeCode: basket.sizeCode || 'N/D',
        currentSizeName: basket.sizeName || 'Non definita',
        predictedWeight: predictedWeight || 0,
        predictedAnimalsPerKg: predictedAnimalsPerKg || 0,
        predictedSizeCode,
        predictedSizeName,
        growthPercentage,
        daysToTarget,
        targetDate: targetReachDate
      });
    });
    
    setGrowthPredictions(predictions);
  };
  
  // Funzione per trovare la taglia in base agli animali per kg
  const findSizeFromAnimalsPerKg = (animalsPerKg: number): Size | undefined => {
    if (!sizes) return undefined;
    
    // Cerca una taglia che corrisponda al range di animali per kg
    return (sizes as Size[]).find((size: Size) => 
      size.minAnimalsPerKg !== null && 
      size.maxAnimalsPerKg !== null &&
      animalsPerKg >= size.minAnimalsPerKg && 
      animalsPerKg <= size.maxAnimalsPerKg
    );
  };
  
  // Funzione per calcolare il numero di animali da animalsPerKg e totalWeight
  const calculateAnimalCount = (operation: any): number => {
    if (operation.animalCount) return operation.animalCount;
    if (operation.animalsPerKg && operation.totalWeight) {
      return Math.round(operation.animalsPerKg * operation.totalWeight / 1000);
    }
    return 0;
  };
  
  // Funzione per formattare i numeri in stile europeo
  const formatNumberEU = (value: number): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0";
    }
    
    // Formato europeo: 1.000 (punto come separatore delle migliaia)
    return value.toLocaleString('it-IT', { 
      maximumFractionDigits: 0 
    });
  };
  
  // Funzione per formattare i numeri decimali in stile europeo
  const formatDecimalEU = (value: number): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0,00";
    }
    
    // Formato europeo: 1.000,00 (punto separatore migliaia, virgola per decimali)
    return value.toLocaleString('it-IT', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };
  
  // Funzione per formattare date in formato italiano
  const formatDateIT = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!isValid(dateObj)) return 'Data non valida';
      return format(dateObj, 'dd/MM/yyyy', { locale: it });
    } catch (error) {
      return 'Data non valida';
    }
  };
  
  // Funzione per ottenere il colore per una taglia
  const getColorForSize = (size: Size): string => {
    const tagColorMap: Record<string, string> = {
      'T1': '#1e40af', // Blu scuro
      'T2': '#3b82f6', // Blu
      'T3': '#22c55e', // Verde
      'T4': '#eab308', // Giallo
      'T5': '#f97316', // Arancione
      'T6': '#ef4444', // Rosso
      'T7': '#b91c1c', // Rosso scuro
    };
    
    return tagColorMap[size.code] || '#9ca3af'; // Grigio come fallback
  };
  
  // Filtra i dati delle ceste per la tabella di dettaglio
  const filteredBasketsData = useMemo(() => {
    return basketsData.filter(basket => {
      // Filtra per numero di cesta
      if (detailSearchTerm && !basket.physicalNumber.toString().includes(detailSearchTerm)) {
        return false;
      }
      
      // Filtra per taglia
      if (detailSizeFilter && detailSizeFilter !== "all" && basket.sizeCode !== detailSizeFilter) {
        return false;
      }
      
      // Filtra per FLUPSY
      if (detailFlupsyFilter && detailFlupsyFilter !== "all" && basket.flupsyId.toString() !== detailFlupsyFilter) {
        return false;
      }
      
      return true;
    });
  }, [basketsData, detailSearchTerm, detailSizeFilter, detailFlupsyFilter]);
  
  // Prepara i dati per il grafico a dispersione
  const scatterData = useMemo(() => {
    return basketsData.map(basket => ({
      basket: basket.physicalNumber,
      flupsy: basket.flupsyName,
      x: basket.averageWeight || 0, // Peso medio
      y: basket.animalsPerKg || 0, // Animali per kg
      z: basket.totalAnimals || 0, // Numero totale di animali
      size: basket.sizeCode || 'N/D',
      cycleDuration: basket.cycleDuration || 0,
    }));
  }, [basketsData]);
  
  // Prepara i dati per il grafico di comparazione delle crescite
  const growthChartData = useMemo(() => {
    if (!targetDate) return [];
    
    return growthPredictions.map(pred => ({
      name: `Cesta ${pred.physicalNumber}`,
      flupsyName: pred.flupsyName,
      current: pred.currentWeight,
      predicted: pred.predictedWeight,
      growth: pred.growthPercentage,
      size: pred.currentSizeCode,
      predictedSize: pred.predictedSizeCode,
      animalsPerKg: pred.currentAnimalsPerKg,
      predictedAnimalsPerKg: pred.predictedAnimalsPerKg
    }));
  }, [growthPredictions, targetDate]);
  
  // Filtro le previsioni di crescita in base ai filtri selezionati
  const filteredGrowthPredictions = useMemo(() => {
    return growthPredictions.filter(prediction => {
      // Filtra per numero di cesta
      if (searchTerm && !prediction.physicalNumber.toString().includes(searchTerm)) {
        return false;
      }
      
      // Se stiamo filtrando per taglia attuale
      if (sizeFilter && sizeFilter !== "all" && prediction.currentSizeCode !== sizeFilter) {
        return false;
      }
      
      // Se stiamo filtrando per FLUPSY
      if (flupsyFilter && flupsyFilter !== "all" && !prediction.flupsyName.toLowerCase().includes(flupsyFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [growthPredictions, searchTerm, sizeFilter, flupsyFilter]);
  
  const isLoading = 
    loadingBaskets || 
    loadingOperations || 
    loadingSizes || 
    loadingFlupsys || 
    loadingCycles || 
    loadingSgrs ||
    loadingMortalityRates;

  return (
    <>
      <Helmet>
        <title>Inventario - Gestione FLUPSY</title>
      </Helmet>
      
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-200/40 rounded-bl-[80px] -z-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/30 to-blue-200/30 rounded-tr-[60px] -z-10"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100/70 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-2 backdrop-blur-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                Dashboard inventario
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-blue-900">Inventario e Previsioni</h2>
              <p className="text-blue-700 text-sm mt-1 max-w-lg">Gestione completa delle ceste e delle proiezioni di crescita, con analisi dettagliate e monitoraggio delle taglie</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 bg-white shadow-sm hover:bg-blue-50 border-blue-200 transition-all">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <CalendarIcon className="h-3 w-3 text-blue-600" />
                      </div>
                      {targetDate ? (
                        <span className="font-medium">{formatDateIT(targetDate)}</span>
                      ) : (
                        <span>Scegli data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-blue-200 shadow-md rounded-xl overflow-hidden" align="end">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Seleziona data target</span>
                      <CalendarIcon className="h-4 w-4 text-blue-400" />
                    </div>
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      initialFocus
                      locale={it}
                      className="rounded-b-xl"
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="flex flex-col gap-1 bg-white p-3 rounded-xl shadow-sm border border-blue-200 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="text-sm font-medium text-blue-800 flex justify-between items-center gap-3 px-1 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                      </div>
                      <span>SGR mensile</span>
                    </div>
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">{sgr}%</span>
                  </div>
                  <Slider
                    defaultValue={[sgr]}
                    min={1}
                    max={20}
                    step={0.5}
                    onValueChange={(values) => setSgr(values[0])}
                    className="w-48 relative z-10"
                  />
                </div>
                
                <Select value={targetSize} onValueChange={setTargetSize}>
                  <SelectTrigger className="min-w-[220px] bg-white shadow-sm border-blue-200 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <ListFilter className="h-3 w-3 text-blue-600" />
                      </div>
                      <SelectValue placeholder="Taglia target" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 rounded-xl overflow-hidden shadow-md">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                      <span className="text-sm font-medium text-blue-700">Seleziona taglia target</span>
                    </div>
                    <SelectGroup>
                      <SelectItem value="none" className="focus:bg-blue-50/50">Nessuna taglia target</SelectItem>
                      {sizeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="font-medium focus:bg-blue-50/50">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6">
            <TabsTrigger value="summary" className="rounded-lg border-0 data-[state=active]:border-0 data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-700 shadow-none data-[state=active]:shadow-sm">
              <LineChart className="h-4 w-4 mr-2" />
              Riepilogo
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-lg border-0 data-[state=active]:border-0 data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-slate-700 shadow-none data-[state=active]:shadow-sm">
              <ListFilter className="h-4 w-4 mr-2" />
              Dettaglio Ceste
            </TabsTrigger>
            <TabsTrigger value="predictions" className="rounded-lg border-0 data-[state=active]:border-0 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-700 shadow-none data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Previsioni
            </TabsTrigger>
            <TabsTrigger value="comparison" className="rounded-lg border-0 data-[state=active]:border-0 data-[state=active]:bg-purple-500 data-[state=active]:text-white text-slate-700 shadow-none data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Comparazione
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg border-0 data-[state=active]:border-0 data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-700 shadow-none data-[state=active]:shadow-sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Timeline Vendite
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <Card className="border border-blue-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-500" />
                  Riepilogo Inventario
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Panoramica delle giacenze e distribuzione per taglia
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-blue-50 border-b border-blue-100 flex justify-between items-center px-4 py-3">
                      <CardTitle className="text-lg text-blue-700">Ceste Attive</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <LineChart className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl font-bold text-blue-900">{formatNumberEU(inventoryStats.totalBaskets)}</div>
                      <div className="text-xs mt-2 text-blue-500">unità in produzione</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-green-50 border-b border-green-100 flex justify-between items-center px-4 py-3">
                      <CardTitle className="text-lg text-green-700">Animali Totali</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl font-bold text-green-900">{formatNumberEU(inventoryStats.totalAnimals)}</div>
                      <div className="text-xs mt-2 text-green-500">esemplari in allevamento</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-amber-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-amber-50 border-b border-amber-100 flex justify-between items-center px-4 py-3">
                      <CardTitle className="text-lg text-amber-700">Peso Medio</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl font-bold text-amber-900">{formatDecimalEU(inventoryStats.averageWeight)} <span className="text-sm">mg</span></div>
                      <div className="text-xs mt-2 text-amber-500">per esemplare</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <InventorySummary 
                    inventoryStats={inventoryStats}
                    scatterData={scatterData}
                    formatNumberEU={formatNumberEU}
                    formatDecimalEU={formatDecimalEU}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details">
            <Card className="border border-indigo-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
                <CardTitle className="text-indigo-800 flex items-center gap-2">
                  <ListFilter className="h-5 w-5 text-indigo-500" />
                  Dettaglio Ceste
                </CardTitle>
                <CardDescription className="text-indigo-600">
                  Elenco dettagliato di tutte le ceste attive
                </CardDescription>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                      placeholder="Cerca per numero cesta"
                      className="pl-10 w-[220px] bg-white border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                      value={detailSearchTerm}
                      onChange={(e) => setDetailSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={detailSizeFilter} onValueChange={setDetailSizeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-100"></div>
                          <SelectValue placeholder="Filtra per taglia" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte le taglie</SelectItem>
                        {sizeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={detailFlupsyFilter} onValueChange={setDetailFlupsyFilter}>
                      <SelectTrigger className="w-full sm:w-[220px] border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-100"></div>
                          <SelectValue placeholder="Filtra per FLUPSY" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                        {flupsyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDetailSearchTerm('');
                      setDetailSizeFilter('');
                      setDetailFlupsyFilter('');
                    }}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    Reset filtri
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="rounded-xl border border-indigo-50 overflow-hidden shadow-sm">
                  <BasketDetailTable 
                    baskets={filteredBasketsData}
                    formatNumberEU={formatNumberEU}
                    formatDecimalEU={formatDecimalEU}
                    formatDateIT={formatDateIT}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="predictions">
            <Card className="border border-emerald-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
                <CardTitle className="text-emerald-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  {targetSize ? 
                    `Previsione di raggiungimento taglia ${targetSize}` : 
                    targetDate ? 
                    `Previsione taglie al ${formatDateIT(targetDate)}` : 
                    'Previsioni di Crescita'
                  }
                </CardTitle>
                <CardDescription className="text-emerald-600">
                  {targetSize ? 
                    `Elenco delle ceste che raggiungeranno la taglia ${targetSize} e quando` : 
                    targetDate ? 
                    `Proiezione delle taglie che raggiungeranno le ceste alla data selezionata` : 
                    'Seleziona una data target o una taglia target per visualizzare le previsioni'
                  }
                </CardDescription>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                      placeholder="Cerca per numero cesta"
                      className="pl-10 w-[220px] bg-white border-emerald-100 focus:border-emerald-300 focus:ring-emerald-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={sizeFilter} onValueChange={setSizeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-100"></div>
                          <SelectValue placeholder="Filtra per taglia" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte le taglie</SelectItem>
                        {sizeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-grow sm:flex-grow-0">
                    <Select value={flupsyFilter} onValueChange={setFlupsyFilter}>
                      <SelectTrigger className="w-full sm:w-[220px] border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-100"></div>
                          <SelectValue placeholder="Filtra per FLUPSY" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                        {flupsyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSizeFilter('');
                      setFlupsyFilter('');
                    }}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    Reset filtri
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {(targetDate || targetSize) ? (
                  <div className="rounded-xl border border-emerald-50 overflow-hidden shadow-sm p-4">
                    <GrowthPrediction 
                      predictions={filteredGrowthPredictions}
                      targetSize={targetSize}
                      targetDate={targetDate}
                      growthChartData={growthChartData}
                      sizes={sizes as Size[]}
                      formatNumberEU={formatNumberEU}
                      formatDecimalEU={formatDecimalEU}
                      formatDateIT={formatDateIT}
                      getColorForSize={getColorForSize}
                    />
                  </div>
                ) : (
                  <div className="text-center bg-white rounded-xl border border-emerald-50 shadow-sm py-16">
                    <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-emerald-700">Nessuna previsione disponibile</h3>
                    <p className="mt-2 text-sm text-emerald-600 max-w-md mx-auto">
                      Seleziona una data target o una taglia target nei controlli qui sotto per visualizzare le previsioni di crescita
                    </p>
                    
                    <div className="flex flex-wrap gap-6 justify-center mt-8 max-w-3xl mx-auto px-4">
                      <div className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/40 w-full md:w-auto">
                        <h4 className="text-sm font-medium text-emerald-700 mb-2">Taglia Target</h4>
                        <Select value={targetSize} onValueChange={setTargetSize}>
                          <SelectTrigger className="w-full border-emerald-200 bg-white">
                            <SelectValue placeholder="Seleziona taglia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nessuna taglia</SelectItem>
                            {sizeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/40 w-full md:w-auto">
                        <h4 className="text-sm font-medium text-emerald-700 mb-2">Data Target</h4>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal border-emerald-200 bg-white"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {targetDate ? (
                                format(targetDate, "d MMMM yyyy", { locale: it })
                              ) : (
                                <span>Seleziona data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={targetDate}
                              onSelect={setTargetDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/40 w-full md:w-auto">
                        <h4 className="text-sm font-medium text-emerald-700 mb-2">SGR mensile (%)</h4>
                        <div className="pt-2 pb-4">
                          <Slider
                            value={[sgr]}
                            onValueChange={(values) => setSgr(values[0])}
                            min={0}
                            max={20}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="text-center mt-2 font-medium">{sgr}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comparison">
            <Card className="border border-purple-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                <CardTitle className="text-purple-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Comparazione Crescita
                </CardTitle>
                <CardDescription className="text-purple-600">
                  Confronto dei tassi di crescita e proiezioni future
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="rounded-xl border border-purple-50 overflow-hidden shadow-sm p-4">
                  <GrowthComparison 
                    basketsData={basketsData}
                    inventoryStats={inventoryStats}
                    sgr={sgr}
                    sizes={sizes as Size[]}
                    formatNumberEU={formatNumberEU}
                    formatDecimalEU={formatDecimalEU}
                    formatDateIT={formatDateIT}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline">
            <Card className="border border-amber-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-amber-500" />
                  Timeline di Vendita
                </CardTitle>
                <CardDescription className="text-amber-600">
                  Proiezione cronologica delle taglie commerciali
                </CardDescription>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex-grow sm:flex-grow-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Mesi di proiezione:</span>
                      <Slider
                        className="w-[200px]"
                        min={1}
                        max={12}
                        step={1}
                        value={[projectionMonths]}
                        onValueChange={(value) => setProjectionMonths(value[0])}
                      />
                      <span className="w-9 text-center bg-amber-50 border border-amber-100 rounded-md text-sm py-1">
                        {projectionMonths}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-grow sm:flex-grow-0">
                    <Select 
                      value={sgr.toString()} 
                      onValueChange={(val) => setSgr(parseFloat(val))}
                    >
                      <SelectTrigger className="w-full sm:w-[220px] border-amber-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-100"></div>
                          <SelectValue placeholder="SGR Mensile" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1% - Crescita molto lenta</SelectItem>
                        <SelectItem value="3">3% - Crescita lenta</SelectItem>
                        <SelectItem value="5">5% - Crescita media (Default)</SelectItem>
                        <SelectItem value="7">7% - Crescita veloce</SelectItem>
                        <SelectItem value="10">10% - Crescita molto veloce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="rounded-xl border border-amber-50 overflow-hidden shadow-sm p-4">
                  <SalesTimeline 
                    basketsData={basketsData}
                    sizes={sizes as Size[]}
                    sgrRates={sgrs as any[]}
                    mortalityRates={mortalityRates as MortalityRate[]}
                    projectionMonths={projectionMonths}
                    targetSizes={['TP-1500', 'TP-2000', 'TP-3000', 'TP-5000']}
                    formatNumberEU={formatNumberEU}
                    formatDecimalEU={formatDecimalEU}
                    formatDateIT={formatDateIT}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}