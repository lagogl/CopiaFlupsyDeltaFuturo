// Integrazione tra WebSocket e TanStack Query
import { useEffect } from 'react';
import { useWebSocketMessage } from './websocket';
import { queryClient } from './queryClient';

// Mappa dei tipi di messaggi WebSocket alle query da invalidare
const messageTypeToQueryKeys: Record<string, string[]> = {
  // Operazioni
  'operation_created': ['/api/operations', '/api/baskets', '/api/cycles/active', '/api/cycles'],
  'operation_updated': ['/api/operations', '/api/baskets', '/api/cycles/active', '/api/cycles'],
  'operation_deleted': ['/api/operations', '/api/baskets', '/api/cycles/active', '/api/cycles'],
  
  // Cicli
  'cycle_created': ['/api/cycles', '/api/cycles/active', '/api/baskets'],
  'cycle_updated': ['/api/cycles', '/api/cycles/active', '/api/baskets'],
  'cycle_deleted': ['/api/cycles', '/api/cycles/active', '/api/baskets'],
  
  // Statistiche
  'statistics_updated': ['/api/statistics/cycles/comparison', '/api/size-predictions'],
};

/**
 * Hook che configura l'integrazione tra WebSocket e React Query.
 * Quando arriva un messaggio WebSocket, invalida le query appropriate.
 */
export function useWebSocketQueryIntegration() {
  // Configura gli handler per tutti i tipi di messaggi che ci interessano
  Object.keys(messageTypeToQueryKeys).forEach(messageType => {
    useWebSocketMessage(messageType, (data) => {
      // Quando riceviamo un messaggio di questo tipo, invalidiamo le query appropriate
      const queriesToInvalidate = messageTypeToQueryKeys[messageType];
      
      console.log(`WebSocket trigger: invalidando query per "${messageType}"`, queriesToInvalidate);
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
    });
  });
  
  return null;
}

/**
 * Componente React che inizializza l'integrazione WebSocket-Query.
 * Basta includere questo componente una volta nell'app per attivare l'integrazione.
 */
export function WebSocketQueryIntegration() {
  useWebSocketQueryIntegration();
  return null;
}