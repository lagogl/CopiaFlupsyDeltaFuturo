// WebSocket client utilità
import { toast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';

// Tipi per messaggi WebSocket
export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

// Crea un WebSocket finto per gestire il caso in cui il WebSocket non sia disponibile
const createDummySocket = (): WebSocket => {
  return {
    readyState: 3, // CLOSED
    close: () => {},
    send: () => false,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    url: '',
    protocol: '',
    extensions: '',
    binaryType: 'blob',
    bufferedAmount: 0,
  } as unknown as WebSocket;
};

// Gestione connessione WebSocket
let socket: WebSocket = createDummySocket(); // Inizializziamo con un socket dummy
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY = 3000; // 3 secondi
let wsConnectionFailed = false; // Flag per tenere traccia dei tentativi falliti

// Lista dei gestori di messaggi registrati
const messageHandlers: Record<string, Set<(data: any) => void>> = {};

// Crea la connessione WebSocket
export function initializeWebSocket() {
  // Chiudi la connessione esistente, se presente
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log("Chiusura socket WebSocket esistente");
    socket.close();
  }
  
  try {
    // Determina il protocollo appropriato
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Verifica che l'host sia definito correttamente
    if (!host || host === 'undefined') {
      console.error("Errore di inizializzazione WebSocket: host non definito", {
        locationProtocol: window.location.protocol,
        locationHost: window.location.host,
        fullLocation: window.location.href
      });
      // Imposta un socket finto per evitare errori
      socket = createDummySocket();
      return socket;
    }
    
    // In ambiente di sviluppo, usa direttamente l'URL del server
    // Assicuriamoci che l'URL sia costruito correttamente
    let wsUrl = `${protocol}//${host}/ws`;
    
    // Verifica che wsUrl sia un URL WebSocket valido
    try {
      // Test esplicito per verificare che l'URL sia valido
      if (!wsUrl || wsUrl.includes('undefined')) {
        throw new Error(`URL non valido: ${wsUrl}`);
      }
      
      new URL(wsUrl);
    } catch (e) {
      console.error("URL WebSocket non valido:", wsUrl, e);
      // Fallback al socket dummy
      socket = createDummySocket();
      return socket;
    }
    
    // Log sempre l'URL per diagnostica
    console.log("Tentativo di connessione WebSocket:", wsUrl);
    
    // Creiamo il socket
    socket = new WebSocket(wsUrl);
    
    // Se arriviamo qui, impostiamo i gestori eventi
    configureSocketHandlers();
    
    return socket;
  } catch (err) {
    console.error("Errore nella creazione WebSocket:", err);
    
    try {
      // Seconda opzione: prova alla radice
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      // Verifica che l'host sia definito
      if (!host || host === 'undefined') {
        console.error("Host non definito durante il tentativo di fallback WebSocket");
        socket = createDummySocket();
        return socket;
      }
      
      const altWsUrl = `${protocol}//${host}/ws`;
      
      console.log("Tentativo alternativo WebSocket:", altWsUrl);
      
      socket = new WebSocket(altWsUrl);
      
      // Se arriviamo qui, impostiamo i gestori eventi
      configureSocketHandlers();
      
      return socket;
    } catch (secondError) {
      console.error("Secondo tentativo fallito:", secondError);
      
      // In caso di errore, crea un socket "finto" che non fa nulla
      // ma evita errori nel resto dell'applicazione
      socket = createDummySocket();
      return socket;
    }
  }
}

