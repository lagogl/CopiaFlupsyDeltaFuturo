import { zodResolver } from "@hookform/resolvers/zod";
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

// Creare un modello di form equivalente, ma modificato per evitare gli errori
// Usiamo z.string() invece di z.date() per data per evitare problemi di tipo
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

type FormValues = z.infer<typeof formSchema>;

interface LotFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function LotForm({ 
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
  
  // Per gestire il calcolo di animali totali senza aggiungere un campo al form
  const [calculatedTotalAnimals, setCalculatedTotalAnimals] = useState<number | null>(null);
  
  // Monitoriamo i cambiamenti nei campi rilevanti per calcolare automaticamente
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Se cambia uno dei valori rilevanti, ricalcola
      if (['sampleWeight', 'sampleCount', 'animalCount', 'weight'].includes(name as string)) {
        const piecesPerKg = form.getValues("weight");
        const totalWeight = form.getValues("animalCount");
        // Solo se entrambi i valori sono disponibili
        if (piecesPerKg && totalWeight) {
          const totalAnimals = Math.round(totalWeight * (piecesPerKg / 1000));
          setCalculatedTotalAnimals(totalAnimals);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              // Ottieni il valore attuale del fornitore
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
              <FormItem className="space-y-3">
                <FormLabel>Qualità</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teste" id="quality-teste" />
                      <Label htmlFor="quality-teste" className="flex items-center cursor-pointer">
                        <span className="mr-2">Teste/Head</span>
                        <span className="text-yellow-500">★★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normali" id="quality-normali" />
                      <Label htmlFor="quality-normali" className="flex items-center cursor-pointer">
                        <span className="mr-2">Normali/Normal</span>
                        <span className="text-yellow-500">★★</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="code" id="quality-code" />
                      <Label htmlFor="quality-code" className="flex items-center cursor-pointer">
                        <span className="mr-2">Code/Codes</span>
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

          {/* Peso totale in grammi */}
          <FormField
            control={form.control}
            name="animalCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Totale (g)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Peso totale in grammi"
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
                      
                      // Calcola il numero totale di animali
                      const piecesPerKg = form.getValues("weight");
                      if (numericValue && piecesPerKg) {
                        // In questo modo si calcola automaticamente il numero totale di animali
                        // Il valore verrà sostituito più tardi con il vero numero di animali
                        const totalAnimals = Math.round(numericValue * (piecesPerKg / 1000));
                        
                        // Salviamo temporaneamente il peso totale
                        const totalWeightGrams = numericValue;
                        
                        // Aggiorneremo animalCount quando verrà inviato il form
                        setTimeout(() => {
                          form.setValue("animalCount", totalAnimals);
                        }, 200);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Numero totale di animali (calcolato automaticamente) */}
          <FormField
            control={form.control}
            name="totalAnimals"
            render={() => {
              // Calcola il numero totale di animali
              const piecesPerKg = form.watch("weight") || 0;
              const totalWeight = form.watch("animalCount") || 0;
              const totalAnimals = piecesPerKg > 0 && totalWeight > 0 
                ? Math.round(totalWeight * (piecesPerKg / 1000))
                : 0;
                
              return (
                <FormItem>
                  <FormLabel>N° Animali Totali (calcolato)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Calcolato automaticamente"
                      value={totalAnimals > 0 
                        ? totalAnimals.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                        : ''}
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

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
                      
                      // Calcolo automatico dei pezzi per kg
                      const sampleCount = form.getValues("sampleCount");
                      if (numericValue && sampleCount) {
                        // Calcola pezzi per kg (sampleCount / sampleWeight in kg)
                        const piecesPerKg = Math.round(sampleCount / (numericValue / 1000));
                        
                        // Aggiorna il campo weight (pezzi per kg)
                        form.setValue("weight", piecesPerKg);
                        
                        // Calcola il numero totale di animali se il peso totale è presente
                        const totalWeight = form.getValues("animalCount");
                        if (totalWeight) {
                          // Il campo animalCount è usato temporaneamente per memorizzare il peso totale in grammi
                          const totalAnimals = Math.round(totalWeight * (piecesPerKg / 1000));
                          setTimeout(() => {
                            form.setValue("animalCount", totalAnimals);
                          }, 100);
                        }
                      }
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
                      
                      // Calcolo automatico dei pezzi per kg
                      const sampleWeight = form.getValues("sampleWeight");
                      if (sampleWeight && numericValue) {
                        // Calcola pezzi per kg (sampleCount / sampleWeight in kg)
                        const piecesPerKg = Math.round(Number(numericValue) / (sampleWeight / 1000));
                        
                        // Aggiorna il campo weight (pezzi per kg)
                        form.setValue("weight", piecesPerKg);
                        
                        // Calcola il numero totale di animali se il peso totale è presente
                        const totalWeight = form.getValues("animalCount");
                        if (totalWeight) {
                          // Il campo animalCount è usato temporaneamente per memorizzare il peso totale in grammi
                          const totalAnimals = Math.round(totalWeight * (piecesPerKg / 1000));
                          setTimeout(() => {
                            form.setValue("animalCount", totalAnimals);
                          }, 100);
                        }
                      }
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
                  />
                </FormControl>
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
                  value={field.value || ""}
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
            {isLoading ? "Salvataggio..." : isEditing ? "Conferma" : "Crea Lotto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
