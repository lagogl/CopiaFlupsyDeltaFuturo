-- Ottimizzazione delle impostazioni di PostgreSQL
-- Questo script ottimizza le impostazioni di PostgreSQL per migliorare le prestazioni dell'applicazione

-- =========================================================
-- IMPOSTAZIONI DI MEMORIA
-- =========================================================

-- Aumenta la dimensione della memoria condivisa per il buffer di lettura/scrittura
-- Generalmente impostato al 25% della memoria disponibile sul server
-- Esempio per un server con 16GB di RAM: 4GB (4096MB)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Aumenta la dimensione della cache totale utilizzata dall'ottimizzatore di query
-- Generalmente impostato al 75% della memoria disponibile sul server
-- Esempio per un server con 16GB di RAM: 12GB
ALTER SYSTEM SET effective_cache_size = '12GB';

-- Aumenta la memoria per operazioni di ordinamento e hash
-- Ideale per query complesse che richiedono sorting, aggregazione o join
ALTER SYSTEM SET work_mem = '64MB';

-- Aumenta la memoria dedicata alle operazioni di manutenzione (come VACUUM)
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- =========================================================
-- IMPOSTAZIONI DI OTTIMIZZAZIONE DELLE QUERY
-- =========================================================

-- Abilita l'ottimizzazione basata su statistiche
ALTER SYSTEM SET random_page_cost = 1.1;

-- Migliora il comportamento del planner per server con SSD
ALTER SYSTEM SET seq_page_cost = 1.0;

-- Aumenta il numero di statistiche raccolte per tabella
ALTER SYSTEM SET default_statistics_target = 500;

-- =========================================================
-- IMPOSTAZIONI RIGUARDANTI CHECKPOINT E WAL
-- =========================================================

-- Riduce la frequenza dei checkpoint per migliorare le prestazioni
ALTER SYSTEM SET checkpoint_timeout = '15min';

-- Distribuisce la scrittura dei checkpoint su un periodo di tempo più lungo
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Imposta un limite per i file WAL che devono essere mantenuti
ALTER SYSTEM SET wal_keep_segments = 64;

-- =========================================================
-- IMPOSTAZIONI PARALLELE
-- =========================================================

-- Abilita l'esecuzione parallela delle query
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Imposta il numero massimo di workers paralleli
ALTER SYSTEM SET max_parallel_workers = 8;

-- Imposta il numero massimo di processi di background
ALTER SYSTEM SET max_worker_processes = 16;

-- =========================================================
-- IMPOSTAZIONI DI CONNESSIONE
-- =========================================================

-- Aumenta il numero di connessioni simultanee consentite
ALTER SYSTEM SET max_connections = 200;

-- =========================================================
-- IMPOSTAZIONI DI LOGGING
-- =========================================================

-- Registra solo le query lente per il debug delle prestazioni
ALTER SYSTEM SET log_min_duration_statement = '3000';  -- In millisecondi (3 secondi)

-- =========================================================
-- IMPOSTAZIONI VACUUM
-- =========================================================

-- Imposta la scala di autovacuum per tabelle grandi
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.025;

-- Aumenta la frequenza delle operazioni di autovacuum
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- Riduce il numero di tuple morte prima che venga attivato l'autovacuum
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;

-- =========================================================
-- OTTIMIZZAZIONI SPECIFICHE PER IL CASO D'USO FLUPSY
-- =========================================================

-- Ottimizzazione per le tabelle di join
-- Queste impostazioni migliorano le prestazioni per le query che coinvolgono
-- operazioni di join su tabelle come baskets, operations, cycles, ecc.
ALTER SYSTEM SET enable_nestloop = on;
ALTER SYSTEM SET enable_hashjoin = on;
ALTER SYSTEM SET enable_mergejoin = on;
ALTER SYSTEM SET hash_mem_multiplier = 2.0;

-- Ottimizzazione per query materializzate
-- Aumenta il tempo di timeout per query complesse
ALTER SYSTEM SET statement_timeout = '300s';

-- Ottimizzazione per le ricerche e gli ordinamenti
ALTER SYSTEM SET cpu_tuple_cost = 0.01;
ALTER SYSTEM SET cpu_index_tuple_cost = 0.005;

-- =========================================================
-- PIANIFICAZIONE DELLE OPERAZIONI DI MANUTENZIONE
-- =========================================================

-- Creazione di un job pianificato per l'aggiornamento delle viste materializzate
-- Il seguente codice deve essere eseguito una sola volta per creare il job pianificato

/*
-- Installa l'estensione pg_cron (richiede privilegi di superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crea un job che aggiorna le viste materializzate ogni ora
SELECT cron.schedule('0 * * * *', 'SELECT refresh_all_materialized_views()');

-- Crea un job che esegue VACUUM ANALYZE sulle tabelle principali ogni notte
SELECT cron.schedule('0 3 * * *', $$
  VACUUM ANALYZE baskets;
  VACUUM ANALYZE operations;
  VACUUM ANALYZE cycles;
  VACUUM ANALYZE flupsys;
  VACUUM ANALYZE lots;
  VACUUM ANALYZE sizes;
  VACUUM ANALYZE basket_position_history;
$$);
*/

-- =========================================================
-- APPLICAZIONE DELLE MODIFICHE
-- =========================================================

-- Per applicare le modifiche, è necessario ricaricare la configurazione:
-- SELECT pg_reload_conf();

-- Alcune impostazioni (come shared_buffers) richiedono il riavvio del database:
-- Questo dovrebbe essere eseguito durante una finestra di manutenzione programmata

-- NOTA: Queste impostazioni sono indicative e dovrebbero essere adattate
-- alle specifiche risorse hardware del server di produzione