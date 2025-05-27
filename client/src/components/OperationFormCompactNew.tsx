import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  X, PlusCircle, Loader2, AlertTriangle, Calculator
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Schema di validazione compatto
const operationSchema = z.object({
  date: z.date({ required_error: "Data obbligatoria" }),
  type: z.string().min(1, "Tipo operazione obbligatorio"),
  basketId: z.number({ required_error: "Cestello obbligatorio" }),
  flupsyId: z.number({ required_error: "FLUPSY obbligatorio" }),
  cycleId: z.number().nullable(),
  sizeId: z.number().nullable(),
  sgrId: z.number().nullable(),
  lotId: z.number().nullable(),
  animalCount: z.number().nullable(),
  totalWeight: z.number().nullable(),
  animalsPerKg: z.number().nullable(),
  notes: z.string(),
  sampleWeight: z.number().nullable(),
  liveAnimals: z.number().nullable(),
  deadCount: z.number().min(0).default(0),
  totalSample: z.number().nullable(),
  mortalityRate: z.number().nullable(),
  manualCountAdjustment: z.boolean().default(false),
  averageWeight: z.number().nullable(),
});

type OperationFormData = z.infer<typeof operationSchema>;

interface OperationFormCompactProps {
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedFlupsyId?: number;
  preSelectedBasketId?: number;
}

