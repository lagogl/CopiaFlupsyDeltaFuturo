import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  CloudIcon, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  Users, 
  FileText,
  ExternalLink,
  Key,
  Building,
  RefreshCw
} from 'lucide-react';

interface ConfigurationType {
  [key: string]: string;
}

interface ClientType {
  id: number;
  denominazione: string;
  piva: string;
  email: string;
  telefono: string;
  fattureInCloudId?: number;
}

interface DdtType {
  id: number;
  numero: number;
  data: string;
  denominazioneCliente: string;
  totaleColli: number;
  pesoTotale: string;
  ddtStato: 'nessuno' | 'locale' | 'inviato';
  fattureInCloudId?: number;
}

const FattureInCloudConfig: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("configurazione");
  
  // Stati per i moduli di configurazione
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Query per recuperare la configurazione
  const configQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/config'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/config');
      if (!response.ok) throw new Error('Errore nel caricamento configurazione');
      return response.json();
    }
  });

  // Query per recuperare i clienti
  const clientsQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/clients'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/clients');
      if (!response.ok) throw new Error('Errore nel caricamento clienti');
      return response.json();
    }
  });

  // Query per recuperare i DDT
  const ddtQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/ddt'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/ddt');
      if (!response.ok) throw new Error('Errore nel caricamento DDT');
      return response.json();
    }
  });

  // Mutation per salvare configurazione
  const saveConfigMutation = useMutation({
    mutationFn: async (data: { chiave: string; valore: string; descrizione?: string }) => {
      const response = await fetch('/api/fatture-in-cloud/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Errore nel salvataggio');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/config'] });
      toast({
        title: "Successo",
        description: "Configurazione salvata con successo"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation per avviare OAuth2
  const oauthMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/oauth/url');
      if (!response.ok) throw new Error('Errore nella generazione URL OAuth2');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        const popup = window.open(
          data.url,
          'fattureincloud-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          toast({
            title: "Popup bloccato",
            description: "Abilita i popup per completare l'autorizzazione OAuth2",
            variant: "destructive"
          });
          return;
        }
        
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/config'] });
            toast({
              title: "Autorizzazione completata",
              description: "Controlla la configurazione per verificare lo stato"
            });
          }
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore OAuth2",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation per sincronizzare i clienti
  const syncClientsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/clients/sync', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Errore nella sincronizzazione');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/clients'] });
      toast({
        title: "Sincronizzazione completata",
        description: data.message
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation per test connessione
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/test');
      if (!response.ok) throw new Error('Connessione fallita');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test connessione",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test connessione fallito",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSaveCredentials = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "Errore",
        description: "Client ID e Client Secret sono richiesti",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate({
      chiave: 'fatture_in_cloud_client_id',
      valore: clientId.trim(),
      descrizione: 'Client ID OAuth2 Fatture in Cloud'
    });

    saveConfigMutation.mutate({
      chiave: 'fatture_in_cloud_client_secret',
      valore: clientSecret.trim(),
      descrizione: 'Client Secret OAuth2 Fatture in Cloud'
    });
  };

  const handleSaveCompanyId = () => {
    if (!companyId.trim()) {
      toast({
        title: "Errore",
        description: "ID Azienda è richiesto",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate({
      chiave: 'fatture_in_cloud_company_id',
      valore: companyId.trim(),
      descrizione: 'ID Azienda selezionata in Fatture in Cloud'
    });
  };

  const isConfigured = () => {
    const config = configQuery.data?.config || {};
    return config.fatture_in_cloud_client_id && 
           config.fatture_in_cloud_client_secret && 
           config.fatture_in_cloud_company_id;
  };

  const isAuthenticated = () => {
    const config = configQuery.data?.config || {};
    return config.fatture_in_cloud_access_token === '***CONFIGURATO***';
  };

  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case 'nessuno':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Nessun DDT</Badge>;
      case 'locale':
        return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />DDT Locale</Badge>;
      case 'inviato':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Inviato</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Caricamento configurazione...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CloudIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Integrazione Fatture in Cloud</h1>
          <p className="text-gray-600">
            Gestione automatica di clienti e DDT con Fatture in Cloud
          </p>
        </div>
      </div>

      {/* Stato della configurazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Stato Configurazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {isConfigured() ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span>Credenziali API</span>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated() ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span>Autenticazione OAuth2</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Test Connessione
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="configurazione">
            <Key className="w-4 h-4 mr-2" />
            Configurazione
          </TabsTrigger>
          <TabsTrigger value="clienti">
            <Users className="w-4 h-4 mr-2" />
            Clienti
          </TabsTrigger>
          <TabsTrigger value="ddt">
            <FileText className="w-4 h-4 mr-2" />
            DDT
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building className="w-4 h-4 mr-2" />
            Azienda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configurazione" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credenziali API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Come ottenere le credenziali API:</strong><br/>
                  1. Accedi al tuo account Fatture in Cloud<br/>
                  2. Vai in "Impostazioni" → "API" → "Nuova applicazione"<br/>
                  3. Crea una nuova applicazione con questi dati:<br/>
                  - Nome: "Sistema FLUPSY"<br/>
                  - Redirect URI: <code>{window.location.origin}/api/fatture-in-cloud/oauth/callback</code><br/>
                  4. Copia Client ID e Client Secret qui sotto
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Inserisci Client ID"
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Inserisci Client Secret"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveCredentials}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Salva Credenziali
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Autorizzazione OAuth2</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Dopo aver salvato le credenziali, autorizza l'applicazione per accedere al tuo account.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={() => oauthMutation.mutate()}
                disabled={oauthMutation.isPending || !isConfigured()}
              >
                {oauthMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Autorizza Applicazione
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Azienda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Inserisci l'ID dell'azienda in Fatture in Cloud per cui creare i DDT.
                  Puoi trovarlo nell'URL quando accedi al tuo account.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="companyId">ID Azienda</Label>
                <Input
                  id="companyId"
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="Inserisci ID Azienda"
                />
              </div>
              
              <Button 
                onClick={handleSaveCompanyId}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Building className="w-4 h-4 mr-2" />
                )}
                Salva ID Azienda
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clienti" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Management Clienti</span>
                <Button
                  onClick={() => syncClientsMutation.mutate()}
                  disabled={syncClientsMutation.isPending || !isAuthenticated()}
                >
                  {syncClientsMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Sincronizza da Fatture in Cloud
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientsQuery.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Caricamento clienti...
                </div>
              ) : clientsQuery.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Errore nel caricamento clienti: {(clientsQuery.error as Error).message}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Totale clienti: {clientsQuery.data?.count || 0}
                  </div>
                  <div className="grid gap-4">
                    {clientsQuery.data?.clients?.map((cliente: ClientType) => (
                      <div key={cliente.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{cliente.denominazione}</h3>
                            <p className="text-sm text-gray-600">P.IVA: {cliente.piva}</p>
                            <p className="text-sm text-gray-600">Email: {cliente.email}</p>
                          </div>
                          <div className="flex gap-2">
                            {cliente.fattureInCloudId && (
                              <Badge variant="outline">
                                <CloudIcon className="w-3 h-3 mr-1" />
                                Sincronizzato
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ddt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documenti di Trasporto</CardTitle>
            </CardHeader>
            <CardContent>
              {ddtQuery.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Caricamento DDT...
                </div>
              ) : ddtQuery.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Errore nel caricamento DDT: {(ddtQuery.error as Error).message}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Totale DDT: {ddtQuery.data?.count || 0}
                  </div>
                  <div className="grid gap-4">
                    {ddtQuery.data?.ddt?.map((documento: DdtType) => (
                      <div key={documento.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">DDT #{documento.numero}</h3>
                            <p className="text-sm text-gray-600">Cliente: {documento.denominazioneCliente}</p>
                            <p className="text-sm text-gray-600">Data: {new Date(documento.data).toLocaleDateString('it-IT')}</p>
                            <p className="text-sm text-gray-600">Colli: {documento.totaleColli} - Peso: {documento.pesoTotale}kg</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(documento.ddtStato)}
                            {documento.fattureInCloudId && (
                              <Badge variant="outline">
                                <CloudIcon className="w-3 h-3 mr-1" />
                                ID: {documento.fattureInCloudId}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FattureInCloudConfig;