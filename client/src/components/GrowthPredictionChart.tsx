import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumberWithCommas } from '@/lib/utils';

interface GrowthPredictionChartProps {
  // Peso corrente misurato in mg
  currentWeight: number;
  // Data della misurazione
  measurementDate: Date;
  // Valore teorico SGR mensile in percentuale
  theoreticalSgrMonthlyPercentage: number;
  // Valore SGR calcolato dalle performance reali (opzionale)
  realSgrMonthlyPercentage?: number;
  // Numero di giorni per la proiezione futura
  projectionDays?: number;
  // Variazioni percentuali per gli scenari
  variationPercentages?: {
    best: number;
    worst: number;
  };
}

interface DataPoint {
  date: Date;
  weight: number;
  theoretical: number;
  best: number;
  worst: number;
  real?: number;
}

export default function GrowthPredictionChart({
  currentWeight,
  measurementDate,
  theoreticalSgrMonthlyPercentage,
  realSgrMonthlyPercentage,
  projectionDays = 30,
  variationPercentages = {
    best: 20, // 20% migliore del teorico
    worst: 30 // 30% peggiore del teorico
  }
}: GrowthPredictionChartProps) {
  // Formato per peso e date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', { 
      day: '2-digit', 
      month: '2-digit' 
    }).format(date);
  };
  
  // Convertire la percentuale mensile SGR in tasso giornaliero
  const safeTheoreticalSgr = theoreticalSgrMonthlyPercentage || 0;
  // Formula corretta W(t) = W(0) * e^(SGR*t): SGR è già in forma decimale
  const dailySgr = safeTheoreticalSgr / 100; // Converte da percentuale a decimale per uso nella formula esponenziale
  
  // Calcola i valori giornalieri per scenari migliori/peggiori
  const bestDailySgr = dailySgr * (1 + variationPercentages.best / 100);
  const worstDailySgr = dailySgr * (1 - variationPercentages.worst / 100);
  
  // Calcola la SGR giornaliera reale se disponibile
  const realDailySgr = realSgrMonthlyPercentage ? realSgrMonthlyPercentage / 100 : undefined;

  // Genera i dati per il grafico
  const data: any[] = [];
  
  // Imposta un peso minimo per la simulazione per evitare grafici piatti o divisioni per zero
  const minSimulationWeight = 1; // 1 mg come peso minimo
  const effectiveWeight = currentWeight > 0 ? currentWeight : minSimulationWeight;
  
  // Se il peso è 0 o molto basso, usiamo un valore predefinito iniziale che sarà mostrato solo nel grafico
  if (currentWeight <= 0) {
    console.log("Attenzione: il peso iniziale è 0 o negativo. Utilizziamo un valore minimo per la simulazione.");
  }
  
  for (let day = 0; day <= projectionDays; day++) {
    const date = new Date(measurementDate);
    date.setDate(date.getDate() + day);
    
    // Calcola pesi usando la formula SGR: W(t) = W(0) * e^(SGR * t)
    // Utilizziamo il peso effettivo per i calcoli per evitare valori 0 o negativi
    const theoreticalWeight = effectiveWeight * Math.exp(dailySgr * day);
    const bestWeight = effectiveWeight * Math.exp(bestDailySgr * day);
    const worstWeight = effectiveWeight * Math.exp(worstDailySgr * day);
    
    // Aggiungi peso reale se abbiamo l'SGR reale
    const realWeight = realDailySgr 
      ? effectiveWeight * Math.exp(realDailySgr * day) 
      : undefined;
    
    // Assicuriamoci che i valori siano definiti e maggiori di zero prima di usare toFixed()
    const formatSafeValue = (value: number | undefined) => {
      if (value === undefined || isNaN(value)) return undefined;
      return parseFloat((Math.max(0, value)).toFixed(1));
    };
    
    data.push({
      day,
      date,
      dateFormatted: formatDate(date),
      theoretical: formatSafeValue(theoreticalWeight),
      best: formatSafeValue(bestWeight),
      worst: formatSafeValue(worstWeight),
      ...(realWeight !== undefined ? { real: formatSafeValue(realWeight) } : {})
    });
  }
  
  // Configurazione dei target di peso
  const targetWeights = [
    { name: 'T0', weight: 125 },
    { name: 'T1', weight: 166 },
    { name: 'M1', weight: 250 },
    { name: 'M2', weight: 400 },
    { name: 'M3', weight: 625 }
  ];
  
  // Trova target di peso appropriati da visualizzare
  // Assicuriamoci che currentWeight sia valido prima di filtrare i target
  const safeCurrentWeight = currentWeight || 0;
  const relevantTargets = targetWeights.filter(
    target => target.weight > safeCurrentWeight * 0.9 && target.weight < safeCurrentWeight * 2.5
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Previsione di crescita</CardTitle>
        <CardDescription>
          Basata su SGR mensile del {theoreticalSgrMonthlyPercentage ? theoreticalSgrMonthlyPercentage.toFixed(1) : "0.0"}% 
          {realSgrMonthlyPercentage && ` (reale: ${realSgrMonthlyPercentage.toFixed(1)}%)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col my-1 text-sm">
          <div className="flex justify-between">
            <span>Peso iniziale: <strong>{formatNumberWithCommas(currentWeight)} mg</strong></span>
            <span>Data: <strong>{formatDate(measurementDate)}</strong></span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Proiezione a {projectionDays} giorni</span>
            <span>
              {variationPercentages.best}% migliore / {variationPercentages.worst}% peggiore
            </span>
          </div>
        </div>
        
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="dateFormatted" 
                padding={{ left: 10, right: 10 }}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
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
                formatter={(value) => [`${formatNumberWithCommas(Number(value))} mg`, '']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend verticalAlign="bottom" height={36} />
              
              {/* Linee target per taglie */}
              {relevantTargets.map(target => (
                <ReferenceLine
                  key={target.name}
                  y={target.weight}
                  label={{ value: target.name, position: 'right', fontSize: 11 }}
                  stroke="#aaa"
                  strokeDasharray="3 3"
                />
              ))}
              
              {/* Linea oggi */}
              {data.length > 0 && (
                <ReferenceLine
                  x={data[0].dateFormatted}
                  stroke="#666"
                  strokeWidth={1}
                />
              )}
              
              {/* Linee di crescita */}
              <Line
                type="monotone"
                dataKey="worst"
                name="Scenario peggiore"
                stroke="#ef4444"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="theoretical"
                name="Teorico"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="best"
                name="Scenario migliore"
                stroke="#10b981"
                dot={false}
                activeDot={{ r: 5 }}
              />
              {realDailySgr && (
                <Line
                  type="monotone"
                  dataKey="real"
                  name="Reale (basato sui dati)"
                  stroke="#8b5cf6"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}