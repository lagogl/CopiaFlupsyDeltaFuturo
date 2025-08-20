# Guida Integrazione NFC v2.0 FINALE - Identificazione Univoca per Cestelli Attivi

## 📋 Panoramica

Il sistema NFC v2.0 FINALE è stato ottimizzato per garantire l'identificazione univoca dei cestelli attraverso tag NFC minimi ma completi. **Solo i cestelli con ciclo attivo vengono programmati**, garantendo che ogni tag contenga sempre un ciclo valido per l'identificazione univoca.

### 🎯 Principi Fondamentali

- ✅ **Solo cestelli attivi**: Solo cestelli con `state = "active"` e `currentCycleId` valido possono essere programmati
- ✅ **Identificazione univoca garantita**: Combinazione `physicalNumber + currentCycleId + flupsyId + position`
- ✅ **Tag compatti**: Solo dati essenziali per identificazione, tutto il resto via API
- ✅ **Dati sempre aggiornati**: L'app recupera dati operativi real-time dal database
- ✅ **Nessuna ambiguità**: Impossibile avere cestelli con stesso numero senza distinguerli

## 🔄 Struttura Dati NFC v2.0 FINALE

### Struttura Tag Finale (Solo Cestelli Attivi)
```json
{
  "basketId": 17,
  "physicalNumber": 7,
  "currentCycleId": 3,
  "flupsyId": 113,
  "position": 7,
  "id": 17,
  "number": 7,
  "serialNumber": "04:42:f2:6b:5f:61:80",
  "redirectTo": "https://app.domain.com/cycles/3",
  "timestamp": "2025-08-20T10:15:00.000Z",
  "type": "basket-tag",
  "version": "2.0"
}
```

### ⚠️ IMPORTANTE: Solo Cestelli Attivi
Il sistema programma **esclusivamente** cestelli con:
- `state = "active"` nel database
- `currentCycleId` valido (non null)
- Almeno una operazione di "prima-attivazione"

### Campi del Tag NFC

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `basketId` | `number` | ✅ | ID univoco del cestello nel database |
| `physicalNumber` | `number` | ✅ | Numero fisico del cestello |
| `currentCycleId` | `number` | ✅ | ID del ciclo corrente (SEMPRE presente) |
| `flupsyId` | `number` | ✅ | ID del FLUPSY contenitore |
| `position` | `number` | ✅ | Posizione del cestello nel FLUPSY |
| `id` | `number` | ✅ | Compatibilità legacy v1.0 |
| `number` | `number` | ✅ | Compatibilità legacy v1.0 |
| `serialNumber` | `string` | ✅ | Serial number hardware del tag NFC |
| `redirectTo` | `string` | ✅ | URL diretto al ciclo attivo |
| `timestamp` | `string` | ✅ | Timestamp di programmazione del tag |
| `type` | `string` | ✅ | Sempre "basket-tag" |
| `version` | `string` | ✅ | Versione formato dati ("2.0") |

### 🔑 Chiave di Identificazione Univoca
L'identificazione univoca è garantita dalla combinazione:
```
physicalNumber + currentCycleId + flupsyId + position
```
Questo permette di distinguere cestelli con stesso numero fisico ma in FLUPSY diversi o cicli diversi.

## 🔗 Endpoint API per Recupero Dati

### Endpoint Principale: `/api/baskets/find-by-nfc`

**Metodo**: `GET`

#### Ricerca con Metodo v2.0 (Preferito - Identificazione Univoca)
```
GET /api/baskets/find-by-nfc?physicalNumber=7&currentCycleId=3&flupsyId=113
```

#### Ricerca con Metodo v1.0 (Compatibilità)
```
GET /api/baskets/find-by-nfc?basketId=17
```

#### Parametri Aggiuntivi (Opzionali per Validazione)
```
GET /api/baskets/find-by-nfc?physicalNumber=7&currentCycleId=3&flupsyId=113&position=7
```

#### Risposta Completa
```json
{
  "success": true,
  "basket": {
    "id": 17,
    "physicalNumber": 7,
    "currentCycleId": 3,
    "flupsyId": 113,
    "flupsyName": "Flupsy 1 Alluminio",
    "row": "DX",
    "position": 7,
    "state": "active",
    "cycleCode": "7-113-2508",
    "nfcData": "04:42:f2:6b:5f:61:80",
    "flupsy": {
      "id": 113,
      "name": "Flupsy 1 Alluminio",
      "location": "Ca Pisani",
      "maxPositions": 20
    },
    "lastOperation": {
      "id": 5,
      "date": "2025-08-20",
      "type": "misura",
      "animalCount": 5100000,
      "totalWeight": 15000,
      "animalsPerKg": 340000,
      "averageWeight": 2.94,
      "mortalityRate": 1.02
    },
    "currentCycle": {
      "id": 3,
      "startDate": "2025-08-04",
      "state": "active"
    },
    "size": {
      "id": 11,
      "code": "TP-1260",
      "name": "TP-1260"
    }
  },
  "identificationMethod": "physicalNumber+currentCycleId",
  "version": "2.0"
}
```