// Configura i gestori degli eventi per il socket
function configureSocketHandlers() {
  // Il socket è sempre definito grazie all'inizializzazione con il dummy socket
  
  // Gestisci gli eventi della connessione WebSocket
  socket.onopen = () => {
    console.log('WebSocket connesso');
    // Resetta il timeout di riconnessione se è stato impostato
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      
      // Registra il messaggio per debug
      console.log('Ricevuto messaggio WebSocket:', data);
      
      // Gestione speciale per i messaggi di azzeramento database
      if (data.type === 'database_reset_progress') {
        // Mostra toast persistente per i progressi dell'azzeramento
        toast({
          title: data.data?.step === 'start' ? 'Azzeramento Database' : 
                 data.data?.step === 'complete' ? 'Azzeramento Completato' : 
                 `Azzeramento Database - Passo ${data.data?.step}`,
          description: data.data?.message || data.message,
          variant: data.data?.step === 'complete' ? 'default' : 'destructive',
          duration: data.data?.step === 'complete' ? 3000 : 2000,
        });
      } else if (data.message && data.type !== 'connection') {
        // Toast standard per altri tipi di notifiche
        toast({
          title: 'Aggiornamento',
          description: data.message,
          variant: 'default',
        });
      }
      
      // Chiama tutti i gestori di messaggi registrati per questo tipo
      if (data.type && messageHandlers[data.type]) {
        messageHandlers[data.type].forEach((handler) => {
          handler(data.data);
        });
      }
    } catch (error) {
      console.error('Errore nella gestione del messaggio WebSocket:', error);
    }
  };
  
  socket.onclose = (event) => {
    // Riduci i messaggi di log in ambiente di sviluppo
    if (process.env.NODE_ENV === 'development') {
      // Log ridotto che mostra solo alla prima chiusura
      if (!wsConnectionFailed) {
        console.log('WebSocket disconnesso. Tentativi di riconnessione attivi...');
        wsConnectionFailed = true;
      }
    } else {
      // Log completo in produzione
      console.log('WebSocket disconnesso', event.code, event.reason);
    }
    
    // Riconnetti dopo un ritardo, a meno che non sia stata una chiusura normale
    if (event.code !== 1000) {
      // Pulisci eventuali timeout esistenti
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      reconnectTimeout = setTimeout(() => {
        // Riduci i log in ambiente di sviluppo
        if (process.env.NODE_ENV !== 'development' || !wsConnectionFailed) {
          console.log('Tentativo di riconnessione WebSocket...');
        }
        
        try {
          initializeWebSocket();
        } catch (error) {
          // Ritenta dopo un intervallo più lungo in caso di errore senza log aggiuntivi
          reconnectTimeout = setTimeout(() => {
            try {
              initializeWebSocket();
            } catch (e) {
              // Nessun log aggiuntivo per non inquinare la console
            }
          }, RECONNECT_DELAY * 2);
        }
      }, RECONNECT_DELAY);
    }
  };
  
  socket.onerror = (error) => {
    // Log più discreto in console per gli errori di WebSocket in ambiente di sviluppo
    if (process.env.NODE_ENV === 'development') {
      // Versione ridotta del log per l'ambiente di sviluppo
      console.log('WebSocket ha riscontrato un errore di connessione. Riconnessione in corso...');
    } else {
      // Log completo in produzione
      console.error('Errore WebSocket:', error);
    }
    
    // Impedisci all'errore di propagarsi come unhandledrejection
    return true;
  };
}

// Hook per registrarsi a un tipo di messaggio WebSocket
export function useWebSocketMessage<T = any>(
  messageType: string,
  handler: (data: T) => void
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  
  // Wrapper per il gestore che cattura le eccezioni
  const safeHandler = useCallback((data: T) => {
    try {
      handler(data);
    } catch (error) {
      console.error(`Errore nel gestore WebSocket per "${messageType}":`, error);
    }
  }, [messageType, handler]);
  
  // Effetto per registrare il gestore e monitorare la connessione
  useEffect(() => {
    // Il socket è sempre definito, ma possiamo comunque assicurarci che sia inizializzato
    // correttamente
    if (socket.readyState === WebSocket.CLOSED) {
      initializeWebSocket();
    }
    
    // Funzione per monitorare lo stato della connessione
    const checkConnection = () => {
      // Socket è sempre definito
      setConnected(socket.readyState === WebSocket.OPEN);
    };
    
    // Verifica lo stato iniziale
    checkConnection();
    
    // Configura gli intervalli per verificare lo stato della connessione
    const interval = setInterval(checkConnection, 2000);
    
    // Registra il gestore di messaggi
    if (!messageHandlers[messageType]) {
      messageHandlers[messageType] = new Set();
    }
    messageHandlers[messageType].add(safeHandler);
    
    // Pulizia quando il componente viene smontato
    return () => {
      clearInterval(interval);
      if (messageHandlers[messageType]) {
        messageHandlers[messageType].delete(safeHandler);
        // Rimuovi il set se è vuoto
        if (messageHandlers[messageType].size === 0) {
          delete messageHandlers[messageType];
        }
      }
    };
  }, [messageType, safeHandler]);
  
  return { connected };
}

// Funzione per inviare un messaggio al server
export function sendWebSocketMessage(type: string, data?: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
    return true;
  }
  return false;
}