import { db } from "../db";
import { eq, sql, desc } from "drizzle-orm";
import { lotInventoryTransactions, lotMortalityRecords, lots } from "@shared/schema";

/**
 * Servizio per la gestione dell'inventario dei lotti
 */
export class LotInventoryService {
  /**
   * Calcola lo stato attuale dell'inventario di un lotto
   * @param lotId - ID del lotto
   * @returns Dati di inventario calcolati
   */
  async calculateCurrentInventory(lotId: number) {
    try {
      // 1. Ottieni i dati di base del lotto
      const [lot] = await db.select().from(lots).where(eq(lots.id, lotId));
      
      if (!lot) {
        throw new Error("Lotto non trovato");
      }

      const initialCount = lot.animalCount || 0;
      
      // 2. Calcola il conteggio attuale in base alle transazioni
      // Verificare se la tabella esiste prima di fare la query
      try {
        // Calcola le vendite
        const [soldResult] = await db.execute(
          sql`SELECT COALESCE(SUM(animal_count), 0) as sold_count FROM lot_inventory_transactions 
              WHERE lot_id = ${lotId} AND transaction_type = 'vendita'`
        );
        const soldCount = Number(soldResult?.sold_count || 0);
        
        // Calcola la mortalità (assumiamo che sia sempre negativa)
        const [mortalityResult] = await db.execute(
          sql`SELECT COALESCE(SUM(animal_count), 0) as mortality_count FROM lot_inventory_transactions 
              WHERE lot_id = ${lotId} AND transaction_type = 'mortalita'`
        );
        const mortalityCount = Math.abs(Number(mortalityResult?.mortality_count || 0));
        
        // Calcola il totale di tutte le transazioni (escluso arrivo lotto che è già nel conteggio iniziale)
        const [transactionsResult] = await db.execute(
          sql`SELECT COALESCE(SUM(animal_count), 0) as total_change FROM lot_inventory_transactions 
              WHERE lot_id = ${lotId} AND transaction_type != 'arrivo-lotto'`
        );
        const totalChange = Number(transactionsResult?.total_change || 0);
        
        // Calcolo finale
        const currentCount = initialCount + totalChange;
        const mortalityPercentage = initialCount > 0 ? (mortalityCount / initialCount) * 100 : 0;
        
        return {
          initialCount,
          currentCount,
          soldCount,
          mortalityCount,
          mortalityPercentage
        };
      } catch (error) {
        console.error("Errore durante il calcolo delle transazioni:", error);
        
        // Se c'è un errore, restituisci un set di dati base solo con le informazioni del lotto
        return {
          initialCount,
          currentCount: initialCount,
          soldCount: 0,
          mortalityCount: 0,
          mortalityPercentage: 0
        };
      }
    } catch (error) {
      console.error("Errore durante il calcolo dell'inventario del lotto:", error);
      throw new Error("Impossibile calcolare l'inventario del lotto");
    }
  }

  /**
   * Registra una transazione di inventario
   * @param transaction - Dati della transazione
   * @returns La transazione creata
   */
  async createTransaction(transaction: any) {
    try {
      // Valida i dati minimi richiesti
      if (!transaction.lotId || !transaction.transactionType || transaction.animalCount === undefined) {
        throw new Error("Dati transazione incompleti");
      }

      // Crea la transazione
      const [result] = await db.execute(
        sql`INSERT INTO lot_inventory_transactions 
            (lot_id, transaction_type, date, animal_count, notes, created_at) 
            VALUES 
            (${transaction.lotId}, ${transaction.transactionType}, NOW(), ${transaction.animalCount}, 
             ${transaction.notes || null}, NOW())
            RETURNING *`
      );

      return result;
    } catch (error) {
      console.error("Errore durante la creazione della transazione:", error);
      throw new Error("Impossibile creare la transazione");
    }
  }

  /**
   * Registra un calcolo di mortalità
   * @param lotId - ID del lotto
   * @param notes - Note sul calcolo
   * @returns Il record di mortalità creato
   */
  async recordMortalityCalculation(lotId: number, notes?: string) {
    try {
      // Calcola lo stato attuale dell'inventario
      const inventory = await this.calculateCurrentInventory(lotId);
      
      // Crea un record di mortalità
      const [result] = await db.execute(
        sql`INSERT INTO lot_mortality_records 
            (lot_id, calculation_date, initial_count, current_count, sold_count, 
             mortality_count, mortality_percentage, notes, created_at) 
            VALUES 
            (${lotId}, NOW(), ${inventory.initialCount}, ${inventory.currentCount}, 
             ${inventory.soldCount}, ${inventory.mortalityCount}, ${inventory.mortalityPercentage}, 
             ${notes || null}, NOW())
            RETURNING *`
      );
      
      return result;
    } catch (error) {
      console.error("Errore durante la registrazione del calcolo di mortalità:", error);
      throw new Error("Impossibile registrare il calcolo di mortalità");
    }
  }

  /**
   * Ottiene le transazioni di un lotto
   * @param lotId - ID del lotto
   * @returns Lista delle transazioni
   */
  async getLotTransactions(lotId: number) {
    try {
      // Ottieni le transazioni ordinate per data
      const results = await db.execute(
        sql`SELECT * FROM lot_inventory_transactions 
            WHERE lot_id = ${lotId}
            ORDER BY date DESC`
      );
      
      return results;
    } catch (error) {
      console.error("Errore durante il recupero delle transazioni del lotto:", error);
      throw new Error("Impossibile recuperare le transazioni del lotto");
    }
  }

  /**
   * Ottiene la cronologia dei calcoli di mortalità
   * @param lotId - ID del lotto
   * @returns Lista dei record di mortalità
   */
  async getMortalityHistory(lotId: number) {
    try {
      // Ottieni la cronologia dei calcoli di mortalità
      const results = await db.execute(
        sql`SELECT * FROM lot_mortality_records 
            WHERE lot_id = ${lotId}
            ORDER BY calculation_date DESC`
      );
      
      return results;
    } catch (error) {
      console.error("Errore durante il recupero della cronologia di mortalità:", error);
      throw new Error("Impossibile recuperare la cronologia di mortalità");
    }
  }
}

// Esporta un'istanza del servizio
export const lotInventoryService = new LotInventoryService();