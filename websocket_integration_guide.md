# WebSocket Integration Guide for FLUPSY Management

This guide provides instructions for integrating WebSocket real-time updates in different parts of the FLUPSY management application.

## Server-Side Implementation

### Setup in routes.ts

Add the WebSocket server setup at the end of your routes.ts file:

```javascript
// Import the WebSocketServer and WebSocket
import { WebSocketServer, WebSocket } from 'ws';

// At the end of the registerRoutes function:
  // Create WebSocket server on a different path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });
  
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
        console.log(`Received message: ${message}`);
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
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  return httpServer;
```

### Broadcast Operations Updates

Modify your operation endpoints to broadcast updates:

```javascript
// In your POST /api/operations endpoint
app.post("/api/operations", async (req, res) => {
  try {
    const data = req.body;
    // Existing validation and operation creation code
    
    const createdOperation = await storage.createOperation(data);
    
    // Broadcast the new operation to all connected clients
    broadcastMessage('operation_created', {
      operation: createdOperation,
      message: `Nuova operazione ${createdOperation.type} registrata per la cesta #${createdOperation.basketId}`
    });
    
    res.status(201).json(createdOperation);
  } catch (error) {
    // Error handling
  }
});
```

Similar modifications would be made to PUT and DELETE endpoints for operations.

## Client-Side Implementation

### React Component for WebSocket Notifications

Create a component that listens for specific WebSocket message types:

```typescript
// In OperationListener.tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketMessage } from '@/lib/websocket';
import { toast } from '@/hooks/use-toast';

export function OperationListener() {
  const queryClient = useQueryClient();
  
  // Handler for operation created messages
  const handleOperationCreated = (data: any) => {
    // Show a toast notification
    toast({
      title: 'Nuova Operazione',
      description: data.message,
      variant: 'default',
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
  };
  
  // Use our websocket hook to listen for operation_created messages
  useWebSocketMessage('operation_created', handleOperationCreated);
  
  // This component doesn't render anything
  return null;
}
```

### Add the Listener to Your App

Add the listener component to your App.tsx:

```typescript
// In App.tsx
import { OperationListener } from '@/components/OperationListener';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Existing components */}
      
      {/* WebSocket listeners */}
      <OperationListener />
      
      {/* WebSocket connection indicator */}
      <WebSocketIndicator />
      
      <Toaster />
    </QueryClientProvider>
  );
}
```

## Real-time Dashboard Updates

Update your Dashboard component to reflect real-time changes:

```typescript
// In Dashboard.tsx
import { useWebSocketMessage } from '@/lib/websocket';
import { useState, useEffect } from 'react';

function Dashboard() {
  const [recentOperations, setRecentOperations] = useState<Operation[]>([]);
  
  // Fetch initial data
  useEffect(() => {
    const fetchOperations = async () => {
      const response = await fetch('/api/operations/recent');
      const data = await response.json();
      setRecentOperations(data);
    };
    
    fetchOperations();
  }, []);
  
  // Update when new operations are created
  const handleOperationCreated = (data: any) => {
    // Add the new operation to the list
    if (data && data.operation) {
      setRecentOperations(prev => [data.operation, ...prev].slice(0, 10));
    }
  };
  
  // Listen for operation_created events
  useWebSocketMessage('operation_created', handleOperationCreated);
  
  // Rest of your component...
}
```

## Troubleshooting

If you're experiencing WebSocket connection issues:

1. Check browser console for connection errors
2. Verify the correct WebSocket URL is being used
3. Ensure the WebSocket server is properly initialized
4. Check for any network restrictions (proxies, firewalls)
5. Verify the WebSocket path doesn't conflict with other routes
6. Make sure to import the WebSocket and WebSocketServer from 'ws'

## Common WebSocket Message Types

- `connection`: Initial connection established
- `operation_created`: New operation created
- `operation_updated`: Existing operation updated
- `operation_deleted`: Operation deleted
- `basket_updated`: Basket information updated
- `position_updated`: Basket position changed
- `cycle_updated`: Cycle information updated
- `error`: Error message from the server