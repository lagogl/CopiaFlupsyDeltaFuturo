# Specifiche Campo `source` - Tabella Operations

## 📋 Panoramica

È stato aggiunto il campo **`source`** alla tabella `operations` per identificare l'origine dell'operazione e distinguere tra operazioni create dall'app mobile NFC e quelle create dal gestionale desktop.

---

## 🗄️ Specifica Database

### Campo Aggiunto

```sql
ALTER TABLE operations ADD COLUMN source TEXT DEFAULT 'desktop_manager';
```

| Campo | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| `source` | TEXT | `'desktop_manager'` | Identifica l'applicazione di origine dell'operazione |

---

## 📱 Valori Possibili

| Valore | Applicazione | Descrizione |
|--------|--------------|-------------|
| **`mobile_nfc`** | App Mobile con NFC | Operazioni create dall'applicazione mobile industriale tramite lettura NFC |
| **`desktop_manager`** | Gestionale Desktop | Operazioni create dal software di gestione desktop/web (valore di default) |

---

## 🔧 Implementazione Richiesta

### Per il Gestionale Desktop

Quando si inseriscono nuove operazioni dalla vostra applicazione, **assicurarsi di impostare esplicitamente**:

```sql
INSERT INTO operations (
  date, type, basket_id, cycle_id, size_id, 
  animal_count, total_weight, animals_per_kg, 
  average_weight, notes, operator_id, operator_name,
  source  -- ⬅️ AGGIUNGERE QUESTO CAMPO
) VALUES (
  '2025-10-17', 'peso', 21, 15, 3,
  1200, 5400, 222,
  4.5, 'Operazione da gestionale', 'OP001', 'Mario Rossi',
  'desktop_manager'  -- ⬅️ IMPOSTARE QUESTO VALORE
);
```

**Oppure in ORM/Query Builder:**

```javascript
// Esempio con Drizzle ORM
await db.insert(operations).values({
  // ... altri campi
  source: 'desktop_manager'  // ⬅️ AGGIUNGERE
});
```

```python
# Esempio con SQLAlchemy o simili
operation = Operation(
    # ... altri campi
    source='desktop_manager'  # ⬅️ AGGIUNGERE
)
```

---

## ✅ Compatibilità e Retroattività

### Operazioni Esistenti
- Tutte le operazioni **già presenti** nel database avranno automaticamente `source = 'desktop_manager'` (valore di default)
- **Non è necessario aggiornare i record esistenti**

### Nuove Operazioni
- App Mobile: automaticamente imposta `source = 'mobile_nfc'` ✅
- Gestionale Desktop: **deve impostare esplicitamente** `source = 'desktop_manager'` ⚠️

---

## 🔍 Query di Esempio

### Filtrare operazioni per origine

```sql
-- Solo operazioni da app mobile
SELECT * FROM operations 
WHERE source = 'mobile_nfc';

-- Solo operazioni da gestionale desktop
SELECT * FROM operations 
WHERE source = 'desktop_manager';

-- Contare operazioni per tipo di app
SELECT source, COUNT(*) as total
FROM operations
GROUP BY source;
```

### Report aggregati

```sql
-- Confronto pesi giornalieri per origine
SELECT 
  date,
  source,
  COUNT(*) as num_operations,
  AVG(total_weight) as avg_weight,
  SUM(animal_count) as total_animals
FROM operations
WHERE type = 'peso'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date, source
ORDER BY date DESC, source;
```

---

## 📊 Utilizzo nel Reporting

Il campo `source` permette di:

1. **Tracciare l'utilizzo** delle diverse applicazioni
2. **Identificare tendenze** di adozione dell'app mobile
3. **Analizzare accuratezza** dei dati tra le due app
4. **Generare report comparativi** desktop vs mobile
5. **Debugging**: individuare rapidamente da quale app proviene un'operazione

---

## ⚙️ Note Tecniche

- **Tipo**: TEXT (stringa variabile)
- **Nullable**: NO (ha default)
- **Default**: `'desktop_manager'`
- **Indice**: Non richiesto (bassa cardinalità)
- **Validazione**: Nessuna constraint CHECK (valori liberi)

---

## 📞 Contatti

Per domande o chiarimenti su questa specifica, contattare il team di sviluppo mobile.

**Data implementazione**: Ottobre 2025  
**Versione documento**: 1.0
