import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  AlertTriangle, Loader2, ClipboardList, 
  MapPin, Link, Scale, Ruler 
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import FlupsyMiniMap from "./FlupsyMiniMap";
import FlupsyMiniMapOptimized from "./FlupsyMiniMapOptimized";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Schema di validazione per l'operazione
const operationSchema = z.object({
  date: z.date({
    required_error: "La data è obbligatoria",
  }),
  type: z.string({
    required_error: "Il tipo di operazione è obbligatorio",
  }),
  basketId: z.number({
    required_error: "Il cestello è obbligatorio",
  }),
  flupsyId: z.number({
    required_error: "Il FLUPSY è obbligatorio",
  }),
  cycleId: z.number().nullable().optional(),
  sizeId: z.number().nullable().optional(),
  sgrId: z.number().nullable().optional(),
  lotId: z.number({
    required_error: "Il lotto è obbligatorio",
  }),
  // CAMPI OBBLIGATORI per tutte le operazioni
  animalCount: z.number({
    required_error: "Il numero animali vivi è obbligatorio",
  }).min(0, "Il numero animali vivi deve essere maggiore o uguale a 0"),
  totalWeight: z.number({
    required_error: "Il peso totale grammi è obbligatorio",
  }).min(0, "Il peso totale deve essere maggiore di 0"),
  sampleWeight: z.number({
    required_error: "I grammi sample sono obbligatori",
  }).min(0, "Il peso del campione deve essere maggiore di 0"),
  deadCount: z.number({
    required_error: "Il numero animali morti è obbligatorio",
  }).min(0, "Il numero animali morti deve essere maggiore o uguale a 0"),
  // Campi calcolati automaticamente
  animalsPerKg: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Campi specifici per l'operazione di misurazione
  liveAnimals: z.number().nullable().optional(),
  totalSample: z.number().nullable().optional(),
  mortalityRate: z.number().nullable().optional(),
  manualCountAdjustment: z.boolean().default(false).optional(),
});

// Tipo per le props del componente
type OperationFormProps = {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: any;
  initialBasketId?: number | null;
  initialFlupsyId?: number | null;
  initialCycleId?: number | null;
};

