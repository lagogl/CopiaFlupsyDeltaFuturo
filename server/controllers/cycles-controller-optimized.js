/**
 * Controller ottimizzato per i cicli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { sql, eq, and, asc, desc, inArray, isNull, or } from 'drizzle-orm';
import { db } from "../db";
import { cycles, baskets, operations, sizes, flupsys, lots, mortalityRates, sgr } from "../../shared/schema";

/**
 * Servizio di cache per i cicli
 */
class CyclesCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 120 * 1000; // 2 minuti (120 secondi)
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(options = {}) {
    return Object.keys(options)
      .filter(key => options[key] !== undefined && options[key] !== null)
      .sort()
      .map(key => `${key}_${options[key]}`)
      .join('_');
  }

  /**
   * Salva i risultati nella cache
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl
    });
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      console.log(`Cache cicli: nessun dato trovato per chiave "${key}"`);
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      console.log(`Cache cicli: dati scaduti per chiave "${key}"`);
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache cicli: hit per chiave "${key}"`);
    return cached.data;
  }

  /**
   * Elimina tutte le chiavi di cache
   */
  clear() {
    this.cache.clear();
    console.log('Cache cicli: svuotata');
  }

  /**
   * Invalida la cache quando i dati cambiano
   */
  invalidate() {
    this.clear();
  }
}

// Esporta un'istanza singleton della cache
export const CyclesCache = new CyclesCacheService();

/**
 * Ottiene tutti i cicli con paginazione, filtri e cache
 * @param {Object} options - Opzioni di filtro e paginazione
 * @param {number} options.page - Numero di pagina (default: 1)
 * @param {number} options.pageSize - Dimensione pagina (default: 10)
 * @param {string} options.state - Stato del ciclo (es: 'active', 'completed', 'cancelled')
 * @param {number} options.flupsyId - ID del FLUPSY per filtrare
 * @param {string} options.startDateFrom - Data di inizio minima (formato YYYY-MM-DD)
 * @param {string} options.startDateTo - Data di inizio massima (formato YYYY-MM-DD)
 * @param {string} options.sortBy - Campo per ordinamento (default: 'startDate')
 * @param {string} options.sortOrder - Direzione ordinamento (default: 'desc')
 * @returns {Promise<Object>} - I cicli filtrati con metadati di paginazione
 */
