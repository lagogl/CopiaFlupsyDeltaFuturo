import { Request, Response, NextFunction } from 'express';
import cacheService from '../lib/cache-service';

// Map of routes to their cache TTL in seconds
const CACHE_TTL_MAP: Record<string, number> = {
  // These routes can be cached for longer periods as they change less frequently
  '/api/flupsys': 3600, // 1 hour
  '/api/sizes': 3600,   // 1 hour
  '/api/sgrs': 3600,    // 1 hour
  
  // These routes change more frequently but still benefit from short-term caching
  '/api/baskets': 300,   // 5 minutes
  '/api/operations': 300,
  '/api/cycles': 300,
  '/api/lots': 300,
  '/api/dashboard-data': 300,
  '/api/statistics/cycles/comparison': 300,
  '/api/cycles/active': 300,
  '/api/cycles/active-with-details': 300,
  
  // Forecast data from external services can be cached
  '/api/proxy/tide-data': 1800,   // 30 minutes
  '/api/proxy/tide-forecast': 1800
};

/**
 * Middleware to cache API responses
 * 
 * Caches GET requests based on URL path and query parameters
 * Skips caching for other HTTP methods that mutate data
 */
export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Create a cache key from the full URL path and query params
  const cacheKey = `${req.originalUrl || req.url}`;
  
  // Skip caching for paths not in the TTL map
  const basePath = req.path.split('?')[0];
  const ttl = CACHE_TTL_MAP[basePath];
  if (!ttl) {
    return next();
  }
  
  // Check if we have a cached response
  const cachedData = cacheService.get<{data: any, timestamp: number}>(cacheKey);
  if (cachedData) {
    // Calculate how long ago the cache was created
    const age = Math.round((Date.now() - cachedData.timestamp) / 1000);
    
    // Send the cached response with cache headers
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Cache-Age', `${age}`);
    return res.json(cachedData.data);
  }
  
  // Cache miss, override res.json to cache the response before sending
  const originalJson = res.json;
  res.json = function(data) {
    // Store the response data in cache
    const responseData = {
      data,
      timestamp: Date.now()
    };
    cacheService.set(cacheKey, responseData, ttl);
    
    // Set cache headers
    res.setHeader('X-Cache', 'MISS');
    
    // Call the original json method
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware to invalidate cache based on incoming WebSocket events
 * This should be called when mutations happen via POST/PUT/DELETE operations
 * 
 * @param pattern Pattern to match in cache keys (string or RegExp)
 */
export function invalidateCache(pattern: string | RegExp) {
  cacheService.invalidate(pattern);
}