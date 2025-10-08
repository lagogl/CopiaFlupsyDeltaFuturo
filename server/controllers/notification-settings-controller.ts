import { db } from "../db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { Request, Response } from "express";

/**
 * Recupera tutte le impostazioni delle notifiche
 * @param req La richiesta HTTP
 * @param res La risposta HTTP
 */
export async function getNotificationSettings(req: Request, res: Response) {
  try {
    // Esegui una query grezza poiché la tabella potrebbe non essere definita in schema.ts
    const settings = await db.execute(sql`
      SELECT * FROM notification_settings
      ORDER BY notification_type
    `);

    return res.status(200).json({
      success: true,
      settings: settings.rows || []
    });
  } catch (error) {
    console.error("Errore durante il recupero delle impostazioni notifiche:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante il recupero delle impostazioni notifiche"
    });
  }
}

/**
 * Aggiorna un'impostazione di notifica
 * @param req La richiesta HTTP
 * @param res La risposta HTTP
 */
export async function updateNotificationSetting(req: Request, res: Response) {
  const { type } = req.params;
  const { isEnabled, targetSizeIds } = req.body;

  if (typeof isEnabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: "Il valore 'isEnabled' deve essere un booleano"
    });
  }

  try {
    // Prima verifica se l'impostazione esiste
    const existingSettings = await db.execute(sql`
      SELECT * FROM notification_settings
      WHERE notification_type = ${type}
    `);

    if (!existingSettings.rows || existingSettings.rows.length === 0) {
      // Se non esiste, crea una nuova impostazione
      const targetSizesJson = targetSizeIds ? JSON.stringify(targetSizeIds) : null;
      await db.execute(sql`
        INSERT INTO notification_settings (notification_type, is_enabled, target_size_ids)
        VALUES (${type}, ${isEnabled}, ${targetSizesJson}::jsonb)
      `);
    } else {
      // Se esiste, aggiorna l'impostazione
      const targetSizesJson = targetSizeIds ? JSON.stringify(targetSizeIds) : null;
      await db.execute(sql`
        UPDATE notification_settings
        SET is_enabled = ${isEnabled}, 
            target_size_ids = ${targetSizesJson}::jsonb,
            updated_at = NOW()
        WHERE notification_type = ${type}
      `);
    }

    return res.status(200).json({
      success: true,
      message: "Impostazione notifica aggiornata con successo"
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'impostazione notifica:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante l'aggiornamento dell'impostazione notifica"
    });
  }
}

/**
 * Verifica se un tipo di notifica è abilitato
 * @param notificationType Il tipo di notifica da verificare
 * @returns Promise che risolve a true se il tipo di notifica è abilitato, false altrimenti
 */
export async function isNotificationTypeEnabled(notificationType: string): Promise<boolean> {
  try {
    const settings = await db.execute(sql`
      SELECT is_enabled FROM notification_settings
      WHERE notification_type = ${notificationType}
    `);

    // Se non esiste un'impostazione, assume che sia abilitata per default
    if (!settings.rows || settings.rows.length === 0) {
      return true;
    }

    return settings.rows[0].is_enabled === true;
  } catch (error) {
    console.error(`Errore durante la verifica dell'abilitazione della notifica ${notificationType}:`, error);
    // In caso di errore, assume che le notifiche siano abilitate di default
    return true;
  }
}

/**
 * Recupera le taglie configurate per le notifiche di accrescimento
 * @returns Promise con array di ID taglie o null se non configurato
 */
export async function getConfiguredTargetSizes(): Promise<number[] | null> {
  try {
    const settings = await db.execute(sql`
      SELECT target_size_ids FROM notification_settings
      WHERE notification_type = 'accrescimento'
    `);

    if (!settings.rows || settings.rows.length === 0 || !settings.rows[0].target_size_ids) {
      return null; // Nessuna configurazione, userà default
    }

    return settings.rows[0].target_size_ids as number[];
  } catch (error) {
    console.error('Errore durante il recupero delle taglie configurate:', error);
    return null;
  }
}