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
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              </div>
              Distribuzione delle Ceste per Taglia
            </CardTitle>
            <CardDescription className="text-blue-600">
              Distribuzione delle ceste attive per ciascuna taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius="70%"
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={200}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatNumberEU(Number(value)), 'Ceste']}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b border-green-100">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              Animali per Taglia
            </CardTitle>
            <CardDescription className="text-green-600">
              Numero totale di animali distribuiti per taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fill: '#666' }} />
                  <YAxis tick={{ fill: '#666' }} />
                  <Tooltip 
                    formatter={(value) => [formatNumberEU(Number(value)), 'Animali']}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Animali" fill="#82ca9d" radius={[4, 4, 0, 0]} animationDuration={1500}>
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
        
        <Card className="border-amber-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              </div>
              Peso Medio per Taglia
            </CardTitle>
            <CardDescription className="text-amber-600">
              Peso medio degli animali per ciascuna taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fill: '#666' }} />
                  <YAxis tick={{ fill: '#666' }} />
                  <Tooltip 
                    formatter={(value) => [formatDecimalEU(Number(value)), 'mg']}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Peso medio (mg)" fill="#f59e0b" radius={[4, 4, 0, 0]} animationDuration={1500}>
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
        
        <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
            <CardTitle className="text-indigo-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
              </div>
              Distribuzione Peso-Densità
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Relazione tra peso medio, animali per kg e quantità totale
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Peso medio" 
                    unit=" mg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatDecimalEU(value)}
                    tick={{ fill: '#666' }}
                    label={{ value: 'Peso medio (mg)', position: 'bottom', fill: '#666', fontSize: 12, dy: 15 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Animali/kg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatNumberEU(value)}
                    tick={{ fill: '#666' }}
                    label={{ value: 'Animali/kg', angle: -90, position: 'left', fill: '#666', fontSize: 12, dx: -15 }}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="z" 
                    range={[50, 400]} 
                    name="Animali totali" 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => {
                      if (name === 'Peso medio') return [formatDecimalEU(Number(value)), name];
                      return [formatNumberEU(Number(value)), name];
                    }}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '10px 14px'
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-indigo-100 rounded-lg shadow-md">
                            <p className="font-bold text-indigo-800 border-b border-indigo-100 pb-1 mb-2">Cesta {data.basket} - {data.flupsy}</p>
                            <div className="space-y-1">
                              <p className="flex justify-between">
                                <span className="text-slate-500">Taglia:</span> 
                                <span className="font-medium text-indigo-700">{data.size}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">Peso medio:</span> 
                                <span className="font-medium text-indigo-700">{formatDecimalEU(data.x)} mg</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">Animali/kg:</span> 
                                <span className="font-medium text-indigo-700">{formatNumberEU(data.y)}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">Animali totali:</span> 
                                <span className="font-medium text-indigo-700">{formatNumberEU(data.z)}</span>
                              </p>
                            </div>
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
                    shape={(props) => {
                      const { cx, cy, fill } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={8}
                          stroke="#fff"
                          strokeWidth={2}
                          fill={fill} 
                          fillOpacity={0.8}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-purple-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
          <CardTitle className="text-purple-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
            </div>
            Dettaglio Giacenze per Taglia
          </CardTitle>
          <CardDescription className="text-purple-600">
            Panoramica dettagliata delle giacenze suddivise per taglia
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="rounded-lg overflow-hidden border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50">
                  <TableHead className="text-purple-700">Taglia</TableHead>
                  <TableHead className="text-purple-700">Nome</TableHead>
                  <TableHead className="text-right text-purple-700">Range (animali/kg)</TableHead>
                  <TableHead className="text-right text-purple-700">Ceste</TableHead>
                  <TableHead className="text-right text-purple-700">Animali Totali</TableHead>
                  <TableHead className="text-right text-purple-700">Animali/Kg (Media)</TableHead>
                  <TableHead className="text-right text-purple-700">Peso Medio (mg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryStats.sizeDistribution.map((size, index) => (
                  <TableRow key={size.sizeCode} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell>
                      <Badge
                        className="font-medium shadow-sm"
                        style={{ 
                          backgroundColor: size.color,
                          color: parseInt(size.sizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                        }}
                      >
                        {size.sizeCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{size.sizeName}</TableCell>
                    <TableCell className="text-right">
                      {size.minAnimalsPerKg !== null && size.maxAnimalsPerKg !== null ? (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
                          {formatNumberEU(size.minAnimalsPerKg)} - {formatNumberEU(size.maxAnimalsPerKg)}
                        </span>
                      ) : 'N/D'}
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
              <div className="py-8 text-center text-muted-foreground bg-gray-50">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <div className="h-6 w-6 text-gray-400">!</div>
                </div>
                <p className="text-gray-500">Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventorySummary;