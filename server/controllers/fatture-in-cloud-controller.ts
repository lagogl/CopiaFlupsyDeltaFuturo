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
  fattureInCloudConfig,
  insertConfigurazioneSchema,
  insertClientiSchema,
  insertDdtSchema,
  insertDdtRigheSchema
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
  
  if (!accessToken) {
    throw new Error('Token di accesso mancante - eseguire prima l\'autenticazione OAuth2');
  }
  
  // Costruisci URL completo - se l'endpoint contiene già /c/{id}, non aggiungere company prefix
  let url: string;
  if (endpoint.startsWith('/c/') || endpoint.startsWith('/user/')) {
    // Endpoint che non richiedono companyId o già lo contengono
    url = `${FATTURE_IN_CLOUD_API_BASE}${endpoint}`;
  } else {
    // Endpoint che richiedono companyId
    const companyId = await getConfigValue('fatture_in_cloud_company_id');
    if (!companyId) {
      throw new Error('ID azienda mancante - selezionare prima un\'azienda');
    }
    url = `${FATTURE_IN_CLOUD_API_BASE}/c/${companyId}${endpoint}`;
  }
  
  console.log(`🔗 API Request: ${method} ${url}`);
  
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
    
    // Se stiamo salvando le credenziali API, carica automaticamente il Company ID dai segreti Replit
    if (chiave === 'fatture_in_cloud_client_secret') {
      const companyIdFromEnv = process.env.FATTURE_IN_CLOUD_COMPANY_ID;
      if (companyIdFromEnv) {
        await setConfigValue('fatture_in_cloud_company_id', companyIdFromEnv, 'ID Azienda da segreti Replit');
        console.log('✅ Company ID caricato automaticamente dai segreti Replit:', companyIdFromEnv);
      }
    }
    
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
    
    // Recupera tutti i clienti gestendo la paginazione
    let allClienti: any[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    const perPage = 100;
    
    console.log('🔄 Inizio sincronizzazione clienti con paginazione...');
    
    while (hasMorePages) {
      const response = await withRetry(() => 
        apiRequest('GET', `/entities/clients?page=${currentPage}&per_page=${perPage}`)
      );
      
      const pageData = response.data.data || [];
      allClienti = allClienti.concat(pageData);
      
      // Estrai metadati paginazione dalla risposta con fallback robusti
      const meta = response.data;
      const lastPage = meta.last_page ?? ((meta.current_page && meta.total) ? Math.ceil(meta.total / perPage) : 1);
      const total = meta.total ?? 0;
      
      console.log(`📄 Pagina ${currentPage}/${lastPage} - Recuperati ${pageData.length} clienti (Totale finora: ${allClienti.length}${total ? `/${total}` : ''})`);
      
      // Condizioni di stop: ultima pagina raggiunta o meno risultati di per_page
      hasMorePages = currentPage < lastPage && pageData.length === perPage;
      currentPage++;
      
      // Protezione contro loop infiniti
      if (currentPage > 1000) {
        console.warn('⚠️ Raggiunto limite di sicurezza (1000 pagine) - interruzione sincronizzazione');
        break;
      }
    }
    
    console.log(`✅ Recuperati ${allClienti.length} clienti totali da Fatture in Cloud`);
    
    let clientiAggiornati = 0;
    let clientiCreati = 0;
    
    for (const clienteFIC of allClienti) {
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
          .set({ ...datiCliente, updatedAt: new Date() })
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
      stats: { creati: clientiCreati, aggiornati: clientiAggiornati, totale: allClienti.length }
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

// ===== ENDPOINTS AZIENDA =====

// Recupera informazioni azienda
router.get('/company/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'ID azienda richiesto' });
    }

    await refreshTokenIfNeeded();
    
    const companyResponse = await withRetry(() => 
      apiRequest('GET', `/c/${companyId}/company/info`)
    );
    
    console.log('📊 Dati azienda ricevuti:', JSON.stringify(companyResponse.data, null, 2));
    
    res.json({
      success: true,
      data: companyResponse.data,
      message: 'Informazioni azienda recuperate con successo'
    });
  } catch (error: any) {
    console.error('Errore nel recupero informazioni azienda:', error);
    res.status(500).json({ 
      success: false, 
      message: `Errore nel recupero informazioni azienda: ${error.message}` 
    });
  }
});