export async function getCycles(options = {}) {
  const {
    page = 1,
    pageSize = 10,
    state = null,
    flupsyId = null,
    startDateFrom = null,
    startDateTo = null,
    sortBy = 'startDate',
    sortOrder = 'desc',
    includeAll = false
  } = options;

  // Genera una chiave di cache basata sui parametri di filtro
  const cacheKey = CyclesCache.generateCacheKey({ 
    page, pageSize, state, flupsyId, startDateFrom, startDateTo, sortBy, sortOrder, includeAll 
  });
  
  // Verifica se i dati sono nella cache
  const cached = CyclesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`Richiesta cicli con opzioni: ${JSON.stringify(options)}`);
  const startTime = Date.now();

  try {
    // Prepara i filtri
    const filters = [];
    
    if (state) {
      filters.push(eq(cycles.state, state));
    }
    
    if (startDateFrom) {
      filters.push(sql`${cycles.startDate} >= ${startDateFrom}`);
    }
    
    if (startDateTo) {
      filters.push(sql`${cycles.startDate} <= ${startDateTo}`);
    }
    
    // Ottieni gli ID dei cestelli associati al FLUPSY se necessario
    let flupysBasketIds = null;
    if (flupsyId) {
      const basketsInFlupsy = await db.select({ id: baskets.id })
        .from(baskets)
        .where(eq(baskets.flupsyId, flupsyId));
      
      flupysBasketIds = basketsInFlupsy.map(b => b.id);
      
      if (flupysBasketIds.length === 0) {
        // Nessun cestello trovato in questo FLUPSY
        return {
          cycles: [],
          pagination: {
            page,
            pageSize,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: page > 1
          }
        };
      }
      
      // Sostituiamo l'inArray con una serie di condizioni OR per evitare problemi con parametri multipli
      if (flupysBasketIds.length === 1) {
        filters.push(eq(cycles.basketId, flupysBasketIds[0]));
      } else {
        const conditions = flupysBasketIds.map(id => eq(cycles.basketId, id));
        filters.push(or(...conditions));
      }
    }
    
    // Preparazione della clausola di ordinamento
    let orderClause;
    if (sortOrder.toLowerCase() === 'asc') {
      orderClause = asc(cycles[sortBy]);
    } else {
      orderClause = desc(cycles[sortBy]);
    }
    
    // 1. Ottieni il conteggio totale dei cicli con i filtri applicati
    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    
    const countQuery = db.select({ count: sql`count(*)` })
      .from(cycles);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const countResult = await countQuery;
    const totalCount = Number(countResult[0].count);
    
    // 2. Ottieni i cicli (con o senza paginazione)
    const query = db.select()
      .from(cycles)
      .orderBy(orderClause);
    
    // Se includeAll=true, non applica limit e offset (restituisce tutto)
    if (!includeAll) {
      // Calcola l'offset per la paginazione solo quando non includeAll
      const offset = (page - 1) * pageSize;
      query.limit(pageSize).offset(offset);
      console.log(`Recupero cicli paginati: pagina ${page}, ${pageSize} per pagina`);
    } else {
      console.log("Recupero tutti i cicli senza paginazione (richiesto da dashboard)");
    }
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const cyclesResult = await query;
    
    // 3. Ottieni i dettagli dei cestelli associati
    const cycleBasketIds = cyclesResult.map(cycle => cycle.basketId);
    
    // Assicuriamoci che ci siano ID prima di eseguire la query
    let basketsResult = [];
    if (cycleBasketIds.length > 0) {
      // Utilizziamo il metodo corretto per query con IN
      if (cycleBasketIds.length === 1) {
        // Per un solo ID, usiamo eq
        basketsResult = await db.select()
          .from(baskets)
          .where(eq(baskets.id, cycleBasketIds[0]));
      } else {
        // Per più ID, facciamo più query singole e combiniamo i risultati
        // Questo evita problemi con l'operatore IN e array di parametri
        basketsResult = [];
        for (const basketId of cycleBasketIds) {
          const result = await db.select()
            .from(baskets)
            .where(eq(baskets.id, basketId));
          
          if (result.length > 0) {
            basketsResult.push(result[0]);
          }
        }
      }
    }
    
    // Mappa dei cestelli per ID
    const basketsMap = basketsResult.reduce((map, basket) => {
      // Converti i nomi delle colonne da snake_case a camelCase
      map[basket.id] = {
        id: basket.id,
        flupsyId: basket.flupsy_id,
        physicalNumber: basket.physical_number,
        cycleCode: basket.cycle_code,
        state: basket.state,
        currentCycleId: basket.current_cycle_id,
        nfcData: basket.nfc_data,
        row: basket.row,
        position: basket.position
      };
      return map;
    }, {});
    
    // 4. Ottieni i dettagli dei FLUPSY
    const flupsyIds = new Set();
    for (const basket of basketsResult) {
      if (basket.flupsyId || basket.flupsy_id) {
        flupsyIds.add(basket.flupsyId || basket.flupsy_id);
      }
    }
    
    let flupsysMap = {};
    if (flupsyIds.size > 0) {
      const flupsyIdsArray = Array.from(flupsyIds);
      
      // Per evitare problemi con l'operatore IN, recuperiamo i FLUPSY uno alla volta
      for (const flupsyId of flupsyIdsArray) {
        const flupsysResult = await db.select()
          .from(flupsys)
          .where(eq(flupsys.id, flupsyId));
        
        if (flupsysResult.length > 0) {
          const flupsy = flupsysResult[0];
          // Mappa per ID
          flupsysMap[flupsy.id] = {
            id: flupsy.id,
            name: flupsy.name,
            location: flupsy.location,
            description: flupsy.description,
            active: flupsy.active,
            maxPositions: flupsy.maxPositions,
            productionCenter: flupsy.productionCenter
          };
        }
      }
    }
    
    // Aggiungi informazioni di cestello e FLUPSY ai cicli
    const cyclesWithBasketDetails = cyclesResult.map(cycle => {
      const basket = basketsMap[cycle.basketId];
      
      let flupsy = null;
      if (basket && basket.flupsyId) {
        flupsy = flupsysMap[basket.flupsyId];
      }
      
      return {
        ...cycle,
        basket,
        flupsy
      };
    });
    
    // Calcola i metadati di paginazione
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Prepara il risultato completo con metadati di paginazione
    let result;
    
    if (includeAll) {
      // Se includeAll=true, restituisci direttamente l'array di cicli senza paginazione
      result = cyclesWithBasketDetails;
      console.log(`Restituiti tutti i ${cyclesWithBasketDetails.length} cicli (includeAll=true)`);
    } else {
      // Altrimenti, restituisci l'oggetto con i metadati di paginazione
      result = {
        cycles: cyclesWithBasketDetails,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    }
    
    // Salva nella cache
    CyclesCache.set(cacheKey, result);
    
    const duration = Date.now() - startTime;
    console.log(`Cicli recuperati in ${duration}ms (ottimizzato)`);
    
    return result;
  } catch (error) {
    console.error("Errore nel recupero dei cicli:", error);
    throw error;
  }
}

/**
 * Ottiene i cicli attivi con dettagli completi in modo ottimizzato
 */
