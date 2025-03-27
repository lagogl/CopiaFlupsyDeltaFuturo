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
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, 
  LabelList, Line, ComposedChart, Area, RadialBarChart, RadialBar
} from "recharts";

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
  // Prepara i dati per i grafici con colori predefiniti se non disponibili
  // Colori di fallback per varie taglie
  const fallbackColors = [
    '#f87171', // red-400
    '#fb923c', // orange-400
    '#facc15', // yellow-400
    '#a3e635', // lime-400
    '#4ade80', // green-400
    '#2dd4bf', // teal-400
    '#60a5fa', // blue-400
    '#818cf8', // indigo-400
    '#a78bfa', // violet-400
    '#e879f9', // purple-400
    '#f472b6', // pink-400
    '#fb7185'  // rose-400
  ];
  
  // Assicurati che ogni taglia abbia un colore
  const pieChartData = inventoryStats.sizeDistribution.map((size, index) => ({
    name: size.sizeCode,
    value: size.count,
    color: size.color || fallbackColors[index % fallbackColors.length],
    totalAnimals: size.totalAnimals,
    sizeName: size.sizeName,
    animalsPerKg: size.averageAnimalsPerKg
  }));

  const barChartData = inventoryStats.sizeDistribution.map((size, index) => ({
    name: size.sizeCode,
    Ceste: size.count,
    Animali: size.totalAnimals,
    "Peso medio (mg)": size.averageWeight,
    AnimaliPerKg: size.averageAnimalsPerKg,
    color: size.color || fallbackColors[index % fallbackColors.length],
    sizeName: size.sizeName
  }));
  
  // Dati per il grafico composto
  const combinedChartData = inventoryStats.sizeDistribution.map((size, index) => ({
    name: size.sizeCode,
    "Peso (mg)": size.averageWeight,
    "Densità": size.averageAnimalsPerKg / 1000, // Diviso per 1000 per scalare
    "Animali": size.totalAnimals / 100000, // Diviso per 100000 per scalare
    color: size.color || fallbackColors[index % fallbackColors.length]
  }));
  
  // Dati per Radial Bar chart
  const radialData = inventoryStats.sizeDistribution.map((size, index) => ({
    name: size.sizeCode,
    uv: size.averageWeight,
    pv: 100 - (index * (100 / Math.max(inventoryStats.sizeDistribution.length, 1))),
    fill: size.color || fallbackColors[index % fallbackColors.length],
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
              Distribuzione delle ceste attive per ciascuna taglia commerciale
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="20%" 
                  outerRadius="90%" 
                  data={pieChartData} 
                  startAngle={180} 
                  endAngle={0}
                  barSize={20}
                >
                  <RadialBar
                    label={{
                      fill: '#666',
                      position: 'insideStart',
                      formatter: (entry: any) => `${entry.name}: ${formatNumberEU(entry.value)}`,
                    }}
                    background
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                      />
                    ))}
                  </RadialBar>
                  <Legend
                    iconSize={10}
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: "20px" }}
                    formatter={(value, entry: any, index) => (
                      <span style={{ color: '#333', fontWeight: 500 }}>
                        {entry.payload.name}: {formatNumberEU(entry.payload.value)} ceste
                      </span>
                    )}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        <div className="space-y-1">
                          <div className="font-semibold">{formatNumberEU(Number(value))} ceste</div>
                          <div className="text-xs">Animali: {formatNumberEU(data.totalAnimals)}</div>
                          <div className="text-xs">Densità media: {formatNumberEU(data.animalsPerKg)}/kg</div>
                        </div>,
                        data.sizeName
                      ];
                    }}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '8px 12px'
                    }}
                  />
                </RadialBarChart>
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
              Distribuzione dettagliata del numero totale di animali per taglia commerciale
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={barChartData} 
                  barGap={8}
                  margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
                >
                  <defs>
                    {barChartData.map((entry, index) => (
                      <linearGradient key={`gradient-${index}`} id={`colorAnimali-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={entry.color || '#82ca9d'} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={entry.color || '#82ca9d'} stopOpacity={0.6}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#555' }} 
                    tickLine={{ stroke: '#ccc' }}
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <YAxis 
                    tick={{ fill: '#555' }} 
                    tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                    tickLine={{ stroke: '#ccc' }}
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        <div className="space-y-1">
                          <div className="font-semibold text-lg text-green-700">{formatNumberEU(Number(value))}</div>
                          <div className="text-sm text-gray-500">
                            {data.sizeName} <br/>
                            {formatNumberEU(data.AnimaliPerKg)} animali/kg
                          </div>
                        </div>,
                        "Animali"
                      ];
                    }}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '10px 14px'
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(value) => <span className="text-gray-700">Distribuzione degli animali</span>}
                  />
                  <Bar 
                    dataKey="Animali" 
                    radius={[6, 6, 0, 0]} 
                    animationDuration={1500}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#colorAnimali-${index})`}
                        stroke={entry.color || '#82ca9d'} 
                        strokeWidth={1}
                      />
                    ))}
                    <LabelList 
                      dataKey="Animali" 
                      position="top" 
                      formatter={(value) => formatNumberEU(Number(value))}
                      style={{ 
                        fill: '#444', 
                        fontSize: 11, 
                        fontWeight: 'bold',
                        textShadow: '0 0 3px white'
                      }} 
                    />
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
              Relazione Peso-Taglia
            </CardTitle>
            <CardDescription className="text-amber-600">
              Andamento del peso medio e rapporto animali/kg per ciascuna taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={barChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
                >
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#555' }} 
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#555' }} 
                    axisLine={{ stroke: '#ccc' }}
                    label={{ 
                      value: 'Peso medio (mg)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#f59e0b', fontWeight: 500 } 
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#555' }} 
                    axisLine={{ stroke: '#ccc' }}
                    tickFormatter={(value) => formatNumberEU(value/1000) + "k"}
                    label={{ 
                      value: 'Animali/kg', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { fill: '#3b82f6', fontWeight: 500 } 
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        <div className="space-y-2">
                          <div className="font-semibold">
                            {name === "Peso medio (mg)" 
                              ? `${formatDecimalEU(Number(value))} mg` 
                              : `${formatNumberEU(Number(value))}`
                            }
                          </div>
                          <div className="text-xs text-gray-500">{data.sizeName}</div>
                        </div>,
                        name
                      ];
                    }}
                    contentStyle={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '10px 14px'
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(value) => (
                      <span style={{ color: value === "Peso medio (mg)" ? '#f59e0b' : '#3b82f6', fontWeight: 500 }}>
                        {value}
                      </span>
                    )}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Peso medio (mg)" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPeso)"
                    yAxisId="left"
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="AnimaliPerKg" 
                    name="Animali/kg"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    yAxisId="right"
                    dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: '#fff' }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
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
              Mappa interattiva delle relazioni tra peso medio, animali per kg e quantità totale
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart 
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <defs>
                    <linearGradient id="scatterBackground" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e0e7ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f3f4f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <filter id="dropShadow" height="130%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                      <feOffset dx="2" dy="2" result="offsetblur"/>
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.2"/>
                      </feComponentTransfer>
                      <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/> 
                      </feMerge>
                    </filter>
                  </defs>
                  <rect x="0" y="0" width="100%" height="100%" fill="url(#scatterBackground)"/>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Peso medio" 
                    unit=" mg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatDecimalEU(value)}
                    tick={{ fill: '#555' }}
                    axisLine={{ stroke: '#ccc' }}
                    tickLine={{ stroke: '#ccc' }}
                    label={{ 
                      value: 'Peso medio (mg)', 
                      position: 'bottom', 
                      fill: '#4f46e5', 
                      fontSize: 13, 
                      fontWeight: 'bold',
                      dy: 15 
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Animali/kg" 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => formatNumberEU(value)}
                    tick={{ fill: '#555' }}
                    axisLine={{ stroke: '#ccc' }}
                    tickLine={{ stroke: '#ccc' }}
                    label={{ 
                      value: 'Animali/kg', 
                      angle: -90, 
                      position: 'insideLeft', 
                      fill: '#4f46e5', 
                      fontSize: 13, 
                      fontWeight: 'bold',
                      dx: -15 
                    }}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="z" 
                    range={[60, 500]} 
                    name="Animali totali" 
                  />
                  <Tooltip 
                    cursor={{ 
                      strokeDasharray: '5 5',
                      stroke: '#6366f1',
                      strokeWidth: 1.5,
                      opacity: 0.7
                    }}
                    contentStyle={{ 
                      border: '1px solid #c7d2fe', 
                      borderRadius: '12px', 
                      backgroundColor: 'white',
                      boxShadow: '0 10px 25px rgba(79, 70, 229, 0.2)',
                      padding: '12px 16px'
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-indigo-200 rounded-xl shadow-lg">
                            <div className="font-bold text-indigo-800 border-b border-indigo-100 pb-2 mb-2 flex items-center">
                              <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                              Cesta {data.basket} - {data.flupsy}
                            </div>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1">
                                <span className="text-slate-500 text-sm">Taglia:</span> 
                                <span className="font-medium text-indigo-700 text-sm text-right">{data.size}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <span className="text-slate-500 text-sm">Peso medio:</span> 
                                <span className="font-medium text-indigo-700 text-sm text-right">{formatDecimalEU(data.x)} mg</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <span className="text-slate-500 text-sm">Animali/kg:</span> 
                                <span className="font-medium text-indigo-700 text-sm text-right">{formatNumberEU(data.y)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <span className="text-slate-500 text-sm">Animali totali:</span> 
                                <span className="font-medium text-indigo-700 text-sm text-right">{formatNumberEU(data.z)}</span>
                              </div>
                              {data.cycleDuration > 0 && (
                                <div className="grid grid-cols-2 gap-1">
                                  <span className="text-slate-500 text-sm">Giorni ciclo:</span> 
                                  <span className="font-medium text-indigo-700 text-sm text-right">{data.cycleDuration}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    align="center"
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ paddingBottom: '10px' }}
                    formatter={() => (
                      <span className="text-indigo-900 font-medium">Distribuzione delle ceste</span>
                    )}
                  />
                  <Scatter 
                    name="Ceste" 
                    data={scatterData} 
                    fill="#4f46e5"
                    stroke="#fff"
                    shape={(props: any) => {
                      const { cx, cy, fill, payload } = props;
                      
                      // Determine color based on the size code
                      let pointColor = fill;
                      if (payload && payload.size) {
                        // Try to find the corresponding size in the distribution
                        const sizeEntry = inventoryStats.sizeDistribution.find(s => s.sizeCode === payload.size);
                        if (sizeEntry) {
                          pointColor = sizeEntry.color;
                        }
                      }
                      
                      return (
                        <>
                          <circle 
                            filter="url(#dropShadow)"
                            cx={cx} 
                            cy={cy} 
                            r={12}
                            fill={pointColor} 
                            fillOpacity={0.1}
                          />
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={8}
                            stroke="#fff"
                            strokeWidth={2}
                            fill={pointColor} 
                            fillOpacity={0.8}
                          />
                        </>
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
      
      <Card className="border-teal-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
          <CardTitle className="text-teal-800 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-teal-500"></div>
            </div>
            Analisi Integrata dell'Inventario
          </CardTitle>
          <CardDescription className="text-teal-600">
            Visualizzazione integrata di tutte le metriche chiave dell'inventario corrente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={combinedChartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
              >
                <defs>
                  {barChartData.map((entry, index) => (
                    <linearGradient key={`areaGradient-${index}`} id={`colorPesoIntegrato-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={entry.color || '#4ade80'} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={entry.color || '#4ade80'} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#555' }} 
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#555' }} 
                  axisLine={{ stroke: '#ccc' }}
                  tickFormatter={(value) => formatDecimalEU(value)}
                  domain={['auto', 'auto']}
                  label={{ 
                    value: 'Peso medio (mg)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#14b8a6', fontWeight: 500 } 
                  }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#555' }} 
                  axisLine={{ stroke: '#ccc' }}
                  tickFormatter={(value) => `${formatNumberEU(value * 1000)}`}
                  domain={['auto', 'auto']}
                  label={{ 
                    value: 'Densità (animali/kg)', 
                    angle: 90, 
                    position: 'insideRight',
                    style: { fill: '#8b5cf6', fontWeight: 500 } 
                  }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    if (name === "Peso (mg)") {
                      return [formatDecimalEU(Number(value)), "Peso medio (mg)"];
                    } else if (name === "Densità") {
                      return [formatNumberEU(Number(value) * 1000), "Animali/kg"];
                    } else if (name === "Animali") {
                      return [formatNumberEU(Number(value) * 100000), "Animali totali"];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    const item = combinedChartData.find(item => item.name === label);
                    return (
                      <span className="font-semibold text-teal-800">
                        Taglia {label} <small className="font-normal">({item ? item.name : ''})</small>
                      </span>
                    );
                  }}
                  contentStyle={{ 
                    border: '1px solid #99f6e4', 
                    borderRadius: '12px', 
                    backgroundColor: 'white',
                    boxShadow: '0 10px 15px rgba(20, 184, 166, 0.1)',
                    padding: '10px 14px'
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: 10,
                    paddingBottom: 10,
                    fontSize: 12,
                    fontWeight: 500
                  }}
                  payload={[
                    { value: 'Peso medio (mg)', type: 'rect', color: '#14b8a6' },
                    { value: 'Animali/kg', type: 'line', color: '#8b5cf6' },
                    { value: 'Animali totali', type: 'rect', color: '#3b82f6' }
                  ]}
                />
                {combinedChartData.map((entry, index) => (
                  <Area 
                    key={`area-${index}`}
                    type="monotone" 
                    dataKey="Peso (mg)" 
                    fill={`url(#colorPesoIntegrato-${index})`}
                    stroke={entry.color || '#14b8a6'}
                    fillOpacity={0.6}
                    strokeWidth={2}
                    yAxisId="left"
                    dot={{ stroke: entry.color || '#14b8a6', fill: '#fff', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 8, strokeWidth: 2 }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="Densità"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  yAxisId="right"
                  dot={{ stroke: '#8b5cf6', fill: '#fff', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 10, strokeWidth: 2 }}
                />
                <Bar 
                  dataKey="Animali" 
                  fill="#3b82f6" 
                  yAxisId="right"
                  barSize={30}
                  fillOpacity={0.5}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                >
                  {combinedChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || '#3b82f6'} 
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 border-t border-teal-100 pt-4 text-sm text-teal-700">
            <ul className="list-disc pl-6 space-y-1">
              <li>Le aree colorate rappresentano il peso medio degli animali per ciascuna taglia (scala a sinistra)</li>
              <li>La linea viola mostra la densità espressa in animali per kg (scala a destra)</li>
              <li>Le barre rappresentano il numero totale di animali per taglia (scala a destra)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventorySummary;