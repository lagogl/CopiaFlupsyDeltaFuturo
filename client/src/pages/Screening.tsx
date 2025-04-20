import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Loader2, Calculator, ChevronRight, RefreshCw, Save } from 'lucide-react';

/**
 * Pagina di vagliatura
 * 
 * Questa pagina permette di eseguire un'operazione di vagliatura con:
 * 1. Selezione ceste origine
 * 2. Inserimento dati campionatura
 * 3. Preview risultati calcolati
 * 4. Selezione ceste destinazione
 * 5. Conferma finale
 */
export default function ScreeningPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Stato per gestire i vari passaggi dell'operazione
  const [step, setStep] = useState<'source' | 'sampling' | 'preview' | 'destination' | 'confirm'>('source');
  const [sourceBasketIds, setSourceBasketIds] = useState<number[]>([]);
  const [samplingData, setSamplingData] = useState<{
    sampleWeight: number;
    sampleCount: number;
    deadCount: number;
  } | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [destinationBaskets, setDestinationBaskets] = useState<any[]>([]);
  
  // Carica tutti i cestelli disponibili
  const { data: baskets, isLoading: isBasketsLoading } = useQuery({
    queryKey: ['/api/baskets'],
    refetchOnWindowFocus: false
  });
  
  // Schema di validazione per il form di campionatura
  const samplingSchema = z.object({
    sampleWeight: z.coerce.number().min(1, "Il peso del campione è obbligatorio").max(10000, "Valore massimo: 10,000g"),
    sampleCount: z.coerce.number().min(1, "Il numero di animali è obbligatorio"),
    deadCount: z.coerce.number().min(0, "Non può essere negativo"),
    notes: z.string().optional()
  });
  
  // Form di campionatura
  const samplingForm = useForm<z.infer<typeof samplingSchema>>({
    resolver: zodResolver(samplingSchema),
    defaultValues: {
      sampleWeight: 100,
      sampleCount: 0,
      deadCount: 0,
      notes: ''
    }
  });
  
  // Preparazione dell'operazione (calcoli e previsioni)
  const prepareScreeningMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest({
        url: '/api/screening/prepare',
        method: 'POST',
        body: data
      });
      return response;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep('preview');
    },
    onError: (error: any) => {
      toast({
        title: "Errore nella preparazione",
        description: error.message || "Si è verificato un errore durante la preparazione dell'operazione",
        variant: "destructive"
      });
    }
  });
  
  // Esecuzione dell'operazione (salvataggio nel DB)
  const executeScreeningMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest({
        url: '/api/screening/execute',
        method: 'POST',
        body: data
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Operazione completata",
        description: "L'operazione di vagliatura è stata completata con successo"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      // Reindirizza alla pagina delle operazioni
      setLocation('/operations');
    },
    onError: (error: any) => {
      toast({
        title: "Errore nell'esecuzione",
        description: error.message || "Si è verificato un errore durante l'esecuzione dell'operazione",
        variant: "destructive"
      });
    }
  });
  
  // Gestione del form di campionatura
  const onSamplingFormSubmit = (data: z.infer<typeof samplingSchema>) => {
    setSamplingData({
      sampleWeight: data.sampleWeight,
      sampleCount: data.sampleCount,
      deadCount: data.deadCount
    });
    
    // Prepara i dati per il calcolo
    prepareScreeningMutation.mutate({
      sourceBasketIds,
      sampleWeight: data.sampleWeight,
      sampleCount: data.sampleCount,
      deadCount: data.deadCount,
      date: new Date().toISOString(),
      notes: data.notes
    });
  };
  
  // Gestione della selezione cestelli origine
  const handleSourceBasketSelect = (basketId: number, checked: boolean) => {
    if (checked) {
      setSourceBasketIds(prev => [...prev, basketId]);
    } else {
      setSourceBasketIds(prev => prev.filter(id => id !== basketId));
    }
  };
  
  // Aggiungi cestello di destinazione
  const handleAddDestinationBasket = (basket: any, position: any) => {
    if (!previewData) return;
    
    setDestinationBaskets(prev => [
      ...prev,
      {
        basketId: basket.id,
        flupsyId: position.flupsyId,
        row: position.row,
        position: position.position,
        // Calcola il numero teorico di animali per questo cestello
        animalCount: Math.round(previewData.calculatedValues.animalsPerKg * ((previewData.sourceBaskets.length * 1000) / destinationBaskets.length + 1)),
        animalsPerKg: previewData.calculatedValues.animalsPerKg,
        sizeId: previewData.calculatedValues.sizeId
      }
    ]);
  };
  
  // Rimuovi cestello di destinazione
  const handleRemoveDestinationBasket = (index: number) => {
    setDestinationBaskets(prev => prev.filter((_, i) => i !== index));
  };
  
  // Conferma finale
  const handleConfirm = () => {
    if (!samplingData || !previewData || destinationBaskets.length === 0) {
      toast({
        title: "Dati incompleti",
        description: "Completa tutti i passaggi prima di confermare l'operazione",
        variant: "destructive"
      });
      return;
    }
    
    // Esegui l'operazione
    executeScreeningMutation.mutate({
      sourceBasketIds,
      destinationBaskets,
      sampleWeight: samplingData.sampleWeight,
      sampleCount: samplingData.sampleCount,
      deadCount: samplingData.deadCount,
      date: new Date().toISOString(),
      notes: samplingForm.getValues().notes,
      sizeId: previewData.calculatedValues.sizeId,
      animalsPerKg: previewData.calculatedValues.animalsPerKg,
      mortalityRate: previewData.calculatedValues.mortalityRate
    });
  };
  
  // Funzione per mostrare i cestelli di origine disponibili
  const renderSourceBaskets = () => {
    if (isBasketsLoading) {
      return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!baskets || !Array.isArray(baskets) || baskets.length === 0) {
      return <div className="text-center p-4">Nessun cestello disponibile</div>;
    }
    
    // Filtra solo cestelli con un ciclo attivo
    const availableBaskets = baskets.filter((basket: any) => basket.currentCycleId);
    
    if (availableBaskets.length === 0) {
      return <div className="text-center p-4">Nessun cestello con ciclo attivo disponibile</div>;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
        {availableBaskets.map((basket: any) => (
          <Card key={basket.id} className={`cursor-pointer ${sourceBasketIds.includes(basket.id) ? 'border-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Cestello #{basket.physicalNumber}</div>
                  <div className="text-sm text-gray-500">
                    {basket.flupsy?.name || 'FLUPSY non assegnato'} 
                    {basket.row && basket.position ? ` - ${basket.row}-${basket.position}` : ''}
                  </div>
                  {basket.lastOperation && (
                    <div className="text-xs">
                      <Badge variant="outline" className="mt-1">
                        {basket.lastOperation.type}
                      </Badge>
                    </div>
                  )}
                </div>
                <Checkbox 
                  checked={sourceBasketIds.includes(basket.id)}
                  onCheckedChange={(checked) => handleSourceBasketSelect(basket.id, checked as boolean)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Funzione per mostrare il form di campionatura
  const renderSamplingForm = () => {
    return (
      <Form {...samplingForm}>
        <form onSubmit={samplingForm.handleSubmit(onSamplingFormSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dati del campione</CardTitle>
              <CardDescription>
                Inserisci i dati del campione prelevato per la vagliatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={samplingForm.control}
                name="sampleWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso del campione (g)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Peso in grammi" 
                        {...field} 
                        min={1}
                        step={10}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci il peso in grammi del campione prelevato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={samplingForm.control}
                name="sampleCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero di animali nel campione</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Conteggio animali" 
                        {...field} 
                        min={1}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci il numero di animali contati nel campione
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={samplingForm.control}
                name="deadCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Animali morti nel campione</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Conteggio animali morti" 
                        {...field} 
                        min={0}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci il numero di animali morti trovati nel campione
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="bg-slate-50 p-4 rounded-md mt-4">
                <div className="font-medium mb-2 flex items-center">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcoli automatici
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Animali per kg:</span>
                    <span className="font-semibold ml-2">
                      {samplingForm.watch('sampleCount') && samplingForm.watch('sampleWeight') 
                        ? Math.round(samplingForm.watch('sampleCount') / (samplingForm.watch('sampleWeight') / 1000)) 
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mortalità:</span>
                    <span className="font-semibold ml-2">
                      {samplingForm.watch('sampleCount') && samplingForm.watch('deadCount') 
                        ? ((samplingForm.watch('deadCount') / samplingForm.watch('sampleCount')) * 100).toFixed(2) + '%' 
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              <FormField
                control={samplingForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Note opzionali sull'operazione" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setStep('source')}
            >
              Indietro
            </Button>
            <Button 
              type="submit" 
              disabled={prepareScreeningMutation.isPending}
            >
              {prepareScreeningMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calcolo in corso...
                </>
              ) : (
                <>
                  Calcola
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  };
  
  // Funzione per mostrare la preview dei risultati calcolati
  const renderPreview = () => {
    if (!previewData) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <div>Caricamento anteprima...</div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Risultati del campionamento</CardTitle>
            <CardDescription>
              Ecco i risultati calcolati in base ai dati inseriti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500">Animali per kg</div>
                <div className="text-2xl font-bold">
                  {previewData.calculatedValues.animalsPerKg.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Taglia calcolata</div>
                <div className="text-2xl font-bold">
                  {previewData.calculatedValues.size?.code || 'N/D'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Mortalità</div>
                <div className="text-2xl font-bold">
                  {parseFloat(previewData.calculatedValues.mortalityRate).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div>
              <h3 className="text-lg font-medium mb-3">Cestelli di origine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewData.sourceBaskets.map((item: any) => (
                  <Card key={item.basket.id} className="bg-gray-50">
                    <CardContent className="p-3">
                      <div className="font-medium">Cestello #{item.basket.physicalNumber}</div>
                      <div className="text-sm text-gray-500">
                        {item.flupsy?.name || 'FLUPSY non assegnato'} 
                        {item.basket.row && item.basket.position ? ` - ${item.basket.row}-${item.basket.position}` : ''}
                      </div>
                      {item.lastOperation && (
                        <div className="text-xs mt-1">
                          <Badge variant="outline">
                            {item.lastOperation.type}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep('sampling')}
          >
            Indietro
          </Button>
          <Button 
            type="button" 
            onClick={() => setStep('destination')}
          >
            Seleziona destinazioni
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  // Funzione per mostrare la selezione delle destinazioni
  const renderDestination = () => {
    if (!previewData) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <div>Caricamento dati...</div>
        </div>
      );
    }
    
    // Cesti disponibili per destinazione
    const availableBaskets = previewData.suggestedDestinations.availableBaskets || [];
    
    // Posizioni disponibili nei FLUPSY
    const availablePositionsPerFlupsy = previewData.suggestedDestinations.availablePositions || [];
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Selezione destinazioni</CardTitle>
            <CardDescription>
              Seleziona i cestelli di destinazione e le loro posizioni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="baskets">
              <TabsList className="mb-4">
                <TabsTrigger value="baskets">Cestelli selezionati ({destinationBaskets.length})</TabsTrigger>
                <TabsTrigger value="available">Cestelli disponibili</TabsTrigger>
                <TabsTrigger value="positions">Posizioni disponibili</TabsTrigger>
              </TabsList>
              
              <TabsContent value="baskets">
                {destinationBaskets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun cestello di destinazione selezionato
                  </div>
                ) : (
                  <div className="space-y-4">
                    {destinationBaskets.map((basket, index) => {
                      // Trova i dettagli del cestello
                      const basketDetails = availableBaskets.find((b: any) => b.id === basket.basketId);
                      // Trova i dettagli del FLUPSY
                      const flupsyDetails = availablePositionsPerFlupsy.find((f: any) => f.flupsyId === basket.flupsyId);
                      
                      return (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">Cestello #{basketDetails?.physicalNumber}</div>
                                <div className="text-sm">
                                  Posizione: {flupsyDetails?.flupsyName} {basket.row}-{basket.position}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Animali/kg: {basket.animalsPerKg.toLocaleString()} | 
                                  Taglia: {previewData.calculatedValues.size?.code || 'N/D'}
                                </div>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleRemoveDestinationBasket(index)}
                              >
                                Rimuovi
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="available">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                  {availableBaskets.map((basket: any) => {
                    // Verifica se il cestello è già stato selezionato
                    const isSelected = destinationBaskets.some(b => b.basketId === basket.id);
                    
                    return (
                      <Card key={basket.id} className={`cursor-pointer ${isSelected ? 'opacity-50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-semibold">Cestello #{basket.physicalNumber}</div>
                              <div className="text-sm text-gray-500">
                                {basket.flupsyId ? `FLUPSY ID: ${basket.flupsyId}` : 'FLUPSY non assegnato'} 
                                {basket.row && basket.position ? ` - ${basket.row}-${basket.position}` : ''}
                              </div>
                              <div className="text-xs mt-2">
                                <Badge variant={isSelected ? "secondary" : "outline"}>
                                  {isSelected ? "Già selezionato" : "Disponibile"}
                                </Badge>
                              </div>
                            </div>
                            
                            {!isSelected && (
                              <Select onValueChange={(value) => {
                                const [flupsyId, row, position] = value.split('|');
                                handleAddDestinationBasket(basket, {
                                  flupsyId: parseInt(flupsyId),
                                  row,
                                  position: parseInt(position)
                                });
                              }}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Seleziona posizione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePositionsPerFlupsy.map((flupsy: any) => (
                                    <React.Fragment key={flupsy.flupsyId}>
                                      <div className="px-2 py-1.5 text-sm font-semibold">{flupsy.flupsyName}</div>
                                      {flupsy.availablePositions.map((pos: any) => (
                                        <SelectItem 
                                          key={`${pos.flupsyId}-${pos.row}-${pos.position}`}
                                          value={`${pos.flupsyId}|${pos.row}|${pos.position}`}
                                        >
                                          {pos.row}-{pos.position}
                                        </SelectItem>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="positions">
                <div className="space-y-6">
                  {availablePositionsPerFlupsy.map((flupsy: any) => (
                    <Card key={flupsy.flupsyId}>
                      <CardHeader>
                        <CardTitle className="text-lg">{flupsy.flupsyName}</CardTitle>
                        <CardDescription>
                          {flupsy.availablePositions.length} posizioni disponibili
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {flupsy.availablePositions.map((position: any) => {
                            // Verifica se la posizione è già occupata
                            const isOccupied = destinationBaskets.some(
                              b => b.flupsyId === position.flupsyId && 
                                  b.row === position.row && 
                                  b.position === position.position
                            );
                            
                            return (
                              <Badge 
                                key={`${position.flupsyId}-${position.row}-${position.position}`}
                                variant={isOccupied ? "secondary" : "outline"}
                                className="py-2 px-3 cursor-pointer"
                              >
                                {position.row}-{position.position}
                              </Badge>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep('preview')}
          >
            Indietro
          </Button>
          <Button 
            type="button" 
            onClick={() => setStep('confirm')}
            disabled={destinationBaskets.length === 0}
          >
            Conferma operazione
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  // Funzione per mostrare la schermata di conferma finale
  const renderConfirm = () => {
    if (!previewData || !samplingData) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <div>Caricamento dati...</div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Conferma operazione di vagliatura</CardTitle>
            <CardDescription>
              Verifica tutti i dati prima di confermare l'operazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Dati del campione</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Peso campione</div>
                    <div className="font-medium">{samplingData.sampleWeight}g</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Animali nel campione</div>
                    <div className="font-medium">{samplingData.sampleCount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Animali morti</div>
                    <div className="font-medium">{samplingData.deadCount}</div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Risultati calcolati</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Animali per kg</div>
                    <div className="font-medium">{previewData.calculatedValues.animalsPerKg.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Taglia calcolata</div>
                    <div className="font-medium">{previewData.calculatedValues.size?.code || 'N/D'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Mortalità</div>
                    <div className="font-medium">{parseFloat(previewData.calculatedValues.mortalityRate).toFixed(2)}%</div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cestelli di origine ({previewData.sourceBaskets.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {previewData.sourceBaskets.map((item: any) => (
                    <Badge key={item.basket.id} variant="outline" className="py-1.5">
                      #{item.basket.physicalNumber}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cestelli di destinazione ({destinationBaskets.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {destinationBaskets.map((basket, index) => {
                    // Trova i dettagli del cestello
                    const basketDetails = previewData.suggestedDestinations.availableBaskets.find((b: any) => b.id === basket.basketId);
                    // Trova i dettagli del FLUPSY
                    const flupsyDetails = previewData.suggestedDestinations.availablePositions.find((f: any) => f.flupsyId === basket.flupsyId);
                    
                    return (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="font-medium">Cestello #{basketDetails?.physicalNumber}</div>
                        <div className="text-sm">
                          {flupsyDetails?.flupsyName} {basket.row}-{basket.position}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
          <div className="font-medium text-amber-800 mb-2">Importante</div>
          <div className="text-amber-700 text-sm">
            La conferma dell'operazione modificherà il database in modo permanente. I cestelli di origine verranno liberati dal ciclo attivo e i cestelli di destinazione verranno assegnati al ciclo. Questa operazione non può essere annullata.
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep('destination')}
          >
            Indietro
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={executeScreeningMutation.isPending}
          >
            {executeScreeningMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elaborazione in corso...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Conferma e salva
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  // Rendering della pagina in base allo step corrente
  const renderStepContent = () => {
    switch (step) {
      case 'source':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selezione cestelli di origine</CardTitle>
                <CardDescription>
                  Seleziona i cestelli che verranno vagliati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSourceBaskets()}
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setStep('sampling')}
                disabled={sourceBasketIds.length === 0}
              >
                Continua
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case 'sampling':
        return renderSamplingForm();
        
      case 'preview':
        return renderPreview();
        
      case 'destination':
        return renderDestination();
        
      case 'confirm':
        return renderConfirm();
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Operazione di Vagliatura</h1>
        <p className="text-gray-500 mt-1">
          Questa procedura ti guiderà nel processo di vagliatura delle ceste
        </p>
      </div>
      
      <div className="mb-6">
        <div className="flex space-x-2">
          <Badge 
            variant={step === 'source' ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => sourceBasketIds.length > 0 && setStep('source')}
          >
            1. Selezione origine
          </Badge>
          <Badge 
            variant={step === 'sampling' ? "default" : "outline"}
            className={`cursor-pointer ${sourceBasketIds.length === 0 ? 'opacity-50' : ''}`}
            onClick={() => sourceBasketIds.length > 0 && setStep('sampling')}
          >
            2. Campionatura
          </Badge>
          <Badge 
            variant={step === 'preview' ? "default" : "outline"}
            className={`cursor-pointer ${!previewData ? 'opacity-50' : ''}`}
            onClick={() => previewData && setStep('preview')}
          >
            3. Anteprima
          </Badge>
          <Badge 
            variant={step === 'destination' ? "default" : "outline"}
            className={`cursor-pointer ${!previewData ? 'opacity-50' : ''}`}
            onClick={() => previewData && setStep('destination')}
          >
            4. Destinazioni
          </Badge>
          <Badge 
            variant={step === 'confirm' ? "default" : "outline"}
            className={`cursor-pointer ${destinationBaskets.length === 0 ? 'opacity-50' : ''}`}
            onClick={() => destinationBaskets.length > 0 && setStep('confirm')}
          >
            5. Conferma
          </Badge>
        </div>
      </div>
      
      {renderStepContent()}
    </div>
  );
}