export async function getActiveCyclesWithDetails() {
  // Verifica se i dati sono nella cache
  const cacheKey = "active-cycles-with-details";
  const cached = CyclesCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  console.log("Richiesta cicli attivi con dettagli (ottimizzata)");
  const startTime = Date.now();
  
  try {
    // 1. Ottieni i cicli attivi con una singola query
    const activeCycles = await db.select()
      .from(cycles)
      .where(eq(cycles.state, 'active'));
    
    if (activeCycles.length === 0) {
      return [];
    }
    
    // 2. Ottieni i cestelli associati in batch
    const basketIds = activeCycles.map(cycle => cycle.basketId);
    const allBaskets = await db.select()
      .from(baskets)
      .where(inArray(baskets.id, basketIds));
    
    // Crea mappa dei cestelli per ID
    const basketsMap = {};
    for (const basket of allBaskets) {
      basketsMap[basket.id] = basket;
    }
    
    // 3. Ottieni le operazioni più recenti per ogni ciclo in batch
    const cycleIds = activeCycles.map(cycle => cycle.id);
    const allOperations = await db.select()
      .from(operations)
      .where(inArray(operations.cycleId, cycleIds))
      .orderBy(desc(operations.date));
    
    // Organizza le operazioni per ciclo (la prima è la più recente per ogni ciclo)
    const operationsByCycle = {};
    for (const operation of allOperations) {
      if (!operationsByCycle[operation.cycleId]) {
        operationsByCycle[operation.cycleId] = [];
      }
      operationsByCycle[operation.cycleId].push(operation);
    }
    
    // 4. Raccogli tutti gli ID delle taglie e SGR utilizzati
    const sizeIds = new Set();
    const sgrIds = new Set();
    
    for (const operations of Object.values(operationsByCycle)) {
      if (operations.length > 0) {
        const latestOperation = operations[0];
        if (latestOperation.sizeId) sizeIds.add(latestOperation.sizeId);
        if (latestOperation.sgrId) sgrIds.add(latestOperation.sgrId);
      }
    }
    
    // 5. Ottieni tutte le taglie in batch
    let sizesMap = {};
    if (sizeIds.size > 0) {
      const allSizes = await db.select()
        .from(sizes)
        .where(inArray(sizes.id, Array.from(sizeIds)));
      
      // Crea mappa delle taglie per ID
      for (const size of allSizes) {
        sizesMap[size.id] = size;
      }
    }
    
    // 6. Ottieni tutti gli SGR in batch
    let sgrsMap = {};
    if (sgrIds.size > 0) {
      const allSgrs = await db.select()
        .from(sgr)
        .where(inArray(sgr.id, Array.from(sgrIds)));
      
      // Crea mappa degli SGR per ID
      for (const sgrItem of allSgrs) {
        sgrsMap[sgrItem.id] = sgrItem;
      }
    }
    
    // 7. Costruisci il risultato finale con tutti i dettagli
    const activeCyclesWithDetails = activeCycles.map(cycle => {
      const basket = basketsMap[cycle.basketId];
      const operations = operationsByCycle[cycle.id] || [];
      const latestOperation = operations.length > 0 ? operations[0] : null;
      
      let currentSize = null;
      if (latestOperation && latestOperation.sizeId) {
        currentSize = sizesMap[latestOperation.sizeId];
      }
      
      let currentSgr = null;
      if (latestOperation && latestOperation.sgrId) {
        currentSgr = sgrsMap[latestOperation.sgrId];
      }
      
      return {
        ...cycle,
        basket,
        latestOperation,
        currentSize,
        currentSgr
      };
    });
    
    // Salva nella cache
    CyclesCache.set(cacheKey, activeCyclesWithDetails);
    
    const duration = Date.now() - startTime;
    console.log(`Cicli attivi recuperati in ${duration}ms (ottimizzato)`);
    
    return activeCyclesWithDetails;
  } catch (error) {
    console.error("Errore nel recupero dei cicli attivi:", error);
    throw error;
  }
}

/**
 * Configura l'invalidazione della cache per i cicli
 */
export function setupCyclesCacheInvalidation(app) {
  function invalidateCache() {
    CyclesCache.invalidate();
  }
  
  app.post('/api/cycles*', invalidateCache);
  app.put('/api/cycles*', invalidateCache);
  app.patch('/api/cycles*', invalidateCache);
  app.delete('/api/cycles*', invalidateCache);
  
  // Invalida anche quando un'operazione viene creata o modificata
  app.post('/api/operations*', invalidateCache);
  app.put('/api/operations*', invalidateCache);
  app.patch('/api/operations*', invalidateCache);
  app.delete('/api/operations*', invalidateCache);
  
  console.log("Sistema di invalidazione cache cicli configurato con successo");
}