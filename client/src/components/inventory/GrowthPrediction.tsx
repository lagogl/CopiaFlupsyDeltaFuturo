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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface GrowthPredictionData {
  basketId: number;
  physicalNumber: number;
  flupsyName: string;
  currentWeight: number;
  currentAnimalsPerKg: number;
  currentSizeCode: string;
  currentSizeName: string;
  predictedWeight: number;
  predictedAnimalsPerKg: number;
  predictedSizeCode: string | null;
  predictedSizeName: string | null;
  growthPercentage: number;
  daysToTarget: number | null;
  targetDate: Date | null;
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
  notes: string | null;
  color?: string;
}

interface GrowthPredictionProps {
  predictions: GrowthPredictionData[];
  targetSize: string;
  targetDate?: Date;
  growthChartData: any[];
  sizes: Size[];
  formatNumberEU: (value: number) => string;
  formatDecimalEU: (value: number) => string;
  formatDateIT: (date: Date | string) => string;
  getColorForSize: (size: Size) => string;
}

const GrowthPrediction: React.FC<GrowthPredictionProps> = ({
  predictions,
  targetSize,
  targetDate,
  growthChartData,
  sizes,
  formatNumberEU,
  formatDecimalEU,
  formatDateIT,
  getColorForSize,
}) => {
  return (
    <div className="space-y-6">
      {/* Grafico previsioni */}
      {targetDate && growthChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Crescita Prevista al {formatDateIT(targetDate)}</CardTitle>
            <CardDescription>
              Confronto tra peso attuale e peso previsto per ogni cesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={growthChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={80} 
                  />
                  <YAxis 
                    label={{ 
                      value: 'Peso (mg)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                    tickFormatter={(value) => formatNumberEU(value)}
                  />
                  <Tooltip 
                    formatter={(value) => [formatDecimalEU(Number(value)), 'mg']}
                    contentStyle={{ border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">{label} - {data.flupsyName}</p>
                            <p>Taglia attuale: {data.size}</p>
                            <p>Taglia prevista: {data.predictedSize || 'Non definita'}</p>
                            <p>Peso attuale: {formatDecimalEU(data.current)} mg</p>
                            <p>Peso previsto: {formatDecimalEU(data.predicted)} mg</p>
                            <p>Crescita: +{formatDecimalEU(data.growth)}%</p>
                            <p>Animali/kg attuali: {formatNumberEU(data.animalsPerKg)}</p>
                            <p>Animali/kg previsti: {formatNumberEU(data.predictedAnimalsPerKg)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar name="Peso attuale" dataKey="current" fill="#8884d8" />
                  <Bar name="Peso previsto" dataKey="predicted" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabella previsioni */}
      {(targetDate || targetSize) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {targetSize ? 
                `Previsione di raggiungimento taglia ${targetSize}` : 
                `Previsione taglie al ${formatDateIT(targetDate || new Date())}`}
            </CardTitle>
            <CardDescription>
              {targetSize ? 
                `Elenco delle ceste che raggiungeranno la taglia ${targetSize} e quando` : 
                `Proiezione delle taglie che raggiungeranno le ceste alla data selezionata`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cesta</TableHead>
                  <TableHead>FLUPSY</TableHead>
                  <TableHead>Taglia Attuale</TableHead>
                  {targetDate && <TableHead>Taglia Prevista</TableHead>}
                  <TableHead className="text-right">Peso Attuale (mg)</TableHead>
                  {targetDate && <TableHead className="text-right">Peso Previsto (mg)</TableHead>}
                  {targetDate && <TableHead className="text-right">Crescita (%)</TableHead>}
                  {targetSize && <TableHead className="text-right">Giorni al Target</TableHead>}
                  {targetSize && <TableHead>Data Raggiungimento</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((pred) => (
                  <TableRow key={pred.basketId}>
                    <TableCell className="font-medium">{pred.physicalNumber}</TableCell>
                    <TableCell>{pred.flupsyName}</TableCell>
                    <TableCell>
                      <Badge
                        style={{ 
                          backgroundColor: sizes.find(s => s.code === pred.currentSizeCode) 
                            ? getColorForSize(sizes.find(s => s.code === pred.currentSizeCode)!) 
                            : 'gray',
                          color: pred.currentSizeCode && parseInt(pred.currentSizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                        }}
                      >
                        {pred.currentSizeCode}
                      </Badge>
                    </TableCell>
                    {targetDate && (
                      <TableCell>
                        {pred.predictedSizeCode ? (
                          <Badge
                            style={{ 
                              backgroundColor: 
                                sizes.find(s => s.code === pred.predictedSizeCode)
                                  ? getColorForSize(sizes.find(s => s.code === pred.predictedSizeCode)!)
                                  : 'gray',
                              color: pred.predictedSizeCode && parseInt(pred.predictedSizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                            }}
                          >
                            {pred.predictedSizeCode}
                          </Badge>
                        ) : 'N/D'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">{formatDecimalEU(pred.currentWeight)}</TableCell>
                    {targetDate && (
                      <TableCell className="text-right">{formatDecimalEU(pred.predictedWeight)}</TableCell>
                    )}
                    {targetDate && (
                      <TableCell className="text-right">{formatDecimalEU(pred.growthPercentage)}</TableCell>
                    )}
                    {targetSize && (
                      <TableCell className="text-right">
                        {pred.daysToTarget !== null ? formatNumberEU(pred.daysToTarget) : 'N/D'}
                      </TableCell>
                    )}
                    {targetSize && (
                      <TableCell>
                        {pred.targetDate ? formatDateIT(pred.targetDate) : 'N/D'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {predictions.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                {targetSize ? 
                  'Nessuna cesta raggiungerà questa taglia nel periodo di proiezione' : 
                  'Nessuna cesta trovata con i filtri selezionati'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GrowthPrediction;