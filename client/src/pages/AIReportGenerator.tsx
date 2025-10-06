import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Send, Download, Loader2, Sparkles, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  report?: {
    filename: string;
    downloadUrl: string;
    preview?: string;
  };
}

export default function AIReportGenerator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Ciao! Sono l\'assistente AI per la generazione di report Excel. Descrivi il tipo di report che vuoi creare e lo genererò per te estraendo i dati dal database. \n\nEsempi:\n- "Voglio un report con tutte le operazioni dell\'ultimo mese"\n- "Crea un Excel con i lotti e le loro giacenze"\n- "Genera un report delle vendite per FLUPSY con totali"\n- "Report mortalità per lotto negli ultimi 30 giorni"'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const generateReportMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest({
        url: '/api/ai/generate-report',
        method: 'POST',
        body: { prompt }
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
          preview: data.report.preview
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
                        {message.report && (
                          <div className="mt-3 p-3 bg-white rounded border space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  {message.report.filename}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-green-600">
                                Excel
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
                                Scarica Report Excel
                              </Button>
                            </a>
                          </div>
                        )}
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
        </CardContent>
      </Card>
    </div>
  );
}
