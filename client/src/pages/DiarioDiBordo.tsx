import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Download, Share, Filter, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";

// Mappa dei tipi di operazione alle loro etichette in italiano
const operationLabels = {
  'prima-attivazione': 'Prima Attivazione',
  'prima-attivazione-da-vagliatura': 'Prima Attivazione da Vagliatura',
  'pulizia': 'Pulizia',
  'vagliatura': 'Vagliatura',
  'trattamento': 'Trattamento',
  'misura': 'Misura',
  'vendita': 'Vendita',
  'selezione-vendita': 'Selezione per Vendita',
  'selezione-origine': 'Selezione Origine',
  'cessazione': 'Cessazione',
  'peso': 'Peso'
};

// Ottieni il tipo di operazione formattato
const getOperationTypeLabel = (type: string) => {
  return operationLabels[type] || type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Funzione per creare il testo formattato per WhatsApp
const createWhatsAppText = (data: any, date: Date) => {
  const dateFormatted = format(date, 'dd MMMM yyyy', { locale: it });
  
  let text = `*DIARIO DI BORDO - ${dateFormatted.toUpperCase()}*\n\n`;
  
  // Riepilogo delle operazioni
  text += `📋 *OPERAZIONI EFFETTUATE*\n`;
  data.operations.forEach((op: any, index: number) => {
    const opTime = op.created_at ? format(new Date(op.created_at), 'HH:mm') : 'N/D';
    const flupsyName = op.flupsy_name || 'N/D';
    const basketNumber = op.basket_number || 'N/D';
    const animalCount = op.animal_count ? op.animal_count.toLocaleString('it-IT') : 'N/D';
    const animalsPerKg = op.animals_per_kg ? op.animals_per_kg.toLocaleString('it-IT') : 'N/D';
    const sizeCode = op.size_code || 'N/D';
    
    text += `${index + 1}. ${opTime} - ${getOperationTypeLabel(op.type)} - Cestello #${basketNumber} (${flupsyName})\n`;
    text += `   ${animalCount} animali (${animalsPerKg}/kg)`;
    if (sizeCode !== 'N/D') {
      text += ` - Taglia ${sizeCode}`;
    }
    if (op.notes) {
      text += `\n   Note: ${op.notes}`;
    }
    text += '\n\n';
  });
  
  // Statistiche per taglia
  text += `📊 *RIEPILOGO PER TAGLIA*\n`;
  data.sizeStats.forEach((stat: any) => {
    text += `${stat.taglia}: ${stat.entrate.toLocaleString('it-IT')} entrate, ${stat.uscite.toLocaleString('it-IT')} uscite\n`;
  });
  text += '\n';
  
  // Bilancio giornata
  text += `🧮 *BILANCIO GIORNALIERO*\n`;
  text += `Entrate: ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Uscite: ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Bilancio netto: ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Totale operazioni: ${data.totals.numero_operazioni}\n`;
  
  return text;
};

// Funzione per copiare negli appunti
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert('Testo copiato negli appunti! Puoi incollarlo direttamente su WhatsApp.');
    })
    .catch(err => {
      console.error('Errore durante la copia: ', err);
      alert('Errore durante la copia del testo. Riprova o copia manualmente.');
    });
};

