import { db } from "../db";
import { notifications, insertNotificationSchema, type InsertNotification } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Request, Response } from "express";

/**
 * Servizio di cache per le notifiche
 */
class NotificationsCacheService {
  private cache: Map<string, { data: any; expiresAt: number }>;
  private ttl: number;

  constructor() {
    this.cache = new Map();
    this.ttl = 300; // 5 minuti (in secondi) - esteso per ridurre query DB
  }

  /**
   * Genera una chiave di cache basata sui parametri di filtro
   */
  generateCacheKey(options: Record<string, any> = {}): string {
    const keys = Object.keys(options).sort();
    const keyParts = keys.map(key => `${key}_${options[key]}`);
    return `notifications_${keyParts.join('_')}`;
  }

  /**
   * Salva i risultati nella cache
   */
  set(key: string, data: any): void {
    const expiresAt = Date.now() + (this.ttl * 1000);
    this.cache.set(key, { data, expiresAt });
    console.log(`Cache notifiche: dati salvati con chiave "${key}", scadenza in ${this.ttl} secondi`);
  }

  /**
   * Recupera i dati dalla cache se presenti e non scaduti
   */
  get(key: string): any | null {
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
  clear(): void {
    this.cache.clear();
    console.log("Cache notifiche: cache completamente svuotata");
  }

  /**
   * Invalida la cache quando i dati cambiano
   */
  invalidate(): void {
    console.log("Invalidazione cache notifiche");
    this.clear();
  }
}

// Esporta un'istanza singleton della cache
export const NotificationsCache = new NotificationsCacheService();

/**
 * Ottiene tutte le notifiche, con opzione per filtrare solo quelle non lette
 * Versione ottimizzata con cache e paginazione
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    
    // Parametri di query
    const unreadOnly = req.query.unreadOnly === 'true';
    const type = req.query.type ? String(req.query.type) : null;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    
    // Genera una chiave di cache basata sui parametri di filtro
    const cacheKey = NotificationsCache.generateCacheKey({ unreadOnly, type, page, pageSize });
    
    // Verifica se i dati sono nella cache
    const cached = NotificationsCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    console.log(`Richiesta notifiche con opzioni: ${JSON.stringify({ unreadOnly, type, page, pageSize })}`);
    
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
    
    // Prepara il risultato completo con metadati di paginazione
    const result = {
      success: true,
      notifications: results,
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
    
    res.json(result);
  } catch (error) {
    console.error("Errore durante il recupero delle notifiche:", error);
    res.status(500).json({ success: false, message: "Errore durante il recupero delle notifiche" });
  }
}

/**
 * Crea una nuova notifica
 */
export async function createNotification(req: Request, res: Response) {
  try {
    const validatedData = insertNotificationSchema.parse(req.body);
    
    const notification = await db.insert(notifications)
      .values(validatedData)
      .returning();
    
    res.status(201).json({ success: true, notification: notification[0] });
    
    // Notifica tramite WebSocket
    if (req.app.locals.websocket) {
      req.app.locals.websocket.broadcast('notification', {
        type: 'new_notification',
        notification: notification[0]
      });
    }
  } catch (error) {
    console.error("Errore durante la creazione della notifica:", error);
    res.status(500).json({ success: false, message: "Errore durante la creazione della notifica" });
  }
}

/**
 * Segna una notifica come letta
 */
export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, message: "ID notifica mancante" });
    }
    
    const notification = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(id)))
      .returning();
    
    if (notification.length === 0) {
      return res.status(404).json({ success: false, message: "Notifica non trovata" });
    }
    
    // Invalida la cache delle notifiche quando una notifica viene segnata come letta
    NotificationsCache.clear();
    
    res.json({ success: true, notification: notification[0] });
    
    // Notifica tramite WebSocket
    if (req.app.locals.websocket) {
      req.app.locals.websocket.broadcast('notification', {
        type: 'notification_read',
        notificationId: parseInt(id)
      });
    }
  } catch (error) {
    console.error("Errore durante l'aggiornamento della notifica:", error);
    res.status(500).json({ success: false, message: "Errore durante l'aggiornamento della notifica" });
  }
}

/**
 * Segna tutte le notifiche come lette
 */
export async function markAllNotificationsAsRead(req: Request, res: Response) {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.isRead, false));
    
    // Invalida la cache delle notifiche quando tutte le notifiche vengono segnate come lette
    NotificationsCache.clear();
    
    res.json({ success: true, message: "Tutte le notifiche sono state segnate come lette" });
    
    // Notifica tramite WebSocket
    if (req.app.locals.websocket) {
      req.app.locals.websocket.broadcast('notification', {
        type: 'all_notifications_read'
      });
    }
  } catch (error) {
    console.error("Errore durante l'aggiornamento delle notifiche:", error);
    res.status(500).json({ success: false, message: "Errore durante l'aggiornamento delle notifiche" });
  }
}

/**
 * Funzione di utilità per creare notifiche durante operazioni varie
 * Questa funzione è utilizzata internamente dai controller, non esposta come API
 */
export async function createSystemNotification(
  type: string, 
  title: string, 
  message: string, 
  relatedEntityType?: string, 
  relatedEntityId?: number,
  data?: Record<string, any>
) {
  try {
    const notification = await db.insert(notifications).values({
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      data: data ? JSON.stringify(data) : null,
      isRead: false
    }).returning();
    
    // Invalida la cache delle notifiche per mostrare immediatamente la nuova notifica
    NotificationsCache.clear();
    
    return notification[0];
  } catch (error) {
    console.error("Errore durante la creazione della notifica di sistema:", error);
    return null;
  }
}