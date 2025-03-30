import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { ScreeningOperation, InsertScreeningDestinationBasket } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Schema per il form
const formSchema = z.object({
  basketId: z.coerce.number({
    required_error: "Seleziona una cesta",
  }),
  category: z.enum(['sopravaglio', 'sottovaglio'], {
    required_error: "Seleziona una categoria",
  }),
  animalCount: z.coerce.number().nullable().optional(),
  totalWeight: z.coerce.number().nullable().optional(),
  animalsPerKg: z.coerce.number().nullable().optional(),
  sizeId: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ScreeningAddDestination() {
  // Routing
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>('/screening/:id/add-destination');
  const screeningId = params?.id ? parseInt(params.id) : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere i dettagli dell'operazione di vagliatura
  const {
    data: screeningOperation,
    isLoading: operationLoading,
    error: operationError,
  } = useQuery({
    queryKey: ['/api/screening/operations', screeningId],
    queryFn: async () => {
      if (!screeningId) return null;
      return apiRequest<ScreeningOperation>({
        url: `/api/screening/operations/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId,
  });

  // Query per ottenere le ceste disponibili
  const {
    data: availableBaskets,
    isLoading: basketsLoading,
    error: basketsError
  } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: async () => {
      return apiRequest<any[]>({
        url: '/api/baskets',
        method: 'GET'
      });
    },
  });

  // Query per ottenere le taglie
  const {
    data: sizes,
    isLoading: sizesLoading,
    error: sizesError
  } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: async () => {
      return apiRequest<any[]>({
        url: '/api/sizes',
        method: 'GET'
      });
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      basketId: undefined,
      category: undefined,
      animalCount: null,
      totalWeight: null,
      animalsPerKg: null,
      sizeId: null,
      notes: null,
    },
  });

  // Mutation per aggiungere una cesta di destinazione
  const addDestinationBasketMutation = useMutation({
    mutationFn: (data: InsertScreeningDestinationBasket) =>
      apiRequest({
        url: '/api/screening/destination-baskets',
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/destination-baskets', screeningId] });
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations', screeningId] });
      
      toast({
        title: 'Cesta aggiunta',
        description: 'La cesta di destinazione è stata aggiunta con successo alla vagliatura.',
      });
      
      // Ritorna alla pagina di dettaglio dell'operazione
      navigate(`/screening/${screeningId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'aggiunta della cesta.',
        variant: 'destructive',
      });
    },
  });

  // Handler per l'invio del form
  const onSubmit = (values: FormValues) => {
    if (!screeningId) return;
    
    // Calcola il peso medio se è fornito animalsPerKg
    let averageWeight = null;
    if (values.animalsPerKg && values.animalsPerKg > 0) {
      averageWeight = 1000000 / values.animalsPerKg;
    }
    
    // Prepara i dati della cesta di destinazione
    const destinationBasketData: InsertScreeningDestinationBasket = {
      screeningId,
      basketId: values.basketId,
      category: values.category,
      position: null,
      flupsyId: null,
      row: null,
      cycleId: null,
      animalCount: values.animalCount,
      totalWeight: values.totalWeight ? values.totalWeight * 1000 : null, // Conversione in grammi
      animalsPerKg: values.animalsPerKg,
      averageWeight,
      sizeId: values.sizeId,
      notes: values.notes,
      positionAssigned: false,
    };
    
    addDestinationBasketMutation.mutate(destinationBasketData);
  };

  // Calcoli per aggiornamento automatico dei campi correlati
  const calculateValues = (field: 'animalCount' | 'totalWeight' | 'animalsPerKg', value: number) => {
    const currentValues = form.getValues();
    
    if (field === 'animalCount') {
      if (currentValues.totalWeight && value) {
        // Calcola animali per kg
        const animalsPerKg = Math.round((value / (currentValues.totalWeight / 1000)));
        form.setValue('animalsPerKg', animalsPerKg, { shouldValidate: true });
      }
    } else if (field === 'totalWeight') {
      if (currentValues.animalCount && value) {
        // Calcola animali per kg
        const animalsPerKg = Math.round((currentValues.animalCount / (value / 1000)));
        form.setValue('animalsPerKg', animalsPerKg, { shouldValidate: true });
      }
    } else if (field === 'animalsPerKg') {
      if (currentValues.animalCount && value) {
        // Calcola peso totale
        const totalWeight = currentValues.animalCount / value;
        form.setValue('totalWeight', parseFloat(totalWeight.toFixed(2)), { shouldValidate: true });
      } else if (currentValues.totalWeight && value) {
        // Calcola numero animali
        const animalCount = Math.round(currentValues.totalWeight * value / 1000);
        form.setValue('animalCount', animalCount, { shouldValidate: true });
      }
    }
  };

  if (operationLoading || basketsLoading || sizesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(`/screening/${screeningId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (operationError || basketsError || sizesError) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-6 bg-red-50 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Errore</h3>
          <p className="text-red-600">
            Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(`/screening/${screeningId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  if (!screeningOperation || screeningOperation.status !== 'draft') {
    return (
      <div className="container mx-auto p-4">
        <div className="p-6 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Operazione non modificabile</h3>
          <p className="text-yellow-600">
            Non è possibile aggiungere ceste a un'operazione di vagliatura che non è in stato di bozza.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(`/screening/${screeningId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  // Filtra le ceste disponibili (non assegnate a cicli attivi)
  const availableBasketOptions = availableBaskets?.filter(basket => 
    basket.state === 'available' || basket.state === 'inactive'
  ) || [];

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/screening/${screeningId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Aggiungi Cesta Destinazione</h1>
          <p className="text-muted-foreground">
            Vagliatura #{screeningOperation.screeningNumber}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettagli Cesta Destinazione</CardTitle>
          <CardDescription>
            Inserisci i dettagli della cesta di destinazione per questa vagliatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="basketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cesta</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una cesta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBasketOptions.map((basket) => (
                            <SelectItem 
                              key={basket.id} 
                              value={basket.id.toString()}
                            >
                              #{basket.physicalNumber} {basket.cycleCode ? `(${basket.cycleCode})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Seleziona una cesta disponibile come destinazione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sopravaglio">Sopravaglio</SelectItem>
                          <SelectItem value="sottovaglio">Sottovaglio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Indica se questa cesta contiene sopravaglio o sottovaglio
                      </FormDescription>
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
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una taglia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizes?.map((size) => (
                            <SelectItem 
                              key={size.id} 
                              value={size.id.toString()}
                            >
                              {size.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Taglia stimata degli animali
                      </FormDescription>
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
                          type="number"
                          placeholder="Inserisci il numero di animali"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : parseInt(e.target.value);
                            field.onChange(value);
                            if (value) calculateValues('animalCount', value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Numero stimato di animali nella cesta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso Totale (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Inserisci il peso totale in kg"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                            field.onChange(value);
                            if (value) calculateValues('totalWeight', value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Peso totale in kg degli animali
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animalsPerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animali per Kg</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Inserisci gli animali per kg"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : parseInt(e.target.value);
                            field.onChange(value);
                            if (value) calculateValues('animalsPerKg', value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Numero di animali per kg
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note"
                          className="resize-none"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Informazioni aggiuntive sulla cesta di destinazione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/screening/${screeningId}`)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={addDestinationBasketMutation.isPending}
                >
                  {addDestinationBasketMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Cesta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}