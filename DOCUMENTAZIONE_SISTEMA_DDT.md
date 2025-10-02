# Documentazione Tecnica Sistema Report di Consegna e DDT

## 1. ARCHITETTURA DEL SISTEMA

### 1.1 Overview Generale
Il sistema gestisce il processo completo dalla creazione di un report di consegna alla generazione automatica di DDT (Documenti di Trasporto) su Fatture in Cloud. Il flusso coinvolge:

1. **Creazione Report di Consegna**: Documento interno che traccia le consegne di prodotti acquacoltura
2. **Gestione Dettagli**: Ogni report contiene righe di dettaglio per sezione/vasca/cesta
3. **Generazione DDT Locale**: Creazione DDT in database locale con righe dettagliate
4. **Invio a Fatture in Cloud**: Sincronizzazione automatica tramite API OAuth2
5. **Tracciamento Stati**: Sistema a 3 stati (nessuno, locale, inviato) per il controllo del ciclo di vita

### 1.2 Stack Tecnologico
- **Frontend**: React + TypeScript + TanStack Query + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **API Esterna**: Fatture in Cloud API v2 (OAuth2)
- **Validazione**: Zod schemas

---

## 2. MODELLO DATI

### 2.1 Tabella `reports_consegna`

Tabella principale per i report di consegna.

```typescript
export const reports_consegna = pgTable("reports_consegna", {
  id: serial("id").primaryKey(),
  numero_progressivo: integer("numero_progressivo").unique(),
  data_creazione: timestamp("data_creazione").notNull().defaultNow(),
  cliente_id: integer("cliente_id").references(() => clienti.id),
  ordine_id: integer("ordine_id").references(() => ordini.id),
  data_consegna: date("data_consegna").notNull(),
  stato: text("stato").default("Completato"),
  ddt_stato: text("ddt_stato").default("nessuno"), // CHIAVE: nessuno, locale, inviato
  numero_totale_ceste: integer("numero_totale_ceste").notNull(),
  peso_totale_kg: decimal("peso_totale_kg", { precision: 10, scale: 2 }).notNull(),
  totale_animali: integer("totale_animali").notNull(),
  taglia_media: text("taglia_media"),
  qrcode_url: text("qrcode_url"),
  note: text("note")
});
```

**Campi Chiave:**
- `ddt_stato`: Campo cruciale per il controllo del workflow
  - `"nessuno"`: Report senza DDT associato
  - `"locale"`: DDT creato in database locale, non ancora inviato
  - `"inviato"`: DDT sincronizzato con Fatture in Cloud
- `numero_progressivo`: Numerazione sequenziale univoca per report
- `qrcode_url`: URL per accesso pubblico al report (opzionale)

### 2.2 Tabella `reports_consegna_dettagli`

Dettagli per ogni cesta/lotto nella consegna.

```typescript
export const reports_consegna_dettagli = pgTable("reports_consegna_dettagli", {
  id: serial("id").primaryKey(),
  report_id: integer("report_id").notNull().references(() => reports_consegna.id),
  misurazione_id: integer("misurazione_id").references(() => misurazioni_periodiche.id),
  vasca_id: integer("vasca_id").notNull().references(() => vasche.id),
  codice_sezione: text("codice_sezione").notNull(),
  identificativo_cesta: varchar("identificativo_cesta", { length: 10 }),
  numero_ceste: integer("numero_ceste").notNull(),
  peso_ceste_kg: decimal("peso_ceste_kg", { precision: 10, scale: 2 }).notNull(),
  taglia: text("taglia").notNull(),
  animali_per_kg: decimal("animali_per_kg", { precision: 10, scale: 2 }).notNull(),
  percentuale_guscio: decimal("percentuale_guscio"),
  percentuale_mortalita: decimal("percentuale_mortalita"),
  numero_animali: integer("numero_animali").notNull(),
  note: text("note")
});
```

**Dati Specifici Acquacoltura:**
- `animali_per_kg`: Densità (pezzi/kg)
- `percentuale_guscio`: Percentuale peso gusci sul totale
- `percentuale_mortalita`: Mortalità rilevata
- `identificativo_cesta`: Codice alfanumerico cesta (A, B, C, etc.)

### 2.3 Tabella `ddt`

DDT con integrazione Fatture in Cloud.

```typescript
export const ddt = pgTable("ddt", {
  id: serial("id").primaryKey(),
  numero_ddt: varchar("numero_ddt", { length: 50 }),
  data_documento: date("data_documento").notNull(),
  tipo_documento: varchar("tipo_documento", { length: 20 }).notNull().default("ddt"),
  oggetto: text("oggetto"),
  
  // Dati cliente (duplicati per snapshot storico)
  cliente_id: integer("cliente_id").notNull().references(() => clienti.id),
  cliente_nome: varchar("cliente_nome", { length: 255 }).notNull(),
  cliente_codice: varchar("cliente_codice", { length: 50 }),
  cliente_indirizzo: text("cliente_indirizzo"),
  cliente_cap: varchar("cliente_cap", { length: 10 }),
  cliente_citta: varchar("cliente_citta", { length: 100 }),
  cliente_provincia: varchar("cliente_provincia", { length: 5 }),
  cliente_partita_iva: varchar("cliente_partita_iva", { length: 20 }),
  cliente_codice_fiscale: varchar("cliente_codice_fiscale", { length: 20 }),
  
  // Dati trasporto
  trasporto_causale: varchar("trasporto_causale", { length: 100 }).notNull().default("Vendita"),
  trasporto_data: date("trasporto_data").notNull(),
  trasporto_ora: varchar("trasporto_ora", { length: 10 }),
  trasporto_aspetto: varchar("trasporto_aspetto", { length: 50 }).notNull().default("Colli"),
  trasporto_peso: decimal("trasporto_peso", { precision: 10, scale: 2 }),
  trasporto_volume: decimal("trasporto_volume", { precision: 10, scale: 2 }),
  trasporto_colli: integer("trasporto_colli"),
  trasporto_descrizione: text("trasporto_descrizione"),
  
  // Stato e integrazione Fatture in Cloud
  stato: varchar("stato", { length: 20 }).notNull().default("bozza"),
  fatture_in_cloud_id: integer("fatture_in_cloud_id"),
  fatture_in_cloud_numero: varchar("fatture_in_cloud_numero", { length: 50 }),
  url_documento: text("url_documento"),
  
  // Metadati
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  note: text("note")
});
```

