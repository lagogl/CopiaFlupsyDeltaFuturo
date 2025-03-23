import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatNumberWithCommas } from '@/lib/utils';
import { SampleCalculatorResult } from './SampleCalculator';

interface IntegratedSampleCalculatorProps {
  onChange: (result: SampleCalculatorResult) => void;
  defaultAnimalsPerKg?: number | null;
  defaultAverageWeight?: number | null;
  defaultDeadCount?: number | null;
  defaultMortalityRate?: number | null;
}

export default function IntegratedSampleCalculator({
  onChange,
  defaultAnimalsPerKg,
  defaultAverageWeight,
  defaultDeadCount,
  defaultMortalityRate
}: IntegratedSampleCalculatorProps) {
  console.log("IntegratedSampleCalculator v2 rendered con defaults:", {
    defaultAnimalsPerKg, 
    defaultAverageWeight,
    defaultDeadCount,
    defaultMortalityRate
  });
  
  // Stati per i valori di input
  const [sampleWeight, setSampleWeight] = useState<number | null>(null); // Peso del campione in grammi
  const [animalsCount, setAnimalsCount] = useState<number | null>(null); // Numero di animali contati
  const [samplePercentage, setSamplePercentage] = useState<number>(100); // Percentuale del campione (default 100%)
  const [deadCount, setDeadCount] = useState<number | null>(defaultDeadCount || null); // Numero di animali morti
  
  // Stati per i risultati calcolati - usati solo per visualizzazione
  const [calculatedValues, setCalculatedValues] = useState({
    animalsPerKg: defaultAnimalsPerKg || null,
    averageWeight: defaultAverageWeight || 
      (defaultAnimalsPerKg && defaultAnimalsPerKg > 0 ? 1000000 / defaultAnimalsPerKg : null),
    totalPopulation: null as number | null,
    mortalityRate: defaultMortalityRate || null,
    deadCount: defaultDeadCount || null
  });
  
  // Riferimento per tenere traccia dei cambiamenti
  const isCalculating = useRef(false);
  
  // Funzione per calcolare i risultati
  const calculateResults = () => {
    if (sampleWeight && animalsCount && sampleWeight > 0 && animalsCount > 0) {
      isCalculating.current = true;
      
      // Calcolo del numero di animali per kg
      const animalsPerKg = Math.round((animalsCount / sampleWeight) * 1000);
      
      // Calcolo del peso medio in mg
      const averageWeight = animalsPerKg > 0 ? 1000000 / animalsPerKg : 0;
      
      // Calcolo della popolazione totale stimata
      const totalPopulation = Math.round(animalsCount / (samplePercentage / 100));
      
      // Calcolo della mortalità
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
      
      // Aggiorniamo i valori calcolati
      const newValues = {
        animalsPerKg,
        averageWeight,
        totalPopulation,
        mortalityRate,
        deadCount: totalDeadCount
      };
      
      setCalculatedValues(newValues);
      
      // Importante: inviamo i risultati al genitore solo se i valori sono cambiati
      const result = {
        animalsPerKg,
        averageWeight,
        deadCount: totalDeadCount,
        mortalityRate
      };
      
      console.log("CALCOLO COMPLETATO - Invio nuovi valori al form:", result);
      
      // Invio i risultati direttamente al genitore
      onChange(result);
      
      isCalculating.current = false;
    } else {
      setCalculatedValues({
        animalsPerKg: defaultAnimalsPerKg || null,
        averageWeight: defaultAverageWeight || 
          (defaultAnimalsPerKg && defaultAnimalsPerKg > 0 ? 1000000 / defaultAnimalsPerKg : null),
        totalPopulation: null,
        mortalityRate: defaultMortalityRate || null,
        deadCount: defaultDeadCount || null
      });
    }
  };
  
  // Effetto per calcolare i risultati quando cambiano gli input
  useEffect(() => {
    calculateResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleWeight, animalsCount, samplePercentage, deadCount]);
  
  // Effetto per inviare i risultati al genitore quando cambiano
  useEffect(() => {
    const onMount = {
      animalsPerKg: defaultAnimalsPerKg || null,
      averageWeight: defaultAverageWeight || null,
      deadCount: defaultDeadCount || null,
      mortalityRate: defaultMortalityRate || null
    };
    console.log("Invio valori iniziali:", onMount);
    onChange(onMount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Pulsante per calcolo esplicito, come backup
  const handleCalculateButtonClick = () => {
    calculateResults();
  };
  
  const {
    animalsPerKg, 
    averageWeight, 
    totalPopulation, 
    mortalityRate
  } = calculatedValues;
  
  return (
    <div className="space-y-4 mb-6 border rounded-md p-4 bg-muted/10">
      {/* Sezione dati del campione */}
      <div className="space-y-3">
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
        
        <div className="flex justify-end">
          <Button 
            onClick={handleCalculateButtonClick} 
            type="button" 
            variant="outline" 
            size="sm"
          >
            Aggiorna Calcolo
          </Button>
        </div>
      </div>
      
      {/* Risultati del calcolo */}
      <div className="bg-muted/30 p-3 rounded-md space-y-2 border">
        <h4 className="text-sm font-medium mb-2">Risultati del calcolo:</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground">Animali/kg:</label>
            <div className="font-semibold text-md">
              {animalsPerKg ? formatNumberWithCommas(animalsPerKg) : '-'}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Peso medio (mg):</label>
            <div className="font-semibold text-md">
              {averageWeight ? formatNumberWithCommas(averageWeight) : '-'}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground">Popolazione stimata:</label>
            <div className="font-semibold text-md">
              {totalPopulation ? formatNumberWithCommas(totalPopulation) : '-'}
            </div>
          </div>
          {deadCount !== null && deadCount > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground">Tasso di mortalità:</label>
              <div className="font-semibold text-md">
                {mortalityRate !== null ? `${mortalityRate}%` : '-'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}