## 📱 Implementazione Lato Mobile

### Algoritmo di Lettura e Recupero Dati

```javascript
async function processNFCTag(nfcData) {
  // 1. Estrai dati essenziali dal tag
  const { basketId, physicalNumber, currentCycleId, version } = nfcData;
  
  console.log(`📱 Tag NFC letto: basketId=${basketId}, physicalNumber=${physicalNumber}, currentCycleId=${currentCycleId}, version=${version}`);
  
  // 2. Determina metodo di identificazione
  let apiUrl;
  let identificationMethod;
  
  if (physicalNumber !== undefined && currentCycleId !== undefined && flupsyId !== undefined) {
    // Metodo v2.0 preferito - Identificazione univoca completa
    apiUrl = `/api/baskets/find-by-nfc?physicalNumber=${physicalNumber}&currentCycleId=${currentCycleId}&flupsyId=${flupsyId}`;
    if (position !== undefined) {
      apiUrl += `&position=${position}`;
    }
    identificationMethod = 'v2.0-complete';
  } else if (physicalNumber !== undefined && currentCycleId !== undefined) {
    // Metodo v2.0 base
    apiUrl = `/api/baskets/find-by-nfc?physicalNumber=${physicalNumber}&currentCycleId=${currentCycleId}`;
    identificationMethod = 'v2.0-basic';
    console.warn(`⚠️ Identificazione v2.0 senza flupsyId - potenziali ambiguità`);
  } else if (basketId !== undefined) {
    // Fallback v1.0
    apiUrl = `/api/baskets/find-by-nfc?basketId=${basketId}`;
    identificationMethod = 'v1.0-legacy';
    console.warn(`⚠️ Usando identificazione legacy per basketId ${basketId}`);
  } else {
    throw new Error('Dati NFC insufficienti per identificazione');
  }
  
  // 3. Recupera dati completi via API
  try {
    console.log(`🔍 Chiamata API: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore API');
    }
    
    const result = await response.json();
    
    // 4. Restituisci dati completi
    return {
      success: true,
      basket: result.basket,
      identificationMethod: result.identificationMethod,
      version: result.version,
      tagVersion: version || '1.0',
      needsUpdate: identificationMethod === 'v1.0-legacy'
    };
    
  } catch (error) {
    console.error('❌ Errore recupero dati cestello:', error);
    
    return {
      success: false,
      error: error.message,
      nfcData,
      identificationMethod
    };
  }
}
```

### Esempio Completo di Utilizzo

```javascript
// Quando viene letto un tag NFC
async function onNFCTagRead(tagData) {
  try {
    // Mostra loading
    showLoading('Identificazione cestello...');
    
    // Processa il tag e recupera dati
    const result = await processNFCTag(tagData);
    
    if (result.success) {
      const { basket, identificationMethod, needsUpdate } = result;
      
      // Mostra dati del cestello
      displayBasketInfo(basket);
      
      // Avvisa se il tag dovrebbe essere aggiornato
      if (needsUpdate) {
        showWarning(`Tag utilizzando identificazione legacy. Considera di riprogrammare il tag per migliorare le prestazioni.`);
      }
      
      // Log per debugging
      console.log(`✅ Cestello identificato: #${basket.physicalNumber} (ID: ${basket.id})`);
      console.log(`🔧 Metodo: ${identificationMethod}`);
      console.log(`📊 Stato: ${basket.state}, Ciclo: ${basket.currentCycleId || 'Nessuno'}`);
      
    } else {
      // Gestisci errore
      handleBasketError(result.error, result.nfcData);
    }
    
  } catch (error) {
    console.error('💥 Errore generale lettura NFC:', error);
    showError('Errore durante la lettura del tag NFC');
  } finally {
    hideLoading();
  }
}

