# SPECIFICA INTEGRAZIONE TAG NFC - FLUPSY Mobile App

## 📋 PROBLEMA ATTUALE

L'app Web di FLUPSY **non riesce a leggere i tag NFC** scritti dalla vostra app.

**Errore riscontrato:**
```
NESSUN RECORD TROVATO NEL TAG
```

**Formato attuale nel tag (visto con NFC Tools):**
```
Registra 1 - UTF-8 (it) : text/plain
{"basketId":1,"physicalNumber":1,"currentCycleId":null,...}
```

Il problema è che il **Web NFC API** (usato dall'app mobile) non riesce a leggere i **records NDEF** dal tag.

---

## ✅ FORMATO RICHIESTO

### NDEF Message Structure
Il tag deve essere scritto come **NDEF Text Record** con questa struttura:

```javascript
NDEF Message {
  records: [
    {
      recordType: "text",        // OBBLIGATORIO
      encoding: "utf-8",         // UTF-8 standard
      lang: "en",                // Lingua (meglio "en" invece di "it")
      data: <JSON_PAYLOAD>       // Dati JSON (vedi sotto)
    }
  ]
}
```

### JSON Payload

**FORMATO COMPLETO (preferito):**
```json
{
  "basketId": 1,
  "physicalNumber": 123,
  "currentCycleId": 5,
  "flupsyId": 220,
  "position": 3,
  "version": "2.0"
}
```

**FORMATO COMPATTO (supportato - max 140 bytes):**
```json
{
  "id": 1,
  "num": 123,
  "cid": 5,
  "fid": 220,
  "v": "2.0"
}
```

**CAMPI OBBLIGATORI:**
- `basketId` (o `id`) → ID cestello nel database
- `physicalNumber` (o `num`) → Numero fisico del cestello
- `version` (o `v`) → Versione formato ("2.0")

**CAMPI OPZIONALI:**
- `currentCycleId` (o `cid`) → ID ciclo produzione attivo
- `flupsyId` (o `fid`) → ID macchina/linea
- `position` → Posizione nel cestello

---

## 🔧 CODICE DI LETTURA (APP FLUPSY)

### 1. Inizializzazione NDEFReader

```typescript
const ndef = new NDEFReader();
await ndef.scan();

ndef.addEventListener('reading', async ({ message }) => {
  // L'app si aspetta message.records array
  if (!message.records || message.records.length === 0) {
    // ERRORE: Nessun record trovato!
    return;
  }
  
  for (const record of message.records) {
    processRecord(record);
  }
});
```

### 2. Processamento Record

```typescript
if (record.recordType === 'text') {
  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
  const rawData = textDecoder.decode(record.data);
  
  // rawData deve essere JSON valido
  const nfcData = JSON.parse(rawData);
  
  // Estrae basketId
  const basketId = nfcData.basketId || nfcData.id;
  
  // Cerca cestello nel database
  searchBasket(basketId);
}
```

### 3. Parsing JSON (con pulizia prefisso)

```typescript
// Rimuove prefisso lingua se presente (es. "it" all'inizio)
let cleanData = rawData;
const jsonStart = rawData.indexOf('{');
if (jsonStart > 0) {
  cleanData = rawData.substring(jsonStart);
}

const nfcData = JSON.parse(cleanData);

// Normalizza campi (supporta entrambi i formati)
const basketId = nfcData.basketId || nfcData.id;
const physicalNumber = nfcData.physicalNumber || nfcData.num;
const currentCycleId = nfcData.currentCycleId || nfcData.cid;
const flupsyId = nfcData.flupsyId || nfcData.fid;
```

---

## 🎯 COSA FARE PER RISOLVERE

### Opzione A: Modificare l'app di scrittura (CONSIGLIATO)

**Assicurarsi che il tag venga scritto come:**

1. **NDEF Text Record** standard (non text/plain generico)
2. **Encoding UTF-8** senza prefisso lingua nel payload
3. **Lang: "en"** invece di "it" (o omettere del tutto)
4. **Payload JSON puro** senza caratteri extra all'inizio

**Esempio codice scrittura (pseudo-code):**
```javascript
const ndefMessage = {
  records: [
    {
      recordType: "text",
      lang: "en",
      encoding: "utf-8",
      data: JSON.stringify({
        basketId: 1,
        physicalNumber: 123,
        currentCycleId: 5,
        flupsyId: 220,
        version: "2.0"
      })
    }
  ]
};

await nfcWriter.write(ndefMessage);
```

### Opzione B: Test alternativo

Se la scrittura standard NDEF non funziona, provare:

1. **Record Type "url"** invece di "text"
2. **MIME Type "application/json"** invece di "text/plain"
3. Rimuovere completamente il prefisso lingua

---

## 📱 TEST CONSIGLIATO

### Scrivere tag di test:

**Tag 1 - Formato minimo:**
```json
{"basketId": 1, "physicalNumber": 1}
```

**Tag 2 - Formato completo:**
```json
{
  "basketId": 1,
  "physicalNumber": 1,
  "currentCycleId": 1,
  "flupsyId": 220,
  "version": "2.0"
}
```

**Tag 3 - Formato compatto:**
```json
{"id": 1, "num": 1, "cid": 1, "fid": 220, "v": "2.0"}
```

### Verificare con app FLUPSY:
1. Login con operatore (es. OP001 / test123)
2. Cliccare "Scansiona Tag NFC"
3. Avvicinare tag
4. ✅ Dovrebbe apparire il cestello con i dati

---

## 🔍 DEBUG

Se ancora non funziona, l'app mostrerà un **alert con dettagli del tag**:

```
🔍 DEBUG TAG NFC

RECORDS: [numero]
TYPE: [recordType]
ENCODING: [encoding]
DATA: [primi 200 caratteri]
```

Questo alert aiuta a capire esattamente come viene letto il tag.

---

## 📞 CONTATTI

Per ulteriori informazioni o test, contattare il team di sviluppo FLUPSY.

---

## 📝 NOTE TECNICHE

- **API usata:** Web NFC API (standard W3C)
- **Browser supportati:** Chrome/Edge Android (solo HTTPS)
- **Formato NDEF:** Compatibile con NFC Forum Type 2/4/5
- **Encoding:** UTF-8 standard senza BOM
- **Max payload:** 140 bytes consigliato per compatibilità USB Bridge

