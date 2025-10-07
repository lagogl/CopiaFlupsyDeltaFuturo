import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw,
  FileCheck,
  Save
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
  const [apiToken, setApiToken] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'token'>('token');

  // Gestione parametri OAuth2 di ritorno
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthStatus = urlParams.get('oauth');
    
    if (oauthStatus === 'success') {
      toast({
        title: "✅ Autorizzazione completata",
        description: "L'integrazione con Fatture in Cloud è ora attiva!"
      });
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Aggiorna la configurazione
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/config'] });
    } else if (oauthStatus === 'error' || oauthStatus === 'cancelled') {
      const reason = urlParams.get('reason');
      toast({
        title: "❌ Errore autorizzazione",
        description: reason === 'missing_credentials' 
          ? "Credenziali API mancanti o non valide"
          : reason === 'token_exchange'
          ? "Errore nello scambio del token"
          : "Autorizzazione annullata dall'utente",
        variant: "destructive"
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

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
        // Reindirizza nella stessa finestra invece di aprire un popup
        window.location.href = data.url;
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

  // Query per recuperare lista aziende
  const companiesQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/companies'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/companies');
      if (!response.ok) throw new Error('Errore nel caricamento aziende');
      return response.json();
    },
    enabled: false // Carica solo quando richiesto esplicitamente
  });

  // Mutation per aggiornare company_id
  const updateCompanyIdMutation = useMutation({
    mutationFn: async (newCompanyId: number) => {
      const response = await fetch('/api/fatture-in-cloud/company-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: newCompanyId })
      });
      if (!response.ok) throw new Error('Errore nell\'aggiornamento azienda');
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/config'] });
      await companiesQuery.refetch();
      toast({
        title: "✅ Azienda aggiornata",
        description: `L'azienda selezionata è stata impostata correttamente`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore aggiornamento azienda",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Query per recuperare i dati fiscali
  const fiscalDataQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/fiscal-data'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/fiscal-data');
      if (!response.ok) throw new Error('Errore nel caricamento dati fiscali');
      return response.json();
    }
  });

  // Query per recuperare i loghi disponibili
  const logosQuery = useQuery({
    queryKey: ['/api/fatture-in-cloud/available-logos'],
    queryFn: async () => {
      const response = await fetch('/api/fatture-in-cloud/available-logos');
      if (!response.ok) throw new Error('Errore nel caricamento loghi');
      return response.json();
    }
  });

  // Stati per il form dati fiscali
  const [fiscalData, setFiscalData] = useState({
    ragioneSociale: '',
    indirizzo: '',
    cap: '',
    citta: '',
    provincia: '',
    partitaIva: '',
    codiceFiscale: '',
    telefono: '',
    email: '',
    logoPath: ''
  });

  // Aggiorna il form quando arrivano i dati
  useEffect(() => {
    if (fiscalDataQuery.data?.fiscalData) {
      setFiscalData({
        ragioneSociale: fiscalDataQuery.data.fiscalData.ragioneSociale || '',
        indirizzo: fiscalDataQuery.data.fiscalData.indirizzo || '',
        cap: fiscalDataQuery.data.fiscalData.cap || '',
        citta: fiscalDataQuery.data.fiscalData.citta || '',
        provincia: fiscalDataQuery.data.fiscalData.provincia || '',
        partitaIva: fiscalDataQuery.data.fiscalData.partitaIva || '',
        codiceFiscale: fiscalDataQuery.data.fiscalData.codiceFiscale || '',
        telefono: fiscalDataQuery.data.fiscalData.telefono || '',
        email: fiscalDataQuery.data.fiscalData.email || '',
        logoPath: fiscalDataQuery.data.fiscalData.logoPath || ''
      });
    }
  }, [fiscalDataQuery.data]);

  // Mutation per salvare i dati fiscali
  const saveFiscalDataMutation = useMutation({
    mutationFn: async (data: typeof fiscalData) => {
      const response = await fetch('/api/fatture-in-cloud/fiscal-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Errore nel salvataggio dati fiscali');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/fiscal-data'] });
      toast({
        title: "✅ Dati fiscali salvati",
        description: "I dati fiscali dell'azienda sono stati salvati con successo"
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

  const handleSaveTokenAuth = async () => {
    if (!apiToken.trim() || !companyId.trim()) {
      toast({
        title: "Errore",
        description: "Token API e ID Azienda sono richiesti",
        variant: "destructive"
      });
      return;
    }

    try {
      // Salva il token API come access token
      await saveConfigMutation.mutateAsync({
        chiave: 'fatture_in_cloud_access_token',
        valore: apiToken.trim(),
        descrizione: 'Token API diretto per Fatture in Cloud'
      });

      // Salva l'ID azienda
      await saveConfigMutation.mutateAsync({
        chiave: 'fatture_in_cloud_company_id',
        valore: companyId.trim(),
        descrizione: 'ID Azienda selezionata in Fatture in Cloud'
      });

      // Imposta auth_mode come token
      await saveConfigMutation.mutateAsync({
        chiave: 'fatture_in_cloud_auth_mode',
        valore: 'token',
        descrizione: 'Modalità di autenticazione (token/oauth)'
      });

      toast({
        title: "✅ Autenticazione salvata",
        description: "Token API e ID Azienda configurati con successo"
      });
      
      // Ricarica la configurazione
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/config'] });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio configurazione",
        variant: "destructive"
      });
    }
  };

  const handleSaveCompanyId = async () => {
    if (!companyId.trim()) {
      toast({
        title: "Errore",
        description: "ID Azienda è richiesto",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prima salva l'ID azienda
      await saveConfigMutation.mutateAsync({
        chiave: 'fatture_in_cloud_company_id',
        valore: companyId.trim(),
        descrizione: 'ID Azienda selezionata in Fatture in Cloud'
      });

      // Poi recupera le informazioni dell'azienda
      const response = await fetch(`/api/fatture-in-cloud/company/${companyId}`);
      if (response.ok) {
        const companyData = await response.json();
        if (companyData.success) {
          console.log('🏢 Dati azienda ricevuti nel frontend:', companyData.data);
          
          // I dati sono annidati in data.data (dalla risposta API di Fatture in Cloud)
          const aziendaInfo = companyData.data?.data || companyData.data;
          
          const nomeAzienda = aziendaInfo?.name || 
                             aziendaInfo?.company_name || 
                             aziendaInfo?.denomination || 
                             aziendaInfo?.ragione_sociale || 
                             'N/A';
          
          const partitaIva = aziendaInfo?.vat_number || 
                            aziendaInfo?.piva || 
                            aziendaInfo?.vat || 
                            'N/A';
          
          toast({
            title: "✅ ID Azienda salvato",
            description: `Azienda: ${nomeAzienda} - P.IVA: ${partitaIva}`
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio ID azienda",
        variant: "destructive"
      });
    }
  };

  const isConfigured = () => {
    const config = configQuery.data?.config || {};
    return config.fatture_in_cloud_client_id && 
           config.fatture_in_cloud_client_secret && 
           config.fatture_in_cloud_company_id;
  };

  const isAuthenticated = () => {
    const config = configQuery.data?.config || {};
    return config.fatture_in_cloud_access_token === '***CONFIGURATO***' || 
           (config.fatture_in_cloud_access_token && config.fatture_in_cloud_access_token !== '');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {isAuthenticated() ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">
                {isAuthenticated() ? 'Autenticato con Fatture in Cloud' : 'Non autenticato'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending || !isAuthenticated()}
                data-testid="button-test-connection"
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
              <CardTitle>Autenticazione Token API (Consigliata)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Come ottenere il Token API:</strong><br/>
                  1. Accedi al tuo account Fatture in Cloud<br/>
                  2. Vai in "Impostazioni" → "API"<br/>
                  3. Nella sezione "Token Personale" genera un nuovo token<br/>
                  4. L'ID Azienda si trova nell'URL: <code>https://secure.fattureincloud.it/c/<strong>[ID_AZIENDA]</strong>/</code>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="apiToken">Token API</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Inserisci il Token API"
                    data-testid="input-api-token"
                  />
                </div>
                <div>
                  <Label htmlFor="companyIdToken">ID Azienda</Label>
                  <Input
                    id="companyIdToken"
                    type="text"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    placeholder="Es: 13263"
                    data-testid="input-company-id"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveTokenAuth}
                disabled={saveConfigMutation.isPending}
                data-testid="button-save-token-auth"
              >
                {saveConfigMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salva e Connetti
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Selezione Azienda</span>
                <Button
                  onClick={() => companiesQuery.refetch()}
                  disabled={companiesQuery.isFetching || !isAuthenticated()}
                  variant="outline"
                  size="sm"
                >
                  {companiesQuery.isFetching ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Building className="w-4 h-4 mr-2" />
                  )}
                  Carica Aziende
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Seleziona quale azienda utilizzare per la creazione di DDT e la sincronizzazione clienti.
                  {!isAuthenticated() && <><br/><strong>Nota:</strong> Completa prima l'autorizzazione OAuth2 nella tab Configurazione.</>}
                </AlertDescription>
              </Alert>

              {companiesQuery.data?.companies && companiesQuery.data.companies.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Aziende disponibili: {companiesQuery.data.companies.length}
                  </div>
                  {companiesQuery.data.companies.map((company: any) => {
                    const isCurrentCompany = company.id === companiesQuery.data.current_company_id;
                    return (
                      <div 
                        key={company.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isCurrentCompany 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        data-testid={`company-card-${company.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{company.name}</h3>
                              {isCurrentCompany && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Selezionata
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>ID: {company.id}</p>
                              {company.type && <p>Tipo: {company.type}</p>}
                              {company.plan_name && <p>Piano: {company.plan_name}</p>}
                              {company.access_info && (
                                <p>Ruolo: {company.access_info.role}</p>
                              )}
                            </div>
                          </div>
                          
                          {!isCurrentCompany && (
                            <Button
                              onClick={() => updateCompanyIdMutation.mutate(company.id)}
                              disabled={updateCompanyIdMutation.isPending}
                              variant="outline"
                              size="sm"
                              data-testid={`button-select-company-${company.id}`}
                            >
                              {updateCompanyIdMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                'Seleziona'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : companiesQuery.data?.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    {companiesQuery.data.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Clicca su "Carica Aziende" per visualizzare le aziende disponibili</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Dati Fiscali Azienda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fiscalDataQuery.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Caricamento dati fiscali...
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Inserisci i dati fiscali dell'azienda. Questi dati verranno utilizzati nei documenti DDT come mittente.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="ragioneSociale">Ragione Sociale *</Label>
                      <Input
                        id="ragioneSociale"
                        value={fiscalData.ragioneSociale}
                        onChange={(e) => setFiscalData({ ...fiscalData, ragioneSociale: e.target.value })}
                        placeholder="Es: MITO SRL"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="indirizzo">Indirizzo *</Label>
                      <Input
                        id="indirizzo"
                        value={fiscalData.indirizzo}
                        onChange={(e) => setFiscalData({ ...fiscalData, indirizzo: e.target.value })}
                        placeholder="Es: Via Roma 123"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cap">CAP</Label>
                      <Input
                        id="cap"
                        value={fiscalData.cap}
                        onChange={(e) => setFiscalData({ ...fiscalData, cap: e.target.value })}
                        placeholder="Es: 30100"
                      />
                    </div>

                    <div>
                      <Label htmlFor="citta">Città *</Label>
                      <Input
                        id="citta"
                        value={fiscalData.citta}
                        onChange={(e) => setFiscalData({ ...fiscalData, citta: e.target.value })}
                        placeholder="Es: Venezia"
                      />
                    </div>

                    <div>
                      <Label htmlFor="provincia">Provincia</Label>
                      <Input
                        id="provincia"
                        value={fiscalData.provincia}
                        onChange={(e) => setFiscalData({ ...fiscalData, provincia: e.target.value })}
                        placeholder="Es: VE"
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="partitaIva">Partita IVA *</Label>
                      <Input
                        id="partitaIva"
                        value={fiscalData.partitaIva}
                        onChange={(e) => setFiscalData({ ...fiscalData, partitaIva: e.target.value })}
                        placeholder="Es: IT12345678901"
                      />
                    </div>

                    <div>
                      <Label htmlFor="codiceFiscale">Codice Fiscale</Label>
                      <Input
                        id="codiceFiscale"
                        value={fiscalData.codiceFiscale}
                        onChange={(e) => setFiscalData({ ...fiscalData, codiceFiscale: e.target.value })}
                        placeholder="Es: 12345678901"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telefono">Telefono</Label>
                      <Input
                        id="telefono"
                        value={fiscalData.telefono}
                        onChange={(e) => setFiscalData({ ...fiscalData, telefono: e.target.value })}
                        placeholder="Es: +39 041 1234567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={fiscalData.email}
                        onChange={(e) => setFiscalData({ ...fiscalData, email: e.target.value })}
                        placeholder="Es: info@azienda.it"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="logoPath">Logo Aziendale</Label>
                      {logosQuery.data?.logos && logosQuery.data.logos.length > 0 ? (
                        <Select
                          value={fiscalData.logoPath}
                          onValueChange={(value) => setFiscalData({ ...fiscalData, logoPath: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un logo" />
                          </SelectTrigger>
                          <SelectContent>
                            {logosQuery.data.logos.map((logo: any) => (
                              <SelectItem key={logo.path} value={logo.path}>
                                {logo.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="logoPath"
                          value={fiscalData.logoPath}
                          onChange={(e) => setFiscalData({ ...fiscalData, logoPath: e.target.value })}
                          placeholder="/assets/logos/azienda.png"
                        />
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Percorso del logo da utilizzare nei DDT
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => saveFiscalDataMutation.mutate(fiscalData)}
                    disabled={saveFiscalDataMutation.isPending || !fiscalData.ragioneSociale || !fiscalData.indirizzo || !fiscalData.citta || !fiscalData.partitaIva}
                    className="w-full md:w-auto"
                  >
                    {saveFiscalDataMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salva Dati Fiscali
                  </Button>
                </div>
              )}
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