**Pattern Snapshot**: I dati cliente sono duplicati nel DDT per preservare uno snapshot storico immutabile, indipendente da modifiche future all'anagrafica.

### 2.4 Tabella `ddt_righe`

Righe prodotto del DDT.

```typescript
export const ddt_righe = pgTable("ddt_righe", {
  id: serial("id").primaryKey(),
  ddt_id: integer("ddt_id").notNull().references(() => ddt.id, { onDelete: "cascade" }),
  
  // Dati prodotto
  codice_prodotto: varchar("codice_prodotto", { length: 50 }),
  nome_prodotto: varchar("nome_prodotto", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  
  // Quantità
  quantita: decimal("quantita", { precision: 10, scale: 2 }).notNull(),
  unita_misura: varchar("unita_misura", { length: 10 }).notNull().default("KG"),
  
  // Prezzi (opzionali)
  prezzo_unitario: decimal("prezzo_unitario", { precision: 10, scale: 2 }),
  sconto_percentuale: decimal("sconto_percentuale", { precision: 5, scale: 2 }),
  totale_netto: decimal("totale_netto", { precision: 10, scale: 2 }),
  
  // Tracciamento origine
  vasca_id: integer("vasca_id").references(() => vasche.id),
  vasca_nome: varchar("vasca_nome", { length: 100 }),
  sezione_codice: varchar("sezione_codice", { length: 10 }),
  taglia_prodotto: varchar("taglia_prodotto", { length: 50 }),
  misurazione_id: integer("misurazione_id").references(() => misurazioni_periodiche.id),
  report_dettaglio_id: integer("report_dettaglio_id").references(() => reports_consegna_dettagli.id),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});
```

**Tracciabilità Completa**: Ogni riga mantiene riferimenti a vasca, sezione, misurazione e dettaglio report per tracciabilità end-to-end.

### 2.5 Tabella `fatture_in_cloud_config`

Configurazione OAuth2 e preferenze.

```typescript
export const fatture_in_cloud_config = pgTable("fatture_in_cloud_config", {
  id: serial("id").primaryKey(),
  api_key: varchar("api_key", { length: 255 }).notNull(),
  api_uid: varchar("api_uid", { length: 255 }).notNull(),
  company_id: integer("company_id"),
  
  // OAuth2
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  expires_at: timestamp("expires_at"),
  
  // Configurazioni predefinite DDT
  default_payment_method: varchar("default_payment_method", { length: 100 }),
  default_causale_trasporto: varchar("default_causale_trasporto", { length: 100 }).default("Vendita"),
  default_aspetto_beni: varchar("default_aspetto_beni", { length: 50 }).default("Colli"),
  default_porto: varchar("default_porto", { length: 50 }).default("Franco"),
  
  numerazione_automatica: boolean("numerazione_automatica").default(true),
  prefisso_numero: varchar("prefisso_numero", { length: 20 }),
  
  // Email
  invio_email_automatico: boolean("invio_email_automatico").default(false),
  email_mittente: varchar("email_mittente", { length: 255 }),
  email_oggetto_template: text("email_oggetto_template"),
  email_corpo_template: text("email_corpo_template"),
  
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  attivo: boolean("attivo").default(true)
});
```

---

## 3. API BACKEND

### 3.1 Endpoint Report di Consegna

#### GET `/api/reports-consegna`
Recupera lista completa report.

**Response:**
```typescript
{
  success: true,
  data: ReportConsegna[]
}
```

#### GET `/api/reports-consegna/:id`
Recupera singolo report con dettagli.

**Response:**
```typescript
{
  id: number,
  cliente_id: number,
  data_consegna: string,
  ddt_stato: "nessuno" | "locale" | "inviato",
  peso_totale_kg: string,
  totale_animali: number,
  taglia_media: string,
  cliente: Cliente,
  dettagli: DettaglioReport[]
}
```

#### POST `/api/reports-consegna`
Crea nuovo report.

**Request Body:**
```typescript
{
  cliente_id: number,
  ordine_id: number | null,
  data_consegna: Date,
  numero_totale_ceste: number,
  peso_totale_kg: number,
  totale_animali: number,
  taglia_media: string,
  note: string | null
}
```

**Validazione:** `insertReportConsegnaSchema` (Zod)

#### POST `/api/reports-consegna/:id/dettagli`
Aggiungi dettaglio a report.

**Request Body:**
```typescript
{
  vasca_id: number,
  codice_sezione: string,
  numero_ceste: number,
  peso_ceste_kg: number,
  taglia: string,
  animali_per_kg: number,
  numero_animali: number,
  percentuale_guscio: string | null,
  percentuale_mortalita: number | null,
  misurazione_id: number | null,
  identificativo_cesta: string | null,
  note: string | null
}
```

#### PATCH `/api/reports-consegna/:id/conferma-stampa`
Conferma stampa e opzionale creazione DDT.

**Request Body:**
```typescript
{
  crea_ddt: boolean,
  include_prices: boolean,
  send_email: boolean,
  email_address: string,
  note_aggiuntive: string
}
```

**Logica:**
1. Verifica esistenza report
2. Se `crea_ddt === true` e `ddt_stato !== "inviato"`:
   - Recupera dati report + cliente + dettagli
   - Se cliente ha dati incompleti (`indirizzo === "N/A"`), recupera da Fatture in Cloud API
   - Crea record DDT in `ddt` table
   - Aggrega dettagli per prodotto/taglia
   - Crea righe DDT con pattern dettagli + subtotali
   - Aggiorna `reports_consegna.ddt_stato = "locale"`
3. Apre URL stampa: `/api/public/stampa/report/:id`

**Pattern Subtotali:** Per ogni prodotto/taglia, inserisce prima N righe di dettaglio (una per sezione), poi una riga "SUBTOTALE" con quantità totale.

