-- Indici per la tabella baskets
CREATE INDEX IF NOT EXISTS idx_baskets_flupsyid ON baskets (flupsy_id);
CREATE INDEX IF NOT EXISTS idx_baskets_state ON baskets (state);
CREATE INDEX IF NOT EXISTS idx_baskets_current_cycle_id ON baskets (current_cycle_id);

-- Indici per la tabella operations
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations (date);
CREATE INDEX IF NOT EXISTS idx_operations_basket_id ON operations (basket_id);
CREATE INDEX IF NOT EXISTS idx_operations_cycle_id ON operations (cycle_id);
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations (type);
CREATE INDEX IF NOT EXISTS idx_operations_size_id ON operations (size_id);

-- Indici per la tabella cycles
CREATE INDEX IF NOT EXISTS idx_cycles_basket_id ON cycles (basket_id);
CREATE INDEX IF NOT EXISTS idx_cycles_end_date ON cycles (end_date);
CREATE INDEX IF NOT EXISTS idx_cycles_state ON cycles (state);
CREATE INDEX IF NOT EXISTS idx_cycles_start_date ON cycles (start_date);

-- Indici per la tabella lots
CREATE INDEX IF NOT EXISTS idx_lots_arrival_date ON lots (arrival_date);
CREATE INDEX IF NOT EXISTS idx_lots_state ON lots (state);
CREATE INDEX IF NOT EXISTS idx_lots_supplier ON lots (supplier);
CREATE INDEX IF NOT EXISTS idx_lots_quality ON lots (quality);
CREATE INDEX IF NOT EXISTS idx_lots_size_id ON lots (size_id);

-- Indici per la tabella basket_positions
CREATE INDEX IF NOT EXISTS idx_basket_positions_flupsy_id ON basket_positions (flupsy_id);
CREATE INDEX IF NOT EXISTS idx_basket_positions_basket_id ON basket_positions (basket_id);
CREATE INDEX IF NOT EXISTS idx_basket_positions_operation_id ON basket_positions (operation_id);
CREATE INDEX IF NOT EXISTS idx_basket_positions_start_date ON basket_positions (start_date);
CREATE INDEX IF NOT EXISTS idx_basket_positions_end_date ON basket_positions (end_date);

-- Indici per la tabella selection_source_baskets
CREATE INDEX IF NOT EXISTS idx_selection_source_baskets_basket_id ON selection_source_baskets (basket_id);
CREATE INDEX IF NOT EXISTS idx_selection_source_baskets_cycle_id ON selection_source_baskets (cycle_id);
CREATE INDEX IF NOT EXISTS idx_selection_source_baskets_selection_id ON selection_source_baskets (selection_id);

-- Indici per la tabella selection_destination_baskets
CREATE INDEX IF NOT EXISTS idx_sel_dest_baskets_basket_id ON selection_destination_baskets (basket_id);
CREATE INDEX IF NOT EXISTS idx_sel_dest_baskets_cycle_id ON selection_destination_baskets (cycle_id);
CREATE INDEX IF NOT EXISTS idx_sel_dest_baskets_selection_id ON selection_destination_baskets (selection_id);

-- Indici composti per query frequenti
CREATE INDEX IF NOT EXISTS idx_operations_basket_id_date ON operations (basket_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cycles_basket_id_end_date ON cycles (basket_id, end_date);
CREATE INDEX IF NOT EXISTS idx_basket_pos_flupsy_id_basket_id ON basket_positions (flupsy_id, basket_id);

-- Indice per le query che filtrano per data e tipo di operazione
CREATE INDEX IF NOT EXISTS idx_operations_date_type ON operations (date, type);

-- Indice per i cicli attivi (end_date IS NULL)
-- Questo è particolarmente utile poiché molte query cercano cicli senza end_date
CREATE INDEX IF NOT EXISTS idx_cycles_active ON cycles (basket_id) WHERE end_date IS NULL;