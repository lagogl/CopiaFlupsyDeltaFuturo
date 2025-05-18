import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { AlertTriangle, Loader2, ClipboardList, MapPin, Link } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  lotId: z.number().nullable().optional(),
  animalCount: z.number().nullable().optional(),
  totalWeight: z.number().nullable().optional(),
  animalsPerKg: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Campi specifici per l'operazione di misurazione
  sampleWeight: z.number().nullable().optional(),
  liveAnimals: z.number().nullable().optional(),
  deadCount: z.number().nullable().optional(),
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

export default function OperationForm({
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
      animalCount: null,
      totalWeight: null,
      animalsPerKg: null,
      notes: "",
      sampleWeight: null,
      liveAnimals: null,
      deadCount: 0,
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
    queryKey: ['/api/baskets'],
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
      setFlupsyBaskets(filtered);
      setIsLoadingFlupsyBaskets(false);
    } else {
      setFlupsyBaskets([]);
    }
  }, [watchFlupsyId, baskets]);

  // Determina le operazioni disponibili in base allo stato del cestello
  const [basketOperations, setBasketOperations] = useState<{value: string, label: string}[]>([]);
  
  useEffect(() => {
    if (watchBasketId) {
      // Trova il cestello selezionato
      const selectedBasket = baskets?.find((b: any) => b.id === watchBasketId);
      console.log("Stato cestello selezionato:", selectedBasket?.state);
      
      // Verifica se il cestello ha un ciclo attivo
      const hasCycle = !!selectedBasket?.currentCycleId;
      console.log("Cestello ha ciclo attivo?", hasCycle ? "Sì" : "No");
      
      // Determina le operazioni disponibili
      let availableOperations = [];
      
      if (hasCycle) {
        // Cestello con ciclo attivo
        availableOperations = [
          { value: 'pulizia', label: 'Pulizia' },
          { value: 'misura', label: 'Misura' },
          { value: 'peso', label: 'Peso' },
          { value: 'vagliatura', label: 'Vagliatura' },
          { value: 'trattamento', label: 'Trattamento' },
          { value: 'vendita', label: 'Vendita' },
          { value: 'cessazione', label: 'Cessazione' }
        ];
      } else {
        // Cestello senza ciclo attivo (disponibile)
        availableOperations = [
          { value: 'prima-attivazione', label: 'Prima Attivazione' },
          { value: 'misura', label: 'Misura' },
          { value: 'vendita', label: 'Vendita' }
        ];
      }
      
      setBasketOperations(availableOperations);
      console.log("Operazioni disponibili:", availableOperations);
    } else {
      const defaultOperations = [
        { value: 'prima-attivazione', label: 'Prima Attivazione' },
        { value: 'misura', label: 'Misura' },
        { value: 'vendita', label: 'Vendita' }
      ];
      console.log("Nessun cestello selezionato - tutte operazioni:", defaultOperations);
      setBasketOperations(defaultOperations);
    }
  }, [watchBasketId, baskets]);

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

  // Calculate average weight and set size when animals per kg changes
  useEffect(() => {
    if (watchAnimalsPerKg && watchAnimalsPerKg > 0) {
      // Calculate average weight
      const averageWeight = 1000000 / watchAnimalsPerKg;
      
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

  // Calcola valori derivati per misurazione
  useEffect(() => {
    if (watchType === 'misura') {
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
        return;
      }
      
      // Verifica se lotId è richiesto per Prima Attivazione
      if (values.type === 'prima-attivazione' && !values.lotId) {
        console.error('Campo lotId mancante per operazione di Prima Attivazione');
        return;
      }
      
      console.log('Chiamata onSubmit con i valori finali:', values);
      // Chiama la funzione onSubmit passata come prop
      onSubmit(values);
    } catch (error) {
      console.error('Errore durante il submit del form:', error);
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
      alert("Compila tutti i campi obbligatori: FLUPSY, Cesta, Tipo operazione e Data");
      return;
    }
    
    // Verifica lotto per prima-attivazione
    if (values.type === 'prima-attivazione' && !values.lotId) {
      console.error("Manca il lotto per operazione di Prima Attivazione");
      alert("Il lotto è obbligatorio per le operazioni di Prima Attivazione");
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
    }
  };

  // Seleziona la tab iniziale in base al tipo di operazione
  const [activeTab, setActiveTab] = useState("dati");
  
  useEffect(() => {
    if (watchType === 'misura') {
      setActiveTab("misura");
    } else if (watchType === 'peso') {
      setActiveTab("peso");
    } else {
      setActiveTab("dati");
    }
  }, [watchType]);

  return (
    <Form {...form}>
      <form onSubmit={onSubmitForm}>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex text-sm">
                <ClipboardList className="h-4 w-4 mr-1" /> Dati Operazione
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
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
                        
                        // Cambia la tab attiva in base al tipo di operazione
                        if (value === 'misura') {
                          setActiveTab("misura");
                        } else if (value === 'peso') {
                          setActiveTab("peso");
                        }
                        
                        // Reset campi specifici in base al tipo di operazione
                        if (value === 'prima-attivazione') {
                          form.setValue('cycleId', null);
                        } else if (value === 'peso') {
                          form.setValue('totalWeight', null);
                          form.setValue('animalsPerKg', null);
                          form.setValue('sizeId', null);
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
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={
                            !watchBasketId ? "Seleziona prima un cestello" : "Seleziona tipo"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex text-sm">
                <MapPin className="h-4 w-4 mr-1" /> Posizionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {/* FLUPSY */}
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
                        <SelectTrigger className="h-9 text-sm">
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cestello */}
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
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={watchFlupsyId ? 
                            (flupsyBaskets.length > 0 ? "Seleziona cestello" : "Nessun cestello") : 
                            "Seleziona prima FLUPSY"} 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {flupsyBaskets.length > 0 ? (
                          flupsyBaskets.map((basket) => {
                            // Cercare l'ultima operazione per il cestello
                            const lastOp = operations && operations.length > 0 ? 
                              operations.filter((op: any) => 
                                op.basketId === basket.id && 
                                op.cycleId === basket.currentCycleId
                              ).sort((a: any, b: any) => 
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                              )[0] : null;
                            
                            // Trova la taglia dell'ultima operazione
                            const sizeInfo = lastOp?.sizeId && sizes ? 
                              sizes.find((s: any) => s.id === lastOp.sizeId)?.name : '';
                            
                            return (
                              <SelectItem key={basket.id} value={basket.id.toString()} className="py-1.5">
                                <div>
                                  <span className="font-medium">
                                    #{basket.physicalNumber} {basket.row && basket.position ? `(${basket.row}-${basket.position})` : ''}
                                  </span>
                                  {basket.currentCycleId ? (
                                    <span className="ml-1 text-green-600 text-xs">● Attivo</span>
                                  ) : (
                                    <span className="ml-1 text-gray-500 text-xs">○ Disponibile</span>
                                  )}
                                  
                                  {lastOp && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      Ultima op: {lastOp.type} ({format(new Date(lastOp.date), 'dd/MM')})
                                      {lastOp.animalCount && (
                                        <span> • {lastOp.animalCount.toLocaleString('it-IT')} animali</span>
                                      )}
                                      {sizeInfo && (
                                        <span> • {sizeInfo}</span>
                                      )}
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

              {/* Ciclo (condizionale) */}
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
                          <SelectTrigger className="h-9 text-sm">
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
            </CardContent>
          </Card>

          {watchType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex text-sm">
                  <Link className="h-4 w-4 mr-1" /> Riferimenti
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {/* Lotto (solo per prima-attivazione) */}
                {watchType === 'prima-attivazione' && (
                  <FormField
                    control={form.control}
                    name="lotId"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Lotto <span className="text-red-500">*</span></FormLabel>
                        <Select
                          disabled={isLoading}
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Seleziona lotto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {lots?.slice().sort((a: any, b: any) => b.id - a.id).map((lot: any) => (
                              <SelectItem key={lot.id} value={lot.id.toString()}>
                                #{lot.id} - {lot.supplier} ({format(new Date(lot.arrivalDate), 'dd/MM/yyyy')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Tasso SGR (condizionale) */}
                {watchType && watchType !== 'prima-attivazione' && watchType !== 'cessazione' && (
                  <FormField
                    control={form.control}
                    name="sgrId"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Tasso SGR</FormLabel>
                        <Select
                          disabled={isLoading || !sgrs || sgrs.length === 0}
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Taglia visibile solo per prima-attivazione come campo modificabile */}
                {watchType === 'prima-attivazione' && (
                  <FormField
                    control={form.control}
                    name="sizeId"
                    render={({ field }) => (
                      <FormItem className="mb-1">
                        <FormLabel className="text-xs font-medium">Taglia</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || ''}
                            onValueChange={(value) => field.onChange(Number(value))}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Seleziona taglia" />
                            </SelectTrigger>
                            <SelectContent>
                              {sizes?.map((size: any) => (
                                <SelectItem key={size.id} value={size.id.toString()}>
                                  {size.name} {size.minAnimalsPerKg !== undefined ? 
                                  `(${size.minAnimalsPerKg}-${size.maxAnimalsPerKg})` : 
                                  '(range non specificato)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {(watchType === 'peso' || watchType === 'misura') && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="peso">Dati Peso</TabsTrigger>
                <TabsTrigger value="misura">Dati Misurazione</TabsTrigger>
              </TabsList>
              
              {/* TAB: Dati Peso */}
              <TabsContent value="peso" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Peso totale */}
                  <FormField
                    control={form.control}
                    name="totalWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Peso totale (grammi) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Inserisci peso totale"
                            className="h-9 text-sm"
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
                        <FormDescription className="text-xs">
                          Massimo 1.000.000 grammi (1 tonnellata)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Animali per kg */}
                  <FormField
                    control={form.control}
                    name="animalsPerKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Animali per kg <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Animali per kg"
                            className="h-9 text-sm"
                            value={field.value === null || field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value === '') {
                                field.onChange(null);
                              } else {
                                const numValue = parseInt(value, 10);
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

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <h4 className="text-xs font-medium text-slate-700 mb-2">Valori calcolati automaticamente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Numero animali calcolato */}
                    <FormField
                      control={form.control}
                      name="animalCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Numero animali</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              className="h-9 text-sm bg-slate-50"
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

                    {/* Peso medio calcolato */}
                    {watchAnimalsPerKg > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium">Peso medio (mg)</h5>
                        <Input 
                          type="text" 
                          className="h-9 text-sm bg-slate-50"
                          readOnly
                          value={watchAnimalsPerKg ? 
                            (1000000 / watchAnimalsPerKg).toLocaleString('it-IT', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            }) : ''}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* TAB: Dati Misurazione */}
              <TabsContent value="misura" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Peso sample */}
                  <FormField
                    control={form.control}
                    name="sampleWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Grammi sample
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Peso in grammi"
                            className="h-9 text-sm"
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
                  
                  {/* Animali vivi */}
                  <FormField
                    control={form.control}
                    name="liveAnimals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Numero animali vivi</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Animali vivi"
                            className="h-9 text-sm"
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
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Animali morti */}
                  <FormField
                    control={form.control}
                    name="deadCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Numero animali morti</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Animali morti"
                            className="h-9 text-sm"
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
                  
                  {/* Totale campione */}
                  {watchLiveAnimals !== null && (deadCount !== null || deadCount === 0) && (
                    <FormField
                      control={form.control}
                      name="totalSample"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Totale animali campione</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              className="h-9 text-sm bg-slate-50"
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
                
                {/* Peso totale */}
                <FormField
                  control={form.control}
                  name="totalWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Peso totale (grammi)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="Peso totale cestello"
                          className="h-9 text-sm"
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
                
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <h4 className="text-xs font-medium text-slate-700 mb-2">Valori calcolati automaticamente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Tasso di mortalità */}
                    {watchTotalSample > 0 && (
                      <FormField
                        control={form.control}
                        name="mortalityRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Mortalità (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                className="h-9 text-sm bg-slate-50"
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
                    
                    {/* Animali per kg */}
                    {watchSampleWeight > 0 && watchLiveAnimals > 0 && (
                      <FormField
                        control={form.control}
                        name="animalsPerKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Animali per kg</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                className="h-9 text-sm bg-slate-50"
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
                    
                    {/* Peso medio */}
                    {watchAnimalsPerKg > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium">Peso medio (mg)</h5>
                        <Input 
                          type="text" 
                          className="h-9 text-sm bg-slate-50"
                          readOnly
                          value={watchAnimalsPerKg ? 
                            (1000000 / watchAnimalsPerKg).toLocaleString('it-IT', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            }) : ''}
                        />
                      </div>
                    )}
                    
                    {/* Numero animali */}
                    <FormField
                      control={form.control}
                      name="animalCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Numero animali</FormLabel>
                          <div className="flex flex-col">
                            <FormControl>
                              <Input 
                                type="text" 
                                className={`h-9 text-sm ${!watchManualCountAdjustment ? 'bg-slate-50' : ''}`}
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
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Inserisci eventuali note sull'operazione..."
                        className="resize-none h-24 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Form buttons */}
          <div className="flex gap-3 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !watchBasketId || !watchFlupsyId || !watchType || !watchDate}
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