import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Brush 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumberWithCommas } from '@/lib/utils';

interface SizeWithSgr {
  sizeId: number;
  sizeName: string;
  sgrPercentage: number;
  color: string;
  averageWeight: number;
}

interface MultiSizeGrowthComparisonChartProps {
  measurementDate: Date;
  sizesWithSgr: SizeWithSgr[];
  projectionDays?: number;
}

export default function MultiSizeGrowthComparisonChart({
  measurementDate,
  sizesWithSgr,
  projectionDays = 60
}: MultiSizeGrowthComparisonChartProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', { 
      day: '2-digit', 
      month: '2-digit' 
    }).format(date);
  };
  
  // Formato per l'asse X con mesi letterali
  const formatAxisDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', { 
      month: 'short',
      year: projectionDays > 180 ? '2-digit' : undefined
    }).format(date);
  };
  
  // Genera i dati per il grafico
  const data: any[] = [];
  
  for (let day = 0; day <= projectionDays; day++) {
    const date = new Date(measurementDate);
    date.setDate(date.getDate() + day);
    
    const dataPoint: any = {
      day,
      date,
      dateFormatted: formatDate(date),
      dateAxis: formatAxisDate(date)
    };
    
    // Calcola il peso per ogni taglia usando il suo peso specifico
    sizesWithSgr.forEach(size => {
      const dailySgr = size.sgrPercentage / 100;
      const effectiveWeight = size.averageWeight > 0 ? size.averageWeight : 250;
      const weight = effectiveWeight * Math.exp(dailySgr * day);
      dataPoint[`size_${size.sizeId}`] = parseFloat(Math.max(0, weight).toFixed(1));
    });
    
    data.push(dataPoint);
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Confronto crescita per taglia</CardTitle>
        <CardDescription>
          Previsioni di crescita utilizzando SGR specifici per ogni taglia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col my-1 text-sm">
          <div className="flex justify-between">
            <span>Data inizio: <strong>{formatDate(measurementDate)}</strong></span>
            <span>Proiezione: <strong>{projectionDays} giorni</strong></span>
          </div>
          <div className="text-xs text-muted-foreground">
            Confronto di {sizesWithSgr.length} taglie con pesi medi specifici
          </div>
        </div>
        
        <div className="h-[450px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="dateAxis" 
                padding={{ left: 10, right: 10 }}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}`}
                label={{ 
                  value: 'Peso (g)',
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12 }
                }}
              />
              <Tooltip
                formatter={(value, name) => {
                  const size = sizesWithSgr.find(s => `size_${s.sizeId}` === name);
                  return [`${formatNumberWithCommas(Number(value))} mg`, size?.sizeName || name];
                }}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => {
                  const size = sizesWithSgr.find(s => `size_${s.sizeId}` === value);
                  return size ? `${size.sizeName} (SGR: ${size.sgrPercentage.toFixed(2)}%)` : value;
                }}
              />
              
              {/* Linee di crescita per ogni taglia */}
              {sizesWithSgr.map((size, index) => (
                <Line
                  key={size.sizeId}
                  type="monotone"
                  dataKey={`size_${size.sizeId}`}
                  name={`size_${size.sizeId}`}
                  stroke={size.color || `hsl(${(index * 360) / sizesWithSgr.length}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
              
              {/* Brush per zoom sulla timeline */}
              <Brush 
                dataKey="dateAxis" 
                height={30} 
                stroke="#3b82f6"
                fill="#f0f9ff"
                travellerWidth={10}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Tabella riepilogativa */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Taglia</th>
                <th className="px-3 py-2 text-right font-medium">SGR (%)</th>
                <th className="px-3 py-2 text-right font-medium">Peso iniziale</th>
                <th className="px-3 py-2 text-right font-medium">Peso finale</th>
                <th className="px-3 py-2 text-right font-medium">Crescita (%)</th>
              </tr>
            </thead>
            <tbody>
              {sizesWithSgr.map(size => {
                const finalWeight = data[data.length - 1]?.[`size_${size.sizeId}`] || 0;
                const initialWeight = size.averageWeight;
                const growthPercentage = ((finalWeight - initialWeight) / initialWeight) * 100;
                return (
                  <tr key={size.sizeId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: size.color }}
                        />
                        {size.sizeName}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{size.sgrPercentage.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNumberWithCommas(initialWeight)} mg</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNumberWithCommas(finalWeight)} mg</td>
                    <td className="px-3 py-2 text-right font-mono">+{growthPercentage.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
