import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sgrGiornalieriSchema } from "@shared/schema";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Schema del form con validazione
const formSchema = sgrGiornalieriSchema.extend({
  recordDate: z.coerce.date().default(new Date()),
  temperature: z.coerce.number().min(0).max(40).optional().nullable(),
  pH: z.coerce.number().min(0).max(14).optional().nullable(),
  ammonia: z.coerce.number().min(0).max(10).optional().nullable(), 
  oxygen: z.coerce.number().min(0).max(20).optional().nullable(),
  salinity: z.coerce.number().min(0).max(40).optional().nullable(),
});

// Tipo per i valori del form
type FormValues = z.infer<typeof formSchema>;

// Props del componente
interface SgrGiornalieriFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function SgrGiornalieriForm({ 
  onSubmit, 
  defaultValues = {
    recordDate: new Date(), // Default a oggi
    temperature: null,
    pH: null,
    ammonia: null,
    oxygen: null, 
    salinity: null,
    notes: ""
  }, 
  isLoading = false 
}: SgrGiornalieriFormProps) {
  const { toast } = useToast();
  
  // Inizializzazione del form con il resolver di zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Handler per il submit del form
  const handleFormSubmit = (values: FormValues) => {
    try {
      onSubmit(values);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dei dati.",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Registrazione parametri giornalieri</CardTitle>
        <CardDescription>
          Inserisci i dati registrati dalla sonda Seneye alle ore 12:00
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recordDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e ora rilevazione</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field} 
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={e => {
                        const date = new Date(e.target.value);
                        // Impostiamo l'ora a 12:00
                        date.setHours(12, 0, 0, 0);
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    La data e l'ora della rilevazione (fissata alle 12:00)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura (°C)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="Es. 22.5" 
                        {...field} 
                        value={field.value === null ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pH"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>pH</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="Es. 7.8" 
                        {...field} 
                        value={field.value === null ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ammonia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ammoniaca (mg/L)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Es. 0.03" 
                        {...field} 
                        value={field.value === null ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="oxygen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ossigeno (mg/L)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="Es. 8.5" 
                        {...field} 
                        value={field.value === null ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="salinity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salinità (ppt)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="Es. 35.0" 
                      {...field} 
                      value={field.value === null ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Note aggiuntive sui parametri misurati..."
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Salvataggio in corso..." : "Salva dati giornalieri"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>I dati vengono utilizzati per monitorare la qualità dell'acqua</p>
      </CardFooter>
    </Card>
  );
}