#### POST `/api/reports-consegna/:id/crea-ddt`
Crea e invia DDT direttamente a Fatture in Cloud.

**Request Body:**
```typescript
{
  include_prices: boolean,
  force_send: boolean  // Forza reinvio se già inviato
}
```

**Logica:**
1. Verifica `ddt_stato !== "inviato"` (o `force_send === true`)
2. Recupera dati report completi
3. Crea DDT locale (come sopra)
4. Prepara payload Fatture in Cloud:
   ```typescript
   {
     type: "delivery_note",
     numeration: "/ordi",
     date: "YYYY-MM-DD",
     entity: {
       id: cliente.fatture_in_cloud_id
     },
     items_list: [
       {
         product_id: null,
         name: "Vongole veraci TP-5000",
         description: "Vasca V1 - Sezione A2 | Taglia: TP-5000 | Peso: 25 kg | Pezzi/kg: 500...",
         qty: 12500,
         measure: "NR",
         net_price: 0,
         gross_price: 0,
         vat: { id: 0 }
       },
       // ... altre righe dettaglio
       {
         name: "SUBTOTALE TP-5000",
         description: "SUBTOTALE TP-5000",
         qty: 50000,
         measure: "NR"
       }
     ],
     transport_document: {
       date: "YYYY-MM-DD",
       number: "AUTO",
       type: "ddt",
       causale: "Vendita",
       portobags: "Franco",
       weightaspetto: "Colli",
       weight: 100.5,
       packages: 4
     }
   }
   ```
5. Invia POST `/c/{company_id}/issued_documents`
6. Salva `fatture_in_cloud_id`, `fatture_in_cloud_numero`, `url_documento`
7. Aggiorna `reports_consegna.ddt_stato = "inviato"`

#### DELETE `/api/reports-consegna/:id`
Elimina report + dettagli + misurazioni correlate.

**Logica Cascade:**
- Elimina dettagli da `reports_consegna_dettagli`
- Elimina misurazioni con causale "Vendita" collegate
- Ripristina stato ciclo produttivo se era stato chiuso da questo report
- Elimina report da `reports_consegna`

### 3.2 Endpoint Fatture in Cloud

#### GET `/api/fatture-in-cloud/oauth/authorize`
Avvia flusso OAuth2.

**Redirect:** `https://api-v2.fattureincloud.it/oauth/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope={SCOPES}`

**Scopes richiesti:**
- `entity.clients:r`
- `entity.clients:a`
- `issued_documents.delivery_notes:r`
- `issued_documents.delivery_notes:a`

#### GET `/api/fatture-in-cloud/oauth/callback`
Callback OAuth2.

**Query Params:**
- `code`: Authorization code
- `state`: CSRF token

**Logica:**
1. Verifica `state` token
2. Exchange code per access_token:
   ```
   POST https://api-v2.fattureincloud.it/oauth/token
   Body: {
     grant_type: "authorization_code",
     client_id: CLIENT_ID,
     client_secret: CLIENT_SECRET,
     redirect_uri: REDIRECT_URI,
     code: code
   }
   ```
3. Salva `access_token`, `refresh_token`, `expires_at` in `fatture_in_cloud_config`
4. Redirect a pagina configurazione

#### POST `/api/fatture-in-cloud/clients/sync`
Sincronizza clienti da Fatture in Cloud.

**Logica Paginazione:**
```typescript
let currentPage = 1;
let hasMorePages = true;
const perPage = 50;

while (hasMorePages) {
  const response = await callFattureInCloudAPI(
    `/entities/clients?page=${currentPage}&per_page=${perPage}`,
    'GET'
  );
  
  const pageData = response.data?.data || [];
  const currentPageNumber = response.data?.current_page || currentPage;
  const totalPages = response.data?.last_page || 1;
  
  clientiFattureInCloud = clientiFattureInCloud.concat(pageData);
  
  if (currentPageNumber >= totalPages || pageData.length === 0) {
    hasMorePages = false;
  } else {
    currentPage++;
  }
}
```

**Gestione Duplicati:**
1. Mappa clienti Fatture in Cloud per P.IVA
2. Identifica duplicati locali con stessa P.IVA
3. Mantieni solo il cliente più recente per P.IVA
4. Aggiorna tutti con dati ufficiali da Fatture in Cloud
5. Elimina duplicati
6. Trasferisci report collegati al cliente mantenuto

**Response:**
```typescript
{
  success: true,
  message: "Sincronizzazione completa: X nuovi, Y aggiornati, Z duplicati eliminati",
  stats: {
    total_fatture_cloud: number,
    synced: number,
    updated: number,
    deleted_duplicates: number,
    merged_reports: number
  },
  orphaned_reports: []
}
```

#### GET `/api/fatture-in-cloud/companies`
Lista aziende disponibili.

**Response:**
```typescript
{
  companies: [
    {
      id: number,
      name: string,
      vat_number: string,
      tax_code: string,
      type: "company" | "accountant",
      fic_plan: string
    }
  ],
  current_company_id: number
}
```

#### PATCH `/api/fatture-in-cloud/company-id`
Cambia azienda attiva.

**Request Body:**
```typescript
{
  company_id: number
}
```

---

## 4. INTEGRAZIONE FATTURE IN CLOUD

### 4.1 Autenticazione OAuth2

**Flow Completo:**

1. **Authorization Request:**
   ```
   GET https://api-v2.fattureincloud.it/oauth/authorize
   Params:
     - response_type: "code"
     - client_id: YOUR_CLIENT_ID
     - redirect_uri: "https://yourdomain.com/api/fatture-in-cloud/oauth/callback"
     - scope: "entity.clients:r entity.clients:a issued_documents.delivery_notes:r issued_documents.delivery_notes:a"
     - state: RANDOM_STATE_TOKEN
   ```

2. **Token Exchange:**
   ```
   POST https://api-v2.fattureincloud.it/oauth/token
   Headers:
     Content-Type: application/json
   Body:
     {
       "grant_type": "authorization_code",
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "redirect_uri": "https://yourdomain.com/api/fatture-in-cloud/oauth/callback",
       "code": "AUTHORIZATION_CODE"
     }
   ```

