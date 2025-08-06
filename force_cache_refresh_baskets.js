/**
 * Script per forzare il refresh della cache dei cestelli e verificare la coerenza
 */

// Simuliamo una richiesta WebSocket per invalidare la cache
import WebSocket from 'ws';

const PORT = process.env.PORT || 5000;
const WS_URL = `ws://localhost:${PORT}/ws`;

console.log('🔄 Forzo il refresh della cache dei cestelli...');

// Test connessione WebSocket
const ws = new WebSocket(WS_URL);

ws.on('open', function open() {
  console.log('✅ WebSocket connesso');
  
  // Invia un messaggio per invalidare la cache dei cestelli
  const message = {
    type: 'cache_invalidation',
    target: 'baskets',
    reason: 'Manual refresh dopo eliminazione cicli'
  };
  
  ws.send(JSON.stringify(message));
  
  setTimeout(() => {
    console.log('🔄 Cache invalidation inviata');
    ws.close();
  }, 1000);
});

ws.on('error', function error(err) {
  console.error('❌ Errore WebSocket:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket chiuso');
  process.exit(0);
});

// Timeout di sicurezza
setTimeout(() => {
  console.log('⏰ Timeout raggiunto');
  process.exit(1);
}, 5000);