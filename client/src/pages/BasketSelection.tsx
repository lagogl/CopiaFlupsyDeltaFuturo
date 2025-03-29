import { useState, useEffect, useMemo } from 'react';

// Funzione per calcolare la luminosità di un colore
const getLuminance = (hexColor: string): number => {
  // Rimuovi # se presente
  const hex = hexColor.replace('#', '');
  
  // Converti in RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calcola luminosità percepita con la formula per la luminanza relativa
  // https://www.w3.org/TR/WCAG20-TECHS/G18.html
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  animalCount: number | null;
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
  
  // Stati per indicatori visivi dei filtri
  const [availableSizeIds, setAvailableSizeIds] = useState<Set<number>>(new Set());
  const [availableFlupsyIds, setAvailableFlupsyIds] = useState<Set<number>>(new Set());
  
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
      const animalCount = lastOperation?.animalCount || 0;
      
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
              color: '#ffffff',
              fontWeight: 'bold',
              textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
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
    
    // Raccoglie tutti gli ID di taglie e FLUPSY disponibili
    const sizeIdsWithBaskets = new Set<number>();
    const flupsyIdsWithBaskets = new Set<number>();
    
    basketInfos.forEach(basket => {
      if (basket.size) {
        sizeIdsWithBaskets.add(basket.size.id);
      }
      flupsyIdsWithBaskets.add(basket.flupsyId);
    });
    
    // Aggiorna gli stati per gli indicatori visivi
    setAvailableSizeIds(sizeIdsWithBaskets);
    setAvailableFlupsyIds(flupsyIdsWithBaskets);
    
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
    
    // Applica immediatamente il reset
    setTimeout(() => form.handleSubmit(onSubmitFilters)(), 0);
    
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
  
  // Tipi di attività possibili per le ceste
  type BasketActivity = 'Pulizia' | 'Selezione per vendita' | 'Selezione' | 'Dismissione';
  
  // Stato per tenere traccia delle attività assegnate
  const [basketActivities, setBasketActivities] = useState<Record<number, BasketActivity>>({});
  
  // Dialog per selezione attività
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  
  // Schema di validazione per il dialog delle attività
  const activitySchema = z.object({
    selectedActivity: z.enum(['Pulizia', 'Selezione per vendita', 'Selezione', 'Dismissione'])
  });
  
  // Form per la selezione dell'attività
  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      selectedActivity: 'Pulizia'
    }
  });
  
  // Aggiorna le attività per tutte le ceste selezionate
  const updateActivities = (activity: BasketActivity) => {
    const newActivities = { ...basketActivities };
    
    // Applica l'attività a tutte le ceste selezionate
    selectedBaskets.forEach(basketId => {
      newActivities[basketId] = activity;
    });
    
    setBasketActivities(newActivities);
    setActivityDialogOpen(false);
    
    toast({
      title: "Attività assegnata",
      description: `Attività "${activity}" assegnata a ${selectedBaskets.size} ceste selezionate.`,
    });
  };
  
  // Funzione per aprire il dialogo e selezionare l'attività
  const openActivityDialog = () => {
    if (selectedBaskets.size === 0) {
      toast({
        title: "Nessuna cesta selezionata",
        description: "Seleziona almeno una cesta per assegnare un'attività.",
        variant: "destructive"
      });
      return;
    }
    
    setActivityDialogOpen(true);
  };
  
  // Funzione per condividere un messaggio via WhatsApp
  const shareViaWhatsApp = () => {
    const selectedData = filteredBaskets.filter(basket => selectedBaskets.has(basket.id));
    
    if (selectedData.length === 0) {
      toast({
        title: "Nessuna cesta selezionata",
        description: "Seleziona almeno una cesta per generare un messaggio.",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica se ci sono attività non assegnate
    const missingActivities = selectedData.some(basket => !basketActivities[basket.id]);
    
    if (missingActivities) {
      // Apri il dialogo di selezione attività se ci sono ceste senza attività
      openActivityDialog();
      return;
    }
    
    // Creiamo l'intestazione del messaggio
    let message = `*PIANO ATTIVITÀ CESTE - ${format(new Date(), 'dd/MM/yyyy')}*\n\n`;
    
    // Aggiungiamo le informazioni per ciascuna cesta
    selectedData.forEach((basket, index) => {
      const activity = basketActivities[basket.id] || 'Pulizia'; // Default a Pulizia se non specificato
      
      message += `*Cesta #${basket.physicalNumber}*\n`;
      message += `🔹 FLUPSY: ${basket.flupsy.name}\n`;
      message += `🔹 Posizione: ${basket.row}-${basket.position}\n`;
      message += `🔹 Taglia: ${basket.size?.code || 'N/D'}\n`;
      message += `🔹 Animali: ${basket.animalCount.toLocaleString('it-IT')}\n`;
      message += `🔹 *Attività: ${activity}*\n`;
      
      // Aggiungi una riga vuota tra le ceste tranne che per l'ultima
      if (index < selectedData.length - 1) {
        message += `\n`;
      }
    });
    
    // Aggiungi note finali
    message += `\n\n_Generato da FLUPSY Manager_`;
    
    // Codifica il messaggio per l'URL
    const encodedMessage = encodeURIComponent(message);
    
    // Crea l'URL per WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Apri WhatsApp in una nuova finestra
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Messaggio WhatsApp pronto",
      description: `Creato messaggio con ${selectedData.length} ceste selezionate.`,
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
      {/* Dialog per selezionare l'attività */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleziona attività per le ceste</DialogTitle>
            <DialogDescription>
              Seleziona l'attività da assegnare alle ceste selezionate.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(values => updateActivities(values.selectedActivity))} className="space-y-6">
              <FormField
                control={activityForm.control}
                name="selectedActivity"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Attività</FormLabel>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Pulizia" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Pulizia
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Selezione per vendita" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Selezione per vendita
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Selezione" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Selezione
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Dismissione" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Dismissione
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setActivityDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit">
                  Assegna attività
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
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
                                  color: field.value?.includes(size.id) ? '#ffffff' : 'inherit',
                                  fontWeight: field.value?.includes(size.id) ? 'bold' : 'normal',
                                  textShadow: field.value?.includes(size.id) ? '0px 0px 2px rgba(0,0,0,0.8)' : 'none',
                                  borderColor: size.colorHex,
                                  cursor: 'pointer',
                                  opacity: availableSizeIds.has(size.id) ? 1 : 0.5,
                                  position: 'relative',
                                  overflow: 'visible'
                                }}
                                onClick={() => {
                                  const currentSizes = field.value || [];
                                  const newSizes = currentSizes.includes(size.id)
                                    ? currentSizes.filter(id => id !== size.id)
                                    : [...currentSizes, size.id];
                                  field.onChange(newSizes);
                                  
                                  // Applica i filtri immediatamente senza premere il pulsante
                                  setTimeout(() => form.handleSubmit(onSubmitFilters)(), 0);
                                }}
                              >
                                {availableSizeIds.has(size.id) && (
                                  <span 
                                    className="w-2 h-2 rounded-full bg-green-500 absolute -top-1 -right-1"
                                    style={{ boxShadow: '0 0 0 1px white' }}
                                  />
                                )}
                                {size.code}
                              </Badge>
                            ))}
                          </div>
                          <FormDescription>
                            Seleziona le taglie di interesse (nessuna selezione = nessun risultato)
                            <span className="block mt-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                              <span className="text-xs">= ceste disponibili</span>
                            </span>
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
                                  cursor: 'pointer',
                                  opacity: availableFlupsyIds.has(flupsy.id) ? 1 : 0.5,
                                  position: 'relative',
                                  overflow: 'visible'
                                }}
                                onClick={() => {
                                  const currentFlupsys = field.value || [];
                                  const newFlupsys = currentFlupsys.includes(flupsy.id)
                                    ? currentFlupsys.filter(id => id !== flupsy.id)
                                    : [...currentFlupsys, flupsy.id];
                                  field.onChange(newFlupsys);
                                  
                                  // Applica i filtri immediatamente senza premere il pulsante
                                  setTimeout(() => form.handleSubmit(onSubmitFilters)(), 0);
                                }}
                              >
                                {availableFlupsyIds.has(flupsy.id) && (
                                  <span 
                                    className="w-2 h-2 rounded-full bg-green-500 absolute -top-1 -right-1"
                                    style={{ boxShadow: '0 0 0 1px white' }}
                                  />
                                )}
                                {flupsy.name}
                              </Badge>
                            ))}
                          </div>
                          <FormDescription>
                            Seleziona i FLUPSY di interesse (nessuna selezione = nessun risultato)
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
                        Reset filtri
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
                        color: '#ffffff', // Cambiato a bianco per maggiore leggibilità su tutti i colori
                        fontWeight: 'bold',
                        textShadow: '0px 0px 2px rgba(0,0,0,0.8)' // Aggiunto un'ombra per migliore leggibilità
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
                        <TableCell className="font-bold text-primary">
                          {totalAnimals.toLocaleString('it-IT')}
                        </TableCell>
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              disabled={selectedBaskets.size === 0}
              onClick={openActivityDialog}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Assegna attività
            </Button>
            
            <Button 
              variant="outline"
              disabled={selectedBaskets.size === 0 || Object.keys(basketActivities).length === 0}
              onClick={shareViaWhatsApp}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.004 22l1.352-4.968A9.954 9.954 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10a9.954 9.954 0 01-5.03-1.355L2.004 22zM8.391 7.308a.961.961 0 00-.371.1 1.293 1.293 0 00-.294.228c-.12.113-.188.211-.261.306A2.729 2.729 0 006.9 9.62c.002.49.13.967.33 1.413.409.902 1.082 1.857 1.971 2.742.214.213.423.427.648.626a9.448 9.448 0 003.84 2.046l.569.087c.185.01.37-.004.556-.013a1.99 1.99 0 00.833-.231c.166-.088.244-.132.383-.22 0 0 .043-.028.125-.09.135-.1.218-.171.33-.288.083-.086.155-.187.21-.302.078-.163.156-.474.188-.733.024-.198.017-.306.014-.373-.004-.107-.093-.218-.19-.265l-.582-.261s-.87-.379-1.401-.621a.498.498 0 00-.177-.041.482.482 0 00-.378.127v-.002c-.005 0-.072.057-.795.933a.35.35 0 01-.368.13 1.416 1.416 0 01-.191-.066c-.124-.052-.167-.072-.252-.109l-.005-.002a6.01 6.01 0 01-1.57-1c-.126-.11-.243-.23-.363-.346a6.296 6.296 0 01-1.02-1.268l-.059-.095a.923.923 0 01-.102-.205c-.038-.147.061-.265.061-.265s.243-.266.356-.41a4.38 4.38 0 00.263-.373c.118-.19.155-.385.093-.536-.28-.684-.57-1.365-.868-2.041-.059-.134-.234-.23-.393-.249-.054-.006-.108-.012-.162-.016a3.385 3.385 0 00-.403.004z" />
              </svg>
              Invia con WhatsApp
            </Button>
            
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
                  description: "Per utilizzare questa selezione, è possibile esportare i dati o inviare un messaggio WhatsApp.",
                });
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Conferma selezione
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}