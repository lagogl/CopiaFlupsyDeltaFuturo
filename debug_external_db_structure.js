/**
 * Script per verificare la struttura del database esterno
 */

import { Pool } from 'pg';

const externalDbConfig = {
  host: process.env.EXTERNAL_DB_HOST,
  port: parseInt(process.env.EXTERNAL_DB_PORT || '5432'),
  database: process.env.EXTERNAL_DB_NAME,
  user: process.env.EXTERNAL_DB_USER,
  password: process.env.EXTERNAL_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

async function checkDatabaseStructure() {
  const pool = new Pool(externalDbConfig);
  
  try {
    console.log('🔍 Connessione al database esterno...');
    const client = await pool.connect();
    
    // Verifica le tabelle disponibili
    console.log('\n📋 Tabelle disponibili:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    for (const row of tablesResult.rows) {
      console.log(`  - ${row.table_name}`);
    }
    
    // Verifica la struttura della tabella ordini
    console.log('\n🔍 Struttura tabella ordini:');
    try {
      const ordiniStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'ordini' 
        ORDER BY ordinal_position
      `);
      
      if (ordiniStructure.rows.length > 0) {
        for (const col of ordiniStructure.rows) {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        }
        
        // Conta i record
        const countResult = await client.query('SELECT COUNT(*) as count FROM ordini');
        console.log(`  📊 Record totali: ${countResult.rows[0].count}`);
      } else {
        console.log('  ❌ Tabella ordini non trovata');
      }
    } catch (error) {
      console.log(`  ❌ Errore accesso tabella ordini: ${error.message}`);
    }
    
    // Verifica la struttura della tabella reports_consegna
    console.log('\n🔍 Struttura tabella reports_consegna:');
    try {
      const reportsStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports_consegna' 
        ORDER BY ordinal_position
      `);
      
      if (reportsStructure.rows.length > 0) {
        for (const col of reportsStructure.rows) {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        }
        
        // Conta i record
        const countResult = await client.query('SELECT COUNT(*) as count FROM reports_consegna');
        console.log(`  📊 Record totali: ${countResult.rows[0].count}`);
      } else {
        console.log('  ❌ Tabella reports_consegna non trovata');
      }
    } catch (error) {
      console.log(`  ❌ Errore accesso tabella reports_consegna: ${error.message}`);
    }
    
    // Verifica la struttura della tabella reports_consegna_dettagli
    console.log('\n🔍 Struttura tabella reports_consegna_dettagli:');
    try {
      const detailsStructure = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports_consegna_dettagli' 
        ORDER BY ordinal_position
      `);
      
      if (detailsStructure.rows.length > 0) {
        for (const col of detailsStructure.rows) {
          console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        }
        
        // Conta i record
        const countResult = await client.query('SELECT COUNT(*) as count FROM reports_consegna_dettagli');
        console.log(`  📊 Record totali: ${countResult.rows[0].count}`);
      } else {
        console.log('  ❌ Tabella reports_consegna_dettagli non trovata');
      }
    } catch (error) {
      console.log(`  ❌ Errore accesso tabella reports_consegna_dettagli: ${error.message}`);
    }
    
    // Esempio di dati dalla tabella clienti
    console.log('\n🔍 Esempio di dati clienti:');
    const clientiSample = await client.query('SELECT * FROM clienti LIMIT 3');
    console.log(JSON.stringify(clientiSample.rows, null, 2));
    
    client.release();
    console.log('\n✅ Verifica completata');
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseStructure();