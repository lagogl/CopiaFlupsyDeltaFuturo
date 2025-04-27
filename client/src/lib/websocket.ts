// WebSocket client utilità
import { toast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';

// Tipi per messaggi WebSocket
export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

// Gestione connessione WebSocket
let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY = 3000; // 3 secondi

// Lista dei gestori di messaggi registrati
const messageHandlers: Record<string, Set<(data: any) => void>> = {};

// Crea la connessione WebSocket
export function initializeWebSocket() {
  // Chiudi la connessione esistente, se presente
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    socket.close();
  }
  
  // Crea la URL del WebSocket utilizzando lo stesso host ma cambiando il protocollo
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
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
      
      // Mostra toast per notifiche
      if (data.message && data.type !== 'connection') {
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
    console.log('WebSocket disconnesso', event.code, event.reason);
    
    // Riconnetti dopo un ritardo, a meno che non sia stata una chiusura normale
    if (event.code !== 1000) {
      reconnectTimeout = setTimeout(() => {
        console.log('Tentativo di riconnessione WebSocket...');
        initializeWebSocket();
      }, RECONNECT_DELAY);
    }
  };
  
  socket.onerror = (error) => {
    console.error('Errore WebSocket:', error);
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
    // Assicurati che il WebSocket sia inizializzato
    if (!socket) {
      initializeWebSocket();
    }
    
    // Funzione per monitorare lo stato della connessione
    const checkConnection = () => {
      if (socket) {
        setConnected(socket.readyState === WebSocket.OPEN);
      } else {
        setConnected(false);
      }
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