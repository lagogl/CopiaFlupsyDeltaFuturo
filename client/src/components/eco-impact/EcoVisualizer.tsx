import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import EcoScoreDisplay from "./EcoScoreDisplay";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, FileTextIcon, DownloadIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Il provider di impostazioni non è richiesto per ora

// Default periodo ultimo mese
const defaultDateRange = {
  from: subMonths(new Date(), 1),
  to: new Date(),
};

interface EcoVisualizerProps {
  defaultFlupsyId?: number;
}

const EcoVisualizer: React.FC<EcoVisualizerProps> = ({ defaultFlupsyId }) => {
  const { toast } = useToast();
  
  // Stato per filtri
  const [selectedFlupsy, setSelectedFlupsy] = useState<number | undefined>(defaultFlupsyId);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  
  // Stato per dialogo report
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // Query per ottenere tutti i FLUPSY disponibili
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ["/api/flupsys"],
    staleTime: 60000, // 1 minuto
  });
  
  // Query per ottenere il punteggio di sostenibilità
  const {
    data: sustainabilityData,
    isLoading: isLoadingSustainability,
    isError: isErrorSustainability,
    error: sustainabilityError,
    refetch: refetchSustainability,
  } = useQuery({
    queryKey: [
      `/api/eco-impact/flupsys/${selectedFlupsy || "all"}/sustainability`,
      { 
        from: dateRange.from, 
        to: dateRange.to 
      }
    ],
    queryFn: async () => {
      const startDateStr = format(dateRange.from, "yyyy-MM-dd");
      const endDateStr = format(dateRange.to, "yyyy-MM-dd");
      const url = `/api/eco-impact/flupsys/${selectedFlupsy || "all"}/sustainability?startDate=${startDateStr}&endDate=${endDateStr}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: !!dateRange.from && !!dateRange.to,
    staleTime: 300000, // 5 minuti
  });
  
  // Query per ottenere gli obiettivi di sostenibilità
  const { 
    data: sustainabilityGoals,
    isLoading: isLoadingGoals,
  } = useQuery({
    queryKey: [
      '/api/eco-impact/goals',
      { flupsyId: selectedFlupsy }
    ],
    queryFn: async () => {
      const url = selectedFlupsy 
        ? `/api/eco-impact/goals?flupsyId=${selectedFlupsy}` 
        : '/api/eco-impact/goals';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    staleTime: 300000, // 5 minuti
  });
  
  // Query per ottenere i report di sostenibilità
  const {
    data: sustainabilityReports,
    isLoading: isLoadingReports,
  } = useQuery({
    queryKey: ['/api/eco-impact/reports'],
    queryFn: async () => {
      const response = await fetch('/api/eco-impact/reports');
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    staleTime: 300000, // 5 minuti
  });
  
  // Handler per il refresh dei dati
  const handleRefresh = () => {
    refetchSustainability();
    toast({
      title: "Dati aggiornati",
      description: "I dati di impatto ambientale sono stati aggiornati.",
    });
  };
  
  // Handler per visualizzare il report
  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
  };
  
  // In caso di errore durante il caricamento dei dati
  if (isErrorSustainability) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Errore durante il caricamento dei dati: {
                typeof sustainabilityError === 'object' && sustainabilityError !== null
                  ? (sustainabilityError as Error).message
                  : String(sustainabilityError)
              }
            </p>
            <Button onClick={() => refetchSustainability()}>Riprova</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Preparazione dei dati per l'EcoScoreDisplay
  const displayData = sustainabilityData?.success
    ? {
        flupsyId: selectedFlupsy,
        score: sustainabilityData.score || 0,
        impacts: sustainabilityData.impacts || {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0,
        },
        trends: sustainabilityData.trends || {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0,
        },
        suggestions: sustainabilityData.suggestions || [],
        period: {
          startDate: dateRange.from,
          endDate: dateRange.to,
        },
        loading: isLoadingSustainability,
      }
    : {
        flupsyId: selectedFlupsy,
        score: 0,
        impacts: {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0,
        },
        trends: {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0,
        },
        suggestions: [],
        period: {
          startDate: dateRange.from,
          endDate: dateRange.to,
        },
        loading: isLoadingSustainability,
      };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visualizzatore di Impatto Ambientale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="flupsy-select">FLUPSY</Label>
              {isLoadingFlupsys ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedFlupsy?.toString() || "all"}
                  onValueChange={(value) => 
                    setSelectedFlupsy(value === "all" ? undefined : parseInt(value))
                  }
                >
                  <SelectTrigger id="flupsy-select">
                    <SelectValue placeholder="Seleziona FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                    {flupsys?.map((flupsy: any) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div>
              <Label>Periodo</Label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                locale={it}
                align="start"
                className="w-full"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                className="w-full"
                disabled={isLoadingSustainability}
              >
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Aggiorna Dati
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="score" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="score">Punteggio di Impatto</TabsTrigger>
          <TabsTrigger value="goals">Obiettivi</TabsTrigger>
          <TabsTrigger value="reports">Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="score" className="space-y-4 pt-4">
          {isLoadingSustainability ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-[300px] w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <EcoScoreDisplay {...displayData} />
          )}
        </TabsContent>
        
        <TabsContent value="goals" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Obiettivi di Sostenibilità</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingGoals ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : sustainabilityGoals?.goals?.length > 0 ? (
                <div className="space-y-4">
                  {sustainabilityGoals.goals.map((goal: any) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{goal.title}</h3>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${
                            goal.status === 'completed' ? 'text-green-500' : 
                            goal.status === 'in-progress' ? 'text-yellow-500' : 
                            'text-blue-500'
                          }`}>
                            {goal.status === 'completed' ? 'Completato' : 
                             goal.status === 'in-progress' ? 'In Corso' : 
                             'Pianificato'}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Scadenza: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {goal.currentValue !== undefined && goal.targetValue !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progresso: {Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100)}%</span>
                            <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                          </div>
                          <Progress value={(goal.currentValue / goal.targetValue) * 100} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Nessun obiettivo di sostenibilità definito.</p>
                  <p className="text-sm mt-2">
                    Definisci obiettivi ambientali per monitorare i progressi nel tempo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Report di Sostenibilità</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : sustainabilityReports?.reports?.length > 0 ? (
                <div className="space-y-4">
                  {sustainabilityReports.reports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{report.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {report.reportPeriod || `Periodo: ${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Creato: {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm">{report.summary || 'Nessun dettaglio disponibile'}</p>
                        {report.highlights && (
                          <div className="mt-2">
                            <h4 className="text-xs font-semibold">Highlights</h4>
                            <ul className="mt-1 text-xs list-disc pl-4 space-y-1">
                              {Array.isArray(report.highlights) ? 
                                report.highlights.map((highlight, idx) => (
                                  <li key={idx}>{highlight}</li>
                                )) : 
                                typeof report.highlights === 'object' && report.highlights.points ? 
                                  report.highlights.points.map((point: string, idx: number) => (
                                    <li key={idx}>{point}</li>
                                  )) : 
                                  <li>Nessun highlight disponibile</li>
                              }
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <FileTextIcon className="mr-2 h-4 w-4" />
                          Visualizza Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Nessun report di sostenibilità disponibile.</p>
                  <p className="text-sm mt-2">
                    I report vengono generati automaticamente in base ai dati di impatto ambientale.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogo per visualizzazione dettagli report */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReport.title}</DialogTitle>
                <DialogDescription>
                  {selectedReport.reportPeriod || 
                    `Periodo: ${new Date(selectedReport.startDate).toLocaleDateString()} - ${new Date(selectedReport.endDate).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="text-lg font-medium">Riepilogo</h3>
                  <p className="mt-1">{selectedReport.summary || 'Nessun riepilogo disponibile'}</p>
                </div>
                
                {selectedReport.highlights && (
                  <div>
                    <h3 className="text-lg font-medium">Highlights</h3>
                    <ul className="mt-1 list-disc pl-6 space-y-1">
                      {Array.isArray(selectedReport.highlights) ? 
                        selectedReport.highlights.map((highlight: string, idx: number) => (
                          <li key={idx}>{highlight}</li>
                        )) : 
                        typeof selectedReport.highlights === 'object' && selectedReport.highlights.points ? 
                          selectedReport.highlights.points.map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                          )) : 
                          <li>Nessun highlight disponibile</li>
                      }
                    </ul>
                  </div>
                )}
                
                {selectedReport.content && (
                  <div>
                    <h3 className="text-lg font-medium">Contenuto Dettagliato</h3>
                    <div className="mt-1 prose prose-sm max-w-none">
                      {selectedReport.content}
                    </div>
                  </div>
                )}
                
                {selectedReport.recommendations && (
                  <div>
                    <h3 className="text-lg font-medium">Raccomandazioni</h3>
                    <ul className="mt-1 list-disc pl-6 space-y-1">
                      {Array.isArray(selectedReport.recommendations) ? 
                        selectedReport.recommendations.map((recommendation: string, idx: number) => (
                          <li key={idx}>{recommendation}</li>
                        )) : 
                        <li>{selectedReport.recommendations}</li>
                      }
                    </ul>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Creato: {new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                  <Button variant="outline" size="sm" onClick={() => {
                    // Qui si potrebbe aggiungere in futuro una funzionalità di download
                    toast({
                      title: "Download Report",
                      description: "Funzionalità di download in fase di sviluppo.",
                    });
                  }}>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Scarica PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcoVisualizer;