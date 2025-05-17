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
    
    // I campi effettivi nella tabella sizes sono:
    // min_animals_per_kg: valore minimo di animali per kg della taglia
    // max_animals_per_kg: valore massimo di animali per kg della taglia
    
    console.log(`Determinazione taglia per ${piecesPerKg} pezzi/kg`);
    
    // Per il momento utilizziamo questa mappa hardcoded con i range corretti ottenuti dal database
    const taglieRange = [
      { id: 1, code: "TP-500", min: 3400001, max: 5000000 },
      { id: 2, code: "TP-180", min: 42000001, max: 100000000 },
      { id: 3, code: "TP-200", min: 16000001, max: 42000000 },
      { id: 4, code: "TP-315", min: 7600001, max: 16000000 },
      { id: 5, code: "TP-450", min: 5000001, max: 7600000 },
      { id: 6, code: "TP-600", min: 1800001, max: 3400000 },
      { id: 7, code: "TP-700", min: 1500001, max: 1800000 },
      { id: 8, code: "TP-800", min: 880001, max: 1500000 },
      { id: 9, code: "TP-1000", min: 600001, max: 880000 },
      { id: 10, code: "TP-1140", min: 350001, max: 600000 },
      { id: 11, code: "TP-1260", min: 300001, max: 350000 },
      { id: 12, code: "TP-1500", min: 190001, max: 300000 },
      { id: 13, code: "TP-1800", min: 120001, max: 190000 },
      { id: 14, code: "TP-1900", min: 97001, max: 120000 },
      { id: 15, code: "TP-2000", min: 70001, max: 97000 },
      { id: 16, code: "TP-2200", min: 60001, max: 70000 },
      { id: 17, code: "TP-2500", min: 40001, max: 60000 },
      { id: 18, code: "TP-2800", min: 32001, max: 40000 },
      { id: 19, code: "TP-3000", min: 19001, max: 32000 },
      { id: 20, code: "TP-3500", min: 12501, max: 19000 },
      { id: 21, code: "TP-4000", min: 7501, max: 12500 },
      { id: 22, code: "TP-5000", min: 3901, max: 7500 },
      { id: 23, code: "TP-6000", min: 3001, max: 3900 },
      { id: 24, code: "TP-7000", min: 2301, max: 3000 },
      { id: 25, code: "TP-8000", min: 1801, max: 2300 },
      { id: 26, code: "TP-9000", min: 1201, max: 1800 },
      { id: 27, code: "TP-10000", min: 801, max: 1200 }
    ];
    
    // Trova la taglia corretta in base ai range
    const matchingSize = taglieRange.find(taglia => 
      piecesPerKg >= taglia.min && piecesPerKg <= taglia.max
    );
    
    if (matchingSize) {
      console.log(`Taglia trovata in base al range: ${matchingSize.code} (${matchingSize.min}-${matchingSize.max})`);
      return matchingSize.id;
    }
    
    // Se nessuna taglia corrisponde esattamente, usiamo una logica fallback
    console.log("Nessuna taglia trovata nel range esatto, usando logica fallback");
    
    // Ordina le taglie per valore minimo (crescente)
    const taglieOrdinate = [...taglieRange].sort((a, b) => a.min - b.min);
    
    // Se il valore è inferiore al minimo della taglia più piccola, usa quella
    if (piecesPerKg < taglieOrdinate[0].min) {
      console.log(`Valore troppo piccolo, usando la taglia più piccola: ${taglieOrdinate[0].code}`);
      return taglieOrdinate[0].id;
    }
    
    // Se il valore è maggiore del massimo della taglia più grande, usa quella
    if (piecesPerKg > taglieOrdinate[taglieOrdinate.length - 1].max) {
      const lastTaglia = taglieOrdinate[taglieOrdinate.length - 1];
      console.log(`Valore troppo grande, usando la taglia più grande: ${lastTaglia.code}`);
      return lastTaglia.id;
    }
    
    // Fallback finale - usa TP-1000 se tutto fallisce
    const fallbackSizeId = sizes.find(s => s.code === "TP-1000")?.id || 9;
    console.log(`Impossibile determinare la taglia, usando fallback: TP-1000 (id: ${fallbackSizeId})`);
    return fallbackSizeId;
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="mx-auto">
        <h2 className="text-lg mb-6">Crea Nuovo Lotto</h2>
        
        <div className="flex flex-col space-y-5">
          {/* Prima riga: esattamente come nello screenshot */}
          <div className="flex items-start">
            <div className="w-1/3 pr-2">
              <FormField
                control={form.control}
                name="arrivalDate"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">Data Arrivo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-sm h-9 w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-1/3 px-2">
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">Fornitore</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome fornitore" {...field} className="text-sm h-9 w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-1/3 pl-2">
              <FormField
                control={form.control}
                name="supplierLotNumber"
                render={({ field }) => {
                  const supplier = form.watch("supplier") || "";
                  const isZeelandSupplier = supplier === "Zeeland" || supplier === "Ecotapes Zeeland";
                  
                  return (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-medium">
                        Numero Lotto Fornitore
                        {isZeelandSupplier && <span className="text-red-500 ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Numero lotto" 
                          {...field} 
                          value={field.value || ""} 
                          className="text-sm h-9 w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>
          
          {/* Seconda riga: Qualità */}
          <div>
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Qualità</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-6 pt-1"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="teste" id="quality-teste" />
                        <Label htmlFor="quality-teste" className="ml-1.5 flex items-center cursor-pointer text-sm">
                          <span>Teste</span>
                          <span className="text-yellow-500 ml-1">★★★</span>
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="normali" id="quality-normali" />
                        <Label htmlFor="quality-normali" className="ml-1.5 flex items-center cursor-pointer text-sm">
                          <span>Normali</span>
                          <span className="text-yellow-500 ml-1">★★</span>
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="code" id="quality-code" />
                        <Label htmlFor="quality-code" className="ml-1.5 flex items-center cursor-pointer text-sm">
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
          </div>

          {/* Sezione per i calcoli automatici - allineata secondo lo screenshot */}
          <div className="flex items-start">
            <div className="w-1/3">
              <div className="flex flex-col space-y-2 mb-3">
                <div className="text-sm font-medium">Calcolo automatico</div>
                <div className="text-xs text-muted-foreground">
                  Inserisci peso e pezzi campione per calcolare automaticamente i totali
                </div>
              </div>
            </div>
          </div>
          
          {/* Campi di input per il calcolo - allineati orizzontalmente */}
          <div className="flex space-x-4">
            {/* Primo campo - Peso Campione */}
            <div className="w-1/3">
              <FormField
                control={form.control}
                name="sampleWeight"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">Peso Campione (g)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="Peso campione"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          // Gestisci il valore vuoto come null
                          const rawValue = e.target.value;
                          if (!rawValue) {
                            field.onChange(null);
                            return;
                          }
                          
                          // Converte il valore in numero
                          const numValue = parseFloat(rawValue);
                          if (!isNaN(numValue) && numValue >= 0) {
                            field.onChange(numValue);
                          }
                        }}
                        className="text-sm h-9 bg-white w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Secondo campo - N° Animali Campione */}
            <div className="w-1/3">
              <FormField
                control={form.control}
                name="sampleCount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">N° Animali Campione</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        placeholder="N° animali"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          // Gestisci il valore vuoto come null
                          const rawValue = e.target.value;
                          if (!rawValue) {
                            field.onChange(null);
                            return;
                          }
                          
                          // Converte il valore in numero intero
                          const numValue = parseInt(rawValue, 10);
                          if (!isNaN(numValue) && numValue >= 0) {
                            field.onChange(numValue);
                          }
                        }}
                        className="text-sm h-9 bg-white w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Terzo campo - Peso Totale */}
            <div className="w-1/3">
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm font-medium">Peso Totale (g)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="Peso totale"
                    value={totalWeightGrams || ""}
                    onChange={(e) => {
                      // Gestisci il valore vuoto come null
                      const rawValue = e.target.value;
                      if (!rawValue) {
                        setTotalWeightGrams(null);
                        return;
                      }
                      
                      // Converte il valore in numero
                      const numValue = parseFloat(rawValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setTotalWeightGrams(numValue);
                        
                        // Se abbiamo già un valore per pezzi per kg, calcola il totale animali
                        const piecesPerKg = form.getValues("weight");
                        if (numValue && piecesPerKg) {
                          const totalAnimals = calculateTotalAnimals(numValue, piecesPerKg);
                          setCalculatedTotalAnimals(totalAnimals);
                          form.setValue("animalCount", totalAnimals);
                        }
                      }
                    }}
                    className="text-sm h-9 bg-white w-full"
                  />
                </FormControl>
              </FormItem>
            </div>
          </div>
          
          {/* Riquadro verde per i campi calcolati */}
          <div className="bg-green-50 p-3 rounded-md border border-green-100 mb-4">
            <div className="text-xs font-medium text-green-800 mb-2">Valori calcolati automaticamente</div>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Taglia calcolata */}
              <FormField
                control={form.control}
                name="sizeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-green-800">Taglia (calcolata)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Calcolata automaticamente"
                        value={field.value !== null && field.value !== undefined 
                          ? (sizes.find(s => s.id === field.value)?.code || "") 
                          : ''}
                        readOnly
                        className="bg-white text-sm h-9 border-green-200"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Pezzi per kg calcolati */}
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-green-800">Pezzi per Kg</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Calcolato automaticamente"
                        {...field}
                        value={field.value !== null && field.value !== undefined 
                          ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                          : ''}
                        readOnly
                        className="bg-white text-sm h-9 border-green-200"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Animali totali calcolati */}
              <FormItem>
                <FormLabel className="text-sm text-green-800">N° Animali Totali</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Calcolato automaticamente"
                    value={calculatedTotalAnimals !== null 
                      ? calculatedTotalAnimals.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                      : ''}
                    readOnly
                    className="bg-white text-sm h-9 border-green-200"
                  />
                </FormControl>
              </FormItem>
            </div>
          </div>
          
          {/* Campo note */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Note</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Note opzionali" 
                    {...field} 
                    value={field.value || ""}
                    className="text-sm resize-none h-20" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Pulsanti di azione */}
          <div className="flex justify-end space-x-2 mt-4">
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