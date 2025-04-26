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

// Use the lot schema from shared schema
const formSchema = lotSchema;

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
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });

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
                    {sizes?.map((size) => (
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

          <FormField
            control={form.control}
            name="animalCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero Animali</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Numero di animali"
                    {...field}
                    value={field.value !== null && field.value !== undefined 
                      ? field.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") 
                      : ''}
                    onChange={(e) => {
                      // Rimuovi tutti i caratteri non numerici, eccetto il punto
                      const numericValue = e.target.value.replace(/[^\d]/g, '');
                      field.onChange(numericValue ? Number(numericValue) : null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (g)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="Peso in grammi"
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
