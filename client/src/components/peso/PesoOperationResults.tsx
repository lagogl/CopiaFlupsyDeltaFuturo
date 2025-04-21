import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import GrowthPerformanceIndicator from "@/components/GrowthPerformanceIndicator";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PesoOperationResultsProps {
  currentOperation: {
    formData: {
      animalsPerKg: number | null;
      averageWeight: number | null;
      animalCount: number | null;
      totalWeight: number | null;
    }
  };
  previousOperationData: {
    animalsPerKg: number;
    averageWeight: number;
    animalCount: number;
    lotId?: number | null;
  } | null;
  operationDate?: string; // Data dell'operazione corrente
  lastOperationDate?: string; // Data dell'ultima operazione
}

export function PesoOperationResults({ 
  currentOperation, 
  previousOperationData,
  operationDate = new Date().toISOString().split('T')[0],
  lastOperationDate
}: PesoOperationResultsProps) {
  if (!currentOperation.formData.animalsPerKg) return null;
  
  // Calcola il peso totale precedente in kg
  const previousTotalWeight = previousOperationData?.animalCount && previousOperationData?.averageWeight 
    ? (previousOperationData.animalCount * previousOperationData.averageWeight) / 1000000 
    : null;
  
  // Converti il peso totale corrente da grammi a kg
  const currentTotalWeightKg = currentOperation.formData.totalWeight 
    ? currentOperation.formData.totalWeight / 1000 
    : null;
    
  // Recupera i dati SGR per calcolare la crescita attesa
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgr'],
    enabled: !!lastOperationDate && !!operationDate // Abilita la query solo se abbiamo entrambe le date
  });
  
  // Prepara i dati per l'indicatore di crescita
  const prepareGrowthData = () => {
    if (!previousOperationData?.averageWeight || 
        !currentOperation.formData.averageWeight || 
        !lastOperationDate || 
        !operationDate || 
        !sgrs) {
      return null;
    }
    
    // Calcolo giorni tra le operazioni
    const lastDate = new Date(lastOperationDate);
    const currDate = new Date(operationDate);
    const daysDiff = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) return null;
    
    // Calcolo crescita reale
    const prevAvgWeight = previousOperationData.averageWeight;
    const currAvgWeight = currentOperation.formData.averageWeight;
    const actualGrowthPercent = ((currAvgWeight - prevAvgWeight) / prevAvgWeight) * 100;
    
    // Ottieni il mese per SGR
    const month = format(lastDate, 'MMMM', { locale: it }).toLowerCase();
    const sgrData = sgrs.find((sgr: any) => sgr.month.toLowerCase() === month);
    
    if (!sgrData) return null;
    
    // Calcola crescita attesa (SGR del mese × giorni)
    const dailySgr = sgrData.percentage; // Percentuale SGR giornaliera
    const targetGrowthPercent = dailySgr * daysDiff;
    
    return {
      actualGrowthPercent,
      targetGrowthPercent,
      daysBetweenMeasurements: daysDiff,
      currentAverageWeight: currAvgWeight,
      previousAverageWeight: prevAvgWeight,
      sgrMonth: sgrData.month,
      sgrDailyPercentage: dailySgr
    };
  }
  
  // Ottieni i dati per l'indicatore di crescita
  const growthData = prepareGrowthData();
  
  return (
    <Card className="shadow-sm overflow-hidden col-span-2">
      <CardHeader className="pb-2 bg-blue-50">
        <CardTitle className="text-base font-medium">Nuovi valori calcolati</CardTitle>
        <CardDescription>
          Valori ricalcolati in base al nuovo peso totale, mantenendo lo stesso numero di animali
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Indicatore performance di crescita */}
          {growthData && (
            <div className="mb-1">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Andamento crescita</h4>
              <GrowthPerformanceIndicator 
                actualGrowthPercent={growthData.actualGrowthPercent}
                targetGrowthPercent={growthData.targetGrowthPercent}
                daysBetweenMeasurements={growthData.daysBetweenMeasurements}
                currentAverageWeight={growthData.currentAverageWeight}
                previousAverageWeight={growthData.previousAverageWeight}
                sgrMonth={growthData.sgrMonth}
                sgrDailyPercentage={growthData.sgrDailyPercentage}
                showDetailedChart={true}
              />
            </div>
          )}
          
          {/* Quadro delle misurazioni */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Animali per kg</p>
              <p className="font-bold text-lg text-slate-900 truncate">
                {currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}
              </p>
              {previousOperationData?.animalsPerKg && (
                <div className="text-xs text-green-600 flex items-center mt-1 overflow-hidden">
                  {currentOperation.formData.animalsPerKg < previousOperationData.animalsPerKg ? (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">-{(previousOperationData.animalsPerKg - currentOperation.formData.animalsPerKg).toLocaleString('it-IT')}</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">+{(currentOperation.formData.animalsPerKg - previousOperationData.animalsPerKg).toLocaleString('it-IT')}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Peso medio (mg)</p>
              <p className="font-bold text-lg text-slate-900 truncate">
                {currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'}
              </p>
              {previousOperationData?.averageWeight && currentOperation.formData.averageWeight && (
                <div className="text-xs text-green-600 flex items-center mt-1 overflow-hidden">
                  {currentOperation.formData.averageWeight > previousOperationData.averageWeight ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">+{(currentOperation.formData.averageWeight - previousOperationData.averageWeight).toLocaleString('it-IT')}</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">-{(previousOperationData.averageWeight - (currentOperation.formData.averageWeight || 0)).toLocaleString('it-IT')}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Numero totale animali</p>
              <p className="font-bold text-lg text-slate-900 truncate">
                {currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}
              </p>
              <p className="text-xs text-blue-600 mt-1 truncate">Mantenuto dalla misurazione precedente</p>
            </div>
            <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Peso totale (kg)</p>
              <p className="font-bold text-lg text-slate-900 truncate">
                {currentTotalWeightKg?.toLocaleString('it-IT', {maximumFractionDigits: 3}) || '-'}
              </p>
              {previousTotalWeight && (
                <div className="text-xs text-green-600 flex items-center mt-1 overflow-hidden">
                  {currentTotalWeightKg && currentTotalWeightKg > previousTotalWeight ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">+{(currentTotalWeightKg - previousTotalWeight).toLocaleString('it-IT', {maximumFractionDigits: 3})}</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" /> 
                      <span className="truncate">-{(previousTotalWeight - (currentTotalWeightKg || 0)).toLocaleString('it-IT', {maximumFractionDigits: 3})}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}