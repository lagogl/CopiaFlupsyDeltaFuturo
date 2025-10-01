# Guida Completa: Integrazione Fatture in Cloud

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Configurazione Credenziali](#configurazione-credenziali)
3. [Schema Database](#schema-database)
4. [Backend - Routes e API](#backend-routes-e-api)
5. [Frontend - Pagina Configurazione](#frontend-pagina-configurazione)
6. [Utilizzo e Test](#utilizzo-e-test)

---

## Prerequisiti

### Account e API Fatture in Cloud
1. Accedi a https://fattureincloud.it
2. Vai in **Impostazioni → API**
3. Crea un'applicazione OAuth2
4. Annota:
   - **Client ID**
   - **Client Secret**
   - **Company ID** (ID dell'azienda)

### Dipendenze NPM
```bash
npm install axios drizzle-orm drizzle-zod zod date-fns
```

---

## Configurazione Credenziali

### 1. Variabili d'Ambiente (Secrets Replit)

Aggiungi questi secrets in Replit:

```bash
FATTURE_IN_CLOUD_CLIENT_ID=<il_tuo_client_id>
FATTURE_IN_CLOUD_CLIENT_SECRET=<il_tuo_client_secret>
```

### 2. Costanti Base (nel file routes)

```typescript
const FATTURE_IN_CLOUD_BASE_URL = "https://api-v2.fattureincloud.it";
const COMPANY_ID = "9438"; // Sostituisci con il tuo Company ID
const CLIENT_ID = process.env.FATTURE_IN_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.FATTURE_IN_CLOUD_CLIENT_SECRET;
```

---

## Schema Database

### 1. Tabella Configurazione OAuth2

Aggiungi a `shared/schema.ts`:

```typescript
import { pgTable, serial, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const fatture_in_cloud_config = pgTable("fatture_in_cloud_config", {
  id: serial("id").primaryKey(),
  api_key: varchar("api_key", { length: 500 }),
  api_uid: varchar("api_uid", { length: 500 }),
  company_id: integer("company_id"),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  expires_at: timestamp("expires_at"),
  token_type: varchar("token_type", { length: 50 }).default("Bearer"),
  default_payment_method: varchar("default_payment_method", { length: 100 }),
  default_causale_trasporto: varchar("default_causale_trasporto", { length: 100 }).default("Vendita"),
  default_aspetto_beni: varchar("default_aspetto_beni", { length: 100 }).default("Colli"),
  default_porto: varchar("default_porto", { length: 100 }).default("Franco"),
  numerazione_automatica: boolean("numerazione_automatica").default(true),
  prefisso_numero: varchar("prefisso_numero", { length: 50 }),
  invio_email_automatico: boolean("invio_email_automatico").default(false),
  email_mittente: varchar("email_mittente", { length: 255 }),
  email_oggetto_template: text("email_oggetto_template"),
  email_corpo_template: text("email_corpo_template"),
  attivo: boolean("attivo").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});
```

### 2. Aggiungere Campo ai Clienti

```typescript
export const clienti = pgTable("clienti", {
  // ... campi esistenti ...
  fatture_in_cloud_id: integer("fatture_in_cloud_id"), // AGGIUNGI QUESTO
  // ... altri campi ...
});
```

### 3. Migrazione Database

Esegui:
```bash
npm run db:push
```

Se ci sono warning di data-loss, usa:
```bash
npm run db:push --force
```

---

## Backend - Routes e API

### 1. Crea File Router

Crea `server/routes/fatture-in-cloud.ts`:

```typescript
import { Router } from "express";
import axios from "axios";
import { db } from "../db";
import { clienti, fatture_in_cloud_config } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const FATTURE_IN_CLOUD_BASE_URL = "https://api-v2.fattureincloud.it";
const COMPANY_ID = "9438"; // SOSTITUISCI CON IL TUO
const CLIENT_ID = process.env.FATTURE_IN_CLOUD_CLIENT_ID;
const CLIENT_SECRET = process.env.FATTURE_IN_CLOUD_CLIENT_SECRET;

// Middleware per autenticazione
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }
  next();
}

// Utility per configurazione attiva
async function getActiveConfig() {
  const config = await db.select()
    .from(fatture_in_cloud_config)
    .where(eq(fatture_in_cloud_config.attivo, true))
    .orderBy(desc(fatture_in_cloud_config.id))
    .limit(1);
  
  return config[0] || null;
}

// Utility per chiamate API
async function callFattureInCloudAPI(endpoint: string, method: string, data?: any) {
  try {
    const config = await getActiveConfig();
    
    if (!config || !config.access_token) {
      throw new Error("Token di accesso non configurato");
    }
    
    const needsCompanyId = !endpoint.startsWith('/user/') && !endpoint.startsWith('/oauth/');
    const baseUrl = needsCompanyId ? 
      `${FATTURE_IN_CLOUD_BASE_URL}/c/${config.company_id}` : 
      FATTURE_IN_CLOUD_BASE_URL;
    
    const response = await axios({
      method: method as any,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      data: data
    });
    
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error: any) {
    console.error("Errore API Fatture in Cloud:", error);
    return {
      success: false,
      error: {
        message: error.response?.data?.error?.message || error.message,
        code: error.response?.status || 500,
        details: error.response?.data
      }
    };
  }
}

// GET /api/fatture-in-cloud/configurazione - Verifica configurazione
router.get("/configurazione", requireAuth, async (req, res) => {
  try {
    const config = await getActiveConfig();
    
    if (!config || !config.access_token) {
      return res.json({ 
        configured: false, 
        message: "Nessuna configurazione OAuth2 trovata",
        auth_url: "/api/fatture-in-cloud/oauth/authorize"
      });
    }
    
    const now = new Date();
    const tokenExpired = config.expires_at && now > config.expires_at;
    
    res.json({ 
      configured: true,
      token_expired: tokenExpired,
      config: {
        company_id: config.company_id,
        created_at: config.created_at,
        expires_at: config.expires_at,
        // ... altri campi ...
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Errore interno del server",
      configured: false 
    });
  }
});

// GET /api/fatture-in-cloud/oauth/url - URL di autorizzazione
router.get("/oauth/url", requireAuth, async (req, res) => {
  const scopes = 'entity.clients:r products:r issued_documents.delivery_notes:a';
  const authUrl = `${FATTURE_IN_CLOUD_BASE_URL}/oauth/authorize?` +
    `response_type=code&` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('https://' + req.get('host') + '/api/fatture-in-cloud/oauth/callback')}&` +
    `scope=${encodeURIComponent(scopes)}`;
  
  res.json({
    auth_url: authUrl,
    message: "Usa questo URL per l'autorizzazione OAuth2"
  });
});

// GET /api/fatture-in-cloud/oauth/callback - Callback OAuth2
router.get("/oauth/callback", async (req, res) => {
  try {
    const { code, error, error_description } = req.query;
    
    if (error) {
      return res.redirect('/fatture-in-cloud-config?error=true&message=' + 
        encodeURIComponent(`Errore OAuth2: ${error} - ${error_description}`));
    }
    
    if (!code) {
      return res.redirect('/fatture-in-cloud-config?error=true&message=' + 
        encodeURIComponent('Autorizzazione negata o codice mancante'));
    }
    
    // Scambia il codice con il token
    const tokenResponse = await axios.post(`${FATTURE_IN_CLOUD_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: 'https://' + req.get('host') + '/api/fatture-in-cloud/oauth/callback'
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    // Disattiva configurazioni precedenti
    await db.update(fatture_in_cloud_config)
      .set({ attivo: false })
      .where(eq(fatture_in_cloud_config.attivo, true));
    
    // Inserisci nuova configurazione
    await db.insert(fatture_in_cloud_config).values({
      api_key: process.env.FATTURE_IN_CLOUD_API_KEY || '',
      api_uid: process.env.FATTURE_IN_CLOUD_API_UID || '',
      company_id: parseInt(COMPANY_ID),
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: expiresAt,
      attivo: true
    });
    
    res.redirect('/fatture-in-cloud-config?success=true&message=' + 
      encodeURIComponent('Autenticazione completata con successo'));
    
  } catch (error) {
    console.error("Errore OAuth2:", error);
    res.redirect('/fatture-in-cloud-config?error=true&message=' + 
      encodeURIComponent('Errore nell\'autenticazione OAuth2'));
  }
});

// POST /api/fatture-in-cloud/clients/sync - Sincronizza clienti
router.post("/clients/sync", requireAuth, async (req, res) => {
  try {
    const response = await callFattureInCloudAPI('/entities/clients', 'GET');
    
    if (!response.success) {
      return res.status(500).json({
        success: false,
        message: "Errore nell'ottenere i clienti",
        error: response.error
      });
    }
    
    const clientiFattureInCloud = response.data?.data || [];
    let syncedCount = 0;
    let updatedCount = 0;
    
    for (const clienteEsterno of clientiFattureInCloud) {
      const clienteData = {
        denominazione: clienteEsterno.name || "",
        indirizzo: clienteEsterno.address || "",
        comune: clienteEsterno.city || "",
        cap: clienteEsterno.zip || "",
        provincia: clienteEsterno.province || "",
        paese: clienteEsterno.country || "Italia",
        email: clienteEsterno.email || "",
        telefono: clienteEsterno.phone || "",
        piva: clienteEsterno.vat_number || "",
        codice_fiscale: clienteEsterno.tax_code || "",
        fatture_in_cloud_id: clienteEsterno.id
      };
      
      // Cerca cliente esistente
      let clienteEsistente = null;
      
      if (clienteEsterno.id) {
        const existing = await db.select()
          .from(clienti)
          .where(eq(clienti.fatture_in_cloud_id, clienteEsterno.id))
          .limit(1);
        
        if (existing.length > 0) {
          clienteEsistente = existing[0];
        }
      }
      
      if (clienteEsistente) {
        await db.update(clienti)
          .set(clienteData)
          .where(eq(clienti.id, clienteEsistente.id));
        updatedCount++;
      } else {
        await db.insert(clienti).values(clienteData);
        syncedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Sincronizzazione completata: ${syncedCount} nuovi, ${updatedCount} aggiornati`,
      stats: {
        total_fatture_cloud: clientiFattureInCloud.length,
        synced: syncedCount,
        updated: updatedCount
      }
    });
    
  } catch (error) {
    console.error("Errore sincronizzazione:", error);
    res.status(500).json({
      success: false,
      message: "Errore interno del server",
      error: error.message
    });
  }
});

// POST /api/fatture-in-cloud/ddt - Crea DDT
router.post("/ddt", requireAuth, async (req, res) => {
  try {
    const { cliente_id, numero_ddt, data_documento, righe } = req.body;
    
    // Recupera cliente
    const [cliente] = await db.select()
      .from(clienti)
      .where(eq(clienti.id, cliente_id));
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    // Prepara payload per Fatture in Cloud
    const ddtPayload = {
      data: {
        type: 'delivery_note',
        entity: {
          id: cliente.fatture_in_cloud_id || null,
          name: cliente.denominazione,
          address_street: cliente.indirizzo || '',
          address_city: cliente.comune || '',
          address_postal_code: cliente.cap || '',
          address_province: cliente.provincia || '',
          country: 'Italia',
          vat_number: cliente.piva || '',
          tax_code: cliente.codice_fiscale || ''
        },
        date: data_documento,
        number: numero_ddt,
        items_list: righe.map((riga: any) => ({
          name: riga.descrizione,
          qty: riga.quantita,
          measure: riga.unita_misura || 'NR',
          net_price: riga.prezzo_unitario || 0
        }))
      }
    };
    
    // Invia a Fatture in Cloud
    const ficResponse = await callFattureInCloudAPI('/issued_documents', 'POST', ddtPayload);
    
    if (!ficResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Errore nella creazione del DDT',
        error: ficResponse.error
      });
    }
    
    res.json({
      success: true,
      fatture_in_cloud_id: ficResponse.data.data.id,
      message: 'DDT creato e inviato con successo'
    });
    
  } catch (error) {
    console.error('Errore creazione DDT:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
```

### 2. Registra il Router

In `server/routes.ts` o `server/index.ts`:

```typescript
import fattureInCloudRouter from "./routes/fatture-in-cloud";

// ... altre routes ...

app.use("/api/fatture-in-cloud", fattureInCloudRouter);
```

---

## Frontend - Pagina Configurazione

### 1. Crea Pagina di Configurazione

Crea `client/src/pages/fatture-in-cloud-config.tsx`:

```typescript
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, AlertCircle, ExternalLink, Settings, RefreshCw, Users } from "lucide-react";

export default function FattureInCloudConfig() {
  const { toast } = useToast();
  const [syncingClients, setSyncingClients] = useState(false);

  // Controlla parametri URL per success/error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const message = urlParams.get('message');

    if (success === 'true' && message) {
      toast({
        title: "Configurazione completata",
        description: decodeURIComponent(message),
      });
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['/api/fatture-in-cloud/configurazione'] });
    } else if (error === 'true' && message) {
      toast({
        title: "Errore di configurazione",
        description: decodeURIComponent(message),
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Query configurazione
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/fatture-in-cloud/configurazione'],
    refetchOnWindowFocus: false,
  });

  // Avvia OAuth2
  const handleOAuth2Setup = async () => {
    try {
      const data = await apiRequest('GET', '/api/fatture-in-cloud/oauth/url');
      
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
      } else {
        toast({
          title: "Errore",
          description: "Impossibile ottenere l'URL di autorizzazione",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la richiesta di autorizzazione",
        variant: "destructive",
      });
    }
  };

  // Sincronizza clienti
  const syncClients = async () => {
    setSyncingClients(true);
    try {
      const data = await apiRequest("POST", "/api/fatture-in-cloud/clients/sync", {});
      
      if (data.success) {
        toast({
          title: "Sincronizzazione completa",
          description: data.message,
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/clienti'] });
      } else {
        toast({
          title: "Errore sincronizzazione",
          description: data.message || "Impossibile sincronizzare i clienti",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore sincronizzazione",
        description: error.message || "Impossibile sincronizzare i clienti",
        variant: "destructive",
      });
    } finally {
      setSyncingClients(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Caricamento...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurazione Fatture in Cloud
          </CardTitle>
          <CardDescription>
            Gestisci l'integrazione con Fatture in Cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Stato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stato Configurazione</h3>
            
            {config?.configured ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Configurazione Attiva</AlertTitle>
                <AlertDescription>
                  L'integrazione è configurata e pronta all'uso.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configurazione Richiesta</AlertTitle>
                <AlertDescription>
                  {config?.message || "L'integrazione non è ancora configurata."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Azioni */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Azioni</h3>
            
            <div className="flex flex-wrap gap-3">
              {!config?.configured ? (
                <Button onClick={handleOAuth2Setup} className="flex items-center gap-2">
                  Configura OAuth2
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={syncClients}
                    disabled={syncingClients}
                    variant="outline"
                  >
                    {syncingClients ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizzando...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Sincronizza Clienti
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={handleOAuth2Setup} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Riconfigura OAuth2
                  </Button>
                </>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Registra la Route

In `client/src/App.tsx`:

```typescript
import FattureInCloudConfig from "@/pages/fatture-in-cloud-config";

// Nel router:
<Route path="/fatture-in-cloud-config" component={FattureInCloudConfig} />
```

---

## Utilizzo e Test

### 1. Setup Iniziale

1. **Avvia l'applicazione**
2. **Vai alla pagina** `/fatture-in-cloud-config`
3. **Clicca su "Configura OAuth2"**
4. **Autorizza l'applicazione** su Fatture in Cloud
5. **Verrai reindirizzato** alla pagina con conferma di successo

### 2. Sincronizzazione Clienti

```typescript
// Esempio di utilizzo
const syncClients = async () => {
  const response = await fetch('/api/fatture-in-cloud/clients/sync', {
    method: 'POST',
    credentials: 'include'
  });
  
  const data = await response.json();
  console.log(data);
  // {
  //   success: true,
  //   message: "Sincronizzazione completata: 5 nuovi, 3 aggiornati",
  //   stats: { ... }
  // }
};
```

### 3. Creazione DDT

```typescript
// Esempio di creazione DDT
const createDDT = async () => {
  const response = await fetch('/api/fatture-in-cloud/ddt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      cliente_id: 123,
      numero_ddt: "DDT-001",
      data_documento: "2025-01-10",
      righe: [
        {
          descrizione: "Prodotto 1",
          quantita: 10,
          unita_misura: "KG",
          prezzo_unitario: 5.50
        }
      ]
    })
  });
  
  const data = await response.json();
  console.log(data);
  // {
  //   success: true,
  //   fatture_in_cloud_id: 12345,
  //   message: "DDT creato e inviato con successo"
  // }
};
```

---

## Note Importanti

### Scadenza Token
- I token OAuth2 scadono dopo un certo periodo
- Implementa un sistema di refresh automatico se necessario
- Monitora la data di scadenza in `config.expires_at`

### Scopes Richiesti
```
entity.clients:r         - Lettura clienti
products:r               - Lettura prodotti
issued_documents.delivery_notes:a  - Creazione DDT
```

### Redirect URI
Deve essere configurato in Fatture in Cloud:
```
https://tuo-dominio.replit.app/api/fatture-in-cloud/oauth/callback
```

### Rate Limiting
- Fatture in Cloud ha limiti di richieste API
- Implementa retry logic e gestione errori appropriata

---

## Checklist Implementazione

- [ ] Configurare credenziali OAuth2 come secrets
- [ ] Aggiungere schema database `fatture_in_cloud_config`
- [ ] Aggiungere campo `fatture_in_cloud_id` alla tabella clienti
- [ ] Eseguire `npm run db:push`
- [ ] Creare file `server/routes/fatture-in-cloud.ts`
- [ ] Registrare router in `server/routes.ts`
- [ ] Creare pagina `client/src/pages/fatture-in-cloud-config.tsx`
- [ ] Registrare route in `client/src/App.tsx`
- [ ] Testare flusso OAuth2
- [ ] Testare sincronizzazione clienti
- [ ] Testare creazione DDT

---

## Risoluzione Problemi

### Errore "Token scaduto"
- Vai alla pagina di configurazione
- Clicca "Riconfigura OAuth2"
- Riautorizza l'applicazione

### Errore "Company ID non trovato"
- Verifica il `COMPANY_ID` nel codice
- Usa l'endpoint `/api/fatture-in-cloud/companies` per vedere le aziende disponibili

### Clienti non sincronizzati
- Verifica che il token sia valido
- Controlla i log del server per errori
- Verifica che i clienti esistano in Fatture in Cloud

---

Questa guida fornisce tutto il necessario per replicare l'integrazione Fatture in Cloud in qualsiasi altra applicazione!
