import { useEffect } from 'react';
import { WebSocketTest } from '@/components/WebSocketTest';
import { initializeWebSocket } from '@/lib/websocket';

export default function WebSocketTestPage() {
  // Inizializza WebSocket quando la pagina viene caricata
  useEffect(() => {
    initializeWebSocket();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test WebSocket e Broadcast</h1>
      <p className="mb-6 text-muted-foreground">
        Questa pagina consente di testare la funzionalità WebSocket e le operazioni di broadcast per la creazione e l'aggiornamento di unità FLUPSY.
      </p>
      
      <WebSocketTest />
    </div>
  );
}