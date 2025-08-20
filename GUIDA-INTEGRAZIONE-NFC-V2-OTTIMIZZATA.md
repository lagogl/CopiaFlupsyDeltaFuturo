# Guida Integrazione NFC v2.0 OTTIMIZZATA - Identificazione Univoca con Dati Minimi

## 📋 Panoramica

Il sistema NFC v2.0 è stato ottimizzato per scrivere **solo i dati essenziali** per l'identificazione univoca nel tag NFC. Tutti i dati operativi (pesi, conteggi, taglie, etc.) vengono recuperati via API al momento della lettura del tag.

### 🎯 Vantaggi dell'Approccio Ottimizzato

- ✅ **Tag più piccoli**: Scrittura e lettura più veloci
- ✅ **Dati sempre aggiornati**: L'app recupera dati real-time via API
- ✅ **Nessuna riprogrammazione**: I tag restano validi anche quando cambiano i dati operativi
- ✅ **Ridotta complessità**: Focus solo sull'identificazione univoca

## 🔄 Nuova Struttura Dati NFC v2.0 OTTIMIZZATA

### Struttura Tag Ottimizzata
```json
{
  "basketId": 17,
  "physicalNumber": 7,
  "currentCycleId": 3,
  "id": 17,
  "number": 7,
  "serialNumber": "04:42:f2:6b:5f:61:80",
  "redirectTo": "https://app.domain.com/nfc-scan/basket/17",
  "timestamp": "2025-08-20T09:45:00.000Z",
  "type": "basket-tag",
  "version": "2.0"
}
```

### Campi del Tag NFC

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `basketId` | `number` | ✅ | ID univoco del cestello nel database |
| `physicalNumber` | `number` | ✅ | Numero fisico del cestello |
| `currentCycleId` | `number\|null` | ✅ | ID del ciclo corrente (null se disponibile) |
| `id` | `number` | ✅ | Compatibilità legacy v1.0 |
| `number` | `number` | ✅ | Compatibilità legacy v1.0 |
| `serialNumber` | `string` | ✅ | Serial number hardware del tag NFC |
| `redirectTo` | `string` | ✅ | URL di fallback per browser web |
| `timestamp` | `string` | ✅ | Timestamp di programmazione del tag |
| `type` | `string` | ✅ | Sempre "basket-tag" |
| `version` | `string` | ✅ | Versione formato dati ("2.0") |

## 🔗 Endpoint API per Recupero Dati

### Endpoint Principale: `/api/baskets/find-by-nfc`

**Metodo**: `GET`

#### Ricerca con Metodo v2.0 (Preferito)
```
GET /api/baskets/find-by-nfc?physicalNumber=7&currentCycleId=3
```

#### Ricerca con Metodo v1.0 (Compatibilità)
```
GET /api/baskets/find-by-nfc?basketId=17
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
  
  if (physicalNumber !== undefined && currentCycleId !== undefined) {
    // Metodo v2.0 preferito
    apiUrl = `/api/baskets/find-by-nfc?physicalNumber=${physicalNumber}&currentCycleId=${currentCycleId}`;
    identificationMethod = 'v2.0-unique';
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

### 1. Tag v2.0 Cestello Attivo
```json
{
  "basketId": 17,
  "physicalNumber": 7,
  "currentCycleId": 3,
  "version": "2.0"
}
```
**Risultato**: Cestello trovato, dati completi recuperati via API

### 2. Tag v2.0 Cestello Disponibile
```json
{
  "basketId": 7,
  "physicalNumber": 7,
  "currentCycleId": null,
  "version": "2.0"
}
```
**Risultato**: Cestello disponibile identificato correttamente

### 3. Tag v1.0 Legacy
```json
{
  "basketId": 17,
  "id": 17,
  "number": 7
}
```
**Risultato**: Compatibilità v1.0, avviso per aggiornamento tag

### 4. Cestelli con Stesso Numero Fisico
```json
// Tag A
{"physicalNumber": 7, "currentCycleId": 3}
// Tag B  
{"physicalNumber": 7, "currentCycleId": null}
```
**Risultato**: Identificazione univoca corretta per entrambi

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
- **Cestello non trovato**: Controlla sincronizzazione database
- **Errori 409**: Segnala duplicati per correzione integrità dati

---

**Versione Documento**: 2.0 Ottimizzata  
**Data**: Agosto 2025  
**Compatibilità**: Sistema FLUPSY v2.0+ con endpoint `/api/baskets/find-by-nfc`