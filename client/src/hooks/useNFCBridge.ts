import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NFCBridgeEvent {
  type: 'connected' | 'nfc_detected' | 'nfc_removed' | 'write_result' | 'readers_list' | 'pong';
  serialNumber?: string;
  timestamp?: string;
  reader?: string;
  readers?: Array<{ name: string; index: number }>;
  success?: boolean;
  message?: string;
  request_id?: string;
  bytes_written?: number;
  pages_written?: number;
}

interface NFCBridgeHook {
  isConnected: boolean;
  lastTag: string | null;
  readers: Array<{ name: string; index: number }>;
  writeTag: (data: any) => Promise<{ success: boolean; message: string }>;
  disconnect: () => void;
}

const BRIDGE_URL = 'ws://localhost:8765';
const RECONNECT_DELAY = 5000; // 5 secondi

export function useNFCBridge(
  onTagDetected?: (serialNumber: string) => void,
  autoConnect: boolean = true
): NFCBridgeHook {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTag, setLastTag] = useState<string | null>(null);
  const [readers, setReaders] = useState<Array<{ name: string; index: number }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const writeResolversRef = useRef<Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>>(new Map());
  const { toast } = useToast();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      console.log(`🔌 Tentativo connessione a NFC Bridge: ${BRIDGE_URL}`);
      const ws = new WebSocket(BRIDGE_URL);

      ws.onopen = () => {
        console.log('✅ Bridge USB NFC connesso');
        setIsConnected(true);
        toast({
          title: "🔌 Bridge USB NFC connesso",
          description: "Lettore NFC USB pronto all'uso",
        });
      };

      ws.onclose = () => {
        console.log('🔌 Bridge USB NFC disconnesso');
        setIsConnected(false);
        wsRef.current = null;
        
        // Auto-riconnessione
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Tentativo riconnessione bridge...');
            connect();
          }, RECONNECT_DELAY);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Errore Bridge USB NFC:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message: NFCBridgeEvent = JSON.parse(event.data);
          console.log('📨 Messaggio bridge:', message);

          switch (message.type) {
            case 'connected':
              if (message.readers) {
                setReaders(message.readers);
                console.log(`📱 Lettori disponibili: ${message.readers.length}`);
              }
              break;

            case 'nfc_detected':
              if (message.serialNumber) {
                console.log(`📱 Tag NFC rilevato: ${message.serialNumber}`);
                setLastTag(message.serialNumber);
                
                toast({
                  title: "📱 Tag NFC rilevato",
                  description: `UID: ${message.serialNumber}`,
                });
                
                // Callback
                if (onTagDetected) {
                  onTagDetected(message.serialNumber);
                }
              }
              break;

            case 'nfc_removed':
              console.log('📱 Tag NFC rimosso');
              setLastTag(null);
              break;

            case 'write_result':
              // Risolvi promessa scrittura usando request_id
              const requestId = message.request_id;
              if (requestId) {
                const resolver = writeResolversRef.current.get(requestId);
                if (resolver) {
                  resolver.resolve({
                    success: message.success || false,
                    message: message.message || 'Unknown error'
                  });
                  writeResolversRef.current.delete(requestId);
                }
              }
              break;

            case 'readers_list':
              if (message.readers) {
                setReaders(message.readers);
              }
              break;
          }
        } catch (error) {
          console.error('❌ Errore parsing messaggio bridge:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Errore connessione bridge:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const writeTag = (data: any): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Bridge non connesso'));
        return;
      }

      // Genera ID univoco per questa richiesta
      const requestId = `write_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      writeResolversRef.current.set(requestId, { resolve, reject });

      // Timeout 10 secondi
      setTimeout(() => {
        if (writeResolversRef.current.has(requestId)) {
          writeResolversRef.current.delete(requestId);
          reject(new Error('Timeout scrittura tag'));
        }
      }, 10000);

      // Invia comando scrittura con request_id
      wsRef.current.send(JSON.stringify({
        type: 'write_tag',
        data,
        request_id: requestId
      }));
    });
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    lastTag,
    readers,
    writeTag,
    disconnect
  };
}
