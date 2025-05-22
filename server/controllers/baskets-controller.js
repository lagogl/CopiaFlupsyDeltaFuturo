/**
 * Controller ottimizzato per i cestelli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { BasketsCache } from '../baskets-cache-service.js';
import { db } from '../db.js';
import { baskets, flupsys, cycles, basketPositionHistory } from '../../shared/schema.js';
import { eq, and, desc, asc, isNull, sql, or, not } from 'drizzle-orm';

/**
 * Configura gli indici necessari per ottimizzare le query sui cestelli
 */
export async function setupBasketsIndexes() {
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
    
    console.log('Indici per cestelli configurati con successo!');
  } catch (error) {
    console.error('Errore durante la configurazione degli indici per i cestelli:', error);
    throw error;
  }
}

/**
 * Configura l'invalidazione della cache per i cestelli
 * @param {Object} app - L'istanza Express
 */
export function setupBasketsCacheInvalidation(app) {
  if (!app) return;

  // Interceptor per l'invalidazione della cache quando i cestelli vengono modificati
  app.use((req, res, next) => {
    // Cattura il metodo originale end di res
    const originalEnd = res.end;
    
    // Sovrascrive res.end per intercettare le risposte prima che vengano inviate
    res.end = function(...args) {
      // Controlla se si tratta di una richiesta che modifica i cestelli
      const isBasketMutation = (
        (req.method === 'POST' && req.path.includes('/api/baskets')) ||
        (req.method === 'PUT' && req.path.includes('/api/baskets')) ||
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
 * @param {Object} options - Opzioni di filtraggio e paginazione
 * @returns {Promise<Object>} - I cestelli filtrati e paginati
 */
export async function getBasketsOptimized(options = {}) {
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
  
  // Controlla se i dati sono in cache
  const cachedData = BasketsCache.get(cacheKey);
  if (cachedData) {
    console.log(`Cestelli recuperati dalla cache in ${Date.now() - startTime}ms`);
    return cachedData;
  }
  
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
    const whereConditions = [];
    
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
      // Se flupsyId è un array, cerchiamo tutti i cestelli in quei FLUPSY
      else if (Array.isArray(flupsyId) && flupsyId.length > 0) {
        const flupsyConditions = flupsyId.map(id => eq(baskets.flupsyId, id));
        whereConditions.push(or(...flupsyConditions));
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
    
    // Conta il totale dei record
    // Assicuriamoci che usiamo gli stessi filtri della query principale
    const countQuery = db.select({
      count: sql`count(*)`
    })
    .from(baskets)
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
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
    // Il parametro includeAll viene usato principalmente dalla dashboard
    const skipPagination = options.includeAll === true || pageSize > 1000;
    
    if (!skipPagination) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    } else {
      console.log("Recupero tutti i cestelli senza paginazione (richiesto da dashboard)");
    }
    
    // Esegui la query
    const basketsResult = await query;
    
    // Arricchisci i cestelli con dettagli aggiuntivi in modo efficiente
    // Recupera le informazioni sui cicli per tutti i cestelli in una singola query
    const cycleIds = basketsResult
      .map(basket => basket.currentCycleId)
      .filter(id => id !== null);
    
    let cyclesMap = {};
    if (cycleIds.length > 0) {
      // Usa una query SQL nativa con IN per migliorare le prestazioni
      const cyclesResult = await db.execute(sql`
        SELECT * FROM cycles WHERE id IN ${cycleIds}
      `);
      
      cyclesMap = cyclesResult.reduce((map, cycle) => {
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
    let positionsMap = {};
    if (basketIds.length > 0) {
      // Usa la query SQL nativa per accedere alla tabella con il suo nome corretto
      const positionsResult = await db.execute(sql`
        SELECT * FROM basket_position_history 
        WHERE basket_id IN ${basketIds} AND end_date IS NULL
      `);
      
      // Quando usiamo db.execute, il risultato è un array di oggetti con proprietà in snake_case
      // dobbiamo convertire i nomi delle colonne da snake_case a camelCase
      positionsMap = positionsResult.reduce((map, pos) => {
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
    
    // Combina tutti i dati
    const enrichedBaskets = basketsResult.map(basket => {
      const cycle = basket.currentCycleId ? cyclesMap[basket.currentCycleId] : null;
      const position = positionsMap[basket.id];
      
      return {
        ...basket,
        cycle,
        currentPosition: position || null
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
    
    // Salva in cache
    BasketsCache.set(cacheKey, result);
    
    const duration = Date.now() - startTime;
    console.log(`Query cestelli completata in ${duration}ms: ${enrichedBaskets.length} risultati su ${totalItems} totali`);
    console.log(`Risposta API paginata: pagina ${page}/${totalPages}, ${enrichedBaskets.length} elementi su ${totalItems} totali`);
    
    return result;
  } catch (error) {
    console.error('Errore durante il recupero ottimizzato dei cestelli:', error);
    throw error;
  }
}