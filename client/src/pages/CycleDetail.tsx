import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, ChevronRight, Calendar, Droplets, List, Box } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getOperationTypeLabel, getOperationTypeColor, getSizeColor } from '@/lib/utils';

export default function CycleDetail() {
  const [, params] = useRoute('/cycles/:id');
  const cycleId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState('operations');
  const [projectionDays, setProjectionDays] = useState(60); // default: 60 giorni
  const [bestVariation, setBestVariation] = useState(20); // default: +20%
  const [worstVariation, setWorstVariation] = useState(30); // default: -30%
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [growthPrediction, setGrowthPrediction] = useState<any>(null);
  
  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['/api/cycles', cycleId],
    queryFn: cycleId ? () => fetch(`/api/cycles/${cycleId}`).then(res => res.json()) : undefined,
    enabled: !!cycleId
  });
  
  // Fetch operations for this cycle
  const { data: operations, isLoading: opsLoading } = useQuery({
    queryKey: ['/api/operations', cycleId],
    queryFn: cycleId ? () => fetch(`/api/operations?cycleId=${cycleId}`).then(res => res.json()) : undefined,
    enabled: !!cycleId
  });
  
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
  
  // Calculate growth rate if we have at least two operations with animalsPerKg
  let growthRate = null;
  if (firstOp && lastOp && firstOp.animalsPerKg && lastOp.animalsPerKg && firstOp.id !== lastOp.id) {
    const firstWeight = 1000000 / firstOp.animalsPerKg; // in mg
    const lastWeight = 1000000 / lastOp.animalsPerKg; // in mg
    const growthPercentage = ((lastWeight - firstWeight) / firstWeight) * 100;
    growthRate = {
      startWeight: firstWeight,
      endWeight: lastWeight,
      growthPercentage: growthPercentage,
      dailyGrowth: growthPercentage / durationDays
    };
  }
  
  // Helper function to format dates
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: it });
  };
  
  // Funzione per ottenere il valore SGR mensile corrente
  const getCurrentMonthSgr = () => {
    const today = new Date();
    const monthNames = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const currentMonthName = monthNames[today.getMonth()];
    
    // In un'applicazione reale, qui recupereremmo il valore SGR dal backend
    // Per ora restituiamo un valore predefinito del 60%
    return 60;
  };
  
  // Questa sezione è stata temporaneamente rimossa
  // La funzionalità di previsione della crescita sarà implementata in futuro
  
  return (
    <div className="container mx-auto px-4 py-8">
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
            <h1 className="text-2xl font-bold">Ciclo #{cycle.id}</h1>
            <div className="text-sm text-muted-foreground flex items-center">
              <span>Cesta #{cycle.basket?.physicalNumber}</span>
              <ChevronRight className="h-3 w-3 mx-1" />
              <span>Flupsy #{cycle.basket?.flupsyId}</span>
              <ChevronRight className="h-3 w-3 mx-1" />
              <span>{cycle.cycleCode || `ID ${cycle.id}`}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/operations?cycleId=${cycle.id}`}>
              <List className="mr-2 h-4 w-4" />
              Nuova Operazione
            </Link>
          </Button>
          {cycle.state === 'active' && (
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
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
                cycle.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {cycle.state === 'active' ? 'In corso' : 'Completato'}
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
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taglia Attuale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">
                {latestOperation?.size?.code || "N/A"}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                latestOperation?.size ? getSizeColor(latestOperation.size.code) : 'bg-gray-100 text-gray-800'
              }`}>
                {latestOperation?.size?.name || "Non disponibile"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peso Medio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">
                {latestOperation?.animalsPerKg ? Math.round(1000000 / latestOperation.animalsPerKg) : "N/A"} mg
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
                                <div className="font-medium">{op.size.code} ({op.size.name})</div>
                              </div>
                            )}
                            
                            {op.notes && (
                              <div className="sm:col-span-3">
                                <div className="text-sm font-medium text-muted-foreground">Note</div>
                                <div className="text-sm">{op.notes}</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-end mt-2">
                            <Link href={`/operations/${op.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs h-7">
                                Visualizza dettagli
                              </Button>
                            </Link>
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
        </TabsContent>
        
        <TabsContent value="stats" className="mt-6">
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
                    onClick={calculateGrowthPrediction}
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
                              onClick={calculateGrowthPrediction}
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
                            {growthPrediction.summary?.finalBestWeight || "N/A"} mg
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
                            {growthPrediction.summary?.finalTheoreticalWeight || "N/A"} mg
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
                            {growthPrediction.summary?.finalWorstWeight || "N/A"} mg
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
            
            {/* Timeline di proiezione taglie - disabilitata temporaneamente per problemi di hooks 
            {latestOperation?.animalsPerKg && growthPrediction && (
              <>
                <SizeGrowthTimeline 
                  currentWeight={growthPrediction.currentWeight}
                  measurementDate={new Date(growthPrediction.lastMeasurementDate || latestOperation.date)}
                  sgrMonthlyPercentage={growthPrediction.sgrPercentage}
                  cycleId={cycle.id}
                  basketId={cycle.basketId}
                />
              </>
            )} */}
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}