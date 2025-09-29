import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, ChevronRight, Calendar, Droplets, List, Box, LineChart, BarChart, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { getOperationTypeLabel, getOperationTypeColor, getSizeColor, formatNumberWithCommas } from '@/lib/utils';
import GrowthPredictionChart from '@/components/GrowthPredictionChart';
import SizeGrowthTimeline from '@/components/SizeGrowthTimeline';

// Componente per mostrare le informazioni del lotto in formato header
interface LotInfoHeaderProps {
  operations: any[];
}

function LotInfoHeader({ operations }: LotInfoHeaderProps) {
  // Trova l'operazione di prima attivazione con lotto
  const firstActivation = operations?.find((op: any) => op.type === 'prima-attivazione');
  
  // Se non abbiamo un'operazione di prima attivazione o un lotId, non mostriamo nulla
  if (!firstActivation?.lotId) {
    return null;
  }
  
  const lotId = firstActivation.lotId;
  
  // Usa l'hook useQuery per caricare i dati del lotto
  const { data: lotDetails, isLoading } = useQuery({
    queryKey: ['/api/lots', lotId],
    queryFn: () => fetch(`/api/lots/${lotId}`).then(res => res.json()),
    enabled: !!lotId
  });
  
  if (isLoading || !lotDetails) {
    return (
      <div className="text-sm text-muted-foreground mt-1">
        <span>Lotto: #{lotId}</span>
      </div>
    );
  }
  
  return (
    <div className="text-sm text-muted-foreground mt-1">
      <span>Lotto: #{lotId}</span>
      {lotDetails.supplierLotNumber && (
        <span className="ml-1">{lotDetails.supplierLotNumber}</span>
      )}
      {lotDetails.supplier && (
        <span className="ml-2">(Fornitore: {lotDetails.supplier})</span>
      )}
    </div>
  );
}

// Componente per mostrare le informazioni dettagliate del lotto nella card
interface LotInfoProps {
  operations: any[];
}

function LotInfo({ operations }: LotInfoProps) {
  // Trova l'operazione di prima attivazione con lotto
  const firstActivation = operations?.find((op: any) => op.type === 'prima-attivazione');
  
  // Se non abbiamo un'operazione di prima attivazione o un lotId, mostriamo un messaggio
  if (!firstActivation?.lotId) {
    return (
      <div className="text-center text-muted-foreground">
        Informazioni lotto non disponibili
      </div>
    );
  }
  
  const lotId = firstActivation.lotId;
  
  // Usa l'hook useQuery per caricare i dati del lotto
  const { data: lotDetails, isLoading } = useQuery({
    queryKey: ['/api/lots', lotId],
    queryFn: () => fetch(`/api/lots/${lotId}`).then(res => res.json()),
    enabled: !!lotId
  });
  
  // Se i dati stanno caricando, mostra un indicatore di caricamento
  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  // Se abbiamo i dati del lotto, mostrali in formato dettagliato
  if (lotDetails) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-sm font-medium text-muted-foreground">ID:</span>
          <span className="font-medium">#{lotDetails.id}</span>
        </div>
        {lotDetails.supplierLotNumber && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Numero:</span>
            <span className="font-medium">{lotDetails.supplierLotNumber}</span>
          </div>
        )}
        {lotDetails.supplier && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Fornitore:</span>
            <span className="font-medium">{lotDetails.supplier}</span>
          </div>
        )}
        {lotDetails.quality && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Qualità:</span>
            <span className="font-medium">{lotDetails.quality}</span>
          </div>
        )}
        {lotDetails.arrivalDate && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Arrivo:</span>
            <span className="font-medium">
              {new Date(lotDetails.arrivalDate).toLocaleDateString('it-IT')}
            </span>
          </div>
        )}
        {lotDetails.animalCount && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Animali:</span>
            <span className="font-medium">{new Intl.NumberFormat('it-IT').format(lotDetails.animalCount)}</span>
          </div>
        )}
        {lotDetails.weight && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-muted-foreground">Peso (g):</span>
            <span className="font-medium">{new Intl.NumberFormat('it-IT').format(lotDetails.weight)}</span>
          </div>
        )}
      </div>
    );
  }
  
  // Fallback se non ci sono dati
  return (
    <div className="text-center text-muted-foreground">
      Informazioni lotto non disponibili
    </div>
  );
}

// Tipi per i parametri
interface StatisticsTabProps {
  cycle: any;
  latestOperation: any;
  cycleId: number;
}

// Componente per la sezione delle statistiche
function StatisticsTab({ 
  cycle, 
  latestOperation, 
  cycleId 
}: StatisticsTabProps) {
  const [projectionDays, setProjectionDays] = useState(60); // default: 60 giorni
  const [bestVariation, setBestVariation] = useState(20); // default: +20%
  const [worstVariation, setWorstVariation] = useState(30); // default: -30%
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [growthPrediction, setGrowthPrediction] = useState<any>(null);

  const fetchGrowthPrediction = useCallback(() => {
    if (!cycleId || !latestOperation?.animalsPerKg || isLoadingPrediction) return;
    
    setIsLoadingPrediction(true);
    
    // Log dettagliato per debugging
    console.log(`Richiesta previsione per ciclo ${cycleId}, animalsPerKg=${latestOperation.animalsPerKg}, giorni=${projectionDays}`);
    
    fetch(`/api/cycles/${cycleId}/growth-prediction?days=${projectionDays}&bestVariation=${bestVariation}&worstVariation=${worstVariation}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Errore nella risposta API: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Dati previsione ricevuti completi:", data);
        
        if (!data || Object.keys(data).length === 0) {
          console.error("Dati di previsione vuoti o non validi");
          return;
        }
        
        // Imposta i dati direttamente nello stato
        setGrowthPrediction(data);
      })
      .catch(error => {
        console.error('Errore nel calcolo della previsione di crescita:', error);
      })
      .finally(() => {
        setIsLoadingPrediction(false);
      });
  }, [cycleId, projectionDays, bestVariation, worstVariation, latestOperation, isLoadingPrediction]);
  
  // Carica automaticamente le previsioni all'avvio se ci sono dati di misurazione disponibili
  useEffect(() => {
    if (latestOperation?.animalsPerKg && !growthPrediction && !isLoadingPrediction) {
      fetchGrowthPrediction();
    }
  }, [latestOperation, growthPrediction, isLoadingPrediction, fetchGrowthPrediction]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Grafico di previsione peso */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Previsioni di Crescita</CardTitle>
            <CardDescription>
              {growthPrediction ? 
                `Proiezioni basate su SGR ${growthPrediction.sgrPercentage?.toFixed(2)}% (${growthPrediction.realSgr ? 'calcolata' : 'teorica'})` : 
                'Proiezioni di crescita basate su SGR mensile'}
            </CardDescription>
          </div>
          {latestOperation?.animalsPerKg && (
            <Button 
              variant="outline"
              size="sm"
              onClick={fetchGrowthPrediction}
              disabled={isLoadingPrediction}
            >
              {isLoadingPrediction ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calcolo...
                </>
              ) : (
                <>
                  <BarChart className="h-4 w-4 mr-2" />
                  {growthPrediction ? 'Aggiorna Previsioni' : 'Genera Previsioni'}
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!latestOperation?.animalsPerKg ? (
            <div className="text-center py-12 text-muted-foreground">
              <Droplets className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Per generare previsioni di crescita, è necessario registrare almeno una misurazione del peso</p>
              <Button asChild className="mt-4">
                <Link href={`/operations?cycleId=${cycle.id}`}>
                  <List className="mr-2 h-4 w-4" />
                  Registra una Misurazione
                </Link>
              </Button>
            </div>
          ) : !growthPrediction ? (
            <div className="text-center py-12 text-muted-foreground">
              <LineChart className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Clicca su "Genera Previsioni" per visualizzare le proiezioni di crescita future</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <GrowthPredictionChart 
                    currentWeight={growthPrediction.currentWeight}
                    measurementDate={new Date(growthPrediction.lastMeasurementDate || latestOperation.date)}
                    theoreticalSgrMonthlyPercentage={growthPrediction.sgrPercentage}
                    realSgrMonthlyPercentage={growthPrediction.realSgr}
                    projectionDays={growthPrediction.days || projectionDays}
                    variationPercentages={{
                      best: growthPrediction.bestVariation || bestVariation,
                      worst: growthPrediction.worstVariation || worstVariation
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="text-base font-medium mb-3">Parametri</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Giorni di proiezione
                        </div>
                        <Input
                          type="number"
                          min={7}
                          max={365}
                          value={projectionDays}
                          onChange={(e) => setProjectionDays(Number(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Variazione positiva (%)
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={bestVariation}
                          onChange={(e) => setBestVariation(Number(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Variazione negativa (%)
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={worstVariation}
                          onChange={(e) => setWorstVariation(Number(e.target.value))}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={fetchGrowthPrediction}
                        disabled={isLoadingPrediction}
                      >
                        {isLoadingPrediction ? "Aggiornamento..." : "Aggiorna"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">Scenario Migliore</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700">
                      {growthPrediction.summary?.finalBestWeight 
                        ? formatNumberWithCommas(growthPrediction.summary.finalBestWeight) 
                        : "N/A"} mg
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      In {growthPrediction.days || projectionDays} giorni con SGR +{growthPrediction.bestVariation || bestVariation}%
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Previsione Standard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {growthPrediction.summary?.finalTheoreticalWeight 
                        ? formatNumberWithCommas(growthPrediction.summary.finalTheoreticalWeight) 
                        : "N/A"} mg
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      In {growthPrediction.days || projectionDays} giorni con SGR {growthPrediction.sgrPercentage?.toFixed(1) || "standard"}%
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Scenario Peggiore</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700">
                      {growthPrediction.summary?.finalWorstWeight 
                        ? formatNumberWithCommas(growthPrediction.summary.finalWorstWeight) 
                        : "N/A"} mg
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      In {growthPrediction.days || projectionDays} giorni con SGR -{growthPrediction.worstVariation || worstVariation}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Timeline di proiezione taglie */}
      {latestOperation?.animalsPerKg && growthPrediction && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Timeline Proiezione Taglie</CardTitle>
            <CardDescription>
              Previsione di quando la cesta raggiungerà le diverse taglie target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SizeGrowthTimeline 
              currentWeight={growthPrediction.currentWeight}
              measurementDate={new Date(growthPrediction.lastMeasurementDate || latestOperation.date)}
              sgrMonthlyPercentage={growthPrediction.sgrPercentage}
              cycleId={cycle.id}
              basketId={cycle.basketId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tipi per i parametri della lista operazioni
interface OperationsListProps {
  operations: any[];
  formatDate: (dateString: string) => string;
  onDeleteOperation?: (operationId: number) => void;
}

// Componente per la lista delle operazioni
function OperationsList({ operations, formatDate, onDeleteOperation }: OperationsListProps) {
  const sortedOperations = operations
    ? [...operations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronologia Operazioni</CardTitle>
        <CardDescription>
          Tutte le operazioni effettuate durante questo ciclo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedOperations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nessuna operazione registrata per questo ciclo
          </div>
        ) : (
          <div className="space-y-6">
            {sortedOperations.map((op, index) => (
              <div key={op.id} className="relative">
                {index !== sortedOperations.length - 1 && (
                  <div className="absolute left-6 top-8 bottom-0 w-px bg-gray-200"></div>
                )}
                <div className="flex items-start">
                  <div className={`shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${getOperationTypeColor(op.type)}`}>
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="ml-4 grow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                      <h4 className="font-medium">{getOperationTypeLabel(op.type)}</h4>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(op.date)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      {op.animalsPerKg && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Animali/Kg</div>
                          <div className="font-medium">{op.animalsPerKg.toLocaleString('it-IT')}</div>
                        </div>
                      )}
                      
                      {op.animalCount && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">N° Animali</div>
                          <div className="font-medium">{op.animalCount.toLocaleString('it-IT')}</div>
                        </div>
                      )}
                      
                      {op.totalWeight && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Peso Totale</div>
                          <div className="font-medium">{op.totalWeight.toLocaleString('it-IT', { maximumFractionDigits: 2 })} g</div>
                        </div>
                      )}
                      
                      {op.size && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Taglia</div>
                          <div className="font-medium">
                            {typeof op.size === 'object' 
                              ? `${op.size.code} (${op.size.name})`
                              : op.size}
                          </div>
                        </div>
                      )}
                      
                      {op.notes && (
                        <div className="sm:col-span-3">
                          <div className="text-sm font-medium text-muted-foreground">Note</div>
                          <div className="text-sm">{op.notes}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-2">
                      <Link href={`/operations/${op.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          Visualizza dettagli
                        </Button>
                      </Link>
                      {onDeleteOperation && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm('Sei sicuro di voler eliminare questa operazione? Questa azione non può essere annullata.')) {
                              onDeleteOperation(op.id);
                            }
                          }}
                        >
                          Elimina
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {index !== sortedOperations.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Definizione dei tipi per il componente delle note
interface NotesTabProps {}

// Componente per la visualizzazione delle note (per ora vuoto)
function NotesTab({}: NotesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Note e Documenti</CardTitle>
        <CardDescription>
          Note, documenti e informazioni aggiuntive
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[200px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Nessuna nota disponibile per questo ciclo</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente principale
export default function CycleDetail() {
  const [, params] = useRoute('/cycles/:id');
  const cycleId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState('operations');
  const [isCloseCycleDialogOpen, setIsCloseCycleDialogOpen] = useState(false);
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  
  // Funzione per gestire la chiusura del ciclo
  const handleCloseCycle = async () => {
    setIsClosingCycle(true);
    try {
      await apiRequest({
        url: `/api/cycles/${cycle.id}/close`,
        method: 'POST',
        body: {
          endDate: new Date().toISOString()
        }
      });
      
      // Chiudi il dialog e ricarica la pagina
      setIsCloseCycleDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Errore nella chiusura del ciclo:', error);
    } finally {
      setIsClosingCycle(false);
    }
  };
  
  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['/api/cycles', cycleId],
    queryFn: cycleId ? () => fetch(`/api/cycles/${cycleId}`).then(res => res.json()) : undefined,
    enabled: !!cycleId
  });
  
  // Fetch operations for this cycle
  const { data: operations, isLoading: opsLoading, refetch: refetchOperations } = useQuery({
    queryKey: ['/api/operations', cycleId],
    queryFn: cycleId ? () => fetch(`/api/operations?cycleId=${cycleId}`).then(res => res.json()) : undefined,
    enabled: !!cycleId
  });
  
  // Fetch flupsys data to get the flupsy name
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    enabled: !!cycle
  });
  
  // Function to handle operation deletion
  const handleDeleteOperation = async (operationId: number) => {
    try {
      await apiRequest({
        url: `/api/operations/${operationId}`,
        method: 'DELETE'
      });
      // Refresh operations data
      refetchOperations();
    } catch (error) {
      console.error('Errore nella cancellazione dell\'operazione:', error);
      alert('Si è verificato un errore durante la cancellazione dell\'operazione. Riprova.');
    }
  };
  
  // Loading state
  if (cycleLoading || opsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/cycles">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna ai cicli
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Caricamento dettagli ciclo...</h1>
        </div>
        <div className="grid gap-6 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  // 404 state
  if (!cycle && !cycleLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Ciclo non trovato</h1>
          <p className="mb-6">Il ciclo richiesto non esiste o è stato rimosso.</p>
          <Link href="/cycles">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna all'elenco dei cicli
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Sort operations by date (most recent first)
  const sortedOperations = operations ? 
    [...operations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : 
    [];
  
  // Calculate cycle duration so far
  const startDate = new Date(cycle?.startDate);
  const endDate = cycle?.endDate ? new Date(cycle.endDate) : new Date();
  const durationDays = differenceInDays(endDate, startDate);
  
  // Get info about the latest operation (if any)
  const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
  
  // Get growth info
  const firstOp = sortedOperations.length > 0 ? sortedOperations[sortedOperations.length - 1] : null;
  const lastOp = sortedOperations.length > 0 ? sortedOperations[0] : null;
  
  // Calculate growth rate if we have at least two operations with weight data
  let growthRate = null;
  if (firstOp && lastOp && firstOp.averageWeight && lastOp.averageWeight && firstOp.id !== lastOp.id) {
    const firstWeight = parseFloat(firstOp.averageWeight); // already in mg
    const lastWeight = parseFloat(lastOp.averageWeight); // already in mg
    const growthPercentage = ((lastWeight - firstWeight) / firstWeight) * 100;
    growthRate = {
      startWeight: firstWeight,
      endWeight: lastWeight,
      growthPercentage: growthPercentage,
      dailyGrowth: growthPercentage / durationDays
    };
  }
  
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: it });
    } catch (error) {
      console.error('Errore nella formattazione della data:', error, dateString);
      return 'Data non valida';
    }
  };
  
  // Verifica se il ciclo è stato venduto
  const isSoldCycle = operations?.some((op: any) => op.type === 'vendita' && op.cycleId === cycle.id);

  return (
    <div className={`container mx-auto px-4 py-8 relative ${
      !cycle.state || cycle.state === 'active' ? '' : 
      isSoldCycle ? 'after:absolute after:inset-0 after:bg-red-500/10 after:content-[""] after:z-[-1] after:pointer-events-none after:[background-image:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.5)_10px,rgba(255,255,255,0.5)_20px)]' 
      : ''
    }`}>
      {/* Header with navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Link href="/cycles">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna ai cicli
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              Ciclo #{cycle.id}
              {isSoldCycle && (
                <span className="ml-3 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
                  Venduto
                </span>
              )}
            </h1>
            <div className="text-sm text-muted-foreground flex items-center">
              <span>Cesta #{cycle.basket?.physicalNumber}</span>
              <ChevronRight className="h-3 w-3 mx-1" />
              <span>
                Flupsy #{cycle.basket?.flupsyId}
                {flupsys && Array.isArray(flupsys) && cycle.basket?.flupsyId && (
                  <> - {flupsys.find((f: any) => f.id === cycle.basket?.flupsyId)?.name || 'Sconosciuto'}</>
                )}
              </span>
              <ChevronRight className="h-3 w-3 mx-1" />
              <span>{cycle.cycleCode || `ID ${cycle.id}`}</span>
            </div>
            {(() => {
              // Trova l'operazione di prima attivazione che contiene i dati del lotto
              const firstActivation = operations?.find((op: any) => op.type === 'prima-attivazione');
              
              // Caso 1: L'operazione ha già il lotto completo
              if (firstActivation?.lot) {
                return (
                  <div className="text-sm text-muted-foreground mt-1">
                    <span>Lotto: #{firstActivation.lotId}</span>
                    {firstActivation.lot.supplierLotNumber && (
                      <span className="ml-1">{firstActivation.lot.supplierLotNumber}</span>
                    )}
                    {firstActivation.lot.supplier && (
                      <span className="ml-2">(Fornitore: {firstActivation.lot.supplier})</span>
                    )}
                  </div>
                );
              }
              
              // Caso 2: L'operazione ha solo il lotId, ma non l'oggetto lot completo
              if (firstActivation?.lotId) {
                // Cerca il lotto completo tra tutte le operazioni
                const operationWithCompleteLot = operations?.find((op: any) => 
                  op.lotId === firstActivation.lotId && op.lot
                );
                
                if (operationWithCompleteLot?.lot) {
                  // Abbiamo trovato il lotto completo in un'altra operazione
                  return (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Lotto: #{firstActivation.lotId}</span>
                      {operationWithCompleteLot.lot.supplierLotNumber && (
                        <span className="ml-1">{operationWithCompleteLot.lot.supplierLotNumber}</span>
                      )}
                      {operationWithCompleteLot.lot.supplier && (
                        <span className="ml-2">(Fornitore: {operationWithCompleteLot.lot.supplier})</span>
                      )}
                    </div>
                  );
                }
                
                // Se ancora non abbiamo trovato il lotto, mostriamo almeno l'ID
                return (
                  <div className="text-sm text-muted-foreground mt-1">
                    <span>Lotto: #{firstActivation.lotId}</span>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/operations/new?selectedCycleId=${cycle.id}&flupsyId=${cycle.basket?.flupsyId || ''}&basketId=${cycle.basketId || ''}`}>
              <List className="mr-2 h-4 w-4" />
              Nuova Operazione
            </Link>
          </Button>
          {cycle.state === 'active' && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => setIsCloseCycleDialogOpen(true)}
            >
              Chiudi Ciclo
            </Button>
          )}
        </div>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">
                {cycle.state === 'active' ? 'Attivo' : 'Chiuso'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                cycle.state === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : operations?.some((op: any) => op.type === 'vendita' && op.cycleId === cycle.id)
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
              }`}>
                {cycle.state === 'active' 
                  ? 'In corso'
                  : operations?.some((op: any) => op.type === 'vendita' && op.cycleId === cycle.id)
                    ? 'Venduto'
                    : 'Completato'
                }
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Durata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{durationDays} giorni</span>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(cycle.startDate)} 
              {cycle.endDate && ` - ${formatDate(cycle.endDate)}`}
            </p>
          </CardContent>
        </Card>
        
        {/* Carta per il lotto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lotto</CardTitle>
          </CardHeader>
          <CardContent>
            <LotInfo operations={operations || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peso Medio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">
                {latestOperation?.averageWeight ? formatNumberWithCommas(parseFloat(latestOperation.averageWeight)) : "N/A"} mg
              </span>
              <Droplets className="h-5 w-5 text-muted-foreground" />
            </div>
            {latestOperation?.animalsPerKg && (
              <p className="text-xs text-muted-foreground mt-1">
                {latestOperation.animalsPerKg.toLocaleString('it-IT')} animali/kg
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Growth summary if available */}
      {growthRate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Andamento della Crescita</CardTitle>
            <CardDescription>Riepilogo della crescita durante questo ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Peso iniziale</span>
                  <span className="font-bold">{Math.round(growthRate.startWeight)} mg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Peso attuale</span>
                  <span className="font-bold">{Math.round(growthRate.endWeight)} mg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Crescita totale</span>
                  <span className="font-bold text-green-600">+{growthRate.growthPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Crescita giornaliera</span>
                  <span className="font-bold text-green-600">+{growthRate.dailyGrowth.toFixed(2)}%</span>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="h-4 mb-2">
                  <Progress value={growthRate.growthPercentage > 100 ? 100 : growthRate.growthPercentage} className="h-2" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatDate(firstOp.date)}</span>
                  <span>{formatDate(lastOp.date)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="operations">
            Operazioni <Badge variant="outline" className="ml-2">{sortedOperations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stats">Statistiche</TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
        </TabsList>
        
        <TabsContent value="operations" className="mt-6">
          <OperationsList 
            operations={operations} 
            formatDate={formatDate} 
            onDeleteOperation={handleDeleteOperation} 
          />
        </TabsContent>
        
        <TabsContent value="stats" className="mt-6">
          <StatisticsTab 
            cycle={cycle} 
            latestOperation={latestOperation} 
            cycleId={cycleId || 0} 
          />
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <NotesTab />
        </TabsContent>
      </Tabs>
      
      {/* Dialog per conferma chiusura ciclo */}
      <Dialog open={isCloseCycleDialogOpen} onOpenChange={setIsCloseCycleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Box className="mr-2 h-5 w-5 text-red-600" />
              Chiudi Ciclo
            </DialogTitle>
            <DialogDescription>
              Stai per chiudere definitivamente il <strong>Ciclo #{cycle.id}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="font-medium text-red-900 mb-2">⚠️ Attenzione</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Questa operazione è <strong>irreversibile</strong></li>
                <li>• Il ciclo verrà contrassegnato come completato</li>
                <li>• Non sarà più possibile aggiungere operazioni</li>
                <li>• La data di chiusura sarà impostata a oggi</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setIsCloseCycleDialogOpen(false)}
              disabled={isClosingCycle}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCloseCycle}
              disabled={isClosingCycle}
              className="mb-2 sm:mb-0 sm:ml-2"
            >
              {isClosingCycle ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Chiusura in corso...
                </>
              ) : (
                'Conferma Chiusura'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}