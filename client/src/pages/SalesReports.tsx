import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SalesOperation {
  id: number;
  date: string;
  type: string;
  basketId: number;
  cycleId: number;
  animalCount: number;
  totalWeight: number;
  animalsPerKg: number;
  notes: string;
  basketPhysicalNumber: number;
  flupsyName: string;
  lotSupplier: string;
}

interface SalesStats {
  totalSales: number;
  totalAnimals: number;
  totalWeight: number;
  averagePrice: number;
  operations: SalesOperation[];
}

export default function SalesReports() {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  // Query per ottenere i dati delle vendite
  const { data: salesData, isLoading, refetch } = useQuery<SalesStats>({
    queryKey: ['/api/reports/sales', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/reports/sales?from=${format(dateFrom, 'yyyy-MM-dd')}&to=${format(dateTo, 'yyyy-MM-dd')}`
      );
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
  });

  // Funzione per esportare in CSV
  const exportToCsv = () => {
    if (!salesData?.operations?.length) return;

    const headers = [
      'Data',
      'Tipo',
      'Cestello',
      'FLUPSY',
      'Fornitore',
      'Animali',
      'Peso (kg)',
      'Animali/kg',
      'Note'
    ];

    const csvContent = [
      headers.join(','),
      ...salesData.operations.map(op =>
        [
          op.date,
          op.type,
          op.basketPhysicalNumber,
          `"${op.flupsyName}"`,
          `"${op.lotSupplier}"`,
          op.animalCount,
          op.totalWeight,
          op.animalsPerKg,
          `"${op.notes || ''}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendite_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Preset rapidi per le date
  const quickDatePresets = [
    {
      label: "Questo mese",
      action: () => {
        setDateFrom(startOfMonth(new Date()));
        setDateTo(endOfMonth(new Date()));
      }
    },
    {
      label: "Mese scorso",
      action: () => {
        const lastMonth = subMonths(new Date(), 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
      }
    },
    {
      label: "Ultimi 3 mesi",
      action: () => {
        setDateFrom(startOfMonth(subMonths(new Date(), 2)));
        setDateTo(endOfMonth(new Date()));
      }
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapporti Vendite</h1>
          <p className="text-muted-foreground">
            Analisi delle vendite e operazioni commerciali
          </p>
        </div>
        <Button onClick={exportToCsv} disabled={!salesData?.operations?.length}>
          <Download className="w-4 h-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Filtri data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri Periodo</CardTitle>
          <CardDescription>
            Seleziona il periodo per visualizzare i rapporti vendite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
              
              <span className="self-center">-</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex gap-2">
              {quickDatePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={preset.action}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche generali */}
      {salesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Operazioni</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesData.totalSales}</div>
              <p className="text-xs text-muted-foreground">
                operazioni di vendita nel periodo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Animali Venduti</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData.totalAnimals.toLocaleString('it-IT')}
              </div>
              <p className="text-xs text-muted-foreground">
                totale capi venduti
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peso Totale</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData.totalWeight.toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground">
                peso complessivo venduto
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Animali/kg</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData.averagePrice.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                media ponderata del periodo
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabella operazioni */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Operazioni di Vendita</CardTitle>
          <CardDescription>
            {salesData ? 
              `${salesData.operations.length} operazioni trovate nel periodo selezionato` :
              'Caricamento dati...'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Caricamento dati vendite...</div>
          ) : !salesData?.operations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna vendita trovata nel periodo selezionato
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Cestello</th>
                    <th className="text-left p-2">FLUPSY</th>
                    <th className="text-left p-2">Fornitore</th>
                    <th className="text-right p-2">Animali</th>
                    <th className="text-right p-2">Peso (kg)</th>
                    <th className="text-right p-2">Animali/kg</th>
                    <th className="text-left p-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.operations.map((operation) => (
                    <tr key={operation.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {format(new Date(operation.date), "dd/MM/yyyy", { locale: it })}
                      </td>
                      <td className="p-2">
                        <Badge variant={operation.type === 'vendita' ? 'default' : 'secondary'}>
                          {operation.type}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono">#{operation.basketPhysicalNumber}</td>
                      <td className="p-2">{operation.flupsyName}</td>
                      <td className="p-2">{operation.lotSupplier}</td>
                      <td className="p-2 text-right font-mono">
                        {operation.animalCount.toLocaleString('it-IT')}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {operation.totalWeight.toFixed(1)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {operation.animalsPerKg.toFixed(0)}
                      </td>
                      <td className="p-2 max-w-[200px] truncate" title={operation.notes}>
                        {operation.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}