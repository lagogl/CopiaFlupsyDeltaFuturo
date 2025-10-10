#!/usr/bin/env node

/**
 * SCRIPT DI TEST AUTOMATIZZATO - MODULO VAGLIATURA
 * Esegue test automatici delle API del modulo vagliatura
 */

const baseUrl = 'http://localhost:5000';

// Colori per output console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper per richieste HTTP
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const result = await response.json();
    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test suite
const tests = {
  // Test 1: Verifica endpoint vagliature
  async testListScreenings() {
    console.log(`${colors.blue}► Test 1: Lista vagliature${colors.reset}`);
    const result = await makeRequest('GET', '/api/screenings');
    
    if (result.success) {
      console.log(`${colors.green}✓ Endpoint vagliature funziona${colors.reset}`);
      console.log(`  Vagliature trovate: ${result.data.screenings?.length || 0}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Errore endpoint vagliature: ${result.error || result.status}${colors.reset}`);
      return false;
    }
  },

  // Test 2: Ottieni prossimo numero vagliatura
  async testNextNumber() {
    console.log(`\n${colors.blue}► Test 2: Prossimo numero vagliatura${colors.reset}`);
    const result = await makeRequest('GET', '/api/screening/next-number');
    
    if (result.success && result.data.nextNumber) {
      console.log(`${colors.green}✓ Prossimo numero: ${result.data.nextNumber}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Errore recupero numero: ${result.error || result.status}${colors.reset}`);
      return false;
    }
  },

  // Test 3: Crea vagliatura di test
  async testCreateScreening() {
    console.log(`\n${colors.blue}► Test 3: Crea vagliatura di test${colors.reset}`);
    
    // Prima ottieni il prossimo numero di vagliatura
    const nextNumResult = await makeRequest('GET', '/api/screening/next-number');
    const screeningNumber = nextNumResult.data?.nextNumber || 1;
    
    const testData = {
      screeningNumber: screeningNumber,
      date: new Date().toISOString().split('T')[0],
      purpose: 'Test automatico vagliatura',
      referenceSizeId: 15, // TP-2000 come riferimento
      status: 'draft',
      notes: 'Vagliatura creata da script di test automatico'
    };
    
    const result = await makeRequest('POST', '/api/screening/operations', testData);
    
    if (result.success && result.data) {
      console.log(`${colors.green}✓ Vagliatura creata con ID: ${result.data.id}${colors.reset}`);
      console.log(`  Numero vagliatura: ${result.data.screeningNumber}`);
      return result.data.id;
    } else {
      console.log(`${colors.red}✗ Errore creazione vagliatura: ${JSON.stringify(result.data?.errors || result.error)}${colors.reset}`);
      return false;
    }
  },

  // Test 4: Verifica gestione cestelli doppio ruolo
  async testDoubleRoleBaskets(screeningId) {
    console.log(`\n${colors.blue}► Test 4: Verifica cestelli doppio ruolo${colors.reset}`);
    
    if (!screeningId) {
      console.log(`${colors.yellow}⚠ Test saltato: nessun ID vagliatura${colors.reset}`);
      return false;
    }
    
    // Aggiungi cestello come origine
    const sourceData = {
      screeningId: screeningId,
      basketId: 100,
      cycleId: 1,
      animalCount: 10000,
      totalWeight: 50,
      animalsPerKg: 200,
      dismissed: false
    };
    
    const sourceResult = await makeRequest('POST', '/api/screening/source-baskets', sourceData);
    
    if (!sourceResult.success) {
      console.log(`${colors.red}✗ Errore aggiunta cestello origine${colors.reset}`);
      return false;
    }
    
    // Aggiungi stesso cestello come destinazione
    const destData = {
      screeningId: screeningId,
      basketId: 100,
      cycleId: 1,
      category: 'Riposizionata',
      animalCount: 7000,
      totalWeight: 40,
      animalsPerKg: 175,
      flupsyId: 1,
      row: 'A',
      position: 5
    };
    
    const destResult = await makeRequest('POST', '/api/screening/destination-baskets', destData);
    
    if (destResult.success) {
      console.log(`${colors.green}✓ Cestello doppio ruolo gestito correttamente${colors.reset}`);
      console.log(`  Cestello 100: Origine (10000 animali) → Destinazione (7000 animali)`);
      return true;
    } else {
      console.log(`${colors.red}✗ Errore gestione doppio ruolo${colors.reset}`);
      return false;
    }
  },

  // Test 5: Verifica posizioni dinamiche
  async testDynamicPositions(screeningId) {
    console.log(`\n${colors.blue}► Test 5: Verifica posizioni dinamiche e NULL${colors.reset}`);
    
    if (!screeningId) {
      console.log(`${colors.yellow}⚠ Test saltato: nessun ID vagliatura${colors.reset}`);
      return false;
    }
    
    // Test posizione NULL (cestello venduto)
    const soldBasket = {
      screeningId: screeningId,
      basketId: 201,
      cycleId: 2,
      category: 'Venduta',
      animalCount: 3000,
      totalWeight: 20,
      animalsPerKg: 150,
      flupsyId: null,
      row: null,
      position: null  // Posizione NULL per cestello venduto
    };
    
    const nullResult = await makeRequest('POST', '/api/screening/destination-baskets', soldBasket);
    
    if (!nullResult.success) {
      console.log(`${colors.red}✗ Errore gestione posizione NULL${colors.reset}`);
      return false;
    }
    
    // Test posizione dinamica
    const dynamicBasket = {
      screeningId: screeningId,
      basketId: 202,
      cycleId: 2,
      category: 'Riposizionata',
      animalCount: 2000,
      totalWeight: 15,
      animalsPerKg: 133,
      flupsyId: 1,
      row: 'B',
      position: 12  // Posizione dinamica, non hardcoded a 1
    };
    
    const dynamicResult = await makeRequest('POST', '/api/screening/destination-baskets', dynamicBasket);
    
    if (nullResult.success && dynamicResult.success) {
      console.log(`${colors.green}✓ Posizioni gestite correttamente${colors.reset}`);
      console.log(`  Cestello venduto: posizione NULL`);
      console.log(`  Cestello riposizionato: posizione B12`);
      return true;
    } else {
      console.log(`${colors.red}✗ Errore gestione posizioni${colors.reset}`);
      return false;
    }
  },

  // Test 6: Calcolo mortalità
  async testMortalityCalculation(screeningId) {
    console.log(`\n${colors.blue}► Test 6: Calcolo mortalità${colors.reset}`);
    
    if (!screeningId) {
      console.log(`${colors.yellow}⚠ Test saltato: nessun ID vagliatura${colors.reset}`);
      return false;
    }
    
    // Recupera dettagli vagliatura
    const result = await makeRequest('GET', `/api/screenings/${screeningId}`);
    
    if (result.success && result.data) {
      const screening = result.data;
      const totalSource = screening.sourceBaskets?.reduce((sum, b) => sum + (b.animalCount || 0), 0) || 0;
      const totalDest = screening.destinationBaskets?.reduce((sum, b) => sum + (b.animalCount || 0), 0) || 0;
      const mortality = totalSource - totalDest;
      const mortalityPercent = totalSource > 0 ? ((mortality / totalSource) * 100).toFixed(2) : 0;
      
      console.log(`${colors.green}✓ Calcoli mortalità:${colors.reset}`);
      console.log(`  Animali origine: ${totalSource.toLocaleString('it-IT')}`);
      console.log(`  Animali destinazione: ${totalDest.toLocaleString('it-IT')}`);
      console.log(`  Mortalità: ${mortality.toLocaleString('it-IT')} (${mortalityPercent}%)`);
      
      return true;
    } else {
      console.log(`${colors.red}✗ Errore recupero dati vagliatura${colors.reset}`);
      return false;
    }
  },

  // Test 7: Verifica API FLUPSY per mappa
  async testFlupsyMap() {
    console.log(`\n${colors.blue}► Test 7: Verifica API FLUPSY per mappa${colors.reset}`);
    
    const result = await makeRequest('GET', '/api/flupsys');
    
    if (result.success && Array.isArray(result.data)) {
      console.log(`${colors.green}✓ API FLUPSY funziona${colors.reset}`);
      console.log(`  FLUPSY disponibili: ${result.data.length}`);
      
      if (result.data.length > 0) {
        const flupsy = result.data[0];
        console.log(`  Esempio: ${flupsy.name} - ${flupsy.maxPositions} posizioni`);
      }
      return true;
    } else {
      console.log(`${colors.red}✗ Errore recupero FLUPSY${colors.reset}`);
      return false;
    }
  },

  // Test 8: Completamento vagliatura
  async testCompleteScreening(screeningId) {
    console.log(`\n${colors.blue}► Test 8: Completamento vagliatura${colors.reset}`);
    
    if (!screeningId) {
      console.log(`${colors.yellow}⚠ Test saltato: nessun ID vagliatura${colors.reset}`);
      return false;
    }
    
    const result = await makeRequest('POST', `/api/screening/operations/${screeningId}/complete`);
    
    if (result.success) {
      console.log(`${colors.green}✓ Vagliatura completata con successo${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Errore completamento vagliatura${colors.reset}`);
      return false;
    }
  }
};

