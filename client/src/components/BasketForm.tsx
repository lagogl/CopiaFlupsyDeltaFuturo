import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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

// Create a schema for basket validation
const basketFormSchema = z.object({
  physicalNumber: z.coerce.number()
    .int()
    .positive("Il numero della cesta deve essere positivo")
    .min(1, "Il numero della cesta deve essere maggiore di 0"),
  flupsyId: z.coerce.number()
    .int()
    .positive("Devi selezionare un'unità FLUPSY valida"),
});

type BasketFormValues = z.infer<typeof basketFormSchema>;

interface BasketFormProps {
  onSubmit: (values: BasketFormValues) => void;
  defaultValues?: Partial<BasketFormValues>;
  isLoading?: boolean;
}

export default function BasketForm({ 
  onSubmit, 
  defaultValues = { physicalNumber: 1 },
  isLoading = false
}: BasketFormProps) {
  const form = useForm<BasketFormValues>({
    resolver: zodResolver(basketFormSchema),
    defaultValues,
  });

  // Fetch FLUPSY units
  const { data: flupsys, isLoading: isFlupsysLoading } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  // Set flupsyId default value from the first available FLUPSY
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && !form.getValues('flupsyId')) {
      form.setValue('flupsyId', flupsys[0].id);
    }
  }, [flupsys, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                onValueChange={(value) => field.onChange(Number(value))}
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

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading || isFlupsysLoading}>
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
