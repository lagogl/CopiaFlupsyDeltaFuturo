import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, TrendingDown, TrendingUp } from "lucide-react";

// Blocco di codice da usare per l'operazione "peso"
// Per sostituire la sezione corrispondente in OperationsDropZoneContainer.tsx

<>
  {currentOperation && currentOperation.type === 'peso' && (
    <div className="grid gap-4 py-4">
      {/* Dati precedenti dell'operazione */}
      {previousOperationData && previousOperationData.animalsPerKg && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Dati precedenti</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-blue-600 font-medium">Animali per kg:</span>
              <span className="ml-1 text-blue-900">{previousOperationData.animalsPerKg.toLocaleString('it-IT')}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Peso medio:</span>
              <span className="ml-1 text-blue-900">{previousOperationData.averageWeight?.toLocaleString('it-IT') || '-'} mg</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Tot. animali:</span>
              <span className="ml-1 text-blue-900">{previousOperationData.animalCount?.toLocaleString('it-IT') || '-'}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Form per l'operazione di peso */}
      <div className="p-4 border rounded-lg bg-green-50">
        <h4 className="text-sm font-medium mb-3">Dati dell'operazione di peso</h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="date" className="text-xs">Data dell'operazione</Label>
            <Input
              id="date"
              type="date"
              value={currentOperation.formData.date || ''}
              onChange={(e) => handleFormChange('date', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="totalWeight" className="text-xs">Peso totale degli animali (g)</Label>
            <Input
              id="totalWeight"
              type="number"
              step="0.01"
              placeholder="Inserisci il peso totale in grammi"
              value={currentOperation.formData.totalWeight || ''}
              onChange={(e) => handleFormChange('totalWeight', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs mt-1 text-green-700">
              <Info className="inline h-3 w-3 mr-1" />
              Inserendo il peso totale, verranno ricalcolati automaticamente il peso medio e gli animali per kg
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          placeholder="Inserisci eventuali note sull'operazione"
          value={currentOperation.formData.notes || ''}
          onChange={(e) => handleFormChange('notes', e.target.value)}
        />
      </div>

      {/* Risultati calcolati */}
      {currentOperation.formData.animalsPerKg && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-blue-50">
            <CardTitle className="text-base font-medium">Nuovi valori calcolati</CardTitle>
            <CardDescription>
              Valori ricalcolati in base al nuovo peso totale, mantenendo lo stesso numero di animali
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
                <p className="text-xs text-gray-500 mb-1">Nuovo animali per kg</p>
                <p className="font-bold text-lg text-slate-900">
                  {currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}
                </p>
                {previousOperationData?.animalsPerKg && (
                  <div className="text-xs text-green-600 flex items-center mt-1">
                    {currentOperation.formData.animalsPerKg < previousOperationData.animalsPerKg ? (
                      <>
                        <TrendingDown className="h-3 w-3 mr-1" /> 
                        <span>-{(previousOperationData.animalsPerKg - currentOperation.formData.animalsPerKg).toLocaleString('it-IT')}</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 mr-1" /> 
                        <span>+{(currentOperation.formData.animalsPerKg - previousOperationData.animalsPerKg).toLocaleString('it-IT')}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
                <p className="text-xs text-gray-500 mb-1">Nuovo peso medio (mg)</p>
                <p className="font-bold text-lg text-slate-900">
                  {currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'}
                </p>
                {previousOperationData?.averageWeight && (
                  <div className="text-xs text-green-600 flex items-center mt-1">
                    {currentOperation.formData.averageWeight > previousOperationData.averageWeight ? (
                      <>
                        <TrendingUp className="h-3 w-3 mr-1" /> 
                        <span>+{(currentOperation.formData.averageWeight - previousOperationData.averageWeight).toLocaleString('it-IT')}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 mr-1" /> 
                        <span>-{(previousOperationData.averageWeight - currentOperation.formData.averageWeight).toLocaleString('it-IT')}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 bg-white rounded-md shadow-sm border border-blue-100">
                <p className="text-xs text-gray-500 mb-1">Numero totale animali</p>
                <p className="font-bold text-lg text-slate-900">
                  {currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Mantenuto dalla misurazione precedente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )}
</>