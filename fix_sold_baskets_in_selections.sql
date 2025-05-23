-- Script SQL per risolvere il problema della vendita cestelli nelle vagliature
-- Questo script dovrebbe essere eseguito con il server fermo

-- 1. Trova tutte le vagliature in stato draft
WITH draft_selections AS (
  SELECT * FROM selections 
  WHERE status = 'draft'
),

-- 2. Trova tutti i cestelli destinati alla vendita per queste vagliature
sold_destinations AS (
  SELECT sdb.*, s.date, s."selectionNumber"
  FROM selection_destination_baskets sdb
  JOIN draft_selections s ON sdb."selectionId" = s.id
  WHERE sdb."destinationType" = 'sold'
),

-- 3. Crea cicli temporanei validi per questi cestelli
inserted_cycles AS (
  INSERT INTO cycles ("basketId", "startDate", state)
  SELECT DISTINCT sd."basketId", sd.date, 'active'
  FROM sold_destinations sd
  WHERE NOT EXISTS (
    SELECT 1 FROM cycles c
    WHERE c."basketId" = sd."basketId" AND c."startDate" = sd.date
  )
  RETURNING *
),

-- 4. Unisci i cicli appena creati con quelli esistenti per trovare tutti i cicli validi
all_valid_cycles AS (
  SELECT ic.id, ic."basketId", sd."selectionId", sd.id AS "destBasketId", sd.date
  FROM inserted_cycles ic
  JOIN sold_destinations sd ON ic."basketId" = sd."basketId" AND ic."startDate" = sd.date
  UNION
  SELECT c.id, c."basketId", sd."selectionId", sd.id AS "destBasketId", sd.date
  FROM cycles c
  JOIN sold_destinations sd ON c."basketId" = sd."basketId" AND c."startDate" = sd.date
  WHERE c.state = 'active'
)

-- 5. Crea operazioni di vendita per ogni ciclo valido
INSERT INTO operations (date, type, "basketId", "cycleId", "animalCount", "totalWeight", "animalsPerKg", notes)
SELECT
  avc.date,
  'vendita',
  avc."basketId",
  avc.id AS "cycleId",
  sd."animalCount",
  sd."totalWeight",
  sd."animalsPerKg",
  'Vendita immediata dopo selezione #' || sd."selectionNumber" || ' (correzione script)'
FROM all_valid_cycles avc
JOIN sold_destinations sd ON avc."basketId" = sd."basketId" AND avc."selectionId" = sd."selectionId"
WHERE NOT EXISTS (
  SELECT 1 FROM operations o
  WHERE o.type = 'vendita' AND o."basketId" = avc."basketId" AND o."cycleId" = avc.id
);

-- 6. Chiudi i cicli per i cestelli venduti
UPDATE cycles c
SET state = 'closed', "endDate" = s.date
FROM sold_destinations sd
JOIN selections s ON sd."selectionId" = s.id
WHERE c."basketId" = sd."basketId"
  AND c.state = 'active'
  AND EXISTS (
    SELECT 1 FROM operations o
    WHERE o.type = 'vendita' AND o."basketId" = c."basketId" AND o."cycleId" = c.id
  );

-- 7. Aggiorna lo stato dei cestelli venduti a disponibile
UPDATE baskets b
SET state = 'available', "currentCycleId" = NULL, position = NULL, row = NULL
FROM sold_destinations sd
WHERE b.id = sd."basketId";

-- Feedback all'utente
SELECT 'Correzione completata. Cestelli di vendita corretti: ' || 
  (SELECT COUNT(*) FROM sold_destinations) AS risultato;