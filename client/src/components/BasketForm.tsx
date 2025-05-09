import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import BasketExistsCheck from "./BasketExistsCheck";
import BasketPositionCheck from "./BasketPositionCheck";

// Create a schema for basket validation
const basketFormSchema = z.object({
  physicalNumber: z.coerce.number()
    .int()
    .positive("Il numero della cesta deve essere positivo")
    .min(1, "Il numero della cesta deve essere maggiore di 0")
    .max(20, "Il numero della cesta non può superare 20"),
  flupsyId: z.coerce.number()
    .int()
    .positive("Devi selezionare un'unità FLUPSY valida"),
  row: z.string()
    .min(1, "Seleziona la fila (DX o SX)"),
  position: z.coerce.number()
    .int()
    .positive("La posizione deve essere un numero positivo")
    .min(1, "La posizione deve essere almeno 1"),
});

type BasketFormValues = z.infer<typeof basketFormSchema>;

interface BasketFormProps {
  onSubmit: (values: BasketFormValues) => void;
  defaultValues?: Partial<BasketFormValues>;
  isLoading?: boolean;
  basketId?: number | null;
}

interface NextPositionData {
  maxPositions: number;
  availablePositions: {
    [key: string]: number;
  }
}

export default function BasketForm({ 
  onSubmit, 
  defaultValues = { },
  isLoading = false,
  basketId = null
}: BasketFormProps) {
  const form = useForm<BasketFormValues>({
    resolver: zodResolver(basketFormSchema),
    defaultValues,
  });
  
  // Inizializza senza valori preselezionati a meno che non sia in modalità modifica (basketId presente)
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(
    basketId ? defaultValues.flupsyId || null : null
  );
  const [selectedRow, setSelectedRow] = useState<string | null>(
    basketId ? defaultValues.row || null : null
  );
  const [isBasketNumberValid, setIsBasketNumberValid] = useState(true);
  const [isPositionValid, setIsPositionValid] = useState(true);
  const [maxPositions, setMaxPositions] = useState<number>(10); // Default a 10
  const [availablePositionsCount, setAvailablePositionsCount] = useState<{DX: number, SX: number}>({ DX: 0, SX: 0 });

  // Fetch FLUPSY units
  const { data: flupsys = [], isLoading: isFlupsysLoading } = useQuery<any[]>({
    queryKey: ['/api/flupsys'],
  });
  
  // Fetch next available basket number for selected FLUPSY
  const { data: nextBasketNumber, isLoading: isNextNumberLoading } = useQuery<{nextNumber: number}>({
    queryKey: ['/api/baskets/next-number', selectedFlupsyId],
    queryFn: async () => {
      if (!selectedFlupsyId) return { nextNumber: 1 };
      const response = await fetch(`/api/baskets/next-number/${selectedFlupsyId}`);
      if (!response.ok) {
        throw new Error('Errore nel recupero del prossimo numero di cesta disponibile');
      }
      return await response.json();
    },
    enabled: !!selectedFlupsyId && !basketId, // Only run this query if a FLUPSY is selected and we're not editing
  });
  
  // Fetch next available positions for selected FLUPSY
  const { data: nextPositionData, isLoading: isNextPositionLoading } = useQuery<NextPositionData>({
    queryKey: ['/api/baskets/next-position', selectedFlupsyId, selectedRow],
    queryFn: async () => {
      if (!selectedFlupsyId) return { maxPositions: 10, availablePositions: {} };
      
      let url = `/api/baskets/next-position/${selectedFlupsyId}`;
      if (selectedRow) {
        url += `?row=${selectedRow}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Errore nel recupero delle posizioni disponibili');
      }
      return await response.json();
    },
    enabled: !!selectedFlupsyId, // Execute when a FLUPSY is selected
  });

  // Calcola il numero di posizioni disponibili quando i dati di posizione sono disponibili
  useEffect(() => {
    if (nextPositionData && nextPositionData.availablePositions) {
      const available = { DX: 0, SX: 0 };
      
      // Conta quante posizioni sono disponibili per ogni fila
      if (nextPositionData.availablePositions['DX'] !== undefined) {
        // Se -1, non ci sono posizioni disponibili
        available.DX = nextPositionData.availablePositions['DX'] === -1 
          ? 0 
          : nextPositionData.maxPositions - (nextPositionData.availablePositions['DX'] - 1);
      }
      
      if (nextPositionData.availablePositions['SX'] !== undefined) {
        // Se -1, non ci sono posizioni disponibili
        available.SX = nextPositionData.availablePositions['SX'] === -1 
          ? 0 
          : nextPositionData.maxPositions - (nextPositionData.availablePositions['SX'] - 1);
      }
      
      setAvailablePositionsCount(available);
    }
  }, [nextPositionData]);

  // NON impostiamo più un valore FLUPSY predefinito, l'utente deve selezionarlo
  // Manteniamo il caso particolare di modifica di un cestello esistente (basketId presente)
  useEffect(() => {
    if (basketId && defaultValues.flupsyId && flupsys && flupsys.length > 0) {
      form.setValue('flupsyId', defaultValues.flupsyId);
      setSelectedFlupsyId(defaultValues.flupsyId);
    }
  }, [flupsys, form, basketId, defaultValues.flupsyId]);
  
  // Set the next available basket number when it's fetched
  useEffect(() => {
    if (nextBasketNumber && nextBasketNumber.nextNumber && !basketId) {
      form.setValue('physicalNumber', nextBasketNumber.nextNumber);
    }
  }, [nextBasketNumber, form, basketId]);
  
  // Update maxPositions when next position data is fetched
  useEffect(() => {
    if (nextPositionData && nextPositionData.maxPositions) {
      setMaxPositions(nextPositionData.maxPositions);
      
      // Aggiorna lo schema di validazione con il valore massimo di posizione
      basketFormSchema.shape.position = z.coerce.number()
        .int()
        .positive("La posizione deve essere un numero positivo")
        .min(1, "La posizione deve essere almeno 1")
        .max(nextPositionData.maxPositions, `La posizione non può superare ${nextPositionData.maxPositions} (limite massimo di questo FLUPSY)`);
      
      // Se la posizione corrente è superiore al massimo, azzera il valore
      const currentPosition = form.getValues('position');
      if (currentPosition && currentPosition > nextPositionData.maxPositions) {
        form.setValue('position', undefined);
      }
    }
  }, [nextPositionData, form]);
  
  // Suggerisci automaticamente la posizione disponibile quando si seleziona una fila
  useEffect(() => {
    // Skip if we're editing an existing basket
    if (basketId) return;
    
    if (selectedRow && nextPositionData && nextPositionData.availablePositions) {
      const nextPos = nextPositionData.availablePositions[selectedRow];
      
      // Se c'è una posizione disponibile (non -1), impostala automaticamente
      if (nextPos !== undefined && nextPos !== -1) {
        form.setValue('position', nextPos);
      }
    }
  }, [selectedRow, nextPositionData, form, basketId]);

  // Define custom submit handler to prevent submission if there are validation errors
  const handleSubmit = (e: React.FormEvent) => {
    if (!isBasketNumberValid || !isPositionValid) {
      e.preventDefault();
      toast({
        title: "Errore di validazione",
        description: "Correggi gli errori prima di salvare",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica che la posizione non superi il limite massimo
    const position = form.getValues('position');
    if (position > maxPositions) {
      e.preventDefault();
      toast({
        title: "Posizione non valida",
        description: `La posizione non può superare ${maxPositions} (limite massimo di questo FLUPSY)`,
        variant: "destructive"
      });
      return;
    }
    
    form.handleSubmit(onSubmit)(e);
  };

  // Check if form is valid to enable/disable submit button
  const isFormValid = isBasketNumberValid && isPositionValid;
  
  // Ottieni il valore FLUPSY selezionato come oggetto completo
  const selectedFlupsy = selectedFlupsyId ? flupsys.find((f: any) => f.id === selectedFlupsyId) : null;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
      
        {/* Informazioni sul limite massimo di posizioni - Mostra solo quando c'è un FLUPSY selezionato */}
        {selectedFlupsyId && selectedFlupsy && (
          <div className="bg-blue-50 p-3 rounded-md flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Informazioni sul FLUPSY selezionato</p>
              <p>Nome: <span className="font-medium">{selectedFlupsy.name}</span></p>
              <p>Posizioni massime per fila: <span className="font-medium">{Math.floor((selectedFlupsy.maxPositions || 10) / 2)}</span></p>
              <p>Posizioni disponibili: <span className="font-medium">Destra {availablePositionsCount.DX}, Sinistra {availablePositionsCount.SX}</span></p>
            </div>
          </div>
        )}
      
        <BasketExistsCheck 
          flupsyId={form.watch('flupsyId')} 
          basketNumber={form.watch('physicalNumber')}
          onValidationChange={setIsBasketNumberValid}
        />
        
        {/* Validazione della posizione se sono compilati tutti i campi necessari */}
        <BasketPositionCheck
          flupsyId={form.watch('flupsyId')}
          row={form.watch('row')}
          position={form.watch('position')}
          basketId={basketId}
          onValidationChange={setIsPositionValid}
        />
      
        <FormField
          control={form.control}
          name="flupsyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unità FLUPSY</FormLabel>
              <Select 
                disabled={isFlupsysLoading} 
                onValueChange={(value) => {
                  const numValue = Number(value);
                  field.onChange(numValue);
                  setSelectedFlupsyId(numValue);
                  
                  // Reset position and row when changing FLUPSY
                  if (!basketId) {
                    form.setValue('position', undefined);
                    form.setValue('row', '');
                    setSelectedRow(null);
                  }
                }}
                defaultValue={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona unità FLUPSY" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {flupsys && flupsys.length > 0 ? (
                    flupsys.map((flupsy: any) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name} {flupsy.maxPositions ? `(max ${flupsy.maxPositions} pos.)` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {isFlupsysLoading ? "Caricamento..." : "Nessuna unità FLUPSY disponibile"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Seleziona l'unità FLUPSY a cui appartiene questa cesta
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="physicalNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numero Cesta</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Inserisci il numero della cesta..."
                  {...field}
                  className={!isBasketNumberValid ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </FormControl>
              <FormMessage />
              {isNextNumberLoading && (
                <FormDescription>
                  Ricerca numero disponibile...
                </FormDescription>
              )}
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="row"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fila</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedRow(value);
                  }}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona fila" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DX">Destra (DX)</SelectItem>
                    <SelectItem value="SX">Sinistra (SX)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  La destra è riferita alla vista verso l'elica
                </FormDescription>
                <FormMessage />
                {selectedRow && nextPositionData && !basketId && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {nextPositionData.availablePositions[selectedRow] === -1 ? (
                      <span className="text-amber-600">Nessuna posizione disponibile nella fila {selectedRow}</span>
                    ) : (
                      <span>Prima posizione disponibile: {nextPositionData.availablePositions[selectedRow]}</span>
                    )}
                  </div>
                )}
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posizione</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Inserisci la posizione nella fila..."
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    className={!isPositionValid ? "border-amber-400 focus-visible:ring-amber-400" : ""}
                  />
                </FormControl>
                <FormDescription>
                  {isNextPositionLoading ? (
                    "Ricerca posizione disponibile..."
                  ) : (
                    `Numero progressivo della posizione (max ${maxPositions})`
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || isFlupsysLoading || !isFormValid}
          >
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
