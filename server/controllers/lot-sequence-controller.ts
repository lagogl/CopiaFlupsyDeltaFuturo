import { db } from "../db";
import { lots } from "@shared/schema";
import { max, sql } from "drizzle-orm";

/**
 * Ottiene il prossimo ID sequenziale per un nuovo lotto
 * Verifica il massimo ID attualmente presente nella tabella lotti
 * e restituisce il valore successivo
 * 
 * @returns {Promise<number>} Il prossimo ID sequenziale per un nuovo lotto
 */
export async function getNextSequentialLotId(): Promise<number> {
  try {
    // Query per ottenere il massimo ID attuale
    const result = await db.select({
      maxId: max(lots.id)
    }).from(lots);
    
    // Se la tabella è vuota, inizia da 1
    const maxId = result[0]?.maxId || 0;
    
    // Restituisci il valore successivo
    return maxId + 1;
  } catch (error) {
    console.error("Errore nell'ottenere il prossimo ID sequenziale:", error);
    throw error;
  }
}

/**
 * Imposta il valore della sequenza 'lots_id_seq' al valore specificato
 * Questo assicura che le future inserzioni abbiano l'ID corretto
 * 
 * @param {number} nextId - Il prossimo ID che dovrebbe essere usato
 * @returns {Promise<void>}
 */
export async function resetLotIdSequence(nextId: number): Promise<void> {
  try {
    // Se nextId è 1, usiamo setval con false per non chiamare currval
    // Altrimenti usiamo nextId - 1 con true
    if (nextId <= 1) {
      await db.execute(sql`SELECT setval('lots_id_seq', 1, false)`);
    } else {
      await db.execute(sql`SELECT setval('lots_id_seq', ${nextId - 1}, true)`);
    }
    console.log(`Sequenza ID lotti reimpostata. Il prossimo ID sarà: ${nextId}`);
  } catch (error) {
    console.error("Errore nel reimpostare la sequenza:", error);
    throw error;
  }
}

/**
 * Sincronizza la sequenza ID con il massimo valore nella tabella
 * Utile dopo importazioni o correzioni manuali
 * 
 * @returns {Promise<number>} Il prossimo ID che verrà utilizzato
 */
export async function synchronizeLotIdSequence(): Promise<number> {
  try {
    const nextId = await getNextSequentialLotId();
    await resetLotIdSequence(nextId);
    return nextId;
  } catch (error) {
    console.error("Errore nella sincronizzazione della sequenza:", error);
    throw error;
  }
}