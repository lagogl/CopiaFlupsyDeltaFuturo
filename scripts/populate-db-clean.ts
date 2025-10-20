import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import { 
  users, flupsys, sizes, baskets, lots, cycles, operations,
  sgr, sgrPerTaglia, advancedSales, clienti, ddt,
  mortalityRates, notifications, sgrGiornalieri
} from "../shared/schema.js";
import bcrypt from "bcrypt";

console.log("🌱 DATABASE POPOLAMENTO - Versione Pulita");
console.log("=".repeat(60));

async function cleanTestData() {
  console.log("\n🧹 PULIZIA DATI TEST PRECEDENTI...");
  
  // Elimina dati di test in ordine inverso di dipendenza
  await db.execute(sql`DELETE FROM notifications WHERE message LIKE '%Database popolato%'`);
  await db.execute(sql`DELETE FROM ddt WHERE numero <= 10`);
  await db.execute(sql`DELETE FROM advanced_sales WHERE sale_number LIKE 'V-2024-%'`);
  await db.execute(sql`DELETE FROM clienti WHERE email LIKE '%@lalaguna.it%' OR email LIKE '%@ittico.it%'`);
  await db.execute(sql`DELETE FROM sgr_giornalieri WHERE record_date >= '2024-05-01'::date`);
  await db.execute(sql`DELETE FROM sgr_per_taglia WHERE month IN ('maggio','giugno','luglio','agosto','settembre','ottobre')`);
  await db.execute(sql`DELETE FROM sgr`); // CRITICAL: Pulisci TUTTA la tabella SGR per evitare duplicati!
  await db.execute(sql`DELETE FROM mortality_rates`);
  await db.execute(sql`DELETE FROM operations WHERE date >= '2024-03-01'::date`);
  await db.execute(sql`DELETE FROM cycles WHERE start_date >= '2024-03-01'::date`);
  await db.execute(sql`DELETE FROM lots WHERE supplier_lot_number LIKE '%-2024-%'`);
  
  console.log("✅ Pulizia completata - tabelle azzerate");
}

