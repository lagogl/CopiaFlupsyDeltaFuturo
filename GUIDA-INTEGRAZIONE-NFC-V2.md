# Guida Integrazione NFC v2.0 - Identificazione Univoca Cestelli

## 📋 Panoramica

Il sistema NFC è stato aggiornato per risolvere il problema dell'identificazione ambigua dei cestelli che condividono lo stesso numero fisico ma appartengono a cicli diversi. 

### 🚨 Problema Risolto
- **Prima (v1.0)**: Tag NFC identificavano cestelli solo tramite `basketId` o `physicalNumber`
- **Adesso (v2.0)**: Tag NFC utilizzano la combinazione `physicalNumber` + `currentCycleId` per identificazione univoca

## 🔄 Nuova Struttura Dati NFC

### Struttura Tag v2.0
```json
{
  "basketId": 1001,
  "physicalNumber": 1,
  "currentCycleId": 5,
  "flupsy": "Flupsy A",
  "flupsyId": 570,
  "position": 1,
  "row": "DX",
  "cycleCode": "C-5",
  "sizeClass": "TP-500",
  "lastWeight": 15.3,
  "count": 5000,
  "type": "basket-tag",
  "version": "2.0",
  "timestamp": 1755680890000
}
```

### Campi Critici per l'Identificazione

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `physicalNumber` | `number` | ✅ | Numero fisico del cestello |
| `currentCycleId` | `number` | ✅ | ID del ciclo corrente |
| `basketId` | `number` | ⚠️ | Per compatibilità v1.0 |
| `version` | `string` | ✅ | Versione del formato dati |

## 🔗 Endpoint API Aggiornato

### Nuovo Endpoint: `/api/baskets/find-by-nfc`

**Metodo**: `GET`

#### Parametri di Ricerca

##### Metodo Preferito (v2.0)
```
GET /api/baskets/find-by-nfc?physicalNumber=1&currentCycleId=5
```

##### Metodo di Compatibilità (v1.0)
```
GET /api/baskets/find-by-nfc?basketId=1001
```

#### Risposte

##### ✅ Successo (200)
```json
{
  "success": true,
  "basket": {
    "id": 1001,
    "physicalNumber": 1,
    "currentCycleId": 5,
    "flupsyId": 570,
    "row": "DX",
    "position": 1,
    "state": "active",
    "nfcData": "...",
    "cycleCode": "C-5"
  },
  "identificationMethod": "physicalNumber+currentCycleId",
  "version": "2.0"
}
```

##### ❌ Cestello Non Trovato (404)
```json
{
  "success": false,
  "error": "Nessun cestello trovato per la combinazione physicalNumber+currentCycleId",
  "physicalNumber": 1,
  "currentCycleId": 99
}
```

##### ⚠️ Errore di Integrità (409)
```json
{
  "success": false,
  "error": "Trovati cestelli multipli per la combinazione physicalNumber+currentCycleId (errore di integrità dati)",
  "physicalNumber": 1,
  "currentCycleId": 5,
  "foundCount": 2
}
```

##### 🚫 Parametri Insufficienti (400)
```json
{
  "success": false,
  "error": "Parametri insufficienti. Fornire basketId oppure physicalNumber+currentCycleId",
  "receivedParams": {
    "basketId": null,
    "physicalNumber": 1,
    "currentCycleId": null
  }
}
```

## 📱 Implementazione Lato Mobile

### Algoritmo di Identificazione Consigliato

