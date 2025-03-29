import { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Fan, Filter, Download, Trash, Info, Activity, Check, LucideIcon } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

// Interfacce per i tipi di dati
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

interface Operation {
  id: number;
  date: string;
  type: string;
  basketId: number;
  sizeId: number | null;
  animalsNumber: number | null;
  animalsPerKg: number | null;
  sampleWeight: number | null;
  sampleNumber: number | null;
  totalWeight: number | null;
  averageWeight: number | null;
  notes: string | null;
  lotId: number | null;
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface Size {
  id: number;
  name: string;
  code: string;
  sizeMm: number;
  colorHex: string;
}

interface Flupsy {
  id: number;
  name: string;
  location: string;
  rows: string[];
  positions: number;
  propellerDirection: "clockwise" | "counterclockwise";
}

interface Lot {
  id: number;
  arrivalDate: string;
  supplier: string;
  species: string;
  initialTotalAnimals: number | null;
}

interface MortalityRate {
  id: number;
  basketId: number;
  cycleId: number;
  date: string;
  initialAnimals: number;
  deadAnimals: number;
  mortalityPercent: number;
}

// Tipo esteso per le informazioni complete delle ceste
interface BasketInfo {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  flupsy: Flupsy;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  currentCycle: Cycle | null;
  lastOperation: Operation | null;
  size: Size | null;
  lot: Lot | null;
  growthRate: number | null;
  cycleDuration: number | null;
  operations: Operation[];
  animalCount: number;
  mortalityRate: MortalityRate | null;
}

// Interfaccia per i filtri
interface BasketFilters {
  sizes: number[];
  minAnimals: number;
  maxAnimals: number;
  minAge: number;
  maxAge: number;
  minLastOperation: number;
  maxLastOperation: number;
  maxMortality: number;
  minGrowthRate: number;
  flupsys: number[];
}

// Schema per la validazione dei filtri
const filterSchema = z.object({
  sizes: z.array(z.number()).optional(),
  minAnimals: z.number().min(0).optional(),
  maxAnimals: z.number().min(0).optional(),
  minAge: z.number().min(0).optional(),
  maxAge: z.number().min(0).optional(),
  minLastOperation: z.number().min(0).optional(),
  maxLastOperation: z.number().min(0).optional(),
  maxMortality: z.number().min(0).max(100).optional(),
  minGrowthRate: z.number().optional(),
  flupsys: z.array(z.number()).optional(),
});

// Definizione delle colonne della tabella
interface Column {
  id: string;
  header: string;
  cell: (basket: BasketInfo) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: BasketInfo, b: BasketInfo) => number;
}

