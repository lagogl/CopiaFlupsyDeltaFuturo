/**
 * Script per verificare la consistenza del database dopo l'eliminazione delle operazioni
 */

import { db } from './server/storage.ts';
import { baskets, cycles, operations } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function checkConsistency() {
  console.log('🔍 Verifica consistenza database...');
  
  try {
    // 1. Verifica operazioni rimaste
    const remainingOperations = await db.select().from(operations);
    console.log(`📊 Operazioni rimaste nel database: ${remainingOperations.length}`);
    
    if (remainingOperations.length > 0) {
      console.log('Operazioni trovate:', remainingOperations);
    }
    
    // 2. Verifica cicli rimasti
    const remainingCycles = await db.select().from(cycles);
    console.log(`🔄 Cicli rimasti nel database: ${remainingCycles.length}`);
    
    if (remainingCycles.length > 0) {
      console.log('Cicli trovati:', remainingCycles);
    }
    
    // 3. Verifica stato cestelli
    const problematicBaskets = await db.select().from(baskets)
      .where(eq(baskets.flupsyId, 2516));
    
    console.log(`🗂️ Cestelli trovati per FLUPSY 2516: ${problematicBaskets.length}`);
    
    // Conta cestelli per stato
    const basketStates = problematicBaskets.reduce((acc, basket) => {
      acc[basket.state] = (acc[basket.state] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Stati cestelli:', basketStates);
    
    // 4. Identifica cestelli con problemi
    const basketsWithCycles = problematicBaskets.filter(b => b.currentCycleId !== null);
    const basketsWithCodes = problematicBaskets.filter(b => b.cycleCode !== null);
    
    console.log(`❌ Cestelli con currentCycleId non nullo: ${basketsWithCycles.length}`);
    console.log(`❌ Cestelli con cycleCode non nullo: ${basketsWithCodes.length}`);
    
    if (basketsWithCycles.length > 0) {
      console.log('Cestelli problematici (currentCycleId):', basketsWithCycles.map(b => ({
        id: b.id,
        physicalNumber: b.physicalNumber,
        state: b.state,
        currentCycleId: b.currentCycleId
      })));
    }
    
    if (basketsWithCodes.length > 0) {
      console.log('Cestelli problematici (cycleCode):', basketsWithCodes.map(b => ({
        id: b.id,
        physicalNumber: b.physicalNumber,
        state: b.state,
        cycleCode: b.cycleCode
      })));
    }
    
    // 5. Fix automatico se necessario
    if (basketsWithCycles.length > 0 || basketsWithCodes.length > 0) {
      console.log('🔧 Applico fix automatico...');
      
      await db.update(baskets)
        .set({
          currentCycleId: null,
          cycleCode: null,
          state: 'available'
        })
        .where(eq(baskets.flupsyId, 2516));
      
      console.log('✅ Fix applicato: tutti i cestelli resettati a stato disponibile');
    } else {
      console.log('✅ Database già consistente');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

checkConsistency();