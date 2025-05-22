/**
 * Script per applicare gli indici strategici al database
 * Questo script legge il file SQL con gli indici e li applica al database
 */

import { db } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyFlipsyIndexes() {
  try {
    console.log('Inizio applicazione indici strategici per migliorare le prestazioni...');
    
    // Legge il file SQL con gli indici
    const sqlFilePath = path.join(__dirname, 'create-flupsy-indexes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Divide il contenuto in singole istruzioni SQL (per ogni CREATE INDEX)
    const sqlStatements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Esegue ogni istruzione SQL
    for (const statement of sqlStatements) {
      console.log(`Esecuzione: ${statement}`);
      await db.execute(sql`${statement}`);
    }
    
    console.log('Indici strategici applicati con successo!');
    return true;
  } catch (error) {
    console.error('Errore durante l\'applicazione degli indici:', error);
    return false;
  }
}

// Esporta la funzione per essere utilizzata da altri moduli
export { applyFlipsyIndexes };

// Se il file viene eseguito direttamente, applica gli indici
if (import.meta.url === import.meta.main) {
  applyFlipsyIndexes().then(success => {
    if (success) {
      console.log('Indici applicati con successo!');
    } else {
      console.error('Errore durante l\'applicazione degli indici.');
    }
    process.exit(success ? 0 : 1);
  });
}