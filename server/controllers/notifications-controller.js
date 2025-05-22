/**
 * Controller ottimizzato per le notifiche
 * Implementa caching, paginazione e query ottimizzate per migliorare le prestazioni
 */

import { db } from "../db";
import { notifications } from "../../shared/schema";
import { and, eq, sql, desc, asc, isNull, ne } from "drizzle-orm";

/**
 * Servizio di cache per le notifiche
 */
class NotificationsCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = 60; // 1 minuto (in secondi)
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(options = {}) {
    const keys = Object.keys(options).sort();
    const keyParts = keys.map(key => `${key}_${options[key]}`);
    return `notifications_${keyParts.join('_')}`;
  }

  /**
   * Salva i risultati nella cache
   */
  set(key, data) {
    const expiresAt = Date.now() + (this.ttl * 1000);
    this.cache.set(key, { data, expiresAt });
    console.log(`Cache notifiche: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      console.log(`Cache notifiche: nessun dato trovato per chiave "${key}"`);
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      console.log(`Cache notifiche: dati scaduti per chiave "${key}"`);
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache notifiche: dati recuperati dalla cache per chiave "${key}"`);
    return cached.data;
  }

  /**
   * Elimina tutte le chiavi di cache
   */
  clear() {
    this.cache.clear();
    console.log("Cache notifiche: cache completamente svuotata");
  }

  /**
   * Invalida la cache quando i dati cambiano
   */
  invalidate() {
    console.log("Invalidazione cache notifiche");
    this.clear();
  }
}

// Esporta un'istanza singleton della cache
export const NotificationsCache = new NotificationsCacheService();

/**
 * Ottiene le notifiche con filtri avanzati e paginazione
 * Utilizza la cache per migliorare le prestazioni
 * 
 * @param {Object} options - Opzioni di filtro
 * @param {boolean} options.unreadOnly - Filtra solo le notifiche non lette
 * @param {string} options.type - Filtra per tipo di notifica
 * @param {number} options.page - Pagina corrente (default: 1)
 * @param {number} options.pageSize - Dimensione della pagina (default: 20)
 * @returns {Promise<Object>} - Notifiche filtrate con metadati di paginazione
 */
export async function getNotifications(options = {}) {
  const {
    unreadOnly = false,
    type = null,
    page = 1,
    pageSize = 20
  } = options;

  // Genera una chiave di cache basata sui parametri di filtro
  const cacheKey = NotificationsCache.generateCacheKey({ unreadOnly, type, page, pageSize });
  
  // Verifica se i dati sono nella cache
  const cached = NotificationsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`Richiesta notifiche con opzioni: ${JSON.stringify({ unreadOnly, type, page, pageSize })}`);
  const startTime = Date.now();

  try {
    // Costruisci i filtri in base alle opzioni
    const filters = [];
    
    if (unreadOnly) {
      filters.push(eq(notifications.isRead, false));
    }
    
    if (type) {
      filters.push(eq(notifications.type, type));
    }

    // Calcola l'offset per la paginazione
    const offset = (page - 1) * pageSize;

    // 1. Ottieni il conteggio totale delle notifiche con i filtri applicati
    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    
    const countQuery = db.select({ count: sql`count(*)` })
      .from(notifications);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const countResult = await countQuery;
    const totalCount = Number(countResult[0].count);
    
    // 2. Ottieni le notifiche paginate
    const query = db.select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset(offset);
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const results = await query;
    
    // Calcola i metadati di paginazione
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Converti le notifiche da snake_case a camelCase
    const formattedNotifications = results.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      data: notification.data
    }));
    
    // Prepara il risultato completo con metadati di paginazione
    const result = {
      success: true,
      notifications: formattedNotifications,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
    
    // Salva nella cache
    NotificationsCache.set(cacheKey, result);
    
    const duration = Date.now() - startTime;
    console.log(`Notifiche recuperate in ${duration}ms (ottimizzato)`);
    
    return result;
  } catch (error) {
    console.error("Errore nel recupero delle notifiche:", error);
    throw error;
  }
}

/**
 * Imposta una notifica come letta
 * 
 * @param {number} id - ID della notifica
 * @returns {Promise<Object>} - Risultato dell'operazione
 */
export async function markNotificationAsRead(id) {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    
    // Invalida la cache delle notifiche
    NotificationsCache.invalidate();
    
    return { success: true };
  } catch (error) {
    console.error("Errore durante l'aggiornamento della notifica:", error);
    throw error;
  }
}

/**
 * Configura l'invalidazione della cache per le notifiche
 */
export function setupNotificationsCacheInvalidation(app) {
  // Invalida la cache quando una notifica viene creata, aggiornata o eliminata
  const invalidateCache = () => NotificationsCache.invalidate();
  
  app.post('/api/notifications*', invalidateCache);
  app.put('/api/notifications*', invalidateCache);
  app.patch('/api/notifications*', invalidateCache);
  app.delete('/api/notifications*', invalidateCache);
  
  console.log("Sistema di invalidazione cache notifiche configurato con successo");
}