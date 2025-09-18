/**
 * Simple in-memory cache for basket position histories
 * Since position changes are infrequent, caching for 5 minutes is safe
 */

interface CachedPositionData {
  basketExists: boolean;
  positions: any[];
  timestamp: number;
}

class PositionCacheService {
  private cache: Map<number, CachedPositionData> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  set(basketId: number, data: { basketExists: boolean; positions: any[] }): void {
    this.cache.set(basketId, {
      ...data,
      timestamp: Date.now()
    });
  }

  get(basketId: number): { basketExists: boolean; positions: any[] } | null {
    const cached = this.cache.get(basketId);
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(basketId);
      return null;
    }

    return {
      basketExists: cached.basketExists,
      positions: cached.positions
    };
  }

  invalidate(basketId: number): void {
    this.cache.delete(basketId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).map(key => `basket_${key}`)
    };
  }
}

export const positionCache = new PositionCacheService();
export { PositionCacheService };