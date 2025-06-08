/**
 * Script per forzare un aggiornamento WebSocket di tutti i cestelli
 */

const fetch = require('node-fetch');

async function forceWebSocketUpdate() {
  try {
    console.log('Forzando aggiornamento WebSocket...');
    
    // Simula un aggiornamento cestello per triggare il WebSocket
    const response = await fetch('http://localhost:5000/api/websocket/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'basket_updated',
        data: { 
          flupsyId: 570,
          forced: true,
          timestamp: Date.now()
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Aggiornamento WebSocket inviato con successo');
    } else {
      console.error('❌ Errore invio WebSocket:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

forceWebSocketUpdate();