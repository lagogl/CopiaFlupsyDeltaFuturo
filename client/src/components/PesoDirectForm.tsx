import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { PesoOperationResults } from '@/components/peso/PesoOperationResults';
import { format } from 'date-fns';

interface PesoDirectFormProps {
  basketId: number;
  cycleId: number;
  sizeId: number | null;
  lotId?: number | null;
  lottoInfo?: string | null;
  basketNumber?: number;
  defaultAnimalsPerKg?: number | null;
  defaultAverageWeight?: number | null;
  defaultAnimalCount?: number | null;
  lastOperationDate?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PesoDirectForm({
  basketId,
  cycleId,
  sizeId,
  lotId = null,
  lottoInfo = null,
  basketNumber = 0,
  defaultAnimalsPerKg = null,
  defaultAverageWeight = null,
  defaultAnimalCount = null,
  lastOperationDate = null,
  onSuccess,
  onCancel
}: PesoDirectFormProps) {
  const { toast } = useToast();
  
  // Determina la data minima (ultima operazione + 1 giorno o oggi)
  const today = new Date();
  const minDate = lastOperationDate 
    ? new Date(new Date(lastOperationDate).getTime() + 86400000) // +1 giorno in millisecondi
    : today;
  
  // Formatta le date per l'input type="date"
  const todayStr = format(today, 'yyyy-MM-dd');
  const minDateStr = format(minDate > today ? today : minDate, 'yyyy-MM-dd');
  
  // Stato per il form
  const [formData, setFormData] = useState({
    date: todayStr,
    totalWeight: '',
    notes: '',
    // Valori calcolati
    animalCount: defaultAnimalCount || 0,
    animalsPerKg: null as number | null,
    averageWeight: null as number | null,
  });
  
  // Stato per tenere traccia se il form è valido
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Funzione per aggiornare il formData e calcolare i valori
  const handleChange = (field: string, value: string) => {
    // Crea una copia dello stato attuale
    const updatedFormData = { ...formData, [field]: value };
    
    // Se stiamo aggiornando il peso totale, calcola i valori derivati
    if (field === 'totalWeight' && value && !isNaN(parseFloat(value))) {
      const totalWeightKg = parseFloat(value);
      if (totalWeightKg > 0 && updatedFormData.animalCount) {
        // Calcola animali per kg e peso medio
        const animalsPerKg = Math.round(updatedFormData.animalCount / totalWeightKg);
        const averageWeight = 1000000 / animalsPerKg; // Peso medio in mg
        
        updatedFormData.animalsPerKg = animalsPerKg;
        updatedFormData.averageWeight = averageWeight;
      } else {
        updatedFormData.animalsPerKg = null;
        updatedFormData.averageWeight = null;
      }
    }
    
    // Aggiorna lo stato
    setFormData(updatedFormData);
    
    // Verifica se il form è valido
    setIsFormValid(
      !!updatedFormData.date && 
      !!updatedFormData.totalWeight && 
      parseFloat(updatedFormData.totalWeight) > 0
    );
  };
  
  // Funzione per inviare i dati
  const handleSubmit = async () => {
    if (!isFormValid) return;
    
    try {
      // Prepara l'oggetto operazione
      const operationData = {
        type: 'peso',
        date: new Date(formData.date + 'T12:00:00').toISOString(), // Aggiungi l'ora per standardizzare
        basketId,
        cycleId,
        sizeId,
        lotId,
        animalsPerKg: formData.animalsPerKg,
        averageWeight: formData.averageWeight,
        animalCount: formData.animalCount,
        totalWeight: parseFloat(formData.totalWeight) * 1000, // Converti in grammi per il database
        notes: formData.notes
      };
      
      // Invia al server
      await apiRequest('POST', '/api/operations', operationData);
      
      // Mostra notifica
      toast({
        title: "Operazione registrata",
        description: `Operazione di peso registrata per la cesta #${basketNumber}`,
      });
      
      // Callback di successo
      onSuccess();
    } catch (error) {
      console.error('Errore durante la registrazione dell\'operazione:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante la registrazione dell'operazione.",
      });
    }
  };
  
  // Prepara i dati per PesoOperationResults
  const previousOperationData = {
    animalsPerKg: defaultAnimalsPerKg || 0,
    averageWeight: defaultAverageWeight || 0,
    animalCount: defaultAnimalCount || 0,
    lotId: lotId,
  };
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* Informazioni sulla cesta */}
        <div className="p-3 bg-slate-100 rounded-md">
          <p className="text-sm text-slate-700">
            <strong>Cesta:</strong> #{basketNumber} {lottoInfo && `- ${lottoInfo}`}
          </p>
        </div>
      
        {/* Data operazione */}
        <div>
          <label className="block text-sm font-medium mb-1">Data operazione</label>
          <Input
            type="date"
            id="operation-date"
            value={formData.date}
            min={minDateStr}
            max={todayStr}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Data dell'operazione (non può essere anteriore all'ultima operazione)
          </p>
        </div>
        
        {/* Dati precedenti */}
        {(defaultAnimalsPerKg || defaultAverageWeight || defaultAnimalCount) && (
          <div>
            <Card className="bg-blue-50">
              <CardContent className="p-3">
                <h4 className="text-sm font-medium mb-2 text-slate-700">Dati precedenti</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {defaultAnimalsPerKg && (
                    <div className="p-2 bg-white rounded shadow-sm">
                      <p className="text-xs text-gray-500">Animali per kg</p>
                      <p className="font-medium text-slate-900">
                        {formatNumberWithCommas(defaultAnimalsPerKg)}
                      </p>
                    </div>
                  )}
                  
                  {defaultAverageWeight && (
                    <div className="p-2 bg-white rounded shadow-sm">
                      <p className="text-xs text-gray-500">Peso medio (mg)</p>
                      <p className="font-medium text-slate-900">
                        {formatNumberWithCommas(defaultAverageWeight)}
                      </p>
                    </div>
                  )}
                  
                  {defaultAnimalCount && (
                    <div className="p-2 bg-white rounded shadow-sm">
                      <p className="text-xs text-gray-500">Numero animali</p>
                      <p className="font-medium text-slate-900">
                        {formatNumberWithCommas(defaultAnimalCount)}
                      </p>
                    </div>
                  )}
                  
                  {defaultAnimalCount && defaultAverageWeight && (
                    <div className="p-2 bg-white rounded shadow-sm">
                      <p className="text-xs text-gray-500">Peso totale (kg)</p>
                      <p className="font-medium text-slate-900">
                        {defaultAnimalCount && defaultAverageWeight 
                          ? formatNumberWithCommas(+(((defaultAnimalCount * defaultAverageWeight) / 1000000).toFixed(3)))
                          : 'N/D'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Peso totale */}
        <div>
          <label className="block text-sm font-medium mb-1">Peso totale della cesta (kg)</label>
          <Input
            type="number"
            step="0.001"
            min="0"
            placeholder="Inserisci il peso in kg"
            value={formData.totalWeight}
            onChange={(e) => handleChange('totalWeight', e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Inserisci il peso totale in kilogrammi (kg)
          </p>
        </div>
        
        {/* Risultati calcolati */}
        {formData.totalWeight && formData.animalsPerKg && (
          <PesoOperationResults
            currentOperation={{
              formData: {
                animalsPerKg: formData.animalsPerKg,
                averageWeight: formData.averageWeight,
                animalCount: formData.animalCount,
                totalWeight: parseFloat(formData.totalWeight)
              }
            }}
            previousOperationData={previousOperationData}
          />
        )}
        
        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <Textarea
            placeholder="Note opzionali sull'operazione"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="h-20"
          />
        </div>
      </div>
      
      {/* Pulsanti azione */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button 
          disabled={!isFormValid} 
          onClick={handleSubmit}
        >
          Salva
        </Button>
      </div>
    </div>
  );
}