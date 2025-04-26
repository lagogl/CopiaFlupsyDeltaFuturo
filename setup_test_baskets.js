/**
 * Script per la creazione di cestelli di test distribuiti nei FLUPSY esistenti
 * Data: 26/04/2025
 */

import { db } from './server/db.js';
import { baskets } from './shared/schema.js';

async function createTestBaskets() {
  try {
    console.log('Inizio creazione cestelli di test...');
    
    // Definizione dei cestelli da creare per ciascun flupsy
    const basketsToCreate = [
      // Flupsy 1 (Mondolo) - 6 cestelli
      { physicalNumber: 1, flupsyId: 1, position: 1, row: 'DX', state: 'available' },
      { physicalNumber: 2, flupsyId: 1, position: 2, row: 'DX', state: 'available' },
      { physicalNumber: 3, flupsyId: 1, position: 3, row: 'DX', state: 'available' },
      { physicalNumber: 1, flupsyId: 1, position: 1, row: 'SX', state: 'available' },
      { physicalNumber: 2, flupsyId: 1, position: 2, row: 'SX', state: 'available' },
      { physicalNumber: 3, flupsyId: 1, position: 3, row: 'SX', state: 'available' },
      
      // Flupsy 2 (Easytech) - 6 cestelli
      { physicalNumber: 1, flupsyId: 2, position: 1, row: 'DX', state: 'available' },
      { physicalNumber: 2, flupsyId: 2, position: 2, row: 'DX', state: 'available' },
      { physicalNumber: 3, flupsyId: 2, position: 3, row: 'DX', state: 'available' },
      { physicalNumber: 1, flupsyId: 2, position: 1, row: 'SX', state: 'available' },
      { physicalNumber: 2, flupsyId: 2, position: 2, row: 'SX', state: 'available' },
      { physicalNumber: 3, flupsyId: 2, position: 3, row: 'SX', state: 'available' },
      
      // Flupsy 3 Alluminio - 4 cestelli
      { physicalNumber: 1, flupsyId: 13, position: 1, row: 'DX', state: 'available' },
      { physicalNumber: 2, flupsyId: 13, position: 2, row: 'DX', state: 'available' },
      { physicalNumber: 1, flupsyId: 13, position: 1, row: 'SX', state: 'available' },
      { physicalNumber: 2, flupsyId: 13, position: 2, row: 'SX', state: 'available' },
      
      // Mega Flupsy - 4 cestelli
      { physicalNumber: 1, flupsyId: 113, position: 1, row: 'DX', state: 'available' },
      { physicalNumber: 2, flupsyId: 113, position: 2, row: 'DX', state: 'available' },
      { physicalNumber: 1, flupsyId: 113, position: 1, row: 'SX', state: 'available' },
      { physicalNumber: 2, flupsyId: 113, position: 2, row: 'SX', state: 'available' },
    ];
    
    // Inserimento cestelli nel database
    const insertedBaskets = await db.insert(baskets).values(basketsToCreate).returning();
    
    console.log(`Creati con successo ${insertedBaskets.length} cestelli di test.`);
    console.log('Ecco i cestelli creati:');
    
    // Raggruppa cestelli per flupsy per una visualizzazione ordinata
    const basketsByFlupsy = {};
    for (const basket of insertedBaskets) {
      if (!basketsByFlupsy[basket.flupsyId]) {
        basketsByFlupsy[basket.flupsyId] = [];
      }
      basketsByFlupsy[basket.flupsyId].push(basket);
    }
    
    // Stampa cestelli raggruppati per flupsy
    for (const flupsyId in basketsByFlupsy) {
      console.log(`\nFlupsy ID ${flupsyId}:`);
      basketsByFlupsy[flupsyId].forEach(b => {
        console.log(`  Cestello #${b.physicalNumber} (ID: ${b.id}): posizione ${b.row}-${b.position}`);
      });
    }
    
    return insertedBaskets;
  } catch (error) {
    console.error('Errore durante la creazione dei cestelli di test:', error);
    throw error;
  }
}

// Esegui la funzione
createTestBaskets()
  .then(() => {
    console.log('Script completato con successo!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Errore durante l\'esecuzione dello script:', err);
    process.exit(1);
  });

// In ESM, l'export è già dichiarato all'inizio del file
export { createTestBaskets };