export default function OperationFormCompact({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  initialBasketId = null,
  initialFlupsyId = null,
  initialCycleId = null,
}: OperationFormProps) {
  // Stato per la gestione dei dati e degli errori
  const [operationDateError, setOperationDateError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [pendingValues, setPendingValues] = useState<any>(null);
  const [prevOperationData, setPrevOperationData] = useState<any>(null);
  const { toast } = useToast();
  
  // Definizione del form con validazione
  const form = useForm<z.infer<typeof operationSchema>>({
    resolver: zodResolver(operationSchema),
    defaultValues: defaultValues || {
      date: new Date(),
      type: null,
      basketId: initialBasketId,
      flupsyId: initialFlupsyId,
      cycleId: initialCycleId,
      sizeId: null,
      sgrId: null,
      lotId: null,
      // Valori di default per campi obbligatori
      animalCount: 0,
      totalWeight: 0,
      sampleWeight: 0,
      deadCount: 0,
      // Campi calcolati automaticamente
      animalsPerKg: null,
      notes: "",
      liveAnimals: null,
      totalSample: null,
      mortalityRate: null,
      manualCountAdjustment: false,
    },
  });

  // Ottieni valori del form per tracking e calcoli automatici
  const watchType = form.watch("type");
  const watchBasketId = form.watch("basketId");
  const watchFlupsyId = form.watch("flupsyId");
  const watchDate = form.watch("date");
  const watchLotId = form.watch("lotId");
  const watchTotalWeight = form.watch("totalWeight");
  const watchAnimalsPerKg = form.watch("animalsPerKg");
  const watchSampleWeight = form.watch("sampleWeight");
  const watchLiveAnimals = form.watch("liveAnimals");
  const watchTotalSample = form.watch("totalSample");
  const deadCount = form.watch("deadCount") || 0;
  const watchManualCountAdjustment = form.watch("manualCountAdjustment");

  // Query per ottenere dati da database
  const { data: flupsys } = useQuery({ 
    queryKey: ['/api/flupsys'],
    enabled: !isLoading,
  });
  
  const { data: sizes } = useQuery({ 
    queryKey: ['/api/sizes'],
    enabled: !isLoading,
  });
  
  const { data: sgrs } = useQuery({ 
    queryKey: ['/api/sgr'],
    enabled: !isLoading,
  });
  
  const { data: baskets } = useQuery({ 
    queryKey: ['/api/baskets?includeAll=true'],
    enabled: !isLoading,
  });
  
  const { data: cycles } = useQuery({ 
    queryKey: ['/api/cycles'],
    enabled: !isLoading,
  });
  
  const { data: lots } = useQuery({ 
    queryKey: ['/api/lots/active'],
    enabled: !isLoading,
  });
  
  const { data: operations } = useQuery({ 
    queryKey: ['/api/operations'],
    enabled: !isLoading,
  });

  // Filtra i cestelli per FLUPSY selezionato
  const [flupsyBaskets, setFlupsyBaskets] = useState<any[]>([]);
  const [isLoadingFlupsyBaskets, setIsLoadingFlupsyBaskets] = useState<boolean>(false);
  
  // Aggiorna la lista di cestelli quando cambia il FLUPSY selezionato
  useEffect(() => {
    if (watchFlupsyId && baskets) {
      setIsLoadingFlupsyBaskets(true);
      const filtered = baskets.filter((basket: any) => basket.flupsyId === watchFlupsyId);
      
      // Log per debug
      console.log("Cestelli filtrati per FLUPSY:", filtered);
      console.log("TOTALE cestelli trovati:", filtered.length);
      if (filtered.length > 0) {
        console.log("Esempio cestello #1:", filtered[0]);
        console.log("- State:", filtered[0].state);
        console.log("- CurrentCycleId:", filtered[0].currentCycleId);
        console.log("- CycleCode:", filtered[0].cycleCode);
        
        // Mostra stato di tutti i cestelli
        filtered.forEach((basket, index) => {
          console.log(`Cestello #${basket.physicalNumber} (${index + 1}/${filtered.length}):`, {
            id: basket.id,
            state: basket.state,
            currentCycleId: basket.currentCycleId,
            cycleCode: basket.cycleCode
          });
        });
      }
      
      setFlupsyBaskets(filtered);
      setIsLoadingFlupsyBaskets(false);
    } else {
      setFlupsyBaskets([]);
    }
  }, [watchFlupsyId, baskets]);

  // Determina le operazioni disponibili in base al cestello selezionato
  const selectedBasket = baskets?.find(b => b.id === watchBasketId);
  
  // Verifica se esiste un ciclo attivo per questo cestello
  const basketHasActiveCycle = useMemo(() => {
    if (!watchBasketId || !cycles) return false;
    return cycles.some((cycle: any) => 
      cycle.basketId === watchBasketId && 
      cycle.state === 'active'
    );
  }, [watchBasketId, cycles]);
  
  // Logica corretta per determinare le operazioni disponibili
  const basketOperations = useMemo(() => {
    if (!selectedBasket) return [];
    
    const isReallyAvailable = selectedBasket.state === 'available' && !basketHasActiveCycle;
    const isActiveWithCycle = selectedBasket.state === 'active' || basketHasActiveCycle;
    
    console.log(`🔍 Cestello #${selectedBasket.physicalNumber}:`, {
      state: selectedBasket.state,
      currentCycleId: selectedBasket.currentCycleId,
      hasActiveCycle: basketHasActiveCycle,
      isReallyAvailable,
      isActiveWithCycle
    });
    
    if (isReallyAvailable) {
      // Solo Prima Attivazione per cestelli veramente disponibili
      console.log('✅ Cestello disponibile - mostro solo Prima Attivazione');
      return [{ value: 'prima-attivazione', label: 'Prima Attivazione' }];
    } else if (isActiveWithCycle) {
      // Tutte le operazioni TRANNE Prima Attivazione per cestelli con ciclo attivo
      console.log('✅ Cestello con ciclo attivo - mostro operazioni normali');
      return [
        { value: 'misura', label: 'Misura' },
        { value: 'peso', label: 'Peso' },
        { value: 'vendita', label: 'Vendita' }
      ];
    } else {
      // Fallback per stati inconsistenti
      console.log('⚠️ Stato cestello inconsistente - mostro tutte le operazioni');
      return [
        { value: 'prima-attivazione', label: 'Prima Attivazione' },
        { value: 'misura', label: 'Misura' },
        { value: 'peso', label: 'Peso' },
        { value: 'vendita', label: 'Vendita' }
      ];
    }
  }, [selectedBasket, basketHasActiveCycle]);

  // Imposta valori iniziali se forniti come props
  useEffect(() => {
    if (initialFlupsyId && !form.getValues('flupsyId')) {
      form.setValue('flupsyId', initialFlupsyId);
    }
    
    if (initialBasketId && !form.getValues('basketId')) {
      form.setValue('basketId', initialBasketId);
    }
    
    if (initialCycleId && !form.getValues('cycleId')) {
      form.setValue('cycleId', initialCycleId);
    }
    
    // Imposta valori di default in base ai parametri iniziali
    if (initialBasketId && baskets && baskets.length > 0 && 
        !isLoadingFlupsyBaskets && !defaultValues) {
      const selectedBasket = baskets.find(b => b.id === initialBasketId);
      
      if (selectedBasket) {
        console.log("Basket iniziale:", selectedBasket);
        
        if (selectedBasket.currentCycleId) {
          console.log("Cestello con ciclo attivo:", selectedBasket.currentCycleId);
          form.setValue('cycleId', selectedBasket.currentCycleId);
          
          // Cerca l'ultima operazione per questo cestello/ciclo
          if (operations && operations.length > 0) {
            const basketOperations = operations.filter((op: any) => 
              op.basketId === initialBasketId && 
              op.cycleId === selectedBasket.currentCycleId
            ).sort((a: any, b: any) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            
            if (basketOperations.length > 0) {
              const lastOperation = basketOperations[0];
              console.log("Ultima operazione per questo cestello:", lastOperation);
              setPrevOperationData(lastOperation);
            }
          }
        } else {
          console.log("Cestello senza ciclo attivo");
          form.setValue('cycleId', null);
        }
      }
    }
  }, [initialCycleId, initialFlupsyId, initialBasketId, cycles, baskets, flupsys, form, defaultValues, flupsyBaskets, isLoadingFlupsyBaskets]);

  // Auto-set operation type and populate fields based on basket state
  useEffect(() => {
    console.log('🔍 Debug auto-set OperationFormCompact - ENTRY:', {
      watchBasketId,
      baskets: baskets ? `Array with ${baskets.length} items` : 'undefined/null',
      currentType: watchType,
      formValues: form.getValues()
    });
    
    const selectedBasket = baskets?.find(b => b.id === watchBasketId);
    
    console.log('🔍 Debug auto-set OperationFormCompact - DETAILS:', {
      watchBasketId,
      selectedBasket: selectedBasket ? {id: selectedBasket.id, state: selectedBasket.state} : null,
      shouldAutoSet: watchBasketId && selectedBasket?.state === 'available',
      currentType: watchType,
      basketsLoaded: !!baskets
    });
    
    if (watchBasketId && selectedBasket && !watchType) {
      const isReallyAvailable = selectedBasket.state === 'available' && !basketHasActiveCycle;
      const isActiveWithCycle = selectedBasket.state === 'active' || basketHasActiveCycle;
      
      if (isReallyAvailable) {
        // Cestello disponibile: imposta "Prima Attivazione"
        console.log('🚀 Cestello disponibile - impostando Prima Attivazione');
        form.setValue('type', 'prima-attivazione');
      } else if (isActiveWithCycle) {
        // Cestello con ciclo attivo: imposta "Misura" e trova la prima attivazione
        console.log('🚀 Cestello con ciclo attivo - impostando Misura e cercando Prima Attivazione');
        form.setValue('type', 'misura');
        
        // Trova l'operazione di prima attivazione per questo ciclo
        if (operations && operations.length > 0) {
          const firstActivationOp = operations.find((op: any) => 
            op.basketId === watchBasketId && 
            op.type === 'prima-attivazione'
          );
          
          if (firstActivationOp) {
            console.log('✅ Trovata Prima Attivazione:', firstActivationOp);
            // Imposta il lotto della prima attivazione (non modificabile)
            form.setValue('lotId', firstActivationOp.lotId);
          }
        }
      }
    }
  }, [watchBasketId, baskets, watchType, form, basketHasActiveCycle, operations]);

  // Calculate average weight and set size when animals per kg changes
  useEffect(() => {
    if (watchAnimalsPerKg && watchAnimalsPerKg > 0) {
      // Calculate average weight
      form.setValue('averageWeight', 1000000 / watchAnimalsPerKg);
      
      // Auto-select size based on animals per kg
      if (sizes && sizes.length > 0) {
        console.log("Cercando taglia per animali per kg:", watchAnimalsPerKg);
        
        // Importa la funzione di utilità che gestisce sia camelCase che snake_case
        import("@/lib/utils").then(({ findSizeByAnimalsPerKg }) => {
          // Utilizza la funzione helper per trovare la taglia
          const selectedSize = findSizeByAnimalsPerKg(watchAnimalsPerKg, sizes);
          
          if (selectedSize) {
            console.log(`Taglia trovata: ${selectedSize.code} (ID: ${selectedSize.id})`);
            form.setValue('sizeId', selectedSize.id);
          } else {
            console.log("Nessuna taglia corrispondente trovata per", watchAnimalsPerKg, "animali per kg");
            form.setValue('sizeId', null); // Resetta il valore della taglia se non ne troviamo una corrispondente
          }
        }).catch(error => {
          console.error("Errore nel caricamento delle funzioni di utilità:", error);
        });
      }
    } else {
      form.setValue('averageWeight', null);
    }
  }, [watchAnimalsPerKg, sizes, form]);
  
  // Calcola il numero di animali quando cambia il peso totale o animali per kg
  useEffect(() => {
    if (watchTotalWeight && watchAnimalsPerKg && watchAnimalsPerKg > 0) {
      // Peso medio in grammi = 1000 / animali per kg
      const avgWeightInGrams = 1000 / watchAnimalsPerKg;
      
      // Numero di animali = peso totale / peso medio di un animale
      const calculatedAnimalCount = Math.round(watchTotalWeight / avgWeightInGrams);
      
      // Imposta il valore calcolato solo se non è attiva la modifica manuale
      if (!watchManualCountAdjustment) {
        form.setValue('animalCount', calculatedAnimalCount);
      }
    }
  }, [watchTotalWeight, watchAnimalsPerKg, form, watchManualCountAdjustment]);

  // Gestisce il tipo "peso" - recupera il conteggio animali dall'ultima operazione
  useEffect(() => {
    const handlePesoOperation = async () => {
      if (watchType === 'peso' && watchBasketId && operations && operations.length > 0) {
        console.log("Operazione PESO selezionata: ricerca conteggio animali dalla precedente operazione");
        
        // Cerca l'ultima operazione per questo cestello/ciclo
        let lastOperation = null;
        
        // Ottieni il cycleId corrente
        const cycleId = form.getValues('cycleId');
        
        // Filtra le operazioni per questo cestello e ciclo
        const basketOperations = operations
          .filter((op: any) => op.basketId === watchBasketId && (!cycleId || op.cycleId === cycleId))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (basketOperations.length > 0) {
          lastOperation = basketOperations[0];
          console.log("Trovata ultima operazione per cestello/ciclo:", lastOperation);
        }
        
        // Se abbiamo un'operazione precedente e il conteggio degli animali
        if (lastOperation && lastOperation.animalCount) {
          console.log(`Impostazione conteggio animali dall'ultima operazione: ${lastOperation.animalCount}`);
          
          // Imposta il conteggio animali uguale a quello dell'ultima operazione
          form.setValue('animalCount', lastOperation.animalCount);
          
          // Assicurati che il form riconosca questo campo come "impostato" manualmente
          toast({
            title: "Conteggio animali preimpostato",
            description: `Utilizzato conteggio di ${lastOperation.animalCount.toLocaleString('it-IT')} animali dall'ultima operazione`,
            duration: 3000
          });
        } else if (prevOperationData && prevOperationData.animalCount) {
          // Se non abbiamo trovato un'operazione ma abbiamo dati precedenti
          console.log(`Fallback: impostazione conteggio animali da prevOperationData: ${prevOperationData.animalCount}`);
          form.setValue('animalCount', prevOperationData.animalCount);
        } else {
          console.warn("Impossibile trovare il conteggio animali dall'ultima operazione");
        }
      }
    };
    
    // Esegui la funzione quando cambia il tipo di operazione o il cestello
    handlePesoOperation();
  }, [watchType, watchBasketId, form, operations, prevOperationData]);

  // Calcola valori derivati per misurazione e prima attivazione
  useEffect(() => {
    if (watchType === 'misura' || watchType === 'prima-attivazione') {
      // Calcola il totale del campione (vivi + morti)
      if (watchLiveAnimals !== null && deadCount !== null) {
        const totalSample = watchLiveAnimals + deadCount;
        form.setValue('totalSample', totalSample);
        
        // Calcola il tasso di mortalità
        if (totalSample > 0) {
          const mortalityRate = (deadCount / totalSample) * 100;
          form.setValue('mortalityRate', mortalityRate);
        }
      }
      
      // Calcola animali per kg dal campione
      if (watchSampleWeight && watchSampleWeight > 0 && watchLiveAnimals && watchLiveAnimals > 0) {
        const animalsPerKg = Math.round((watchLiveAnimals / watchSampleWeight) * 1000);
        if (!isNaN(animalsPerKg) && isFinite(animalsPerKg)) {
          form.setValue('animalsPerKg', animalsPerKg);
        }
      }
    }
  }, [watchType, watchLiveAnimals, deadCount, watchSampleWeight, form]);

  // Funzione di submit del form
  const handleSubmit = async (values: z.infer<typeof operationSchema>) => {
    try {
      console.log('Form values:', values);
      
      // Validazione aggiuntiva per campi obbligatori basati sul tipo
      if (values.type !== 'prima-attivazione' && !values.cycleId) {
        console.error('Campo cycleId mancante per operazione diversa da prima-attivazione');
        toast({
          title: "Errore di validazione",
          description: "Seleziona un ciclo valido per questo tipo di operazione.",
          variant: "destructive",
        });
        return;
      }
      
      // Verifica se lotId è richiesto per Prima Attivazione
      if (values.type === 'prima-attivazione' && !values.lotId) {
        console.error('Campo lotId mancante per operazione di Prima Attivazione');
        toast({
          title: "Lotto mancante",
          description: "Seleziona un lotto per l'operazione di Prima Attivazione.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Chiamata onSubmit con i valori finali:', values);
      // Chiama la funzione onSubmit passata come prop
      onSubmit(values);
    } catch (error) {
      console.error('Errore durante il submit del form:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio del form.",
        variant: "destructive",
      });
    }
  };
  
  // Gestione del submit manuale del form
  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("FORM SUBMIT MANUALE ATTIVATO");
    
    // Verifica se c'è un errore di operazione sulla stessa data, ma consenti di procedere con conferma
    if (operationDateError) {
      console.warn("Potenziale problema con operazione sulla stessa data:", operationDateError);
      const confirmProceed = window.confirm(
        "Esiste già un'operazione registrata oggi per questo cestello. Vuoi comunque procedere con il salvataggio?"
      );
      if (!confirmProceed) {
        return;
      }
    }
    
    // Ottieni i valori dal form
    const values = form.getValues();
    console.log("Valori form:", values);
    
    // Verifica campi obbligatori
    if (!values.basketId || !values.flupsyId || !values.type || !values.date) {
      console.error("Mancano campi obbligatori", { 
        basketId: values.basketId, 
        flupsyId: values.flupsyId, 
        type: values.type, 
        date: values.date 
      });
      toast({
        title: "Campi mancanti",
        description: "Compila tutti i campi obbligatori: FLUPSY, Cestello, Tipo operazione e Data.",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica lotto per prima-attivazione
    if (values.type === 'prima-attivazione' && !values.lotId) {
      console.error("Manca il lotto per operazione di Prima Attivazione");
      toast({
        title: "Lotto mancante",
        description: "Seleziona un lotto per procedere con la prima attivazione del cestello.",
        variant: "destructive",
      });
      return;
    }
    
    // Formatta i valori
    const formattedValues = {
      ...values,
      date: values.date instanceof Date ? values.date : new Date(values.date),
      animalCount: values.animalCount ? Number(values.animalCount) : null,
      animalsPerKg: values.animalsPerKg ? Number(values.animalsPerKg) : null,
      totalWeight: values.totalWeight ? Number(values.totalWeight) : null,
      sampleWeight: values.sampleWeight ? Number(values.sampleWeight) : null,
      liveAnimals: values.liveAnimals ? Number(values.liveAnimals) : null,
      deadCount: values.deadCount ? Number(values.deadCount) : 0,
      totalSample: values.totalSample ? Number(values.totalSample) : null,
      mortalityRate: values.mortalityRate ? Number(values.mortalityRate) : null,
      notes: values.notes || null
    };
    
    // Gestione speciale per operazione di misurazione con mortalità
    if (values.type === 'misura' && values.deadCount && values.deadCount > 0 && prevOperationData) {
      console.log("Misurazione con mortalità > 0: verrà calcolato un nuovo conteggio animali");
      setPendingValues(formattedValues);
      setShowConfirmDialog(true);
      return;
    } else if (values.type === 'misura' && (!values.deadCount || values.deadCount === 0) && prevOperationData) {
      // Senza mortalità: mantiene il conteggio animali precedente (se disponibile)
      if (prevOperationData?.animalCount && (!formattedValues.animalCount || Number(formattedValues.animalCount) !== prevOperationData.animalCount)) {
        console.log("Misurazione senza mortalità: mantenuto conteggio animali precedente:", prevOperationData.animalCount);
        // Aggiorna il conteggio animali con quello precedente
        formattedValues.animalCount = prevOperationData.animalCount;
        toast({
          title: "Conteggio animali mantenuto",
          description: "Senza mortalità, il numero di animali è stato mantenuto invariato.",
          duration: 4000
        });
      }
    }
    
    // Chiamata diretta alla funzione di submit per gli altri casi
    if (onSubmit) {
      console.log("Chiamata onSubmit con:", formattedValues);
      onSubmit(formattedValues);
      
      // Refresh ultra-ottimizzato: aggiorna solo ciò che è necessario
      setTimeout(async () => {
        try {
          // Reset immediato del form per reattività
          form.reset();
          
          // Mostra notifica immediata
          toast({
            title: "Operazione registrata",
            description: "L'operazione è stata salvata con successo.",
            variant: "default",
          });
          
          // Invalida solo le operazioni (più veloce)
          queryClient.invalidateQueries({ 
            queryKey: ['/api/operations-optimized'],
            exact: false,
            refetchType: 'active'
          });
          
        } catch (error) {
          console.error("Errore durante l'aggiornamento:", error);
        }
      }, 200); // Ulteriormente ridotto per maggiore reattività
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmitForm}>
        {/* Layout ottimizzato per evitare scrolling verticale */}
        <div className="grid grid-cols-12 gap-4">
          {/* COLONNA SINISTRA: Informazioni Generali e Identificazione */}
          <div className="col-span-12 md:col-span-6 space-y-3">
            {/* Sezione Operazione */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 flex items-center">
                <ClipboardList className="h-4 w-4 mr-1" /> Dati Operazione
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Tipo operazione */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-xs font-medium">Tipo operazione <span className="text-red-500">*</span></FormLabel>
                      <Select
                        disabled={!watchBasketId || isLoading}
                        value={field.value || ''}
                        onValueChange={(value) => {
                          field.onChange(value);
                          console.log("Operazione selezionata:", value);
                          // Reset campi specifici in base al tipo di operazione
                          if (value === 'prima-attivazione') {
                            form.setValue('cycleId', null);
                          } else if (value === 'peso') {
                            // Per il tipo 'peso', resettiamo solo il peso totale e gli animali per kg
                            // ma MANTENIAMO il numero di animali dall'operazione precedente
                            form.setValue('totalWeight', null);
                            form.setValue('animalsPerKg', null);
                            // NON resettiamo il sizeId, sarà ricalcolato automaticamente
                            // form.setValue('sizeId', null);
                          } else if (value === 'misura') {
                            form.setValue('sampleWeight', null);
                            form.setValue('liveAnimals', null);
                            form.setValue('deadCount', null);
                            form.setValue('totalSample', null);
                            form.setValue('mortalityRate', null);
                            form.setValue('totalWeight', null);
                            form.setValue('animalsPerKg', null);
                            form.setValue('sizeId', null);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={
                              !watchBasketId ? "Seleziona primo un cestello" : "Seleziona tipo"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {basketOperations.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-xs font-medium">Data <span className="text-red-500">*</span></FormLabel>
                      <DatePicker
                        date={field.value as Date}
                        setDate={(date) => {
                          field.onChange(date);
                          // Verifica operazioni esistenti nella stessa data
                          if (watchBasketId && date) {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const existingOp = basketOperations.length > 0 && operations?.find((op: any) => 
                              op.basketId === watchBasketId && 
                              op.date.toString().substring(0, 10) === dateStr
                            );
                            
                            if (existingOp) {
                              setOperationDateError(`Attenzione: esiste già un'operazione di tipo "${existingOp.type}" per questa data`);
                            } else {
                              setOperationDateError(null);
                            }
                          }
                        }}
                        disabled={isLoading}
                      />
                      <FormMessage />
                      {operationDateError && (
                        <div className="text-yellow-600 text-xs mt-0.5">
                          <AlertTriangle className="h-3 w-3 inline-block mr-1" />
                          {operationDateError}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sezione Posizionamento */}
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="text-sm font-semibold mb-3 text-blue-700 flex items-center">
                <MapPin className="h-4 w-4 mr-1" /> Posizionamento
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {/* FLUPSY selection */}
                <FormField
                  control={form.control}
                  name="flupsyId"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-xs font-medium">FLUPSY <span className="text-red-500">*</span></FormLabel>
                      <Select
                        disabled={isLoading}
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => {
                          const flupsyId = Number(value);
                          field.onChange(flupsyId);
                          form.setValue('basketId', null);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleziona FLUPSY" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flupsys?.length ? flupsys.map((flupsy: any) => (
                            <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                              {flupsy.name}
                            </SelectItem>
                          )) : (
                            <SelectItem value="loading" disabled>
                              Caricamento FLUPSY...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {/* Mini-mappa occupazione FLUPSY */}
                      {watchFlupsyId && flupsyBaskets.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                          <div className="text-xs font-medium text-gray-600 mb-1">Occupazione FLUPSY:</div>
                          <FlupsyMiniMapOptimized 
                            flupsyId={parseInt(watchFlupsyId)}
                            maxPositions={(() => {
                              const selectedFlupsy = flupsys?.find((f: any) => f.id === parseInt(watchFlupsyId));
                              return selectedFlupsy?.maxPositions || 10;
                            })()}
                            showLegend={false}
                            onPositionClick={(row, position) => {
                              if (row === '' && position === 0) {
                                // Deseleziona
                                form.setValue('basketId', null);
                              } else {
                                // Trova il cestello in quella posizione
                                const basket = flupsyBaskets.find((b: any) => 
                                  b.row === row && b.position === position
                                );
                                if (basket) {
                                  form.setValue('basketId', basket.id);
                                }
                              }
                            }}
                            selectedRow={(() => {
                              const selectedBasket = flupsyBaskets.find((b: any) => b.id === watchBasketId);
                              return selectedBasket?.row || null;
                            })()}
                            selectedPosition={(() => {
                              const selectedBasket = flupsyBaskets.find((b: any) => b.id === watchBasketId);
                              return selectedBasket?.position || null;
                            })()}
                          />
                        </div>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Basket selection */}
                <FormField
                  control={form.control}
                  name="basketId"
                  render={({ field }) => (
                    <FormItem className="mb-1">
                      <FormLabel className="text-xs font-medium">Cestello <span className="text-red-500">*</span></FormLabel>
                      <Select
                        disabled={!watchFlupsyId || isLoading || flupsyBaskets.length === 0}
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => {
                          const basketId = Number(value);
                          field.onChange(basketId);
                          
                          // Trova cestello selezionato e imposta ciclo
                          const selectedBasket = baskets?.find((b: any) => b.id === basketId);
                          console.log("Cestello selezionato:", selectedBasket);
                          
                          if (selectedBasket) {
                            if (selectedBasket.currentCycleId) {
                              console.log("Cestello con ciclo attivo:", selectedBasket.currentCycleId);
                              form.setValue('cycleId', selectedBasket.currentCycleId);
                            } else {
                              console.log("Cestello senza ciclo attivo");
                              form.setValue('cycleId', null);
                              
                              // 🚀 AUTO-IMPOSTAZIONE: Se il cestello è disponibile, imposta automaticamente "Prima Attivazione"
                              if (selectedBasket.state === 'available') {
                                console.log("🚀 CESTELLO DISPONIBILE - Auto-impostazione Prima Attivazione");
                                form.setValue('type', 'prima-attivazione');
                                console.log("✅ Tipo operazione impostato automaticamente a 'Prima Attivazione'");
                              }
                            }
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="min-h-[84px] text-sm py-2">
                            <SelectValue>
                              {watchBasketId ? (
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="font-semibold">
                                    {(() => {
                                      const selectedBasket = baskets?.find((b: any) => b.id === watchBasketId);
                                      if (!selectedBasket) return "Cestello selezionato";
                                      
                                      return (
                                        <>
                                          #{selectedBasket.physicalNumber} 
                                          {selectedBasket.row && selectedBasket.position ? 
                                            `(${selectedBasket.row}-${selectedBasket.position})` : ''}
                                          {selectedBasket.state === 'active' ? ' ✅' : ''}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-xs flex flex-wrap items-center gap-1 mt-0.5">
                                    {(() => {
                                      const selectedBasket = baskets?.find((b: any) => b.id === watchBasketId);
                                      if (!selectedBasket) return null;
                                      
                                      // Se il cestello è attivo, cerca informazioni dall'ultima operazione
                                      if (selectedBasket.state === 'active' && operations && operations.length > 0) {
                                        // Trova l'ultima operazione per questo cestello
                                        const basketOperations = operations.filter((op: any) => 
                                          op.basketId === selectedBasket.id && 
                                          op.cycleId === selectedBasket.currentCycleId
                                        ).sort((a: any, b: any) => 
                                          new Date(b.date).getTime() - new Date(a.date).getTime()
                                        );
                                        
                                        const lastOperation = basketOperations[0];
                                        
                                        if (lastOperation) {
                                          // Trova la taglia dall'ultima operazione
                                          const operationSize = sizes?.find((s: any) => s.id === lastOperation.sizeId);
                                          
                                          return (
                                            <div className="flex flex-col gap-1 w-full">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium text-green-700">
                                                  {lastOperation.animalCount ? 
                                                    `${lastOperation.animalCount.toLocaleString('it-IT')} animali` : 
                                                    "N° animali non disponibile"}
                                                </span>
                                                
                                                {operationSize?.code ? 
                                                  <span className="px-1.5 py-0.5 rounded-md text-xs font-medium" style={{
                                                    backgroundColor: operationSize.color || '#6b7280',
                                                    color: '#fff'
                                                  }}>{operationSize.code}</span> : null}
                                              </div>
                                              
                                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                                {lastOperation.totalWeight && (
                                                  <span className="font-medium">
                                                    {lastOperation.totalWeight.toLocaleString('it-IT')}g peso totale
                                                  </span>
                                                )}
                                                
                                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
                                                  {lastOperation.type === 'prima-attivazione' ? 'Prima Attivazione' :
                                                   lastOperation.type === 'misura' ? 'Misura' :
                                                   lastOperation.type === 'peso' ? 'Peso' :
                                                   lastOperation.type === 'vendita' ? 'Vendita' :
                                                   lastOperation.type}
                                                </span>
                                              </div>
                                              
                                              <div className="text-muted-foreground">
                                                Ciclo: {selectedBasket.cycleCode} • Ultima op: {format(new Date(lastOperation.date), 'dd/MM/yyyy')}
                                              </div>
                                            </div>
                                          );
                                        }
                                      }
                                      
                                      // Fallback per cestelli senza operazioni
                                      return (
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-500">
                                              {selectedBasket.state === 'available' ? 
                                                "Cestello disponibile" : 
                                                "N° animali non disponibile"}
                                            </span>
                                          </div>
                                          
                                          {selectedBasket.state === 'active' && (
                                            <div className="text-muted-foreground">
                                              Ciclo: {selectedBasket.cycleCode} • Nessuna operazione trovata
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <span>
                                  {watchFlupsyId ? 
                                    (flupsyBaskets.length > 0 ? "Seleziona cestello" : "Nessun cestello") : 
                                    "Seleziona prima FLUPSY"}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flupsyBaskets.length > 0 ? (
                            flupsyBaskets.map((basket) => {
                              // Trova l'ultima operazione per questo cestello dalle operazioni caricate
                              const basketOperations = operations?.filter((op: any) => 
                                op.basketId === basket.id && 
                                op.cycleId === basket.currentCycleId
                              ).sort((a: any, b: any) => 
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                              ) || [];
                              
                              const lastOperation = basketOperations[0];
                              
                              // Trova la taglia dall'ultima operazione
                              const operationSize = lastOperation ? 
                                sizes?.find((s: any) => s.id === lastOperation.sizeId) : null;
                              
                              return (
                                <SelectItem key={basket.id} value={basket.id.toString()} className={`py-3 px-3 ${basket.state === 'active' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-gray-50 border-l-4 border-orange-400'}`}>
                                  <div className="flex flex-col gap-1 w-full">
                                    <div className="font-semibold flex items-center gap-2">
                                      {basket.state === 'active' ? (
                                        <span className="text-green-600 text-lg">🟢</span>
                                      ) : (
                                        <span className="text-orange-500 text-lg">⚪</span>
                                      )}
                                      #{basket.physicalNumber} {basket.row && basket.position ? `(${basket.row}-${basket.position})` : ''} 
                                      {basket.state === 'active' ? (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">ATTIVO</span>
                                      ) : (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">DISPONIBILE</span>
                                      )}
                                    </div>
                                    
                                    {basket.state === 'active' && lastOperation ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="font-medium text-green-700">
                                            {lastOperation.animalCount ? 
                                              `${lastOperation.animalCount.toLocaleString('it-IT')} animali` : 
                                              "N° animali non disponibile"}
                                          </span>
                                          
                                          {operationSize?.code && (
                                            <span className="px-1.5 py-0.5 rounded-md text-xs font-medium" style={{
                                              backgroundColor: operationSize.color || '#6b7280',
                                              color: '#fff'
                                            }}>
                                              {operationSize.code}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-xs text-blue-600">
                                          {lastOperation.totalWeight && (
                                            <span className="font-medium">
                                              {lastOperation.totalWeight.toLocaleString('it-IT')}g peso totale
                                            </span>
                                          )}
                                          
                                          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
                                            Ultima: {lastOperation.type === 'prima-attivazione' ? 'Prima Attivazione' :
                                             lastOperation.type === 'misura' ? 'Misura' :
                                             lastOperation.type === 'peso' ? 'Peso' :
                                             lastOperation.type === 'vendita' ? 'Vendita' :
                                             lastOperation.type}
                                          </span>
                                        </div>
                                        
                                        <div className="text-xs text-gray-600">
                                          Ciclo attivo dal: {format(new Date(lastOperation.date), 'dd/MM/yyyy', { locale: it })}
                                        </div>
                                      </div>
                                    ) : basket.state === 'available' ? (
                                      <div className="text-xs text-orange-600 font-medium">
                                        Pronto per nuova prima attivazione
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">
                                        N° animali non disponibile
                                      </div>
                                    )}
                                    
                                    {basket.state === 'active' && (
                                      <div className="text-xs text-muted-foreground">
                                        Ciclo: {basket.cycleCode}
                                        {lastOperation && ` • Ultima op: ${format(new Date(lastOperation.date), 'dd/MM/yyyy')}`}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="empty" disabled>
                              {watchFlupsyId ? "Nessun cestello" : "Seleziona FLUPSY"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cycle display (condizionale) */}
                {watchType && watchType !== 'prima-attivazione' && (
                  <FormField
                    control={form.control}
                    name="cycleId"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Ciclo <span className="text-red-500">*</span></FormLabel>
                        <Select
                          disabled={true} // Selected automatically
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Seleziona ciclo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cycles?.filter((c: any) => c.basketId === watchBasketId).map((cycle: any) => (
                              <SelectItem key={cycle.id} value={cycle.id.toString()}>
                                #{cycle.id} - Inizio: {format(new Date(cycle.startDate), 'dd/MM/yyyy')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Selezionato automaticamente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Sezione Riferimenti */}
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <h3 className="text-sm font-semibold mb-3 text-green-700 flex items-center">
                <Link className="h-4 w-4 mr-1" /> Riferimenti
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Lotto (obbligatorio per tutte le operazioni) */}
                {watchType && (
                  <FormField
                    control={form.control}
                    name="lotId"
                    render={({ field }) => {
                      const selectedBasket = baskets?.find(b => b.id === watchBasketId);
                      const isActiveWithCycle = selectedBasket && (selectedBasket.state === 'active' || basketHasActiveCycle);
                      const isLotFromFirstActivation = watchType !== 'prima-attivazione' && isActiveWithCycle;
                      
                      return (
                        <FormItem className="mb-1">
                          <FormLabel className="text-xs font-medium">Lotto <span className="text-red-500">*</span></FormLabel>
                          <Select
                            disabled={isLoading || isLotFromFirstActivation}
                            value={field.value?.toString() || ''}
                            onValueChange={(value) => field.onChange(Number(value))}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Seleziona lotto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lots?.slice().sort((a: any, b: any) => b.id - a.id).map((lot: any) => (
                                <SelectItem key={lot.id} value={lot.id.toString()}>
                                  #{lot.id} - {lot.supplier} ({format(new Date(lot.arrivalDate), 'dd/MM/yyyy')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLotFromFirstActivation && (
                            <FormDescription className="text-xs text-blue-600">
                              Lotto ereditato dalla Prima Attivazione (non modificabile)
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* SGR Rate (calcolato automaticamente per operazioni su cicli attivi) */}
                {watchType && watchType !== 'prima-attivazione' && watchType !== 'cessazione' && (
                  <FormField
                    control={form.control}
                    name="sgrId"
                    render={({ field }) => {
                      // Calcola l'SGR automaticamente per operazioni su cicli attivi
                      const calculatedSGR = useMemo(() => {
                        const selectedBasket = baskets?.find(b => b.id === watchBasketId);
                        const isActiveWithCycle = selectedBasket && (selectedBasket.state === 'active' || basketHasActiveCycle);
                        
                        if (!isActiveWithCycle || !operations || !watchAnimalsPerKg) return null;
                        
                        // Trova l'operazione di prima attivazione per questo cestello
                        const firstActivationOp = operations.find((op: any) => 
                          op.basketId === watchBasketId && 
                          op.type === 'prima-attivazione'
                        );
                        
                        if (!firstActivationOp || !firstActivationOp.averageWeight) return null;
                        
                        // Calcola i giorni trascorsi
                        const currentDate = new Date(form.getValues('date') || new Date());
                        const firstActivationDate = new Date(firstActivationOp.date);
                        const daysDiff = Math.max(1, Math.floor((currentDate.getTime() - firstActivationDate.getTime()) / (1000 * 3600 * 24)));
                        
                        // Calcola il peso medio attuale
                        const currentAvgWeight = watchAnimalsPerKg ? 1000 / watchAnimalsPerKg : 0;
                        const initialAvgWeight = firstActivationOp.averageWeight;
                        
                        if (currentAvgWeight <= initialAvgWeight) return null;
                        
                        // Formula SGR: ((Peso finale / Peso iniziale)^(1/giorni) - 1) * 100
                        const sgrDaily = (Math.pow(currentAvgWeight / initialAvgWeight, 1 / daysDiff) - 1) * 100;
                        
                        console.log('🧮 Calcolo SGR automatico:', {
                          initialWeight: initialAvgWeight,
                          currentWeight: currentAvgWeight,
                          days: daysDiff,
                          sgrDaily: sgrDaily.toFixed(3)
                        });
                        
                        return {
                          value: sgrDaily,
                          display: `${sgrDaily.toFixed(2)}% (calcolato)`
                        };
                      }, [baskets, watchBasketId, basketHasActiveCycle, operations, watchAnimalsPerKg, form]);
                      
                      return (
                        <FormItem className="mb-1">
                          <FormLabel className="text-xs font-medium">Tasso SGR</FormLabel>
                          {calculatedSGR ? (
                            <div className="h-8 px-3 py-2 border border-input bg-gray-50 rounded-md text-sm flex items-center">
                              <span className="text-green-700 font-medium">{calculatedSGR.display}</span>
                            </div>
                          ) : (
                            <Select
                              disabled={isLoading || !sgrs || sgrs.length === 0}
                              value={field.value?.toString() || ''}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Seleziona tasso SGR" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sgrs?.length > 0 ? sgrs.map((sgr: any) => (
                                  <SelectItem key={sgr.id} value={sgr.id.toString()}>
                                    {sgr.month} ({sgr.percentage}% giornaliero)
                                  </SelectItem>
                                )) : (
                                  <SelectItem value="loading" disabled>
                                    Caricamento SGR...
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                          {calculatedSGR && (
                            <FormDescription className="text-xs text-green-600">
                              SGR calcolato automaticamente dal confronto con la Prima Attivazione
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {/* Size selection (condizionale) */}
                {(watchType === 'prima-attivazione') && (
                  <FormField
                    control={form.control}
                    name="sizeId"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Taglia <span className="text-amber-600">(calcolata automaticamente)</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            className="h-8 text-sm bg-amber-50"
                            readOnly
                            value={(() => {
                              if (!field.value || !sizes) return '';
                              const size = sizes.find(s => s.id === field.value);
                              return size ? `${size.code} (${size.minAnimalsPerKg?.toLocaleString('it-IT')}-${size.maxAnimalsPerKg?.toLocaleString('it-IT')} animali/kg)` : '';
                            })()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </div>

          {/* COLONNA DESTRA: Dati specifici per tipo di operazione */}
          <div className="col-span-12 md:col-span-6 space-y-3">
            {/* Sezione Peso */}
            {watchType === 'peso' && (
              <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                <h3 className="text-sm font-semibold mb-3 text-amber-700 flex items-center">
                  <Scale className="h-4 w-4 mr-1" /> Dati Peso
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {/* Total Weight - UNICO CAMPO RICHIESTO PER OPERAZIONE PESO */}
                  <FormField
                    control={form.control}
                    name="totalWeight"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Peso totale (grammi) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Inserisci peso totale"
                            className="h-8 text-sm"
                            value={field.value === null || field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              if (value === '') {
                                field.onChange(null);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue <= 1000000) {
                                  field.onChange(numValue);
                                  
                                  // Se è un'operazione di tipo peso e abbiamo un conteggio animali,
                                  // calcoliamo automaticamente gli animali per kg
                                  const animalCount = form.getValues('animalCount');
                                  if (animalCount && numValue > 0) {
                                    // Calcolo animali per kg = (animalCount * 1000) / pesoTotale
                                    const calculatedAnimalsPerKg = Math.round((animalCount * 1000) / numValue);
                                    form.setValue('animalsPerKg', calculatedAnimalsPerKg);
                                  }
                                }
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Il conteggio degli animali rimane invariato rispetto all'ultima operazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Animals per kg - CAMPO CALCOLATO NON MODIFICABILE */}
                  <FormField
                    control={form.control}
                    name="animalsPerKg"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Animali per kg (calcolato)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Calcolato automaticamente"
                            className="h-8 text-sm bg-amber-50"
                            readOnly
                            value={field.value === null || field.value === undefined ? '' : field.value.toLocaleString('it-IT')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valori calcolati */}
                  <div className="bg-amber-100 p-3 rounded-md mt-2">
                    <h4 className="text-xs font-medium text-amber-800 mb-2">Valori calcolati</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Animal Count */}
                      <FormField
                        control={form.control}
                        name="animalCount"
                        render={({ field }) => (
                          <FormItem className="mb-1">
                            <FormLabel className="text-xs font-medium">Numero animali</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="Numero animali"
                                className="h-8 text-sm bg-amber-50"
                                readOnly
                                value={field.value === null || field.value === undefined 
                                  ? '' 
                                  : field.value.toLocaleString('it-IT')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Average Weight */}
                      {watchAnimalsPerKg > 0 && (
                        <FormField
                          control={form.control}
                          name="averageWeight"
                          render={({ field }) => (
                            <FormItem className="mb-1">
                              <FormLabel className="text-xs font-medium">Peso medio (mg)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  className="h-8 text-sm bg-amber-50"
                                  readOnly
                                  value={field.value === null || field.value === undefined 
                                    ? '' 
                                    : field.value.toLocaleString('it-IT', {
                                        minimumFractionDigits: 3,
                                        maximumFractionDigits: 3
                                      })}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Size based on animals per kg */}
                      {watchAnimalsPerKg > 0 && sizes && sizes.length > 0 && (
                        <FormField
                          control={form.control}
                          name="sizeId"
                          render={() => (
                            <FormItem className="col-span-2 mb-1">
                              <FormLabel className="text-xs font-medium">Taglia calcolata</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text" 
                                  className="h-8 text-sm bg-amber-50"
                                  readOnly
                                  value={(() => {
                                    // Trova la taglia in base al valore di animalsPerKg
                                    const size = sizes.find(s => 
                                      s.minAnimalsPerKg <= watchAnimalsPerKg && 
                                      s.maxAnimalsPerKg >= watchAnimalsPerKg
                                    );
                                    
                                    if (size) {
                                      // Imposta automaticamente il sizeId
                                      if (form.getValues('sizeId') !== size.id) {
                                        form.setValue('sizeId', size.id);
                                      }
                                      return `${size.name} (${size.minAnimalsPerKg.toLocaleString('it-IT')}-${size.maxAnimalsPerKg.toLocaleString('it-IT')} animali/kg)`;
                                    } else {
                                      return 'Nessuna taglia corrispondente';
                                    }
                                  })()}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sezione Misurazione - abilitata per 'misura' e 'prima-attivazione' */}
            {(watchType === 'misura' || watchType === 'prima-attivazione') && (
              <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                <h3 className="text-sm font-semibold mb-3 text-purple-700 flex items-center">
                  <Ruler className="h-4 w-4 mr-1" /> Dati Misurazione
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Sample Weight */}
                  <FormField
                    control={form.control}
                    name="sampleWeight"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Grammi sample</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Peso in grammi"
                            className="h-8 text-sm"
                            value={field.value === null || field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(null);
                              } else {
                                const numValue = parseFloat(value);
                                field.onChange(isNaN(numValue) ? null : numValue);
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Live Animals */}
                  <FormField
                    control={form.control}
                    name="liveAnimals"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Numero animali vivi</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Animali vivi"
                            className="h-8 text-sm"
                            value={field.value === null || field.value === undefined 
                              ? '' 
                              : field.value.toLocaleString('it-IT')}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value === '') {
                                field.onChange(null);
                              } else {
                                const numValue = parseInt(value, 10);
                                field.onChange(isNaN(numValue) ? null : numValue);
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Dead Count */}
                  <FormField
                    control={form.control}
                    name="deadCount"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Numero animali morti</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Animali morti"
                            className="h-8 text-sm"
                            value={field.value === null || field.value === undefined 
                              ? '' 
                              : field.value.toLocaleString('it-IT')}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value === '') {
                                field.onChange(0);
                              } else {
                                const numValue = parseInt(value, 10);
                                field.onChange(isNaN(numValue) ? 0 : numValue);
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Total Sample */}
                  {watchLiveAnimals !== null && (deadCount !== null || deadCount === 0) && (
                    <FormField
                      control={form.control}
                      name="totalSample"
                      render={({ field }) => (
                        <FormItem className="mb-1">
                          <FormLabel className="text-xs font-medium">Totale animali campione</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              className="h-8 text-sm bg-purple-100"
                              readOnly
                              value={field.value === null || field.value === undefined 
                                ? '' 
                                : field.value.toLocaleString('it-IT')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {/* Peso totale misurazione */}
                <div className="mt-3">
                  <FormField
                    control={form.control}
                    name="totalWeight"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Peso totale (grammi)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Peso totale cestello"
                            className="h-8 text-sm"
                            value={field.value === null || field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '');
                              if (value === '') {
                                field.onChange(null);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue <= 1000000) {
                                  field.onChange(numValue);
                                }
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Valori calcolati misurazione */}
                <div className="bg-purple-100 p-3 rounded-md mt-3">
                  <h4 className="text-xs font-medium text-purple-800 mb-2">Valori calcolati</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Mortality Rate */}
                    {watchTotalSample > 0 && (
                      <FormField
                        control={form.control}
                        name="mortalityRate"
                        render={({ field }) => (
                          <FormItem className="mb-1">
                            <FormLabel className="text-xs font-medium">Mortalità (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                className="h-8 text-sm bg-purple-50"
                                readOnly
                                value={field.value === null || field.value === undefined 
                                  ? '' 
                                  : field.value.toLocaleString('it-IT', { 
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Animals per kg per misura */}
                    {watchSampleWeight > 0 && watchLiveAnimals > 0 && (
                      <FormField
                        control={form.control}
                        name="animalsPerKg"
                        render={({ field }) => (
                          <FormItem className="mb-1">
                            <FormLabel className="text-xs font-medium">Animali per kg</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                className="h-8 text-sm bg-purple-50"
                                readOnly
                                value={field.value === null || field.value === undefined 
                                  ? '' 
                                  : field.value.toLocaleString('it-IT')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Size based on animals per kg per misura e prima-attivazione */}
                    {watchAnimalsPerKg > 0 && sizes && sizes.length > 0 && (watchType === 'misura' || watchType === 'prima-attivazione') && (
                      <div className="col-span-2 mb-1">
                        <div className="text-xs font-medium mb-1">Taglia calcolata</div>
                        <Input 
                          type="text" 
                          className="h-8 text-sm bg-purple-50"
                          readOnly
                          value={(() => {
                            // Trova la taglia in base al valore di animalsPerKg
                            const size = sizes.find(s => 
                              s.minAnimalsPerKg <= watchAnimalsPerKg && 
                              s.maxAnimalsPerKg >= watchAnimalsPerKg
                            );
                            
                            if (size) {
                              // Imposta automaticamente il sizeId
                              if (form.getValues('sizeId') !== size.id) {
                                form.setValue('sizeId', size.id);
                              }
                              return `${size.name} (${size.minAnimalsPerKg.toLocaleString('it-IT')}-${size.maxAnimalsPerKg.toLocaleString('it-IT')} animali/kg)`;
                            } else {
                              return 'Nessuna taglia corrispondente';
                            }
                          })()}
                        />
                      </div>
                    )}
                    
                    {/* Average weight */}
                    {watchAnimalsPerKg > 0 && (
                      <FormField
                        control={form.control}
                        name="averageWeight"
                        render={({ field }) => (
                          <FormItem className="mb-1">
                            <FormLabel className="text-xs font-medium">Peso medio (mg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                className="h-8 text-sm bg-purple-50"
                                readOnly
                                value={field.value === null || field.value === undefined 
                                  ? '' 
                                  : field.value.toLocaleString('it-IT', {
                                      minimumFractionDigits: 3,
                                      maximumFractionDigits: 3
                                    })}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Animal Count */}
                    <FormField
                      control={form.control}
                      name="animalCount"
                      render={({ field }) => (
                        <FormItem className="mb-1">
                          <FormLabel className="text-xs font-medium">Numero animali</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              className={`h-8 text-sm ${!watchManualCountAdjustment ? 'bg-purple-50' : ''}`}
                              readOnly={!watchManualCountAdjustment}
                              value={field.value === null || field.value === undefined 
                                ? '' 
                                : field.value.toLocaleString('it-IT')}
                              onChange={(e) => {
                                if (watchManualCountAdjustment) {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  if (value === '') {
                                    field.onChange(null);
                                  } else {
                                    const numValue = parseInt(value, 10);
                                    field.onChange(isNaN(numValue) ? null : numValue);
                                  }
                                }
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          
                          <div className="flex items-center space-x-1 mt-1">
                            <FormControl>
                              <Checkbox 
                                id="manualCountAdjustment"
                                checked={watchManualCountAdjustment}
                                onCheckedChange={(checked) => {
                                  form.setValue('manualCountAdjustment', !!checked);
                                }}
                              />
                            </FormControl>
                            <label 
                              htmlFor="manualCountAdjustment" 
                              className="text-xs cursor-pointer"
                            >
                              Modifica manuale
                            </label>
                          </div>
                          
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note e pulsanti (mostrati sempre) */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Inserisci eventuali note sull'operazione..."
                        className="resize-none h-20 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Form buttons */}
              <div className="flex gap-3 justify-end mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  size="sm"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !watchBasketId || !watchFlupsyId || !watchType || !watchDate || !watchLotId}
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    "Registra operazione"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation dialog for mortality adjustment */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma conteggio animali</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValues && (
                <div className="space-y-4">
                  <p>È stata rilevata una mortalità di <span className="font-semibold">{pendingValues.deadCount}</span> su <span className="font-semibold">{pendingValues.totalSample}</span> animali nel campione ({pendingValues.mortalityRate?.toFixed(2)}%).</p>
                  
                  <p>Basandosi sull'ultima operazione registrata, il conteggio animali verrà aggiornato da <span className="font-semibold">{prevOperationData?.animalCount?.toLocaleString('it-IT') || 'N/A'}</span> a <span className="font-semibold">{(pendingValues.animalCount)?.toLocaleString('it-IT')}</span>.</p>
                  
                  <p>Vuoi procedere con questo aggiornamento?</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowConfirmDialog(false);
                if (pendingValues && onSubmit) {
                  onSubmit(pendingValues);
                }
              }}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}