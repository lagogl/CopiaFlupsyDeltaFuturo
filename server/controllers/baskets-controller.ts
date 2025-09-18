/**
 * Controller ottimizzato per i cestelli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { BasketsCache } from '../baskets-cache-service.js';
import { db } from '../db.js';
import { baskets, flupsys, cycles, basketPositionHistory, operations } from '../../shared/schema.js';
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
 * Ottiene i cestelli con paginazione e cache
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
  
  console.log(`🔄 CESTELLI: Cache MISS - query database necessaria`);
  
  console.log(`Richiesta cestelli ottimizzata con opzioni:`, options);
  
  try {
    // Costruisci la query base con join strategici
    let query = db.select({
      id: baskets.id,
      physicalNumber: baskets.physicalNumber,
      flupsyId: baskets.flupsyId,
      cycleCode: baskets.cycleCode,
      state: baskets.state,
      currentCycleId: baskets.currentCycleId,
      nfcData: baskets.nfcData,
      row: baskets.row,
      position: baskets.position,
      flupsyName: flupsys.name
    })
    .from(baskets)
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id));
    
    // Applica i filtri
    const whereConditions: any[] = [];
    
    if (state) {
      whereConditions.push(eq(baskets.state, state));
    }
    
    // Per la visualizzazione nei FLUPSY, il flupsyId è un parametro critico
    // e deve essere gestito con attenzione per garantire che tutti i cestelli vengano mostrati
    if (flupsyId) {
      // Quando flupsyId è un numero, cerchiamo quel FLUPSY specifico
      if (typeof flupsyId === 'number') {
        whereConditions.push(eq(baskets.flupsyId, flupsyId));
      } 
      // Se flupsyId è una stringa, potrebbe essere un singolo ID o una lista di ID separati da virgola
      else if (typeof flupsyId === 'string') {
        // Verifica se contiene virgole (formato: "id1,id2,id3")
        if (flupsyId.includes(',')) {
          // Split string e converti in array di numeri
          const flupsyIds = flupsyId.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
          
          // OTTIMIZZAZIONE: Usa inArray per migliori performance con molti ID
          console.log(`Ricerca cestelli per ${flupsyIds.length} FLUPSY`);
          
          if (flupsyIds.length > 0) {
            whereConditions.push(inArray(baskets.flupsyId, flupsyIds));
            console.log(`Query ottimizzata con inArray per ${flupsyIds.length} FLUPSY:`, flupsyIds);
          }
        } else {
          // Singolo ID come stringa
          const parsedId = parseInt(flupsyId, 10);
          if (!isNaN(parsedId)) {
            whereConditions.push(eq(baskets.flupsyId, parsedId));
          }
        }
      }
      // Se flupsyId è un array, cerchiamo tutti i cestelli in quei FLUPSY
      else if (Array.isArray(flupsyId) && flupsyId.length > 0) {
        // Converte ogni elemento in numero (potrebbero arrivare come stringhe)
        const flupsyIds = flupsyId.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
        
        // OTTIMIZZAZIONE: Usa inArray per migliori performance con molti ID
        console.log(`Ricerca cestelli per ${flupsyIds.length} FLUPSY (array)`);
        
        if (flupsyIds.length > 0) {
          whereConditions.push(inArray(baskets.flupsyId, flupsyIds));
          console.log(`Query ottimizzata con inArray per ${flupsyIds.length} FLUPSY (array):`, flupsyIds);
        }
      }
    }
    
    if (cycleId) {
      whereConditions.push(eq(baskets.currentCycleId, cycleId));
    }
    
    // Non filtriamo i cestelli senza posizione quando includeAll=true
    // perché è importante per la dashboard vedere tutti i cestelli
    if (!includeEmpty && !includeAll) {
      // Escludi i cestelli senza posizione assegnata
      whereConditions.push(not(and(
        isNull(baskets.row),
        isNull(baskets.position)
      )));
    }
    
    // Applica i filtri alla query
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // OTTIMIZZAZIONE: Conta il totale senza JOIN per permettere index-only scans
    // Rimuoviamo il LEFT JOIN con flupsys per migliori performance
    const countQuery = db.select({
      count: sql`count(*)`
    })
    .from(baskets)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    const [countResult] = await countQuery;
    const totalItems = Number(countResult.count);
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Ordina i risultati
    if (sortBy === 'physicalNumber') {
      query = query.orderBy(sortOrder === 'asc' ? asc(baskets.physicalNumber) : desc(baskets.physicalNumber));
    } else if (sortBy === 'flupsyName') {
      query = query.orderBy(sortOrder === 'asc' ? asc(flupsys.name) : desc(flupsys.name));
    } else {
      // Default: ordina per ID
      query = query.orderBy(sortOrder === 'asc' ? asc(baskets.id) : desc(baskets.id));
    }
    
    // Applica paginazione, a meno che non sia richiesto di recuperare tutti i dati
    // Il parametro includeAll viene usato principalmente dalla dashboard e dal visualizzatore FLUPSY
    const skipPagination = options.includeAll === true || pageSize > 1000;
    
    if (!skipPagination) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    } else {
      console.log("Recupero tutti i cestelli senza paginazione (richiesto da dashboard o visualizzatore FLUPSY)");
    }
    
    // Esegui la query
    const basketsResult = await query;
    
    // Arricchisci i cestelli con dettagli aggiuntivi in modo efficiente
    // Recupera le informazioni sui cicli per tutti i cestelli in una singola query
    const cycleIds = basketsResult
      .map(basket => basket.currentCycleId)
      .filter(id => id !== null);
    
    let cyclesMap: any = {};
    if (cycleIds.length > 0) {
      // OTTIMIZZAZIONE: Usa query Drizzle sicura invece di interpolazione raw SQL
      const cyclesResult = await db.select({
        id: cycles.id,
        basket_id: cycles.basketId,
        start_date: cycles.startDate,
        end_date: cycles.endDate,
        state: cycles.state
      })
      .from(cycles)
      .where(inArray(cycles.id, cycleIds));
      
      cyclesMap = cyclesResult.reduce((map: any, cycle: any) => {
        // Converti i nomi delle colonne in camelCase per compatibilità
        const formattedCycle = {
          id: cycle.id,
          basketId: cycle.basket_id,
          startDate: cycle.start_date,
          endDate: cycle.end_date,
          state: cycle.state
        };
        map[formattedCycle.id] = formattedCycle;
        return map;
      }, {});
    }
    
    // Recupera le posizioni attuali dei cestelli in una singola query
    const basketIds = basketsResult.map(basket => basket.id);
    
    // Verifica che ci siano cestelli da cercare
    let positionsMap: any = {};
    if (basketIds.length > 0) {
      // OTTIMIZZAZIONE: Usa query Drizzle sicura invece di interpolazione raw SQL
      const positionsResult = await db.select({
        id: basketPositionHistory.id,
        basket_id: basketPositionHistory.basketId,
        flupsy_id: basketPositionHistory.flupsyId,
        row: basketPositionHistory.row,
        position: basketPositionHistory.position,
        start_date: basketPositionHistory.startDate,
        end_date: basketPositionHistory.endDate,
        operation_id: basketPositionHistory.operationId
      })
      .from(basketPositionHistory)
      .where(and(
        inArray(basketPositionHistory.basketId, basketIds),
        isNull(basketPositionHistory.endDate)
      ));
      
      // Quando usiamo db.execute, il risultato è un array di oggetti con proprietà in snake_case
      // dobbiamo convertire i nomi delle colonne da snake_case a camelCase
      positionsMap = positionsResult.reduce((map: any, pos: any) => {
        // Converti i nomi delle colonne in camelCase per compatibilità
        const position = {
          id: pos.id,
          basketId: pos.basket_id,
          flupsyId: pos.flupsy_id,
          row: pos.row,
          position: pos.position,
          startDate: pos.start_date,
          endDate: pos.end_date,
          operationId: pos.operation_id
        };
        map[position.basketId] = position;
        return map;
      }, {});
    }
    
    // Recupera l'ultima operazione per ogni cestello in una singola query
    let operationsMap: any = {};
    if (basketIds.length > 0) {
      // OTTIMIZZAZIONE: Usa query sicura con placeholder per evitare SQL injection
      const operationsResult = await db.execute(sql`
        SELECT DISTINCT ON (o.basket_id) 
          o.id, o.date, o.type, o.basket_id, o.cycle_id, o.size_id, o.sgr_id, o.lot_id,
          o.animal_count, o.total_weight, o.animals_per_kg, o.average_weight, 
          o.dead_count, o.mortality_rate, o.notes, o.metadata
        FROM operations o 
        WHERE o.basket_id = ANY(${basketIds})
        ORDER BY o.basket_id, o.id DESC
      `);
      
      const latestOperations = operationsResult;
      
      operationsMap = latestOperations.reduce((map: any, op: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        const operation = {
          id: op.id,
          date: op.date,
          type: op.type,
          basketId: op.basket_id,
          cycleId: op.cycle_id,
          sizeId: op.size_id,
          sgrId: op.sgr_id,
          lotId: op.lot_id,
          animalCount: op.animal_count,
          totalWeight: op.total_weight,
          animalsPerKg: op.animals_per_kg,
          averageWeight: op.average_weight,
          deadCount: op.dead_count,
          mortalityRate: op.mortality_rate,
          notes: op.notes,
          metadata: op.metadata
        };
        map[operation.basketId] = operation;
        return map;
      }, {});
    }

    // Combina tutti i dati
    const enrichedBaskets = basketsResult.map(basket => {
      const cycle = basket.currentCycleId ? cyclesMap[basket.currentCycleId] : null;
      const position = positionsMap[basket.id];
      const lastOperation = operationsMap[basket.id] || null;
      
      return {
        ...basket,
        cycle,
        currentPosition: position || null,
        lastOperation
      };
    });
    
    // Costruisci il risultato paginato
    const result = {
      baskets: enrichedBaskets,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
    
    // Salva in cache con TTL corto - invalidazione immediata via WebSocket
    BasketsCache.set(cacheKey, result, 300); // 5 minuti TTL (invalidazione via WebSocket)
    console.log(`🚀 CESTELLI: Cache SAVED (${enrichedBaskets.length} cestelli) - WebSocket sync attivo`)
    
    const duration = Date.now() - startTime;
    console.log(`Query cestelli completata in ${duration}ms: ${enrichedBaskets.length} risultati su ${totalItems} totali`);
    console.log(`Risposta API paginata: pagina ${page}/${totalPages}, ${enrichedBaskets.length} elementi su ${totalItems} totali`);
    
    return result;
  } catch (error) {
    console.error('Errore durante il recupero ottimizzato dei cestelli:', error);
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