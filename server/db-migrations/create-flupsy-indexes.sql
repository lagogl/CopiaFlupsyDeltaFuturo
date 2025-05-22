-- Indici strategici per ottimizzare le query relative alle posizioni dei FLUPSY
-- Questi indici velocizzeranno significativamente l'endpoint /api/flupsy/available-positions

-- Indice per migliorare le query che filtrano per flupsyId sulla tabella baskets
CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_id ON baskets(flupsy_id);

-- Indice per migliorare le query che filtrano baskets per stato
CREATE INDEX IF NOT EXISTS idx_baskets_state ON baskets(state);

-- Indice composto per ottimizzare le query che cercano posizioni occupate in un FLUPSY
CREATE INDEX IF NOT EXISTS idx_baskets_flupsy_position ON baskets(flupsy_id, row, position);

-- Indice per migliorare le query che filtrano i FLUPSY attivi
CREATE INDEX IF NOT EXISTS idx_flupsys_active ON flupsys(active);

-- Indice per cestelli con posizione non nulla (miglioramento query posizioni)
CREATE INDEX IF NOT EXISTS idx_baskets_position_not_null ON baskets(flupsy_id, row, position) 
WHERE position IS NOT NULL;