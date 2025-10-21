# Documentazione Tecnica - Aggiornamento Sistema Operazioni Peso

## 📋 Riepilogo per lo Sviluppatore

**NON servono modifiche al codice dell'applicazione esterna.** Il database ha implementato un sistema di **trigger automatici** completamente trasparente che arricchisce automaticamente le operazioni su cestelli misti.

---

## ✅ Cosa Funziona Senza Modifiche

L'app esterna può continuare a fare **esattamente le stesse INSERT** di prima:

```sql
-- Esempio INSERT che funziona identicamente a prima
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
  'peso',           -- tipo operazione
  3,                -- ID cestello
  34,               -- ID ciclo
  '2025-11-05',     -- data
  11800,            -- numero animali
  1850,             -- peso totale (grammi)
  6378,             -- animali per kg
  25,               -- animali morti
  0.0021,           -- tasso mortalità
  'mobile_nfc'      -- fonte operazione (identificativo app esterna)
);
```

**Nessuna modifica necessaria alle query SQL esistenti.**

---

## 🔄 Cosa Succede Automaticamente

Il database ha **2 trigger PostgreSQL** che lavorano in background:

### 1. Trigger BEFORE INSERT: `trigger_enrich_mixed_lot_metadata`

Quando l'app inserisce un'operazione di tipo `peso`, `misura` o `prima-attivazione`:

**STEP 1: Calcolo Campi Derivati (SEMPRE, per tutte le operazioni)**
1. **`average_weight`**: calcolato automaticamente come `(total_weight * 1000) / animal_count` (peso medio in milligrammi)
2. **`animals_per_kg`**: se non specificato, calcolato come `(animal_count / total_weight) * 1000`

**STEP 2: Arricchimento Metadata Lotti Misti (solo se cestello misto)**
1. **Verifica automaticamente** se il cestello è misto (composto da più lotti)
2. **Se il cestello è misto**, popola automaticamente 2 campi aggiuntivi:
   - `notes` (testo leggibile): esempio `"LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)"`
   - `metadata` (JSON): struttura completa della composizione lotti
3. **Se il cestello NON è misto**, `notes` e `metadata` rimangono `NULL` (come prima)

### 2. Trigger BEFORE UPDATE: `trigger_protect_mixed_lot_metadata`

Se in futuro qualcuno tentasse di modificare un'operazione già arricchita:
- Il trigger **preserva automaticamente** i valori originali di `notes` e `metadata`
- Garantisce l'**immutabilità dell'audit trail**

---

## 📊 Campi Calcolati Automaticamente

### Campi Sempre Calcolati (per tutte le operazioni)

#### Campo `average_weight` (real, nullable)

**Calcolato automaticamente** quando presenti `total_weight > 0` e `animal_count > 0`:

```
average_weight = (total_weight * 1000) / animal_count  // mg per animale
```

Esempi:
- 2500g / 15000 animali = **166.67 mg** per animale
- 2000g / 12000 animali = **166.67 mg** per animale

**Casi speciali (protezione division-by-zero):**
- Se `animal_count = 0` → `average_weight` rimane `NULL`
- Se `total_weight = 0` → `average_weight` rimane `NULL`
- Se valori NULL → `average_weight` rimane `NULL`

⚠️ **L'app NON deve** scrivere questo campo manualmente. Il trigger lo gestisce automaticamente.

#### Campo `animals_per_kg` (integer, nullable)

**Calcolato automaticamente se non specificato** quando presenti `animal_count > 0` e `total_weight > 0`:

```
animals_per_kg = (animal_count / total_weight) * 1000
```

Esempio: 12000 animali / 2000g * 1000 = **6000 animali/kg**

**Casi speciali (protezione division-by-zero):**
- Se `animal_count = 0` → `animals_per_kg` rimane `NULL`
- Se `total_weight = 0` → `animals_per_kg` rimane `NULL`
- Se valori NULL → `animals_per_kg` rimane `NULL`
- Se già specificato dall'utente → trigger NON lo ricalcola

