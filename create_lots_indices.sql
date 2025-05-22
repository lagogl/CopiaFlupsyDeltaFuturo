-- Script per creare indici ottimizzati sulla tabella lots
-- Questo migliorerà drasticamente le performance delle query

-- Indice per supplier (utilizzato nei filtri)
CREATE INDEX IF NOT EXISTS idx_lots_supplier ON lots(supplier);

-- Indice per quality (utilizzato nei filtri e nelle aggregazioni)
CREATE INDEX IF NOT EXISTS idx_lots_quality ON lots(quality);

-- Indice per arrival_date (utilizzato negli ordinamenti e nei filtri)
CREATE INDEX IF NOT EXISTS idx_lots_arrival_date ON lots(arrival_date);

-- Indice per size_id (utilizzato nei join)
CREATE INDEX IF NOT EXISTS idx_lots_size_id ON lots(size_id);

-- Indice per animal_count (utilizzato nelle aggregazioni)
CREATE INDEX IF NOT EXISTS idx_lots_animal_count ON lots(animal_count);

-- Indice composto per le query più frequenti (filtro per quality e ordinamento per data)
CREATE INDEX IF NOT EXISTS idx_lots_quality_date ON lots(quality, arrival_date);

-- Analizza la tabella per aggiornare le statistiche dell'ottimizzatore
ANALYZE lots;