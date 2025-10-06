import { db } from '../../db';
import { 
  screeningOperations, 
  screeningSourceBaskets, 
  screeningDestinationBaskets,
  screeningBasketHistory,
  screeningLotReferences,
  baskets,
  cycles,
  lots,
  sizes,
  flupsys
} from '../../../shared/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import NodeCache from 'node-cache';

/**
 * Cache per le operazioni di screening
 * TTL: 2 minuti (screening è aggiornato frequentemente)
 */
const screeningCache = new NodeCache({ 
  stdTTL: 120,
  checkperiod: 60,
  useClones: false 
});

/**
 * Service per la gestione delle operazioni di screening (vagliatura)
 * Implementa Domain-Driven Design con caching ottimizzato
 */
export class ScreeningService {
  /**
   * Invalida tutte le cache del modulo screening
   */
  clearCache() {
    screeningCache.flushAll();
    console.log('🗑️ Cache screening invalidata completamente');
  }

  /**
   * GET /api/screenings
   * Lista operazioni di screening con paginazione
   */
  async getScreenings(options: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const status = options.status || 'completed';
    const offset = (page - 1) * pageSize;

    const cacheKey = `screenings_page_${page}_pageSize_${pageSize}_status_${status}`;
    const cached = screeningCache.get(cacheKey);
    if (cached) {
      console.log(`🚀 SCREENING: Cache HIT - recuperati in 0ms`);
      return cached;
    }

    console.log(`🔄 SCREENING: Cache MISS - query al database...`);
    const startTime = Date.now();

    // Query per ottenere screenings con dettagli aggregati
    const screeningsQuery = await db
      .select({
        id: screeningOperations.id,
        screeningNumber: screeningOperations.screeningNumber,
        date: screeningOperations.date,
        purpose: screeningOperations.purpose,
        status: screeningOperations.status,
        referenceSize: screeningOperations.referenceSize,
        notes: screeningOperations.notes,
        sourceCount: sql<number>`(
          SELECT COUNT(*) FROM ${screeningSourceBaskets} 
          WHERE ${screeningSourceBaskets.screeningOperationId} = ${screeningOperations.id}
        )`,
        destinationCount: sql<number>`(
          SELECT COUNT(*) FROM ${screeningDestinationBaskets} 
          WHERE ${screeningDestinationBaskets.screeningOperationId} = ${screeningOperations.id}
        )`,
        totalSourceAnimals: sql<number>`(
          SELECT COALESCE(SUM(${screeningSourceBaskets.animalCount}), 0)
          FROM ${screeningSourceBaskets}
          WHERE ${screeningSourceBaskets.screeningOperationId} = ${screeningOperations.id}
        )`,
        totalDestAnimals: sql<number>`(
          SELECT COALESCE(SUM(${screeningDestinationBaskets.animalCount}), 0)
          FROM ${screeningDestinationBaskets}
          WHERE ${screeningDestinationBaskets.screeningOperationId} = ${screeningOperations.id}
        )`,
        mortalityAnimals: sql<number>`(
          SELECT COALESCE(SUM(${screeningSourceBaskets.animalCount}), 0) - 
                 COALESCE(SUM(${screeningDestinationBaskets.animalCount}), 0)
          FROM ${screeningSourceBaskets}
          LEFT JOIN ${screeningDestinationBaskets} 
            ON ${screeningDestinationBaskets.screeningOperationId} = ${screeningOperations.id}
          WHERE ${screeningSourceBaskets.screeningOperationId} = ${screeningOperations.id}
        )`
      })
      .from(screeningOperations)
      .where(eq(screeningOperations.status, status))
      .orderBy(desc(screeningOperations.date), desc(screeningOperations.screeningNumber))
      .limit(pageSize)
      .offset(offset);

    // Count totale
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(screeningOperations)
      .where(eq(screeningOperations.status, status));

    const result = {
      screenings: screeningsQuery,
      pagination: {
        page,
        pageSize,
        totalCount: count,
        totalPages: Math.ceil(count / pageSize),
        hasNextPage: page < Math.ceil(count / pageSize),
        hasPreviousPage: page > 1
      }
    };

    const elapsedTime = Date.now() - startTime;
    console.log(`🚀 SCREENING: Cache SAVED (${screeningsQuery.length} screenings) - query completata in ${elapsedTime}ms`);
    screeningCache.set(cacheKey, result);

    return result;
  }

