import { useWebSocketMessage } from '@/lib/websocket';
import { Wifi, WifiOff } from 'lucide-react';
import { useCallback } from 'react';

// Importiamo i componenti di tooltip da radix-ui direttamente per evitare conflitti
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function WebSocketIndicator() {
  // Dummy handler per utilizzare il nostro hook senza effettivamente fare nulla con i dati
  const dummyHandler = useCallback(() => {}, []);
  
  // Usa il nostro hook per monitorare lo stato della connessione
  const { connected } = useWebSocketMessage('connection', dummyHandler);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <TooltipPrimitive.Provider>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer ${
              connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {connected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Content 
            sideOffset={4}
            side="left"
            className={cn(
              "z-50 overflow-hidden rounded-md bg-primary-foreground px-3 py-1.5 text-xs animate-in fade-in-0 zoom-in-95",
              "border border-border bg-white text-foreground shadow-md"
            )}
          >
            <p>{connected ? 'Connesso al server in tempo reale' : 'Disconnesso dal server in tempo reale'}</p>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </div>
  );
}