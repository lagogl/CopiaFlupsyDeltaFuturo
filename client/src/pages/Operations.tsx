import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays, parseISO } from 'date-fns';
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

  // Filter operations
  const filteredOperations = operations?.filter(op => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${op.basketId}`.includes(searchTerm) || 
      `${op.cycleId}`.includes(searchTerm);
    
    // Filter by operation type
    const matchesType = typeFilter === 'all' || op.type === typeFilter;
    
    // Filter by date
    const matchesDate = dateFilter === '' || 
      format(new Date(op.date), 'yyyy-MM-dd') === dateFilter;
    
    return matchesSearch && matchesType && matchesDate;
  }) || [];

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

      {/* Operations Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
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
      </div>

      {/* Operations Table */}
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
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Caricamento operazioni...
                  </td>
                </tr>
              ) : filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
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
                      #{op.basket?.physicalNumber || op.basketId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{op.cycleId}
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
