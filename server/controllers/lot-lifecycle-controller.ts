import { Request, Response } from 'express';
import { db } from '../db.js';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { lots, cycles, operations } from '../../shared/schema.js';
import { LotAutoStatsService } from '../services/lot-auto-stats-service.js';

/**
 * Controller per gestione del ciclo di vita automatico dei lotti
 * 
 * Responsabilità:
 * - Controllo automatico stato lotti basato su cicli attivi
 * - Chiusura automatica lotti senza cicli attivi (dopo prima operazione)
 * - Ricalcolo statistiche per lotti specifici o tutti i lotti
 * - API per operazioni manuali di gestione lotti
 */

export class LotLifecycleController {

  /**
   * Verifica e aggiorna lo stato di TUTTI i lotti
   * Utilizzato per operazioni batch e manutenzione periodica
   * 
   * POST /api/lot-lifecycle/check-all-lots
   */
  static async checkAllLotsStatus(req: Request, res: Response) {
    try {
      console.log('🔍 LOT-LIFECYCLE: Inizio controllo stato di tutti i lotti');
      
      const startTime = Date.now();
      const results = {
        totalLots: 0,
        activeLotsFound: 0,
        lotsClosedAutomatically: 0,
        lotsWithoutOperations: 0,
        lotsKeptActive: 0,
        errors: [] as string[]
      };

      // 1. Recupera tutti i lotti attivi
      const allLots = await db
        .select({
          id: lots.id,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          state: lots.state,
          arrivalDate: lots.arrivalDate
        })
        .from(lots)
        .where(eq(lots.state, 'active'));

      results.totalLots = allLots.length;
      console.log(`📊 LOT-LIFECYCLE: Trovati ${results.totalLots} lotti attivi da controllare`);

      // 2. Per ogni lotto, verifica stato
      for (const lot of allLots) {
        try {
          // Controlla se ha operazioni
          const operationCount = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(operations)
            .where(eq(operations.lotId, lot.id));

          const hasOperations = Number(operationCount[0]?.count || 0) > 0;

          if (!hasOperations) {
            // Nessuna operazione → rimane attivo
            results.lotsWithoutOperations++;
            continue;
          }

          // Ha operazioni → controlla cicli attivi
          const activeCycleCount = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(cycles)
            .where(
              and(
                eq(cycles.lotId, lot.id),
                eq(cycles.state, 'active')
              )
            );

          const activeCycles = Number(activeCycleCount[0]?.count || 0);

          if (activeCycles === 0) {
            // CHIUDI AUTOMATICAMENTE
            await db
              .update(lots)
              .set({
                state: 'exhausted',
                active: false,
                mortalityNotes: `CHIUSO AUTOMATICAMENTE dal sistema - Controllo batch ${new Date().toISOString()}`
              })
              .where(eq(lots.id, lot.id));

            results.lotsClosedAutomatically++;
            console.log(`🔴 LOT-LIFECYCLE: Lotto ${lot.id} (${lot.supplier} - ${lot.supplierLotNumber}) CHIUSO automaticamente`);
          } else {
            // Rimane attivo
            results.lotsKeptActive++;
            console.log(`🟢 LOT-LIFECYCLE: Lotto ${lot.id} (${lot.supplier} - ${lot.supplierLotNumber}) mantiene stato attivo (${activeCycles} cicli attivi)`);
          }

          // Aggiorna anche le statistiche
          await LotAutoStatsService.recalculateAllLotStats(lot.id);

        } catch (error) {
          const errorMessage = `Errore controllo lotto ${lot.id}: ${error.message}`;
          results.errors.push(errorMessage);
          console.error(`❌ LOT-LIFECYCLE: ${errorMessage}`);
        }
      }

      const executionTime = Date.now() - startTime;
      
      console.log(`✅ LOT-LIFECYCLE: Controllo completato in ${executionTime}ms`);
      console.log(`📊 RISULTATI: ${results.lotsClosedAutomatically} chiusi, ${results.lotsKeptActive} mantenuti attivi, ${results.lotsWithoutOperations} senza operazioni`);

      res.json({
        success: true,
        message: `Controllo completato su ${results.totalLots} lotti`,
        results,
        executionTimeMs: executionTime
      });

    } catch (error) {
      console.error('❌ LOT-LIFECYCLE: Errore controllo batch:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ricalcola statistiche per un lotto specifico
   * 
   * POST /api/lot-lifecycle/recalculate-lot/:lotId
   */
  static async recalculateLotStats(req: Request, res: Response) {
    try {
      const { lotId } = req.params;
      
      if (!lotId) {
        return res.status(400).json({
          success: false,
          error: 'ID lotto non fornito'
        });
      }

      const lotIdNumber = Number(lotId);
      console.log(`🔄 LOT-LIFECYCLE: Ricalcolo statistiche per lotto ${lotIdNumber}`);

      // Verifica che il lotto esista
      const lot = await db
        .select()
        .from(lots)
        .where(eq(lots.id, lotIdNumber))
        .limit(1);

      if (!lot || lot.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Lotto ${lotIdNumber} non trovato`
        });
      }

      // Ricalcola tutte le statistiche
      await LotAutoStatsService.recalculateAllLotStats(lotIdNumber);

      // Controlla stato automatico
      const operationCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(operations)
        .where(eq(operations.lotId, lotIdNumber));

      const hasOperations = Number(operationCount[0]?.count || 0) > 0;
      let statusChanged = false;

      if (hasOperations) {
        const activeCycleCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(cycles)
          .where(
            and(
              eq(cycles.lotId, lotIdNumber),
              eq(cycles.state, 'active')
            )
          );

        const activeCycles = Number(activeCycleCount[0]?.count || 0);
        const currentLot = lot[0];

        if (activeCycles === 0 && currentLot.state === 'active') {
          // Deve essere chiuso
          await db
            .update(lots)
            .set({
              state: 'exhausted',
              active: false,
              mortalityNotes: `CHIUSO AUTOMATICAMENTE - Ricalcolo manuale ${new Date().toISOString()}`
            })
            .where(eq(lots.id, lotIdNumber));

          statusChanged = true;
          console.log(`🔴 LOT-LIFECYCLE: Lotto ${lotIdNumber} CHIUSO durante ricalcolo manuale`);
        }
      }

      console.log(`✅ LOT-LIFECYCLE: Ricalcolo completato per lotto ${lotIdNumber}`);

      res.json({
        success: true,
        message: `Statistiche ricalcolate per lotto ${lotIdNumber}`,
        lotId: lotIdNumber,
        statusChanged,
        hasOperations
      });

    } catch (error) {
      console.error('❌ LOT-LIFECYCLE: Errore ricalcolo lotto:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ottieni statistiche del ciclo di vita di tutti i lotti
   * 
   * GET /api/lot-lifecycle/stats
   */
  static async getLifecycleStats(req: Request, res: Response) {
    try {
      console.log('📊 LOT-LIFECYCLE: Generazione statistiche ciclo di vita');

      // Conteggi base per stato
      const lotsByState = await db
        .select({
          state: lots.state,
          count: sql<number>`COUNT(*)`
        })
        .from(lots)
        .groupBy(lots.state);

      // Conteggi semplici per lotti con e senza operazioni
      const lotsWithOpsCount = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${lots.id})`
        })
        .from(lots)
        .innerJoin(operations, eq(operations.lotId, lots.id));
      
      const totalLotsCount = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(lots);

      const lotsWithoutOpsCount = totalLotsCount[0].count - lotsWithOpsCount[0].count;

      // Lotti attivi con cicli attivi
      const activeLotsWithActiveCyclesCount = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${lots.id})`
        })
        .from(lots)
        .innerJoin(cycles, eq(cycles.lotId, lots.id))
        .where(and(eq(lots.state, 'active'), eq(cycles.state, 'active')));

      const totalActiveLotsCount = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(lots)
        .where(eq(lots.state, 'active'));

      const activeLotsWithoutActiveCyclesCount = totalActiveLotsCount[0].count - activeLotsWithActiveCyclesCount[0].count;

      console.log('✅ LOT-LIFECYCLE: Statistiche generate');

      res.json({
        success: true,
        stats: {
          byState: lotsByState,
          withOperations: [
            { hasOps: true, count: lotsWithOpsCount[0].count },
            { hasOps: false, count: lotsWithoutOpsCount }
          ],
          activeLotsWithCycles: [
            { hasCycles: true, count: activeLotsWithActiveCyclesCount[0].count },
            { hasCycles: false, count: activeLotsWithoutActiveCyclesCount }
          ]
        }
      });

    } catch (error) {
      console.error('❌ LOT-LIFECYCLE: Errore generazione statistiche:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Trigger da chiamare quando cambia lo stato di un ciclo
   * Utilizzato dal sistema per aggiornamenti in tempo reale
   */
  static async onCycleStateChanged(cycleId: number, oldState: string, newState: string) {
    try {
      console.log(`🔄 LOT-LIFECYCLE: Trigger - Ciclo ${cycleId}: ${oldState} → ${newState}`);

      // Recupera informazioni del ciclo
      const cycle = await db
        .select()
        .from(cycles)
        .where(eq(cycles.id, cycleId))
        .limit(1);

      if (!cycle || cycle.length === 0 || !cycle[0].lotId) {
        console.log(`ℹ️ LOT-LIFECYCLE: Ciclo ${cycleId} senza lotto associato, skip trigger`);
        return;
      }

      const lotId = cycle[0].lotId;

      // Se un ciclo diventa inattivo, controlla se il lotto deve essere chiuso
      if (oldState === 'active' && newState !== 'active') {
        console.log(`🔍 LOT-LIFECYCLE: Ciclo ${cycleId} non più attivo, controllo lotto ${lotId}`);
        
        // Verifica se ci sono altri cicli attivi per questo lotto
        const remainingActiveCycles = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(cycles)
          .where(
            and(
              eq(cycles.lotId, lotId),
              eq(cycles.state, 'active')
            )
          );

        const activeCycles = Number(remainingActiveCycles[0]?.count || 0);

        if (activeCycles === 0) {
          // Verifica se il lotto ha operazioni (condizione per auto-close)
          const hasOperations = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(operations)
            .where(eq(operations.lotId, lotId));

          const operationCount = Number(hasOperations[0]?.count || 0);

          if (operationCount > 0) {
            // CHIUDI IL LOTTO
            await db
              .update(lots)
              .set({
                state: 'exhausted',
                active: false,
                mortalityNotes: `CHIUSO AUTOMATICAMENTE - Ultimo ciclo attivo terminato (ciclo ${cycleId})`
              })
              .where(eq(lots.id, lotId));

            console.log(`🔴 LOT-LIFECYCLE: Lotto ${lotId} CHIUSO automaticamente - ultimo ciclo terminato`);
          }
        } else {
          console.log(`🟢 LOT-LIFECYCLE: Lotto ${lotId} rimane attivo - ${activeCycles} cicli ancora attivi`);
        }
      }

      // Aggiorna statistiche del lotto
      await LotAutoStatsService.recalculateAllLotStats(lotId);

    } catch (error) {
      console.error(`❌ LOT-LIFECYCLE: Errore trigger ciclo ${cycleId}:`, error);
    }
  }
}