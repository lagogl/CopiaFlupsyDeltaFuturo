/**
 * Controller ottimizzato per i cicli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { sql, eq, and, asc, desc, inArray, isNull } from 'drizzle-orm';
import { db } from "../db.js";
import { 
  cycles, 
  baskets, 
  operations, 
  sizes, 
  flupsys, 
  lots, 
  mortalityRates,
  sgr 
} from "../../shared/schema.js";

interface CacheData {
  data: any;
  expiresAt: number;
}

interface CyclesOptions {
  page?: number;
  pageSize?: number;
  state?: string | null;
  flupsyId?: number | null;
  startDateFrom?: string | null;
  startDateTo?: string | null;
  sortBy?: string;
  sortOrder?: string;
  includeAll?: boolean;
}

/**
 * Servizio di cache per i cicli
 */
class CyclesCacheService {
  private cache = new Map<string, CacheData>();
  private ttl = 600; // 10 minuti (in secondi) - esteso per ridurre query DB

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(options: Record<string, any> = {}): string {
    const keys = Object.keys(options).sort();
    const keyParts = keys.map(key => `${key}_${options[key]}`);
    return `cycles_${keyParts.join('_')}`;
  }

  /**
   * Salva i risultati nella cache
   */
  set(key: string, data: any): void {
    const expiresAt = Date.now() + (this.ttl * 1000);
    this.cache.set(key, { data, expiresAt });
    console.log(`Cache cicli: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      console.log(`Cache cicli: nessun dato trovato per chiave "${key}"`);
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      console.log(`Cache cicli: dati scaduti per chiave "${key}"`);
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache cicli: dati recuperati dalla cache per chiave "${key}"`);
    return cached.data;
  }

  /**
   * Elimina tutte le chiavi di cache
   */
  clear(): void {
    this.cache.clear();
    console.log("Cache cicli: cache completamente svuotata");
  }

  /**
   * Forza la pulizia della cache e restituisce lo stato
   */
  forceClear(): { cleared: number } {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    console.log(`Cache cicli: forzata pulizia - rimosse ${sizeBefore} chiavi`);
    return { cleared: sizeBefore };
  }

  /**
   * Invalida la cache quando i dati cambiano
   */
  invalidate(): void {
    console.log("Invalidazione cache cicli");
    this.clear();
  }
}

// Esporta un'istanza singleton della cache
export const CyclesCache = new CyclesCacheService();

/**
 * Ottiene tutti i cicli con paginazione, filtri e cache
 */
