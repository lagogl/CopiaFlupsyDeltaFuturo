/**
 * Servizio di cache globale per i dati frequentemente utilizzati
 * 
 * Questo modulo implementa un sistema di cache in memoria che viene caricato all'avvio
 * dell'applicazione e aggiornato periodicamente o su richiesta.
 * 
 * In un ambiente multiutente, i dati vengono condivisi tra tutti gli utenti connessi,
 * migliorando notevolmente le prestazioni.
 */

import { sql } from 'drizzle-orm';
import * as schema from '../../shared/schema';

class GlobalDataCache {
  constructor(db) {
    this.db = db;
    this.cache = {
      lotStatistics: null,
      lots: null,
      operations: null,
      baskets: null,
      flupsys: null,
      cycles: null,
      sizes: null,
      dashboard: null,
      lastUpdate: {
        lotStatistics: null,
        lots: null,
        operations: null,
        baskets: null,
        flupsys: null,
        cycles: null,
        sizes: null,
        dashboard: null
      },
      updateInterval: {
        lotStatistics: 5 * 60 * 1000, // 5 minuti in millisecondi
        lots: 5 * 60 * 1000, // 5 minuti
        operations: 3 * 60 * 1000, // 3 minuti
        baskets: 5 * 60 * 1000, // 5 minuti
        flupsys: 10 * 60 * 1000, // 10 minuti
        cycles: 5 * 60 * 1000, // 5 minuti
        sizes: 24 * 60 * 60 * 1000, // 24 ore (cambiano raramente)
        dashboard: 2 * 60 * 1000 // 2 minuti
      }
    };

    // Registro per gli utenti connessi
    this.connectedUsers = new Set();
    this.autoUpdateEnabled = true;
    
    // Inizializza la cache all'avvio
    this.initializeCache();
    
    // Avvia il processo di aggiornamento automatico
    this.startAutoUpdate();
  }
  
  /**
   * Inizializza la cache all'avvio dell'applicazione
   */
  async initializeCache() {
    try {
      console.log('Inizializzazione cache globale...');
      
      // Carica tutti i dati in parallelo per ridurre il tempo di avvio
      await Promise.all([
        this.updateLotStatistics(),
        this.updateLots(),
        this.updateOperations(),
        this.updateBaskets(),
        this.updateFlupsys(),
        this.updateCycles(),
        this.updateSizes(),
        this.updateDashboard()
      ]);
      
      console.log('Cache globale inizializzata con successo');
    } catch (error) {
      console.error('Errore durante l\'inizializzazione della cache globale:', error);
    }
  }
  
  /**
   * Avvia il processo di aggiornamento automatico della cache
   */
  startAutoUpdate() {
    // Controlla e aggiorna la cache ogni minuto
    setInterval(() => {
      if (this.autoUpdateEnabled) {
        this.checkAndUpdateCache();
      }
    }, 60 * 1000); // ogni minuto
  }
  
