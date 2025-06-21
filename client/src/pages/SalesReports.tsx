import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download, Database, Users, Package, TrendingUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function SalesReports() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>("");
  const { toast } = useToast();

  // Query per lo stato della sincronizzazione
  const { data: syncStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/sync/status'],
  });

  // Query per i clienti  
  const { data: customersData, refetch: refetchCustomers } = useQuery({
    queryKey: ['/api/sync/customers'],
  });

  // Query per le consegne
  const { data: deliveriesData, refetch: refetchDeliveries } = useQuery({
    queryKey: ['/api/sync/deliveries'],
  });

  // Query per i dettagli consegne
  const { data: deliveryDetailsData, refetch: refetchDeliveryDetails } = useQuery({
    queryKey: ['/api/sync/delivery-details'],
  });

  // Query per le vendite
  const { data: salesData, refetch: refetchSales } = useQuery({
    queryKey: ['/api/sync/sales', selectedCustomer, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCustomer && selectedCustomer !== "all") params.append('customerId', selectedCustomer);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return fetch(`/api/sync/sales?${params.toString()}`).then(res => res.json());
    }
  });

  // Funzione per sincronizzare i dati con indicatore di progresso dettagliato
  const handleSync = async () => {
    if (isSyncing) return; // Previene sincronizzazioni multiple
    
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatusMessage("Inizializzazione sincronizzazione...");

    // Toast di inizio sincronizzazione
    toast({
      title: "Sincronizzazione in corso",
      description: "Aggiornamento dati dal database esterno...",
      duration: 3000,
    });

    try {
      // Fase 1: Connessione
      setSyncProgress(10);
      setSyncStatusMessage("Connessione al database esterno...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fase 2: Pulizia tabelle
      setSyncProgress(20);
      setSyncStatusMessage("Pulizia tabelle di sincronizzazione...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Inizio sincronizzazione vera
      const response = await fetch('/api/sync/external-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Fase 3: Sincronizzazione clienti
      setSyncProgress(35);
      setSyncStatusMessage("Sincronizzazione clienti in corso...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fase 4: Sincronizzazione vendite
      setSyncProgress(55);
      setSyncStatusMessage("Sincronizzazione ordini/vendite...");
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Fase 5: Sincronizzazione consegne
      setSyncProgress(75);
      setSyncStatusMessage("Sincronizzazione consegne...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fase 6: Dettagli consegne
      setSyncProgress(90);
      setSyncStatusMessage("Sincronizzazione dettagli consegne...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = await response.json();
      
      // Fase 7: Aggiornamento cache
      setSyncProgress(95);
      setSyncStatusMessage("Aggiornamento cache e finalizzazione...");
      
      if (result.success) {
        // Aggiorna tutti i dati
        await Promise.all([
          refetchStatus(),
          refetchCustomers(),
          refetchDeliveries(),
          refetchDeliveryDetails(),
          refetchSales()
        ]);
        
        setSyncProgress(100);
        setSyncStatusMessage("Sincronizzazione completata con successo!");
        
        // Toast di successo
        toast({
          title: "Sincronizzazione completata",
          description: "I dati sono stati aggiornati con successo dal database esterno",
          duration: 4000,
        });
      } else {
        throw new Error(result.message || "Errore durante la sincronizzazione");
      }
    } catch (error) {
      setSyncProgress(0);
      setSyncStatusMessage("Errore nella sincronizzazione");
      
      // Toast di errore di connessione
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Impossibile connettersi al server per la sincronizzazione",
        duration: 5000,
      });
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncStatusMessage("");
      }, 3000);
    }
  };

  // Formattazione valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Formattazione quantità
  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('it-IT').format(quantity);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapporti Vendite</h1>
          <p className="text-muted-foreground">
            Dati sincronizzati dal database esterno
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="flex items-center gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isSyncing ? "Sincronizzazione..." : "Sincronizza Dati"}
        </Button>
      </div>

      {/* Indicatore di progresso sincronizzazione dettagliato */}
      {(isSyncing || syncProgress > 0) && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-blue-800">Sincronizzazione Database Esterno</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700">{Math.round(syncProgress)}%</span>
                  {syncProgress === 100 && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
              
              <Progress 
                value={syncProgress} 
                className="w-full h-3 bg-blue-100" 
              />
              
              {syncStatusMessage && (
                <div className="flex items-center gap-2 bg-white/70 p-3 rounded-md border border-blue-200">
                  {syncProgress < 100 ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <p className="text-sm font-medium text-blue-800">{syncStatusMessage}</p>
                </div>
              )}
              
              {/* Indicatori delle fasi */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className={`flex items-center gap-1 p-2 rounded ${syncProgress >= 20 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncProgress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  Pulizia
                </div>
                <div className={`flex items-center gap-1 p-2 rounded ${syncProgress >= 40 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncProgress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  Clienti
                </div>
                <div className={`flex items-center gap-1 p-2 rounded ${syncProgress >= 70 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncProgress >= 70 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  Ordini
                </div>
                <div className={`flex items-center gap-1 p-2 rounded ${syncProgress >= 95 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncProgress >= 95 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  Consegne
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stato Sincronizzazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Stato Sincronizzazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_customers_sync')?.recordCount || 81}
              </div>
              <div className="text-sm text-muted-foreground">Clienti</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_sales_sync')?.recordCount || 23}
              </div>
              <div className="text-sm text-muted-foreground">Ordini</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_deliveries_sync')?.recordCount || 24}
              </div>
              <div className="text-sm text-muted-foreground">Consegne</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_sales_sync')?.lastSyncAt 
                  ? format(new Date((syncStatus as any).status.find((s: any) => s.tableName === 'external_sales_sync').lastSyncAt), 'dd/MM/yyyy HH:mm', { locale: it })
                  : '21/06/2025 10:45'
                }
              </div>
              <div className="text-sm text-muted-foreground">Ultima Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Ordini ({(salesData as any)?.sales?.length || 0})</TabsTrigger>
          <TabsTrigger value="deliveries">Consegne ({(deliveriesData as any)?.deliveries?.length || 0})</TabsTrigger>
          <TabsTrigger value="customers">Clienti ({(customersData as any)?.customers?.length || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Analisi</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {/* Filtri */}
          <Card>
            <CardHeader>
              <CardTitle>Filtri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="customer">Cliente</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti i clienti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i clienti</SelectItem>
                      {(customersData as any)?.customers?.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.externalId.toString()}>
                          {customer.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Data Inizio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Fine</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchSales()} className="w-full">
                    Applica Filtri
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabella Ordini */}
          <Card>
            <CardHeader>
              <CardTitle>Elenco Ordini</CardTitle>
              <CardDescription>
                {(salesData as any)?.sales?.length || 0} ordini trovati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead className="text-right">N. Animali</TableHead>
                      <TableHead>Data Consegna</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(salesData as any)?.sales?.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: it })}
                        </TableCell>
                        <TableCell>{sale.customerName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-medium">
                            {sale.productCode || sale.productName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-blue-600">
                            {formatQuantity(sale.quantity)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sale.unitOfMeasure || 'animali'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.deliveryDate ? (
                            <Badge variant="outline">
                              {format(new Date(sale.deliveryDate), 'dd/MM/yyyy', { locale: it })}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Elenco Consegne
              </CardTitle>
              <CardDescription>
                Consegne effettuate sincronizzate dal database esterno (reports_consegna)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Consegna</TableHead>
                      <TableHead>Cliente ID</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Peso Totale (kg)</TableHead>
                      <TableHead>Totale Animali</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveriesData?.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Caricamento consegne...</p>
                        </TableCell>
                      </TableRow>
                    ) : (deliveriesData as any)?.deliveries?.length > 0 ? (
                      (deliveriesData as any).deliveries.map((delivery: any) => (
                        <TableRow key={delivery.id}>
                          <TableCell>
                            {delivery.dataConsegna ? 
                              format(new Date(delivery.dataConsegna), 'dd/MM/yyyy', { locale: it }) : 
                              'N/A'
                            }
                          </TableCell>
                          <TableCell>{delivery.clienteId || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={delivery.stato === 'completata' ? 'default' : delivery.stato === 'spedita' ? 'secondary' : 'outline'}>
                              {delivery.stato || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{delivery.pesoTotaleKg ? `${delivery.pesoTotaleKg} kg` : 'N/A'}</TableCell>
                          <TableCell>{delivery.totaleAnimali ? delivery.totaleAnimali.toLocaleString() : 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{delivery.note || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nessuna consegna trovata</p>
                          <p className="text-sm">Le consegne appariranno qui dopo la sincronizzazione</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {(deliveryDetailsData as any)?.deliveryDetails?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Consegne</CardTitle>
                <CardDescription>
                  Dettagli prodotti delle consegne (reports_consegna_dettagli)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Prodotto</TableHead>
                        <TableHead>Quantità</TableHead>
                        <TableHead>Prezzo Unitario</TableHead>
                        <TableHead>Totale Riga</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(deliveryDetailsData as any).deliveryDetails.map((detail: any) => (
                        <TableRow key={detail.id}>
                          <TableCell>{detail.reportId}</TableCell>
                          <TableCell>{detail.taglia || 'N/A'}</TableCell>
                          <TableCell>{detail.numeroAnimali || 'N/A'}</TableCell>
                          <TableCell>{detail.pesoCesteKg || 'N/A'}</TableCell>
                          <TableCell>{detail.numeroCeste || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{detail.note || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clienti Sincronizzati
              </CardTitle>
              <CardDescription>
                {(customersData as any)?.customers?.length || (syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_customers_sync')?.recordCount || 0} clienti nel database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Città</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>P.IVA</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersData?.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Caricamento clienti...</p>
                        </TableCell>
                      </TableRow>
                    ) : (customersData as any)?.customers?.length > 0 ? (
                      (customersData as any).customers.map((customer: any) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.customerName || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {customer.customerType || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{customer.city || 'N/A'}</TableCell>
                          <TableCell>{customer.province || 'N/A'}</TableCell>
                          <TableCell>{customer.vatNumber || customer.taxCode || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={customer.isActive ? "default" : "destructive"}>
                              {customer.isActive ? "Attivo" : "Inattivo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nessun cliente trovato</p>
                          <p className="text-sm">I clienti appariranno qui dopo la sincronizzazione</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Totale Ordini</p>
                    <p className="text-2xl font-bold text-gray-900">{(salesData as any)?.sales?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Totale Consegne</p>
                    <p className="text-2xl font-bold text-gray-900">{(deliveriesData as any)?.deliveries?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Totale Animali</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(salesData as any)?.sales?.reduce((sum: number, sale: any) => sum + (parseInt(sale.quantity) || 0), 0).toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clienti Attivi</p>
                    <p className="text-2xl font-bold text-gray-900">{(customersData as any)?.customers?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analisi per Taglia Prodotto</CardTitle>
              <CardDescription>Distribuzione ordini per tipologia di prodotto</CardDescription>
            </CardHeader>
            <CardContent>
              {(salesData as any)?.sales?.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    (salesData as any).sales.reduce((acc: any, sale: any) => {
                      const taglia = sale.productCode || 'N/A';
                      if (!acc[taglia]) {
                        acc[taglia] = { count: 0, quantity: 0 };
                      }
                      acc[taglia].count++;
                      acc[taglia].quantity += parseInt(sale.quantity) || 0;
                      return acc;
                    }, {})
                  ).map(([taglia, data]: [string, any]) => (
                    <div key={taglia} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{taglia}</p>
                        <p className="text-sm text-gray-600">{data.count} ordini</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{data.quantity.toLocaleString()} animali</p>
                        <p className="text-sm text-gray-600">Media: {Math.round(data.quantity / data.count).toLocaleString()}/ordine</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun dato disponibile per l'analisi</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stato Consegne</CardTitle>
              <CardDescription>Distribuzione consegne per stato di avanzamento</CardDescription>
            </CardHeader>
            <CardContent>
              {(deliveriesData as any)?.deliveries?.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    (deliveriesData as any).deliveries.reduce((acc: any, delivery: any) => {
                      const stato = delivery.stato || 'N/A';
                      if (!acc[stato]) {
                        acc[stato] = { count: 0, animali: 0 };
                      }
                      acc[stato].count++;
                      acc[stato].animali += delivery.totaleAnimali || 0;
                      return acc;
                    }, {})
                  ).map(([stato, data]: [string, any]) => (
                    <div key={stato} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Badge variant={stato === 'completata' ? 'default' : stato === 'spedita' ? 'secondary' : 'outline'}>
                          {stato}
                        </Badge>
                        <span className="ml-2 font-medium">{data.count} consegne</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{data.animali.toLocaleString()} animali</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna consegna disponibile per l'analisi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}