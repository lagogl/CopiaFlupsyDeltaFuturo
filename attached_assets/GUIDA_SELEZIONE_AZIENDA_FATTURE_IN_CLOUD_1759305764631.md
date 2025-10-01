# Guida Implementazione: Gestione Multi-Azienda con Fatture in Cloud

## 📌 Panoramica

Questa guida documenta il sistema di gestione e selezione dell'azienda nell'integrazione con Fatture in Cloud API v2. Il sistema permette a un utente autenticato di gestire più aziende associate al proprio account Fatture in Cloud, selezionando quale azienda utilizzare per le operazioni (creazione DDT, sincronizzazione clienti, etc.).

---

## 🗄️ 1. STRUTTURA DATABASE

### Tabella: `fatture_in_cloud_config`

```sql
CREATE TABLE fatture_in_cloud_config (
  id SERIAL PRIMARY KEY,
  company_id INTEGER,              -- ID azienda Fatture in Cloud selezionata
  access_token TEXT,               -- Token OAuth2 per autenticazione API
  refresh_token TEXT,              -- Token per rinnovare access_token
  expires_at TIMESTAMP,            -- Scadenza access_token
  attivo BOOLEAN DEFAULT true,     -- Flag configurazione attiva
  -- Altri campi di configurazione...
);
```

### Schema Drizzle (TypeScript):

```typescript
export const fatture_in_cloud_config = pgTable("fatture_in_cloud_config", {
  id: serial("id").primaryKey(),
  company_id: integer("company_id"),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  expires_at: timestamp("expires_at"),
  attivo: boolean("attivo").notNull().default(true),
  // ... altri campi
});
```

**Nota importante**: 
- Un solo record deve avere `attivo = true` alla volta
- Il campo `company_id` identifica quale azienda è attualmente selezionata
- Quando l'utente cambia azienda, si aggiorna solo il campo `company_id`

---

## 🔐 2. AUTENTICAZIONE E SETUP INIZIALE

### Flow OAuth2 (prerequisito)

Prima di poter selezionare un'azienda, l'utente deve completare l'autenticazione OAuth2:

1. Redirect a Fatture in Cloud per autorizzazione
2. Callback con `code` di autorizzazione
3. Exchange `code` per `access_token` e `refresh_token`
4. Salvataggio tokens in database

**A questo punto `company_id` è ancora NULL** - l'utente deve selezionare l'azienda.

---

## 📋 3. RECUPERO LISTA AZIENDE DISPONIBILI

### Endpoint Backend: `GET /api/fatture-in-cloud/companies`

```typescript
router.get("/companies", requireAuth, async (req, res) => {
  try {
    // 1. Recupera configurazione attiva dal database
    const config = await getActiveConfig();
    
    if (!config || !config.access_token) {
      return res.status(401).json({
        error: "Token di accesso non configurato",
        auth_url: "/api/fatture-in-cloud/oauth/authorize"
      });
    }
    
    // 2. Chiama API Fatture in Cloud per ottenere lista aziende
    const companiesResponse = await callFattureInCloudAPI('/user/companies', 'GET');
    
    if (companiesResponse.success) {
      // Estrai array aziende dalla risposta (struttura annidata)
      const companies = companiesResponse.data.data?.companies || 
                       companiesResponse.data.companies?.companies || 
                       companiesResponse.data.companies || [];
      
      // 3. Restituisce lista aziende + ID azienda corrente
      res.json({
        companies: companies,
        current_company_id: config.company_id,
        message: "Lista aziende recuperata con successo"
      });
    } else {
      res.status(400).json({
        error: companiesResponse.error?.message || "Errore nel recupero aziende"
      });
    }
  } catch (error) {
    console.error("Errore nel recupero aziende:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});
```

### Funzione Utility: `getActiveConfig()`

