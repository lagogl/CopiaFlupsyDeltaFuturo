import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Download, Upload, Trash2, Database, AlertTriangle, ArrowUpDown, FileCheck } from 'lucide-react';

import MainLayout from '@/layouts/MainLayout';

interface BackupInfo {
  id: string;
  filename: string;
  timestamp: string;
  size: number;
}

export default function BackupPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('backups');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Mutation per ripristinare da file caricato
  const restoreFromFileMutation = useMutation({
    mutationFn: async ({ sqlContent, fileName }: { sqlContent: string, fileName: string }) => {
      return apiRequest('/api/database/restore-file', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sqlContent, fileName })
      });
    },
    onSuccess: () => {
      toast({
        title: "Database ripristinato con successo",
        description: "Il database è stato ripristinato correttamente dal file caricato.",
      });
      setSelectedFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Errore durante il ripristino",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  });
  
  // Funzione per gestire il caricamento e invio del file
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona un file SQL prima di procedere con il ripristino.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Converti il file in base64
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        if (!event.target || !event.target.result) {
          throw new Error("Errore nella lettura del file");
        }
        
        // Ottieni il contenuto come base64 rimuovendo il prefisso "data:*;base64,"
        const base64String = (event.target.result as string).split(',')[1] || (event.target.result as string);
        
        // Invia al server
        await restoreFromFileMutation.mutateAsync({
          sqlContent: base64String,
          fileName: selectedFile.name
        });
      };
      
      fileReader.onerror = () => {
        throw new Error("Errore nella lettura del file");
      };
      
      // Leggi il file come Data URL (base64)
      fileReader.readAsDataURL(selectedFile);
      
    } catch (error) {
      console.error("Errore durante l'upload:", error);
      toast({
        title: "Errore di caricamento",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const queryClient = useQueryClient();
  
  // Query per recuperare i backup disponibili
  const { 
    data: backups = [], 
    isLoading: isLoadingBackups,
    isError: isBackupsError,
    refetch: refetchBackups
  } = useQuery<BackupInfo[]>({
    queryKey: ['/api/database/backups'],
    refetchOnWindowFocus: false
  });
  
  // Mutation per creare un nuovo backup
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/database/backup', { method: 'POST' });
    },
    onSuccess: () => {
      toast({
        title: "Backup creato con successo",
        description: "Il nuovo backup è stato creato e salvato correttamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/database/backups'] });
    },
    onError: (error) => {
      toast({
        title: "Errore durante la creazione del backup",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation per ripristinare da un backup
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest(`/api/database/restore/${backupId}`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({
        title: "Database ripristinato con successo",
        description: "Il database è stato ripristinato correttamente dal backup selezionato.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore durante il ripristino",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation per eliminare un backup
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return apiRequest(`/api/database/backups/${backupId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({
        title: "Backup eliminato",
        description: "Il backup è stato eliminato correttamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/database/backups'] });
    },
    onError: (error) => {
      toast({
        title: "Errore durante l'eliminazione",
        description: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  });
  
  // Formatta dimensione file in KB o MB
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    }
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  // Formatta la data in formato leggibile
  const formatDate = (dateString: string): string => {
    // Se la data è nel formato unix timestamp o millesimi di secondo,
    // convertila in numero e poi in oggetto Date
    if (!isNaN(Number(dateString))) {
      const timestamp = Number(dateString);
      // Controlla se è in secondi (timestamp unix) o millisecondi
      const date = timestamp < 10000000000 
        ? new Date(timestamp * 1000)  // Se è in secondi (formato unix)
        : new Date(timestamp);        // Se è già in millisecondi
      
      return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Altrimenti prova a parsare direttamente la stringa
    try {
      const date = new Date(dateString);
      // Verifica che la data sia valida
      if (isNaN(date.getTime())) {
        // Se la data non è valida, mostra la stringa originale
        console.warn(`Data non valida: ${dateString}`);
        return dateString;
      }
      
      return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Errore nella formattazione della data:", error);
      return dateString;
    }
  };

  return (
    <MainLayout>
      <Helmet>
        <title>Gestione Backup - Flupsy Manager</title>
      </Helmet>
      
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gestione Backup Database</h1>
            <p className="text-muted-foreground mt-1">
              Crea, ripristina e gestisci i backup del database dell'applicazione
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={createBackupMutation.isPending}
                  className="bg-primary"
                >
                  {createBackupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Crea nuovo backup
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma creazione backup</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per creare un nuovo backup completo del database. 
                    Questa operazione potrebbe richiedere alcuni secondi in base alla dimensione del database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                    className="bg-primary"
                  >
                    {createBackupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creazione in corso...
                      </>
                    ) : (
                      'Sì, crea backup'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="backups">Backup Disponibili</TabsTrigger>
            <TabsTrigger value="restore">Ripristino</TabsTrigger>
          </TabsList>
          
          <TabsContent value="backups" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup Disponibili</CardTitle>
                <CardDescription>
                  Elenco di tutti i backup del database disponibili nel sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBackups ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Caricamento backup...</span>
                  </div>
                ) : isBackupsError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Errore</AlertTitle>
                    <AlertDescription>
                      Si è verificato un errore durante il caricamento dei backup.
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchBackups()}>
                        Riprova
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : backups.length === 0 ? (
                  <Alert>
                    <AlertTitle>Nessun backup disponibile</AlertTitle>
                    <AlertDescription>
                      Non ci sono backup salvati nel sistema. Crea un nuovo backup usando il pulsante in alto.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Dimensione</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backups.map((backup) => (
                          <TableRow key={backup.id}>
                            <TableCell className="font-medium truncate max-w-[200px]">
                              {backup.filename}
                            </TableCell>
                            <TableCell>{formatDate(backup.timestamp)}</TableCell>
                            <TableCell>{formatFileSize(backup.size)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="outline">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Scarica backup</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Stai per scaricare questo backup sul tuo dispositivo.
                                        Il file è in formato SQL e può essere utilizzato per ripristinare il database in futuro.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction asChild>
                                        <a 
                                          href="/api/database/download" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                        >
                                          <Download className="mr-2 h-4 w-4" />
                                          Scarica
                                        </a>
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="outline">
                                      <ArrowUpDown className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Stai per ripristinare il database da un backup. Tutti i dati attuali saranno sostituiti con quelli nel backup selezionato.
                                        <br /><br />
                                        <strong>Questa operazione non può essere annullata.</strong>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => restoreBackupMutation.mutate(backup.id)}
                                        disabled={restoreBackupMutation.isPending}
                                        className="bg-yellow-500 hover:bg-yellow-600"
                                      >
                                        {restoreBackupMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Ripristino in corso...
                                          </>
                                        ) : (
                                          'Sì, ripristina'
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="outline" className="text-red-500 hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Elimina backup</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler eliminare questo backup? Questa operazione non può essere annullata.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteBackupMutation.mutate(backup.id)}
                                        disabled={deleteBackupMutation.isPending}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        {deleteBackupMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Eliminazione...
                                          </>
                                        ) : (
                                          'Sì, elimina'
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => refetchBackups()}
                  disabled={isLoadingBackups}
                  className="ml-auto"
                >
                  {isLoadingBackups ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aggiornamento...
                    </>
                  ) : (
                    'Aggiorna lista'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="restore" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ripristino Database</CardTitle>
                <CardDescription>
                  Ripristina il database da un backup locale o carica un file SQL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Attenzione</AlertTitle>
                  <AlertDescription>
                    Il ripristino sovrascriverà completamente tutti i dati esistenti nel database.
                    Assicurati di avere un backup recente prima di procedere.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Carica file SQL</h3>
                    
                    <div 
                      className="text-center py-10 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
                      onClick={() => document.getElementById('sql-file-input')?.click()}
                    >
                      <input
                        id="sql-file-input"
                        type="file"
                        accept=".sql"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                          }
                        }}
                      />
                      {selectedFile ? (
                        <>
                          <FileCheck className="h-10 w-10 mx-auto mb-4 text-primary" />
                          <p className="mb-2 text-sm font-medium">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)} - Clicca per selezionare un altro file
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            Clicca per selezionare un file SQL da caricare
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Solo file .sql fino a 20MB
                          </p>
                        </>
                      )}
                    </div>
                    
                    {selectedFile && (
                      <div className="mt-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              disabled={isUploading}
                              className="w-full bg-yellow-500 hover:bg-yellow-600"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Ripristino in corso...
                                </>
                              ) : (
                                <>
                                  <ArrowUpDown className="mr-2 h-4 w-4" />
                                  Ripristina database da questo file
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Stai per ripristinare il database dal file: <strong>{selectedFile.name}</strong>
                                <br /><br />
                                Questa operazione sostituirà tutti i dati attuali con quelli nel file selezionato.
                                <br /><br />
                                <strong>Questa operazione non può essere annullata.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  // Implementa il caricamento del file e il ripristino
                                  handleFileUpload();
                                }}
                                disabled={isUploading}
                                className="bg-yellow-500 hover:bg-yellow-600"
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Ripristino in corso...
                                  </>
                                ) : (
                                  'Sì, ripristina'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Download backup completo</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Scarica un backup completo del database in formato SQL per conservarlo in locale.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button>
                          <Download className="mr-2 h-4 w-4" />
                          Scarica backup completo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Scarica backup completo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Stai per scaricare una copia completa del database in formato SQL.
                            Questo file contiene tutti i dati dell'applicazione e può essere utilizzato per ripristinare il sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <a 
                              href="/api/database/download" 
                              download
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Scarica ora
                            </a>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}