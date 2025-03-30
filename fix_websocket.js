// This script contains improved WebSocket functionality
// to ensure proper real-time updates for the FLUPSY management system

// WebSocket client connection configuration
const configureWebSocket = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log("Configuring WebSocket with URL:", wsUrl);
  
  const socket = new WebSocket(wsUrl);
  
  // Connection opened
  socket.addEventListener('open', (event) => {
    console.log('WebSocket connection established');
    document.dispatchEvent(new CustomEvent('ws:connected'));
  });
  
  // Connection closed
  socket.addEventListener('close', (event) => {
    console.log('WebSocket disconnected', event.code, event.reason);
    document.dispatchEvent(new CustomEvent('ws:disconnected'));
    
    // Reconnect after delay if not a normal closure
    if (event.code !== 1000) {
      console.log('Attempting to reconnect in 3 seconds...');
      setTimeout(() => {
        configureWebSocket();
      }, 3000);
    }
  });
  
  // Error handler
  socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
    document.dispatchEvent(new CustomEvent('ws:error', { 
      detail: { message: 'WebSocket connection error' } 
    }));
  });
  
  // Message handler
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      // Dispatch appropriate event based on message type
      document.dispatchEvent(new CustomEvent(`ws:message:${data.type}`, { 
        detail: data 
      }));
      
      // Also dispatch general message event
      document.dispatchEvent(new CustomEvent('ws:message', { 
        detail: data 
      }));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Return the socket for external use
  return socket;
};

// Function to send message through WebSocket
const sendWebSocketMessage = (socket, type, data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type, data });
    socket.send(message);
    console.log(`Sent WebSocket message:`, { type, data });
    return true;
  }
  console.warn('Cannot send message, WebSocket not connected');
  return false;
};

// Server-side WebSocket broadcast implementation (to be used in routes.ts)
const broadcastToClients = (clients, type, data) => {
  const message = JSON.stringify({ type, data });
  let sentCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  });
  
  console.log(`Broadcast message to ${sentCount} clients:`, { type, data });
  return sentCount;
};

// Example of how to listen for WebSocket events in a React component:
/*
useEffect(() => {
  const handleBasketUpdate = (event) => {
    const { detail } = event;
    console.log('Basket updated:', detail);
    // Update your UI based on the new data
    // e.g., queryClient.invalidateQueries(['baskets'])
  };
  
  // Listen for basket update events
  document.addEventListener('ws:message:basket_update', handleBasketUpdate);
  
  // Cleanup
  return () => {
    document.removeEventListener('ws:message:basket_update', handleBasketUpdate);
  };
}, []);
*/