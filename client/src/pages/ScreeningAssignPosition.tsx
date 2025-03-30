import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { ScreeningDestinationBasket } from '@shared/schema';
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

// Schema per il form
const formSchema = z.object({
  flupsyId: z.coerce.number({
    required_error: "Seleziona un FLUPSY",
  }),
  row: z.string({
    required_error: "Seleziona una riga",
  }),
  position: z.coerce.number({
    required_error: "Seleziona una posizione",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ScreeningAssignPosition() {
  // Routing
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ screeningId: string, destinationId: string }>('/screening/:screeningId/position/:destinationId');
  
  const screeningId = params?.screeningId ? parseInt(params.screeningId) : null;
  const destinationId = params?.destinationId ? parseInt(params.destinationId) : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere la cesta di destinazione
  const {
    data: destinationBasket,
    isLoading: basketLoading,
    error: basketError,
  } = useQuery({
    queryKey: ['/api/screening/destination-baskets/single', destinationId],
    queryFn: async () => {
      if (!destinationId) return null;
      // Ottieni prima tutte le ceste di destinazione per l'operazione di vagliatura
      const allDestinationBaskets = await apiRequest<ScreeningDestinationBasket[]>({
        url: `/api/screening/destination-baskets/${screeningId}`,
        method: 'GET'
      });
      
      // Trova la cesta specifica tramite ID
      return allDestinationBaskets.find(basket => basket.id === destinationId) || null;
    },
    enabled: !!destinationId && !!screeningId,
  });

  // Query per ottenere tutti i FLUPSY
  const {
    data: flupsys,
    isLoading: flupsysLoading,
    error: flupsysError
  } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: async () => {
      return apiRequest<any[]>({
        url: '/api/flupsys',
        method: 'GET'
      });
    },
  });

  // Query per ottenere tutte le ceste (per controllare quali posizioni sono occupate)
  const {
    data: allBaskets,
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

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flupsyId: undefined,
      row: "",
      position: undefined,
    },
  });

  // Definisci le righe standard
  const standardRows = ["SX", "DX"];

  // Estrai le posizioni occupate
  const occupiedPositions = useMemo(() => {
    if (!allBaskets) return {};
    
    const positions: Record<string, Set<number>> = {};
    
    // Filtra solo le ceste attive
    const activeBaskets = allBaskets.filter(basket => basket.state === 'active');
    
    // Raggruppa per flupsy e riga
    activeBaskets.forEach(basket => {
      if (basket.flupsyId && basket.row && basket.position !== null) {
        const key = `${basket.flupsyId}-${basket.row}`;
        if (!positions[key]) {
          positions[key] = new Set();
        }
        positions[key].add(basket.position);
      }
    });
    
    return positions;
  }, [allBaskets]);

  // Ottieni le righe disponibili per il flupsy selezionato
  const availableRows = useMemo(() => {
    const selectedFlupsyId = form.watch('flupsyId');
    if (!selectedFlupsyId) return standardRows;
    
    return standardRows;
  }, [form.watch('flupsyId')]);

  // Ottieni le posizioni disponibili per il flupsy e la riga selezionati
  const availablePositions = useMemo(() => {
    const selectedFlupsyId = form.watch('flupsyId');
    const selectedRow = form.watch('row');
    
    if (!selectedFlupsyId || !selectedRow || !flupsys) return [];
    
    // Trova il flupsy selezionato
    const flupsy = flupsys.find(f => f.id === selectedFlupsyId);
    if (!flupsy) return [];
    
    // Calcola il numero totale di posizioni (capacità del flupsy)
    const totalPositions = flupsy.capacity || 10; // Default a 10 se non è specificato
    
    // Genera le posizioni da 1 a totalPositions
    const positions = Array.from({ length: totalPositions }, (_, i) => i + 1);
    
    // Filtra le posizioni occupate
    const key = `${selectedFlupsyId}-${selectedRow}`;
    const occupied = occupiedPositions[key] || new Set();
    
    return positions.filter(pos => !occupied.has(pos));
  }, [form.watch('flupsyId'), form.watch('row'), flupsys, occupiedPositions]);

  // Mutation per assegnare una posizione alla cesta
  const assignPositionMutation = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest({
        url: `/api/screening/destination-baskets/${destinationId}/assign-position`,
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/destination-baskets', screeningId] });
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations', screeningId] });
      
      toast({
        title: 'Posizione assegnata',
        description: 'La cesta di destinazione è stata assegnata a una posizione.',
      });
      
      // Ritorna alla pagina di dettaglio della vagliatura
      navigate(`/screening/${screeningId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'assegnazione della posizione.',
        variant: 'destructive',
      });
    },
  });

  // Handler per l'invio del form
  const onSubmit = (values: FormValues) => {
    if (!destinationId) return;
    assignPositionMutation.mutate(values);
  };

  if (basketLoading || flupsysLoading || basketsLoading) {
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (basketError || flupsysError || basketsError) {
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

  if (!destinationBasket) {
    return (
      <div className="container mx-auto p-4">
        <div className="p-6 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Cesta non trovata</h3>
          <p className="text-yellow-600">
            Non è stato possibile trovare la cesta di destinazione specificata.
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/screening/${screeningId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assegna Posizione</h1>
          <p className="text-muted-foreground">
            {destinationBasket.category === 'sopravaglio' ? 'Sopravaglio' : 'Sottovaglio'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona Posizione</CardTitle>
          <CardDescription>
            Assegna una posizione FLUPSY alla cesta di destinazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="flupsyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FLUPSY</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          // Reset row and position when flupsy changes
                          form.setValue('row', '');
                          form.setValue('position', undefined);
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un FLUPSY" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flupsys?.map((flupsy) => (
                            <SelectItem 
                              key={flupsy.id} 
                              value={flupsy.id.toString()}
                            >
                              {flupsy.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Seleziona il FLUPSY dove posizionare la cesta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="row"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Riga</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset position when row changes
                          form.setValue('position', undefined);
                        }}
                        value={field.value}
                        disabled={!form.watch('flupsyId')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una riga" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRows.map((row) => (
                            <SelectItem 
                              key={row} 
                              value={row}
                            >
                              {row}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Seleziona la riga del FLUPSY
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
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        disabled={!form.watch('flupsyId') || !form.watch('row')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una posizione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availablePositions.map((position) => (
                            <SelectItem 
                              key={position} 
                              value={position.toString()}
                            >
                              Posizione {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Seleziona la posizione nella riga
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
                  disabled={assignPositionMutation.isPending}
                >
                  {assignPositionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assegnazione...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Assegna Posizione
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