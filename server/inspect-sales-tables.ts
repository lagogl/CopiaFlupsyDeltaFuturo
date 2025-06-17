/**
 * Script per esaminare le tabelle di vendita e clienti specifiche
 */

import { Pool } from 'pg';
import { externalDbConfig } from './external-db-config';

async function inspectSalesTables() {
  console.log('🔍 Esame dettagliato tabelle vendite e clienti...');
  
  const pool = new Pool({
    host: externalDbConfig.host,
    port: externalDbConfig.port,
    database: externalDbConfig.database,
    user: externalDbConfig.username,
    password: externalDbConfig.password,
    ssl: externalDbConfig.ssl
  });

  try {
    const client = await pool.connect();

    // Tabelle da esaminare
    const tables = ['clienti', 'ordini', 'vendite_esterne', 'vendite_esterne_dettagli'];

    for (const tableName of tables) {
      console.log(`\n📋 Tabella "${tableName}":`);
      
      // Struttura colonne
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log('  Colonne:');
      columnsResult.rows.forEach(col => {
        console.log(`    ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });

      // Conteggio records
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`  Record totali: ${countResult.rows[0].count}`);
      } catch (error) {
        console.log(`  Errore conteggio: ${error.message}`);
      }

      // Esempi di dati (max 2 righe)
      try {
        const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 2`);
        if (sampleResult.rows.length > 0) {
          console.log(`  Esempi dati:`);
          sampleResult.rows.forEach((row, index) => {
            console.log(`    Record ${index + 1}:`, JSON.stringify(row, null, 6));
          });
        } else {
          console.log('  (Tabella vuota)');
        }
      } catch (error) {
        console.log(`  Errore accesso dati: ${error.message}`);
      }
    }

    client.release();
  } catch (error) {
    console.error('❌ Errore:', error.message);
    return false;
  } finally {
    await pool.end();
  }

  return true;
}

// Esegui ispezione
inspectSalesTables()
  .then(success => {
    console.log(success ? '\n✅ Ispezione completata' : '\n❌ Ispezione fallita');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Errore durante ispezione:', error);
    process.exit(1);
  });