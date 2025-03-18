import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function Statistics() {
  const [selectedTab, setSelectedTab] = useState('growth');
  const [selectedCycles, setSelectedCycles] = useState<string[]>([]);
  
  // Query cycles
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['/api/cycles'],
  });

  // Query sizes
  const { data: sizes, isLoading: sizesLoading } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Format cycles for selection
  const cycleOptions = cycles
    ?.sort((a: any, b: any) => b.id - a.id)
    ?.slice(0, 10)
    ?.map((cycle: any) => ({
      value: cycle.id.toString(),
      label: `Ciclo #${cycle.id} (Cesta #${cycle.basket?.physicalNumber || cycle.basketId})`,
    })) || [];
  
  // Fetch comparison data when cycles are selected
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: [`/api/statistics/cycles/comparison?cycleIds=${selectedCycles.join(',')}`],
    enabled: selectedCycles.length > 0,
  });

  // Format the data for charts
  const growthChartData = [];
  if (comparisonData) {
    // Create growth chart data (by days)
    const maxDays = Math.max(...comparisonData.flatMap((cycle: any) => 
      cycle.growthData.map((point: any) => point.daysFromStart)
    ), 0);
    
    for (let day = 0; day <= maxDays; day += 5) {
      const point = { day };
      
      comparisonData.forEach((cycle: any, index: number) => {
        const closestPoint = cycle.growthData.reduce((closest: any, current: any) => {
          const currentDiff = Math.abs(current.daysFromStart - day);
          const closestDiff = Math.abs(closest.daysFromStart - day);
          return currentDiff < closestDiff ? current : closest;
        }, { daysFromStart: Infinity, averageWeight: 0 });
        
        if (Math.abs(closestPoint.daysFromStart - day) <= 3) {
          point[`cycle${cycle.cycleId}`] = closestPoint.averageWeight;
        }
      });
      
      growthChartData.push(point);
    }
  }

  // Colors for charts
  const COLORS = ['#4791db', '#00796b', '#c8a415', '#f44336', '#9c27b0', '#673ab7'];

  const handleCycleSelect = (cycleId: string) => {
    setSelectedCycles(prev => {
      if (prev.includes(cycleId)) {
        return prev.filter(id => id !== cycleId);
      } else {
        return [...prev, cycleId];
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Statistiche</h2>
      </div>

      <Tabs defaultValue="growth" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="growth">Statistiche di Crescita</TabsTrigger>
          <TabsTrigger value="cycles">Confronto Cicli</TabsTrigger>
        </TabsList>
        
        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Andamento Crescita per Ciclo</CardTitle>
              <CardDescription>
                Visualizza l'andamento della crescita in termini di peso medio (mg) nel tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {cycleOptions.map(cycle => (
                  <Button
                    key={cycle.value}
                    variant={selectedCycles.includes(cycle.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCycleSelect(cycle.value)}
                  >
                    {cycle.label}
                  </Button>
                ))}
              </div>
              
              <div className="h-[400px] w-full">
                {comparisonLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <p>Caricamento dati...</p>
                  </div>
                ) : growthChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={growthChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        label={{ 
                          value: 'Giorni', 
                          position: 'insideBottomRight', 
                          offset: -10 
                        }} 
                      />
                      <YAxis 
                        label={{ 
                          value: 'Peso medio (mg)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }} 
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} mg`, 'Peso medio']}
                        labelFormatter={(value) => `Giorno ${value}`}
                      />
                      <Legend />
                      {comparisonData && comparisonData.map((cycle: any, index: number) => (
                        <Line
                          key={cycle.cycleId}
                          type="monotone"
                          dataKey={`cycle${cycle.cycleId}`}
                          name={`Ciclo #${cycle.cycleId}`}
                          stroke={COLORS[index % COLORS.length]}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-gray-50 rounded flex items-center justify-center">
                    <p className="text-gray-500">Seleziona uno o più cicli per visualizzare i dati</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cycles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confronto Durata Cicli</CardTitle>
              <CardDescription>
                Confronta la durata dei cicli produttivi in giorni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {cycleOptions.map(cycle => (
                  <Button
                    key={cycle.value}
                    variant={selectedCycles.includes(cycle.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCycleSelect(cycle.value)}
                  >
                    {cycle.label}
                  </Button>
                ))}
              </div>
              
              <div className="h-[400px] w-full">
                {comparisonLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <p>Caricamento dati...</p>
                  </div>
                ) : comparisonData && comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="cycleId" 
                        label={{ 
                          value: 'Ciclo #', 
                          position: 'insideBottomRight', 
                          offset: -10 
                        }}
                        tickFormatter={(value) => `#${value}`}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Durata (giorni)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }} 
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} giorni`, 'Durata']}
                        labelFormatter={(value) => `Ciclo #${value}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="duration" 
                        name="Durata (giorni)" 
                        fill="#4791db" 
                        label={{
                          position: 'top',
                          formatter: (value: any) => value || 'In corso'
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-gray-50 rounded flex items-center justify-center">
                    <p className="text-gray-500">Seleziona uno o più cicli per visualizzare i dati</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tassi di Crescita per Ciclo</CardTitle>
              <CardDescription>
                Confronta i tassi di crescita (mg/giorno) tra diversi cicli
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {comparisonLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <p>Caricamento dati...</p>
                  </div>
                ) : comparisonData && comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData.map((cycle: any) => {
                        // Calculate growth rate (if there's enough data)
                        let growthRate = 0;
                        if (cycle.growthData.length >= 2) {
                          const firstPoint = cycle.growthData[0];
                          const lastPoint = cycle.growthData[cycle.growthData.length - 1];
                          const daysDiff = lastPoint.daysFromStart - firstPoint.daysFromStart;
                          
                          if (daysDiff > 0) {
                            growthRate = (lastPoint.averageWeight - firstPoint.averageWeight) / daysDiff;
                          }
                        }
                        
                        return {
                          cycleId: cycle.cycleId,
                          growthRate: Math.round(growthRate * 100) / 100
                        };
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="cycleId" 
                        label={{ 
                          value: 'Ciclo #', 
                          position: 'insideBottomRight', 
                          offset: -10 
                        }}
                        tickFormatter={(value) => `#${value}`}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Tasso di crescita (mg/giorno)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }} 
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} mg/giorno`, 'Tasso di crescita']}
                        labelFormatter={(value) => `Ciclo #${value}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="growthRate" 
                        name="Tasso di crescita (mg/giorno)" 
                        fill="#00796b"
                        label={{
                          position: 'top'
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-gray-50 rounded flex items-center justify-center">
                    <p className="text-gray-500">Seleziona uno o più cicli per visualizzare i dati</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
