/**
 * Script per l'aggiornamento periodico delle viste materializzate
 * 
 * Questo script può essere eseguito a intervalli regolari (ad esempio ogni ora)
 * utilizzando un job scheduler come cron per mantenere aggiornate le viste materializzate
 * e garantire prestazioni ottimali dell'applicazione.
 */

import pg from 'pg';
const { Pool } = pg;

// Configurazione della connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Funzione per aggiornare tutte le viste materializzate
 */
async function refreshAllMaterializedViews() {
  const client = await pool.connect();
  
  try {
    console.log("Inizio aggiornamento viste materializzate...");
    
    // Registra il tempo di inizio
    const startTime = new Date();
    
    // Esegui la funzione di aggiornamento
    await client.query('SELECT refresh_all_materialized_views()');
    
    // Calcola il tempo trascorso
    const endTime = new Date();
    const elapsedTime = (endTime - startTime) / 1000;
    
    console.log(`Aggiornamento completato in ${elapsedTime} secondi.`);

    // Verifica lo stato delle viste
    const viewsStatus = await client.query(`
      SELECT relname AS view_name, 
             pg_size_pretty(pg_total_relation_size(oid)) AS size,
             pg_size_pretty(pg_indexes_size(oid)) AS index_size
      FROM pg_class
      WHERE relname LIKE 'mv_%'
      ORDER BY pg_total_relation_size(oid) DESC;
    `);
    
    console.log("Stato delle viste materializzate:");
    viewsStatus.rows.forEach(row => {
      console.log(`- ${row.view_name}: Dimensione totale = ${row.size}, Dimensione indici = ${row.index_size}`);
    });
    
  } catch (error) {
    console.error("Errore durante l'aggiornamento delle viste materializzate:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Funzione principale
 */
async function main() {
  try {
    await refreshAllMaterializedViews();
    process.exit(0);
  } catch (error) {
    console.error("Errore nell'esecuzione dello script:", error);
    process.exit(1);
  }
}

// Esegui la funzione principale
main();