3. **Response:**
   ```json
   {
     "token_type": "Bearer",
     "access_token": "...",
     "refresh_token": "...",
     "expires_in": 86400
   }
   ```

4. **Storage:**
   - Salva in `fatture_in_cloud_config`
   - Calcola `expires_at = NOW() + expires_in`
   - Imposta `attivo = true`

### 4.2 Helper Function `callFattureInCloudAPI`

```typescript
async function callFattureInCloudAPI(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
) {
  const config = await getActiveConfig();
  
  if (!config || !config.access_token) {
    return {
      success: false,
      error: { message: "Token non configurato" }
    };
  }
  
  // Verifica scadenza token
  if (new Date() >= new Date(config.expires_at)) {
    // TODO: Implementare refresh token
    return {
      success: false,
      error: { message: "Token scaduto" }
    };
  }
  
  const url = `https://api-v2.fattureincloud.it${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    return {
      success: false,
      error: await response.json()
    };
  }
  
  return {
    success: true,
    data: await response.json()
  };
}
```

### 4.3 Formato DDT per Fatture in Cloud

**Payload Completo:**

```typescript
{
  data: {
    type: "delivery_note",  // Tipo documento
    numeration: "/ordi",    // Serie numerazione
    subject: "DDT per report consegna #123",
    visible_subject: "Consegna vongole veraci",
    
    // Data documento
    date: "2025-10-01",
    
    // Cliente (usa fatture_in_cloud_id)
    entity: {
      id: 65131203
    },
    
    // Righe prodotto
    items_list: [
      {
        product_id: null,
        code: "TP-5000",
        name: "Vongole veraci TP-5000",
        description: "Vasca V1 - Sezione A2 | Taglia: TP-5000 | Peso: 25 kg | Pezzi/kg: 500 | % Guscio: 35% | % Mortalità: 0%",
        qty: 12500,
        measure: "NR",
        net_price: 0,
        gross_price: 0,
        vat: {
          id: 0  // IVA 0% per regime speciale
        },
        discount: 0,
        stock: false
      },
      // ... altre righe
      {
        name: "SUBTOTALE TP-5000",
        description: "SUBTOTALE TP-5000",
        qty: 50000,
        measure: "NR",
        net_price: 0,
        gross_price: 0,
        vat: { id: 0 }
      }
    ],
    
    // Dati trasporto
    transport_document: {
      date: "2025-10-01",
      number: "AUTO",  // Numerazione automatica
      type: "ddt",
      causale: "Vendita",
      porto: "Franco",
      aspetto: "Colli",
      peso: 100.5,
      colli: 4,
      note: ""
    },
    
    // Calcoli totali (opzionali per DDT senza prezzi)
    amount_net: 0,
    amount_vat: 0,
    amount_gross: 0
  }
}
```

**API Endpoint:**
```
POST https://api-v2.fattureincloud.it/c/{company_id}/issued_documents
```

**Response:**
```json
{
  "data": {
    "id": 12345,
    "type": "delivery_note",
    "number": "DDT-001/2025",
    "numeration": "/ordi",
    "date": "2025-10-01",
    "year": 2025,
    "pdf_url": "https://...",
    "url": "https://secure.fattureincloud.it/...",
    ...
  }
}
```

### 4.4 Gestione Errori API

**Errori Comuni:**

1. **Token Scaduto (401 Unauthorized):**
   ```json
   {
     "error": "invalid_token",
     "error_description": "The access token provided has expired"
   }
   ```
   **Soluzione:** Refresh token automatico

2. **Cliente Non Trovato:**
   ```json
   {
     "error": {
       "code": "not_found",
       "message": "Entity not found"
     }
   }
   ```
   **Soluzione:** Sincronizza clienti prima

3. **Validation Error:**
   ```json
   {
     "error": {
       "code": "validation",
       "message": "Invalid data",
       "validation_result": {
         "entity.id": ["Entity ID is required"]
       }
     }
   }
   ```
   **Soluzione:** Verifica payload

4. **Rate Limiting:**
   ```json
   {
     "error": "rate_limit_exceeded"
   }
   ```
   **Soluzione:** Retry con exponential backoff

---

## 5. FRONTEND

### 5.1 Componenti Principali

#### `ReportsConsegna.tsx`

**Responsabilità:**
- Lista report con filtri
- Visualizzazione dettagli
- Stampa report
- Creazione DDT
- Eliminazione report

**Queries TanStack:**
```typescript
// Report
const { data: reports } = useQuery({
  queryKey: ['/api/reports-consegna'],
  queryFn: () => api.get('/api/reports-consegna')
});

// Clienti
const { data: clienti } = useQuery({
  queryKey: ['/api/clienti'],
  queryFn: () => api.get('/api/clienti')
});

