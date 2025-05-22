/**
 * Utility per il controllo dell'integrità del database e la pulizia dei record orfani
 * 
 * Questo modulo fornisce funzioni per identificare e riparare problemi di integrità
 * nel database, come record orfani o riferimenti non validi.
 */

import { db } from '../db';
import { sql, eq, and, isNull, inArray } from 'drizzle-orm';
import {
  flupsys,
  baskets,
  cycles,
  operations,
  sizes,
  screeningOperations,
  screeningSourceBaskets,
  screeningDestinationBaskets,
  screeningBasketHistory,
  lots,
  sgrRates,
  growthForecasts,
  basketPositionHistory
} from '../../shared/schema';

// Interfaccia per i risultati dei controlli di integrità
export interface IntegrityCheckResults {
  orphanedOperations: number;
  orphanedCycles: number;
  orphanedBaskets: number;
  orphanedBasketPositions: number;
  orphanedScreeningSourceBaskets: number;
  orphanedScreeningDestinationBaskets: number;
  orphanedScreeningBasketHistory: number;
  orphanedScreenings: number;
  danglingSizeReferences: number;
  danglingLotReferences: number;
  incompleteScreenings: number;
  basketsWithoutPositions: number;
  totalFixed: number;
}

// Funzione principale che esegue tutti i controlli di integrità
export async function checkDatabaseIntegrity(fix = false): Promise<IntegrityCheckResults> {
  console.log('=== CONTROLLO INTEGRITÀ DATABASE ===');
  console.log(`Modalità: ${fix ? 'CORREZIONE' : 'SOLO REPORT'}`);
  console.log('===================================\n');

  let results: IntegrityCheckResults = {
    orphanedOperations: 0,
    orphanedCycles: 0,
    orphanedBaskets: 0,
    orphanedBasketPositions: 0,
    orphanedScreeningSourceBaskets: 0,
    orphanedScreeningDestinationBaskets: 0,
    orphanedScreeningBasketHistory: 0,
    orphanedScreenings: 0,
    danglingSizeReferences: 0,
    danglingLotReferences: 0,
    incompleteScreenings: 0,
    basketsWithoutPositions: 0,
    totalFixed: 0
  };

  // 1. Operazioni senza cestelli validi
  results.orphanedOperations = await checkOrphanedOperations(fix);
  
  // 2. Cicli senza cestelli validi
  results.orphanedCycles = await checkOrphanedCycles(fix);
  
  // 3. Cestelli senza FLUPSY validi
  results.orphanedBaskets = await checkOrphanedBaskets(fix);
  
  // 4. Posizioni cestelli senza cestelli o FLUPSY validi
  results.orphanedBasketPositions = await checkOrphanedBasketPositions(fix);
  
  // 5. Record di vagliatura orfani (source baskets)
  results.orphanedScreeningSourceBaskets = await checkOrphanedScreeningSourceBaskets(fix);
  
  // 6. Record di vagliatura orfani (destination baskets)
  results.orphanedScreeningDestinationBaskets = await checkOrphanedScreeningDestinationBaskets(fix);
  
  // 7. Record di storia vagliatura orfani
  results.orphanedScreeningBasketHistory = await checkOrphanedScreeningBasketHistory(fix);
  
  // 8. Vagliature incomplete o senza cestelli
  results.incompleteScreenings = await checkIncompleteScreenings(fix);
  
  // 9. Vagliature orfane (senza cestelli associati)
  results.orphanedScreenings = await checkOrphanedScreenings(fix);
  
  // 10. Riferimenti a taglie non esistenti
  results.danglingSizeReferences = await checkDanglingSizeReferences(fix);
  
  // 11. Riferimenti a lotti non esistenti
  results.danglingLotReferences = await checkDanglingLotReferences(fix);
  
  // 12. Cestelli senza posizioni assegnate
  results.basketsWithoutPositions = await checkBasketsWithoutPositions();

  // Calcolo totale record sistemati
  if (fix) {
    results.totalFixed = 
      results.orphanedOperations + 
      results.orphanedCycles + 
      results.orphanedBaskets +
      results.orphanedBasketPositions +
      results.orphanedScreeningSourceBaskets +
      results.orphanedScreeningDestinationBaskets +
      results.orphanedScreeningBasketHistory +
      results.orphanedScreenings +
      results.danglingSizeReferences +
      results.danglingLotReferences +
      results.incompleteScreenings;
  }

  // Stampa i risultati
  console.log('\n=== RIEPILOGO CONTROLLO INTEGRITÀ ===');
  console.log(`Operazioni orfane: ${results.orphanedOperations}`);
  console.log(`Cicli orfani: ${results.orphanedCycles}`);
  console.log(`Cestelli orfani: ${results.orphanedBaskets}`);
  console.log(`Posizioni cestelli orfane: ${results.orphanedBasketPositions}`);
  console.log(`Source baskets vagliatura orfani: ${results.orphanedScreeningSourceBaskets}`);
  console.log(`Destination baskets vagliatura orfani: ${results.orphanedScreeningDestinationBaskets}`);
  console.log(`Record storia vagliatura orfani: ${results.orphanedScreeningBasketHistory}`);
  console.log(`Vagliature incomplete: ${results.incompleteScreenings}`);
  console.log(`Vagliature orfane: ${results.orphanedScreenings}`);
  console.log(`Riferimenti a taglie non esistenti: ${results.danglingSizeReferences}`);
  console.log(`Riferimenti a lotti non esistenti: ${results.danglingLotReferences}`);
  console.log(`Cestelli senza posizione assegnata: ${results.basketsWithoutPositions}`);
  
  if (fix) {
    console.log(`\nTotale record corretti: ${results.totalFixed}`);
  }
  
  return results;
}

