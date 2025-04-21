import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { operationSchema } from "@shared/schema";

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

type FormValues = z.infer<typeof formSchema>;

interface OperationFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function OperationForm({ 
  onSubmit, 
  defaultValues = {
    date: new Date(),
    type: 'misura',
  },
  isLoading = false
}: OperationFormProps) {
  // Fetch related data
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const watchAnimalsPerKg = form.watch('animalsPerKg');
  const watchAnimalCount = form.watch('animalCount');
  const watchAverageWeight = form.watch('averageWeight');
  const watchBasketId = form.watch('basketId');
  const watchCycleId = form.watch('cycleId');
  const watchType = form.watch('type');
  const watchDate = form.watch('date');
  
  // Fetch operations for the selected basket
  const { data: basketOperations } = useQuery({
    queryKey: ['/api/operations', watchBasketId],
    enabled: !!watchBasketId,
  });
  
  // Calculate average weight and set size when animals per kg changes
  useEffect(() => {
    if (watchAnimalsPerKg && watchAnimalsPerKg > 0) {
      // Calculate average weight
      form.setValue('averageWeight', 1000000 / watchAnimalsPerKg);
      
      // Auto-select size based on animals per kg
      if (sizes && sizes.length > 0) {
        const matchingSize = sizes.find(
          size => 
            size.minAnimalsPerKg <= watchAnimalsPerKg && 
            size.maxAnimalsPerKg >= watchAnimalsPerKg
        );
        
        if (matchingSize) {
          form.setValue('sizeId', matchingSize.id);
        } else {
          form.setValue('sizeId', null);
        }
      }
    } else {
      form.setValue('averageWeight', null);
    }
  }, [watchAnimalsPerKg, sizes]);
  
  // Calculate total weight when animalCount or averageWeight changes
  useEffect(() => {
    if (watchAnimalCount && watchAverageWeight) {
      const totalWeight = (watchAnimalCount * watchAverageWeight) / 1000; // Convert from mg to g
      form.setValue('totalWeight', totalWeight);
    } else {
      form.setValue('totalWeight', null);
    }
  }, [watchAnimalCount, watchAverageWeight, form]);
  
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
  const allOperationTypes = [
    { value: 'prima-attivazione', label: 'Prima Attivazione' },
    { value: 'pulizia', label: 'Pulizia' },
    { value: 'vagliatura', label: 'Vagliatura' },
    { value: 'trattamento', label: 'Trattamento' },
    { value: 'misura', label: 'Misura' },
    { value: 'vendita', label: 'Vendita' },
    { value: 'selezione-vendita', label: 'Selezione per Vendita' },
    { value: 'cessazione', label: 'Cessazione' },
  ];
  
  // Filter operation types based on basket state and cycle availability
  // Filtro più restrittivo per le operazioni
  const operationTypes = selectedBasket 
    ? (selectedBasket.state === 'available' 
      ? allOperationTypes.filter(op => op.value === 'prima-attivazione') // Solo 'Prima Attivazione' per cestelli disponibili
      : selectedBasket.state === 'active' && !selectedBasket.currentCycleId
        ? allOperationTypes // Tutte le operazioni per cestelli attivi SENZA ciclo attivo
        : allOperationTypes.filter(op => op.value !== 'prima-attivazione')) // Tutte le operazioni TRANNE 'Prima Attivazione' per cestelli con ciclo attivo
    : allOperationTypes;

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
    
    // Verifica se c'è un errore di operazione sulla stessa data
    if (operationDateError) {
      console.error("Operazione non permessa sulla stessa data:", operationDateError);
      alert(operationDateError);
      return;
    }
    
    // Ottieni i valori dal form
    const values = form.getValues();
    console.log("Valori form:", values);
    
    // Verifica che ci siano almeno i campi obbligatori
    if (!values.basketId || !values.type || !values.date) {
      console.error("Mancano campi obbligatori", { basketId: values.basketId, type: values.type, date: values.date });
      alert("Compila tutti i campi obbligatori: Cesta, Tipo operazione e Data");
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
      sizeId: values.sizeId ? Number(values.sizeId) : null,
      lotId: values.lotId ? Number(values.lotId) : null,
      // Per prima-attivazione, assicuriamoci che cycleId non sia richiesto
      cycleId: values.type === 'prima-attivazione' ? null : (values.cycleId ? Number(values.cycleId) : null)
    };
    
    console.log("Valori formattati:", formattedValues);
    
    // Chiamata diretta alla funzione di submit
    if (onSubmit) {
      console.log("Chiamata onSubmit con:", formattedValues);
      onSubmit(formattedValues);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmitForm} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <FormField
            control={form.control}
            name="basketId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Cesta e FLUPSY</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                    // Reset cycle when basket changes
                    form.setValue('cycleId', undefined);
                    
                    // Verifica lo stato del cestello selezionato
                    const selectedBasket = baskets?.find(b => b.id === Number(value));
                    if (selectedBasket?.state === 'available') {
                      // Se la cesta è disponibile, imposta automaticamente il tipo a "prima-attivazione"
                      form.setValue('type', 'prima-attivazione');
                    }
                  }}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona una cesta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {baskets?.map((basket) => {
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
                          className={basket.state === 'active' && basket.currentCycleId ? "text-green-700 font-medium" : basket.state === 'available' ? "text-amber-600" : ""}
                        >
                          {basket.state === 'active' && basket.currentCycleId
                            ? "🟢 " 
                            : basket.state === 'available' 
                              ? "🟠 " 
                              : ""}
                          Cesta #{basket.physicalNumber} - {basket.flupsyName || `FLUPSY #${basket.flupsyId}`}{positionInfo}{cycleInfo}{stateInfo}
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

{watchType === 'prima-attivazione' ? (
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
          ) : (
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
                          Ciclo #{cycle.id}
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
          )}

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia Operazione</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={selectedBasket?.state === 'available'} // Disabilitato se il cestello è disponibile
                >
                  <FormControl>
                    <SelectTrigger className={selectedBasket?.state === 'available' ? "bg-amber-50 border-amber-200 text-amber-700" : ""}>
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {operationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {selectedBasket?.state === 'available' ? 
                    "Per ceste disponibili è possibile eseguire solo operazioni di Prima Attivazione" : 
                    selectedBasket?.state === 'active' && filteredCycles.length > 0 && 
                    "L'operazione Prima Attivazione è disponibile solo per cestelli senza ciclo attivo"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
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
                      value={field.value ? 
                        sizes?.find(s => s.id === field.value)?.code || "Nessuna taglia" : 
                        "Calcolato automaticamente"
                      }
                      readOnly
                      className="bg-sky-50 border-sky-100 font-medium text-sky-700"
                    />
                    <div className="text-xs text-sky-600 mt-1 ml-1">
                      {field.value ? 
                        sizes?.find(s => s.id === field.value)?.name : 
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

          <FormField
            control={form.control}
            name="animalCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Animali</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Inserisci numero animali"
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Totale (g)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="Calcolato automaticamente"
                    value={field.value ? Number(field.value).toFixed(2) : ''}
                    readOnly
                    className="bg-amber-50 border-amber-100 font-medium text-amber-700"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Calcolato automaticamente: (Numero animali × Peso medio) ÷ 1000
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
                <FormLabel>Animali per Kg</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Inserisci animali per kg"
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="averageWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Medio (mg)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Calcolato automaticamente"
                    value={field.value ? Math.round(field.value) : ''}
                    readOnly
                    className="bg-green-50 border-green-100 font-medium text-green-700"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Calcolato automaticamente: 1.000.000 ÷ (animali per kg)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SGR viene determinato automaticamente, mostriamo solo le informazioni sulla crescita */}
          <div className="col-span-2 mb-2">
            <h3 className="text-base font-semibold mb-1">Informazioni SGR</h3>
            {watchAnimalsPerKg && basketOperations && basketOperations.length > 0 ? (
              <div className="p-3 rounded-md border bg-muted/20">
                {(() => {
                  // Ottieni il ciclo selezionato o corrente
                  const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
                  const currentCycleId = selectedBasket?.currentCycleId || watchCycleId;
                  
                  if (!currentCycleId) {
                    return (
                      <div className="text-muted-foreground">
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
                    {lots?.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id.toString()}>
                        Lotto #{lot.id} - {lot.supplier}
                      </SelectItem>
                    ))}
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
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button 
            type="button" 
            disabled={isLoading || !!operationDateError}
            onClick={onSubmitForm}
            className="bg-primary hover:bg-primary/90 text-white font-medium"
          >
            {isLoading ? "Salvataggio..." : "Salva Operazione"}
          </Button>
        </div>
      </form>
    </Form>
  );
}