import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, BarChart3, Leaf, AlertTriangle, TrendingUp, Shield, Zap } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AIHealthStatus {
  status: 'connected' | 'autonomous' | 'offline' | 'not_configured' | 'error';
  model: string;
  provider: string;
}

interface PredictiveAnalysis {
  predictedGrowthRate: number;
  optimalHarvestDate: string;
  targetSizeDate: string;
  growthFactors: Array<{ factor: string; impact: number; recommendation: string }>;
  confidence: number;
}

interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'growth' | 'mortality' | 'environmental' | 'operational';
  description: string;
  recommendation: string;
  confidence: number;
}

interface SustainabilityAnalysis {
  carbonFootprint: number;
  waterUsageEfficiency: number;
  energyEfficiency: number;
  wasteReduction: number;
  overallScore: number;
  recommendations: string[];
  certificationReadiness: {
    organic: boolean;
    sustainable: boolean;
    lowImpact: boolean;
  };
}

export default function AIDashboard() {
  const [selectedFlupsy, setSelectedFlupsy] = useState<number | null>(2516); // Default FLUPSY per test
  const [timeframe, setTimeframe] = useState<string>('7');
  
  const queryClient = useQueryClient();

  // Query per controllare lo stato AI
  const { data: aiHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/ai/health'],
    refetchInterval: 30000 // Refresh ogni 30 secondi
  });

  // Query per FLUPSY disponibili
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys']
  });

  // Mutation per analisi predittiva
  const predictiveAnalysisMutation = useMutation({
    mutationFn: (data: { flupsyId?: number; basketIds?: number[]; basketId?: number; targetSizeId?: number; days?: number }) =>
      apiRequest({
        url: "/api/ai/predictive-growth",
        method: "POST",
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/predictive-growth'] });
    }
  });

  // Query per rilevamento anomalie
  const { data: anomalies, isLoading: anomaliesLoading, refetch: refetchAnomalies } = useQuery({
    queryKey: ['/api/ai/anomaly-detection', { flupsyId: selectedFlupsy, days: timeframe }],
    enabled: false // Abilita solo quando richiesto
  });

  // Query per analisi sostenibilità
  const { data: sustainability, isLoading: sustainabilityLoading, refetch: refetchSustainability } = useQuery({
    queryKey: ['/api/ai/sustainability', { flupsyId: selectedFlupsy, timeframe }],
    enabled: false
  });

  // Query per business analytics
  const { data: businessAnalytics, refetch: refetchBusinessAnalytics } = useQuery({
    queryKey: ['/api/ai/business-analytics', { timeframe }],
    enabled: false
  });

  const handlePredictiveAnalysis = () => {
    console.log('Analisi predittiva avviata con:', { selectedFlupsy, timeframe });
    if (selectedFlupsy) {
      // Analisi per FLUPSY intera (tutti i cestelli)
      // Nota: Il backend caricherà automaticamente tutti i cestelli del FLUPSY
      const payload = { 
        flupsyId: selectedFlupsy,
        basketIds: [], // Il backend caricherà automaticamente tutti i cestelli
        targetSizeId: 22, // TP-2800 (taglia commerciale standard)
        days: parseInt(timeframe) || 30 
      };
      
      console.log('Payload API:', payload);
      predictiveAnalysisMutation.mutate(payload);
    } else {
      console.error('Nessun FLUPSY selezionato');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCertificationIcon = (certified: boolean) => certified ? '✅' : '❌';

  return (
    <div className="space-y-6">
      <PageHeader title="AI Dashboard" />
      
      {/* Stato AI */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Stato Servizi AI
            </CardTitle>
            <CardDescription>Connessione e stato dei moduli AI integrati</CardDescription>
          </div>
          <Badge variant={
            (aiHealth as AIHealthStatus)?.status === 'connected' ? 'default' : 
            (aiHealth as AIHealthStatus)?.status === 'autonomous' ? 'secondary' : 'destructive'
          }>
            {healthLoading ? 'Verificando...' : 
             (aiHealth as AIHealthStatus)?.status === 'connected' ? 'Connesso (Esterno)' : 
             (aiHealth as AIHealthStatus)?.status === 'autonomous' ? 'Autonomo (Interno)' : 'Offline'}
          </Badge>
        </CardHeader>
        <CardContent>
          {(aiHealth as AIHealthStatus) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Brain className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold">Modulo Predittivo</h3>
                <p className="text-sm text-gray-600">
                  {(aiHealth as AIHealthStatus)?.status === 'autonomous' ? 'Algoritmi interni attivi' : 'Analisi crescita avanzata'}
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold">Analytics AI</h3>
                <p className="text-sm text-gray-600">
                  {(aiHealth as AIHealthStatus)?.status === 'autonomous' ? 'Analisi statistiche integrate' : 'Business Intelligence'}
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Leaf className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <h3 className="font-semibold">Sostenibilità</h3>
                <p className="text-sm text-gray-600">Impatto ambientale</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controlli Globali */}
      <Card>
        <CardHeader>
          <CardTitle>Controlli Analisi</CardTitle>
          <CardDescription>Seleziona parametri per l'analisi AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">FLUPSY</label>
              <Select value={selectedFlupsy?.toString() || ""} onValueChange={(value) => setSelectedFlupsy(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  {(flupsys as any[])?.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo Analisi</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 giorni</SelectItem>
                  <SelectItem value="14">14 giorni</SelectItem>
                  <SelectItem value="30">30 giorni</SelectItem>
                  <SelectItem value="60">60 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs per i moduli AI */}
      <Tabs defaultValue="predictive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictive">AI Predittivo</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sustainability">Sostenibilità</TabsTrigger>
        </TabsList>

        {/* Modulo 1: AI Predittivo */}
        <TabsContent value="predictive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analisi Predittiva Crescita
              </CardTitle>
              <CardDescription>
                Previsioni avanzate di crescita basate su dati ambientali e storici
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handlePredictiveAnalysis}
                disabled={!selectedFlupsy || predictiveAnalysisMutation.isPending}
                className="w-full"
              >
                {predictiveAnalysisMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analizzando...
                  </div>
                ) : (
                  'Avvia Analisi Predittiva'
                )}
              </Button>

              {(predictiveAnalysisMutation.data as any)?.prediction && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-blue-900">
                    Analisi Predittiva FLUPSY - {(flupsys as any[])?.find(f => f.id === selectedFlupsy)?.name}
                  </h4>
                  
                  {/* Riepilogo FLUPSY */}
                  {(predictiveAnalysisMutation.data as any).prediction.summary && (
                    <div className="bg-white p-4 rounded-lg">
                      <h5 className="font-medium mb-3">Riepilogo Analisi FLUPSY</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded">
                          <p className="text-2xl font-bold text-blue-600">
                            {(predictiveAnalysisMutation.data as any).prediction.summary.totalBaskets}
                          </p>
                          <p className="text-sm text-gray-600">Cestelli Totali</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded">
                          <p className="text-2xl font-bold text-green-600">
                            {(predictiveAnalysisMutation.data as any).prediction.summary.analyzedBaskets}
                          </p>
                          <p className="text-sm text-gray-600">Analizzati</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded">
                          <p className="text-2xl font-bold text-purple-600">
                            {((predictiveAnalysisMutation.data as any).prediction.summary.avgGrowthRate * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-600">Confidenza Media</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dettagli per singolo cestello */}
                  {(predictiveAnalysisMutation.data as any).prediction.basketPredictions && (
                    <div className="space-y-3">
                      <h5 className="font-medium">Analisi per Cestello</h5>
                      {(predictiveAnalysisMutation.data as any).prediction.basketPredictions.map((basketPred: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded-lg border">
                          <div className="flex justify-between items-center mb-3">
                            <h6 className="font-medium">Cesta #{basketPred.basketNumber}</h6>
                            <Badge variant="outline">ID: {basketPred.basketId}</Badge>
                          </div>
                          
                          {basketPred.prediction?.predictions && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {basketPred.prediction.predictions.slice(0, 5).map((pred: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                  <span>Giorno {pred.days}</span>
                                  <div className="flex items-center gap-2">
                                    <span>{pred.predictedWeight}g</span>
                                    <Badge variant={pred.confidence > 0.7 ? 'default' : 'secondary'}>
                                      {(pred.confidence * 100).toFixed(0)}%
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Insights e raccomandazioni */}
                  {(predictiveAnalysisMutation.data as any).prediction.summary?.insights && (
                    <div className="bg-green-50 p-3 rounded">
                      <h5 className="font-medium text-green-800 mb-2">Insights AI</h5>
                      <ul className="space-y-1">
                        {(predictiveAnalysisMutation.data as any).prediction.summary.insights.map((insight: string, index: number) => (
                          <li key={index} className="text-sm text-green-700">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(predictiveAnalysisMutation.data as any).prediction.summary?.recommendations && (
                    <div className="bg-orange-50 p-3 rounded">
                      <h5 className="font-medium text-orange-800 mb-2">Raccomandazioni</h5>
                      <ul className="space-y-1">
                        {(predictiveAnalysisMutation.data as any).prediction.summary.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm text-orange-700">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modulo 3: Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Rilevamento Anomalie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Rilevamento Anomalie
                </CardTitle>
                <CardDescription>Identificazione automatica di problemi operativi</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => refetchAnomalies()}
                  disabled={anomaliesLoading}
                  className="w-full mb-4"
                >
                  {anomaliesLoading ? 'Analizzando...' : 'Rileva Anomalie'}
                </Button>

                {(anomalies as any)?.anomalies && (
                  <div className="space-y-2">
                    {(anomalies as any).anomalies.map((anomaly: AnomalyDetection, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{anomaly.type}</Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{anomaly.description}</p>
                        <p className="text-xs text-gray-600 mb-2">{anomaly.recommendation}</p>
                        <div className="text-xs text-gray-500">
                          Confidenza: {(anomaly.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                    
                    {(anomalies as any).anomalies.length === 0 && (
                      <p className="text-center text-green-600 py-4">
                        ✅ Nessuna anomalia rilevata
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Business Intelligence
                </CardTitle>
                <CardDescription>Analisi pattern e tendenze di business</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => refetchBusinessAnalytics()}
                  className="w-full mb-4"
                >
                  Analizza Business Patterns
                </Button>

                {(businessAnalytics as any)?.analysis && (
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium mb-2">Efficienza Operativa</h5>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(businessAnalytics as any).analysis.operationalEfficiency?.score || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {(businessAnalytics as any).analysis.operationalEfficiency?.score || 0}/100
                        </span>
                      </div>
                    </div>

                    {(businessAnalytics as any).analysis.profitabilityAnalysis && (
                      <div>
                        <h5 className="font-medium mb-2">Margini</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Corrente:</span>
                            <span className="font-medium ml-1">
                              {(businessAnalytics as any).analysis.profitabilityAnalysis.currentMargin?.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Previsto:</span>
                            <span className="font-medium ml-1">
                              {(businessAnalytics as any).analysis.profitabilityAnalysis.projectedMargin?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modulo 8: Sostenibilità */}
        <TabsContent value="sustainability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Analisi Sostenibilità e Compliance
              </CardTitle>
              <CardDescription>
                Valutazione impatto ambientale e conformità normativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => refetchSustainability()}
                disabled={sustainabilityLoading}
                className="w-full mb-4"
              >
                {sustainabilityLoading ? 'Analizzando...' : 'Analizza Sostenibilità'}
              </Button>

              {(sustainability as any)?.analysis && (
                <div className="space-y-4">
                  
                  {/* Score Complessivo */}
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Score Sostenibilità</h4>
                    <div className="text-3xl font-bold text-green-600">
                      {(sustainability as any).analysis.overallScore}/100
                    </div>
                  </div>

                  {/* Metriche Dettagliate */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <h5 className="text-sm font-medium text-gray-600">Carbon Footprint</h5>
                      <p className="text-lg font-bold">{(sustainability as any).analysis.carbonFootprint?.toFixed(1)} kg CO₂</p>
                    </div>
                    
                    <div className="text-center p-3 border rounded-lg">
                      <h5 className="text-sm font-medium text-gray-600">Efficienza Idrica</h5>
                      <p className="text-lg font-bold">{(sustainability as any).analysis.waterUsageEfficiency}/100</p>
                    </div>
                    
                    <div className="text-center p-3 border rounded-lg">
                      <h5 className="text-sm font-medium text-gray-600">Efficienza Energetica</h5>
                      <p className="text-lg font-bold">{(sustainability as any).analysis.energyEfficiency}/100</p>
                    </div>
                    
                    <div className="text-center p-3 border rounded-lg">
                      <h5 className="text-sm font-medium text-gray-600">Riduzione Rifiuti</h5>
                      <p className="text-lg font-bold">{(sustainability as any).analysis.wasteReduction}/100</p>
                    </div>
                  </div>

                  {/* Certificazioni */}
                  {(sustainability as any).analysis.certificationReadiness && (
                    <div>
                      <h5 className="font-medium mb-2">Readiness Certificazioni</h5>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <span>{getCertificationIcon((sustainability as any).analysis.certificationReadiness.organic)}</span>
                          <span className="text-sm">Biologico</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <span>{getCertificationIcon((sustainability as any).analysis.certificationReadiness.sustainable)}</span>
                          <span className="text-sm">Sostenibile</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <span>{getCertificationIcon((sustainability as any).analysis.certificationReadiness.lowImpact)}</span>
                          <span className="text-sm">Basso Impatto</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raccomandazioni */}
                  {(sustainability as any).analysis.recommendations?.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Raccomandazioni</h5>
                      <ul className="space-y-1">
                        {(sustainability as any).analysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}