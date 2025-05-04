/**
 * ESEMPI DI INTEGRAZIONE API ESTERNE FLUPSY
 * Questo file contiene esempi pratici di come integrare le API esterne FLUPSY in diversi ambienti.
 */

/**
 * ESEMPIO 1: Utilizzo in JavaScript (Node.js)
 */

// Funzione base per le richieste API in Node.js
async function apiRequestNode(endpoint, method = 'GET', body = null) {
  const fetch = require('node-fetch');  // Assicurati di installare con: npm install node-fetch
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
    // IMPORTANTE: Aggiungere sempre apiKey nel corpo della richiesta per le operazioni POST
    body.apiKey = API_KEY;
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ha risposto con codice ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * ESEMPIO 2: Utilizzo in JavaScript (Browser)
 */

// Funzione base per le richieste API nel browser
async function apiRequestBrowser(endpoint, method = 'GET', body = null) {
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
    // IMPORTANTE: Aggiungere sempre apiKey nel corpo della richiesta per le operazioni POST
    body.apiKey = API_KEY;
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ha risposto con codice ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * ESEMPIO 3: Utilizzo con jQuery
 */

// Funzione di esempio con jQuery
function apiRequestJQuery(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const API_KEY = 'flupsy-api-key-2025';
    const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
    
    // Se è una richiesta POST, assicurati di includere apiKey nel corpo
    if (body && method === 'POST') {
      body.apiKey = API_KEY;
    }
    
    $.ajax({
      url: BASE_URL + endpoint,
      type: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      data: body ? JSON.stringify(body) : undefined,
      contentType: 'application/json',
      success: function(data) {
        resolve(data);
      },
      error: function(xhr, status, error) {
        reject(new Error(`API ha risposto con codice ${xhr.status}: ${xhr.responseText}`));
      }
    });
  });
}

/**
 * ESEMPIO 4: Utilizzo con PHP
 */

/*
<?php
// Funzione di esempio in PHP
function apiRequestPHP($endpoint, $method = 'GET', $body = null) {
    $api_key = 'flupsy-api-key-2025';
    $base_url = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
    
    $curl = curl_init();
    
    $url = $base_url . $endpoint;
    
    $headers = [
        'Authorization: Bearer ' . $api_key,
        'Content-Type: application/json'
    ];
    
    $curl_options = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method
    ];
    
    if ($body !== null) {
        // IMPORTANTE: Aggiungere sempre apiKey nel corpo della richiesta per le operazioni POST
        if ($method === 'POST') {
            $body['apiKey'] = $api_key;
        }
        $curl_options[CURLOPT_POSTFIELDS] = json_encode($body);
    }
    
    curl_setopt_array($curl, $curl_options);
    
    $response = curl_exec($curl);
    $status_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    
    curl_close($curl);
    
    if ($status_code >= 400) {
        throw new Exception("API ha risposto con codice $status_code: $response");
    }
    
    return json_decode($response, true);
}

// Esempio di utilizzo
try {
    // Verifica lo stato del servizio
    $status = apiRequestPHP('/status');
    echo "Stato servizio: " . $status['status'] . "\n";
    
    // Ottieni i cestelli disponibili per la vendita
    $baskets = apiRequestPHP('/sales/available-baskets');
    echo "Cestelli disponibili: " . count($baskets['baskets']) . "\n";
    
    if (count($baskets['baskets']) > 0) {
        $basket_to_sell = $baskets['baskets'][0];
        
        // Crea una vendita
        $sale_data = [
            'date' => date('Y-m-d'),
            'basketIds' => [$basket_to_sell['id']],
            'buyerName' => 'Cliente PHP Test',
            'buyerEmail' => 'test@example.com',
            'buyerPhone' => '123456789',
            'price' => 150.00,
            'notes' => 'Vendita test da PHP'
        ];
        
        $sale_result = apiRequestPHP('/sales/create', 'POST', $sale_data);
        echo "Vendita creata con ID transazione: " . $sale_result['transactionId'] . "\n";
    }
} catch (Exception $e) {
    echo "Errore: " . $e->getMessage() . "\n";
}
?>
*/

/**
 * ESEMPIO 5: Utilizzo con Python
 */

