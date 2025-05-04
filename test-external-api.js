/**
 * Script di test per le API esterne
 * 
 * Questo script verifica le funzionalità delle API esterne per le operazioni di vendita.
 * Da eseguire quando l'applicazione è in esecuzione.
 */
import fetch from 'node-fetch';

const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
const API_KEY = 'flupsy-api-key-2025';

// Funzione per effettuare richieste API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { status, data };
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error.message);
    return { status: 'error', data: error.message };
  }
}

// Funzione principale per eseguire i test
async function runTests() {
  console.log('=== TEST API ESTERNE PER VENDITE ===\n');
  
  // Test 1: Verifica stato API
  console.log('Test 1: Verifica stato API');
  const statusResult = await apiRequest('/status');
  console.log(`Stato: ${statusResult.status}`);
  console.log('Risposta:', JSON.stringify(statusResult.data, null, 2));
  console.log('');
  
  // Test 2: Verifica cestelli disponibili
  console.log('Test 2: Verifica cestelli disponibili per la vendita');
  const basketsResult = await apiRequest('/sales/available-baskets');
  console.log(`Stato: ${basketsResult.status}`);
  console.log(`Numero cestelli disponibili: ${basketsResult.data.baskets ? basketsResult.data.baskets.length : 0}`);
  if (basketsResult.data.baskets && basketsResult.data.baskets.length > 0) {
    console.log('Esempio primo cestello:', JSON.stringify(basketsResult.data.baskets[0], null, 2));
  }
  console.log('');
  
  // Test 3: Dettaglio di un lotto (se disponibile)
  console.log('Test 3: Dettaglio di un lotto');
  let lotId = 1; // Default lot ID
  
  // Se abbiamo cestelli disponibili, usiamo l'ID del lotto del primo cestello
  if (basketsResult.data.baskets && basketsResult.data.baskets.length > 0) {
    lotId = basketsResult.data.baskets[0].lotId;
  }
  
  const lotResult = await apiRequest(`/lots/${lotId}`);
  console.log(`Stato: ${lotResult.status}`);
  console.log('Dettaglio lotto:', JSON.stringify(lotResult.data, null, 2));
  console.log('');
  
  // Test 4: Cronologia vendite
  console.log('Test 4: Cronologia vendite');
  const historyResult = await apiRequest('/sales/history');
  console.log(`Stato: ${historyResult.status}`);
  console.log(`Numero vendite registrate: ${historyResult.data.sales ? historyResult.data.sales.length : 0}`);
  if (historyResult.data.sales && historyResult.data.sales.length > 0) {
    console.log('Esempio prima vendita:', JSON.stringify(historyResult.data.sales[0], null, 2));
  }
  console.log('');
  
  // Test 5: Creazione vendita (solo se ci sono cestelli disponibili)
  if (basketsResult.data.baskets && basketsResult.data.baskets.length > 0) {
    const basketToSell = basketsResult.data.baskets[0];
    
    console.log('Test 5: Creazione vendita');
    console.log(`Tentativo di vendita del cestello ID ${basketToSell.id}`);
    
    const saleData = {
      buyerName: "Cliente Test API",
      buyerEmail: "test@example.com",
      buyerPhone: "123456789",
      basketId: basketToSell.id,
      price: 150.00,
      notes: "Vendita di test tramite API esterna"
    };
    
    const saleResult = await apiRequest('/sales/create', 'POST', saleData);
    console.log(`Stato: ${saleResult.status}`);
    console.log('Risposta creazione vendita:', JSON.stringify(saleResult.data, null, 2));
  } else {
    console.log('Test 5: Creazione vendita SALTATO (nessun cestello disponibile)');
  }
}

// Esegui i test
runTests();