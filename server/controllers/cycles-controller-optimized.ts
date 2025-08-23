/**
 * Controller ottimizzato per i cicli
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { Request, Response } from 'express';
import { sql, eq, and, asc, desc, inArray, isNull, or } from 'drizzle-orm';
import { db } from "../db";
import { cycles, baskets, operations, sizes, flupsys, lots, mortalityRates, sgr } from "../../shared/schema";

interface CacheItem {
  data: any;
  expiresAt: number;
}

/**
 * Servizio di cache per i cicli
 */
class CyclesCacheService {
  private cache: Map<string, CacheItem>;
  private ttl: number;

  constructor() {
    this.cache = new Map();
    this.ttl = 120 * 1000; // 2 minuti (120 secondi)
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(options: Record<string, any> = {}): string {
    return Object.keys(options)
      .filter(key => options[key] !== undefined && options[key] !== null)
      .sort()
      .map(key => `${key}_${options[key]}`)
      .join('_');
  }

  /**
   * Salva i risultati nella cache
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl
    });
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
  clear(): void {
    this.cache.clear();
    console.log('Cache cicli: svuotata');
  }

  /**
   * Invalida la cache quando i dati cambiano
   */
  invalidate(): void {
    this.clear();
  }
}

// Istanza globale del servizio cache
const cacheService = new CyclesCacheService();

export { cacheService };

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
 * Ottiene tutti i cicli con paginazione, filtri e cache
 */
export async function getCycles(options: CyclesOptions = {}) {
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

    // Costruisce query con JOIN corrette secondo lo schema
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
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        flupsyLocation: flupsys.location,
        lotSupplier: lots.supplier,
        lotArrivalDate: lots.arrivalDate
      })
      .from(cycles)
      .innerJoin(baskets, eq(cycles.basketId, baskets.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(lots, eq(cycles.lotId, lots.id))
      .where(whereClause);

    // Applica ordinamento
    const orderColumn = sortBy === 'startDate' ? cycles.startDate : cycles.id;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    query = query.orderBy(orderDirection);

    // Esegue query
    const results = await query;

    let finalResults: any;
    let pagination: any = null;

    if (includeAll) {
      // Se includeAll=true, restituisce tutti i risultati senza paginazione
      finalResults = results;
      console.log(`Query cicli completata in ${Date.now() - startTime}ms - ${results.length} cicli totali (includeAll=true)`);
    } else {
      // Applica paginazione manualmente sui risultati
      const totalCount = results.length;
      const offset = (page - 1) * pageSize;
      const paginatedResults = results.slice(offset, offset + pageSize);

      pagination = {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: page < Math.ceil(totalCount / pageSize),
        hasPreviousPage: page > 1
      };

      finalResults = {
        cycles: paginatedResults,
        pagination
      };

      console.log(`Query cicli completata in ${Date.now() - startTime}ms - ${paginatedResults.length}/${totalCount} cicli (pag ${page})`);
    }

    // Salva in cache
    cacheService.set(cacheKey, finalResults);

    return finalResults;

  } catch (error: any) {
    console.error('Errore nel recupero cicli ottimizzato:', error);
    throw error;
  }
}

// Placeholder export functions for now
export async function getCyclesOptimized(req: Request, res: Response) {
  try {
    res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('Error in getCyclesOptimized:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function invalidateCache(): void {
  cacheService.invalidate();
}