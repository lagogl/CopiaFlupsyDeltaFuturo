import { db } from '../db.js';
import { eq, and, sql, isNotNull, desc } from 'drizzle-orm';
import { lots, cycles, operations, lotLedger } from '../../shared/schema.js';

/**
 * Servizio per aggiornamento automatico statistiche lotti
 * 
 * LOGICA:
 * - Lotto attivo dalla creazione
 * - Monitoraggio automatico SOLO dopo prima operazione registrata 
 * - Chiusura automatica solo se: (ha_operazioni) AND (nessun_ciclo_attivo_usa_lotto)
 * - Gestione lotti misti con percentuali
 */
export class LotAutoStatsService {
  
  /**
   * Hook principale - chiamato dopo ogni creazione di operazione
   * Aggiorna automaticamente le statistiche del lotto coinvolto
   * 
   * @param operation Operazione appena creata
   */
  static async onOperationCreated(operation: any) {
    try {
      console.log(`🔄 AUTO-STATS: Elaborazione operazione ${operation.id} per lotto ${operation.lotId}`);
      
      if (!operation.lotId) {
        console.log(`ℹ️ AUTO-STATS: Operazione ${operation.id} senza lotto, skip`);
        return;
      }

      // 1. Aggiorna statistiche real-time del lotto
      await this.updateLotStatistics(operation.lotId);
      
      // 2. Registra nel lot ledger se necessario
      await this.updateLotLedger(operation);
      
      // 3. Controlla se attivare monitoraggio automatico (prima operazione)
      await this.checkFirstOperationFlag(operation.lotId);
      
      // 4. Controlla se il lotto deve essere chiuso automaticamente
      await this.checkAutoCloseLot(operation.lotId);
      
      console.log(`✅ AUTO-STATS: Aggiornamento completato per lotto ${operation.lotId}`);
    } catch (error) {
      console.error(`❌ AUTO-STATS: Errore aggiornamento lotto ${operation.lotId}:`, error);
    }
  }

  /**
   * Aggiorna le statistiche del lotto in tempo reale
   * Calcola: mortalità totale, conteggi attuali, pesi
   */
  private static async updateLotStatistics(lotId: number) {
    console.log(`📊 AUTO-STATS: Ricalcolo statistiche per lotto ${lotId}`);
    
    try {
      // Recupera il lotto base
      const [lot] = await db.select().from(lots).where(eq(lots.id, lotId));
      if (!lot) {
        console.error(`❌ AUTO-STATS: Lotto ${lotId} non trovato`);
        return;
      }

      const initialCount = lot.animalCount || 0;
      
      // Calcola statistiche aggiornate da tutte le operazioni
      const statsQuery = await db
        .select({
          totalDeadCount: sql<number>`COALESCE(SUM(${operations.deadCount}), 0)`,
          totalOperations: sql<number>`COUNT(*)`,
          lastOperationDate: sql<string>`MAX(${operations.date})`,
          totalWeight: sql<number>`COALESCE(SUM(${operations.totalWeight}), 0)`,
          avgAnimalsPerKg: sql<number>`COALESCE(AVG(${operations.animalsPerKg}), 0)`
        })
        .from(operations)
        .where(
          and(
            eq(operations.lotId, lotId),
            isNotNull(operations.deadCount)
          )
        );

      const stats = statsQuery[0];
      if (!stats) return;

      // Calcola mortalità percentuale
      const mortalityCount = Number(stats.totalDeadCount);
      const mortalityPercentage = initialCount > 0 ? (mortalityCount / initialCount) * 100 : 0;
      
      // Aggiorna i campi del lotto
      const updateData: any = {
        totalMortality: mortalityCount,
        lastMortalityDate: mortalityCount > 0 ? stats.lastOperationDate : null,
        mortalityNotes: `Aggiornato automaticamente da ${stats.totalOperations} operazioni. Mortalità: ${mortalityPercentage.toFixed(2)}%`
      };

      await db
        .update(lots)
        .set(updateData)
        .where(eq(lots.id, lotId));

      console.log(`✅ AUTO-STATS: Statistiche aggiornate - Lotto ${lotId}: ${mortalityCount} morti (${mortalityPercentage.toFixed(2)}%)`);
      
    } catch (error) {
      console.error(`❌ AUTO-STATS: Errore calcolo statistiche lotto ${lotId}:`, error);
    }
  }