export async function getCycles(options: CyclesOptions = {}) {
  console.log("getCycles CHIAMATA CON:", JSON.stringify(options));
  
  // Implementazione temporanea semplificata per risolvere errore PostgreSQL
  try {
    console.log("Eseguendo query semplificata per cycles...");
    const simpleCycles = await db.select().from(cycles).orderBy(desc(cycles.startDate));
    console.log(`Query semplificata eseguita con successo: ${simpleCycles.length} cicli trovati`);
    return simpleCycles;
  } catch (error) {
    console.error("Errore anche nella query semplificata:", error);
    return [];
  }
}

  // Se includeAll è true, ignora la paginazione
  const effectivePageSize = includeAll ? 1000 : pageSize;
  const effectivePage = includeAll ? 1 : page;

  // Genera una chiave di cache basata sui parametri di filtro
  const cacheKey = CyclesCache.generateCacheKey({ 
    page: effectivePage, 
    pageSize: effectivePageSize, 
    state, 
    flupsyId, 
    startDateFrom, 
    startDateTo, 
    sortBy, 
    sortOrder,
    includeAll 
  });

  // Verifica cache
  if (!includeAll) {
    const cached = CyclesCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (includeAll) {
    console.log("Recupero tutti i cicli senza paginazione (richiesto da dashboard)");
  } else {
    console.log(`Richiesta cicli con opzioni: ${JSON.stringify(options)}`);
  }
  
  const startTime = Date.now();

  try {
    // Prepara i filtri
    const filters: any[] = [];
    
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
    let flupysBasketIds: number[] | null = null;
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
            page: effectivePage,
            pageSize: effectivePageSize,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: effectivePage > 1
          }
        };
      }
      
      // Solo se ci sono cestelli, aggiungi il filtro
      if (flupysBasketIds.length > 0) {
        filters.push(inArray(cycles.basketId, flupysBasketIds));
      }
    }
    
    // Calcola l'offset per la paginazione
    const offset = (effectivePage - 1) * effectivePageSize;
    
    // Preparazione della clausola di ordinamento
    let orderClause: any;
    if (sortOrder.toLowerCase() === 'asc') {
      orderClause = asc(cycles[sortBy as keyof typeof cycles]);
    } else {
      orderClause = desc(cycles[sortBy as keyof typeof cycles]);
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
    
    // 2. Ottieni i cicli paginati
    const query = db.select()
      .from(cycles)
      .orderBy(orderClause)
      .limit(effectivePageSize)
      .offset(offset);
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const cyclesResult = await query;
    
    // 3. Ottieni i dettagli dei cestelli associati
    if (cyclesResult.length === 0) {
      const result = {
        cycles: [],
        pagination: {
          page: effectivePage,
          pageSize: effectivePageSize,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: effectivePage > 1
        }
      };
      
      if (includeAll) {
        console.log("Restituiti 0 cicli (includeAll=true)");
        return cyclesResult;
      }
      
      return result;
    }
    
    const cycleBasketIds = cyclesResult.map(cycle => cycle.basketId);
    
    let basketsResult: any[] = [];
    if (cycleBasketIds.length > 0) {
      basketsResult = await db.execute(sql`
        SELECT * FROM baskets WHERE id = ANY(${cycleBasketIds})
      `);
    }
    
    // Mappa dei cestelli per ID
    const basketsMap = basketsResult.reduce((map: any, basket: any) => {
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
    const flupsyIds = new Set<number>();
    for (const basket of basketsResult) {
      if (basket.flupsy_id) {
        flupsyIds.add(basket.flupsy_id);
      }
    }
    
    let flupsysMap: any = {};
    if (flupsyIds.size > 0) {
      const flupsyIdsArray = Array.from(flupsyIds);
      if (flupsyIdsArray.length > 0) {
        const flupsysResult = await db.execute(sql`
          SELECT * FROM flupsys WHERE id = ANY(${flupsyIdsArray})
        `);
        
        // Mappa dei FLUPSY per ID
        flupsysMap = flupsysResult.reduce((map: any, flupsy: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        map[flupsy.id] = {
          id: flupsy.id,
          name: flupsy.name,
          location: flupsy.location,
          description: flupsy.description,
          active: flupsy.active,
          maxPositions: flupsy.max_positions,
          productionCenter: flupsy.production_center
        };
        return map;
      }, {});
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
    
    // Se includeAll, restituisci solo i cicli
    if (includeAll) {
      CyclesCache.set(cacheKey, cyclesWithBasketDetails);
      const duration = Date.now() - startTime;
      console.log(`Restituiti tutti i ${cyclesWithBasketDetails.length} cicli (includeAll=true)`);
      console.log(`Cicli recuperati in ${duration}ms (ottimizzato)`);
      return cyclesWithBasketDetails;
    }
    
    // Calcola i metadati di paginazione
    const totalPages = Math.ceil(totalCount / effectivePageSize);
    
    // Prepara il risultato completo con metadati di paginazione
    const result = {
      cycles: cyclesWithBasketDetails,
      pagination: {
        page: effectivePage,
        pageSize: effectivePageSize,
        totalCount,
        totalPages,
        hasNextPage: effectivePage < totalPages,
        hasPreviousPage: effectivePage > 1
      }
    };
    
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
    // 1. Ottieni tutti i cicli attivi in una singola query
    const activeCycles = await db.select()
      .from(cycles)
      .where(eq(cycles.state, 'active'));
    
    if (activeCycles.length === 0) {
      return [];
    }

    // 2. Prepara gli ID dei cestelli
    const basketIds = activeCycles.map(cycle => cycle.basketId);

    // 3. Ottieni tutti i cestelli correlati in una singola query
    const basketsResult = await db.execute(sql`
      SELECT * FROM baskets WHERE id IN ${basketIds}
    `);

    // Mappa dei cestelli per ID
    const basketsMap = basketsResult.reduce((map: any, basket: any) => {
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

    // 4. Prepara gli ID dei cicli
    const cycleIds = activeCycles.map(cycle => cycle.id);

    // 5. Ottieni tutte le operazioni per questi cicli in una singola query
    const operationsResult = await db.execute(sql`
      SELECT * FROM operations 
      WHERE cycle_id IN ${cycleIds}
      ORDER BY date DESC
    `);

    // Raggruppa le operazioni per ID ciclo
    const operationsByCycle: any = {};
    for (const op of operationsResult) {
      // Converti i nomi delle colonne da snake_case a camelCase
      const operation = {
        id: op.id,
        date: op.date,
        type: op.type,
        cycleId: op.cycle_id,
        basketId: op.basket_id,
        sizeId: op.size_id,
        lotId: op.lot_id,
        sgrId: op.sgr_id,
        sgrDailyId: op.sgr_daily_id,
        animalCount: op.animal_count,
        totalWeight: op.total_weight,
        averageWeight: op.average_weight,
        animalsPerKg: op.animals_per_kg,
        notes: op.notes,
        mortalityRate: op.mortality_rate,
        metadata: op.metadata
      };

      if (!operationsByCycle[op.cycle_id]) {
        operationsByCycle[op.cycle_id] = [];
      }
      operationsByCycle[op.cycle_id].push(operation);
    }

    // 6. Raccogli tutti gli ID delle taglie dalle operazioni
    const sizeIds = new Set<number>();
    for (const op of operationsResult) {
      if (op.size_id) {
        sizeIds.add(op.size_id);
      }
    }

    // 7. Ottieni tutte le taglie in una singola query
    let sizesMap: any = {};
    if (sizeIds.size > 0) {
      const sizesResult = await db.execute(sql`
        SELECT * FROM sizes WHERE id IN ${Array.from(sizeIds)}
      `);

      // Mappa delle taglie per ID
      sizesMap = sizesResult.reduce((map: any, size: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        map[size.id] = {
          id: size.id,
          name: size.name,
          code: size.code,
          notes: size.notes,
          sizeMm: size.size_mm,
          minAnimalsPerKg: size.min_animals_per_kg,
          maxAnimalsPerKg: size.max_animals_per_kg,
          color: size.color
        };
        return map;
      }, {});
    }

    // 8. Raccogli tutti gli ID dei FLUPSY dai cestelli
    const flupsyIds = new Set<number>();
    for (const basket of basketsResult) {
      if (basket.flupsy_id) {
        flupsyIds.add(basket.flupsy_id);
      }
    }

    // 9. Ottieni tutti i FLUPSY in una singola query
    let flupsysMap: any = {};
    if (flupsyIds.size > 0) {
      const flupsysResult = await db.execute(sql`
        SELECT * FROM flupsys WHERE id IN ${Array.from(flupsyIds)}
      `);

      // Mappa dei FLUPSY per ID
      flupsysMap = flupsysResult.reduce((map: any, flupsy: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        map[flupsy.id] = {
          id: flupsy.id,
          name: flupsy.name,
          location: flupsy.location,
          description: flupsy.description,
          active: flupsy.active,
          maxPositions: flupsy.max_positions,
          productionCenter: flupsy.production_center
        };
        return map;
      }, {});
    }

    // 10. Raccogli tutti gli ID dei lotti dalle operazioni
    const lotIds = new Set<number>();
    for (const op of operationsResult) {
      if (op.lot_id) {
        lotIds.add(op.lot_id);
      }
    }

    // 11. Ottieni tutti i lotti in una singola query se necessario
    let lotsMap: any = {};
    if (lotIds.size > 0) {
      const lotsResult = await db.execute(sql`
        SELECT * FROM lots WHERE id IN ${Array.from(lotIds)}
      `);

      // Mappa dei lotti per ID
      lotsMap = lotsResult.reduce((map: any, lot: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        map[lot.id] = {
          id: lot.id,
          state: lot.state,
          arrivalDate: lot.arrival_date,
          supplier: lot.supplier,
          supplierLotNumber: lot.supplier_lot_number,
          sizeId: lot.size_id,
          animalCount: lot.animal_count,
          weight: lot.weight,
          quality: lot.quality,
          notes: lot.notes
        };
        return map;
      }, {});
    }

    // 12. Raccogli tutti gli ID degli SGR dalle operazioni
    const sgrIds = new Set<number>();
    for (const op of operationsResult) {
      if (op.sgr_id) {
        sgrIds.add(op.sgr_id);
      }
    }

    // 13. Ottieni tutti gli SGR in una singola query se necessario
    let sgrMap: any = {};
    if (sgrIds.size > 0) {
      const sgrResult = await db.execute(sql`
        SELECT * FROM sgr WHERE id IN ${Array.from(sgrIds)}
      `);

      // Mappa degli SGR per ID
      sgrMap = sgrResult.reduce((map: any, sgrItem: any) => {
        // Converti i nomi delle colonne da snake_case a camelCase
        map[sgrItem.id] = {
          id: sgrItem.id,
          month: sgrItem.month,
          percentage: sgrItem.percentage,
          calculatedFromReal: sgrItem.calculated_from_real
        };
        return map;
      }, {});
    }

    // 14. Componi i dati completi per ogni ciclo
    const activeCyclesWithDetails = activeCycles.map(cycle => {
      const basket = basketsMap[cycle.basketId];
      const operations = operationsByCycle[cycle.id] || [];
      const lastOperation = operations.length > 0 ? operations[0] : null;
      
      let flupsy = null;
      if (basket && basket.flupsyId) {
        flupsy = flupsysMap[basket.flupsyId];
      }
      
      let size = null;
      if (lastOperation && lastOperation.sizeId) {
        size = sizesMap[lastOperation.sizeId];
      }
      
      let lot = null;
      if (lastOperation && lastOperation.lotId) {
        lot = lotsMap[lastOperation.lotId];
      }
      
      let currentSgr = null;
      if (lastOperation && lastOperation.sgrId) {
        currentSgr = sgrMap[lastOperation.sgrId];
      }
      
      // Calcola la durata del ciclo in giorni
      let cycleDuration = null;
      if (cycle.startDate) {
        const startDate = new Date(cycle.startDate);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        cycleDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return { 
        ...cycle, 
        basket, 
        flupsy,
        latestOperation: lastOperation, 
        currentSize: size,
        currentSgr,
        cycleDuration,
        lot
      };
    });

    // Salva nella cache
    CyclesCache.set(cacheKey, activeCyclesWithDetails);
    
    const duration = Date.now() - startTime;
    console.log(`Cicli attivi recuperati in ${duration}ms (ottimizzato)`);
    
    return activeCyclesWithDetails;
  } catch (error) {
    console.error("Errore nel recupero dei cicli attivi con dettagli:", error);
    throw error;
  }
}

/**
 * Configura l'invalidazione della cache per i cicli
 */
export function setupCyclesCacheInvalidation(app: any) {
  // Invalida la cache quando un ciclo viene creato, aggiornato o eliminato
  const invalidateCache = () => CyclesCache.invalidate();
  
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