-- Aggiungi le colonne mancanti alla tabella lot_inventory_transactions
ALTER TABLE lot_inventory_transactions
ADD COLUMN IF NOT EXISTS basket_id INTEGER, 
ADD COLUMN IF NOT EXISTS selection_id INTEGER,
ADD COLUMN IF NOT EXISTS screening_id INTEGER,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS created_by INTEGER;