-- Script SQL per simulare una notifica di accrescimento TP-3000
-- Da eseguire con: psql $DATABASE_URL -f simulate-growth-notification.sql

-- Step 1: Aggiungiamo una nuova annotazione di taglia target
INSERT INTO target_size_annotations 
(basket_id, target_size_id, predicted_date, created_at, status, notes)
VALUES (
  4, -- Cestello ID (Basket #4)
  19, -- Target Size ID (TP-3000, con ID = 19)
  CURRENT_DATE + INTERVAL '10 days', -- Data prevista
  NOW(), -- Data di creazione
  'unread', -- Stato (da leggere)
  'Annotazione creata manualmente per test'
)
RETURNING id;

-- Step 2: Creiamo una notifica per l'annotazione
WITH new_annotation AS (
  SELECT id FROM target_size_annotations 
  WHERE basket_id = 4 AND target_size_id = 19
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO notifications
(type, title, message, is_read, created_at, related_entity_type, related_entity_id, data)
VALUES (
  'accrescimento',
  'Taglia TP-3000 raggiunta',
  'Il cestello #4 si avvicina alla taglia TP-3000 (31.000 esemplari/kg). Raggiungimento previsto fra 10 giorni.',
  false,
  NOW(),
  'target_size',
  (SELECT id FROM new_annotation),
  '{"basketId": 4, "basketNumber": 1, "targetSize": "TP-3000", "projectedValue": 31000, "daysToReach": 10}'
);

-- Verifica finale
SELECT COUNT(*) AS "Annotazioni create" FROM target_size_annotations 
WHERE basket_id = 4 AND target_size_id = 19
AND created_at > NOW() - INTERVAL '5 minutes';

SELECT COUNT(*) AS "Notifiche create" FROM notifications
WHERE type = 'accrescimento' AND created_at > NOW() - INTERVAL '5 minutes';