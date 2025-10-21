# Richiesta Modifica Trigger - Preservare Note Operatore

## 📋 Oggetto: Modifica trigger `trigger_enrich_mixed_lot_metadata`

Ciao,

L'app mobile NFC permette agli operatori di inserire **note personalizzate** durante le operazioni peso. Attualmente il trigger `trigger_enrich_mixed_lot_metadata` **sovrascrive completamente** il campo `notes`, perdendo le informazioni dell'operatore.

---

## ❌ Problema Attuale

Quando un operatore inserisce un'operazione con note personalizzate su un cestello misto:

```sql
INSERT INTO operations (
  type, basket_id, cycle_id, date,
  animal_count, total_weight, animals_per_kg,
  notes,  -- "Controllare qualità domani - Davide"
  source
) VALUES (
  'peso', 3, 34, '2025-10-21',
  10000, 1500, 6667,
  'Controllare qualità domani - Davide',  -- ⬅️ Note operatore
  'mobile_nfc'
);
```

**Risultato attuale:**
```
notes = "LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```

❌ **Le note dell'operatore vengono perse completamente.**

---

## ✅ Comportamento Richiesto

Le note dell'operatore devono essere **preservate e combinate** con le informazioni dei lotti misti:

**Risultato desiderato:**
```
notes = "Controllare qualità domani - Davide | LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```

---

## 🔧 Modifica SQL Richiesta

Sostituire la funzione trigger attuale con questa versione aggiornata che **preserva** le note esistenti:

```sql
CREATE OR REPLACE FUNCTION enrich_mixed_lot_metadata()
RETURNS TRIGGER AS $$
DECLARE
  lot_count INTEGER;
  lot_data RECORD;
  notes_text TEXT := '';
  metadata_json JSONB;
  lot_array JSONB := '[]'::JSONB;
  dominant_lot_id INTEGER;
  max_percentage NUMERIC := 0;
BEGIN
  -- Solo per operazioni peso, misura, prima-attivazione
  IF NEW.type NOT IN ('peso', 'misura', 'prima-attivazione') THEN
    RETURN NEW;
  END IF;

  -- Conta lotti del cestello
  SELECT COUNT(*) INTO lot_count
  FROM basket_lot_composition
  WHERE basket_id = NEW.basket_id;

  -- Se cestello misto (>1 lotto)
  IF lot_count > 1 THEN
    
    -- Costruisci testo leggibile composizione lotti
    FOR lot_data IN
      SELECT 
        blc.lot_id,
        l.name AS lot_name,
        blc.animal_count,
        ROUND((blc.animal_count::NUMERIC / 
          (SELECT SUM(animal_count) FROM basket_lot_composition WHERE basket_id = NEW.basket_id)) * 100, 1
        ) AS percentage
      FROM basket_lot_composition blc
      LEFT JOIN lots l ON blc.lot_id = l.id
      WHERE blc.basket_id = NEW.basket_id
      ORDER BY blc.animal_count DESC
    LOOP
      IF notes_text != '' THEN
        notes_text := notes_text || ' + ';
      END IF;
      notes_text := notes_text || lot_data.lot_name || ' (' || lot_data.percentage || '% - ' || lot_data.animal_count || ' animali)';
      
      -- Aggiungi al JSON array
      lot_array := lot_array || jsonb_build_object(
        'lotId', lot_data.lot_id,
        'percentage', lot_data.percentage / 100,
        'animalCount', lot_data.animal_count
      );
      
      -- Trova lotto dominante
      IF lot_data.percentage > max_percentage THEN
        max_percentage := lot_data.percentage;
        dominant_lot_id := lot_data.lot_id;
      END IF;
    END LOOP;

    -- Costruisci metadata JSON
    metadata_json := jsonb_build_object(
      'isMixed', true,
      'dominantLot', dominant_lot_id,
      'lotCount', lot_count,
      'composition', lot_array
    );

    -- ⭐ MODIFICA PRINCIPALE: Preserva note operatore se presenti
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      NEW.notes := NEW.notes || ' | LOTTO MISTO: ' || notes_text;
    ELSE
      NEW.notes := 'LOTTO MISTO: ' || notes_text;
    END IF;
    
    NEW.metadata := metadata_json::TEXT;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 Applicare la Modifica

```sql
-- 1. Ricreare la funzione (già fatto con lo script sopra)

-- 2. Ricreare il trigger (se necessario)
DROP TRIGGER IF EXISTS trigger_enrich_mixed_lot_metadata ON operations;

CREATE TRIGGER trigger_enrich_mixed_lot_metadata
  BEFORE INSERT ON operations
  FOR EACH ROW
  EXECUTE FUNCTION enrich_mixed_lot_metadata();
```

---

## 📊 Esempi Comportamento Prima/Dopo

### Caso 1: Operatore SENZA note personalizzate

**INSERT:**
```sql
INSERT INTO operations (type, basket_id, notes, source)
VALUES ('peso', 3, NULL, 'mobile_nfc');
```

**Prima della modifica:**
```
notes = "LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```

**Dopo la modifica:**
```
notes = "LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```

✅ **Nessun cambiamento** - Funziona come prima

---

### Caso 2: Operatore CON note personalizzate

**INSERT:**
```sql
INSERT INTO operations (type, basket_id, notes, source)
VALUES ('peso', 3, 'Controllare qualità - Davide', 'mobile_nfc');
```

**Prima della modifica:**
```
notes = "LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```
❌ Note operatore perse

**Dopo la modifica:**
```
notes = "Controllare qualità - Davide | LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"
```
✅ **Note operatore preservate e combinate**

---

### Caso 3: Cestello NON misto

**INSERT:**
```sql
INSERT INTO operations (type, basket_id, notes, source)
VALUES ('peso', 1, 'Ottima crescita', 'mobile_nfc');
```

**Prima della modifica:**
```
notes = "Ottima crescita"
```

**Dopo la modifica:**
```
notes = "Ottima crescita"
```

✅ **Nessun cambiamento** - Trigger non interviene su cestelli normali

---

## ✅ Checklist Verifica Post-Modifica

Dopo aver applicato la modifica, testare:

```sql
-- Test 1: Operazione su cestello misto CON note operatore
INSERT INTO operations (
  type, basket_id, cycle_id, date,
  animal_count, total_weight, animals_per_kg,
  notes, source
) VALUES (
  'peso', 3, 34, CURRENT_DATE,
  10000, 1500, 6667,
  'TEST Note Operatore', 'mobile_nfc'
) RETURNING id, notes;

-- Verificare che notes contenga: "TEST Note Operatore | LOTTO MISTO: ..."
```

```sql
-- Test 2: Operazione su cestello misto SENZA note operatore
INSERT INTO operations (
  type, basket_id, cycle_id, date,
  animal_count, total_weight, animals_per_kg,
  source
) VALUES (
  'peso', 3, 34, CURRENT_DATE,
  10000, 1500, 6667,
  'mobile_nfc'
) RETURNING id, notes;

-- Verificare che notes contenga solo: "LOTTO MISTO: ..."
```

---

## 📞 Supporto

Se hai domande sulla modifica o vuoi discutere alternative, fammi sapere.

Grazie per il supporto!

---

**Priorità**: Media  
**Impatto**: Migliora user experience operatori senza breaking changes  
**Compatibilità**: Retrocompatibile al 100%
