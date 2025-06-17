/**
 * Test per verificare che la modifica della precisione del campo quantity
 * risolva il problema dell'overflow numerico
 */
const { Pool } = require('pg');

// Configurazione database esterno
const externalDbConfig = {
  host: process.env.EXTERNAL_DB_HOST || 'ep-snowy-firefly-a4pq2urr.us-east-1.aws.neon.tech',
  port: parseInt(process.env.EXTERNAL_DB_PORT) || 5432,
  database: process.env.EXTERNAL_DB_NAME || 'neondb',
  user: process.env.EXTERNAL_DB_USER || 'neondb_owner',
  password: process.env.EXTERNAL_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

// Configurazione database locale
const localDbConfig = {
  connectionString: process.env.DATABASE_URL
};

async function testQuantitySync() {
  const externalPool = new Pool(externalDbConfig);
  const localPool = new Pool(localDbConfig);

  try {
    console.log('🧪 Test sincronizzazione quantità con valori elevati...');

    // 1. Verifica valori problematici nel database esterno
    const externalResult = await externalPool.query(`
      SELECT id, quantita, taglia_richiesta, cliente_id
      FROM ordini 
      WHERE quantita >= 1000000
      ORDER BY quantita DESC
      LIMIT 5
    `);

    console.log('\n📊 Valori di quantità elevati nel database esterno:');
    externalResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Quantità: ${row.quantita.toLocaleString()}, Taglia: ${row.taglia_richiesta}`);
    });

    // 2. Test inserimento nel database locale
    console.log('\n🔄 Test inserimento nel database locale...');
    
    for (const row of externalResult.rows) {
      try {
        await localPool.query(`
          INSERT INTO external_sales_sync (
            external_id, sale_number, sale_date, customer_id, 
            product_name, quantity, total_amount, net_amount, last_sync_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (external_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            last_sync_at = EXCLUDED.last_sync_at
        `, [
          row.id,
          `ORD-${row.id}`,
          new Date(),
          row.cliente_id,
          `Prodotto ${row.taglia_richiesta}`,
          row.quantita, // Questo è il valore che prima causava l'overflow
          row.quantita * 2.5, // Prezzo di esempio
          row.quantita * 2.5,
          new Date()
        ]);
        
        console.log(`  ✅ Inserito ordine ${row.id} con quantità ${row.quantita.toLocaleString()}`);
      } catch (error) {
        console.log(`  ❌ Errore inserimento ordine ${row.id}:`, error.message);
      }
    }

    // 3. Verifica dati inseriti
    const localResult = await localPool.query(`
      SELECT external_id, quantity, product_name 
      FROM external_sales_sync 
      WHERE quantity >= 1000000
      ORDER BY quantity DESC
    `);

    console.log('\n📋 Valori sincronizzati nel database locale:');
    localResult.rows.forEach(row => {
      console.log(`  ID Esterno: ${row.external_id}, Quantità: ${row.quantity}, Prodotto: ${row.product_name}`);
    });

    console.log(`\n✅ Test completato: ${localResult.rows.length} record con quantità elevate sincronizzati correttamente`);

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await externalPool.end();
    await localPool.end();
  }
}

testQuantitySync();