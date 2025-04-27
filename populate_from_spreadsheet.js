/**
 * Script per popolare il database con i dati del foglio elettronico
 * 
 * Questo script inserisce i dati del foglio elettronico nel database
 * utilizzando le API esistenti dell'applicazione.
 * 
 * Istruzioni per l'uso:
 * 1. Avviare l'applicazione con 'npm run dev'
 * 2. Eseguire questo script con 'node populate_from_spreadsheet.js'
 */

const fs = require('fs');
const { Pool } = require('pg');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configurazione del client per connessione diretta al database
// Utilizziamo l'environment variable DATABASE_URL che è già configurata nell'applicazione
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mappa dei nomi FLUPSY dal foglio elettronico ai FLUPSY nel database
const flupsyMapping = {
  'Flupsy 2 Margheray': 2,  // Flupsy 2 (Easytech)
  'Flupsy 1 Arborina': 1,   // Flupsy 1 (Mondolo)
  'Fluspy 3 MegaFlupsy': 13 // Fluspy 3 MegaFlupsy
};

// Mappa dei codici cestello a descrizioni leggibili
const basketTypeMapping = {
  'B30 5x4': 'Cestello standard 5x4',
  '830-1': 'Cestello tipo 830-1',
  // Altri tipi di cestello possono essere aggiunti qui
};

// Dati estratti dal foglio elettronico
const spreadsheetData = [
  // Lotti NUOVO ARRIVO
  { lotNumber: '3742', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.40, length: 11 } },
  { lotNumber: '3743', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.90, length: 11 } },
  { lotNumber: '3744', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.10, length: 11 } },
  { lotNumber: '3745', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.30, length: 11 } },
  { lotNumber: '3746', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.40, length: 11 } },
  { lotNumber: '3747', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.60, length: 11 } },
  { lotNumber: '3748', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.40, length: 11 } },
  { lotNumber: '3749', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.20, length: 11 } },
  { lotNumber: '3750', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.50, length: 11 } },
  { lotNumber: '3751', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.30, length: 11 } },
  { lotNumber: '3752', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-03-27', measurement: { weight: 57.00, length: 11 } },
  
  // Lotti già in FLUPSY
  { lotNumber: '3880', basketCode: '3880', flupsyName: 'Flupsy 2 Margheray', position: 1, state: 'vagliatura', date: '2025-04-23', notes: 'COZZE DI VAGLIATURA, ANIMALI BELLI', measurement: { weight: 4066.70, length: 23 } },
  { lotNumber: '3881', basketCode: '3881', flupsyName: 'Flupsy 2 Margheray', position: 1, state: 'pulizia verde', date: '2025-04-23', notes: 'COZZE DI VAGLIATURA animali SCHIACCIATI MOLTO VIVA', measurement: { weight: 4456.70, length: 23 } },
  { lotNumber: '3882', basketCode: '3882', flupsyName: 'Flupsy 2 Margheray', position: 2, state: 'pulizia verde', date: '2025-04-22', notes: 'COZZE teste di vagliatura animali bellissimi', measurement: { weight: 4056.70, length: 22 } },
  { lotNumber: '3883', basketCode: '3883', flupsyName: 'Flupsy 2 Margheray', position: 2, state: 'vagliatura', date: '2025-04-22', notes: 'COZZE di vagliatura comuni belli', measurement: { weight: 3976.70, length: 22 } },
  
  // Dati Flupsy 1 Arborina
  { lotNumber: '3905', basketCode: '3905', flupsyName: 'Flupsy 1 Arborina', position: 1, state: 'pulizia verde', date: '2025-04-22', notes: '(+2,5) SOTTO VAGLIATURA NN: 3,5, ANIMALI BELLI MA PRESENTI LEGGERISSIMA MORTALITA', measurement: { weight: 3672.70, length: 22 } },
  { lotNumber: '3906', basketCode: '3906', flupsyName: 'Flupsy 1 Arborina', position: 1, state: 'pulizia verde', date: '2025-04-22', notes: '(+2,5) SOPRA VAGLIATURA COMUNE, ANIMALI BELLI', measurement: { weight: 3778.70, length: 22 } },
  
  // NUOVO ARRIVO con RW DI DELTA FUTURO
  { lotNumber: '3887', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-18', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.40, length: 18 } },
  { lotNumber: '3888', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-19', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.30, length: 19 } },
  { lotNumber: '3889', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-19', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.90, length: 19 } },
  { lotNumber: '3890', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-20', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.80, length: 20 } },
  { lotNumber: '3891', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-20', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.50, length: 20 } },
  { lotNumber: '3892', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-20', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.60, length: 20 } },
  { lotNumber: '3893', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-20', notes: 'RW DI DELTA FUTURO', measurement: { weight: 57.40, length: 20 } },
  
  // NUOVO ARRIVO BW DI DELTA FUTURO, PRESENTI MORTALITA
  { lotNumber: '3939', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.50, length: 24 } },
  { lotNumber: '3940', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.90, length: 24 } },
  { lotNumber: '3941', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.50, length: 24 } },
  { lotNumber: '3942', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.30, length: 24 } },
  { lotNumber: '3943', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.80, length: 24 } },
  { lotNumber: '3944', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.40, length: 24 } },
  { lotNumber: '3945', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.40, length: 24 } },
  { lotNumber: '3946', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.40, length: 24 } },
  { lotNumber: '3947', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.40, length: 24 } },
  { lotNumber: '3948', basketCode: 'B30 5x4', flupsyName: null, state: 'prima attivazione', date: '2025-04-24', notes: 'BW DI DELTA FUTURO, PRESENTI MORTALITA', measurement: { weight: 57.10, length: 24 } },
];