// ===== GESTIONE MULTI-AZIENDA =====

// Recupera lista aziende disponibili
router.get('/companies', async (req: Request, res: Response) => {
  try {
    console.log('📋 Richiesta lista aziende disponibili...');
    
    // Verifica token di accesso
    const accessToken = await getConfigValue('fatture_in_cloud_access_token');
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Token di accesso non configurato",
        auth_url: "/api/fatture-in-cloud/oauth/url"
      });
    }
    
    // Refresh token se necessario
    await refreshTokenIfNeeded();
    
    // Chiama API Fatture in Cloud per ottenere lista aziende
    const companiesResponse = await withRetry(() => 
      apiRequest('GET', '/user/companies')
    );
    
    console.log('📊 Risposta API companies:', JSON.stringify(companiesResponse.data, null, 2));
    
    // Estrai array aziende dalla risposta (gestisci struttura annidata)
    const companies = companiesResponse.data?.data?.companies || 
                     companiesResponse.data?.companies?.companies || 
                     companiesResponse.data?.companies || [];
    
    // Recupera company_id corrente
    const currentCompanyId = await getConfigValue('fatture_in_cloud_company_id');
    
    res.json({
      success: true,
      companies: companies,
      current_company_id: currentCompanyId ? parseInt(currentCompanyId) : null,
      message: "Lista aziende recuperata con successo"
    });
    
  } catch (error: any) {
    console.error('❌ Errore nel recupero aziende:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Errore nel recupero lista aziende"
    });
  }
});

// Aggiorna azienda selezionata
router.patch('/company-id', async (req: Request, res: Response) => {
  try {
    const { company_id } = req.body;
    
    console.log('🔄 Richiesta aggiornamento company_id:', company_id);
    
    // Validazione input
    if (!company_id) {
      return res.status(400).json({ 
        success: false,
        error: "ID azienda richiesto" 
      });
    }
    
    // Verifica token di accesso
    const accessToken = await getConfigValue('fatture_in_cloud_access_token');
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Token di accesso non configurato"
      });
    }
    
    // Opzionale: verifica che l'azienda esista nell'account
    try {
      const companiesResponse = await withRetry(() => 
        apiRequest('GET', '/user/companies')
      );
      
      const companies = companiesResponse.data?.data?.companies || 
                       companiesResponse.data?.companies?.companies || 
                       companiesResponse.data?.companies || [];
      
      const companyExists = companies.some((c: any) => c.id === parseInt(company_id));
      
      if (!companyExists) {
        return res.status(400).json({ 
          success: false,
          error: "ID azienda non valido per questo account" 
        });
      }
    } catch (verifyError) {
      console.warn('⚠️ Impossibile verificare azienda, procedo comunque:', verifyError);
    }
    
    // Aggiorna company_id nella configurazione
    await setConfigValue('fatture_in_cloud_company_id', company_id.toString(), 'ID azienda Fatture in Cloud selezionata');
    
    console.log('✅ Company ID aggiornato con successo:', company_id);
    
    res.json({ 
      success: true, 
      message: "ID azienda aggiornato con successo",
      company_id: parseInt(company_id)
    });
    
  } catch (error: any) {
    console.error('❌ Errore nell\'aggiornamento ID azienda:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Errore interno del server" 
    });
  }
});

// ===== ENDPOINTS DATI FISCALI AZIENDA =====

// GET /fiscal-data - Recupera i dati fiscali dell'azienda attiva
router.get('/fiscal-data', async (req: Request, res: Response) => {
  try {
    const companyId = await getConfigValue('fatture_in_cloud_company_id');
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Nessuna azienda selezionata. Seleziona prima un'azienda."
      });
    }
    
    const configs = await db.select()
      .from(fattureInCloudConfig)
      .where(eq(fattureInCloudConfig.companyId, parseInt(companyId)))
      .limit(1);
    
    if (configs.length === 0) {
      return res.json({
        success: true,
        fiscalData: null,
        message: "Nessun dato fiscale configurato per questa azienda"
      });
    }
    
    const config = configs[0];
    
    res.json({
      success: true,
      fiscalData: {
        ragioneSociale: config.ragioneSociale,
        indirizzo: config.indirizzo,
        cap: config.cap,
        citta: config.citta,
        provincia: config.provincia,
        partitaIva: config.partitaIva,
        codiceFiscale: config.codiceFiscale,
        telefono: config.telefono,
        email: config.email,
        logoPath: config.logoPath
      }
    });
  } catch (error: any) {
    console.error('Errore nel recupero dati fiscali:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nel recupero dei dati fiscali"
    });
  }
});