// Vasche
const { data: vasche } = useQuery({
  queryKey: ['/api/vasche'],
  queryFn: () => api.get('/api/vasche')
});
```

**Stati UI:**
- `selectedReport`: Report selezionato per visualizzazione
- `printingReport`: Report in fase di stampa
- `creaDdt`: Flag creazione DDT
- `includePrices`: Flag inclusione prezzi
- `sendEmail`: Flag invio email
- `isSubmitting`: Loading state

#### Dialog Conferma Stampa

**Opzioni:**
- **Crea DDT**: Checkbox per creare DDT locale
- **Includi Prezzi**: Checkbox per prezzi su DDT
- **Invia Email**: Input email destinatario
- **Note Aggiuntive**: Textarea note DDT

**Submit:**
```typescript
const handleConfirmPrint = async () => {
  const response = await api.patch(
    `/api/reports-consegna/${printingReport.id}/conferma-stampa`,
    {
      crea_ddt: creaDdt && printingReport.ddt_stato !== 'inviato',
      include_prices: includePrices,
      send_email: sendEmail,
      email_address: emailAddress,
      note_aggiuntive: noteAggiuntive
    }
  );
  
  if (response.success) {
    // Apri pagina stampa in nuova finestra
    window.open(`/api/public/stampa/report/${printingReport.id}`, '_blank');
    
    // Invalida cache
    queryClient.invalidateQueries({ queryKey: ['/api/reports-consegna'] });
  }
};
```

#### Dialog Creazione DDT Diretta

**Opzioni:**
- **Includi Prezzi**: Toggle prezzi
- **Forza Creazione**: Toggle per forzare re-invio se già inviato

**Submit:**
```typescript
const handleCreateDdt = async () => {
  const response = await api.post(
    `/api/reports-consegna/${ddtReport.id}/crea-ddt`,
    {
      include_prices: ddtIncludePrices,
      force_send: ddtForceCreate
    }
  );
  
  if (response.success) {
    toast({ title: "DDT creato e inviato a Fatture in Cloud" });
    refetch();
  } else if (response.require_force) {
    toast({
      title: "DDT già inviato",
      description: "Usa 'Forza creazione' per reinviare",
      variant: "destructive"
    });
  }
};
```

#### Badge Stato DDT

**Visual Indicators:**
```typescript
const getDdtStatusColor = (ddt_stato?: string) => {
  switch (ddt_stato) {
    case 'inviato':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'locale':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'nessuno':
    default:
      return 'bg-red-100 text-red-800 border-red-300';
  }
};

const getDdtStatusText = (ddt_stato?: string) => {
  switch (ddt_stato) {
    case 'inviato': return 'DDT Inviato';
    case 'locale': return 'DDT Locale';
    case 'nessuno':
    default: return 'Nessun DDT';
  }
};
```

### 5.2 Componente Stampabile `PrintableReport`

**Layout:**
- Header con logo e dati produttore/cliente
- Informazioni consegna (data, DDT, ordine)
- Tabella dettagli ceste:
  - Nr. cesta
  - Peso netto (kg)
  - Gusci sul peso (%)
  - Mortalità (%)
  - Pz/Kg
  - Nr. animali
  - Taglia
- Riga totali
- Firma per accettazione
- Clausola legale
- Footer con QR code

**CSS Print Media Queries:**
```css
@media print {
  .no-print {
    display: none !important;
  }
  
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .printable-report {
    page-break-inside: avoid;
  }
}
```

**QR Code:**
- Genera URL pubblico: `/api/public/view/report/:id`
- Renderizza QR code con libreria
- Inserisce immagine QR in footer

### 5.3 Pagina Configurazione Fatture in Cloud

**Sezioni:**

1. **Stato Connessione:**
   - Badge connesso/disconnesso
   - Data scadenza token
   - Pulsante autorizza/riautorizza

2. **Selezione Azienda:**
   - Select con lista aziende
   - Mostra azienda attiva
   - PATCH per cambio azienda

3. **Sincronizzazione Clienti:**
   - Pulsante "Sincronizza Clienti"
   - Progress indicator
   - Stats sincronizzazione (nuovi, aggiornati, duplicati eliminati)
   - Lista eventuali report orfani

4. **Configurazioni DDT:**
   - Numerazione automatica (toggle)
   - Causale trasporto (select)
   - Aspetto beni (select)
   - Porto (select)

**Mutations:**
```typescript
const syncMutation = useMutation({
  mutationFn: () => api.post('/api/fatture-in-cloud/clients/sync'),
  onSuccess: (data) => {
    toast({
      title: "Sincronizzazione completata",
      description: data.message
    });
    queryClient.invalidateQueries({ queryKey: ['/api/clienti'] });
  }
});
```

---

## 6. FLUSSO DI LAVORO COMPLETO

### 6.1 Scenario Tipico: Creazione Report → DDT → Fatture in Cloud

**Step 1: Creazione Report di Consegna**

1. Utente va su "Report di Consegna"
2. Clicca "Nuovo Report"
3. Compila form:
   - Seleziona cliente
   - Seleziona ordine (opzionale)
   - Imposta data consegna
4. Per ogni cesta/lotto:
   - Seleziona vasca e sezione
   - Inserisce peso, taglia, pz/kg, nr. animali
   - Opzionalmente: % guscio, % mortalità, identificativo cesta
5. Sistema calcola automaticamente:
   - Peso totale
   - Totale animali
   - Numero ceste
   - Taglia prevalente
6. Salva report → stato `ddt_stato = "nessuno"`

**Step 2: Stampa Report con Creazione DDT**

1. Utente clicca "Stampa" su report
2. Dialog conferma stampa si apre
3. Utente spunta "Crea DDT"
4. Opzionalmente:
   - Spunta "Includi Prezzi"
   - Inserisce email per invio
   - Aggiunge note
5. Clicca "Conferma"
6. Backend:
   - Verifica `ddt_stato !== "inviato"`
   - Recupera dati completi report + cliente + dettagli
   - **Se cliente ha dati incompleti:**
     - Recupera `fatture_in_cloud_id` del cliente
     - Chiama `GET /c/{company_id}/entities/clients/{id}` su Fatture in Cloud
     - Aggiorna dati cliente con quelli recuperati
   - Crea record in tabella `ddt`:
     ```sql
     INSERT INTO ddt (
       data_documento,
       tipo_documento,
       oggetto,
       cliente_id,
       cliente_nome,
       cliente_indirizzo,
       ...
       trasporto_causale,
       trasporto_peso,
       trasporto_colli,
       stato
     ) VALUES (...) RETURNING id
     ```
   - Aggrega dettagli per taglia
   - Per ogni taglia:
     - Inserisce righe dettaglio in `ddt_righe`
     - Inserisce riga subtotale
   - Aggiorna `reports_consegna.ddt_stato = "locale"`
7. Frontend:
   - Apre pagina stampa in nuova finestra
   - Mostra PDF report

**Step 3: Invio DDT a Fatture in Cloud**

1. Utente clicca "Invia DDT" su report con `ddt_stato = "locale"`
2. Dialog creazione DDT si apre
3. Utente conferma
4. Backend:
   - Recupera DDT locale da database
   - Recupera righe DDT
   - Costruisce payload Fatture in Cloud:
     ```typescript
     {
       data: {
         type: "delivery_note",
         numeration: "/ordi",
         date: ddt.data_documento,
         entity: {
           id: cliente.fatture_in_cloud_id
         },
         items_list: [
           // Righe dal database
         ],
         transport_document: {
           date: ddt.trasporto_data,
           number: "AUTO",
           type: "ddt",
           causale: ddt.trasporto_causale,
           porto: config.default_porto,
           aspetto: ddt.trasporto_aspetto,
           peso: ddt.trasporto_peso,
           colli: ddt.trasporto_colli
         }
       }
     }
     ```
   - Invia POST a Fatture in Cloud
   - Se successo:
     ```sql
     UPDATE ddt
     SET
       fatture_in_cloud_id = response.data.id,
       fatture_in_cloud_numero = response.data.number,
       url_documento = response.data.url,
       stato = 'inviato'
     WHERE id = ddt_id;
     
     UPDATE reports_consegna
     SET ddt_stato = 'inviato'
     WHERE id = report_id;
     ```
5. Frontend:
   - Mostra success toast
   - Badge diventa verde "DDT Inviato"
   - Link a documento Fatture in Cloud disponibile

### 6.2 Scenario Alternativo: DDT Diretto Senza Stampa

1. Utente clicca "Crea DDT" su report
2. Sistema salta creazione locale e invia direttamente
3. Crea DDT in database E invia a Fatture in Cloud in un'unica transazione
4. `ddt_stato` passa da `"nessuno"` a `"inviato"` direttamente

---

## 7. CALCOLI E LOGICA

### 7.1 Aggregazione Dettagli per Taglia

**Input:** Array di dettagli report

```typescript
interface DettaglioReport {
  taglia: string;
  numero_animali: number;
  peso_ceste_kg: number;
  animali_per_kg: number;
  percentuale_guscio: string;
  percentuale_mortalita: number;
  vasca_nome: string;
  codice_sezione: string;
}
```

**Processo:**

```typescript
const prodottiRaggruppati = new Map();

