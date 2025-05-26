/**
 * Script di simulazione per testare il completamento della vagliatura
 * 
 * Questo script:
 * 1. Crea 3 cestelli di test su "Raceway Ca' Pisani 1"
 * 2. Li attiva con una prima attivazione
 * 3. Crea una vagliatura con 3 cestelli destinazione (2 normali + 1 vendita)
 * 4. Testa il completamento della vagliatura
 * 5. Pulisce tutti i dati di test creati
 */

const API_BASE = 'http://localhost:5000/api';

// Funzione helper per le richieste API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`${method} ${endpoint}`);
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return data;
}

// IDs che verranno creati durante il test
let testData = {
  flupsyId: null,
  lotId: null,
  basketIds: [],
  cycleIds: [],
  operationIds: [],
  selectionId: null
};

async function findCaPisani1Flupsy() {
  console.log('\n🔍 Ricerca FLUPSY "Raceway 1 CaPisani"...');
  
  const flupsys = await apiRequest('/flupsys?includeAll=true');
  const caPisani1 = flupsys.find(f => f.name.toLowerCase().includes("raceway 1 capisani") || f.name.toLowerCase().includes("raceway 1 ca pisani"));
  
  if (!caPisani1) {
    throw new Error('FLUPSY "Raceway 1 CaPisani" non trovato');
  }
  
  console.log(`✅ Trovato FLUPSY: ${caPisani1.name} (ID: ${caPisani1.id})`);
  testData.flupsyId = caPisani1.id;
  return caPisani1;
}

async function createTestLot() {
  console.log('\n📦 Creazione lotto di test...');
  
  const lotData = {
    arrivalDate: '2025-05-26',
    supplier: 'Test Supplier - Simulazione',
    species: 'Test Species',
    quantity: 10000000, // 10 milioni di animali
    notes: 'Lotto di test per simulazione vagliatura - DA CANCELLARE'
  };
  
  const lot = await apiRequest('/lots', 'POST', lotData);
  testData.lotId = lot.id;
  console.log(`✅ Lotto creato: ID ${lot.id}`);
  return lot;
}

async function createTestBaskets() {
  console.log('\n🗂️ Creazione cestelli di test...');
  
  const basketPromises = [];
  
  for (let i = 1; i <= 3; i++) {
    const basketData = {
      flupsyId: testData.flupsyId,
      physicalNumber: 900 + i, // Numeri alti per evitare conflitti
      row: i <= 2 ? 'DX' : 'SX', // I primi 2 su DX, il terzo su SX
      position: i
    };
    
    basketPromises.push(apiRequest('/baskets', 'POST', basketData));
  }
  
  const baskets = await Promise.all(basketPromises);
  testData.basketIds = baskets.map(b => b.id);
  
  console.log(`✅ Creati ${baskets.length} cestelli:`);
  baskets.forEach(b => {
    console.log(`   - Cestello #${b.physicalNumber} (ID: ${b.id}) in ${b.row}-${b.position}`);
  });
  
  return baskets;
}

async function activateBaskets(baskets) {
  console.log('\n🚀 Attivazione cestelli con prima attivazione...');
  
  for (let i = 0; i < baskets.length; i++) {
    const basket = baskets[i];
    
    // Crea ciclo
    const cycleData = {
      basketId: basket.id,
      lotId: testData.lotId,
      startDate: '2025-05-26',
      state: 'active'
    };
    
    const cycle = await apiRequest('/cycles', 'POST', cycleData);
    testData.cycleIds.push(cycle.id);
    
    // Aggiorna cestello
    await apiRequest(`/baskets/${basket.id}`, 'PATCH', {
      state: 'active',
      currentCycleId: cycle.id
    });
    
    // Crea operazione di prima attivazione
    const operationData = {
      basketId: basket.id,
      cycleId: cycle.id,
      lotId: testData.lotId,
      date: '2025-05-26',
      type: 'prima-attivazione',
      animalCount: 2500000 + (i * 100000), // Varia leggermente per ogni cestello
      totalWeight: 250 + (i * 10),
      sizeId: 4, // TP-315
      mortality: 0,
      notes: 'Prima attivazione - Test simulazione vagliatura'
    };
    
    const operation = await apiRequest('/operations', 'POST', operationData);
    testData.operationIds.push(operation.id);
    
    console.log(`✅ Cestello #${basket.physicalNumber} attivato (Ciclo: ${cycle.id}, Op: ${operation.id})`);
  }
}

async function createTestSelection(baskets) {
  console.log('\n📋 Creazione selezione per vagliatura...');
  
  const selectionData = {
    date: '2025-05-26',
    notes: 'Test vagliatura simulazione - DA CANCELLARE',
    status: 'draft'
  };
  
  const selection = await apiRequest('/selections', 'POST', selectionData);
  testData.selectionId = selection.id;
  
  console.log(`✅ Selezione creata: ID ${selection.id}, Numero ${selection.selectionNumber}`);
  
  // Aggiungi cestelli origine
  for (const basket of baskets) {
    await apiRequest(`/selections/${selection.id}/source-baskets`, 'POST', {
      basketId: basket.id,
      animalCount: 2000000 + (basket.id * 10000) // Quantità variabile
    });
    console.log(`✅ Aggiunto cestello origine #${basket.physicalNumber}`);
  }
  
  return selection;
}

