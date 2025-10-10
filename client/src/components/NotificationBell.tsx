import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  data?: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Intervalli di polling per exponential backoff (in millisecondi)
  const BACKOFF_INTERVALS = [30000, 60000, 120000, 300000]; // 30s, 60s, 120s, 300s (max 5 minuti)
  
  // Stato per tracciare l'intervallo corrente
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [refetchInterval, setRefetchInterval] = useState(BACKOFF_INTERVALS[0]);

  // Ottieni solo le notifiche non lette
  const { data: unreadNotifications, isLoading } = useQuery<{ success: boolean; notifications: Notification[] }>({
    queryKey: ['/api/notifications', 'unread'],
    queryFn: () => apiRequest({ url: '/api/notifications?unreadOnly=true' }),
    refetchInterval: refetchInterval, // Usa l'intervallo dinamico
  });
  
  // Gestisci l'exponential backoff basato sulla presenza di notifiche
  useEffect(() => {
    if (unreadNotifications) {
      const hasNotifications = unreadNotifications.notifications && unreadNotifications.notifications.length > 0;
      
      if (hasNotifications) {
        // Se ci sono notifiche, resetta all'intervallo minimo
        if (currentIntervalIndex !== 0) {
          console.log('🔔 Notifiche presenti, resetto intervallo a 30s');
          setCurrentIntervalIndex(0);
          setRefetchInterval(BACKOFF_INTERVALS[0]);
        }
      } else {
        // Se non ci sono notifiche, aumenta progressivamente l'intervallo
        if (currentIntervalIndex < BACKOFF_INTERVALS.length - 1) {
          // Usa setTimeout per ritardare l'incremento dell'intervallo
          const timeoutId = setTimeout(() => {
            const nextIndex = currentIntervalIndex + 1;
            const nextInterval = BACKOFF_INTERVALS[nextIndex];
            console.log(`🔕 Nessuna notifica, aumento intervallo a ${nextInterval / 1000}s`);
            setCurrentIntervalIndex(nextIndex);
            setRefetchInterval(nextInterval);
          }, refetchInterval); // Aspetta il tempo dell'intervallo corrente prima di aumentare
          
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [unreadNotifications?.notifications?.length, currentIntervalIndex, refetchInterval]);

  // Attiva il websocket per ricevere notifiche in tempo reale
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const { notification } = event.detail;
      
      // Invalida la query per aggiornare l'elenco delle notifiche
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Mostra un toast con la notifica
      toast({
        title: notification.title,
        description: notification.message,
        variant: "default",
      });
    };

    // Registra il listener per le notifiche WebSocket
    document.addEventListener('ws:message:notification', handleNewNotification as EventListener);
    
    return () => {
      document.removeEventListener('ws:message:notification', handleNewNotification as EventListener);
    };
  }, [queryClient, toast]);

  // Ottieni tutte le notifiche quando il dialogo è aperto
  const { data: allNotifications, refetch: refetchAll } = useQuery<{ success: boolean; notifications: Notification[] }>({
    queryKey: ['/api/notifications', 'all'],
    queryFn: () => apiRequest({ url: '/api/notifications' }),
    enabled: isOpen, // Esegui la query solo quando il dialogo è aperto
  });

  // Formatta la data nel formato italiano
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Segna una notifica come letta
  const markAsRead = async (id: number) => {
    try {
      await apiRequest({
        url: `/api/notifications/${id}/read`,
        method: 'PUT'
      });
      
      // Aggiorna entrambe le query
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      toast({
        title: "Notifica aggiornata",
        description: "La notifica è stata segnata come letta",
        variant: "default",
      });
    } catch (error) {
      console.error("Errore durante l'aggiornamento della notifica:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della notifica",
        variant: "destructive",
      });
    }
  };

  // Segna tutte le notifiche come lette
  const markAllAsRead = async () => {
    try {
      await apiRequest({
        url: '/api/notifications/read-all',
        method: 'PUT'
      });
      
      // Aggiorna entrambe le query
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      toast({
        title: "Notifiche aggiornate",
        description: "Tutte le notifiche sono state segnate come lette",
        variant: "default",
      });
    } catch (error) {
      console.error("Errore durante l'aggiornamento delle notifiche:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento delle notifiche",
        variant: "destructive",
      });
    }
  };

  // Conta le notifiche non lette
  const unreadCount = unreadNotifications?.notifications?.filter(n => !n.isRead).length || 0;
  
  // Filtra le notifiche di vendita non lette
  const unreadSalesCount = unreadNotifications?.notifications?.filter(n => n.type === 'vendita' && !n.isRead).length || 0;
  
  // Filtra le notifiche di accrescimento non lette
  const unreadGrowthCount = unreadNotifications?.notifications?.filter(n => n.type === 'growth' && !n.isRead).length || 0;

  return (
    <>
      <button 
        className="relative flex items-center hover:bg-primary-dark p-2 rounded-md"
        onClick={() => setIsOpen(true)}
      >
        <Bell className={`h-5 w-5 mr-1 ${unreadCount > 0 ? 'text-green-400' : ''}`} />
        <span className="text-sm">Notifiche</span>
        
        {/* Badge per il conteggio delle notifiche non lette */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            unreadSalesCount > 0 ? 'bg-green-500' : unreadGrowthCount > 0 ? 'bg-orange-500' : 'bg-red-500'
          } text-white`}>
            {unreadCount}
          </span>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Notifiche</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Le notifiche di sistema e le operazioni importanti vengono mostrate qui.
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-4">Caricamento notifiche...</div>
            ) : allNotifications?.notifications && allNotifications.notifications.length > 0 ? (
              allNotifications.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.isRead 
                      ? notification.type === 'vendita' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className={`font-semibold ${!notification.isRead ? 'text-green-700' : ''}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {notification.message.split('\n').map((line, i) => {
                      // Funzione per elaborare la linea di testo in modo sicuro
                      const processLine = (text: string) => {
                        // Rimuovi o sostituisci tutti i codici ANSI
                        return text
                          .replace(/\u001b\[31m(.*?)\u001b\[0m/g, (_, p1) => `[ROSSO]${p1}[/ROSSO]`)
                          .replace(/\u001b\[32m(.*?)\u001b\[0m/g, (_, p1) => `[VERDE]${p1}[/VERDE]`);
                      };
                      
                      // Elaborazione della linea per rimuovere/sostituire codici ANSI
                      const processedLine = processLine(line);
                      
                      // Suddividi la linea in parti basate sui marcatori di colore
                      const parts = [];
                      let currentIndex = 0;
                      
                      // Verifica marcatori rosso
                      const redRegex = /\[ROSSO\](.*?)\[\/ROSSO\]/g;
                      let redMatch;
                      while ((redMatch = redRegex.exec(processedLine)) !== null) {
                        // Testo prima del marcatore
                        if (redMatch.index > currentIndex) {
                          parts.push({ 
                            type: 'text', 
                            content: processedLine.substring(currentIndex, redMatch.index) 
                          });
                        }
                        
                        // Testo colorato
                        parts.push({ 
                          type: 'red', 
                          content: redMatch[1] 
                        });
                        
                        currentIndex = redMatch.index + redMatch[0].length;
                      }
                      
                      // Verifica marcatori verde (sul testo residuo)
                      const remainingText = processedLine.substring(currentIndex);
                      const greenRegex = /\[VERDE\](.*?)\[\/VERDE\]/g;
                      let greenMatch;
                      let greenCurrentIndex = 0;
                      
                      while ((greenMatch = greenRegex.exec(remainingText)) !== null) {
                        // Testo prima del marcatore
                        if (greenMatch.index > greenCurrentIndex) {
                          parts.push({ 
                            type: 'text', 
                            content: remainingText.substring(greenCurrentIndex, greenMatch.index) 
                          });
                        }
                        
                        // Testo colorato
                        parts.push({ 
                          type: 'green', 
                          content: greenMatch[1] 
                        });
                        
                        greenCurrentIndex = greenMatch.index + greenMatch[0].length;
                      }
                      
                      // Testo rimanente dopo tutti i marcatori
                      if (currentIndex < processedLine.length && parts.length === 0) {
                        // Se non ci sono marcatori, aggiungi tutta la linea
                        parts.push({ 
                          type: 'text', 
                          content: processedLine 
                        });
                      } else if (greenCurrentIndex < remainingText.length) {
                        // Aggiungi il testo rimanente dopo l'ultimo marcatore verde
                        parts.push({ 
                          type: 'text', 
                          content: remainingText.substring(greenCurrentIndex) 
                        });
                      }
                      
                      // Renderizza le parti
                      return (
                        <div key={i} className="mb-1">
                          {parts.map((part, j) => {
                            if (part.type === 'red') {
                              return <span key={j} className="text-red-600">{part.content}</span>;
                            } else if (part.type === 'green') {
                              return <span key={j} className="text-green-600">{part.content}</span>;
                            } else {
                              return <span key={j}>{part.content}</span>;
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>
                  
                  {!notification.isRead && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Segna come letta
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                Non ci sono notifiche
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead}>
                Segna tutte come lette
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}