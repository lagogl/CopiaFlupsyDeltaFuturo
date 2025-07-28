import express from 'express';
import axios from 'axios';
import type { Request, Response } from 'express';
import { db } from '../db';
import { 
  configurazione, 
  clienti, 
  ddt, 
  ddtRighe, 
  externalDeliveriesSync,
  externalDeliveryDetailsSync,
  insertConfigurazioneSchema,
  insertClientiSchema,
  insertDdtSchema,
  insertDdtRigheSchema
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// Configurazione base API
const FATTURE_IN_CLOUD_API_BASE = 'https://api-v2.fattureincloud.it';

// ===== UTILITY FUNCTIONS =====

// Helper per recuperare valori di configurazione
async function getConfigValue(chiave: string): Promise<string | null> {
  try {
    const config = await db.select().from(configurazione).where(eq(configurazione.chiave, chiave)).limit(1);
    return config.length > 0 ? config[0].valore : null;
  } catch (error) {
    console.error(`Errore nel recupero configurazione ${chiave}:`, error);
    return null;
  }
}

// Helper per impostare valori di configurazione
async function setConfigValue(chiave: string, valore: string, descrizione?: string): Promise<void> {
  try {
    await db.insert(configurazione)
      .values({ chiave, valore, descrizione })
      .onConflictDoUpdate({
        target: configurazione.chiave,
        set: { valore, updatedAt: new Date() }
      });
  } catch (error) {
    console.error(`Errore nell'impostazione configurazione ${chiave}:`, error);
    throw error;
  }
}

// Helper per richieste autenticate a Fatture in Cloud
async function apiRequest(method: string, endpoint: string, data?: any) {
  const accessToken = await getConfigValue('fatture_in_cloud_access_token');
  const companyId = await getConfigValue('fatture_in_cloud_company_id');
  
  if (!accessToken) {
    throw new Error('Token di accesso mancante - eseguire prima l\'autenticazione OAuth2');
  }
  
  if (!companyId) {
    throw new Error('ID azienda mancante - selezionare prima un\'azienda');
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

// Refresh token automatico
async function refreshTokenIfNeeded(): Promise<boolean> {
  const expiresAt = await getConfigValue('fatture_in_cloud_token_expires_at');
  const refreshToken = await getConfigValue('fatture_in_cloud_refresh_token');
  
  if (!expiresAt || !refreshToken) return false;
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  
  // Refresh se mancano meno di 5 minuti alla scadenza
  if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const clientId = await getConfigValue('fatture_in_cloud_client_id');
      const clientSecret = await getConfigValue('fatture_in_cloud_client_secret');
      
      const response = await axios.post(`${FATTURE_IN_CLOUD_API_BASE}/oauth/token`, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      });
      
      const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
      
      await setConfigValue('fatture_in_cloud_access_token', access_token);
      await setConfigValue('fatture_in_cloud_refresh_token', newRefreshToken);
      
      const newExpiresAt = new Date(Date.now() + (expires_in * 1000));
      await setConfigValue('fatture_in_cloud_token_expires_at', newExpiresAt.toISOString());
      
      console.log('Token Fatture in Cloud rinnovato con successo');
      return true;
    } catch (error) {
      console.error('Errore nel refresh del token:', error);
      return false;
    }
  }
  
  return true;
}

// Wrapper per richieste con retry automatico
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
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

// ===== ENDPOINTS OAUTH2 =====

