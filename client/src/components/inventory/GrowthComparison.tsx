import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { calculateSizeTimeline } from "@/lib/utils";

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  flupsyName: string;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  sizeCode: string | null;
  sizeName: string | null;
  color: string | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  totalAnimals: number | null;
  lastOperationDate: string | null;
  lastOperationType: string | null;
  cycleStartDate: string | null;
  cycleDuration: number | null;
  growthRate: number | null;
}

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

interface GrowthComparisonProps {
  basketsData: BasketData[];
  inventoryStats: {
    totalBaskets: number;
    totalAnimals: number;
    averageWeight: number;
    sizeDistribution: SizeInventory[];
  };
  sgr: number;
  sizes: any[];
  formatNumberEU: (value: number) => string;
  formatDecimalEU: (value: number) => string;
  formatDateIT: (date: Date | string) => string;
}

const GrowthComparison: React.FC<GrowthComparisonProps> = ({
  basketsData,
  inventoryStats,
  sgr,
  sizes,
  formatNumberEU,
  formatDecimalEU,
  formatDateIT,
}) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
            <CardTitle className="text-emerald-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              </div>
              Crescita per Taglia
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Tassi di crescita medi delle ceste per taglia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Array.from(
                    basketsData
                      .filter(b => b.growthRate !== null && b.sizeCode !== null)
                      .reduce((acc, basket) => {
                        if (!basket.sizeCode) return acc;
                        
                        if (!acc.has(basket.sizeCode)) {
                          acc.set(basket.sizeCode, {
                            name: basket.sizeCode,
                            sizeName: basket.sizeName || '',
                            color: basket.color || '#cccccc',
                            growthRates: [],
                            averageGrowth: 0,
                            count: 0
                          });
                        }
                        
                        const item = acc.get(basket.sizeCode)!;
                        if (basket.growthRate !== null) {
                          item.growthRates.push(basket.growthRate);
                          item.averageGrowth = 
                            item.growthRates.reduce((sum, val) => sum + val, 0) / 
                            item.growthRates.length;
                          item.count++;
                        }
                        
                        return acc;
                      }, new Map<string, any>())
                  )
                  .map(([_, value]) => value)
                  .sort((a, b) => {
                    // Ordina per codice taglia (T1, T2, ecc.)
                    const aCode = parseInt(a.name.replace('T', ''));
                    const bCode = parseInt(b.name.replace('T', ''));
                    return aCode - bCode;
                  })
                }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    label={{ 
                      value: 'SGR mensile (%)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatDecimalEU(Number(value))}%`, 'SGR mensile']}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="averageGrowth" 
                    name="SGR medio mensile" 
                    fill="#8884d8"
                  >
                    {Array.from(
                      basketsData
                        .filter(b => b.growthRate !== null && b.sizeCode !== null)
                        .reduce((acc, basket) => {
                          if (!basket.sizeCode) return acc;
                          
                          if (!acc.has(basket.sizeCode)) {
                            acc.set(basket.sizeCode, {
                              name: basket.sizeCode,
                              sizeName: basket.sizeName || '',
                              color: basket.color || '#cccccc',
                              growthRates: [],
                              averageGrowth: 0,
                              count: 0
                            });
                          }
                          
                          const item = acc.get(basket.sizeCode)!;
                          if (basket.growthRate !== null) {
                            item.growthRates.push(basket.growthRate);
                            item.averageGrowth = 
                              item.growthRates.reduce((sum, val) => sum + val, 0) / 
                              item.growthRates.length;
                            item.count++;
                          }
                          
                          return acc;
                        }, new Map<string, any>())
                    )
                    .map(([_, value]) => value)
                    .sort((a, b) => {
                      // Ordina per codice taglia (T1, T2, ecc.)
                      const aCode = parseInt(a.name.replace('T', ''));
                      const bCode = parseInt(b.name.replace('T', ''));
                      return aCode - bCode;
                    })
                    .map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              </div>
              Top 10 Ceste per Crescita
            </CardTitle>
            <CardDescription className="text-blue-600">
              Le ceste con i più alti tassi di crescita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={basketsData
                    .filter(b => b.growthRate !== null)
                    .sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))
                    .slice(0, 10)
                    .map(basket => ({
                      name: `Cesta ${basket.physicalNumber}`,
                      growth: basket.growthRate,
                      flupsy: basket.flupsyName,
                      size: basket.sizeCode,
                      color: basket.color
                    }))
                  }
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 90, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number"
                    label={{ 
                      value: 'SGR mensile (%)', 
                      position: 'insideBottom',
                      offset: -5
                    }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    scale="band"
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatDecimalEU(Number(value))}%`, 'SGR mensile']}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">{data.name}</p>
                            <p>FLUPSY: {data.flupsy}</p>
                            <p>Taglia: {data.size}</p>
                            <p>SGR mensile: {formatDecimalEU(data.growth)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="growth" 
                    name="SGR mensile" 
                    fill="#82ca9d"
                  >
                    {basketsData
                      .filter(b => b.growthRate !== null)
                      .sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))
                      .slice(0, 10)
                      .map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={basketsData
                            .filter(b => b.growthRate !== null)
                            .sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))
                            .slice(0, 10)[index].color || '#82ca9d'} 
                        />
                      ))}
                  </Bar>
                </BarChart>
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
            Timeline di Crescita
          </CardTitle>
          <CardDescription className="text-purple-600">
            Timeline delle ceste e proiezione delle loro taglie nel tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inventoryStats.sizeDistribution.map(size => {
              // Per ogni taglia, mostro le ceste di quella taglia
              const cesteDiQuestaTaglia = basketsData.filter(b => b.sizeCode === size.sizeCode);
              
              return cesteDiQuestaTaglia.length > 0 ? (
                <Card key={size.sizeCode} className="border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <CardHeader className="pb-2" style={{ 
                    borderBottom: `1px solid ${size.color}30`,
                    background: `linear-gradient(to right, ${size.color}15, white)`
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge
                          style={{ 
                            backgroundColor: size.color,
                            color: parseInt(size.sizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                          }}
                          className="shadow-sm font-bold"
                        >
                          {size.sizeCode}
                        </Badge>
                        <CardTitle className="text-lg font-semibold">{size.sizeName}</CardTitle>
                      </div>
                      <div>
                        <Badge variant="outline" className="bg-white shadow-sm">
                          {cesteDiQuestaTaglia.length} {cesteDiQuestaTaglia.length === 1 ? 'cesta' : 'ceste'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {cesteDiQuestaTaglia
                          .sort((a, b) => a.physicalNumber - b.physicalNumber)
                          .map(cesta => {
                            // Per ogni cesta, calcolo le taglie future
                            const timeline = calculateSizeTimeline(
                              cesta.averageWeight || 0,
                              new Date(cesta.lastOperationDate || new Date()),
                              cesta.growthRate !== null ? cesta.growthRate : sgr,
                              6,
                              sizes
                            );
                            
                            return (
                              <div key={cesta.id} className="pb-2">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-medium">
                                    Cesta {cesta.physicalNumber} ({cesta.flupsyName})
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatNumberEU(cesta.animalsPerKg || 0)} animali/kg
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <div className="flex flex-col items-center">
                                    <Badge
                                      style={{ 
                                        backgroundColor: cesta.color || 'gray',
                                        color: cesta.sizeCode && parseInt(cesta.sizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                                      }}
                                      className="text-xs shadow-sm font-bold px-2"
                                    >
                                      {cesta.sizeCode}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      Oggi
                                    </span>
                                  </div>
                                  
                                  {timeline.length > 1 && timeline.slice(1).map((point, index) => (
                                    <div key={index} className="flex items-center space-x-1">
                                      <div className="flex flex-col items-center">
                                        <ArrowRight className="h-3 w-3 text-gray-400" />
                                        <div className="w-full h-[1px] bg-gray-200"></div>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <Badge
                                          style={{ 
                                            backgroundColor: point.size?.color || 'gray',
                                            color: point.size?.code && parseInt(point.size?.code.replace('T', '')) <= 3 ? 'white' : 'black'
                                          }}
                                          className="text-xs shadow-sm font-bold px-2"
                                        >
                                          {point.size?.code}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                          {formatDateIT(point.date)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {timeline.length <= 1 && (
                                    <div className="text-xs text-gray-500 ml-2 italic">
                                      Nessuna taglia futura prevista nel periodo
                                    </div>
                                  )}
                                </div>
                                
                                <Separator className="mt-2" />
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : null;
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrowthComparison;