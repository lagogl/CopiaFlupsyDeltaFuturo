import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { lotSchema } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Definire un'interfaccia per le dimensioni
interface Size {
  id: number;
  code: string;
  name: string;
  minAnimalsPerKg?: number;
  maxAnimalsPerKg?: number;
  color?: string;
}

// Creare un modello di form
const formSchema = z.object({
  arrivalDate: z.string(),  // Semplifico da date a string
  supplier: z.string().min(1, "Il nome del fornitore è obbligatorio"),
  supplierLotNumber: z.string().optional(),
  quality: z.string().optional(),
  animalCount: z.number().int().optional().nullable(),
  weight: z.number().optional().nullable(),
  sizeId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  state: z.string().optional(),
  // Nuovi campi per il calcolo automatico
  sampleWeight: z.number().min(0).optional().nullable(), // Peso del campione in grammi
  sampleCount: z.number().int().optional().nullable(), // Numero di animali nel campione
});

export type FormValues = z.infer<typeof formSchema>;

interface LotFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function LotFormNew({ 
  onSubmit, 
  defaultValues = {
    arrivalDate: new Date().toISOString().split('T')[0],
  },
  isLoading = false,
  isEditing = false
}: LotFormProps) {
  // Fetch sizes for dropdown
  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Stato per i calcoli automatici
  const [totalWeightGrams, setTotalWeightGrams] = useState<number | null>(null);
  const [calculatedTotalAnimals, setCalculatedTotalAnimals] = useState<number | null>(null);
  const [suggestedSizeId, setSuggestedSizeId] = useState<number | null>(null);
  
  // Funzioni di calcolo
  const calculatePiecesPerKg = (count: number, weightGrams: number): number => {
    return Math.round(count / (weightGrams / 1000));
  };
  
  const calculateTotalAnimals = (weightGrams: number, piecesPerKg: number): number => {
    return Math.round(weightGrams * (piecesPerKg / 1000));
  };
  
  // Funzione per determinare la taglia in base ai pezzi per kg
  const determineSizeId = (piecesPerKg: number): number | null => {
    if (!sizes || sizes.length === 0 || !piecesPerKg) return null;
    
    // Verifica prima se esiste una taglia che ha i range esplicitamente definiti
    const matchingSize = sizes.find(size => 
      size.minAnimalsPerKg !== undefined && 
      size.maxAnimalsPerKg !== undefined && 
      piecesPerKg >= size.minAnimalsPerKg && 
      piecesPerKg <= size.maxAnimalsPerKg
    );
    
    if (matchingSize) {
      console.log(`Taglia calcolata dai range del database: ${matchingSize.code} (id: ${matchingSize.id})`);
      return matchingSize.id;
    }
    
    // Ordina le taglie in base al numero di animali per kg (dal valore numerico estratto dal codice)
    const sortedSizes = [...sizes].sort((a, b) => {
      // Estrai i numeri dai codici (es. "TP-600" -> 600)
      const numA = a.code ? parseInt(a.code.replace(/\D/g, '')) : 0;
      const numB = b.code ? parseInt(b.code.replace(/\D/g, '')) : 0;
      return numB - numA; // Dal più grande al più piccolo
    });
    
    // Se non esiste un range esplicito nel database, usa i valori numerici nei codici delle taglie
    if (sortedSizes.length > 0) {
      // Trova la taglia con il valore numerico più vicino al piecesPerKg
      let bestMatch = sortedSizes[0];
      let minDifference = Number.MAX_VALUE;
      
      for (const size of sortedSizes) {
        const sizeNumber = size.code ? parseInt(size.code.replace(/\D/g, '')) : 0;
        if (sizeNumber > 0) {
          const difference = Math.abs(sizeNumber - piecesPerKg);
          
          // Se la differenza è minore della migliore trovata finora
          if (difference < minDifference) {
            minDifference = difference;
            bestMatch = size;
          }
          
          // Se il valore è ESATTAMENTE uguale, restituiamo immediatamente
          if (difference === 0) {
            console.log(`Corrispondenza esatta per taglia: ${size.code} (id: ${size.id})`);
            return size.id;
          }
        }
      }
      
      // Calcola una percentuale di differenza per determinare se è accettabile
      const matchNumber = parseInt(bestMatch.code.replace(/\D/g, ''));
      const percentDifference = Math.abs((piecesPerKg - matchNumber) / matchNumber) * 100;
      
      // Se la differenza è inferiore al 15%, consideralo una buona corrispondenza
      if (percentDifference <= 15) {
        console.log(`Buona corrispondenza per taglia: ${bestMatch.code} (id: ${bestMatch.id}), differenza: ${percentDifference.toFixed(2)}%`);
      } else {
        console.log(`Corrispondenza approssimata per taglia: ${bestMatch.code} (id: ${bestMatch.id}), differenza: ${percentDifference.toFixed(2)}%`);
      }
      
      return bestMatch.id;
    }
    
    return null;
  };
  
  // Monitorare i cambiamenti nei campi e aggiornare i calcoli
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Se cambiano i valori del campione, aggiorna i pezzi per kg
      if (name === "sampleWeight" || name === "sampleCount") {
        const sampleWeight = form.getValues("sampleWeight");
        const sampleCount = form.getValues("sampleCount");
        
        if (sampleWeight && sampleCount) {
          // Calcola pezzi per kg
          const piecesPerKg = calculatePiecesPerKg(sampleCount, sampleWeight);
          form.setValue("weight", piecesPerKg);
          
          // Determina la taglia in base ai pezzi per kg e aggiorna il campo
          const autoSizeId = determineSizeId(piecesPerKg);
          setSuggestedSizeId(autoSizeId);
          if (autoSizeId) {
            form.setValue("sizeId", autoSizeId);
          }
          
          // Se è presente anche il peso totale, calcola gli animali totali
          if (totalWeightGrams) {
            const totalAnimals = calculateTotalAnimals(totalWeightGrams, piecesPerKg);
            setCalculatedTotalAnimals(totalAnimals);
            
            // Aggiorna animalCount con il valore calcolato
            setTimeout(() => {
              form.setValue("animalCount", totalAnimals);
            }, 50);
          }
        }
      }
      
      // Se viene aggiornato il peso per kg manualmente, aggiorna anche la taglia suggerita
      if (name === "weight") {
        const piecesPerKg = form.getValues("weight");
        if (piecesPerKg) {
          const autoSizeId = determineSizeId(piecesPerKg);
          setSuggestedSizeId(autoSizeId);
          if (autoSizeId) {
            form.setValue("sizeId", autoSizeId);
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, totalWeightGrams, sizes]);
  
  // Funzione per il submit che gestisce i calcoli finali
  const handleSubmit = (data: FormValues) => {
    // Assicurati che i calcoli finali siano inclusi nei dati inviati
    if (calculatedTotalAnimals !== null) {
      data.animalCount = calculatedTotalAnimals;
    }
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl mx-auto px-4">
        <h2 className="font-semibold text-lg mb-4">Crea Nuovo Lotto</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Prima riga: Data Arrivo, Fornitore, Numero Lotto */}
          <FormField
            control={form.control}
            name="arrivalDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Data Arrivo</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="text-sm h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Fornitore</FormLabel>
                <FormControl>
                  <Input placeholder="Nome fornitore" {...field} className="text-sm h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierLotNumber"
            render={({ field }) => {
              const supplier = form.watch("supplier") || "";
              const isZeelandSupplier = supplier === "Zeeland" || supplier === "Ecotapes Zeeland";
              
              return (
                <FormItem>
                  <FormLabel className="text-sm">
                    Numero Lotto Fornitore
                    {isZeelandSupplier && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Numero lotto" 
                      {...field} 
                      value={field.value || ""} 
                      className="text-sm h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          {/* Seconda riga: Qualità, Taglia (calcolata) */}
          <FormField
            control={form.control}
            name="quality"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Qualità</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-3"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="teste" id="quality-teste" className="h-3 w-3" />
                      <Label htmlFor="quality-teste" className="ml-1 flex items-center cursor-pointer text-xs">
                        <span>Teste</span>
                        <span className="text-yellow-500 ml-1">★★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="normali" id="quality-normali" className="h-3 w-3" />
                      <Label htmlFor="quality-normali" className="ml-1 flex items-center cursor-pointer text-xs">
                        <span>Normali</span>
                        <span className="text-yellow-500 ml-1">★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="code" id="quality-code" className="h-3 w-3" />
                      <Label htmlFor="quality-code" className="ml-1 flex items-center cursor-pointer text-xs">
                        <span>Tails</span>
                        <span className="text-yellow-500 ml-1">★</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sizeId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-sm">Taglia (calcolata)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Calcolata automaticamente"
                    value={field.value !== null && field.value !== undefined 
                      ? (sizes.find(s => s.id === field.value)?.code || "") 
                      : ''}
                    readOnly
                    className="bg-green-50 text-sm h-9"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sezione per i calcoli automatici */}
          <div className="col-span-3 mt-4 mb-2">
            <div className="flex flex-row justify-between items-start">
              <h3 className="text-sm font-medium">Calcolo automatico</h3>
              <span className="text-xs text-muted-foreground ml-2">
                Inserisci peso e pezzi campione per calcolare automaticamente i totali
              </span>
            </div>
          </div>
          
          <div className="col-span-3 grid grid-cols-3 gap-4">
            {/* Peso Campione e N° Animali Campione */}
            <FormField
              control={form.control}
              name="sampleWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Peso Campione (g)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Peso campione"
                      value={field.value || ''}
                      onChange={(e) => {
                        const numericValue = e.target.value ? Number(e.target.value) : null;
                        field.onChange(numericValue);
                      }}
                      className="text-sm h-9"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sampleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">N° Animali Campione</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="N° animali"
                      {...field}
                      value={field.value !== null && field.value !== undefined 
                        ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                        : ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                        field.onChange(numericValue ? Number(numericValue) : null);
                      }}
                      className="text-sm h-9"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Pezzi per Kg (calcolato)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Calcolato automaticamente"
                      {...field}
                      value={field.value !== null && field.value !== undefined 
                        ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                        : ''}
                      readOnly
                      className="bg-green-50 text-sm h-9"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Peso Totale e N° Animali Totali */}
            <FormItem>
              <FormLabel className="text-sm">Peso Totale (g)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Peso totale"
                  value={totalWeightGrams || ''}
                  onChange={(e) => {
                    const numericValue = e.target.value ? Number(e.target.value) : null;
                    setTotalWeightGrams(numericValue);
                    
                    const piecesPerKg = form.getValues("weight");
                    if (numericValue && piecesPerKg) {
                      const totalAnimals = calculateTotalAnimals(numericValue, piecesPerKg);
                      setCalculatedTotalAnimals(totalAnimals);
                      form.setValue("animalCount", totalAnimals);
                    }
                  }}
                  className="text-sm h-9"
                />
              </FormControl>
            </FormItem>
            
            <FormItem className="col-span-2">
              <FormLabel className="text-sm">N° Animali Totali (calcolato)</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="Calcolato automaticamente"
                  value={calculatedTotalAnimals !== null 
                    ? calculatedTotalAnimals.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                    : ''}
                  readOnly
                  className="bg-green-50 text-sm h-9"
                />
              </FormControl>
            </FormItem>
          </div>
          
          {/* Campo note */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-3 mt-2">
                <FormLabel className="text-sm">Note</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Inserisci note aggiuntive" 
                    rows={3}
                    {...field}
                    value={field.value || ""}
                    className="text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="col-span-3 flex justify-end space-x-2 mt-4">
            <Button variant="outline" type="button" onClick={() => form.reset()} size="sm">
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading} size="sm" className="bg-blue-950 text-white">
              {isLoading ? "Salvataggio..." : isEditing ? "Conferma" : "Crea Lotto"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}