import { db } from "./server/db.js";
import { baskets, operations, flupsys, cycles } from "./shared/schema.js";

async function createTestData() {
  // Crea due FLUPSYs di test
  await db.delete(flupsys);
  const flupsy1 = await db.insert(flupsys).values({
    name: "Flupsy Test 1",
    location: "Posizione Test 1",
    description: "Flupsy di test per il drag-and-drop",
    createdAt: new Date(),
    updatedAt: null
  }).returning();
  
  const flupsy2 = await db.insert(flupsys).values({
    name: "Flupsy Test 2",
    location: "Posizione Test 2",
    description: "Flupsy di test per il drag-and-drop",
    createdAt: new Date(),
    updatedAt: null
  }).returning();
  
  console.log("Creati FLUPSY di test:", flupsy1, flupsy2);
  
  // Crea alcune ceste di test per ogni FLUPSY
  await db.delete(baskets);
  await db.delete(operations);
  await db.delete(cycles);
  
  // Crea 4 ceste per il primo FLUPSY
  for (let i = 1; i <= 4; i++) {
    await db.insert(baskets).values({
      physicalNumber: 100 + i,
      flupsyId: flupsy1[0].id,
      cycleCode: `T1-${i}`,
      state: "active",
      currentCycleId: null,
      nfcData: null,
      row: i <= 2 ? "DX" : "SX",
      position: i <= 2 ? i : i - 2,
      createdAt: new Date(),
      updatedAt: null
    });
  }
  
  // Crea 4 ceste per il secondo FLUPSY
  for (let i = 1; i <= 4; i++) {
    await db.insert(baskets).values({
      physicalNumber: 200 + i,
      flupsyId: flupsy2[0].id,
      cycleCode: `T2-${i}`,
      state: "active",
      currentCycleId: null,
      nfcData: null,
      row: i <= 2 ? "DX" : "SX",
      position: i <= 2 ? i : i - 2,
      createdAt: new Date(),
      updatedAt: null
    });
  }
  
  const allBaskets = await db.select().from(baskets);
  console.log("Creati cestelli di test:", allBaskets);
  
  console.log("Dati di test creati con successo!");
}

createTestData()
  .then(() => console.log("Script completato"))
  .catch(err => console.error("Errore:", err))
  .finally(() => process.exit());