import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft, Calendar } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Size } from '@shared/schema';

// Definizione dello schema per il form di vagliatura
const screeningFormSchema = z.object({
  date: z.date({
    required_error: 'La data è obbligatoria',
  }),
  screeningNumber: z.number({
    required_error: 'Il numero di vagliatura è obbligatorio',
  }),
  referenceSizeId: z.string({
    required_error: 'La taglia di riferimento è obbligatoria',
  }).transform(val => parseInt(val, 10)),
  purpose: z.string().nullish(),
  notes: z.string().nullish(),
});

type ScreeningFormValues = z.infer<typeof screeningFormSchema>;

export default function NewScreeningPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere le taglie
  const { data: sizes, isLoading: sizesLoading } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: async () => {
      return apiRequest<Size[]>('/api/sizes');
    },
  });

  // Mutation per creare una nuova operazione di vagliatura
  const createMutation = useMutation({
    mutationFn: (values: ScreeningFormValues) => 
      apiRequest('/api/screening/operations', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
      toast({
        title: 'Vagliatura creata',
        description: 'L\'operazione di vagliatura è stata creata con successo.',
      });
      navigate(`/screening/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la creazione della vagliatura.',
        variant: 'destructive',
      });
    },
  });

  // Configurazione del form
  const form = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      date: new Date(),
      screeningNumber: 1, // Default, potrebbe essere calcolato dal backend
      purpose: null,
      notes: null
    },
  });

  // Handler per l'invio del form
  const onSubmit = (values: ScreeningFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/screening')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna indietro
        </Button>
        <h1 className="text-3xl font-bold">Nuova Vagliatura</h1>
        <p className="text-muted-foreground">
          Crea una nuova operazione di vagliatura
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettagli Vagliatura</CardTitle>
          <CardDescription>
            Inserisci i dettagli dell'operazione di vagliatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona una data</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        La data dell'operazione di vagliatura
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="screeningNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Vagliatura</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            field.onChange(isNaN(value) ? 1 : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Il numero progressivo dell'operazione di vagliatura
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceSizeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taglia di Riferimento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una taglia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizesLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full mt-2" />
                              <Skeleton className="h-4 w-full mt-2" />
                            </div>
                          ) : sizes && sizes.length > 0 ? (
                            sizes.map((size) => (
                              <SelectItem key={size.id} value={size.id.toString()}>
                                {size.name} (TP-{size.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              Nessuna taglia disponibile
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        La taglia di riferimento per la vagliatura (sopra/sotto vaglio)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scopo</FormLabel>
                      <FormControl>
                        <Input placeholder="Scopo dell'operazione" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Lo scopo dell'operazione di vagliatura (opzionale)
                      </FormDescription>
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
                      <Textarea placeholder="Note aggiuntive" className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      Note aggiuntive sull'operazione di vagliatura (opzionale)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/screening')}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creazione in corso...' : 'Crea Vagliatura'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}