import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWebSocketMessage, sendWebSocketMessage } from '@/lib/websocket';
import { WebSocketIndicator } from '@/components/WebSocketIndicator';

export function WebSocketTest() {
  const [messages, setMessages] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<string>('Disconnesso');
  
  // Registrati per messaggi broadcast generali
  useWebSocketMessage('flupsy_created', (data) => {
    setMessages(prev => [...prev, `FLUPSY Creato: ${JSON.stringify(data)}`]);
  });
  
  useWebSocketMessage('flupsy_updated', (data) => {
    setMessages(prev => [...prev, `FLUPSY Aggiornato: ${JSON.stringify(data)}`]);
  });
  
  useWebSocketMessage('connection', (data) => {
    setWsStatus('Connesso');
    setMessages(prev => [...prev, `WebSocket Connesso: ${JSON.stringify(data)}`]);
  });
  
  useWebSocketMessage('error', (data) => {
    setMessages(prev => [...prev, `Errore: ${JSON.stringify(data)}`]);
  });
  
  // Test di invio messaggio
  const sendTestMessage = () => {
    const success = sendWebSocketMessage('test_message', { test: 'Messaggio di test' });
    if (success) {
      setMessages(prev => [...prev, `Test messaggio inviato`]);
    } else {
      setMessages(prev => [...prev, `Errore nell'invio del messaggio di test`]);
    }
  };
  
  // Test di creazione FLUPSY via API REST
  const testCreateFlupsy = async () => {
    try {
      setMessages(prev => [...prev, `Tentativo di creazione FLUPSY via API...`]);
      const response = await fetch('/api/flupsys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `Test FLUPSY ${new Date().toISOString()}`,
          location: 'Test Location',
          description: 'FLUPSY creato per test broadcast',
          active: true
        })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, `Risposta creazione: ${JSON.stringify(data)}`]);
    } catch (error) {
      setMessages(prev => [...prev, `Errore nella creazione: ${error}`]);
    }
  };
  
  // Test di aggiornamento FLUPSY via WebSocket
  const testUpdateFlupsyWs = () => {
    // Cerca di aggiornare il FLUPSY con ID 1 (se esiste)
    const success = sendWebSocketMessage('update_flupsy', {
      id: 1,
      data: {
        name: `WS Updated FLUPSY ${new Date().toISOString()}`,
        description: 'Aggiornato via WebSocket'
      }
    });
    
    if (success) {
      setMessages(prev => [...prev, `Richiesta di aggiornamento via WebSocket inviata`]);
    } else {
      setMessages(prev => [...prev, `Errore nell'invio della richiesta di aggiornamento`]);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Test WebSocket 
          <WebSocketIndicator />
        </CardTitle>
        <div className="text-sm">Stato: {wsStatus}</div>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Button variant="outline" onClick={sendTestMessage}>
            Invia Test
          </Button>
          <Button variant="default" onClick={testCreateFlupsy}>
            Crea FLUPSY (API)
          </Button>
          <Button variant="secondary" onClick={testUpdateFlupsyWs}>
            Aggiorna FLUPSY (WS)
          </Button>
        </div>
        
        <div className="bg-black/10 dark:bg-white/5 p-4 rounded-md h-[400px] overflow-y-auto">
          <h3 className="font-mono text-sm mb-2">Log:</h3>
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessun messaggio ricevuto</div>
          ) : (
            <ul className="space-y-1">
              {messages.map((message, index) => (
                <li key={index} className="font-mono text-xs border-l-2 border-primary pl-2 py-1">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}