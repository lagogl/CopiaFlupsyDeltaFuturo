import { db } from "../db";
import { notifications, insertNotificationSchema, type InsertNotification } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { Request, Response } from "express";

/**
 * Ottiene tutte le notifiche, con opzione per filtrare solo quelle non lette
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const { unreadOnly } = req.query;
    
    let query = db.select().from(notifications).orderBy(desc(notifications.createdAt));
    
    if (unreadOnly === 'true') {
      query = query.where(eq(notifications.isRead, false));
    }
    
    const results = await query;
    res.json({ success: true, notifications: results });
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
    
    return notification[0];
  } catch (error) {
    console.error("Errore durante la creazione della notifica di sistema:", error);
    return null;
  }
}