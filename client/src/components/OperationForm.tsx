import { useEffect } from "react";
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
  animalsPerKg: z.coerce.number().optional().nullable(),
  totalWeight: z.coerce.number().optional().nullable(),
  animalCount: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  cycleId: z.number().nullable().optional().refine(
    (val, ctx) => {
      // Se il tipo è prima-attivazione, il ciclo è opzionale
      if (ctx.path && ctx.path.length > 0 && ctx.data && ctx.data.type === 'prima-attivazione') {
        return true;
      }
      // Altrimenti è richiesto
      return val !== null && val !== undefined;
    },
    {
      message: "Seleziona un ciclo",
    }
  ),
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
    date: new Date().toISOString().split('T')[0],
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
  
  // Fetch operations for the selected basket and cycle
  const { data: basketOperations } = useQuery({
    queryKey: ['/api/operations', watchBasketId, watchCycleId],
    enabled: !!watchBasketId && !!watchCycleId,
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
  
  // Calculate SGR when basket and cycle are selected
  useEffect(() => {
    if (!watchBasketId || !watchCycleId || !basketOperations || basketOperations.length < 1) {
      return;
    }
    
    // Sort operations by date (descending)
    const sortedOperations = [...basketOperations].sort((a, b) => 
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
  }, [watchBasketId, watchCycleId, basketOperations, watchAnimalsPerKg, sgrs]);

  // Filter cycles based on selected basket
  const filteredCycles = cycles?.filter(cycle => 
    cycle.basketId === Number(watchBasketId) && cycle.state === 'active'
  ) || [];
  
  // Selected basket data
  const selectedBasket = baskets?.find(b => b.id === Number(watchBasketId));
  
  // Determine if a new cycle needs to be created
  const needsNewCycle = selectedBasket?.state === 'available' && watchBasketId;
  
  // Auto-select cycle when basket is selected and there's only one active cycle
  useEffect(() => {
    if (watchBasketId && filteredCycles && filteredCycles.length === 1 && !watchCycleId && watchType !== 'prima-attivazione') {
      // Automatically select the only available cycle
      form.setValue('cycleId', filteredCycles[0].id);
    }
  }, [watchBasketId, filteredCycles, watchCycleId, watchType, form]);

  // Get operation type options based on basket state
  const allOperationTypes = [
    { value: 'prima-attivazione', label: 'Prima Attivazione' },
    { value: 'pulizia', label: 'Pulizia' },
    { value: 'vagliatura', label: 'Vagliatura' },
    { value: 'trattamento', label: 'Trattamento' },
    { value: 'misura', label: 'Misura' },
    { value: 'vendita', label: 'Vendita' },
    { value: 'selezione-vendita', label: 'Selezione per Vendita' },
  ];
  
  // Filter operation types based on basket state
  const operationTypes = selectedBasket 
    ? (selectedBasket.state === 'available' 
      ? allOperationTypes.filter(op => op.value === 'prima-attivazione') // Only 'Prima Attivazione' for available baskets
      : allOperationTypes) // All operations for active baskets
    : allOperationTypes;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="basketId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Cesta</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(Number(value));
                    // Reset cycle when basket changes
                    form.setValue('cycleId', undefined);
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
                        <SelectItem key={basket.id} value={basket.id.toString()}>
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Operazione</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
                  <FormDescription>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
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
                      className="bg-gray-100"
                    />
                    <div className="text-xs text-muted-foreground mt-1 ml-1">
                      {field.value ? 
                        sizes?.find(s => s.id === field.value)?.name : 
                        "Basato su animali per kg"
                      }
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
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
                    type="number" 
                    placeholder="Inserisci numero animali"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                    className="bg-gray-100"
                  />
                </FormControl>
                <FormDescription>
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
                    type="number" 
                    placeholder="Inserisci animali per kg"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                    className="bg-gray-100"
                  />
                </FormControl>
                <FormDescription>
                  Calcolato automaticamente: 1.000.000 ÷ (animali per kg)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sgrId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SGR</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Select 
                      onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)}
                      value={field.value?.toString() || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona SGR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun SGR</SelectItem>
                        {sgrs?.map((sgr) => (
                          <SelectItem key={sgr.id} value={sgr.id.toString()}>
                            {sgr.month} - {sgr.percentage}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchAnimalsPerKg && basketOperations && basketOperations.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {(() => {
                          // Find previous operation
                          const sortedOperations = [...basketOperations].sort((a, b) => 
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
                              
                              return (
                                <>
                                  Crescita rispetto all'operazione precedente: 
                                  <span className="font-medium text-green-600"> 
                                    +{weightGain.toFixed(1)}%
                                  </span>
                                </>
                              );
                            } else if (prevAnimalsPerKg < currentAnimalsPerKg) {
                              return (
                                <span className="text-amber-600">
                                  Attenzione: Il numero di animali per kg è aumentato rispetto all'operazione precedente,
                                  indicando una possibile diminuzione del peso medio.
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-blue-600">
                                  Nessuna variazione di dimensione rispetto all'operazione precedente.
                                </span>
                              );
                            }
                          }
                          
                          return "Nessuna operazione precedente per questo cestello/ciclo.";
                        })()}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  SGR calcolato automaticamente in base alla crescita e al mese corrente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lotId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lotto</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)}
                  value={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona lotto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessun lotto</SelectItem>
                    {lots?.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id.toString()}>
                        Lotto #{lot.id} - {lot.supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Salva Operazione"}
          </Button>
        </div>
      </form>
    </Form>
  );
}