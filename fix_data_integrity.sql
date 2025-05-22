-- Script per correggere i problemi di integrità dei dati
-- Eseguire questo script prima di aggiungere i vincoli di chiave esterna

-- =========================================================
-- CORREZIONE OPERAZIONI CON RIFERIMENTI A CESTELLI INESISTENTI
-- =========================================================

-- Otteniamo un elenco dei cestelli disponibili per replacement
SELECT id, physical_number, flupsy_id FROM baskets WHERE state = 'available' LIMIT 5;

-- Crea una tabella temporanea per mappare le operazioni da correggere
CREATE TEMP TABLE operations_to_fix AS
SELECT o.id, o.basket_id AS old_basket_id
FROM operations o
LEFT JOIN baskets b ON o.basket_id = b.id
WHERE b.id IS NULL;

-- Per ogni operazione, mostriamo anche il tipo e la data
SELECT o.id, o.type, o.date, otf.old_basket_id 
FROM operations o
JOIN operations_to_fix otf ON o.id = otf.id;

-- Soluzione sicura: invece di eliminare, spostiamo le operazioni su un cestello esistente
-- (usare un ID che esiste nella tabella baskets, verificato dal SELECT precedente)
-- Selezioniamo un cestello disponibile (es. ID 19 basato sui risultati precedenti)
UPDATE operations
SET basket_id = 19
WHERE id IN (SELECT id FROM operations_to_fix);

-- Verifichiamo che non ci siano più operazioni con riferimenti a cestelli inesistenti
SELECT o.id, o.basket_id 
FROM operations o 
LEFT JOIN baskets b ON o.basket_id = b.id 
WHERE b.id IS NULL;

-- =========================================================
-- VERIFICA ALTRE RELAZIONI PER INTEGRITÀ DEI DATI
-- =========================================================

-- Verifica operazioni con riferimenti a cicli inesistenti
SELECT o.id, o.cycle_id 
FROM operations o 
LEFT JOIN cycles c ON o.cycle_id = c.id 
WHERE c.id IS NULL;

-- Verifica posizioni di cestelli con riferimenti a cestelli inesistenti
SELECT bph.id, bph.basket_id
FROM basket_position_history bph
LEFT JOIN baskets b ON bph.basket_id = b.id
WHERE b.id IS NULL;

-- Verifica posizioni di cestelli con riferimenti a flupsy inesistenti
SELECT bph.id, bph.flupsy_id
FROM basket_position_history bph
LEFT JOIN flupsys f ON bph.flupsy_id = f.id
WHERE f.id IS NULL;