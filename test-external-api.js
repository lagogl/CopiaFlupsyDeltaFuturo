/**
 * Script di test per le API esterne
 * 
 * Questo script verifica le funzionalità delle API esterne per le operazioni di vendita.
 * Da eseguire quando l'applicazione è in esecuzione.
 */

import fetch from 'node-fetch';

// Configurazione
const BASE_URL = 'http://localhost:5000/api/external';
const API_KEY = 'chiave-test-per-sviluppo'; // Usa la stessa chiave definita nel controller TEST_API_KEY

// Funzione per eseguire una richiesta API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error);
    return { status: 500, error: error.message };
  }
}

// Funzione principale per i test
async function runTests() {
  console.log('=== Test API Esterne ===');
  
  // Test 1: Verifica stato API
  console.log('\n1. Verifica stato API:');
  const statusResponse = await apiRequest('/status');
  console.log('Stato:', statusResponse.status);
  console.log('Risposta:', statusResponse.data);
  
  // Test 2: Ottieni cestelli disponibili
  console.log('\n2. Ottieni cestelli disponibili:');
  const basketsResponse = await apiRequest('/sales/available-baskets');
  console.log('Stato:', basketsResponse.status);
  console.log('Numero cestelli disponibili:', basketsResponse.data?.baskets?.length || 0);
  
  // Ottieni un ID di cestello se disponibile
  let basketId = null;
  if (basketsResponse.data?.baskets?.length > 0) {
    basketId = basketsResponse.data.baskets[0].id;
    console.log('ID cestello per test:', basketId);
  } else {
    console.log('Nessun cestello disponibile per i test di vendita');
    return;
  }
  
  // Test 3: Crea operazione di vendita
  console.log('\n3. Crea operazione di vendita:');
  const saleData = {
    apiKey: API_KEY,
    basketIds: [basketId],
    date: new Date().toISOString().split('T')[0],
    notes: 'Test di vendita da API esterna',
    client: 'Cliente Test',
    invoiceNumber: 'TEST-123',
    totalWeight: 2500, // in grammi
    totalPrice: 150.0, // in euro
    transportType: 'Camion',
    destination: 'Azienda Test SpA'
  };
  
  const saleResponse = await apiRequest('/sales/create', 'POST', saleData);
  console.log('Stato:', saleResponse.status);
  console.log('Risposta:', saleResponse.data);
  
  // Test 4: Ottieni storico vendite
  console.log('\n4. Ottieni storico vendite:');
  const historyResponse = await apiRequest('/sales/history');
  console.log('Stato:', historyResponse.status);
  console.log('Numero gruppi di vendite:', historyResponse.data?.salesHistory?.length || 0);

  // Test 5: Se disponibile, ottieni dettagli di un lotto
  if (basketsResponse.data?.baskets?.length > 0 && 
      basketsResponse.data.baskets[0].lot?.id) {
    const lotId = basketsResponse.data.baskets[0].lot.id;
    
    console.log('\n5. Ottieni dettagli lotto:');
    const lotResponse = await apiRequest(`/lots/${lotId}`);
    console.log('Stato:', lotResponse.status);
    console.log('Dettagli lotto disponibili:', !!lotResponse.data?.lot);
  }
  
  console.log('\n=== Test Completati ===');
}

// Esegui i test
runTests().catch(error => {
  console.error('Errore durante l\'esecuzione dei test:', error);
});