// Funzione per convertire in CSV
const downloadCSV = (data: any, date: Date) => {
  const dateFormatted = format(date, 'yyyy-MM-dd');
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Intestazione
  csvContent += "Data,Ora,Tipo,Cestello,Flupsy,NumeroAnimali,AnimaliPerKg,Taglia,Note\n";
  
  // Righe dati
  data.operations.forEach((op: any) => {
    const opTime = op.created_at ? format(new Date(op.created_at), 'HH:mm') : '';
    const row = [
      op.date,
      opTime,
      getOperationTypeLabel(op.type),
      op.basket_number || '',
      op.flupsy_name || '',
      op.animal_count || '',
      op.animals_per_kg || '',
      op.size_code || '',
      (op.notes || '').replace(/,/g, ';') // Sostituisce le virgole nelle note per evitare problemi CSV
    ];
    csvContent += row.join(',') + '\n';
  });
  
  // Download del file
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `diario-bordo-${dateFormatted}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Funzione principale per condividere su WhatsApp
const shareOnWhatsApp = (text: string) => {
  // Codifica il testo per URL
  const encodedText = encodeURIComponent(text);
  // Crea URL per WhatsApp web
  const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
  
  // Apri in una nuova finestra
  window.open(whatsappUrl, '_blank');
};

export default function DiarioDiBordo() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [whatsAppText, setWhatsAppText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('diario');
  
  // Formatta la data per la query dell'API
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  
  // Carica le operazioni per la data selezionata
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/diario/operations-by-date', formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/diario/operations-by-date?date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle operazioni');
      }
      return response.json();
    },
    enabled: !!formattedDate
  });
  
  // Carica le statistiche per taglia
  const { data: sizeStats, isLoading: isLoadingSizeStats } = useQuery({
    queryKey: ['/api/diario/size-stats', formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/diario/size-stats?date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle statistiche per taglia');
      }
      return response.json();
    },
    enabled: !!formattedDate
  });
  
  // Carica i totali del giorno
  const { data: totals, isLoading: isLoadingTotals } = useQuery({
    queryKey: ['/api/diario/daily-totals', formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/diario/daily-totals?date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei totali giornalieri');
      }
      return response.json();
    },
    enabled: !!formattedDate
  });
  
  // Combina tutti i dati per la visualizzazione e per il testo WhatsApp
  const diaryData = {
    operations: operations || [],
    sizeStats: sizeStats || [],
    totals: totals || { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 }
  };
  
  // Aggiorna il testo di WhatsApp quando cambiano i dati
  useEffect(() => {
    if (operations && sizeStats && totals) {
      const text = createWhatsAppText(diaryData, selectedDate);
      setWhatsAppText(text);
    }
  }, [operations, sizeStats, totals, selectedDate]);
  
  // Determina lo stato di caricamento generale
  const isLoading = isLoadingOperations || isLoadingSizeStats || isLoadingTotals;
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Diario di Bordo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="md:col-span-3">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                Attività del {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(whatsAppText)}
                  title="Copia testo per WhatsApp"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Copia
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadCSV(diaryData, selectedDate)}
                  title="Scarica come CSV"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => shareOnWhatsApp(whatsAppText)}
                  title="Condividi su WhatsApp"
                >
                  <Share className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
            <CardDescription>
              Riepilogo delle operazioni, statistiche e bilancio giornaliero.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="diario">Diario</TabsTrigger>
                <TabsTrigger value="statistiche">Statistiche</TabsTrigger>
                <TabsTrigger value="anteprima">Anteprima WhatsApp</TabsTrigger>
              </TabsList>
              
              <TabsContent value="diario" className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : operations && operations.length > 0 ? (
                  <div className="space-y-4">
                    {operations.map((op: any) => (
                      <Card key={op.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <Badge className="mr-2" variant="outline">
                              {getOperationTypeLabel(op.type)}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(op.date), 'HH:mm')}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            Cestello #{op.basket_number || 'N/D'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Flupsy</p>
                            <p className="font-medium">{op.flupsy_name || 'N/D'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Animali</p>
                            <p className="font-medium">{op.animal_count ? op.animal_count.toLocaleString('it-IT') : 'N/D'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Animali/kg</p>
                            <p className="font-medium">{op.animals_per_kg ? op.animals_per_kg.toLocaleString('it-IT') : 'N/D'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Taglia</p>
                            <p className="font-medium">{op.size_code || 'N/D'}</p>
                          </div>
                        </div>
                        
                        {op.notes && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">Note</p>
                            <p className="text-sm">{op.notes}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <p className="text-muted-foreground">Nessuna operazione registrata per questa data.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="statistiche">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <Card className="mb-6">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg">Statistiche per Taglia</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {sizeStats && sizeStats.length > 0 ? (
                          <div className="space-y-2">
                            {sizeStats.map((stat: any, index: number) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <Badge>{stat.taglia}</Badge>
                                  <span className="text-sm text-muted-foreground">{stat.num_operazioni} operazioni</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Entrate</p>
                                    <p className="text-lg font-semibold text-emerald-600">
                                      {stat.entrate.toLocaleString('it-IT')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Uscite</p>
                                    <p className="text-lg font-semibold text-red-600">
                                      {stat.uscite.toLocaleString('it-IT')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-6 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Nessuna statistica disponibile per questa data.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg">Bilancio Giornaliero</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {totals ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">Entrate</p>
                              <p className="text-lg font-semibold text-emerald-600">
                                {totals.totale_entrate ? totals.totale_entrate.toLocaleString('it-IT') : '0'}
                              </p>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">Uscite</p>
                              <p className="text-lg font-semibold text-red-600">
                                {totals.totale_uscite ? totals.totale_uscite.toLocaleString('it-IT') : '0'}
                              </p>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">Bilancio Netto</p>
                              <p className={`text-lg font-semibold ${totals.bilancio_netto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {totals.bilancio_netto ? totals.bilancio_netto.toLocaleString('it-IT') : '0'}
                              </p>
                            </div>
                            <div className="p-3 border rounded-lg">
                              <p className="text-xs text-muted-foreground">N° Operazioni</p>
                              <p className="text-lg font-semibold">
                                {totals.numero_operazioni}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-6 bg-muted rounded-lg">
                            <p className="text-muted-foreground">Nessun dato di bilancio disponibile.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="anteprima">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg">Anteprima Messaggio WhatsApp</CardTitle>
                      <CardDescription>
                        Così apparirà il tuo messaggio su WhatsApp
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ScrollArea className="h-[400px] w-full rounded border p-4 bg-green-50">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{whatsAppText}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">Seleziona data</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <span className="text-sm text-muted-foreground">Data</span>
                <DatePicker
                  date={selectedDate}
                  setDate={setSelectedDate}
                  className="w-full"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Azioni rapide</h4>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(new Date())}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Oggi
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Ieri
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}