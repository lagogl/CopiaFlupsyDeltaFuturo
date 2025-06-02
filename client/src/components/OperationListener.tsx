import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketMessage } from '@/lib/websocket';
import { toast } from '@/hooks/use-toast';

export function OperationListener() {
  const queryClient = useQueryClient();
  
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
  
  // Use our websocket hook to listen for different message types
  useWebSocketMessage('operation_created', handleOperationCreated);
  useWebSocketMessage('operation_updated', handleOperationUpdated);
  useWebSocketMessage('operation_deleted', handleOperationDeleted);
  useWebSocketMessage('basket_updated', handleBasketUpdated);
  useWebSocketMessage('position_updated', handlePositionUpdated);
  
  // This component doesn't render anything
  return null;
}