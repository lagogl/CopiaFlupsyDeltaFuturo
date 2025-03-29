import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  ClipboardCheck,
  FilterX,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { ScreeningOperation } from '@shared/schema';
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

export default function ScreeningPage() {
  const [activeTab, setActiveTab] = useState('draft');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere le operazioni di vagliatura in base allo stato
  const { data: operations, isLoading, error } = useQuery({
    queryKey: ['/api/screening/operations', activeTab],
    queryFn: async () => {
      const url = activeTab === 'all' 
        ? '/api/screening/operations'
        : `/api/screening/operations?status=${activeTab}`;
      return apiRequest<ScreeningOperation[]>(url);
    },
  });

  // Mutation per completare un'operazione di vagliatura
  const completeMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/screening/operations/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
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

  // Mutation per annullare un'operazione di vagliatura
  const cancelMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/screening/operations/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
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

  const handleComplete = (id: number) => {
    if (confirm('Sei sicuro di voler completare questa operazione di vagliatura? Questa azione non può essere annullata.')) {
      completeMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    if (confirm('Sei sicuro di voler annullare questa operazione di vagliatura? Questa azione non può essere annullata.')) {
      cancelMutation.mutate(id);
    }
  };

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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vagliatura</h1>
          <p className="text-muted-foreground">
            Gestione delle operazioni di vagliatura
          </p>
        </div>
        <Link href="/screening/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuova Vagliatura
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operazioni di Vagliatura</CardTitle>
          <CardDescription>
            Visualizza e gestisci tutte le operazioni di vagliatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="draft" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="draft">Bozze</TabsTrigger>
              <TabsTrigger value="completed">Completate</TabsTrigger>
              <TabsTrigger value="cancelled">Annullate</TabsTrigger>
              <TabsTrigger value="all">Tutte</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  Si è verificato un errore nel caricamento delle operazioni.
                </div>
              ) : operations && operations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Numero</TableHead>
                      <TableHead>Taglia Riferimento</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell>{operation.id}</TableCell>
                        <TableCell>
                          {format(new Date(operation.date), 'dd/MM/yyyy', { locale: it })}
                        </TableCell>
                        <TableCell>{operation.screeningNumber}</TableCell>
                        <TableCell>TP-{operation.referenceSizeId}</TableCell>
                        <TableCell>{getStatusBadge(operation.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/screening/${operation.id}`)}
                            >
                              <ClipboardCheck className="h-4 w-4 mr-2" />
                              Dettagli
                            </Button>
                            
                            {operation.status === 'draft' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleComplete(operation.id)}
                                  disabled={completeMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Completa
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancel(operation.id)}
                                  disabled={cancelMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Annulla
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna operazione di vagliatura trovata.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}