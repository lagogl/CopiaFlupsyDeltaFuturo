import { storage } from "../../../storage";
import NodeCache from "node-cache";

// Cache per SGR (TTL: 180 secondi = 3 minuti)
const sgrCache = new NodeCache({ stdTTL: 180 });

export class SgrService {
  /**
   * Get all SGR (monthly)
   */
  async getAllSgr() {
    const cacheKey = "all-sgr";
    const cached = sgrCache.get(cacheKey);
    if (cached) {
      console.log("📦 SGR SERVICE: Returning cached SGR");
      return cached;
    }

    const sgrs = await storage.getSgrs();
    sgrCache.set(cacheKey, sgrs);
    return sgrs;
  }

  /**
   * Get SGR by ID
   */
  async getSgrById(id: number) {
    return await storage.getSgr(id);
  }

  /**
   * Get SGR by month
   */
  async getSgrByMonth(month: string) {
    return await storage.getSgrByMonth(month);
  }

  /**
   * Create new SGR
   */
  async createSgr(sgrData: any) {
    this.invalidateCache();
    return await storage.createSgr(sgrData);
  }

  /**
   * Update SGR
   */
  async updateSgr(id: number, updateData: any) {
    this.invalidateCache();
    return await storage.updateSgr(id, updateData);
  }

  /**
   * Get all SGR Giornalieri (daily)
   */
  async getAllSgrGiornalieri() {
    const cacheKey = "all-sgr-giornalieri";
    const cached = sgrCache.get(cacheKey);
    if (cached) {
      console.log("📦 SGR SERVICE: Returning cached SGR Giornalieri");
      return cached;
    }

    const sgrGiornalieri = await storage.getSgrGiornalieri();
    sgrCache.set(cacheKey, sgrGiornalieri);
    return sgrGiornalieri;
  }

  /**
   * Get SGR Giornaliero by ID
   */
  async getSgrGiornalieroById(id: number) {
    return await storage.getSgrGiornaliero(id);
  }

  /**
   * Get SGR Giornalieri by date range
   */
  async getSgrGiornalieriByDateRange(startDate: string, endDate: string) {
    return await storage.getSgrGiornalieriByDateRange(new Date(startDate), new Date(endDate));
  }

  /**
   * Create new SGR Giornaliero
   */
  async createSgrGiornaliero(sgrData: any) {
    this.invalidateCache();
    return await storage.createSgrGiornaliero(sgrData);
  }

  /**
   * Update SGR Giornaliero
   */
  async updateSgrGiornaliero(id: number, updateData: any) {
    this.invalidateCache();
    return await storage.updateSgrGiornaliero(id, updateData);
  }

  /**
   * Delete SGR Giornaliero
   */
  async deleteSgrGiornaliero(id: number) {
    this.invalidateCache();
    return await storage.deleteSgrGiornaliero(id);
  }

  /**
   * Invalidate all SGR cache
   */
  private invalidateCache() {
    sgrCache.flushAll();
    console.log("🧹 SGR SERVICE: Cache invalidated");
  }
}

export const sgrService = new SgrService();
