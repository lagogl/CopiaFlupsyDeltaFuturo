# Guida all'integrazione delle API Esterne per il sistema FLUPSY

Questa guida fornisce istruzioni dettagliate per integrare correttamente le API esterne del sistema FLUPSY nella vostra applicazione.

## Informazioni generali

- **URL Base API**: `https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external`
- **Chiave API**: `flupsy-api-key-2025`

## Metodi di autenticazione

Sono supportati tre diversi metodi di autenticazione. È possibile utilizzare uno qualsiasi dei seguenti:

1. **Header Authorization**:
   ```
   Authorization: Bearer flupsy-api-key-2025
   ```

2. **Header X-API-Key**:
   ```
   X-API-Key: flupsy-api-key-2025
   ```

3. **Query Parameter**:
   ```
   ?apiKey=flupsy-api-key-2025
   ```

Nota: Per alcune richieste POST, è necessario includere anche il parametro `apiKey` nel corpo della richiesta, come documentato di seguito.

## Endpoint disponibili

### 1. Stato del servizio

- **Endpoint**: `/status`
- **Metodo**: GET
- **Esempio di risposta**:
  ```json
  {
    "status": "online",
    "message": "API esterne disponibili",
    "timestamp": "2025-05-04T19:14:36.427Z"
  }
  ```

### 2. Cestelli disponibili per la vendita

- **Endpoint**: `/sales/available-baskets`
- **Metodo**: GET
- **Esempio di risposta**:
  ```json
  {
    "success": true,
    "baskets": [
      {
        "id": 52,
        "physicalNumber": 8,
        "flupsyId": 737,
        "cycleId": 39,
        "state": "active",
        "cycle": {
          "id": 39,
          "basketId": 52,
          "startDate": "2025-04-29",
          "endDate": null,
          "state": "active"
        },
        "lot": {
          "id": 33,
          "arrivalDate": "2025-04-23",
          "supplier": "Zeeland",
          "supplierLotNumber": "4",
          "quality": "code",
          "animalCount": 1679057,
          "weight": 210,
          "sizeId": 5,
          "notes": "201 Appsheet Ca Pisani",
          "state": "active"
        },
        "size": {
          "id": 5,
          "code": "TP-450",
          "name": "TP-450",
          "sizeMm": null,
          "minAnimalsPerKg": 5000001,
          "maxAnimalsPerKg": 7600000,
          "notes": "",
          "color": "#2dd4bf"
        },
        "lastMeasurement": {
          "id": 42,
          "date": "2025-04-29",
          "type": "prima-attivazione",
          "basketId": 52,
          "cycleId": 39,
          "sizeId": 5,
          "sgrId": null,
          "lotId": 33,
          "animalCount": 460460,
          "totalWeight": 79.389656,
          "animalsPerKg": 5800000,
          "averageWeight": 0.1724138,
          "deadCount": null,
          "mortalityRate": null,
          "notes": "3943 Appsheet Ca Pisani (Delta futuro)",
          "metadata": null
        }
      }
    ]
  }
  ```

### 3. Dettaglio lotto

- **Endpoint**: `/lots/:id`
- **Metodo**: GET
- **Parametri URL**: 
  - `id`: ID numerico del lotto
- **Esempio di risposta**:
  ```json
  {
    "success": true,
    "lot": {
      "id": 33,
      "arrivalDate": "2025-04-23",
      "supplier": "Zeeland",
      "supplierLotNumber": "4",
      "quality": "code",
      "animalCount": 1679057,
      "weight": 210,
      "sizeId": 5,
      "notes": "201 Appsheet Ca Pisani",
      "state": "active"
    },
    "activeBasketCount": 5,
    "activeCycles": [
      {
        "cycle": {
          "id": 35,
          "basketId": 48,
          "startDate": "2025-04-29",
          "endDate": null,
          "state": "active"
        },
        "basket": {
          "id": 48,
          "physicalNumber": 4,
          "flupsyId": 737,
          "cycleCode": "4-737-2504",
          "state": "active",
          "currentCycleId": 35,
          "nfcData": null,
          "row": "DX",
          "position": 4
        }
      }
    ]
  }
  ```

### 4. Cronologia vendite

- **Endpoint**: `/sales/history`
- **Metodo**: GET
- **Esempio di risposta**:
  ```json
  {
    "success": true,
    "salesHistory": []
  }
  ```

### 5. Registrazione di una vendita