// PUT /fiscal-data - Crea o aggiorna i dati fiscali dell'azienda attiva (UPSERT)
router.put('/fiscal-data', async (req: Request, res: Response) => {
  try {
    const companyId = await getConfigValue('fatture_in_cloud_company_id');
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Nessuna azienda selezionata. Seleziona prima un'azienda."
      });
    }
    
    const {
      ragioneSociale,
      indirizzo,
      cap,
      citta,
      provincia,
      partitaIva,
      codiceFiscale,
      telefono,
      email,
      logoPath
    } = req.body;
    
    const configs = await db.select()
      .from(fattureInCloudConfig)
      .where(eq(fattureInCloudConfig.companyId, parseInt(companyId)))
      .limit(1);
    
    if (configs.length === 0) {
      // Record non esiste, lo creiamo (INSERT)
      await db.insert(fattureInCloudConfig).values({
        companyId: parseInt(companyId),
        ragioneSociale,
        indirizzo,
        cap,
        citta,
        provincia,
        partitaIva,
        codiceFiscale,
        telefono,
        email,
        logoPath
      });
      
      console.log(`✅ Dati fiscali creati per company_id ${companyId}`);
    } else {
      // Record esiste, lo aggiorniamo (UPDATE)
      await db.update(fattureInCloudConfig)
        .set({
          ragioneSociale,
          indirizzo,
          cap,
          citta,
          provincia,
          partitaIva,
          codiceFiscale,
          telefono,
          email,
          logoPath,
          updatedAt: new Date()
        })
        .where(eq(fattureInCloudConfig.companyId, parseInt(companyId)));
      
      console.log(`✅ Dati fiscali aggiornati per company_id ${companyId}`);
    }
    
    res.json({
      success: true,
      message: "Dati fiscali salvati con successo"
    });
  } catch (error: any) {
    console.error('Errore nel salvataggio dati fiscali:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nel salvataggio dei dati fiscali"
    });
  }
});

// GET /available-logos - Lista dei loghi disponibili
router.get('/available-logos', async (req: Request, res: Response) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const logosDir = path.join(process.cwd(), 'attached_assets', 'logos');
    
    try {
      const files = await fs.readdir(logosDir);
      const logos = files
        .filter(file => /\.(png|jpg|jpeg|svg)$/i.test(file))
        .map(file => ({
          name: file,
          path: `/assets/logos/${file}`
        }));
      
      res.json({
        success: true,
        logos
      });
    } catch (error: any) {
      res.json({
        success: true,
        logos: []
      });
    }
  } catch (error: any) {
    console.error('Errore nel recupero loghi disponibili:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nel recupero dei loghi disponibili"
    });
  }
});

// ===== ENDPOINTS TEST =====

