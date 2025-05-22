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

class GlobalDataCache {
  constructor(db) {
    this.db = db;
    this.cache = {
      lotStatistics: null,
      lastUpdate: {
        lotStatistics: null
      },
      updateInterval: {
        lotStatistics: 5 * 60 * 1000 // 5 minuti in millisecondi
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
      
      // Carica le statistiche dei lotti
      await this.updateLotStatistics();
      
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
    
    // Controlla se le statistiche dei lotti devono essere aggiornate
    if (this.shouldUpdate('lotStatistics', now)) {
      await this.updateLotStatistics();
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
   * Forza l'aggiornamento di tutti i dati nella cache
   */
  async forceUpdate() {
    console.log('Forzando aggiornamento di tutti i dati nella cache globale...');
    
    // Aggiorna le statistiche dei lotti
    await this.updateLotStatistics();
    
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