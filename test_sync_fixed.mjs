#!/usr/bin/env node

/**
 * Test di sincronizzazione completa con la nuova implementazione
 * che rimuove i campi timestamp problematici
 */

import { execSync } from 'child_process';

async function testCompleteSync() {
  console.log('🔄 Avvio test sincronizzazione completa...');
  
  try {
    // Esegui la sincronizzazione tramite l'endpoint API
    console.log('🚀 Avvio sincronizzazione completa tramite API...');
    const startTime = Date.now();
    
    const result = execSync('curl -X POST http://localhost:5000/api/sync/external/full -H "Content-Type: application/json"', {
      encoding: 'utf8',
      timeout: 120000 // 2 minuti di timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Sincronizzazione completata in ${duration}ms`);
    console.log('📊 Risultato:', result);
    
    // Verifica risultati tramite API
    console.log('📊 Verifica risultati sincronizzazione...');
    
    const customersResult = execSync('curl -s http://localhost:5000/api/sync/external/customers', { encoding: 'utf8' });
    const salesResult = execSync('curl -s http://localhost:5000/api/sync/external/sales', { encoding: 'utf8' });
    const deliveriesResult = execSync('curl -s http://localhost:5000/api/sync/external/deliveries', { encoding: 'utf8' });
    const deliveryDetailsResult = execSync('curl -s http://localhost:5000/api/sync/external/delivery-details', { encoding: 'utf8' });
    
    const customers = JSON.parse(customersResult);
    const sales = JSON.parse(salesResult);
    const deliveries = JSON.parse(deliveriesResult);
    const deliveryDetails = JSON.parse(deliveryDetailsResult);
    
    console.log(`📈 Clienti sincronizzati: ${customers.length || 'N/A'}`);
    console.log(`📈 Vendite sincronizzate: ${sales.length || 'N/A'}`);
    console.log(`📈 Consegne sincronizzate: ${deliveries.length || 'N/A'}`);
    console.log(`📈 Dettagli consegne sincronizzati: ${deliveryDetails.length || 'N/A'}`);
    
    console.log('🎉 Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    if (error.stdout) console.error('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
  }
}

// Aspetta che il server sia avviato, poi esegui il test
setTimeout(testCompleteSync, 2000);