/**
 * Controller per la gestione del controllo di integrità del database
 * 
 * Questo controller espone endpoint per verificare e riparare l'integrità del database,
 * permettendo di identificare e correggere record orfani o relazioni non valide.
 */

import { Request, Response } from 'express';
import { checkDatabaseIntegrity } from '../utils/database-integrity';

/**
 * Esegue un controllo dell'integrità del database e restituisce i risultati
 * @param req Richiesta Express
 * @param res Risposta Express
 */
export async function checkDatabaseIntegrityHandler(req: Request, res: Response) {
  try {
    const fix = req.query.fix === 'true';
    
    console.log(`Avvio controllo integrità database. Modalità fix: ${fix}`);
    const results = await checkDatabaseIntegrity(fix);
    
    // Formatta un messaggio di riepilogo
    const summary = {
      mode: fix ? 'CORREZIONE' : 'SOLO REPORT',
      issues: {
        operationsWithoutBaskets: results.orphanedOperations,
        cyclesWithoutBaskets: results.orphanedCycles,
        basketsWithInvalidFlupsy: results.orphanedBaskets,
        basketPositionsOrphaned: results.orphanedBasketPositions,
        screeningSourceBasketsOrphaned: results.orphanedScreeningSourceBaskets,
        screeningDestinationBasketsOrphaned: results.orphanedScreeningDestinationBaskets,
        screeningHistoryRecordsOrphaned: results.orphanedScreeningBasketHistory,
        screeningsIncomplete: results.incompleteScreenings,
        screeningsWithoutBaskets: results.orphanedScreenings,
        danglingSizeReferences: results.danglingSizeReferences,
        danglingLotReferences: results.danglingLotReferences,
        basketsWithoutPositions: results.basketsWithoutPositions
      },
      totalIssues: 
        results.orphanedOperations +
        results.orphanedCycles +
        results.orphanedBaskets +
        results.orphanedBasketPositions +
        results.orphanedScreeningSourceBaskets +
        results.orphanedScreeningDestinationBaskets +
        results.orphanedScreeningBasketHistory +
        results.incompleteScreenings +
        results.orphanedScreenings +
        results.danglingSizeReferences +
        results.danglingLotReferences +
        results.basketsWithoutPositions,
      totalFixed: fix ? results.totalFixed : 0
    };
    
    // Restituisci i risultati
    return res.status(200).json({
      success: true,
      message: `Controllo integrità database completato in modalità ${summary.mode}`,
      summary,
      details: results
    });
  } catch (error) {
    console.error('Errore durante il controllo dell\'integrità del database:', error);
    return res.status(500).json({
      success: false,
      message: 'Si è verificato un errore durante il controllo dell\'integrità del database',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}