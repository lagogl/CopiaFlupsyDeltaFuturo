import React from "react";
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";

interface SizeInventory {
  sizeCode: string;
  sizeName: string;
  color: string;
  count: number;
  totalAnimals: number;
  averageAnimalsPerKg: number;
  averageWeight: number;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
}

interface InventorySummaryProps {
  inventoryStats: {
    totalBaskets: number;
    totalAnimals: number;
    averageWeight: number;
    sizeDistribution: SizeInventory[];
  };
  scatterData: any[];
  formatNumberEU: (value: number) => string;
  formatDecimalEU: (value: number) => string;
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ 
  inventoryStats, 
  scatterData, 
  formatNumberEU, 
  formatDecimalEU 
}) => {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione delle Ceste per Taglia</CardTitle>
            <CardDescription>
              Distribuzione delle ceste attive per ciascuna taglia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Animali per Taglia</CardTitle>
            <CardDescription>
              Numero totale di animali distribuiti per taglia
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
                    formatter={(value) => [formatNumberEU(Number(value)), 'Animali']}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="Animali" fill="#82ca9d">
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={inventoryStats.sizeDistribution[index]?.color || '#82ca9d'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Peso Medio per Taglia</CardTitle>
            <CardDescription>
              Peso medio degli animali per ciascuna taglia
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
        
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione Peso-Densità</CardTitle>
            <CardDescription>
              Relazione tra peso medio, animali per kg e quantità totale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Peso medio" 
                    unit=" mg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatDecimalEU(value)}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Animali/kg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatNumberEU(value)}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="z" 
                    range={[50, 500]} 
                    name="Animali totali" 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => {
                      if (name === 'Peso medio') return [formatDecimalEU(Number(value)), name];
                      return [formatNumberEU(Number(value)), name];
                    }}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">Cesta {data.basket} - {data.flupsy}</p>
                            <p>Taglia: {data.size}</p>
                            <p>Peso medio: {formatDecimalEU(data.x)} mg</p>
                            <p>Animali/kg: {formatNumberEU(data.y)}</p>
                            <p>Animali totali: {formatNumberEU(data.z)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    name="Ceste" 
                    data={scatterData} 
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
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
                <TableHead className="text-right">Range (animali/kg)</TableHead>
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
                  <TableCell className="text-right">
                    {size.minAnimalsPerKg !== null && size.maxAnimalsPerKg !== null ? 
                      `${formatNumberEU(size.minAnimalsPerKg)} - ${formatNumberEU(size.maxAnimalsPerKg)}` : 
                      'N/D'}
                  </TableCell>
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
    </div>
  );
};

export default InventorySummary;