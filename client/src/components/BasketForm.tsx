import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

// Create a schema for basket validation
const basketFormSchema = z.object({
  physicalNumber: z.coerce.number()
    .int()
    .positive("Il numero della cesta deve essere positivo")
    .min(1, "Il numero della cesta deve essere maggiore di 0"),
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

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