// Endpoint per ottenere URL di autorizzazione
router.get('/oauth/url', async (req: Request, res: Response) => {
  try {
    const clientId = await getConfigValue('fatture_in_cloud_client_id');
    const clientSecret = await getConfigValue('fatture_in_cloud_client_secret');
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false,
        message: 'Client ID non configurato. Inserire prima il Client ID nelle impostazioni.' 
      });
    }
    
    if (!clientSecret) {
      return res.status(400).json({ 
        success: false,
        message: 'Client Secret non configurato. Inserire prima il Client Secret nelle impostazioni.' 
      });
    }
    
    // Validazione formato client_id (deve essere una stringa alfanumerica di almeno 16 caratteri)
    if (clientId.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(clientId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Client ID non valido. Deve essere una stringa alfanumerica di almeno 16 caratteri.',
        details: `Client ID ricevuto: ${clientId.substring(0, 8)}...`
      });
    }
    
    // Forza HTTPS per Replit deployment
    const protocol = req.get('host')?.includes('replit.dev') ? 'https' : req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/api/fatture-in-cloud/oauth/callback`;
    
    console.log(`🔐 Generazione URL OAuth2 per Client ID: ${clientId.substring(0, 8)}...`);
    console.log(`🔗 Redirect URI: ${redirectUri}`);
    
    const authUrl = `${FATTURE_IN_CLOUD_API_BASE}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=entity.clients:r entity.clients:a issued_documents.delivery_notes:r issued_documents.delivery_notes:a`;
    
    res.json({ success: true, url: authUrl });
  } catch (error: any) {
    console.error('Errore nella generazione URL OAuth2:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Callback OAuth2
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, error: oauthError } = req.query;
    
    if (oauthError) {
      return res.redirect('/fatture-in-cloud?oauth=cancelled');
    }
    
    if (!code) {
      return res.redirect('/fatture-in-cloud?oauth=error&reason=no_code');
    }
    
    const clientId = await getConfigValue('fatture_in_cloud_client_id');
    const clientSecret = await getConfigValue('fatture_in_cloud_client_secret');
    
    if (!clientId || !clientSecret) {
      return res.redirect('/fatture-in-cloud?oauth=error&reason=missing_credentials');
    }
    
    // Forza HTTPS per Replit deployment  
    const protocol = req.get('host')?.includes('replit.dev') ? 'https' : req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/api/fatture-in-cloud/oauth/callback`;
    
    const tokenResponse = await axios.post(`${FATTURE_IN_CLOUD_API_BASE}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Salva i token
    await setConfigValue('fatture_in_cloud_access_token', access_token);
    await setConfigValue('fatture_in_cloud_refresh_token', refresh_token);
    
    const expiresAt = new Date(Date.now() + (expires_in * 1000));
    await setConfigValue('fatture_in_cloud_token_expires_at', expiresAt.toISOString());
    
    console.log('Autenticazione OAuth2 Fatture in Cloud completata con successo');
    res.redirect('/fatture-in-cloud?oauth=success');
  } catch (error: any) {
    console.error('Errore nel callback OAuth2:', error);
    res.redirect('/fatture-in-cloud?oauth=error&reason=token_exchange');
  }
});

// ===== ENDPOINTS CONFIGURAZIONE =====

// Endpoint per recuperare la configurazione
router.get('/config', async (req: Request, res: Response) => {
  try {
    const configs = await db.select().from(configurazione);
    const configMap: Record<string, string> = {};
    
    configs.forEach(config => {
      // Non esporre i token per sicurezza
      if (!config.chiave.includes('token') && !config.chiave.includes('secret')) {
        configMap[config.chiave] = config.valore || '';
      } else {
        configMap[config.chiave] = config.valore ? '***CONFIGURATO***' : '';
      }
    });
    
    res.json({ success: true, config: configMap });
  } catch (error: any) {
    console.error('Errore nel recupero configurazione:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint per impostare configurazione
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { chiave, valore, descrizione } = req.body;
    
    if (!chiave) {
      return res.status(400).json({ success: false, message: 'Chiave configurazione richiesta' });
    }
    
    await setConfigValue(chiave, valore || '', descrizione);
    
    res.json({ 
      success: true, 
      message: `Configurazione ${chiave} aggiornata con successo` 
    });
  } catch (error: any) {
    console.error('Errore nell\'impostazione configurazione:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== ENDPOINTS CLIENTI =====

// Sincronizzazione clienti da Fatture in Cloud
router.post('/clients/sync', async (req: Request, res: Response) => {
  try {
    await refreshTokenIfNeeded();
    
    const response = await withRetry(() => apiRequest('GET', '/entities/clients'));
    const clientiFIC = response.data.data || [];
    
    let clientiAggiornati = 0;
    let clientiCreati = 0;
    
    for (const clienteFIC of clientiFIC) {
      // Cerca cliente esistente per P.IVA o denominazione
      let clienteEsistente = null;
      
      if (clienteFIC.vat_number) {
        const clientiConPiva = await db.select().from(clienti).where(eq(clienti.piva, clienteFIC.vat_number));
        if (clientiConPiva.length > 0) {
          clienteEsistente = clientiConPiva[0];
        }
      }
      
      if (!clienteEsistente && clienteFIC.name) {
        const clientiConNome = await db.select().from(clienti).where(eq(clienti.denominazione, clienteFIC.name));
        if (clientiConNome.length > 0) {
          clienteEsistente = clientiConNome[0];
        }
      }
      
      const datiCliente = {
        denominazione: clienteFIC.name || 'N/A',
        indirizzo: clienteFIC.address_street || '',
        comune: clienteFIC.address_city || '',
        cap: clienteFIC.address_postal_code || '',
        provincia: clienteFIC.address_province || '',
        paese: clienteFIC.country || 'Italia',
        email: clienteFIC.email || '',
        telefono: clienteFIC.phone || '',
        piva: clienteFIC.vat_number || '',
        codice_fiscale: clienteFIC.tax_code || clienteFIC.vat_number || '',
        fatture_in_cloud_id: clienteFIC.id
      };
      
      if (clienteEsistente) {
        await db.update(clienti)
          .set({ ...datiCliente, updated_at: new Date() })
          .where(eq(clienti.id, clienteEsistente.id));
        clientiAggiornati++;
      } else {
        await db.insert(clienti).values(datiCliente);
        clientiCreati++;
      }
    }
    
    res.json({
      success: true,
      message: `Sincronizzazione completata: ${clientiCreati} nuovi, ${clientiAggiornati} aggiornati`,
      stats: { creati: clientiCreati, aggiornati: clientiAggiornati, totale: clientiFIC.length }
    });
  } catch (error: any) {
    console.error('Errore nella sincronizzazione clienti:', error);
    res.status(500).json({ 
      success: false, 
      message: `Errore nella sincronizzazione: ${error.message}` 
    });
  }
});

// Ottenere lista clienti locali
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const clientiLocali = await db.select().from(clienti);
    
    res.json({
      success: true,
      clients: clientiLocali,
      count: clientiLocali.length
    });
  } catch (error: any) {
    console.error('Errore nel recupero clienti:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== ENDPOINTS DDT =====

// Creazione DDT da report consegna
router.post('/ddt', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({ success: false, message: 'ID report richiesto' });
    }
    
    await refreshTokenIfNeeded();
    
    // Recupera i dettagli del report dal database esterno sincronizzato
    const reportConsegna = await db.select()
      .from(externalDeliveriesSync)
      .where(eq(externalDeliveriesSync.id, reportId))
      .limit(1);
    
    if (reportConsegna.length === 0) {
      return res.status(404).json({ success: false, message: 'Report consegna non trovato' });
    }
    
    const report = reportConsegna[0];
    
    // Recupera i dettagli del report
    const reportDettagli = await db.select()
      .from(externalDeliveryDetailsSync)
      .where(eq(externalDeliveryDetailsSync.reportId, reportId));
    
    if (reportDettagli.length === 0) {
      return res.status(404).json({ success: false, message: 'Dettagli report non trovati' });
    }
    
    // Cerca il cliente
    let cliente = null;
    if (report.clienteId) {
      const clientiTrovati = await db.select()
        .from(clienti)
        .where(eq(clienti.id, report.clienteId))
        .limit(1);
      if (clientiTrovati.length > 0) {
        cliente = clientiTrovati[0];
      }
    }
    
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente non trovato' });
    }
    
    // Genera numero DDT progressivo
    const ultimiDdt = await db.select().from(ddt).orderBy(desc(ddt.numero)).limit(1);
    const nuovoNumero = ultimiDdt.length > 0 ? ultimiDdt[0].numero + 1 : 1;
    
    // Crea DDT locale prima
    const [nuovoDdt] = await db.insert(ddt).values({
      numero: nuovoNumero,
      clienteId: cliente.id,
      data: report.dataConsegna,
      totaleColli: report.numeroTotaleCeste,
      pesoTotale: report.pesoTotaleKg.toString(),
      note: `DDT generato da report consegna ${report.id}`,
      ddtStato: 'locale'
    }).returning();
    
    // Crea righe DDT
    const righe = [];
    for (const dettaglio of reportDettagli) {
      const riga = {
        ddtId: nuovoDdt.id,
        descrizione: `${dettaglio.codiceSezione} | ${dettaglio.taglia} | ${dettaglio.pesoCesteKg}kg | ${dettaglio.animaliPerKg} pz/kg | ${dettaglio.percentualeGuscio}% guscio | ${dettaglio.percentualeMortalita}% mortalità`,
        quantita: dettaglio.numeroAnimali.toString(),
        unitaMisura: 'NR',
        prezzoUnitario: '0',
        reportDettaglioId: dettaglio.id
      };
      
      const [rigaCreata] = await db.insert(ddtRighe).values(riga).returning();
      righe.push(rigaCreata);
    }
    
    // Raggruppa per taglia e crea subtotali
    const righeConSubtotali = [];
    const prodottiRaggrupati: Record<string, any[]> = {};
    
    for (const riga of righe) {
      const dettaglio = reportDettagli.find(d => d.id === riga.reportDettaglioId);
      if (dettaglio) {
        const taglia = dettaglio.taglia || 'N/A';
        
        if (!prodottiRaggrupati[taglia]) {
          prodottiRaggrupati[taglia] = [];
        }
        prodottiRaggrupati[taglia].push(riga);
      }
    }
    
    for (const [taglia, righeGruppo] of Object.entries(prodottiRaggrupati)) {
      righeConSubtotali.push(...righeGruppo);
      
      // Aggiungi subtotale
      const totaleGruppo = righeGruppo.reduce((sum, r) => sum + parseFloat(r.quantita), 0);
      righeConSubtotali.push({
        descrizione: `SUBTOTALE ${taglia}`,
        quantita: totaleGruppo,
        unitaMisura: 'NR',
        prezzoUnitario: 0
      });
    }
    
    // Recupera dati cliente completi se necessario
    let datiCliente = cliente;
    if (cliente.fattureInCloudId && (cliente.indirizzo === 'N/A' || !cliente.indirizzo)) {
      try {
        const clienteResponse = await withRetry(() => apiRequest('GET', `/entities/clients/${cliente.fattureInCloudId}`));
        const clienteFIC = clienteResponse.data.data;
        
        datiCliente = {
          ...cliente,
          indirizzo: clienteFIC.address_street || cliente.indirizzo,
          comune: clienteFIC.address_city || cliente.comune,
          cap: clienteFIC.address_postal_code || cliente.cap,
          provincia: clienteFIC.address_province || cliente.provincia
        };
      } catch (error) {
        console.log('Impossibile recuperare dati cliente completi:', error);
      }
    }
    
    // Prepara payload per Fatture in Cloud
    const ddtPayload = {
      data: {
        type: 'delivery_note',
        entity: {
          id: cliente.fattureInCloudId || null,
          name: datiCliente.denominazione,
          address_street: datiCliente.indirizzo !== 'N/A' ? datiCliente.indirizzo : '',
          address_city: datiCliente.comune !== 'N/A' ? datiCliente.comune : '',
          address_postal_code: datiCliente.cap !== 'N/A' ? datiCliente.cap : '',
          address_province: datiCliente.provincia !== 'N/A' ? datiCliente.provincia : '',
          country: 'Italia',
          vat_number: datiCliente.piva !== 'N/A' ? datiCliente.piva : '',
          tax_code: datiCliente.codiceFiscale !== 'N/A' ? datiCliente.codiceFiscale : ''
        },
        date: report.dataConsegna,
        number: nuovoDdt.numero,
        items_list: righeConSubtotali.map(riga => ({
          name: riga.descrizione,
          qty: typeof riga.quantita === 'string' ? parseFloat(riga.quantita) : riga.quantita,
          measure: riga.unitaMisura,
          net_price: typeof riga.prezzoUnitario === 'string' ? parseFloat(riga.prezzoUnitario) : riga.prezzoUnitario
        })),
        template: {
          id: null,
          locked: false
        },
        delivery_note_template: null
      }
    };
    
    // Invia a Fatture in Cloud
    const ficResponse = await withRetry(() => apiRequest('POST', '/issued_documents', ddtPayload));
    
    // Aggiorna DDT con ID esterno
    await db.update(ddt).set({
      fattureInCloudId: ficResponse.data.data.id,
      ddtStato: 'inviato',
      updatedAt: new Date()
    }).where(eq(ddt.id, nuovoDdt.id));
    
    res.json({
      success: true,
      ddt_id: nuovoDdt.id,
      fatture_in_cloud_id: ficResponse.data.data.id,
      numero: nuovoDdt.numero,
      message: 'DDT creato e inviato con successo a Fatture in Cloud'
    });
    
  } catch (error: any) {
    console.error('Errore nella creazione DDT:', error);
    res.status(500).json({ 
      success: false, 
      message: `Errore nella creazione DDT: ${error.message}` 
    });
  }
});

// Lista DDT
router.get('/ddt', async (req: Request, res: Response) => {
  try {
    const ddtList = await db.select({
      id: ddt.id,
      numero: ddt.numero,
      data: ddt.data,
      clienteId: ddt.clienteId,
      totaleColli: ddt.totaleColli,
      pesoTotale: ddt.pesoTotale,
      note: ddt.note,
      ddtStato: ddt.ddtStato,
      fattureInCloudId: ddt.fattureInCloudId,
      createdAt: ddt.createdAt,
      denominazioneCliente: clienti.denominazione
    })
    .from(ddt)
    .leftJoin(clienti, eq(ddt.clienteId, clienti.id))
    .orderBy(desc(ddt.createdAt));
    
    res.json({
      success: true,
      ddt: ddtList,
      count: ddtList.length
    });
  } catch (error: any) {
    console.error('Errore nel recupero DDT:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== ENDPOINTS TEST =====

// Test connessione
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('Inizio test connessione Fatture in Cloud...');
    
    // Prima ottieni le informazioni dell'utente per trovare il company ID corretto
    const userResponse = await withRetry(() => 
      apiRequest('/user/info', 'GET')
    );
    
    console.log('Informazioni utente ricevute:', userResponse);
    
    // Se l'utente ha aziende associate, usa la prima disponibile
    if (userResponse.data?.companies && userResponse.data.companies.length > 0) {
      const companyId = userResponse.data.companies[0].id;
      console.log(`Utilizzo Company ID: ${companyId}`);
      
      // Salva il Company ID nella configurazione
      await setConfigValue('fatture_in_cloud_company_id', companyId.toString(), 'ID Azienda per Fatture in Cloud');
      
      // Testa l'accesso specifico all'azienda
      const companyResponse = await withRetry(() => 
        apiRequest(`/c/${companyId}/company/info`, 'GET')
      );
      
      res.json({
        success: true,
        status: "connesso",
        message: "Connessione a Fatture in Cloud attiva",
        data: {
          user: userResponse.data,
          company: companyResponse.data,
          companyId: companyId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        status: "errore",
        message: "L'utente non ha aziende associate all'account Fatture in Cloud"
      });
    }
  } catch (error: any) {
    console.error('Errore nel test connessione:', error);
    res.status(500).json({
      success: false,
      status: "errore",
      message: error.message || 'Errore nella connessione a Fatture in Cloud',
      details: error.response?.data || null
    });
  }
});

export default router;