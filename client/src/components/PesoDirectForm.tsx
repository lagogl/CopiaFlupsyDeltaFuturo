import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { PesoOperationResults } from '@/components/peso/PesoOperationResults';
import { createDirectOperation } from '@/lib/operations';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Funzione per formattare le date in formato italiano
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: it });
  } catch (e) {
    console.error("Errore nel formato della data:", dateString, e);
    return dateString;
  }
};

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
  
  // Determina la data minima (ultima operazione + 1 giorno)
  let minDate = today;
  if (lastOperationDate) {
    const lastOpDate = new Date(lastOperationDate);
    const nextDay = new Date(lastOpDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Se la data successiva all'ultima operazione è nel passato, è valida
    if (nextDay <= today) {
      minDate = nextDay;
    }
  }
  
  // Genera un array di date consentite (dalla minima a oggi)
  const allowedDates: {value: string, label: string}[] = [];
  const currentDate = new Date(minDate);
  
  while (currentDate <= today) {
    const dateValue = format(currentDate, 'yyyy-MM-dd');
    const dateLabel = format(currentDate, 'dd/MM/yyyy');
    allowedDates.push({
      value: dateValue,
      label: dateLabel
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Stato per il form
  const [formData, setFormData] = useState({
    date: format(today, 'yyyy-MM-dd'), // Default alla data odierna
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
    
    // Verifica se il form è valido (solo per abilitare il pulsante Salva)
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
      // Valida la data prima di procedere
      const selectedDate = new Date(formData.date + 'T12:00:00');
      
      // Determina la data minima (ultima operazione + 1 giorno)
      let minDate = new Date();
      if (lastOperationDate) {
        const lastOpDate = new Date(lastOperationDate);
        const nextDay = new Date(lastOpDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Se la data successiva all'ultima operazione è anteriore ad oggi, è la data minima
        if (nextDay <= new Date()) {
          minDate = nextDay;
        }
      }
      
      // Confronta la data selezionata con minDate
      if (selectedDate < minDate) {
        toast({
          variant: "destructive",
          title: "Data non valida",
          description: `La data deve essere successiva all'ultima operazione (${format(minDate, 'dd/MM/yyyy')}).`,
        });
        return;
      }
      
      // Rimuovere la validazione delle date future come richiesto
      
      // Prepara l'oggetto operazione
      const operationData = {
        type: 'peso',
        date: selectedDate.toISOString(), // Usa la data validata
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
      
      // Invia al server usando la route diretta per bypassare i controlli di una operazione al giorno
      // Questo evita l'errore "Per ogni cesta è consentita una sola operazione al giorno"
      await createDirectOperation(operationData);
      
      // Mostra notifica
      toast({
        title: "Operazione registrata",
        description: `Operazione di peso registrata per la cesta #${basketNumber}`,
      });
      
      // Callback di successo
      onSuccess();
    } catch (error: any) {
      console.error('Errore durante la registrazione dell\'operazione:', error);
      
      // Log dettagliato dell'errore per il debug
      console.log('Dettagli errore:', {
        error,
        response: error.response,
        data: error.response?.data,
        statusCode: error.response?.status
      });
      
      // Controlla se l'errore contiene un messaggio dal server
      if (error.response?.data?.error || error.response?.data?.message) {
        const errorMessage = error.response.data.error || error.response.data.message;
        
        // Gestisci il caso specifico di operazione doppia nella stessa giornata
        if (errorMessage.includes("Non è possibile registrare più di un'operazione al giorno") || 
            errorMessage.includes("Esiste già un'operazione")) {
          toast({
            variant: "destructive",
            title: "Data già utilizzata",
            description: "Per ogni cesta è consentita una sola operazione al giorno. Per la data selezionata esiste già un'operazione. Seleziona una data differente.",
          });
        } else {
          // Altri errori dal server
          toast({
            variant: "destructive",
            title: "Errore server",
            description: errorMessage,
          });
        }
      } else {
        // Errore generico
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Si è verificato un errore durante la registrazione dell'operazione.",
        });
      }
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
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-700">
              <strong>Cesta:</strong> #{basketNumber} {lottoInfo && `- ${lottoInfo}`}
            </p>
            {lastOperationDate && (
              <span className="text-xs text-blue-600 font-normal">
                Ultima op: {formatDate(lastOperationDate)}
              </span>
            )}
          </div>
        </div>
      
        {/* Data operazione */}
        <div>
          <label className="block text-sm font-medium mb-1">Data operazione</label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Data dell'operazione (deve essere successiva all'ultima operazione)
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