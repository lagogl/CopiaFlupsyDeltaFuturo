/**
 * Servizio per gestire automaticamente le inconsistenze del database
 * causate dalla funzione "Azzeramento Operazioni, Cicli e Cestelli"
 */

import { db } from './db';
import { baskets, cycles, operations } from '../shared/schema';
import { eq, isNull, isNotNull, and } from 'drizzle-orm';

/**
 * Rileva e corregge automaticamente le inconsistenze del database
 */
export async function detectAndFixDatabaseInconsistencies() {
  console.log('🔍 CONTROLLO CONSISTENZA DATABASE - Inizio analisi...');
  
  const issues = [];
  let fixedIssues = 0;

  try {
    // 1. Verifica cestelli con currentCycleId che puntano a cicli inesistenti
    // Usa query separata più semplice per evitare timeout
    const allBaskets = await db
      .select()
      .from(baskets)
      .where(isNotNull(baskets.currentCycleId));
    
    const allCycles = await db
      .select({ id: cycles.id })
      .from(cycles);
    
    const cycleIds = new Set(allCycles.map(c => c.id));
    const orphanedBaskets = allBaskets.filter(b => b.currentCycleId && !cycleIds.has(b.currentCycleId));

    if (orphanedBaskets.length > 0) {
      console.log(`⚠️ TROVATI ${orphanedBaskets.length} cestelli con riferimenti a cicli inesistenti`);
      issues.push({
        type: 'orphaned_basket_cycles',
        count: orphanedBaskets.length,
        description: 'Cestelli con currentCycleId che puntano a cicli eliminati'
      });

      // Correggi automaticamente: imposta currentCycleId a null e state a 'available'
      for (const item of orphanedBaskets) {
        await db
          .update(baskets)
          .set({
            currentCycleId: null,
            state: 'available'
          })
          .where(eq(baskets.id, item.id));
      }

      fixedIssues += orphanedBaskets.length;
      console.log(`✅ CORRETTI ${orphanedBaskets.length} cestelli con riferimenti orfani`);
    }

    // 2. Verifica cestelli in stato 'in-use' senza ciclo attivo
    const basketsInUseWithoutCycle = await db
      .select()
      .from(baskets)
      .where(and(
        eq(baskets.state, 'in-use'),
        isNull(baskets.currentCycleId)
      ));

    if (basketsInUseWithoutCycle.length > 0) {
      console.log(`⚠️ TROVATI ${basketsInUseWithoutCycle.length} cestelli 'in-use' senza ciclo attivo`);
      issues.push({
        type: 'baskets_in_use_without_cycle',
        count: basketsInUseWithoutCycle.length,
        description: 'Cestelli in stato "in-use" ma senza currentCycleId'
      });

      // Correggi: imposta stato a 'available'
      for (const basket of basketsInUseWithoutCycle) {
        await db
          .update(baskets)
          .set({ state: 'available' })
          .where(eq(baskets.id, basket.id));
      }

      fixedIssues += basketsInUseWithoutCycle.length;
      console.log(`✅ CORRETTI ${basketsInUseWithoutCycle.length} cestelli 'in-use' senza ciclo`);
    }

    // Risultato finale
    if (issues.length === 0) {
      console.log('✅ DATABASE CONSISTENTE - Nessuna inconsistenza rilevata');
      return {
        consistent: true,
        issues: [],
        fixedIssues: 0
      };
    } else {
      console.log(`🔧 DATABASE RIPARATO - Risolte ${fixedIssues} inconsistenze`);
      return {
        consistent: false,
        issues,
        fixedIssues,
        message: `Rilevate e corrette automaticamente ${fixedIssues} inconsistenze causate dall'azzeramento`
      };
    }

  } catch (error) {
    console.error('❌ ERRORE nel controllo consistenza database:', error);
    throw error;
  }
}

/**
 * Middleware per verificare la consistenza prima delle operazioni critiche
 */
export async function ensureDatabaseConsistency() {
  const result = await detectAndFixDatabaseInconsistencies();
  
  if (!result.consistent) {
    console.log('🔄 INCONSISTENZE RILEVATE E CORRETTE AUTOMATICAMENTE');
    
    // Invalida le cache per assicurare dati aggiornati
    if ((global as any).basketCache) {
      (global as any).basketCache.clear();
      console.log('🗑️ Cache cestelli invalidata dopo correzione inconsistenze');
    }
    
    if ((global as any).cycleCache) {
      (global as any).cycleCache.clear();
      console.log('🗑️ Cache cicli invalidata dopo correzione inconsistenze');
    }
  }
  
  return result;
}

/**
 * Controllo rapido per verificare se il database necessita di riparazione
 */
export async function quickConsistencyCheck(): Promise<boolean> {
  try {
    // Verifica rapida: cestelli con currentCycleId che puntano a cicli inesistenti
    const orphanedBaskets = await db
      .select({ count: baskets.id })
      .from(baskets)
      .leftJoin(cycles, eq(baskets.currentCycleId, cycles.id))
      .where(and(
        isNotNull(baskets.currentCycleId),
        isNull(cycles.id)
      ));

    return orphanedBaskets.length === 0;
  } catch (error) {
    console.error('Errore durante controllo rapido consistenza:', error);
    return false;
  }
}