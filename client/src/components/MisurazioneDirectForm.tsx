import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MisurazioneDirectFormProps {
  basketId: number;
  cycleId: number;
  sizeId: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MisurazioneDirectForm({
  basketId,
  cycleId,
  sizeId,
  onSuccess,
  onCancel
}: MisurazioneDirectFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Valori di input del campione
  const [sampleWeight, setSampleWeight] = useState<number | null>(null);
  const [animalsCount, setAnimalsCount] = useState<number | null>(null);
  const [samplePercentage, setSamplePercentage] = useState<number>(100);
  const [deadCount, setDeadCount] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  // Valori calcolati
  const [calculatedValues, setCalculatedValues] = useState<{
    animalsPerKg: number | null;
    averageWeight: number | null;
    totalPopulation: number | null;
    mortalityRate: number | null;
    totalDeadCount: number | null;
  }>({
    animalsPerKg: null,
    averageWeight: null,
    totalPopulation: null,
    mortalityRate: null,
    totalDeadCount: null
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
        totalPopulation,
        mortalityRate,
        totalDeadCount
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
    
    const { animalsPerKg, averageWeight, totalDeadCount, mortalityRate, totalPopulation } = calculatedValues;
    
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
      // Prepara i dati dell'operazione
      const operationData = {
        type: 'misura',
        date: new Date().toISOString(),
        basketId,
        cycleId,
        sizeId,
        lotId: null,  // In genere non necessario per misurazioni
        sgrId: null,  // Opzionale
        animalsPerKg,
        averageWeight,
        animalCount: totalPopulation,  // Popolazione totale calcolata
        deadCount: totalDeadCount,
        mortalityRate,
        notes
      };
      
      console.log("Salvataggio misurazione con dati:", operationData);
      
      // Chiama l'API per salvare l'operazione
      const response = await apiRequest('POST', '/api/operations', operationData);
      
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
    } catch (error) {
      console.error("Errore durante il salvataggio:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <h3 className="text-lg font-semibold">Nuova Misurazione</h3>
        
        <div className="space-y-4">
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