for (const dettaglio of dettagli) {
  const nomeProdotto = dettaglio.taglia || 'Vongole veraci';
  
  if (!prodottiRaggruppati.has(nomeProdotto)) {
    prodottiRaggruppati.set(nomeProdotto, {
      nome: nomeProdotto,
      quantitaTotale: 0,
      dettagli: []
    });
  }
  
  const prodotto = prodottiRaggruppati.get(nomeProdotto);
  prodotto.quantitaTotale += dettaglio.numero_animali;
  prodotto.dettagli.push(dettaglio);
}
```

**Output:** Map con chiave=taglia, valore={ quantitaTotale, dettagli[] }

### 7.2 Costruzione Descrizione Riga DDT

**Pattern:** Tutti i dati su una sola riga orizzontale

```typescript
const descrizione = `Vasca ${dettaglio.vasca_nome} - Sezione ${dettaglio.codice_sezione} | Taglia: ${dettaglio.taglia} | Peso: ${pesoKg} kg | Pezzi/kg: ${animaliPerKg} | % Guscio: ${percentualeGuscio}% | % Mortalità: ${percentualeMortalita}%`;
```

**Esempio Output:**
```
Vasca V1 - Sezione A2 | Taglia: TP-5000 | Peso: 25 kg | Pezzi/kg: 500 | % Guscio: 35% | % Mortalità: 0%
```

### 7.3 Calcolo Prezzi (Opzionale)

```typescript
if (include_prices) {
  // Recupera prezzo da listino per taglia
  const prezzoUnitario = await getPrezzoTaglia(dettaglio.taglia);
  const totaleNetto = dettaglio.numero_animali * prezzoUnitario;
} else {
  const prezzoUnitario = 0;
  const totaleNetto = 0;
}
```

### 7.4 Pattern Subtotali

**Per ogni taglia, crea:**

1. **N righe dettaglio** (una per sezione):
   ```
   Nome: TP-5000
   Descrizione: Vasca V1 - Sezione A2 | ...
   Quantità: 12500
   UM: NR
   ```

2. **1 riga subtotale**:
   ```
   Nome: TP-5000
   Descrizione: SUBTOTALE TP-5000
   Quantità: 50000 (somma di tutte le sezioni)
   UM: NR
   ```

**Vantaggi:**
- Tracciabilità per sezione
- Controllo visivo totali per taglia
- Compatibilità con sistema Fatture in Cloud

---

## 8. GESTIONE STATI

### 8.1 Stati Report di Consegna

#### `ddt_stato` (Campo Critico)

**Transizioni:**

```
nessuno → locale → inviato
   ↓        ↓
  (può creare DDT locale)
            ↓
         (può inviare a FIC)
