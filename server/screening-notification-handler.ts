/**
 * Handler per le notifiche relative alla vagliatura
 */
import { db } from "./db";
import { notifications } from "../shared/schema";
import { InsertNotification } from "../shared/schema";
import { and, eq, or, sql } from "drizzle-orm";

/**
 * Crea una notifica relativa alla vagliatura
 * @param notification - Dati della notifica
 * @returns ID della notifica creata
 */
export async function createScreeningNotification(notification: InsertNotification) {
  try {
    // Inserisce la nuova notifica nel database
    const [result] = await db.insert(notifications).values({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead || false,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      data: notification.data
    }).returning();
    
    console.log(`Notifica di vagliatura creata con ID ${result.id}`);
    
    // Invia aggiornamento WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('new_notification', {
        type: 'screening',
        notification: {
          id: result.id,
          type: notification.type,
          title: notification.title
        }
      });
    }
    
    return result.id;
  } catch (error) {
    console.error("Errore durante la creazione della notifica di vagliatura:", error);
    throw error;
  }
}

/**
 * Controlla se ci sono notifiche di vagliatura non lette
 * @returns Promise<boolean> - true se ci sono notifiche di vagliatura non lette
 */
export async function hasUnreadScreeningNotifications(): Promise<boolean> {
  try {
    const result = await db.select({ count: sql`COUNT(*)`.as('count') })
      .from(notifications)
      .where(
        and(
          or(
            eq(notifications.type, 'vagliatura-origine'),
            eq(notifications.type, 'vagliatura-destinazione')
          ),
          eq(notifications.isRead, false)
        )
      );
    
    const count = parseInt(result[0]?.count as string, 10);
    return count > 0;
  } catch (error) {
    console.error("Errore durante il controllo delle notifiche di vagliatura non lette:", error);
    return false;
  }
}

/**
 * Registra l'handler per le notifiche di vagliatura nell'app Express
 * @param app - L'istanza dell'app Express
 */
export function registerScreeningNotificationHandler(app: any) {
  console.log("Registrazione dell'handler per le notifiche di vagliatura...");
  app.locals.createScreeningNotification = createScreeningNotification;
  console.log("Handler per le notifiche di vagliatura registrato con successo");
}