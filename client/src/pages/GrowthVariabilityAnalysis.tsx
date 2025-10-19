import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  PlayCircle,
  Download,
  Lightbulb,
  BarChart3,
  Scissors,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

export default function GrowthVariabilityAnalysis() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [latestResults, setLatestResults] = useState<any>(null);

  // Recupera storico analisi
  const { data: runsData } = useQuery<{ runs: any[] }>({
    queryKey: ["/api/growth-variability/runs"],
    refetchInterval: analysisRunning ? 3000 : false,
  });

  // Mutation per eseguire analisi
  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      setAnalysisRunning(true);
      const response = await apiRequest("/api/growth-variability/analyze", {
        method: "POST",
        body: JSON.stringify({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      setAnalysisRunning(false);
      setLatestResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/growth-variability/runs"] });
      toast({
        title: "✅ Analisi completata",
        description: `${data.datasetSize} operazioni analizzate con successo`,
      });
    },
    onError: (error: any) => {
      setAnalysisRunning(false);
      toast({
        title: "❌ Errore analisi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runs = runsData?.runs || [];
  const results = latestResults || (runs.length > 0 ? runs[0].results : null);
  const insights = latestResults?.insights || (runs.length > 0 ? runs[0].insights : []) || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Analisi Variabilità Crescita AI
          </h1>
          <p className="text-muted-foreground mt-1">
            Modellazione AI della variazione di crescita intra-popolazione con considerazione eventi di vagliatura
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Esegui Nuova Analisi</CardTitle>
          <CardDescription>
            Analizza la distribuzione di crescita, clustering cestelli e impatto vagliature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Da</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data A</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => runAnalysisMutation.mutate()}
                disabled={analysisRunning}
                className="w-full"
                data-testid="button-run-analysis"
              >
                {analysisRunning ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Esegui Analisi AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Insights AI Principali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {results && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="distribution">
              📊 Distribuzione
            </TabsTrigger>
            <TabsTrigger value="clusters">
              🎯 Clustering
            </TabsTrigger>
            <TabsTrigger value="screening">
              <Scissors className="mr-2 h-4 w-4" />
              Vagliature
            </TabsTrigger>
            <TabsTrigger value="position">
              <MapPin className="mr-2 h-4 w-4" />
              Posizioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Operazioni Analizzate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-operations-count">
                    {latestResults?.datasetSize || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cestelli Profilati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-baskets-count">
                    {results?.basketProfiles?.length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Distribuzioni Calcolate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-distributions-count">
                    {results?.distributions?.length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Vagliature Analizzate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-screenings-count">
                    {results?.screeningImpacts?.length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Storico Analisi Recenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {runs.slice(0, 5).map((run: any) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                      data-testid={`run-item-${run.id}`}
                    >
                      <div>
                        <div className="font-medium">
                          Analisi #{run.id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(run.executedAt), "dd/MM/yyyy HH:mm")} - {run.datasetSize} operazioni
                        </div>
                      </div>
                      <Badge variant={run.status === "completed" ? "default" : "destructive"}>
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Crescita per Taglia/Mese</CardTitle>
                <CardDescription>
                  Statistiche SGR (media, mediana, percentili) per ogni taglia e mese
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results?.distributions?.slice(0, 10).map((dist: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg" data-testid={`distribution-item-${idx}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          Taglia ID: {dist.sizeId} - Mese {dist.month}/{dist.year}
                        </div>
                        <Badge variant="outline">{dist.sampleSize} campioni</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Media:</span>{" "}
                          <span className="font-medium">{dist.meanSgr?.toFixed(3)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mediana:</span>{" "}
                          <span className="font-medium">{dist.medianSgr?.toFixed(3)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Std Dev:</span>{" "}
                          <span className="font-medium">±{dist.stdDeviation?.toFixed(3)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>{" "}
                          <Badge variant="secondary">{dist.distributionType}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Range: {dist.minSgr?.toFixed(3)}% - {dist.maxSgr?.toFixed(3)}% | 
                        P25: {dist.percentile25?.toFixed(3)}% | 
                        P75: {dist.percentile75?.toFixed(3)}% |
                        P90: {dist.percentile90?.toFixed(3)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clustering Cestelli (Fast/Average/Slow)</CardTitle>
                <CardDescription>
                  Classificazione cestelli in base alla velocità di crescita
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Fast Growers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {results?.basketProfiles?.filter((p: any) => p.growthCluster === 'fast').length || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Minus className="h-4 w-4 text-blue-600" />
                        Average Growers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {results?.basketProfiles?.filter((p: any) => p.growthCluster === 'average').length || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                        Slow Growers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {results?.basketProfiles?.filter((p: any) => p.growthCluster === 'slow').length || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results?.basketProfiles?.slice(0, 50).map((profile: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg ${
                        profile.growthCluster === 'fast' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' :
                        profile.growthCluster === 'slow' ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20' :
                        'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20'
                      }`}
                      data-testid={`profile-item-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Cestello #{profile.basketId}</span>
                          <Badge variant={
                            profile.growthCluster === 'fast' ? 'default' :
                            profile.growthCluster === 'slow' ? 'destructive' :
                            'secondary'
                          }>
                            {profile.growthCluster}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {profile.sgrDeviation > 0 ? '+' : ''}{profile.sgrDeviation?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Posizione: {profile.influencingFactors?.position?.row}-{profile.influencingFactors?.position?.position} | 
                          Densità: {Math.round(profile.influencingFactors?.avgDensity || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="screening" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Impatto Vagliature sulla Distribuzione</CardTitle>
                <CardDescription>
                  Analisi del bias di selezione causato dalle vagliature
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results?.screeningImpacts?.length > 0 ? (
                  <div className="space-y-3">
                    {results.screeningImpacts.map((impact: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg" data-testid={`screening-impact-${idx}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Vagliatura #{impact.screeningId}</div>
                          <Badge variant="outline">Bias: {impact.selectionBias?.toFixed(1)}%</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Venduti</div>
                            <div className="font-medium text-green-600">{impact.animalsSold?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Riposizionati</div>
                            <div className="font-medium text-blue-600">{impact.animalsRepositioned?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Fast Rimossi</div>
                            <div className="font-medium text-orange-600">{impact.fastGrowersRemoved?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Slow Mantenuti</div>
                            <div className="font-medium text-purple-600">{impact.slowGrowersRetained?.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nessuna vagliatura analizzata nel periodo selezionato
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="position" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Heatmap Posizioni FLUPSY</CardTitle>
                <CardDescription>
                  Distribuzione cluster crescita per posizione fisica
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestResults?.visualizationData?.positionHeatmap?.length > 0 ? (
                  <div className="space-y-2">
                    {latestResults.visualizationData.positionHeatmap.map((pos: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2" data-testid={`position-heatmap-${idx}`}>
                        <div className="w-20 text-sm font-medium">
                          {pos.row}-{pos.position}
                        </div>
                        <div className="flex-1 flex h-8 rounded overflow-hidden border">
                          <div
                            className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${pos.fastPercentage}%` }}
                          >
                            {pos.fastPercentage > 10 ? `${Math.round(pos.fastPercentage)}%` : ''}
                          </div>
                          <div
                            className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${pos.averagePercentage}%` }}
                          >
                            {pos.averagePercentage > 10 ? `${Math.round(pos.averagePercentage)}%` : ''}
                          </div>
                          <div
                            className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${pos.slowPercentage}%` }}
                          >
                            {pos.slowPercentage > 10 ? `${Math.round(pos.slowPercentage)}%` : ''}
                          </div>
                        </div>
                        <div className="w-16 text-sm text-muted-foreground">
                          {pos.totalBaskets} cest.
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nessun dato posizione disponibile
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!results && !analysisRunning && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessuna analisi disponibile</h3>
            <p className="text-muted-foreground text-center mb-4">
              Esegui la prima analisi AI per visualizzare i risultati
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