// 1. Operazioni senza cestelli validi
async function checkOrphanedOperations(fix: boolean): Promise<number> {
  console.log('\n1. Controllo operazioni orfane...');
  
  // Trova operazioni con riferimenti a cestelli non esistenti
  const orphanedOps = await db.select()
    .from(operations)
    .leftJoin(baskets, eq(operations.basketId, baskets.id))
    .where(isNull(baskets.id));
  
  console.log(`Trovate ${orphanedOps.length} operazioni orfane`);
  
  if (fix && orphanedOps.length > 0) {
    console.log('Eliminazione operazioni orfane...');
    for (const op of orphanedOps) {
      await db.delete(operations)
        .where(eq(operations.id, op.operations.id));
    }
    console.log(`Eliminate ${orphanedOps.length} operazioni orfane`);
  }
  
  return orphanedOps.length;
}

// 2. Cicli senza cestelli validi
async function checkOrphanedCycles(fix: boolean): Promise<number> {
  console.log('\n2. Controllo cicli orfani...');
  
  // Trova cicli con riferimenti a cestelli non esistenti
  const orphanedCycles = await db.select()
    .from(cycles)
    .leftJoin(baskets, eq(cycles.basketId, baskets.id))
    .where(isNull(baskets.id));
  
  console.log(`Trovati ${orphanedCycles.length} cicli orfani`);
  
  if (fix && orphanedCycles.length > 0) {
    console.log('Eliminazione cicli orfani...');
    for (const cycle of orphanedCycles) {
      await db.delete(cycles)
        .where(eq(cycles.id, cycle.cycles.id));
    }
    console.log(`Eliminati ${orphanedCycles.length} cicli orfani`);
  }
  
  return orphanedCycles.length;
}

// 3. Cestelli senza FLUPSY validi
async function checkOrphanedBaskets(fix: boolean): Promise<number> {
  console.log('\n3. Controllo cestelli orfani...');
  
  // Trova cestelli con riferimenti a FLUPSY non esistenti
  const orphanedBaskets = await db.select()
    .from(baskets)
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
    .where(and(
      sql`${baskets.flupsyId} IS NOT NULL`,
      isNull(flupsys.id)
    ));
  
  console.log(`Trovati ${orphanedBaskets.length} cestelli con riferimenti a FLUPSY non esistenti`);
  
  if (fix && orphanedBaskets.length > 0) {
    console.log('Correzione cestelli orfani...');
    for (const basket of orphanedBaskets) {
      // Imposta flupsyId a NULL invece di eliminare il cestello
      await db.update(baskets)
        .set({ flupsyId: null, row: null, position: null })
        .where(eq(baskets.id, basket.baskets.id));
    }
    console.log(`Corretti ${orphanedBaskets.length} cestelli orfani`);
  }
  
  return orphanedBaskets.length;
}

