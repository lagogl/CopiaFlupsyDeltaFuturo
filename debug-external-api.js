/**
 * Script di debug per le API esterne
 * Questo script testa l'accesso alle API esterne utilizzando diversi metodi
 * di autenticazione per identificare quali funzionano e quali no.
 */
import fetch from 'node-fetch';

const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
const API_KEY = 'flupsy-api-key-2025';

// Test con diversi metodi di autenticazione
async function testAuth() {
  console.log('=== TEST AUTENTICAZIONE API ESTERNE ===\n');
  
  // Metodo 1: Header "Authorization: Bearer"
  try {
    console.log('Test 1: Authorization Bearer header');
    const response = await fetch(`${BASE_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`Stato: ${status}`);
    console.log(`Risposta: ${text}`);
    console.log('');
  } catch (error) {
    console.error('Errore nel Test 1:', error.message);
  }
  
  // Metodo 2: Header "X-API-Key"
  try {
    console.log('Test 2: X-API-Key header');
    const response = await fetch(`${BASE_URL}/status`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`Stato: ${status}`);
    console.log(`Risposta: ${text}`);
    console.log('');
  } catch (error) {
    console.error('Errore nel Test 2:', error.message);
  }
  
  // Metodo 3: Query parameter
  try {
    console.log('Test 3: Query parameter');
    const response = await fetch(`${BASE_URL}/status?apiKey=${API_KEY}`);
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`Stato: ${status}`);
    console.log(`Risposta: ${text}`);
    console.log('');
  } catch (error) {
    console.error('Errore nel Test 3:', error.message);
  }

  // Metodo 4: Combinazione di metodi (per debug)
  try {
    console.log('Test 4: Combinazione (Authorization + X-API-Key)');
    const response = await fetch(`${BASE_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY
      }
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`Stato: ${status}`);
    console.log(`Risposta: ${text}`);
    console.log('');
  } catch (error) {
    console.error('Errore nel Test 4:', error.message);
  }
}

// Esegui test
testAuth();