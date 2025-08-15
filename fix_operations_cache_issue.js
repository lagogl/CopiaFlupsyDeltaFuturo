/**
 * Script per risolvere il problema delle operazioni che vengono mostrate nel frontend
 * anche se non esistono nel database. Il problema è dovuto a multiple cache layers.
 */

const { db } = await import('./server/db.js');
const { operations } = await import('./shared/schema.js');
const { OperationsCache } = await import('./server/operations-cache-service.js');
const { invalidateUnifiedCache } = await import('./server/controllers/operations-unified-controller.js');

async function checkAndFixOperationsCache() {
  try {
    console.log('🔍 DIAGNOSI PROBLEMA OPERAZIONI - INIZIO');
    
    // 1. Verifica quante operazioni ci sono realmente nel database
    console.log('\n1. Verifica database...');
    const dbOperations = await db.select().from(operations);
    console.log(`📊 Operazioni nel database: ${dbOperations.length}`);
    
    if (dbOperations.length > 0) {
      console.log('🔍 Prime 5 operazioni nel database:');
      dbOperations.slice(0, 5).forEach((op, index) => {
        console.log(`  ${index + 1}. ID: ${op.id}, Tipo: ${op.type}, Data: ${op.date}, Cestello: ${op.basketId}`);
      });
    }
    
    // 2. Pulisci TUTTE le cache
    console.log('\n2. Pulizia cache...');
    
    // Cache delle operazioni ottimizzate
    OperationsCache.clear();
    console.log('✅ Cache operazioni ottimizzate pulita');
    
    // Cache unificata
    invalidateUnifiedCache();
    console.log('✅ Cache unificata invalidata');
    
    // Cache globali se esistono
    if (global.operationsCache) {
      global.operationsCache.clear();
      console.log('✅ Cache operazioni globale pulita');
    }
    
    if (global.basketsCache) {
      global.basketsCache.clear();
      console.log('✅ Cache cestelli globale pulita');
    }
    
    // 3. Test di verifica - simula una chiamata API
    console.log('\n3. Test chiamata API dopo pulizia cache...');
    
    const testResponse = await fetch('http://localhost:5000/api/operations-unified');
    if (testResponse.ok) {
      const testData = await testResponse.json();
      const apiOperations = testData.data?.operations || [];
      console.log(`📊 Operazioni dalla API dopo pulizia cache: ${apiOperations.length}`);
      console.log(`🚨 Da cache?: ${testData.fromCache ? 'SÌ' : 'NO'}`);
      
      if (apiOperations.length > 0) {
        console.log('🔍 Prime 3 operazioni dalla API:');
        apiOperations.slice(0, 3).forEach((op, index) => {
          console.log(`  ${index + 1}. ID: ${op.id}, Tipo: ${op.type}, Data: ${op.date}`);
        });
      }
    } else {
      console.log('❌ Errore nella chiamata API di test');
    }
    
    // 4. Statistiche finali
    console.log('\n4. Situazione finale:');
    console.log(`📊 Operazioni nel database: ${dbOperations.length}`);
    console.log('✅ Tutte le cache sono state pulite');
    
    if (dbOperations.length === 0) {
      console.log('\n✅ RISOLUZIONE: Il database è effettivamente vuoto.');
      console.log('   Se il frontend mostra ancora operazioni, ricarica la pagina (F5).');
      console.log('   Il frontend dovrebbe ora mostrare "Nessuna operazione trovata".');
    } else {
      console.log('\n⚠️  ATTENZIONE: Ci sono ancora operazioni nel database.');
      console.log('   Se vuoi eliminare tutte le operazioni dal database:');
      console.log('   Usa lo strumento SQL per eseguire: DELETE FROM operations;');
    }
    
    console.log('\n🔍 DIAGNOSI PROBLEMA OPERAZIONI - COMPLETATA');
    
  } catch (error) {
    console.error('❌ Errore durante la diagnosi:', error);
  }
}

// Esegui la diagnosi e risoluzione
await checkAndFixOperationsCache();