  /**
   * GET /api/screenings/:id
   * Dettaglio completo di un'operazione di screening
   */
  async getScreeningById(id: number) {
    const cacheKey = `screening_detail_${id}`;
    const cached = screeningCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Main screening operation
    const [screening] = await db
      .select()
      .from(screeningOperations)
      .where(eq(screeningOperations.id, id));

    if (!screening) {
      return null;
    }

    // Source baskets con dettagli
    const sourceBaskets = await db
      .select({
        id: screeningSourceBaskets.id,
        screeningOperationId: screeningSourceBaskets.screeningOperationId,
        basketId: screeningSourceBaskets.basketId,
        cycleId: screeningSourceBaskets.cycleId,
        animalCount: screeningSourceBaskets.animalCount,
        averageWeight: screeningSourceBaskets.averageWeight,
        status: screeningSourceBaskets.status,
        dismissedAt: screeningSourceBaskets.dismissedAt,
        notes: screeningSourceBaskets.notes,
        basket: {
          id: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          cycleCode: baskets.cycleCode,
          state: baskets.state
        },
        cycle: {
          id: cycles.id,
          lotId: cycles.lotId,
          startDate: cycles.startDate,
          state: cycles.state
        },
        flupsy: {
          id: flupsys.id,
          name: flupsys.name,
          location: flupsys.location
        }
      })
      .from(screeningSourceBaskets)
      .leftJoin(baskets, eq(screeningSourceBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(screeningSourceBaskets.cycleId, cycles.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(screeningSourceBaskets.screeningOperationId, id));

    // Destination baskets con dettagli
    const destinationBaskets = await db
      .select({
        id: screeningDestinationBaskets.id,
        screeningOperationId: screeningDestinationBaskets.screeningOperationId,
        basketId: screeningDestinationBaskets.basketId,
        cycleId: screeningDestinationBaskets.cycleId,
        sizeId: screeningDestinationBaskets.sizeId,
        animalCount: screeningDestinationBaskets.animalCount,
        averageWeight: screeningDestinationBaskets.averageWeight,
        targetPosition: screeningDestinationBaskets.targetPosition,
        positionAssigned: screeningDestinationBaskets.positionAssigned,
        notes: screeningDestinationBaskets.notes,
        basket: {
          id: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          cycleCode: baskets.cycleCode,
          state: baskets.state,
          row: baskets.row,
          position: baskets.position
        },
        cycle: {
          id: cycles.id,
          lotId: cycles.lotId,
          startDate: cycles.startDate,
          state: cycles.state
        },
        size: {
          id: sizes.id,
          code: sizes.code,
          name: sizes.name,
          minAnimalsPerKg: sizes.minAnimalsPerKg,
          maxAnimalsPerKg: sizes.maxAnimalsPerKg
        },
        flupsy: {
          id: flupsys.id,
          name: flupsys.name,
          location: flupsys.location
        }
      })
      .from(screeningDestinationBaskets)
      .leftJoin(baskets, eq(screeningDestinationBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(screeningDestinationBaskets.cycleId, cycles.id))
      .leftJoin(sizes, eq(screeningDestinationBaskets.sizeId, sizes.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(screeningDestinationBaskets.screeningOperationId, id));

    // Lot references
    const lotReferences = await db
      .select({
        id: screeningLotReferences.id,
        screeningOperationId: screeningLotReferences.screeningOperationId,
        lotId: screeningLotReferences.lotId,
        percentage: screeningLotReferences.percentage,
        animalCount: screeningLotReferences.animalCount,
        lot: {
          id: lots.id,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          arrivalDate: lots.arrivalDate,
          quality: lots.quality
        }
      })
      .from(screeningLotReferences)
      .leftJoin(lots, eq(screeningLotReferences.lotId, lots.id))
      .where(eq(screeningLotReferences.screeningOperationId, id));

    const result = {
      screening,
      sourceBaskets,
      destinationBaskets,
      lotReferences
    };

    screeningCache.set(cacheKey, result);
    return result;
  }

  /**
   * GET /api/screening/next-number
   * Ottieni il prossimo numero di vagliatura disponibile
   */
  async getNextScreeningNumber(): Promise<number> {
    const [result] = await db
      .select({ maxNumber: sql<number>`COALESCE(MAX(${screeningOperations.screeningNumber}), 0)` })
      .from(screeningOperations);
    
    return (result?.maxNumber || 0) + 1;
  }

  /**
   * GET /api/screening/operations
   * Lista operazioni di screening filtrate per status
   */
  async getScreeningOperations(status?: string) {
    const query = db
      .select()
      .from(screeningOperations)
      .orderBy(desc(screeningOperations.date), desc(screeningOperations.screeningNumber));

    if (status) {
      return await query.where(eq(screeningOperations.status, status));
    }

    return await query;
  }

  /**
   * POST /api/screening/operations
   * Crea una nuova operazione di screening
   */
  async createScreeningOperation(data: any) {
    const [result] = await db
      .insert(screeningOperations)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * PATCH /api/screening/operations/:id
   * Aggiorna un'operazione di screening
   */
  async updateScreeningOperation(id: number, data: any) {
    const [result] = await db
      .update(screeningOperations)
      .set(data)
      .where(eq(screeningOperations.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * POST /api/screening/operations/:id/complete
   * Completa un'operazione di screening
   */
  async completeScreeningOperation(id: number) {
    const [result] = await db
      .update(screeningOperations)
      .set({ status: 'completed' })
      .where(eq(screeningOperations.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * POST /api/screening/operations/:id/cancel
   * Annulla un'operazione di screening
   */
  async cancelScreeningOperation(id: number) {
    const [result] = await db
      .update(screeningOperations)
      .set({ status: 'cancelled' })
      .where(eq(screeningOperations.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Source Baskets Methods
  async getSourceBaskets(screeningId: number) {
    return await db
      .select()
      .from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningOperationId, screeningId));
  }

  async createSourceBasket(data: any) {
    const [result] = await db
      .insert(screeningSourceBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateSourceBasket(id: number, data: any) {
    const [result] = await db
      .update(screeningSourceBaskets)
      .set(data)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async dismissSourceBasket(id: number) {
    const [result] = await db
      .update(screeningSourceBaskets)
      .set({ 
        status: 'dismissed',
        dismissedAt: new Date()
      })
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteSourceBasket(id: number) {
    const [result] = await db
      .delete(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Destination Baskets Methods
  async getDestinationBaskets(screeningId: number) {
    return await db
      .select()
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningOperationId, screeningId));
  }

  async createDestinationBasket(data: any) {
    const [result] = await db
      .insert(screeningDestinationBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateDestinationBasket(id: number, data: any) {
    const [result] = await db
      .update(screeningDestinationBaskets)
      .set(data)
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async assignPosition(id: number, position: any) {
    const [result] = await db
      .update(screeningDestinationBaskets)
      .set({ 
        targetPosition: position,
        positionAssigned: true 
      })
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteDestinationBasket(id: number) {
    const [result] = await db
      .delete(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // History and Lot References Methods
  async createHistory(data: any) {
    return await db
      .insert(screeningBasketHistory)
      .values(data)
      .returning();
  }

  async createLotReference(data: any) {
    const [result] = await db
      .insert(screeningLotReferences)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }
}

export const screeningService = new ScreeningService();
