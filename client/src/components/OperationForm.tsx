import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocketMessage } from "@/lib/websocket";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { operationSchema } from "@shared/schema";

// Schema esteso per includere il campo FLUPSY e i nuovi campi standardizzati
const formSchemaWithFlupsy = operationSchema.extend({
  // Override della data per assicurarci che funzioni correttamente con il form
  date: z.coerce.date(),
  animalsPerKg: z.coerce.number().optional().nullable(),
  totalWeight: z.coerce.number().optional().nullable(),
  animalCount: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  // Aggiunto campo FLUPSY per la selezione in due fasi
  flupsyId: z.number().nullable().optional(),
  // Nuovi campi standardizzati per tutte le operazioni
  sampleWeight: z.coerce.number().optional().nullable(), // Grammi sample
  liveAnimals: z.coerce.number().optional().nullable(), // Numero animali vivi
  deadCount: z.coerce.number().optional().nullable(), // Numero animali morti (già esistente nello schema)
  totalSample: z.coerce.number().optional().nullable(), // Totale sample (vivi + morti)
  manualCountAdjustment: z.boolean().optional().default(false), // Flag per abilitare la modifica manuale del conteggio
  // Il campo cycleId è condizionalmente richiesto a seconda del tipo di operazione
  cycleId: z.number().nullable().optional().superRefine((val, ctx) => {
    // Otteniamo il tipo di operazione dalle data dell'oggetto ctx
    // @ts-ignore - Ignoriamo l'errore TS perché sappiamo che data esiste e contiene type
    const operationType = ctx.data?.type;
    
    // Se l'operazione è di tipo 'prima-attivazione', il ciclo non è richiesto
    if (operationType === 'prima-attivazione') {
      return; // Nessun errore, il campo può essere nullo o undefined
    }
    
    // Per tutti gli altri tipi di operazione, verifichiamo che ci sia un ciclo selezionato
    if (val === null || val === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona un ciclo",
      });
    }
  }),
  // Il campo lotId è condizionalmente richiesto per le operazioni di prima attivazione
  lotId: z.number().nullable().optional().superRefine((val, ctx) => {
    // Otteniamo il tipo di operazione dalle data dell'oggetto ctx
    // @ts-ignore - Ignoriamo l'errore TS perché sappiamo che data esiste e contiene type
    const operationType = ctx.data?.type;
    
    // Se l'operazione è di tipo 'prima-attivazione', il lotto è obbligatorio
    if (operationType === 'prima-attivazione') {
      if (val === null || val === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seleziona un lotto",
        });
      }
    }
  }),
});

// Extend operation schema to include validation
const formSchema = operationSchema.extend({
  // Override della data per assicurarci che funzioni correttamente con il form
  date: z.coerce.date(),
  animalsPerKg: z.coerce.number().optional().nullable(),
  totalWeight: z.coerce.number().optional().nullable(),
  animalCount: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  // Il campo cycleId è condizionalmente richiesto a seconda del tipo di operazione
  cycleId: z.number().nullable().optional().superRefine((val, ctx) => {
    // Otteniamo il tipo di operazione dalle data dell'oggetto ctx
    // @ts-ignore - Ignoriamo l'errore TS perché sappiamo che data esiste e contiene type
    const operationType = ctx.data?.type;
    
    // Se l'operazione è di tipo 'prima-attivazione', il ciclo non è richiesto
    if (operationType === 'prima-attivazione') {
      return; // Nessun errore, il campo può essere nullo o undefined
    }
    
    // Per tutti gli altri tipi di operazione, verifichiamo che ci sia un ciclo selezionato
    if (val === null || val === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona un ciclo",
      });
    }
  }),
  // Il campo lotId è condizionalmente richiesto per le operazioni di prima attivazione
  lotId: z.number().nullable().optional().superRefine((val, ctx) => {
    // Otteniamo il tipo di operazione dalle data dell'oggetto ctx
    // @ts-ignore - Ignoriamo l'errore TS perché sappiamo che data esiste e contiene type
    const operationType = ctx.data?.type;
    
    // Se l'operazione è di tipo 'prima-attivazione', il lotto è obbligatorio
    if (operationType === 'prima-attivazione') {
      if (val === null || val === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Il lotto è obbligatorio per la Prima Attivazione",
        });
      }
    }
  }),
});

type FormValues = z.infer<typeof formSchemaWithFlupsy>;

interface OperationFormProps {
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void; // Callback per chiudere il dialogo quando si preme "Annulla"
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
  editMode?: boolean;
  initialCycleId?: number | null; // Parametro aggiuntivo per preselezionare il ciclo
  initialFlupsyId?: number | null; // Parametro per preselezionare il FLUPSY
  initialBasketId?: number | null; // Parametro per preselezionare la cesta
}