```javascript
async function identifyBasketFromNFC(nfcData) {
  // 1. Verifica la versione del tag
  const version = nfcData.version || '1.0';
  
  // 2. Estrai i dati necessari
  const { physicalNumber, currentCycleId, basketId } = nfcData;
  
  // 3. Prova prima il metodo v2.0 (preferito)
  if (physicalNumber !== undefined && currentCycleId !== undefined) {
    try {
      const response = await fetch(
        `/api/baskets/find-by-nfc?physicalNumber=${physicalNumber}&currentCycleId=${currentCycleId}`
      );
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          basket: result.basket,
          method: 'v2.0-unique',
          version: '2.0'
        };
      }
      
      // Se non trovato con v2.0, potrebbe essere un problema di sincronizzazione
      if (response.status === 404) {
        console.warn(`Cestello #${physicalNumber} ciclo ${currentCycleId} non trovato - possibile problema di sincronizzazione`);
      }
      
    } catch (error) {
      console.error('Errore ricerca v2.0:', error);
    }
  }
  
  // 4. Fallback al metodo v1.0 per compatibilità
  if (basketId !== undefined) {
    try {
      const response = await fetch(
        `/api/baskets/find-by-nfc?basketId=${basketId}`
      );
      
      if (response.ok) {
        const result = await response.json();
        
        // ATTENZIONE: Avvisa che stiamo usando identificazione legacy
        console.warn(`Utilizzata identificazione legacy per cestello ID ${basketId} - considera aggiornamento tag`);
        
        return {
          success: true,
          basket: result.basket,
          method: 'v1.0-legacy',
          version: '1.0',
          needsUpdate: true // Flag per indicare che il tag dovrebbe essere aggiornato
        };
      }
      
    } catch (error) {
      console.error('Errore ricerca v1.0:', error);
    }
  }
  
  // 5. Nessun metodo ha funzionato
  return {
    success: false,
    error: 'Impossibile identificare il cestello con i dati del tag NFC',
    nfcData
  };
}
```

### Gestione degli Errori

```javascript
function handleBasketIdentificationError(error, nfcData) {
  switch (error.status) {
    case 404:
      return {
        message: "Cestello non trovato nel sistema",
        action: "Verifica che il cestello sia stato registrato correttamente",
        severity: "warning"
      };
      
    case 409:
      return {
        message: "Rilevati cestelli duplicati - errore di integrità dati",
        action: "Contatta l'amministratore di sistema",
        severity: "error"
      };
      
    case 400:
      return {
        message: "Dati del tag NFC incompleti o corrotti",
        action: "Riprogramma il tag NFC con dati completi",
        severity: "warning"
      };
      
    default:
      return {
        message: "Errore di comunicazione con il server",
        action: "Riprova la scansione o verifica la connessione",
        severity: "error"
      };
  }
}
```

## 🔄 Migrazione da v1.0 a v2.0

### Rilevamento Automatico Versione
```javascript
function detectNFCVersion(nfcData) {
  if (nfcData.version === '2.0' || 
      (nfcData.physicalNumber !== undefined && nfcData.currentCycleId !== undefined)) {
    return '2.0';
  }
  
  if (nfcData.basketId !== undefined) {
    return '1.0';
  }
  
  return 'unknown';
}
```

### Strategia di Aggiornamento Tag
```javascript
async function upgradeTagIfNeeded(nfcData, basketData) {
  const version = detectNFCVersion(nfcData);
  
  if (version === '1.0') {
    // Proponi aggiornamento del tag
    const shouldUpgrade = await confirmTagUpgrade(nfcData.basketId);
    
    if (shouldUpgrade) {
      const newTagData = {
        basketId: basketData.id,
        physicalNumber: basketData.physicalNumber,
        currentCycleId: basketData.currentCycleId,
        flupsyId: basketData.flupsyId,
        // ... altri campi
        version: '2.0',
        timestamp: Date.now()
      };
      
      const success = await writeNFCTag(newTagData);
      
      if (success) {
        showMessage("Tag aggiornato alla versione 2.0 con identificazione univoca");
      }
    }
  }
}
```

## ⚠️ Considerazioni Importanti

### 1. **Validazione Dati**
- Verifica sempre che `physicalNumber` e `currentCycleId` siano presenti e validi
- Gestisci il caso in cui il cestello potrebbe essere stato spostato a un nuovo ciclo

### 2. **Sincronizzazione**
- I dati NFC potrebbero non essere sempre sincronizzati con il database
- Implementa una strategia di refresh per dati obsoleti

### 3. **Performance**
- L'endpoint `/api/baskets/find-by-nfc` è ottimizzato per ricerche rapide
- Usa cache locale quando possibile per ridurre le chiamate API

### 4. **Backward Compatibility**
- Mantieni supporto per tag v1.0 durante il periodo di transizione
- Proponi aggiornamenti automatici quando possibile

## 🧪 Testing

### Scenari di Test Critici

1. **Tag v2.0 con dati validi**
   - physicalNumber=1, currentCycleId=5 → cestello trovato
   
2. **Tag v1.0 legacy**
   - basketId=1001 → cestello trovato con avviso compatibilità
   
3. **Cestelli duplicati (stesso numero fisico)**
   - physicalNumber=1, currentCycleId=5 → cestello A
   - physicalNumber=1, currentCycleId=3 → cestello B diverso
   
4. **Dati corrotti/incompleti**
   - Gestione errori appropriata
   
5. **Cestello non presente**
   - Messaggio di errore chiaro

## 📞 Supporto

Per domande o problemi di integrazione:
- **API Issues**: Verificare endpoint `/api/baskets/find-by-nfc`
- **Dati NFC**: Controllare presenza campi `physicalNumber` e `currentCycleId`
- **Errori 409**: Contattare amministratore per integrità dati

---

**Versione Documento**: 1.0  
**Data**: Agosto 2025  
**Compatibilità**: Sistema FLUPSY v2.0+