/**
 * Script per configurare e applicare gli indici strategici al database
 * 
 * Questo script viene eseguito all'avvio dell'applicazione per assicurarsi
 * che tutti gli indici necessari siano presenti nel database.
 */

import { sql } from 'drizzle-orm';
import { db } from './db.js';
import { CacheService } from './cache-service.js';

/**
 * Applica gli indici strategici al database
 */
export async function setupDatabaseIndexes() {
  try {
    console.log('Configurazione indici strategici per migliorare le prestazioni...');
    
    // Indice per migliorare le query che filtrano per flupsyId sulla tabella baskets
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_id ON baskets(flupsy_id)`);
    
    // Indice per migliorare le query che filtrano baskets per stato
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_baskets_state ON baskets(state)`);
    
    // Indice composto per ottimizzare le query che cercano posizioni occupate in un FLUPSY
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_position ON baskets(flupsy_id, row, position)`);
    
    // Indice per migliorare le query che filtrano i FLUPSY attivi
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_flupsys_active ON flupsys(active)`);
    
    // Indice per cestelli con posizione non nulla (miglioramento query posizioni)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_baskets_position_not_null ON baskets(flupsy_id, row, position) WHERE position IS NOT NULL`);
    
    console.log('Indici strategici configurati con successo!');
    return true;
  } catch (error) {
    console.error('Errore durante la configurazione degli indici:', error);
    return false;
  }
}

/**
 * Configura i listener per l'invalidazione della cache quando le entità correlate cambiano
 * @param {Object} app - L'istanza Express
 */
export function setupCacheInvalidation(app) {
  // Verifica se l'oggetto app ha il metodo on
  if (!app || typeof app.on !== 'function') {
    console.warn('Impossibile configurare l\'invalidazione della cache: app non valida');
    return;
  }
  
  // Listener per invalidare la cache delle posizioni FLUPSY quando un cestello viene aggiunto/rimosso/spostato
  app.on('basket_created', () => {
    console.log('Evento basket_created: invalidazione cache posizioni FLUPSY');
    CacheService.deleteByPrefix('flupsy_available_positions_');
  });
  
  app.on('basket_updated', () => {
    console.log('Evento basket_updated: invalidazione cache posizioni FLUPSY');
    CacheService.deleteByPrefix('flupsy_available_positions_');
  });
  
  app.on('basket_deleted', () => {
    console.log('Evento basket_deleted: invalidazione cache posizioni FLUPSY');
    CacheService.deleteByPrefix('flupsy_available_positions_');
  });
  
  app.on('basket_moved', () => {
    console.log('Evento basket_moved: invalidazione cache posizioni FLUPSY');
    CacheService.deleteByPrefix('flupsy_available_positions_');
  });
  
  // Invalidazione cache posizioni quando un FLUPSY viene modificato
  app.on('flupsy_updated', () => {
    console.log('Evento flupsy_updated: invalidazione cache posizioni FLUPSY');
    CacheService.deleteByPrefix('flupsy_available_positions_');
  });
  
  console.log('Sistema di invalidazione cache configurato con successo');
}

/**
 * Inizializza il monitoraggio delle prestazioni delle API
 * @param {Object} app - L'istanza Express
 */
export function setupPerformanceMonitoring(app) {
  // Middleware per monitorare le prestazioni delle API
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Quando la risposta è completata
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Registra solo le richieste che impiegano più di 1 secondo
      if (duration > 1000) {
        console.log(`[SLOW API] ${req.method} ${req.originalUrl} - ${duration}ms`);
        
        // Se è molto lenta (> 5 secondi), log più dettagliato
        if (duration > 5000) {
          console.warn(`[CRITICAL PERFORMANCE] ${req.method} ${req.originalUrl} - ${duration}ms - Questo endpoint richiede ottimizzazione!`);
        }
      }
    });
    
    next();
  });
  
  console.log('Sistema di monitoraggio prestazioni API configurato');
}

// Esporta una funzione di setup generale
export async function setupPerformanceOptimizations(app) {
  // Configurazione indici
  await setupDatabaseIndexes();
  
  // Importa e configura gli indici per le operazioni
  try {
    const { setupOperationsIndexes, setupOperationsCacheInvalidation } = await import('./controllers/operations-controller.js');
    await setupOperationsIndexes();
    
    // Configurazione invalidazione cache per operazioni
    if (app) {
      setupOperationsCacheInvalidation(app);
      console.log('Configurazione cache e indici per le operazioni completata');
    }
  } catch (error) {
    console.error('Errore durante la configurazione delle ottimizzazioni per operazioni:', error);
  }
  
  // Importa e configura gli indici per i cestelli
  try {
    const { setupBasketsIndexes, setupBasketsCacheInvalidation } = await import('./controllers/baskets-controller.js');
    await setupBasketsIndexes();
    
    // Configurazione invalidazione cache per cestelli
    if (app) {
      setupBasketsCacheInvalidation(app);
      console.log('Configurazione cache e indici per i cestelli completata');
    }
  } catch (error) {
    console.error('Errore durante la configurazione delle ottimizzazioni per cestelli:', error);
  }
  
  // Configurazione invalidazione cache
  if (app) {
    setupCacheInvalidation(app);
    setupPerformanceMonitoring(app);
  }
}