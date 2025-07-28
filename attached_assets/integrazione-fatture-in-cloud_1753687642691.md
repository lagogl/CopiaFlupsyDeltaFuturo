# Integrazione Fatture in Cloud - Delta Futuro

## Panoramica dell'Integrazione

Il sistema Delta Futuro implementa un'integrazione completa con le API di Fatture in Cloud per la gestione automatica di:
- Documenti di Trasporto (DDT)
- Sincronizzazione clienti
- Autenticazione OAuth2
- Gestione azienda multipla

## Architettura dell'Integrazione

### 1. Configurazione Database
```sql
-- Tabella configurazione per memorizzare le credenziali
CREATE TABLE configurazione (
  id SERIAL PRIMARY KEY,
  chiave VARCHAR(255) UNIQUE NOT NULL,
  valore TEXT,
  descrizione TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chiavi di configurazione per Fatture in Cloud
INSERT INTO configurazione (chiave, valore, descrizione) VALUES
('fatture_in_cloud_client_id', '', 'Client ID OAuth2 Fatture in Cloud'),
('fatture_in_cloud_client_secret', '', 'Client Secret OAuth2 Fatture in Cloud'),
('fatture_in_cloud_access_token', '', 'Access Token OAuth2'),
('fatture_in_cloud_refresh_token', '', 'Refresh Token OAuth2'),
('fatture_in_cloud_company_id', '', 'ID Azienda selezionata'),
('fatture_in_cloud_token_expires_at', '', 'Scadenza token OAuth2');
```

### 2. Estensione Schema Clienti
```sql
-- Aggiunta campo per linking con Fatture in Cloud
ALTER TABLE clienti ADD COLUMN fatture_in_cloud_id INTEGER;
```

### 3. Schema DDT Completo
```sql
-- Tabella principale DDT
CREATE TABLE ddt (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  data DATE NOT NULL,
  cliente_id INTEGER REFERENCES clienti(id),
  totale_colli INTEGER DEFAULT 0,
  peso_totale DECIMAL(10,2) DEFAULT 0,
  note TEXT,
  ddt_stato VARCHAR(20) DEFAULT 'nessuno', -- nessuno, locale, inviato
  fatture_in_cloud_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Righe dettaglio DDT
CREATE TABLE ddt_righe (
  id SERIAL PRIMARY KEY,
  ddt_id INTEGER REFERENCES ddt(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  quantita DECIMAL(10,2) NOT NULL,
  unita_misura VARCHAR(10) DEFAULT 'NR',
  prezzo_unitario DECIMAL(10,2) DEFAULT 0,
  report_dettaglio_id INTEGER REFERENCES reports_consegna_dettagli(id)
);
```

## Implementazione Backend

### 1. Router Dedicato per Fatture in Cloud
```typescript
// server/routes/fatture-in-cloud.ts
import express from 'express';
import axios from 'axios';

const fattureincloudRouter = express.Router();

// Configurazione base API
const FATTURE_IN_CLOUD_API_BASE = 'https://api-v2.fattureincloud.it';

// Helper per richieste autenticate
async function apiRequest(method: string, endpoint: string, data?: any) {
  const accessToken = await storage.getConfigValue('fatture_in_cloud_access_token');
  const companyId = await storage.getConfigValue('fatture_in_cloud_company_id');
  
  if (!accessToken) {
    throw new Error('Token di accesso mancante');
  }
  
  const url = `${FATTURE_IN_CLOUD_API_BASE}/c/${companyId}${endpoint}`;
  
  return await axios({
    method,
    url,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data
  });
}
```

