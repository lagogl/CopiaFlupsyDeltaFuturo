/**
 * Servizio di cache per i cestelli
 * 
 * Questo servizio fornisce un sistema di caching per l'endpoint GET /api/baskets
 * per migliorare significativamente i tempi di risposta.
 */

class BasketsCacheService {
  constructor(webSocketUtils = null) {
    this.cache = new Map();
    this.ttl = 120; // 2 minuti (in secondi)
    this.webSocketUtils = webSocketUtils;
    console.log('Servizio cache cestelli inizializzato');
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
    
    return `baskets_${filterKeys.join('_')}_${filterValues.join('_')}`;
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
    console.log(`Cache cestelli: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
    
    // Notifica WebSocket per aggiornamento cache
    if (this.webSocketUtils) {
      this.webSocketUtils.broadcastMessage('cache_invalidated', {
        type: 'baskets',
        action: 'saved',
        key: key
      });
    }
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   * @param {string} key - La chiave di cache
   * @returns {Object|null} - I dati memorizzati o null se non trovati/scaduti
   */
  get(key) {
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
    console.log(`Cache cestelli: eliminate ${count} chiavi con prefisso "${prefix}"`);
    
    // Notifica WebSocket per invalidazione cache
    if (this.webSocketUtils && count > 0) {
      this.webSocketUtils.broadcastMessage('cache_invalidated', {
        type: 'baskets',
        action: 'deleted_by_prefix',
        prefix: prefix,
        count: count
      });
    }
  }

  /**
   * Elimina una chiave specifica dalla cache
   * @param {string} key - La chiave da eliminare
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    console.log(`Cache cestelli: chiave "${key}" ${deleted ? 'eliminata' : 'non trovata'}`);
  }

  /**
   * Svuota l'intera cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`Cache cestelli: svuotata (${size} chiavi eliminate)`);
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

  /**
   * Imposta il sistema WebSocket per le notifiche
   * @param {Object} webSocketUtils - Utilità WebSocket
   */
  setWebSocketUtils(webSocketUtils) {
    this.webSocketUtils = webSocketUtils;
    console.log('WebSocket utils configurato per il servizio cache cestelli');
  }
}

// Esporta un'istanza singleton del servizio
export const BasketsCache = new BasketsCacheService();