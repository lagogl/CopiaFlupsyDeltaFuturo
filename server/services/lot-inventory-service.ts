import { eq, sql, and, desc, count, sum } from "drizzle-orm";
import { db } from "../db";
import { 
  lotInventoryTransactions, 
  lots,
  operations,
  LotInventoryTransaction,
  InsertLotInventoryTransaction,
  InventoryTransactionType,
  lotMortalityRecords, 
  InsertLotMortalityRecord 
} from "@shared/schema";

/**
 * Servizio per la gestione dell'inventario dei lotti
 * Questo servizio gestisce le transazioni di inventario e il calcolo della mortalità
 */
class LotInventoryService {
  /**
   * Registra una transazione di inventario per un lotto
   * @param transaction - Dati della transazione
   * @returns La transazione creata
   */
  async recordTransaction(transaction: InsertLotInventoryTransaction): Promise<LotInventoryTransaction> {
    try {
      // Inserisce la transazione nel database
      const [newTransaction] = await db
        .insert(lotInventoryTransactions)
        .values(transaction)
        .returning();
      
      console.log(`Registrata transazione inventario per lotto ${transaction.lotId}: ${transaction.transactionType}, ${transaction.animalCount} animali`);
      
      return newTransaction;
    } catch (error) {
      console.error("Errore durante la registrazione della transazione di inventario:", error);
      throw new Error("Impossibile registrare la transazione di inventario");
    }
  }

  /**
   * Calcola la giacenza attuale di un lotto
   * @param lotId - ID del lotto
   * @returns Oggetto con i conteggi degli animali
   */
  async calculateCurrentInventory(lotId: number): Promise<{
    initialCount: number;
    currentCount: number;
    soldCount: number;
    mortalityCount: number;
    mortalityPercentage: number;
  }> {
    try {
      // Ottiene il conteggio iniziale dal lotto
      const [lotInfo] = await db
        .select({
          animalCount: lots.animalCount
        })
        .from(lots)
        .where(eq(lots.id, lotId));

      if (!lotInfo || !lotInfo.animalCount) {
        throw new Error(`Lotto ${lotId} non trovato o senza conteggio animali`);
      }

      const initialCount = lotInfo.animalCount;

      // Calcola il totale delle transazioni di vendita
      const [soldCountResult] = await db
        .select({
          total: sum(lotInventoryTransactions.animalCount).mapWith(Number)
        })
        .from(lotInventoryTransactions)
        .where(
          and(
            eq(lotInventoryTransactions.lotId, lotId),
            eq(lotInventoryTransactions.transactionType, "vendita")
          )
        );

      // Calcola il totale di tutte le transazioni (esclusi arrivi)
      const [allTransactionsResult] = await db
        .select({
          total: sum(lotInventoryTransactions.animalCount).mapWith(Number)
        })
        .from(lotInventoryTransactions)
        .where(
          and(
            eq(lotInventoryTransactions.lotId, lotId),
            sql`${lotInventoryTransactions.transactionType} != 'arrivo-lotto'`
          )
        );

      // Calcola i valori finali
      const soldCount = Math.abs(soldCountResult?.total || 0);
      const allTransactions = allTransactionsResult?.total || 0;
      const currentCount = initialCount + allTransactions; // Le uscite sono negative, quindi sommiamo
      const mortalityCount = initialCount - currentCount - soldCount;
      const mortalityPercentage = initialCount > 0 
        ? (mortalityCount / initialCount) * 100 
        : 0;

      return {
        initialCount,
        currentCount,
        soldCount,
        mortalityCount,
        mortalityPercentage
      };
    } catch (error) {
      console.error("Errore durante il calcolo dell'inventario del lotto:", error);
      throw new Error("Impossibile calcolare l'inventario del lotto");
    }
  }

  /**
   * Registra un calcolo di mortalità per un lotto
   * @param lotId - ID del lotto
   * @param notes - Note opzionali
   * @returns Il record di mortalità creato
   */
  async recordMortalityCalculation(lotId: number, notes?: string): Promise<any> {
    try {
      // Calcola l'inventario attuale
      const inventory = await this.calculateCurrentInventory(lotId);
      
      // Crea il record di mortalità
      const mortalityRecord: InsertLotMortalityRecord = {
        lotId,
        calculationDate: new Date().toISOString().split('T')[0],
        initialCount: inventory.initialCount,
        currentCount: inventory.currentCount,
        soldCount: inventory.soldCount,
        mortalityCount: inventory.mortalityCount,
        mortalityPercentage: inventory.mortalityPercentage,
        notes: notes || null
      };
      
      // Inserisce il record nel database
      const [newRecord] = await db
        .insert(lotMortalityRecords)
        .values(mortalityRecord)
        .returning();
      
      console.log(`Registrato calcolo mortalità per lotto ${lotId}: ${inventory.mortalityPercentage.toFixed(2)}%`);
      
      return newRecord;
    } catch (error) {
      console.error("Errore durante la registrazione del calcolo di mortalità:", error);
      throw new Error("Impossibile registrare il calcolo di mortalità");
    }
  }

  /**
   * Ottiene l'ultimo calcolo di mortalità per un lotto
   * @param lotId - ID del lotto
   * @returns L'ultimo record di mortalità, se presente
   */
  async getLatestMortalityRecord(lotId: number): Promise<any> {
    try {
      const [record] = await db
        .select()
        .from(lotMortalityRecords)
        .where(eq(lotMortalityRecords.lotId, lotId))
        .orderBy(desc(lotMortalityRecords.calculationDate))
        .limit(1);
      
      return record;
    } catch (error) {
      console.error("Errore durante il recupero del calcolo di mortalità:", error);
      throw new Error("Impossibile recuperare il calcolo di mortalità");
    }
  }

  /**
   * Ottiene la cronologia dei calcoli di mortalità per un lotto
   * @param lotId - ID del lotto
   * @returns Array di record di mortalità
   */
  async getMortalityHistory(lotId: number): Promise<any[]> {
    try {
      const records = await db
        .select()
        .from(lotMortalityRecords)
        .where(eq(lotMortalityRecords.lotId, lotId))
        .orderBy(desc(lotMortalityRecords.calculationDate));
      
      return records;
    } catch (error) {
      console.error("Errore durante il recupero della cronologia di mortalità:", error);
      throw new Error("Impossibile recuperare la cronologia di mortalità");
    }
  }

  /**
   * Ottiene tutte le transazioni di inventario per un lotto
   * @param lotId - ID del lotto
   * @returns Array di transazioni
   */
  async getLotTransactions(lotId: number): Promise<any[]> {
    try {
      const transactions = await db
        .select()
        .from(lotInventoryTransactions)
        .where(eq(lotInventoryTransactions.lotId, lotId))
        .orderBy(desc(lotInventoryTransactions.date));
      
      return transactions;
    } catch (error) {
      console.error("Errore durante il recupero delle transazioni del lotto:", error);
      throw new Error("Impossibile recuperare le transazioni del lotto");
    }
  }
}

// Esporta un'istanza singleton del servizio
export const lotInventoryService = new LotInventoryService();