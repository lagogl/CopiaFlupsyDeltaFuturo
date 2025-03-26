import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ChevronRight, 
  CalendarIcon, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Scale, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon2,
  Filter,
  ChevronDown,
  Maximize2,
  SlackIcon
} from 'lucide-react';
import { formatNumberWithCommas, getSizeColor, getTargetSizeForWeight } from '@/lib/utils';

// Componente per il journey di crescita
export default function GrowJourney() {
  // Stati per i filtri e le opzioni di visualizzazione
  const [selectedBasket, setSelectedBasket] = useState<number | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [projectionDays, setProjectionDays] = useState(90);
  const [activeTab, setActiveTab] = useState('growth-curve');

  // Query per recuperare i dati necessari
  const { data: basketsData, isLoading: basketsLoading } = useQuery({
    queryKey: ['/api/baskets'],
    refetchOnWindowFocus: false,
  });

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery({
    queryKey: ['/api/cycles'],
    refetchOnWindowFocus: false,
  });

  const { data: operationsData, isLoading: operationsLoading } = useQuery({
    queryKey: ['/api/operations'],
    refetchOnWindowFocus: false,
  });

  const { data: sizesData, isLoading: sizesLoading } = useQuery({
    queryKey: ['/api/sizes'],
    refetchOnWindowFocus: false,
  });

  const { data: sgrsData, isLoading: sgrsLoading } = useQuery({
    queryKey: ['/api/sgrs'],
    refetchOnWindowFocus: false,
  });

  // Conversione di tipi
  const baskets = basketsData as any[] || [];
  const cycles = cyclesData as any[] || [];
  const operations = operationsData as any[] || [];
  const sizes = sizesData as any[] || [];
  const sgrs = sgrsData as any[] || [];

  // Filtra i cicli attivi
  const activeCycles = cycles.filter((cycle: any) => cycle.state === 'active');

  // Effetto per impostare il ciclo selezionato di default
  useEffect(() => {
    if (activeCycles.length > 0 && !selectedCycle) {
      setSelectedCycle(activeCycles[0].id);
      
      // Se il ciclo ha un cestello associato, selezionalo
      if (activeCycles[0].basketId) {
        setSelectedBasket(activeCycles[0].basketId);
      }
    }
  }, [activeCycles, selectedCycle]);

  // Calcola i dati di crescita per il cestello/ciclo selezionato
  const growthPredictionQuery = useQuery({
    queryKey: ['/api/cycles', selectedCycle, 'growth-prediction', { days: projectionDays }],
    enabled: !!selectedCycle,
    refetchOnWindowFocus: false,
  });

  const growthData = growthPredictionQuery.data as any;

  // Ottieni le informazioni del cestello e del ciclo selezionati
  const selectedBasketInfo = baskets.find((b: any) => b.id === selectedBasket);
  const selectedCycleInfo = cycles.find((c: any) => c.id === selectedCycle);

  // Ottieni le operazioni per il ciclo selezionato
  const cycleOperations = operations.filter((op: any) => op.cycleId === selectedCycle)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Trova l'ultima operazione di misura
  const lastMeasurement = [...cycleOperations]
    .filter((op: any) => op.type === 'misura' && op.animalsPerKg)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Formatta la data
  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: it });
  };

  // Calcola lo storico delle misurazioni di peso per il ciclo
  const weightHistory = cycleOperations
    .filter((op: any) => (op.type === 'misura' || op.type === 'prima-attivazione') && op.animalsPerKg)
    .map((op: any) => {
      const weight = op.animalsPerKg ? 1000000 / op.animalsPerKg : 0;
      const size = getTargetSizeForWeight(weight, sizes);
      
      return {
        date: new Date(op.date),
        formattedDate: format(new Date(op.date), 'dd/MM/yy'),
        weight: Math.round(weight),
        animalsPerKg: op.animalsPerKg,
        sizeCode: size?.code || 'N/A',
        sizeColor: size?.color || 'bg-gray-200',
        type: op.type
      };
    });

  // Calcola il peso attuale e quello precedente
  const currentWeight = lastMeasurement?.animalsPerKg 
    ? Math.round(1000000 / lastMeasurement.animalsPerKg) 
    : 0;
  
  // Trova la misurazione precedente
  const measurementHistory = [...cycleOperations]
    .filter((op: any) => (op.type === 'misura' || op.type === 'prima-attivazione') && op.animalsPerKg)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const previousMeasurementIndex = measurementHistory.findIndex(
    (m: any) => m.id === lastMeasurement?.id
  ) - 1;
  
  const previousMeasurement = previousMeasurementIndex >= 0 
    ? measurementHistory[previousMeasurementIndex] 
    : null;

  const previousWeight = previousMeasurement?.animalsPerKg 
    ? Math.round(1000000 / previousMeasurement.animalsPerKg) 
    : 0;

  // Calcola la percentuale di crescita tra l'ultima e la penultima misurazione
  let growthPercentage = 0;
  let dailyGrowthRate = 0;
  
  if (previousWeight && currentWeight) {
    const daysBetween = differenceInDays(
      new Date(lastMeasurement.date), 
      new Date(previousMeasurement.date)
    );
    
    if (daysBetween > 0) {
      growthPercentage = ((currentWeight - previousWeight) / previousWeight) * 100;
      
      // Calcola il tasso di crescita giornaliero: (ln(Wf/Wi))/t
      dailyGrowthRate = (Math.log(currentWeight / previousWeight) / daysBetween) * 100;
    }
  }

  // Imposta un SGR di default se non ci sono misurazioni
  const defaultSgrPercentage = sgrs.length > 0 
    ? sgrs[0].percentage 
    : 0.01; // 1% di crescita giornaliera come default

  // Se non ci sono dati sufficienti, mostra un messaggio
  if (basketsLoading || cyclesLoading || operationsLoading || sizesLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Caricamento dati in corso...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se non ci sono cicli attivi, mostra un messaggio
  if (activeCycles.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Percorso di Crescita</CardTitle>
            <CardDescription>Nessun ciclo attivo trovato</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Layers className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Non ci sono cicli attivi al momento.</p>
              <p className="mt-2">Attiva un nuovo ciclo per visualizzare il percorso di crescita.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Percorso di Crescita</h1>
        
        <div className="flex items-center space-x-2">
          <Select
            value={selectedCycle?.toString()}
            onValueChange={(value: string) => {
              const cycleId = parseInt(value);
              setSelectedCycle(cycleId);
              
              // Trova il cestello associato al ciclo
              const cycle = cycles.find((c: any) => c.id === cycleId);
              if (cycle && cycle.basketId) {
                setSelectedBasket(cycle.basketId);
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleziona un ciclo" />
            </SelectTrigger>
            <SelectContent>
              {activeCycles.map((cycle: any) => {
                const cycleBasket = baskets.find((b: any) => b.id === cycle.basketId);
                return (
                  <SelectItem key={cycle.id} value={cycle.id.toString()}>
                    Ciclo {cycleBasket ? `Cesta #${cycleBasket.physicalNumber}` : cycle.id}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Opzioni di visualizzazione</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Giorni di proiezione</label>
                    <span className="text-sm font-medium">{projectionDays} giorni</span>
                  </div>
                  <Slider
                    value={[projectionDays]}
                    min={30}
                    max={180}
                    step={15}
                    onValueChange={(value: number[]) => setProjectionDays(value[0])}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Informazioni essenziali sul ciclo e la cesta */}
      {selectedBasketInfo && selectedCycleInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Scale className="h-5 w-5 mr-2 text-primary" />
                Cesta #{selectedBasketInfo.physicalNumber}
              </CardTitle>
              <CardDescription>
                Flupsy: {baskets.find((b: any) => b.id === selectedBasketInfo.id)?.flupsyName || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Posizione:</span>
                  <span className="font-medium">
                    {selectedBasketInfo.row} - {selectedBasketInfo.position || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stato:</span>
                  <Badge variant="outline">{selectedBasketInfo.state}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CalendarIcon2 className="h-5 w-5 mr-2 text-primary" />
                Ciclo di Crescita
              </CardTitle>
              <CardDescription>
                Iniziato il {formatDate(selectedCycleInfo.startDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Durata:</span>
                  <span className="font-medium">
                    {differenceInDays(new Date(), new Date(selectedCycleInfo.startDate))} giorni
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Operazioni:</span>
                  <span className="font-medium">{cycleOperations.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className={`h-5 w-5 mr-2 ${dailyGrowthRate > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                Crescita Attuale
              </CardTitle>
              <CardDescription>
                Ultima misurazione: {lastMeasurement ? formatDate(lastMeasurement.date) : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastMeasurement ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Peso attuale:</span>
                    <span className="font-medium">{formatNumberWithCommas(currentWeight)} mg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tasso di crescita:</span>
                    <span className={`font-medium ${dailyGrowthRate > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {dailyGrowthRate.toFixed(2)}% al giorno
                    </span>
                  </div>
                  {previousMeasurement && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Variazione:</span>
                      <div className="flex items-center">
                        {growthPercentage > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-rose-500 mr-1" />
                        )}
                        <span className={`font-medium ${growthPercentage > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {growthPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-muted-foreground text-sm">
                  Nessuna misurazione disponibile
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tab di navigazione per i diversi grafici */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:w-[400px]">
          <TabsTrigger value="growth-curve">Curva di Crescita</TabsTrigger>
          <TabsTrigger value="size-evolution">Evoluzione Taglie</TabsTrigger>
        </TabsList>
        
        <TabsContent value="growth-curve" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Curva di Crescita</CardTitle>
              <CardDescription>
                {growthData ? (
                  `Proiezione di crescita per ${projectionDays} giorni (SGR: ${(growthData.sgrPercentage * 100).toFixed(1)}%)`
                ) : (
                  'Caricamento proiezioni...'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {growthData ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={growthData.projections}
                      margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                    >
                      <defs>
                        <linearGradient id="colorTheoretical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value} mg`}
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 12 }}
                      />
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <Tooltip 
                        labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: it })}
                        formatter={(value: any) => [`${formatNumberWithCommas(value)} mg`, '']}
                      />
                      <Legend verticalAlign="top" height={36} />
                      
                      {/* Linea per il peso corrente */}
                      <ReferenceLine 
                        y={growthData.currentWeight} 
                        stroke="#666" 
                        strokeDasharray="3 3"
                        label={{ 
                          value: `Attuale: ${formatNumberWithCommas(growthData.currentWeight)} mg`,
                          position: 'insideBottomRight',
                          fill: '#666',
                          fontSize: 12
                        }}
                      />
                      
                      {/* Linee di proiezione */}
                      <Area
                        type="monotone"
                        dataKey="worst"
                        name="Scenario peggiore"
                        stroke="#ef4444"
                        fill="url(#colorWorst)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="theoretical"
                        name="Crescita teorica"
                        stroke="#3b82f6"
                        fill="url(#colorTheoretical)"
                        fillOpacity={0.6}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 7 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="best"
                        name="Scenario migliore"
                        stroke="#10b981"
                        fill="url(#colorBest)"
                        fillOpacity={0.6}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Caricamento proiezioni di crescita...</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between text-sm text-muted-foreground pt-0">
              <div>
                Peso iniziale: <span className="font-medium">{lastMeasurement ? formatNumberWithCommas(currentWeight) : 'N/A'} mg</span>
              </div>
              <div>
                Peso finale stimato: <span className="font-medium">
                  {growthData ? formatNumberWithCommas(growthData.summary.finalTheoreticalWeight) : 'N/A'} mg
                </span>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="size-evolution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evoluzione delle Taglie</CardTitle>
              <CardDescription>
                Storico e proiezione del percorso di crescita
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-1">
              {weightHistory.length > 0 ? (
                <div className="space-y-6">
                  {/* Storico delle taglie */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Storico Misurazioni</h3>
                    <div className="space-y-2">
                      {weightHistory.map((entry, index) => (
                        <div key={index} className="relative">
                          {index < weightHistory.length - 1 && (
                            <div className="absolute top-7 left-3 h-full w-0.5 bg-gray-200"></div>
                          )}
                          <div className="flex items-start">
                            <div className={`shrink-0 ${entry.sizeColor} text-white flex items-center justify-center h-6 w-6 rounded-full z-10`}>
                              <SlackIcon className="h-3 w-3" />
                            </div>
                            <div className="ml-3 pb-6">
                              <div className="flex items-center">
                                <div className="font-medium">{entry.formattedDate}</div>
                                <Badge className="ml-2" variant="outline">
                                  {entry.sizeCode}
                                </Badge>
                                {entry.type === 'prima-attivazione' && (
                                  <Badge variant="secondary" className="ml-2">Prima Attivazione</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatNumberWithCommas(entry.weight)} mg ({formatNumberWithCommas(entry.animalsPerKg)} animali/kg)
                              </div>
                              
                              {/* Mostra la crescita tra misurazioni consecutive */}
                              {index > 0 && (
                                <div className="mt-1">
                                  <div className="flex items-center text-xs">
                                    <div className="flex items-center">
                                      {entry.weight > weightHistory[index - 1].weight ? (
                                        <>
                                          <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                                          <span className="text-emerald-500">
                                            +{(((entry.weight - weightHistory[index - 1].weight) / weightHistory[index - 1].weight) * 100).toFixed(1)}%
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <ArrowDownRight className="h-3 w-3 text-rose-500 mr-1" />
                                          <span className="text-rose-500">
                                            {(((entry.weight - weightHistory[index - 1].weight) / weightHistory[index - 1].weight) * 100).toFixed(1)}%
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <span className="text-muted-foreground ml-2">
                                      in {differenceInDays(entry.date, weightHistory[index - 1].date)} giorni
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Proiezione delle taglie future */}
                  {growthData && growthData.projections && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">Proiezione Taglie Future</h3>
                        <Badge variant="outline">+{projectionDays} giorni</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Mostro tappe importanti della crescita (cambi di taglia o intervalli regolari) */}
                        {[30, 60, 90].filter(day => day <= projectionDays).map(day => {
                          const projectedEntry = growthData.projections.find(
                            (p: any) => differenceInDays(new Date(p.date), new Date(growthData.measurementDate)) === day
                          );
                          
                          if (!projectedEntry) return null;
                          
                          const projectedWeight = projectedEntry.theoretical;
                          const projectedSize = getTargetSizeForWeight(projectedWeight, sizes);
                          
                          return (
                            <div key={day} className="relative">
                              <div className="flex items-start">
                                <div className={`shrink-0 ${projectedSize?.color || 'bg-gray-200'} text-white flex items-center justify-center h-6 w-6 rounded-full z-10`}>
                                  <SlackIcon className="h-3 w-3" />
                                </div>
                                <div className="ml-3 pb-6">
                                  <div className="flex items-center">
                                    <div className="font-medium">
                                      {format(new Date(projectedEntry.date), 'dd/MM/yy')}
                                    </div>
                                    <Badge className="ml-2" variant="outline">
                                      {projectedSize?.code || 'N/A'}
                                    </Badge>
                                    <Badge variant="secondary" className="ml-2">
                                      +{day} giorni
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {formatNumberWithCommas(projectedWeight)} mg (stima)
                                  </div>
                                  
                                  {/* Mostra la crescita percentuale dalla misurazione corrente */}
                                  <div className="mt-1">
                                    <div className="flex items-center text-xs">
                                      <div className="flex items-center">
                                        <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                                        <span className="text-emerald-500">
                                          +{(((projectedWeight - currentWeight) / currentWeight) * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <span className="text-muted-foreground ml-2">
                                        dalla misurazione attuale
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Punto finale della proiezione */}
                        {growthData && (
                          <div className="relative">
                            <div className="flex items-start">
                              <div className="shrink-0 bg-primary text-white flex items-center justify-center h-6 w-6 rounded-full z-10">
                                <Maximize2 className="h-3 w-3" />
                              </div>
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <div className="font-medium">
                                    {format(
                                      addDays(new Date(growthData.measurementDate), projectionDays),
                                      'dd/MM/yy'
                                    )}
                                  </div>
                                  <Badge className="ml-2" variant="outline">
                                    {getTargetSizeForWeight(growthData.summary.finalTheoreticalWeight, sizes)?.code || 'N/A'}
                                  </Badge>
                                  <Badge variant="outline" className="ml-2">
                                    Proiezione finale
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {formatNumberWithCommas(growthData.summary.finalTheoreticalWeight)} mg (stima)
                                </div>
                                
                                {/* Mostra la crescita percentuale totale */}
                                <div className="mt-1">
                                  <div className="flex items-center text-xs">
                                    <div className="flex items-center">
                                      <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                                      <span className="text-emerald-500">
                                        +{growthData.summary.growthPercentageTheoretical.toFixed(1)}%
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground ml-2">
                                      crescita totale in {projectionDays} giorni
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>Nessuna misurazione disponibile per questo ciclo.</p>
                    <p className="mt-2">Registra almeno una misurazione per visualizzare l'evoluzione delle taglie.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}