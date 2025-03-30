// File: fix_websocket.js
// Implementazione client WebSocket con riconnessione automatica e gestione degli eventi

/**
 * Configura e inizializza una connessione WebSocket al server.
 * Implementa la riconnessione automatica e genera eventi DOM per una migliore
 * integrazione con il resto dell'applicazione React.
 * 
 * @returns {WebSocket} Istanza del WebSocket configurato
 */
function configureWebSocket() {
  // Determina l'URL del WebSocket basato sull'ambiente
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`Tentativo di connessione WebSocket a ${wsUrl}`);
  
  // Variabili per gestire i tentativi di riconnessione
  let reconnectInterval = 1000; // Inizia con 1 secondo
  const maxReconnectInterval = 30000; // Massimo 30 secondi
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 50; // Massimo 50 tentativi
  
  // Funzione di evento personalizzata per le notifiche
  function dispatchEvent(type, data) {
    const event = new CustomEvent(`ws:${type}`, { 
      detail: data,
      bubbles: true,
      cancelable: true 
    });
    document.dispatchEvent(event);
  }
  
  // Funzione per creare una nuova connessione
  function createConnection() {
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connesso');
      reconnectInterval = 1000; // Reset dell'intervallo di riconnessione
      reconnectAttempts = 0;     // Reset dei tentativi
      
      // Invia evento di connessione
      dispatchEvent('connected', { timestamp: Date.now() });
      
      // Notifica tipo messaggio "connection" agli ascoltatori
      dispatchEvent('message:connection', { 
        type: 'connection', 
        message: 'Connesso al server in tempo reale' 
      });
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket disconnesso', event.code, `${event.reason ? event.reason : ''}`);
      dispatchEvent('disconnected', { 
        code: event.code, 
        reason: event.reason,
        timestamp: Date.now()
      });
      
      // Tenta di riconnettersi se la chiusura non è volontaria (1000 o 1001)
      if (event.code !== 1000 && event.code !== 1001) {
        scheduleReconnect(socket);
      }
    };
    
    socket.onerror = (error) => {
      console.error('Errore WebSocket:', error);
      dispatchEvent('error', { 
        error: error,
        timestamp: Date.now()
      });
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Ricevuto messaggio WebSocket:', data);
        
        // Invia evento generale per tutti i messaggi
        dispatchEvent('message', data);
        
        // Invia evento specifico per tipo di messaggio
        if (data.type) {
          dispatchEvent(`message:${data.type}`, data);
        }
      } catch (error) {
        console.error('Errore nel parsing del messaggio WebSocket:', error);
        dispatchEvent('error', { 
          error: error,
          raw: event.data,
          timestamp: Date.now()
        });
      }
    };
    
    return socket;
  }
  
  // Funzione per gestire i tentativi di riconnessione
  function scheduleReconnect(oldSocket) {
    reconnectAttempts++;
    
    if (reconnectAttempts > maxReconnectAttempts) {
      console.error(`Tentativi massimi di riconnessione raggiunti (${maxReconnectAttempts}). Abbandono.`);
      dispatchEvent('maxRetriesReached', { 
        attempts: reconnectAttempts,
        timestamp: Date.now()
      });
      return;
    }
    
    // Aumento esponenziale del tempo di attesa
    const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts - 1), maxReconnectInterval);
    
    console.log(`Tentativo di riconnessione ${reconnectAttempts} tra ${delay}ms`);
    dispatchEvent('reconnecting', { 
      attempt: reconnectAttempts,
      delay: delay,
      timestamp: Date.now()
    });
    
    setTimeout(() => {
      // Pulisci il socket precedente se ancora esiste
      if (oldSocket) {
        try {
          oldSocket.onclose = null; // Previene loop di riconnessione
          oldSocket.onerror = null;
          oldSocket.onopen = null;
          oldSocket.onmessage = null;
          oldSocket.close();
        } catch (e) {
          // Ignora errori durante la pulizia
        }
      }
      
      // Crea una nuova connessione
      const newSocket = createConnection();
      window.wsSocket = newSocket; // Aggiorna il riferimento globale
    }, delay);
  }
  
  // Inizializza la connessione
  const socket = createConnection();
  
  // Esponi il socket a livello di window per accessi manuali (debug)
  window.wsSocket = socket;
  
  return socket;
}

/**
 * Invia un messaggio attraverso il WebSocket.
 * 
 * @param {WebSocket} socket - L'istanza del WebSocket
 * @param {string} type - Il tipo di messaggio
 * @param {any} data - I dati da inviare
 * @returns {boolean} - true se il messaggio è stato inviato con successo
 */
function sendWebSocketMessage(socket, type, data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket non connesso. Impossibile inviare il messaggio.');
    return false;
  }
  
  try {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });
    
    socket.send(message);
    return true;
  } catch (error) {
    console.error('Errore nell\'invio del messaggio WebSocket:', error);
    return false;
  }
}

// Esporta le funzioni
module.exports = {
  configureWebSocket,
  sendWebSocketMessage
};