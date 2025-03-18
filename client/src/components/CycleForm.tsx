import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cycleSchema } from "@shared/schema";

// Use the cycle schema from shared schema
const formSchema = cycleSchema;

type FormValues = z.infer<typeof formSchema>;

interface CycleFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function CycleForm({ 
  onSubmit, 
  defaultValues = {
    startDate: new Date().toISOString().split('T')[0],
  },
  isLoading = false
}: CycleFormProps) {
  // Fetch available baskets (baskets without active cycles)
  const { data: baskets, isLoading: basketsLoading } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Get available baskets (those with state 'available')
  const availableBaskets = baskets?.filter(basket => basket.state === 'available') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="basketId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cesta</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una cesta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {basketsLoading ? (
                    <SelectItem value="" disabled>Caricamento ceste...</SelectItem>
                  ) : availableBaskets.length === 0 ? (
                    <SelectItem value="" disabled>Nessuna cesta disponibile</SelectItem>
                  ) : (
                    availableBaskets.map((basket) => (
                      <SelectItem key={basket.id} value={basket.id.toString()}>
                        Cesta #{basket.physicalNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Solo le ceste disponibili senza cicli attivi possono essere selezionate
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Inizio</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || availableBaskets.length === 0}
          >
            {isLoading ? "Salvataggio..." : "Crea Ciclo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
