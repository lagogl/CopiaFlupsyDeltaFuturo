-- Script per aggiungere vincoli di chiave esterna al database
-- Questo script migliora l'integrità dei dati e ottimizza le prestazioni dei JOIN

-- =========================================================
-- AGGIUNTA VINCOLI DI CHIAVE ESTERNA
-- =========================================================

-- Vincoli per la tabella baskets
ALTER TABLE baskets 
    ADD CONSTRAINT IF NOT EXISTS fk_baskets_flupsy_id 
    FOREIGN KEY (flupsy_id) 
    REFERENCES flupsys(id) 
    ON DELETE RESTRICT;

-- Nota: Relazione circolare tra baskets e cycles richiede cautela
-- Questo vincolo può essere implementato solo dopo aver verificato la consistenza dei dati
ALTER TABLE baskets 
    ADD CONSTRAINT IF NOT EXISTS fk_baskets_current_cycle_id 
    FOREIGN KEY (current_cycle_id) 
    REFERENCES cycles(id) 
    ON DELETE SET NULL;

-- Vincoli per la tabella operations
ALTER TABLE operations 
    ADD CONSTRAINT IF NOT EXISTS fk_operations_basket_id 
    FOREIGN KEY (basket_id) 
    REFERENCES baskets(id) 
    ON DELETE CASCADE;

ALTER TABLE operations 
    ADD CONSTRAINT IF NOT EXISTS fk_operations_cycle_id 
    FOREIGN KEY (cycle_id) 
    REFERENCES cycles(id) 
    ON DELETE CASCADE;

ALTER TABLE operations 
    ADD CONSTRAINT IF NOT EXISTS fk_operations_lot_id 
    FOREIGN KEY (lot_id) 
    REFERENCES lots(id) 
    ON DELETE SET NULL;

ALTER TABLE operations 
    ADD CONSTRAINT IF NOT EXISTS fk_operations_size_id 
    FOREIGN KEY (size_id) 
    REFERENCES sizes(id) 
    ON DELETE SET NULL;

ALTER TABLE operations 
    ADD CONSTRAINT IF NOT EXISTS fk_operations_sgr_id 
    FOREIGN KEY (sgr_id) 
    REFERENCES sgr(id) 
    ON DELETE SET NULL;

-- Vincoli per la tabella cycles
ALTER TABLE cycles 
    ADD CONSTRAINT IF NOT EXISTS fk_cycles_basket_id 
    FOREIGN KEY (basket_id) 
    REFERENCES baskets(id) 
    ON DELETE CASCADE;

-- Vincoli per la tabella basket_position_history
ALTER TABLE basket_position_history 
    ADD CONSTRAINT IF NOT EXISTS fk_basket_position_history_basket_id 
    FOREIGN KEY (basket_id) 
    REFERENCES baskets(id) 
    ON DELETE CASCADE;

ALTER TABLE basket_position_history 
    ADD CONSTRAINT IF NOT EXISTS fk_basket_position_history_flupsy_id 
    FOREIGN KEY (flupsy_id) 
    REFERENCES flupsys(id) 
    ON DELETE CASCADE;

ALTER TABLE basket_position_history 
    ADD CONSTRAINT IF NOT EXISTS fk_basket_position_history_operation_id 
    FOREIGN KEY (operation_id) 
    REFERENCES operations(id) 
    ON DELETE SET NULL;

-- Vincoli per la tabella target_size_annotations
ALTER TABLE target_size_annotations 
    ADD CONSTRAINT IF NOT EXISTS fk_target_size_annotations_basket_id 
    FOREIGN KEY (basket_id) 
    REFERENCES baskets(id) 
    ON DELETE CASCADE;

ALTER TABLE target_size_annotations 
    ADD CONSTRAINT IF NOT EXISTS fk_target_size_annotations_target_size_id 
    FOREIGN KEY (target_size_id) 
    REFERENCES sizes(id) 
    ON DELETE CASCADE;

-- Vincoli per la tabella mortality_rates
ALTER TABLE mortality_rates 
    ADD CONSTRAINT IF NOT EXISTS fk_mortality_rates_size_id 
    FOREIGN KEY (size_id) 
    REFERENCES sizes(id) 
    ON DELETE CASCADE;

-- Vincoli per altre tabelle (screening, impacts, ecc.)
-- Aggiungere qui eventuali altri vincoli rilevanti

-- =========================================================
-- VERIFICA INTEGRITÀ DEI DATI PRIMA DI ATTIVARE I VINCOLI
-- =========================================================

-- Verifica baskets.current_cycle_id
DO $$
BEGIN
    IF EXISTS (
        SELECT b.id, b.current_cycle_id 
        FROM baskets b 
        LEFT JOIN cycles c ON b.current_cycle_id = c.id 
        WHERE b.current_cycle_id IS NOT NULL AND c.id IS NULL
    ) THEN
        RAISE NOTICE 'Esistono riferimenti non validi in baskets.current_cycle_id, correggerli prima di attivare il vincolo';
    END IF;
END $$;

-- Verifica operations.basket_id
DO $$
BEGIN
    IF EXISTS (
        SELECT o.id, o.basket_id 
        FROM operations o 
        LEFT JOIN baskets b ON o.basket_id = b.id 
        WHERE b.id IS NULL
    ) THEN
        RAISE NOTICE 'Esistono riferimenti non validi in operations.basket_id, correggerli prima di attivare il vincolo';
    END IF;
END $$;

-- Verifica operations.cycle_id
DO $$
BEGIN
    IF EXISTS (
        SELECT o.id, o.cycle_id 
        FROM operations o 
        LEFT JOIN cycles c ON o.cycle_id = c.id 
        WHERE c.id IS NULL
    ) THEN
        RAISE NOTICE 'Esistono riferimenti non validi in operations.cycle_id, correggerli prima di attivare il vincolo';
    END IF;
END $$;