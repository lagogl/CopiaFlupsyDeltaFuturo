import { useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { formatNumberWithCommas } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface GrowthPerformanceIndicatorProps {
  // Dati sulla crescita effettiva
  actualGrowthPercent: number | null;
  // Dati sulla crescita teorica (SGR)
  targetGrowthPercent: number | null;
  // Giorni trascorsi tra le misurazioni
  daysBetweenMeasurements: number;
  // Peso medio attuale in mg
  currentAverageWeight: number | null;
  // Peso medio precedente in mg
  previousAverageWeight: number | null;
  // Mese SGR utilizzato per il calcolo
  sgrMonth?: string;
  // Percentuale SGR giornaliera
  sgrDailyPercentage?: number;
  // Mostra grafico dettagliato?
  showDetailedChart?: boolean;
}

export default function GrowthPerformanceIndicator({
  actualGrowthPercent,
  targetGrowthPercent,
  daysBetweenMeasurements,
  currentAverageWeight,
  previousAverageWeight,
  sgrMonth,
  sgrDailyPercentage,
  showDetailedChart = false
}: GrowthPerformanceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Se non ci sono dati sufficienti, mostra un messaggio
  if (actualGrowthPercent === null || targetGrowthPercent === null) {
    return (
      <div className="text-muted-foreground italic text-sm">
        Dati di crescita non disponibili
      </div>
    );
  }

  // Calcola la percentuale di prestazione rispetto al target
  const performanceRatio = actualGrowthPercent / targetGrowthPercent;
  
  // Determina il colore in base alla performance
  let performanceColor = 'text-amber-500'; // Default: giallo/arancione
  let bgColor = 'bg-amber-100';
  let progressColor = 'bg-amber-500';
  let borderColor = 'border-amber-500';
  
  if (performanceRatio >= 1.3) {
    // Eccellente: crescita superiore al 130% del target
    performanceColor = 'text-emerald-600';
    bgColor = 'bg-emerald-100';
    progressColor = 'bg-emerald-600';
    borderColor = 'border-emerald-500';
  } else if (performanceRatio >= 1.1) {
    // Molto buona: crescita tra il 110% e il 130% del target
    performanceColor = 'text-green-600';
    bgColor = 'bg-green-100';
    progressColor = 'bg-green-600';
    borderColor = 'border-green-500';
  } else if (performanceRatio >= 0.9) {
    // Buona: crescita tra il 90% e il 110% del target
    performanceColor = 'text-blue-600';
    bgColor = 'bg-blue-100';
    progressColor = 'bg-blue-600';
    borderColor = 'border-blue-500';
  } else if (performanceRatio >= 0.7) {
    // Media: crescita tra il 70% e il 90% del target
    performanceColor = 'text-amber-500';
    bgColor = 'bg-amber-100';
    progressColor = 'bg-amber-500';
    borderColor = 'border-amber-500';
  } else if (performanceRatio >= 0.5) {
    // Insufficiente: crescita tra il 50% e il 70% del target
    performanceColor = 'text-orange-600';
    bgColor = 'bg-orange-100';
    progressColor = 'bg-orange-600';
    borderColor = 'border-orange-500';
  } else {
    // Scarsa: crescita inferiore al 50% del target
    performanceColor = 'text-red-600';
    bgColor = 'bg-red-100';
    progressColor = 'bg-red-600';
    borderColor = 'border-red-500';
  }

  // Arrotonda le percentuali per la visualizzazione
  const actualGrowthFormatted = actualGrowthPercent.toFixed(1);
  const targetGrowthFormatted = targetGrowthPercent.toFixed(1);
  
  // Mostra il valore reale senza limiti
  const performancePercentFormatted = (performanceRatio * 100).toFixed(0);
  
  return (
    <div className={`rounded-md p-3 ${bgColor} border ${borderColor} mb-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {performanceRatio >= 0.9 ? (
            <TrendingUp className={`h-5 w-5 mr-2 ${performanceColor}`} />
          ) : (
            <TrendingDown className={`h-5 w-5 mr-2 ${performanceColor}`} />
          )}
          
          <div>
            <div className="text-sm font-medium mb-1">
              Crescita: <span className={performanceColor}>{actualGrowthFormatted}%</span> 
              {performanceRatio >= 1 ? (
                <span className="text-green-600"> (+{(actualGrowthPercent - targetGrowthPercent).toFixed(1)}%)</span>
              ) : (
                <span className="text-red-600"> ({(actualGrowthPercent - targetGrowthPercent).toFixed(1)}%)</span>
              )}
            </div>
            
            <div className="flex items-center">
              <Progress 
                value={Math.min(performanceRatio * 100, 150)} 
                max={150}
                className={`h-2 w-32 ${progressColor}`} 
              />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 cursor-help">
                      <Info className="h-4 w-4 text-gray-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="text-xs space-y-1">
                      <p><strong>Crescita reale:</strong> {actualGrowthFormatted}% in {daysBetweenMeasurements} giorni</p>
                      <p><strong>Crescita target (SGR):</strong> {targetGrowthFormatted}%</p>
                      {sgrMonth && <p><strong>SGR di riferimento:</strong> {sgrMonth} ({sgrDailyPercentage}% al giorno)</p>}
                      <p><strong>Performance:</strong> {performancePercentFormatted}% del target</p>
                      <p><strong>Rapporto di crescita reale:</strong> {performanceRatio.toFixed(2)}x</p>
                      {currentAverageWeight && previousAverageWeight && (
                        <>
                          <p><strong>Peso precedente:</strong> {formatNumberWithCommas(previousAverageWeight)} mg</p>
                          <p><strong>Peso attuale:</strong> {formatNumberWithCommas(currentAverageWeight)} mg</p>
                          <p><strong>Incremento:</strong> {formatNumberWithCommas(currentAverageWeight - previousAverageWeight)} mg</p>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        <div className="text-2xl font-bold tabular-nums">
          <span className={performanceColor}>{performancePercentFormatted}%</span>
        </div>
      </div>
      
      {showDetailedChart && expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Grafico dettagliato di crescita
            {/* Si potrebbe aggiungere un grafico più dettagliato qui */}
          </div>
        </div>
      )}
      
      {showDetailedChart && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 mt-2 hover:underline"
        >
          {expanded ? "Nascondi dettagli" : "Mostra dettagli"}
        </button>
      )}
    </div>
  );
}