import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  recordDate: z.date({
    required_error: "Seleziona la data di registrazione.",
  }),
  temperature: z.coerce.number().min(0).optional(),
  pH: z.coerce.number().min(0).max(14).optional(),
  ammonia: z.coerce.number().min(0).optional(),
  oxygen: z.coerce.number().min(0).optional(),
  salinity: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SgrGiornalieriFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function SgrGiornalieriForm({ 
  onSubmit, 
  defaultValues = {
    recordDate: new Date(),
  },
  isLoading = false 
}: SgrGiornalieriFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Configura il form 
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const handleFormSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    
    // Impostare l'ora alle 12:00
    const date = new Date(values.recordDate);
    date.setHours(12, 0, 0, 0);
    
    const dataToSubmit = {
      ...values,
      recordDate: date,
    };
    
    onSubmit(dataToSubmit);
    toast({
      title: "Dati salvati",
      description: "I dati della sonda Seneye sono stati salvati con successo.",
    });
    setIsSubmitting(false);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrazione dati sonda Seneye</CardTitle>
        <CardDescription>
          Inserisci i dati rilevati dalla sonda Seneye alle ore 12:00
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data di registrazione */}
              <FormField
                control={form.control}
                name="recordDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data di registrazione</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Seleziona una data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      L'ora verrà automaticamente impostata alle 12:00.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Temperatura */}
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura dell'acqua (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="es. 21.5"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Temperatura rilevata dalla sonda in gradi Celsius.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* pH */}
              <FormField
                control={form.control}
                name="pH"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>pH dell'acqua</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="14"
                        placeholder="es. 7.8"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Valore pH rilevato dalla sonda (0-14).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Ammoniaca */}
              <FormField
                control={form.control}
                name="ammonia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello di ammoniaca (mg/L)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="es. 0.05"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Livello di ammoniaca rilevato in mg/L.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Ossigeno */}
              <FormField
                control={form.control}
                name="oxygen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello di ossigeno (mg/L)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="es. 8.5"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Livello di ossigeno disciolto in mg/L.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Salinità */}
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
                        min="0"
                        placeholder="es. 35.0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Salinità dell'acqua in parti per mille (ppt).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Note */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note aggiuntive</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Eventuali note o osservazioni..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Aggiungi note o osservazioni particolari (opzionale).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? "Salvataggio..." : "Salva dati"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}