export default function BasketSelection() {
  const { toast } = useToast();
  
  // Stati per gestire i dati e i filtri
  const [filteredBaskets, setFilteredBaskets] = useState<BasketInfo[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedBaskets, setSelectedBaskets] = useState<Set<number>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  
  // Stati per i totali
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalBySize, setTotalBySize] = useState<Record<number, number>>({});
  
  // Queries per caricare i dati
  const { data: baskets, isLoading: basketsLoading } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  const { data: operations, isLoading: operationsLoading } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });
  
  const { data: cycles, isLoading: cyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });
  
  const { data: sizes, isLoading: sizesLoading } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });
  
  const { data: flupsys, isLoading: flupsysLoading } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: lots, isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ['/api/lots'],
  });
  
  const { data: activeCycles, isLoading: activeCyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles/active'],
  });
  
  const { data: mortalityRates, isLoading: mortalityLoading } = useQuery<MortalityRate[]>({
    queryKey: ['/api/mortality-rates'],
    enabled: !!activeCycles,
  });
  
  // Form per gestire i filtri
  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      sizes: [],
      minAnimals: 0,
      maxAnimals: 1000000,
      minAge: 0,
      maxAge: 1000,
      minLastOperation: 0,
      maxLastOperation: 365,
      maxMortality: 100,
      minGrowthRate: 0,
      flupsys: [],
    },
  });
  
  // Funzione per gestire il cambio dell'ordinamento
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };
  
  // Funzione per la gestione della selezione delle ceste
  const toggleBasketSelection = (basketId: number) => {
    const newSelected = new Set(selectedBaskets);
    if (newSelected.has(basketId)) {
      newSelected.delete(basketId);
    } else {
      newSelected.add(basketId);
    }
    setSelectedBaskets(newSelected);
  };
  
  // Funzione per selezionare/deselezionare tutte le ceste
  const toggleSelectAll = () => {
    if (selectedBaskets.size === filteredBaskets.length) {
      setSelectedBaskets(new Set());
    } else {
      setSelectedBaskets(new Set(filteredBaskets.map(b => b.id)));
    }
  };
  
  // Crea un oggetto dati esteso per ogni cesta
  const basketInfos = useMemo(() => {
    if (!baskets || !operations || !cycles || !sizes || !flupsys || !lots || !activeCycles) return [];
    
    return baskets.map(basket => {
      // Trova il ciclo corrente
      const currentCycle = basket.currentCycleId ? 
        cycles.find(c => c.id === basket.currentCycleId) || null : null;
      
      // Filtra le operazioni per questa cesta
      const basketOperations = operations.filter(op => op.basketId === basket.id);
      
      // Ordina le operazioni per data (la più recente prima)
      const sortedOperations = [...basketOperations].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Ultima operazione
      const lastOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
      
      // Trova la taglia
      const size = lastOperation?.sizeId ? 
        sizes.find(s => s.id === lastOperation.sizeId) || null : null;
      
      // Trova il lotto
      const lot = lastOperation?.lotId ?
        lots.find(l => l.id === lastOperation.lotId) || null : null;
      
      // Calcola la durata del ciclo in giorni
      let cycleDuration = null;
      if (currentCycle) {
        const startDate = new Date(currentCycle.startDate);
        const today = new Date();
        cycleDuration = differenceInDays(today, startDate);
      }
      
      // Calcola il tasso di crescita
      let growthRate = null;
      if (sortedOperations.length >= 2) {
        const measurementOperations = sortedOperations.filter(op => 
          op.animalsPerKg !== null && op.averageWeight !== null
        );
        
        if (measurementOperations.length >= 2) {
          // Semplice calcolo basato sulle ultime due operazioni
          const latest = measurementOperations[0];
          const previous = measurementOperations[1];
          
          if (latest.averageWeight && previous.averageWeight) {
            const latestWeight = latest.averageWeight;
            const previousWeight = previous.averageWeight;
            const daysDiff = differenceInDays(
              new Date(latest.date),
              new Date(previous.date)
            );
            
            if (daysDiff > 0) {
              // Calcolo SGR giornaliero (% al giorno)
              growthRate = ((Math.log(latestWeight) - Math.log(previousWeight)) / daysDiff) * 100;
            }
          }
        }
      }
      
      // Trova il flupsy
      const flupsy = flupsys.find(f => f.id === basket.flupsyId) || {
        id: 0,
        name: 'Sconosciuto',
        location: '',
        rows: [],
        positions: 0,
        propellerDirection: 'clockwise' as const
      };
      
      // Calcola il numero attuale di animali
      const animalCount = lastOperation?.animalsNumber || 0;
      
      // Mortalità
      const mortalityRate = mortalityRates?.find(m => 
        m.basketId === basket.id && m.cycleId === (basket.currentCycleId || 0)
      ) || null;
      
      return {
        ...basket,
        flupsy,
        currentCycle,
        lastOperation,
        size,
        lot,
        growthRate,
        cycleDuration,
        operations: sortedOperations,
        animalCount,
        mortalityRate
      };
    });
  }, [baskets, operations, cycles, sizes, flupsys, lots, activeCycles, mortalityRates]);
  
  // Definizione delle colonne
  const columns: Column[] = [
    {
      id: 'selection',
      header: '',
      cell: (basket) => (
        <Checkbox 
          checked={selectedBaskets.has(basket.id)}
          onCheckedChange={() => toggleBasketSelection(basket.id)}
        />
      ),
    },
    {
      id: 'physicalNumber',
      header: 'Numero',
      cell: (basket) => <span>{basket.physicalNumber}</span>,
      sortable: true,
      sortFn: (a, b) => a.physicalNumber - b.physicalNumber,
    },
    {
      id: 'flupsy',
      header: 'FLUPSY',
      cell: (basket) => (
        <div className="flex flex-col">
          <span>{basket.flupsy.name}</span>
          <span className="text-xs text-muted-foreground">
            {basket.row}-{basket.position}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 inline-block">
                    <Fan 
                      className={`h-3 w-3 ${basket.flupsy.propellerDirection === 'clockwise' ? 'rotate-45' : 'rotate-[225deg]'}`} 
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Direzione elica: {basket.flupsy.propellerDirection === 'clockwise' ? 'Oraria' : 'Antioraria'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </div>
      ),
      sortable: true,
      sortFn: (a, b) => a.flupsy.name.localeCompare(b.flupsy.name),
    },
    {
      id: 'size',
      header: 'Taglia',
      cell: (basket) => {
        if (!basket.size) return <span className="text-muted-foreground">-</span>;
        const isLargerThanTP10000 = basket.size.sizeMm > 10000;
        return (
          <Badge 
            variant="outline" 
            style={{
              backgroundColor: isLargerThanTP10000 ? '#000000' : basket.size.colorHex,
              color: isLargerThanTP10000 ? '#ffffff' : '#000000',
              borderColor: basket.size.colorHex
            }}
          >
            {isLargerThanTP10000 ? '+TP-10000' : basket.size.code}
          </Badge>
        );
      },
      sortable: true,
      sortFn: (a, b) => {
        if (!a.size && !b.size) return 0;
        if (!a.size) return 1;
        if (!b.size) return -1;
        return a.size.sizeMm - b.size.sizeMm;
      },
    },
    {
      id: 'animalCount',
      header: 'Animali',
      cell: (basket) => (
        <span>
          {basket.animalCount.toLocaleString('it-IT')}
        </span>
      ),
      sortable: true,
      sortFn: (a, b) => a.animalCount - b.animalCount,
    },
    {
      id: 'averageWeight',
      header: 'Peso medio',
      cell: (basket) => {
        if (!basket.lastOperation?.averageWeight) return <span className="text-muted-foreground">-</span>;
        return <span>{basket.lastOperation.averageWeight.toFixed(2)} g</span>;
      },
      sortable: true,
      sortFn: (a, b) => {
        const aWeight = a.lastOperation?.averageWeight || 0;
        const bWeight = b.lastOperation?.averageWeight || 0;
        return aWeight - bWeight;
      },
    },
    {
      id: 'cycleDuration',
      header: 'Età ciclo',
      cell: (basket) => {
        if (!basket.cycleDuration) return <span className="text-muted-foreground">-</span>;
        return <span>{basket.cycleDuration} giorni</span>;
      },
      sortable: true,
      sortFn: (a, b) => {
        const aDuration = a.cycleDuration || 0;
        const bDuration = b.cycleDuration || 0;
        return aDuration - bDuration;
      },
    },
    {
      id: 'lastOperation',
      header: 'Ultima operazione',
      cell: (basket) => {
        if (!basket.lastOperation) return <span className="text-muted-foreground">-</span>;
        const date = new Date(basket.lastOperation.date);
        const days = differenceInDays(new Date(), date);
        return (
          <div className="flex flex-col">
            <span>{format(date, 'dd/MM/yyyy')}</span>
            <span className="text-xs text-muted-foreground">
              {days === 0 ? 'Oggi' : `${days} giorni fa`}
            </span>
          </div>
        );
      },
      sortable: true,
      sortFn: (a, b) => {
        if (!a.lastOperation && !b.lastOperation) return 0;
        if (!a.lastOperation) return 1;
        if (!b.lastOperation) return -1;
        return new Date(b.lastOperation.date).getTime() - new Date(a.lastOperation.date).getTime();
      },
    },
    {
      id: 'growth',
      header: 'SGR',
      cell: (basket) => {
        if (basket.growthRate === null) return <span className="text-muted-foreground">-</span>;
        
        let color = 'text-gray-600';
        if (basket.growthRate > 3) color = 'text-green-600';
        else if (basket.growthRate > 2) color = 'text-lime-600';
        else if (basket.growthRate > 1) color = 'text-amber-600';
        else if (basket.growthRate > 0) color = 'text-orange-600';
        else color = 'text-red-600';
        
        return (
          <span className={color}>
            {basket.growthRate.toFixed(2)}%/giorno
          </span>
        );
      },
      sortable: true,
      sortFn: (a, b) => {
        const aRate = a.growthRate ?? -9999;
        const bRate = b.growthRate ?? -9999;
        return bRate - aRate;
      },
    },
    {
      id: 'mortality',
      header: 'Mortalità',
      cell: (basket) => {
        if (!basket.mortalityRate) return <span className="text-muted-foreground">-</span>;
        
        let color = 'text-gray-600';
        if (basket.mortalityRate.mortalityPercent > 20) color = 'text-red-600';
        else if (basket.mortalityRate.mortalityPercent > 10) color = 'text-orange-600';
        else if (basket.mortalityRate.mortalityPercent > 5) color = 'text-amber-600';
        else color = 'text-green-600';
        
        return (
          <span className={color}>
            {basket.mortalityRate.mortalityPercent.toFixed(1)}%
          </span>
        );
      },
      sortable: true,
      sortFn: (a, b) => {
        const aRate = a.mortalityRate?.mortalityPercent ?? -1;
        const bRate = b.mortalityRate?.mortalityPercent ?? -1;
        return aRate - bRate;
      },
    },
  ];
  
  // Ordinamento e filtro delle ceste
  useEffect(() => {
    if (!basketInfos) return;
    
    let filtered = [...basketInfos];
    
    // Applica i filtri
    const formValues = form.getValues();
    
    // Nuovo approccio: crea un array di funzioni filtro e applica solo quelle che hanno valori significativi
    const filterFunctions: Array<(basket: BasketInfo) => boolean> = [];
    
    // Filtro per taglia
    if (formValues.sizes && formValues.sizes.length > 0) {
      filterFunctions.push((basket: BasketInfo) => 
        basket.size && formValues.sizes ? formValues.sizes.includes(basket.size.id) : false
      );
    }
    
    // Filtro per numero di animali (range)
    if (formValues.minAnimals !== undefined && formValues.minAnimals > 0 || 
        formValues.maxAnimals !== undefined && formValues.maxAnimals < 1000000) {
      filterFunctions.push((basket: BasketInfo) => {
        const min = formValues.minAnimals || 0;
        const max = formValues.maxAnimals || 1000000;
        return basket.animalCount >= min && basket.animalCount <= max;
      });
    }
    
    // Filtro per età ciclo (range)
    if (formValues.minAge !== undefined && formValues.minAge > 0 || 
        formValues.maxAge !== undefined && formValues.maxAge < 1000) {
      filterFunctions.push((basket: BasketInfo) => {
        const min = formValues.minAge || 0;
        const max = formValues.maxAge || 1000;
        const duration = basket.cycleDuration || 0;
        return duration >= min && duration <= max;
      });
    }
    
    // Filtro per ultima operazione (range giorni)
    if (formValues.minLastOperation !== undefined && formValues.minLastOperation > 0 || 
        formValues.maxLastOperation !== undefined && formValues.maxLastOperation < 365) {
      filterFunctions.push((basket: BasketInfo) => {
        if (!basket.lastOperation) return false;
        
        const days = differenceInDays(new Date(), new Date(basket.lastOperation.date));
        const min = formValues.minLastOperation || 0;
        const max = formValues.maxLastOperation || 365;
        
        return days >= min && days <= max;
      });
    }
    
    // Filtro per mortalità
    if (formValues.maxMortality !== undefined && formValues.maxMortality < 100) {
      filterFunctions.push((basket: BasketInfo) => 
        !basket.mortalityRate || basket.mortalityRate.mortalityPercent <= formValues.maxMortality!
      );
    }
    
    // Filtro per crescita
    if (formValues.minGrowthRate !== undefined && formValues.minGrowthRate > 0) {
      filterFunctions.push((basket: BasketInfo) => 
        basket.growthRate !== null && basket.growthRate >= formValues.minGrowthRate!
      );
    }
    
    // Filtro per FLUPSY
    if (formValues.flupsys && formValues.flupsys.length > 0) {
      filterFunctions.push((basket: BasketInfo) => {
        return formValues.flupsys ? formValues.flupsys.includes(basket.flupsyId) : false;
      });
    }
    
    // Se non ci sono filtri attivi, non mostrare nulla
    if (filterFunctions.length === 0) {
      // Nessun filtro selezionato, lascia l'elenco vuoto
      filtered = [];
    } else {
      // Applica i filtri con logica OR (basta che soddisfi almeno uno dei criteri)
      filtered = filtered.filter(basket => 
        filterFunctions.some(filterFn => filterFn(basket))
      );
    }
    
    // Ordinamento
    if (sortColumn) {
      const column = columns.find(col => col.id === sortColumn);
      if (column?.sortable && column.sortFn) {
        filtered.sort((a, b) => {
          const result = column.sortFn!(a, b);
          return sortDirection === 'asc' ? result : -result;
        });
      }
    }
    
    setFilteredBaskets(filtered);
    
    // Calcola il totale degli animali
    const total = filtered.reduce((sum, basket) => sum + basket.animalCount, 0);
    setTotalAnimals(total);
    
    // Calcola il totale per taglia
    const totalBySize: Record<number, number> = {};
    filtered.forEach(basket => {
      if (basket.size) {
        const sizeId = basket.size.id;
        totalBySize[sizeId] = (totalBySize[sizeId] || 0) + basket.animalCount;
      }
    });
    setTotalBySize(totalBySize);
    
  }, [basketInfos, sortColumn, sortDirection, form.formState.submitCount]);
  
  // Gestisci aggiornamento dei filtri
  const onSubmitFilters = (data: z.infer<typeof filterSchema>) => {
    // Aggiorna i filtri selezionati e mantiene lo stato
    if (data.sizes) {
      setSelectedSizes(data.sizes);
    }
    
    // Notifica l'utente
    toast({
      title: "Filtri applicati",
      description: `Trovate ${filteredBaskets.length} ceste che corrispondono ai criteri selezionati.`,
    });
  };
  
  // Reset filtri
  const resetFilters = () => {
    form.reset({
      sizes: [],
      minAnimals: 0,
      maxAnimals: 1000000,
      minAge: 0,
      maxAge: 1000,
      minLastOperation: 0,
      maxLastOperation: 365,
      maxMortality: 100,
      minGrowthRate: 0,
      flupsys: [],
    });
    setSelectedSizes([]);
    toast({
      title: "Filtri reimpostati",
      description: "Tutti i filtri sono stati rimossi.",
    });
  };
  
  // Gestione esportazione dati
  const exportData = () => {
    const selectedData = filteredBaskets.filter(basket => selectedBaskets.has(basket.id));
    
    // Crea un array di oggetti con le proprietà che vogliamo esportare
    const exportData = selectedData.map(basket => ({
      'Numero': basket.physicalNumber,
      'FLUPSY': basket.flupsy.name,
      'Posizione': `${basket.row}-${basket.position}`,
      'Taglia': basket.size?.code || 'N/D',
      'Animali': basket.animalCount,
      'Peso medio (g)': basket.lastOperation?.averageWeight?.toFixed(2) || 'N/D',
      'Età ciclo (giorni)': basket.cycleDuration || 'N/D',
      'Ultima operazione': basket.lastOperation ? format(new Date(basket.lastOperation.date), 'dd/MM/yyyy') : 'N/D',
      'SGR (%/giorno)': basket.growthRate?.toFixed(2) || 'N/D',
      'Mortalità (%)': basket.mortalityRate?.mortalityPercent.toFixed(1) || 'N/D',
    }));
    
    // Converti in CSV
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => {
        return headers.map(header => {
          const cell = row[header as keyof typeof row];
          // Gestisci le stringhe con virgole
          return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
        }).join(',');
      })
    ];
    
    const csvString = csvRows.join('\n');
    
    // Crea un blob e un URL per il download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Crea un link e simula il click
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `selezione-ceste-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Esportazione completata",
      description: `Esportati i dati di ${selectedData.length} ceste selezionate.`,
    });
  };
  
  // Flag per determinare se l'applicazione è in caricamento
  const isLoading = basketsLoading || operationsLoading || cyclesLoading || 
                   sizesLoading || flupsysLoading || lotsLoading || 
                   activeCyclesLoading || mortalityLoading;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Selezione avanzata ceste</CardTitle>
            <CardDescription>Caricamento dati in corso...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Selezione avanzata ceste</CardTitle>
              <CardDescription>
                Visualizza, filtra e seleziona ceste in base a criteri specifici
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilterPanel ? 'Nascondi filtri' : 'Mostra filtri'}
            </Button>
          </div>
        </CardHeader>
        
        {showFilterPanel && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitFilters)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Filtri principali</h3>
                    
                    <FormField
                      control={form.control}
                      name="sizes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taglie</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {sizes?.map(size => (
                              <Badge
                                key={size.id}
                                variant={field.value?.includes(size.id) ? "default" : "outline"}
                                style={{
                                  backgroundColor: field.value?.includes(size.id) 
                                    ? size.colorHex 
                                    : 'transparent',
                                  color: field.value?.includes(size.id) ? '#000000' : 'inherit',
                                  borderColor: size.colorHex,
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  const currentSizes = field.value || [];
                                  const newSizes = currentSizes.includes(size.id)
                                    ? currentSizes.filter(id => id !== size.id)
                                    : [...currentSizes, size.id];
                                  field.onChange(newSizes);
                                }}
                              >
                                {size.code}
                              </Badge>
                            ))}
                          </div>
                          <FormDescription>
                            Seleziona le taglie di interesse (nessuna selezione = tutte le taglie)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">FLUPSY</h3>
                    
                    <FormField
                      control={form.control}
                      name="flupsys"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unità FLUPSY</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {flupsys?.map(flupsy => (
                              <Badge
                                key={flupsy.id}
                                variant={field.value?.includes(flupsy.id) ? "default" : "outline"}
                                style={{
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  const currentFlupsys = field.value || [];
                                  const newFlupsys = currentFlupsys.includes(flupsy.id)
                                    ? currentFlupsys.filter(id => id !== flupsy.id)
                                    : [...currentFlupsys, flupsy.id];
                                  field.onChange(newFlupsys);
                                }}
                              >
                                {flupsy.name}
                              </Badge>
                            ))}
                          </div>
                          <FormDescription>
                            Seleziona i FLUPSY di interesse (nessuna selezione = tutti)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-8">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetFilters}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                      <Button type="submit">
                        <Filter className="mr-2 h-4 w-4" />
                        Applica filtri
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        )}
        
        <div className="border-t pt-4 px-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Trovate <span className="font-medium">{filteredBaskets.length}</span> ceste
                con un totale di <span className="font-medium">{totalAnimals.toLocaleString('it-IT')}</span> animali
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(totalBySize).map(([sizeId, count]) => {
                  const size = sizes?.find(s => s.id === parseInt(sizeId));
                  if (!size) return null;
                  
                  return (
                    <Badge 
                      key={sizeId}
                      style={{
                        backgroundColor: size.colorHex,
                        color: '#000000',
                      }}
                    >
                      {size.code}: {count.toLocaleString('it-IT')}
                    </Badge>
                  );
                })}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={exportData}
                disabled={selectedBaskets.size === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Esporta selezione
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Info className="mr-2 h-4 w-4" />
                    Info selezione
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Dettagli selezione</h4>
                    <p>Ceste selezionate: {selectedBaskets.size}</p>
                    <p>Animali totali selezionati: {
                      filteredBaskets
                        .filter(b => selectedBaskets.has(b.id))
                        .reduce((sum, b) => sum + b.animalCount, 0)
                        .toLocaleString('it-IT')
                    }</p>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Puoi esportare questi dati in formato CSV utilizzando il pulsante "Esporta selezione"
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox 
                        checked={selectedBaskets.size === filteredBaskets.length && filteredBaskets.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    {columns.slice(1).map(column => (
                      <TableHead 
                        key={column.id}
                        className={column.sortable ? 'cursor-pointer' : ''}
                        onClick={column.sortable ? () => handleSort(column.id) : undefined}
                      >
                        <div className="flex items-center">
                          {column.header}
                          {column.sortable && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBaskets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Activity className="h-8 w-8 mb-2" />
                          <p>Nessuna cesta corrisponde ai criteri di filtro selezionati</p>
                          <Button 
                            variant="link" 
                            onClick={resetFilters}
                            className="mt-2"
                          >
                            Reimposta tutti i filtri
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {/* Riga di totale come prima riga */}
                      <TableRow className="font-medium bg-muted/30">
                        <TableCell>
                          <div className="flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                          </div>
                        </TableCell>
                        <TableCell>Totale</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{totalAnimals.toLocaleString('it-IT')}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                      
                      {/* Righe per ogni cesta */}
                      {filteredBaskets.map(basket => (
                        <TableRow 
                          key={basket.id}
                          className={selectedBaskets.has(basket.id) ? 'bg-muted/50' : ''}
                        >
                          {columns.map(column => (
                            <TableCell key={`${basket.id}-${column.id}`}>
                              {column.cell(basket)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Selezionate {selectedBaskets.size} ceste
          </p>
          
          <Button 
            disabled={selectedBaskets.size === 0}
            onClick={() => {
              const selectedInfo = filteredBaskets
                .filter(b => selectedBaskets.has(b.id))
                .map(b => ({
                  physicalNumber: b.physicalNumber,
                  flupsy: b.flupsy.name,
                  size: b.size?.code || 'N/D',
                  animalCount: b.animalCount,
                }));
              
              toast({
                title: "Selezione completata",
                description: "Per utilizzare questa selezione, è possibile esportare i dati o visualizzare le informazioni dettagliate.",
              });
            }}
          >
            <Check className="mr-2 h-4 w-4" />
            Conferma selezione
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}