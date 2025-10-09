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

// Funzione helper per costruire URL WebSocket robusto
function buildWebSocketUrl(): string | null {
  try {
    // Determina il protocollo appropriato
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Ottieni hostname che è sempre definito
    const hostname = window.location.hostname;
    
    // Gestisci la porta in modo sicuro
    const port = window.location.port;
    
    // Debug: log delle variabili per diagnostica
    console.log("Debug WebSocket URL construction:", {
      protocol: window.location.protocol,
      hostname: hostname,
      port: port,
      host: window.location.host,
      href: window.location.href
    });
    
    // Verifica che l'hostname sia valido
    if (!hostname || hostname === 'undefined' || hostname.trim() === '') {
      console.error("Hostname non valido per WebSocket:", {
        hostname,
        locationHost: window.location.host,
        fullLocation: window.location.href
      });
      return null;
    }
    
    // Costruisci l'URL in modo sicuro
    let wsUrl: string;
    
    if (port && port !== 'undefined' && port.trim() !== '') {
      // Porta esplicitamente definita
      wsUrl = `${protocol}//${hostname}:${port}/ws`;
    } else {
      // Porta non definita o standard - usa solo hostname
      wsUrl = `${protocol}//${hostname}/ws`;
    }
    
    // Validazione finale dell'URL costruito
    if (wsUrl.includes('undefined') || wsUrl.includes(':undefined')) {
      console.error("URL WebSocket contiene ancora 'undefined':", wsUrl);
      return null;
    }
    
    // Test che l'URL sia sintatticamente valido
    try {
      const urlTest = new URL(wsUrl);
      // Verifica che sia un protocollo WebSocket
      if (!urlTest.protocol.startsWith('ws')) {
        throw new Error('Protocollo non WebSocket');
      }
    } catch (e) {
      console.error("URL WebSocket sintatticamente non valido:", wsUrl, e);
      return null;
    }
    
    return wsUrl;
  } catch (error) {
    console.error("Errore nella costruzione URL WebSocket:", error);
    return null;
  }
}

// Funzione di fallback con multiple strategie
function attemptWebSocketFallback(originalError: any): WebSocket {
  const fallbackStrategies = [
    // Strategia 1: Usa localhost esplicito se hostname non è disponibile
    () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.port;
      
      if (port && port !== 'undefined') {
        return `${protocol}//localhost:${port}/ws`;
      } else {
        return `${protocol}//localhost/ws`;
      }
    },
    
    // Strategia 2: Usa 127.0.0.1 se localhost non funziona
    () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.port;
      
      if (port && port !== 'undefined') {
        return `${protocol}//127.0.0.1:${port}/ws`;
      } else {
        return `${protocol}//127.0.0.1/ws`;
      }
    },
    
    // Strategia 3: Prova con porta 5000 esplicitamente (porto comune per dev)
    () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//localhost:5000/ws`;
    }
  ];
  
  for (let i = 0; i < fallbackStrategies.length; i++) {
    try {
      const wsUrl = fallbackStrategies[i]();
      
      // Valida l'URL di fallback
      if (wsUrl.includes('undefined') || wsUrl.includes(':undefined')) {
        console.warn(`Strategia di fallback ${i + 1} genera URL con 'undefined':`, wsUrl);
        continue;
      }
      
      // Test URL
      new URL(wsUrl);
      
      console.log(`Tentativo di fallback ${i + 1} WebSocket:`, wsUrl);
      
      const fallbackSocket = new WebSocket(wsUrl);
      
      // Imposta il nuovo socket e configura i gestori
      socket = fallbackSocket;
      configureSocketHandlers();
      
      return socket;
    } catch (fallbackError) {
      console.warn(`Fallback strategia ${i + 1} fallita:`, fallbackError);
      continue;
    }
  }
  
  // Se tutti i fallback falliscono, crea socket dummy
  console.error("Tutti i tentativi di fallback WebSocket sono falliti. Errore originale:", originalError);
  socket = createDummySocket();
  return socket;
}

// Crea la connessione WebSocket
export function initializeWebSocket() {
  // Chiudi la connessione esistente, se presente
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log("Chiusura socket WebSocket esistente");
    socket.close();
  }
  
  try {
    // Costruisci l'URL in modo sicuro
    const wsUrl = buildWebSocketUrl();
    
    if (!wsUrl) {
      console.error("Impossibile costruire un URL WebSocket valido");
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
    
    // Prova strategie di fallback
    return attemptWebSocketFallback(err);
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
      } else if (data.type === 'flupsy_populate_progress') {
        // Mostra toast per i progressi del popolamento FLUPSY
        const progressInfo = data.data?.progress;
        const stepDisplay = progressInfo ? `${progressInfo.created}/${progressInfo.total}` : '';
        
        toast({
          title: data.data?.step === 'start' ? 'Popolamento FLUPSY' : 
                 data.data?.step === 'analyze' ? 'Analisi Posizioni' :
                 data.data?.step === 'complete' ? 'Popolamento Completato' : 
                 stepDisplay ? `Popolamento FLUPSY - ${stepDisplay}` : 'Popolamento FLUPSY',
          description: data.data?.message || data.message,
          variant: data.data?.step === 'complete' ? 'default' : 'default',
          duration: data.data?.step === 'complete' ? 4000 : 1500,
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
    // Gestione silenziosa degli errori WebSocket per evitare spam nella console
    // Solo log essenziali in produzione
    if (process.env.NODE_ENV !== 'development') {
      console.error('Errore WebSocket:', error);
    }
    // In sviluppo, non loggiamo errori di connessione comuni per mantenere la console pulita
    
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