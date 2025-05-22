-- Script per la creazione di viste materializzate
-- Questo script ottimizza le prestazioni delle query frequenti

-- =========================================================
-- VISTE MATERIALIZZATE PER QUERY FREQUENTI
-- =========================================================

-- Vista materializzata per le statistiche dei cestelli attivi
-- Questa vista combina i dati di cestelli, cicli e operazioni più recenti
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_baskets AS
SELECT 
    b.id AS basket_id,
    b.physical_number,
    b.flupsy_id,
    f.name AS flupsy_name,
    b.row,
    b.position,
    b.current_cycle_id,
    c.start_date AS cycle_start_date,
    c.state AS cycle_state,
    (
        SELECT o.id 
        FROM operations o 
        WHERE o.basket_id = b.id 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS last_operation_id,
    (
        SELECT o.type 
        FROM operations o 
        WHERE o.basket_id = b.id 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS last_operation_type,
    (
        SELECT o.date 
        FROM operations o 
        WHERE o.basket_id = b.id 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS last_operation_date,
    (
        SELECT o.animal_count 
        FROM operations o 
        WHERE o.basket_id = b.id 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS animal_count,
    (
        SELECT o.average_weight 
        FROM operations o 
        WHERE o.basket_id = b.id AND o.type = 'peso'
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS last_weight_average,
    (
        SELECT o.size_id 
        FROM operations o 
        WHERE o.basket_id = b.id AND o.size_id IS NOT NULL
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS size_id,
    (
        SELECT s.code 
        FROM operations o 
        JOIN sizes s ON o.size_id = s.id
        WHERE o.basket_id = b.id AND o.size_id IS NOT NULL
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS size_code
FROM 
    baskets b
JOIN 
    flupsys f ON b.flupsy_id = f.id
LEFT JOIN 
    cycles c ON b.current_cycle_id = c.id
WHERE 
    b.state = 'active'
WITH DATA;

-- Indice sulla vista materializzata per migliorare le prestazioni delle ricerche
CREATE INDEX IF NOT EXISTS idx_mv_active_baskets_basket_id ON mv_active_baskets(basket_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_baskets_flupsy_id ON mv_active_baskets(flupsy_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_baskets_size_id ON mv_active_baskets(size_id);

-- Vista materializzata per le statistiche dei cicli attivi
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_cycles_stats AS
SELECT 
    c.id AS cycle_id,
    c.basket_id,
    b.physical_number AS basket_number,
    b.flupsy_id,
    f.name AS flupsy_name,
    c.start_date,
    CURRENT_DATE - c.start_date AS days_active,
    (
        SELECT COUNT(*) 
        FROM operations o 
        WHERE o.cycle_id = c.id
    ) AS operation_count,
    (
        SELECT o.animal_count 
        FROM operations o 
        WHERE o.cycle_id = c.id 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS current_animal_count,
    (
        SELECT MAX(o.average_weight) 
        FROM operations o 
        WHERE o.cycle_id = c.id AND o.type = 'peso'
    ) AS max_average_weight,
    (
        SELECT o.date 
        FROM operations o 
        WHERE o.cycle_id = c.id AND o.type = 'peso'
        ORDER BY o.date DESC 
        LIMIT 1
    ) AS last_weight_date,
    (
        SELECT o.average_weight 
        FROM operations o 
        WHERE o.cycle_id = c.id AND o.type = 'peso'
        ORDER BY o.date DESC 
        LIMIT 1
    ) AS last_average_weight,
    (
        SELECT s.code 
        FROM operations o 
        JOIN sizes s ON o.size_id = s.id
        WHERE o.cycle_id = c.id AND o.size_id IS NOT NULL
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
    ) AS current_size
FROM 
    cycles c
JOIN 
    baskets b ON c.basket_id = b.id
JOIN 
    flupsys f ON b.flupsy_id = f.id
WHERE 
    c.state = 'active'
WITH DATA;

-- Indice sulla vista materializzata per migliorare le prestazioni delle ricerche
CREATE INDEX IF NOT EXISTS idx_mv_active_cycles_stats_cycle_id ON mv_active_cycles_stats(cycle_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_cycles_stats_basket_id ON mv_active_cycles_stats(basket_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_cycles_stats_flupsy_id ON mv_active_cycles_stats(flupsy_id);

-- Vista materializzata per le posizioni correnti dei cestelli
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_basket_positions AS
SELECT 
    bph.basket_id,
    b.physical_number,
    bph.flupsy_id,
    f.name AS flupsy_name,
    bph.row,
    bph.position,
    bph.start_date AS position_start_date,
    CURRENT_DATE - bph.start_date AS days_in_position
FROM 
    basket_position_history bph
JOIN 
    baskets b ON bph.basket_id = b.id
JOIN 
    flupsys f ON bph.flupsy_id = f.id
WHERE 
    bph.end_date IS NULL
WITH DATA;

-- Indice sulla vista materializzata per migliorare le prestazioni delle ricerche
CREATE INDEX IF NOT EXISTS idx_mv_current_basket_positions_basket_id ON mv_current_basket_positions(basket_id);
CREATE INDEX IF NOT EXISTS idx_mv_current_basket_positions_flupsy_id ON mv_current_basket_positions(flupsy_id);

-- Vista materializzata per le informazioni sui lotti attivi
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_lots_info AS
SELECT 
    l.id AS lot_id,
    l.supplier,
    l.supplier_lot_number,
    l.arrival_date,
    l.animalCount AS initial_animal_count,
    s.id AS size_id,
    s.code AS size_code,
    s.name AS size_name,
    (
        SELECT SUM(o.animal_count) 
        FROM operations o 
        WHERE o.lot_id = l.id AND o.type = 'prima-attivazione'
    ) AS allocated_animals,
    l.animalCount - (
        SELECT COALESCE(SUM(o.animal_count), 0) 
        FROM operations o 
        WHERE o.lot_id = l.id AND o.type = 'prima-attivazione'
    ) AS remaining_animals,
    (
        SELECT COUNT(DISTINCT o.basket_id) 
        FROM operations o 
        WHERE o.lot_id = l.id
    ) AS basket_count
FROM 
    lots l
LEFT JOIN 
    sizes s ON l.size_id = s.id
WHERE 
    l.state = 'active'
WITH DATA;

-- Indice sulla vista materializzata per migliorare le prestazioni delle ricerche
CREATE INDEX IF NOT EXISTS idx_mv_active_lots_info_lot_id ON mv_active_lots_info(lot_id);
CREATE INDEX IF NOT EXISTS idx_mv_active_lots_info_size_id ON mv_active_lots_info(size_id);

-- =========================================================
-- FUNZIONE PER L'AGGIORNAMENTO AUTOMATICO DELLE VISTE
-- =========================================================

-- Funzione per aggiornare tutte le viste materializzate
CREATE OR REPLACE FUNCTION refresh_all_materialized_views() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_active_baskets;
    REFRESH MATERIALIZED VIEW mv_active_cycles_stats;
    REFRESH MATERIALIZED VIEW mv_current_basket_positions;
    REFRESH MATERIALIZED VIEW mv_active_lots_info;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- TRIGGER PER LA GESTIONE DELL'AGGIORNAMENTO AUTOMATICO
-- =========================================================

-- Trigger per aggiornare le viste materializzate quando vengono modificati i cestelli
CREATE OR REPLACE FUNCTION trg_refresh_basket_views() RETURNS trigger AS $$
BEGIN
    -- Pianifichiamo l'aggiornamento delle viste materializzate pertinenti
    REFRESH MATERIALIZED VIEW mv_active_baskets;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare le viste materializzate quando vengono modificate le operazioni
CREATE OR REPLACE FUNCTION trg_refresh_operation_views() RETURNS trigger AS $$
BEGIN
    -- Pianifichiamo l'aggiornamento delle viste materializzate pertinenti
    REFRESH MATERIALIZED VIEW mv_active_baskets;
    REFRESH MATERIALIZED VIEW mv_active_cycles_stats;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Nota: in un ambiente di produzione con molti dati, potrebbe essere meglio
-- aggiornare queste viste con un job schedulato invece che con trigger