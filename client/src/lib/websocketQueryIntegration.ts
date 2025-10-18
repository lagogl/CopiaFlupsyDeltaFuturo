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
  
  // Selezioni/Vagliatura
  'selection_completed': ['/api/baskets', '/api/selections', '/api/flupsys', '/api/operations', '/api/cycles', '/api/cycles/active'],
  
  // Cestelli - basket_moved, basket_updated e baskets_switched vengono gestiti separatamente con logica ottimizzata
};

/**
 * OTTIMIZZAZIONE: Funzione unificata per aggiornare i cestelli nella cache
 * Evita duplicazioni tra basket_moved e basket_updated
 */
function handleBasketUpdate(updatedBasket: any, action: string) {
  // OTTIMIZZAZIONE: Aggiorna tutte le varianti di query key baskets per evitare cache stale
  
  // 1. Query principale del visualizer
  queryClient.setQueriesData({ queryKey: ['/api/baskets?includeAll=true'] }, (oldData: any) => {
    if (!oldData) return oldData;
    
    if (Array.isArray(oldData)) {
      return oldData.map(b => b.id === updatedBasket.id ? updatedBasket : b);
    }
    
    if (oldData.baskets && Array.isArray(oldData.baskets)) {
      return {
        ...oldData,
        baskets: oldData.baskets.map((b: any) => b.id === updatedBasket.id ? updatedBasket : b)
      };
    }
    
    return oldData;
  });
  
  // 2. Query base senza parametri
  queryClient.setQueriesData({ queryKey: ['/api/baskets'] }, (oldData: any) => {
    if (!oldData) return oldData;
    
    if (Array.isArray(oldData)) {
      return oldData.map(b => b.id === updatedBasket.id ? updatedBasket : b);
    }
    
    if (oldData.baskets && Array.isArray(oldData.baskets)) {
      return {
        ...oldData,
        baskets: oldData.baskets.map((b: any) => b.id === updatedBasket.id ? updatedBasket : b)
      };
    }
    
    return oldData;
  });
  
  // 3. Query con includeAll come parametro separato
  queryClient.setQueriesData({ queryKey: ['/api/baskets', 'includeAll'] }, (oldData: any) => {
    if (!oldData) return oldData;
    
    if (Array.isArray(oldData)) {
      return oldData.map(b => b.id === updatedBasket.id ? updatedBasket : b);
    }
    
    return oldData;
  });
  
  // CRITICAL FIX: Invalida tutte le query baskets per forzare re-render su TUTTI i device
  queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
  
  console.log(`🔄 Cestello ${updatedBasket.id} ${action}: tutte le cache sincronizzate e invalidate`);
}

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
  
  // Registra handler per 'selection_completed'
  useWebSocketMessage('selection_completed', createHandler('selection_completed'));
  
  // OTTIMIZZAZIONE: basket_moved ora usa la stessa logica ottimizzata di basket_updated
  useWebSocketMessage('basket_moved', useCallback((data: any) => {
    if (data?.basket) {
      handleBasketUpdate(data.basket, 'spostato');
    }
  }, []));
  
  // Handler ottimizzato per basket_updated: aggiorna direttamente la cache senza invalidare
  useWebSocketMessage('basket_updated', useCallback((data: any) => {
    if (data?.basket) {
      handleBasketUpdate(data.basket, 'aggiornato');
    }
  }, []));
  
  // CRITICAL FIX: Handler per baskets_switched - gestisce lo switch di posizioni
  useWebSocketMessage('baskets_switched', useCallback((data: any) => {
    console.log('🔄 WebSocket: ricevuto baskets_switched', data);
    
    if (data?.basket1) {
      handleBasketUpdate(data.basket1, 'scambiato (1/2)');
    }
    
    if (data?.basket2) {
      handleBasketUpdate(data.basket2, 'scambiato (2/2)');
    }
    
    // Invalida anche le query correlate per garantire sincronizzazione completa
    queryClient.invalidateQueries({ queryKey: ['/api/baskets?includeAll=true'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    
    console.log('✅ Switch WebSocket: cache aggiornata per entrambi i cestelli');
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