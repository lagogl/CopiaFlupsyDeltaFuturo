import { db } from "../db";
import { notificationSettings } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Ottiene tutte le impostazioni di notifica
 * @returns Promise che risolve con la lista delle impostazioni
 */
export async function getNotificationSettings() {
  try {
    const settings = await db.select().from(notificationSettings);
    return settings;
  } catch (error) {
    console.error("Errore nel recupero delle impostazioni di notifica:", error);
    throw error;
  }
}

/**
 * Ottiene l'impostazione per un tipo specifico di notifica
 * @param type Tipo di notifica ('vendita', 'accrescimento', etc.)
 * @returns Promise che risolve con l'impostazione se esiste, altrimenti null
 */
export async function getNotificationSettingByType(type: string) {
  try {
    const [setting] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.notificationType, type));
    
    return setting || null;
  } catch (error) {
    console.error(`Errore nel recupero dell'impostazione di notifica '${type}':`, error);
    throw error;
  }
}

/**
 * Aggiorna o crea l'impostazione per un tipo specifico di notifica
 * @param type Tipo di notifica
 * @param isEnabled Se le notifiche di questo tipo sono abilitate
 * @returns Promise che risolve con l'impostazione aggiornata o creata
 */
export async function updateNotificationSetting(type: string, isEnabled: boolean) {
  try {
    // Verifica se l'impostazione esiste già
    const existingSetting = await getNotificationSettingByType(type);
    
    if (existingSetting) {
      // Aggiorna l'impostazione esistente
      const [updated] = await db
        .update(notificationSettings)
        .set({ 
          isEnabled,
          updatedAt: new Date()
        })
        .where(eq(notificationSettings.id, existingSetting.id))
        .returning();
      
      return updated;
    } else {
      // Crea una nuova impostazione
      const [created] = await db
        .insert(notificationSettings)
        .values({
          notificationType: type,
          isEnabled,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return created;
    }
  } catch (error) {
    console.error(`Errore nell'aggiornamento dell'impostazione di notifica '${type}':`, error);
    throw error;
  }
}

/**
 * Controlla se un tipo di notifica è abilitato
 * @param type Tipo di notifica
 * @returns Promise che risolve con true se il tipo è abilitato, false altrimenti
 */
export async function isNotificationTypeEnabled(type: string): Promise<boolean> {
  try {
    const setting = await getNotificationSettingByType(type);
    
    // Se l'impostazione non esiste, considera abilitata per default
    if (!setting) {
      return true;
    }
    
    return setting.isEnabled;
  } catch (error) {
    console.error(`Errore nel controllo dello stato dell'impostazione '${type}':`, error);
    // In caso di errore, assumiamo che sia abilitata per sicurezza
    return true;
  }
}