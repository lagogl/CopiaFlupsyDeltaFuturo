/**
 * Test rapido per verificare il completamento vagliatura
 * Usa cestelli esistenti per testare solo la logica di completamento
 */

const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return data;
}

async function testQuickVagliatura() {
  console.log('🚀 TEST RAPIDO COMPLETAMENTO VAGLIATURA');
  console.log('=========================================');
  
  let selectionId = null;
  
  try {
    // 1. Trova cestelli attivi esistenti
    console.log('\n🔍 Ricerca cestelli attivi...');
    const baskets = await apiRequest('/baskets?includeAll=true');
    const activeBaskets = baskets.filter(b => b.state === 'active' && b.currentCycleId).slice(0, 2);
    
    if (activeBaskets.length < 2) {
      console.log('❌ Servono almeno 2 cestelli attivi per il test');
      return false;
    }
    
    console.log(`✅ Trovati ${activeBaskets.length} cestelli attivi:`);
    activeBaskets.forEach(b => {
      console.log(`   - Cestello #${b.physicalNumber} (${b.flupsyName})`);
    });
    
    // 2. Crea selezione test
    console.log('\n📋 Creazione selezione test...');
    const selection = await apiRequest('/selections', 'POST', {
      date: '2025-05-26',
      notes: 'TEST RAPIDO - DA CANCELLARE',
      status: 'draft'
    });
    selectionId = selection.id;
    console.log(`✅ Selezione creata: ${selection.selectionNumber}`);
    
    // 3. Aggiungi cestelli origine
    console.log('\n🎯 Aggiunta cestelli origine...');
    for (const basket of activeBaskets) {
      await apiRequest(`/selections/${selection.id}/source-baskets`, 'POST', {
        basketId: basket.id,
        animalCount: 1000000
      });
      console.log(`✅ Aggiunto cestello origine #${basket.physicalNumber}`);
    }
    
    // 4. Aggiungi cestelli destinazione
    console.log('\n🎯 Aggiunta cestelli destinazione...');
    
    // Destinazione normale
    await apiRequest(`/selections/${selection.id}/destination-baskets`, 'POST', {
      flupsyId: activeBaskets[0].flupsyId,
      row: 'DX',
      position: 10, // Posizione sicura
      animalCount: 1500000,
      totalWeight: 150,
      sizeId: 5,
      mortality: 1.0,
      forSale: false,
      notes: 'Test destinazione normale'
    });
    console.log(`✅ Aggiunta destinazione normale`);
    
    // Destinazione vendita
    await apiRequest(`/selections/${selection.id}/destination-baskets`, 'POST', {
      flupsyId: activeBaskets[0].flupsyId,
      row: 'SX',
      position: 10, // Posizione sicura
      animalCount: 500000,
      totalWeight: 50,
      sizeId: 5,
      mortality: 0,
      forSale: true,
      customerName: 'Cliente Test',
      customerAddress: 'Via Test 123',
      pricePerKg: 15.00,
      notes: 'Test destinazione vendita'
    });
    console.log(`✅ Aggiunta destinazione vendita`);
    
    // 5. TEST CRITICO: Completa vagliatura
    console.log('\n🎯 COMPLETAMENTO VAGLIATURA - TEST CRITICO...');
    console.log('   Verificando se la nuova logica risolve l\'errore cycle_id constraint...');
    
    const result = await apiRequest(`/selections/${selection.id}/complete`, 'POST');
    
    if (result.success) {
      console.log('\n🎉 ✅ SUCCESSO! Vagliatura completata senza errori!');
      console.log(`   - Operazioni create: ${result.operationsCreated || 0}`);
      console.log(`   - Operazioni vendita: ${result.saleOperationsCreated || 0}`);
      console.log('   - La nuova logica funziona correttamente');
      console.log('   - Nessun errore "violates not-null constraint cycle_id"');
      return true;
    } else {
      console.log('\n❌ ERRORE nel completamento:', result.error);
      return false;
    }
    
  } catch (error) {
    console.log(`\n❌ ERRORE: ${error.message}`);
    return false;
  } finally {
    // Pulizia
    if (selectionId) {
      try {
        await apiRequest(`/selections/${selectionId}`, 'DELETE');
        console.log('\n🧹 Selezione test cancellata');
      } catch (e) {
        console.log('\n⚠️ Errore nella pulizia, ma il test è completo');
      }
    }
  }
}

testQuickVagliatura()
  .then(success => {
    console.log('\n📊 RISULTATO FINALE:');
    if (success) {
      console.log('🎉 La nuova logica di completamento vagliatura FUNZIONA!');
    } else {
      console.log('❌ Ci sono ancora problemi da risolvere');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });