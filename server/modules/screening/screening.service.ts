import { db } from '../../db';
import { 
  selections, 
  selectionSourceBaskets, 
  selectionDestinationBaskets,
  selectionBasketHistory,
  selectionLotReferences,
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
   * Pattern dall'app funzionante: query semplici + aggregazione lato app
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

    // 1. Count totale per paginazione (con filtro status)
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(selections)
      .where(eq(selections.status, status));

    // 2. Query principale semplice con filtro status
    const screenings = await db
      .select()
      .from(selections)
      .where(eq(selections.status, status))
      .orderBy(desc(selections.date), desc(selections.selectionNumber))
      .limit(pageSize)
      .offset(offset);

    // 3. Arricchisci con conteggi - Pattern dall'app funzionante
    const enrichedScreenings = await Promise.all(screenings.map(async (screening) => {
      // Query separate per source e destination baskets
      const sourceBaskets = await db
        .select()
        .from(selectionSourceBaskets)
        .where(eq(selectionSourceBaskets.selectionId, screening.id));

      const destBaskets = await db
        .select()
        .from(selectionDestinationBaskets)
        .where(eq(selectionDestinationBaskets.selectionId, screening.id));

      // Calcola totali lato applicazione con reduce()
      const totalSourceAnimals = sourceBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
      const totalDestAnimals = destBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);

      return {
        ...screening,
        sourceCount: sourceBaskets.length,
        destinationCount: destBaskets.length,
        totalSourceAnimals,
        totalDestAnimals,
        mortalityAnimals: totalSourceAnimals - totalDestAnimals
      };
    }));

    const result = {
      screenings: enrichedScreenings,
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
    console.log(`🚀 SCREENING: Cache SAVED (${enrichedScreenings.length} screenings) - query completata in ${elapsedTime}ms`);
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
      .from(selections)
      .where(eq(selections.id, id));

    if (!screening) {
      return null;
    }

    // Source baskets con dettagli
    const sourceBaskets = await db
      .select({
        id: selectionSourceBaskets.id,
        screeningOperationId: selectionSourceBaskets.selectionId,
        basketId: selectionSourceBaskets.basketId,
        cycleId: selectionSourceBaskets.cycleId,
        animalCount: selectionSourceBaskets.animalCount,
        averageWeight: selectionSourceBaskets.averageWeight,
        status: selectionSourceBaskets.status,
        dismissedAt: selectionSourceBaskets.dismissedAt,
        notes: selectionSourceBaskets.notes,
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
      .from(selectionSourceBaskets)
      .leftJoin(baskets, eq(selectionSourceBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(selectionSourceBaskets.cycleId, cycles.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(selectionSourceBaskets.selectionId, id));

    // Destination baskets con dettagli
    const destinationBaskets = await db
      .select({
        id: selectionDestinationBaskets.id,
        screeningOperationId: selectionDestinationBaskets.selectionId,
        basketId: selectionDestinationBaskets.basketId,
        cycleId: selectionDestinationBaskets.cycleId,
        sizeId: selectionDestinationBaskets.sizeId,
        animalCount: selectionDestinationBaskets.animalCount,
        averageWeight: selectionDestinationBaskets.averageWeight,
        targetPosition: selectionDestinationBaskets.targetPosition,
        positionAssigned: selectionDestinationBaskets.positionAssigned,
        notes: selectionDestinationBaskets.notes,
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
      .from(selectionDestinationBaskets)
      .leftJoin(baskets, eq(selectionDestinationBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(selectionDestinationBaskets.cycleId, cycles.id))
      .leftJoin(sizes, eq(selectionDestinationBaskets.sizeId, sizes.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(selectionDestinationBaskets.selectionId, id));

    // Lot references
    const lotReferences = await db
      .select({
        id: selectionLotReferences.id,
        screeningOperationId: selectionLotReferences.selectionId,
        lotId: selectionLotReferences.lotId,
        percentage: selectionLotReferences.percentage,
        animalCount: selectionLotReferences.animalCount,
        lot: {
          id: lots.id,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          arrivalDate: lots.arrivalDate,
          quality: lots.quality
        }
      })
      .from(selectionLotReferences)
      .leftJoin(lots, eq(selectionLotReferences.lotId, lots.id))
      .where(eq(selectionLotReferences.selectionId, id));

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
      .select({ maxNumber: sql<number>`COALESCE(MAX(${selections.selectionNumber}), 0)` })
      .from(selections);
    
    return (result?.maxNumber || 0) + 1;
  }

  /**
   * GET /api/screening/operations
   * Lista operazioni di screening filtrate per status
   */
  async getScreeningOperations(status?: string) {
    const query = db
      .select()
      .from(selections)
      .orderBy(desc(selections.date), desc(selections.selectionNumber));

    if (status) {
      return await query.where(eq(selections.status, status));
    }

    return await query;
  }

  /**
   * POST /api/screening/operations
   * Crea una nuova operazione di screening
   */
  async createScreeningOperation(data: any) {
    const [result] = await db
      .insert(selections)
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
      .update(selections)
      .set(data)
      .where(eq(selections.id, id))
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
      .update(selections)
      .set({ status: 'completed' })
      .where(eq(selections.id, id))
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
      .update(selections)
      .set({ status: 'cancelled' })
      .where(eq(selections.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Source Baskets Methods
  async getSourceBaskets(screeningId: number) {
    return await db
      .select()
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, screeningId));
  }

  async createSourceBasket(data: any) {
    const [result] = await db
      .insert(selectionSourceBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateSourceBasket(id: number, data: any) {
    const [result] = await db
      .update(selectionSourceBaskets)
      .set(data)
      .where(eq(selectionSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async dismissSourceBasket(id: number) {
    const [result] = await db
      .update(selectionSourceBaskets)
      .set({ 
        status: 'dismissed',
        dismissedAt: new Date()
      })
      .where(eq(selectionSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteSourceBasket(id: number) {
    const [result] = await db
      .delete(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Destination Baskets Methods
  async getDestinationBaskets(screeningId: number) {
    return await db
      .select()
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, screeningId));
  }

  async createDestinationBasket(data: any) {
    const [result] = await db
      .insert(selectionDestinationBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateDestinationBasket(id: number, data: any) {
    const [result] = await db
      .update(selectionDestinationBaskets)
      .set(data)
      .where(eq(selectionDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async assignPosition(id: number, position: any) {
    const [result] = await db
      .update(selectionDestinationBaskets)
      .set({ 
        targetPosition: position,
        positionAssigned: true 
      })
      .where(eq(selectionDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteDestinationBasket(id: number) {
    const [result] = await db
      .delete(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // History and Lot References Methods
  async createHistory(data: any) {
    return await db
      .insert(selectionBasketHistory)
      .values(data)
      .returning();
  }

  async createLotReference(data: any) {
    const [result] = await db
      .insert(selectionLotReferences)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }
}

export const screeningService = new ScreeningService();
