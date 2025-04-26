-- Tabella per le transazioni di inventario dei lotti
CREATE TABLE IF NOT EXISTS lot_inventory_transactions (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    animal_count INTEGER NOT NULL,
    notes TEXT,
    operation_id INTEGER REFERENCES operations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabella per i record di calcolo della mortalità
CREATE TABLE IF NOT EXISTS lot_mortality_records (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    calculation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    initial_count INTEGER NOT NULL,
    current_count INTEGER NOT NULL,
    sold_count INTEGER NOT NULL,
    mortality_count INTEGER NOT NULL,
    mortality_percentage DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_lot_inventory_transactions_lot_id ON lot_inventory_transactions(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_inventory_transactions_date ON lot_inventory_transactions(date);
CREATE INDEX IF NOT EXISTS idx_lot_mortality_records_lot_id ON lot_mortality_records(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_mortality_records_date ON lot_mortality_records(calculation_date);