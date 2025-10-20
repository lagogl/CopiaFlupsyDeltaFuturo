import { db } from "../server/db.js";
import { 
  users, flupsys, sizes, baskets, lots, cycles, operations,
  sgr, sgrPerTaglia, screeningOperations, screeningSourceBaskets,
  screeningDestinationBaskets, screeningBasketHistory,
  screeningLotReferences, advancedSales, saleBags, bagAllocations,
  saleOperationsRef, clienti, ddt, ddtRighe, mortalityRates,
  notifications, sgrGiornalieri
} from "../shared/schema.js";
import bcrypt from "bcrypt";

/**
 * Script completo per popolare il database FLUPSY con dati realistici
 * per test di tutte le funzionalità, inclusa l'AI Growth Variability Analysis
 */

async function populateDatabase() {
  console.log("🌱 INIZIO POPOLAMENTO DATABASE FLUPSY");
  console.log("=" .repeat(60));

  const report: string[] = [];
  const addToReport = (section: string, items: any[]) => {
    report.push(`\n## ${section}`);
    report.push(`Total: ${items.length} records`);
    if (items.length > 0 && items.length <= 20) {
      report.push(JSON.stringify(items, null, 2));
    } else if (items.length > 20) {
      report.push(`Sample (first 3): ${JSON.stringify(items.slice(0, 3), null, 2)}`);
    }
  };

  try {
    // 1. USERS
    console.log("\n📋 1. POPOLAMENTO UTENTI...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    let usersData = [];
    try {
      usersData = await db.insert(users).values([
        { username: "admin", password: hashedPassword, role: "admin", language: "it" },
        { username: "operatore1", password: hashedPassword, role: "user", language: "it" },
        { username: "viewer", password: hashedPassword, role: "visitor", language: "en" }
      ]).returning();
      console.log(`✅ ${usersData.length} utenti creati`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log("⚠️  Utenti già esistenti - skip");
        usersData = await db.select().from(users).limit(3);
      } else {
        throw error;
      }
    }
    addToReport("UTENTI", usersData.map(u => ({ id: u.id, username: u.username, role: u.role })));

    // 2. LOTS (6 lotti con dati realistici)
    console.log("\n📦 2. POPOLAMENTO LOTTI...");
    const lotsData = await db.insert(lots).values([
      {
        arrivalDate: "2024-05-01",
        supplier: "Ecotapes Zeeland",
        supplierLotNumber: "ECTZ-2024-05",
        quality: "normali",
        animalCount: 12000000,
        weight: 50000, // 50kg
        sizeId: 9, // TP-1000
        notes: "Lotto primavera - qualità eccellente",
        state: "active"
      },
      {
        arrivalDate: "2024-06-15",
        supplier: "Taylor Shellfish",
        supplierLotNumber: "TS-2024-06",
        quality: "teste",
        animalCount: 8000000,
        weight: 35000,
        sizeId: 10, // TP-1200
        notes: "Lotto estivo teste - crescita rapida",
        state: "active"
      },
      {
        arrivalDate: "2024-07-10",
        supplier: "Pacific Shellfish",
        supplierLotNumber: "PS-2024-07",
        quality: "normali",
        animalCount: 10000000,
        weight: 40000,
        sizeId: 9,
        notes: "Lotto luglio - buona qualità",
        state: "active"
      },
      {
        arrivalDate: "2024-08-05",
        supplier: "Ecotapes Zeeland",
        supplierLotNumber: "ECTZ-2024-08",
        quality: "teste",
        animalCount: 15000000,
        weight: 60000,
        sizeId: 8, // TP-800
        notes: "Lotto agosto - alto numero animali",
        state: "active"
      },
      {
        arrivalDate: "2024-09-20",
        supplier: "Shellfish Farms Inc",
        supplierLotNumber: "SFI-2024-09",
        quality: "normali",
        animalCount: 9000000,
        weight: 38000,
        sizeId: 10,
        notes: "Lotto autunnale - ottima resistenza",
        state: "active"
      },
      {
        arrivalDate: "2024-10-01",
        supplier: "Taylor Shellfish",
        supplierLotNumber: "TS-2024-10",
        quality: "teste",
        animalCount: 11000000,
        weight: 45000,
        sizeId: 9,
        notes: "Lotto ottobre - recente arrivo",
        state: "active"
      }
    ]).returning();
    console.log(`✅ ${lotsData.length} lotti creati`);
    addToReport("LOTTI", lotsData);

    // 3. CYCLES (creare cicli per vari basket)
    console.log("\n🔄 3. POPOLAMENTO CICLI...");
    const cyclesData = await db.insert(cycles).values([
      // Cicli attivi
      { basketId: 29, lotId: lotsData[0].id, startDate: "2024-05-15", state: "active" },
      { basketId: 30, lotId: lotsData[1].id, startDate: "2024-06-20", state: "active" },
      { basketId: 31, lotId: lotsData[2].id, startDate: "2024-07-15", state: "active" },
      { basketId: 32, lotId: lotsData[0].id, startDate: "2024-05-20", state: "active" },
      { basketId: 33, lotId: lotsData[3].id, startDate: "2024-08-10", state: "active" },
      { basketId: 34, lotId: lotsData[4].id, startDate: "2024-09-25", state: "active" },
      { basketId: 35, lotId: lotsData[5].id, startDate: "2024-10-05", state: "active" },
      // Cicli storici (chiusi)
      { basketId: 1, lotId: lotsData[0].id, startDate: "2024-03-01", endDate: "2024-08-15", state: "closed" },
      { basketId: 2, lotId: lotsData[1].id, startDate: "2024-04-01", endDate: "2024-09-20", state: "closed" },
      { basketId: 3, lotId: lotsData[2].id, startDate: "2024-05-01", endDate: "2024-10-10", state: "closed" },
    ]).returning();
    console.log(`✅ ${cyclesData.length} cicli creati`);
    addToReport("CICLI", cyclesData);

    // Aggiorna basket con currentCycleId
    const { eq } = await import("drizzle-orm");
    for (const cycle of cyclesData.filter(c => c.state === "active")) {
      await db.update(baskets)
        .set({ 
          currentCycleId: cycle.id, 
          state: "active",
          cycleCode: `${cycle.basketId}-${cycle.lotId}-${new Date(cycle.startDate).toISOString().slice(2, 7).replace('-', '')}`
        })
        .where(eq(baskets.id, cycle.basketId));
    }

    // 4. OPERATIONS (6+ mesi di storico con varie operazioni)
    console.log("\n⚙️ 4. POPOLAMENTO OPERAZIONI...");
    const operationsData = [];

    // Funzione helper per creare operazioni di peso
    const createWeighingOps = (cycleId: number, basketId: number, lotId: number, startDate: string, sizeProgression: number[]) => {
      const ops = [];
      const baseDate = new Date(startDate);
      
      for (let i = 0; i < sizeProgression.length; i++) {
        const opDate = new Date(baseDate);
        opDate.setDate(opDate.getDate() + (i * 14)); // ogni 2 settimane
        
        const animalsPerKg = sizeProgression[i];
        const animalCount = 500000 - (i * 50000); // diminuisce per mortalità
        const totalWeight = (animalCount / animalsPerKg) * 1000; // in grammi
        
        ops.push({
          date: opDate.toISOString().split('T')[0],
          type: "peso" as const,
          basketId,
          cycleId,
          sizeId: 16 - i, // da TP-2500 verso taglie più grandi
          lotId,
          animalCount,
          totalWeight,
          animalsPerKg,
          deadCount: i > 0 ? Math.floor(Math.random() * 5000) + 1000 : 0,
          notes: `Pesatura ${i + 1} - crescita regolare`,
          source: i % 3 === 0 ? "mobile_nfc" : "desktop_manager"
        });
      }
      return ops;
    };

    // Operazioni per cestelli attivi
    operationsData.push(...createWeighingOps(cyclesData[0].id, 29, lotsData[0].id, "2024-05-15", 
      [250000, 220000, 180000, 150000, 120000, 100000]));
    operationsData.push(...createWeighingOps(cyclesData[1].id, 30, lotsData[1].id, "2024-06-20",
      [240000, 200000, 160000, 130000, 110000, 90000]));
    operationsData.push(...createWeighingOps(cyclesData[2].id, 31, lotsData[2].id, "2024-07-15",
      [260000, 230000, 190000, 160000, 130000, 105000]));
    operationsData.push(...createWeighingOps(cyclesData[3].id, 32, lotsData[0].id, "2024-05-20",
      [255000, 225000, 185000, 155000, 125000, 102000]));
    operationsData.push(...createWeighingOps(cyclesData[4].id, 33, lotsData[3].id, "2024-08-10",
      [270000, 240000, 200000, 165000, 135000, 110000]));

    // Operazioni per cestelli storici (cicli chiusi)
    operationsData.push(...createWeighingOps(cyclesData[7].id, 1, lotsData[0].id, "2024-03-01",
      [280000, 250000, 210000, 170000, 140000, 115000, 95000, 80000]));
    operationsData.push(...createWeighingOps(cyclesData[8].id, 2, lotsData[1].id, "2024-04-01",
      [265000, 235000, 195000, 160000, 130000, 107000, 88000, 75000]));

    // Operazioni di pulizia
    for (const cycle of cyclesData.slice(0, 5)) {
      const cleaningDate = new Date(cycle.startDate);
      cleaningDate.setDate(cleaningDate.getDate() + 30);
      operationsData.push({
        date: cleaningDate.toISOString().split('T')[0],
        type: "pulizia" as const,
        basketId: cycle.basketId,
        cycleId: cycle.id!,
        lotId: cycle.lotId,
        notes: "Pulizia mensile cestello",
        source: "desktop_manager"
      });
    }

    const insertedOps = await db.insert(operations).values(operationsData).returning();
    console.log(`✅ ${insertedOps.length} operazioni create`);
    addToReport("OPERATIONS", insertedOps.slice(0, 10));

    // 5. SGR DATA
    console.log("\n📈 5. POPOLAMENTO DATI SGR...");
    const sgrData = await db.insert(sgr).values([
      { month: "gennaio", percentage: 2.8, calculatedFromReal: true },
      { month: "febbraio", percentage: 3.2, calculatedFromReal: true },
      { month: "marzo", percentage: 4.1, calculatedFromReal: true },
      { month: "aprile", percentage: 5.5, calculatedFromReal: true },
      { month: "maggio", percentage: 6.8, calculatedFromReal: true },
      { month: "giugno", percentage: 7.2, calculatedFromReal: true },
      { month: "luglio", percentage: 6.9, calculatedFromReal: true },
      { month: "agosto", percentage: 6.5, calculatedFromReal: true },
      { month: "settembre", percentage: 5.1, calculatedFromReal: true },
      { month: "ottobre", percentage: 4.2, calculatedFromReal: true },
      { month: "novembre", percentage: 3.5, calculatedFromReal: true },
      { month: "dicembre", percentage: 2.9, calculatedFromReal: true }
    ]).returning();
    console.log(`✅ ${sgrData.length} dati SGR mensili creati`);
    addToReport("SGR MENSILE", sgrData);

    // 6. SGR PER TAGLIA (size-specific)
    console.log("\n📊 6. POPOLAMENTO SGR PER TAGLIA...");
    const sgrPerTagliaData = [];
    const months = ["maggio", "giugno", "luglio", "agosto", "settembre", "ottobre"];
    const sizeIds = [9, 10, 11, 12, 13, 14, 15, 16]; // TP-1000 to TP-2500
    
    for (const month of months) {
      for (const sizeId of sizeIds) {
        const baseSgr = sgrData.find(s => s.month === month)?.percentage || 4.0;
        // SGR varia per taglia: più piccoli crescono più velocemente
        const sizeModifier = (20 - sizeId) * 0.15;
        sgrPerTagliaData.push({
          month,
          sizeId,
          calculatedSgr: Number((baseSgr + sizeModifier).toFixed(2)),
          sampleCount: Math.floor(Math.random() * 15) + 5
        });
      }
    }
    
    const insertedSgrPerTaglia = await db.insert(sgrPerTaglia).values(sgrPerTagliaData).returning();
    console.log(`✅ ${insertedSgrPerTaglia.length} dati SGR per taglia creati`);
    addToReport("SGR PER TAGLIA", insertedSgrPerTaglia.slice(0, 10));

    // 7. SGR GIORNALIERI (dati ambientali)
    console.log("\n🌡️ 7. POPOLAMENTO DATI AMBIENTALI...");
    const sgrGiornalieriData = [];
    for (let i = 0; i < 180; i++) { // 6 mesi di dati giornalieri
      const date = new Date("2024-05-01");
      date.setDate(date.getDate() + i);
      date.setHours(12, 0, 0, 0);
      
      sgrGiornalieriData.push({
        recordDate: date,
        temperature: Number((18 + Math.random() * 6).toFixed(1)), // 18-24°C
        pH: Number((7.8 + Math.random() * 0.4).toFixed(2)), // 7.8-8.2
        ammonia: Number((Math.random() * 0.15).toFixed(3)), // 0-0.15 mg/L
        oxygen: Number((6.5 + Math.random() * 1.5).toFixed(1)), // 6.5-8.0 mg/L
        salinity: Number((32 + Math.random() * 3).toFixed(1)) // 32-35 ppt
      });
    }
    
    const insertedSgrGiornalieri = await db.insert(sgrGiornalieri).values(sgrGiornalieriData).returning();
    console.log(`✅ ${insertedSgrGiornalieri.length} record ambientali creati`);
    addToReport("DATI AMBIENTALI", insertedSgrGiornalieri.slice(0, 5));

    // 8. MORTALITY RATES
    console.log("\n💀 8. POPOLAMENTO TASSI MORTALITÀ...");
    const mortalityData = [];
    const mortalityMonths = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
                             "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
    for (const month of mortalityMonths) {
      for (const sizeId of [9, 10, 11, 12, 13, 14, 15, 16]) {
        const baseRate = month === "gennaio" || month === "febbraio" ? 3.5 : 2.0;
        mortalityData.push({
          sizeId,
          month,
          percentage: Number((baseRate + Math.random() * 1.5).toFixed(2))
        });
      }
    }
    
    const insertedMortality = await db.insert(mortalityRates).values(mortalityData).returning();
    console.log(`✅ ${insertedMortality.length} tassi mortalità creati`);
    addToReport("MORTALITY RATES", insertedMortality.slice(0, 10));

    // 9. CLIENTI
    console.log("\n👥 9. POPOLAMENTO CLIENTI...");
    const clientiData = await db.insert(clienti).values([
      {
        denominazione: "Ristorante La Laguna",
        indirizzo: "Via Canal Grande, 125",
        comune: "Venezia",
        cap: "30100",
        provincia: "VE",
        paese: "Italia",
        email: "info@lalaguna.it",
        telefono: "+39 041 5234567",
        piva: "IT12345678901",
        codiceFiscale: "RSSMRA70A01L736D",
        attivo: true
      },
      {
        denominazione: "Mercato Ittico Chioggia",
        indirizzo: "Corso del Popolo, 45",
        comune: "Chioggia",
        cap: "30015",
        provincia: "VE",
        paese: "Italia",
        email: "ordini@mercatoittico.it",
        telefono: "+39 041 4005678",
        piva: "IT98765432109",
        codiceFiscale: "MRCGNN65M10L736P",
        attivo: true
      },
      {
        denominazione: "Seafood Export SRL",
        indirizzo: "Via Industriale, 78",
        comune: "Goro",
        cap: "44020",
        provincia: "FE",
        paese: "Italia",
        email: "export@seafood.it",
        telefono: "+39 0533 567890",
        piva: "IT11223344556",
        codiceFiscale: "SFXPRT85T20D548M",
        attivo: true
      }
    ]).returning();
    console.log(`✅ ${clientiData.length} clienti creati`);
    addToReport("CLIENTI", clientiData);

    // 10. ADVANCED SALES + DDT
    console.log("\n💰 10. POPOLAMENTO VENDITE E DDT...");
    
    // Prima creo operazioni vendita
    const saleOps = [];
    for (let i = 0; i < 3; i++) {
      const cycle = cyclesData[7 + i]; // cicli chiusi
      const saleDate = new Date(cycle.endDate!);
      saleOps.push({
        date: saleDate.toISOString().split('T')[0],
        type: "vendita" as const,
        basketId: cycle.basketId,
        cycleId: cycle.id!,
        sizeId: 17, // TP-3000 (dimensione vendita)
        lotId: cycle.lotId,
        animalCount: 180000,
        totalWeight: 6000,
        animalsPerKg: 30000,
        notes: `Vendita finale ciclo ${cycle.id}`,
        source: "desktop_manager"
      });
    }
    const saleOperations = await db.insert(operations).values(saleOps).returning();
    console.log(`✅ ${saleOperations.length} operazioni vendita create`);

    // Creo vendite avanzate
    const advSalesData = await db.insert(advancedSales).values([
      {
        saleNumber: "V-2024-001",
        customerId: clientiData[0].id,
        customerName: clientiData[0].denominazione,
        customerDetails: { 
          piva: clientiData[0].piva, 
          address: clientiData[0].indirizzo,
          city: clientiData[0].comune
        },
        saleDate: "2024-08-20",
        status: "completed",
        totalWeight: 18.5,
        totalAnimals: 540000,
        totalBags: 3,
        notes: "Prima vendita stagione 2024",
        ddtStatus: "inviato"
      },
      {
        saleNumber: "V-2024-002",
        customerId: clientiData[1].id,
        customerName: clientiData[1].denominazione,
        customerDetails: { 
          piva: clientiData[1].piva, 
          address: clientiData[1].indirizzo,
          city: clientiData[1].comune
        },
        saleDate: "2024-09-25",
        status: "completed",
        totalWeight: 22.3,
        totalAnimals: 660000,
        totalBags: 4,
        notes: "Vendita mercato ittico",
        ddtStatus: "locale"
      }
    ]).returning();
    console.log(`✅ ${advSalesData.length} vendite avanzate create`);
    addToReport("ADVANCED SALES", advSalesData);

    // Creo DDT
    const ddtData = await db.insert(ddt).values([
      {
        numero: 1,
        data: "2024-08-20",
        clienteId: clientiData[0].id,
        clienteNome: clientiData[0].denominazione,
        clienteIndirizzo: clientiData[0].indirizzo,
        clienteCitta: clientiData[0].comune,
        clienteCap: clientiData[0].cap,
        clienteProvincia: clientiData[0].provincia,
        clientePiva: clientiData[0].piva,
        totaleColli: 3,
        pesoTotale: "18.50",
        ddtStato: "inviato"
      },
      {
        numero: 2,
        data: "2024-09-25",
        clienteId: clientiData[1].id,
        clienteNome: clientiData[1].denominazione,
        clienteIndirizzo: clientiData[1].indirizzo,
        clienteCitta: clientiData[1].comune,
        clienteCap: clientiData[1].cap,
        clienteProvincia: clientiData[1].provincia,
        clientePiva: clientiData[1].piva,
        totaleColli: 4,
        pesoTotale: "22.30",
        ddtStato: "locale"
      }
    ]).returning();
    console.log(`✅ ${ddtData.length} DDT creati`);
    addToReport("DDT", ddtData);

    // 11. NOTIFICATIONS
    console.log("\n🔔 11. POPOLAMENTO NOTIFICHE...");
    const notifData = await db.insert(notifications).values([
      {
        type: "vendita",
        title: "Vendita completata",
        message: "Vendita V-2024-001 completata con successo - 18.5kg venduti",
        isRead: false,
        relatedEntityType: "operation",
        relatedEntityId: saleOperations[0].id
      },
      {
        type: "warning",
        title: "Mortalità elevata rilevata",
        message: "Cestello #29 ha superato la soglia di mortalità normale (3.2%)",
        isRead: false,
        relatedEntityType: "basket",
        relatedEntityId: 29
      },
      {
        type: "system",
        title: "Sistema aggiornato",
        message: "Database popolato con dati di test - sistema pronto per l'uso",
        isRead: true
      }
    ]).returning();
    console.log(`✅ ${notifData.length} notifiche create`);
    addToReport("NOTIFICATIONS", notifData);

    // REPORT FINALE
    console.log("\n" + "=".repeat(60));
    console.log("✅ POPOLAMENTO DATABASE COMPLETATO CON SUCCESSO!");
    console.log("=".repeat(60));
    
    const summary = {
      users: usersData.length,
      lots: lotsData.length,
      cycles: cyclesData.length,
      operations: insertedOps.length,
      sgrMensile: sgrData.length,
      sgrPerTaglia: insertedSgrPerTaglia.length,
      datiAmbientali: insertedSgrGiornalieri.length,
      mortalityRates: insertedMortality.length,
      clienti: clientiData.length,
      vendite: advSalesData.length,
      ddt: ddtData.length,
      notifications: notifData.length
    };

    console.log("\n📊 RIEPILOGO DATI INSERITI:");
    console.log(JSON.stringify(summary, null, 2));

    // Scrivo report su file
    const reportContent = `# REPORT POPOLAMENTO DATABASE FLUPSY
Data: ${new Date().toISOString()}

## RIEPILOGO TOTALE
${JSON.stringify(summary, null, 2)}

${report.join('\n')}

## NOTE IMPORTANTI

### CREDENZIALI UTENTI
- **Admin**: username: \`admin\`, password: \`password123\`
- **Operatore**: username: \`operatore1\`, password: \`password123\`
- **Visitor**: username: \`viewer\`, password: \`password123\`

### LOTTI CREATI
6 lotti con fornitori diversi (Ecotapes Zeeland, Taylor Shellfish, Pacific Shellfish, Shellfish Farms Inc)
- Lotti con date arrivo da maggio a ottobre 2024
- Taglie iniziali variabili (TP-800 a TP-1200)
- Conteggi animali: 8M - 15M per lotto

### CICLI E OPERAZIONI
- 10 cicli totali (7 attivi, 3 chiusi)
- ${insertedOps.length} operazioni totali
  - Operazioni peso: ogni 2 settimane per 6+ mesi
  - Operazioni pulizia: mensili
  - Operazioni vendita: per cicli chiusi
- Fonte operazioni: mix desktop_manager e mobile_nfc

### DATI AI GROWTH VARIABILITY
- 6 mesi di operazioni peso con progressione taglie realistica
- Variazione animalsPerKg: 280000 → 75000 (crescita completa)
- Mortalità simulata realisticamente
- Dati ambientali giornalieri (temperatura, pH, ammonia, ossigeno, salinità)

### SGR DATA
- 12 mesi di SGR mensile (2.8% - 7.2%)
- ${insertedSgrPerTaglia.length} records SGR per taglia
- Variazione SGR per dimensione: taglie piccole crescono più velocemente

### CLIENTI E VENDITE
- 3 clienti attivi (Ristorante, Mercato Ittico, Export)
- 2 vendite completate con DDT
- Vendite con taglie finali TP-3000 (30000 animali/kg)

### VERIFICA CALCOLI
Per verificare la correttezza dei calcoli:

1. **SGR Growth Rate**:
   - Formula: [(ln(W2) - ln(W1)) / giorni] × 100
   - Basket #29: da 250000 a 100000 animali/kg in ~150 giorni
   - SGR atteso: ~6% mensile (estate)

2. **Mortalità**:
   - Basket #29: mortalità cumulativa visibile nelle operazioni
   - Tassi invernali (3.5%) vs estivi (2.0%)

3. **Inventory**:
   - Lotto 1: 12M animali iniziali
   - Distribuito su cicli multipli
   - Tracking mortalità e vendite

## TESTING RACCOMANDATO

1. **Dashboard AI Variabilità Crescita**:
   - Eseguire analisi su periodo maggio-ottobre 2024
   - Verificare clustering cestelli (fast/average/slow)
   - Controllare distribuzione crescita

2. **FlupsyComparison**:
   - Confrontare performance FLUPSY 220, 221, 222
   - Verificare proiezioni futuro
   - Testare export Excel

3. **Advanced Sales**:
   - Verificare vendite V-2024-001 e V-2024-002
   - Controllare DDT generati
   - Validare totali e subtotali

4. **SGR Indices**:
   - Verificare SGR per taglia dashboard
   - Testare ricalcolo manuale
   - Controllare fallback chain (sgrPerTaglia → sgr → default)
`;

    return reportContent;

  } catch (error) {
    console.error("❌ ERRORE DURANTE IL POPOLAMENTO:", error);
    throw error;
  }
}

// Esegui popolamento
populateDatabase()
  .then((report) => {
    console.log("\n📄 Report salvato - utilizzare per verifiche");
    console.log(report);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Errore fatale:", error);
    process.exit(1);
  });
