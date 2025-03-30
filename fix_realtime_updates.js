// This script contains improved real-time update functionality
// to integrate operations with WebSocket notifications

// Configuration for WebSocket notification types
const NOTIFICATION_TYPES = {
  OPERATION_CREATED: 'operation_created',
  OPERATION_UPDATED: 'operation_updated',
  OPERATION_DELETED: 'operation_deleted',
  BASKET_UPDATED: 'basket_updated',
  FLUPSY_UPDATED: 'flupsy_updated',
  POSITION_UPDATED: 'position_updated',
  CYCLE_UPDATED: 'cycle_updated',
  ERROR: 'error'
};

// Function to format notification messages based on operation type
const formatOperationNotification = (operation, action = 'created') => {
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
  const typeMessages = {
    'prima-attivazione': `Operazione di prima attivazione ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'pulizia': `Operazione di pulizia ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'vagliatura': `Operazione di vagliatura ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'trattamento': `Operazione di trattamento ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'misura': `Operazione di misura ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'vendita': `Operazione di vendita ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'selezione-vendita': `Operazione di selezione-vendita ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'cessazione': `Operazione di cessazione ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`,
    'peso': `Operazione di peso ${action === 'created' ? 'registrata' : 'aggiornata'} per la cesta #${operation.basketId}`
  };
  
  // Set the notification message based on operation type
  notification.message = typeMessages[operation.type] || 
    `Operazione ${action === 'created' ? 'creata' : 'aggiornata'} per la cesta #${operation.basketId}`;
  
  // Add extra information for weight operations
  if (operation.type === 'peso' && operation.animalsPerKg) {
    notification.message += ` (${operation.animalsPerKg} animali/kg)`;
  }
  
  return notification;
};

// Function to broadcast operation notifications with custom message formatting
const broadcastOperationNotification = (broadcastFunc, operation, action = 'created') => {
  const notification = formatOperationNotification(operation, action);
  return broadcastFunc(notification.type, {
    operation,
    message: notification.message
  });
};

// Function to handle basket position updates
const broadcastPositionUpdate = (broadcastFunc, basketPosition) => {
  return broadcastFunc(NOTIFICATION_TYPES.POSITION_UPDATED, {
    basketPosition,
    message: `Posizione aggiornata per la cesta #${basketPosition.basketId} in FLUPSY #${basketPosition.flupsyId}`
  });
};

// Function to handle cycle updates
const broadcastCycleUpdate = (broadcastFunc, cycle, action = 'created') => {
  const actionText = action === 'created' ? 'creato' : action === 'updated' ? 'aggiornato' : 'chiuso';
  return broadcastFunc(NOTIFICATION_TYPES.CYCLE_UPDATED, {
    cycle,
    message: `Ciclo ${actionText} per la cesta #${cycle.basketId}`
  });
};

// Function to broadcast errors
const broadcastError = (broadcastFunc, errorMessage, details = {}) => {
  return broadcastFunc(NOTIFICATION_TYPES.ERROR, {
    message: errorMessage,
    details,
    timestamp: new Date().toISOString()
  });
};

// Export functions and constants
module.exports = {
  NOTIFICATION_TYPES,
  formatOperationNotification,
  broadcastOperationNotification,
  broadcastPositionUpdate,
  broadcastCycleUpdate,
  broadcastError
};