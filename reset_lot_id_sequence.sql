-- Script per resettare la sequenza dell'ID dei lotti a un valore specifico
-- Questo script ripristina il contatore automatico della tabella 'lots' in PostgreSQL

-- Prima otteniamo il nome esatto della sequenza
SELECT pg_get_serial_sequence('lots', 'id') as sequence_name;

-- Resettiamo la sequenza a 1 (o a qualsiasi altro valore desiderato)
-- Sostituire 'lots_id_seq' con il nome esatto della sequenza se diverso
ALTER SEQUENCE lots_id_seq RESTART WITH 1;