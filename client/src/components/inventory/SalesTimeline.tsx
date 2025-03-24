import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { 
  AreaChart, 
  Area,
  ComposedChart,
} from "recharts";
import { calculateSizeTimeline } from "@/lib/utils";

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  flupsyName: string;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  sizeCode: string | null;
  sizeName: string | null;
  color: string | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  totalAnimals: number | null;
  lastOperationDate: string | null;
  lastOperationType: string | null;
  cycleStartDate: string | null;
  cycleDuration: number | null;
  growthRate: number | null;
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
  notes: string | null;
  color?: string;
}

interface SgrRate {
  id: number;
  month: string;
  percentage: number;
  dailyPercentage: number | null;
  calculatedFromReal: boolean | null;
}

interface MortalityRate {
  id: number;
  sizeId: number;
  month: string;
  percentage: number;
  notes: string | null;
}

interface TimelineEvent {
  date: Date;
  weight: number;
  size: {
    code: string;
    name: string;
    color: string;
    minAnimalsPerKg: number | null;
    maxAnimalsPerKg: number | null;
  } | null;
  animalsPerKg: number;
  totalAnimals: number;
  mortalityRate: number;
  daysToReach: number;
}

interface BasketTimeline {
  basketId: number;
  physicalNumber: number;
  flupsyName: string;
  initialWeight: number;
  initialAnimalsPerKg: number;
  initialTotalAnimals: number;
  initialSizeCode: string;
  events: TimelineEvent[];
}

interface SalesMilestone {
  date: Date;
  targetSize: string;
  targeSizeName: string;
  basketCount: number;
  totalAnimals: number;
  averageWeight: number;
}

interface SalesTimelineProps {
  basketsData: BasketData[];
  sizes: Size[];
  sgrRates: SgrRate[];
  mortalityRates: MortalityRate[];
  projectionMonths: number;
  targetSizes: string[];
  formatNumberEU: (value: number) => string;
  formatDecimalEU: (value: number) => string;
  formatDateIT: (date: Date | string) => string;
}

