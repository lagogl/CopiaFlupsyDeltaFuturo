import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface NotificationSetting {
  id?: number;
  notificationType: string;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);

  // Ottieni tutte le impostazioni di notifica
  const { data: settingsData, isLoading } = useQuery<{ success: boolean; settings: NotificationSetting[] }>({
    queryKey: ['/api/notification-settings'],
    queryFn: () => apiRequest({ url: '/api/notification-settings' }),
  });

  // Mutazione per aggiornare un'impostazione
  const updateMutation = useMutation({
    mutationFn: ({ type, isEnabled }: { type: string; isEnabled: boolean }) =>
      apiRequest({
        url: `/api/notification-settings/${type}`,
        method: 'PUT',
        data: { isEnabled }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: "Impostazione aggiornata",
        description: "Le impostazioni di notifica sono state aggiornate con successo",
      });
    },
    onError: (error) => {
      console.error("Errore durante l'aggiornamento dell'impostazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dell'impostazione",
        variant: "destructive",
      });
    }
  });

  // Mutazione per testare il controllo di crescita
  const testMutation = useMutation({
    mutationFn: () => 
      apiRequest({
        url: '/api/check-growth-notifications',
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast({
        title: "Test completato",
        description: data.message || "Il test di controllo notifiche di crescita è stato completato",
      });
      setIsTesting(false);
      
      // Invalida anche le notifiche per ricaricarle
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      console.error("Errore durante il test:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il test di controllo notifiche",
        variant: "destructive",
      });
      setIsTesting(false);
    }
  });

  // Gestisci il cambio di un'impostazione
  const handleToggle = (type: string, currentValue: boolean) => {
    updateMutation.mutate({ type, isEnabled: !currentValue });
  };

  // Avvia il test di controllo notifiche
  const handleTestGrowthNotifications = () => {
    setIsTesting(true);
    testMutation.mutate();
  };

  // Descrizioni dei tipi di notifica
  const notificationTypeDescriptions: Record<string, { title: string; description: string }> = {
    'vendita': {
      title: 'Notifiche di vendita',
      description: 'Ricevi notifiche quando vengono registrate operazioni di vendita'
    },
    'accrescimento': {
      title: 'Notifiche di accrescimento',
      description: 'Ricevi notifiche quando un ciclo raggiunge la taglia TP-3000'
    }
  };

  // Crea un array di tipi di notifica predefiniti se non abbiamo dati dal backend
  const defaultSettings: NotificationSetting[] = [
    { notificationType: 'vendita', isEnabled: true },
    { notificationType: 'accrescimento', isEnabled: true }
  ];

  // Combina le impostazioni dal server con quelle predefinite
  const settings = settingsData?.settings || [];
  const mergedSettings = [...defaultSettings].map(defaultSetting => {
    const serverSetting = settings.find(s => s.notificationType === defaultSetting.notificationType);
    return serverSetting || defaultSetting;
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Impostazioni notifiche</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipi di notifiche</CardTitle>
              <CardDescription>
                Personalizza quali tipi di notifiche desideri ricevere
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {mergedSettings.map((setting) => (
                <div key={setting.notificationType} className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      {notificationTypeDescriptions[setting.notificationType]?.title || setting.notificationType}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {notificationTypeDescriptions[setting.notificationType]?.description || 'Nessuna descrizione disponibile'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${setting.notificationType}`} className="sr-only">
                      Abilita {notificationTypeDescriptions[setting.notificationType]?.title || setting.notificationType}
                    </Label>
                    <Switch
                      id={`toggle-${setting.notificationType}`}
                      checked={setting.isEnabled}
                      onCheckedChange={() => handleToggle(setting.notificationType, setting.isEnabled)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Strumenti di test</CardTitle>
              <CardDescription>
                Esegui manualmente i controlli per le notifiche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">Test notifiche accrescimento</h3>
                <p className="text-sm text-gray-500">
                  Esegui manualmente il controllo per identificare i cicli che hanno raggiunto la taglia TP-3000
                </p>
                <div className="flex justify-start mt-2">
                  <Button 
                    onClick={handleTestGrowthNotifications} 
                    disabled={isTesting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Controllo in corso...
                      </>
                    ) : (
                      'Esegui controllo TP-3000'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}