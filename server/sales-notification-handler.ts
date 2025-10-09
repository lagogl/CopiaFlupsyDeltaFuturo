import { db } from "./db";
import { notifications, type InsertNotification, operations, baskets, cycles, advancedSales } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createSystemNotification } from "./controllers/notification-controller";

/**
 * Crea una notifica quando viene registrata un'operazione di vendita
 * @param operationId - ID dell'operazione di vendita
 */
export async function createSaleNotification(operationId: number) {
  try {
    // Ottieni i dettagli dell'operazione
    const [operation] = await db.select()
      .from(operations)
      .where(eq(operations.id, operationId));
    
    if (!operation || operation.type !== 'vendita') {
      console.log("Operazione non trovata o non è un'operazione di vendita");
      return null;
    }
    
    // Ottieni i dettagli del cestello
    const [basket] = await db.select()
      .from(baskets)
      .where(eq(baskets.id, operation.basketId));
    
    if (!basket) {
      console.log("Cestello non trovato");
      return null;
    }
    
    // Ottieni i dettagli del ciclo
    const [cycle] = await db.select()
      .from(cycles)
      .where(eq(cycles.id, operation.cycleId));
    
    if (!cycle) {
      console.log("Ciclo non trovato");
      return null;
    }
    
    // Formatta data in modo leggibile
    const formattedDate = new Date(operation.date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Crea titolo e messaggio della notifica
    const title = `Nuova vendita - Cestello ${basket.physicalNumber}`;
    const message = `È stata registrata un'operazione di vendita per il cestello ${basket.physicalNumber} in data ${formattedDate}. ${operation.animalCount?.toLocaleString('it-IT') || 'N/A'} animali.`;
    
    // Crea la notifica
    const notification = await createSystemNotification(
      'vendita',
      title,
      message,
      'operation',
      operation.id,
      {
        basketId: basket.id,
        basketNumber: basket.physicalNumber,
        cycleId: cycle.id,
        operationDate: operation.date,
        animalCount: operation.animalCount
      }
    );
    
    // Invia la notifica tramite WebSocket se disponibile
    if (global.app?.locals?.websocket) {
      global.app.locals.websocket.broadcast('notification', {
        type: 'new_notification',
        notification
      });
    }
    
    return notification;
  } catch (error) {
    console.error("Errore durante la creazione della notifica di vendita:", error);
    return null;
  }
}

/**
 * Controlla se ci sono notifiche di vendita non lette
 * @returns Promise<boolean> - true se ci sono notifiche di vendita non lette
 */
export async function hasUnreadSaleNotifications(): Promise<boolean> {
  try {
    const unreadNotifications = await db.select({ count: db.fn.count() })
      .from(notifications)
      .where(
        eq(notifications.type, 'vendita'),
        eq(notifications.isRead, false)
      );
    
    return unreadNotifications[0]?.count > 0;
  } catch (error) {
    console.error("Errore durante il controllo delle notifiche di vendita non lette:", error);
    return false;
  }
}

/**
 * Crea una notifica quando viene creata una vendita avanzata
 * @param saleId - ID della vendita avanzata
 */
export async function createAdvancedSaleNotification(saleId: number) {
  try {
    // Ottieni i dettagli della vendita
    const [sale] = await db.select()
      .from(advancedSales)
      .where(eq(advancedSales.id, saleId));
    
    if (!sale) {
      console.log("Vendita avanzata non trovata");
      return null;
    }
    
    // Formatta data in modo leggibile
    const formattedDate = new Date(sale.saleDate).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Determina nome azienda
    const companyName = sale.companyId === 1017299 ? 'Ecotapes' : 
                       sale.companyId === 13263 ? 'Delta Futuro' : 
                       'Azienda';
    
    // Crea titolo e messaggio della notifica
    const title = `Nuova vendita avanzata - ${sale.saleNumber}`;
    const message = `È stata creata una vendita avanzata ${sale.saleNumber} per ${companyName} in data ${formattedDate}. Cliente: ${sale.customerName || 'Non specificato'}. Totale: ${sale.totalAnimals?.toLocaleString('it-IT') || 'N/A'} animali.`;
    
    // Crea la notifica
    const notification = await createSystemNotification(
      'vendita',
      title,
      message,
      'advanced_sale',
      sale.id,
      {
        saleNumber: sale.saleNumber,
        companyId: sale.companyId,
        companyName,
        customerId: sale.customerId,
        customerName: sale.customerName,
        saleDate: sale.saleDate,
        totalAnimals: sale.totalAnimals,
        totalWeight: sale.totalWeight,
        status: sale.status
      }
    );
    
    // Invia la notifica tramite WebSocket se disponibile
    if (global.app?.locals?.websocket) {
      global.app.locals.websocket.broadcast('notification', {
        type: 'new_notification',
        notification
      });
    }
    
    return notification;
  } catch (error) {
    console.error("Errore durante la creazione della notifica di vendita avanzata:", error);
    return null;
  }
}

/**
 * Integra la creazione di notifiche nei punti del codice dove vengono create operazioni di vendita
 */
export function integrateNotificationsWithOperations() {
  console.log("Integrazione del sistema di notifiche con le operazioni...");
  
  // Aggiungi le funzioni di notifica all'oggetto globale app
  if (global.app) {
    global.app.locals.createSaleNotification = createSaleNotification;
    global.app.locals.createAdvancedSaleNotification = createAdvancedSaleNotification;
  }
  
  console.log("Sistema di notifiche integrato con successo");
}