✅ **L'app può** specificare questo valore manualmente se lo conosce già (in tal caso il trigger non lo ricalcola).
⚠️ Se omesso, il trigger lo calcola automaticamente (solo con valori validi >0).

---

### Campi per Cestelli Misti (solo se >1 lotto)

#### Campo `notes` (text, nullable)

Testo leggibile per operatori:

```
LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)
```

### Campo `metadata` (text/JSON, nullable)

Struttura JSON completa:

```json
{
  "isMixed": true,
  "dominantLot": 25,
  "lotCount": 2,
  "composition": [
    {
      "lotId": 25,
      "percentage": 0.68083334,
      "animalCount": 12255
    },
    {
      "lotId": 26,
      "percentage": 0.31916666,
      "animalCount": 5745
    }
  ]
}
```

**⚠️ Importante:** L'app esterna **NON deve** tentare di scrivere questi campi manualmente. Il trigger li gestisce automaticamente.

---

## 🎯 Cestelli Attualmente Misti

Al momento, questi cestelli sono misti e riceveranno arricchimento automatico:

| Basket ID | Physical Number | FLUPSY | Composizione |
|-----------|-----------------|--------|--------------|
| 2 | 2 | flupsy Legno | Taylor (68.1%), Ecotapes Zeeland (31.9%) |
| 3 | 3 | flupsy Legno | Taylor (68.1%), Ecotapes Zeeland (31.9%) |
| 9 | 9 | flupsy Legno | Taylor (68.1%), Ecotapes Zeeland (31.9%) |

L'elenco può cambiare dinamicamente quando nuovi cestelli vengono configurati come misti.

---

## ✅ Raccomandazioni per l'App Esterna

### 1. NON Modificare Campi Calcolati Automaticamente

```sql
-- ❌ NON FARE - Il trigger calcola/sovrascrive automaticamente
INSERT INTO operations (
  ..., 
  average_weight,  -- ❌ NON specificare
  notes,           -- ❌ NON specificare  
  metadata         -- ❌ NON specificare
) 
VALUES (..., 166.67, 'mio testo', '{"mio": "json"}');

-- ✅ FARE - Lascia che il trigger calcoli automaticamente
INSERT INTO operations (
  type, basket_id, cycle_id, date,
  animal_count, total_weight, animals_per_kg,  -- ✅ questi sì
  dead_count, mortality_rate, source
) 
VALUES ('peso', 3, 34, '2025-11-05', 15000, 2500, 6000, 20, 0.0013, 'mobile_nfc');
```

**Campi gestiti automaticamente dal trigger:**
- `average_weight` → sempre calcolato
- `animals_per_kg` → calcolato se non specificato
- `notes` → popolato solo se cestello misto
- `metadata` → popolato solo se cestello misto

### 2. Identificare Correttamente la Fonte

Usa il campo `source` per identificare l'app esterna:

```sql
-- ✅ RACCOMANDATO
INSERT INTO operations (..., source) 
VALUES (..., 'mobile_nfc');  -- o altro identificativo univoco dell'app
```

Valori comuni:
- `'desktop_manager'` → Manager web principale
- `'mobile_nfc'` → App mobile NFC
- `'external_api'` → Altre integrazioni esterne

### 3. Se Vuoi Leggere i Dati Arricchiti

Dopo l'INSERT, puoi recuperare i campi arricchiti:

```sql
INSERT INTO operations (...) 
VALUES (...) 
RETURNING id, notes, metadata;
```

Oppure in query successive:

```sql
SELECT 
  id,
  type,
  basket_id,
  date,
  animal_count,
  notes,           -- testo leggibile composizione lotti
  metadata,        -- JSON completo composizione
  source
FROM operations
WHERE basket_id = 3 AND type = 'peso'
ORDER BY date DESC;
```

---

## 🔧 Dettagli Tecnici Trigger

### Tipi Operazione Gestiti

Il trigger si attiva **solo** per questi tipi:
- `'peso'`
- `'misura'`
- `'prima-attivazione'`

Altri tipi di operazione NON sono influenzati.

### Logica di Arricchimento

