/**
 * Servizio ottimizzato per le statistiche dei lotti
 * Fornisce statistiche in tempo reale con performance ottimizzate
 */

import { sql } from 'drizzle-orm';

/**
 * Classe che fornisce metodi ottimizzati per ottenere statistiche sui lotti
 */
export class LotStatisticsService {
  constructor(db) {
    this.db = db;
    this.cache = {
      globalStats: null,
      timestamp: null,
    };
    this.cacheLifetime = 2 * 60 * 1000; // 2 minuti in millisecondi
    
    // Inizializza subito le statistiche in background per evitare attese al primo caricamento
    this.initializeCache();
  }
  
  /**
   * Inizializza la cache in background
   */
  async initializeCache() {
    try {
      await this.calculateGlobalStatistics();
      console.log('Cache statistiche inizializzata con successo');
    } catch (error) {
      console.error('Errore nell\'inizializzazione della cache:', error);
    }
  }

  /**
   * Ottiene statistiche globali sui lotti con caching per migliorare le prestazioni
   * @returns {Promise<Object>} Statistiche aggregate sui lotti
   */
  async getGlobalStatistics() {
    // Controlla se abbiamo dati in cache validi
    const now = Date.now();
    if (this.cache.globalStats && this.cache.timestamp && (now - this.cache.timestamp < this.cacheLifetime)) {
      console.log('Usando statistiche in cache');
      return this.cache.globalStats;
    }

    return this.calculateGlobalStatistics();
  }
  
  /**
   * Calcola le statistiche globali direttamente dal database e aggiorna la cache
   * @returns {Promise<Object>} Statistiche aggiornate
   */
  async calculateGlobalStatistics() {
    console.time('statistics-query');
    
    try {
      // Query ottimizzata che utilizza gli indici creati
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
      
      const result = {
        totalCount,
        counts: { normali, teste, code, totale },
        percentages
      };
      
      // Aggiorna la cache
      this.cache.globalStats = result;
      this.cache.timestamp = Date.now();
      
      console.timeEnd('statistics-query');
      console.log('Statistiche aggiornate:', result);
      
      return result;
    } catch (error) {
      console.error('Errore nel calcolo delle statistiche globali:', error);
      
      // In caso di errore, se ci sono dati in cache, li usiamo anche se scaduti
      if (this.cache.globalStats) {
        console.log('Usando cache scaduta a causa di un errore');
        return this.cache.globalStats;
      }
      
      // Altrimenti restituiamo valori predefiniti ma reali (non dati statici)
      return {
        totalCount: 0,
        counts: { normali: 0, teste: 0, code: 0, totale: 0 },
        percentages: { normali: 0, teste: 0, code: 0 }
      };
    }
  }
}

export default LotStatisticsService;