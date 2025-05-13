import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { createDirectOperation } from '@/lib/operations';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import GrowthPerformanceIndicator from '@/components/GrowthPerformanceIndicator';
import { Scale, Ruler } from 'lucide-react';

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
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: it });
  } catch (e) {
    console.error("Errore nel formato della data:", dateString, e);
    return dateString;
  }
};

export default function MisurazioneDirectFormFixed({
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
  // Query per ottenere i dati dell'ultima operazione completa in questo ciclo
  const { data: cycleOperations } = useQuery({
    queryKey: ['/api/operations', { cycleId }],
    enabled: !!cycleId
  });
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(sizeId);
  const [calculatedSize, setCalculatedSize] = useState<{id: number; code: string} | null>(null);
  
  // Dati del campione
  const [operationDate, setOperationDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [sampleWeight, setSampleWeight] = useState<number | null>(null);
  const [animalsCount, setAnimalsCount] = useState<number | null>(null);
  const [samplePercentage, setSamplePercentage] = useState<number>(10);
  const [deadCount, setDeadCount] = useState<number | null>(null);
  const [totalWeight, setTotalWeight] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  // Valori calcolati (inizializzati direttamente, senza dipendere da stato)
  const [animalsPerKg, setAnimalsPerKg] = useState<number | null>(null);
  const [averageWeight, setAverageWeight] = useState<number | null>(null);
  const [totalPopulation, setTotalPopulation] = useState<number | null>(null);
  const [mortalityRate, setMortalityRate] = useState<number | null>(null);
  const [totalDeadCount, setTotalDeadCount] = useState<number | null>(null);
  const [calculatedTotalWeight, setCalculatedTotalWeight] = useState<number | null>(null);
  
  // Recupera gli SGR per il calcolo delle performance
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgr'],
  });
  
  // Recupera le taglie per mostrare quella calcolata automaticamente in base al peso medio
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Aggiorna la taglia calcolata quando cambia il peso medio o gli animali per kg
  useEffect(() => {
    if (averageWeight && animalsPerKg && sizes && sizes.length > 0) {
      // Trova la taglia appropriata in base agli animali per kg
      const matchingSize = sizes.find((size: any) => {
        const minAnimalsPerKg = size.minAnimalsPerKg || 0;
        const maxAnimalsPerKg = size.maxAnimalsPerKg || Infinity;
        return animalsPerKg >= minAnimalsPerKg && animalsPerKg <= maxAnimalsPerKg;
      });
      
      if (matchingSize) {
        setCalculatedSize({
          id: matchingSize.id,
          code: matchingSize.code
        });
        
        // Suggerisci la taglia calcolata come valore selezionato
        // ma solo se l'utente non ha ancora selezionato manualmente una taglia
        if (!selectedSizeId) {
          setSelectedSizeId(matchingSize.id);
        }
      }
    }
  }, [averageWeight, animalsPerKg, sizes, selectedSizeId]);
  
  // Prepara i dati per l'indicatore di crescita
  const prepareGrowthData = () => {
    if (!defaultAverageWeight || 
        !averageWeight || 
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
    const prevAvgWeight = defaultAverageWeight;
    const currAvgWeight = averageWeight;
    const actualGrowthPercent = ((currAvgWeight - prevAvgWeight) / prevAvgWeight) * 100;
    
    // Ottieni il mese per SGR
    const month = format(lastDate, 'MMMM', { locale: it }).toLowerCase();
    const sgrData = sgrs.find((sgr: any) => sgr.month.toLowerCase() === month);
    
    if (!sgrData) return null;
    
    // Calcola crescita attesa (SGR del mese × giorni)
    const dailyPercentage = sgrData.percentage / 30; // Converte in crescita giornaliera approssimativa
    const expectedPercentage = dailyPercentage * daysDiff;
    
    // Calcola variazione rispetto all'atteso
    const variation = actualGrowthPercent - expectedPercentage;
    
    return {
      actualGrowth: actualGrowthPercent,
      expectedGrowth: expectedPercentage,
      variation: variation,
      days: daysDiff,
      month: month,
      sgrPercentage: sgrData.percentage
    };
  };
  
  // Calcola i valori basati sui dati del campione
  const calculateValues = () => {
    if (sampleWeight && animalsCount && sampleWeight > 0 && animalsCount > 0) {
      // Calcolo animali per kg
      const newAnimalsPerKg = Math.round((animalsCount / sampleWeight) * 1000);
      
      // Calcolo peso medio in mg con 4 decimali di precisione
      const newAverageWeight = newAnimalsPerKg > 0 
        ? parseFloat((1000000 / newAnimalsPerKg).toFixed(4)) 
        : 0;
      
      // Calcolo popolazione totale
      const newTotalPopulation = Math.round(animalsCount / (samplePercentage / 100));
      
      // Calcolo del peso totale in kg (se totalWeight è stato inserito manualmente, usiamo quello)
      let newCalculatedTotalWeight = null;
      let newCalculatedTotalPopulation = null;
      
      if (totalWeight !== null && totalWeight > 0) {
        // Usa il peso totale inserito manualmente
        newCalculatedTotalWeight = totalWeight;
        
        // Ricalcola la popolazione sulla base del peso totale e animali per kg
        if (newAnimalsPerKg) {
          newCalculatedTotalPopulation = Math.round(newAnimalsPerKg * totalWeight);
        }
      } else if (newTotalPopulation && newAnimalsPerKg) {
        // Calcola il peso totale in base a popolazione e animali per kg
        newCalculatedTotalWeight = Math.round((newTotalPopulation / newAnimalsPerKg) * 10) / 10;
        newCalculatedTotalPopulation = newTotalPopulation;
      }
      
      // Calcolo mortalità
      let newMortalityRate = null;
      let newTotalDeadCount = null;
      
      if (deadCount !== null && deadCount >= 0 && newTotalPopulation > 0) {
        // Se il deadCount è relativo al campione, calcoliamo il valore totale
        newTotalDeadCount = samplePercentage < 100 
          ? Math.round(deadCount / (samplePercentage / 100)) 
          : deadCount;
        
        // Calcoliamo la percentuale di mortalità
        newMortalityRate = (newTotalDeadCount / (newTotalPopulation + newTotalDeadCount)) * 100;
        newMortalityRate = Math.round(newMortalityRate * 10) / 10; // Arrotondiamo a una cifra decimale
      }
      
      // Aggiorna gli stati con i nuovi valori calcolati
      setAnimalsPerKg(newAnimalsPerKg);
      setAverageWeight(newAverageWeight);
      setTotalPopulation(newCalculatedTotalPopulation || newTotalPopulation);
      setMortalityRate(newMortalityRate);
      setTotalDeadCount(newTotalDeadCount);
      setCalculatedTotalWeight(newCalculatedTotalWeight);
      
      // Restituisci i valori calcolati come oggetto
      return {
        animalsPerKg: newAnimalsPerKg,
        averageWeight: newAverageWeight,
        totalPopulation: newCalculatedTotalPopulation || newTotalPopulation,
        mortalityRate: newMortalityRate,
        totalDeadCount: newTotalDeadCount,
        totalWeight: newCalculatedTotalWeight
      };
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
    const result = calculateValues();
    
    // Se non ci sono risultati, esci
    if (!result) {
      return;
    }
    
    // Estrai i valori calcolati
    const { animalsPerKg, averageWeight, totalDeadCount, mortalityRate, totalPopulation, totalWeight: calculatedTotalWeight } = result;
    
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
      // LOGICA MISURAZIONE: Scegliamo conteggio animali in base alla mortalità
      const determineAnimalCount = () => {
        // Se abbiamo registrato mortalità, usiamo il valore calcolato da popolazione - mortalità
        if (deadCount !== null && deadCount > 0 && totalPopulation) {
          toast({
            title: "Mortalità rilevata",
            description: "Poiché è stata registrata mortalità, il conteggio animali è stato aggiornato.",
            variant: "default"
          });
          return totalPopulation;
        }
        
        // Altrimenti, se esiste un conteggio precedente, lo conserviamo
        if (defaultAnimalCount) {
          toast({
            title: "Conservazione conteggio animali",
            description: "Nessuna mortalità rilevata, il conteggio animali precedente è stato conservato.",
            variant: "default"
          });
          return defaultAnimalCount;
        }
        
        // Se non abbiamo né mortalità né conteggio precedente, usiamo quello calcolato
        return totalPopulation;
      };
      
      // Prepara i dati dell'operazione
      const operationData = {
        type: 'misura',
        date: operationDate,
        basketId,
        cycleId,
        sizeId: selectedSizeId,
        lotId,
        animalCount: determineAnimalCount(),
        totalWeight: calculatedTotalWeight ? calculatedTotalWeight * 1000 : null, // Converte in grammi
        animalsPerKg,
        averageWeight, // Valore in mg
        deadCount: totalDeadCount,
        mortalityRate,
        notes
      };
      
      // Salva l'operazione tramite API diretta
      const response = await createDirectOperation(operationData);
      
      toast({
        title: "Operazione salvata",
        description: "L'operazione di misurazione è stata registrata con successo.",
        variant: "success"
      });
      
      onSuccess();
    } catch (error) {
      console.error("Errore nel salvataggio dell'operazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dell'operazione. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effetto per il calcolo automatico al cambio dei valori
  useEffect(() => {
    if (sampleWeight > 0 && animalsCount > 0) {
      calculateValues();
    }
  }, [sampleWeight, animalsCount, samplePercentage, deadCount, totalWeight]);
  
  // Gestisce l'invio del form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };
  
  // Ottieni i dati per la visualizzazione dell'indicatore di crescita
  const growthData = prepareGrowthData();
  
  // Trova l'ultima operazione nel ciclo (escluso prima-attivazione)
  const lastCycleOperation = Array.isArray(cycleOperations) 
    ? cycleOperations
        .filter((op: any) => op.cycleId === cycleId && op.type !== 'prima-attivazione')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
    
  // Trova l'operazione di prima attivazione per questo ciclo
  const firstActivation = Array.isArray(cycleOperations)
    ? cycleOperations
        .filter((op: any) => op.cycleId === cycleId && op.type === 'prima-attivazione')
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;
    
  // Operazione da mostrare come riferimento (l'ultima o la prima attivazione se non ci sono altre)
  const referenceOperation = lastCycleOperation || firstActivation;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-bold flex items-center mb-4">
        <Ruler className="mr-2" />
        Misurazione Cesta #{basketNumber}
      </h2>
      
      {lottoInfo && (
        <div className="mb-4 text-sm bg-blue-50 p-2 rounded-lg">
          <span className="font-semibold">Lotto:</span> {lottoInfo}
        </div>
      )}
      
      {referenceOperation && (
        <div className="mb-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
          <h3 className="font-medium text-slate-700 mb-2">Ultima operazione del ciclo</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Data:</span>
              <span className="font-medium">{formatDate(referenceOperation.date)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Tipo:</span>
              <span className="font-medium capitalize">{referenceOperation.type}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Taglia:</span>
              <span className="font-medium">{referenceOperation.size?.code || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Peso medio (mg):</span>
              <span className="font-medium">{referenceOperation.averageWeight ? formatNumberWithCommas(referenceOperation.averageWeight) : '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Animali/kg:</span>
              <span className="font-medium">{referenceOperation.animalsPerKg ? formatNumberWithCommas(referenceOperation.animalsPerKg) : '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Popolazione:</span>
              <span className="font-medium">{referenceOperation.animalCount ? formatNumberWithCommas(referenceOperation.animalCount) : '-'}</span>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <Input 
                type="date" 
                value={operationDate} 
                onChange={(e) => setOperationDate(e.target.value)}
                className="w-full" 
              />
              {lastOperationDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Ultima operazione: {formatDate(lastOperationDate)}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Taglia</label>
              <select 
                className="w-full p-2 border rounded-md" 
                value={selectedSizeId || ''} 
                onChange={(e) => setSelectedSizeId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Seleziona taglia</option>
                {sizes && sizes.map((size: any) => (
                  <option key={size.id} value={size.id}>
                    {size.code} - {size.name}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <p className="text-xs text-indigo-700 mt-1">
                  Nell'operazione <strong>misura</strong>, puoi scegliere manualmente la taglia più adatta.
                  {calculatedSize && averageWeight && (
                    <span className="block mt-1">
                      In base al peso medio calcolato di <strong>{averageWeight?.toFixed(4)} mg</strong>, 
                      il sistema suggerisce la taglia <strong className="text-indigo-600">{calculatedSize.code}</strong>, 
                      ma puoi modificarla in base alle tue osservazioni.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Peso campione (g)</label>
              <Input 
                type="number" 
                step="0.1"
                min="0"
                value={sampleWeight || ''} 
                onChange={(e) => setSampleWeight(e.target.value ? parseFloat(e.target.value) : null)} 
                className="w-full"
                placeholder="Peso in grammi" 
              />
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">N° animali (campione)</label>
                <Input 
                  type="number" 
                  min="0"
                  value={animalsCount || ''} 
                  onChange={(e) => setAnimalsCount(e.target.value ? parseInt(e.target.value) : null)} 
                  className="w-full"
                  placeholder="N° animali" 
                />
              </div>
              
              <div className="w-24">
                <label className="block text-sm font-medium mb-1">% campione</label>
                <Input 
                  type="number" 
                  min="1"
                  max="100"
                  value={samplePercentage} 
                  onChange={(e) => setSamplePercentage(parseInt(e.target.value) || 10)} 
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Mortalità (campione)</label>
              <Input 
                type="number" 
                min="0"
                value={deadCount !== null ? deadCount : ''} 
                onChange={(e) => setDeadCount(e.target.value ? parseInt(e.target.value) : null)} 
                className="w-full" 
                placeholder="N° morti (opzionale)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Peso totale (kg) - Opzionale</label>
              <Input 
                type="number" 
                step="0.1"
                min="0"
                value={totalWeight !== null ? totalWeight : ''} 
                onChange={(e) => setTotalWeight(e.target.value ? parseFloat(e.target.value) : null)} 
                className="w-full"
                placeholder="Peso in kg (opzionale)" 
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center">
            <Scale className="mr-2 h-4 w-4" />
            Valori calcolati
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500">Animali/kg</label>
              <div className={`font-semibold text-md ${animalsPerKg && animalsPerKg > 32000 ? 'text-green-600 flex items-center' : ''}`}>
                {animalsPerKg ? formatNumberWithCommas(animalsPerKg) : '-'}
                {animalsPerKg && animalsPerKg > 32000 && 
                 <span className="ml-1 text-xs">(ottimale)</span>}
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500">Peso medio (mg)</label>
              <div className="font-semibold">
                {averageWeight ? formatNumberWithCommas(averageWeight) : '-'}
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500">Popolazione totale</label>
              <div className="font-semibold">
                {totalPopulation ? formatNumberWithCommas(totalPopulation) : '-'}
              </div>
            </div>
            
            {calculatedTotalWeight && (
              <div>
                <label className="block text-xs text-gray-500">Peso totale (kg)</label>
                <div className="font-semibold">
                  {calculatedTotalWeight}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs text-gray-500">Mortalità (%)</label>
              <div className="font-semibold">
                  {mortalityRate !== null ? `${mortalityRate}%` : '-'}
              </div>
            </div>
          </div>
          
          {/* Indicatore di crescita */}
          {growthData && defaultAverageWeight && (
            <div className="mt-4">
              <GrowthPerformanceIndicator 
                data={growthData}
                previousWeight={defaultAverageWeight}
                currentWeight={averageWeight || 0}
              />
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Note</label>
          <Textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            className="w-full h-24" 
            placeholder="Note sull'operazione (opzionale)"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </form>
    </div>
  );
}