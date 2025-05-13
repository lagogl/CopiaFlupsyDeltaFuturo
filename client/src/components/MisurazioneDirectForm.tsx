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
import { Scale, RulerMeasure } from 'lucide-react';

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
    // Rimuoviamo i log di debug
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: it });
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
  
  // Stato per la taglia calcolata automaticamente
  const [calculatedSize, setCalculatedSize] = useState<{ id: number, code: string } | null>(null);
  
  // Recupera i dati SGR per calcolare la crescita attesa
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgr'],
    enabled: !!lastOperationDate // Abilita la query solo se abbiamo la data dell'ultima operazione
  });
  
  // Recupera le taglie per mostrare quella calcolata automaticamente in base al peso medio
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Aggiorna la taglia calcolata quando cambia il peso medio o gli animali per kg
  useEffect(() => {
    if (calculatedValues?.averageWeight && calculatedValues?.animalsPerKg && sizes && sizes.length > 0) {
      // Trova la taglia appropriata in base agli animali per kg
      const matchingSize = sizes.find((size: any) => {
        const minAnimalsPerKg = size.minAnimalsPerKg || 0;
        const maxAnimalsPerKg = size.maxAnimalsPerKg || Infinity;
        const animalsPerKg = calculatedValues.animalsPerKg || 0;
        return animalsPerKg >= minAnimalsPerKg && animalsPerKg <= maxAnimalsPerKg;
      });
      
      if (matchingSize) {
        setCalculatedSize({
          id: matchingSize.id,
          code: matchingSize.code
        });
      }
    }
  }, [calculatedValues?.averageWeight, calculatedValues?.animalsPerKg, sizes]);
  
  // Prepara i dati per l'indicatore di crescita
  const prepareGrowthData = () => {
    if (!defaultAverageWeight || 
        !calculatedValues.averageWeight || 
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
    const currAvgWeight = calculatedValues.averageWeight;
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
  };
  
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
      
      // Calcolo peso medio in mg con 4 decimali di precisione
      const averageWeight = animalsPerKg > 0 
        ? parseFloat((1000000 / animalsPerKg).toFixed(4)) 
        : 0;
      
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
      // NUOVA LOGICA: Per le misurazioni, manteniamo il conteggio degli animali precedente
      // Utilizziamo il valore esistente nel cestello (defaultAnimalCount) e non lo ricalcoliamo
      let animalCount = defaultAnimalCount;
      
      if (!animalCount) {
        // Solo se non abbiamo un conteggio precedente, utilizziamo quello calcolato
        // come fallback in casi eccezionali
        animalCount = totalPopulation;
        
        // E in ultima istanza, se abbiamo sia peso totale che animali per kg
        if (!animalCount && totalWeight && animalsPerKg) {
          animalCount = Math.round(animalsPerKg * totalWeight);
        }
        
        console.log("ATTENZIONE: Nessun conteggio animali precedente disponibile, usando calcolo:", animalCount);
      } else {
        console.log("Misurazione: mantenuto conteggio animali precedente:", animalCount);
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
      
      // IMPORTANTE: Non inviamo esplicitamente il sizeId
      // Lasciamo che il server calcoli la taglia appropriata in base a animalsPerKg
      // Questo assicura che la taglia venga sempre aggiornata correttamente
      const operationData = {
        type: 'misura',
        date: new Date(`${operationDate}T10:00:00.000Z`).toISOString(), // Impostiamo un orario fisso (mezzogiorno)
        basketId,
        cycleId,
        // sizeId: omesso intenzionalmente per far calcolare la taglia al server
        lotId,  // Preserviamo il lotto
        sgrId: null,  // Opzionale
        animalsPerKg,
        averageWeight,
        animalCount, // Manteniamo il conteggio animali precedente
        totalWeight: totalWeightInGrams, // Salva il peso totale in grammi
        deadCount: totalDeadCount,
        mortalityRate,
        notes
      };
      
      console.log("Omesso sizeId per far calcolare la taglia al server in base a animalsPerKg:", animalsPerKg);
      
      console.log("Salvataggio misurazione con dati:", operationData);
      
      // Invia al server usando la route diretta per bypassare i controlli di una operazione al giorno
      // Questo garantisce anche che il conteggio animali sia preservato correttamente
      await createDirectOperation(operationData);
      
      // Mostra notifica
      toast({
        variant: "success",
        title: "Operazione registrata",
        description: `Misurazione registrata per la cesta #${basketNumber}`
      });
      
      // Callback di successo
      onSuccess();
    } catch (error: any) {
      console.error("Errore durante il salvataggio:", error);
      
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
            errorMessage.includes("Per ogni cesta è consentita una sola operazione al giorno")) {
          toast({
            variant: "destructive",
            title: "Data già utilizzata",
            description: "Per la data selezionata esiste già un'operazione. Seleziona una data differente.",
          });
          return;
        }
        
        // Altri errori dal server
        toast({
          title: "Errore dal server",
          description: errorMessage,
          variant: "destructive"
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
                    <span className="font-semibold">{formatNumberWithCommas(defaultAverageWeight, 4)} mg</span>
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
                    <span className={`font-semibold ${defaultAnimalsPerKg > 32000 ? 'text-green-600' : ''}`}>
                      {defaultAnimalsPerKg > 32000 ? 'TP-3000' : 
                       defaultAnimalsPerKg > 19000 ? 'TP-3000' :
                       defaultAnimalsPerKg > 12000 ? 'TP-2000' :
                       defaultAnimalsPerKg > 8000 ? 'TP-1500' :
                       defaultAnimalsPerKg > 5000 ? 'TP-1000' :
                       defaultAnimalsPerKg > 3000 ? 'TP-750' :
                       defaultAnimalsPerKg > 2000 ? 'TP-500' : 'N/D'}
                      {defaultAnimalsPerKg > 32000 && 
                        <span className="ml-1 text-green-600 font-medium">(e superata)</span>}
                    </span>
                  </div>
                )}
                
                {/* Calcolo stima peso totale basato sugli ultimi dati */}
                {defaultAnimalCount && defaultAnimalsPerKg && (
                  <div className="flex flex-col">
                    <span className="text-blue-600 font-medium text-xs">Peso totale stimato:</span>
                    <span className="font-semibold">
                      {formatNumberWithCommas(parseFloat(((defaultAnimalCount / defaultAnimalsPerKg)).toFixed(4)), 4)} kg
                    </span>
                  </div>
                )}
                
                {/* Target prossima crescita */}
                {defaultAverageWeight && (
                  <div className="flex flex-col border-t border-blue-100 mt-1 pt-1 col-span-2">
                    <span className="text-blue-600 font-medium text-xs">Target prossima crescita:</span>
                    <span className="font-semibold flex items-center">
                      <span className="mr-2">{formatNumberWithCommas(parseFloat((defaultAverageWeight * 1.1).toFixed(4)), 4)} mg</span>
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
                step="0.0001"
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
        <div className="bg-muted/30 p-4 rounded-md space-y-3 border mt-4">
          <h4 className="text-sm font-medium mb-2">Risultati del calcolo:</h4>
          
          {/* Box informativo sulla taglia manuale */}
          <div className="p-3 border border-indigo-100 bg-indigo-50 rounded-md mb-4">
            <div className="flex items-start">
              <div className="mr-2 text-indigo-500">
                <RulerMeasure className="h-5 w-5 mt-1" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-800">Taglia personalizzabile</h4>
                <p className="text-xs text-indigo-700 mt-1">
                  Nell'operazione <strong>misura</strong>, puoi scegliere manualmente la taglia più adatta.
                  {calculatedSize && (
                    <span className="block mt-1">
                      In base al peso medio calcolato di <strong>{calculatedValues?.averageWeight?.toFixed(4) || 0} mg</strong>, 
                      il sistema suggerisce la taglia <strong className="text-indigo-600">{calculatedSize.code}</strong>, 
                      ma puoi modificarla in base alle tue osservazioni.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {/* Avviso importante sulla conservazione del conteggio animali */}
          <div className="p-3 border border-amber-200 bg-amber-50 rounded-md mb-4">
            <div className="flex items-start">
              <div className="mr-2 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-800">Nota importante:</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Per le operazioni di misurazione, il sistema manterrà il conteggio precedente di <strong>{formatNumberWithCommas(defaultAnimalCount || 0)}</strong> animali. 
                  I calcoli mostrati qui sono solo indicativi e aiutano a valutare la crescita, ma il numero effettivo degli animali nel database rimarrà invariato.
                </p>
              </div>
            </div>
          </div>
          
          {/* Indicatore di crescita */}
          {calculatedValues.averageWeight && defaultAverageWeight && calculatedValues.animalsPerKg && (
            <div className="mb-2">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Andamento crescita</h5>
              {(() => {
                const growthData = prepareGrowthData();
                return growthData ? (
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
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Dati di crescita non disponibili. Verifica la data dell'operazione.
                  </div>
                );
              })()}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground">Animali/kg:</label>
              <div className={`font-semibold text-md ${calculatedValues.animalsPerKg && calculatedValues.animalsPerKg > 32000 ? 'text-green-600 flex items-center' : ''}`}>
                {calculatedValues.animalsPerKg ? formatNumberWithCommas(calculatedValues.animalsPerKg) : '-'}
                {calculatedValues.animalsPerKg && calculatedValues.animalsPerKg > 32000 && 
                  <span className="ml-2 text-sm font-medium">(TP-3000 superata)</span>}
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