### 2. Gestione OAuth2
```typescript
// Endpoint per ottenere URL di autorizzazione
fattureincloudRouter.get('/oauth/url', async (_req, res) => {
  try {
    const clientId = await storage.getConfigValue('fatture_in_cloud_client_id');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/fatture-in-cloud/oauth/callback`;
    
    const authUrl = `https://api-v2.fattureincloud.it/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=entity.clients:r entity.clients:a issued_documents.delivery_notes:r issued_documents.delivery_notes:a`;
    
    res.json({ url: authUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Callback OAuth2
fattureincloudRouter.get('/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const clientId = await storage.getConfigValue('fatture_in_cloud_client_id');
    const clientSecret = await storage.getConfigValue('fatture_in_cloud_client_secret');
    
    const tokenResponse = await axios.post('https://api-v2.fattureincloud.it/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${req.protocol}://${req.get('host')}/api/fatture-in-cloud/oauth/callback`,
      code
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Salva i token
    await storage.setConfigValue('fatture_in_cloud_access_token', access_token);
    await storage.setConfigValue('fatture_in_cloud_refresh_token', refresh_token);
    
    const expiresAt = new Date(Date.now() + (expires_in * 1000));
    await storage.setConfigValue('fatture_in_cloud_token_expires_at', expiresAt.toISOString());
    
    res.redirect('/configurazione?oauth=success');
  } catch (error) {
    res.redirect('/configurazione?oauth=error');
  }
});
```

### 3. Refresh Token Automatico
```typescript
async function refreshTokenIfNeeded() {
  const expiresAt = await storage.getConfigValue('fatture_in_cloud_token_expires_at');
  const refreshToken = await storage.getConfigValue('fatture_in_cloud_refresh_token');
  
  if (!expiresAt || !refreshToken) return false;
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  
  // Refresh se mancano meno di 5 minuti alla scadenza
  if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const clientId = await storage.getConfigValue('fatture_in_cloud_client_id');
      const clientSecret = await storage.getConfigValue('fatture_in_cloud_client_secret');
      
      const response = await axios.post('https://api-v2.fattureincloud.it/oauth/token', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      });
      
      const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
      
      await storage.setConfigValue('fatture_in_cloud_access_token', access_token);
      await storage.setConfigValue('fatture_in_cloud_refresh_token', newRefreshToken);
      
      const newExpiresAt = new Date(Date.now() + (expires_in * 1000));
      await storage.setConfigValue('fatture_in_cloud_token_expires_at', newExpiresAt.toISOString());
      
      return true;
    } catch (error) {
      console.error('Errore nel refresh del token:', error);
      return false;
    }
  }
  
  return true;
}
```

### 4. Sincronizzazione Clienti
```typescript
// Endpoint per sincronizzazione clienti
fattureincloudRouter.post('/clients/sync', async (_req, res) => {
  try {
    await refreshTokenIfNeeded();
    
    const response = await apiRequest('GET', '/entities/clients');
    const clientiFIC = response.data.data || [];
    
    let clientiAggiornati = 0;
    let clientiCreati = 0;
    
    for (const clienteFIC of clientiFIC) {
      // Cerca cliente esistente per P.IVA o denominazione
      const clienteEsistente = await storage.findClienteByPIva(clienteFIC.vat_number) ||
                              await storage.findClienteByDenominazione(clienteFIC.name);
      
      const datiCliente = {
        denominazione: clienteFIC.name || 'N/A',
        indirizzo: clienteFIC.address_street || 'N/A',
        comune: clienteFIC.address_city || 'N/A',
        cap: clienteFIC.address_postal_code || 'N/A',
        provincia: clienteFIC.address_province || 'N/A',
        paese: clienteFIC.country || 'Italia',
        email: clienteFIC.email || 'N/A',
        telefono: clienteFIC.phone || 'N/A',
        piva: clienteFIC.vat_number || 'N/A',
        codice_fiscale: clienteFIC.tax_code || clienteFIC.vat_number || 'N/A',
        fatture_in_cloud_id: clienteFIC.id
      };
      
      if (clienteEsistente) {
        await storage.updateCliente(clienteEsistente.id, datiCliente);
        clientiAggiornati++;
      } else {
        await storage.createCliente(datiCliente);
        clientiCreati++;
      }
    }
    
    res.json({
      success: true,
      message: `Sincronizzazione completata: ${clientiCreati} nuovi, ${clientiAggiornati} aggiornati`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### 5. Creazione DDT
```typescript
// Endpoint per creazione DDT
fattureincloudRouter.post('/ddt', async (req, res) => {
  try {
    const { reportId } = req.body;
    
    await refreshTokenIfNeeded();
    
    // Recupera i dettagli del report
    const reportDettagli = await storage.getReportConsegnaDettagli(reportId);
    const report = await storage.getReportConsegna(reportId);
    
    if (!report || !reportDettagli.length) {
      return res.status(404).json({ message: 'Report non trovato' });
    }
    
    const cliente = await storage.getCliente(report.cliente_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    // Crea DDT locale prima
    const ddt = await storage.createDDT({
      cliente_id: report.cliente_id,
      data: new Date(report.data_consegna),
      totale_colli: reportDettagli.length,
      note: `DDT generato da report consegna ${report.id}`,
      ddt_stato: 'locale'
    });
    
    // Crea righe DDT
    const righe = [];
    for (const dettaglio of reportDettagli) {
      const riga = await storage.createDDTRiga({
        ddt_id: ddt.id,
        descrizione: `${dettaglio.vasca} | ${dettaglio.sezione} | ${dettaglio.taglia} | ${dettaglio.peso_kg}kg | ${dettaglio.pezzi_kg} pz/kg | ${dettaglio.percentuale_guscio}% guscio | ${dettaglio.percentuale_mortalita}% mortalità`,
        quantita: dettaglio.numero_animali,
        unita_misura: 'NR',
        prezzo_unitario: 0,
        report_dettaglio_id: dettaglio.id
      });
      righe.push(riga);
    }
    
    // Raggruppa per taglia e crea subtotali
    const righeConSubtotali = [];
    const prodottiRaggrupati = {};
    
    for (const riga of righe) {
      const dettaglio = reportDettagli.find(d => d.id === riga.report_dettaglio_id);
      const taglia = dettaglio.taglia;
      
      if (!prodottiRaggrupati[taglia]) {
        prodottiRaggrupati[taglia] = [];
      }
      prodottiRaggrupati[taglia].push(riga);
    }
    
    for (const [taglia, righeGruppo] of Object.entries(prodottiRaggrupati)) {
      righeConSubtotali.push(...righeGruppo);
      
      // Aggiungi subtotale
      const totaleGruppo = righeGruppo.reduce((sum, r) => sum + r.quantita, 0);
      righeConSubtotali.push({
        descrizione: `SUBTOTALE ${taglia}`,
        quantita: totaleGruppo,
        unita_misura: 'NR',
        prezzo_unitario: 0
      });
    }
    
    // Recupera dati cliente completi se necessario
    let datiCliente = cliente;
    if (cliente.fatture_in_cloud_id && (cliente.indirizzo === 'N/A' || !cliente.indirizzo)) {
      try {
        const clienteResponse = await apiRequest('GET', `/entities/clients/${cliente.fatture_in_cloud_id}`);
        const clienteFIC = clienteResponse.data.data;
        
        datiCliente = {
          ...cliente,
          indirizzo: clienteFIC.address_street || cliente.indirizzo,
          comune: clienteFIC.address_city || cliente.comune,
          cap: clienteFIC.address_postal_code || cliente.cap,
          provincia: clienteFIC.address_province || cliente.provincia
        };
      } catch (error) {
        console.log('Impossibile recuperare dati cliente completi:', error.message);
      }
    }
    
    // Prepara payload per Fatture in Cloud
    const ddtPayload = {
      data: {
        type: 'delivery_note',
        entity: {
          id: cliente.fatture_in_cloud_id || null,
          name: datiCliente.denominazione,
          address_street: datiCliente.indirizzo !== 'N/A' ? datiCliente.indirizzo : '',
          address_city: datiCliente.comune !== 'N/A' ? datiCliente.comune : '',
          address_postal_code: datiCliente.cap !== 'N/A' ? datiCliente.cap : '',
          address_province: datiCliente.provincia !== 'N/A' ? datiCliente.provincia : '',
          country: 'Italia',
          vat_number: datiCliente.piva !== 'N/A' ? datiCliente.piva : '',
          tax_code: datiCliente.codice_fiscale !== 'N/A' ? datiCliente.codice_fiscale : ''
        },
        date: report.data_consegna,
        number: ddt.numero,
        items_list: righeConSubtotali.map(riga => ({
          name: riga.descrizione,
          qty: riga.quantita,
          measure: riga.unita_misura,
          net_price: riga.prezzo_unitario
        })),
        template: {
          id: null,
          locked: false
        },
        delivery_note_template: null
      }
    };
    
    // Invia a Fatture in Cloud
    const ficResponse = await apiRequest('POST', '/issued_documents', ddtPayload);
    
    // Aggiorna DDT con ID esterno
    await storage.updateDDT(ddt.id, {
      fatture_in_cloud_id: ficResponse.data.data.id,
      ddt_stato: 'inviato'
    });
    
    res.json({
      success: true,
      ddt_id: ddt.id,
      fatture_in_cloud_id: ficResponse.data.data.id,
      message: 'DDT creato e inviato con successo'
    });
    
  } catch (error) {
    console.error('Errore nella creazione DDT:', error);
    res.status(500).json({ message: error.message });
  }
});
```

## Implementazione Frontend

### 1. Configurazione OAuth2
```typescript
// client/src/pages/configurazione.tsx
const handleOAuth2Setup = async () => {
  try {
    const response = await fetch('/api/fatture-in-cloud/oauth/url');
    const data = await response.json();
    
    if (data.url) {
      // Apri popup per autorizzazione
      const popup = window.open(
        data.url,
        'fattureincloud-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      // Monitor per chiusura popup
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Ricarica configurazione
          queryClient.invalidateQueries({ queryKey: ['/api/configurazione'] });
        }
      }, 1000);
    }
  } catch (error) {
    toast({
      title: "Errore",
      description: "Impossibile avviare l'autorizzazione OAuth2",
      variant: "destructive"
    });
  }
};
```

### 2. Gestione Stato DDT
```typescript
// Componente per visualizzazione stato DDT
const DDTStatusBadge = ({ stato }: { stato: string }) => {
  const getStatusConfig = () => {
    switch (stato) {
      case 'nessuno':
        return { color: 'bg-red-500', text: 'Nessun DDT', icon: AlertCircle };
      case 'locale':
        return { color: 'bg-yellow-500', text: 'DDT Locale', icon: FileText };
      case 'inviato':
        return { color: 'bg-green-500', text: 'Inviato', icon: CheckCircle };
      default:
        return { color: 'bg-gray-500', text: 'N/A', icon: HelpCircle };
    }
  };
  
  const { color, text, icon: Icon } = getStatusConfig();
  
  return (
    <Badge className={`${color} text-white`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </Badge>
  );
};
```

## Configurazione Ambiente

### 1. Variabili Ambiente
```bash
# .env
FATTURE_IN_CLOUD_CLIENT_ID=your_client_id
FATTURE_IN_CLOUD_CLIENT_SECRET=your_client_secret
FATTURE_IN_CLOUD_REDIRECT_URI=https://yourapp.com/api/fatture-in-cloud/oauth/callback
```

### 2. Scopi OAuth2 Richiesti
```
entity.clients:r entity.clients:a 
issued_documents.delivery_notes:r issued_documents.delivery_notes:a
```

## Gestione Errori e Retry

### 1. Retry Logic per Token Scaduti
```typescript
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.response?.status === 401 && attempt < maxRetries) {
        console.log('Token scaduto, tentativo di refresh...');
        const refreshed = await refreshTokenIfNeeded();
        if (!refreshed) {
          throw new Error('Impossibile rinnovare il token');
        }
        continue;
      }
      throw error;
    }
  }
  throw new Error('Operazione fallita dopo tutti i tentativi');
}
```

### 2. Gestione Rate Limiting
```typescript
const rateLimiter = {
  requests: [],
  maxRequests: 100,
  timeWindow: 60000, // 1 minuto
  
  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
};
```

## Test e Debugging

### 1. Endpoint di Test
```typescript
// Test connessione
fattureincloudRouter.get('/test', async (_req, res) => {
  try {
    await refreshTokenIfNeeded();
    const response = await apiRequest('GET', '/user/info');
    res.json({ status: 'success', data: response.data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

### 2. Logging Dettagliato
```typescript
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[FattureInCloud] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[FattureInCloud ERROR] ${message}`, error || '');
  }
};
```

Questa integrazione fornisce una gestione completa delle API di Fatture in Cloud con autenticazione OAuth2, sincronizzazione clienti, creazione DDT automatica e gestione degli errori robusta.