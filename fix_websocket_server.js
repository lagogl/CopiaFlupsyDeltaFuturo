// This script contains improved WebSocket server functionality
// for the FLUPSY management system server routes.ts file

// Import the WebSocketServer and WebSocket from 'ws'
const { WebSocketServer, WebSocket } = require('ws');

// Configure WebSocket server
const configureWebSocketServer = (httpServer) => {
  // Create WebSocket server on a different path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });
  
  console.log('WebSocket server initialized on path: /ws');
  
  // Store active connections
  const clients = new Set();
  
  // Handle new connections
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
        const parsedMessage = JSON.parse(message);
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
  const broadcastMessage = (type, data) => {
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
  
  // Helper function to broadcast to specific clients that match a filter
  const broadcastFiltered = (type, data, filterFn) => {
    const message = JSON.stringify({ type, data });
    let sentCount = 0;
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && filterFn(client)) {
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcast filtered message to ${sentCount} clients:`, { type, data });
    return sentCount;
  };
  
  // Return the WebSocket server and utilities
  return {
    wss,
    clients,
    broadcastMessage,
    broadcastFiltered
  };
};

// Example usage in routes.ts:
/*
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Configure WebSocket server
  const { broadcastMessage } = configureWebSocketServer(httpServer);
  
  // After an operation is created, broadcast the update
  app.post("/api/operations", async (req, res) => {
    try {
      // ... existing code to create operation ...
      
      // Broadcast that an operation was created
      broadcastMessage('operation_created', {
        id: createdOperation.id,
        type: createdOperation.type,
        basketId: createdOperation.basketId
      });
      
      res.status(201).json(createdOperation);
    } catch (error) {
      // ... error handling ...
    }
  });
*/

module.exports = {
  configureWebSocketServer
};