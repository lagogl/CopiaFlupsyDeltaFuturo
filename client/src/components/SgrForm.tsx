import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertSgrSchema } from "@shared/schema";

// Extend the SGR schema with validations
const formSchema = insertSgrSchema.extend({
  month: z.string().min(1, "Il mese è obbligatorio"),
  percentage: z.coerce.number().min(0, "La percentuale deve essere maggiore o uguale a 0"),
});

type FormValues = z.infer<typeof formSchema>;

interface SgrFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function SgrForm({ 
  onSubmit, 
  defaultValues = {
    month: "",
    percentage: 0.5,
  },
  isLoading = false
}: SgrFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Italian months
  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mese</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona mese" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.toLowerCase()} value={month.toLowerCase()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Percentuale (%)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1"
                  placeholder="Es: 0.5"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Percentuale giornaliera di crescita (es: 0.5 per 0.5%)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => form.reset()}>
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Salva Indice SGR"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