// 4. Posizioni cestelli senza cestelli o FLUPSY validi
async function checkOrphanedBasketPositions(fix: boolean): Promise<number> {
  console.log('\n4. Controllo posizioni cestelli orfane...');
  
  // Trova posizioni con riferimenti a cestelli non esistenti
  const orphanedPositions1 = await db.select()
    .from(basketPositions)
    .leftJoin(baskets, eq(basketPositions.basketId, baskets.id))
    .where(isNull(baskets.id));
  
  // Trova posizioni con riferimenti a FLUPSY non esistenti
  const orphanedPositions2 = await db.select()
    .from(basketPositions)
    .leftJoin(flupsys, eq(basketPositions.flupsyId, flupsys.id))
    .where(isNull(flupsys.id));
  
  const totalOrphaned = orphanedPositions1.length + orphanedPositions2.length;
  console.log(`Trovate ${totalOrphaned} posizioni cestelli orfane`);
  console.log(`- ${orphanedPositions1.length} senza cestello valido`);
  console.log(`- ${orphanedPositions2.length} senza FLUPSY valido`);
  
  if (fix && totalOrphaned > 0) {
    console.log('Eliminazione posizioni cestelli orfane...');
    // Elimina posizioni con cestelli non validi
    for (const pos of orphanedPositions1) {
      await db.delete(basketPositions)
        .where(eq(basketPositions.id, pos.basket_positions.id));
    }
    // Elimina posizioni con FLUPSY non validi
    for (const pos of orphanedPositions2) {
      await db.delete(basketPositions)
        .where(eq(basketPositions.id, pos.basket_positions.id));
    }
    console.log(`Eliminate ${totalOrphaned} posizioni cestelli orfane`);
  }
  
  return totalOrphaned;
}

// 5. Record di vagliatura orfani (source baskets)
async function checkOrphanedScreeningSourceBaskets(fix: boolean): Promise<number> {
  console.log('\n5. Controllo source baskets di vagliatura orfani...');
  
  // Trova source baskets con riferimenti a screening non esistenti
  const orphanedSourceBaskets1 = await db.select()
    .from(screeningSourceBaskets)
    .leftJoin(screenings, eq(screeningSourceBaskets.screeningId, screenings.id))
    .where(isNull(screenings.id));
  
  // Trova source baskets con riferimenti a cestelli non esistenti
  const orphanedSourceBaskets2 = await db.select()
    .from(screeningSourceBaskets)
    .leftJoin(baskets, eq(screeningSourceBaskets.basketId, baskets.id))
    .where(isNull(baskets.id));
  
  const totalOrphaned = orphanedSourceBaskets1.length + orphanedSourceBaskets2.length;
  console.log(`Trovati ${totalOrphaned} source baskets di vagliatura orfani`);
  console.log(`- ${orphanedSourceBaskets1.length} senza vagliatura valida`);
  console.log(`- ${orphanedSourceBaskets2.length} senza cestello valido`);
  
  if (fix && totalOrphaned > 0) {
    console.log('Eliminazione source baskets orfani...');
    // Elimina record orfani (screening non valido)
    for (const sb of orphanedSourceBaskets1) {
      await db.delete(screeningSourceBaskets)
        .where(eq(screeningSourceBaskets.id, sb.screening_source_baskets.id));
    }
    // Elimina record orfani (cestello non valido)
    for (const sb of orphanedSourceBaskets2) {
      await db.delete(screeningSourceBaskets)
        .where(eq(screeningSourceBaskets.id, sb.screening_source_baskets.id));
    }
    console.log(`Eliminati ${totalOrphaned} source baskets orfani`);
  }
  
  return totalOrphaned;
}

// 6. Record di vagliatura orfani (destination baskets)
async function checkOrphanedScreeningDestinationBaskets(fix: boolean): Promise<number> {
  console.log('\n6. Controllo destination baskets di vagliatura orfani...');
  
  // Trova destination baskets con riferimenti a screening non esistenti
  const orphanedDestBaskets1 = await db.select()
    .from(screeningDestinationBaskets)
    .leftJoin(screenings, eq(screeningDestinationBaskets.screeningId, screenings.id))
    .where(isNull(screenings.id));
  
  // Trova destination baskets con riferimenti a cestelli non esistenti
  const orphanedDestBaskets2 = await db.select()
    .from(screeningDestinationBaskets)
    .leftJoin(baskets, eq(screeningDestinationBaskets.basketId, baskets.id))
    .where(isNull(baskets.id));
  
  const totalOrphaned = orphanedDestBaskets1.length + orphanedDestBaskets2.length;
  console.log(`Trovati ${totalOrphaned} destination baskets di vagliatura orfani`);
  console.log(`- ${orphanedDestBaskets1.length} senza vagliatura valida`);
  console.log(`- ${orphanedDestBaskets2.length} senza cestello valido`);
  
  if (fix && totalOrphaned > 0) {
    console.log('Eliminazione destination baskets orfani...');
    // Elimina record orfani (screening non valido)
    for (const db of orphanedDestBaskets1) {
      await db.delete(screeningDestinationBaskets)
        .where(eq(screeningDestinationBaskets.id, db.screening_destination_baskets.id));
    }
    // Elimina record orfani (cestello non valido)
    for (const db of orphanedDestBaskets2) {
      await db.delete(screeningDestinationBaskets)
        .where(eq(screeningDestinationBaskets.id, db.screening_destination_baskets.id));
    }
    console.log(`Eliminati ${totalOrphaned} destination baskets orfani`);
  }
  
  return totalOrphaned;
}