const SalesTimeline: React.FC<SalesTimelineProps> = ({
  basketsData,
  sizes,
  sgrRates,
  mortalityRates,
  projectionMonths,
  targetSizes,
  formatNumberEU,
  formatDecimalEU,
  formatDateIT,
}) => {
  const [basketTimelines, setBasketTimelines] = useState<BasketTimeline[]>([]);
  const [salesMilestones, setSalesMilestones] = useState<SalesMilestone[]>([]);
  const [timelineChartData, setTimelineChartData] = useState<any[]>([]);
  const [animalsPerSizeChartData, setAnimalsPerSizeChartData] = useState<any[]>([]);

  // Helpers
  const getMonthFromDate = (date: Date): string => {
    const months = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    return months[date.getMonth()];
  };

  const getSgrRateForDate = (date: Date): number => {
    const month = getMonthFromDate(date);
    // Aggiungiamo controlli di sicurezza per verificare che sgrRates esista e sia un array
    if (!sgrRates || !Array.isArray(sgrRates) || sgrRates.length === 0) {
      return 0.01; // 1% come valore di default se non ci sono dati SGR
    }
    const sgr = sgrRates.find(s => s.month === month);
    return sgr ? (sgr.dailyPercentage || sgr.percentage / 30) : 0.01; // 1% come valore di default
  };

  const getMortalityRateForSizeAndDate = (sizeCode: string, date: Date): number => {
    const month = getMonthFromDate(date);
    const size = sizes.find(s => s.code === sizeCode);
    
    if (!size) return 0;
    
    // Controllo di sicurezza per verificare che mortalityRates esista e sia un array
    if (!mortalityRates || !Array.isArray(mortalityRates) || mortalityRates.length === 0) {
      return 0.01; // 1% come valore di default se non ci sono dati di mortalità
    }
    
    // Troviamo la taglia di riferimento più vicina per la mortalità (TP-500, TP-800, TP-1500)
    let referenceSizeId = 1; // Default a TP-500
    
    // Cerca la taglia di riferimento più vicina
    if (size.id >= 12) { // TP-1500 e più grande
      referenceSizeId = 12;
    } else if (size.id >= 8) { // TP-800 a TP-1260
      referenceSizeId = 8;
    } else { // TP-500 a TP-700
      referenceSizeId = 1;
    }
    
    const mortalityRate = mortalityRates.find(
      m => m.month === month && m.sizeId === referenceSizeId
    );
    
    return mortalityRate ? mortalityRate.percentage / 100 : 0.01; // 1% come valore di default
  };

  const calculateGrowthWithDynamicSgr = (
    currentWeight: number,
    currentAnimalsPerKg: number,
    totalAnimals: number,
    startDate: Date,
    projectionDays: number,
    availableSizes: Size[]
  ): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    let simulationWeight = currentWeight;
    let simulationDate = new Date(startDate);
    let simulationAnimalsPerKg = currentAnimalsPerKg;
    let simulationTotalAnimals = totalAnimals;
    
    // Aggiungiamo l'evento iniziale
    const currentSize = sizes.find(s => {
      return s.minAnimalsPerKg !== null && 
             s.maxAnimalsPerKg !== null && 
             simulationAnimalsPerKg >= s.minAnimalsPerKg && 
             simulationAnimalsPerKg <= s.maxAnimalsPerKg;
    });
    
    events.push({
      date: new Date(simulationDate),
      weight: simulationWeight,
      size: currentSize ? {
        code: currentSize.code,
        name: currentSize.name,
        color: currentSize.color || '#cccccc',
        minAnimalsPerKg: currentSize.minAnimalsPerKg,
        maxAnimalsPerKg: currentSize.maxAnimalsPerKg
      } : null,
      animalsPerKg: simulationAnimalsPerKg,
      totalAnimals: simulationTotalAnimals,
      mortalityRate: 0,
      daysToReach: 0
    });
    
    // Giorni già simulati
    let daysSimulated = 0;
    
    // Simula la crescita giorno per giorno
    while (daysSimulated < projectionDays) {
      daysSimulated++;
      simulationDate = new Date(simulationDate);
      simulationDate.setDate(simulationDate.getDate() + 1);
      
      // Calcola il tasso di crescita giornaliero dinamico in base al mese
      const dailyGrowthRate = getSgrRateForDate(simulationDate) / 100;
      
      // Applica il tasso di crescita giornaliero
      simulationWeight = simulationWeight * (1 + dailyGrowthRate);
      
      // Aggiorna gli animali per kg (inversamente proporzionali al peso)
      simulationAnimalsPerKg = 1000 / (simulationWeight / 1000);
      
      // Calcola la mortalità giornaliera
      const currentSizeCode = events[events.length - 1].size?.code || '';
      const dailyMortalityRate = getMortalityRateForSizeAndDate(currentSizeCode, simulationDate) / 30; // Mortalità giornaliera
      const animalsLost = Math.floor(simulationTotalAnimals * dailyMortalityRate);
      simulationTotalAnimals -= animalsLost;
      
      // Controlla se abbiamo raggiunto una nuova taglia
      const newSize = sizes.find(s => {
        return s.minAnimalsPerKg !== null && 
               s.maxAnimalsPerKg !== null && 
               simulationAnimalsPerKg >= s.minAnimalsPerKg && 
               simulationAnimalsPerKg <= s.maxAnimalsPerKg;
      });
      
      // Se la taglia è cambiata, aggiungiamo un evento
      if (newSize && events[events.length - 1].size?.code !== newSize.code) {
        events.push({
          date: new Date(simulationDate),
          weight: simulationWeight,
          size: {
            code: newSize.code,
            name: newSize.name,
            color: newSize.color || '#cccccc',
            minAnimalsPerKg: newSize.minAnimalsPerKg,
            maxAnimalsPerKg: newSize.maxAnimalsPerKg
          },
          animalsPerKg: simulationAnimalsPerKg,
          totalAnimals: simulationTotalAnimals,
          mortalityRate: dailyMortalityRate,
          daysToReach: daysSimulated
        });
      }
      
      // Aggiungiamo un evento alla fine di ogni mese per tracciare l'andamento
      const isLastDayOfMonth = new Date(simulationDate).getDate() === new Date(new Date(simulationDate).setDate(0)).getDate();
      if (isLastDayOfMonth) {
        events.push({
          date: new Date(simulationDate),
          weight: simulationWeight,
          size: newSize ? {
            code: newSize.code,
            name: newSize.name,
            color: newSize.color || '#cccccc',
            minAnimalsPerKg: newSize.minAnimalsPerKg,
            maxAnimalsPerKg: newSize.maxAnimalsPerKg
          } : events[events.length - 1].size,
          animalsPerKg: simulationAnimalsPerKg,
          totalAnimals: simulationTotalAnimals,
          mortalityRate: dailyMortalityRate,
          daysToReach: daysSimulated
        });
      }
    }
    
    return events;
  };

  // Calcola le timeline per ogni cesta
  useEffect(() => {
    const timelines: BasketTimeline[] = [];
    
    // Calcola i giorni di proiezione
    const projectionDays = projectionMonths * 30; // Approssimazione
    
    // Per ogni cesta con dati validi
    basketsData.filter(basket => 
      basket.averageWeight !== null && 
      basket.animalsPerKg !== null && 
      basket.totalAnimals !== null &&
      basket.lastOperationDate !== null &&
      basket.sizeCode !== null
    ).forEach(basket => {
      // Calcola la timeline di crescita
      const events = calculateGrowthWithDynamicSgr(
        basket.averageWeight!,
        basket.animalsPerKg!,
        basket.totalAnimals!,
        new Date(basket.lastOperationDate!),
        projectionDays,
        sizes
      );
      
      timelines.push({
        basketId: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyName: basket.flupsyName,
        initialWeight: basket.averageWeight!,
        initialAnimalsPerKg: basket.animalsPerKg!,
        initialTotalAnimals: basket.totalAnimals!,
        initialSizeCode: basket.sizeCode!,
        events
      });
    });
    
    setBasketTimelines(timelines);
    
    // Preparazione dei dati per la timeline complessiva
    prepareTimelineChartData(timelines);
    
    // Calcola i milestone di vendita
    calculateSalesMilestones(timelines);
  }, [basketsData, sizes, sgrRates, mortalityRates, projectionMonths]);

  // Prepara i dati per il grafico della timeline
  const prepareTimelineChartData = (timelines: BasketTimeline[]) => {
    const dateMap = new Map<string, {
      date: Date,
      totalAnimals: number,
      sizeDistribution: Record<string, number>
    }>();
    
    // Inizializza le taglie target
    const targetSizesSet = new Set(targetSizes);
    
    // Per ogni cesta e ogni evento
    timelines.forEach(timeline => {
      timeline.events.forEach(event => {
        const dateStr = event.date.toISOString().split('T')[0];
        
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: event.date,
            totalAnimals: 0,
            sizeDistribution: {}
          });
        }
        
        const entry = dateMap.get(dateStr)!;
        
        // Aggiungi animali totali
        entry.totalAnimals += event.totalAnimals;
        
        // Aggiorna la distribuzione delle taglie
        if (event.size) {
          if (!entry.sizeDistribution[event.size.code]) {
            entry.sizeDistribution[event.size.code] = 0;
          }
          entry.sizeDistribution[event.size.code] += event.totalAnimals;
        }
      });
    });
    
    // Converti la mappa in un array ordinato per data
    const chartData = Array.from(dateMap.entries())
      .map(([dateStr, data]) => ({
        date: dateStr,
        displayDate: formatDateIT(data.date),
        totalAnimals: data.totalAnimals,
        ...data.sizeDistribution
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setTimelineChartData(chartData);
    
    // Prepara anche i dati per il grafico degli animali per taglia
    prepareAnimalsPerSizeChartData(chartData);
  };
  
  // Prepara i dati per il grafico degli animali per taglia
  const prepareAnimalsPerSizeChartData = (timelineData: any[]) => {
    // Prendi solo alcune date chiave (inizio, alcune intermedie, fine)
    const filteredDates = timelineData.filter((_, index) => 
      index === 0 || // Primo giorno
      index === Math.floor(timelineData.length / 4) || // 25%
      index === Math.floor(timelineData.length / 2) || // 50%
      index === Math.floor(timelineData.length * 3 / 4) || // 75%
      index === timelineData.length - 1 // Ultimo giorno
    );
    
    // Crea i dati per il grafico
    const chartData: any[] = [];
    
    // Per ogni taglia target
    targetSizes.forEach(sizeCode => {
      const sizeObj = sizes.find(s => s.code === sizeCode);
      if (!sizeObj) return;
      
      // Per ogni data chiave
      filteredDates.forEach(dateData => {
        const animalsCount = dateData[sizeCode] || 0;
        if (animalsCount > 0) {
          chartData.push({
            date: dateData.date,
            displayDate: dateData.displayDate,
            size: sizeCode,
            sizeName: sizeObj.name,
            color: sizeObj.color || '#cccccc',
            animalsCount
          });
        }
      });
    });
    
    setAnimalsPerSizeChartData(chartData);
  };
  
  // Calcola i milestone di vendita
  const calculateSalesMilestones = (timelines: BasketTimeline[]) => {
    const milestoneMap = new Map<string, SalesMilestone>();
    
    // Per ogni cesta e ogni evento
    timelines.forEach(timeline => {
      // Filtra solo gli eventi di cambio taglia
      const sizeChangeEvents = timeline.events.filter((event, index, arr) => {
        // È un cambio taglia se è il primo evento o se la taglia è diversa dall'evento precedente
        if (index === 0) return true;
        if (!event.size || !arr[index-1].size) return false;
        return event.size.code !== arr[index-1].size?.code;
      });
      
      // Per ogni evento di cambio taglia
      sizeChangeEvents.forEach(event => {
        // Se la taglia è tra quelle target
        if (event.size && targetSizes.includes(event.size.code)) {
          const dateStr = event.date.toISOString().split('T')[0];
          const key = `${dateStr}-${event.size.code}`;
          
          if (!milestoneMap.has(key)) {
            milestoneMap.set(key, {
              date: event.date,
              targetSize: event.size.code,
              targeSizeName: event.size.name,
              basketCount: 0,
              totalAnimals: 0,
              averageWeight: 0
            });
          }
          
          const milestone = milestoneMap.get(key)!;
          milestone.basketCount++;
          milestone.totalAnimals += event.totalAnimals;
          milestone.averageWeight = (milestone.averageWeight * (milestone.basketCount - 1) + event.weight) / milestone.basketCount;
        }
      });
    });
    
    // Converti la mappa in un array ordinato per data
    const milestones = Array.from(milestoneMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setSalesMilestones(milestones);
  };

  return (
    <div className="space-y-8">
      {/* Grafico Timeline Generale */}
      <Card className="border-teal-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
          <CardTitle className="text-teal-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-teal-500"></div>
            </div>
            Timeline di Produzione
          </CardTitle>
          <CardDescription className="text-teal-600">
            Proiezione della produzione e distribuzione delle taglie nel tempo ({projectionMonths} mesi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={timelineChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayDate" 
                  angle={-45} 
                  textAnchor="end"
                  height={80} 
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  label={{ 
                    value: 'Animali', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                  tickFormatter={(value) => formatNumberEU(value)}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ 
                    value: 'Taglie', 
                    angle: 90, 
                    position: 'insideRight' 
                  }}
                  domain={[0, 1]}
                  hide
                />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'totalAnimals') {
                      return [formatNumberEU(Number(value)), 'Animali Totali'];
                    }
                    // Trova il nome completo della taglia
                    const sizeObj = sizes.find(s => s.code === name);
                    return [formatNumberEU(Number(value)), `Taglia ${name} (${sizeObj?.name || ''})`];
                  }}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '10px' }}
                  content={(props: any) => {
                    const { active, payload, label } = props;
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
                          <p className="font-bold mb-1">{`Data: ${label}`}</p>
                          <div className="space-y-1">
                            {payload.map((entry: any, index: number) => {
                              // Colora il quadratino del colore della serie
                              const isTotal = entry.name === 'totalAnimals';
                              const sizeObj = isTotal ? null : sizes.find(s => s.code === entry.name);
                              return (
                                <div key={index} className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3" 
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm">
                                    {isTotal 
                                      ? 'Animali Totali' 
                                      : `${entry.name} ${sizeObj?.name ? `(${sizeObj.name})` : ''}`}:
                                  </span>
                                  <span className="font-medium text-sm">
                                    {formatNumberEU(Number(entry.value))}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                
                {/* Aree impilate per le taglie */}
                {targetSizes.map((sizeCode, index) => {
                  const sizeObj = sizes.find(s => s.code === sizeCode);
                  if (!sizeObj) return null;
                  
                  return (
                    <Area 
                      key={sizeCode}
                      type="monotone"
                      dataKey={sizeCode}
                      name={sizeCode}
                      stackId="1"
                      fill={sizeObj.color || `hsl(${index * 30}, 70%, 50%)`}
                      stroke={sizeObj.color || `hsl(${index * 30}, 70%, 50%)`}
                      yAxisId="left"
                    />
                  );
                })}
                
                {/* Linea per il totale degli animali */}
                <Line 
                  type="monotone"
                  dataKey="totalAnimals"
                  name="Animali Totali"
                  stroke="#ff7300"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 5 }}
                  yAxisId="left"
                />
                
                {/* Riferimenti per le date dei milestone */}
                {salesMilestones.map((milestone, index) => (
                  <ReferenceLine 
                    key={index}
                    x={formatDateIT(milestone.date)}
                    stroke="red"
                    strokeDasharray="3 3"
                    label={{ 
                      value: `${milestone.targetSize}`, 
                      position: 'top',
                      fill: 'red',
                      fontSize: 10 
                    }}
                    yAxisId="left"
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Milestone di Vendita */}
      <Card className="border-amber-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            </div>
            Milestone di Vendita
          </CardTitle>
          <CardDescription className="text-amber-600">
            Previsione di raggiungimento delle taglie commerciali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {salesMilestones.map((milestone, index) => {
              const sizeObj = sizes.find(s => s.code === milestone.targetSize);
              const color = sizeObj?.color || '#cccccc';
              
              return (
                <Card key={index} className="shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <CardHeader className="pb-2" style={{ 
                    borderBottom: `1px solid ${color}30`,
                    background: `linear-gradient(to right, ${color}15, white)`
                  }}>
                    <div className="flex justify-between items-center">
                      <Badge
                        style={{ 
                          backgroundColor: color,
                          color: parseInt(milestone.targetSize.replace('TP-', '')) <= 1500 || parseInt(milestone.targetSize.replace('TP-', '')) >= 6000 ? 'white' : 'black'
                        }}
                        className="shadow-sm font-bold px-2.5"
                      >
                        {milestone.targetSize}
                      </Badge>
                      <div className="text-sm text-amber-600 font-semibold">
                        {formatDateIT(milestone.date)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ceste:</span>
                        <span className="font-medium">{milestone.basketCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Animali:</span>
                        <span className="font-medium">{formatNumberEU(milestone.totalAnimals)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peso medio:</span>
                        <span className="font-medium">{formatDecimalEU(milestone.averageWeight)} mg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {salesMilestones.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              Nessun milestone di vendita previsto nel periodo specificato
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Produzione prevista per taglia */}
      <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
          <CardTitle className="text-indigo-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
            </div>
            Produzione per Taglia
          </CardTitle>
          <CardDescription className="text-indigo-600">
            Animali previsti per ciascuna taglia commerciale nel periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={animalsPerSizeChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis 
                  label={{ 
                    value: 'Animali', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                  tickFormatter={(value) => formatNumberEU(value)}
                />
                <Tooltip 
                  formatter={(value) => [formatNumberEU(Number(value)), 'Animali']}
                  content={(props: any) => {
                    const { active, payload, label } = props;
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border rounded shadow-sm">
                          <p className="font-bold">Data: {label}</p>
                          <p>Taglia: {data.size} ({data.sizeName})</p>
                          <p>Animali: {formatNumberEU(data.animalsCount)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="animalsCount" 
                  name="Animali" 
                >
                  {animalsPerSizeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabella riassuntiva trimestrale */}
      <Card className="border-violet-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-white border-b border-violet-100">
          <CardTitle className="text-violet-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-violet-500"></div>
            </div>
            Previsione Trimestrale
          </CardTitle>
          <CardDescription className="text-violet-600">
            Riassunto trimestrale della produzione prevista
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Implementare qui una tabella riepilogativa trimestrale */}
          <div className="space-y-4">
            {/* Da implementare */}
            <div className="text-center text-muted-foreground py-4">
              Dati in elaborazione...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesTimeline;