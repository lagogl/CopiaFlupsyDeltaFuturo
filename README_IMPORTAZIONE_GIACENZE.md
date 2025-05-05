# Guida all'importazione delle giacenze

## Introduzione

Questo documento descrive il processo di importazione delle giacenze da un formato JSON esterno nel formato richiesto dal sistema FlUPSY Manager.

## Problema

Il formato JSON fornito non corrisponde al formato atteso dal sistema per l'importazione delle giacenze. I problemi principali sono:

1. Campi con nomi diversi (`identificativo` invece di `vasca_id`, `quantita` invece di `numero_animali`)
2. Mancanza del campo obbligatorio `codice_sezione`
3. Il valore del peso medio (`mg_vongola`) è spesso zero, ma il sistema non accetta valori nulli o zero

## Soluzione: Script di conversione

Lo script `convert_giacenze.js` è stato creato per convertire automaticamente il formato JSON originale nel formato richiesto dal sistema.

### Caratteristiche dello script:

1. **Recupero pesi medi reali**: Recupera i pesi medi dalle operazioni esistenti nel database
2. **Consolidamento dei dati**: Somma le quantità di vongole per lo stesso identificativo e taglia
3. **Formato corretto dei dati**: Genera il JSON nel formato esatto richiesto dal sistema
4. **Prevenzione valori nulli**: Garantisce che non ci siano mai valori zero nel peso medio
5. **Gestione delle sezioni**: Assegna automaticamente un codice sezione (A-E) a ciascun identificativo

### Come usare lo script:

```bash
node convert_giacenze.js input.json output.json
```

Dove:
- `input.json`: file JSON originale con le giacenze
- `output.json`: file JSON di output che verrà creato nel formato corretto

### Prerequisiti:

Prima di eseguire lo script, assicurarsi che:
1. La variabile d'ambiente `DATABASE_URL` sia impostata correttamente
2. Il database sia accessibile per recuperare i pesi medi dalle operazioni
3. Node.js sia installato con il pacchetto `pg` per l'accesso a PostgreSQL

### Esempio di formato di input:

```json
{
  "data_importazione": "2025-05-05",
  "fornitore": "Flupsy Manager",
  "giacenze": [
    {
      "identificativo": "RACE-L22",
      "taglia": "TP-315",
      "quantita": 731745,
      "data_iniziale": "2025-04-27",
      "mg_vongola": 0
    },
    ...
  ]
}
```

### Esempio di formato di output:

```json
{
  "data_importazione": "2025-05-05",
  "fornitore": "Flupsy Manager",
  "giacenze": [
    {
      "vasca_id": "EXT-RACE-L22",
      "codice_sezione": "A",
      "taglia": "TP-315",
      "numero_animali": 731745,
      "peso_medio_mg": 315.4521,
      "note": "Data iniziale: 2025-04-27"
    },
    ...
  ]
}
```

## Logica di determinazione del peso medio

Il peso medio viene determinato nell'ordine seguente:

1. **Valore fornito nel file di input**: Se `mg_vongola` è maggiore di zero, viene utilizzato questo valore
2. **Valore recuperato dal database**: Lo script consulta la tabella `operations` per recuperare i pesi medi più recenti dai dati reali
3. **Valore estratto dalla taglia**: Se non sono disponibili le opzioni precedenti, il peso viene estratto dal codice della taglia (es. "TP-315" → 315 mg)
4. **Valore minimo di fallback**: Se nessuna delle opzioni precedenti è disponibile, viene utilizzato un valore minimo di 0.0001 mg

## Note importanti:

1. Il prefisso "EXT-" viene aggiunto automaticamente agli identificativi
2. I codici sezione vengono assegnati ciclicamente da A a E per ogni diverso identificativo
3. I pesi medi vengono arrotondati a 4 decimali di precisione
4. La data iniziale viene mantenuta nel campo "note" per riferimento

## Assistenza

In caso di problemi con l'importazione, contattare l'amministratore di sistema.