/*
# Esempio in Python
import requests
import json
from datetime import date

def api_request_python(endpoint, method='GET', body=None):
    api_key = 'flupsy-api-key-2025'
    base_url = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external'
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    url = base_url + endpoint
    
    if body is not None and method == 'POST':
        # IMPORTANTE: Aggiungere sempre apiKey nel corpo della richiesta per le operazioni POST
        body['apiKey'] = api_key
    
    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=body)
    else:
        raise ValueError(f"Metodo non supportato: {method}")
    
    if response.status_code >= 400:
        raise Exception(f"API ha risposto con codice {response.status_code}: {response.text}")
    
    return response.json()

# Esempio di utilizzo
try:
    # Verifica lo stato del servizio
    status = api_request_python('/status')
    print(f"Stato servizio: {status['status']}")
    
    # Ottieni i cestelli disponibili per la vendita
    baskets = api_request_python('/sales/available-baskets')
    print(f"Cestelli disponibili: {len(baskets['baskets'])}")
    
    if len(baskets['baskets']) > 0:
        basket_to_sell = baskets['baskets'][0]
        
        # Crea una vendita
        today = date.today().isoformat()
        sale_data = {
            'date': today,
            'basketIds': [basket_to_sell['id']],
            'buyerName': 'Cliente Python Test',
            'buyerEmail': 'test@example.com',
            'buyerPhone': '123456789',
            'price': 150.00,
            'notes': 'Vendita test da Python'
        }
        
        sale_result = api_request_python('/sales/create', 'POST', sale_data)
        print(f"Vendita creata con ID transazione: {sale_result['transactionId']}")
except Exception as e:
    print(f"Errore: {str(e)}")
*/

/**
 * RISOLUZIONE DEL PROBLEMA ERRORE 401 UNAUTHORIZED
 * 
 * Ci sono diverse possibili cause per un errore 401 durante l'accesso alle API:
 * 
 * 1. API KEY NON CORRETTA: Assicurarsi di utilizzare la chiave API corretta:
 *    'flupsy-api-key-2025'
 * 
 * 2. FORMATO HEADER ERRATO: Verificare che l'header di autorizzazione sia nel formato corretto:
 *    'Authorization: Bearer flupsy-api-key-2025'
 *    NOTA: Lo spazio dopo "Bearer" è obbligatorio.
 * 
 * 3. MANCANZA DELL'API KEY NEL CORPO DELLA RICHIESTA: Per le operazioni POST,
 *    è necessario includere il campo 'apiKey' nel corpo JSON della richiesta,
 *    anche se l'API key è già fornita tramite header.
 * 
 * 4. PROBLEMI DI CORS: Se la richiesta proviene da un browser, potrebbero esserci
 *    problemi di CORS (Cross-Origin Resource Sharing). In questo caso, puoi:
 *    - Implementare un proxy sul tuo server
 *    - Utilizzare un'estensione del browser per disabilitare CORS durante lo sviluppo
 * 
 * 5. PROBLEMI DI PROTOCOLLO: Assicurarsi di utilizzare HTTPS e non HTTP.
 */

// Esempio di richiesta che risolve i problemi comuni di errore 401
async function apiRequestCORSProxy(endpoint, method = 'GET', body = null) {
  const API_KEY = 'flupsy-api-key-2025';
  const BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';
  
  // Esempio di implementazione di un proxy lato server
  const PROXY_URL = '/api/external-proxy'; // Questo dovrebbe essere implementato sul tuo server
  
  const options = {
    method,
    headers: {
      // Passaggio corretto dell'header di autorizzazione
      'Authorization': `Bearer ${API_KEY}`, // Nota lo spazio dopo "Bearer"
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    // IMPORTANTE: Aggiungere sempre apiKey nel corpo della richiesta per le operazioni POST
    const bodyWithApiKey = {
      ...body,
      apiKey: API_KEY // Aggiunta dell'apiKey nel corpo
    };
    options.body = JSON.stringify(bodyWithApiKey);
  }

  try {
    // Utilizzo del proxy per evitare problemi di CORS
    const response = await fetch(`${PROXY_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Risposta di errore completa:', errorText);
      throw new Error(`API ha risposto con codice ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Errore nella richiesta a ${endpoint}:`, error.message);
    throw error;
  }
}

// Esempio di implementazione del proxy lato server (Express.js)
/*
// Nel file server.js o routes.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const API_KEY = 'flupsy-api-key-2025';
const API_BASE_URL = 'https://b5f7b2b2-7c79-4404-86f2-12d51201d795-00-3mc8v3rnvi3q8.kirk.replit.dev/api/external';

// Proxy per le richieste GET
router.get('/external-proxy/*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/external-proxy', '');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Errore nel proxy API:', error);
    res.status(500).json({ success: false, message: 'Errore nel proxy API' });
  }
});

// Proxy per le richieste POST
router.post('/external-proxy/*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/external-proxy', '');
    const body = req.body;
    
    // Aggiunta dell'apiKey nel corpo della richiesta
    body.apiKey = API_KEY;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
    console.error('Errore nel proxy API:', error);
    res.status(500).json({ success: false, message: 'Errore nel proxy API' });
  }
});

app.use('/api', router);
*/