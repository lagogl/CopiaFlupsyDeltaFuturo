import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { formatNumberWithCommas } from "@/lib/utils";

interface GrowthPredictionChartProps {
  // Peso corrente misurato in mg
  currentWeight: number;
  // Data della misurazione
  measurementDate: Date;
  // Valore teorico SGR mensile in percentuale
  theoreticalSgrMonthlyPercentage: number;
  // Valore SGR calcolato dalle performance reali (opzionale)
  realSgrMonthlyPercentage?: number;
  // Numero di giorni per la proiezione futura
  projectionDays?: number;
  // Variazioni percentuali per gli scenari
  variationPercentages?: {
    best: number;
    worst: number;
  };
}

interface DataPoint {
  date: Date;
  weight: number;
  theoretical: number;
  best: number;
  worst: number;
  real?: number;
}

export default function GrowthPredictionChart({
  currentWeight,
  measurementDate,
  theoreticalSgrMonthlyPercentage,
  realSgrMonthlyPercentage,
  projectionDays = 30,
  variationPercentages = { best: 30, worst: 30 }
}: GrowthPredictionChartProps) {
  const [days, setDays] = useState(projectionDays);
  const [variations, setVariations] = useState(variationPercentages);
  const [predictedData, setPredictedData] = useState<DataPoint[]>([]);
  const [selectedTab, setSelectedTab] = useState("chart");

  // Converte la percentuale mensile in percentuale giornaliera
  const calculateDailySgr = (monthlySgr: number): number => {
    // SGR mensile è composto da (1 + SGR/100)^30 - 1
    // quindi SGR giornaliero è (1 + sgr_mensile/100)^(1/30) - 1
    return (Math.pow(1 + monthlySgr/100, 1/30) - 1) * 100;
  };

  // Calcola il peso previsto dopo un certo numero di giorni
  const calculatePredictedWeight = (
    initialWeight: number, 
    days: number, 
    dailySgrPercentage: number,
    variationPercentage: number = 0
  ) => {
    // Applica la variazione alla percentuale SGR 
    const adjustedDailySgr = dailySgrPercentage * (1 + variationPercentage / 100);
    
    // Formula: Peso_finale = Peso_iniziale * (1 + SGR/100)^giorni
    return initialWeight * Math.pow(1 + adjustedDailySgr/100, days);
  };

  useEffect(() => {
    // Calcola SGR giornaliero teorico
    const theoreticalDailySgr = calculateDailySgr(theoreticalSgrMonthlyPercentage);
    
    // Calcola SGR giornaliero reale se disponibile
    const realDailySgr = realSgrMonthlyPercentage 
      ? calculateDailySgr(realSgrMonthlyPercentage) 
      : undefined;
    
    // Genera i dati per il grafico
    const data: DataPoint[] = [];
    
    // Aggiungi il punto iniziale
    data.push({
      date: measurementDate,
      weight: currentWeight,
      theoretical: currentWeight,
      best: currentWeight,
      worst: currentWeight,
      real: currentWeight
    });
    
    // Genera i punti per i giorni successivi
    for (let i = 1; i <= days; i++) {
      const date = addDays(measurementDate, i);
      const theoretical = calculatePredictedWeight(currentWeight, i, theoreticalDailySgr);
      const best = calculatePredictedWeight(currentWeight, i, theoreticalDailySgr, variations.best);
      const worst = calculatePredictedWeight(currentWeight, i, theoreticalDailySgr, -variations.worst);
      const real = realDailySgr ? calculatePredictedWeight(currentWeight, i, realDailySgr) : undefined;
      
      data.push({
        date,
        weight: i === 0 ? currentWeight : 0, // Solo il primo giorno ha un peso reale
        theoretical,
        best,
        worst,
        real
      });
    }
    
    setPredictedData(data);
  }, [currentWeight, measurementDate, theoreticalSgrMonthlyPercentage, realSgrMonthlyPercentage, days, variations]);

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM', { locale: it });
  };
  
  const formatTooltipValue = (value: number) => {
    return `${formatNumberWithCommas(Math.round(value))} mg`;
  };
  
  const getMaxWeight = () => {
    const bestScenario = predictedData.map(d => d.best);
    return Math.max(...bestScenario) * 1.1; // 10% margin
  };
  
  const handleVariationChange = (type: 'best' | 'worst', value: number[]) => {
    setVariations(prev => ({
      ...prev,
      [type]: value[0]
    }));
  };
  
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-semibold">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: entry.color }}></div>
              <span>{entry.name}: {formatTooltipValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Proiezione di crescita</CardTitle>
            <CardDescription>
              Scenari di crescita prevista basati su SGR
            </CardDescription>
          </div>
          <Select
            value={days.toString()}
            onValueChange={(value) => setDays(parseInt(value))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Seleziona periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 giorni</SelectItem>
              <SelectItem value="30">30 giorni</SelectItem>
              <SelectItem value="60">60 giorni</SelectItem>
              <SelectItem value="90">90 giorni</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Grafico</TabsTrigger>
            <TabsTrigger value="scenario">Scenari</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4">
            <div className="rounded-md border p-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={predictedData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                    minTickGap={30}
                  />
                  <YAxis 
                    domain={[0, getMaxWeight()]} 
                    tickFormatter={(value) => `${Math.round(value)}`}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  <ReferenceLine 
                    x={predictedData[0].date} 
                    stroke="#666" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    label={{ value: 'Oggi', position: 'top', fill: '#666', fontSize: 12 }}
                  />
                  {/* Scenario teorico */}
                  <Line 
                    type="monotone" 
                    name="Teorico"
                    dataKey="theoretical" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  {/* Scenario ottimistico */}
                  <Line 
                    type="monotone" 
                    name="Ottimistico"
                    dataKey="best" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  {/* Scenario pessimistico */}
                  <Line 
                    type="monotone" 
                    name="Pessimistico"
                    dataKey="worst" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  {/* Scenario basato su valori reali (se disponibile) */}
                  {realSgrMonthlyPercentage && (
                    <Line 
                      type="monotone" 
                      name="Reale"
                      dataKey="real" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Peso attuale</div>
                <div className="font-semibold">{formatNumberWithCommas(currentWeight)} mg</div>
              </div>
              
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Peso teorico (fine periodo)</div>
                <div className="font-semibold">
                  {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].theoretical))} mg
                </div>
              </div>
              
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">SGR mensile teorico</div>
                <div className="font-semibold">{theoreticalSgrMonthlyPercentage}%</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="bg-indigo-50">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
                Teorico
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                +{variations.best}% performance
              </Badge>
              <Badge variant="outline" className="bg-red-50">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                -{variations.worst}% performance
              </Badge>
              {realSgrMonthlyPercentage && (
                <Badge variant="outline" className="bg-orange-50">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div>
                  Reale ({realSgrMonthlyPercentage}%)
                </Badge>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="scenario" className="space-y-4">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">
                    Scenario ottimistico (SGR +{variations.best}%)
                  </label>
                  <span className="text-xs text-green-600 font-semibold">
                    {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].best))} mg
                  </span>
                </div>
                <Slider
                  defaultValue={[variations.best]}
                  max={100}
                  min={0}
                  step={5}
                  onValueChange={(value) => handleVariationChange('best', value)}
                  className="py-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">
                    Scenario pessimistico (SGR -{variations.worst}%)
                  </label>
                  <span className="text-xs text-red-600 font-semibold">
                    {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].worst))} mg
                  </span>
                </div>
                <Slider
                  defaultValue={[variations.worst]}
                  max={100}
                  min={0}
                  step={5}
                  onValueChange={(value) => handleVariationChange('worst', value)}
                  className="py-2"
                />
              </div>
            </div>
            
            <div className="border rounded-md p-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Valori proiettati per il {format(predictedData[predictedData.length - 1].date, 'dd/MM/yyyy')}</h4>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Scenario teorico</div>
                  <div className="font-semibold text-indigo-600">
                    {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].theoretical))} mg
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Scenario ottimistico</div>
                  <div className="font-semibold text-green-600">
                    {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].best))} mg
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Scenario pessimistico</div>
                  <div className="font-semibold text-red-600">
                    {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].worst))} mg
                  </div>
                </div>
                
                {realSgrMonthlyPercentage && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Basato su performance reale</div>
                    <div className="font-semibold text-orange-600">
                      {formatNumberWithCommas(Math.round(predictedData[predictedData.length - 1].real || 0))} mg
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}