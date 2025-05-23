/**
 * Script per correggere il problema delle vendite durante la vagliatura
 * 
 * Questo script risolve il problema "violates foreign key constraint fk_operations_cycle_id"
 * che si verifica quando si tenta di completare una vagliatura con cestelli destinati alla vendita.
 * 
 * Eseguire questo script quando l'applicazione non è in esecuzione.
 */

import { db } from './server/db.js';
// Modifichiamo l'import per utilizzare il percorso corretto
import { operations, cycles, selectionDestinationBaskets, selections, baskets } from './shared/schema.js';
import { eq, and, or } from 'drizzle-orm';

async function fixVenditaVagliatura() {
  console.log('Inizializzazione correzione problema vendite durante vagliatura...');
  
  try {
    // Eseguiamo tutto in una transazione per garantire la coerenza dei dati
    await db.transaction(async (tx) => {
      // 1. Ottieni tutte le selezioni (vagliature) in stato draft che hanno cestelli destinazione in vendita
      const selectionDrafts = await tx.select()
        .from(selections)
        .where(eq(selections.status, 'draft'));
      
      if (selectionDrafts.length === 0) {
        console.log('Nessuna selezione in stato draft trovata.');
        return;
      }
      
      console.log(`Trovate ${selectionDrafts.length} selezioni in stato draft.`);
      
      // Per ogni selezione in draft
      for (const selection of selectionDrafts) {
        // Ottieni i cestelli destinati alla vendita
        const soldBaskets = await tx.select()
          .from(selectionDestinationBaskets)
          .where(and(
            eq(selectionDestinationBaskets.selectionId, selection.id),
            eq(selectionDestinationBaskets.destinationType, 'sold')
          ));
        
        if (soldBaskets.length === 0) {
          console.log(`Selezione #${selection.id} non ha cestelli destinati alla vendita.`);
          continue;
        }
        
        console.log(`Trovati ${soldBaskets.length} cestelli destinati alla vendita nella selezione #${selection.id}.`);
        
        // Per ogni cestello destinato alla vendita
        for (const soldBasket of soldBaskets) {
          // Verifica se esiste già un ciclo per questo cestello
          let existingCycles = await tx.select()
            .from(cycles)
            .where(and(
              eq(cycles.basketId, soldBasket.basketId),
              eq(cycles.startDate, selection.date)
            ));
          
          let cycleId;
          
          // Se non esiste un ciclo, lo creiamo
          if (existingCycles.length === 0) {
            console.log(`Creazione nuovo ciclo per cestello ${soldBasket.basketId} in selezione #${selection.id}...`);
            
            const [newCycle] = await tx.insert(cycles).values({
              basketId: soldBasket.basketId,
              startDate: selection.date,
              state: 'active'
            }).returning();
            
            cycleId = newCycle.id;
            console.log(`Nuovo ciclo ${cycleId} creato per cestello ${soldBasket.basketId}.`);
          } else {
            cycleId = existingCycles[0].id;
            console.log(`Utilizzo ciclo esistente ${cycleId} per cestello ${soldBasket.basketId}.`);
          }
          
          // Verifica se esiste già un'operazione di vendita per questo cestello e ciclo
          const existingOperations = await tx.select()
            .from(operations)
            .where(and(
              eq(operations.type, 'vendita'),
              eq(operations.basketId, soldBasket.basketId),
              eq(operations.cycleId, cycleId)
            ));
          
          // Se non esiste un'operazione di vendita, la creiamo
          if (existingOperations.length === 0) {
            console.log(`Creazione operazione di vendita per cestello ${soldBasket.basketId} con ciclo ${cycleId}...`);
            
            await tx.insert(operations).values({
              date: selection.date,
              type: 'vendita',
              basketId: soldBasket.basketId,
              cycleId: cycleId,
              animalCount: soldBasket.animalCount,
              totalWeight: soldBasket.totalWeight,
              animalsPerKg: soldBasket.animalsPerKg,
              notes: `Vendita immediata dopo selezione #${selection.selectionNumber} (correzione)`
            });
            
            console.log(`Operazione di vendita creata per cestello ${soldBasket.basketId}.`);
          } else {
            console.log(`Operazione di vendita già esistente per cestello ${soldBasket.basketId}.`);
          }
          
          // Aggiornamento dello stato del cestello
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              position: null,
              row: null
            })
            .where(eq(baskets.id, soldBasket.basketId));
          
          console.log(`Stato del cestello ${soldBasket.basketId} aggiornato a disponibile.`);
        }
      }
    });
    
    console.log('Correzione completata con successo!');
    return { success: true, message: 'Correzione completata con successo!' };
  } catch (error) {
    console.error('Errore durante la correzione:', error);
    return { success: false, error: String(error) };
  }
}

// Esegui lo script se chiamato direttamente
if (process.argv[1] === import.meta.url) {
  fixVenditaVagliatura().then(result => {
    console.log('Risultato:', result);
    process.exit(result.success ? 0 : 1);
  });
}

export { fixVenditaVagliatura };