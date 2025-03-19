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
import BasketExistsCheck from "./BasketExistsCheck";

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
  row: z.string().optional(),
  position: z.coerce.number().int().positive().optional(),
});

type BasketFormValues = z.infer<typeof basketFormSchema>;

interface BasketFormProps {
  onSubmit: (values: BasketFormValues) => void;
  defaultValues?: Partial<BasketFormValues>;
  isLoading?: boolean;
}

export default function BasketForm({ 
  onSubmit, 
  defaultValues = { },
  isLoading = false
}: BasketFormProps) {
  const form = useForm<BasketFormValues>({
    resolver: zodResolver(basketFormSchema),
    defaultValues,
  });
  
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [isBasketValid, setIsBasketValid] = useState(true);

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
    enabled: !!selectedFlupsyId, // Only run this query if a FLUPSY is selected
  });

  // Set flupsyId default value from the first available FLUPSY
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && !form.getValues('flupsyId')) {
      const firstFlupsyId = flupsys[0].id;
      form.setValue('flupsyId', firstFlupsyId);
      setSelectedFlupsyId(firstFlupsyId);
    }
  }, [flupsys, form]);
  
  // Set the next available basket number when it's fetched
  useEffect(() => {
    if (nextBasketNumber && nextBasketNumber.nextNumber) {
      form.setValue('physicalNumber', nextBasketNumber.nextNumber);
    }
  }, [nextBasketNumber, form]);

  // Define custom submit handler to prevent submission if there's a validation error
  const handleSubmit = (e: React.FormEvent) => {
    if (!isBasketValid) {
      e.preventDefault();
      return;
    }
    form.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
      
        <BasketExistsCheck 
          flupsyId={form.watch('flupsyId')} 
          basketNumber={form.watch('physicalNumber')}
          onValidationChange={setIsBasketValid}
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
                  className={!isBasketValid ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                        {flupsy.name}
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
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="row"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fila</FormLabel>
                <Select 
                  onValueChange={field.onChange}
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
                  />
                </FormControl>
                <FormDescription>
                  Numero progressivo della posizione nella fila
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
            disabled={isLoading || isFlupsysLoading || !isBasketValid}
          >
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