// Esecuzione test suite
async function runTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}  TEST AUTOMATIZZATI - MODULO VAGLIATURA CON MAPPA${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`\n📅 Data test: ${new Date().toLocaleString('it-IT')}`);
  console.log(`🔗 Server: ${baseUrl}`);
  console.log();
  
  let passedTests = 0;
  let failedTests = 0;
  let screeningId = null;
  
  // Esegui test in sequenza
  if (await tests.testListScreenings()) passedTests++; else failedTests++;
  if (await tests.testNextNumber()) passedTests++; else failedTests++;
  
  screeningId = await tests.testCreateScreening();
  if (screeningId) passedTests++; else failedTests++;
  
  if (await tests.testDoubleRoleBaskets(screeningId)) passedTests++; else failedTests++;
  if (await tests.testDynamicPositions(screeningId)) passedTests++; else failedTests++;
  if (await tests.testMortalityCalculation(screeningId)) passedTests++; else failedTests++;
  if (await tests.testFlupsyMap()) passedTests++; else failedTests++;
  if (await tests.testCompleteScreening(screeningId)) passedTests++; else failedTests++;
  
  // Riepilogo finale
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}  RIEPILOGO TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✓ Test superati: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}✗ Test falliti: ${failedTests}${colors.reset}`);
  
  const successRate = ((passedTests / (passedTests + failedTests)) * 100).toFixed(1);
  const statusColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;
  
  console.log(`\n${statusColor}📊 Tasso di successo: ${successRate}%${colors.reset}`);
  
  if (screeningId) {
    console.log(`\n💡 Vagliatura di test creata con ID: ${screeningId}`);
    console.log(`   Puoi verificarla nell'interfaccia web`);
  }
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Avvia i test
runTests().catch(error => {
  console.error(`${colors.red}Errore fatale durante i test: ${error.message}${colors.reset}`);
  process.exit(1);
});