```

**Regole:**
- `"nessuno"`: Nessun DDT associato, pulsante "Crea DDT" abilitato
- `"locale"`: DDT creato in DB, pulsanti "Stampa DDT" e "Invia a FIC" abilitati
- `"inviato"`: DDT su Fatture in Cloud, badge verde, link documento, pulsanti disabilitati

**Flag `force_send`:**
- Consente reinvio anche se `ddt_stato = "inviato"`
- Utile per correzioni o aggiornamenti
- Crea NUOVO documento su Fatture in Cloud

### 8.2 Stati DDT

#### `stato` (Campo DDT)

- `"bozza"`: DDT creato ma non finalizzato
- `"inviato"`: DDT sincronizzato con Fatture in Cloud
- `"annullato"`: DDT invalidato (non implementato)

### 8.3 Validazioni Pre-Invio

**Checklist Backend:**

1. **Cliente ha `fatture_in_cloud_id`?**
   - No → Errore: "Cliente non sincronizzato con Fatture in Cloud"
   
2. **Cliente ha dati completi?**
   - No → Recupera da Fatture in Cloud API
   
3. **Report ha dettagli?**
   - No → Errore: "Report senza dettagli"
   
4. **Token Fatture in Cloud valido?**
   - No → Errore: "Token scaduto, riautorizzare"
   
5. **DDT già inviato?**
   - Sì → Richiedi `force_send = true`

---

## 9. SICUREZZA E PERMESSI

### 9.1 Middleware Autenticazione

```typescript
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }
  next();
};
```

**Verifica:** Sessione utente valida con JWT

### 9.2 Middleware Permessi Modifica

```typescript
const requireEditPermission = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role === 'slave') {
    return res.status(403).json({ error: "Permessi insufficienti" });
  }
  next();
};
```

**Ruoli:**
- `master`: Accesso completo
- `standard`: Lettura e modifica
- `slave`: Solo lettura

### 9.3 Protezione Secrets

**Variabili Ambiente:**
```
FATTURE_IN_CLOUD_CLIENT_ID=...
FATTURE_IN_CLOUD_CLIENT_SECRET=...
```

**Storage Sicuro:**
- `access_token` e `refresh_token` in database
- Mai esposti in response API client-facing
- Solo backend ha accesso

### 9.4 CORS

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

---

## 10. BEST PRACTICES

### 10.1 Pattern Implementati

#### Snapshot Pattern (Dati Cliente in DDT)
**Problema:** Cliente può cambiare indirizzo dopo emissione DDT.
**Soluzione:** Duplica dati cliente nel DDT al momento della creazione.

```typescript
await db.execute(sql`
  INSERT INTO ddt (
    cliente_id,
    cliente_nome,       // Snapshot
    cliente_indirizzo,  // Snapshot
    cliente_cap,        // Snapshot
    ...
  ) VALUES (...)
`);
```

#### Transazioni per Integrità

```typescript
await db.transaction(async (tx) => {
  // 1. Crea DDT
  const ddt = await tx.insert(ddt_table).values(...).returning();
  
  // 2. Crea righe
  await tx.insert(ddt_righe_table).values(...);
  
  // 3. Aggiorna stato report
  await tx.update(reports_consegna)
    .set({ ddt_stato: 'locale' })
    .where(eq(reports_consegna.id, reportId));
});
```

#### Validazione Zod End-to-End

**Schema condiviso:**
```typescript
// shared/schema.ts
export const insertReportConsegnaSchema = createInsertSchema(reports_consegna)
  .extend({
    peso_totale_kg: z.number().positive(),
    totale_animali: z.number().int().positive()
  });

// Backend
const reportData = insertReportConsegnaSchema.parse(req.body);

// Frontend
const form = useForm({
  resolver: zodResolver(insertReportConsegnaSchema)
});
```

#### Ottimistic Updates

```typescript
const deleteMutation = useMutation({
  mutationFn: (id) => api.delete(`/api/reports-consegna/${id}`),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['/api/reports-consegna'] });
    const previousReports = queryClient.getQueryData(['/api/reports-consegna']);
    
    queryClient.setQueryData(['/api/reports-consegna'], (old) =>
      old.filter((r) => r.id !== id)
    );
    
    return { previousReports };
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(['/api/reports-consegna'], context.previousReports);
  }
});
```

### 10.2 Gestione Errori

#### Errori Strutturati

```typescript
class DDTCreationError extends Error {
  code: string;
  details: any;
  
  constructor(message: string, code: string, details: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Uso
if (!cliente.fatture_in_cloud_id) {
  throw new DDTCreationError(
    "Cliente non sincronizzato",
    "CLIENT_NOT_SYNCED",
    { cliente_id: cliente.id }
  );
}
```

#### Error Boundaries Frontend

```typescript
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    logErrorToService(error, errorInfo);
  }}
>
  <ReportsConsegna />
</ErrorBoundary>
```

#### Retry Logic per API

```typescript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

### 10.3 Performance

#### Paginazione API

```typescript
router.get("/reports", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  const reports = await db.select()
    .from(reports_consegna)
    .limit(limit)
    .offset(offset);
  
  const total = await db.select({ count: sql`count(*)` })
    .from(reports_consegna);
  
  res.json({
    data: reports,
    pagination: {
      page,
      limit,
      total: total[0].count
    }
  });
});
```

#### Eager Loading Relazioni

```typescript
const reports = await db.select()
  .from(reports_consegna)
  .leftJoin(clienti, eq(reports_consegna.cliente_id, clienti.id))
  .leftJoin(reports_consegna_dettagli, eq(reports_consegna.id, reports_consegna_dettagli.report_id));
```

#### Cache TanStack Query

```typescript
const { data: clienti } = useQuery({
  queryKey: ['/api/clienti'],
  queryFn: () => api.get('/api/clienti'),
  staleTime: 5 * 60 * 1000, // 5 minuti
  cacheTime: 10 * 60 * 1000  // 10 minuti
});
```

### 10.4 Testing Suggestions

#### Unit Tests Backend

```typescript
describe('DDT Creation', () => {
  it('should create local DDT', async () => {
    const report = await createMockReport();
    const result = await createLocalDDT(report.id);
    
    expect(result.ddt_stato).toBe('locale');
    expect(result.ddt_id).toBeDefined();
  });
  
  it('should prevent duplicate DDT', async () => {
    const report = await createMockReport({ ddt_stato: 'inviato' });
    
    await expect(
      createLocalDDT(report.id)
    ).rejects.toThrow('DDT già inviato');
  });
});
```

#### Integration Tests API

```typescript
describe('POST /api/reports-consegna/:id/crea-ddt', () => {
  it('should create and send DDT to Fatture in Cloud', async () => {
    const report = await db.insert(reports_consegna).values({...});
    
    const response = await request(app)
      .post(`/api/reports-consegna/${report.id}/crea-ddt`)
      .send({ include_prices: false });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    const updatedReport = await db.select()
      .from(reports_consegna)
      .where(eq(reports_consegna.id, report.id));
    
    expect(updatedReport[0].ddt_stato).toBe('inviato');
  });
});
```

#### E2E Tests Frontend

