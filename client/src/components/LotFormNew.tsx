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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lotSchema } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Definire un'interfaccia per le dimensioni
interface Size {
  id: number;
  code: string;
  name: string;
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
  sampleWeight: z.number().optional().nullable(), // Peso del campione in grammi
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
  
  // Funzioni di calcolo
  const calculatePiecesPerKg = (count: number, weightGrams: number): number => {
    return Math.round(count / (weightGrams / 1000));
  };
  
  const calculateTotalAnimals = (weightGrams: number, piecesPerKg: number): number => {
    return Math.round(weightGrams * (piecesPerKg / 1000));
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
    });
    
    return () => subscription.unsubscribe();
  }, [form, totalWeightGrams]);
  
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="arrivalDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Arrivo</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Fornitore</FormLabel>
                <FormControl>
                  <Input placeholder="Nome fornitore" {...field} />
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
                  <FormLabel>
                    Numero Lotto Fornitore
                    {isZeelandSupplier && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={isZeelandSupplier 
                        ? "Numero lotto obbligatorio" 
                        : "Numero lotto del fornitore (opzionale)"
                      } 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="quality"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Qualità</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-3"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="teste" id="quality-teste" />
                      <Label htmlFor="quality-teste" className="flex items-center cursor-pointer text-sm">
                        <span className="mr-1">Teste</span>
                        <span className="text-yellow-500">★★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="normali" id="quality-normali" />
                      <Label htmlFor="quality-normali" className="flex items-center cursor-pointer text-sm">
                        <span className="mr-1">Normali</span>
                        <span className="text-yellow-500">★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="code" id="quality-code" />
                      <Label htmlFor="quality-code" className="flex items-center cursor-pointer text-sm">
                        <span className="mr-1">Tails</span>
                        <span className="text-yellow-500">★</span>
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
              <FormItem>
                <FormLabel>Taglia</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                  value={field.value?.toString() || "null"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona taglia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">Nessuna taglia</SelectItem>
                    {Array.isArray(sizes) && sizes.map((size) => (
                      <SelectItem key={size.id} value={size.id.toString()}>
                        {size.code} - {size.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sezione per i calcoli automatici - span su tutte le colonne */}
          <div className="col-span-2 pt-1 mt-1 border-t flex items-center">
            <h3 className="text-xs font-medium mb-0 mr-2">Calcolo automatico</h3>
            <span className="text-xs text-muted-foreground">Inserisci peso e pezzi campione per calcolare automaticamente i totali</span>
          </div>

          {/* Peso del campione in grammi */}
          <FormField
            control={form.control}
            name="sampleWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Campione (g)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Peso campione in grammi"
                    {...field}
                    value={field.value !== null && field.value !== undefined 
                      ? field.value.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                      : ''}
                    onChange={(e) => {
                      // Rimuovi tutti i caratteri non numerici eccetto la virgola
                      let value = e.target.value.replace(/[^\d,]/g, '');
                      // Assicurati che ci sia al massimo una virgola
                      const commaCount = (value.match(/,/g) || []).length;
                      if (commaCount > 1) {
                        value = value.replace(/,/g, (match, index) => index === value.indexOf(',') ? ',' : '');
                      }
                      // Converti da formato europeo (con virgola) al formato numerico JavaScript
                      const numericValue = value ? Number(value.replace(',', '.')) : null;
                      field.onChange(numericValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Numero di animali nel campione */}
          <FormField
            control={form.control}
            name="sampleCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N° Animali Campione</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Numero di animali nel campione"
                    {...field}
                    value={field.value !== null && field.value !== undefined 
                      ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                      : ''}
                    onChange={(e) => {
                      // Rimuovi tutti i caratteri non numerici
                      const numericValue = e.target.value.replace(/[^\d]/g, '');
                      field.onChange(numericValue ? Number(numericValue) : null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Pezzi per Kg (calcolato automaticamente) */}
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pezzi per Kg (calcolato)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Calcolato automaticamente"
                    {...field}
                    value={field.value !== null && field.value !== undefined 
                      ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                      : ''}
                    readOnly
                    className="bg-slate-50"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Peso totale in grammi (campo custom non incluso nel form) */}
          <div className="space-y-2">
            <FormItem>
              <FormLabel>Peso Totale (g)</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="Peso totale in grammi"
                  value={totalWeightGrams !== null && totalWeightGrams !== undefined 
                    ? totalWeightGrams.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                    : ''}
                  onChange={(e) => {
                    // Rimuovi tutti i caratteri non numerici eccetto la virgola
                    let value = e.target.value.replace(/[^\d,]/g, '');
                    // Assicurati che ci sia al massimo una virgola
                    const commaCount = (value.match(/,/g) || []).length;
                    if (commaCount > 1) {
                      value = value.replace(/,/g, (match, index) => index === value.indexOf(',') ? ',' : '');
                    }
                    // Converti da formato europeo (con virgola) al formato numerico JavaScript
                    const numericValue = value ? Number(value.replace(',', '.')) : null;
                    setTotalWeightGrams(numericValue);
                    
                    // Calcola il numero totale di animali
                    const piecesPerKg = form.getValues("weight");
                    if (numericValue && piecesPerKg) {
                      const totalAnimals = calculateTotalAnimals(numericValue, piecesPerKg);
                      setCalculatedTotalAnimals(totalAnimals);
                      form.setValue("animalCount", totalAnimals);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
          
          {/* Numero totale di animali (calcolato automaticamente) */}
          <div className="space-y-2">
            <FormItem>
              <FormLabel>N° Animali Totali (calcolato)</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="Calcolato automaticamente"
                  value={calculatedTotalAnimals !== null 
                    ? calculatedTotalAnimals.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                    : ''}
                  readOnly
                  className="bg-slate-50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Inserisci note aggiuntive" 
                  rows={2}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 mt-2">
          <Button variant="outline" type="button" onClick={() => form.reset()} size="sm">
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading} size="sm">
            {isLoading ? "Salvataggio..." : isEditing ? "Conferma" : "Crea Lotto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}