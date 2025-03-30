import { db } from "./server/db.js";
import { baskets, operations, flupsys, cycles } from "./shared/schema.js";

async function deleteTestData() {
  console.log("Eliminazione dei dati di test in corso...");
  
  // Prima di tutto, ottieni l'ID dei FLUPSY di test
  const testFlupsys = await db.select().from(flupsys).where(sql`name LIKE ${'Flupsy Test%'}`);
  const testFlupsyIds = testFlupsys.map(f => f.id);
  console.log("FLUPSY di test trovati:", testFlupsyIds);
  
  // Elimina solo le ceste associate ai FLUPSY di test
  if (testFlupsyIds.length > 0) {
    const deletedBaskets = await db.delete(baskets)
      .where(sql`flupsyId IN (${testFlupsyIds.join(',')})`)
      .returning();
    console.log("Ceste eliminate:", deletedBaskets.length);
  } else {
    console.log("Nessun FLUPSY di test trovato, nessuna cesta da eliminare");
  }
  
  // Elimina tutti i FLUPSY di test
  const deletedFlupsys = await db.delete(flupsys)
    .where(sql`name LIKE ${'Flupsy Test%'}`)
    .returning();
  console.log("FLUPSY di test eliminati:", deletedFlupsys.length);
  
  // Per sicurezza, elimina anche tutte le operazioni e i cicli
  const deletedOperations = await db.delete(operations).returning();
  console.log("Operazioni eliminate:", deletedOperations.length);
  
  const deletedCycles = await db.delete(cycles).returning();
  console.log("Cicli eliminati:", deletedCycles.length);
  
  console.log("Dati di test eliminati con successo!");
}

// Importazione necessaria per l'uso di sql
import { sql } from "drizzle-orm";

deleteTestData()
  .then(() => console.log("Script completato"))
  .catch(err => console.error("Errore:", err))
  .finally(() => process.exit());