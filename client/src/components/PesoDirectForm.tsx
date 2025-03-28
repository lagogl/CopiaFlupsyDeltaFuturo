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
  
  // Calcola le date
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Se c'è un'ultima operazione, calcola minDate come il giorno successivo
  let minDate = new Date();
  let minDateStr = todayStr;
  if (lastOperationDate) {
    // Converti la data dell'ultima operazione in oggetto Date
    const lastOpDate = new Date(lastOperationDate);
    // Aggiungi un giorno
    minDate = new Date(lastOpDate.getTime() + 86400000); // +1 giorno in millisecondi
    // Se minDate è nel futuro, usa oggi come data minima
    if (minDate > today) {
      minDate = today;
    }
    minDateStr = format(minDate, 'yyyy-MM-dd');
  }
  
  // Determina la data iniziale (oggi o minima consentita)
  const initialDate = minDateStr <= todayStr ? todayStr : minDateStr;
  
  // Stato per il form
  const [formData, setFormData] = useState({
    date: initialDate,
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
    console.log(`Cambiamento del campo ${field} al valore:`, value);
    
    // Crea una copia dello stato attuale
    const updatedFormData = { ...formData, [field]: value };
    
    // Se stiamo aggiornando la data, verifica che sia valida
    if (field === 'date') {
      // Controlla che la data sia nel formato corretto yyyy-MM-dd
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        console.warn('Formato data non valido:', value);
        return; // Non aggiornare lo stato con una data non valida
      }
      
      // Verifica che la data sia compresa tra minDate e today
      const selectedDate = new Date(value + 'T12:00:00');
      const minDateObj = new Date(minDateStr + 'T12:00:00');
      const todayObj = new Date(todayStr + 'T12:00:00');
      
      if (selectedDate < minDateObj) {
        console.warn('Data selezionata precedente alla data minima consentita');
        // Usa la data minima invece
        updatedFormData.date = minDateStr;
      } else if (selectedDate > todayObj) {
        console.warn('Data selezionata successiva alla data odierna');
        // Usa la data odierna invece
        updatedFormData.date = todayStr;
      }
    }
    
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
    console.log('Form data aggiornato:', updatedFormData);
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
          <div className="relative">
            <Input
              type="date"
              id="operation-date"
              value={formData.date}
              min={minDateStr}
              max={todayStr}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full"
              onFocus={(e) => {
                // Assicuriamoci che il campo sia editabile quando riceve il focus
                const input = e.target;
                // A volte è necessario un breve timeout per garantire l'accesso
                setTimeout(() => {
                  try {
                    input.showPicker();
                  } catch (err) {
                    console.log('Picker non supportato in questo browser');
                  }
                }, 100);
              }}
            />
            <div className="absolute right-2 top-2">
              <button 
                type="button"
                onClick={() => {
                  const input = document.getElementById('operation-date') as HTMLInputElement;
                  if (input) {
                    try {
                      input.showPicker();
                    } catch (err) {
                      console.log('Picker non supportato in questo browser');
                      // Fallback: focus standard
                      input.focus();
                    }
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            </div>
          </div>
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