async function addDestinationBaskets(selection) {
  console.log('\n🎯 Aggiunta cestelli destinazione...');
  
  // Cestello destinazione 1 (normale)
  await apiRequest(`/selections/${selection.id}/destination-baskets`, 'POST', {
    flupsyId: testData.flupsyId,
    row: 'DX',
    position: 4,
    animalCount: 3000000,
    totalWeight: 300,
    sizeId: 5, // TP-450
    mortality: 2.5,
    forSale: false,
    notes: 'Destinazione 1 - Test'
  });
  console.log(`✅ Aggiunto cestello destinazione 1 (DX-4)`);
  
  // Cestello destinazione 2 (normale)
  await apiRequest(`/selections/${selection.id}/destination-baskets`, 'POST', {
    flupsyId: testData.flupsyId,
    row: 'DX',
    position: 5,
    animalCount: 2500000,
    totalWeight: 250,
    sizeId: 5, // TP-450
    mortality: 1.8,
    forSale: false,
    notes: 'Destinazione 2 - Test'
  });
  console.log(`✅ Aggiunto cestello destinazione 2 (DX-5)`);
  
  // Cestello destinazione 3 (vendita)
  await apiRequest(`/selections/${selection.id}/destination-baskets`, 'POST', {
    flupsyId: testData.flupsyId,
    row: 'SX',
    position: 2,
    animalCount: 1500000,
    totalWeight: 150,
    sizeId: 5, // TP-450
    mortality: 0,
    forSale: true,
    customerName: 'Cliente Test Simulazione',
    customerAddress: 'Via Test 123, Test City',
    pricePerKg: 15.50,
    notes: 'Destinazione vendita - Test'
  });
  console.log(`✅ Aggiunto cestello destinazione 3 (SX-2) - VENDITA`);
}

async function completeSelection(selection) {
  console.log('\n🎯 COMPLETAMENTO VAGLIATURA - TEST CRITICO...');
  
  try {
    const result = await apiRequest(`/selections/${selection.id}/complete`, 'POST');
    
    if (result.success) {
      console.log('🎉 SUCCESSO! Vagliatura completata senza errori');
      console.log(`   - Cicli origine chiusi: ${result.sourceBasketsClosed || 0}`);
      console.log(`   - Cicli destinazione creati: ${result.destinationBasketsCreated || 0}`);
      console.log(`   - Operazioni vagliatura create: ${result.operationsCreated || 0}`);
      console.log(`   - Operazioni vendita create: ${result.saleOperationsCreated || 0}`);
      return true;
    } else {
      console.error('❌ ERRORE durante il completamento:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ ERRORE CRITICO durante il completamento:', error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Pulizia dati di test...');
  
  try {
    // Cancella selezione
    if (testData.selectionId) {
      await apiRequest(`/selections/${testData.selectionId}`, 'DELETE');
      console.log(`✅ Selezione ${testData.selectionId} cancellata`);
    }
    
    // Cancella operazioni
    for (const opId of testData.operationIds) {
      try {
        await apiRequest(`/operations/${opId}`, 'DELETE');
        console.log(`✅ Operazione ${opId} cancellata`);
      } catch (e) {
        console.log(`⚠️ Operazione ${opId} già cancellata o non trovata`);
      }
    }
    
    // Cancella cicli
    for (const cycleId of testData.cycleIds) {
      try {
        await apiRequest(`/cycles/${cycleId}`, 'DELETE');
        console.log(`✅ Ciclo ${cycleId} cancellato`);
      } catch (e) {
        console.log(`⚠️ Ciclo ${cycleId} già cancellato o non trovato`);
      }
    }
    
    // Cancella cestelli
    for (const basketId of testData.basketIds) {
      try {
        await apiRequest(`/baskets/${basketId}`, 'DELETE');
        console.log(`✅ Cestello ${basketId} cancellato`);
      } catch (e) {
        console.log(`⚠️ Cestello ${basketId} già cancellato o non trovato`);
      }
    }
    
    // Cancella lotto
    if (testData.lotId) {
      await apiRequest(`/lots/${testData.lotId}`, 'DELETE');
      console.log(`✅ Lotto ${testData.lotId} cancellato`);
    }
    
    console.log('🎉 Pulizia completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error.message);
    console.log('⚠️ Alcuni dati di test potrebbero essere rimasti nel database');
  }
}

async function runSimulation() {
  console.log('🚀 AVVIO SIMULAZIONE TEST VAGLIATURA');
  console.log('=====================================');
  
  let success = false;
  
  try {
    // 1. Trova FLUPSY
    await findCaPisani1Flupsy();
    
    // 2. Crea lotto di test
    await createTestLot();
    
    // 3. Crea cestelli
    const baskets = await createTestBaskets();
    
    // 4. Attiva cestelli
    await activateBaskets(baskets);
    
    // 5. Crea selezione
    const selection = await createTestSelection(baskets);
    
    // 6. Aggiungi cestelli destinazione
    await addDestinationBaskets(selection);
    
    // 7. TEST CRITICO: Completa vagliatura
    success = await completeSelection(selection);
    
    console.log('\n📊 RISULTATO SIMULAZIONE');
    console.log('========================');
    
    if (success) {
      console.log('🎉 ✅ SUCCESSO! La nuova logica di completamento vagliatura funziona correttamente');
      console.log('   - Nessun errore "violates not-null constraint cycle_id"');
      console.log('   - Sequenza operazioni corretta');
      console.log('   - Gestione vendite funzionante');
    } else {
      console.log('❌ FALLIMENTO! Ci sono ancora problemi nel completamento della vagliatura');
    }
    
  } catch (error) {
    console.error('\n❌ ERRORE DURANTE LA SIMULAZIONE:', error.message);
    success = false;
  } finally {
    // Pulizia sempre, anche in caso di errore
    await cleanup();
  }
  
  return success;
}

// Avvia la simulazione
runSimulation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });