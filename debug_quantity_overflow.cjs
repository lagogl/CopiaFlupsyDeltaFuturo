const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkQuantityValues() {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.quantita,
        ABS(o.quantita) as abs_value
      FROM ordini o 
      ORDER BY ABS(o.quantita) DESC 
      LIMIT 10
    `);
    
    console.log('Valori quantità più alti:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Quantità: ${row.quantita}, Valore assoluto: ${row.abs_value}`);
      console.log(`Overflow check: ${row.abs_value >= 10000000 ? 'SI - OVERFLOW' : 'NO'}`);
    });
    
    // Check count of problematic values
    const overflowCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM ordini o 
      WHERE ABS(o.quantita) >= 10000000
    `);
    
    console.log(`\nRecords con overflow: ${overflowCheck.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Errore:', error.message);
    await pool.end();
  }
}

checkQuantityValues();