// Test connessione
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('Inizio test connessione Fatture in Cloud...');
    
    // Verifica se abbiamo già un company ID configurato
    const companyId = await getConfigValue('fatture_in_cloud_company_id');
    
    if (companyId) {
      console.log(`Utilizzo Company ID configurato: ${companyId}`);
      
      // Testa l'accesso specifico all'azienda
      const companyResponse = await withRetry(() => 
        apiRequest('GET', `/c/${companyId}/company/info`)
      );
      
      // Ottieni anche le informazioni dell'utente
      const userResponse = await withRetry(() => 
        apiRequest('GET', '/user/info')
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
      // Se non abbiamo un company ID, prova a ottenerlo dalle informazioni utente
      const userResponse = await withRetry(() => 
        apiRequest('GET', '/user/info')
      );
      
      console.log('Informazioni utente ricevute:', userResponse);
      
      res.status(400).json({
        success: false,
        status: "errore",
        message: "ID Azienda non configurato. Inserisci l'ID azienda nella sezione Configurazione Azienda.",
        data: {
          user: userResponse.data
        }
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

// GET /ddt/:id/pdf - Genera e scarica PDF del DDT
router.get('/ddt/:id/pdf', async (req: Request, res: Response) => {
  try {
    const ddtId = parseInt(req.params.id);
    
    // Recupera DDT
    const ddtResult = await db.select().from(ddt).where(eq(ddt.id, ddtId)).limit(1);
    
    if (ddtResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'DDT non trovato'
      });
    }
    
    const ddtData = ddtResult[0];
    
    // Recupera righe DDT
    const righe = await db.select()
      .from(ddtRighe)
      .where(eq(ddtRighe.ddtId, ddtId))
      .orderBy(ddtRighe.id);
    
    // Crea documento PDF (landscape per più spazio)
    const doc = new PDFDocument({ 
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Set headers per download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DDT-${ddtData.numero}-${ddtData.data}.pdf`);
    
    // Pipe PDF al response
    doc.pipe(res);
    
    const pageWidth = 842; // A4 landscape width
    const pageHeight = 595; // A4 landscape height
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;
    
    // === HEADER CON LOGO E DATI MITTENTE ===
    // Logo aziendale (se presente)
    if (ddtData.mittenteLogoPath) {
      try {
        const logoPath = path.join(process.cwd(), 'attached_assets', 'logos', path.basename(ddtData.mittenteLogoPath));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, yPosition, { width: 100, height: 50, fit: [100, 50] });
        }
      } catch (error) {
        console.error('Errore caricamento logo:', error);
      }
    }
    
    // Intestazione DDT
    doc.fontSize(24).font('Helvetica-Bold')
       .text('DOCUMENTO DI TRASPORTO', margin + 120, yPosition, { align: 'center', width: contentWidth - 120 });
    
    yPosition += 30;
    doc.fontSize(16).font('Helvetica')
       .text(`DDT N. ${ddtData.numero} del ${new Date(ddtData.data).toLocaleDateString('it-IT')}`, 
             margin + 120, yPosition, { align: 'center', width: contentWidth - 120 });
    
    yPosition += 40;
    
    // === DATI MITTENTE E DESTINATARIO ===
    const boxHeight = 120;
    const boxWidth = (contentWidth - 20) / 2;
    
    // Box Mittente (sinistra)
    doc.rect(margin, yPosition, boxWidth, boxHeight).stroke();
    let boxY = yPosition + 10;
    
    doc.fontSize(12).font('Helvetica-Bold')
       .text('MITTENTE', margin + 10, boxY);
    boxY += 20;
    
    doc.fontSize(10).font('Helvetica');
    if (ddtData.mittenteRagioneSociale) {
      doc.font('Helvetica-Bold').text(ddtData.mittenteRagioneSociale, margin + 10, boxY);
      boxY += 15;
      doc.font('Helvetica');
    }
    if (ddtData.mittenteIndirizzo) {
      doc.text(ddtData.mittenteIndirizzo, margin + 10, boxY);
      boxY += 12;
    }
    if (ddtData.mittenteCap || ddtData.mittenteCitta || ddtData.mittenteProvincia) {
      doc.text(`${ddtData.mittenteCap || ''} ${ddtData.mittenteCitta || ''} (${ddtData.mittenteProvincia || ''})`, margin + 10, boxY);
      boxY += 12;
    }
    if (ddtData.mittentePartitaIva) {
      doc.text(`P.IVA: ${ddtData.mittentePartitaIva}`, margin + 10, boxY);
      boxY += 12;
    }
    if (ddtData.mittenteCodiceFiscale) {
      doc.text(`CF: ${ddtData.mittenteCodiceFiscale}`, margin + 10, boxY);
    }
    
    // Box Destinatario (destra)
    const boxRightX = margin + boxWidth + 20;
    doc.rect(boxRightX, yPosition, boxWidth, boxHeight).stroke();
    boxY = yPosition + 10;
    
    doc.fontSize(12).font('Helvetica-Bold')
       .text('DESTINATARIO', boxRightX + 10, boxY);
    boxY += 20;
    
    doc.fontSize(10).font('Helvetica');
    if (ddtData.clienteNome) {
      doc.font('Helvetica-Bold').text(ddtData.clienteNome, boxRightX + 10, boxY);
      boxY += 15;
      doc.font('Helvetica');
    }
    if (ddtData.clienteIndirizzo) {
      doc.text(ddtData.clienteIndirizzo, boxRightX + 10, boxY);
      boxY += 12;
    }
    if (ddtData.clienteCap || ddtData.clienteCitta || ddtData.clienteProvincia) {
      doc.text(`${ddtData.clienteCap || ''} ${ddtData.clienteCitta || ''} (${ddtData.clienteProvincia || ''})`, boxRightX + 10, boxY);
      boxY += 12;
    }
    if (ddtData.clientePaese) {
      doc.text(ddtData.clientePaese, boxRightX + 10, boxY);
      boxY += 12;
    }
    if (ddtData.clientePiva) {
      doc.text(`P.IVA: ${ddtData.clientePiva}`, boxRightX + 10, boxY);
    }
    
    yPosition += boxHeight + 20;
    
    // === TABELLA RIGHE DDT ===
    doc.fontSize(12).font('Helvetica-Bold')
       .text('DETTAGLIO MERCE', margin, yPosition);
    
    yPosition += 20;
    
    // Header tabella
    const tableTop = yPosition;
    const colWidths = {
      descrizione: 450,
      quantita: 80,
      um: 60,
      prezzo: 80
    };
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Descrizione', margin, tableTop, { width: colWidths.descrizione });
    doc.text('Quantità', margin + colWidths.descrizione, tableTop, { width: colWidths.quantita, align: 'right' });
    doc.text('U.M.', margin + colWidths.descrizione + colWidths.quantita, tableTop, { width: colWidths.um, align: 'center' });
    doc.text('Prezzo', margin + colWidths.descrizione + colWidths.quantita + colWidths.um, tableTop, { width: colWidths.prezzo, align: 'right' });
    
    yPosition += 20;
    doc.moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke();
    yPosition += 10;
    
    // Righe tabella
    doc.font('Helvetica').fontSize(9);
    for (const riga of righe) {
      // Se la descrizione inizia con "SUBTOTALE", rendila in grassetto
      if (riga.descrizione.startsWith('SUBTOTALE')) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      doc.text(riga.descrizione, margin, yPosition, { width: colWidths.descrizione });
      doc.text(parseFloat(riga.quantita).toLocaleString('it-IT'), 
               margin + colWidths.descrizione, yPosition, { width: colWidths.quantita, align: 'right' });
      doc.text(riga.unitaMisura, 
               margin + colWidths.descrizione + colWidths.quantita, yPosition, { width: colWidths.um, align: 'center' });
      doc.text(parseFloat(riga.prezzoUnitario).toLocaleString('it-IT', { minimumFractionDigits: 2 }),
               margin + colWidths.descrizione + colWidths.quantita + colWidths.um, yPosition, { width: colWidths.prezzo, align: 'right' });
      
      yPosition += 15;
      
      // Check se serve nuova pagina
      if (yPosition > pageHeight - 100) {
        doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
        yPosition = margin;
      }
    }
    
    yPosition += 10;
    doc.moveTo(margin, yPosition).lineTo(pageWidth - margin, yPosition).stroke();
    yPosition += 20;
    
    // === TOTALI ===
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`Totale Colli: ${ddtData.totaleColli}`, margin, yPosition);
    doc.text(`Peso Totale: ${(parseFloat(ddtData.pesoTotale.toString()) / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2 })} kg`, 
             pageWidth - margin - 200, yPosition, { width: 200, align: 'right' });
    
    yPosition += 30;
    
    // Note
    if (ddtData.note) {
      doc.fontSize(10).font('Helvetica');
      doc.text('Note:', margin, yPosition);
      yPosition += 15;
      doc.text(ddtData.note, margin, yPosition, { width: contentWidth });
    }
    
    // Footer
    doc.fontSize(8).font('Helvetica')
       .text(`Documento generato il ${new Date().toLocaleString('it-IT')}`, 
             margin, pageHeight - 30, { width: contentWidth, align: 'center' });
    
    // Finalizza PDF
    doc.end();
    
  } catch (error: any) {
    console.error('Errore nella generazione PDF DDT:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nella generazione del PDF',
      details: error.message
    });
  }
});

export default router;