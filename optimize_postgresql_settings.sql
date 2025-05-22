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

-- =========================================================
-- APPLICAZIONE DELLE MODIFICHE
-- =========================================================

-- Per applicare le modifiche, è necessario ricaricare la configurazione:
-- SELECT pg_reload_conf();

-- Alcune impostazioni (come shared_buffers) richiedono il riavvio del database:
-- Questo dovrebbe essere eseguito durante una finestra di manutenzione programmata

-- NOTA: Queste impostazioni sono indicative e dovrebbero essere adattate
-- alle specifiche risorse hardware del server di produzione