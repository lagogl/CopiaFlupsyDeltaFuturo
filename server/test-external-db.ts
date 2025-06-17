/**
 * Script per testare la connessione al database esterno e esplorare la struttura
 */

import { Pool } from 'pg';
import { externalDbConfig } from './external-db-config';

async function testExternalDatabase() {
  console.log('🔍 Test connessione database esterno...');
  
  const pool = new Pool({
    host: externalDbConfig.host,
    port: externalDbConfig.port,
    database: externalDbConfig.database,
    user: externalDbConfig.username,
    password: externalDbConfig.password,
    ssl: externalDbConfig.ssl
  });

  try {
    // Test connessione
    const client = await pool.connect();
    console.log('✅ Connessione riuscita!');

    // Elenca tutte le tabelle
    console.log('\n📋 Tabelle disponibili:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(tablesResult.rows.map(row => `  - ${row.table_name}`).join('\n'));

    // Per ogni tabella, mostra la struttura
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      console.log(`\n🔍 Struttura tabella "${tableName}":`);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      columnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });

      // Mostra alcuni dati di esempio (max 3 righe)
      try {
        const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 3`);
        if (sampleResult.rows.length > 0) {
          console.log(`  Esempio dati (${sampleResult.rows.length} righe):`);
          console.log('  ', JSON.stringify(sampleResult.rows[0], null, 2));
        } else {
          console.log('  (Tabella vuota)');
        }
      } catch (error) {
        console.log(`  (Errore accesso dati: ${error.message})`);
      }
    }

    client.release();
  } catch (error) {
    console.error('❌ Errore connessione:', error.message);
    return false;
  } finally {
    await pool.end();
  }

  return true;
}

// Esegui test se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testExternalDatabase()
    .then(success => {
      console.log(success ? '\n✅ Test completato con successo' : '\n❌ Test fallito');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Errore durante il test:', error);
      process.exit(1);
    });
}

export { testExternalDatabase };