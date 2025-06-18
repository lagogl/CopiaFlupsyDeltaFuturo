/**
 * Script per avviare manualmente la sincronizzazione dei dati esterni
 */

import { ExternalSyncService } from './server/external-sync-service.js';

async function triggerManualSync() {
  console.log('🔄 Avvio sincronizzazione manuale...');
  
  try {
    const syncService = new ExternalSyncService();
    
    // Attendi la connessione al database
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📥 Esecuzione sincronizzazione completa...');
    await syncService.performFullSync();
    
    console.log('✅ Sincronizzazione manuale completata');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante sincronizzazione manuale:', error);
    process.exit(1);
  }
}

triggerManualSync();