import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Target, Settings, CheckCircle, XCircle, Clock, TrendingUp, Fish } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';

interface NotificationSetting {
  id: number;
  notification_type: string;
  is_enabled: boolean;
  target_size_ids?: number[];
  createdAt: string;
  updatedAt?: string;
}

interface TargetSizeAnnotation {
  id: number;
  basketId: number;
  targetSizeId: number;
  predictedDate: string;
  status: 'pending' | 'reached' | 'missed';
  reachedDate?: string;
  notes?: string;
  basket?: any;
  targetSize?: any;
}

interface Size {
  id: number;
  code: string;
  name: string;
  minAnimalsPerKg: number;
  maxAnimalsPerKg: number;
  color?: string;
}

export default function NotificationManager() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('settings');
  const [testingGrowth, setTestingGrowth] = useState(false);

  // Query per le impostazioni notifiche
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/notification-settings'],
    refetchInterval: 30000,
  });

  // Query per le taglie disponibili
  const { data: sizes = [], isLoading: loadingSizes } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });

  // Query per le annotazioni target attive
  const { data: annotations = [], isLoading: loadingAnnotations } = useQuery<TargetSizeAnnotation[]>({
    queryKey: ['/api/target-size-annotations'],
    refetchInterval: 30000,
  });

  // Query per le notifiche recenti
  const { data: notificationsData, isLoading: loadingNotifications } = useQuery<any>({
    queryKey: ['/api/notifications', { type: 'accrescimento' }],
    refetchInterval: 30000,
  });

  // Mutation per aggiornare le impostazioni
  const updateSettingMutation = useMutation({
    mutationFn: async ({ type, isEnabled, targetSizeIds }: { 
      type: string; 
      isEnabled: boolean; 
      targetSizeIds?: number[] 
    }) => {
      return apiRequest('/api/notification-settings/' + type, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled, targetSizeIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: 'Impostazioni salvate',
        description: 'Le impostazioni delle notifiche sono state aggiornate con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le impostazioni.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per testare le notifiche di crescita
  const testGrowthMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/test-growth', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Test completato',
        description: data.message || 'Il test delle notifiche di crescita è stato eseguito.',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eseguire il test.',
        variant: 'destructive',
      });
    },
  });

  // Mutation per creare annotazione target
  const createAnnotationMutation = useMutation({
    mutationFn: async (data: {
      basketId: number;
      targetSizeId: number;
      predictedDate: string;
      notes?: string;
    }) => {
      return apiRequest('/api/target-size-annotations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/target-size-annotations'] });
      toast({
        title: 'Target creato',
        description: 'Il target di taglia è stato impostato con successo.',
      });
    },
  });

  const handleTestGrowthNotifications = async () => {
    setTestingGrowth(true);
    await testGrowthMutation.mutateAsync();
    setTestingGrowth(false);
  };

  const getSetting = (type: string): NotificationSetting | undefined => {
    return (settings as any)?.settings?.find((s: NotificationSetting) => s.notification_type === type);
  };

  const handleToggleNotification = (type: string, enabled: boolean) => {
    const currentSetting = getSetting(type);
    updateSettingMutation.mutate({
      type,
      isEnabled: enabled,
      targetSizeIds: currentSetting?.target_size_ids,
    });
  };

  const handleUpdateTargetSizes = (type: string, sizeIds: number[]) => {
    const currentSetting = getSetting(type);
    updateSettingMutation.mutate({
      type,
      isEnabled: currentSetting?.is_enabled || false,
      targetSizeIds: sizeIds,
    });
  };

  if (loadingSettings || loadingSizes) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Gestione Notifiche" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Gestione Notifiche" />
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Impostazioni
          </TabsTrigger>
          <TabsTrigger value="targets">
            <Target className="w-4 h-4 mr-2" />
            Target Attivi
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {/* Notifiche di vendita */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifiche Vendita
              </CardTitle>
              <CardDescription>
                Ricevi notifiche quando vengono registrate nuove vendite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="vendita-toggle">Abilita notifiche vendita</Label>
                <Switch
                  id="vendita-toggle"
                  checked={getSetting('vendita')?.is_enabled || false}
                  onCheckedChange={(checked) => handleToggleNotification('vendita', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifiche di accrescimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Notifiche Accrescimento
              </CardTitle>
              <CardDescription>
                Ricevi notifiche quando i cestelli raggiungono le taglie target configurate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="accrescimento-toggle">Abilita notifiche accrescimento</Label>
                <Switch
                  id="accrescimento-toggle"
                  checked={getSetting('accrescimento')?.is_enabled || false}
                  onCheckedChange={(checked) => handleToggleNotification('accrescimento', checked)}
                />
              </div>

              {getSetting('accrescimento')?.is_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Taglie target per notifiche</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {sizes?.map((size: Size) => {
                        const isSelected = getSetting('accrescimento')?.target_size_ids?.includes(size.id);
                        return (
                          <div
                            key={size.id}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                            onClick={() => {
                              const current = getSetting('accrescimento')?.target_size_ids || [];
                              const updated = isSelected
                                ? current.filter(id => id !== size.id)
                                : [...current, size.id];
                              handleUpdateTargetSizes('accrescimento', updated);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{size.code}</div>
                                <div className="text-xs text-gray-500">
                                  {size.minAnimalsPerKg}-{size.maxAnimalsPerKg} es/kg
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            {size.color && (
                              <div
                                className="mt-2 h-2 rounded"
                                style={{ backgroundColor: size.color }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Alert>
                    <Fish className="h-4 w-4" />
                    <AlertDescription>
                      Le notifiche vengono controllate automaticamente ogni giorno alle 00:00
                      per i cestelli con operazioni recenti.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleTestGrowthNotifications}
                    disabled={testingGrowth}
                    variant="outline"
                    className="w-full"
                  >
                    {testingGrowth ? 'Test in corso...' : 'Esegui test notifiche crescita'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Target di Taglia Attivi</CardTitle>
              <CardDescription>
                Cestelli con target di taglia impostati
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!annotations || annotations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nessun target di taglia attivo
                </div>
              ) : (
                <div className="space-y-2">
                  {annotations.filter((a: TargetSizeAnnotation) => a.status === 'pending').map((annotation: TargetSizeAnnotation) => (
                    <div
                      key={annotation.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            Cestello #{annotation.basket?.physicalNumber || annotation.basketId}
                          </div>
                          <div className="text-sm text-gray-500">
                            Target: {annotation.targetSize?.code || 'N/A'} - 
                            Previsto: {new Date(annotation.predictedDate).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          annotation.status === 'reached' ? 'default' :
                          annotation.status === 'missed' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {annotation.status === 'reached' ? 'Raggiunto' :
                         annotation.status === 'missed' ? 'Mancato' :
                         'In attesa'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storico Notifiche</CardTitle>
              <CardDescription>
                Ultime notifiche di accrescimento generate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!notificationsData?.notifications || notificationsData.notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nessuna notifica recente
                </div>
              ) : (
                <div className="space-y-2">
                  {notificationsData.notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString('it-IT')}
                        </div>
                      </div>
                      {notification.isRead ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                      ) : (
                        <Badge variant="default" className="ml-2">Nuova</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}