import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * Servizio di cache intelligente per query SQL AI
 * 
 * Features:
 * - Cache basata su hash della query SQL
 * - TTL configurabile (default 30 minuti)
 * - Statistiche hit/miss ratio
 * - Invalidazione automatica via WebSocket
 */

interface CacheStats {
  hits: number;
  misses: number;
  totalQueries: number;
  hitRate: number;
}

interface CachedQueryResult {
  rows: any[];
  analysis: any;
  cachedAt: string;
  queryHash: string;
}

// Cache con TTL di 30 minuti (1800 secondi)
const queryCache = new NodeCache({ 
  stdTTL: 1800, 
  checkperiod: 120,
  useClones: false // Performance: evita deep clone
});

// Statistiche cache
let stats = {
  hits: 0,
  misses: 0,
  totalQueries: 0
};

/**
 * Genera hash univoco per una query SQL
 * Normalizza la query per evitare cache miss su differenze superficiali
 */
function generateQueryHash(sqlQuery: string): string {
  // Normalizza la query: rimuovi spazi multipli, tab, newline
  const normalized = sqlQuery
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16); // Primi 16 caratteri sono sufficienti
}

/**
 * Ottieni risultato dalla cache (se disponibile)
 */
export function getCachedQuery(sqlQuery: string): CachedQueryResult | null {
  const queryHash = generateQueryHash(sqlQuery);
  const cached = queryCache.get<CachedQueryResult>(queryHash);
  
  stats.totalQueries++;
  
  if (cached) {
    stats.hits++;
    console.log(`💾 CACHE HIT: ${queryHash} (${cached.rows.length} righe, cached at ${cached.cachedAt})`);
    return cached;
  }
  
  stats.misses++;
  console.log(`🔍 CACHE MISS: ${queryHash}`);
  return null;
}

/**
 * Salva risultato query in cache
 */
export function setCachedQuery(sqlQuery: string, rows: any[], analysis: any): void {
  const queryHash = generateQueryHash(sqlQuery);
  
  const cacheEntry: CachedQueryResult = {
    rows,
    analysis,
    cachedAt: new Date().toISOString(),
    queryHash
  };
  
  queryCache.set(queryHash, cacheEntry);
  console.log(`💾 CACHE SAVED: ${queryHash} (${rows.length} righe, TTL: 30min)`);
}

/**
 * Invalida tutta la cache (chiamata quando arrivano nuove operazioni)
 */
export function invalidateQueryCache(): void {
  const keysBefore = queryCache.keys().length;
  queryCache.flushAll();
  console.log(`🗑️ CACHE INVALIDATED: ${keysBefore} query cache entries cleared`);
}

/**
 * Invalida query specifiche che coinvolgono una tabella
 */
export function invalidateTableCache(tableName: string): void {
  const keys = queryCache.keys();
  let invalidated = 0;
  
  // Per semplicità, invalida tutto se la tabella è coinvolta
  // In futuro potremmo tracciare quali query usano quali tabelle
  queryCache.flushAll();
  invalidated = keys.length;
  
  if (invalidated > 0) {
    console.log(`🗑️ TABLE CACHE INVALIDATED: ${tableName} (${invalidated} entries)`);
  }
}

/**
 * Ottieni statistiche cache
 */
export function getCacheStats(): CacheStats {
  const hitRate = stats.totalQueries > 0 
    ? (stats.hits / stats.totalQueries) * 100 
    : 0;
  
  return {
    hits: stats.hits,
    misses: stats.misses,
    totalQueries: stats.totalQueries,
    hitRate: parseFloat(hitRate.toFixed(2))
  };
}

/**
 * Reset statistiche cache
 */
export function resetCacheStats(): void {
  stats = { hits: 0, misses: 0, totalQueries: 0 };
  console.log('📊 Cache stats reset');
}

/**
 * Ottieni informazioni sulla cache
 */
export function getCacheInfo() {
  return {
    keys: queryCache.keys().length,
    stats: getCacheStats(),
    ttl: 1800 // secondi
  };
}
