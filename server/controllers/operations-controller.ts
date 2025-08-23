/**
 * Controller ottimizzato per le operazioni
 * 
 * Questo controller fornisce funzioni ottimizzate per la gestione delle operazioni,
 * con supporto per caching, query ottimizzate e indici.
 */

import { db } from '../db.js';
import { operations, baskets, flupsys, lots, sizes } from '../../shared/schema.js';
import { sql, eq, and, or, between, desc, inArray } from 'drizzle-orm';
import { OperationsCache } from '../operations-cache-service.js';

// Nomi delle colonne principali per la query ottimizzata - INCLUDE LOT DATA
const OPERATION_COLUMNS = {
  id: operations.id,
  date: operations.date,
  type: operations.type,
  basketId: operations.basketId,
  cycleId: operations.cycleId,
  sizeId: operations.sizeId,
  sgrId: operations.sgrId,
  lotId: operations.lotId,
  animalCount: operations.animalCount,
  totalWeight: operations.totalWeight,
  animalsPerKg: operations.animalsPerKg,
  averageWeight: operations.averageWeight,
  deadCount: operations.deadCount,
  mortalityRate: operations.mortalityRate,
  notes: operations.notes,
  metadata: operations.metadata,
  // 🔧 FIX: Aggiungi dati del lotto per visualizzazione
  lot: {
    id: lots.id,
    arrivalDate: lots.arrivalDate,
    supplier: lots.supplier,
    supplierLotNumber: lots.supplierLotNumber,
    quality: lots.quality,
    animalCount: lots.animalCount,
    weight: lots.weight,
    notes: lots.notes
  }
};

interface OperationsOptions {
  page?: number;
  pageSize?: number;
  cycleId?: number;
  basketId?: number;
  flupsyId?: number;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  type?: string;
}

/**
 * Crea indici sulle tabelle necessarie per ottimizzare le query delle operazioni
 */
