import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, addWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { PieChart } from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, 
  Legend, ResponsiveContainer, Cell 
} from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, Calendar } from 'lucide-react';

// Tipo per i dati delle bolle nel grafico
type ForecastBubble = {
  week: number;        // Settimana di previsione (asse X)
  weekLabel: string;   // Etichetta della settimana (es. "Sett. 1 (24/04-30/04)")
  yValue: string;      // Valore dell'asse Y (FLUPSY o fascia di taglia)
  value: number;       // Numero di animali (dimensione bolla)
  progress: number;    // Percentuale verso TP-3000 (colore)
  dateRange: string;   // Range date della settimana (tooltip)
  flupsy?: string;     // Nome del FLUPSY
  currentSize?: string; // Taglia corrente
};

// Tipo per le opzioni di filtro
type ViewOption = "flupsy" | "size";

export default function TP3000Forecast() {
  // Stato per i filtri
  const [viewOption, setViewOption] = useState<ViewOption>("flupsy");
  const [timeRange, setTimeRange] = useState<number>(12); // Numero di settimane da visualizzare
  const [selectedFlupsy, setSelectedFlupsy] = useState<string | null>(null);
  
  // Query per caricare i dati necessari
  const { data: cycles, isLoading: cyclesLoading } = useQuery({ 
    queryKey: ['/api/cycles'],
    select: (data: any) => data.filter((cycle: any) => cycle.status === 'active'),
  });
  
  const { data: operations, isLoading: operationsLoading } = useQuery({ 
    queryKey: ['/api/operations']
  });
  
  const { data: flupsys, isLoading: flupsysLoading } = useQuery({ 
    queryKey: ['/api/flupsys']
  });
  
  const { data: baskets, isLoading: basketsLoading } = useQuery({ 
    queryKey: ['/api/baskets']
  });
  
  const { data: sgrs, isLoading: sgrsLoading } = useQuery({ 
    queryKey: ['/api/sgr']
  });

  // Calcola i dati del grafico a bolle quando i dati necessari sono disponibili
  const calculatedData = useBubbleChartData(cycles, operations, flupsys, baskets, sgrs, timeRange, viewOption, selectedFlupsy);
  
  // Funzione per esportare i dati in CSV
  const exportCSV = () => {
    if (!calculatedData?.bubbleData) return;
    
    const csvContent = [
      // Header CSV
      ['Settimana', 'Periodo', viewOption === 'flupsy' ? 'FLUPSY' : 'Taglia', 'Numero Animali', 'Taglia Prevista'].join(','),
      // Righe dati
      ...calculatedData.bubbleData.map(item => [
        item.weekLabel,
        item.dateRange,
        item.yValue,
        item.value.toLocaleString(),
        `${Math.round(item.progress)}% verso TP-3000`
      ].join(','))
    ].join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `previsione-tp3000-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Caricamento
  const isLoading = cyclesLoading || operationsLoading || flupsysLoading || basketsLoading || sgrsLoading;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Previsione TP-3000</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading}>
          <FileDown className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Previsione Raggiungimento Taglia TP-3000</CardTitle>
          <CardDescription>
            Visualizzazione della previsione di quando gli animali raggiungeranno la taglia TP-3000 (32.000 an/kg)
          </CardDescription>
          
          {/* Filtri */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Visualizza per:</span>
              <Select 
                value={viewOption} 
                onValueChange={(val) => setViewOption(val as ViewOption)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Seleziona vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flupsy">FLUPSY</SelectItem>
                  <SelectItem value="size">Taglia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Periodo:</span>
              <Select 
                value={timeRange.toString()} 
                onValueChange={(val) => setTimeRange(parseInt(val))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 Settimane</SelectItem>
                  <SelectItem value="8">8 Settimane</SelectItem>
                  <SelectItem value="12">12 Settimane</SelectItem>
                  <SelectItem value="24">24 Settimane</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {viewOption === "flupsy" && flupsys && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">FLUPSY:</span>
                <Select 
                  value={selectedFlupsy || "all"} 
                  onValueChange={(val) => setSelectedFlupsy(val === "all" ? null : val)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tutti i FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                    {flupsys.map((flupsy: any) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-lg text-muted-foreground">Calcolo previsioni in corso...</span>
            </div>
          ) : !calculatedData || calculatedData.bubbleData.length === 0 ? (
            <div className="text-center p-12">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                Nessun dato disponibile per la previsione
              </p>
              <p className="text-sm text-muted-foreground">
                Non sono presenti cicli attivi o dati sufficienti per calcolare le previsioni.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Blocco riepilogo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <span className="text-muted-foreground text-sm">Prossime 4 settimane</span>
                      <div className="text-3xl font-bold mt-1">
                        {calculatedData.summary.next4Weeks.toLocaleString()}
                      </div>
                      <span className="text-xs text-muted-foreground">animali</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <span className="text-muted-foreground text-sm">Prossime 8 settimane</span>
                      <div className="text-3xl font-bold mt-1">
                        {calculatedData.summary.next8Weeks.toLocaleString()}
                      </div>
                      <span className="text-xs text-muted-foreground">animali</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <span className="text-muted-foreground text-sm">Totale periodo</span>
                      <div className="text-3xl font-bold mt-1">
                        {calculatedData.summary.total.toLocaleString()}
                      </div>
                      <span className="text-xs text-muted-foreground">animali</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Grafico a bolle */}
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <XAxis 
                      type="number" 
                      dataKey="week" 
                      name="Settimana" 
                      domain={[0, timeRange]}
                      tickFormatter={(value) => `S${value}`}
                      label={{ value: 'Settimane', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="yValue" 
                      name={viewOption === "flupsy" ? "FLUPSY" : "Taglia"}
                      width={120}
                    />
                    <ZAxis 
                      type="number" 
                      dataKey="value" 
                      range={[50, 400]} 
                      name="Animali"
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ForecastBubble;
                          return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                              <p className="font-medium">{data.weekLabel}</p>
                              <p className="text-sm">{data.dateRange}</p>
                              <p className="font-medium mt-1">
                                {viewOption === "flupsy" ? "FLUPSY:" : "Taglia:"} {data.yValue}
                              </p>
                              <p className="text-emerald-600 font-bold">
                                {data.value.toLocaleString()} animali
                              </p>
                              <p className="text-sm mt-1">
                                Progresso: {Math.round(data.progress)}% verso TP-3000
                              </p>
                              {data.currentSize && (
                                <p className="text-xs mt-1">
                                  Taglia attuale: {data.currentSize}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Previsione TP-3000" data={calculatedData.bubbleData}>
                      {calculatedData.bubbleData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBubbleColor(entry.progress)} 
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legenda */}
              <div className="flex justify-center items-center space-x-6 py-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-100 mr-2"></div>
                  <span className="text-xs">Lontano da TP-3000</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-300 mr-2"></div>
                  <span className="text-xs">50% del percorso</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-xs">80% del percorso</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-700 mr-2"></div>
                  <span className="text-xs">Vicino a TP-3000</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 absolute"></div>
                  </div>
                  <span className="text-xs ml-3">Pochi animali</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                  </div>
                  <span className="text-xs ml-3">Molti animali</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Funzione per ottenere il colore della bolla in base al progresso
function getBubbleColor(progress: number): string {
  if (progress >= 90) return '#1D4ED8'; // blu scuro
  if (progress >= 80) return '#3B82F6'; // blu
  if (progress >= 50) return '#60A5FA'; // blu medio
  if (progress >= 20) return '#93C5FD'; // blu chiaro
  return '#DBEAFE'; // blu molto chiaro
}

// Custom hook per calcolare i dati del grafico a bolle
function useBubbleChartData(
  cycles: any[] | undefined,
  operations: any[] | undefined,
  flupsys: any[] | undefined,
  baskets: any[] | undefined,
  sgrs: any[] | undefined,
  timeRange: number,
  viewOption: ViewOption,
  selectedFlupsy: string | null
) {
  const [result, setResult] = useState<{
    bubbleData: ForecastBubble[],
    summary: { next4Weeks: number, next8Weeks: number, total: number }
  } | null>(null);
  
  useEffect(() => {
    // Se mancano i dati necessari, non calcolare nulla
    if (!cycles || !operations || !flupsys || !baskets || !sgrs) {
      return;
    }
    
    // Filtra solo i cicli attivi
    const activeCycles = cycles.filter(cycle => cycle.status === 'active');
    
    if (activeCycles.length === 0) {
      setResult({
        bubbleData: [],
        summary: { next4Weeks: 0, next8Weeks: 0, total: 0 }
      });
      return;
    }
    
    // Per ogni ciclo attivo, calcola quando raggiungerà TP-3000
    const forecasts = activeCycles.map(cycle => {
      // Trova l'ultima operazione per questo ciclo
      const cycleOps = operations
        .filter((op: any) => op.cycleId === cycle.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (cycleOps.length === 0) return null;
      
      const lastOp = cycleOps[0];
      if (!lastOp.animalsPerKg) return null;
      
      // Trova il basket e il FLUPSY associati
      const basket = baskets.find((b: any) => b.id === cycle.basketId);
      if (!basket) return null;
      
      const flupsy = flupsys.find((f: any) => f.id === basket.flupsyId);
      if (!flupsy) return null;
      
      // Se è selezionato un FLUPSY specifico, filtra solo quelli
      if (selectedFlupsy && flupsy.id.toString() !== selectedFlupsy) {
        return null;
      }
      
      // Calcola i giorni necessari per raggiungere TP-3000
      const currentWeight = 1000000 / lastOp.animalsPerKg;
      const targetWeight = 1000000 / 32000; // ~ 31,25 mg (TP-3000)
      
      // Se già TP-3000 o oltre, salta
      if (currentWeight >= targetWeight) return null;
      
      // Calcola i giorni necessari per raggiungere il target utilizzando gli SGR mensili
      let daysNeeded = 0;
      let simulatedWeight = currentWeight;
      let simulationDate = new Date();
      
      while (simulatedWeight < targetWeight && daysNeeded < 365) {
        const simMonth = format(simulationDate, 'MMMM', { locale: it }).toLowerCase();
        const monthSgr = sgrs.find((sgr: any) => sgr.month.toLowerCase() === simMonth);
        let dailyGrowthRate = 1.0; // Valore predefinito
        
        if (monthSgr) {
          dailyGrowthRate = monthSgr.percentage;
        }
        
        // Formula: W1 = W0 * (1 + (SGR/100))
        simulatedWeight = simulatedWeight * (1 + (dailyGrowthRate / 100));
        simulationDate = addDays(simulationDate, 1);
        daysNeeded++;
      }
      
      // Calcola la data prevista e la settimana
      const targetDate = addDays(new Date(), daysNeeded);
      
      // Determina in quale settimana cadrà (0 = questa settimana)
      const today = new Date();
      let weekNumber = 0;
      
      // Calcola in quale settimana cadrà
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      weekNumber = Math.floor(diffDays / 7);
      
      // Se la settimana è oltre il periodo visualizzato, escludi
      if (weekNumber >= timeRange) return null;
      
      // Calcola il progresso attuale verso TP-3000
      const progress = (currentWeight / targetWeight) * 100;
      
      // Trova la dimensione attuale
      const currentSize = lastOp.size?.code || '';
      
      return {
        cycleId: cycle.id,
        flupsyId: flupsy.id,
        flupsyName: flupsy.name,
        basketId: basket.id,
        basketNumber: basket.physicalNumber,
        animalCount: lastOp.animalCount,
        currentWeight,
        targetWeight,
        targetDate,
        weekNumber,
        progress,
        currentSize
      };
    }).filter(Boolean); // Rimuovi i null
    
    // Organizza i dati per il grafico a bolle in base all'opzione di visualizzazione
    const bubbleData: ForecastBubble[] = [];
    
    if (viewOption === 'flupsy') {
      // Raggruppa per FLUPSY e settimana
      const groupedByFlupsyAndWeek: Record<string, Record<number, number>> = {};
      
      forecasts.forEach(forecast => {
        if (!forecast) return;
        
        const flupsyKey = forecast.flupsyName;
        const week = forecast.weekNumber;
        
        if (!groupedByFlupsyAndWeek[flupsyKey]) {
          groupedByFlupsyAndWeek[flupsyKey] = {};
        }
        
        if (!groupedByFlupsyAndWeek[flupsyKey][week]) {
          groupedByFlupsyAndWeek[flupsyKey][week] = 0;
        }
        
        groupedByFlupsyAndWeek[flupsyKey][week] += forecast.animalCount || 0;
      });
      
      // Converti i dati raggruppati in formato per il grafico a bolle
      Object.entries(groupedByFlupsyAndWeek).forEach(([flupsyName, weeks]) => {
        Object.entries(weeks).forEach(([weekStr, count]) => {
          const week = parseInt(weekStr);
          const weekStartDate = addWeeks(new Date(), week);
          const weekEndDate = addDays(weekStartDate, 6);
          
          bubbleData.push({
            week,
            weekLabel: `Sett. ${week+1}`,
            yValue: flupsyName,
            value: count,
            progress: getAverageProgress(forecasts, flupsyName, week),
            dateRange: `${format(weekStartDate, 'dd/MM')} - ${format(weekEndDate, 'dd/MM')}`,
            flupsy: flupsyName
          });
        });
      });
    } else {
      // Raggruppa per taglia attuale e settimana
      const groupedBySizeAndWeek: Record<string, Record<number, number>> = {};
      
      forecasts.forEach(forecast => {
        if (!forecast) return;
        
        const sizeKey = forecast.currentSize || 'N/D';
        const week = forecast.weekNumber;
        
        if (!groupedBySizeAndWeek[sizeKey]) {
          groupedBySizeAndWeek[sizeKey] = {};
        }
        
        if (!groupedBySizeAndWeek[sizeKey][week]) {
          groupedBySizeAndWeek[sizeKey][week] = 0;
        }
        
        groupedBySizeAndWeek[sizeKey][week] += forecast.animalCount || 0;
      });
      
      // Converti i dati raggruppati in formato per il grafico a bolle
      Object.entries(groupedBySizeAndWeek).forEach(([sizeCode, weeks]) => {
        Object.entries(weeks).forEach(([weekStr, count]) => {
          const week = parseInt(weekStr);
          const weekStartDate = addWeeks(new Date(), week);
          const weekEndDate = addDays(weekStartDate, 6);
          
          bubbleData.push({
            week,
            weekLabel: `Sett. ${week+1}`,
            yValue: sizeCode,
            value: count,
            progress: getAverageProgress(forecasts, null, week, sizeCode),
            dateRange: `${format(weekStartDate, 'dd/MM')} - ${format(weekEndDate, 'dd/MM')}`,
            currentSize: sizeCode
          });
        });
      });
    }
    
    // Ordina i dati
    bubbleData.sort((a, b) => {
      // Prima per asse Y (FLUPSY o taglia)
      const yCompare = a.yValue.localeCompare(b.yValue);
      if (yCompare !== 0) return yCompare;
      
      // Poi per settimana
      return a.week - b.week;
    });
    
    // Calcola i totali di riepilogo
    const next4Weeks = bubbleData
      .filter(item => item.week < 4)
      .reduce((sum, item) => sum + item.value, 0);
      
    const next8Weeks = bubbleData
      .filter(item => item.week < 8)
      .reduce((sum, item) => sum + item.value, 0);
      
    const total = bubbleData.reduce((sum, item) => sum + item.value, 0);
    
    setResult({
      bubbleData,
      summary: { next4Weeks, next8Weeks, total }
    });
  }, [cycles, operations, flupsys, baskets, sgrs, timeRange, viewOption, selectedFlupsy]);
  
  return result;
}

// Funzione di supporto per calcolare il progresso medio per un gruppo
function getAverageProgress(
  forecasts: any[],
  flupsyName: string | null = null,
  week: number,
  sizeCode: string | null = null
): number {
  const relevantForecasts = forecasts.filter(forecast => {
    if (!forecast) return false;
    
    const matchesFlupsy = flupsyName ? forecast.flupsyName === flupsyName : true;
    const matchesSize = sizeCode ? forecast.currentSize === sizeCode : true;
    const matchesWeek = forecast.weekNumber === week;
    
    return matchesFlupsy && matchesSize && matchesWeek;
  });
  
  if (relevantForecasts.length === 0) return 0;
  
  const totalProgress = relevantForecasts.reduce((sum, forecast) => sum + forecast.progress, 0);
  return totalProgress / relevantForecasts.length;
}