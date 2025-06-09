import { useState, useEffect } from "react";
import { useWebSocketMessage } from "@/lib/websocket";
import { Loader2, Database, RefreshCw, CheckCircle2 } from "lucide-react";

interface SystemStatus {
  type: 'cache_update' | 'database_sync' | 'data_refresh' | 'idle';
  message: string;
  isVisible: boolean;
}

export default function SystemStatusIndicator() {
  const [status, setStatus] = useState<SystemStatus>({
    type: 'idle',
    message: '',
    isVisible: false
  });

  // Nasconde automaticamente dopo 3 secondi
  useEffect(() => {
    if (status.isVisible && status.type !== 'idle') {
      const timer = setTimeout(() => {
        setStatus(prev => ({ ...prev, isVisible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.isVisible, status.type]);

  // Listeners per eventi WebSocket di sistema
  useWebSocketMessage('cache_invalidated', () => {
    setStatus({
      type: 'cache_update',
      message: 'Aggiornamento cache in corso...',
      isVisible: true
    });
  });

  useWebSocketMessage('database_sync', () => {
    setStatus({
      type: 'database_sync',
      message: 'Sincronizzazione database...',
      isVisible: true
    });
  });

  useWebSocketMessage('data_refresh', () => {
    setStatus({
      type: 'data_refresh',
      message: 'Aggiornamento dati in tempo reale...',
      isVisible: true
    });
  });

  useWebSocketMessage('basket_created', () => {
    setStatus({
      type: 'data_refresh',
      message: 'Nuovo cestello creato',
      isVisible: true
    });
    // Mostra successo dopo 1 secondo
    setTimeout(() => {
      setStatus({
        type: 'idle',
        message: 'Aggiornamento completato',
        isVisible: true
      });
    }, 1000);
  });

  useWebSocketMessage('basket_updated', () => {
    setStatus({
      type: 'data_refresh',
      message: 'Cestello aggiornato',
      isVisible: true
    });
  });

  useWebSocketMessage('operation_created', () => {
    setStatus({
      type: 'data_refresh',
      message: 'Nuova operazione registrata',
      isVisible: true
    });
  });

  const getIcon = () => {
    switch (status.type) {
      case 'cache_update':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'database_sync':
        return <Database className="h-4 w-4 animate-pulse" />;
      case 'data_refresh':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'idle':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Loader2 className="h-4 w-4" />;
    }
  };

  const getBackgroundColor = () => {
    switch (status.type) {
      case 'cache_update':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'database_sync':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'data_refresh':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'idle':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (!status.isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out transform ${
      status.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
    }`}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm ${getBackgroundColor()}`}>
        {getIcon()}
        <span className="text-sm font-medium">{status.message}</span>
      </div>
    </div>
  );
}