import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Eye, Search, Filter, Pencil, Plus, Trash2, AlertTriangle, Copy, 
  ArrowDown, ArrowUp, RotateCw, Calendar, Box, Target
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
import OperationForm from '@/components/OperationForm';
import GrowthPerformanceIndicator from '@/components/GrowthPerformanceIndicator';

export default function Operations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [flupsyFilter, setFlupsyFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
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
        createdOperation = await apiRequest('POST', '/api/operations', newOperation);
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 2. Se la cesta è attiva e l'operazione è di vendita
      else if (isBasketActive && isVendita) {
        // Crea direttamente l'operazione di vendita
        // Il backend si occuperà di chiudere il ciclo e aggiornare lo stato della cesta
        createdOperation = await apiRequest('POST', '/api/operations', newOperation);
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 3. Operazioni normali
      else {
        createdOperation = await apiRequest('POST', '/api/operations', newOperation);
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
    mutationFn: (data: any) => apiRequest('PATCH', `/api/operations/${data.id}`, data.operation),
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
    mutationFn: (id: number) => apiRequest('DELETE', `/api/operations/${id}`),
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

  // Group operations by cycle
  const operationsByCycle = useMemo(() => {
    if (!operations || !cycles) return {};
    
    const grouped: { [key: string]: any[] } = {};
    
    operations.forEach((op: any) => {
      const cycleId = op.cycleId.toString();
      if (!grouped[cycleId]) {
        grouped[cycleId] = [];
      }
      grouped[cycleId].push(op);
    });
    
    // Sort operations in each cycle by date
    Object.keys(grouped).forEach(cycleId => {
      grouped[cycleId].sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    });
    
    return grouped;
  }, [operations, cycles]);
  
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
    
    // La percentuale SGR è mensile, calcoliamo quella giornaliera
    const dailyPercentage = sgrInfo.percentage / 30;
    
    // Calcola la percentuale di crescita teorica per il numero di giorni
    const theoreticalGrowthPercent = dailyPercentage * days;
    
    return {
      sgrMonth: sgrInfo.month,
      sgrPercentage: sgrInfo.percentage,
      sgrDailyPercentage: dailyPercentage,
      theoreticalGrowthPercent
    };
  };
  
  // Filter operations
  const filteredOperations = useMemo(() => {
    if (!operations) return [];
    
    return operations.filter((op: any) => {
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
      
      return matchesSearch && matchesType && matchesDate && matchesFlupsy && matchesCycle;
    });
  }, [operations, searchTerm, typeFilter, dateFilter, flupsyFilter, cycleFilter]);
  
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
        
        // Check if any operation matches the search term
        const matchesSearch = searchTerm === '' || 
          `${cycle.id}`.includes(searchTerm) || 
          (basket && `${basket.physicalNumber}`.includes(searchTerm)) ||
          cycleOps.some((op: any) => `${op.basketId}`.includes(searchTerm));
        
        return matchesType && matchesDate && matchesFlupsy && matchesCycle && matchesSearch;
      })
      .map((cycle: any) => cycle.id);
  }, [cycles, baskets, operations, typeFilter, dateFilter, flupsyFilter, cycleFilter, searchTerm]);

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

  const getSizeBadge = (size: any) => {
    if (!size) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    let bgColor = 'bg-blue-100 text-blue-800';
    if (size.code.startsWith('T')) {
      bgColor = 'bg-yellow-100 text-yellow-800';
    } else if (size.code.startsWith('M')) {
      bgColor = 'bg-green-100 text-green-800';
    }
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {size.code}
    </span>;
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
            <div className="flex-1 md:flex-none md:w-1/2">
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
                            {op.basket?.row && op.basket?.position && (
                              <span className="text-xs block text-indigo-600 mt-1">
                                Posizione: {op.basket.row} - {op.basket.position}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          #{op.cycleId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {op.lot ? (
                            <div>
                              <span className="font-medium text-indigo-600">{op.lot.name}</span>
                              <span className="text-xs block text-gray-500">
                                Arrivo: {format(new Date(op.lot.arrivalDate), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Nessun lotto</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSizeBadge(op.size)}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOperation(op);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-5 w-5 text-destructive" />
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
                      <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 rounded-full bg-blue-100 text-blue-700 items-center justify-center">
                            <RotateCw className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Ciclo #{cycleId}</h3>
                            <p className="text-sm text-gray-500">
                              Cesta #{basket?.physicalNumber || '?'}
                              {basket?.row && basket?.position && (
                                <span className="text-indigo-600"> [Pos: {basket.row} - {basket.position}]</span>
                              )} • 
                              {cycle?.state === 'active' ? (
                                <span className="text-emerald-600"> Attivo</span>
                              ) : (
                                <span className="text-gray-500"> Chiuso</span>
                              )} • 
                              {cycle && 
                                ` Inizio: ${format(new Date(cycle.startDate), 'dd/MM/yyyy')}`
                              }
                              {cycle && cycle.endDate && 
                                ` • Fine: ${format(new Date(cycle.endDate), 'dd/MM/yyyy')}`
                              }
                            </p>
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
                                      </p>
                                    ) : (
                                      <p className="text-gray-400 italic">Nessun lotto</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Visualizza l'indicatore di performance di crescita per le operazioni di misura */}
                                {index > 0 && op.type === 'misura' && prevWeight && currWeight && actualGrowthPercent !== null && theoreticalGrowth && (
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