  /**
   * Controlla quali dati nella cache necessitano di aggiornamento
   * e li aggiorna se necessario
   */
  async checkAndUpdateCache() {
    const now = Date.now();
    
    // Controlla quali dati devono essere aggiornati
    const updatePromises = [];
    
    if (this.shouldUpdate('lotStatistics', now)) {
      updatePromises.push(this.updateLotStatistics());
    }
    
    if (this.shouldUpdate('lots', now)) {
      updatePromises.push(this.updateLots());
    }
    
    if (this.shouldUpdate('operations', now)) {
      updatePromises.push(this.updateOperations());
    }
    
    if (this.shouldUpdate('baskets', now)) {
      updatePromises.push(this.updateBaskets());
    }
    
    if (this.shouldUpdate('flupsys', now)) {
      updatePromises.push(this.updateFlupsys());
    }
    
    if (this.shouldUpdate('cycles', now)) {
      updatePromises.push(this.updateCycles());
    }
    
    if (this.shouldUpdate('sizes', now)) {
      updatePromises.push(this.updateSizes());
    }
    
    if (this.shouldUpdate('dashboard', now)) {
      updatePromises.push(this.updateDashboard());
    }
    
    // Esegui tutti gli aggiornamenti in parallelo
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Aggiornamento cache completato: ${updatePromises.length} entità aggiornate`);
    }
  }
  
  /**
   * Determina se un determinato tipo di dati deve essere aggiornato
   */
  shouldUpdate(dataType, currentTime) {
    const lastUpdate = this.cache.lastUpdate[dataType];
    const updateInterval = this.cache.updateInterval[dataType];
    
    // Se non è mai stato aggiornato o è passato l'intervallo di aggiornamento
    return !lastUpdate || (currentTime - lastUpdate) > updateInterval;
  }
  
  /**
   * Aggiorna le statistiche dei lotti nella cache
   */
  async updateLotStatistics() {
    console.time('cache-lot-statistics-update');
    
    try {
      // Query ottimizzata per ottenere le statistiche sui lotti
      const statsQuery = await this.db.execute(sql`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(CAST(animal_count AS FLOAT)), 0) as totale,
          COALESCE(SUM(CASE WHEN quality = 'normali' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as normali,
          COALESCE(SUM(CASE WHEN quality = 'teste' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as teste,
          COALESCE(SUM(CASE WHEN quality = 'code' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as code
        FROM lots
      `);
      
      // Estrai i risultati con conversione esplicita a numeri
      const stats = statsQuery[0] || { 
        total_count: 0,
        totale: 0, 
        normali: 0, 
        teste: 0, 
        code: 0 
      };
      
      // Calcola le percentuali
      const totalCount = Number(stats.total_count) || 0;
      const totale = Number(stats.totale) || 0;
      const normali = Number(stats.normali) || 0;
      const teste = Number(stats.teste) || 0;
      const code = Number(stats.code) || 0;
      
      // Evita divisione per zero
      const percentages = {
        normali: totale > 0 ? Number(((normali / totale) * 100).toFixed(1)) : 0,
        teste: totale > 0 ? Number(((teste / totale) * 100).toFixed(1)) : 0,
        code: totale > 0 ? Number(((code / totale) * 100).toFixed(1)) : 0
      };
      
      // Aggiorna la cache
      this.cache.lotStatistics = {
        totalCount,
        counts: { normali, teste, code, totale },
        percentages
      };
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.lotStatistics = Date.now();
      
      console.timeEnd('cache-lot-statistics-update');
      console.log('Statistiche lotti aggiornate nella cache globale');
    } catch (error) {
      console.error('Errore nell\'aggiornamento delle statistiche dei lotti:', error);
    }
  }
  
  /**
   * Aggiorna i lotti nella cache
   */
  async updateLots() {
    console.time('cache-lots-update');
    
    try {
      // Query ottimizzata per ottenere tutti i lotti
      const lotsQuery = await this.db.select().from(schema.lots);
      
      // Salva nella cache
      this.cache.lots = lotsQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.lots = Date.now();
      
      console.timeEnd('cache-lots-update');
      console.log(`Cache lotti aggiornata: ${lotsQuery.length} lotti caricati`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei lotti:', error);
    }
  }
  
  /**
   * Aggiorna le operazioni nella cache
   */
  async updateOperations() {
    console.time('cache-operations-update');
    
    try {
      // Query ottimizzata per ottenere tutte le operazioni
      const operationsQuery = await this.db.select().from(schema.operations);
      
      // Salva nella cache
      this.cache.operations = operationsQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.operations = Date.now();
      
      console.timeEnd('cache-operations-update');
      console.log(`Cache operazioni aggiornata: ${operationsQuery.length} operazioni caricate`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento delle operazioni:', error);
    }
  }
  
  /**
   * Aggiorna i cestelli nella cache
   */
  async updateBaskets() {
    console.time('cache-baskets-update');
    
    try {
      // Query ottimizzata per ottenere tutti i cestelli
      const basketsQuery = await this.db.select().from(schema.baskets);
      
      // Salva nella cache
      this.cache.baskets = basketsQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.baskets = Date.now();
      
      console.timeEnd('cache-baskets-update');
      console.log(`Cache cestelli aggiornata: ${basketsQuery.length} cestelli caricati`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei cestelli:', error);
    }
  }
  
  /**
   * Aggiorna i flupsy nella cache
   */
  async updateFlupsys() {
    console.time('cache-flupsys-update');
    
    try {
      // Query ottimizzata per ottenere tutti i flupsy
      const flupsysQuery = await this.db.select().from(schema.flupsys);
      
      // Salva nella cache
      this.cache.flupsys = flupsysQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.flupsys = Date.now();
      
      console.timeEnd('cache-flupsys-update');
      console.log(`Cache flupsy aggiornata: ${flupsysQuery.length} flupsy caricati`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei flupsy:', error);
    }
  }
  
  /**
   * Aggiorna i cicli nella cache
   */
  async updateCycles() {
    console.time('cache-cycles-update');
    
    try {
      // Query ottimizzata per ottenere tutti i cicli
      const cyclesQuery = await this.db.select().from(schema.cycles);
      
      // Salva nella cache
      this.cache.cycles = cyclesQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.cycles = Date.now();
      
      console.timeEnd('cache-cycles-update');
      console.log(`Cache cicli aggiornata: ${cyclesQuery.length} cicli caricati`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dei cicli:', error);
    }
  }
  
  /**
   * Aggiorna le taglie nella cache
   */
  async updateSizes() {
    console.time('cache-sizes-update');
    
    try {
      // Query ottimizzata per ottenere tutte le taglie
      const sizesQuery = await this.db.select().from(schema.sizes);
      
      // Salva nella cache
      this.cache.sizes = sizesQuery;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.sizes = Date.now();
      
      console.timeEnd('cache-sizes-update');
      console.log(`Cache taglie aggiornata: ${sizesQuery.length} taglie caricate`);
    } catch (error) {
      console.error('Errore nell\'aggiornamento delle taglie:', error);
    }
  }
  
  /**
   * Aggiorna i dati della dashboard nella cache
   */
  async updateDashboard() {
    console.time('cache-dashboard-update');
    
    try {
      // Calcola i dati della dashboard usando i dati già in cache quando possibile
      const dashboard = {
        summary: {
          totalLots: this.cache.lots ? this.cache.lots.length : 0,
          totalBaskets: this.cache.baskets ? this.cache.baskets.length : 0,
          totalOperations: this.cache.operations ? this.cache.operations.length : 0,
          animalCount: this.cache.lotStatistics ? this.cache.lotStatistics.counts.totale : 0
        },
        charts: []
      };
      
      // Salva nella cache
      this.cache.dashboard = dashboard;
      
      // Aggiorna il timestamp dell'ultimo aggiornamento
      this.cache.lastUpdate.dashboard = Date.now();
      
      console.timeEnd('cache-dashboard-update');
      console.log('Cache dashboard aggiornata');
    } catch (error) {
      console.error('Errore nell\'aggiornamento della dashboard:', error);
    }
  }
  
  /**
   * Forza l'aggiornamento di tutti i dati nella cache
   */
  async forceUpdate() {
    console.log('Forzando aggiornamento di tutti i dati nella cache globale...');
    
    // Aggiorna tutte le entità
    await Promise.all([
      this.updateLotStatistics(),
      this.updateLots(),
      this.updateOperations(),
      this.updateBaskets(),
      this.updateFlupsys(),
      this.updateCycles(),
      this.updateSizes(),
      this.updateDashboard()
    ]);
    
    console.log('Aggiornamento forzato completato');
  }
  
  /**
   * Ottiene le statistiche dei lotti dalla cache
   */
  getLotStatistics() {
    // Se i dati non sono ancora stati caricati, restituisci un oggetto vuoto
    if (!this.cache.lotStatistics) {
      return {
        totalCount: 0,
        counts: { normali: 0, teste: 0, code: 0, totale: 0 },
        percentages: { normali: 0, teste: 0, code: 0 }
      };
    }
    
    return this.cache.lotStatistics;
  }
  
  /**
   * Ottiene i lotti dalla cache
   */
  getLots() {
    return this.cache.lots || [];
  }
  
  /**
   * Ottiene le operazioni dalla cache
   */
  getOperations() {
    return this.cache.operations || [];
  }
  
  /**
   * Ottiene i cestelli dalla cache
   */
  getBaskets() {
    return this.cache.baskets || [];
  }
  
  /**
   * Ottiene i flupsy dalla cache
   */
  getFlupsys() {
    return this.cache.flupsys || [];
  }
  
  /**
   * Ottiene i cicli dalla cache
   */
  getCycles() {
    return this.cache.cycles || [];
  }
  
  /**
   * Ottiene le taglie dalla cache
   */
  getSizes() {
    return this.cache.sizes || [];
  }
  
  /**
   * Ottiene i dati della dashboard dalla cache
   */
  getDashboard() {
    return this.cache.dashboard || { summary: {}, charts: [] };
  }
  
  /**
   * Aggiunge un utente al registro degli utenti connessi
   */
  addUser(userId) {
    this.connectedUsers.add(userId);
    console.log(`Utente ${userId} connesso. Utenti totali: ${this.connectedUsers.size}`);
  }
  
  /**
   * Rimuove un utente dal registro degli utenti connessi
   */
  removeUser(userId) {
    this.connectedUsers.delete(userId);
    console.log(`Utente ${userId} disconnesso. Utenti totali: ${this.connectedUsers.size}`);
    
    // Se non ci sono più utenti connessi, disabilita l'aggiornamento automatico
    if (this.connectedUsers.size === 0) {
      this.autoUpdateEnabled = false;
      console.log('Nessun utente connesso, aggiornamento automatico disabilitato');
    } else {
      this.autoUpdateEnabled = true;
    }
  }
  
  /**
   * Ottiene informazioni sullo stato attuale della cache
   */
  getCacheStatus() {
    return {
      connectedUsers: this.connectedUsers.size,
      autoUpdateEnabled: this.autoUpdateEnabled,
      lastUpdates: this.cache.lastUpdate,
      updateIntervals: this.cache.updateInterval
    };
  }
}

export default GlobalDataCache;