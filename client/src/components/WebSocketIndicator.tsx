import { useWebSocketMessage } from '@/lib/websocket';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff } from 'lucide-react';
import { useCallback } from 'react';

export function WebSocketIndicator() {
  // Dummy handler per utilizzare il nostro hook senza effettivamente fare nulla con i dati
  const dummyHandler = useCallback(() => {}, []);
  
  // Usa il nostro hook per monitorare lo stato della connessione
  const { connected } = useWebSocketMessage('connection', dummyHandler);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-4 right-4 z-50">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
              connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {connected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{connected ? 'Connesso al server in tempo reale' : 'Disconnesso dal server in tempo reale'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}