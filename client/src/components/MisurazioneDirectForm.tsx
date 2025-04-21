import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface MisurazioneDirectFormProps {
  basketId: number;
  cycleId: number;
  sizeId: number | null;
  lotId?: number | null;
  lottoInfo?: string | null; // Informazioni sul lotto in formato leggibile
  basketNumber?: number; // Numero fisico della cesta
  defaultAnimalsPerKg?: number | null;
  defaultAverageWeight?: number | null;
  defaultAnimalCount?: number | null;
  lastOperationDate?: string | null; // Data dell'ultima operazione per verificare la validità della nuova data
  onSuccess: () => void;
  onCancel: () => void;
}

// Funzione per formattare le date in formato italiano
const formatDate = (dateString: string) => {
  try {
    console.log("Data originale ricevuta:", dateString);
    const date = new Date(dateString);
    console.log("Data convertita:", date);
    const formattedDate = format(date, 'dd/MM/yyyy', { locale: it });
    console.log("Data formattata:", formattedDate);
    return formattedDate;
  } catch (e) {
    console.error("Errore nel formato della data:", dateString, e);
    return dateString;
  }
};

export default function MisurazioneDirectForm({
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
}: MisurazioneDirectFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Valori di input del campione
  const [operationDate, setOperationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sampleWeight, setSampleWeight] = useState<number | null>(null);
  const [animalsCount, setAnimalsCount] = useState<number | null>(null);
  const [samplePercentage, setSamplePercentage] = useState<number>(100);
  const [deadCount, setDeadCount] = useState<number | null>(null);
  const [totalWeight, setTotalWeight] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  // Valori calcolati
  const [calculatedValues, setCalculatedValues] = useState<{
    animalsPerKg: number | null;
    averageWeight: number | null;
    totalPopulation: number | null;
    mortalityRate: number | null;
    totalDeadCount: number | null;
    totalWeight: number | null;
  }>({
    animalsPerKg: null,
    averageWeight: null,
    totalPopulation: null,
    mortalityRate: null,
    totalDeadCount: null,
    totalWeight: null
  });
  
  // Calcola i valori basati sui dati del campione
  const calculateValues = () => {
    if (sampleWeight && animalsCount && sampleWeight > 0 && animalsCount > 0) {
      // Calcolo animali per kg
      const animalsPerKg = Math.round((animalsCount / sampleWeight) * 1000);
      
      // Calcolo peso medio in mg
      const averageWeight = animalsPerKg > 0 ? Math.round((1000000 / animalsPerKg) * 100) / 100 : 0;
      
      // Calcolo popolazione totale
      const totalPopulation = Math.round(animalsCount / (samplePercentage / 100));
      
      // Calcolo del peso totale in kg (se totalWeight è stato inserito manualmente, usiamo quello)
      let calculatedTotalWeight = null;
      let calculatedTotalPopulation = null;
      
      if (totalWeight !== null && totalWeight > 0) {
        // Usa il peso totale inserito manualmente
        calculatedTotalWeight = totalWeight;
        
        // Ricalcola la popolazione sulla base del peso totale e animali per kg
        if (animalsPerKg) {
          calculatedTotalPopulation = Math.round(animalsPerKg * totalWeight);
        }
      } else if (totalPopulation && animalsPerKg) {
        // Calcola il peso totale in base a popolazione e animali per kg
        calculatedTotalWeight = Math.round((totalPopulation / animalsPerKg) * 10) / 10;
        calculatedTotalPopulation = totalPopulation;
      }
      
      // Calcolo mortalità
      let mortalityRate = null;
      let totalDeadCount = null;
      
      if (deadCount !== null && deadCount >= 0 && totalPopulation > 0) {
        // Se il deadCount è relativo al campione, calcoliamo il valore totale
        totalDeadCount = samplePercentage < 100 
          ? Math.round(deadCount / (samplePercentage / 100)) 
          : deadCount;
        
        // Calcoliamo la percentuale di mortalità
        mortalityRate = (totalDeadCount / (totalPopulation + totalDeadCount)) * 100;
        mortalityRate = Math.round(mortalityRate * 10) / 10; // Arrotondiamo a una cifra decimale
      }
      
      setCalculatedValues({
        animalsPerKg,
        averageWeight,
        totalPopulation: calculatedTotalPopulation || totalPopulation,
        mortalityRate,
        totalDeadCount,
        totalWeight: calculatedTotalWeight
      });
      
      return true;
    }
    
    toast({
      title: "Dati insufficienti",
      description: "Inserisci peso del campione e numero di animali per calcolare i valori",
      variant: "destructive"
    });
    
    return false;
  };
  
  // Gestisce il salvataggio dell'operazione
  const handleSave = async () => {
    // Calcola i valori prima del salvataggio
    if (!calculateValues()) {
      return;
    }
    
    const { animalsPerKg, averageWeight, totalDeadCount, mortalityRate, totalPopulation, totalWeight } = calculatedValues;
    
    if (!animalsPerKg || !averageWeight) {
      toast({
        title: "Dati mancanti",
        description: "I valori calcolati non sono validi. Ricontrolla i dati inseriti.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Calcola animalCount in base ad animalsPerKg e totalWeight
      let animalCount = totalPopulation || defaultAnimalCount;
      
      // Se abbiamo sia il peso totale che gli animali per kg, calcoliamo la popolazione totale
      if (totalWeight && animalsPerKg) {
        animalCount = Math.round(animalsPerKg * totalWeight);
      }
      
      // Converti il peso totale da kg a grammi per il salvataggio nel database
      const totalWeightInGrams = totalWeight ? Math.round(totalWeight * 1000) : null;
      
      // Verifica validità data
      if (lastOperationDate) {
        const lastDate = new Date(lastOperationDate);
        const selectedDate = new Date(operationDate);
        
        if (selectedDate < lastDate) {
          toast({
            variant: "destructive",
            title: "Data non valida",
            description: "La data dell'operazione deve essere successiva all'ultima operazione registrata per questa cesta.",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Prepara i dati dell'operazione
      const operationData = {
        type: 'misura',
        date: new Date(`${operationDate}T10:00:00.000Z`).toISOString(), // Impostiamo un orario fisso (mezzogiorno)
        basketId,
        cycleId,
        sizeId,
        lotId,  // Preserviamo il lotto
        sgrId: null,  // Opzionale
        animalsPerKg,
        averageWeight,
        animalCount, // Popolazione calcolata in base a totalWeight * animalsPerKg
        totalWeight: totalWeightInGrams, // Salva il peso totale in grammi
        deadCount: totalDeadCount,
        mortalityRate,
        notes
      };
      
      console.log("Salvataggio misurazione con dati:", operationData);
      
      // Chiama l'API per salvare l'operazione
      const response = await apiRequest({
        url: '/api/operations',
        method: 'POST',
        body: operationData
      });
      
      if (response.ok) {
        toast({
          title: "Operazione salvata",
          description: "La misurazione è stata registrata con successo"
        });
        
        onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante il salvataggio dell'operazione");
      }
    } catch (error: any) {
      console.error("Errore durante il salvataggio:", error);
      
      // Controlla se l'errore contiene un messaggio dal server
      if (error.message && error.message.includes("Non è possibile registrare più di un'operazione al giorno")) {
        toast({
          variant: "destructive",
          title: "Data già utilizzata",
          description: "Per ogni cesta è consentita una sola operazione al giorno. Per la data selezionata esiste già un'operazione. Seleziona una data differente.",
        });
      } else {
        // Errore generico
        toast({
          title: "Errore",
          description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <h3 className="text-lg font-semibold">Nuova Misurazione</h3>
        
        {/* Mostra informazioni sulla cesta e ultima misurazione */}
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center justify-between">
            <span>Informazioni sulla cesta:</span>
            {lastOperationDate && (
              <span className="text-xs text-blue-600 font-normal">
                Ultima op: {formatDate(lastOperationDate)}
              </span>
            )}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-blue-600 font-medium">Cesta #:</span> {basketNumber}
            </div>
            {lottoInfo && (
              <div>
                <span className="text-blue-600 font-medium">Lotto:</span> {lottoInfo}
              </div>
            )}
          </div>
          
          {(defaultAnimalsPerKg || defaultAverageWeight || defaultAnimalCount) && (
            <>
              <h4 className="text-sm font-medium text-blue-800 mb-2">Ultima misurazione:</h4>
              
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {defaultAnimalsPerKg && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Animali/kg:</span>
                    <span className="font-semibold">{formatNumberWithCommas(defaultAnimalsPerKg)}</span>
                  </div>
                )}
                
                {defaultAverageWeight && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Peso medio:</span>
                    <span className="font-semibold">{formatNumberWithCommas(defaultAverageWeight)} mg</span>
                  </div>
                )}
                
                {defaultAnimalCount && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Popolazione:</span>
                    <span className="font-semibold">{formatNumberWithCommas(defaultAnimalCount)}</span>
                  </div>
                )}
                
                {/* Nuovi dati aggiuntivi */}
                {defaultAverageWeight && defaultAnimalsPerKg && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Taglia approssimativa:</span>
                    <span className="font-semibold">
                      {defaultAnimalsPerKg > 32000 ? 'TP-3000 (superata)' : 
                       defaultAnimalsPerKg > 19000 ? 'TP-3000' :
                       defaultAnimalsPerKg > 12000 ? 'TP-2000' :
                       defaultAnimalsPerKg > 8000 ? 'TP-1500' :
                       defaultAnimalsPerKg > 5000 ? 'TP-1000' :
                       defaultAnimalsPerKg > 3000 ? 'TP-750' :
                       defaultAnimalsPerKg > 2000 ? 'TP-500' : 'N/D'}
                    </span>
                  </div>
                )}
                
                {/* Calcolo stima peso totale basato sugli ultimi dati */}
                {defaultAnimalCount && defaultAnimalsPerKg && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Peso totale stimato:</span>
                    <span className="font-semibold">
                      {formatNumberWithCommas(Math.round((defaultAnimalCount / defaultAnimalsPerKg) * 100) / 100)} kg
                    </span>
                  </div>
                )}
                
                {/* Target prossima crescita */}
                {defaultAverageWeight && (
                  <div className="flex flex-col border-t border-blue-100 mt-1 pt-1 col-span-2">
                    <span className="text-blue-600 font-medium text-xs">Target prossima crescita:</span>
                    <span className="font-semibold flex items-center">
                      <span className="mr-2">{formatNumberWithCommas(Math.round(defaultAverageWeight * 1.1))} mg</span>
                      <span className="text-xs text-emerald-600">(+10%)</span>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Data operazione */}
          <div>
            <label className="block text-sm font-medium mb-1">Data operazione</label>
            <Input
              type="date"
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">
              Data dell'operazione (deve essere successiva all'ultima operazione)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso del campione (g)</label>
              <Input 
                type="number" 
                placeholder="Peso in grammi"
                step="0.1"
                value={sampleWeight?.toString() || ''}
                onChange={e => setSampleWeight(parseFloat(e.target.value) || null)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Peso totale degli animali nel campione
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numero animali contati</label>
              <Input 
                type="number" 
                placeholder="Conteggio animali"
                value={animalsCount?.toString() || ''}
                onChange={e => setAnimalsCount(parseInt(e.target.value) || null)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Numero di esemplari contati nel campione
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso totale della cesta (kg)</label>
              <Input 
                type="number" 
                placeholder="Peso totale in kg"
                step="0.1"
                value={totalWeight?.toString() || ''}
                onChange={e => setTotalWeight(parseFloat(e.target.value) || null)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Peso totale degli animali nella cesta (opzionale)
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Dimensione campione (%)</label>
            <div className="flex items-center space-x-2">
              <Input 
                type="number" 
                min="1"
                max="100"
                value={samplePercentage.toString()}
                onChange={e => setSamplePercentage(parseInt(e.target.value) || 100)}
                className="flex-1 h-9"
              />
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSamplePercentage(10)}
                  className="h-9 px-2 py-0"
                >
                  10%
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSamplePercentage(25)}
                  className="h-9 px-2 py-0"
                >
                  25%
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSamplePercentage(50)}
                  className="h-9 px-2 py-0"
                >
                  50%
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentuale della popolazione totale rappresentata dal campione
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Numero animali morti</label>
            <Input 
              type="number" 
              placeholder="N. morti"
              value={deadCount?.toString() || ''}
              onChange={e => setDeadCount(parseInt(e.target.value) || null)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Numero di animali morti trovati nel campione o nell'intera cesta
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <Textarea 
              placeholder="Note opzionali sull'operazione"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-20"
            />
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={calculateValues} 
              type="button" 
              variant="outline" 
              size="sm"
            >
              Calcola
            </Button>
          </div>
        </div>
        
        {/* Risultati del calcolo */}
        <div className="bg-muted/30 p-4 rounded-md space-y-2 border mt-4">
          <h4 className="text-sm font-medium mb-2">Risultati del calcolo:</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground">Animali/kg:</label>
              <div className="font-semibold text-md">
                {calculatedValues.animalsPerKg ? formatNumberWithCommas(calculatedValues.animalsPerKg) : '-'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">Peso medio (mg):</label>
              <div className="font-semibold text-md">
                {calculatedValues.averageWeight ? formatNumberWithCommas(calculatedValues.averageWeight) : '-'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground">Popolazione stimata:</label>
              <div className="font-semibold text-md">
                {calculatedValues.totalPopulation ? formatNumberWithCommas(calculatedValues.totalPopulation) : '-'}
              </div>
            </div>
            {calculatedValues.totalWeight && (
              <div>
                <label className="block text-xs text-muted-foreground">Peso totale stimato (kg):</label>
                <div className="font-semibold text-md">
                  {calculatedValues.totalWeight}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {deadCount !== null && deadCount > 0 && (
              <div>
                <label className="block text-xs text-muted-foreground">Tasso di mortalità:</label>
                <div className="font-semibold text-md">
                  {calculatedValues.mortalityRate !== null ? `${calculatedValues.mortalityRate}%` : '-'}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Salvataggio...
              </>
            ) : "Salva Misurazione"}
          </Button>
        </div>
      </div>
    </div>
  );
}