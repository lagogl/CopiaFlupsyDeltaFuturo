import { Request, Response, NextFunction } from "express";

// Static asset patterns that should be cached
const STATIC_ASSET_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|otf)$/i,
  /^\/assets\//,
  /^\/images\//,
  /^\/static\//,
  /^\/public\//,
  /^\/dist\//,
  /^\/build\//,
  /\.map$/i
];

// API patterns that should never be cached
const NO_CACHE_PATTERNS = [
  /^\/api\//,
  /^\/auth\//,
  /^\/login/,
  /^\/logout/,
  /^\/admin\//,
  /^\/dashboard\//,
  /\/ws$/,
  /\/websocket/
];

// Sensitive API patterns that need extra security headers
const SENSITIVE_API_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/login/,
  /^\/api\/user/,
  /^\/api\/admin/,
  /^\/api\/settings/,
  /^\/api\/config/,
  /^\/api\/keys/,
  /^\/api\/tokens/,
  /password/i,
  /secret/i
];

interface CacheConfig {
  enableCaching: boolean;
  staticAssetCacheDuration: number; // in seconds
  apiCacheDuration: number; // in seconds for non-sensitive APIs
  enableSecurityHeaders: boolean;
}

function getCacheConfig(): CacheConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    enableCaching: isProduction, // Only enable smart caching in production
    staticAssetCacheDuration: isProduction ? 31536000 : 0, // 1 year in production, no cache in dev
    apiCacheDuration: 0, // Never cache API responses
    enableSecurityHeaders: true
  };
}

function isStaticAsset(path: string): boolean {
  return STATIC_ASSET_PATTERNS.some(pattern => pattern.test(path));
}

function isApiEndpoint(path: string): boolean {
  return NO_CACHE_PATTERNS.some(pattern => pattern.test(path));
}

function isSensitiveApi(path: string): boolean {
  return SENSITIVE_API_PATTERNS.some(pattern => pattern.test(path));
}

function getContentType(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    'js': 'application/javascript',
    'css': 'text/css',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf'
  };
  
  return ext ? contentTypes[ext] || null : null;
}

export function createSmartCacheMiddleware() {
  const config = getCacheConfig();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Set security headers for all responses
    if (config.enableSecurityHeaders) {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      
      // Only set HSTS in production with HTTPS
      if (process.env.NODE_ENV === 'production' && req.secure) {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    }
    
    // Handle static assets
    if (isStaticAsset(path)) {
      if (config.enableCaching && config.staticAssetCacheDuration > 0) {
        // Long-term caching for static assets in production
        res.header('Cache-Control', `public, max-age=${config.staticAssetCacheDuration}, immutable`);
        res.header('Expires', new Date(Date.now() + config.staticAssetCacheDuration * 1000).toUTCString());
        
        // Set proper content type
        const contentType = getContentType(path);
        if (contentType) {
          res.header('Content-Type', contentType);
        }
        
        // Set ETag for efficient caching
        res.header('ETag', `"${Date.now()}"`);
      } else {
        // Development: short cache to allow updates
        res.header('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
    // Handle API endpoints
    else if (isApiEndpoint(path)) {
      // Always no-cache for APIs
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      
      // Extra security for sensitive APIs
      if (isSensitiveApi(path)) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0, no-transform');
        res.header('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
        
        // Remove potentially identifying headers
        res.removeHeader('ETag');
        res.removeHeader('Last-Modified');
      }
    }
    // Handle HTML pages and other content
    else {
      if (config.enableCaching) {
        // Short cache for HTML pages in production to allow updates
        res.header('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 minutes
      } else {
        // Development: no cache for HTML to see changes immediately
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
      }
    }
    
    // Always set Vary header to handle different clients
    res.header('Vary', 'Accept-Encoding, User-Agent');
    
    next();
  };
}

// Middleware specifically for Replit preview environment
export function createReplitPreviewCacheMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // In Replit preview, we want to see changes immediately for development
    // but still allow some basic caching for static assets
    if (isStaticAsset(path)) {
      // Very short cache for static assets in preview
      res.header('Cache-Control', 'public, max-age=30'); // 30 seconds
    } else {
      // No cache for everything else in preview
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      res.header('ETag', Date.now().toString());
    }
    
    next();
  };
}

// Log cache strategy for debugging
export function logCacheStrategy(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') {
    const path = req.path;
    let strategy = 'unknown';
    
    if (isStaticAsset(path)) {
      strategy = 'static-asset-cache';
    } else if (isSensitiveApi(path)) {
      strategy = 'sensitive-api-no-cache';
    } else if (isApiEndpoint(path)) {
      strategy = 'api-no-cache';
    } else {
      strategy = 'html-short-cache';
    }
    
    console.log(`[CACHE-STRATEGY] ${req.method} ${path} -> ${strategy}`);
  }
  
  next();
}