// 7. Record di storia vagliatura orfani
async function checkOrphanedScreeningBasketHistory(fix: boolean): Promise<number> {
  console.log('\n7. Controllo record storia vagliatura orfani...');
  
  // Trova history records con riferimenti a screening non esistenti
  const orphanedHistory1 = await db.select()
    .from(screeningBasketHistory)
    .leftJoin(screenings, eq(screeningBasketHistory.screeningId, screenings.id))
    .where(isNull(screenings.id));
  
  // Trova history records con riferimenti a cestelli source non esistenti
  const orphanedHistory2 = await db.select()
    .from(screeningBasketHistory)
    .leftJoin(baskets, eq(screeningBasketHistory.sourceBasketId, baskets.id))
    .where(isNull(baskets.id));
  
  // Trova history records con riferimenti a cestelli destination non esistenti
  const orphanedHistory3 = await db.select()
    .from(screeningBasketHistory)
    .leftJoin(baskets, eq(screeningBasketHistory.destinationBasketId, baskets.id))
    .where(isNull(baskets.id));
  
  const totalOrphaned = orphanedHistory1.length + orphanedHistory2.length + orphanedHistory3.length;
  console.log(`Trovati ${totalOrphaned} record storia vagliatura orfani`);
  console.log(`- ${orphanedHistory1.length} senza vagliatura valida`);
  console.log(`- ${orphanedHistory2.length} senza cestello source valido`);
  console.log(`- ${orphanedHistory3.length} senza cestello destination valido`);
  
  if (fix && totalOrphaned > 0) {
    console.log('Eliminazione record storia vagliatura orfani...');
    // Elimina record orfani (screening non valido)
    for (const h of orphanedHistory1) {
      await db.delete(screeningBasketHistory)
        .where(eq(screeningBasketHistory.id, h.screening_basket_history.id));
    }
    // Elimina record orfani (cestello source non valido)
    for (const h of orphanedHistory2) {
      await db.delete(screeningBasketHistory)
        .where(eq(screeningBasketHistory.id, h.screening_basket_history.id));
    }
    // Elimina record orfani (cestello destination non valido)
    for (const h of orphanedHistory3) {
      await db.delete(screeningBasketHistory)
        .where(eq(screeningBasketHistory.id, h.screening_basket_history.id));
    }
    console.log(`Eliminati ${totalOrphaned} record storia vagliatura orfani`);
  }
  
  return totalOrphaned;
}

// 8. Vagliature incomplete (stato 'in corso' ma senza cestelli source/destination)
async function checkIncompleteScreenings(fix: boolean): Promise<number> {
  console.log('\n8. Controllo vagliature incomplete...');
  
  // Trova vagliature con stato "in corso" ma senza cestelli source
  const screeningsWithoutSource = await db.select()
    .from(screenings)
    .leftJoin(
      screeningSourceBaskets,
      eq(screenings.id, screeningSourceBaskets.screeningId)
    )
    .where(
      and(
        eq(screenings.state, 'in-corso'),
        isNull(screeningSourceBaskets.id)
      )
    )
    .groupBy(screenings.id);
  
  console.log(`Trovate ${screeningsWithoutSource.length} vagliature incomplete (senza cestelli source)`);
  
  if (fix && screeningsWithoutSource.length > 0) {
    console.log('Correzione vagliature incomplete...');
    for (const screening of screeningsWithoutSource) {
      // Imposta lo stato a "cancelled" per le vagliature incomplete
      await db.update(screenings)
        .set({ state: 'cancelled' })
        .where(eq(screenings.id, screening.screenings.id));
    }
    console.log(`Corrette ${screeningsWithoutSource.length} vagliature incomplete`);
  }
  
  return screeningsWithoutSource.length;
}

