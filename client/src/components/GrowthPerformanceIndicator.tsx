import { useState } from 'react';
import { TrendingUp, TrendingDown, Info, ArrowUpRight, ArrowDownRight, ArrowRight, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { formatNumberWithCommas } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

// Funzione per ottenere una valutazione testuale della performance
function getPerformanceText(ratio: number): string {
  if (ratio >= 1.3) return "Eccellente";
  if (ratio >= 1.1) return "Ottima";
  if (ratio >= 0.9) return "Buona";
  if (ratio >= 0.7) return "Nella media";
  if (ratio >= 0.5) return "Sotto target";
  return "Scarsa";
}

// Funzione per calcolare la crescita giornaliera
function getDailyGrowthRate(totalGrowth: number, days: number): number {
  if (days <= 0) return 0;
  // Formula: (1 + r)^n = (1 + totalGrowth/100) => r = ((1 + totalGrowth/100)^(1/n) - 1) * 100
  return ((Math.pow(1 + totalGrowth/100, 1/days) - 1) * 100);
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
  
  // Calcola la crescita giornaliera effettiva
  const dailyGrowthRate = getDailyGrowthRate(actualGrowthPercent, daysBetweenMeasurements);
  
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
  const dailyGrowthFormatted = dailyGrowthRate.toFixed(2);
  
  // Mostra il valore reale senza limiti
  const performancePercentFormatted = (performanceRatio * 100).toFixed(0);
  const diffFromTarget = actualGrowthPercent - targetGrowthPercent;
  
  // Calcola variazione di peso giornaliera in mg
  const weightIncreasePerDay = currentAverageWeight && previousAverageWeight && daysBetweenMeasurements > 0 
    ? (currentAverageWeight - previousAverageWeight) / daysBetweenMeasurements 
    : null;
  
  return (
    <Collapsible 
      open={expanded} 
      onOpenChange={setExpanded} 
      className={`rounded-md p-3 ${bgColor} border ${borderColor} mb-2`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center">
              {performanceRatio >= 0.9 ? (
                <TrendingUp className={`h-5 w-5 mr-2 ${performanceColor}`} />
              ) : (
                <TrendingDown className={`h-5 w-5 mr-2 ${performanceColor}`} />
              )}
              
              <div>
                <div className="text-sm font-medium">
                  Crescita: <span className={performanceColor}>{actualGrowthFormatted}%</span> 
                  <span className={diffFromTarget >= 0 ? "text-green-600" : "text-red-600"}>
                    {" "}({diffFromTarget >= 0 ? "+" : ""}{diffFromTarget.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <button 
                  className="ml-3 p-1 rounded-md hover:bg-white/50 transition-colors cursor-pointer"
                  title={expanded ? "Nascondi dettagli" : "Mostra dettagli"}
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 text-xs mt-1">
            <div>
              <div className="flex items-center text-gray-600">
                <span>Performance:</span>
                <span className={`ml-1 font-medium ${performanceColor}`}>{getPerformanceText(performanceRatio)}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center text-gray-600">
                <span>Efficienza:</span>
                <span className={`ml-1 font-medium ${performanceColor}`}>{performancePercentFormatted}%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-2 mb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="text-xs text-gray-600">Target: {targetGrowthFormatted}%</div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Info className="h-3 w-3 text-gray-500" />
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
                            <p><strong>Peso precedente:</strong> {formatNumberWithCommas(previousAverageWeight, 4)} mg ({formatNumberWithCommas(Math.round(1000000/previousAverageWeight))} an/kg)</p>
                            <p><strong>Peso attuale:</strong> {formatNumberWithCommas(currentAverageWeight, 4)} mg ({formatNumberWithCommas(Math.round(1000000/currentAverageWeight))} an/kg)</p>
                            <p><strong>Incremento:</strong> {formatNumberWithCommas(currentAverageWeight - previousAverageWeight, 4)} mg</p>
                            <p><strong>Crescita giornaliera:</strong> {dailyGrowthFormatted}% al giorno</p>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="text-xs text-gray-600">
                {daysBetweenMeasurements} giorni
              </div>
            </div>
            <Progress 
              value={Math.min(performanceRatio * 100, 150)} 
              max={150}
              className={`h-2 mt-1 ${progressColor}`} 
            />
          </div>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="text-sm font-medium text-gray-700">Dati tendenza</div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-white/50 rounded-md">
              <div className="text-gray-600 mb-1">Peso giornaliero</div>
              <div className="flex items-center">
                {weightIncreasePerDay ? (
                  <>
                    <span className="text-base font-medium">
                      {weightIncreasePerDay.toFixed(2)} mg/g
                    </span>
                    <ArrowUpRight className="h-4 w-4 ml-1 text-emerald-600" />
                  </>
                ) : (
                  <span className="text-gray-500 italic">Non disponibile</span>
                )}
              </div>
            </div>
            
            <div className="p-2 bg-white/50 rounded-md">
              <div className="text-gray-600 mb-1">SGR giornaliero</div>
              <div className="flex items-center">
                <span className="text-base font-medium">
                  {dailyGrowthFormatted}% 
                </span>
                <span className="text-xs text-gray-500 ml-1">/ giorno</span>
                {dailyGrowthRate > (sgrDailyPercentage || 0) ? (
                  <ArrowUpRight className="h-4 w-4 ml-1 text-emerald-600" />
                ) : dailyGrowthRate < (sgrDailyPercentage || 0) ? (
                  <ArrowDownRight className="h-4 w-4 ml-1 text-red-600" />
                ) : (
                  <ArrowRight className="h-4 w-4 ml-1 text-amber-600" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-white/70 rounded-md">
            <BarChart3 className="h-4 w-4 text-gray-500 mr-2" />
            <div>
              <span className="text-xs text-gray-600">
                Crescita totale peso: 
                {currentAverageWeight && previousAverageWeight ? (
                  <span className="ml-1 font-medium">
                    {formatNumberWithCommas((currentAverageWeight - previousAverageWeight), 0)} mg
                    <span className="text-xs text-gray-500 ml-1">
                      ({(((currentAverageWeight - previousAverageWeight) / previousAverageWeight) * 100).toFixed(1)}%)
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-500 italic ml-1">Non disponibile</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}