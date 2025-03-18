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
import { Textarea } from "@/components/ui/textarea";
import { insertSizeSchema } from "@shared/schema";

// Extend the size schema with validations
const formSchema = insertSizeSchema.extend({
  code: z.string().min(1, "Il codice è obbligatorio"),
  name: z.string().min(1, "Il nome è obbligatorio"),
  sizeMm: z.coerce.number().min(0, "La misura deve essere maggiore o uguale a 0"),
  minAnimalsPerKg: z.coerce.number().min(0, "Il valore minimo deve essere maggiore o uguale a 0"),
  maxAnimalsPerKg: z.coerce.number().min(0, "Il valore massimo deve essere maggiore o uguale a 0"),
});

type FormValues = z.infer<typeof formSchema>;

interface SizeFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
}

export default function SizeForm({ 
  onSubmit, 
  defaultValues = {
    code: "",
    name: "",
    sizeMm: 0,
    minAnimalsPerKg: 0,
    maxAnimalsPerKg: 0,
    notes: "",
  },
  isLoading = false
}: SizeFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice</FormLabel>
                <FormControl>
                  <Input placeholder="Es: T0, M1, etc." {...field} />
                </FormControl>
                <FormDescription>
                  Codice identificativo della taglia (es: T0, T1, M1, M2, M3)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Es: Tiny 0, Medium 1, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sizeMm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Misura (mm)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="Misura in millimetri"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minAnimalsPerKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Animali per Kg</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Minimo animali per kg"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxAnimalsPerKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Animali per Kg</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Massimo animali per kg"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
            {isLoading ? "Salvataggio..." : "Salva Taglia"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
