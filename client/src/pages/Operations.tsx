import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Eye, Search, Filter, Pencil, Plus, Trash2, AlertTriangle, Copy, 
  ArrowDown, ArrowUp, RotateCw, Calendar, Box, Target, Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { monthlyToDaily } from '@/lib/utils';
import OperationForm from '@/components/OperationForm';
import GrowthPerformanceIndicator from '@/components/GrowthPerformanceIndicator';

export default function Operations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [flupsyFilter, setFlupsyFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [cycleStateFilter, setCycleStateFilter] = useState('active'); // Nuovo filtro: 'active', 'closed', 'all'
  const [viewMode, setViewMode] = useState<'table' | 'cycles'>('cycles');
  const [expandedCycles, setExpandedCycles] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  
  // Query operations
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  // Query baskets for reference
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  // Query flupsys for filter
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  // Query cycles for filter and grouping
  const { data: cycles, isLoading: isLoadingCycles } = useQuery({
    queryKey: ['/api/cycles'],
  });
  
  // Query sizes for operation size display
  const { data: sizes, isLoading: isLoadingSizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Query lots for operation lot display
  const { data: lots, isLoading: isLoadingLots } = useQuery({
    queryKey: ['/api/lots'],
  });
  
  // Query SGR data for growth performance calculation
  const { data: sgrData, isLoading: isLoadingSgr } = useQuery({
    queryKey: ['/api/sgr'],
  });
  
  // Alias for SGR data (for consistency in naming)
  const sgrs = sgrData;

  // Create mutation
  const createOperationMutation = useMutation({
    mutationFn: async (newOperation: any) => {
      // Debug
      console.log('=============== CREATE OPERATION MUTATION ===============');
      console.log('Received operation data:', newOperation);
      
      // Recupera informazioni sulla cesta
      const basket = baskets?.find(b => b.id === newOperation.basketId);
      console.log('Found basket:', basket);
      
      // Determina se l'operazione è di prima attivazione o di vendita/selezione
      const isPrimaAttivazione = newOperation.type === 'prima-attivazione';
      const isVendita = newOperation.type === 'vendita' || newOperation.type === 'selezione-vendita';
      console.log('Operation type checks:', { isPrimaAttivazione, isVendita });
      
      // Determina lo stato della cesta
      const isBasketAvailable = basket?.state === 'available';
      const isBasketActive = basket?.state === 'active';
      console.log('Basket state checks:', { isBasketAvailable, isBasketActive });
      
      let createdOperation;
      
      // 1. Se la cesta è disponibile e l'operazione è di prima attivazione
      if (isBasketAvailable && isPrimaAttivazione) {
        // Crea direttamente l'operazione di prima attivazione
        // Il backend si occuperà di creare il ciclo e aggiornare lo stato della cesta
        createdOperation = await apiRequest({
          url: '/api/operations',
          method: 'POST',
          body: newOperation
        });
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 2. Se la cesta è attiva e l'operazione è di vendita
      else if (isBasketActive && isVendita) {
        // Crea direttamente l'operazione di vendita
        // Il backend si occuperà di chiudere il ciclo e aggiornare lo stato della cesta
        createdOperation = await apiRequest({
          url: '/api/operations',
          method: 'POST',
          body: newOperation
        });
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 3. Operazioni normali
      else {
        // Utilizziamo la route diretta per tutte le operazioni normali
        // Questa è più resiliente e gestisce meglio i casi in cui cycleId manca
        createdOperation = await apiRequest({
          url: '/api/direct-operations',
          method: 'POST',
          body: newOperation
        });
      }
      
      return createdOperation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata registrata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la registrazione dell'operazione",
        variant: "destructive",
      });
    }
  });
  
  // Update mutation
  const updateOperationMutation = useMutation({
    mutationFn: (data: any) => apiRequest({
      url: `/api/operations/${data.id}`,
      method: 'PATCH',
      body: data.operation
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsEditDialogOpen(false);
      setSelectedOperation(null);
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata aggiornata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dell'operazione",
        variant: "destructive",
      });
    }
  });
  
  // Delete mutation
  const deleteOperationMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/operations/${id}`,
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsDeleteDialogOpen(false);
      setSelectedOperation(null);
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione dell'operazione",
        variant: "destructive",
      });
    }
  });

  // Group operations by cycle with enriched data
  const operationsByCycle = useMemo(() => {
    if (!operations || !cycles || !lots || !sizes || !flupsys) return {};
    
    // Log dello stato dei dati delle operazioni prima dell'elaborazione
    console.log("Stato iniziale operazioni:", operations.map(op => ({
      id: op.id,
      type: op.type,
      cycleId: op.cycleId,
      lotId: op.lotId,
      hasLot: !!op.lot
    })));
    
    // Log dei lotti disponibili
    console.log("Lotti disponibili:", lots.map(l => ({ id: l.id, name: l.name })));
    
    const grouped: { [key: string]: any[] } = {};
    
    operations.forEach((op: any) => {
      if (!op.cycleId) return;
      
      const cycleId = op.cycleId.toString();
      if (!grouped[cycleId]) {
        grouped[cycleId] = [];
      }
      
      // Arricchisci i dati prima di aggiungerli al gruppo
      let enrichedOp = { ...op };
      
      // Arricchisci i dati del lotto se non presente ma c'è l'ID
      if (!enrichedOp.lot && enrichedOp.lotId && lots) {
        const matchingLot = lots.find((l: any) => l.id === enrichedOp.lotId);
        if (matchingLot) {
          enrichedOp.lot = matchingLot;
          console.log(`Lotto trovato per operazione ${op.id}: ${matchingLot.name}`);
        }
      }
      
      // Arricchisci i dati della taglia se non presente ma c'è l'ID
      if (!enrichedOp.size && enrichedOp.sizeId && sizes) {
        enrichedOp.size = sizes.find((s: any) => s.id === enrichedOp.sizeId);
      }
      
      // Arricchisci i dati del cestello con FLUPSY
      if (enrichedOp.basket && enrichedOp.basket.flupsyId && flupsys) {
        const flupsy = flupsys.find((f: any) => f.id === enrichedOp.basket.flupsyId);
        if (flupsy) {
          enrichedOp.basket.flupsy = flupsy;
        }
      }
      
      grouped[cycleId].push(enrichedOp);
    });
    
    // Sort operations in each cycle by date
    Object.keys(grouped).forEach(cycleId => {
      // Prima ordina le operazioni per data
      grouped[cycleId].sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Dopo l'ordinamento, propaga le informazioni di lotto all'interno dello stesso ciclo
      // per le operazioni che non hanno un lotto definito
      if (grouped[cycleId].length > 0) {
        let lastKnownLot = null;
        
        // Prima passata in avanti - propaga il lotto dalle operazioni precedenti
        for (let i = 0; i < grouped[cycleId].length; i++) {
          if (grouped[cycleId][i].lot) {
            lastKnownLot = grouped[cycleId][i].lot;
          } else if (lastKnownLot && (!grouped[cycleId][i].lot || !grouped[cycleId][i].lotId)) {
            // Se questa operazione non ha un lotto ma abbiamo un lotto noto dallo stesso ciclo
            // assegna il lotto noto a questa operazione
            grouped[cycleId][i].lot = lastKnownLot;
            grouped[cycleId][i].lotId = lastKnownLot.id;
            console.log(`Propagato lotto '${lastKnownLot.name}' all'operazione ${grouped[cycleId][i].id} (forward)`);
          }
        }
        
        // Seconda passata all'indietro - propaga il lotto dalle operazioni successive
        // Utile quando la prima operazione non ha un lotto ma le successive sì
        lastKnownLot = null;
        for (let i = grouped[cycleId].length - 1; i >= 0; i--) {
          if (grouped[cycleId][i].lot) {
            lastKnownLot = grouped[cycleId][i].lot;
          } else if (lastKnownLot && (!grouped[cycleId][i].lot || !grouped[cycleId][i].lotId)) {
            // Se questa operazione non ha un lotto ma abbiamo un lotto noto dallo stesso ciclo
            // assegna il lotto noto a questa operazione
            grouped[cycleId][i].lot = lastKnownLot;
            grouped[cycleId][i].lotId = lastKnownLot.id;
            console.log(`Propagato lotto '${lastKnownLot.name}' all'operazione ${grouped[cycleId][i].id} (backward)`);
          }
        }
      }
    });
    
    return grouped;
  }, [operations, cycles, lots, sizes, flupsys]);
  
  // Function to toggle cycle expansion
  const toggleCycleExpansion = (cycleId: number) => {
    if (expandedCycles.includes(cycleId)) {
      setExpandedCycles(expandedCycles.filter(id => id !== cycleId));
    } else {
      setExpandedCycles([...expandedCycles, cycleId]);
    }
  };
  
  // Function to get cycle details
  const getCycleDetails = (cycleId: number) => {
    return cycles?.find((c: any) => c.id === cycleId);
  };
  
  // Function to calculate growth between two measurement operations
  const calculateGrowthBetweenOperations = (prevOp: any, currOp: any) => {
    if (!prevOp || !currOp || !prevOp.animalsPerKg || !currOp.animalsPerKg) {
      return null;
    }
    
    // Calcola il peso medio in mg da animali/kg
    const prevWeight = 1000000 / prevOp.animalsPerKg;
    const currWeight = 1000000 / currOp.animalsPerKg;
    
    // Calcola la differenza in giorni tra le due date
    const prevDate = new Date(prevOp.date);
    const currDate = new Date(currOp.date);
    const daysDiff = differenceInDays(currDate, prevDate);
    
    if (daysDiff <= 0) return null;
    
    // Calcola la percentuale di crescita
    const weightDiff = currWeight - prevWeight;
    const growthPercent = (weightDiff / prevWeight) * 100;
    
    return {
      prevWeight,
      currWeight,
      weightDiff,
      daysDiff,
      growthPercent
    };
  };
  
  // Function to get SGR data for a specific month
  const getSgrForMonth = (date: Date) => {
    if (!sgrData || sgrData.length === 0) return null;
    
    const month = format(date, 'MMMM', { locale: it }).toLowerCase();
    return sgrData.find((sgr: any) => sgr.month.toLowerCase() === month);
  };
  
  // Function to calculate theoretical growth based on SGR
  const calculateTheoreticalGrowth = (date: Date, days: number) => {
    const sgrInfo = getSgrForMonth(date);
    if (!sgrInfo) return null;
    
    // I valori SGR dal database sono già percentuali giornaliere
    // Formula corretta per calcolare l'aumento di peso teorico:
    // W_t = W_0 * e^((SGR/100) * t)
    // 
    // La percentuale di crescita totale sarà: (W_t/W_0 - 1) * 100 = (e^((SGR/100) * t) - 1) * 100
    
    const dailySgrPercent = sgrInfo.percentage; // Già una percentuale giornaliera
    const theoreticalGrowthPercent = (Math.exp((dailySgrPercent / 100) * days) - 1) * 100;
    
    return {
      sgrMonth: sgrInfo.month,
      sgrPercentage: sgrInfo.percentage,
      sgrDailyPercentage: dailySgrPercent, // Già in percentuale giornaliera
      theoreticalGrowthPercent
    };
  };
  
  // Filter operations
  const filteredOperations = useMemo(() => {
    if (!operations || !cycles || !lots) return [];
    
    // Filtriamo prima le operazioni secondo i criteri
    const filtered = operations.filter((op: any) => {
      // Filter by search term
      const matchesSearch = searchTerm === '' || 
        `${op.basketId}`.includes(searchTerm) || 
        `${op.cycleId}`.includes(searchTerm) ||
        (op.basket && `${op.basket.physicalNumber}`.includes(searchTerm));
      
      // Filter by operation type
      const matchesType = typeFilter === 'all' || op.type === typeFilter;
      
      // Filter by date
      const matchesDate = dateFilter === '' || 
        format(new Date(op.date), 'yyyy-MM-dd') === dateFilter;
      
      // Filter by FLUPSY (baskets belong to a FLUPSY)
      const matchesFlupsy = flupsyFilter === 'all' || 
        (op.basket && op.basket.flupsyId.toString() === flupsyFilter);
      
      // Filter by cycle
      const matchesCycle = cycleFilter === 'all' || 
        op.cycleId.toString() === cycleFilter;
      
      // Filter by cycle state
      const cycle = cycles.find((c: any) => c.id === op.cycleId);
      const matchesCycleState = cycleStateFilter === 'all' || 
        (cycleStateFilter === 'active' && cycle && cycle.state === 'active') ||
        (cycleStateFilter === 'closed' && cycle && cycle.state === 'closed');
      
      return matchesSearch && matchesType && matchesDate && matchesFlupsy && matchesCycle && matchesCycleState;
    });
    
    // Ora ordiniamo le operazioni per ciclo e all'interno di ciascun ciclo per data in ordine ascendente
    const sorted = [...filtered].sort((a, b) => {
      // Prima ordina per ciclo
      if (a.cycleId !== b.cycleId) {
        return a.cycleId - b.cycleId;
      }
      
      // Se sono dello stesso ciclo, ordina per data (ascendente)
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Ora che le operazioni sono ordinate, arricchisciamo le operazioni che non hanno un lotto
    // usando le stesse logiche di operationsByCycle per propagare i lotti all'interno dello stesso ciclo
    
    // Raggruppiamo le operazioni per ciclo
    const opsByCycle: { [key: string]: any[] } = {};
    
    sorted.forEach((op: any) => {
      const cycleId = op.cycleId.toString();
      if (!opsByCycle[cycleId]) {
        opsByCycle[cycleId] = [];
      }
      opsByCycle[cycleId].push(op);
    });
    
    // Propaga le informazioni di lotto all'interno di ciascun ciclo
    Object.keys(opsByCycle).forEach(cycleId => {
      if (opsByCycle[cycleId].length > 0) {
        let lastKnownLot = null;
        
        // Prima passata in avanti - propaga il lotto dalle operazioni precedenti
        for (let i = 0; i < opsByCycle[cycleId].length; i++) {
          if (opsByCycle[cycleId][i].lot) {
            lastKnownLot = opsByCycle[cycleId][i].lot;
          } else if (lastKnownLot && (!opsByCycle[cycleId][i].lot || !opsByCycle[cycleId][i].lotId)) {
            // Se questa operazione non ha un lotto ma abbiamo un lotto noto dallo stesso ciclo
            opsByCycle[cycleId][i].lot = lastKnownLot;
            opsByCycle[cycleId][i].lotId = lastKnownLot.id;
          }
        }
        
        // Seconda passata all'indietro - propaga il lotto dalle operazioni successive
        lastKnownLot = null;
        for (let i = opsByCycle[cycleId].length - 1; i >= 0; i--) {
          if (opsByCycle[cycleId][i].lot) {
            lastKnownLot = opsByCycle[cycleId][i].lot;
          } else if (lastKnownLot && (!opsByCycle[cycleId][i].lot || !opsByCycle[cycleId][i].lotId)) {
            opsByCycle[cycleId][i].lot = lastKnownLot;
            opsByCycle[cycleId][i].lotId = lastKnownLot.id;
          }
        }
      }
    });
    
    // Appiattisci di nuovo l'array delle operazioni
    return Object.values(opsByCycle).flat();
    
  }, [operations, cycles, lots, searchTerm, typeFilter, dateFilter, flupsyFilter, cycleFilter, cycleStateFilter]);
  
  // Get filtered cycles based on selected filters
  const filteredCycleIds = useMemo(() => {
    if (!cycles || !baskets) return [];
    
    return cycles
      .filter((cycle: any) => {
        // Only keep cycles that have operations that match the filter criteria
        const cycleOps = operations?.filter((op: any) => op.cycleId === cycle.id) || [];
        if (cycleOps.length === 0) return false;
        
        // Check if any operation matches the type filter
        const matchesType = typeFilter === 'all' || 
          cycleOps.some((op: any) => op.type === typeFilter);
        
        // Check if any operation matches the date filter
        const matchesDate = dateFilter === '' || 
          cycleOps.some((op: any) => format(new Date(op.date), 'yyyy-MM-dd') === dateFilter);
        
        // Get basket for this cycle
        const basket = baskets.find((b: any) => b.id === cycle.basketId);
        
        // Check if the basket's FLUPSY matches the FLUPSY filter
        const matchesFlupsy = flupsyFilter === 'all' || 
          (basket && basket.flupsyId.toString() === flupsyFilter);
        
        // Check if the cycle matches the cycle filter
        const matchesCycle = cycleFilter === 'all' || 
          cycle.id.toString() === cycleFilter;
        
        // Check if the cycle state matches the cycle state filter
        const matchesCycleState = cycleStateFilter === 'all' || 
          (cycleStateFilter === 'active' && cycle.state === 'active') ||
          (cycleStateFilter === 'closed' && cycle.state === 'closed');
        
        // Check if any operation matches the search term
        const matchesSearch = searchTerm === '' || 
          `${cycle.id}`.includes(searchTerm) || 
          (basket && `${basket.physicalNumber}`.includes(searchTerm)) ||
          cycleOps.some((op: any) => `${op.basketId}`.includes(searchTerm));
        
        return matchesType && matchesDate && matchesFlupsy && matchesCycle && matchesCycleState && matchesSearch;
      })
      .map((cycle: any) => cycle.id);
  }, [cycles, baskets, operations, typeFilter, dateFilter, flupsyFilter, cycleFilter, cycleStateFilter, searchTerm]);

  const getOperationTypeBadge = (type: string) => {
    let bgColor = 'bg-blue-100 text-blue-800';
    
    switch (type) {
      case 'prima-attivazione':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
      case 'pulizia':
        bgColor = 'bg-cyan-100 text-cyan-800';
        break;
      case 'vagliatura':
        bgColor = 'bg-indigo-100 text-indigo-800';
        break;
      case 'trattamento':
        bgColor = 'bg-amber-100 text-amber-800';
        break;
      case 'misura':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'vendita':
      case 'selezione-vendita':
        bgColor = 'bg-green-100 text-green-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    // Format operation type for display
    const displayType = type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {displayType}
    </span>;
  };

  // Funzione per determinare la taglia in base al numero di animali per kg (animalsPerKg)
  const determineSizeFromAnimalsPerKg = (animalsPerKg: number) => {
    if (!sizes || !animalsPerKg) return null;
    
    // Trova la taglia corrispondente al range di animali per kg
    return sizes.find((size: any) => {
      const minAnimalsPerKg = size.minAnimalsPerKg || 0;
      const maxAnimalsPerKg = size.maxAnimalsPerKg || Number.MAX_SAFE_INTEGER;
      return animalsPerKg >= minAnimalsPerKg && animalsPerKg <= maxAnimalsPerKg;
    });
  };

  const getSizeBadge = (size: any) => {
    if (!size) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    let bgColor = 'bg-blue-100 text-blue-800';
    // Gestisce le taglie TP-XXX
    if (size.code.startsWith('TP-')) {
      // Estrai il numero dalla taglia TP-XXX
      const numStr = size.code.substring(3);
      const num = parseInt(numStr);
      
      if (num <= 1000) {
        bgColor = 'bg-red-100 text-red-800';
      } else if (num <= 3000) {
        bgColor = 'bg-orange-100 text-orange-800';
      } else if (num <= 6000) {
        bgColor = 'bg-yellow-100 text-yellow-800';
      } else if (num <= 10000) {
        bgColor = 'bg-green-100 text-green-800';
      } else {
        bgColor = 'bg-black text-white';
      }
    } else if (size.code.startsWith('M')) {
      bgColor = 'bg-green-100 text-green-800';
    }
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {size.code}
    </span>;
  };
  
  // Funzione che genera il badge di taglia basandosi sugli animali per kg
  const getSizeBadgeFromAnimalsPerKg = (animalsPerKg: number) => {
    if (!animalsPerKg) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    // Determina la taglia in base al numero di animali per kg
    const detectedSize = determineSizeFromAnimalsPerKg(animalsPerKg);
    
    if (detectedSize) {
      // Usa la taglia trovata
      return getSizeBadge(detectedSize);
    } else {
      // Se non troviamo una taglia corrispondente, mostra un badge generico con il peso medio approssimativo
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
          ~{Math.round(1000000 / animalsPerKg)} mg/animale
        </span>
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Registro Operazioni</h2>
        <div className="flex space-x-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Operazione
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col space-y-4">
          {/* Mode Selection */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                onClick={() => setViewMode('table')}
                className="w-32"
              >
                <Box className="mr-2 h-4 w-4" />
                Tabella
              </Button>
              <Button 
                variant={viewMode === 'cycles' ? 'default' : 'outline'} 
                onClick={() => setViewMode('cycles')}
                className="w-32"
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Per Ciclo
              </Button>
            </div>
            
            <div className="flex items-center">
              <ArrowUp className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-500">Ascendente</span>
            </div>
          </div>
          
          {/* First row of filters */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Cerca operazioni, ceste..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipologia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le tipologie</SelectItem>
                  <SelectItem value="prima-attivazione">Prima Attivazione</SelectItem>
                  <SelectItem value="pulizia">Pulizia</SelectItem>
                  <SelectItem value="vagliatura">Vagliatura</SelectItem>
                  <SelectItem value="trattamento">Trattamento</SelectItem>
                  <SelectItem value="misura">Misura</SelectItem>
                  <SelectItem value="vendita">Vendita</SelectItem>
                  <SelectItem value="selezione-vendita">Selezione per Vendita</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
          
          {/* Second row of filters */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 md:flex-none md:w-1/2">
              <Select value={flupsyFilter} onValueChange={setFlupsyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                  {flupsys?.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 md:flex-none md:w-1/2 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-3">
              <Select value={cycleFilter} onValueChange={setCycleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i Cicli</SelectItem>
                  {cycles?.map((cycle: any) => {
                    const basket = baskets?.find((b: any) => b.id === cycle.basketId);
                    return (
                      <SelectItem key={cycle.id} value={cycle.id.toString()}>
                        Ciclo #{cycle.id} - Cesta #{basket?.physicalNumber || '?'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Filtro per Stato Ciclo con bottoni */}
              <div className="flex space-x-2 items-center">
                <span className="text-sm text-gray-500 mr-1">Stato:</span>
                <div className="flex rounded-md shadow-sm">
                  <Button
                    variant={cycleStateFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-l-md rounded-r-none ${cycleStateFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('active')}
                  >
                    Attivi
                  </Button>
                  <Button
                    variant={cycleStateFilter === 'closed' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-none border-l-0 border-r-0 ${cycleStateFilter === 'closed' ? 'bg-red-600 hover:bg-red-700 border-red-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('closed')}
                  >
                    Chiusi
                  </Button>
                  <Button
                    variant={cycleStateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-r-md rounded-l-none ${cycleStateFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('all')}
                  >
                    Tutti
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Content (Table or Cycles) */}
      {isLoadingOperations || isLoadingCycles || isLoadingBaskets ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Caricamento dati...</p>
        </div>
      ) : (
        viewMode === 'table' ? (
          // Table View
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipologia
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cesta
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ciclo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lotto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taglia
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      # Animali
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso (g)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso Medio (mg)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Nessuna operazione trovata
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op) => (
                      <tr key={op.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(op.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getOperationTypeBadge(op.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            #{op.basket?.physicalNumber || op.basketId}
                            {op.basket?.flupsyId && flupsys?.find((f: any) => f.id === op.basket?.flupsyId) && (
                              <span className="text-xs block text-blue-600 mt-1">
                                FLUPSY: {flupsys.find((f: any) => f.id === op.basket?.flupsyId)?.name || `#${op.basket.flupsyId}`}
                              </span>
                            )}
                            {op.basket?.row && op.basket?.position && (
                              <span className="text-xs block text-indigo-600 mt-1">
                                Posizione: {op.basket.row} - {op.basket.position}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.cycleId ? `#${op.cycleId}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            // Caso speciale: l'operazione ha lotti multipli
                            if (op.hasMultipleLots && op.additionalLots && Array.isArray(op.additionalLots) && op.additionalLots.length > 0) {
                              const mainLot = op.lot || (op.lotId ? lots?.find((l: any) => l.id === op.lotId) : null);
                              return (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-indigo-600">
                                      {mainLot ? mainLot.name : 'Lotto principale'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                      Lotto misto
                                    </span>
                                  </div>
                                  {mainLot && (
                                    <>
                                      <span className="text-xs block text-gray-500">
                                        Arrivo: {format(new Date(mainLot.arrivalDate), 'dd/MM/yyyy')}
                                      </span>
                                      <span className="text-xs block text-gray-500">
                                        Fornitore: {mainLot.supplier || 'N/D'}
                                      </span>
                                    </>
                                  )}
                                  <details className="text-xs mt-1">
                                    <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800">
                                      Altri lotti ({op.additionalLots.length})
                                    </summary>
                                    <div className="pl-2 mt-1 border-l-2 border-indigo-200">
                                      {op.additionalLots.map((lot: any, idx: number) => (
                                        <div key={idx} className="mb-1.5">
                                          <div className="font-medium">{lot.name}</div>
                                          <div className="text-xs text-gray-500">
                                            Arrivo: {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Fornitore: {lot.supplier || 'N/D'}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              );
                            }
                            
                            // Prima controlla se l'operazione ha già un lotto
                            if (op.lot) {
                              return (
                                <div>
                                  <span className="font-medium text-indigo-600">{op.lot.name}</span>
                                  <span className="text-xs block text-gray-500">
                                    Arrivo: {format(new Date(op.lot.arrivalDate), 'dd/MM/yyyy')}
                                  </span>
                                  <span className="text-xs block text-gray-500">
                                    Fornitore: {op.lot.supplier || 'N/D'}
                                  </span>
                                </div>
                              );
                            }
                            
                            // Se ha un lotId, cerca il lotto nei dati disponibili
                            if (op.lotId) {
                              const lotById = lots?.find((l: any) => l.id === op.lotId);
                              if (lotById) {
                                return (
                                  <div>
                                    <span className="font-medium text-indigo-600">{lotById.name || `Lotto #${lotById.id}`}</span>
                                    <span className="text-xs block text-gray-500">
                                      Arrivo: {format(new Date(lotById.arrivalDate), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-xs block text-gray-500">
                                      Fornitore: {lotById.supplier || 'N/D'}
                                    </span>
                                  </div>
                                );
                              }
                            }
                            
                            // Se non ha né lotto né lotId, cerca un'operazione "prima-attivazione" nello stesso ciclo
                            const opsInSameCycle = operations?.filter((o: any) => o.cycleId === op.cycleId) || [];
                            const firstActivationInCycle = opsInSameCycle.find((o: any) => o.type === 'prima-attivazione');
                            
                            if (firstActivationInCycle && (firstActivationInCycle.lot || firstActivationInCycle.lotId)) {
                              // Se l'operazione prima-attivazione ha un lotto, usalo
                              if (firstActivationInCycle.lot) {
                                return (
                                  <div>
                                    <span className="font-medium text-indigo-600">{firstActivationInCycle.lot.name}</span>
                                    <span className="text-xs block text-gray-500">
                                      Arrivo: {format(new Date(firstActivationInCycle.lot.arrivalDate), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-xs block text-gray-500">
                                      Fornitore: {firstActivationInCycle.lot.supplier || 'N/D'}
                                    </span>
                                  </div>
                                );
                              }
                              
                              // Se ha solo un lotId, cerca il lotto nei dati disponibili
                              if (firstActivationInCycle.lotId) {
                                const firstActivationLot = lots?.find((l: any) => l.id === firstActivationInCycle.lotId);
                                if (firstActivationLot) {
                                  return (
                                    <div>
                                      <span className="font-medium text-indigo-600">{firstActivationLot.name || `Lotto #${firstActivationLot.id}`}</span>
                                      <span className="text-xs block text-gray-500">
                                        Arrivo: {format(new Date(firstActivationLot.arrivalDate), 'dd/MM/yyyy')}
                                      </span>
                                      <span className="text-xs block text-gray-500">
                                        Fornitore: {firstActivationLot.supplier || 'N/D'}
                                      </span>
                                    </div>
                                  );
                                }
                              }
                            }
                            
                            // Se tutte le precedenti falliscono, mostra "Nessun lotto"
                            return <span className="text-gray-400 italic">Nessun lotto</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {op.size ? (
                            getSizeBadge(op.size)
                          ) : op.sizeId ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" 
                                  style={{ backgroundColor: sizes?.find((s: any) => s.id === op.sizeId)?.color || '#e5e7eb', color: '#111827' }}>
                              {sizes?.find((s: any) => s.id === op.sizeId)?.code || `Size #${op.sizeId}`}
                            </span>
                          ) : op.animalsPerKg ? (
                            // Usa la funzione per determinare la taglia in base al numero di animali per kg
                            getSizeBadgeFromAnimalsPerKg(op.animalsPerKg)
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.animalCount ? op.animalCount.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.totalWeight ? op.totalWeight.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.animalsPerKg && op.animalsPerKg > 0 ? Math.round(1000000 / op.animalsPerKg) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-5 w-5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOperation(op);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              onClick={() => {
                                setSelectedOperation(op);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Duplica l'operazione
                                const nextDay = addDays(new Date(op.date), 1);
                                
                                // Se l'operazione era "prima-attivazione", cambiala in "misura"
                                const operationType = op.type === 'prima-attivazione' ? 'misura' : op.type;
                                
                                const duplicatedOp = {
                                  ...op,
                                  type: operationType,
                                  date: nextDay,
                                  id: undefined // Rimuovi l'ID per creare una nuova operazione
                                };
                                
                                setSelectedOperation(duplicatedOp);
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              <Copy className="h-5 w-5 text-indigo-600" />
                            </Button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Cycles View
          <div className="space-y-4">
            {filteredCycleIds.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Nessun ciclo trovato con i criteri selezionati</p>
              </div>
            ) : (
              filteredCycleIds.map((cycleId) => {
                const cycle = getCycleDetails(cycleId);
                const basket = baskets?.find((b: any) => b.id === cycle?.basketId);
                const cycleOps = operationsByCycle[cycleId.toString()] || [];
                
                return (
                  <Collapsible 
                    key={cycleId}
                    open={expandedCycles.includes(cycleId)}
                    onOpenChange={() => toggleCycleExpansion(cycleId)}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <CollapsibleTrigger asChild>
                      <div className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50
                        ${cycle?.state === 'closed' ? 'bg-gray-50 border-l-4 border-red-500' : ''}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`flex h-10 w-10 rounded-full items-center justify-center
                            ${cycle?.state === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}
                          >
                            {cycle?.state === 'active' ? (
                              <RotateCw className="h-5 w-5" />
                            ) : (
                              <Box className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Ciclo #{cycleId}</h3>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-red-600 font-bold text-lg">Cesta #{basket?.physicalNumber || '?'}</span>
                                {basket?.row && basket?.position && (
                                  <span className="text-indigo-600 ml-1 font-medium">[Pos: {basket.row} - {basket.position}]</span>
                                )}
                                <span className="mx-2">•</span>
                                {cycle?.state === 'active' ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium">Attivo</Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200 font-medium">Chiuso</Badge>
                                )}
                              </p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                                {/* Prima riga - Informazioni di base */}
                                <div>
                                  <span className="text-gray-500 block text-xs">FLUPSY:</span>
                                  <span className="font-medium text-gray-700">{basket?.flupsy?.name || 'N/D'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs">Lotto:</span>
                                  <span className="font-medium text-gray-700">
                                    {(() => {
                                      // Verifica se c'è un'operazione con lotti multipli
                                      const opWithMultipleLots = cycleOps.find(op => op.hasMultipleLots && op.additionalLots);
                                      if (opWithMultipleLots) {
                                        // Mostra il lotto principale con indicatore di lotto misto
                                        const mainLot = opWithMultipleLots.lot || 
                                                       (opWithMultipleLots.lotId ? lots?.find(l => l.id === opWithMultipleLots.lotId) : null);
                                        return (
                                          <div className="flex items-center gap-2">
                                            <span>{mainLot ? mainLot.name : 'Lotto principale'}</span>
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                              Misto
                                            </span>
                                          </div>
                                        );
                                      }
                                      
                                      // Cerca prima un'operazione di tipo prima-attivazione che abbia un lotto
                                      const firstActivation = cycleOps.find(op => op.type === 'prima-attivazione' && op.lot);
                                      if (firstActivation && firstActivation.lot) {
                                        return firstActivation.lot.name;
                                      }

                                      // Se non c'è, cerca un'operazione di tipo prima-attivazione che abbia un lotId
                                      const firstActivationWithLotId = cycleOps.find(op => op.type === 'prima-attivazione' && op.lotId);
                                      if (firstActivationWithLotId && firstActivationWithLotId.lotId) {
                                        const lot = lots?.find(l => l.id === firstActivationWithLotId.lotId);
                                        if (lot) return lot.name || `Lotto #${lot.id}`;
                                      }

                                      // Se ancora non c'è, prendi il primo elemento del ciclo che ha un lotto
                                      if (cycleOps.length > 0) {
                                        const opWithLot = cycleOps.find(op => op.lot);
                                        if (opWithLot && opWithLot.lot) {
                                          return opWithLot.lot.name;
                                        }

                                        // O il primo che ha un lotId
                                        const opWithLotId = cycleOps.find(op => op.lotId);
                                        if (opWithLotId && opWithLotId.lotId) {
                                          const lot = lots?.find(l => l.id === opWithLotId.lotId);
                                          if (lot) return lot.name || `Lotto #${lot.id}`;
                                        }
                                      }

                                      // Se proprio non si trova niente
                                      return 'N/D';
                                    })()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs">Inizio:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycle && format(new Date(cycle.startDate), 'dd/MM/yyyy')}
                                  </span>
                                </div>
                                <div>
                                  {cycle && cycle.endDate ? (
                                    <>
                                      <span className="text-gray-500 block text-xs">Fine:</span>
                                      <span className="font-medium text-gray-700">
                                        {format(new Date(cycle.endDate), 'dd/MM/yyyy')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-gray-500 block text-xs">Ultima operazione:</span>
                                      <span className="font-medium text-gray-700">
                                        {cycleOps.length > 0 ? format(new Date(cycleOps[cycleOps.length - 1].date), 'dd/MM/yyyy') : 'N/D'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Seconda riga - Durata */}
                                <div className="col-span-4">
                                  <span className="text-gray-500 block text-xs">Durata:</span>
                                  <div className="font-medium text-gray-700 flex items-center mt-1">
                                    {cycle && (() => {
                                      const startDate = new Date(cycle.startDate);
                                      const endDate = cycle.endDate ? new Date(cycle.endDate) : new Date();
                                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      // Crea una mini-sparkline con CSS per rappresentare la durata
                                      const maxDays = 120; // Durata massima prevista per un ciclo
                                      const percentage = Math.min(diffDays / maxDays * 100, 100);
                                      
                                      return (
                                        <>
                                          <span className="mr-2 font-semibold">{diffDays} giorni{cycle.endDate ? '' : ' (in corso)'}</span>
                                          <div className="h-2.5 bg-gray-200 rounded-full w-full flex-grow">
                                            <div 
                                              className={`h-full rounded-full ${
                                                percentage < 30 ? 'bg-blue-400' : 
                                                percentage < 60 ? 'bg-green-400' : 
                                                percentage < 90 ? 'bg-yellow-400' : 'bg-red-400'
                                              }`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Terza riga - Taglie e animali */}
                                <div>
                                  <span className="text-gray-500 block text-xs">Taglia iniziale:</span>
                                  <div className="font-medium text-gray-700 flex items-center">
                                    {cycleOps.length > 0 && (
                                      <>
                                        {cycleOps[0].size ? (
                                          <span className="mr-1">{cycleOps[0].size.code}</span>
                                        ) : cycleOps[0].sizeId ? (
                                          <span className="mr-1">{sizes?.find((s: any) => s.id === cycleOps[0].sizeId)?.code || `Size #${cycleOps[0].sizeId}`}</span>
                                        ) : cycleOps[0].animalsPerKg ? (
                                          <span className="mr-1">{determineSizeFromAnimalsPerKg(cycleOps[0].animalsPerKg)?.code || 'Calcolata'}</span>
                                        ) : (
                                          <span className="mr-1">N/D</span>
                                        )}
                                        
                                        {cycleOps[0].animalsPerKg && (
                                          <>
                                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {Math.round(1000000 / cycleOps[0].animalsPerKg)} mg
                                            </span>
                                            <span className="text-xs ml-1 text-gray-500">
                                              ({cycleOps[0].animalsPerKg.toLocaleString()} an/kg)
                                            </span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Taglia attuale:</span>
                                  <div className="font-medium text-gray-700 flex items-center">
                                    {cycleOps.length > 0 && (
                                      <>
                                        {cycleOps[cycleOps.length - 1].size ? (
                                          <span className="mr-1">{cycleOps[cycleOps.length - 1].size.code}</span>
                                        ) : cycleOps[cycleOps.length - 1].sizeId ? (
                                          <span className="mr-1">{sizes?.find((s: any) => s.id === cycleOps[cycleOps.length - 1].sizeId)?.code || `Size #${cycleOps[cycleOps.length - 1].sizeId}`}</span>
                                        ) : cycleOps[cycleOps.length - 1].animalsPerKg ? (
                                          <span className="mr-1">{determineSizeFromAnimalsPerKg(cycleOps[cycleOps.length - 1].animalsPerKg)?.code || 'Calcolata'}</span>
                                        ) : (
                                          <span className="mr-1">N/D</span>
                                        )}
                                        
                                        {cycleOps[cycleOps.length - 1].animalsPerKg && (
                                          <>
                                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {Math.round(1000000 / cycleOps[cycleOps.length - 1].animalsPerKg)} mg
                                            </span>
                                            <span className="text-xs ml-1 text-gray-500">
                                              ({cycleOps[cycleOps.length - 1].animalsPerKg.toLocaleString()} an/kg)
                                            </span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Animali:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].animalCount 
                                      ? cycleOps[cycleOps.length - 1].animalCount.toLocaleString() 
                                      : 'N/D'}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Peso totale:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].totalWeight 
                                      ? `${cycleOps[cycleOps.length - 1].totalWeight.toLocaleString()} g`
                                      : 'N/D'}
                                  </span>
                                </div>
                                
                                {/* Quarta riga - Performance di crescita */}
                                <div className="col-span-4">
                                  {cycleOps.length >= 2 && (() => {
                                    const firstOp = cycleOps[0];
                                    const lastOp = cycleOps[cycleOps.length - 1];
                                    
                                    if (firstOp.animalsPerKg && lastOp.animalsPerKg) {
                                      const firstWeight = 1000000 / firstOp.animalsPerKg;
                                      const lastWeight = 1000000 / lastOp.animalsPerKg;
                                      const weightGain = lastWeight - firstWeight;
                                      const percentGain = ((lastWeight - firstWeight) / firstWeight) * 100;
                                      
                                      const startDate = new Date(firstOp.date);
                                      const endDate = new Date(lastOp.date);
                                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      const dailyGainPercent = percentGain / diffDays;
                                      
                                      let performanceClass = 'text-gray-700';
                                      let bgClass = 'bg-gray-50';
                                      if (dailyGainPercent >= 3) {
                                        performanceClass = 'text-emerald-700';
                                        bgClass = 'bg-emerald-50';
                                      }
                                      else if (dailyGainPercent >= 2) {
                                        performanceClass = 'text-emerald-600';
                                        bgClass = 'bg-emerald-50';
                                      }
                                      else if (dailyGainPercent >= 1) {
                                        performanceClass = 'text-yellow-600';
                                        bgClass = 'bg-yellow-50';
                                      }
                                      else if (dailyGainPercent > 0) {
                                        performanceClass = 'text-orange-500';
                                        bgClass = 'bg-orange-50';
                                      }
                                      else {
                                        performanceClass = 'text-red-500';
                                        bgClass = 'bg-red-50';
                                      }
                                      
                                      return (
                                        <div className={`${bgClass} p-2 rounded-md mt-1`}>
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">Performance di crescita</span>
                                            <div className={`font-semibold ${performanceClass}`}>
                                              {percentGain.toFixed(1)}% totale
                                            </div>
                                          </div>
                                          <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-500">
                                              Periodo: {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM')} ({diffDays} giorni)
                                            </span>
                                            <span className={`${performanceClass} font-medium`}>
                                              {dailyGainPercent.toFixed(2)}% al giorno
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                </div>
                                
                                {/* Quinta riga - Proiezione verso TP-3000 */}
                                <div className="col-span-4">
                                  {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].animalsPerKg && (() => {
                                    // Ottieni il peso attuale dall'ultimo dato registrato
                                    const currentWeight = 1000000 / cycleOps[cycleOps.length - 1].animalsPerKg;
                                    
                                    // Verifica se la taglia corrente è già TP-3000 (dal codice della taglia)
                                    const currentSizeCode = cycleOps[cycleOps.length - 1].size?.code || '';
                                    
                                    // TP-3000 significa un range da 19.001 a 32.000 animali/kg
                                    // Utilizziamo 32.000 come valore di riferimento (limite inferiore della categoria TP-3000)
                                    // poiché rappresenta il valore minimo per entrare nella categoria
                                    const targetWeight = 1000000 / 32000; // ~ 31,25 mg
                                    
                                    // Se il peso attuale è già superiore al target o la taglia è già TP-3000, non mostrare la proiezione
                                    if (currentWeight >= targetWeight || currentSizeCode === 'TP-3000' || currentSizeCode?.startsWith('TP-') && parseInt(currentSizeCode.replace('TP-', '')) >= 3000) {
                                      // Determina se la taglia è stata anche superata
                                      const isSizeExceeded = currentSizeCode && currentSizeCode !== 'TP-3000' && 
                                        currentSizeCode.startsWith('TP-') && 
                                        parseInt(currentSizeCode.replace('TP-', '')) > 3000;
                                      
                                      return (
                                        <div className="bg-emerald-50 p-2 rounded-md mt-1">
                                          <div className="text-emerald-600 flex items-center">
                                            <Check className="h-4 w-4 mr-2" />
                                            <span className="font-medium">
                                              Taglia TP-3000 già raggiunta{isSizeExceeded ? ' e superata' : ''}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Calcola i giorni necessari per raggiungere il target
                                    const now = new Date();
                                    
                                    // Utilizziamo un calcolo più preciso che tiene conto dei tassi SGR variabili per mese
                                    let daysNeeded = 0;
                                    let simulatedWeight = currentWeight;
                                    let simulationDate = new Date(); // Data attuale
                                    
                                    // Assicuriamoci che abbiamo i dati SGR
                                    if (sgrs && sgrs.length > 0) {
                                      // Simuliamo fino a quando non raggiungiamo il peso target o un anno di simulazione
                                      while (simulatedWeight < targetWeight && daysNeeded < 365) {
                                        // Ottieni il mese corrente per la data di simulazione
                                        const simMonth = format(simulationDate, 'MMMM', { locale: it }).toLowerCase();
                                        
                                        // Trova l'SGR per questo mese
                                        const monthSgr = sgrs.find((sgr: any) => sgr.month.toLowerCase() === simMonth);
                                        let dailyGrowthRate = 1.0; // Valore predefinito
                                        
                                        if (monthSgr) {
                                          dailyGrowthRate = monthSgr.percentage; // Usa il valore percentuale direttamente
                                        }
                                        
                                        // Versione corretta che applica l'incremento giornaliero: W1 = W0 * (1 + (SGR/100))
                                        // dailyGrowthRate è in forma percentuale (es. 3.7 per 3.7%)
                                        simulatedWeight = simulatedWeight * (1 + (dailyGrowthRate / 100));
                                        
                                        // Incrementa la data di simulazione di un giorno
                                        simulationDate = addDays(simulationDate, 1);
                                        daysNeeded++;
                                      }
                                    } else {
                                      // Fallback se non ci sono dati SGR: usa un tasso fisso di crescita
                                      const fixedDailyRate = 3.7; // 3.7% al giorno
                                      // Formula logaritmica corretta: t = ln(W_t/W_0) / (SGR/100)
                                      daysNeeded = Math.ceil(Math.log(targetWeight / currentWeight) / (fixedDailyRate/100));
                                    }
                                    
                                    // Calcola la data stimata di raggiungimento
                                    const targetDate = addDays(now, daysNeeded);
                                    
                                    // Percentuale completata verso l'obiettivo
                                    const progressPercentage = (currentWeight / targetWeight) * 100;
                                    
                                    return (
                                      <div className="bg-blue-50 p-2 rounded-md mt-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-blue-700 font-medium">Verso TP-3000</span>
                                          <div className="flex items-center">
                                            <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
                                            <span className="text-sm text-gray-500 ml-2">
                                              {daysNeeded} giorni rimanenti
                                            </span>
                                          </div>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full">
                                          <div 
                                            className="h-full rounded-full bg-blue-500"
                                            style={{ width: `${progressPercentage}%` }}
                                          />
                                        </div>
                                        <div className="text-right text-xs mt-1 text-gray-500">
                                          <span>Data stimata: {format(targetDate, 'dd/MM/yyyy')}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                

                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge className="mr-4">
                            {cycleOps.length} operazioni
                          </Badge>
                          {expandedCycles.includes(cycleId) ? (
                            <ArrowUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ArrowDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Separator />
                      <div className="p-4 space-y-2">
                        {cycleOps.map((op: any, index: number) => {
                          // Find previous operation to calculate growth
                          const prevOp = index > 0 ? cycleOps[index - 1] : null;
                          
                          // Calcola il cambio di peso e i giorni tra le operazioni
                          const prevWeight = prevOp && prevOp.animalsPerKg ? 1000000 / prevOp.animalsPerKg : null;
                          const currWeight = op.animalsPerKg ? 1000000 / op.animalsPerKg : null;
                          const weightChange = prevWeight && currWeight ? Math.round(currWeight - prevWeight) : null;
                          
                          const prevDate = prevOp ? new Date(prevOp.date) : null;
                          const currDate = new Date(op.date);
                          const daysDiff = prevDate ? Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          
                          // Calcola la crescita percentuale attuale
                          const actualGrowthPercent = prevWeight && currWeight && prevWeight > 0 ? 
                            ((currWeight - prevWeight) / prevWeight) * 100 : null;
                          
                          // Calcola la crescita teorica basata sull'SGR
                          const theoreticalGrowth = prevDate && daysDiff ? 
                            calculateTheoreticalGrowth(prevDate, daysDiff) : null;
                          
                          const targetGrowthPercent = theoreticalGrowth ? 
                            theoreticalGrowth.theoreticalGrowthPercent : null;
                          
                          return (
                            <Card key={op.id} className={`border-l-4 ${index === 0 ? 'border-l-purple-500' : op.type.includes('vendita') ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                              <CardHeader className="py-3 px-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <h4 className="text-base font-medium flex items-center">
                                        {getOperationTypeBadge(op.type)}
                                        <span className="ml-2 text-gray-600">
                                          {format(new Date(op.date), 'dd/MM/yyyy')}
                                        </span>
                                      </h4>
                                      {daysDiff && daysDiff > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {daysDiff} {daysDiff === 1 ? 'giorno' : 'giorni'} dall'ultima operazione
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedOperation(op);
                                        setIsEditDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-gray-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                      onClick={() => {
                                        setSelectedOperation(op);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        // Duplica l'operazione
                                        const nextDay = addDays(new Date(op.date), 1);
                                        const operationType = op.type === 'prima-attivazione' ? 'misura' : op.type;
                                        
                                        const duplicatedOp = {
                                          ...op,
                                          type: operationType,
                                          date: nextDay,
                                          id: undefined
                                        };
                                        
                                        setSelectedOperation(duplicatedOp);
                                        setIsCreateDialogOpen(true);
                                      }}
                                    >
                                      <Copy className="h-4 w-4 text-indigo-600" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="py-2 px-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  {op.animalsPerKg && (
                                    <div>
                                      <p className="text-gray-500">Taglia</p>
                                      <div className="flex items-center">
                                        {getSizeBadge(op.size)}
                                        <span className="ml-2">{Math.round(1000000 / op.animalsPerKg)} mg</span>
                                        <span className="ml-2 text-xs text-gray-500">({op.animalsPerKg.toLocaleString()} an/kg)</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {weightChange && (
                                    <div>
                                      <p className="text-gray-500">Crescita</p>
                                      <p className={weightChange > 0 ? 'text-emerald-600' : weightChange < 0 ? 'text-red-500' : 'text-gray-600'}>
                                        {weightChange > 0 ? '+' : ''}{weightChange} mg
                                        {daysDiff && <span className="text-xs ml-1">
                                          ({(weightChange / daysDiff).toFixed(1)} mg/g)
                                        </span>}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {op.animalCount && (
                                    <div>
                                      <p className="text-gray-500">Animali</p>
                                      <p>{op.animalCount.toLocaleString()}</p>
                                    </div>
                                  )}
                                  
                                  {op.totalWeight && (
                                    <div>
                                      <p className="text-gray-500">Peso totale</p>
                                      <p>{op.totalWeight.toLocaleString()} g</p>
                                    </div>
                                  )}
                                  
                                  {/* Mostra sempre la sezione Lotto, con un placeholder se non esiste */}
                                  <div>
                                    <p className="text-gray-500">Lotto</p>
                                    {op.lot ? (
                                      <p className="font-medium text-indigo-600">
                                        {op.lot.name}
                                        <span className="text-xs text-gray-500 block">
                                          Arrivo: {format(new Date(op.lot.arrivalDate), 'dd/MM/yyyy')}
                                        </span>
                                        <span className="text-xs text-gray-500 block">
                                          Fornitore: {op.lot.supplier || 'N/D'}
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="text-gray-400 italic">Nessun lotto</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Visualizza l'indicatore di performance di crescita per le operazioni di misura e peso */}
                                {index > 0 && (op.type === 'misura' || op.type === 'peso') && prevWeight && currWeight && actualGrowthPercent !== null && theoreticalGrowth && (
                                  <div className="mt-4">
                                    <p className="text-gray-500 text-sm font-medium mb-1">Performance di crescita</p>
                                    <GrowthPerformanceIndicator
                                      actualGrowthPercent={actualGrowthPercent}
                                      targetGrowthPercent={targetGrowthPercent}
                                      daysBetweenMeasurements={daysDiff || 0}
                                      currentAverageWeight={currWeight}
                                      previousAverageWeight={prevWeight}
                                      sgrMonth={theoreticalGrowth?.sgrMonth}
                                      sgrDailyPercentage={theoreticalGrowth?.sgrDailyPercentage}
                                    />
                                  </div>
                                )}
                                
                                {op.notes && (
                                  <div className="mt-3 text-sm">
                                    <p className="text-gray-500">Note</p>
                                    <p>{op.notes}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        )
      )}

      {/* Create Operation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        // Quando si chiude il dialog, resetta l'operazione selezionata
        if (!open) {
          setSelectedOperation(null);
        }
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[850px] max-h-[95vh] overflow-y-auto" aria-describedby="operation-form-description">
          <DialogHeader>
            <DialogTitle>
              {selectedOperation ? "Duplica Operazione" : "Registra Nuova Operazione"}
            </DialogTitle>
            <DialogDescription id="operation-form-description">
              {selectedOperation 
                ? "Modifica i dati dell'operazione duplicata prima di registrarla" 
                : "Compila il modulo per registrare una nuova operazione"}
            </DialogDescription>
          </DialogHeader>
          <OperationForm 
            onSubmit={(data) => {
              console.log('Dialog - Submitting operation data:', data);
              
              // Assicurati che i campi numerici siano effettivamente numeri
              const formattedData = {
                ...data,
                animalCount: data.animalCount ? Number(data.animalCount) : null,
                animalsPerKg: data.animalsPerKg ? Number(data.animalsPerKg) : null,
                totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
                date: data.date instanceof Date ? data.date : new Date(data.date),
              };
              
              console.log('Formatted operation data:', formattedData);
              createOperationMutation.mutate(formattedData);
            }} 
            isLoading={createOperationMutation.isPending}
            defaultValues={selectedOperation ? {
              type: selectedOperation.type,
              date: selectedOperation.date instanceof Date ? selectedOperation.date : new Date(selectedOperation.date),
              basketId: selectedOperation.basketId,
              cycleId: selectedOperation.cycleId,
              sizeId: selectedOperation.sizeId,
              sgrId: selectedOperation.sgrId,
              lotId: selectedOperation.lotId,
              animalCount: selectedOperation.animalCount,
              totalWeight: selectedOperation.totalWeight,
              animalsPerKg: selectedOperation.animalsPerKg,
              notes: selectedOperation.notes || ''
            } : undefined}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Operation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Operazione</DialogTitle>
          </DialogHeader>
          {selectedOperation && (
            <OperationForm 
              onSubmit={(data) => {
                console.log('Edit dialog - Submitting operation data:', data);
                
                // Assicurati che i campi numerici siano effettivamente numeri
                const formattedData = {
                  ...data,
                  animalCount: data.animalCount ? Number(data.animalCount) : null,
                  animalsPerKg: data.animalsPerKg ? Number(data.animalsPerKg) : null,
                  totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
                  date: data.date instanceof Date ? data.date : new Date(data.date),
                };
                
                console.log('Formatted operation data:', formattedData);
                updateOperationMutation.mutate({ id: selectedOperation.id, operation: formattedData });
              }}
              isLoading={updateOperationMutation.isPending}
              defaultValues={{
                type: selectedOperation.type,
                date: new Date(selectedOperation.date),
                basketId: selectedOperation.basketId,
                cycleId: selectedOperation.cycleId,
                sizeId: selectedOperation.sizeId,
                sgrId: selectedOperation.sgrId,
                lotId: selectedOperation.lotId,
                animalCount: selectedOperation.animalCount,
                totalWeight: selectedOperation.totalWeight,
                animalsPerKg: selectedOperation.animalsPerKg,
                notes: selectedOperation.notes || ''
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Operation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina Operazione</DialogTitle>
            <DialogDescription className="text-destructive-foreground/80">
              Sei sicuro di voler eliminare questa operazione? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="p-4 my-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(selectedOperation.date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipologia</p>
                  <p className="font-medium">
                    {selectedOperation.type
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cesta</p>
                  <p className="font-medium">
                    #{baskets?.find((b: any) => b.id === selectedOperation.basketId)?.physicalNumber || selectedOperation.basketId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ciclo</p>
                  <p className="font-medium">#{selectedOperation.cycleId}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedOperation && deleteOperationMutation.mutate(selectedOperation.id)}
              disabled={deleteOperationMutation.isPending}
            >
              {deleteOperationMutation.isPending ? "Eliminazione in corso..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
