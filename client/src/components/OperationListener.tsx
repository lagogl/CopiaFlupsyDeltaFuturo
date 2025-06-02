import { useEffect, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useWebSocketMessage } from '@/lib/websocket';
import { toast } from '@/hooks/use-toast';

export function OperationListener() {
  const queryClient = useQueryClient();
  const lastOperationCount = useRef<number>(0);
  const lastBasketStates = useRef<string>('');
  
  // Handler for operation created messages
  const handleOperationCreated = (data: any) => {
    console.log('🚨 OPERATION LISTENER: Ricevuta notifica operation_created!', data);
    
    // Invalida tutte le cache rilevanti con forza
    console.log('🚨 INVALIDATING CACHES...');
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    
    // Refetch immediato per forzare l'aggiornamento della mini-mappa
    queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
    queryClient.refetchQueries({ queryKey: ['/api/flupsys'] });
    
    console.log('🚨 CACHE INVALIDATED - Showing toast');
    
    // Mostra toast di conferma
    toast({
      title: '🔄 Cache Aggiornata',
      description: 'La mini-mappa è stata aggiornata in tempo reale',
      variant: 'default',
      duration: 3000
    });
  };
  
  // Handler for operation updated messages
  const handleOperationUpdated = (data: any) => {
    console.log('🔄 WebSocket: Operazione aggiornata, invalidando cache...', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
  };
  
  // Handler for operation deleted messages
  const handleOperationDeleted = (data: any) => {
    console.log('🔄 WebSocket: Operazione eliminata, invalidando cache...', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
  };
  
  // Handler for basket updated messages
  const handleBasketUpdated = (data: any) => {
    console.log('🔄 WebSocket: Cestello aggiornato, invalidando cache...', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
  };
  
  // Handler for position updated messages
  const handlePositionUpdated = (data: any) => {
    console.log('🔄 WebSocket: Posizione aggiornata, invalidando cache...', data);
    
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    queryClient.invalidateQueries({ queryKey: ['/api/basket-positions'] });
  };
  
  // Sistema di polling per rilevare cambiamenti nei dati
  const { data: operationsData } = useQuery({
    queryKey: ['/api/operations'],
    refetchInterval: 2000, // Controlla ogni 2 secondi
    refetchIntervalInBackground: true,
    staleTime: 0, // Considera sempre i dati obsoleti
    gcTime: 0 // Non mantiene cache
  });

  const { data: basketsData } = useQuery({
    queryKey: ['/api/baskets', { includeAll: true }],
    refetchInterval: 2000, // Controlla ogni 2 secondi
    refetchIntervalInBackground: true,
    staleTime: 0, // Considera sempre i dati obsoleti
    gcTime: 0 // Non mantiene cache
  });

  // Controlla cambiamenti nel numero di operazioni
  useEffect(() => {
    if (operationsData && Array.isArray(operationsData)) {
      const currentCount = operationsData.length;
      if (lastOperationCount.current > 0 && currentCount > lastOperationCount.current) {
        console.log('🔄 POLLING: Rilevata nuova operazione, aggiornando cache...');
        
        // Invalida le cache per forzare il refresh con query uniche
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        
        // Forza refresh con parametri anti-cache
        const timestamp = Date.now();
        queryClient.refetchQueries({ 
          queryKey: ['/api/baskets', { includeAll: true, _t: timestamp }],
          type: 'all'
        });
        queryClient.refetchQueries({ 
          queryKey: ['/api/flupsys', { _t: timestamp }],
          type: 'all' 
        });
        
        toast({
          title: 'Dati Aggiornati',
          description: 'Nuova operazione rilevata, mini-mappa aggiornata',
          variant: 'default',
          duration: 2000
        });
      }
      lastOperationCount.current = currentCount;
    }
  }, [operationsData, queryClient]);

  // Controlla cambiamenti negli stati dei cestelli
  useEffect(() => {
    if (basketsData && Array.isArray(basketsData)) {
      const currentStates = basketsData
        .map((b: any) => `${b.id}:${b.state}`)
        .sort()
        .join(',');
      
      if (lastBasketStates.current && lastBasketStates.current !== currentStates) {
        console.log('🔄 POLLING: Rilevati cambiamenti negli stati dei cestelli');
        
        // Invalida la cache per forzare il refresh della mini-mappa
        queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
        
        toast({
          title: 'Mini-mappa Aggiornata',
          description: 'Stati dei cestelli aggiornati',
          variant: 'default',
          duration: 1500
        });
      }
      lastBasketStates.current = currentStates;
    }
  }, [basketsData, queryClient]);

  // Use our websocket hook to listen for different message types (fallback)
  useWebSocketMessage('operation_created', handleOperationCreated);
  useWebSocketMessage('operation_updated', handleOperationUpdated);
  useWebSocketMessage('operation_deleted', handleOperationDeleted);
  useWebSocketMessage('basket_updated', handleBasketUpdated);
  useWebSocketMessage('position_updated', handlePositionUpdated);
  
  // This component doesn't render anything
  return null;
}