```typescript
async function getActiveConfig() {
  try {
    const config = await db.select()
      .from(fatture_in_cloud_config)
      .where(eq(fatture_in_cloud_config.attivo, true))
      .orderBy(desc(fatture_in_cloud_config.id))
      .limit(1);
    
    return config[0] || null;
  } catch (error) {
    console.error("Errore nel recupero configurazione:", error);
    return null;
  }
}
```

### Risposta API Fatture in Cloud

**Chiamata:** `GET https://api-v2.fattureincloud.it/user/companies`

**Risposta:**
```json
{
  "data": {
    "companies": [
      {
        "id": 12345,
        "name": "Azienda Esempio S.r.l.",
        "type": "company",
        "access_info": {
          "role": "master",
          "through_accountant": false
        },
        "plan_name": "Premium",
        "connection_id": 98765
      },
      {
        "id": 67890,
        "name": "Azienda Due S.r.l.",
        "type": "company",
        "access_info": {
          "role": "admin",
          "through_accountant": true
        },
        "plan_name": "Standard",
        "connection_id": 54321
      }
    ]
  }
}
```

**Risposta Endpoint Custom:**
```json
{
  "companies": [
    { "id": 12345, "name": "Azienda Esempio S.r.l.", ... },
    { "id": 67890, "name": "Azienda Due S.r.l.", ... }
  ],
  "current_company_id": 12345,
  "message": "Lista aziende recuperata con successo"
}
```

---

## 🔄 4. AGGIORNAMENTO AZIENDA SELEZIONATA

### Endpoint Backend: `PATCH /api/fatture-in-cloud/company-id`

```typescript
router.patch("/company-id", requireAuth, requireEditPermission, async (req, res) => {
  try {
    const { company_id } = req.body;
    
    // Validazione input
    if (!company_id) {
      return res.status(400).json({ error: "ID azienda richiesto" });
    }
    
    // 1. Recupera configurazione attiva
    const config = await getActiveConfig();
    if (!config) {
      return res.status(404).json({ error: "Configurazione non trovata" });
    }
    
    // 2. Aggiorna company_id nel database
    await db.update(fatture_in_cloud_config)
      .set({ company_id: parseInt(company_id) })
      .where(eq(fatture_in_cloud_config.id, config.id));
    
    // 3. Conferma aggiornamento
    res.json({ 
      success: true, 
      message: "ID azienda aggiornato con successo",
      company_id: parseInt(company_id)
    });
  } catch (error) {
    console.error("Errore nell'aggiornamento ID azienda:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});
```

**Body Request:**
```json
{
  "company_id": 12345
}
```

**Risposta:**
```json
{
  "success": true,
  "message": "ID azienda aggiornato con successo",
  "company_id": 12345
}
```

---

## 🎨 5. IMPLEMENTAZIONE FRONTEND

### Recupero Lista Aziende

```typescript
const handleCheckCompanies = async () => {
  setCompaniesLoading(true);
  setCompaniesResult(null);
  
  try {
    const result = await apiRequest("GET", "/api/fatture-in-cloud/companies");
    console.log("Risposta companies:", result);
    
    setCompaniesResult(result);
    
    toast({
      title: "Verifica completata",
      description: `Trovate ${result.companies?.length || 0} aziende disponibili`,
      variant: "default",
    });
  } catch (error) {
    console.error("Errore nella verifica aziende:", error);
    setCompaniesResult({ 
      error: "Errore di connessione: " + (error instanceof Error ? error.message : String(error)) 
    });
    
    toast({
      title: "Errore di connessione",
      description: "Impossibile contattare il server",
      variant: "destructive",
    });
  } finally {
    setCompaniesLoading(false);
  }
};
```

### Aggiornamento Azienda Selezionata

