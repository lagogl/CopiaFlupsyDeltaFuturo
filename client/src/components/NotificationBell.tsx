import { useState, useEffect } from "react";
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

  // Ottieni solo le notifiche non lette
  const { data: unreadNotifications, isLoading } = useQuery<{ success: boolean; notifications: Notification[] }>({
    queryKey: ['/api/notifications', 'unread'],
    queryFn: () => apiRequest({ url: '/api/notifications?unreadOnly=true' }),
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });

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

  return (
    <>
      <button 
        className="relative flex items-center hover:bg-primary-dark p-2 rounded-md"
        onClick={() => setIsOpen(true)}
      >
        <Bell className={`h-5 w-5 mr-1 ${unreadSalesCount > 0 ? 'text-green-400' : ''}`} />
        <span className="text-sm">Notifiche</span>
        
        {/* Badge per il conteggio delle notifiche non lette */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            unreadSalesCount > 0 ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {unreadCount}
          </span>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Notifiche</DialogTitle>
            <DialogDescription>
              Le notifiche di sistema e le operazioni importanti vengono mostrate qui.
            </DialogDescription>
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
                  <div className="mt-1 text-gray-700 whitespace-pre-wrap">{notification.message}</div>
                  
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