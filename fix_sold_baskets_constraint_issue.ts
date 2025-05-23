/**
 * Fix per il problema "insert or update on table 'operations' violates foreign key constraint 'fk_operations_cycle_id'"
 * che si verifica quando si aggiungono cestelli destinati alla vendita in una vagliatura.
 * 
 * Il problema è causato dal fatto che il codice cerca di creare un'operazione di vendita con un cycle_id
 * non ancora salvato nel database.
 */

// Nel file server/controllers/selection-controller.ts, nella funzione completeSelection
// Modifica il codice che gestisce il salvataggio dell'operazione di vendita:

// PROBLEMA: Codice attuale che causa l'errore (line 1237-1247)
/*
const [saleOperation] = await tx.insert(operations).values({
  date: selection[0].date,
  type: 'vendita',
  basketId: destBasket.basketId,
  cycleId: cycle.id, // <-- Problema qui: cycle.id potrebbe non essere ancora salvato
  animalCount: destBasket.animalCount,
  totalWeight: destBasket.totalWeight,
  animalsPerKg: destBasket.animalsPerKg,
  notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`,
  lotId: primaryLotId
}).returning();
*/

// SOLUZIONE: Assicurarsi che il ciclo sia stato creato prima di utilizzarlo in altre operazioni
// Modifica il codice in questo modo (line 1237-1247):
/*
// Crea nuovo ciclo per la cesta
const [cycle] = await tx.insert(cycles).values({
  basketId: destBasket.basketId,
  startDate: selection[0].date,
  state: 'active'
}).returning();

// Ora che il ciclo è stato creato e abbiamo un ID valido, possiamo usarlo
const [saleOperation] = await tx.insert(operations).values({
  date: selection[0].date,
  type: 'vendita',
  basketId: destBasket.basketId,
  cycleId: cycle.id, // Ora cycle.id esiste sicuramente
  animalCount: destBasket.animalCount,
  totalWeight: destBasket.totalWeight,
  animalsPerKg: destBasket.animalsPerKg,
  notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`,
  lotId: primaryLotId
}).returning();
*/

// Per implementare questa correzione, è necessario verificare la sequenza di creazione dei cicli 
// e delle operazioni associate a questi cicli in tutto il controller.