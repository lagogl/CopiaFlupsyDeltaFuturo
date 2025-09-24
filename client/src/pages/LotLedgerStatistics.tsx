import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Package, FileDown, 
  ArrowUpRight, ArrowDownLeft, DollarSign, AlertCircle,
  Calendar, Filter, Search, BarChart3, Activity
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface LotLedgerEntry {
  id: number;
  date: string;
  lotId: number;
  lotSupplierNumber: string;
  lotSupplier: string;
  type: 'in' | 'transfer_out' | 'transfer_in' | 'sale' | 'mortality';
  quantity: number;
  sourceCycleId?: number;
  destCycleId?: number;
  selectionId?: number;
  operationId?: number;
  basketId?: number;
  allocationMethod: string;
  notes?: string;
  createdAt: string;
}

interface LotStats {
  success: boolean;
  lotId: number;
  lot: any;
  currentBalance: number;
  stats: {
    in: number;
    transfer_out: number;
    transfer_in: number;
    sale: number;
    mortality: number;
  };
  percentages: {
    survival: number;
    sold: number;
    mortality: number;
    transferred: number;
  };
  totals: {
    totalInflow: number;
    totalOutflow: number;
    netBalance: number;
  };
  summaryByType: Array<{
    type: string;
    totalQuantity: number;
    movementCount: number;
    earliestDate: string;
    latestDate: string;
  }>;
  activityPeriod: {
    firstMovement: number;
    lastMovement: number;
    daysSinceFirst: number;
  } | null;
  recentMovements: LotLedgerEntry[];
  metadata: {
    totalMovements: number;
    calculatedAt: string;
  };
}

const MOVEMENT_COLORS = {
  'in': '#10b981',           // Verde per ingressi
  'transfer_in': '#3b82f6',  // Blu per trasferimenti in entrata
  'transfer_out': '#f59e0b', // Arancione per trasferimenti in uscita
  'sale': '#06d6a0',         // Verde acqua per vendite
  'mortality': '#ef4444'     // Rosso per mortalità
};

const MOVEMENT_LABELS = {
  'in': 'Ingresso',
  'transfer_in': 'Trasf. Entrata',
  'transfer_out': 'Trasf. Uscita',
  'sale': 'Vendita',
  'mortality': 'Mortalità'
};

