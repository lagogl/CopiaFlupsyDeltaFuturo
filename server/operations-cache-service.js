/**
 * Servizio di cache per le operazioni
 * 
 * Questo servizio fornisce un sistema di caching per l'endpoint GET /api/operations
 * per migliorare significativamente i tempi di risposta.
 */

class OperationsCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 120; // 2 minuti (in secondi)
    console.log('Servizio cache operazioni inizializzato');
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   * @param {Object} filters - I filtri applicati alla query
   * @returns {string} - La chiave di cache
   */
  generateCacheKey(filters = {}) {
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
    
    return `operations_${filterKeys.join('_')}_${filterValues.join('_')}`;
  }

  /**
   * Salva i risultati nella cache
   * @param {string} key - La chiave di cache
   * @param {Object} data - I dati da memorizzare
   */
  set(key, data) {
    const expiresAt = Date.now() + (this.ttl * 1000);
    this.cache.set(key, {
      data,
      expiresAt
    });
    console.log(`Cache: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   * @param {string} key - La chiave di cache
   * @returns {Object|null} - I dati memorizzati o null se non trovati/scaduti
   */
  get(key) {
    const cachedItem = this.cache.get(key);
    
    if (!cachedItem) {
      console.log(`Cache: nessun dato trovato per chiave "${key}"`);
      return null;
    }
    
    // Verifica se la cache è scaduta
    if (Date.now() > cachedItem.expiresAt) {
      console.log(`Cache: dati scaduti per chiave "${key}"`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache: hit per chiave "${key}"`);
    return cachedItem.data;
  }

  /**
   * Elimina tutte le chiavi di cache che iniziano con un prefisso specifico
   * @param {string} prefix - Il prefisso da cercare
   */
  deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`Cache: eliminate ${count} chiavi con prefisso "${prefix}"`);
  }

  /**
   * Elimina una chiave specifica dalla cache
   * @param {string} key - La chiave da eliminare
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    console.log(`Cache: chiave "${key}" ${deleted ? 'eliminata' : 'non trovata'}`);
  }

  /**
   * Svuota l'intera cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`Cache: svuotata (${size} chiavi eliminate)`);
  }

  /**
   * Restituisce statistiche sulla cache
   * @returns {Object} - Statistiche sulla cache
   */
  getStats() {
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
export const OperationsCache = new OperationsCacheService();