async function populate() {
  await cleanTestData();
  
  const summary = {
    lots: 0, cycles: 0, operations: 0, sgr: 0, sgrPerTaglia: 0,
    sgrGiornalieri: 0, mortalityRates: 0, clienti: 0, sales: 0, ddt: 0
  };
  
  // LOTTI
  console.log("\n📦 LOTTI...");
  const lotData = await db.insert(lots).values([
    { arrivalDate: "2024-05-01", supplier: "Ecotapes Zeeland", supplierLotNumber: "ECTZ-2024-05", quality: "normali", animalCount: 12000000, weight: 50000, sizeId: 9 },
    { arrivalDate: "2024-06-15", supplier: "Taylor Shellfish", supplierLotNumber: "TS-2024-06", quality: "teste", animalCount: 8000000, weight: 35000, sizeId: 10 },
    { arrivalDate: "2024-07-10", supplier: "Pacific Shellfish", supplierLotNumber: "PS-2024-07", quality: "normali", animalCount: 10000000, weight: 40000, sizeId: 9 },
    { arrivalDate: "2024-08-05", supplier: "Ecotapes Zeeland", supplierLotNumber: "ECTZ-2024-08", quality: "teste", animalCount: 15000000, weight: 60000, sizeId: 8 },
    { arrivalDate: "2024-09-20", supplier: "Shellfish Farms", supplierLotNumber: "SFI-2024-09", quality: "normali", animalCount: 9000000, weight: 38000, sizeId: 10 },
    { arrivalDate: "2024-10-01", supplier: "Taylor Shellfish", supplierLotNumber: "TS-2024-10", quality: "teste", animalCount: 11000000, weight: 45000, sizeId: 9 }
  ]).returning();
  summary.lots = lotData.length;
  
  // CICLI
  console.log("🔄 CICLI...");
  const cycData = await db.insert(cycles).values([
    { basketId: 1, lotId: lotData[0].id, startDate: "2024-05-15", state: "active" },
    { basketId: 2, lotId: lotData[1].id, startDate: "2024-06-20", state: "active" },
    { basketId: 3, lotId: lotData[2].id, startDate: "2024-07-15", state: "active" },
    { basketId: 4, lotId: lotData[0].id, startDate: "2024-05-20", state: "active" },
    { basketId: 5, lotId: lotData[3].id, startDate: "2024-08-10", state: "active" }
  ]).returning();
  summary.cycles = cycData.length;
  
  // OPERATIONS
  console.log("⚙️ OPERATIONS...");
  const ops = [];
  for (let i = 0; i < 5; i++) {
    const cycle = cycData[i];
    const baseDate = new Date(cycle.startDate);
    for (let w = 0; w < 6; w++) {
      const opDate = new Date(baseDate);
      opDate.setDate(opDate.getDate() + w * 14);
      ops.push({
        date: opDate.toISOString().split('T')[0],
        type: "peso" as const,
        basketId: cycle.basketId,
        cycleId: cycle.id!,
        sizeId: 16 - w,
        lotId: cycle.lotId!,
        animalCount: 500000 - w * 50000,
        totalWeight: 2000 + w * 200,
        animalsPerKg: 250000 - w * 30000,
        source: w % 3 === 0 ? "mobile_nfc" : "desktop_manager"
      });
    }
  }
  const opsData = await db.insert(operations).values(ops).returning();
  summary.operations = opsData.length;
  
  // SGR
  console.log("📈 SGR...");
  const sgrData = await db.insert(sgr).values([
    { month: "gennaio", percentage: 2.8 }, { month: "febbraio", percentage: 3.2 },
    { month: "marzo", percentage: 4.1 }, { month: "aprile", percentage: 5.5 },
    { month: "maggio", percentage: 6.8 }, { month: "giugno", percentage: 7.2 },
    { month: "luglio", percentage: 6.9 }, { month: "agosto", percentage: 6.5 },
    { month: "settembre", percentage: 5.1 }, { month: "ottobre", percentage: 4.2 },
    { month: "novembre", percentage: 3.5 }, { month: "dicembre", percentage: 2.9 }
  ]).returning();
  summary.sgr = sgrData.length;
  
  // SGR PER TAGLIA
  console.log("📊 SGR PER TAGLIA...");
  const sgrPT = [];
  const months = ["maggio","giugno","luglio","agosto","settembre","ottobre"];
  for (const m of months) {
    for (let sizeId = 9; sizeId <= 16; sizeId++) {
      sgrPT.push({ month: m, sizeId, calculatedSgr: 4.5 + Math.random() * 2, sampleCount: 10 });
    }
  }
  const sgrPTData = await db.insert(sgrPerTaglia).values(sgrPT).returning();
  summary.sgrPerTaglia = sgrPTData.length;
  
  // SGR GIORNALIERI
  console.log("🌡️ DATI AMBIENTALI...");
  const env = [];
  for (let i = 0; i < 180; i++) {
    const d = new Date("2024-05-01");
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);
    env.push({
      recordDate: d,
      temperature: 18 + Math.random() * 6,
      pH: 7.8 + Math.random() * 0.4,
      ammonia: Math.random() * 0.15,
      oxygen: 6.5 + Math.random() * 1.5,
      salinity: 32 + Math.random() * 3
    });
  }
  const envData = await db.insert(sgrGiornalieri).values(env).returning();
  summary.sgrGiornalieri = envData.length;
  
  // MORTALITY RATES
  console.log("💀 TASSI MORTALITÀ...");
  const mort = [];
  const allMonths = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  for (const m of allMonths) {
    for (let sizeId = 9; sizeId <= 16; sizeId++) {
      mort.push({ sizeId, month: m, percentage: 2.0 + Math.random() * 1.5 });
    }
  }
  const mortData = await db.insert(mortalityRates).values(mort).returning();
  summary.mortalityRates = mortData.length;
  
  // CLIENTI
  console.log("👥 CLIENTI...");
  const cliData = await db.insert(clienti).values([
    { denominazione: "Ristorante La Laguna", indirizzo: "Via Canal Grande 125", comune: "Venezia", cap: "30100", provincia: "VE", paese: "Italia", email: "info@lalaguna.it", telefono: "+39 041 123456", piva: "IT12345678901", codiceFiscale: "RSSMRA70A01L736D" },
    { denominazione: "Mercato Ittico Chioggia", indirizzo: "Corso Popolo 45", comune: "Chioggia", cap: "30015", provincia: "VE", paese: "Italia", email: "mercato@ittico.it", telefono: "+39 041 987654", piva: "IT98765432109", codiceFiscale: "MRCGNN65M10L736P" }
  ]).returning();
  summary.clienti = cliData.length;
  
  // VENDITE
  console.log("💰 VENDITE...");
  const salesData = await db.insert(advancedSales).values([
    { saleNumber: "V-2024-001", customerId: cliData[0].id, customerName: cliData[0].denominazione, saleDate: "2024-08-20", status: "completed", totalWeight: 18.5, totalAnimals: 540000, totalBags: 3 }
  ]).returning();
  summary.sales = salesData.length;
  
  // DDT
  const ddtData = await db.insert(ddt).values([
    { numero: 1, data: "2024-08-20", clienteId: cliData[0].id, clienteNome: cliData[0].denominazione, totaleColli: 3, pesoTotale: "18.50" }
  ]).returning();
  summary.ddt = ddtData.length;
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ POPOLAMENTO COMPLETATO!");
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

populate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
