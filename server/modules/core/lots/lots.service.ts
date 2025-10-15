import { storage } from "../../../storage";
import { db } from "../../../db";
import { lots, sizes } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import NodeCache from "node-cache";

// Cache per lotti (TTL: 60 secondi)
const lotsCache = new NodeCache({ stdTTL: 60 });

export class LotsService {
  /**
   * Get all lots with optional size information
   */
  async getAllLots(includeSizes: boolean = true) {
    const cacheKey = `all-lots-${includeSizes}`;
    const cached = lotsCache.get(cacheKey);
    if (cached) {
      console.log("📦 LOTS SERVICE: Returning cached lots");
      return cached;
    }

    const allLots = await storage.getLots();

    if (!includeSizes) {
      lotsCache.set(cacheKey, allLots);
      return allLots;
    }

    const lotsWithSizes = await Promise.all(
      allLots.map(async (lot) => {
        const size = lot.sizeId ? await storage.getSize(lot.sizeId) : null;
        return { ...lot, size };
      })
    );

    lotsCache.set(cacheKey, lotsWithSizes);
    return lotsWithSizes;
  }

  /**
   * Get optimized lots with filtering
   */
  async getOptimizedLots(filters?: { 
    state?: string; 
    supplier?: string;
    quality?: string;
    dateFrom?: string;
    dateTo?: string;
    sizeId?: string;
  }) {
    const [lotsData, allSizes] = await Promise.all([
      storage.getLots(),
      storage.getSizes()
    ]);

    const sizesMap = new Map(allSizes.map(size => [size.id, size]));

    let lotsWithSizes = lotsData.map(lot => ({
      ...lot,
      size: lot.sizeId && sizesMap.has(lot.sizeId) 
        ? sizesMap.get(lot.sizeId) 
        : null
    }));

    // Apply filters
    if (filters?.state) {
      lotsWithSizes = lotsWithSizes.filter(lot => lot.state === filters.state);
    }
    if (filters?.supplier) {
      lotsWithSizes = lotsWithSizes.filter(lot => 
        lot.supplier.toLowerCase().includes(filters.supplier!.toLowerCase())
      );
    }
    if (filters?.quality) {
      lotsWithSizes = lotsWithSizes.filter(lot => lot.quality === filters.quality);
    }
    if (filters?.sizeId) {
      const sizeIdNum = parseInt(filters.sizeId);
      lotsWithSizes = lotsWithSizes.filter(lot => lot.sizeId === sizeIdNum);
    }
    if (filters?.dateFrom) {
      lotsWithSizes = lotsWithSizes.filter(lot => lot.arrivalDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      lotsWithSizes = lotsWithSizes.filter(lot => lot.arrivalDate <= filters.dateTo!);
    }

    return lotsWithSizes;
  }

  /**
   * Get active lots
   */
  async getActiveLots() {
    const cacheKey = "active-lots";
    const cached = lotsCache.get(cacheKey);
    if (cached) {
      console.log("📦 LOTS SERVICE: Returning cached active lots");
      return cached;
    }

    const activeLots = await db
      .select()
      .from(lots)
      .where(eq(lots.active, true))
      .orderBy(lots.supplier, lots.supplierLotNumber);

    lotsCache.set(cacheKey, activeLots);
    return activeLots;
  }

  /**
   * Get lot by ID
   */
  async getLotById(id: number) {
    return await storage.getLot(id);
  }

  /**
   * Get lot statistics
   */
  async getLotStats(lotId: number) {
    const lot = await storage.getLot(lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }

    // Get all operations for this lot
    const operations = await db.query.operations.findMany({
      where: (ops, { eq }) => eq(ops.lotId, lotId)
    });

    // Get active cycles count for this lot
    const activeCycles = await db.query.cycles.findMany({
      where: (cyc, { and, eq }) => 
        and(eq(cyc.lotId, lotId), eq(cyc.state, "active"))
    });

    return {
      lot,
      totalOperations: operations.length,
      activeCyclesCount: activeCycles.length,
      totalMortality: lot.totalMortality || 0,
      lastMortalityDate: lot.lastMortalityDate,
      operations: operations.slice(0, 10) // Last 10 operations
    };
  }

  /**
   * Get lot timeline from lot_ledger
   */
  async getLotTimeline(filters?: {
    page?: number;
    pageSize?: number;
    lotId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { lotLedger } = await import("@shared/schema");
    const { and, gte, lte, eq, desc } = await import("drizzle-orm");

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    
    const conditions = [];
    
    if (filters?.lotId) {
      conditions.push(eq(lotLedger.lotId, filters.lotId));
    }
    
    if (filters?.type && filters.type !== 'all') {
      conditions.push(eq(lotLedger.type, filters.type));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(lotLedger.date, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(lotLedger.date, filters.endDate));
    }

    // Get total count
    const allRecords = await db
      .select()
      .from(lotLedger)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(lotLedger.date));
      
    const totalCount = allRecords.length;
    
    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedRecords = allRecords.slice(startIndex, startIndex + pageSize);

    // Enrich with lot info
    const enrichedTimeline = await Promise.all(
      paginatedRecords.map(async (record) => {
        const lot = await storage.getLot(record.lotId);
        return {
          id: record.id,
          date: record.date,
          lotId: record.lotId,
          lotSupplierNumber: lot?.supplierLotNumber || '',
          lotSupplier: lot?.supplier || '',
          type: record.type,
          quantity: Math.abs(Number(record.quantity)),
          notes: record.notes,
          createdAt: record.createdAt
        };
      })
    );

    return {
      timeline: enrichedTimeline,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
  }

  /**
   * Create new lot
   */
  async createLot(lotData: any) {
    this.invalidateCache();
    storage.invalidateLotsCache();
    return await storage.createLot(lotData);
  }

  /**
   * Update lot
   */
  async updateLot(id: number, updateData: any) {
    this.invalidateCache();
    storage.invalidateLotsCache();
    return await storage.updateLot(id, updateData);
  }

  /**
   * Delete lot
   */
  async deleteLot(id: number) {
    this.invalidateCache();
    storage.invalidateLotsCache();
    return await storage.deleteLot(id);
  }

  /**
   * Refresh cache
   */
  refreshCache() {
    this.invalidateCache();
    // Invalida anche la cache del DbStorage
    storage.invalidateLotsCache();
    return { success: true, message: "Lots cache cleared" };
  }

  /**
   * Invalidate all lots cache
   */
  private invalidateCache() {
    lotsCache.flushAll();
    console.log("🧹 LOTS SERVICE: Cache invalidated");
  }
}

export const lotsService = new LotsService();