function displayBasketInfo(basket) {
  const info = `
    🏷️ Cestello #${basket.physicalNumber}
    🏭 FLUPSY: ${basket.flupsy?.name || 'N/D'}
    📍 Posizione: ${basket.row} ${basket.position}
    🔄 Stato: ${basket.state}
    
    ${basket.lastOperation ? `
    📊 Ultima Operazione:
    📅 Data: ${basket.lastOperation.date}
    ⚖️ Peso: ${basket.lastOperation.totalWeight} kg
    🦐 Animali: ${basket.lastOperation.animalCount.toLocaleString()}
    📏 Media: ${basket.lastOperation.averageWeight} g
    ` : '📊 Nessuna operazione registrata'}
  `;
  
  showBasketDetails(info);
}
```

### Gestione degli Errori

```javascript
function handleBasketError(error, nfcData) {
  const errorMappings = {
    'Nessun cestello trovato': {
      message: 'Cestello non registrato nel sistema',
      action: 'Verifica che il cestello sia stato inserito correttamente nel database',
      severity: 'warning'
    },
    'Trovati cestelli multipli': {
      message: 'Errore di integrità dati - cestelli duplicati',
      action: 'Contatta l\'amministratore di sistema',
      severity: 'error'
    },
    'Parametri insufficienti': {
      message: 'Tag NFC corrotto o formato non valido',
      action: 'Riprogramma il tag NFC',
      severity: 'warning'
    }
  };
  
  const errorInfo = Object.keys(errorMappings).find(key => error.includes(key));
  const mapping = errorMappings[errorInfo] || {
    message: 'Errore sconosciuto durante l\'identificazione',
    action: 'Riprova o contatta il supporto',
    severity: 'error'
  };
  
  showError(mapping.message, mapping.action, mapping.severity);
  
  // Log dettagliato per debugging
  console.error('🔍 Dettagli errore:', {
    error,
    nfcData,
    mapping
  });
}
```

## 🧪 Scenari di Test

### 1. Tag v2.0 Cestello Attivo (Standard)
```json
{
  "basketId": 17,
  "physicalNumber": 7,
  "currentCycleId": 3,
  "flupsyId": 113,
  "position": 7,
  "version": "2.0"
}
```
**Risultato**: Cestello attivo identificato univocamente, dati completi recuperati via API

### 2. Tag v2.0 Cestelli con Stesso Numero Fisico
```json
// Cestello A - FLUPSY 113, Ciclo 3
{"physicalNumber": 7, "currentCycleId": 3, "flupsyId": 113, "position": 7}
// Cestello B - FLUPSY 570, Ciclo 5  
{"physicalNumber": 7, "currentCycleId": 5, "flupsyId": 570, "position": 2}
```
**Risultato**: Identificazione univoca corretta per entrambi grazie a `currentCycleId + flupsyId + position`

### 3. Tag v1.0 Legacy
```json
{
  "basketId": 17,
  "id": 17,
  "number": 7
}
```
**Risultato**: Compatibilità v1.0, avviso per aggiornamento tag

### 4. Cestelli Disponibili (NON PROGRAMMABILI)
```json
// Cestello disponibile - NON verrà mai programmato
{
  "basketId": 7,
  "physicalNumber": 7,
  "state": "available",
  "currentCycleId": null
}
```
**Risultato**: ❌ **Errore di programmazione** - "Il cestello #7 non è attivo. Solo i cestelli attivi possono essere programmati con un ciclo."

## ⚙️ Configurazione API

### URL Base
```javascript
const API_BASE_URL = 'https://your-app.replit.app';
```

### Headers Richiesti
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### Timeout Consigliato
```javascript
const TIMEOUT = 10000; // 10 secondi
```

## 🔄 Migrazione da Struttura Completa

Se stai migrando da tag NFC che contenevano tutti i dati:

1. **Rilevamento automatico**: L'app deve riconoscere entrambi i formati
2. **Transizione graduale**: I vecchi tag continueranno a funzionare
3. **Riprogrammazione progressiva**: Aggiorna i tag quando necessario
4. **Monitoraggio**: Traccia l'utilizzo di tag legacy vs ottimizzati

## 📞 Supporto Tecnico

### Debugging
- Abilita logging dettagliato per tracciare identificazione
- Verifica sempre la risposta dell'endpoint `/api/baskets/find-by-nfc`
- Monitora performance delle chiamate API

### Problemi Comuni
- **Tag non leggibile**: Verifica formato JSON e campi obbligatori
- **Cestello non trovato**: Controlla che il cestello sia attivo nel database
- **currentCycleId null**: Il cestello non è attivo - verifica stato in tabella baskets
- **Errori 409**: Segnala duplicati per correzione integrità dati
- **Ambiguità identificazione**: Usa sempre `flupsyId` e `position` per cestelli con stesso `physicalNumber`

### ⚠️ Importante per lo Sviluppatore
**TUTTI i tag NFC contengono sempre un `currentCycleId` valido** perché:
1. Solo cestelli attivi vengono programmati
2. Cestelli attivi hanno sempre un ciclo corrente
3. Non esistono tag con `currentCycleId = null` nel sistema v2.0

Se incontri un tag con `currentCycleId = null`, è un tag legacy v1.0 da aggiornare.

## 📊 Riepilogo Modifiche v2.0 FINALE

### Cosa è Cambiato
1. **Cessazione programmazione cestelli disponibili**: Solo cestelli `state = "active"` vengono programmati
2. **currentCycleId sempre presente**: Nessun tag v2.0 avrà mai `currentCycleId = null`
3. **Identificazione univoca potenziata**: Aggiunta `flupsyId` e `position` ai dati del tag
4. **Validazione rigorosa**: Sistema rifiuta cestelli senza ciclo attivo

### Impatti per l'App Mobile
1. **Gestione errori migliorata**: Distinzione tra cestelli non trovati e cestelli non attivi
2. **Identificazione più robusta**: Meno probabilità di conflitti tra cestelli
3. **Validazione automatica**: Il server garantisce che ogni tag sia sempre valido
4. **Backward compatibility**: I tag v1.0 continuano a funzionare

---

**Versione Documento**: 2.0 FINALE  
**Data**: Agosto 2025  
**Compatibilità**: Sistema FLUPSY v2.0+ con validazione cestelli attivi  
**Endpoint**: `/api/baskets/find-by-nfc` con supporto identificazione univoca