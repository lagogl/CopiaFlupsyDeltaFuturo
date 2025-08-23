/**
 * Controller unificato per la pagina Operations
 * Combina tutte le query necessarie in una singola chiamata API ottimizzata
 */

import { Request, Response } from 'express';
import { db } from '../db.js';
import { operations, baskets, cycles, lots, sizes, flupsys, sgr } from '../../shared/schema.js';
import { sql, eq, and, or, between, desc, inArray } from 'drizzle-orm';

interface UnifiedCache {
  data: any;
  timestamp: number | null;
  ttl: number;
}

let unifiedCache: UnifiedCache = {
  data: null,
  timestamp: null,
  ttl: 300000, // 5 minuti - cache più lunga per ridurre carico
};

// Cache ripristinata dopo fix problema peso operations
console.log('✅ Cache unificata ripristinata con TTL 30s dopo aver risolto il problema peso operations');
unifiedCache.data = null;
unifiedCache.timestamp = null;

export async function getOperationsUnified(req: Request, res: Response) {
  try {
    console.log('🚀 OPERAZIONI UNIFICATE: Richiesta ricevuta');
    
    // Controlla cache
    const now = Date.now();
    if (unifiedCache.data && unifiedCache.timestamp && (now - unifiedCache.timestamp) < unifiedCache.ttl) {
      console.log('✅ CACHE HIT: Dati recuperati dalla cache');
      return res.json({
        success: true,
        data: unifiedCache.data,
        fromCache: true,
        cacheAge: now - unifiedCache.timestamp
      });
    }

    console.log('🔄 CACHE MISS: Eseguendo query unificata...');
    const startTime = Date.now();

    // SEMPLIFICATO: solo query essenziali, nessun filtro complesso
    const [
      operationsData,
      basketsData,
      cyclesData,
      flupsysData,
      sizesData,
      lotsData,
      sgrData
    ] = await Promise.all([
      // Operations query - solo ordinamento semplice
      db.select().from(operations).orderBy(desc(operations.date)),
      
      // Baskets query - query semplice
      db.select().from(baskets),
      
      // Cycles query - query semplice
      db.select().from(cycles),
      
      // Flupsys query - query semplice
      db.select().from(flupsys),
      
      // Sizes query - query semplice
      db.select().from(sizes),
      
      // Lots query - query semplice  
      db.select().from(lots),
      
      // SGR query - query semplice
      db.select().from(sgr)
    ]);

    const queryTime = Date.now() - startTime;
    console.log(`✅ Query unificate completate in ${queryTime}ms`);

    // Prepare unified response
    const unifiedData = {
      operations: operationsData,
      baskets: basketsData,
      cycles: cyclesData,
      flupsys: flupsysData,
      sizes: sizesData,
      lots: lotsData,
      sgr: sgrData,
      pagination: {
        totalOperations: operationsData.length,
        totalBaskets: basketsData.length,
        totalCycles: cyclesData.length
      },
      queryTime
    };

    // Cache the results
    unifiedCache = {
      data: unifiedData,
      timestamp: now,
      ttl: 30000
    };

    console.log(`🚀 UNIFIED: Dati salvati in cache - ${operationsData.length} operazioni, ${basketsData.length} cestelli`);

    res.json({
      success: true,
      data: unifiedData,
      fromCache: false,
      queryTime
    });

  } catch (error: any) {
    console.error('❌ Errore nella query unificata:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Errore interno del server'
    });
  }
}

export function invalidateUnifiedCache() {
  unifiedCache = {
    data: null,
    timestamp: null,
    ttl: 30000
  };
  console.log('🗑️ Cache unificata invalidata');
}