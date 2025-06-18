#!/usr/bin/env node

/**
 * Test di sincronizzazione completa con la nuova implementazione
 * che rimuove i campi timestamp problematici
 */

const { ExternalSyncService } = require('./server/external-sync-service.ts');
const { DbStorage } = require('./server/db-storage.ts');

async function testCompleteSync() {
  console.log('🔄 Avvio test sincronizzazione completa...');
  
  try {
    const storage = new DbStorage();
    const syncService = new ExternalSyncService(storage);
    
    console.log('✅ Inizializzazione servizio di sincronizzazione completata');
    
    // Test connessione database esterno
    console.log('🔗 Test connessione database esterno...');
    const connectionOk = await syncService.testConnection();
    if (!connectionOk) {
      throw new Error('Connessione al database esterno fallita');
    }
    
    console.log('✅ Connessione database esterno OK');
    
    // Esecuzione sincronizzazione completa
    console.log('🚀 Avvio sincronizzazione completa...');
    const startTime = Date.now();
    
    await syncService.performFullSync();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Sincronizzazione completata in ${duration}ms`);
    
    // Verifica risultati
    console.log('📊 Verifica risultati sincronizzazione...');
    
    const customers = await storage.getExternalCustomers();
    const sales = await storage.getExternalSales();
    const deliveries = await storage.getExternalDeliveries();
    const deliveryDetails = await storage.getExternalDeliveryDetails();
    
    console.log(`📈 Clienti sincronizzati: ${customers.length}`);
    console.log(`📈 Vendite sincronizzate: ${sales.length}`);
    console.log(`📈 Consegne sincronizzate: ${deliveries.length}`);
    console.log(`📈 Dettagli consegne sincronizzati: ${deliveryDetails.length}`);
    
    // Chiudi connessioni
    await syncService.close();
    
    console.log('🎉 Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Esegui il test
testCompleteSync();