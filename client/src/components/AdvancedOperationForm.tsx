import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocketMessage } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { operationSchema } from "@shared/schema";
import { TrendingUp, AlertTriangle, Package, Calendar, Scale } from "lucide-react";

// Schema esteso per includere il campo FLUPSY e i nuovi campi standardizzati
const formSchemaWithFlupsy = operationSchema.extend({
  // Override della data per assicurarci che funzioni correttamente con il form
  date: z.coerce.date(),
  animalsPerKg: z.coerce.number().optional().nullable(),
  totalWeight: z.coerce.number().optional().nullable(),
  animalCount: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  // Aggiunto campo FLUPSY per la selezione in due fasi
  flupsyId: z.number().nullable().optional(),
  // Nuovi campi standardizzati per tutte le operazioni
  sampleWeight: z.coerce.number().optional().nullable(), // Grammi sample
  liveAnimals: z.coerce.number().optional().nullable(), // Numero animali vivi
  deadCount: z.coerce.number().optional().nullable(), // Numero animali morti (già esistente nello schema)
  totalSample: z.coerce.number().optional().nullable(), // Totale sample (vivi + morti)
  manualCountAdjustment: z.boolean().optional().default(false), // Flag per abilitare la modifica manuale del conteggio
  // Per le operazioni avanzate il cicleId NON è richiesto (può essere null)
  cycleId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchemaWithFlupsy>;

interface LotInfo {
  id: number;
  supplier: string;
  supplierLotNumber: string;
  arrivalDate: string;
  initialCount: number;
  currentCount: number;
  soldCount: number;
  mortalityCount: number;
  mortalityPercentage: number;
  averageSgr: number;
  currentWeight: number;
  initialWeight: number;
  weightGrowth: number;
  activeBasketsCount: number;
  lastOperationDate: string;
  lastOperationType: string;
  quality: string;
  status: 'active' | 'warning' | 'critical';
}

interface AdvancedOperationFormProps {
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void;
  defaultValues?: Partial<FormValues>;
  isLoading?: boolean;
  editMode?: boolean;
  initialCycleId?: number | null;
  initialFlupsyId?: number | null;
  initialBasketId?: number | null;
  isDuplication?: boolean;
}

export default function AdvancedOperationForm({ 
  onSubmit, 
  onCancel,
  defaultValues = {
    date: new Date(),
    type: 'misura',
    flupsyId: null,
    cycleId: null,
  },
  isLoading = false,
  editMode = false,
  initialCycleId = null,
  initialFlupsyId = null,
  initialBasketId = null,
  isDuplication = false
}: AdvancedOperationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<any | null>(null);
  const [lotInfo, setLotInfo] = useState<LotInfo | null>(null);
  const [isLoadingLotInfo, setIsLoadingLotInfo] = useState(false);

  // Fetch related data (copiato dal form originale)
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles/active'],
  });

  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgr'],
  });

  const { data: lots } = useQuery({
    queryKey: ['/api/lots/active'],
  });

  // Inizializzazione del form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchemaWithFlupsy),
    defaultValues,
  });

  // Watches (copiato dal form originale) 
  const watchAnimalsPerKg = form.watch('animalsPerKg');
  const watchAnimalCount = form.watch('animalCount');
  const watchBasketId = form.watch('basketId');
  const watchFlupsyId = form.watch('flupsyId');
  const watchCycleId = form.watch('cycleId');
  const watchType = form.watch('type');
  const watchDate = form.watch('date');
  const watchLotId = form.watch('lotId');
  const watchSampleWeight = form.watch('sampleWeight');
  const watchLiveAnimals = form.watch('liveAnimals');
  const watchDeadCount = form.watch('deadCount');
  const watchTotalWeight = form.watch('totalWeight');
  const watchManualCountAdjustment = form.watch('manualCountAdjustment');

  // Fetch baskets for selected FLUPSY (copiato dal form originale)
  const { data: allFlupsyBaskets, isLoading: isLoadingFlupsyBaskets } = useQuery({
    queryKey: ['/api/flupsys', watchFlupsyId, 'baskets'],
    queryFn: () => {
      if (!watchFlupsyId) return [];
      return fetch(`/api/flupsys/${watchFlupsyId}/baskets`).then(res => res.json());
    },
    enabled: !!watchFlupsyId,
  });

  // Filter baskets based on operation type - VERSIONE CORRETTA PER OPERAZIONI AVANZATE
  const flupsyBaskets = React.useMemo(() => {
    if (!allFlupsyBaskets) return [];
    
    // Per le operazioni avanzate (misura/peso) mostriamo TUTTI i cestelli del FLUPSY
    // sia quelli disponibili che quelli attivi
    return allFlupsyBaskets.filter((basket: any) => 
      basket.state === 'active' || basket.state === 'disponibile'
    );
  }, [allFlupsyBaskets, watchType]);

  // **NUOVA FUNZIONALITÀ: Fetch lot analytics quando viene selezionato un lotto**
  useEffect(() => {
    if (watchLotId && lots) {
      setIsLoadingLotInfo(true);
      
      // Chiamata agli analytics del lotto (usa il sistema sviluppato stamattina)
      fetch(`/api/analytics/lots/${watchLotId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLotInfo(data.lotAnalytics);
          }
        })
        .catch(err => {
          console.error('Errore caricamento analytics lotto:', err);
        })
        .finally(() => {
          setIsLoadingLotInfo(false);
        });
    } else {
      setLotInfo(null);
    }
  }, [watchLotId, lots]);

  // Logic originale per calcoli (copiato dal form originale)
  useEffect(() => {
    if (watchAnimalsPerKg && watchAnimalsPerKg > 0) {
      form.setValue('averageWeight', 1000000 / watchAnimalsPerKg);
      
      if (sizes && sizes.length > 0) {
        import("@/lib/utils").then(({ findSizeByAnimalsPerKg }) => {
          const selectedSize = findSizeByAnimalsPerKg(watchAnimalsPerKg, sizes);
          if (selectedSize) {
            form.setValue('sizeId', selectedSize.id);
          } else {
            form.setValue('sizeId', null);
          }
        }).catch(error => {
          console.error("Errore nel caricamento delle funzioni di utilità:", error);
        });
      }
    } else {
      form.setValue('averageWeight', null);
    }
  }, [watchAnimalsPerKg, sizes]);

  // **PANNELLO INFORMATIVO LOTTO**
  const renderLotInfoPanel = () => {
    if (!watchLotId) {
      return (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Informazioni Lotto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500">Seleziona un lotto per vedere le informazioni</p>
          </CardContent>
        </Card>
      );
    }

    if (isLoadingLotInfo) {
      return (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Caricamento Analytics Lotto...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      );
    }

    if (!lotInfo) {
      return (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Analytics Non Disponibili
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-yellow-700">Impossibile caricare le informazioni del lotto</p>
          </CardContent>
        </Card>
      );
    }

    // Determina il colore dello status
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return 'green';
        case 'warning': return 'yellow'; 
        case 'critical': return 'red';
        default: return 'gray';
      }
    };

    const statusColor = getStatusColor(lotInfo.status);
    const utilizationPercentage = (lotInfo.soldCount / lotInfo.initialCount) * 100;

    return (
      <Card className={`bg-${statusColor}-50 border-${statusColor}-200`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm text-${statusColor}-600 flex items-center justify-between`}>
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              LOTTO #{lotInfo.supplierLotNumber}
            </div>
            <Badge variant={lotInfo.status === 'active' ? 'default' : lotInfo.status === 'warning' ? 'secondary' : 'destructive'}>
              {lotInfo.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <p className={`text-xs text-${statusColor}-600`}>
            {lotInfo.supplier} • Arrivo: {new Date(lotInfo.arrivalDate).toLocaleDateString('it-IT')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sezione Inventario */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Scale className="h-3 w-3 mr-1" />
              INVENTARIO
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Iniziali:</span>
                <div className="font-mono">{lotInfo.initialCount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Attuali:</span>
                <div className="font-mono text-blue-600">{lotInfo.currentCount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Utilizzati:</span>
                <div className="font-mono">{lotInfo.soldCount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Disponibili:</span>
                <div className="font-mono text-green-600">{(lotInfo.currentCount - lotInfo.soldCount).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Utilizzo</span>
                <span>{utilizationPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={utilizationPercentage} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Sezione Performance */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              PERFORMANCE & CRESCITA
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">SGR Medio:</span>
                <div className={`font-mono ${lotInfo.averageSgr > 2 ? 'text-green-600' : lotInfo.averageSgr > 1.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {lotInfo.averageSgr.toFixed(1)}%/giorno
                </div>
              </div>
              <div>
                <span className="text-gray-500">Crescita Peso:</span>
                <div className="font-mono text-green-600">+{lotInfo.weightGrowth.toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-gray-500">Mortalità:</span>
                <div className={`font-mono ${lotInfo.mortalityPercentage < 5 ? 'text-green-600' : lotInfo.mortalityPercentage < 8 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {lotInfo.mortalityPercentage.toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-gray-500">Cestelli Attivi:</span>
                <div className="font-mono">{lotInfo.activeBasketsCount}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Status Operativo */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              STATUS OPERATIVO
            </h4>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-gray-500">Ultima operazione:</span>
                <div className="flex justify-between">
                  <span className="capitalize">{lotInfo.lastOperationType}</span>
                  <span>{new Date(lotInfo.lastOperationDate).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Qualità:</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {lotInfo.quality}
                </Badge>
              </div>
            </div>
          </div>

          {/* Alert intelligenti */}
          {lotInfo.mortalityPercentage > 8 && (
            <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-700">
              ⚠️ Mortalità elevata - Controlli qualità consigliati
            </div>
          )}
          
          {lotInfo.averageSgr < 1.5 && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs text-yellow-700">
              📊 Crescita lenta - Valuta cambio alimentazione
            </div>
          )}

          {(lotInfo.currentCount - lotInfo.soldCount) < (lotInfo.initialCount * 0.1) && (
            <div className="bg-orange-100 border border-orange-300 rounded p-2 text-xs text-orange-700">
              📦 Scorte in esaurimento - Rimanenti: {((lotInfo.currentCount - lotInfo.soldCount) / lotInfo.initialCount * 100).toFixed(1)}%
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Submit handler (copiato dal form originale)
  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit((values) => {
      // Controllo se l'operazione di misura cambierà il conteggio animali 
      if (values.type === 'misura' && values.deadCount && values.deadCount > 0) {
        setPendingValues(values);
        setShowConfirmDialog(true);
        return;
      }
      
      onSubmit(values);
    })();
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmitForm} className="space-y-6">
        {/* Layout a 3 colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonna sinistra: Dati Operazione + Posizionamento */}
          <div className="space-y-4">
            {/* Dati Operazione */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  📝 Dati Operazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo operazione *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="misura">Misura</SelectItem>
                            <SelectItem value="peso">Peso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Posizionamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  📍 Posizionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="flupsyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FLUPSY *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Seleziona FLUPSY" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flupsys?.map((flupsy: any) => (
                            <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                              {flupsy.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="basketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cestello *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                        disabled={!watchFlupsyId || isLoadingFlupsyBaskets}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder={
                              !watchFlupsyId ? "Prima seleziona FLUPSY" : 
                              isLoadingFlupsyBaskets ? "Caricamento..." : 
                              "Seleziona cestello"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flupsyBaskets?.map((basket: any) => (
                            <SelectItem key={basket.id} value={basket.id.toString()}>
                              Posizione: {basket.row}-{basket.position} 
                              {basket.state === 'disponibile' ? ' (Disponibile)' : 
                               basket.state === 'active' ? ' (Attivo)' : 
                               ` (${basket.state})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonna centrale: Dati Misurazione */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  🔬 Dati Misurazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="sampleWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso in grammi sample</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Peso totale campione"
                            className="text-sm"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="liveAnimals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero animali vivi</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Animali vivi nel campione"
                            className="text-sm"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero animali morti</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            className="text-sm"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso totale (grammi)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Peso totale cestello"
                            className="text-sm"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Valori Calcolati */}
                <div className="bg-purple-50 border border-purple-200 rounded p-3 space-y-2">
                  <h4 className="font-semibold text-sm text-purple-700">⚡ Valori Calcolati</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-purple-600">Animali per kg:</span>
                      <div className="font-mono">{watchAnimalsPerKg?.toLocaleString() || '-'}</div>
                    </div>
                    <div>
                      <span className="text-purple-600">Peso medio:</span>
                      <div className="font-mono">{watchAnimalsPerKg ? (1000000 / watchAnimalsPerKg).toFixed(3) : '-'} mg</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Note */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  📝 Note Aggiuntive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Inserisci note aggiuntive sull'operazione" 
                          rows={3}
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonna destra: PANNELLO INFORMATIVO LOTTO + SELEZIONE LOTTO */}
          <div className="space-y-4">
            {/* Selezione Lotto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  📦 Lotto di Riferimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="lotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleziona Lotto</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Seleziona lotto per analytics" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lots?.map((lot: any) => (
                            <SelectItem key={lot.id} value={lot.id.toString()}>
                              {lot.supplierLotNumber} - {lot.supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Opzionale - Seleziona per visualizzare analytics dettagliati
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pannello Analytics */}
            {renderLotInfoPanel()}
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.reset();
              if (onCancel) onCancel();
            }}
          >
            Annulla
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-white font-medium"
          >
            {isLoading ? "Salvataggio..." : "Registra Operazione"}
          </Button>
        </div>
      </form>
      
      {/* Dialog di conferma (copiato dal form originale) */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma operazione con mortalità</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione registrerà una mortalità di {watchDeadCount} animali. Continuare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingValues && onSubmit) {
                onSubmit(pendingValues);
                setPendingValues(null);
              }
              setShowConfirmDialog(false);
            }}>
              Procedi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}