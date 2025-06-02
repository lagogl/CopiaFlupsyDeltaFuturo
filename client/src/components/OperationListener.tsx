import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketMessage } from '@/lib/websocket';
import { toast } from '@/hooks/use-toast';

export function OperationListener() {
  const queryClient = useQueryClient();
  
  // Handler for operation created messages
  const handleOperationCreated = (data: any) => {
    console.log('🔄 WebSocket: Operazione creata, invalidando cache...', data);
    
    // Invalida tutte le cache rilevanti
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    
    // Mostra toast solo se l'operazione non è stata creata dall'utente corrente
    if (data && data.message) {
      toast({
        title: 'Nuova Operazione',
        description: data.message,
        variant: 'default',
        duration: 3000
      });
    }
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