export async function setupOperationsIndexes(): Promise<boolean> {
  try {
    console.log('Configurazione indici per ottimizzare le query delle operazioni...');
    
    // Indice sulla data delle operazioni per filtri temporali
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(date)`);
    
    // Indice sul tipo di operazione per filtrare per tipo
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type)`);
    
    // Indice per join con cestelli
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_operations_basket_id ON operations(basket_id)`);
    
    // Indice per join con cicli
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_operations_cycle_id ON operations(cycle_id)`);
    
    // Indice per join con lotti
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_operations_lot_id ON operations(lot_id)`);
    
    console.log('Indici per operazioni configurati con successo!');
    return true;
  } catch (error) {
    console.error('Errore durante la configurazione degli indici per le operazioni:', error);
    return false;
  }
}

/**
 * Ottiene le operazioni con paginazione, filtri e supporto per cache
 */
export async function getOperationsOptimized(options: OperationsOptions = {}) {
  const startTime = Date.now();
  console.log('Richiesta operazioni ottimizzata con opzioni:', options);
  
  // Valori predefiniti
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  // Converte date da string a oggetti Date se necessario
  const dateFrom = options.dateFrom instanceof Date ? options.dateFrom : 
                  options.dateFrom ? new Date(options.dateFrom) : null;
  
  const dateTo = options.dateTo instanceof Date ? options.dateTo : 
                options.dateTo ? new Date(options.dateTo) : null;
  
  // Genera chiave di cache
  const cacheKey = OperationsCache.generateCacheKey({
    page,
    pageSize,
    cycleId: options.cycleId,
    flupsyId: options.flupsyId,
    basketId: options.basketId,
    dateFrom: dateFrom?.toISOString().split('T')[0],
    dateTo: dateTo?.toISOString().split('T')[0],
    type: options.type
  });
  
  // Controlla se i risultati sono in cache
  const cachedResults = OperationsCache.get(cacheKey);
  if (cachedResults) {
    console.log(`Operazioni recuperate dalla cache in ${Date.now() - startTime}ms`);
    return cachedResults;
  }
  
  try {
    // Costruisci le condizioni di filtro
    const whereConditions: any[] = [];
    
    // Filtro per ID ciclo
    if (options.cycleId) {
      whereConditions.push(eq(operations.cycleId, options.cycleId));
    }
    
    // Filtro per ID cestello
    if (options.basketId) {
      whereConditions.push(eq(operations.basketId, options.basketId));
    }
    
    // Filtro per intervallo di date
    if (dateFrom && dateTo) {
      // Converte le date in stringhe per la query SQL (YYYY-MM-DD)
      const fromDateStr = dateFrom.toISOString().split('T')[0];
      const toDateStr = dateTo.toISOString().split('T')[0];
      whereConditions.push(between(operations.date, fromDateStr, toDateStr));
    } else if (dateFrom) {
      const fromDateStr = dateFrom.toISOString().split('T')[0];
      whereConditions.push(sql`${operations.date} >= ${fromDateStr}`);
    } else if (dateTo) {
      const toDateStr = dateTo.toISOString().split('T')[0];
      whereConditions.push(sql`${operations.date} <= ${toDateStr}`);
    }
    
    // Filtro per tipo di operazione
    if (options.type) {
      whereConditions.push(sql`${operations.type} = ${options.type}`);
    }
    
    // Se c'è un filtro per flupsyId, ottimizziamo la query con una subquery
    if (options.flupsyId) {
      // Ottimizzazione: utilizziamo una subquery per ottenere gli ID dei cestelli
      // invece di caricare tutti i cestelli in memoria
      const basketSubquery = db
        .select({ id: baskets.id })
        .from(baskets)
        .where(eq(baskets.flupsyId, options.flupsyId));
      
      const basketIds = await basketSubquery;
      
      if (basketIds.length > 0) {
        const ids = basketIds.map(b => b.id);
        whereConditions.push(inArray(operations.basketId, ids));
      } else {
        // Se non ci sono cestelli nel FLUPSY, restituiamo risultati vuoti
        console.log(`Nessun cestello trovato per flupsyId ${options.flupsyId}`);
        return { operations: [], totalCount: 0 };
      }
    }
    
    // Costruisci la condizione WHERE completa
    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined;
    
    // 1. Esegui query per conteggio con ottimizzazione
    const countQuery = db
      .select({ count: sql`count(*)`.as('count') })
      .from(operations);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const countResult = await countQuery;
    const totalCount = parseInt(countResult[0].count as string);
    
    // 2. Esegui query principale con paginazione - INCLUDE LOT JOIN
    let query = db
      .select(OPERATION_COLUMNS)
      .from(operations)
      .leftJoin(lots, eq(operations.lotId, lots.id))
      .orderBy(desc(operations.date))
      .limit(pageSize)
      .offset(offset);
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const results = await query;
    
    // Prepara risultato
    const response = {
      operations: results,
      totalCount
    };
    
    // Salva in cache
    OperationsCache.set(cacheKey, response);
    
    const duration = Date.now() - startTime;
    console.log(`Query operazioni completata in ${duration}ms: ${results.length} risultati su ${totalCount} totali`);
    
    // Registra metriche di performance
    if (duration > 1000) {
      console.log(`[PERFORMANCE] Query operazioni lenta: ${duration}ms`);
    }
    
    return response;
  } catch (error) {
    console.error('Errore durante la query ottimizzata delle operazioni:', error);
    return {
      operations: [],
      totalCount: 0
    };
  }
}

/**
 * Registra eventi che invalidano la cache delle operazioni
 */
export function setupOperationsCacheInvalidation(app: any): void {
  // Verifica se l'oggetto app è valido
  if (!app || typeof app.on !== 'function') {
    console.warn('Impossibile configurare l\'invalidazione della cache operazioni: app non valida');
    return;
  }
  
  // Invalidazione quando viene creata una nuova operazione
  app.on('operation_created', () => {
    console.log('Evento operation_created: invalidazione cache operazioni');
    OperationsCache.clear();
  });
  
  // Invalidazione quando un'operazione viene aggiornata
  app.on('operation_updated', () => {
    console.log('Evento operation_updated: invalidazione cache operazioni');
    OperationsCache.clear();
  });
  
  // Invalidazione quando un'operazione viene eliminata
  app.on('operation_deleted', () => {
    console.log('Evento operation_deleted: invalidazione cache operazioni');
    OperationsCache.clear();
  });
  
  console.log('Sistema di invalidazione cache operazioni configurato con successo');
}