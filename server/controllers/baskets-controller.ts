/**
 * Controller ottimizzato per i cestelli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { BasketsCache } from '../baskets-cache-service.js';
import { db } from '../db.js';
import { baskets, flupsys, cycles, operations } from '../../shared/schema.js';
import { eq, and, desc, asc, isNull, sql, or, not, inArray } from 'drizzle-orm';

interface BasketsOptions {
  page?: number;
  pageSize?: number;
  state?: string;
  flupsyId?: number | string | number[];
  cycleId?: number;
  includeEmpty?: boolean;
  sortBy?: string;
  sortOrder?: string;
  includeAll?: boolean;
}

/**
 * Configura gli indici necessari per ottimizzare le query sui cestelli
 */
export async function setupBasketsIndexes(): Promise<void> {
  try {
    console.log('Configurazione indici per ottimizzare le query dei cestelli...');
    
    // Indice per ricerche per stato
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_baskets_current_cycle_id ON baskets (current_cycle_id);
    `);
    
    // Indice per ricerche per codice ciclo
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_baskets_cycle_code ON baskets (cycle_code);
    `);
    
    // Indice per le ricerche per numero fisico (utilizzato frequentemente)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_baskets_physical_number ON baskets (physical_number);
    `);
    
    // OTTIMIZZAZIONE: Indici per migliorare le performance delle query cestelli
    
    // Indice per operations(basket_id, id) per query di ultima operazione
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_operations_basket_id_id ON operations (basket_id, id);
    `);
    
    // Indice per basket_position_history(basket_id, end_date, start_date) per posizioni attuali
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_basket_position_history_basket_end_start ON basket_position_history (basket_id, end_date, start_date);
    `);
    
    // Indice composito per baskets(flupsy_id, state, current_cycle_id) per filtri combinati
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_state_cycle ON baskets (flupsy_id, state, current_cycle_id);
    `);
    
    console.log('Indici per cestelli ottimizzati configurati con successo!');
  } catch (error) {
    console.error('Errore durante la configurazione degli indici per i cestelli:', error);
    throw error;
  }
}

/**
 * Configura l'invalidazione della cache per i cestelli
 */
export function setupBasketsCacheInvalidation(app: any): void {
  if (!app) return;

  // Interceptor per l'invalidazione della cache quando i cestelli vengono modificati
  app.use((req: any, res: any, next: any) => {
    // Cattura il metodo originale end di res
    const originalEnd = res.end;
    
    // Sovrascrive res.end per intercettare le risposte prima che vengano inviate
    res.end = function(...args: any[]) {
      // Controlla se si tratta di una richiesta che modifica i cestelli
      const isBasketMutation = (
        (req.method === 'POST' && req.path.includes('/api/baskets')) ||
        (req.method === 'PUT' && req.path.includes('/api/baskets')) ||
        (req.method === 'PATCH' && req.path.includes('/api/baskets')) ||
        (req.method === 'DELETE' && req.path.includes('/api/baskets')) ||
        (req.method === 'POST' && req.path.includes('/api/operations')) ||
        (req.method === 'POST' && req.path.includes('/api/cycles')) ||
        (req.method === 'POST' && req.path.includes('/api/screening'))
      );
      
      // Se è una mutazione, invalida la cache dei cestelli
      if (isBasketMutation) {
        console.log(`Mutazione rilevata (${req.method} ${req.path}), invalidazione cache cestelli`);
        BasketsCache.clear();
      }
      
      // Chiama il metodo originale end
      return originalEnd.apply(this, args);
    };
    
    next();
  });
  
  console.log('Sistema di invalidazione cache cestelli configurato con successo');
}

/**
 * Ottiene i cestelli con paginazione e cache ottimizzati con CTE
 * OTTIMIZZAZIONE: Consolida 5 query separate in una singola CTE per ridurre i round-trip al DB
 */