```
SE (tipo IN ['peso', 'misura', 'prima-attivazione'] E basket_id specificato) ALLORA
  Conta lotti in basket_lot_composition per basket_id
  
  SE (lotti > 1) ALLORA
    -- Cestello misto
    Popola notes con testo leggibile
    Popola metadata con JSON completo
  ALTRIMENTI
    -- Cestello singolo
    Lascia notes = NULL
    Lascia metadata = NULL
  FINE SE
FINE SE
```

### Performance

- **Zero overhead** per l'applicazione
- Esecuzione database-side (millisecondi)
- Transazione atomica garantita

---

## 🧪 Test Consigliati

### Test 1: Operazione su Cestello Misto

```sql
-- Test su cestello #3 (misto)
INSERT INTO operations (
  type, basket_id, cycle_id, date, 
  animal_count, total_weight, animals_per_kg, 
  dead_count, mortality_rate, source
) VALUES (
  'peso', 3, 34, CURRENT_DATE,
  10000, 1500, 6667,
  10, 0.0010, 'mobile_nfc'
) RETURNING id, notes, metadata;
```

**Risultato Atteso:**
- `notes` popolato con testo "LOTTO MISTO: ..."
- `metadata` popolato con JSON `{"isMixed": true, ...}`

### Test 2: Operazione su Cestello NON Misto

```sql
-- Test su cestello #1 (NON misto)
INSERT INTO operations (
  type, basket_id, cycle_id, date, 
  animal_count, total_weight, animals_per_kg, 
  dead_count, mortality_rate, source
) VALUES (
  'peso', 1, 31, CURRENT_DATE,
  5000, 800, 6250,
  5, 0.0010, 'mobile_nfc'
) RETURNING id, notes, metadata;
```

**Risultato Atteso:**
- `notes` = NULL
- `metadata` = NULL

---

## ❓ FAQ

### Q: Devo modificare le INSERT esistenti?
**A:** No, zero modifiche necessarie.

### Q: Cosa succede se l'app scrive manualmente `notes` o `metadata`?
**A:** Il trigger li sovrascrive automaticamente se il cestello è misto. Non scriverli manualmente.

### Q: Come so se un cestello è misto prima dell'INSERT?
**A:** Non serve saperlo. Il trigger lo verifica automaticamente. Basta fare INSERT come sempre.

### Q: I trigger funzionano anche con framework ORM (Django, SQLAlchemy, ecc.)?
**A:** Sì, i trigger sono trasparenti a qualsiasi framework. Funzionano con SQL diretto, ORM, API REST, ecc.

### Q: Cosa succede se un cestello diventa misto dopo che ho già inserito operazioni?
**A:** Le operazioni vecchie rimangono senza metadata (normale). Le nuove operazioni riceveranno automaticamente l'arricchimento.

### Q: Posso disattivare il trigger per la mia app?
**A:** No, il trigger è sempre attivo per garantire consistenza audit trail. Ma non influenza negativamente il funzionamento.

---

## 📞 Supporto Tecnico

Per domande tecniche o test:
1. Verificare connessione database: `DATABASE_URL` invariato
2. Testare INSERT su cestello misto (#2, #3, #9)
3. Verificare che `notes` e `metadata` vengano popolati automaticamente

**Il sistema è production-ready e completamente retrocompatibile.**

---

## 🎯 Checklist Pre-Deploy App Esterna

- [ ] Verificato che INSERT funzionano identicamente a prima
- [ ] Rimossi eventuali tentativi di scrivere manualmente `notes`/`metadata`
- [ ] Configurato campo `source` con identificativo univoco app
- [ ] Testato operazione su cestello misto (ID: 2, 3, o 9)
- [ ] Testato operazione su cestello non misto (es. ID: 1)
- [ ] Verificato che l'app non tenta UPDATE di `notes`/`metadata`

---

**Versione Documento:** 1.0  
**Data Aggiornamento:** 21 Ottobre 2025  
**Compatibilità:** PostgreSQL 16+  
**Impatto Breaking Changes:** Nessuno
