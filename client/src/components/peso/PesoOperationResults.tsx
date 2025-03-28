import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

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
  } | null;
}

export function PesoOperationResults({ currentOperation, previousOperationData }: PesoOperationResultsProps) {
  if (!currentOperation.formData.animalsPerKg) return null;
  
  // Calcola il peso totale precedente in kg
  const previousTotalWeight = previousOperationData?.animalCount && previousOperationData?.averageWeight 
    ? (previousOperationData.animalCount * previousOperationData.averageWeight) / 1000000 
    : null;
  
  // Converti il peso totale corrente da grammi a kg
  const currentTotalWeightKg = currentOperation.formData.totalWeight 
    ? currentOperation.formData.totalWeight / 1000 
    : null;
  
  return (
    <Card className="shadow-sm overflow-hidden col-span-2">
      <CardHeader className="pb-2 bg-blue-50">
        <CardTitle className="text-base font-medium">Nuovi valori calcolati</CardTitle>
        <CardDescription>
          Valori ricalcolati in base al nuovo peso totale, mantenendo lo stesso numero di animali
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
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
            {previousOperationData?.averageWeight && (
              <div className="text-xs text-green-600 flex items-center mt-1 overflow-hidden">
                {currentOperation.formData.averageWeight > previousOperationData.averageWeight ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" /> 
                    <span className="truncate">+{(currentOperation.formData.averageWeight - previousOperationData.averageWeight).toLocaleString('it-IT')}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" /> 
                    <span className="truncate">-{(previousOperationData.averageWeight - currentOperation.formData.averageWeight).toLocaleString('it-IT')}</span>
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
      </CardContent>
    </Card>
  );
}