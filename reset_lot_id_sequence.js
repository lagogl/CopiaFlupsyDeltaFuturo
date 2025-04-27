/**
 * Script per resettare la sequenza ID della tabella lotti
 * 
 * Questo script permette di impostare il contatore automatico dell'ID della tabella
 * lotti a un valore specifico, per poter ripartire da un ID desiderato.
 * 
 * Utilizzo:
 * node reset_lot_id_sequence.js [valore_iniziale]
 * 
 * - valore_iniziale: numero da cui fare ripartire il contatore (default: 1)
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// Configura Neon per WebSocket
neonConfig.webSocketConstructor = ws;

async function resetLotIdSequence(startValue = 1) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL non impostata. Impostare la variabile d\'ambiente prima di eseguire lo script.');
    process.exit(1);
  }

  // Connessione al database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    console.log('🔄 Connessione al database...');
    
    // Ottieni il nome esatto della sequenza
    const sequenceResult = await db.execute(sql`SELECT pg_get_serial_sequence('lots', 'id') as sequence_name`);
    
    if (!sequenceResult || !sequenceResult.length || !sequenceResult[0].sequence_name) {
      console.error('❌ Impossibile determinare il nome della sequenza per la tabella lots.');
      process.exit(1);
    }
    
    const sequenceName = sequenceResult[0].sequence_name;
    console.log(`📊 Sequenza trovata: ${sequenceName}`);
    
    // Resetta la sequenza al valore desiderato
    await db.execute(sql`ALTER SEQUENCE ${sql.raw(sequenceName)} RESTART WITH ${startValue}`);
    
    console.log(`✅ Sequenza ID per la tabella lots resettata. Il prossimo ID sarà: ${startValue}`);
    
    // Verifica
    const currentValue = await db.execute(sql`SELECT currval(${sequenceName}) as current_value`);
    console.log(`🔍 Valore corrente della sequenza: ${currentValue[0].current_value}`);
    
  } catch (error) {
    console.error('❌ Errore durante il reset della sequenza:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Gestione dei parametri dalla linea di comando
const args = process.argv.slice(2);
const startValue = args.length > 0 ? parseInt(args[0], 10) : 1;

if (isNaN(startValue) || startValue < 1) {
  console.error('❌ Il valore iniziale deve essere un numero intero positivo.');
  process.exit(1);
}

// Esegui il reset
resetLotIdSequence(startValue);