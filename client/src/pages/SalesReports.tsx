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
import { RefreshCw, Download, Database, Users, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function SalesReports() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  // Query per lo stato della sincronizzazione
  const { data: syncStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/sync/status'],
  });

  // Query per i clienti
  const { data: customersData } = useQuery({
    queryKey: ['/api/sync/customers'],
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

  // Funzione per sincronizzare i dati
  const handleSync = async () => {
    try {
      const response = await fetch('/api/sync/external-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (result.success) {
        refetchStatus();
        refetchSales();
        alert('Sincronizzazione completata con successo!');
      } else {
        alert('Errore durante la sincronizzazione: ' + result.message);
      }
    } catch (error) {
      alert('Errore di connessione durante la sincronizzazione');
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
        <Button onClick={handleSync} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Sincronizza Dati
        </Button>
      </div>

      {/* Stato Sincronizzazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Stato Sincronizzazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_customers_sync')?.recordCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Clienti Sincronizzati</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_sales_sync')?.recordCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Vendite Sincronizzate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(syncStatus as any)?.status?.find((s: any) => s.tableName === 'external_sales_sync')?.lastSync 
                  ? format(new Date((syncStatus as any).status.find((s: any) => s.tableName === 'external_sales_sync').lastSync), 'dd/MM/yyyy HH:mm', { locale: it })
                  : 'Mai'
                }
              </div>
              <div className="text-sm text-muted-foreground">Ultima Sincronizzazione</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Vendite</TabsTrigger>
          <TabsTrigger value="customers">Clienti</TabsTrigger>
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

          {/* Tabella Vendite */}
          <Card>
            <CardHeader>
              <CardTitle>Elenco Vendite</CardTitle>
              <CardDescription>
                {(salesData as any)?.sales?.length || 0} vendite trovate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Quantità</TableHead>
                      <TableHead className="text-right">Prezzo Unit.</TableHead>
                      <TableHead className="text-right">Totale</TableHead>
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
                          <div>
                            <div className="font-medium">{sale.productName}</div>
                            {sale.productCode && (
                              <div className="text-sm text-muted-foreground">
                                {sale.productCode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {formatQuantity(sale.quantity)} {sale.unitOfMeasure}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.unitPrice ? formatCurrency(sale.unitPrice) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clienti Sincronizzati
              </CardTitle>
              <CardDescription>
                {(customersData as any)?.customers?.length || 0} clienti nel database
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
                    {(customersData as any)?.customers?.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.customerName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {customer.customerType || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.city || 'N/A'}</TableCell>
                        <TableCell>{customer.province || 'N/A'}</TableCell>
                        <TableCell>{customer.vatNumber || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={customer.isActive ? "default" : "destructive"}>
                            {customer.isActive ? "Attivo" : "Inattivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendite Totali</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(salesData as any)?.sales?.length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    (salesData as any)?.sales?.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0) || 0
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quantità Totale</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatQuantity(
                    (salesData as any)?.sales?.reduce((sum: number, sale: any) => sum + (sale.quantity || 0), 0) || 0
                  )} kg
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(customersData as any)?.customers?.filter((c: any) => c.isActive).length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}