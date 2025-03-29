import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  MapPin,
  CheckSquare
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { 
  ScreeningOperation, 
  ScreeningSourceBasket, 
  ScreeningDestinationBasket
} from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type SourceBasketDetail = ScreeningSourceBasket & {
  basket?: any;
  cycle?: any;
  lastOperation?: any;
};

type DestinationBasketDetail = ScreeningDestinationBasket & {
  basket?: any;
  history?: any[];
  lotReferences?: any[];
};

export default function ScreeningDetailPage() {
  const [_, params] = useRoute<{ id: string }>('/screening/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const screeningId = params?.id ? parseInt(params.id, 10) : null;

  const [activeTab, setActiveTab] = useState('source-baskets');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel' | null>(null);

  // Query per ottenere i dettagli dell'operazione di vagliatura
  const {
    data: screening,
    isLoading: screeningLoading,
    error: screeningError,
  } = useQuery({
    queryKey: ['/api/screening/operations', screeningId],
    queryFn: async () => {
      if (!screeningId) return null;
      return apiRequest<ScreeningOperation>(`/api/screening/operations/${screeningId}`);
    },
    enabled: !!screeningId,
  });

  // Query per ottenere le ceste di origine
  const {
    data: sourceBaskets,
    isLoading: sourceLoading,
    error: sourceError,
  } = useQuery({
    queryKey: ['/api/screening/source-baskets', screeningId],
    queryFn: async () => {
      if (!screeningId) return [];
      return apiRequest<SourceBasketDetail[]>(`/api/screening/source-baskets/${screeningId}`);
    },
    enabled: !!screeningId,
  });

  // Query per ottenere le ceste di destinazione
  const {
    data: destinationBaskets,
    isLoading: destinationLoading,
    error: destinationError,
  } = useQuery({
    queryKey: ['/api/screening/destination-baskets', screeningId],
    queryFn: async () => {
      if (!screeningId) return [];
      return apiRequest<DestinationBasketDetail[]>(`/api/screening/destination-baskets/${screeningId}`);
    },
    enabled: !!screeningId,
  });

  // Mutation per completare l'operazione di vagliatura
  const completeMutation = useMutation({
    mutationFn: () => {
      if (!screeningId) throw new Error('ID operazione non valido');
      return apiRequest(`/api/screening/operations/${screeningId}/complete`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations', screeningId] });
      toast({
        title: 'Operazione completata',
        description: 'L\'operazione di vagliatura è stata completata con successo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante il completamento dell\'operazione.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per annullare l'operazione di vagliatura
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!screeningId) throw new Error('ID operazione non valido');
      return apiRequest(`/api/screening/operations/${screeningId}/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations', screeningId] });
      toast({
        title: 'Operazione annullata',
        description: 'L\'operazione di vagliatura è stata annullata.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'annullamento dell\'operazione.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per rimuovere una cesta di origine
  const removeSourceBasketMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/screening/source-baskets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/source-baskets', screeningId] });
      toast({
        title: 'Cesta di origine rimossa',
        description: 'La cesta di origine è stata rimossa con successo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la rimozione della cesta di origine.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per rimuovere una cesta di destinazione
  const removeDestinationBasketMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/screening/destination-baskets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/destination-baskets', screeningId] });
      toast({
        title: 'Cesta di destinazione rimossa',
        description: 'La cesta di destinazione è stata rimossa con successo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la rimozione della cesta di destinazione.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per dismettere una cesta di origine
  const dismissSourceBasketMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/screening/source-baskets/${id}/dismiss`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/source-baskets', screeningId] });
      toast({
        title: 'Cesta di origine dismessa',
        description: 'La cesta di origine è stata dismessa con successo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la dismissione della cesta di origine.',
        variant: 'destructive',
      });
    },
  });

  // Handler per confermare un'azione
  const handleConfirmAction = () => {
    if (confirmAction === 'complete') {
      completeMutation.mutate();
    } else if (confirmAction === 'cancel') {
      cancelMutation.mutate();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // Funzione per ottenere il badge dello stato
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      case 'completed':
        return <Badge variant="success">Completata</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annullata</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isLoading = screeningLoading || sourceLoading || destinationLoading;
  const hasError = screeningError || sourceError || destinationError;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/screening')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna indietro
          </Button>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/screening')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna indietro
          </Button>
          <h1 className="text-3xl font-bold">Errore</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Si è verificato un errore</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Si è verificato un errore durante il caricamento dei dati dell'operazione di vagliatura.</p>
            <p>Riprova più tardi o contatta l'assistenza.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/screening')}>Torna alla lista</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/screening')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna indietro
          </Button>
          <h1 className="text-3xl font-bold">Operazione non trovata</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Operazione di vagliatura non trovata</CardTitle>
          </CardHeader>
          <CardContent>
            <p>L'operazione di vagliatura richiesta non esiste o è stata rimossa.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/screening')}>Torna alla lista</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isDraft = screening.status === 'draft';
  const sourceCount = sourceBaskets?.length || 0;
  const destinationCount = destinationBaskets?.length || 0;
  
  // Verifica se tutte le ceste di origine sono state dismesse
  const allSourceDismissed = sourceBaskets?.every(sb => sb.dismissed) || false;
  
  // Verifica se tutte le ceste di destinazione hanno una posizione assegnata
  const allDestinationPositioned = destinationBaskets?.every(db => db.positionAssigned) || false;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/screening')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna indietro
        </Button>
        <h1 className="text-3xl font-bold">
          Vagliatura #{screening.screeningNumber} 
          <span className="ml-3">
            {getStatusBadge(screening.status)}
          </span>
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(screening.date), 'dd MMMM yyyy', { locale: it })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Operazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">ID:</span>
                <span>{screening.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Numero:</span>
                <span>{screening.screeningNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Data:</span>
                <span>{format(new Date(screening.date), 'dd/MM/yyyy', { locale: it })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Taglia di riferimento:</span>
                <span>TP-{screening.referenceSizeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Stato:</span>
                <span>{getStatusBadge(screening.status)}</span>
              </div>
              {screening.purpose && (
                <div className="flex justify-between">
                  <span className="font-medium">Scopo:</span>
                  <span>{screening.purpose}</span>
                </div>
              )}
              {screening.notes && (
                <div className="pt-2">
                  <span className="font-medium">Note:</span>
                  <p className="mt-1 text-sm">{screening.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
          {isDraft && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setConfirmAction('complete');
                  setShowConfirmDialog(true);
                }}
                disabled={completeMutation.isPending || !allSourceDismissed || !allDestinationPositioned}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Completa
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmAction('cancel');
                  setShowConfirmDialog(true);
                }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Annulla
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Ceste di origine:</span>
                <span>{sourceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Ceste dismesse:</span>
                <span>{sourceBaskets?.filter(sb => sb.dismissed).length || 0} / {sourceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Ceste di destinazione:</span>
                <span>{destinationCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Ceste con posizione:</span>
                <span>{destinationBaskets?.filter(db => db.positionAssigned).length || 0} / {destinationCount}</span>
              </div>
              
              {isDraft && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2">Stato completamento:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      {allSourceDismissed 
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                        : <XCircle className="h-4 w-4 text-red-500" />}
                      Tutte le ceste di origine dismesse
                    </li>
                    <li className="flex items-center gap-2">
                      {allDestinationPositioned 
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                        : <XCircle className="h-4 w-4 text-red-500" />}
                      Tutte le ceste di destinazione con posizione
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          {isDraft && (
            <CardFooter className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/screening/${screeningId}/add-source`)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Aggiungi Cesta Origine
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/screening/${screeningId}/add-destination`)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Aggiungi Cesta Destinazione
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettagli Ceste</CardTitle>
          <CardDescription>
            Gestisci le ceste di origine e destinazione per questa vagliatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="source-baskets" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="source-baskets">
                Ceste Origine ({sourceCount})
              </TabsTrigger>
              <TabsTrigger value="destination-baskets">
                Ceste Destinazione ({destinationCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="source-baskets">
              {sourceBaskets?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna cesta di origine aggiunta.
                  {isDraft && (
                    <div className="mt-4">
                      <Button onClick={() => navigate(`/screening/${screeningId}/add-source`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Cesta Origine
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Cesta</TableHead>
                      <TableHead>Flupsy</TableHead>
                      <TableHead>Codice Ciclo</TableHead>
                      <TableHead>Peso medio</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceBaskets?.map((source) => (
                      <TableRow key={source.id}>
                        <TableCell>
                          {source.basket?.physicalNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {source.basket?.flupsyId 
                            ? `FLUPSY ${source.basket.flupsyId}` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {source.cycle?.lotId 
                            ? `${source.cycle.lotId}-${source.basket?.physicalNumber || 'N/A'}` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {source.lastOperation?.averageWeight 
                            ? `${source.lastOperation.averageWeight.toFixed(2)} mg` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {source.dismissed 
                            ? <Badge variant="success">Dismessa</Badge> 
                            : <Badge variant="outline">Attiva</Badge>}
                        </TableCell>
                        <TableCell>
                          {isDraft && (
                            <div className="flex gap-2">
                              {!source.dismissed && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Sei sicuro di voler dismettere questa cesta?')) {
                                      dismissSourceBasketMutation.mutate(source.id);
                                    }
                                  }}
                                  disabled={dismissSourceBasketMutation.isPending}
                                >
                                  <CheckSquare className="h-4 w-4 mr-2" />
                                  Dismetti
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Sei sicuro di voler rimuovere questa cesta?')) {
                                    removeSourceBasketMutation.mutate(source.id);
                                  }
                                }}
                                disabled={removeSourceBasketMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Rimuovi
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="destination-baskets">
              {destinationBaskets?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna cesta di destinazione aggiunta.
                  {isDraft && (
                    <div className="mt-4">
                      <Button onClick={() => navigate(`/screening/${screeningId}/add-destination`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Cesta Destinazione
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Cesta</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Posizione</TableHead>
                      <TableHead>Numero animali</TableHead>
                      <TableHead>Peso medio</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinationBaskets?.map((destination) => (
                      <TableRow key={destination.id}>
                        <TableCell>
                          {destination.basket?.physicalNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {destination.category === 'above' 
                            ? <Badge variant="success">Sopra vaglio</Badge> 
                            : <Badge variant="default">Sotto vaglio</Badge>}
                        </TableCell>
                        <TableCell>
                          {destination.positionAssigned ? (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-green-500" />
                              FLUPSY {destination.flupsyId}, 
                              Riga {destination.row}, 
                              Pos {destination.position}
                            </div>
                          ) : (
                            <Badge variant="outline">Non assegnata</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {destination.animalCount 
                            ? destination.animalCount.toLocaleString() 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {destination.averageWeight 
                            ? `${destination.averageWeight.toFixed(2)} mg` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {isDraft && (
                            <div className="flex gap-2">
                              {!destination.positionAssigned && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => navigate(`/screening/${screeningId}/position/${destination.id}`)}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Assegna
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Sei sicuro di voler rimuovere questa cesta?')) {
                                    removeDestinationBasketMutation.mutate(destination.id);
                                  }
                                }}
                                disabled={removeDestinationBasketMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Rimuovi
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'complete' 
                ? 'Completa operazione di vagliatura' 
                : 'Annulla operazione di vagliatura'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'complete' 
                ? 'Sei sicuro di voler completare questa operazione di vagliatura? Questa azione è irreversibile e finalizzerà i cambiamenti effettuati.' 
                : 'Sei sicuro di voler annullare questa operazione di vagliatura? Questa azione è irreversibile.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction === 'complete' ? 'Completa' : 'Annulla operazione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}