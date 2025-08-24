import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Package, FileDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Lot, Operation } from '@shared/schema';

interface LotAnalytics {
  id: number;
  supplier: string;
  supplierLotNumber: string;
  arrivalDate: string;
  initialCount: number;
  currentCount: number;
  soldCount: number;
  mortalityCount: number;
  mortalityPercentage: number;
  averageWeight: number;
  totalWeight: number;
  status: 'active' | 'sold' | 'completed';
  daysInSystem: number;
  basketsUsed: number;
  lastOperation: string;
}

const COLORS = ['#4791db', '#00796b', '#c8a415', '#f44336', '#9c27b0', '#673ab7'];

export default function LotsAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  // Query lots data with analytics
  const { data: lotsAnalytics, isLoading } = useQuery<LotAnalytics[]>({
    queryKey: ['/api/analytics/lots', selectedPeriod, selectedSupplier, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: selectedPeriod,
        supplier: selectedSupplier,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd')
      });
      const response = await fetch(`/api/analytics/lots?${params}`);
      return response.json();
    }
  });

  // Query suppliers list
  const { data: suppliers } = useQuery<string[]>({
    queryKey: ['/api/analytics/suppliers'],
  });

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!lotsAnalytics) return null;

    const totalInitialAnimals = lotsAnalytics.reduce((sum, lot) => sum + lot.initialCount, 0);
    const totalCurrentAnimals = lotsAnalytics.reduce((sum, lot) => sum + lot.currentCount, 0);
    const totalSold = lotsAnalytics.reduce((sum, lot) => sum + lot.soldCount, 0);
    const totalMortality = lotsAnalytics.reduce((sum, lot) => sum + lot.mortalityCount, 0);
    const averageMortalityRate = lotsAnalytics.length > 0 
      ? lotsAnalytics.reduce((sum, lot) => sum + lot.mortalityPercentage, 0) / lotsAnalytics.length 
      : 0;

    return {
      totalLots: lotsAnalytics.length,
      totalInitialAnimals,
      totalCurrentAnimals,
      totalSold,
      totalMortality,
      averageMortalityRate,
      totalWeight: lotsAnalytics.reduce((sum, lot) => sum + lot.totalWeight, 0)
    };
  }, [lotsAnalytics]);

  // Mortality trend data
  const mortalityTrendData = useMemo(() => {
    if (!lotsAnalytics) return [];
    
    return lotsAnalytics
      .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
      .map(lot => ({
        date: format(new Date(lot.arrivalDate), 'dd/MM', { locale: it }),
        mortality: parseFloat(lot.mortalityPercentage.toFixed(2)),
        supplier: lot.supplier,
        lotNumber: lot.supplierLotNumber
      }));
  }, [lotsAnalytics]);

  // Supplier distribution data
  const supplierData = useMemo(() => {
    if (!lotsAnalytics) return [];
    
    const groupedBySupplier = lotsAnalytics.reduce((acc, lot) => {
      if (!acc[lot.supplier]) {
        acc[lot.supplier] = { count: 0, totalAnimals: 0, totalMortality: 0 };
      }
      acc[lot.supplier].count++;
      acc[lot.supplier].totalAnimals += lot.initialCount;
      acc[lot.supplier].totalMortality += lot.mortalityCount;
      return acc;
    }, {} as Record<string, { count: number; totalAnimals: number; totalMortality: number }>);

    return Object.entries(groupedBySupplier).map(([supplier, data]) => ({
      supplier,
      lotti: data.count,
      animali: data.totalAnimals,
      mortalita: data.totalMortality,
      mortalitaPercentuale: ((data.totalMortality / data.totalAnimals) * 100).toFixed(1)
    }));
  }, [lotsAnalytics]);

  // Export function
  const handleExport = () => {
    if (!lotsAnalytics) return;
    
    const csvData = lotsAnalytics.map(lot => ({
      'ID Lotto': lot.id,
      'Fornitore': lot.supplier,
      'Numero Lotto Fornitore': lot.supplierLotNumber,
      'Data Arrivo': lot.arrivalDate,
      'Animali Iniziali': lot.initialCount,
      'Animali Attuali': lot.currentCount,
      'Venduti': lot.soldCount,
      'Mortalità': lot.mortalityCount,
      'Mortalità %': `${lot.mortalityPercentage.toFixed(2)}%`,
      'Peso Medio (mg)': lot.averageWeight,
      'Giorni nel Sistema': lot.daysInSystem,
      'Stato': lot.status
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisi_lotti_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title="Analisi Lotti e Mortalità" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Analisi Lotti e Mortalità" />
      
      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri Analisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Periodo</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                  <SelectItem value="30">Ultimi 30 giorni</SelectItem>
                  <SelectItem value="90">Ultimi 3 mesi</SelectItem>
                  <SelectItem value="365">Ultimo anno</SelectItem>
                  <SelectItem value="custom">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Fornitore</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i fornitori</SelectItem>
                  {suppliers?.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Da</label>
                  <DatePicker date={dateFrom} setDate={setDateFrom} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">A</label>
                  <DatePicker date={dateTo} setDate={setDateTo} />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
              <FileDown className="w-4 h-4" />
              Esporta CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metriche Riassuntive */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Lotti Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalLots}</div>
              <div className="text-xs text-muted-foreground">
                {summaryMetrics.totalInitialAnimals.toLocaleString()} animali iniziali
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Giacenza Attuale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryMetrics.totalCurrentAnimals.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {summaryMetrics.totalSold.toLocaleString()} venduti
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Mortalità Totale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summaryMetrics.totalMortality.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {summaryMetrics.averageMortalityRate.toFixed(1)}% media
              </div>
              <Progress 
                value={summaryMetrics.averageMortalityRate} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Peso Totale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summaryMetrics.totalWeight / 1000).toFixed(1)}kg
              </div>
              <div className="text-xs text-muted-foreground">
                Peso combinato attuale
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grafici e Analisi */}
      <Tabs defaultValue="mortality" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mortality">Trend Mortalità</TabsTrigger>
          <TabsTrigger value="suppliers">Fornitori</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="details">Dettagli Lotti</TabsTrigger>
        </TabsList>

        <TabsContent value="mortality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Mortalità per Lotto</CardTitle>
              <CardDescription>
                Andamento della mortalità per data di arrivo lotto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mortalityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Mortalità']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="mortality" 
                    stroke="#f44336" 
                    strokeWidth={2}
                    dot={{ fill: "#f44336" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance per Fornitore</CardTitle>
              <CardDescription>
                Confronto mortalità e volumi per fornitore
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={supplierData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="supplier" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="lotti" fill="#4791db" name="N° Lotti" />
                  <Bar dataKey="mortalitaPercentuale" fill="#f44336" name="Mortalità %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Stati Lotti</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Attivi', value: lotsAnalytics?.filter(l => l.status === 'active').length || 0, fill: '#4791db' },
                        { name: 'Venduti', value: lotsAnalytics?.filter(l => l.status === 'sold').length || 0, fill: '#00796b' },
                        { name: 'Completati', value: lotsAnalytics?.filter(l => l.status === 'completed').length || 0, fill: '#c8a415' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[{ fill: '#4791db' }, { fill: '#00796b' }, { fill: '#c8a415' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Lotti per Mortalità</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lotsAnalytics
                    ?.sort((a, b) => b.mortalityPercentage - a.mortalityPercentage)
                    .slice(0, 5)
                    .map(lot => (
                      <div key={lot.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{lot.supplier} - {lot.supplierLotNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {lot.mortalityCount.toLocaleString()} morti su {lot.initialCount.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={lot.mortalityPercentage > 10 ? "destructive" : "secondary"}>
                          {lot.mortalityPercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Lotti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fornitore</th>
                      <th className="text-left p-2">Lotto</th>
                      <th className="text-right p-2">Iniziali</th>
                      <th className="text-right p-2">Attuali</th>
                      <th className="text-right p-2">Mortalità</th>
                      <th className="text-right p-2">%</th>
                      <th className="text-left p-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotsAnalytics?.map(lot => (
                      <tr key={lot.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{lot.supplier}</td>
                        <td className="p-2 font-mono text-sm">{lot.supplierLotNumber}</td>
                        <td className="p-2 text-right">{lot.initialCount.toLocaleString()}</td>
                        <td className="p-2 text-right">{lot.currentCount.toLocaleString()}</td>
                        <td className="p-2 text-right">{lot.mortalityCount.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <span className={lot.mortalityPercentage > 10 ? 'text-red-600 font-medium' : ''}>
                            {lot.mortalityPercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2">
                          <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                            {lot.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}