- **Endpoint**: `/sales/create`
- **Metodo**: POST
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer flupsy-api-key-2025` (o altro metodo di autenticazione)
- **Corpo della richiesta**:
  ```json
  {
    "apiKey": "flupsy-api-key-2025",
    "date": "2025-05-04",
    "basketIds": [52],
    "buyerName": "Cliente Test API",
    "buyerEmail": "test@example.com",
    "buyerPhone": "123456789",
    "price": 150.00,
    "notes": "Vendita di test tramite API esterna"
  }
  ```
- **Campi richiesti**:
  - `apiKey`: Chiave API (anche se fornita tramite header)
  - `date`: Data della vendita in formato YYYY-MM-DD
  - `basketIds`: Array contenente gli ID dei cestelli da vendere
  - `buyerName`: Nome dell'acquirente
- **Campi opzionali**:
  - `buyerEmail`: Email dell'acquirente
  - `buyerPhone`: Telefono dell'acquirente
  - `price`: Prezzo di vendita
  - `notes`: Note sulla vendita
- **Esempio di risposta**:
  ```json
  {
    "success": true,
    "message": "Operazioni di vendita create con successo per 1 cestelli",
    "operations": [
      {
        "id": 51,
        "date": "2025-05-04",
        "type": "vendita",
        "basketId": 52,
        "cycleId": 39,
        "sizeId": null,
        "sgrId": null,
        "lotId": 33,
        "animalCount": null,
        "totalWeight": null,
        "animalsPerKg": null,
        "averageWeight": null,
        "deadCount": null,
        "mortalityRate": null,
        "notes": "Vendita di test tramite API esterna  ",
        "metadata": "{\"externalTransactionId\":\"78e42db4-9cdb-43b8-8a24-75e4e7383ce8\"}"
      }
    ],
    "transactionId": "78e42db4-9cdb-43b8-8a24-75e4e7383ce8"
  }
  ```

## Gestione degli errori

Le risposte di errore hanno la seguente struttura:

```json
{
  "success": false,
  "message": "Descrizione dell'errore",
  "errors": [
    {
      "code": "codice_errore",
      "message": "messaggio dettagliato"
    }
  ]
}
```

### Codici di stato HTTP comuni

- `200`: Richiesta completata con successo
- `201`: Risorsa creata con successo
- `400`: Richiesta non valida (errori nei parametri o nel corpo)
- `401`: Non autorizzato (chiave API non valida o mancante)
- `404`: Risorsa non trovata
- `500`: Errore interno del server

## Esempio di codice JavaScript

```javascript
// Esempio di funzione per effettuare richieste API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const API_KEY = 'flupsy-api-key-2025';
  const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`API ha risposto con codice ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error.message);
    throw error;
  }
}

// Esempio di creazione di una vendita
async function createSale() {
  const API_KEY = 'flupsy-api-key-2025';
  
  // 1. Ottieni cestelli disponibili
  const basketsResponse = await apiRequest('/sales/available-baskets');
  
  if (!basketsResponse.success || !basketsResponse.baskets.length) {
    console.error('Nessun cestello disponibile per la vendita');
    return;
  }
  
  // 2. Seleziona un cestello (in questo esempio, il primo disponibile)
  const basketToSell = basketsResponse.baskets[0];
  
  // 3. Crea la vendita
  const saleData = {
    apiKey: API_KEY,
    date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
    basketIds: [basketToSell.id],
    buyerName: "Cliente Demo",
    buyerEmail: "cliente@esempio.com",
    buyerPhone: "123456789",
    price: 150.00,
    notes: "Vendita demo"
  };
  
  const saleResponse = await apiRequest('/sales/create', 'POST', saleData);
  console.log('Vendita creata:', saleResponse);
  return saleResponse;
}
```

## Note importanti

1. È obbligatorio includere il campo `apiKey` nel corpo delle richieste POST, anche se la chiave API è già stata fornita tramite header o query parameter.

2. Per creare una vendita, bisogna utilizzare l'ID del cestello (`basketId`) che si trova nell'elenco dei cestelli disponibili.

3. Le operazioni di vendita vengono registrate nel sistema come operazioni di tipo "vendita".

4. Ogni operazione di vendita genera un ID transazione univoco (`transactionId`) che può essere utilizzato per tracciare la vendita.

## Supporto

Per domande o problemi relativi all'integrazione delle API, contattare il supporto tecnico.