```typescript
const handleUpdateCompanyId = async (newCompanyId: number) => {
  setUpdatingCompanyId(true);
  
  try {
    const result = await apiRequest("/api/fatture-in-cloud/company-id", { 
      method: "PATCH", 
      data: { company_id: newCompanyId } 
    });
    
    // Invalida cache per ricaricare configurazione
    await queryClient.invalidateQueries({ 
      queryKey: ["/api/fatture-in-cloud/configurazione"] 
    });
    
    toast({
      title: "ID Azienda aggiornato",
      description: `L'ID azienda è stato aggiornato a ${newCompanyId}`,
      variant: "default",
    });
    
    // Aggiorna UI locale
    if (companiesResult) {
      setCompaniesResult({
        ...companiesResult,
        current_company_id: newCompanyId
      });
    }
  } catch (error) {
    toast({
      title: "Errore aggiornamento",
      description: (error instanceof Error ? error.message : String(error)) || 
                   "Impossibile aggiornare l'ID azienda",
      variant: "destructive",
    });
  } finally {
    setUpdatingCompanyId(false);
  }
};
```

### Componente UI (esempio con shadcn/ui)

```tsx
{companiesResult && companiesResult.companies && (
  <div className="space-y-4">
    <h3 className="font-semibold">Aziende Disponibili</h3>
    
    {companiesResult.companies.map((company: any) => (
      <div 
        key={company.id}
        className={`p-4 border rounded-lg ${
          company.id === companiesResult.current_company_id 
            ? 'border-green-500 bg-green-50' 
            : 'border-gray-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">{company.name}</p>
            <p className="text-sm text-gray-500">ID: {company.id}</p>
            {company.id === companiesResult.current_company_id && (
              <Badge variant="success">Attualmente selezionata</Badge>
            )}
          </div>
          
          {company.id !== companiesResult.current_company_id && (
            <Button
              onClick={() => handleUpdateCompanyId(company.id)}
              disabled={updatingCompanyId}
              variant="outline"
            >
              Seleziona
            </Button>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

---

## 🔌 6. UTILIZZO COMPANY_ID NELLE CHIAMATE API

### Funzione: `callFattureInCloudAPI()`

Questa funzione costruisce dinamicamente l'URL delle chiamate API in base all'endpoint:

```typescript
async function callFattureInCloudAPI(
  endpoint: string, 
  method: string = 'GET', 
  data?: any
) {
  try {
    // 1. Recupera configurazione attiva (contiene company_id e access_token)
    const config = await getActiveConfig();
    
    if (!config || !config.access_token) {
      return {
        success: false,
        error: { message: "Token di accesso non configurato" }
      };
    }
    
    // 2. Determina se l'endpoint richiede company_id nell'URL
    const needsCompanyId = !endpoint.startsWith('/user/') && 
                          !endpoint.startsWith('/oauth/');
    
    // 3. Costruisci URL base
    const FATTURE_IN_CLOUD_BASE_URL = 'https://api-v2.fattureincloud.it';
    const baseUrl = needsCompanyId 
      ? `${FATTURE_IN_CLOUD_BASE_URL}/c/${config.company_id}`
      : FATTURE_IN_CLOUD_BASE_URL;
    
    const url = `${baseUrl}${endpoint}`;
    
    // 4. Esegui chiamata HTTP
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: responseData.error || { message: 'Errore nella chiamata API' }
      };
    }
    
    return {
      success: true,
      data: responseData
    };
    
  } catch (error) {
    console.error('Errore in callFattureInCloudAPI:', error);
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : 'Errore sconosciuto' }
    };
  }
}
```

### Esempi URL Generati

| Endpoint | URL Generato | Usa company_id? |
|----------|-------------|-----------------|
| `/user/companies` | `https://api-v2.fattureincloud.it/user/companies` | ❌ NO |
| `/oauth/token` | `https://api-v2.fattureincloud.it/oauth/token` | ❌ NO |
| `/entities/clients` | `https://api-v2.fattureincloud.it/c/12345/entities/clients` | ✅ SÌ |
| `/issued_documents/ddt` | `https://api-v2.fattureincloud.it/c/12345/issued_documents/ddt` | ✅ SÌ |
| `/info/payment_methods` | `https://api-v2.fattureincloud.it/c/12345/info/payment_methods` | ✅ SÌ |

**Regola generale:**
- Endpoints che iniziano con `/user/` o `/oauth/` → **NON** usano company_id
- Tutti gli altri endpoints → **USANO** company_id nel path `/c/{company_id}/...`

---

## 🔄 7. FLUSSO COMPLETO - DIAGRAMMA

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AUTENTICAZIONE OAUTH2                                    │
│    ↓                                                         │
│    User autorizza app → Callback con code                   │
│    ↓                                                         │
│    Exchange code → access_token + refresh_token             │
│    ↓                                                         │
│    Salva in DB: access_token, refresh_token, expires_at     │
│    company_id = NULL (ancora da selezionare)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RECUPERO LISTA AZIENDE                                   │
│    ↓                                                         │
│    GET /api/fatture-in-cloud/companies                      │
│    ↓                                                         │
│    Backend: getActiveConfig() → access_token                │
│    ↓                                                         │
│    API Call: GET /user/companies (senza company_id)         │
│    ↓                                                         │
│    Risposta: { companies: [...], current_company_id: X }    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SELEZIONE AZIENDA (UI)                                   │
│    ↓                                                         │
│    Frontend mostra lista aziende                            │
│    ↓                                                         │
│    Evidenzia azienda corrente (current_company_id)          │
│    ↓                                                         │
│    User clicca "Seleziona" su azienda diversa               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. AGGIORNAMENTO COMPANY_ID                                 │
│    ↓                                                         │
│    PATCH /api/fatture-in-cloud/company-id                   │
│    Body: { company_id: 67890 }                              │
│    ↓                                                         │
│    Backend: UPDATE fatture_in_cloud_config                  │
│            SET company_id = 67890                           │
│            WHERE attivo = true                              │
│    ↓                                                         │
│    Risposta: { success: true, company_id: 67890 }           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. UTILIZZO NELLE API                                       │
│    ↓                                                         │
│    Ogni chiamata API (es. sync clienti, crea DDT):          │
│    ↓                                                         │
│    getActiveConfig() → { company_id: 67890, ... }           │
│    ↓                                                         │
│    Costruisci URL: /c/67890/entities/clients                │
│    ↓                                                         │
│    Esegui chiamata con access_token                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ 8. SICUREZZA E BEST PRACTICES

### Controllo Accessi

```typescript
// Middleware autenticazione
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
};

// Middleware permessi di modifica
const requireEditPermission = (req, res, next) => {
  if (req.session.user.role === 'slave') {
    return res.status(403).json({ error: "Permessi insufficienti" });
  }
  next();
};
```

### Gestione Token Scaduti

```typescript
// Verifica scadenza token
if (config.expires_at && new Date(config.expires_at) <= new Date()) {
  // Token scaduto - tentativo refresh
  const refreshResult = await refreshAccessToken(config.refresh_token);
  
  if (refreshResult.success) {
    // Aggiorna token nel database
    await db.update(fatture_in_cloud_config)
      .set({
        access_token: refreshResult.access_token,
        expires_at: new Date(Date.now() + refreshResult.expires_in * 1000)
      })
      .where(eq(fatture_in_cloud_config.id, config.id));
  } else {
    // Refresh fallito - richiedi nuova autenticazione
    return res.status(401).json({
      error: "Token scaduto e refresh fallito",
      auth_url: "/api/fatture-in-cloud/oauth/authorize"
    });
  }
}
```

### Validazione Company ID

```typescript
// Prima di aggiornare, verifica che l'azienda esista nell'account
const companiesResponse = await callFattureInCloudAPI('/user/companies', 'GET');

if (companiesResponse.success) {
  const companies = companiesResponse.data.data?.companies || [];
  const companyExists = companies.some(c => c.id === parseInt(company_id));
  
  if (!companyExists) {
    return res.status(400).json({ 
      error: "ID azienda non valido per questo account" 
    });
  }
}
```

---

## 📝 9. ESEMPIO COMPLETO DI UTILIZZO

### Scenario: Sincronizzazione Clienti

```typescript
// Endpoint: POST /api/fatture-in-cloud/clients/sync
router.post("/clients/sync", requireAuth, async (req, res) => {
  try {
    // 1. Recupera configurazione (include company_id)
    const config = await getActiveConfig();
    
    if (!config || !config.company_id) {
      return res.status(400).json({ 
        error: "Azienda non selezionata. Configura l'ID azienda prima di sincronizzare." 
      });
    }
    
    // 2. Recupera clienti da Fatture in Cloud
    // callFattureInCloudAPI costruirà URL: /c/{company_id}/entities/clients
    const clientsResponse = await callFattureInCloudAPI(
      '/entities/clients', 
      'GET'
    );
    
    if (!clientsResponse.success) {
      return res.status(400).json({ error: clientsResponse.error.message });
    }
    
    const fattureClients = clientsResponse.data.data || [];
    
    // 3. Sincronizza nel database locale
    let synced = 0;
    let updated = 0;
    
    for (const client of fattureClients) {
      const existing = await db.select()
        .from(clienti)
        .where(eq(clienti.fatture_in_cloud_id, client.id))
        .limit(1);
      
      if (existing.length === 0) {
        // Nuovo cliente
        await db.insert(clienti).values({
          nome: client.name,
          fatture_in_cloud_id: client.id,
          // ... altri campi
        });
        synced++;
      } else {
        // Aggiorna esistente
        await db.update(clienti)
          .set({ nome: client.name, /* ... */ })
          .where(eq(clienti.id, existing[0].id));
        updated++;
      }
    }
    
    res.json({
      success: true,
      message: `Sincronizzazione completa: ${synced} nuovi, ${updated} aggiornati`,
      company_id: config.company_id,
      company_name: "..." // opzionale
    });
    
  } catch (error) {
    console.error("Errore sincronizzazione:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});
```

---

## ✅ 10. CHECKLIST IMPLEMENTAZIONE

### Backend
- [ ] Tabella database con campo `company_id` (integer, nullable)
- [ ] Campo `attivo` per identificare configurazione corrente
- [ ] Endpoint `GET /companies` per lista aziende
- [ ] Endpoint `PATCH /company-id` per aggiornamento
- [ ] Funzione `getActiveConfig()` per recupero configurazione
- [ ] Funzione `callFattureInCloudAPI()` con logica URL dinamico
- [ ] Middleware autenticazione e permessi
- [ ] Gestione refresh token scaduti

### Frontend
- [ ] UI per visualizzare lista aziende disponibili
- [ ] Evidenziazione azienda attualmente selezionata
- [ ] Pulsante/azione per cambiare azienda
- [ ] Gestione stati di caricamento
- [ ] Toast/notifiche per feedback utente
- [ ] Invalidazione cache dopo cambio azienda
- [ ] Gestione errori (network, autenticazione, etc.)

### Testing
- [ ] Test selezione azienda con account multi-azienda
- [ ] Test chiamate API con company_id corretto
- [ ] Test cambio azienda e verifica URL generati
- [ ] Test errori (company_id non valido, token scaduto, etc.)

---

## 🔗 11. RISORSE UTILI

### Documentazione Fatture in Cloud
- API Reference: https://developers.fattureincloud.it/
- OAuth2 Flow: https://developers.fattureincloud.it/oauth/overview
- Endpoints: https://developers.fattureincloud.it/api-reference

### Note Implementative
- L'endpoint `/user/companies` restituisce tutte le aziende accessibili dall'utente autenticato
- Ogni azienda ha un `id` univoco che deve essere usato nel path `/c/{company_id}/...`
- Il `company_id` deve essere un numero intero positivo
- Gli endpoints di tipo `/user/*` e `/oauth/*` sono "company-independent"

---

## 📞 SUPPORTO

Per domande o problemi nell'implementazione, consultare:
1. Documentazione ufficiale Fatture in Cloud
2. Esempi di codice in questo repository
3. Log delle chiamate API per debug

---

**Documento creato il:** 01/10/2025  
**Versione:** 1.0  
**Autore:** Delta Futuro Development Team
