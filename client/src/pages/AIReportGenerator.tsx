import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Send, Download, Loader2, Sparkles, AlertCircle, Layers, TrendingUp, Activity, Calendar, GitCompare, Package, Users, DollarSign, CheckCircle, Clock, FileText, FileJson } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  report?: {
    filename: string;
    downloadUrl: string;
    preview?: string;
    format?: 'excel' | 'csv' | 'json';
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'quality' | 'forecast' | 'operations' | 'sales';
  prompt: string;
  icon?: string;
}

const iconMap: Record<string, any> = {
  TrendingUp,
  AlertCircle,
  Calendar,
  GitCompare,
  Package,
  Users,
  DollarSign,
  CheckCircle,
  Activity,
  Clock
};

export default function AIReportGenerator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Ciao! Sono l\'assistente AI per la generazione di report. Puoi selezionare un template pre-configurato o descrivere un report personalizzato. \n\nTemplate disponibili:\n• Performance Mensile\n• Analisi Mortalità\n• Previsione Crescita\n• Confronto FLUPSY\n• E molti altri...\n\nFormati supportati: Excel, CSV, JSON'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'json'>('excel');

  // Carica template dal backend
  const { data: templatesData } = useQuery<{ success: boolean; templates: ReportTemplate[] }>({
    queryKey: ['/api/ai/templates']
  });

  const generateReportMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest({
        url: '/api/ai/generate-report',
        method: 'POST',
        body: { prompt, format: exportFormat }
      });
      return response;
    },
    onSuccess: (data) => {
      // Aggiungi risposta dell'assistente con il report
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Report generato con successo!',
        report: data.report ? {
          filename: data.report.filename,
          downloadUrl: data.report.downloadUrl,
          preview: data.report.preview,
          format: data.report.format || 'excel'
        } : undefined
      }]);
    },
    onError: (error: any) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Errore nella generazione del report: ${error.message || 'Errore sconosciuto'}`
      }]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Aggiungi messaggio utente
    const userMessage: Message = {
      role: 'user',
      content: inputMessage
    };
    setMessages(prev => [...prev, userMessage]);

    // Invia richiesta all'AI
    generateReportMutation.mutate(inputMessage);

    // Resetta input
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mutation per generare report da template
  const generateFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, parameters }: { templateId: string; parameters?: Record<string, any> }) => {
      const response = await apiRequest({
        url: '/api/ai/generate-from-template',
        method: 'POST',
        body: { templateId, parameters, format: exportFormat }
      });
      return response;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Report generato da template con successo!',
        report: data.report ? {
          filename: data.report.filename,
          downloadUrl: data.report.downloadUrl,
          preview: data.report.preview,
          format: data.report.format || 'excel'
        } : undefined
      }]);
    },
    onError: (error: any) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Errore nella generazione del report da template: ${error.message || 'Errore sconosciuto'}`
      }]);
    }
  });

  const handleUseTemplate = (template: ReportTemplate) => {
    // Chiudi il dialog
    setShowTemplates(false);
    
    // Aggiungi messaggio utente
    setMessages(prev => [...prev, {
      role: 'user',
      content: `Template selezionato: ${template.name}`
    }]);
    
    // TODO: In futuro, mostrare form per parametri se template.parameters è definito
    // Per ora, usa parametri vuoti
    const parameters = {};
    
    // Genera report direttamente dall'endpoint template
    generateFromTemplateMutation.mutate({ templateId: template.id, parameters });
  };

  const templates = templatesData?.templates || [];
  const categoryLabels = {
    performance: 'Performance',
    quality: 'Qualità',
    forecast: 'Previsioni',
    operations: 'Operazioni',
    sales: 'Vendite'
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <PageHeader
        title="Generatore Report AI"
        description="Descrivi il report Excel che vuoi e l'AI lo genererà per te"
        icon={<Sparkles className="h-8 w-8" />}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            Chat AI per Report Excel
          </CardTitle>
          <CardDescription>
            Descrivi in linguaggio naturale il report che vuoi generare. L'AI analizzerà la richiesta, 
            estrarrà i dati dal database e creerà un file Excel pronto per il download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Area messaggi */}
          <ScrollArea className="h-[500px] w-full border rounded-md p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : message.role === 'system'
                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Sparkles className="h-4 w-4 mt-1 flex-shrink-0 text-purple-600" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        
                        {/* Mostra report se presente */}
                        {message.report && (() => {
                          const format = message.report.format || 'excel';
                          const formatConfig = {
                            excel: { icon: FileSpreadsheet, label: 'Excel', color: 'text-green-600' },
                            csv: { icon: FileText, label: 'CSV', color: 'text-blue-600' },
                            json: { icon: FileJson, label: 'JSON', color: 'text-purple-600' }
                          };
                          const config = formatConfig[format];
                          const Icon = config.icon;
                          
                          return (
                            <div className="mt-3 p-3 bg-white rounded border space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${config.color}`} />
                                  <span className="text-sm font-medium text-gray-900">
                                    {message.report.filename}
                                  </span>
                                </div>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </div>
                              
                              {message.report.preview && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                                  <pre className="whitespace-pre-wrap">{message.report.preview}</pre>
                                </div>
                              )}
                              
                              <a
                                href={message.report.downloadUrl}
                                download={message.report.filename}
                                className="inline-block"
                              >
                                <Button size="sm" className="w-full mt-2" variant="outline">
                                  <Download className="h-4 w-4 mr-2" />
                                  Scarica Report {config.label}
                                </Button>
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {generateReportMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">
                        Sto analizzando la richiesta e generando il report...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Info box */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggerimento:</strong> Sii specifico nella tua richiesta. Indica periodo temporale, 
              tipo di dati, raggruppamenti desiderati. L'AI genererà query SQL ottimizzate e formatterà i dati in Excel.
            </AlertDescription>
          </Alert>

          {/* Input area */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-open-templates">
                    <Layers className="h-4 w-4 mr-2" />
                    Template ({templates.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Template Report Pre-configurati</DialogTitle>
                    <DialogDescription>
                      Seleziona un template per generare rapidamente report comuni
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="all">Tutti</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                      <TabsTrigger value="quality">Qualità</TabsTrigger>
                      <TabsTrigger value="forecast">Previsioni</TabsTrigger>
                      <TabsTrigger value="operations">Operazioni</TabsTrigger>
                      <TabsTrigger value="sales">Vendite</TabsTrigger>
                    </TabsList>
                    
                    {['all', 'performance', 'quality', 'forecast', 'operations', 'sales'].map((category) => (
                      <TabsContent key={category} value={category} className="space-y-2">
                        <ScrollArea className="h-[400px]">
                          <div className="grid gap-3 p-1">
                            {templates
                              .filter((t: ReportTemplate) => category === 'all' || t.category === category)
                              .map((template: ReportTemplate) => {
                                const IconComponent = template.icon ? iconMap[template.icon] : FileSpreadsheet;
                                return (
                                  <Card
                                    key={template.id}
                                    className="cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => handleUseTemplate(template)}
                                    data-testid={`template-${template.id}`}
                                  >
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        {IconComponent && <IconComponent className="h-4 w-4" />}
                                        {template.name}
                                        <Badge variant="outline" className="ml-auto">
                                          {categoryLabels[template.category]}
                                        </Badge>
                                      </CardTitle>
                                      <CardDescription className="text-sm">
                                        {template.description}
                                      </CardDescription>
                                    </CardHeader>
                                  </Card>
                                );
                              })}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Selector formato export */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Formato Export:</span>
              <ToggleGroup 
                type="single" 
                value={exportFormat} 
                onValueChange={(value) => value && setExportFormat(value as 'excel' | 'csv' | 'json')}
                data-testid="toggle-export-format"
              >
                <ToggleGroupItem value="excel" aria-label="Excel" data-testid="format-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </ToggleGroupItem>
                <ToggleGroupItem value="csv" aria-label="CSV" data-testid="format-csv">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </ToggleGroupItem>
                <ToggleGroupItem value="json" aria-label="JSON" data-testid="format-json">
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </ToggleGroupItem>
              </ToggleGroup>
              <Badge variant="secondary" className="ml-auto">
                {exportFormat.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Esempio: 'Voglio un report con tutte le operazioni di vagliatura dell'ultimo mese, raggruppate per FLUPSY'"
                className="flex-1"
                rows={3}
                disabled={generateReportMutation.isPending}
                data-testid="textarea-report-prompt"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || generateReportMutation.isPending}
                size="lg"
                data-testid="button-send-report-request"
              >
                {generateReportMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
