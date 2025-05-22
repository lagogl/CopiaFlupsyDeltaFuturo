import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { 
  Database, ArrowDownToLine, ArrowUpFromLine, Save, RefreshCw, AlertTriangle,
  Clock, FileText, HardDrive, CheckCircle, XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Tipo per i backup
interface Backup {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
}

export default function DbSyncPage() {
  const [remoteUrl, setRemoteUrl] = useState('');
  const { toast } = useToast();

  // Query per ottenere i backup disponibili
  const { 
    data: backupsData, 
    isLoading: isLoadingBackups,
    refetch: refetchBackups
  } = useQuery({
    queryKey: ['/api/db-sync/backups'],
    staleTime: 1000 * 60 // 1 minuto
  });

  // Mutation per creare un backup
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/db-sync/backup', 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Backup creato",
        description: "Il backup del database locale è stato creato con successo",
        variant: "default"
      });
      refetchBackups();
    },
    onError: (error) => {
      toast({
        title: "Errore durante la creazione del backup",
        description: error.message || "Si è verificato un errore durante la creazione del backup",
        variant: "destructive"
      });
    }
  });

  // Mutation per sincronizzare dal database remoto al locale
  const syncFromRemoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest({ 
        url: '/api/db-sync/from-remote',
        method: 'POST',
        body: { remoteUrl }
      });
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "I dati sono stati sincronizzati dal database remoto a quello locale",
        variant: "default"
      });
      refetchBackups();
    },
    onError: (error) => {
      toast({
        title: "Errore durante la sincronizzazione",
        description: error.message || "Si è verificato un errore durante la sincronizzazione dal database remoto",
        variant: "destructive"
      });
    }
  });

  // Mutation per sincronizzare dal database locale al remoto
  const syncToRemoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/db-sync/to-remote', 'POST', { remoteUrl });
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "I dati sono stati sincronizzati dal database locale a quello remoto",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore durante la sincronizzazione",
        description: error.message || "Si è verificato un errore durante la sincronizzazione verso il database remoto",
        variant: "destructive"
      });
    }
  });

  const backups = backupsData?.backups || [];
  const isAnyMutationLoading = 
    createBackupMutation.isPending || 
    syncFromRemoteMutation.isPending || 
    syncToRemoteMutation.isPending;

  // Formatta la data in formato leggibile
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestione Database Locale</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci la sincronizzazione tra database locale e remoto
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Torna alla Home</Button>
        </Link>
      </div>

      <Tabs defaultValue="sync" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sync">Sincronizzazione</TabsTrigger>
          <TabsTrigger value="backups">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  <span>Database Locale</span>
                </CardTitle>
                <CardDescription>
                  Il tuo database PostgreSQL locale attuale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Stato:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Attivo
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Connessione:</span>
                  <span className="text-sm">PostgreSQL locale</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">URL:</span>
                  <span className="text-sm font-mono text-muted-foreground">localhost:{process.env.PGPORT || '5432'}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => createBackupMutation.mutate()}
                  disabled={isAnyMutationLoading}
                >
                  {createBackupMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Crea Backup
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <span>Database Remoto</span>
                </CardTitle>
                <CardDescription>
                  Configura la connessione al database remoto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="remote-url">URL Database Remoto</Label>
                    <Input
                      id="remote-url"
                      placeholder="postgresql://username:password@host:port/database"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Inserisci l'URL completo del database PostgreSQL remoto
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => syncFromRemoteMutation.mutate()}
                  disabled={!remoteUrl || isAnyMutationLoading}
                >
                  {syncFromRemoteMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                  )}
                  Sincronizza dal Remoto al Locale
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => syncToRemoteMutation.mutate()}
                  disabled={!remoteUrl || isAnyMutationLoading}
                >
                  {syncToRemoteMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  )}
                  Sincronizza dal Locale al Remoto
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Prima di sincronizzare, assicurati di creare un backup del database locale.
              La sincronizzazione sovrascriverà tutti i dati nel database di destinazione.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Backup Disponibili</span>
              </CardTitle>
              <CardDescription>
                Elenco dei backup del database locale
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBackups ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <XCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nessun backup disponibile</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => createBackupMutation.mutate()}
                    disabled={isAnyMutationLoading}
                  >
                    Crea il primo backup
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableCaption>Elenco dei backup disponibili</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome File</TableHead>
                      <TableHead>Data Creazione</TableHead>
                      <TableHead>Dimensione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup: Backup) => (
                      <TableRow key={backup.fileName}>
                        <TableCell className="font-mono text-xs">{backup.fileName}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            {formatDate(backup.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>{backup.sizeFormatted}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => refetchBackups()}
                disabled={isLoadingBackups}
              >
                {isLoadingBackups ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Aggiorna
              </Button>
              <Button 
                onClick={() => createBackupMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {createBackupMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Crea Nuovo Backup
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}