// Script per simulare una notifica di accrescimento TP-3000
const { exec } = require('child_process');

// Questa query SQL creerà una simulazione di notifica di accrescimento
const simulateGrowthNotificationSQL = `
-- Creare un'annotazione di target_size
INSERT INTO target_size_annotations 
(cycle_id, basket_id, target_size, projected_value, status, created_at)
VALUES (4, 5, 'TP-3000', 3042, 'unread', NOW())
RETURNING id;

-- Usare l'ID restituito per creare una notifica
WITH new_annotation AS (
  SELECT id FROM target_size_annotations 
  WHERE cycle_id = 4 AND basket_id = 5 AND target_size = 'TP-3000'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO notifications
(type, title, message, is_read, created_at, related_entity_type, related_entity_id, data)
VALUES (
  'accrescimento',
  'Taglia TP-3000 raggiunta',
  'Il cestello #5 (ciclo #4) ha raggiunto la taglia TP-3000 (3042 esemplari/kg)',
  false,
  NOW(),
  'target_size',
  (SELECT id FROM new_annotation),
  '{"cycleId": 4, "basketId": 5, "basketNumber": 5, "targetSize": "TP-3000", "projectedValue": 3042}'
)
RETURNING id;
`;

// Eseguiamo lo script usando psql
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL non impostato!');
  process.exit(1);
}

const command = `echo "${simulateGrowthNotificationSQL}" | psql "${databaseUrl}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Errore nell'esecuzione: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Errore: ${stderr}`);
    return;
  }
  console.log(`Output: ${stdout}`);
  console.log('Notifica di accrescimento simulata con successo!');
});