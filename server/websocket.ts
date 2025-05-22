// WebSocket server implementation for FLUPSY application
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Notification types for real-time updates
export const NOTIFICATION_TYPES = {
  OPERATION_CREATED: 'operation_created',
  OPERATION_UPDATED: 'operation_updated',
  OPERATION_DELETED: 'operation_deleted',
  BASKET_UPDATED: 'basket_updated',
  FLUPSY_UPDATED: 'flupsy_updated',
  POSITION_UPDATED: 'position_updated',
  CYCLE_UPDATED: 'cycle_updated',
  SCREENING_UPDATE: 'screening_update',
  ERROR: 'error'
};

// Import cache service for cache invalidation
import { invalidateCache } from './middleware/cache-middleware';

// WebSocket server configuration
export function configureWebSocketServer(httpServer: Server) {
  // Create WebSocket server on a different path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });
  
  console.log('WebSocket server initialized at /ws path');
  
  // Store active connections
  const clients = new Set<WebSocket>();

  // WebSocket server event handlers
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Add client to the set
    clients.add(ws);
    
    // Send initial connected message
    ws.send(JSON.stringify({ 
      type: 'connection', 
      message: 'Connesso al server in tempo reale'
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log(`Received message:`, parsedMessage);
        
        // Handle specific message types here as needed
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Helper function to broadcast messages to all connected clients
  const broadcastMessage = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    let sentCount = 0;
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcast message to ${sentCount} clients:`, { type, data: typeof data === 'object' ? { ...data, _brief: 'data object' } : data });
    return sentCount;
  };
  
  // Helper function to broadcast to specific clients that match a filter
  const broadcastFiltered = (type: string, data: any, filterFn: (client: WebSocket) => boolean) => {
    const message = JSON.stringify({ type, data });
    let sentCount = 0;
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && filterFn(client)) {
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcast filtered message to ${sentCount} clients:`, { type, data: typeof data === 'object' ? { ...data, _brief: 'data object' } : data });
    return sentCount;
  };

  // Format operation notification message
  const formatOperationNotification = (operation: any, action: 'created' | 'updated' | 'deleted' = 'created') => {
    // Default notification object
    const notification = {
      type: action === 'created' 
        ? NOTIFICATION_TYPES.OPERATION_CREATED 
        : action === 'updated' 
          ? NOTIFICATION_TYPES.OPERATION_UPDATED 
          : NOTIFICATION_TYPES.OPERATION_DELETED,
      data: operation,
      message: ''
    };
    
    // Operation type-specific messages
    const typeMessages: Record<string, string> = {
      'prima-attivazione': `Operazione di prima attivazione ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'pulizia': `Operazione di pulizia ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'vagliatura': `Operazione di vagliatura ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'trattamento': `Operazione di trattamento ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'misura': `Operazione di misura ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'vendita': `Operazione di vendita ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'selezione-vendita': `Operazione di selezione-vendita ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'cessazione': `Operazione di cessazione ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`,
      'peso': `Operazione di peso ${action === 'created' ? 'registrata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`
    };
    
    // Set the notification message based on operation type
    notification.message = operation.type && typeMessages[operation.type] ? typeMessages[operation.type] : 
      `Operazione ${action === 'created' ? 'creata' : action === 'updated' ? 'aggiornata' : 'eliminata'} per la cesta #${operation.basketId}`;
    
    // Add extra information for weight operations
    if (operation.type === 'peso' && operation.animalsPerKg) {
      notification.message += ` (${operation.animalsPerKg} animali/kg)`;
    }
    
    return notification;
  };

  // Broadcast operation notification
  const broadcastOperationNotification = (operation: any, action: 'created' | 'updated' | 'deleted' = 'created') => {
    const notification = formatOperationNotification(operation, action);
    
    // Invalidate relevant caches based on operation type
    if (action === 'created' || action === 'updated' || action === 'deleted') {
      invalidateCache('/api/operations');
      invalidateCache('/api/dashboard-data');
      
      // Also invalidate basket-specific caches
      if (operation.basketId) {
        invalidateCache(`/api/baskets/${operation.basketId}`);
      }
      
      // Also invalidate cycle-specific caches if applicable
      if (operation.cycleId) {
        invalidateCache(`/api/cycles/${operation.cycleId}`);
        invalidateCache('/api/cycles/active');
        invalidateCache('/api/cycles/active-with-details');
      }
    }
    
    return broadcastMessage(notification.type, {
      operation,
      message: notification.message
    });
  };

  // Function to handle basket position updates
  const broadcastPositionUpdate = (basketPosition: any) => {
    return broadcastMessage(NOTIFICATION_TYPES.POSITION_UPDATED, {
      basketPosition,
      message: `Posizione aggiornata per la cesta #${basketPosition.basketId} in FLUPSY #${basketPosition.flupsyId}`
    });
  };

  // Function to handle cycle updates
  const broadcastCycleUpdate = (cycle: any, action: 'created' | 'updated' | 'closed' = 'created') => {
    const actionText = action === 'created' ? 'creato' : action === 'updated' ? 'aggiornato' : 'chiuso';
    return broadcastMessage(NOTIFICATION_TYPES.CYCLE_UPDATED, {
      cycle,
      message: `Ciclo ${actionText} per la cesta #${cycle.basketId}`
    });
  };

  // Function to broadcast errors
  const broadcastError = (errorMessage: string, details: any = {}) => {
    return broadcastMessage(NOTIFICATION_TYPES.ERROR, {
      message: errorMessage,
      details,
      timestamp: new Date().toISOString()
    });
  };
  
  // Return the WebSocket server and utilities
  return {
    wss,
    clients,
    broadcastMessage,
    broadcastFiltered,
    broadcastOperationNotification,
    broadcastPositionUpdate,
    broadcastCycleUpdate,
    broadcastError,
    NOTIFICATION_TYPES
  };
}

// Export the WebSocket server configuration
export default configureWebSocketServer;