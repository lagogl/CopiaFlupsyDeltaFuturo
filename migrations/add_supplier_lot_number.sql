-- Aggiungi la colonna supplier_lot_number alla tabella lots
ALTER TABLE lots ADD COLUMN IF NOT EXISTS supplier_lot_number TEXT;