import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import OperationForm from '@/components/OperationForm';

export default function EditOperation() {
  const [, params] = useRoute<{ id: string }>('/operations/edit/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const operationId = params?.id ? parseInt(params.id) : 0;
  
  // Fetch operation details
  const { data: operation, isLoading: operationLoading, error: operationError } = useQuery({
    queryKey: [`/api/operations/${operationId}`],
    queryFn: () => apiRequest({ url: `/api/operations/${operationId}` }),
    enabled: !!operationId,
  });
  
  // Mutation for updating operation
  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Updating operation with data:', data);
      return apiRequest({
        url: `/api/operations/${operationId}`,
        method: 'PATCH',
        body: data.operation
      });
    },
    onSuccess: () => {
      toast({
        title: 'Operazione aggiornata',
        description: 'L\'operazione è stata aggiornata con successo',
        variant: 'success',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [`/api/operations/${operationId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/operations'],
      });
      
      if (operation?.cycleId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/cycles/${operation.cycleId}`],
        });
      }
      
      // Redirect to operation detail page
      navigate(`/operations/${operationId}`);
    },
    onError: (error) => {
      console.error('Error updating operation:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'aggiornamento dell\'operazione',
        variant: 'destructive',
      });
    }
  });
  
  // Loading state
  if (operationLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href={`/operations/${operationId}`}>
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna al dettaglio operazione
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Caricamento...</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (operationError || !operation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/operations">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alle operazioni
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Errore</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Impossibile caricare l'operazione</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Si è verificato un errore durante il caricamento dei dati dell'operazione.</p>
            <p className="mt-4">L'operazione potrebbe essere stata eliminata o non hai i permessi per accedervi.</p>
            <Button className="mt-6" onClick={() => navigate('/operations')}>
              Torna all'elenco delle operazioni
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href={`/operations/${operationId}`}>
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al dettaglio operazione
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Modifica Operazione #{operationId}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dettagli operazione</CardTitle>
        </CardHeader>
        <CardContent>
          <OperationForm
            onSubmit={(data) => {
              console.log('Edit operation form - Submitting data:', data);
              
              // Assicurati che i campi numerici siano effettivamente numeri
              const formattedData = {
                ...data,
                animalCount: data.animalCount ? Number(data.animalCount) : null,
                animalsPerKg: data.animalsPerKg ? Number(data.animalsPerKg) : null,
                totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
                // Formatta la data come stringa ISO
                date: data.date instanceof Date ? data.date.toISOString() : data.date,
                // Assicurati che notes sia salvato correttamente
                notes: data.notes || null,
                // Mantieni il cycleId originale se non specificato
                cycleId: data.cycleId || operation.cycleId
              };
              
              console.log('Formatted operation data:', formattedData);
              updateMutation.mutate({ operation: formattedData });
            }}
            isLoading={updateMutation.isPending}
            defaultValues={{
              type: operation.type,
              date: new Date(operation.date),
              basketId: operation.basketId,
              cycleId: operation.cycleId,
              sizeId: operation.sizeId,
              sgrId: operation.sgrId,
              lotId: operation.lotId,
              animalCount: operation.animalCount,
              totalWeight: operation.totalWeight,
              animalsPerKg: operation.animalsPerKg,
              deadCount: operation.deadCount,
              mortalityRate: operation.mortalityRate,
              notes: operation.notes || "",
              // Se ci sono campi personalizzati aggiuntivi, aggiungerli qui
            }}
            editMode={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}