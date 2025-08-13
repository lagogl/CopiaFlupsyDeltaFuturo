/**
 * Servizio di cache per i cestelli
 * 
 * Questo servizio fornisce un sistema di caching per l'endpoint GET /api/baskets
 * per migliorare significativamente i tempi di risposta.
 */

interface CacheItem {
  data: any;
  expiresAt: number;
}

interface CacheStats {
  size: number;
  validEntries: number;
  expiredEntries: number;
}

class BasketsCacheService {
  private cache: Map<string, CacheItem>;
  private ttl: number;

  constructor() {
    this.cache = new Map();
    this.ttl = 600; // 10 minuti (in secondi) - esteso per ridurre query DB
    console.log('Servizio cache cestelli inizializzato con cache estesa (10 minuti)');
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(filters: Record<string, any> = {}): string {
    // Converti i filtri in una stringa stabile (ordine alfabetico delle chiavi)
    const filterKeys = Object.keys(filters).sort();
    const filterValues = filterKeys.map(key => {
      const value = filters[key];
      // Gestisci date in modo coerente
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return String(value);
    });
    
    return `baskets_${filterKeys.join('_')}_${filterValues.join('_')}`;
  }

  /**
   * Salva i risultati nella cache
   */
  set(key: string, data: any): void {
    const expiresAt = Date.now() + (this.ttl * 1000);
    this.cache.set(key, {
      data,
      expiresAt
    });
    console.log(`Cache cestelli: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   */
  get(key: string): any | null {
    const cachedItem = this.cache.get(key);
    
    if (!cachedItem) {
      console.log(`Cache cestelli: nessun dato trovato per chiave "${key}"`);
      return null;
    }
    
    // Verifica se la cache è scaduta
    if (Date.now() > cachedItem.expiresAt) {
      console.log(`Cache cestelli: dati scaduti per chiave "${key}"`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache cestelli: hit per chiave "${key}"`);
    return cachedItem.data;
  }

  /**
   * Elimina tutte le chiavi di cache che iniziano con un prefisso specifico
   */
  deleteByPrefix(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`Cache cestelli: eliminate ${count} chiavi con prefisso "${prefix}"`);
  }

  /**
   * Elimina una chiave specifica dalla cache
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    console.log(`Cache cestelli: chiave "${key}" ${deleted ? 'eliminata' : 'non trovata'}`);
  }

  /**
   * Svuota l'intera cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`Cache cestelli: svuotata (${size} chiavi eliminate)`);
  }

  /**
   * Restituisce statistiche sulla cache
   */
  getStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    this.cache.forEach(item => {
      if (now <= item.expiresAt) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      size: this.cache.size,
      validEntries,
      expiredEntries
    };
  }
}

// Esporta un'istanza singleton del servizio
export const BasketsCache = new BasketsCacheService();