/**
 * Funzioni di utilità per interagire con il database
 */

// Funzione per creare un lotto
async function createLot(lotData) {
  try {
    const { lotNumber, date, notes, sizeId = 1 } = lotData;
    
    // Verifica se il lotto esiste già
    const existingLotQuery = {
      text: 'SELECT id FROM lots WHERE lot_number = $1',
      values: [lotNumber]
    };
    
    const existingLot = await pool.query(existingLotQuery);
    if (existingLot.rows.length > 0) {
      console.log(`Il lotto ${lotNumber} esiste già con ID ${existingLot.rows[0].id}`);
      return existingLot.rows[0].id;
    }
    
    // Crea un nuovo lotto
    const insertLotQuery = {
      text: `INSERT INTO lots (lot_number, arrival_date, status, size_id, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
      values: [lotNumber, date, 'active', sizeId, notes || 'Importato dal foglio elettronico']
    };
    
    const result = await pool.query(insertLotQuery);
    const lotId = result.rows[0].id;
    console.log(`Creato nuovo lotto ${lotNumber} con ID ${lotId}`);
    return lotId;
  } catch (error) {
    console.error('Errore nella creazione del lotto:', error);
    throw error;
  }
}

// Funzione per creare un ciclo associato al lotto
async function createCycle(lotId, lotData) {
  try {
    const { date, lotNumber } = lotData;
    
    // Verifica se esiste già un ciclo per questo lotto
    const existingCycleQuery = {
      text: 'SELECT id FROM cycles WHERE lot_id = $1',
      values: [lotId]
    };
    
    const existingCycle = await pool.query(existingCycleQuery);
    if (existingCycle.rows.length > 0) {
      console.log(`Il ciclo per il lotto ${lotNumber} esiste già con ID ${existingCycle.rows[0].id}`);
      return existingCycle.rows[0].id;
    }
    
    // Crea un nuovo ciclo
    const insertCycleQuery = {
      text: `INSERT INTO cycles (lot_id, start_date, status, reference_size_id, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
      values: [lotId, date, 'active', 1, `Ciclo per lotto ${lotNumber}`]
    };
    
    const result = await pool.query(insertCycleQuery);
    const cycleId = result.rows[0].id;
    console.log(`Creato nuovo ciclo per lotto ${lotNumber} con ID ${cycleId}`);
    return cycleId;
  } catch (error) {
    console.error('Errore nella creazione del ciclo:', error);
    throw error;
  }
}

// Funzione per creare un cestello
async function createBasket(lotId, basketData) {
  try {
    const { basketCode, flupsyName, position } = basketData;
    let flupsyId = null;
    let positionId = null;
    
    // Se è specificato un flupsy, ottieni l'ID corrispondente
    if (flupsyName && flupsyMapping[flupsyName]) {
      flupsyId = flupsyMapping[flupsyName];
      
      // Se è specificata anche una posizione, imposta positionId
      if (position) {
        positionId = position; // Semplificazione: usiamo il numero della posizione come ID
      }
    }
    
    // Verifica se il cestello esiste già
    const existingBasketQuery = {
      text: 'SELECT id FROM baskets WHERE basket_code = $1',
      values: [basketCode]
    };
    
    const existingBasket = await pool.query(existingBasketQuery);
    if (existingBasket.rows.length > 0) {
      console.log(`Il cestello ${basketCode} esiste già con ID ${existingBasket.rows[0].id}`);
      
      // Aggiorna il cestello se è stato spostato in un flupsy
      if (flupsyId) {
        const updateBasketQuery = {
          text: `UPDATE baskets 
                 SET flupsy_id = $1, position_id = $2, updated_at = NOW()
                 WHERE id = $3`,
          values: [flupsyId, positionId, existingBasket.rows[0].id]
        };
        await pool.query(updateBasketQuery);
        console.log(`Aggiornata posizione del cestello ${basketCode} (flupsy_id: ${flupsyId}, position_id: ${positionId})`);
      }
      
      return existingBasket.rows[0].id;
    }
    
    // Crea un nuovo cestello
    const insertBasketQuery = {
      text: `INSERT INTO baskets (basket_code, lot_id, flupsy_id, position_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
      values: [basketCode, lotId, flupsyId, positionId, 'active']
    };
    
    const result = await pool.query(insertBasketQuery);
    const basketId = result.rows[0].id;
    console.log(`Creato nuovo cestello ${basketCode} con ID ${basketId}`);
    return basketId;
  } catch (error) {
    console.error('Errore nella creazione del cestello:', error);
    throw error;
  }
}

// Funzione per creare un'operazione
async function createOperation(lotId, basketId, operationData) {
  try {
    const { state, date, notes, flupsyName } = operationData;
    let flupsyId = null;
    
    // Se è specificato un flupsy, ottieni l'ID corrispondente
    if (flupsyName && flupsyMapping[flupsyName]) {
      flupsyId = flupsyMapping[flupsyName];
    }
    
    // Mappa lo stato del foglio elettronico ai tipi di operazione del sistema
    let operationType;
    switch (state.toLowerCase()) {
      case 'prima attivazione':
        operationType = 'prima-attivazione';
        break;
      case 'vagliatura':
        operationType = 'vagliatura';
        break;
      case 'pulizia verde':
        operationType = 'pulizia';
        break;
      default:
        operationType = 'misura'; // Default
    }
    
    // Crea una nuova operazione
    const insertOperationQuery = {
      text: `INSERT INTO operations (lot_id, basket_id, flupsy_id, date, type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id`,
      values: [lotId, basketId, flupsyId, date, operationType, notes || state]
    };
    
    const result = await pool.query(insertOperationQuery);
    const operationId = result.rows[0].id;
    console.log(`Creata nuova operazione di tipo ${operationType} con ID ${operationId}`);
    return operationId;
  } catch (error) {
    console.error('Errore nella creazione dell\'operazione:', error);
    throw error;
  }
}

// Funzione per creare una misurazione
async function createMeasurement(operationId, basketId, lotId, measurementData) {
  try {
    const { weight, length } = measurementData;
    
    // Crea una nuova misurazione
    const insertMeasurementQuery = {
      text: `INSERT INTO measurements (operation_id, basket_id, lot_id, weight_g, length_mm, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
      values: [operationId, basketId, lotId, weight, length]
    };
    
    const result = await pool.query(insertMeasurementQuery);
    const measurementId = result.rows[0].id;
    console.log(`Creata nuova misurazione con ID ${measurementId} (peso: ${weight}g, lunghezza: ${length}mm)`);
    return measurementId;
  } catch (error) {
    console.error('Errore nella creazione della misurazione:', error);
    throw error;
  }
}

/**
 * Funzione principale per importare i dati
 */
async function importData() {
  try {
    console.log('Inizio importazione dei dati dal foglio elettronico...');
    
    // Processa ogni riga del foglio elettronico
    for (const rowData of spreadsheetData) {
      console.log(`\nProcessing: ${JSON.stringify(rowData)}`);
      
      // 1. Crea o ottieni il lotto
      const lotId = await createLot(rowData);
      
      // 2. Crea o ottieni il ciclo associato al lotto
      const cycleId = await createCycle(lotId, rowData);
      
      // 3. Crea o ottieni il cestello
      const basketId = await createBasket(lotId, rowData);
      
      // 4. Crea l'operazione
      const operationId = await createOperation(lotId, basketId, rowData);
      
      // 5. Crea la misurazione se i dati sono disponibili
      if (rowData.measurement) {
        await createMeasurement(operationId, basketId, lotId, rowData.measurement);
      }
    }
    
    console.log('\nImportazione completata con successo!');
    
    // Riassunto dei dati importati
    const summary = await getSummary();
    console.log('\nRiassunto dei dati nel database:');
    console.log(`- Lotti: ${summary.lotCount}`);
    console.log(`- Cicli: ${summary.cycleCount}`);
    console.log(`- Cestelli: ${summary.basketCount}`);
    console.log(`- Operazioni: ${summary.operationCount}`);
    console.log(`- Misurazioni: ${summary.measurementCount}`);
    
  } catch (error) {
    console.error('Errore durante l\'importazione dei dati:', error);
  } finally {
    // Chiudi la connessione al database
    await pool.end();
  }
}

// Funzione per ottenere un riassunto dei dati nel database
async function getSummary() {
  try {
    const lotCountQuery = await pool.query('SELECT COUNT(*) FROM lots');
    const cycleCountQuery = await pool.query('SELECT COUNT(*) FROM cycles');
    const basketCountQuery = await pool.query('SELECT COUNT(*) FROM baskets');
    const operationCountQuery = await pool.query('SELECT COUNT(*) FROM operations');
    const measurementCountQuery = await pool.query('SELECT COUNT(*) FROM measurements');
    
    return {
      lotCount: parseInt(lotCountQuery.rows[0].count),
      cycleCount: parseInt(cycleCountQuery.rows[0].count),
      basketCount: parseInt(basketCountQuery.rows[0].count),
      operationCount: parseInt(operationCountQuery.rows[0].count),
      measurementCount: parseInt(measurementCountQuery.rows[0].count)
    };
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    return {
      lotCount: 'Errore',
      cycleCount: 'Errore',
      basketCount: 'Errore',
      operationCount: 'Errore',
      measurementCount: 'Errore'
    };
  }
}

// Esegui il programma
importData();