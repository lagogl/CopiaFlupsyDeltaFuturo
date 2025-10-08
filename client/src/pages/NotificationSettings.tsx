import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface NotificationSetting {
  id?: number;
  notificationType: string;
  isEnabled: boolean;
  targetSizeIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

interface Size {
  id: number;
  name: string;
  code: string;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [selectedSizeIds, setSelectedSizeIds] = useState<number[]>([]);

  // Ottieni tutte le impostazioni di notifica
  const { data: settingsData, isLoading } = useQuery<{ success: boolean; settings: NotificationSetting[] }>({
    queryKey: ['/api/notification-settings'],
  });

  // Ottieni tutte le taglie disponibili
  const { data: sizesData } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });

  // Sincronizza le taglie selezionate con i dati dal server
  useEffect(() => {
    if (settingsData?.settings) {
      const accrescimentoSetting = settingsData.settings.find(s => s.notificationType === 'accrescimento');
      if (accrescimentoSetting?.targetSizeIds) {
        const sizeIds = Array.isArray(accrescimentoSetting.targetSizeIds) 
          ? accrescimentoSetting.targetSizeIds 
          : [];
        
        // Aggiorna solo se i valori sono diversi (evita loop infiniti)
        const currentIds = JSON.stringify([...selectedSizeIds].sort());
        const newIds = JSON.stringify([...sizeIds].sort());
        
        if (currentIds !== newIds) {
          setSelectedSizeIds(sizeIds);
          console.log('Taglie sincronizzate dal server:', sizeIds);
        }
      } else if (selectedSizeIds.length > 0 && !accrescimentoSetting?.targetSizeIds) {
        // Se il server non ha taglie ma lo stato locale sì, resetta
        setSelectedSizeIds([]);
        console.log('Taglie resettate (nessuna taglia nel server)');
      }
    }
  }, [settingsData, selectedSizeIds]);

  // Mutazione per aggiornare un'impostazione
  const updateMutation = useMutation({
    mutationFn: ({ type, isEnabled, targetSizeIds }: { type: string; isEnabled: boolean; targetSizeIds?: number[] }) =>
      apiRequest({
        url: `/api/notification-settings/${type}`,
        method: 'PUT',
        body: { isEnabled, targetSizeIds }
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
      const accrescimentoSetting = mergedSettings.find(s => s.notificationType === 'accrescimento');
      const isEnabled = accrescimentoSetting?.isEnabled || false;
      
      // Se le notifiche sono disabilitate, avvisa l'utente
      if (!isEnabled && data.message?.includes('create 0 notifiche')) {
        toast({
          title: "Test completato",
          description: "Le notifiche di accrescimento sono disabilitate. Attivale per ricevere notifiche.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test completato",
          description: data.message || "Il test di controllo notifiche di crescita è stato completato",
        });
      }
      
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
    // Se è la notifica di accrescimento, mantieni le taglie selezionate nello stato locale
    if (type === 'accrescimento') {
      updateMutation.mutate({ 
        type, 
        isEnabled: !currentValue,
        // Usa sempre lo stato locale delle taglie selezionate
        targetSizeIds: selectedSizeIds.length > 0 ? selectedSizeIds : undefined
      });
    } else {
      updateMutation.mutate({ type, isEnabled: !currentValue });
    }
  };

  // Gestisci la selezione/deselezione di una taglia
  const handleSizeToggle = (sizeId: number) => {
    setSelectedSizeIds(prev => {
      const newSelection = prev.includes(sizeId)
        ? prev.filter(id => id !== sizeId)
        : [...prev, sizeId];
      
      // Aggiorna sempre sul server, indipendentemente dallo stato delle notifiche
      const accrescimentoSetting = mergedSettings.find(s => s.notificationType === 'accrescimento');
      updateMutation.mutate({
        type: 'accrescimento',
        isEnabled: accrescimentoSetting?.isEnabled || false,
        targetSizeIds: newSelection.length > 0 ? newSelection : undefined
      });
      
      return newSelection;
    });
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
      description: 'Ricevi notifiche quando un ciclo raggiunge una taglia configurata'
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
                <div key={setting.notificationType} className="space-y-4">
                  <div className="flex items-center justify-between">
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
                  
                  {/* Mostra selezione taglie solo per notifiche di accrescimento */}
                  {setting.notificationType === 'accrescimento' && setting.isEnabled && sizesData && (
                    <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Taglie da monitorare:</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Seleziona una o più taglie per ricevere notifiche quando i cestelli le raggiungono
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {sizesData.map((size) => (
                          <div key={size.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`size-${size.id}`}
                              checked={selectedSizeIds.includes(size.id)}
                              onCheckedChange={() => handleSizeToggle(size.id)}
                              disabled={updateMutation.isPending}
                            />
                            <label
                              htmlFor={`size-${size.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {size.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedSizeIds.length === 0 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Nessuna taglia selezionata. Verrà usata TP-3000 come default.
                        </p>
                      )}
                      {selectedSizeIds.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ {selectedSizeIds.length} taglia{selectedSizeIds.length > 1 ? 'e' : ''} selezionata{selectedSizeIds.length > 1 ? 'e' : ''}
                        </p>
                      )}
                    </div>
                  )}
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
                  Esegui manualmente il controllo per identificare i cicli che hanno raggiunto le taglie configurate
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
                      'Esegui controllo taglie'
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