export default function OperationForm({ 
  onSubmit, 
  onCancel,
  defaultValues = {
    date: new Date(),
    type: 'misura',
    flupsyId: null,
    cycleId: null,
  },
  isLoading = false,
  editMode = false,
  initialCycleId = null,
  initialFlupsyId = null,
  initialBasketId = null
}: OperationFormProps) {
  // Stato per il dialogo di conferma delle operazioni misura che cambiano il numero di animali
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<any | null>(null);
  
  // WebSocket per aggiornamenti real-time della mini-mappa FLUPSY
  useWebSocketMessage('operation_created', () => {
    console.log('🔄 FORM REGISTRAZIONE: Operazione creata, invalidazione cache cestelli per mini-mappa');
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
  });
  
  useWebSocketMessage('basket_updated', () => {
    console.log('🔄 FORM REGISTRAZIONE: Cestello aggiornato, invalidazione cache cestelli per mini-mappa');
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
  });
  
  // Fetch related data
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles/active'],
  });

  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgr'],
  });

  const { data: lots } = useQuery({
    queryKey: ['/api/lots/active'],
  });

  // Inizializzazione del form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchemaWithFlupsy),
    defaultValues,
  });

  const watchAnimalsPerKg = form.watch('animalsPerKg');
  const watchAnimalCount = form.watch('animalCount');
  // Rimuoviamo la watch diretta su averageWeight che causa errori
  const watchBasketId = form.watch('basketId');
  const watchFlupsyId = form.watch('flupsyId');
  const watchCycleId = form.watch('cycleId');
  const watchType = form.watch('type');
  const watchDate = form.watch('date');
  // Monitoraggio dei nuovi campi standardizzati
  const watchSampleWeight = form.watch('sampleWeight');
  const watchLiveAnimals = form.watch('liveAnimals');
  const watchDeadCount = form.watch('deadCount');
  const watchTotalWeight = form.watch('totalWeight');
  const watchManualCountAdjustment = form.watch('manualCountAdjustment');
  // Calcoliamo manualmente l'average weight
  const averageWeight = watchAnimalsPerKg ? (1000000 / Number(watchAnimalsPerKg)) : 0;
  
  // Fetch operations for the selected basket
  const { data: basketOperations } = useQuery({
    queryKey: ['/api/operations', watchBasketId],
    enabled: !!watchBasketId,
  });
  
  // Fetch baskets for the selected FLUPSY 
  const { data: flupsyBaskets, isLoading: isLoadingFlupsyBaskets } = useQuery({
    queryKey: ['/api/flupsys', watchFlupsyId, 'baskets'],
    queryFn: () => {
      if (!watchFlupsyId) return [];
      return fetch(`/api/flupsys/${watchFlupsyId}/baskets`).then(res => res.json());
    },
    enabled: !!watchFlupsyId,
  });
  
  // Imposta il ciclo iniziale e precarica FLUPSY e cesta quando il componente viene montato
  useEffect(() => {
    // Priorità: defaultValues (duplicazione) > parametri URL (navigazione)
    
    // Caso 1: Abbiamo defaultValues preimpostati (es. dalla duplicazione) - MASSIMA PRIORITÀ
    if (defaultValues?.flupsyId && defaultValues.basketId) {
      console.log('PRIORITÀ 1 - Duplicazione: Preimpostati valori di default per FLUPSY e cesta:', defaultValues.flupsyId, defaultValues.basketId);
      
      // Assicuriamoci che i valori siano correttamente impostati
      form.setValue('flupsyId', defaultValues.flupsyId);
      
      // Attendiamo che i cestelli siano caricati prima di impostare il cestello
      if (!isLoadingFlupsyBaskets && flupsyBaskets) {
        // Verifichiamo che il cestello esista nel FLUPSY selezionato
        const basketExists = flupsyBaskets.some((b: any) => b.id === defaultValues.basketId);
        if (basketExists) {
          form.setValue('basketId', defaultValues.basketId);
          console.log('Cestello trovato e selezionato:', defaultValues.basketId);
        } else {
          console.log('Cestello non trovato nel FLUPSY selezionato');
        }
      }
    }
    // Caso 2: Abbiamo un ciclo iniziale da preselezionare (dalla navigazione)
    else if (initialCycleId && cycles && cycles.length > 0 && baskets) {
      console.log('PRIORITÀ 2 - Da ciclo: Preseleziono ciclo:', initialCycleId);
      
      // Verifica che il ciclo esista
      const selectedCycle = cycles.find(cycle => cycle.id === initialCycleId);
      
      if (selectedCycle) {
        // Imposta il valore del ciclo nel form
        form.setValue('cycleId', initialCycleId);
        
        // Trova la cesta associata al ciclo
        const basketId = selectedCycle.basketId;
        if (basketId) {
          // Cerca i dettagli della cesta per ottenere il flupsyId
          const basket = baskets.find(b => b.id === basketId);
          if (basket && basket.flupsyId) {
            // Prima imposta il FLUPSY e poi la cesta
            form.setValue('flupsyId', basket.flupsyId);
            form.setValue('basketId', basketId);
            console.log('Preselezionato FLUPSY e cesta da ciclo:', basket.flupsyId, basketId);
          }
        }
      }
    } 
    // Caso 3: Abbiamo FLUPSY e cesta iniziali da preselezionare (dalla navigazione diretta)
    else if (initialFlupsyId && initialBasketId && flupsys && baskets) {
      console.log('PRIORITÀ 3 - Diretta: Preseleziono FLUPSY e cesta:', initialFlupsyId, initialBasketId);
      
      // Verifica che FLUPSY e cesta esistano
      const flupsy = flupsys.find((f: any) => f.id === initialFlupsyId);
      const basket = baskets.find((b: any) => b.id === initialBasketId);
      
      if (flupsy && basket) {
        // Prima imposta il FLUPSY
        form.setValue('flupsyId', initialFlupsyId);
        
        // Se la cesta appartiene al FLUPSY selezionato
        if (basket.flupsyId === initialFlupsyId) {
          form.setValue('basketId', initialBasketId);
          
          // Se la cesta ha un ciclo attivo, selezionalo automaticamente
          if (basket.currentCycleId) {
            form.setValue('cycleId', basket.currentCycleId);
            console.log('Ciclo impostato automaticamente al ciclo attivo della cesta:', basket.currentCycleId);
          }
        }
      }
    }
  }, [initialCycleId, initialFlupsyId, initialBasketId, cycles, baskets, flupsys, form, defaultValues, flupsyBaskets, isLoadingFlupsyBaskets]);

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
  }, [watchAnimalsPerKg, sizes]);
  
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
  }, [watchTotalWeight, watchAnimalsPerKg, watchManualCountAdjustment, form]);
  
  // Calcola il totale del campione e aggiorna mortalityRate quando i dati di misurazione cambiano
  useEffect(() => {
    // Calcola il totale del campione (vivi + morti)
    if (watchLiveAnimals || watchDeadCount) {
      const liveCount = watchLiveAnimals || 0;
      const deadCount = watchDeadCount || 0;
      const totalSample = liveCount + deadCount;
      
      // Imposta il totale del campione
      form.setValue('totalSample', totalSample > 0 ? totalSample : null);
      
      // Calcola e imposta la percentuale di mortalità
      if (totalSample > 0) {
        const mortalityRate = (deadCount / totalSample) * 100;
        form.setValue('mortalityRate', mortalityRate);
      } else {
        form.setValue('mortalityRate', null);
      }
    } else {
      form.setValue('totalSample', null);
      form.setValue('mortalityRate', null);
    }
  }, [watchLiveAnimals, watchDeadCount, form]);
  
  // Calcola animali per kg quando cambiano i valori del campione
  useEffect(() => {
    // Solo se non è attiva la correzione manuale e abbiamo dati validi
    if (watchSampleWeight && watchLiveAnimals && 
        watchSampleWeight > 0 && watchLiveAnimals > 0 && 
        !watchManualCountAdjustment) {
      // Peso medio di un animale in grammi = peso campione / numero animali vivi
      const averageWeightInGrams = watchSampleWeight / watchLiveAnimals;
      
      // Animali per kg = 1000 grammi / peso medio in grammi di un animale
      const calculatedAnimalsPerKg = Math.round(1000 / averageWeightInGrams);
      
      // Imposta animali per kg
      form.setValue('animalsPerKg', calculatedAnimalsPerKg);
    }
  }, [watchSampleWeight, watchLiveAnimals, watchManualCountAdjustment, form]);
  
  // Calcola automaticamente i dati basati sul campione e aggiorna i campi correlati
  useEffect(() => {
    // Solo se non è attiva la correzione manuale
    if (!watchManualCountAdjustment) {
      // Calcola peso medio e animali per kg se abbiamo i dati di misurazione
      if (watchSampleWeight && watchLiveAnimals && watchSampleWeight > 0 && watchLiveAnimals > 0) {
        // Peso medio di un animale in grammi = peso campione / numero animali vivi
        const averageWeightInGrams = watchSampleWeight / watchLiveAnimals;
        
        // Animali per kg = 1000 grammi / peso medio in grammi di un animale
        const calculatedAnimalsPerKg = Math.round(1000 / averageWeightInGrams);
        
        // Imposta animali per kg
        form.setValue('animalsPerKg', calculatedAnimalsPerKg);
      }
      
      // Calcola il numero totale di animali se abbiamo dati sulla mortalità
      if (watchLiveAnimals && watchLiveAnimals > 0) {
        // Il numero totale di animali è stimato moltiplicando il numero di animali vivi
        // per un fattore basato sulla percentuale di mortalità
        const liveCount = watchLiveAnimals || 0;
        const deadCount = watchDeadCount || 0;
        const totalSample = liveCount + deadCount;
        
        if (totalSample > 0) {
          // Calcoliamo il fattore di correzione basato sulla mortalità
          const liveRatio = liveCount / totalSample;
          // Stimiamo il numero totale di animali
          const estimatedTotal = Math.round(liveCount / liveRatio);
          
          // Aggiorniamo il conteggio totale degli animali
          form.setValue('animalCount', estimatedTotal);
        }
      }
    }
  }, [watchLiveAnimals, watchDeadCount, watchManualCountAdjustment, watchSampleWeight, form]);
  
  // Questa variabile viene usata altrove nei calcoli
  const watchAverageWeight = watchAnimalsPerKg ? (1000000 / Number(watchAnimalsPerKg)) : 0;
  
  // Check for existing operations on the same date
  const [operationDateError, setOperationDateError] = useState<string | null>(null);
  
  useEffect(() => {
    // Resetta l'errore quando cambia data o cestello
    setOperationDateError(null);
    
    // Verifica solo se sia data che cestello sono selezionati
    if (!watchBasketId || !watchDate || !basketOperations || basketOperations.length === 0) {
      return;
    }
    
    // Verifica se il cestello è disponibile (senza ciclo attivo) o attivo
    const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
    
    // Se il cestello è disponibile, non applicare la restrizione della data
    // (permettiamo più operazioni nello stesso giorno per cestelli disponibili)
    if (selectedBasket?.state === 'available') {
      return;
    }
    
    // Ottieni l'ID del ciclo corrente/attivo per questo cestello
    const currentCycleId = selectedBasket?.currentCycleId;
    
    // Converti la data selezionata nel form a un formato YYYY-MM-DD per il confronto
    const selectedDate = watchDate instanceof Date 
      ? watchDate.toISOString().split('T')[0] 
      : typeof watchDate === 'string' 
        ? new Date(watchDate).toISOString().split('T')[0]
        : '';
    
    if (!selectedDate) return;
    
    // Cerca operazioni esistenti nella stessa data, MA SOLO per il ciclo corrente
    const operationOnSameDate = basketOperations.find(op => {
      const opDate = new Date(op.date).toISOString().split('T')[0];
      // Verifica sia la data che l'appartenenza al ciclo corrente
      return opDate === selectedDate && op.cycleId === currentCycleId;
    });
    
    if (operationOnSameDate) {
      setOperationDateError("Non è possibile registrare più di un'operazione al giorno per lo stesso cestello con ciclo attivo.");
    } else {
      setOperationDateError(null);
    }
  }, [watchBasketId, watchDate, basketOperations, baskets]);
  
  // Calculate SGR when basket and cycle are selected
  useEffect(() => {
    if (!watchBasketId || !watchCycleId || !basketOperations || basketOperations.length < 1) {
      return;
    }
    
    // Ottieni il ciclo selezionato o corrente
    const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
    const currentCycleId = selectedBasket?.currentCycleId || watchCycleId;
    
    if (!currentCycleId) return;
    
    // Sort operations by date (descending), ma solo per il ciclo corrente
    const cycleOperations = basketOperations.filter(op => op.cycleId === currentCycleId);
    
    if (cycleOperations.length === 0) return;
    
    const sortedOperations = [...cycleOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Find the latest operation with animalsPerKg value
    const previousOperation = sortedOperations.find(op => 
      op.animalsPerKg !== null && op.totalWeight !== null && op.animalCount !== null
    );
    
    if (previousOperation && previousOperation.animalsPerKg && watchAnimalsPerKg) {
      // Calculate weight gain percentage
      const prevAnimalsPerKg = previousOperation.animalsPerKg;
      const currentAnimalsPerKg = watchAnimalsPerKg;
      
      if (prevAnimalsPerKg > currentAnimalsPerKg) { // Animal weight has increased
        const prevWeight = 1000000 / prevAnimalsPerKg; // mg
        const currentWeight = 1000000 / currentAnimalsPerKg; // mg
        const weightGain = ((currentWeight - prevWeight) / prevWeight) * 100;
        
        // Get current month
        const currentMonth = new Date().getMonth();
        const monthNames = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                          'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
        
        // Find SGR for current month
        if (sgrs && sgrs.length > 0) {
          const matchingSgr = sgrs.find(sgr => sgr.month === monthNames[currentMonth]);
          if (matchingSgr) {
            form.setValue('sgrId', matchingSgr.id);
          }
        }
      }
    }
  }, [watchBasketId, watchCycleId, basketOperations, watchAnimalsPerKg, sgrs, baskets]);

  // Filter cycles based on selected basket
  const filteredCycles = cycles?.filter(cycle => 
    cycle.basketId === Number(watchBasketId) && cycle.state === 'active'
  ) || [];
  
  // Selected basket data
  const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
  
  // Determine if a new cycle needs to be created
  const needsNewCycle = selectedBasket?.state === 'available' && watchBasketId;
  
  // Determina se abbiamo un cestello attivo senza cicli attivi
  const isActiveBasketWithNoCycles = selectedBasket?.state === 'active' && filteredCycles.length === 0;
  
  // Auto-select cycle when basket is selected and there's only one active cycle
  useEffect(() => {
    if (watchBasketId && filteredCycles && filteredCycles.length === 1 && !watchCycleId && watchType !== 'prima-attivazione') {
      // Automatically select the only available cycle
      form.setValue('cycleId', filteredCycles[0].id);
    }
  }, [watchBasketId, filteredCycles, watchCycleId, watchType, form]);
  
  // Auto-set "Prima Attivazione" when basket is available
  useEffect(() => {
    console.log('🔍 Debug auto-set:', {
      watchBasketId,
      selectedBasket: selectedBasket ? {id: selectedBasket.id, state: selectedBasket.state} : null,
      shouldAutoSet: watchBasketId && selectedBasket?.state === 'available',
      currentType: watchType
    });
    
    if (watchBasketId && selectedBasket?.state === 'available') {
      // Forza il tipo a "prima-attivazione" per ceste disponibili
      console.log('🚀 FORZANDO auto-impostazione di Prima Attivazione per cesta disponibile');
      form.setValue('type', 'prima-attivazione');
      console.log('✅ Tipo operazione impostato automaticamente a "Prima Attivazione" per cesta disponibile');
    }
  }, [watchBasketId, selectedBasket, watchType, form]);
  
  // Auto-set cycleId when basket with active cycle is selected
  useEffect(() => {
    if (watchBasketId && selectedBasket?.state === 'active' && selectedBasket?.currentCycleId) {
      // Imposta automaticamente il ciclo attivo della cesta
      form.setValue('cycleId', selectedBasket.currentCycleId);
      console.log('Ciclo impostato automaticamente al ciclo attivo della cesta:', selectedBasket.currentCycleId);
    }
  }, [watchBasketId, selectedBasket, form]);
  
  // Precompila il lotto per operazioni su cestelli con ciclo attivo
  useEffect(() => {
    if (watchBasketId && basketOperations && basketOperations.length > 0 && watchType !== 'prima-attivazione') {
      // Trova l'operazione di Prima Attivazione per questo cestello
      const primaAttivazione = basketOperations.find(op => op.type === 'prima-attivazione');
      
      if (primaAttivazione && primaAttivazione.lotId) {
        // Precompila con il lotto dell'operazione di Prima Attivazione
        form.setValue('lotId', primaAttivazione.lotId);
      }
    }
  }, [watchBasketId, basketOperations, watchType, form]);

  // Get operation type options based on basket state
  // Rimossi tipi di operazione: Vagliatura, Trattamento, Pulizia, Selezione per vendita, Cessazione
  const allOperationTypes = [
    { value: 'prima-attivazione', label: 'Prima Attivazione' },
    { value: 'misura', label: 'Misura' },
    { value: 'vendita', label: 'Vendita' },
  ];
  
  // Filter operation types based on basket state and cycle availability
  // Filtro più restrittivo per le operazioni
  console.log('🔍 DEBUG FILTRO OPERAZIONI:');
  console.log('- selectedBasket:', selectedBasket);
  console.log('- stato cestello:', selectedBasket?.state);
  console.log('- ha ciclo attivo?', selectedBasket?.currentCycleId ? 'Sì' : 'No');
  console.log('- operazioni disponibili:', allOperationTypes.map(op => op.value));
  
  // Implementazione restrittiva per cestelli disponibili
  let filteredOperationTypes;
  if (selectedBasket) {
    if (selectedBasket.state === 'available') {
      // Solo "Prima Attivazione" per cestelli disponibili
      filteredOperationTypes = allOperationTypes.filter(op => op.value === 'prima-attivazione');
      console.log('✅ CESTELLO DISPONIBILE - mostro solo Prima Attivazione:', filteredOperationTypes.map(op => op.value));
    } else if (selectedBasket.state === 'active' && !selectedBasket.currentCycleId) {
      // Tutte le operazioni per cestelli attivi SENZA ciclo attivo
      filteredOperationTypes = allOperationTypes;
      console.log('✅ CESTELLO ATTIVO SENZA CICLO - mostro tutte operazioni:', filteredOperationTypes.map(op => op.value));
    } else {
      // Tutte le operazioni TRANNE 'Prima Attivazione' per cestelli con ciclo attivo
      filteredOperationTypes = allOperationTypes.filter(op => op.value !== 'prima-attivazione');
      console.log('✅ CESTELLO ATTIVO CON CICLO - nascondo Prima Attivazione:', filteredOperationTypes.map(op => op.value));
    }
  } else {
    filteredOperationTypes = allOperationTypes;
    console.log('✅ NESSUN CESTELLO - mostro tutte operazioni:', filteredOperationTypes.map(op => op.value));
  }
  
  const operationTypes = filteredOperationTypes;

  // Aggiungi una funzione per gestire l'invio del form con log dettagliati per debug
  const handleFormSubmit = (values: FormValues) => {
    // Log di debug estesi
    console.log('================== FORM DEBUG ==================');
    console.log('Form values:', values);
    console.log('Form errors:', form.formState.errors);
    console.log('Form state:', form.formState);
    console.log('Form isDirty:', form.formState.isDirty);
    console.log('Form isValid:', form.formState.isValid);
    console.log('Form isSubmitting:', form.formState.isSubmitting);
    console.log('Form isSubmitted:', form.formState.isSubmitted);
    console.log('Default values:', defaultValues);
    
    // Convalida i valori prima di inviarli
    if (!values.basketId) {
      console.error('Manca il cestello');
      return;
    }
    
    if (!values.type) {
      console.error('Manca il tipo di operazione');
      return;
    }
    
    if (!values.date) {
      console.error('Manca la data');
      return;
    }
    
    // Assicurati che i campi numerici siano effettivamente numeri
    if (values.animalCount) {
      values.animalCount = Number(values.animalCount);
    }
    
    if (values.animalsPerKg) {
      values.animalsPerKg = Number(values.animalsPerKg);
    }
    
    if (values.totalWeight) {
      values.totalWeight = Number(values.totalWeight);
    }
    
    // **IMPORTANTE:** Conserva il cycleId per operazioni di prima-attivazione
    // Utilizza la conoscenza del cestello per determinare il cycleId corretto
    const selectedBasket = baskets?.find(b => b.id === Number(values.basketId));
    if (values.type === 'prima-attivazione' && selectedBasket?.currentCycleId) {
      console.log('Prima attivazione con cestello che ha già un ciclo attivo:', selectedBasket.currentCycleId);
      // In questo caso, manteniamo il cycleId del cestello anziché impostarlo a null
      values.cycleId = selectedBasket.currentCycleId;
      console.log('Utilizzo il cycleId esistente per prevenire errori database:', values.cycleId);
    }
    
    // Calcola automaticamente il peso totale se non è stato specificato
    if (values.animalCount && values.animalsPerKg && !values.totalWeight) {
      const averageWeight = 1000000 / values.animalsPerKg; // mg
      values.totalWeight = (values.animalCount * averageWeight) / 1000; // g
    }
    
    console.log('Submitting final values:', values);
    console.log('isLoading prop:', isLoading);
    
    try {
      // Converti il campo date da stringa a Date se necessario
      if (typeof values.date === 'string') {
        console.log('Converting date from string to Date object');
        values = {
          ...values,
          date: new Date(values.date)
        };
        console.log('Converted values:', values);
      }
      
      // Verifica se tutti i campi required sono presenti
      const requiredFields = ['basketId', 'date', 'type'];
      const missingFields = requiredFields.filter(field => !values[field as keyof FormValues]);
      
      if (missingFields.length > 0) {
        console.error(`Campi obbligatori mancanti: ${missingFields.join(', ')}`);
        return;
      } else {
        console.log('Tutti i campi obbligatori sono presenti');
        
        // Verifica se cycleId è richiesto in base al tipo di operazione
        if (values.type !== 'prima-attivazione' && !values.cycleId) {
          console.error('Campo cycleId mancante per operazione diversa da prima-attivazione');
          return;
        } else {
          console.log('Validazione cycleId passata');
        }
        
        // Verifica se lotId è richiesto per Prima Attivazione
        if (values.type === 'prima-attivazione' && !values.lotId) {
          console.error('Campo lotId mancante per operazione di Prima Attivazione');
          return;
        } else {
          console.log('Validazione lotId passata');
        }
      }
      
      console.log('Chiamata onSubmit con i valori finali:', values);
      // Chiama la funzione onSubmit passata come prop
      onSubmit(values);
    } catch (error) {
      console.error('Errore durante il submit del form:', error);
    }
  };
  
  // Una funzione di submit esterna al gestire il caso in cui manchino i dati o ci siano errori di validazione
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
      // Se l'utente conferma, procediamo ignorando l'errore
    }
    
    // Ottieni i valori dal form
    const values = form.getValues();
    console.log("Valori form:", values);
    
    // Verifica che ci siano almeno i campi obbligatori
    if (!values.basketId || !values.flupsyId || !values.type || !values.date) {
      console.error("Mancano campi obbligatori", { 
        basketId: values.basketId, 
        flupsyId: values.flupsyId, 
        type: values.type, 
        date: values.date 
      });
      alert("Compila tutti i campi obbligatori: FLUPSY, Cesta, Tipo operazione e Data");
      return;
    }
    
    // Verifica che il lotto sia presente per operazioni di prima attivazione
    if (values.type === 'prima-attivazione' && !values.lotId) {
      console.error("Manca il lotto per operazione di Prima Attivazione");
      alert("Il lotto è obbligatorio per le operazioni di Prima Attivazione");
      return;
    }
    
    // Assicurati che date sia un oggetto Date e tutti i valori siano formattati correttamente
    const formattedValues = {
      ...values,
      date: values.date instanceof Date ? values.date : new Date(values.date),
      animalCount: values.animalCount ? Number(values.animalCount) : null,
      animalsPerKg: values.animalsPerKg ? Number(values.animalsPerKg) : null,
      totalWeight: values.totalWeight ? Number(values.totalWeight) : null,
      sgrId: values.sgrId ? Number(values.sgrId) : null,
      lotId: values.lotId ? Number(values.lotId) : null,
      flupsyId: values.flupsyId ? Number(values.flupsyId) : null,
      // Per prima-attivazione, controlla se il cestello ha già un ciclo attivo
      cycleId: values.type === 'prima-attivazione' ? 
        (selectedBasket?.currentCycleId || null) : 
        (values.cycleId ? Number(values.cycleId) : null)
    };
    
    // IMPORTANTE: Per le operazioni di tipo 'misura' e 'peso', rimuoviamo il sizeId
    // per lasciare che il server calcoli la taglia appropriata in base a animalsPerKg
    if (values.type === 'misura' || values.type === 'peso') {
      console.log("Omesso sizeId per operazione", values.type, "- verrà calcolato dal server in base ad animalsPerKg:", values.animalsPerKg);
      delete formattedValues.sizeId;
    } else {
      // Per gli altri tipi di operazione manteniamo il sizeId se presente
      formattedValues.sizeId = values.sizeId ? Number(values.sizeId) : null;
    }
    
    console.log("Valori formattati:", formattedValues);
    
    // Gestione speciale per operazioni di misura in base alla mortalità
    if (formattedValues.type === 'misura') {
      // Ottieni la precedente operazione per recuperare dati (se disponibile)
      const prevOperationData = basketOperations?.find(op => op.animalCount !== null);
      
      if (formattedValues.deadCount && Number(formattedValues.deadCount) > 0) {
        // Con mortalità > 0: mostra dialog di conferma per avvisare che cambierà il conteggio
        console.log("Misurazione con mortalità > 0: verrà calcolato un nuovo conteggio animali");
        setPendingValues(formattedValues);
        setShowConfirmDialog(true);
        return;
      } else {
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
    }
    
    // Chiamata diretta alla funzione di submit per gli altri casi
    if (onSubmit) {
      console.log("Chiamata onSubmit con:", formattedValues);
      onSubmit(formattedValues);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmitForm} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {/* Step 1: Select FLUPSY */}
          <FormField
            control={form.control}
            name="flupsyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FLUPSY</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    const flupsyId = Number(value);
                    field.onChange(flupsyId);
                    // Reset basket when FLUPSY changes
                    form.setValue('basketId', undefined);
                    form.setValue('cycleId', undefined);
                    
                    console.log('FLUPSY selezionato:', flupsyId);
                  }}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un FLUPSY" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {flupsys && flupsys.map(flupsy => (
                      <SelectItem 
                        key={flupsy.id} 
                        value={flupsy.id.toString()}
                      >
                        {flupsy.name} - {flupsy.location || 'N/D'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Step 2: Select Basket from selected FLUPSY */}
          <FormField
            control={form.control}
            name="basketId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cesta</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                    // Reset cycle when basket changes
                    form.setValue('cycleId', undefined);
                    
                    // Verifica lo stato del cestello selezionato
                    const selectedBasket = baskets?.find(b => b.id === Number(value));
                    
                    // Imposta "prima-attivazione" sia per ceste disponibili che per ceste attive senza ciclo
                    if (selectedBasket?.state === 'available' || 
                       (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId)) {
                      console.log('Impostazione automatica operazione prima-attivazione per cesta:', selectedBasket);
                      form.setValue('type', 'prima-attivazione');
                    }
                  }}
                  value={field.value?.toString()}
                  disabled={!watchFlupsyId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={watchFlupsyId ? "Seleziona una cesta" : "Seleziona prima un FLUPSY"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {flupsyBaskets?.map((basket) => {
                      // Mostra le informazioni sul ciclo per le ceste attive
                      const cycleInfo = basket.state === 'active' && basket.cycleCode ? 
                        ` (${basket.cycleCode})` : '';
                      
                      // Informazioni sulla posizione
                      const positionInfo = basket.row && basket.position ? 
                        ` - Fila ${basket.row} Pos. ${basket.position}` : '';
                        
                      // Stato visualizzato solo per ceste disponibili
                      const stateInfo = basket.state === 'available' ? 
                        ' - Disponibile' : '';
                        
                      return (
                        <SelectItem 
                          key={basket.id} 
                          value={basket.id.toString()}
                          className={
                            basket.state === 'active' && basket.currentCycleId 
                              ? "text-green-700 font-medium" 
                              : (basket.state === 'available' || (basket.state === 'active' && !basket.currentCycleId))
                                ? "text-amber-600" 
                                : ""
                          }
                        >
                          {basket.state === 'active' && basket.currentCycleId
                            ? "🟢 " 
                            : (basket.state === 'available' || (basket.state === 'active' && !basket.currentCycleId))
                              ? "🟠 " 
                              : ""}
                          Cesta #{basket.physicalNumber}{positionInfo}{cycleInfo}{stateInfo}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => {
              // Converti la data in formato stringa per l'input
              const dateValue = field.value instanceof Date 
                ? field.value.toISOString().split('T')[0] 
                : typeof field.value === 'string' 
                  ? field.value 
                  : '';
              
              return (
                <FormItem>
                  <FormLabel>Data Operazione</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={dateValue}
                      onChange={(e) => {
                        // Passa il valore dell'input direttamente (sarà convertito da z.coerce.date())
                        field.onChange(e.target.value);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                  {operationDateError && (
                    <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-500">
                      {operationDateError}
                    </div>
                  )}
                </FormItem>
              );
            }}
          />

{(() => {
            // Mostra avviso per operazioni di Prima Attivazione
            if (watchType === 'prima-attivazione') {
              return (
                <div className="col-span-1 md:col-span-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-600">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Un nuovo ciclo verrà creato automaticamente.</span>
                  </div>
                  <div className="mt-1 ml-7">
                    Operazione di Prima Attivazione genera un ciclo con codice automatico nel formato basket#-flupsy#-YYMM.
                  </div>
                </div>
              );
            }
            
            // Per ceste con ciclo attivo, mostra un campo di sola lettura
            if (selectedBasket?.state === 'active' && selectedBasket?.currentCycleId) {
              return (
                <FormItem>
                  <FormLabel>Ciclo Attivo</FormLabel>
                  <FormControl>
                    <Input
                      readOnly
                      className="bg-blue-50 border-blue-100 font-medium text-blue-600"
                      value={`Ciclo #${selectedBasket.currentCycleId} - ${selectedBasket.cycleCode || ""}`}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Questo cestello ha un ciclo attivo. Il ciclo è selezionato automaticamente.
                  </FormDescription>
                </FormItem>
              );
            }
            
            // Altrimenti mostra selettore standard
            return (
              <FormField
                control={form.control}
                name="cycleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                      disabled={!watchBasketId || filteredCycles.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un ciclo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCycles.map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id.toString()}>
                            Ciclo #{cycle.id} {cycle.code ? `- ${cycle.code}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {!watchBasketId ? "Seleziona prima una cesta" : 
                        filteredCycles.length === 0 ? "Nessun ciclo attivo per questa cesta" : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })()}

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => {
              // Forza il valore "prima-attivazione" per ceste disponibili o ceste attive senza ciclo
              if ((selectedBasket?.state === 'available' || 
                  (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId)) && 
                  field.value !== 'prima-attivazione') {
                // Aggiorna immediatamente il valore del campo per ceste disponibili
                // o ceste attive senza ciclo
                setTimeout(() => {
                  console.log('Impostazione automatica di "Prima Attivazione" per cesta:', selectedBasket);
                  form.setValue('type', 'prima-attivazione');
                }, 0);
              }
              
              // Usa direttamente operationTypes che è già filtrato correttamente
              const availableOperationTypes = operationTypes;
              
              // Determina se il selettore dovrebbe essere disabilitato
              const isSelectDisabled = selectedBasket?.state === 'available' || 
                (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId);

              // Colore di sfondo e testo per il selettore
              const selectClassName = 
                (selectedBasket?.state === 'available' || 
                (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId)) ?
                "bg-amber-50 border-amber-200 text-amber-700 font-medium" : "";
              
              return (
                <FormItem>
                  <FormLabel>Tipologia Operazione</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={
                      (selectedBasket?.state === 'available' || 
                       (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId)) 
                       ? 'prima-attivazione' 
                       : field.value
                    }
                    disabled={isSelectDisabled} // Disabilitato per ceste disponibili o attive senza ciclo
                  >
                    <FormControl>
                      <SelectTrigger className={selectClassName}>
                        <SelectValue placeholder="Seleziona tipologia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableOperationTypes.map((type) => {
                        // Evidenzia in modo speciale l'opzione Prima Attivazione per cestelli senza ciclo
                        const isPrimaAttivazione = type.value === 'prima-attivazione';
                        const isMandatory = isPrimaAttivazione && 
                          (selectedBasket?.state === 'available' || 
                           (selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId));
                        const className = isMandatory ? "bg-amber-50 font-medium" : "";
                        
                        return (
                          <SelectItem 
                            key={type.value} 
                            value={type.value}
                            className={className}
                          >
                            {type.label} {isMandatory ? "(Obbligatorio)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {selectedBasket?.state === 'available' 
                      ? "Per ceste disponibili è possibile eseguire solo operazioni di Prima Attivazione" 
                      : selectedBasket?.state === 'active' && selectedBasket?.currentCycleId
                        ? "L'operazione Prima Attivazione è disponibile solo per cestelli senza ciclo attivo"
                        : selectedBasket?.state === 'active' && !selectedBasket?.currentCycleId
                          ? "La Prima Attivazione creerà un nuovo ciclo per questa cesta"
                          : ""}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="sizeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taglia</FormLabel>
                <FormControl>
                  <div>
                    <Input
                      value={field.value && sizes ? 
                        sizes.find(s => s.id === field.value)?.name || "Nessuna taglia" : 
                        "Calcolato automaticamente"
                      }
                      readOnly
                      className="bg-sky-50 border-sky-100 font-medium text-sky-700"
                    />
                    <div className="text-xs text-sky-600 mt-1 ml-1">
                      {field.value && sizes ? 
                        `Range: ${sizes.find(s => s.id === field.value)?.min_animals_per_kg}-${sizes.find(s => s.id === field.value)?.max_animals_per_kg} animali/kg` : 
                        "Basato su animali per kg"
                      }
                    </div>
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  La taglia viene selezionata automaticamente in base al numero di animali per kg
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campi standardizzati per inserimento dati di misurazione - Layout compatto */}
          <div className="border rounded-md p-3 mb-3 bg-blue-50 border-blue-100">
            <h3 className="text-sm font-semibold mb-2 text-blue-700">Dati di misurazione standardizzati</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Prima colonna */}
              <div>
                {/* Peso campione (grammi sample) */}
                <FormField
                  control={form.control}
                  name="sampleWeight"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel className="text-xs">Grammi sample</FormLabel>
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
                
                {/* Numero animali vivi */}
                <FormField
                  control={form.control}
                  name="liveAnimals"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel className="text-xs">Numero animali vivi</FormLabel>
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
                
                {/* Numero animali morti */}
                <FormField
                  control={form.control}
                  name="deadCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Numero animali morti</FormLabel>
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
              </div>
              
              {/* Seconda colonna */}
              <div>
                {/* Totale campione (calcolato automaticamente) */}
                <FormField
                  control={form.control}
                  name="totalSample"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel className="text-xs">Totale sample</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="Calcolato"
                          className="h-8 text-sm bg-gray-50 border-gray-100 font-medium text-gray-700"
                          value={field.value === null || field.value === undefined 
                            ? 'Calcolato' 
                            : field.value.toLocaleString('it-IT')}
                          readOnly
                        />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Vivi + Morti
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                {/* Percentuale morti (calcolata automaticamente) */}
                <FormField
                  control={form.control}
                  name="mortalityRate"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel className="text-xs">% morti</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="Calcolato"
                          className="h-8 text-sm bg-gray-50 border-gray-100 font-medium text-gray-700"
                          value={field.value === null || field.value === undefined 
                            ? 'Calcolato' 
                            : `${field.value.toFixed(2)}%`}
                          readOnly
                        />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        (Morti / Totale) × 100
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                {/* FormField per animalCount spostato qui */}
                <FormField
                  control={form.control}
                  name="manualCountAdjustment"
                  render={({ field }) => (
                    <div className="flex items-center mt-4">
                      <input
                        type="checkbox"
                        id="manualCountAdjustment"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor="manualCountAdjustment"
                        className="ml-2 text-xs font-medium text-gray-700"
                      >
                        Abilita modifica manuale del conteggio
                      </label>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="animalCount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Numero Animali</FormLabel>
                </div>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder={watchManualCountAdjustment ? "Inserisci numero" : "Calcolato"}
                    readOnly={!watchManualCountAdjustment}
                    className={`h-8 text-sm ${!watchManualCountAdjustment ? "bg-amber-50 border-amber-100 font-medium text-amber-700" : ""}`}
                    value={field.value === null || field.value === undefined 
                      ? '' 
                      : field.value.toLocaleString('it-IT')}
                    onChange={(e) => {
                      // Rimuove tutti i separatori non numerici e li sostituisce con un formato valido
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
                <FormDescription className="text-[10px]">
                  {watchManualCountAdjustment 
                    ? "Inserisci manualmente il numero di animali" 
                    : "Calcolato automaticamente dalle misurazioni"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="totalWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Peso Totale (g)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Inserisci peso"
                      className="h-8 text-sm"
                      value={field.value !== null && field.value !== undefined ? field.value.toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Accetta solo numeri e un punto decimale
                        if (!/^(\d*\.?\d*)$/.test(value) && value !== '') {
                          return;
                        }
                        
                        if (value === '' || value === '.') {
                          field.onChange(null);
                        } else {
                          let numValue = parseFloat(value);
                          // Limita il valore massimo a 1.000.000
                          if (numValue > 1000000) {
                            numValue = 1000000;
                          }
                          // Arrotonda a una cifra decimale
                          numValue = Math.round(numValue * 10) / 10;
                          field.onChange(isNaN(numValue) ? null : numValue);
                        }
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Inserisci peso totale in grammi (max 1.000.000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="animalsPerKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Animali per Kg</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Calcolato"
                      className="h-8 text-sm bg-amber-50 border-amber-100 font-medium text-amber-700"
                      value={field.value === null || field.value === undefined 
                        ? 'Calcolato automaticamente' 
                        : field.value.toLocaleString('it-IT')}
                      readOnly
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Calcolato dal peso del campione
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="averageWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Peso Medio (mg)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Calcolato"
                    value={field.value ? Number(field.value).toFixed(3).replace('.', ',') : ''}
                    readOnly
                    className="h-8 text-sm bg-green-50 border-green-100 font-medium text-green-700"
                  />
                </FormControl>
                <FormDescription className="text-[10px]">
                  1.000.000 ÷ (animali per kg)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SGR viene determinato automaticamente, mostriamo solo le informazioni sulla crescita */}
          <div className="col-span-2 mb-2">
            <h3 className="text-sm font-semibold mb-1">Informazioni SGR</h3>
            {watchAnimalsPerKg && basketOperations && basketOperations.length > 0 ? (
              <div className="p-2 rounded-md border bg-muted/20 text-sm">
                {(() => {
                  // Ottieni il ciclo selezionato o corrente
                  const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
                  const currentCycleId = selectedBasket?.currentCycleId || watchCycleId;
                  
                  if (!currentCycleId) {
                    return (
                      <div className="text-muted-foreground text-xs">
                        Nessun ciclo attivo selezionato.
                      </div>
                    );
                  }
                  
                  // Filtra operazioni solo per il ciclo corrente
                  const cycleOperations = basketOperations.filter(op => op.cycleId === currentCycleId);
                  
                  if (cycleOperations.length === 0) {
                    return (
                      <div className="text-muted-foreground">
                        Nessuna operazione per il ciclo corrente.
                      </div>
                    );
                  }
                  
                  // Find previous operation, ma solo del ciclo corrente
                  const sortedOperations = [...cycleOperations].sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                  
                  const previousOperation = sortedOperations.find(op => 
                    op.animalsPerKg !== null && op.animalsPerKg > 0
                  );
                  
                  if (previousOperation && previousOperation.animalsPerKg) {
                    const prevAnimalsPerKg = previousOperation.animalsPerKg;
                    const currentAnimalsPerKg = watchAnimalsPerKg;
                    
                    if (prevAnimalsPerKg > currentAnimalsPerKg) {
                      const prevWeight = 1000000 / prevAnimalsPerKg; // mg
                      const currentWeight = 1000000 / currentAnimalsPerKg; // mg
                      const weightGain = ((currentWeight - prevWeight) / prevWeight) * 100;
                      
                      // Calcolo automatico del SGR basato sul mese
                      const currentMonth = new Date().getMonth();
                      const monthNames = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                                      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
                      
                      // Trova SGR per il mese corrente
                      if (sgrs && sgrs.length > 0) {
                        const matchingSgr = sgrs.find(sgr => sgr.month === monthNames[currentMonth]);
                        if (matchingSgr) {
                          // Imposta il valore del SGR automaticamente
                          form.setValue('sgrId', matchingSgr.id);
                          
                          return (
                            <div>
                              <div className="flex items-center mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">SGR selezionato automaticamente: <span className="text-primary font-bold">{matchingSgr.month} - {matchingSgr.percentage}%</span></span>
                              </div>
                              <div className="text-green-600 font-medium pl-6">
                                Crescita rispetto all'ultima operazione: +{weightGain.toFixed(1)}%
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <div className="text-green-600">
                          Crescita rispetto all'operazione precedente: +{weightGain.toFixed(1)}%
                        </div>
                      );
                    } else if (prevAnimalsPerKg < currentAnimalsPerKg) {
                      // Se l'operazione è di tipo "Prima Attivazione", non mostriamo
                      // il messaggio di avviso sul peso poiché è la prima operazione del ciclo
                      const operationType = form.getValues("type");
                      if (operationType === "prima-attivazione") {
                        return (
                          <div className="text-blue-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 01-1-1v-3a1 1 0 112 0v3a1 1 0 01-1 1z" clipRule="evenodd" />
                            </svg>
                            Prima attivazione del ciclo. Peso medio iniziale: {Math.round(1000000 / currentAnimalsPerKg)} mg.
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-amber-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Attenzione: Il numero di animali per kg è aumentato rispetto all'operazione precedente,
                            indicando una possibile diminuzione del peso medio.
                          </div>
                        );
                      }
                    } else {
                      return (
                        <div className="text-blue-600 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 01-1-1v-3a1 1 0 112 0v3a1 1 0 01-1 1z" clipRule="evenodd" />
                          </svg>
                          Nessuna variazione di dimensione rispetto all'operazione precedente.
                        </div>
                      );
                    }
                  }
                  
                  return (
                    <div className="text-muted-foreground flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 01-1-1v-3a1 1 0 112 0v3a1 1 0 01-1 1z" clipRule="evenodd" />
                      </svg>
                      Nessuna operazione precedente per questo cestello/ciclo.
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-muted-foreground pl-1">
                L'SGR verrà calcolato automaticamente quando inserisci il numero di animali per kg.
              </div>
            )}
          </div>
          
          {/* Campo SGR nascosto */}
          <input type="hidden" {...form.register('sgrId')} />

          <FormField
            control={form.control}
            name="lotId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Lotto
                  {watchType === 'prima-attivazione' && (
                    <span className="ml-2 text-red-500 text-xs">*obbligatorio</span>
                  )}
                  {watchType !== 'prima-attivazione' && field.value && (
                    <span className="ml-2 text-blue-500 text-xs">(precompilato)</span>
                  )}
                </FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)}
                  value={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger className={watchType === 'prima-attivazione' ? "border-amber-300" : ""}>
                      <SelectValue placeholder="Seleziona lotto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {watchType !== 'prima-attivazione' && (
                      <SelectItem value="none">Nessun lotto</SelectItem>
                    )}
                    {lots
                      ?.slice() // Creiamo una copia per non modificare l'originale
                      .sort((a, b) => {
                        // Ordina per ID (dal più grande al più piccolo)
                        return b.id - a.id; // Ordine decrescente per ID
                      })
                      .map((lot) => {
                        // Formatta la data di arrivo in formato italiano
                        const arrivalDate = new Date(lot.arrivalDate);
                        const formattedDate = `${arrivalDate.getDate().toString().padStart(2, '0')}/${(arrivalDate.getMonth() + 1).toString().padStart(2, '0')}/${arrivalDate.getFullYear()}`;
                        
                        // Informazioni aggiuntive da mostrare
                        const additionalInfo = [
                          formattedDate,
                          lot.quality,
                          lot.supplierLotNumber ? `Lotto fornitore: ${lot.supplierLotNumber}` : null,
                        ].filter(Boolean).join(" • ");
                        
                        // Informazioni su peso e numero animali
                        const quantityInfo = [];
                        if (lot.animalCount) {
                          quantityInfo.push(`${lot.animalCount.toLocaleString('it-IT')} animali`);
                        }
                        if (lot.weight) {
                          quantityInfo.push(`${lot.weight.toLocaleString('it-IT')} g`);
                        }
                        
                        return (
                          <SelectItem 
                            key={lot.id} 
                            value={lot.id.toString()}
                            className="py-3 px-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium truncate">
                                Lotto #{lot.id} - {lot.supplier}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-full">
                                {additionalInfo}
                              </span>
                              {quantityInfo.length > 0 && (
                                <span className="text-xs text-blue-600 font-semibold mt-1 truncate max-w-full">
                                  {quantityInfo.join(" • ")}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {watchType === 'prima-attivazione' && (
                  <FormDescription className="text-xs">
                    Il lotto è obbligatorio per la Prima Attivazione e sarà utilizzato per le operazioni successive
                  </FormDescription>
                )}
                {watchType !== 'prima-attivazione' && (
                  <FormDescription className="text-xs">
                    Il lotto viene precompilato automaticamente dal lotto usato nella Prima Attivazione di questo ciclo
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Inserisci note aggiuntive" 
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 mt-2">
          <Button 
            variant="outline" 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Reset form button clicked");
              
              // Chiudiamo direttamente il dialogo senza chiedere conferma
              // poiché è più coerente con il comportamento standard dell'applicazione
              form.reset();
              if (onCancel) {
                onCancel();
              }
            }}
          >
            Annulla
          </Button>
          <Button 
            type="button" 
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Save operation button clicked");
              onSubmitForm(e);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-medium"
          >
            {isLoading ? "Salvataggio..." : "Salva Operazione"}
          </Button>
        </div>
      </form>
      
      {/* Dialog di conferma per le operazioni di misura che cambiano la conta degli animali */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attenzione: l'operazione modificherà il conteggio degli animali</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                L'operazione di misurazione che stai registrando attraverso il Registro Operazioni cambierà 
                il conteggio degli animali all'interno della cesta a causa della mortalità specificata.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md my-3">
                <p className="text-amber-800 font-semibold">Suggerimento</p>
                <p className="text-amber-700 text-sm">
                  Per operazioni standard di peso e misurazione, è consigliabile utilizzare i moduli 
                  "Operazioni Rapide" o "Operazioni Drag&Drop", che offrono un'interfaccia più adatta a 
                  questo tipo di operazioni frequenti.
                </p>
              </div>
              <p className="font-semibold">Vuoi procedere comunque con questa operazione?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingValues && onSubmit) {
                onSubmit(pendingValues);
                setPendingValues(null);
              }
              setShowConfirmDialog(false);
            }}>
              Procedi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}