import NodeCache from 'node-cache';

// Default TTL for cache entries is 5 minutes (300 seconds)
const DEFAULT_TTL = 300;

/**
 * Cache service for server-side caching
 * Uses node-cache for in-memory caching
 */
class CacheService {
  private cache: NodeCache;
  
  constructor(ttlSeconds: number = DEFAULT_TTL) {
    this.cache = new NodeCache({ 
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2, // Check for expired keys at 20% of TTL
      useClones: false  // For better performance, don't clone objects
    });
    
    console.log(`Cache service initialized with TTL of ${ttlSeconds} seconds`);
  }
  
  /**
   * Get a value from cache
   * @param key The cache key
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }
  
  /**
   * Set a value in cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Optional TTL in seconds for this specific key
   * @returns true if successful
   */
  set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): boolean {
    return this.cache.set(key, value, ttl);
  }
  
  /**
   * Delete a value from cache
   * @param key The cache key to delete
   * @returns true if successful
   */
  del(key: string): boolean {
    return this.cache.del(key) > 0;
  }
  
  /**
   * Flush the entire cache
   */
  flush(): void {
    this.cache.flushAll();
  }
  
  /**
   * Get a value from cache if exists, otherwise execute the provided function,
   * cache the result, and return it
   * @param key The cache key
   * @param fn The function to execute if cache miss
   * @param ttl Optional TTL in seconds
   * @returns The result either from cache or from the function execution
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    const value = this.get<T>(key);
    if (value !== undefined) {
      console.log(`Cache hit for key: ${key}`);
      return value;
    }
    
    console.log(`Cache miss for key: ${key}`);
    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }
  
  /**
   * Invalidate cache keys based on a pattern
   * @param pattern The pattern to match (string or RegExp)
   */
  invalidate(pattern: string | RegExp): void {
    const keys = this.cache.keys();
    
    const keysToDelete = typeof pattern === 'string'
      ? keys.filter(key => key.includes(pattern))
      : keys.filter(key => pattern.test(key));
    
    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => this.cache.del(key));
      console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    }
  }
  
  /**
   * Ottiene statistiche sulla cache
   * @returns Oggetto con statistiche sulla cache
   */
  getStats(): {keys: number, hits: number, misses: number, ksize: number, vsize: number} {
    return this.cache.getStats();
  }
  
  /**
   * Registra le prestazioni della cache
   * Utile per monitorare l'efficacia della cache
   */
  logPerformance(): void {
    const stats = this.getStats();
    const hitRatio = stats.hits > 0 
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) 
      : 0;
    
    console.log(`Cache performance: ${stats.keys} keys, ${hitRatio}% hit ratio (${stats.hits} hits, ${stats.misses} misses)`);
  }
}

// Create a singleton instance
const cacheService = new CacheService();

export default cacheService;