/**
 * Script per generare dati di test:
 * - 5 vasche attive con una prima attivazione in date diverse, flupsy diversi, taglia diversa e quantità diverse
 * - 3 ceste disponibili e vuote
 */

// Eseguire lo script con: node -r tsx/register generate_test_data.js

import { db } from './server/db';
import { baskets, flupsys, cycles, operations, sizes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function generateTestData() {
  try {
    console.log("Inizio generazione dati di test...");
    
    // 1. Verifica che esistano almeno 2 FLUPSY nel sistema
    const existingFlupsys = await db.select().from(flupsys);
    
    if (existingFlupsys.length < 2) {
      console.log("Creazione FLUPSY mancanti...");
      // Crea FLUPSY se non ce ne sono abbastanza
      if (existingFlupsys.length === 0) {
        await db.insert(flupsys).values([
          {
            name: "Flupsy 1 (Mondolo)",
            location: "Canale 1 Lato Laguna",
            description: "Posizionato lato Gorino",
            active: true
          },
          {
            name: "Flupsy 2 (Easytech)",
            location: "Canale 2 Lato Mare",
            description: "Posizionato lato Goro",
            active: true
          }
        ]);
      } else if (existingFlupsys.length === 1) {
        await db.insert(flupsys).values({
          name: "Flupsy 2 (Easytech)",
          location: "Canale 2 Lato Mare",
          description: "Posizionato lato Goro",
          active: true
        });
      }
    }
    
    // Ottieni tutti i FLUPSY disponibili
    const allFlupsys = await db.select().from(flupsys);
    console.log(`FLUPSY disponibili: ${allFlupsys.length}`);
    
    // 2. Verifica che esistano le taglie
    const existingSizes = await db.select().from(sizes);
    
    if (existingSizes.length === 0) {
      console.log("Creazione taglie mancanti...");
      await db.insert(sizes).values([
        { code: "TP-500", name: "TP-500", minAnimalsPerKg: 500001, maxAnimalsPerKg: 1000000, color: "#fb7185" },
        { code: "TP-800", name: "TP-800", minAnimalsPerKg: 400001, maxAnimalsPerKg: 500000, color: "#f472b6" },
        { code: "TP-1000", name: "TP-1000", minAnimalsPerKg: 300001, maxAnimalsPerKg: 400000, color: "#e879f9" },
        { code: "TP-1500", name: "TP-1500", minAnimalsPerKg: 200001, maxAnimalsPerKg: 300000, color: "#c084fc" },
        { code: "TP-2000", name: "TP-2000", minAnimalsPerKg: 150001, maxAnimalsPerKg: 200000, color: "#a78bfa" },
        { code: "TP-2300", name: "TP-2300", minAnimalsPerKg: 120001, maxAnimalsPerKg: 150000, color: "#818cf8" },
        { code: "TP-2500", name: "TP-2500", minAnimalsPerKg: 100001, maxAnimalsPerKg: 120000, color: "#60a5fa" },
        { code: "TP-2800", name: "TP-2800", minAnimalsPerKg: 32001, maxAnimalsPerKg: 100000, color: "#38bdf8" },
        { code: "TP-3000", name: "TP-3000", minAnimalsPerKg: 25001, maxAnimalsPerKg: 32000, color: "#22d3ee" },
        { code: "TP-3500", name: "TP-3500", minAnimalsPerKg: 18001, maxAnimalsPerKg: 25000, color: "#2dd4bf" },
        { code: "TP-4000", name: "TP-4000", minAnimalsPerKg: 13001, maxAnimalsPerKg: 18000, color: "#34d399" },
        { code: "TP-4500", name: "TP-4500", minAnimalsPerKg: 10001, maxAnimalsPerKg: 13000, color: "#4ade80" },
        { code: "TP-5000", name: "TP-5000", minAnimalsPerKg: 8001, maxAnimalsPerKg: 10000, color: "#a3e635" },
        { code: "TP-5500", name: "TP-5500", minAnimalsPerKg: 6001, maxAnimalsPerKg: 8000, color: "#facc15" },
        { code: "TP-6000", name: "TP-6000", minAnimalsPerKg: 5001, maxAnimalsPerKg: 6000, color: "#fb923c" },
        { code: "TP-6500", name: "TP-6500", minAnimalsPerKg: 4001, maxAnimalsPerKg: 5000, color: "#f87171" },
        { code: "TP-7000", name: "TP-7000", minAnimalsPerKg: 3001, maxAnimalsPerKg: 4000, color: "#fdba74" },
        { code: "TP-8000", name: "TP-8000", minAnimalsPerKg: 2001, maxAnimalsPerKg: 3000, color: "#fcd34d" },
        { code: "TP-9000", name: "TP-9000", minAnimalsPerKg: 1000, maxAnimalsPerKg: 2000, color: "#86efac" }
      ]);
    }
    
    // Ottieni tutte le taglie disponibili
    const allSizes = await db.select().from(sizes);
    console.log(`Taglie disponibili: ${allSizes.length}`);
    
    // 3. Pulisci i dati esistenti per evitare duplicazioni
    console.log("Pulizia dati esistenti...");
    await db.delete(operations);
    await db.delete(cycles);
    await db.delete(baskets);
    
    // 4. Crea le 5 vasche attive con caratteristiche diverse
    console.log("Creazione vasche attive...");
    
    // Date per le diverse attivazioni (ultime 5 date, a partire da un mese fa)
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (30 - i * 6)); // 30, 24, 18, 12, 6 giorni fa
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Quantità diverse di animali
    const animalCounts = [40000, 50000, 35000, 45000, 60000];
    
    // Pesi totali diversi (grammi)
    const totalWeights = [1000, 1200, 800, 1500, 1300];
    
    // Indici di taglie diverse
    const sizeIndices = [7, 8, 9, 10, 11]; // TP-2800, TP-3000, TP-3500, TP-4000, TP-4500
    
    // Crea 5 cestelli attivi
    for (let i = 0; i < 5; i++) {
      // Crea il cestello
      const flupsyId = allFlupsys[i % allFlupsys.length].id;
      const row = i < 3 ? "DX" : "SX";
      const position = (i % 3) + 1;
      
      const [basket] = await db.insert(baskets).values({
        physicalNumber: i + 1,
        flupsyId: flupsyId,
        row: row,
        position: position,
        state: "active"
      }).returning();
      
      // Crea il ciclo
      const [cycle] = await db.insert(cycles).values({
        basketId: basket.id,
        startDate: dates[i],
        state: "active"
      }).returning();
      
      // Aggiorna il cestello con il ciclo corrente
      await db.update(baskets)
        .set({ currentCycleId: cycle.id })
        .where(eq(baskets.id, basket.id));
      
      // Calcola animali per kg (arrotondato all'intero)
      const animalsPerKg = Math.round(animalCounts[i] / (totalWeights[i] / 1000));
      
      // Crea l'operazione di prima attivazione
      await db.insert(operations).values({
        date: dates[i],
        type: "prima-attivazione",
        basketId: basket.id,
        cycleId: cycle.id,
        sizeId: allSizes[sizeIndices[i]].id,
        animalCount: animalCounts[i],
        totalWeight: totalWeights[i],
        animalsPerKg: animalsPerKg,
        averageWeight: Math.round(totalWeights[i] / animalCounts[i] * 1000) // peso medio in mg (arrotondato)
      });
      
      console.log(`Creato cestello attivo #${i+1}: Flupsy ${flupsyId}, posizione ${row}${position}, taglia ${allSizes[sizeIndices[i]].name}`);
    }
    
    // 5. Crea 3 cestelli disponibili e vuoti
    console.log("Creazione cestelli disponibili...");
    
    for (let i = 0; i < 3; i++) {
      const flupsyId = allFlupsys[i % allFlupsys.length].id;
      const row = i < 2 ? "DX" : "SX";
      const position = i + 6; // posizioni da 6 a 8
      
      await db.insert(baskets).values({
        physicalNumber: i + 6, // numeri fisici da 6 a 8
        flupsyId: flupsyId,
        row: row,
        position: position,
        state: "available"
      });
      
      console.log(`Creato cestello disponibile #${i+6}: Flupsy ${flupsyId}, posizione ${row}${position}`);
    }
    
    console.log("Generazione dati di test completata con successo!");
    
  } catch (error) {
    console.error("Errore durante la generazione dei dati di test:", error);
  } finally {
    process.exit(0);
  }
}

// Esegui la funzione
generateTestData();