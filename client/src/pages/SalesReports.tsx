import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Calendar,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BarChart3,
  PieChart,
  TrendingDown
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';

interface SalesSummary {
  totalSales: number;
  totalRevenue: string;
  totalCustomers: number;
  averageOrderValue: string;
  topProduct: string;
  bestCustomer: string;
  period: string;
}

interface ProductSale {
  productName: string;
  productCode: string;
  totalQuantity: string;
  totalRevenue: string;
  orderCount: number;
  averagePrice: string;
}

interface CustomerSale {
  customerName: string;
  customerCode: string;
  totalOrders: number;
  totalRevenue: string;
  lastOrderDate: string;
  averageOrderValue: string;
}

interface MonthlySale {
  month: string;
  year: number;
  totalSales: number;
  totalRevenue: string;
  uniqueCustomers: number;
}

interface SyncStatus {
  tableName: string;
  lastSyncAt: string | null;
  lastSyncSuccess: boolean;
  syncInProgress: boolean;
  recordCount: number;
  errorMessage: string | null;
}

export default function SalesReports() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Query per lo stato di sincronizzazione
  const { data: syncStatus, isLoading: syncLoading } = useQuery({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000 // Aggiorna ogni 30 secondi
  });

  // Query per il riepilogo vendite
  const { data: salesSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/reports/sales/summary', dateRange.startDate, dateRange.endDate],
    enabled: !!dateRange.startDate && !!dateRange.endDate
  });

  // Query per vendite per prodotto
  const { data: productReports, isLoading: productLoading } = useQuery({
    queryKey: ['/api/reports/sales/by-product', dateRange.startDate, dateRange.endDate],
    enabled: !!dateRange.startDate && !!dateRange.endDate
  });

  // Query per vendite per cliente
  const { data: customerReports, isLoading: customerLoading } = useQuery({
    queryKey: ['/api/reports/sales/by-customer', dateRange.startDate, dateRange.endDate],
    enabled: !!dateRange.startDate && !!dateRange.endDate
  });

  // Query per report mensili
  const { data: monthlyReports, isLoading: monthlyLoading } = useQuery({
    queryKey: ['/api/reports/sales/monthly', selectedYear]
  });

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const setQuickRange = (days: number) => {
    setDateRange({
      startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const setCurrentMonth = () => {
    const now = new Date();
    setDateRange({
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd')
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const formatNumber = (num: string | number) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('it-IT').format(value);
  };

  const getSyncStatusBadge = (status: SyncStatus) => {
    if (status.syncInProgress) {
      return <Badge variant="outline" className="bg-blue-50"><Loader2 className="w-3 h-3 mr-1 animate-spin" />In corso</Badge>;
    }
    if (status.lastSyncSuccess) {
      return <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" />Sincronizzato</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Errore</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report di Vendita</h1>
          <p className="text-muted-foreground">
            Analisi delle vendite sincronizzate dal database esterno
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Dati esterni</span>
        </div>
      </div>

      {/* Stato di Sincronizzazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Stato Sincronizzazione
          </CardTitle>
          <CardDescription>
            Monitoraggio della sincronizzazione con il database esterno
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Caricamento stato...</span>
            </div>
          ) : syncStatus?.status ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {syncStatus.status.map((status: SyncStatus) => (
                <div key={status.tableName} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {status.tableName === 'external_customers_sync' ? 'Clienti' : 'Vendite'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {status.recordCount} record
                      {status.lastSyncAt && ` • ${format(new Date(status.lastSyncAt), 'dd MMM yyyy HH:mm', { locale: it })}`}
                    </span>
                  </div>
                  {getSyncStatusBadge(status)}
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sincronizzazione non configurata</AlertTitle>
              <AlertDescription>
                Il sistema di sincronizzazione non è ancora configurato. 
                Contattare l'amministratore per configurare la connessione al database esterno.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filtri Data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="startDate">Data Inizio</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="endDate">Data Fine</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQuickRange(7)}>7 giorni</Button>
              <Button variant="outline" onClick={() => setQuickRange(30)}>30 giorni</Button>
              <Button variant="outline" onClick={setCurrentMonth}>Mese corrente</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Riepilogo</TabsTrigger>
          <TabsTrigger value="products">Per Prodotto</TabsTrigger>
          <TabsTrigger value="customers">Per Cliente</TabsTrigger>
          <TabsTrigger value="monthly">Andamento Mensile</TabsTrigger>
        </TabsList>

        {/* Riepilogo */}
        <TabsContent value="summary" className="space-y-6">
          {summaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Caricamento riepilogo...</span>
            </div>
          ) : salesSummary?.summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendite Totali</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesSummary.summary.totalSales}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fatturato Totale</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(salesSummary.summary.totalRevenue)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesSummary.summary.totalCustomers}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valore Medio Ordine</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(salesSummary.summary.averageOrderValue)}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nessun dato disponibile</AlertTitle>
              <AlertDescription>
                Non sono disponibili dati di vendita per il periodo selezionato.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Vendite per Prodotto */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Vendite per Prodotto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Caricamento dati prodotti...</span>
                </div>
              ) : productReports?.reports?.length > 0 ? (
                <div className="space-y-4">
                  {productReports.reports.map((product: ProductSale, index: number) => (
                    <div key={product.productCode} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.productName}</h4>
                        <p className="text-sm text-muted-foreground">Codice: {product.productCode}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-bold">{formatCurrency(product.totalRevenue)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatNumber(product.totalQuantity)} kg • {product.orderCount} ordini
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nessun dato prodotto disponibile per il periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendite per Cliente */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Vendite per Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Caricamento dati clienti...</span>
                </div>
              ) : customerReports?.reports?.length > 0 ? (
                <div className="space-y-4">
                  {customerReports.reports.map((customer: CustomerSale, index: number) => (
                    <div key={customer.customerCode} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{customer.customerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {customer.totalOrders} ordini • Ultimo: {format(new Date(customer.lastOrderDate), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-bold">{formatCurrency(customer.totalRevenue)}</div>
                        <div className="text-sm text-muted-foreground">
                          Medio: {formatCurrency(customer.averageOrderValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nessun dato cliente disponibile per il periodo selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Andamento Mensile */}
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Andamento Mensile {selectedYear}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="year">Anno:</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Caricamento dati mensili...</span>
                </div>
              ) : monthlyReports?.reports?.length > 0 ? (
                <div className="space-y-4">
                  {monthlyReports.reports.map((month: MonthlySale, index: number) => (
                    <div key={`${month.year}-${month.month}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{month.month} {month.year}</h4>
                        <p className="text-sm text-muted-foreground">
                          {month.uniqueCustomers} clienti attivi
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-bold">{formatCurrency(month.totalRevenue)}</div>
                        <div className="text-sm text-muted-foreground">
                          {month.totalSales} vendite
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nessun dato mensile disponibile per l'anno {selectedYear}.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}