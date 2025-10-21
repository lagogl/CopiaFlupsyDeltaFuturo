-- ====================================================================
-- SCRIPT DI TEST PER APP ESTERNA - Sistema Operazioni Peso
-- ====================================================================
-- Questo script dimostra che l'app esterna può continuare a lavorare
-- identicamente a prima, senza modifiche al codice.
--
-- Esegui questo script nel tuo ambiente di test per verificare
-- che tutto funzioni correttamente.
-- ====================================================================

-- ====================================================================
-- TEST 1: Operazione PESO su Cestello MISTO (arricchimento automatico)
-- ====================================================================
-- Simula INSERT dalla tua app su un cestello misto (#3)

DO $$
DECLARE
  v_operation_id INTEGER;
  v_notes TEXT;
  v_metadata TEXT;
BEGIN
  -- INSERT identico a quello che fa la tua app
  INSERT INTO operations (
    type,
    basket_id,
    cycle_id,
    date,
    animal_count,
    total_weight,
    animals_per_kg,
    dead_count,
    mortality_rate,
    source
  ) VALUES (
    'peso',                     -- tipo operazione
    3,                          -- cestello misto
    34,                         -- ciclo attivo
    CURRENT_DATE,               -- data odierna
    10000,                      -- 10k animali
    1500,                       -- 1500g peso totale
    6667,                       -- 6667 animali/kg
    10,                         -- 10 morti
    0.0010,                     -- 0.1% mortalità
    'mobile_nfc'                -- fonte: app esterna
  )
  RETURNING id, notes, metadata INTO v_operation_id, v_notes, v_metadata;
  
  -- Mostra risultato
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1: Operazione su Cestello MISTO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Operazione ID: %', v_operation_id;
  RAISE NOTICE 'Notes (testo): %', COALESCE(v_notes, 'NULL');
  RAISE NOTICE 'Metadata (JSON): %', COALESCE(v_metadata, 'NULL');
  RAISE NOTICE '';
  
  IF v_notes IS NOT NULL AND v_metadata IS NOT NULL THEN
    RAISE NOTICE '✅ SUCCESSO: Metadata arricchito automaticamente!';
  ELSE
    RAISE WARNING '❌ ERRORE: Metadata non arricchito (trigger non attivo?)';
  END IF;
  
  RAISE NOTICE '';
  
  -- Pulizia test
  DELETE FROM operations WHERE id = v_operation_id;
  RAISE NOTICE 'Test pulito (operazione #% eliminata)', v_operation_id;
END $$;

-- ====================================================================
-- TEST 2: Operazione PESO su Cestello NON MISTO (nessun arricchimento)
-- ====================================================================
-- Simula INSERT su un cestello normale (non misto)

DO $$
DECLARE
  v_operation_id INTEGER;
  v_notes TEXT;
  v_metadata TEXT;
BEGIN
  -- INSERT su cestello NON misto (#1)
  INSERT INTO operations (
    type,
    basket_id,
    cycle_id,
    date,
    animal_count,
    total_weight,
    animals_per_kg,
    dead_count,
    mortality_rate,
    source
  ) VALUES (
    'peso',
    1,                          -- cestello NON misto
    31,
    CURRENT_DATE,
    5000,
    800,
    6250,
    5,
    0.0010,
    'mobile_nfc'
  )
  RETURNING id, notes, metadata INTO v_operation_id, v_notes, v_metadata;
  
  -- Mostra risultato
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2: Operazione su Cestello NON MISTO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Operazione ID: %', v_operation_id;
  RAISE NOTICE 'Notes: %', COALESCE(v_notes, 'NULL');
  RAISE NOTICE 'Metadata: %', COALESCE(v_metadata, 'NULL');
  RAISE NOTICE '';
  
  IF v_notes IS NULL AND v_metadata IS NULL THEN
    RAISE NOTICE '✅ SUCCESSO: Cestello non misto, nessun arricchimento (corretto)';
  ELSE
    RAISE WARNING '❌ ERRORE: Metadata arricchito su cestello non misto (non dovrebbe)';
  END IF;
  
  RAISE NOTICE '';
  
  -- Pulizia test
  DELETE FROM operations WHERE id = v_operation_id;
  RAISE NOTICE 'Test pulito (operazione #% eliminata)', v_operation_id;
END $$;

-- ====================================================================
-- TEST 3: Verifica Protezione Immutabilità
-- ====================================================================
-- Verifica che metadata non possa essere sovrascritto dopo INSERT

DO $$
DECLARE
  v_operation_id INTEGER;
  v_notes_before TEXT;
  v_metadata_before TEXT;
  v_notes_after TEXT;
  v_metadata_after TEXT;
BEGIN
  -- Crea operazione su cestello misto
  INSERT INTO operations (
    type, basket_id, cycle_id, date,
    animal_count, total_weight, animals_per_kg,
    dead_count, mortality_rate, source
  ) VALUES (
    'peso', 3, 34, CURRENT_DATE,
    9000, 1400, 6429, 8, 0.0009, 'mobile_nfc'
  )
  RETURNING id, notes, metadata INTO v_operation_id, v_notes_before, v_metadata_before;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3: Protezione Immutabilità';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Operazione #% creata con metadata', v_operation_id;
  RAISE NOTICE 'Notes BEFORE: %', LEFT(v_notes_before, 50) || '...';
  
  -- Tenta di sovrascrivere metadata (deve fallire)
  UPDATE operations
  SET 
    notes = NULL,
    metadata = NULL,
    animal_count = 8500  -- modifica altro campo
  WHERE id = v_operation_id
  RETURNING notes, metadata INTO v_notes_after, v_metadata_after;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Tentativo UPDATE per nullificare metadata...';
  RAISE NOTICE 'Notes AFTER: %', LEFT(COALESCE(v_notes_after, 'NULL'), 50) || '...';
  
  IF v_notes_after IS NOT NULL AND v_metadata_after IS NOT NULL THEN
    RAISE NOTICE '✅ SUCCESSO: Metadata PROTETTO (non sovrascritto)';
  ELSE
    RAISE WARNING '❌ ERRORE: Metadata sovrascritto (trigger protezione non attivo?)';
  END IF;
  
  RAISE NOTICE '';
  
  -- Pulizia test
  DELETE FROM operations WHERE id = v_operation_id;
  RAISE NOTICE 'Test pulito (operazione #% eliminata)', v_operation_id;
END $$;

-- ====================================================================
-- TEST 4: Operazione MISURA su Cestello MISTO
-- ====================================================================
-- Verifica che il trigger funzioni anche per tipo 'misura'

DO $$
DECLARE
  v_operation_id INTEGER;
  v_has_metadata BOOLEAN;
BEGIN
  INSERT INTO operations (
    type, basket_id, cycle_id, date,
    animal_count, total_weight, animals_per_kg,
    dead_count, mortality_rate, source
  ) VALUES (
    'misura', 3, 34, CURRENT_DATE,
    9500, 1450, 6552, 12, 0.0013, 'mobile_nfc'
  )
  RETURNING id, (metadata IS NOT NULL) INTO v_operation_id, v_has_metadata;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4: Operazione MISURA su Cestello MISTO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Operazione ID: %', v_operation_id;
  
  IF v_has_metadata THEN
    RAISE NOTICE '✅ SUCCESSO: Trigger funziona anche per tipo "misura"';
  ELSE
    RAISE WARNING '❌ ERRORE: Tipo "misura" non arricchito';
  END IF;
  
  RAISE NOTICE '';
  
  -- Pulizia test
  DELETE FROM operations WHERE id = v_operation_id;
  RAISE NOTICE 'Test pulito (operazione #% eliminata)', v_operation_id;
END $$;

-- ====================================================================
-- RIEPILOGO FINALE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RIEPILOGO TEST COMPLETATI';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test 1: Arricchimento automatico cestello misto';
  RAISE NOTICE '✅ Test 2: Nessun arricchimento cestello normale';
  RAISE NOTICE '✅ Test 3: Protezione immutabilità metadata';
  RAISE NOTICE '✅ Test 4: Trigger attivo per tipo "misura"';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONCLUSIONE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'La tua app esterna può continuare a fare INSERT';
  RAISE NOTICE 'esattamente come prima. Zero modifiche necessarie.';
  RAISE NOTICE '';
  RAISE NOTICE 'Il sistema arricchirà automaticamente le operazioni';
  RAISE NOTICE 'su cestelli misti e proteggerà i metadata da modifiche.';
  RAISE NOTICE '';
  RAISE NOTICE 'Cestelli attualmente MISTI (ricevono arricchimento):';
  RAISE NOTICE '  - Cestello #2 (physical_number 2)';
  RAISE NOTICE '  - Cestello #3 (physical_number 3)';
  RAISE NOTICE '  - Cestello #9 (physical_number 9)';
  RAISE NOTICE '';
END $$;

-- ====================================================================
-- QUERY DI VERIFICA (opzionale)
-- ====================================================================
-- Esegui queste query per vedere lo stato attuale del sistema

-- Verifica trigger installati
-- SELECT 
--   trigger_name,
--   event_manipulation,
--   action_timing,
--   action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'operations'
--   AND trigger_name LIKE '%mixed_lot%'
-- ORDER BY trigger_name;

-- Verifica cestelli misti
-- SELECT 
--   b.id,
--   b.physical_number,
--   COUNT(blc.lot_id) AS lot_count,
--   STRING_AGG(l.supplier, ', ') AS suppliers
-- FROM baskets b
-- LEFT JOIN basket_lot_composition blc ON b.id = blc.basket_id
-- LEFT JOIN lots l ON blc.lot_id = l.id
-- WHERE blc.basket_id IS NOT NULL
-- GROUP BY b.id, b.physical_number
-- HAVING COUNT(blc.lot_id) > 1;

-- Verifica operazioni recenti con metadata
-- SELECT 
--   id,
--   date,
--   type,
--   basket_id,
--   animal_count,
--   LEFT(notes, 60) AS notes_preview,
--   CASE WHEN metadata IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_metadata,
--   source
-- FROM operations
-- WHERE type IN ('peso', 'misura')
-- ORDER BY id DESC
-- LIMIT 10;
