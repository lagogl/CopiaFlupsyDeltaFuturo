/**
 * Servizio di caching per l'applicazione
 * Implementa un sistema di caching in-memory con TTL (Time-To-Live)
 */

// Tipo di entry della cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Tempo di vita in millisecondi
}

// Cache globale
const cache = new Map<string, CacheEntry<any>>();

/**
 * Classe che gestisce il caching dei dati
 */
export class CacheService {
  /**
   * Ottiene un valore dalla cache se esiste e non è scaduto
   * @param key Chiave del valore da recuperare
   * @returns Il valore se presente e non scaduto, altrimenti undefined
   */
  static get<T>(key: string): T | undefined {
    const entry = cache.get(key);
    
    // Se l'entry non esiste, ritorna undefined
    if (!entry) return undefined;
    
    // Se l'entry è scaduta, la rimuove e ritorna undefined
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return undefined;
    }
    
    // Altrimenti ritorna il valore
    return entry.data;
  }
  
  /**
   * Salva un valore nella cache
   * @param key Chiave del valore da salvare
   * @param data Valore da salvare
   * @param ttl Tempo di vita in millisecondi (default: 5 minuti)
   */
  static set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * Rimuove un valore dalla cache
   * @param key Chiave del valore da rimuovere
   */
  static delete(key: string): void {
    cache.delete(key);
  }
  
  /**
   * Rimuove tutti i valori che iniziano con un certo prefisso
   * Utile per invalidare gruppi di cache correlati
   * @param prefix Prefisso delle chiavi da rimuovere
   */
  static deleteByPrefix(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }
  
  /**
   * Recupera un valore dalla cache o lo genera chiamando una funzione
   * @param key Chiave del valore da recuperare/generare
   * @param generator Funzione che genera il valore se non presente in cache
   * @param ttl Tempo di vita in millisecondi (default: 5 minuti)
   * @returns Il valore recuperato o generato
   */
  static async getOrSet<T>(
    key: string, 
    generator: () => Promise<T>, 
    ttl = 5 * 60 * 1000
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const generatedValue = await generator();
    this.set(key, generatedValue, ttl);
    
    return generatedValue;
  }
  
  /**
   * Pulisce le entry scadute dalla cache
   */
  static cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key);
      }
    }
  }
  
  /**
   * Restituisce statistiche sulla cache
   */
  static getStats() {
    const now = Date.now();
    let totalEntries = 0;
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of cache.values()) {
      totalEntries++;
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries,
      validEntries,
      expiredEntries,
      cacheSize: JSON.stringify(Array.from(cache.entries())).length
    };
  }
}

// Avvia un processo periodico per pulire le entry scadute (ogni 10 minuti)
setInterval(() => {
  CacheService.cleanExpired();
}, 10 * 60 * 1000);