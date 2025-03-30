// File: fix_websocket_server.js
// Implementazione robusta del server WebSocket

const { WebSocketServer } = require('ws');

/**
 * Configura e inizializza un server WebSocket su un server HTTP esistente
 * 
 * @param {Object} httpServer - Il server HTTP di Express su cui montare il WebSocket Server
 * @param {string} path - Il percorso su cui montare il WebSocket Server (default: '/ws')
 * @returns {Object} - Oggetto con utilità del WebSocket Server
 */
function configureWebSocketServer(httpServer, path = '/ws') {
  // Verifica che il server HTTP esista
  if (!httpServer) {
    throw new Error("Server HTTP non fornito per la configurazione WebSocket");
  }
  
  // Crea il server WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: path 
  });
  
  // Statistiche e stato
  const stats = {
    connections: 0,
    activeConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    lastError: null,
    startTime: new Date(),
  };
  
  // Gestione eventi globali
  console.log(`WebSocket server initialized at ${path} path`);
  
  // Evento di connessione di un nuovo client
  wss.on('connection', (ws, req) => {
    stats.connections++;
    stats.activeConnections++;
    
    // Indirizzo IP del client (può essere utile per logging o rate limiting)
    const clientIp = req.socket.remoteAddress;
    const connId = Math.random().toString(36).substring(2, 10);
    
    console.log(`WebSocket client connected [${connId}] from ${clientIp}`);
    
    // Definizione proprietà per gestire lo stato del socket
    ws.connId = connId;
    ws.isAlive = true;
    ws.subscribedTopics = new Set();
    
    // Gestione dei ping per mantenere attiva la connessione
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Gestione messaggi dal client
    ws.on('message', (data) => {
      stats.messagesReceived++;
      
      try {
        // Parsa il messaggio JSON
        const message = JSON.parse(data.toString());
        
        // Gestione di diversi tipi di messaggi
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            stats.messagesSent++;
            break;
            
          case 'subscribe':
            if (message.topic) {
              ws.subscribedTopics.add(message.topic);
              console.log(`Client ${connId} subscribed to topic: ${message.topic}`);
              ws.send(JSON.stringify({ 
                type: 'subscribed', 
                topic: message.topic,
                success: true 
              }));
              stats.messagesSent++;
            }
            break;
            
          case 'unsubscribe':
            if (message.topic && ws.subscribedTopics.has(message.topic)) {
              ws.subscribedTopics.delete(message.topic);
              console.log(`Client ${connId} unsubscribed from topic: ${message.topic}`);
              ws.send(JSON.stringify({ 
                type: 'unsubscribed', 
                topic: message.topic,
                success: true 
              }));
              stats.messagesSent++;
            }
            break;
            
          default:
            // Puoi anche gestire messaggi custom qui
            console.log(`Received message from client ${connId}:`, message);
        }
      } catch (error) {
        console.error(`Error processing message from client ${connId}:`, error);
        stats.errors++;
        stats.lastError = {
          time: new Date(),
          message: error.message,
          stack: error.stack
        };
      }
    });
    
    // Gestione disconnessione
    ws.on('close', () => {
      stats.activeConnections--;
      console.log(`WebSocket client disconnected [${connId}]`);
    });
    
    // Gestione errori
    ws.on('error', (error) => {
      stats.errors++;
      stats.lastError = {
        time: new Date(),
        message: error.message,
        stack: error.stack
      };
      console.error(`WebSocket error for client ${connId}:`, error);
    });
    
    // Messaggio di benvenuto
    const welcomeMessage = {
      type: 'welcome',
      message: 'Connessione al server WebSocket stabilita',
      connId: connId,
      serverTime: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(welcomeMessage));
    stats.messagesSent++;
  });
  
  // Ping periodico per mantenere attive le connessioni
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`Client ${ws.connId} non risponde, chiusura connessione`);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 secondi
  
  // Gestione chiusura del server
  wss.on('close', () => {
    clearInterval(pingInterval);
    console.log("WebSocket server closed");
  });
  
  // Funzione per inviare messaggi a tutti i client attivi
  function broadcastMessage(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });
    
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
        stats.messagesSent++;
      }
    });
    
    console.log(`Broadcast message of type '${type}' sent to ${sentCount} clients`);
    return sentCount > 0;
  }
  
  // Funzione per inviare messaggi a client abbonati a un topic specifico
  function broadcastToTopic(topic, type, data) {
    const message = JSON.stringify({
      type,
      topic,
      data,
      timestamp: Date.now()
    });
    
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && 
          (client.subscribedTopics.has(topic) || client.subscribedTopics.has('*'))) {
        client.send(message);
        sentCount++;
        stats.messagesSent++;
      }
    });
    
    console.log(`Topic '${topic}' message of type '${type}' sent to ${sentCount} clients`);
    return sentCount > 0;
  }
  
  // Funzione per ottenere le statistiche del server WebSocket
  function getStats() {
    return {
      ...stats,
      uptime: Math.floor((new Date() - stats.startTime) / 1000), // Uptime in secondi
      activeConnections: stats.activeConnections
    };
  }
  
  // Restituisci l'oggetto con tutte le utilità
  return {
    wss,
    broadcastMessage,
    broadcastToTopic,
    getStats
  };
}

module.exports = {
  configureWebSocketServer
};