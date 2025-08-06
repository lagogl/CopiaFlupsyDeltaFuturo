/**
 * Script per forzare il refresh completo di tutte le cache
 * tramite invio di messaggi WebSocket che trigger le invalidazioni
 */

import WebSocket from 'ws';

const PORT = process.env.PORT || 5000;
const WS_URL = `ws://localhost:${PORT}/ws`;

console.log('🔄 Forzo il refresh completo di TUTTE le cache...');

const ws = new WebSocket(WS_URL);

ws.on('open', function open() {
  console.log('✅ WebSocket connesso');
  
  // Simula una serie di eventi che dovrebbero invalidare tutte le cache
  const events = [
    { type: 'operation_deleted', basketId: 3, operationType: 'prima-attivazione' },
    { type: 'operation_deleted', basketId: 5, operationType: 'prima-attivazione' },
    { type: 'cycle_deleted', basketId: 3 },
    { type: 'cycle_deleted', basketId: 5 },
    { type: 'basket_updated', basketId: 3, state: 'available' },
    { type: 'basket_updated', basketId: 5, state: 'available' },
    { type: 'cache_force_refresh', target: 'all' }
  ];
  
  let eventIndex = 0;
  
  function sendNextEvent() {
    if (eventIndex < events.length) {
      const event = events[eventIndex];
      console.log(`📡 Invio evento ${eventIndex + 1}/${events.length}:`, event.type);
      ws.send(JSON.stringify(event));
      eventIndex++;
      setTimeout(sendNextEvent, 200); // Aspetta 200ms tra ogni evento
    } else {
      console.log('✅ Tutti gli eventi inviati');
      setTimeout(() => {
        ws.close();
      }, 1000);
    }
  }
  
  // Inizia l'invio degli eventi
  setTimeout(sendNextEvent, 500);
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
}, 10000);