/**
 * Service per la gestione dei cicli
 * Contiene tutta la logica business per i cicli produttivi
 */

import { sql, eq, and, asc, desc } from 'drizzle-orm';
import { db } from '../../../db';
import { cycles, baskets, flupsys, lots } from '../../../../shared/schema';

// Cache service per cicli
interface CacheItem {
  data: any;
  expiresAt: number;
}

class CyclesCacheService {
  private cache: Map<string, CacheItem>;
  private ttl: number;

  constructor() {
    this.cache = new Map();
    this.ttl = 120 * 1000; // 2 minuti
  }

  generateCacheKey(options: Record<string, any> = {}): string {
    return Object.keys(options)
      .filter(key => options[key] !== undefined && options[key] !== null)
      .sort()
      .map(key => `${key}_${options[key]}`)
      .join('_');
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl
    });
  }

  get(key: string): any | null {
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

  clear(): void {
    this.cache.clear();
    console.log('Cache cicli: svuotata');
  }
}

const cacheService = new CyclesCacheService();

export interface CyclesOptions {
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

class CyclesService {
  /**
   * Ottiene cicli con paginazione, filtri e cache
   */
  async getCycles(options: CyclesOptions = {}) {
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

    const startTime = Date.now();
    console.log(`Ricerca cicli ottimizzata con parametri:`, options);

    // Genera chiave di cache
    const cacheKey = cacheService.generateCacheKey({
      page: includeAll ? undefined : page,
      pageSize: includeAll ? undefined : pageSize,
      state,
      flupsyId,
      startDateFrom,
      startDateTo,
      sortBy,
      sortOrder,
      includeAll
    });

    // Controlla cache
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`Cicli recuperati dalla cache in ${Date.now() - startTime}ms`);
      return cachedData;
    }

    try {
      // Costruisce query base
      const whereConditions = [];

      if (state) {
        whereConditions.push(eq(cycles.state, state));
      }

      if (flupsyId) {
        whereConditions.push(eq(baskets.flupsyId, flupsyId));
      }

      if (startDateFrom || startDateTo) {
        if (startDateFrom && startDateTo) {
          whereConditions.push(
            and(
              sql`${cycles.startDate} >= ${startDateFrom}`,
              sql`${cycles.startDate} <= ${startDateTo}`
            )
          );
        } else if (startDateFrom) {
          whereConditions.push(sql`${cycles.startDate} >= ${startDateFrom}`);
        } else if (startDateTo) {
          whereConditions.push(sql`${cycles.startDate} <= ${startDateTo}`);
        }
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Query base con JOIN
      let query = db
        .select({
          id: cycles.id,
          basketId: cycles.basketId,
          lotId: cycles.lotId,
          startDate: cycles.startDate,
          endDate: cycles.endDate,
          state: cycles.state,
          basketPhysicalNumber: baskets.physicalNumber,
          basketState: baskets.state,
          flupsyId: flupsys.id,
          flupsyName: flupsys.name,
          flupsyLocation: flupsys.location,
          lotSupplier: lots.supplier,
          lotArrivalDate: lots.arrivalDate
        })
        .from(cycles)
        .leftJoin(baskets, eq(cycles.basketId, baskets.id))
        .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
        .leftJoin(lots, eq(cycles.lotId, lots.id));

      if (whereClause) {
        query.where(whereClause);
      }

      // Ordinamento
      const orderByColumn = sortBy === 'startDate' ? cycles.startDate : cycles.id;
      const orderByFn = sortOrder === 'asc' ? asc : desc;
      query.orderBy(orderByFn(orderByColumn));

      // Paginazione
      if (!includeAll) {
        const offset = (page - 1) * pageSize;
        query.limit(pageSize).offset(offset);
      }

      const results = await query;

      // Conteggio totale
      let totalCount = results.length;
      if (!includeAll) {
        const countQuery = db
          .select({ count: sql`count(*)`.as('count') })
          .from(cycles)
          .leftJoin(baskets, eq(cycles.basketId, baskets.id));
        
        if (whereClause) {
          countQuery.where(whereClause);
        }
        
        const countResult = await countQuery;
        totalCount = parseInt(countResult[0].count as string);
      }

      const duration = Date.now() - startTime;
      console.log(`Query cicli completata in ${duration}ms - ${results.length} cicli totali (includeAll=${includeAll})`);
      console.log(`Cicli recuperati in ${duration}ms`);

      let response;
      if (includeAll) {
        console.log(`Restituisco tutti i ${results.length} cicli (includeAll=true)`);
        response = results;
      } else {
        const totalPages = Math.ceil(totalCount / pageSize);
        response = {
          cycles: results,
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

      // Salva in cache
      cacheService.set(cacheKey, response);

      return response;
    } catch (error) {
      console.error('Errore recupero cicli:', error);
      throw error;
    }
  }

  /**
   * Ottiene cicli attivi
   */
  async getActiveCycles() {
    const activeCycles = await db
      .select()
      .from(cycles)
      .where(eq(cycles.state, 'active'))
      .orderBy(desc(cycles.startDate));
    
    return activeCycles;
  }

  /**
   * Ottiene cicli attivi con dettagli
   */
  async getActiveCyclesWithDetails() {
    const activeCycles = await db
      .select({
        id: cycles.id,
        basketId: cycles.basketId,
        lotId: cycles.lotId,
        startDate: cycles.startDate,
        endDate: cycles.endDate,
        state: cycles.state,
        basketPhysicalNumber: baskets.physicalNumber,
        flupsyName: flupsys.name
      })
      .from(cycles)
      .leftJoin(baskets, eq(cycles.basketId, baskets.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(cycles.state, 'active'))
      .orderBy(desc(cycles.startDate));
    
    return activeCycles;
  }

  /**
   * Ottiene singolo ciclo per ID
   */
  async getCycleById(id: number) {
    const cycle = await db
      .select()
      .from(cycles)
      .where(eq(cycles.id, id))
      .limit(1);
    
    return cycle[0] || null;
  }

  /**
   * Ottiene cicli per cestello
   */
  async getCyclesByBasket(basketId: number) {
    const cyclesList = await db
      .select()
      .from(cycles)
      .where(eq(cycles.basketId, basketId))
      .orderBy(desc(cycles.startDate));
    
    return cyclesList;
  }

  /**
   * Crea nuovo ciclo
   */
  async createCycle(data: any) {
    const [newCycle] = await db
      .insert(cycles)
      .values(data)
      .returning();
    
    // Invalida cache
    cacheService.clear();
    
    return newCycle;
  }

  /**
   * Chiude un ciclo
   */
  async closeCycle(id: number, endDate: string) {
    const [closedCycle] = await db
      .update(cycles)
      .set({ 
        state: 'closed',
        endDate 
      })
      .where(eq(cycles.id, id))
      .returning();
    
    // Invalida cache
    cacheService.clear();
    
    return closedCycle;
  }
}

export const cyclesService = new CyclesService();
export { cacheService as cyclesCacheService };
