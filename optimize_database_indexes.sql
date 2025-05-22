-- Script di ottimizzazione del database tramite indici
-- Questo script aggiunge indici ottimizzati alle tabelle principali del database
-- Eseguire con: psql -U <username> -d <database> -f optimize_database_indexes.sql

-- =========================================================
-- INDICI PER LE TABELLE PRINCIPALI
-- =========================================================

-- Indici per la tabella baskets
CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_id ON baskets(flupsy_id);
CREATE INDEX IF NOT EXISTS idx_baskets_current_cycle_id ON baskets(current_cycle_id);
CREATE INDEX IF NOT EXISTS idx_baskets_state ON baskets(state);
CREATE INDEX IF NOT EXISTS idx_baskets_row_position ON baskets(row, position);

-- Indici per la tabella operations
CREATE INDEX IF NOT EXISTS idx_operations_basket_id ON operations(basket_id);
CREATE INDEX IF NOT EXISTS idx_operations_cycle_id ON operations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_operations_lot_id ON operations(lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_size_id ON operations(size_id) WHERE size_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(date);
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
CREATE INDEX IF NOT EXISTS idx_operations_date_type ON operations(date, type);

-- Indici per la tabella cycles
CREATE INDEX IF NOT EXISTS idx_cycles_basket_id ON cycles(basket_id);
CREATE INDEX IF NOT EXISTS idx_cycles_state ON cycles(state);
CREATE INDEX IF NOT EXISTS idx_cycles_startdate ON cycles(startDate);
CREATE INDEX IF NOT EXISTS idx_cycles_state_startdate ON cycles(state, startDate);

-- Indici per la tabella basket_position_history
CREATE INDEX IF NOT EXISTS idx_basket_position_history_basket_id ON basket_position_history(basketId);
CREATE INDEX IF NOT EXISTS idx_basket_position_history_flupsy_id ON basket_position_history(flupsyId);
CREATE INDEX IF NOT EXISTS idx_basket_position_history_dates ON basket_position_history(startDate, endDate);

-- Indici per la tabella lots
CREATE INDEX IF NOT EXISTS idx_lots_size_id ON lots(sizeId) WHERE sizeId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lots_state ON lots(state);
CREATE INDEX IF NOT EXISTS idx_lots_arrival_date ON lots(arrivalDate);

-- Indici per la tabella target_size_annotations
CREATE INDEX IF NOT EXISTS idx_target_size_annotations_basket_id ON target_size_annotations(basketId);
CREATE INDEX IF NOT EXISTS idx_target_size_annotations_target_size_id ON target_size_annotations(targetSizeId);
CREATE INDEX IF NOT EXISTS idx_target_size_annotations_status ON target_size_annotations(status);
CREATE INDEX IF NOT EXISTS idx_target_size_annotations_predicted_date ON target_size_annotations(predictedDate);

-- Indici per la tabella notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(isRead);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(relatedEntityType, relatedEntityId);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(createdAt);

-- =========================================================
-- INDICI COMPOSITI PER QUERY FREQUENTI
-- =========================================================

-- Query frequenti per operazioni di un certo tipo in un intervallo di date
CREATE INDEX IF NOT EXISTS idx_operations_date_type_basket ON operations(date, type, basketId);

-- Query frequenti per cestelli attivi in un determinato FLUPSY
CREATE INDEX IF NOT EXISTS idx_baskets_active_flupsy ON baskets(flupsyId, state) WHERE state = 'active';

-- Query frequenti per cicli attivi con relativo cestello
CREATE INDEX IF NOT EXISTS idx_cycles_active_basket ON cycles(basketId, state) WHERE state = 'active';

-- Query frequenti per la cronologia delle posizioni dei cestelli ancora attive
CREATE INDEX IF NOT EXISTS idx_basket_position_history_active ON basket_position_history(basketId, flupsyId) WHERE endDate IS NULL;

-- Query frequenti per notifiche non lette
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(isRead, createdAt) WHERE isRead = false;

-- Query frequenti per statistiche di crescita
CREATE INDEX IF NOT EXISTS idx_operations_weight_date ON operations(date, basketId, averageWeight) WHERE type = 'peso';

-- =========================================================
-- ANALISI DEL DATABASE DOPO CREAZIONE INDICI
-- =========================================================

-- Analisi per aggiornare le statistiche dell'ottimizzatore di query
ANALYZE;