  /**
   * Aggiorna il lot ledger con entry da operazione
   * Traccia movimenti per accountability precisa
   */
  private static async updateLotLedger(operation: any) {
    try {
      // Determina tipo di movimento lot ledger basato su tipo operazione
      let ledgerType: string | null = null;
      let quantity = 0;

      switch (operation.type) {
        case 'prima-attivazione':
          ledgerType = 'in';
          quantity = operation.animalCount || 0;
          break;
        case 'vendita':
        case 'selezione-vendita':
          ledgerType = 'sale';
          quantity = -(operation.animalCount || 0); // Negativo per vendita
          break;
        case 'peso':
        case 'misura':
          // Per peso/misura, registra mortalità se presente
          if (operation.deadCount > 0) {
            ledgerType = 'mortality';
            quantity = -(operation.deadCount); // Negativo per mortalità
          }
          break;
        case 'cessazione':
          ledgerType = 'transfer_out';
          quantity = -(operation.animalCount || 0); // Negativo per uscita
          break;
      }

      if (ledgerType && quantity !== 0) {
        await db.insert(lotLedger).values({
          date: operation.date,
          lotId: operation.lotId,
          type: ledgerType,
          quantity: quantity.toString(),
          sourceCycleId: operation.cycleId,
          operationId: operation.id,
          basketId: operation.basketId,
          allocationMethod: 'measured', // Operazione diretta = measured
          notes: `Auto-generato da operazione ${operation.type}`
        });

        console.log(`📝 AUTO-STATS: Lot ledger aggiornato - ${ledgerType}: ${quantity} animali`);
      }
      
    } catch (error) {
      console.error(`❌ AUTO-STATS: Errore aggiornamento lot ledger:`, error);
    }
  }

  /**
   * Verifica se questa è la prima operazione per il lotto
   * Se sì, attiva il flag di monitoraggio automatico
   */
  private static async checkFirstOperationFlag(lotId: number) {
    try {
      // Conta operazioni totali per questo lotto
      const operationCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(operations)
        .where(eq(operations.lotId, lotId));

      const totalOps = Number(operationCount[0]?.count || 0);
      
      if (totalOps === 1) {
        // Prima operazione! Attiva monitoraggio
        await db
          .update(lots)
          .set({ 
            mortalityNotes: `MONITORAGGIO ATTIVO - Prima operazione registrata`
          })
          .where(eq(lots.id, lotId));
          
        console.log(`🚨 AUTO-STATS: PRIMA OPERAZIONE per lotto ${lotId} - Monitoraggio automatico ATTIVATO`);
      }
      
    } catch (error) {
      console.error(`❌ AUTO-STATS: Errore controllo prima operazione:`, error);
    }
  }

  /**
   * Controlla se il lotto deve essere chiuso automaticamente
   * CONDIZIONI: (ha_operazioni) AND (nessun_ciclo_attivo_usa_lotto)
   */
  private static async checkAutoCloseLot(lotId: number) {
    try {
      // 1. Verifica se il lotto ha già operazioni (condizione per auto-close)
      const hasOperations = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(operations)  
        .where(eq(operations.lotId, lotId));

      const operationCount = Number(hasOperations[0]?.count || 0);
      
      if (operationCount === 0) {
        console.log(`ℹ️ AUTO-STATS: Lotto ${lotId} senza operazioni, skip controllo chiusura`);
        return;
      }

      // 2. Verifica se ci sono cicli attivi che usano questo lotto
      const activeCyclesWithLot = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cycles)
        .where(
          and(
            eq(cycles.lotId, lotId),
            eq(cycles.state, 'active')
          )
        );

      const activeCycleCount = Number(activeCyclesWithLot[0]?.count || 0);
      
      if (activeCycleCount === 0) {
        // NESSUN CICLO ATTIVO → CHIUDI LOTTO
        await db
          .update(lots)
          .set({ 
            state: 'exhausted',
            active: false,
            mortalityNotes: `CHIUSO AUTOMATICAMENTE - Nessun ciclo attivo utilizza questo lotto`
          })
          .where(eq(lots.id, lotId));
          
        console.log(`🔴 AUTO-STATS: Lotto ${lotId} CHIUSO automaticamente - nessun ciclo attivo`);
      } else {
        console.log(`🟢 AUTO-STATS: Lotto ${lotId} rimane attivo - ${activeCycleCount} cicli attivi`);
      }
      
    } catch (error) {
      console.error(`❌ AUTO-STATS: Errore controllo chiusura automatica:`, error);
    }
  }

  /**
   * Metodo di utilità per ricalcolare tutte le statistiche di un lotto
   * Può essere chiamato manualmente se necessario
   */
  static async recalculateAllLotStats(lotId: number) {
    console.log(`🔄 AUTO-STATS: Ricalcolo completo statistiche lotto ${lotId}`);
    
    await this.updateLotStatistics(lotId);
    await this.checkAutoCloseLot(lotId);
    
    console.log(`✅ AUTO-STATS: Ricalcolo completo completato per lotto ${lotId}`);
  }
}