```typescript
describe('Report to DDT flow', () => {
  it('complete flow: create report → print → create DDT → send', async () => {
    // Navigate to reports page
    await page.goto('/reports-consegna');
    
    // Create new report
    await page.click('[data-testid="button-new-report"]');
    await page.fill('[data-testid="input-cliente"]', 'Test Cliente');
    // ...
    await page.click('[data-testid="button-save"]');
    
    // Print with DDT creation
    await page.click('[data-testid="button-print"]');
    await page.check('[data-testid="checkbox-crea-ddt"]');
    await page.click('[data-testid="button-confirm-print"]');
    
    // Verify DDT status
    await expect(page.locator('[data-testid="badge-ddt-status"]'))
      .toHaveText('DDT Locale');
    
    // Send to Fatture in Cloud
    await page.click('[data-testid="button-send-ddt"]');
    await page.click('[data-testid="button-confirm-send"]');
    
    await expect(page.locator('[data-testid="badge-ddt-status"]'))
      .toHaveText('DDT Inviato');
  });
});
```

---

## 11. CONSIDERAZIONI FINALI

### 11.1 Punti di Attenzione

1. **Gestione Token Fatture in Cloud:**
   - Implementare refresh token automatico prima della scadenza
   - Monitorare `expires_at` e pre-emptive refresh a 80% lifetime

2. **Sincronizzazione Clienti:**
   - Eseguire sync prima di ogni creazione DDT
   - Verificare sempre `fatture_in_cloud_id` presente

3. **Dati Cliente Incompleti:**
   - Pattern implementato: recupero automatico da API se indirizzo = "N/A"
   - Alternativa: Forzare completamento dati prima di DDT

4. **Numerazione DDT:**
   - Usare numerazione automatica Fatture in Cloud (`number: "AUTO"`)
   - Salvare numero assegnato in `fatture_in_cloud_numero`

5. **Gestione Errori Rete:**
   - Implementare retry con exponential backoff
   - Timeout configurabile per API calls
   - Fallback graceful se Fatture in Cloud non raggiungibile

### 11.2 Estensioni Possibili

1. **Fatturazione:**
   - Convertire DDT in fattura
   - Link DDT → Fattura in Fatture in Cloud

2. **Email Automatica:**
   - Invio DDT via email a cliente
   - Template personalizzabili

3. **Firma Digitale:**
   - Cattura firma cliente su tablet/dispositivo
   - Salvataggio immagine firma in report

4. **Export Massivo:**
   - Esportazione CSV report/DDT
   - Stampa batch multipli report

5. **Analytics:**
   - Dashboard consegne per periodo
   - Report taglie più vendute
   - Analisi clienti top

6. **Mobile App:**
   - App per operatori in campo
   - Creazione report offline
   - Sincronizzazione quando online

### 11.3 Dipendenze Chiave

**Backend:**
```json
{
  "express": "^4.18.0",
  "drizzle-orm": "^0.29.0",
  "@neondatabase/serverless": "^0.7.0",
  "zod": "^3.22.0",
  "date-fns": "^2.30.0"
}
```

**Frontend:**
```json
{
  "react": "^18.2.0",
  "@tanstack/react-query": "^5.0.0",
  "wouter": "^3.0.0",
  "zod": "^3.22.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "@radix-ui/react-toast": "^1.1.0"
}
```

### 11.4 Riferimenti API

- **Fatture in Cloud API v2:** https://developers.fattureincloud.it/
- **OAuth2 RFC:** https://datatracker.ietf.org/doc/html/rfc6749
- **Drizzle ORM Docs:** https://orm.drizzle.team/

---

## APPENDICE A: Esempio Completo Payload DDT

```json
{
  "data": {
    "type": "delivery_note",
    "numeration": "/ordi",
    "subject": "DDT per report consegna #123",
    "visible_subject": "Consegna vongole veraci - Cliente Test",
    "date": "2025-10-01",
    "entity": {
      "id": 65131203
    },
    "items_list": [
      {
        "product_id": null,
        "code": "TP-3000",
        "name": "Vongole veraci TP-3000",
        "description": "Vasca V1 - Sezione A1 | Taglia: TP-3000 | Peso: 20.5 kg | Pezzi/kg: 300 | % Guscio: 35% | % Mortalità: 0%",
        "qty": 6150,
        "measure": "NR",
        "net_price": 0,
        "gross_price": 0,
        "vat": {
          "id": 0
        },
        "discount": 0,
        "stock": false
      },
      {
        "product_id": null,
        "code": "TP-3000",
        "name": "Vongole veraci TP-3000",
        "description": "Vasca V1 - Sezione A2 | Taglia: TP-3000 | Peso: 18.2 kg | Pezzi/kg: 310 | % Guscio: 34% | % Mortalità: 1%",
        "qty": 5642,
        "measure": "NR",
        "net_price": 0,
        "gross_price": 0,
        "vat": {
          "id": 0
        }
      },
      {
        "name": "SUBTOTALE TP-3000",
        "description": "SUBTOTALE TP-3000",
        "qty": 11792,
        "measure": "NR",
        "net_price": 0,
        "gross_price": 0,
        "vat": {
          "id": 0
        }
      },
      {
        "product_id": null,
        "code": "TP-5000",
        "name": "Vongole veraci TP-5000",
        "description": "Vasca V2 - Sezione B1 | Taglia: TP-5000 | Peso: 25.0 kg | Pezzi/kg: 500 | % Guscio: 33% | % Mortalità: 0%",
        "qty": 12500,
        "measure": "NR",
        "net_price": 0,
        "gross_price": 0,
        "vat": {
          "id": 0
        }
      },
      {
        "name": "SUBTOTALE TP-5000",
        "description": "SUBTOTALE TP-5000",
        "qty": 12500,
        "measure": "NR",
        "net_price": 0,
        "gross_price": 0,
        "vat": {
          "id": 0
        }
      }
    ],
    "transport_document": {
      "date": "2025-10-01",
      "number": "AUTO",
      "type": "ddt",
      "causale": "Vendita",
      "porto": "Franco",
      "aspetto": "Colli",
      "peso": 63.7,
      "colli": 3,
      "note": ""
    },
    "amount_net": 0,
    "amount_vat": 0,
    "amount_gross": 0,
    "payments_list": [],
    "payment_method": {
      "id": null
    }
  }
}
```

---

**Fine Documentazione**

*Documento compilato il: 01/10/2025*
*Versione: 1.0*
*Autore: Sistema Delta Futuro*
