import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNumberWithCommas } from '@/lib/utils';
import { Calculator } from 'lucide-react';

export interface SampleCalculatorResult {
  animalsPerKg: number;
  averageWeight: number;
}

interface SampleCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalculate: (result: SampleCalculatorResult) => void;
  defaultAnimalsPerKg?: number | null;
}

export default function SampleCalculator({ 
  open, 
  onOpenChange, 
  onCalculate,
  defaultAnimalsPerKg
}: SampleCalculatorProps) {
  // Stati per i valori di input
  const [sampleWeight, setSampleWeight] = useState<number | null>(null); // Peso del campione in grammi
  const [animalsCount, setAnimalsCount] = useState<number | null>(null); // Numero di animali contati
  const [samplePercentage, setSamplePercentage] = useState<number>(100); // Percentuale del campione (default 100%)
  
  // Stati per i risultati calcolati
  const [animalsPerKg, setAnimalsPerKg] = useState<number | null>(defaultAnimalsPerKg || null);
  const [averageWeight, setAverageWeight] = useState<number | null>(
    defaultAnimalsPerKg && defaultAnimalsPerKg > 0 ? 1000000 / defaultAnimalsPerKg : null
  );
  const [totalPopulation, setTotalPopulation] = useState<number | null>(null);
  
  // Calcola risultati quando cambiano gli input
  useEffect(() => {
    if (sampleWeight && animalsCount && samplePercentage) {
      // Calcolo del numero di animali per kg
      // Poiché sampleWeight è in grammi, dobbiamo moltiplicare per 1000 per ottenere animali/kg
      const calculatedAnimalsPerKg = Math.round((animalsCount / sampleWeight) * 1000);
      
      // Calcolo del peso medio in mg
      const calculatedAverageWeight = calculatedAnimalsPerKg > 0 ? 1000000 / calculatedAnimalsPerKg : 0;
      
      // Calcolo della popolazione totale stimata
      const calculatedTotalPopulation = Math.round(animalsCount / (samplePercentage / 100));
      
      setAnimalsPerKg(calculatedAnimalsPerKg);
      setAverageWeight(calculatedAverageWeight);
      setTotalPopulation(calculatedTotalPopulation);
    } else {
      // Reimposta i risultati se non abbiamo dati sufficienti
      setAnimalsPerKg(defaultAnimalsPerKg || null);
      setAverageWeight(
        defaultAnimalsPerKg && defaultAnimalsPerKg > 0 ? 1000000 / defaultAnimalsPerKg : null
      );
      setTotalPopulation(null);
    }
  }, [sampleWeight, animalsCount, samplePercentage, defaultAnimalsPerKg]);
  
  // Gestisce il submit del form
  const handleSubmit = () => {
    if (animalsPerKg) {
      onCalculate({
        animalsPerKg,
        averageWeight: averageWeight || 0
      });
      onOpenChange(false);
    }
  };
  
  // Reimposta i valori quando si apre la dialog
  useEffect(() => {
    if (open) {
      setSampleWeight(null);
      setAnimalsCount(null);
      setSamplePercentage(100);
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="mr-2 h-5 w-5" /> 
            Calcolatore campioni per misurazione
          </DialogTitle>
          <DialogDescription>
            Calcola il numero di animali per kg e il peso medio in base al campione analizzato
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Prima sezione: dati del campione con spiegazioni */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Dati del campione:</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Peso del campione (g)</label>
                <Input 
                  type="number" 
                  placeholder="Peso in grammi"
                  step="0.1"
                  value={sampleWeight?.toString() || ''}
                  onChange={e => setSampleWeight(parseFloat(e.target.value) || null)}
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
                  className="flex-1"
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
                Percentuale della popolazione totale rappresentata dal campione analizzato
              </p>
            </div>
          </div>
          
          {/* Risultati del calcolo */}
          <div className="bg-muted/30 p-4 rounded-md space-y-3 border">
            <h4 className="text-sm font-medium">Risultati del calcolo:</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground">Animali/kg:</label>
                <div className="font-semibold text-lg">
                  {animalsPerKg ? formatNumberWithCommas(animalsPerKg) : '-'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Dato richiesto per operazioni di misura
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Peso medio (mg):</label>
                <div className="font-semibold text-lg">
                  {averageWeight ? formatNumberWithCommas(averageWeight) : '-'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Utile per determinare la taglia
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-muted-foreground">Popolazione totale stimata:</label>
              <div className="font-semibold text-lg">
                {totalPopulation ? formatNumberWithCommas(totalPopulation) : '-'}
              </div>
              <div className="text-xs text-muted-foreground">
                Numero stimato di animali nella cesta
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!animalsPerKg}
          >
            Applica risultati
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}