export default function LotLedgerStatistics() {
  const [selectedTab, setSelectedTab] = useState('timeline');
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [timelineFilters, setTimelineFilters] = useState({
    page: 1,
    pageSize: 50,
    lotId: undefined as number | undefined,
    type: '',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Query timeline data con filtri
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['/api/lots/timeline', timelineFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(timelineFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await fetch(`/api/lots/timeline?${params}`);
      return response.json();
    }
  });

  // Query statistiche lotto specifico
  const { data: lotStats, isLoading: lotStatsLoading } = useQuery<LotStats>({
    queryKey: ['/api/lots', selectedLotId, 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/lots/${selectedLotId}/stats`);
      return response.json();
    },
    enabled: !!selectedLotId
  });

  // Query lista lotti per select
  const { data: allLots } = useQuery({
    queryKey: ['/api/lots', { includeAll: true }],
    queryFn: async () => {
      const response = await fetch('/api/lots?includeAll=true');
      return response.json();
    }
  });

  // Processa dati timeline per grafici
  const timelineChartData = useMemo(() => {
    if (!timelineData?.timeline) return [];
    
    // Raggruppa per data e tipo
    const grouped = timelineData.timeline.reduce((acc: any, entry: LotLedgerEntry) => {
      const dateKey = format(new Date(entry.date), 'dd/MM');
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey };
      }
      acc[dateKey][entry.type] = (acc[dateKey][entry.type] || 0) + entry.quantity;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [timelineData]);

  // Distribuzione per tipo di movimento
  const movementDistribution = useMemo(() => {
    if (!timelineData?.timeline) return [];
    
    const distribution = timelineData.timeline.reduce((acc: any, entry: LotLedgerEntry) => {
      const existing = acc.find((item: any) => item.type === entry.type);
      if (existing) {
        existing.quantity += entry.quantity;
        existing.count += 1;
      } else {
        acc.push({ 
          type: entry.type, 
          quantity: entry.quantity, 
          count: 1,
          name: MOVEMENT_LABELS[entry.type] || entry.type
        });
      }
      return acc;
    }, []);

    return distribution;
  }, [timelineData]);

  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat('it-IT').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Statistiche Lot Ledger"
      />
      
      <div className="container mx-auto p-6 space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Timeline Globale
            </TabsTrigger>
            <TabsTrigger value="lot-details" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistiche Lotto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {/* Filtri Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtri Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Data Inizio</Label>
                    <Input
                      type="date"
                      value={timelineFilters.startDate}
                      onChange={(e) => setTimelineFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fine</Label>
                    <Input
                      type="date"
                      value={timelineFilters.endDate}
                      onChange={(e) => setTimelineFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Movimento</Label>
                    <Select 
                      value={timelineFilters.type} 
                      onValueChange={(value) => setTimelineFilters(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tutti i tipi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti i tipi</SelectItem>
                        <SelectItem value="in">Ingresso</SelectItem>
                        <SelectItem value="transfer_in">Trasferimento Entrata</SelectItem>
                        <SelectItem value="transfer_out">Trasferimento Uscita</SelectItem>
                        <SelectItem value="sale">Vendita</SelectItem>
                        <SelectItem value="mortality">Mortalità</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lotto Specifico</Label>
                    <Select 
                      value={timelineFilters.lotId?.toString() || ''} 
                      onValueChange={(value) => setTimelineFilters(prev => ({ ...prev, lotId: value ? parseInt(value) : undefined }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tutti i lotti" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti i lotti</SelectItem>
                        {allLots?.map((lot: any) => (
                          <SelectItem key={lot.id} value={lot.id.toString()}>
                            {lot.supplierLotNumber} - {lot.supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metriche Riassuntive Timeline */}
            {timelineData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Totale Movimenti</p>
                        <p className="text-2xl font-bold">{timelineData.pagination?.totalCount || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Animali Tracciati</p>
                        <p className="text-2xl font-bold">
                          {formatQuantity(timelineData.timeline?.reduce((sum: number, entry: LotLedgerEntry) => sum + entry.quantity, 0) || 0)}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Lotti Coinvolti</p>
                        <p className="text-2xl font-bold">
                          {new Set(timelineData.timeline?.map((entry: LotLedgerEntry) => entry.lotId)).size || 0}
                        </p>
                      </div>
                      <FileDown className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Periodo Analisi</p>
                        <p className="text-2xl font-bold">
                          {Math.ceil((new Date(timelineFilters.endDate).getTime() - new Date(timelineFilters.startDate).getTime()) / (1000 * 60 * 60 * 24))} giorni
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Grafici Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline Movimenti per Data</CardTitle>
                  <CardDescription>Distribuzione temporale dei movimenti</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [formatQuantity(Number(value)), MOVEMENT_LABELS[name as keyof typeof MOVEMENT_LABELS] || name]} />
                        <Legend />
                        {Object.entries(MOVEMENT_COLORS).map(([type, color]) => (
                          <Area 
                            key={type}
                            type="monotone" 
                            dataKey={type} 
                            stackId="1"
                            stroke={color} 
                            fill={color}
                            fillOpacity={0.6}
                            name={MOVEMENT_LABELS[type as keyof typeof MOVEMENT_LABELS]}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuzione per Tipo</CardTitle>
                  <CardDescription>Proporzioni dei tipi di movimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={movementDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quantity"
                        >
                          {movementDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={MOVEMENT_COLORS[entry.type as keyof typeof MOVEMENT_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatQuantity(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabella Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Movimenti Recenti</CardTitle>
                <CardDescription>
                  Ultimi {timelineData?.timeline?.length || 0} movimenti nel periodo selezionato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Lotto</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-right p-2">Quantità</th>
                        <th className="text-left p-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineData?.timeline?.map((entry: LotLedgerEntry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                          <td className="p-2">
                            <Badge variant="outline">{entry.lotSupplierNumber}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge 
                              style={{ backgroundColor: MOVEMENT_COLORS[entry.type], color: 'white' }}
                            >
                              {MOVEMENT_LABELS[entry.type]}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{formatQuantity(entry.quantity)}</td>
                          <td className="p-2 text-sm text-muted-foreground truncate max-w-48">
                            {entry.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {timelineData?.pagination && (
                  <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                    <div>
                      Pagina {timelineData.pagination.page} di {timelineData.pagination.totalPages}
                    </div>
                    <div>
                      {timelineData.pagination.totalCount} movimenti totali
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lot-details" className="space-y-6">
            {/* Selezione Lotto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Seleziona Lotto per Analisi Dettagliata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedLotId?.toString() || ''} 
                  onValueChange={(value) => setSelectedLotId(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona un lotto per vedere le statistiche dettagliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLots?.map((lot: any) => (
                      <SelectItem key={lot.id} value={lot.id.toString()}>
                        {lot.supplierLotNumber} - {lot.supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Statistiche Lotto Selezionato */}
            {selectedLotId && lotStats && (
              <>
                {/* Bilancio Attuale */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Bilancio Attuale - {lotStats.lot.supplierLotNumber}
                    </CardTitle>
                    <CardDescription>
                      {lotStats.lot.name} • {lotStats.lot.supplier} • 
                      Aggiornato {format(new Date(lotStats.metadata.calculatedAt), 'dd/MM/yyyy HH:mm')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          +{formatQuantity(lotStats.totals.totalInflow)}
                        </div>
                        <p className="text-sm text-muted-foreground">Totale Ingressi</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">
                          -{formatQuantity(lotStats.totals.totalOutflow)}
                        </div>
                        <p className="text-sm text-muted-foreground">Totale Uscite</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${lotStats.currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {lotStats.currentBalance >= 0 ? '+' : ''}{formatQuantity(lotStats.currentBalance)}
                        </div>
                        <p className="text-sm text-muted-foreground">Bilancio Netto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metriche Performance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tasso Sopravvivenza</p>
                          <p className="text-2xl font-bold text-green-600">{formatPercentage(lotStats.percentages.survival)}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                      <Progress value={lotStats.percentages.survival} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Venduto</p>
                          <p className="text-2xl font-bold text-blue-600">{formatPercentage(lotStats.percentages.sold)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500" />
                      </div>
                      <Progress value={lotStats.percentages.sold} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Trasferito</p>
                          <p className="text-2xl font-bold text-orange-600">{formatPercentage(lotStats.percentages.transferred)}</p>
                        </div>
                        <ArrowUpRight className="w-8 h-8 text-orange-500" />
                      </div>
                      <Progress value={lotStats.percentages.transferred} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mortalità</p>
                          <p className="text-2xl font-bold text-red-600">{formatPercentage(lotStats.percentages.mortality)}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <Progress value={lotStats.percentages.mortality} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Grafici Dettagliati */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuzione Movimenti</CardTitle>
                      <CardDescription>Quantità per tipo di movimento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(lotStats.stats).map(([type, quantity]) => ({
                            type: MOVEMENT_LABELS[type as keyof typeof MOVEMENT_LABELS] || type,
                            quantity,
                            originalType: type
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="type" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatQuantity(Number(value))} />
                            <Bar dataKey="quantity">
                              {Object.entries(MOVEMENT_COLORS).map(([type, color]) => (
                                <Cell key={type} fill={color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline Lotto</CardTitle>
                      <CardDescription>Cronologia movimenti recenti</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {lotStats.recentMovements.map((movement: LotLedgerEntry) => (
                          <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge 
                                style={{ backgroundColor: MOVEMENT_COLORS[movement.type], color: 'white' }}
                              >
                                {MOVEMENT_LABELS[movement.type]}
                              </Badge>
                              <div>
                                <p className="font-medium">{formatQuantity(movement.quantity)} animali</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(movement.date), 'dd/MM/yyyy')}
                                </p>
                              </div>
                            </div>
                            {movement.notes && (
                              <p className="text-sm text-muted-foreground max-w-48 truncate">
                                {movement.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Riepilogo per Tipo */}
                <Card>
                  <CardHeader>
                    <CardTitle>Riepilogo Dettagliato per Tipo</CardTitle>
                    <CardDescription>Statistiche aggregate per ogni tipo di movimento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Tipo Movimento</th>
                            <th className="text-right p-2">Quantità Totale</th>
                            <th className="text-right p-2">Numero Movimenti</th>
                            <th className="text-left p-2">Primo Movimento</th>
                            <th className="text-left p-2">Ultimo Movimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotStats.summaryByType.map((summary) => (
                            <tr key={summary.type} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-2">
                                <Badge 
                                  style={{ backgroundColor: MOVEMENT_COLORS[summary.type as keyof typeof MOVEMENT_COLORS], color: 'white' }}
                                >
                                  {MOVEMENT_LABELS[summary.type as keyof typeof MOVEMENT_LABELS] || summary.type}
                                </Badge>
                              </td>
                              <td className="p-2 text-right font-mono">{formatQuantity(summary.totalQuantity)}</td>
                              <td className="p-2 text-right">{summary.movementCount}</td>
                              <td className="p-2">{format(new Date(summary.earliestDate), 'dd/MM/yyyy')}</td>
                              <td className="p-2">{format(new Date(summary.latestDate), 'dd/MM/yyyy')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedLotId && !lotStats && !lotStatsLoading && (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessun Dato Disponibile</h3>
                  <p className="text-muted-foreground">
                    Il lotto selezionato non ha ancora movimenti nel lot ledger.
                  </p>
                </CardContent>
              </Card>
            )}

            {!selectedLotId && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Seleziona un Lotto</h3>
                  <p className="text-muted-foreground">
                    Scegli un lotto dal menu sopra per visualizzare le statistiche dettagliate.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}