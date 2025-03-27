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
  LabelList, Line, ComposedChart, Area, RadialBarChart, RadialBar,
  Treemap
} from "recharts";

// Colori consistenti e vivaci per taglie di diverse dimensioni
const sizeColorMap: Record<string, string> = {
  'TP-180': '#ef4444', // rosso - taglie più piccole
  'TP-200': '#f87171',
  'TP-315': '#fb923c',
  'TP-450': '#f59e0b',
  'TP-500': '#fbbf24',
  'TP-600': '#facc15',
  'TP-700': '#a3e635',
  'TP-800': '#84cc16',
  'TP-1000': '#65a30d',
  'TP-1140': '#10b981',
  'TP-1260': '#14b8a6',
  'TP-1500': '#06b6d4',
  'TP-1800': '#0ea5e9',
  'TP-2000': '#3b82f6',
  'TP-2500': '#6366f1',
  'TP-3000': '#8b5cf6',
  'TP-4000': '#a855f7',
  'TP-5000': '#d946ef',
  'TP-6000': '#ec4899',
  'TP-8000': '#f43f5e',
  'TP-10000': '#1e293b', // blu scuro - taglie più grandi
};

// Colori fallback da usare quando i colori dai dati non sono disponibili
const fallbackColors = [
  "#4f46e5", // indigo-600
  "#0ea5e9", // sky-500 
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

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
  // Preparazione dei dati con colori consistenti per tutte le taglie
  const prepareDataWithColors = (sizeData: SizeInventory[]) => {
    return sizeData.map(size => {
      // Usa la mappa dei colori definita o un fallback
      const color = sizeColorMap[size.sizeCode as keyof typeof sizeColorMap] || 
                     size.color || 
                     fallbackColors[sizeData.indexOf(size) % fallbackColors.length];
      return {
        ...size,
        color
      };
    }).sort((a, b) => {
      // Estrai il numero dalla taglia (es. TP-500 -> 500)
      const getNumericSize = (code: string) => {
        const match = code.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };
      
      return getNumericSize(a.sizeCode) - getNumericSize(b.sizeCode);
    });
  };
  
  // Dati con colori consistenti e ordinati per dimensione numerica della taglia
  const enhancedSizeData = prepareDataWithColors(inventoryStats.sizeDistribution);
  
  // Dati per il grafico a torta delle ceste per taglia
  const pieChartData = enhancedSizeData.map(size => ({
    name: size.sizeCode,
    value: size.count,
    color: size.color,
    totalAnimals: size.totalAnimals,
    sizeName: size.sizeName,
    animalsPerKg: size.averageAnimalsPerKg,
    percentuale: inventoryStats.totalBaskets ? (size.count / inventoryStats.totalBaskets * 100).toFixed(1) + '%' : '0%'
  }));

  // Dati per il grafico a barre degli animali
  const barChartData = enhancedSizeData.map(size => ({
    name: size.sizeCode,
    Ceste: size.count,
    Animali: size.totalAnimals,
    "Peso medio (mg)": size.averageWeight,
    AnimaliPerKg: size.averageAnimalsPerKg,
    color: size.color,
    sizeName: size.sizeName
  }));
  
  // Dati per il grafico di crescita
  const growthChartData = enhancedSizeData.map(size => ({
    name: size.sizeCode,
    "Peso (mg)": size.averageWeight,
    "Animali/kg": size.averageAnimalsPerKg,
    color: size.color,
    sizeName: size.sizeName
  }));
  
  // Dati per il treemap che mostra la distribuzione degli animali
  const treemapData = [{
    name: 'Animali',
    children: enhancedSizeData.map(size => ({
      name: size.sizeCode,
      size: size.totalAnimals,
      color: size.color,
      sizeName: size.sizeName,
      animaliPerKg: size.averageAnimalsPerKg,
      pesoMedio: size.averageWeight,
      ceste: size.count
    }))
  }];
  
  // Dati per la visualizzazione scatter
  const scatterDataEnhanced = scatterData.map(item => {
    // Trova il colore corrispondente alla taglia se presente
    let color = '#4f46e5'; // Colore predefinito
    if (item.size && sizeColorMap[item.size as keyof typeof sizeColorMap]) {
      color = sizeColorMap[item.size as keyof typeof sizeColorMap];
    } else if (item.size) {
      // Cerca nella lista delle taglie per trovare il colore
      const sizeEntry = enhancedSizeData.find(s => s.sizeCode === item.size);
      if (sizeEntry && sizeEntry.color) {
        color = sizeEntry.color;
      }
    }
    
    return {
      ...item,
      fill: color
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              </div>
              Distribuzione degli Animali per Taglia
            </CardTitle>
            <CardDescription className="text-blue-600">
              Mappa ad albero che mostra la distribuzione proporzionale degli animali per taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData[0].children}
                  dataKey="size"
                  ratio={4/3}
                  stroke="#fff"
                  fill="#8884d8"
                  animationDuration={1000}
                >
                  {
                    (props) => {
                      const { x, y, width, height, name, size, color } = props;
                      return (
                        <g>
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            style={{
                              fill: color,
                              stroke: '#fff',
                              strokeWidth: 2,
                              strokeOpacity: 1,
                              fillOpacity: 0.9,
                            }}
                          />
                          {width > 60 && height > 25 && (
                            <text
                              x={x + width / 2}
                              y={y + height / 2 - 12}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={14}
                              fontWeight="bold"
                              style={{
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                                pointerEvents: 'none'
                              }}
                            >
                              {name}
                            </text>
                          )}
                          {width > 60 && height > 25 && (
                            <text
                              x={x + width / 2}
                              y={y + height / 2 + 10}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize={11}
                              style={{
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                                pointerEvents: 'none'
                              }}
                            >
                              {formatNumberEU(Number(size))} animali
                            </text>
                          )}
                        </g>
                      );
                    }
                  }
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-blue-100 rounded-md shadow-lg max-w-xs">
                            <div className="font-bold text-blue-800 border-b border-blue-100 pb-1 mb-2">
                              {data.name} - {data.sizeName}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-sm">
                              <span className="text-slate-600">Totale animali:</span>
                              <span className="font-medium text-blue-700 text-right">{formatNumberEU(data.size)}</span>
                              
                              <span className="text-slate-600">Animali/kg:</span>
                              <span className="font-medium text-blue-700 text-right">{formatNumberEU(data.animaliPerKg)}</span>
                              
                              <span className="text-slate-600">Peso medio:</span>
                              <span className="font-medium text-blue-700 text-right">{formatDecimalEU(data.pesoMedio)} mg</span>
                              
                              <span className="text-slate-600">Numero ceste:</span>
                              <span className="font-medium text-blue-700 text-right">{formatNumberEU(data.ceste)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
              <p className="italic font-medium">Nota: La dimensione di ciascun blocco rappresenta la quantità di animali per taglia, permettendo di visualizzare facilmente la distribuzione dell'inventario.</p>
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
                        <stop offset="5%" stopColor={entry.color} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={entry.color} stopOpacity={0.6}/>
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
                    tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toString()}
                    tickLine={{ stroke: '#ccc' }}
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => {
                      const data = props.payload;
                      if (name === "Animali") {
                        return [
                          <div className="space-y-1">
                            <div className="font-semibold text-lg text-green-700">{formatNumberEU(Number(value))}</div>
                            <div className="text-sm text-gray-500">
                              {data.sizeName} <br/>
                              {formatNumberEU(data.AnimaliPerKg)} animali/kg
                            </div>
                          </div>,
                          "Animali" as "Animali"
                        ];
                      }
                      return [value, name];
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
                    fill="#82ca9d" // Setta un colore default che verrà sovrascritto
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || fallbackColors[index % fallbackColors.length]}
                        stroke={entry.color || fallbackColors[index % fallbackColors.length]}
                        strokeWidth={1}
                      />
                    ))}
                    <LabelList 
                      dataKey="Animali" 
                      position="top" 
                      formatter={(value: any) => formatNumberEU(Number(value))}
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
                    formatter={(value: any, name: any, props: any) => {
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
        
        <Card className="border-purple-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              </div>
              Distribuzione Peso e Densità
            </CardTitle>
            <CardDescription className="text-purple-600">
              Visualizzazione interattiva della relazione tra peso e densità per ogni taglia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    dataKey="Peso medio (mg)" 
                    name="Peso medio" 
                    unit="mg"
                    label={{ 
                      value: 'Peso medio (mg)', 
                      position: 'insideBottomRight', 
                      offset: -5,
                      style: { textAnchor: 'middle', fill: '#555', fontWeight: 500 } 
                    }}
                    tickFormatter={(value) => formatDecimalEU(value)}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="AnimaliPerKg" 
                    name="Animali per kg"
                    label={{ 
                      value: 'Animali per kg', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#555', fontWeight: 500 } 
                    }}
                    tickFormatter={(value) => formatNumberEU(value)}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="Animali" 
                    range={[50, 400]} 
                    name="Totale animali" 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-purple-100 rounded-md shadow-lg max-w-xs">
                            <div className="font-bold text-purple-800 border-b border-purple-100 pb-1 mb-2">
                              {data.name} - {data.sizeName}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-sm">
                              <span className="text-slate-600">Peso medio:</span>
                              <span className="font-medium text-purple-700 text-right">{formatDecimalEU(data["Peso medio (mg)"])} mg</span>
                              
                              <span className="text-slate-600">Animali/kg:</span>
                              <span className="font-medium text-purple-700 text-right">{formatNumberEU(data.AnimaliPerKg)}</span>
                              
                              <span className="text-slate-600">Totale animali:</span>
                              <span className="font-medium text-purple-700 text-right">{formatNumberEU(data.Animali)}</span>
                              
                              <span className="text-slate-600">Numero ceste:</span>
                              <span className="font-medium text-purple-700 text-right">{formatNumberEU(data.Ceste)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: 15,
                      paddingBottom: 15,
                      fontSize: 12,
                      fontWeight: 500
                    }}
                    align="center"
                    iconType="circle"
                    payload={[
                      { 
                        value: 'Dimensione dei punti = Numero totale di animali', 
                        type: 'circle', 
                        color: '#a855f7' 
                      }
                    ]}
                  />
                  <Scatter 
                    name="Taglie Commerciali" 
                    data={barChartData} 
                    fill="#a855f7"
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`scatter-cell-${index}`} 
                        fill={entry.color || '#a855f7'} 
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 border-t border-purple-100 pt-4 text-sm text-purple-700">
              <p className="text-center leading-relaxed">
                <span className="font-semibold">Grafico di Dispersione:</span> Ogni punto rappresenta una taglia commerciale. 
                La posizione orizzontale indica il peso medio, quella verticale la densità degli animali (animali per kg). 
                La dimensione del punto rappresenta la quantità totale di animali in quella taglia.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventorySummary;