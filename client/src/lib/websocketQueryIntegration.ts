// Integrazione tra WebSocket e TanStack Query
import { useEffect, useCallback } from 'react';
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
  
  // Cache invalidation dopo database reset
  'cache_invalidated': ['/api/baskets', '/api/cycles', '/api/operations', '/api/lots', '/api/flupsys'],
  
  // Statistiche
  'statistics_updated': ['/api/statistics/cycles/comparison', '/api/size-predictions'],
  
  // Cestelli - Non includiamo basket_moved e basket_updated qui perché li gestiamo separatamente
};

/**
 * Hook che configura l'integrazione tra WebSocket e React Query.
 * Quando arriva un messaggio WebSocket, invalida le query appropriate.
 */
export function useWebSocketQueryIntegration() {
  // Crea un handler per ogni tipo di messaggio
  const createHandler = useCallback((messageType: string) => {
    return (data: any) => {
      // Quando riceviamo un messaggio di questo tipo, invalidiamo le query appropriate
      const queriesToInvalidate = messageTypeToQueryKeys[messageType];
      
      console.log(`WebSocket trigger: invalidando query per "${messageType}"`, queriesToInvalidate);
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
    };
  }, []);
  
  // Registra handler per 'operation_created'
  useWebSocketMessage('operation_created', createHandler('operation_created'));
  
  // Registra handler per 'operation_updated'
  useWebSocketMessage('operation_updated', createHandler('operation_updated'));
  
  // Registra handler per 'operation_deleted'
  useWebSocketMessage('operation_deleted', createHandler('operation_deleted'));
  
  // Registra handler per 'cache_invalidated' (database reset)
  useWebSocketMessage('cache_invalidated', createHandler('cache_invalidated'));
  
  // Registra handler per 'cycle_created'
  useWebSocketMessage('cycle_created', createHandler('cycle_created'));
  
  // Registra handler per 'cycle_updated'
  useWebSocketMessage('cycle_updated', createHandler('cycle_updated'));
  
  // Registra handler per 'cycle_deleted'
  useWebSocketMessage('cycle_deleted', createHandler('cycle_deleted'));
  
  // Registra handler per 'statistics_updated'
  useWebSocketMessage('statistics_updated', createHandler('statistics_updated'));
  
  // Handler ottimizzato per basket_moved: aggiorna direttamente la cache senza invalidare
  useWebSocketMessage('basket_moved', useCallback((data: any) => {
    if (data?.basket) {
      const updatedBasket = data.basket;
      
      // Aggiorna direttamente la cache dei cestelli senza invalidare
      queryClient.setQueriesData({ queryKey: ['/api/baskets'] }, (oldData: any) => {
        if (!oldData) return oldData;
        
        // Se è un array di cestelli, aggiorna quello modificato
        if (Array.isArray(oldData)) {
          return oldData.map(b => b.id === updatedBasket.id ? updatedBasket : b);
        }
        
        // Se è una risposta paginata
        if (oldData.baskets && Array.isArray(oldData.baskets)) {
          return {
            ...oldData,
            baskets: oldData.baskets.map((b: any) => b.id === updatedBasket.id ? updatedBasket : b)
          };
        }
        
        return oldData;
      });
      
      // Invalida solo la cache delle posizioni per questo specifico cestello
      queryClient.invalidateQueries({ queryKey: [`/api/baskets/${updatedBasket.id}/positions`] });
      
      console.log(`Cestello ${updatedBasket.id} aggiornato via WebSocket (ottimizzato)`);
    }
  }, []));
  
  // Handler ottimizzato per basket_updated: aggiorna direttamente la cache senza invalidare
  useWebSocketMessage('basket_updated', useCallback((data: any) => {
    if (data?.basket) {
      const updatedBasket = data.basket;
      
      // Aggiorna direttamente la cache dei cestelli senza invalidare
      queryClient.setQueriesData({ queryKey: ['/api/baskets'] }, (oldData: any) => {
        if (!oldData) return oldData;
        
        // Se è un array di cestelli, aggiorna quello modificato
        if (Array.isArray(oldData)) {
          return oldData.map(b => b.id === updatedBasket.id ? updatedBasket : b);
        }
        
        // Se è una risposta paginata
        if (oldData.baskets && Array.isArray(oldData.baskets)) {
          return {
            ...oldData,
            baskets: oldData.baskets.map((b: any) => b.id === updatedBasket.id ? updatedBasket : b)
          };
        }
        
        return oldData;
      });
      
      // Non serve invalidare nulla, abbiamo già i dati aggiornati
      console.log(`Cestello ${updatedBasket.id} aggiornato via WebSocket (cache diretta)`);
    }
  }, []));
  
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