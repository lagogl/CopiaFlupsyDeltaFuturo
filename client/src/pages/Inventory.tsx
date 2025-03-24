import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumberWithCommas, TARGET_SIZES, getTargetSizeForWeight } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Interfaccia per i dati di inventario aggregati per taglia
interface SizeInventory {
  sizeCode: string;
  sizeName: string;
  color: string;
  count: number;
  totalAnimals: number;
  averageAnimalsPerKg: number;
  averageWeight: number;
}

export default function Inventory() {
  // Stato per le statistiche di inventario
  const [inventoryStats, setInventoryStats] = useState<{
    totalBaskets: number;
    totalAnimals: number;
    averageWeight: number;
    sizeDistribution: SizeInventory[];
  }>({
    totalBaskets: 0,
    totalAnimals: 0,
    averageWeight: 0,
    sizeDistribution: [],
  });

  // Carica dati necessari
  const { data: baskets, isLoading: loadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: operations, isLoading: loadingOperations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: sizes, isLoading: loadingSizes } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Calcola le statistiche di inventario quando i dati sono disponibili
  useEffect(() => {
    if (baskets && operations && sizes) {
      calculateInventoryStats();
    }
  }, [baskets, operations, sizes]);

  // Funzione per calcolare le statistiche di inventario
  const calculateInventoryStats = () => {
    if (!baskets || !operations || !sizes) return;
    
    // Filtra solo le ceste attive con un ciclo
    const activeBaskets = (baskets as any[]).filter((basket: any) => 
      basket.state === 'active' && basket.currentCycleId !== null
    );

    // Prepara un map per le dimensioni
    const sizeMap = new Map();
    (sizes as any[]).forEach((size: any) => {
      sizeMap.set(size.id, size);
    });

    // Prepara la struttura per la distribuzione delle taglie
    const sizeDistribution: Record<string, SizeInventory> = {};
    
    // Inizializza con tutte le taglie possibili
    TARGET_SIZES.forEach(targetSize => {
      sizeDistribution[targetSize.code] = {
        sizeCode: targetSize.code,
        sizeName: targetSize.name,
        color: targetSize.color,
        count: 0,
        totalAnimals: 0,
        averageAnimalsPerKg: 0,
        averageWeight: 0,
      };
    });

    let totalAnimals = 0;
    let totalWeight = 0;
    let validBasketCount = 0;

    // Calcola statistiche per ogni cesta
    activeBaskets.forEach((basket: any) => {
      // Trova l'ultima operazione di questa cesta
      const basketOperations = (operations as any[])
        .filter((op: any) => op.basketId === basket.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (basketOperations.length === 0) return;
      
      const lastOperation = basketOperations[0];
      if (!lastOperation.animalsPerKg) return;

      // Calcola il peso medio
      const averageWeight = lastOperation.averageWeight || (1000 / lastOperation.animalsPerKg);
      
      // Determina la taglia in base al peso
      const targetSize = getTargetSizeForWeight(averageWeight);
      if (!targetSize) return;
      
      // Calcola il numero totale di animali nella cesta
      const animalCount = lastOperation.animalCount || 0;
      
      // Aggiorna la distribuzione delle taglie
      if (sizeDistribution[targetSize.code]) {
        sizeDistribution[targetSize.code].count++;
        sizeDistribution[targetSize.code].totalAnimals += animalCount;
        sizeDistribution[targetSize.code].averageAnimalsPerKg += lastOperation.animalsPerKg;
        sizeDistribution[targetSize.code].averageWeight += averageWeight;
      }
      
      totalAnimals += animalCount;
      totalWeight += averageWeight;
      validBasketCount++;
    });

    // Calcola medie per ogni taglia
    Object.values(sizeDistribution).forEach(size => {
      if (size.count > 0) {
        size.averageAnimalsPerKg = size.averageAnimalsPerKg / size.count;
        size.averageWeight = size.averageWeight / size.count;
      }
    });

    // Filtra solo le taglie con conteggio > 0 e converti in array
    const filteredSizeDistribution = Object.values(sizeDistribution)
      .filter(size => size.count > 0)
      .sort((a, b) => {
        // Ordina per codice taglia (assumendo che il formato sia T1, T2, ecc.)
        const aCode = parseInt(a.sizeCode.replace('T', ''));
        const bCode = parseInt(b.sizeCode.replace('T', ''));
        return aCode - bCode;
      });

    setInventoryStats({
      totalBaskets: validBasketCount,
      totalAnimals,
      averageWeight: validBasketCount > 0 ? totalWeight / validBasketCount : 0,
      sizeDistribution: filteredSizeDistribution,
    });
  };

  // Prepara i dati per i grafici
  const pieChartData = inventoryStats.sizeDistribution.map(size => ({
    name: size.sizeCode,
    value: size.count,
    color: size.color,
  }));

  const barChartData = inventoryStats.sizeDistribution.map(size => ({
    name: size.sizeCode,
    Ceste: size.count,
    Animali: size.totalAnimals,
    "Peso medio (mg)": size.averageWeight,
  }));

  // Funzione per formattare numeri in stile europeo (con virgola come decimale)
  const formatNumberEU = (value: number): string => {
    return value.toLocaleString('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Funzione per formattare numeri decimali in stile europeo
  const formatDecimalEU = (value: number): string => {
    return value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      <Helmet>
        <title>Inventario Giacenze</title>
      </Helmet>

      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Inventario Giacenze</h1>
        <p className="text-muted-foreground">
          Panoramica completa delle giacenze attuali, suddivise per taglie.
        </p>

        {loadingBaskets || loadingOperations || loadingSizes ? (
          <div className="flex items-center justify-center h-40">
            <p>Caricamento dati in corso...</p>
          </div>
        ) : (
          <>
            {/* Statistiche di riepilogo */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ceste Attive</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatNumberEU(inventoryStats.totalBaskets)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Animali Totali</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatNumberEU(inventoryStats.totalAnimals)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Peso Medio (mg)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatDecimalEU(inventoryStats.averageWeight)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grafici e Tabelle */}
            <Tabs defaultValue="charts">
              <TabsList>
                <TabsTrigger value="charts">Grafici</TabsTrigger>
                <TabsTrigger value="details">Dettagli</TabsTrigger>
              </TabsList>
              
              <TabsContent value="charts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuzione delle Ceste per Taglia</CardTitle>
                    <CardDescription>
                      Visualizzazione della distribuzione del numero di ceste per ogni taglia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row items-center justify-center h-80 gap-8">
                      {/* Grafico a torta */}
                      <div className="w-full md:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius="70%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [formatNumberEU(Number(value)), 'Ceste']}
                              contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Grafico a barre */}
                      <div className="w-full md:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip 
                              formatter={(value) => [formatNumberEU(Number(value)), '']}
                              contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="Ceste" fill="#8884d8" />
                            <Bar yAxisId="right" dataKey="Animali" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Peso Medio per Taglia</CardTitle>
                    <CardDescription>
                      Visualizzazione del peso medio degli animali per ogni taglia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => [formatDecimalEU(Number(value)), 'mg']}
                            contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                          />
                          <Legend />
                          <Bar dataKey="Peso medio (mg)" fill="#f59e0b">
                            {barChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={inventoryStats.sizeDistribution[index]?.color || '#f59e0b'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Dettaglio Giacenze per Taglia</CardTitle>
                    <CardDescription>
                      Panoramica dettagliata delle giacenze suddivise per taglia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Taglia</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="text-right">Ceste</TableHead>
                          <TableHead className="text-right">Animali Totali</TableHead>
                          <TableHead className="text-right">Animali/Kg (Media)</TableHead>
                          <TableHead className="text-right">Peso Medio (mg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryStats.sizeDistribution.map((size) => (
                          <TableRow key={size.sizeCode}>
                            <TableCell>
                              <Badge
                                style={{ 
                                  backgroundColor: size.color,
                                  color: parseInt(size.sizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                                }}
                              >
                                {size.sizeCode}
                              </Badge>
                            </TableCell>
                            <TableCell>{size.sizeName}</TableCell>
                            <TableCell className="text-right font-medium">{formatNumberEU(size.count)}</TableCell>
                            <TableCell className="text-right">{formatNumberEU(size.totalAnimals)}</TableCell>
                            <TableCell className="text-right">{formatNumberEU(size.averageAnimalsPerKg)}</TableCell>
                            <TableCell className="text-right">{formatDecimalEU(size.averageWeight)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {inventoryStats.sizeDistribution.length === 0 && (
                      <div className="py-6 text-center text-muted-foreground">
                        Nessun dato disponibile
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}