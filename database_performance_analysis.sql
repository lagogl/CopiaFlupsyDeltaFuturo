-- ===========================================================
-- ANALISI PRESTAZIONI DATABASE PostgreSQL
-- ===========================================================
-- Questo script aiuta a identificare le query lente e le tabelle che 
-- potrebbero beneficiare di ulteriori ottimizzazioni

-- Verifica delle dimensioni delle tabelle e indici
SELECT
    pg_size_pretty(pg_relation_size(idx.indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(idx.indrelid)) AS table_size,
    idx.indrelid::regclass AS table_name,
    idx.indexrelid::regclass AS index_name,
    idx.indisunique AS is_unique
FROM pg_index idx
JOIN pg_class cls ON cls.oid = idx.indrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE n.nspname = 'public'
ORDER BY 
    pg_relation_size(idx.indrelid) DESC, 
    pg_relation_size(idx.indexrelid) DESC;

-- Ricerca delle tabelle che necessitano di VACUUM
SELECT
    schemaname, 
    relname, 
    n_dead_tup, 
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tup_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- Statistiche delle viste materializzate
SELECT
    schemaname,
    relname AS materialized_view_name,
    pg_size_pretty(pg_relation_size(relid)) AS size,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    last_vacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname LIKE 'mv_%'
ORDER BY pg_relation_size(relid) DESC;

-- Query lente registrate (richiede log_min_duration_statement impostato)
SELECT
    substring(query, 1, 150) AS short_query,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    round(rows::numeric, 0) AS rows_returned,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_of_total
FROM pg_stat_statements
WHERE calls > 5  -- Solo query eseguite più di 5 volte
AND dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
AND query !~ '^[[:space:]]*(SET|COMMIT|ROLLBACK|BEGIN)'  -- Escludi comandi di transazione
ORDER BY total_exec_time DESC
LIMIT 25;

-- Indici non utilizzati o poco utilizzati
SELECT
    s.schemaname,
    s.relname AS table_name,
    i.indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    idx_scan AS scans,
    CASE 
        WHEN idx_scan = 0 THEN 'Inutilizzato'
        WHEN idx_scan < 10 THEN 'Poco utilizzato'
        ELSE 'Utilizzato'
    END AS usage_status
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables s ON i.relid = s.relid
WHERE s.schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(i.indexrelid) DESC;

-- Tabelle con mancanza di indici (frequenti sequential scan)
SELECT
    schemaname,
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND seq_scan > 100  -- Tabelle con molti sequential scan
AND seq_scan > idx_scan  -- Sequential scan più frequenti degli index scan
ORDER BY seq_tup_read DESC;

-- Analisi dei blocchi e contese
SELECT
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.usename AS blocked_user,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query,
    substring(blocking_activity.query, 1, 150) AS blocking_query,
    blocked_activity.state AS blocked_state,
    blocking_activity.state AS blocking_state,
    now() - blocked_activity.query_start AS blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Connessioni attive
SELECT 
    pid, 
    usename, 
    application_name,
    client_addr, 
    backend_start,
    xact_start,
    query_start,
    state, 
    wait_event_type, 
    wait_event,
    substring(query, 1, 150) AS current_query
FROM pg_stat_activity
WHERE state != 'idle'
AND backend_type = 'client backend'
ORDER BY query_start;