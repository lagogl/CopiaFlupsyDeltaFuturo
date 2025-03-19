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

  // Get operation type options
  const operationTypes = [
    { value: 'prima-attivazione', label: 'Prima Attivazione' },
    { value: 'pulizia', label: 'Pulizia' },
    { value: 'vagliatura', label: 'Vagliatura' },
    { value: 'trattamento', label: 'Trattamento' },
    { value: 'misura', label: 'Misura' },
    { value: 'vendita', label: 'Vendita' },
    { value: 'selezione-vendita', label: 'Selezione per Vendita' },
  ];

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
                    {baskets?.filter(b => b.state === 'available').map((basket) => (
                      <SelectItem key={basket.id} value={basket.id.toString()}>
                        Cesta #{basket.physicalNumber}{basket.row && basket.position ? ` - Fila ${basket.row} Pos. ${basket.position}` : ''}
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
                  <div className="relative">
                    <Input
                      value={field.value ? 
                        sizes?.find(s => s.id === field.value)?.code || "Nessuna taglia" : 
                        "Calcolato automaticamente"
                      }
                      readOnly
                      className="bg-gray-100"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-gray-500">
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
                <Select 
                  onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)}
                  value={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona SGR" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessun SGR</SelectItem>
                    {sgrs?.map((sgr) => (
                      <SelectItem key={sgr.id} value={sgr.id.toString()}>
                        {sgr.month} - {sgr.percentage}%
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