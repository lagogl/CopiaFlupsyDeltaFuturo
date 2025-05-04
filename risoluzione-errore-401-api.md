# Risoluzione dell'errore 401 Unauthorized con le API Esterne FLUPSY

Se stai riscontrando un errore 401 (Unauthorized) quando tenti di accedere alle API esterne del sistema FLUPSY, segui questa guida per identificare e risolvere il problema.

## Possibili cause e soluzioni

### 1. API Key errata o mancante

**Problema**: La chiave API utilizzata non è corretta o è mancante.

**Soluzione**: Verifica di utilizzare la chiave API corretta: `flupsy-api-key-2025`

**Esempio corretto**:
```javascript
const API_KEY = 'flupsy-api-key-2025';
```

### 2. Formato dell'header di autorizzazione errato

**Problema**: L'header di autorizzazione non è nel formato corretto.

**Soluzione**: Assicurati che l'header di autorizzazione sia nel formato corretto, incluso lo spazio dopo "Bearer".

**Formato corretto**:
```
Authorization: Bearer flupsy-api-key-2025
```

**Esempi errati da evitare**:
```
Authorization: Bearerflupsy-api-key-2025
Authorization:Bearer flupsy-api-key-2025
Authorization: bearer flupsy-api-key-2025
```

**Implementazione corretta in JavaScript**:
```javascript
const options = {
  headers: {
    'Authorization': `Bearer ${API_KEY}`  // Nota lo spazio dopo "Bearer"
  }
};
```

### 3. API Key mancante nel corpo della richiesta POST

**Problema**: Nelle richieste POST, anche se l'API key è presente nell'header, è necessario includerla anche nel corpo della richiesta.

**Soluzione**: Aggiungi sempre il campo `apiKey` nel corpo JSON delle richieste POST.

**Esempio corretto**:
```javascript
const saleData = {
  apiKey: 'flupsy-api-key-2025',  // Necessario anche se presente nell'header
  date: '2025-05-04',
  basketIds: [52],
  buyerName: 'Cliente Test'
  // altri campi...
};

fetch('/api/external/sales/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(saleData)
});
```

### 4. Errori di CORS (nel browser)

**Problema**: Se stai facendo richieste direttamente dal browser, potresti riscontrare problemi di CORS (Cross-Origin Resource Sharing).

**Soluzione**: Implementa un proxy sul tuo server che inoltri le richieste alle API esterne.

**Esempio di implementazione proxy in Express.js**:
```javascript
// Nel tuo file server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = 'flupsy-api-key-2025';
const API_BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';

// Middleware per analizzare i corpi JSON delle richieste
app.use(express.json());

// Proxy GET
app.get('/api/proxy/*', async (req, res) => {
  try {
    const path = req.params[0];
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Proxy POST
app.post('/api/proxy/*', async (req, res) => {
  try {
    const path = req.params[0];
    
    // Aggiungi apiKey al corpo della richiesta
    const body = {
      ...req.body,
      apiKey: API_KEY
    };
    
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server proxy in esecuzione sulla porta 3000');
});
```

Poi dal lato client puoi fare richieste al tuo proxy:
```javascript
// Lato client
fetch('/api/proxy/status')  // Invece di chiamare direttamente l'API esterna
  .then(response => response.json())
  .then(data => console.log(data));
```

### 5. Errori di certificato SSL/TLS

**Problema**: Potresti riscontrare problemi con i certificati SSL/TLS, soprattutto in ambienti di sviluppo.

**Soluzione**: Assicurati di utilizzare HTTPS e, se necessario in ambiente di sviluppo, disabilita la verifica dei certificati (da non fare in produzione).

**Esempio in Node.js (solo per sviluppo)**:
```javascript
const https = require('https');
const fetch = require('node-fetch');

const agent = new https.Agent({
  rejectUnauthorized: false  // SOLO PER SVILUPPO
});

fetch(url, { agent })
  .then(response => response.json())
  .then(data => console.log(data));
```

## Esempio completo: script di test

Ecco un esempio completo che implementa tutte le soluzioni:

```javascript
import fetch from 'node-fetch';

async function testApiAuth() {
  const API_KEY = 'flupsy-api-key-2025';
  const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
  
  try {
    // Test 1: Verifica stato API
    console.log('Test 1: Verifica stato API');
    
    const statusResponse = await fetch(`${BASE_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`  // Formato corretto con spazio
      }
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Status API fallito con codice ${statusResponse.status}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('API status:', statusData);
    
    // Test 2: Creazione di una vendita (POST con apiKey nel corpo)
    console.log('\nTest 2: Cestelli disponibili');
    
    const basketsResponse = await fetch(`${BASE_URL}/sales/available-baskets`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    if (!basketsResponse.ok) {
      throw new Error(`Richiesta cestelli fallita con codice ${basketsResponse.status}`);
    }
    
    const basketsData = await basketsResponse.json();
    const availableBaskets = basketsData.baskets || [];
    console.log(`Trovati ${availableBaskets.length} cestelli disponibili`);
    
    if (availableBaskets.length > 0) {
      console.log('\nTest 3: Creazione vendita');
      
      const saleData = {
        apiKey: API_KEY,  // IMPORTANTE: Incluso nel corpo della richiesta
        date: new Date().toISOString().split('T')[0],
        basketIds: [availableBaskets[0].id],
        buyerName: 'Test Script',
        buyerEmail: 'test@example.com',
        buyerPhone: '123456789',
        price: 100,
        notes: 'Test vendita da script risoluzione'
      };
      
      const saleResponse = await fetch(`${BASE_URL}/sales/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)  // Con apiKey inclusa
      });
      
      const saleResult = await saleResponse.json();
      
      if (!saleResponse.ok) {
        console.error('Dettagli errore:', saleResult);
        throw new Error(`Creazione vendita fallita con codice ${saleResponse.status}`);
      }
      
      console.log('Vendita creata con successo:', saleResult);
    }
    
    console.log('\nTutti i test completati con successo!');
  } catch (error) {
    console.error('Test fallito:', error.message);
  }
}

testApiAuth();
```

## Checklist di verifica

Se stai ancora riscontrando problemi, controlla la seguente lista:

- [x] Hai usato l'API key corretta (`flupsy-api-key-2025`)
- [x] L'header di autorizzazione ha il formato corretto (`Authorization: Bearer flupsy-api-key-2025`)
- [x] Per le richieste POST, hai incluso `apiKey` nel corpo JSON della richiesta
- [x] Stai usando HTTPS e non HTTP per le richieste
- [x] Hai provato a eseguire richieste sia con curl/Postman che dal tuo codice
- [x] Se stai facendo richieste dal browser, hai considerato possibili problemi di CORS

## Contatti di supporto

Se continui a riscontrare problemi dopo aver implementato tutte queste soluzioni, contatta il supporto tecnico con:

1. Lo screenshot completo dell'errore
2. Il codice che stai utilizzando per la richiesta
3. L'output di un tool come curl o Postman per verificare la tua richiesta