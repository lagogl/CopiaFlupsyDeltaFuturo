/**
 * Database Consistency Manager
 * 
 * Gestisce automaticamente le inconsistenze del database causate dalla funzione
 * "Azzeramento Operazioni, Cicli e Cestelli" che può eliminare i cicli ma lasciare
 * i cestelli con riferimenti invalidi.
 * 
 * Questo modulo fornisce funzioni per:
 * 1. Rilevare automaticamente le inconsistenze
 * 2. Correggere i riferimenti orfani
 * 3. Ripristinare la coerenza del database
 */

const { db } = require('./server/db');
const { baskets, cycles, operations } = require('./shared/schema');
const { eq, isNull, isNotNull, and } = require('drizzle-orm');

/**
 * Rileva e corregge automaticamente le inconsistenze del database
 * causate dalla funzione di azzeramento
 */
async function detectAndFixDatabaseInconsistencies() {
  console.log('🔍 CONTROLLO CONSISTENZA DATABASE - Inizio analisi...');
  
  const issues = [];
  let fixedIssues = 0;

  try {
    // 1. Verifica cestelli con currentCycleId che puntano a cicli inesistenti
    const orphanedBaskets = await db
      .select()
      .from(baskets)
      .leftJoin(cycles, eq(baskets.currentCycleId, cycles.id))
      .where(and(
        isNotNull(baskets.currentCycleId),
        isNull(cycles.id)
      ));

    if (orphanedBaskets.length > 0) {
      console.log(`⚠️ TROVATI ${orphanedBaskets.length} cestelli con riferimenti a cicli inesistenti`);
      issues.push({
        type: 'orphaned_basket_cycles',
        count: orphanedBaskets.length,
        description: 'Cestelli con currentCycleId che puntano a cicli eliminati'
      });

      // Correggi automaticamente: imposta currentCycleId a null e state a 'available'
      const basketIds = orphanedBaskets.map(item => item.baskets.id);
      
      await db
        .update(baskets)
        .set({
          currentCycleId: null,
          state: 'available'
        })
        .where(eq(baskets.id, basketIds[0])); // Aggiorna uno alla volta per sicurezza

      for (let i = 1; i < basketIds.length; i++) {
        await db
          .update(baskets)
          .set({
            currentCycleId: null,
            state: 'available'
          })
          .where(eq(baskets.id, basketIds[i]));
      }

      fixedIssues += orphanedBaskets.length;
      console.log(`✅ CORRETTI ${orphanedBaskets.length} cestelli con riferimenti orfani`);
    }

    // 2. Verifica operazioni che puntano a cicli inesistenti
    const orphanedOperations = await db
      .select()
      .from(operations)
      .leftJoin(cycles, eq(operations.cycleId, cycles.id))
      .where(and(
        isNotNull(operations.cycleId),
        isNull(cycles.id)
      ));

    if (orphanedOperations.length > 0) {
      console.log(`⚠️ TROVATE ${orphanedOperations.length} operazioni con riferimenti a cicli inesistenti`);
      issues.push({
        type: 'orphaned_operation_cycles',
        count: orphanedOperations.length,
        description: 'Operazioni con cycleId che puntano a cicli eliminati'
      });

      // Le operazioni orfane dovrebbero essere eliminate o aggiornate
      // Per sicurezza, le eliminiamo dato che i cicli non esistono più
      const operationIds = orphanedOperations.map(item => item.operations.id);
      
      for (const opId of operationIds) {
        await db
          .delete(operations)
          .where(eq(operations.id, opId));
      }

      fixedIssues += orphanedOperations.length;
      console.log(`✅ ELIMINATE ${orphanedOperations.length} operazioni orfane`);
    }

    // 3. Verifica cestelli in stato 'in-use' senza ciclo attivo
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
 * Middleware per verificare la consistenza del database prima delle operazioni critiche
 */
async function ensureDatabaseConsistency() {
  const result = await detectAndFixDatabaseInconsistencies();
  
  if (!result.consistent) {
    console.log('🔄 INCONSISTENZE RILEVATE E CORRETTE AUTOMATICAMENTE');
    
    // Invalida le cache per assicurare dati aggiornati
    if (global.basketCache) {
      global.basketCache.clear();
      console.log('🗑️ Cache cestelli invalidata dopo correzione inconsistenze');
    }
    
    if (global.cycleCache) {
      global.cycleCache.clear();
      console.log('🗑️ Cache cicli invalidata dopo correzione inconsistenze');
    }
  }
  
  return result;
}

/**
 * Funzione di utilità per eseguire il controllo manuale della consistenza
 */
async function runConsistencyCheck() {
  console.log('🚀 AVVIO CONTROLLO MANUALE CONSISTENZA DATABASE...');
  const result = await detectAndFixDatabaseInconsistencies();
  
  console.log('📊 REPORT CONSISTENZA:', {
    consistente: result.consistent,
    problemiRilevati: result.issues.length,
    problemiRisolti: result.fixedIssues
  });
  
  return result;
}

// Esportazioni per compatibilità CommonJS
module.exports = {
  detectAndFixDatabaseInconsistencies,
  ensureDatabaseConsistency,
  runConsistencyCheck
};