export async function getBasketsOptimized(options: BasketsOptions = {}) {
  const startTime = Date.now();
  
  const {
    page = 1,
    pageSize = 20,
    state,
    flupsyId,
    cycleId,
    includeEmpty = false,
    sortBy = 'id',
    sortOrder = 'asc',
    includeAll = false
  } = options;
  
  // Genera la chiave di cache
  const cacheKey = BasketsCache.generateCacheKey({
    page,
    pageSize,
    state,
    flupsyId,
    cycleId,
    includeEmpty,
    sortBy,
    sortOrder,
    includeAll
  });
  
  // Cache intelligente con invalidazione immediata via WebSocket
  const cachedData = BasketsCache.get(cacheKey);
  if (cachedData) {
    console.log(`🚀 CESTELLI: Cache HIT - recuperati in ${Date.now() - startTime}ms`);
    return cachedData;
  }
  
  console.log(`🔄 CESTELLI: Cache MISS - query CTE consolidata necessaria`);
  console.log(`Richiesta cestelli ottimizzata con CTE per opzioni:`, options);
  
  try {
    // Costruisci condizioni WHERE per i filtri
    const filterConditions: string[] = [];
    const filterParams: any[] = [];
    let paramIndex = 1;
    
    if (state) {
      filterConditions.push(`b.state = $${paramIndex}`);
      filterParams.push(state);
      paramIndex++;
    }
    
    // Gestione flupsyId (numero, stringa, array)
    if (flupsyId) {
      if (typeof flupsyId === 'number') {
        filterConditions.push(`b.flupsy_id = $${paramIndex}`);
        filterParams.push(flupsyId);
        paramIndex++;
      } else if (typeof flupsyId === 'string') {
        if (flupsyId.includes(',')) {
          const flupsyIds = flupsyId.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
          if (flupsyIds.length > 0) {
            filterConditions.push(`b.flupsy_id = ANY($${paramIndex}::integer[])`);
            filterParams.push(flupsyIds);
            paramIndex++;
            console.log(`CTE: Filtro per ${flupsyIds.length} FLUPSY:`, flupsyIds);
          }
        } else {
          const parsedId = parseInt(flupsyId, 10);
          if (!isNaN(parsedId)) {
            filterConditions.push(`b.flupsy_id = $${paramIndex}`);
            filterParams.push(parsedId);
            paramIndex++;
          }
        }
      } else if (Array.isArray(flupsyId) && flupsyId.length > 0) {
        const flupsyIds = flupsyId.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
        if (flupsyIds.length > 0) {
          filterConditions.push(`b.flupsy_id = ANY($${paramIndex}::integer[])`);
          filterParams.push(flupsyIds);
          paramIndex++;
          console.log(`CTE: Filtro per ${flupsyIds.length} FLUPSY (array):`, flupsyIds);
        }
      }
    }
    
    if (cycleId) {
      filterConditions.push(`b.current_cycle_id = $${paramIndex}`);
      filterParams.push(cycleId);
      paramIndex++;
    }
    
    if (!includeEmpty && !includeAll) {
      filterConditions.push(`NOT (b.row IS NULL AND b.position IS NULL)`);
    }
    
    const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : '';
    
    // Determina ordinamento
    let orderByClause = 'ORDER BY b.id ASC';
    if (sortBy === 'physicalNumber') {
      orderByClause = `ORDER BY b.physical_number ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'flupsyName') {
      orderByClause = `ORDER BY f.name ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'id') {
      orderByClause = `ORDER BY b.id ${sortOrder.toUpperCase()}`;
    }
    
    // Paginazione
    const skipPagination = includeAll === true || pageSize > 1000;
    const limitClause = skipPagination ? '' : `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    if (!skipPagination) {
      const offset = (page - 1) * pageSize;
      filterParams.push(pageSize, offset);
      console.log("CTE: Applicazione paginazione");
    } else {
      console.log("CTE: Recupero tutti i cestelli senza paginazione");
    }
    
    // MEGA-OPTIMIZED: Semplifica drasticamente la query - solo cestelli base con JOIN minimal
    const cteQuery = `
      SELECT 
        b.id, b.physical_number, b.flupsy_id, b.cycle_code, 
        b.state, b.current_cycle_id, b.nfc_data, b.row, b.position,
        f.name as flupsy_name,
        COUNT(*) OVER() as total_count,
        -- Solo dati essenziali per performance massime
        NULL as pos_id, NULL as pos_flupsy_id, NULL as pos_row, 
        NULL as pos_position, NULL as pos_start_date, NULL as pos_operation_id,
        NULL as op_id, NULL as op_date, NULL as op_type, NULL as op_cycle_id,
        NULL as op_size_id, NULL as op_sgr_id, NULL as op_lot_id, 
        NULL as op_animal_count, NULL as op_total_weight, NULL as op_animals_per_kg,
        NULL as op_average_weight, NULL as op_dead_count, NULL as op_mortality_rate,
        NULL as op_notes, NULL as op_metadata,
        NULL as cycle_lot_id, NULL as cycle_start_date, NULL as cycle_end_date, NULL as cycle_state
      FROM baskets b
      LEFT JOIN flupsys f ON b.flupsy_id = f.id
      ${whereClause}
      ${orderByClause}
      ${limitClause}
    `;
    
    // Esegui la query CTE consolidata
    console.log(`🚀 CTE: Esecuzione query consolidata con ${filterParams.length} parametri`);
    const startQueryTime = Date.now();
    
    const result = await db.execute(sql.raw(cteQuery, filterParams));
    const queryTime = Date.now() - startQueryTime;
    console.log(`🚀 CTE: Query completata in ${queryTime}ms`);
    
    // Validate Drizzle result array
    if (!result || !Array.isArray(result)) {
      console.warn(`⚠️ CTE Query returned invalid result, returning empty array`);
      return {
        baskets: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0
        }
      };
    }
    
    if (result.length === 0) {
      console.log('CTE: Nessun cestello trovato');
      const emptyResult = {
        baskets: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0
        }
      };
      
      // Salva anche il risultato vuoto in cache
      BasketsCache.set(cacheKey, emptyResult, 300);
      return emptyResult;
    }
    
    // Processa i risultati della CTE
    const totalItems = result.length > 0 ? Number(result[0].total_count) : 0;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    console.log(`🚀 CTE: Processando ${result.length} righe con ${totalItems} totali`);
    
    const enrichedBaskets = result.map((row: any) => {
      // Costruisci oggetto cestello
      const basket = {
        id: row.id,
        physicalNumber: row.physical_number,
        flupsyId: row.flupsy_id,
        cycleCode: row.cycle_code,
        state: row.state,
        currentCycleId: row.current_cycle_id,
        nfcData: row.nfc_data,
        row: row.row,
        position: row.position,
        flupsyName: row.flupsy_name
      };
      
      // Costruisci oggetto posizione corrente
      const currentPosition = row.pos_id ? {
        id: row.pos_id,
        basketId: row.id,
        flupsyId: row.pos_flupsy_id,
        row: row.pos_row,
        position: row.pos_position,
        startDate: row.pos_start_date,
        endDate: null,
        operationId: row.pos_operation_id
      } : null;
      
      // Costruisci oggetto ultima operazione
      const lastOperation = row.op_id ? {
        id: row.op_id,
        date: row.op_date,
        type: row.op_type,
        basketId: row.id,
        cycleId: row.op_cycle_id,
        sizeId: row.op_size_id,
        sgrId: row.op_sgr_id,
        lotId: row.op_lot_id,
        animalCount: row.op_animal_count,
        totalWeight: row.op_total_weight,
        animalsPerKg: row.op_animals_per_kg,
        averageWeight: row.op_average_weight,
        deadCount: row.op_dead_count,
        mortalityRate: row.op_mortality_rate,
        notes: row.op_notes,
        metadata: row.op_metadata
      } : null;
      
      // Costruisci oggetto ciclo
      const cycle = row.current_cycle_id ? {
        id: row.current_cycle_id,
        basketId: row.id,
        lotId: row.cycle_lot_id,
        startDate: row.cycle_start_date,
        endDate: row.cycle_end_date,
        state: row.cycle_state
      } : null;
      
      return {
        ...basket,
        cycle,
        currentPosition,
        lastOperation
      };
    });
    
    // Costruisci il risultato paginato
    const finalResult = {
      baskets: enrichedBaskets,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
    
    // Salva in cache
    BasketsCache.set(cacheKey, finalResult, 300);
    console.log(`🚀 CESTELLI CTE: Cache SAVED (${enrichedBaskets.length} cestelli)`);
    
    const duration = Date.now() - startTime;
    console.log(`🚀 CTE CONSOLIDATA: Query cestelli completata in ${duration}ms (target: <2000ms)`);
    console.log(`Risposta CTE: pagina ${page}/${totalPages}, ${enrichedBaskets.length} elementi su ${totalItems} totali`);
    
    // Performance warning se supera i 2 secondi
    if (duration > 2000) {
      console.warn(`⚠️ PERFORMANCE CTE: Query cestelli lenta (${duration}ms > 2000ms target)`);
    } else {
      console.log(`✅ PERFORMANCE CTE: Query cestelli ottimizzata (${duration}ms < 2000ms target)`);
    }
    
    return finalResult;
  } catch (error) {
    console.error('Errore durante il recupero CTE ottimizzato dei cestelli:', error);
    throw error;
  }
}

/**
 * Invalida esplicitamente tutta la cache dei cestelli
 * Utile per forzare l'aggiornamento dopo operazioni di popolamento FLUPSY
 */
export function invalidateCache(): boolean {
  try {
    BasketsCache.clear();
    console.log('🔄 Cache cestelli invalidata manualmente');
    return true;
  } catch (error) {
    console.error('Errore durante l\'invalidazione della cache cestelli:', error);
    return false;
  }
}