// 9. Vagliature orfane (senza cestelli associati)
async function checkOrphanedScreenings(fix: boolean): Promise<number> {
  console.log('\n9. Controllo vagliature orfane...');
  
  // Trova vagliature senza cestelli source e destination
  const allScreenings = await db.select().from(screenings);
  const orphanedScreenings = [];
  
  for (const screening of allScreenings) {
    const sourceBaskets = await db.select()
      .from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningId, screening.id));
    
    const destBaskets = await db.select()
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, screening.id));
    
    if (sourceBaskets.length === 0 && destBaskets.length === 0) {
      orphanedScreenings.push(screening);
    }
  }
  
  console.log(`Trovate ${orphanedScreenings.length} vagliature orfane (senza cestelli associati)`);
  
  if (fix && orphanedScreenings.length > 0) {
    console.log('Eliminazione vagliature orfane...');
    for (const screening of orphanedScreenings) {
      await db.delete(screenings)
        .where(eq(screenings.id, screening.id));
    }
    console.log(`Eliminate ${orphanedScreenings.length} vagliature orfane`);
  }
  
  return orphanedScreenings.length;
}

// 10. Riferimenti a taglie non esistenti
async function checkDanglingSizeReferences(fix: boolean): Promise<number> {
  console.log('\n10. Controllo riferimenti a taglie non esistenti...');
  
  // Ottieni tutti gli ID delle taglie esistenti
  const allSizes = await db.select({ id: sizes.id }).from(sizes);
  const validSizeIds = allSizes.map(size => size.id);
  
  // Trova operazioni con riferimenti a taglie non esistenti
  const orphanedOperations = await db.select()
    .from(operations)
    .where(
      and(
        sql`${operations.sizeId} IS NOT NULL`,
        sql`${operations.sizeId} NOT IN (${validSizeIds.join(',')})`
      )
    );
  
  console.log(`Trovate ${orphanedOperations.length} operazioni con riferimenti a taglie non esistenti`);
  
  if (fix && orphanedOperations.length > 0) {
    console.log('Correzione riferimenti a taglie non esistenti...');
    for (const op of orphanedOperations) {
      await db.update(operations)
        .set({ sizeId: null })
        .where(eq(operations.id, op.id));
    }
    console.log(`Corretti ${orphanedOperations.length} riferimenti a taglie non esistenti`);
  }
  
  return orphanedOperations.length;
}

// 11. Riferimenti a lotti non esistenti
async function checkDanglingLotReferences(fix: boolean): Promise<number> {
  console.log('\n11. Controllo riferimenti a lotti non esistenti...');
  
  // Ottieni tutti gli ID dei lotti esistenti
  const allLots = await db.select({ id: lots.id }).from(lots);
  const validLotIds = allLots.map(lot => lot.id);
  
  // Trova operazioni con riferimenti a lotti non esistenti
  const orphanedOperations = await db.select()
    .from(operations)
    .where(
      and(
        sql`${operations.lotId} IS NOT NULL`,
        sql`${operations.lotId} NOT IN (${validLotIds.length > 0 ? validLotIds.join(',') : 0})`
      )
    );
  
  console.log(`Trovate ${orphanedOperations.length} operazioni con riferimenti a lotti non esistenti`);
  
  if (fix && orphanedOperations.length > 0) {
    console.log('Correzione riferimenti a lotti non esistenti...');
    for (const op of orphanedOperations) {
      await db.update(operations)
        .set({ lotId: null })
        .where(eq(operations.id, op.id));
    }
    console.log(`Corretti ${orphanedOperations.length} riferimenti a lotti non esistenti`);
  }
  
  return orphanedOperations.length;
}

// 12. Cestelli senza posizioni assegnate
async function checkBasketsWithoutPositions(): Promise<number> {
  console.log('\n12. Controllo cestelli senza posizioni assegnate...');
  
  // Trova cestelli che hanno un FLUPSY ma nessuna posizione assegnata
  const basketsWithoutPositions = await db.select()
    .from(baskets)
    .leftJoin(
      basketPositionHistory,
      and(
        eq(baskets.id, basketPositionHistory.basketId),
        isNull(basketPositionHistory.endDate)
      )
    )
    .where(
      and(
        sql`${baskets.flupsyId} IS NOT NULL`,
        isNull(basketPositionHistory.id)
      )
    );
  
  console.log(`Trovati ${basketsWithoutPositions.length} cestelli senza posizioni assegnate`);
  
  // Nota: non facciamo correzioni automatiche per questo caso, perché
  // potrebbe essere una situazione valida (cestello appena assegnato a un FLUPSY
  // ma ancora senza una posizione specifica)
  
  return basketsWithoutPositions.length;
}