export default function OperationFormCompact({
  onClose,
  onSuccess,
  preSelectedFlupsyId,
  preSelectedBasketId,
}: OperationFormCompactProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);

  // Queries per i dati
  const { data: baskets } = useQuery({ queryKey: ['/api/baskets'] });
  const { data: flupsys } = useQuery({ queryKey: ['/api/flupsys'] });
  const { data: cycles } = useQuery({ queryKey: ['/api/cycles'] });
  const { data: sizes } = useQuery({ queryKey: ['/api/sizes'] });
  const { data: lots } = useQuery({ queryKey: ['/api/lots'] });
  const { data: sgrs } = useQuery({ queryKey: ['/api/sgr'] });
  const { data: operations } = useQuery({ queryKey: ['/api/operations'] });

  const form = useForm<OperationFormData>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      date: new Date(),
      type: "",
      basketId: preSelectedBasketId || undefined,
      flupsyId: preSelectedFlupsyId || undefined,
      cycleId: null,
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
      averageWeight: null,
    },
  });

  // Watch dei valori del form
  const watchType = form.watch('type');
  const watchBasketId = form.watch('basketId');
  const watchFlupsyId = form.watch('flupsyId');
  const watchAnimalsPerKg = form.watch('animalsPerKg');
  const watchSampleWeight = form.watch('sampleWeight');
  const watchLiveAnimals = form.watch('liveAnimals');
  const watchTotalSample = form.watch('totalSample');
  const deadCount = form.watch('deadCount');

  // Logica cestello selezionato
  const selectedBasket = baskets?.find((b: any) => b.id === watchBasketId);
  const isDisabledOperationType = selectedBasket?.state === 'available';

  // Auto-impostazione Prima Attivazione per cestelli disponibili
  useEffect(() => {
    if (selectedBasket?.state === 'available' && watchType !== 'prima-attivazione') {
      console.log("🚀 CESTELLO DISPONIBILE - Auto-impostazione Prima Attivazione");
      form.setValue('type', 'prima-attivazione');
      console.log("✅ Tipo operazione impostato automaticamente a 'Prima Attivazione'");
    }
  }, [selectedBasket, watchType, form]);

  // Tipi di operazione filtrati
  const operationTypes = [
    { value: 'prima-attivazione', label: 'Prima Attivazione' },
    { value: 'misura', label: 'Misurazione' },
    { value: 'peso', label: 'Peso' },
    { value: 'trasferimento', label: 'Trasferimento' },
    { value: 'pulizia', label: 'Pulizia' },
    { value: 'vendita', label: 'Vendita' },
  ];

  const filteredOperationTypes = selectedBasket?.state === 'available' 
    ? operationTypes.filter(type => type.value === 'prima-attivazione')
    : operationTypes;

  // Calcoli automatici per misurazione e prima attivazione
  useEffect(() => {
    if (watchType === 'misura' || watchType === 'prima-attivazione') {
      // Calcola totale campione
      if (watchLiveAnimals !== null && deadCount !== null) {
        const totalSample = watchLiveAnimals + deadCount;
        form.setValue('totalSample', totalSample);

        // Calcola mortalità
        if (totalSample > 0) {
          const mortalityRate = (deadCount / totalSample) * 100;
          form.setValue('mortalityRate', Math.round(mortalityRate * 100) / 100);
        }
      }

      // Calcola animali per kg
      if (watchSampleWeight && watchLiveAnimals && watchSampleWeight > 0) {
        const animalsPerKg = Math.round((watchLiveAnimals / watchSampleWeight) * 1000);
        form.setValue('animalsPerKg', animalsPerKg);

        // Calcola peso medio
        const avgWeight = (watchSampleWeight / watchLiveAnimals) * 1000;
        form.setValue('averageWeight', Math.round(avgWeight * 1000) / 1000);
      }
    }
  }, [watchType, watchLiveAnimals, deadCount, watchSampleWeight, form]);

  // Auto-selezione taglia per prima attivazione
  useEffect(() => {
    if ((watchType === 'misura' || watchType === 'prima-attivazione') && watchAnimalsPerKg > 0 && sizes) {
      import("@/lib/utils").then(({ findSizeByAnimalsPerKg }) => {
        const selectedSize = findSizeByAnimalsPerKg(watchAnimalsPerKg, sizes);
        if (selectedSize) {
          console.log(`Taglia trovata: ${selectedSize.code} (ID: ${selectedSize.id})`);
          form.setValue('sizeId', selectedSize.id);
        }
      });
    }
  }, [watchAnimalsPerKg, sizes, watchType, form]);

  // Submit del form
  const onSubmit = async (values: OperationFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Errore durante la creazione');

      toast({
        title: "Operazione creata",
        description: "L'operazione è stata registrata con successo.",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione dell'operazione.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[95vh] flex flex-col">
        {/* Header fisso */}
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <PlusCircle className="h-4 w-4 mr-2" />
            Registra Nuova Operazione
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenuto principale - senza scroll */}
        <div className="flex-1 p-4 overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              
              {/* Sezione principale - griglia compatta */}
              <div className="grid grid-cols-12 gap-3 mb-4">
                
                {/* Prima riga: dati base */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tipo *</FormLabel>
                        <Select disabled={isDisabledOperationType} value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredOperationTypes.map((type) => (
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
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Data *</FormLabel>
                        <FormControl>
                          <DatePicker date={field.value} setDate={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="flupsyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">FLUPSY *</FormLabel>
                        <Select 
                          disabled={!!preSelectedFlupsyId}
                          value={field.value?.toString() || ''} 
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="FLUPSY" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {flupsys?.map((flupsy: any) => (
                              <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                                {flupsy.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="basketId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cestello *</FormLabel>
                        <Select
                          disabled={!watchFlupsyId}
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Cestello" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(baskets as any[])?.filter((basket: any) => basket.flupsyId === watchFlupsyId)
                              .map((basket: any) => (
                                <SelectItem key={basket.id} value={basket.id.toString()}>
                                  #{basket.physicalNumber}({basket.row}{basket.position})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  {watchType === 'prima-attivazione' && (
                    <FormField
                      control={form.control}
                      name="lotId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Lotto *</FormLabel>
                          <Select value={field.value?.toString() || ''} onValueChange={(value) => field.onChange(Number(value))}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Lotto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lots?.slice().sort((a: any, b: any) => b.id - a.id).map((lot: any) => (
                                <SelectItem key={lot.id} value={lot.id.toString()}>
                                  #{lot.id} - {lot.supplier}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Sezione misurazione - solo se necessaria */}
              {(watchType === 'misura' || watchType === 'prima-attivazione') && (
                <div className="bg-purple-50 p-3 rounded mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-purple-700 flex items-center">
                    <Calculator className="h-4 w-4 mr-1" /> Calcolatrice
                  </h3>
                  
                  <div className="grid grid-cols-12 gap-2">
                    {/* Input campione */}
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="sampleWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Peso campione (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001"
                                className="h-8 text-xs"
                                placeholder="1.0"
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="liveAnimals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Animali vivi</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                className="h-8 text-xs"
                                placeholder="1500"
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="deadCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Animali morti</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                className="h-8 text-xs"
                                placeholder="0"
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Risultati automatici */}
                    <div className="col-span-2">
                      <FormLabel className="text-xs">Mortalità (%)</FormLabel>
                      <Input 
                        className="h-8 text-xs bg-amber-50" 
                        readOnly 
                        value={form.watch('mortalityRate')?.toFixed(2) || '0.00'} 
                      />
                    </div>

                    <div className="col-span-2">
                      <FormLabel className="text-xs">Animali/kg</FormLabel>
                      <Input 
                        className="h-8 text-xs bg-amber-50" 
                        readOnly 
                        value={watchAnimalsPerKg?.toLocaleString('it-IT') || ''} 
                      />
                    </div>

                    <div className="col-span-2">
                      <FormLabel className="text-xs">Taglia</FormLabel>
                      <Input 
                        className="h-8 text-xs bg-amber-50" 
                        readOnly 
                        value={(() => {
                          if (!form.watch('sizeId') || !sizes) return '';
                          const size = sizes.find((s: any) => s.id === form.watch('sizeId'));
                          return size ? size.code : '';
                        })()} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="mb-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Inserisci eventuali note sull'operazione..."
                          className="h-16 text-xs resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer con pulsanti */}
              <div className="flex justify-end space-x-2 mt-auto pt-3 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registra Operazione
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}