import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Download, Share, Filter, Clock, Mail, Loader2 } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// Mappa dei tipi di operazione alle loro etichette in italiano
const operationLabels: Record<string, string> = {
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

// Assegna varianti di colore per tipo di operazione
const getBadgeVariantForOperationType = (type: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case 'prima-attivazione':
    case 'prima-attivazione-da-vagliatura':
      return "default"; // Blu
    case 'pulizia':
      return "secondary"; // Grigio
    case 'vagliatura':
    case 'selezione-vendita':
    case 'selezione-origine':
      return "destructive"; // Rosso
    default:
      return "outline";
  }
};

// Funzione per creare il testo formattato per email e altre visualizzazioni
const createFormattedText = (data: any, date: Date) => {
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
    let sizeCode = op.size_code || 'N/D';
    if (sizeCode === 'Non specificata') {
      sizeCode = 'In attesa di misurazione';
    }
    
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
    const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
    text += `${tagliaMostrata}: ${stat.entrate ? stat.entrate.toLocaleString('it-IT') : '0'} entrate, ${stat.uscite ? stat.uscite.toLocaleString('it-IT') : '0'} uscite\n`;
  });
  text += '\n';
  
  // Giacenza alla data corrente
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    text += `📈 *GIACENZA AL ${dateFormatted.toUpperCase()}*\n`;
    text += `Totale: ${data.giacenza.totale_giacenza.toLocaleString('it-IT')} animali\n`;
    
    // Dettaglio giacenza per taglia
    if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
      text += `Dettaglio:\n`;
      data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
        const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
        text += `- ${tagliaMostrata}: ${taglia.quantita.toLocaleString('it-IT')} animali\n`;
      });
    }
    text += '\n';
  }
  
  // Bilancio giornata
  text += `🧮 *BILANCIO GIORNALIERO*\n`;
  text += `Entrate: ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Uscite: ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Bilancio netto: ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Totale operazioni: ${data.totals.numero_operazioni}\n\n`;
  
  // Bilancio finale
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
    text += `🏁 *BILANCIO FINALE*\n`;
    text += `Giacenza + Bilancio netto: ${bilancioFinale.toLocaleString('it-IT')} animali\n`;
  }
  
  return text;
};

// Funzione per copiare negli appunti
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert('Testo copiato negli appunti!');
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
      (op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code) || '',
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

export default function DiarioDiBordo() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formattedText, setFormattedText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('diario');
  
  // Stati per il dialogo di invio email
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState<boolean>(false);
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [emailCC, setEmailCC] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailDialogTab, setEmailDialogTab] = useState<string>('config');
  
  // Stati per la configurazione automatica email
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<string>('18:00');
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  
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
  
  // Carica la giacenza alla data selezionata
  const { data: giacenza, isLoading: isLoadingGiacenza } = useQuery({
    queryKey: ['/api/diario/giacenza', formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/diario/giacenza?date=${formattedDate}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento della giacenza');
      }
      return response.json();
    },
    enabled: !!formattedDate
  });
  
  // Combina tutti i dati per la visualizzazione
  const diaryData = {
    operations: operations || [],
    sizeStats: sizeStats || [],
    totals: totals || { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
    giacenza: giacenza || { totale_giacenza: 0, dettaglio_taglie: [] }
  };
  
  // Carica la configurazione email all'apertura del dialogo
  const loadEmailConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch('/api/email/config');
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento della configurazione email');
      }
      
      const config = await response.json();
      
      if (config && config.config) {  // Nota: il server risponde con config.config
        // Imposta i valori dai dati configurati
        setEmailRecipients(config.config.recipients?.split(',').join(', ') || '');
        setEmailCC(config.config.cc?.split(',').join(', ') || '');
        
        // Gestione corretta del valore stringa per l'abilitazione
        const autoEnabled = config.config.auto_enabled === 'true' || config.config.auto_enabled === true;
        console.log('Stato auto_enabled ricevuto:', config.config.auto_enabled, '→ interpretato come:', autoEnabled);
        setAutoSendEnabled(autoEnabled);
        
        setScheduledTime(config.config.send_time || '18:00');
      }
    } catch (error) {
      console.error('Errore nel caricamento della configurazione email:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare la configurazione email',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };
  
  // Salva la configurazione email
  const saveEmailConfig = async () => {
    // Verifica che ci siano destinatari validi
    if (!emailRecipients.trim()) {
      toast({
        title: 'Destinatari obbligatori',
        description: 'Specifica almeno un indirizzo email come destinatario',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSavingConfig(true);
    try {
      const config = {
        recipients: emailRecipients.split(',').map(email => email.trim()),
        cc: emailCC ? emailCC.split(',').map(email => email.trim()) : [],
        auto_enabled: autoSendEnabled,
        send_time: scheduledTime
      };
      
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della configurazione email');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Configurazione salvata',
          description: 'Le impostazioni di invio email sono state salvate con successo',
          variant: 'default'
        });
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio della configurazione email:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Si è verificato un errore imprevisto',
        variant: 'destructive'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };
  
  // Aggiorna il testo formattato quando cambiano i dati
  useEffect(() => {
    if (operations && sizeStats && totals && giacenza) {
      const text = createFormattedText(diaryData, selectedDate);
      setFormattedText(text);
    }
  }, [operations, sizeStats, totals, giacenza, selectedDate]);
  
  // Carica la configurazione email all'apertura del dialogo
  useEffect(() => {
    if (isEmailDialogOpen) {
      loadEmailConfig();
    }
  }, [isEmailDialogOpen]);
  
  // Determina lo stato di caricamento generale
  const isLoading = isLoadingOperations || isLoadingSizeStats || isLoadingTotals || isLoadingGiacenza;
  
  // Funzione per inviare l'email
  const sendEmail = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: "Destinatario obbligatorio",
        description: "Devi specificare almeno un indirizzo email come destinatario.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      // Prepara i dati per l'email
      const emailData = {
        to: emailRecipients.split(',').map(email => email.trim()),
        cc: emailCC ? emailCC.split(',').map(email => email.trim()) : undefined,
        subject: emailSubject || `Diario di Bordo FLUPSY - ${format(selectedDate, 'dd/MM/yyyy', { locale: it })}`,
        text: formattedText,
        html: `<pre style="font-family: monospace;">${formattedText.replace(/\n/g, '<br>').replace(/\*/g, '<strong>').replace(/\*/g, '</strong>')}</pre>`
      };
      
      // Invia l'email tramite l'API
      const response = await fetch('/api/email/send-diario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Chiudiamo il dialogo
        setIsEmailDialogOpen(false);
        
        // In modalità simulazione, mostriamo un messaggio specifico
        if (result.note && result.note.includes("simulata")) {
          toast({
            title: "Email simulata correttamente",
            description: "In questa versione di test, l'email è stata simulata ma non inviata realmente. Il server ha registrato i dettagli dell'invio per verificare il funzionamento.",
            variant: "default",
            duration: 5000,
          });
        } else {
          toast({
            title: "Email inviata con successo",
            description: "Il diario di bordo è stato inviato via email ai destinatari specificati.",
            variant: "default"
          });
        }
      } else {
        throw new Error(result.error || "Errore durante l'invio dell'email");
      }
    } catch (error) {
      console.error("Errore nell'invio email:", error);
      toast({
        title: "Errore nell'invio dell'email",
        description: error instanceof Error ? error.message : "Si è verificato un errore imprevisto",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Diario di Bordo</h1>
      
      {/* Dialog per configurazione e invio Email */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invia Diario di Bordo via Email</DialogTitle>
            <DialogDescription>
              Inserisci gli indirizzi email dei destinatari e personalizza l'oggetto dell'email.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={emailDialogTab} onValueChange={setEmailDialogTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Configurazione</TabsTrigger>
              <TabsTrigger value="auto">Invio Automatico</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
            </TabsList>
            
            <TabsContent value="config" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-to">Destinatari (obbligatorio)</Label>
                  <Input 
                    id="email-to" 
                    placeholder="email@esempio.com, altro@esempio.com" 
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Separare più indirizzi con virgole</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-cc">CC (opzionale)</Label>
                  <Input 
                    id="email-cc" 
                    placeholder="cc@esempio.com, altro-cc@esempio.com" 
                    value={emailCC}
                    onChange={(e) => setEmailCC(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Oggetto (opzionale)</Label>
                  <Input 
                    id="email-subject" 
                    placeholder={`Diario di Bordo FLUPSY - ${format(selectedDate, 'dd/MM/yyyy', { locale: it })}`}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="auto" className="space-y-4 py-4">
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Configurazione Invio Automatico</h3>
                  <p className="text-sm text-muted-foreground">
                    Imposta l'invio automatico del diario di bordo via email ogni giorno all'orario specificato.
                    L'email sarà inviata con i dati relativi al giorno corrente.
                  </p>
                </div>
                
                <div className="space-y-2 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-send-enabled" className="font-medium">Attiva invio automatico</Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="auto-send-enabled" className={!autoSendEnabled ? 'text-muted-foreground' : ''}>
                        {autoSendEnabled ? 'Attivo' : 'Disattivato'}
                      </Label>
                      <input
                        type="checkbox"
                        id="auto-send-enabled"
                        checked={autoSendEnabled}
                        onChange={(e) => setAutoSendEnabled(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-primary rounded"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando attivo, il sistema invierà automaticamente le email di riepilogo giornaliero ai destinatari configurati.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Orario di invio giornaliero</Label>
                  <Input 
                    id="scheduled-time" 
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full"
                    disabled={!autoSendEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Seleziona l'orario in cui inviare automaticamente l'email ogni giorno.
                  </p>
                </div>
                
                <Button
                  type="button"
                  className="w-full"
                  onClick={saveEmailConfig}
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : (
                    'Salva Configurazione'
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 py-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg">Anteprima Email</CardTitle>
                      <CardDescription>
                        Così apparirà la tua email
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ScrollArea className="h-[300px] w-full rounded border p-4 bg-blue-50">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{formattedText}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(formattedText)}
                    >
                      Copia testo
                    </Button>
                    <Button
                      variant="default"
                      onClick={sendEmail}
                      disabled={isSendingEmail || !emailRecipients.trim()}
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        'Invia via Email'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Intestazione pagina con data e controlli */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Diario del {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-muted-foreground">
              Riepilogo delle operazioni e statistiche giornaliere
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Wrapper del DatePicker per evitare errori di tipo */}
          <div className="min-w-[280px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: it }) : <span>Seleziona una data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(diaryData, selectedDate)}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailDialogOpen(true)}
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Invia via Email
          </Button>

          <Button 
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(formattedText)}
            disabled={isLoading}
          >
            <Share className="h-4 w-4 mr-2" />
            Copia Testo
          </Button>
        </div>
      </div>

      {/* Tabs per i diversi tipi di vista */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="diario">Diario</TabsTrigger>
          <TabsTrigger value="statistiche">Statistiche</TabsTrigger>
          <TabsTrigger value="operazioni">Operazioni</TabsTrigger>
        </TabsList>
        
        {/* Tab Diario - Mostra il diario completo */}
        <TabsContent value="diario" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center mb-2">
                        <Filter className="h-5 w-5 mr-2 text-primary" />
                        Operazioni Effettuate
                      </h3>
                      {operations && operations.length > 0 ? (
                        <div className="space-y-4">
                          {operations.map((op: any, idx: number) => (
                            <div key={op.id || idx} className="border rounded-lg p-4 bg-card">
                              <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                <div className="flex items-center">
                                  <Badge variant={getBadgeVariantForOperationType(op.type)} className="mr-2">
                                    {getOperationTypeLabel(op.type)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {op.created_at ? format(new Date(op.created_at), 'HH:mm') : ''}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-sm font-medium">
                                    Cestello #{op.basket_number} ({op.flupsy_name})
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                <div>
                                  <span className="font-semibold">N. Animali:</span> {op.animal_count ? Number(op.animal_count).toLocaleString('it-IT') : 'N/D'}
                                </div>
                                
                                {op.animals_per_kg && (
                                  <div>
                                    <span className="font-semibold">Animali/Kg:</span> {Number(op.animals_per_kg).toLocaleString('it-IT')}
                                  </div>
                                )}
                                
                                {op.size_code && (
                                  <div>
                                    <span className="font-semibold">Taglia:</span> {op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code}
                                  </div>
                                )}
                              </div>
                              
                              {op.notes && (
                                <div className="mt-2 text-sm">
                                  <span className="font-semibold">Note:</span> {op.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Nessuna operazione registrata per questa data.
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold flex items-center mb-4">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        Riepilogo Giornaliero
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Statistiche per Taglia */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Statistiche per Taglia</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {sizeStats && sizeStats.length > 0 ? (
                              <div className="space-y-2">
                                {sizeStats.map((taglia: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">
                                      {taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia}:
                                    </span>
                                    <span>
                                      {taglia.entrate ? (<><span className="text-green-600">+{parseInt(taglia.entrate).toLocaleString('it-IT')}</span>{' '}</>) : null}
                                      {taglia.uscite ? (<><span className="text-red-600">-{parseInt(taglia.uscite).toLocaleString('it-IT')}</span>{' '}</>) : null}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                Nessuna statistica disponibile.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Bilancio Giornata */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Bilancio Giornaliero</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span>Entrate:</span>
                                <span className="text-green-600 font-medium">
                                  +{totals?.totale_entrate ? parseInt(totals.totale_entrate).toLocaleString('it-IT') : '0'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Uscite:</span>
                                <span className="text-red-600 font-medium">
                                  -{totals?.totale_uscite ? parseInt(totals.totale_uscite).toLocaleString('it-IT') : '0'}
                                </span>
                              </div>
                              <Separator className="my-1" />
                              <div className="flex justify-between items-center text-sm font-medium">
                                <span>Bilancio netto:</span>
                                <span className={parseInt(totals?.bilancio_netto || '0') >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {parseInt(totals?.bilancio_netto || '0') >= 0 ? '+' : ''}{totals?.bilancio_netto ? parseInt(totals.bilancio_netto).toLocaleString('it-IT') : '0'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-4">
                                <span>Operazioni totali:</span>
                                <span className="font-medium">{totals?.numero_operazioni || '0'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Giacenza alla data */}
                        <Card className="md:col-span-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Giacenza al {format(selectedDate, 'dd/MM/yyyy', { locale: it })}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Totale animali:</span>
                                <span className="text-lg font-bold">{giacenza?.totale_giacenza ? Number(giacenza.totale_giacenza).toLocaleString('it-IT') : '0'}</span>
                              </div>
                              
                              {giacenza?.dettaglio_taglie && giacenza.dettaglio_taglie.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Dettaglio per taglia:</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {giacenza.dettaglio_taglie.map((taglia: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center text-sm border-b pb-1">
                                        <span>{taglia.taglia === 'Non specificata' ? 'In attesa' : taglia.taglia}:</span>
                                        <span className="font-medium">{Number(taglia.quantita).toLocaleString('it-IT')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {giacenza?.totale_giacenza !== undefined && totals?.bilancio_netto !== undefined && (
                                <div className="pt-2 border-t">
                                  <div className="flex justify-between items-center text-sm font-semibold">
                                    <span>Bilancio finale (giacenza + bilancio netto):</span>
                                    <span className="text-primary">
                                      {(Number(giacenza.totale_giacenza) + Number(totals.bilancio_netto)).toLocaleString('it-IT')}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab Statistiche - Mostra solo le statistiche */}
        <TabsContent value="statistiche" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Statistiche per Taglia */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistiche per Taglia</CardTitle>
                  <CardDescription>
                    Movimentazione giornaliera per ogni taglia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sizeStats && sizeStats.length > 0 ? (
                    <div className="space-y-4">
                      {sizeStats.map((taglia: any, idx: number) => (
                        <div key={idx} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-base">
                              {taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md mr-2">Entrate</span>
                              <span className="font-medium">{taglia.entrate?.toLocaleString('it-IT') || '0'}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md mr-2">Uscite</span>
                              <span className="font-medium">{taglia.uscite?.toLocaleString('it-IT') || '0'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nessuna statistica disponibile per questa data.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Giacenza e Bilancio */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bilancio Giornaliero</CardTitle>
                    <CardDescription>
                      Riepilogo delle entrate e uscite del giorno
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-green-800 text-sm font-medium mb-1">Entrate</div>
                          <div className="text-2xl font-bold">{totals?.totale_entrate?.toLocaleString('it-IT') || '0'}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <div className="text-red-800 text-sm font-medium mb-1">Uscite</div>
                          <div className="text-2xl font-bold">{totals?.totale_uscite?.toLocaleString('it-IT') || '0'}</div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Bilancio netto:</span>
                          <span className={`text-xl font-bold ${parseInt(totals?.bilancio_netto || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseInt(totals?.bilancio_netto || '0') >= 0 ? '+' : ''}{totals?.bilancio_netto?.toLocaleString('it-IT') || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Operazioni effettuate:</span>
                          <span className="font-medium">{totals?.numero_operazioni || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Giacenza</CardTitle>
                    <CardDescription>
                      Situazione animali al {format(selectedDate, 'dd/MM/yyyy', { locale: it })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-blue-800 text-sm font-medium mb-1">Totale animali</div>
                        <div className="text-3xl font-bold">{giacenza?.totale_giacenza?.toLocaleString('it-IT') || '0'}</div>
                      </div>
                      
                      {giacenza?.dettaglio_taglie && giacenza.dettaglio_taglie.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Dettaglio per taglia:</h4>
                          <div className="space-y-2">
                            {giacenza.dettaglio_taglie.map((taglia: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-sm">{taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia}:</span>
                                <span className="font-medium">{taglia.quantita.toLocaleString('it-IT')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* Tab Operazioni - Mostra solo le operazioni */}
        <TabsContent value="operazioni" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Operazioni Giornaliere</CardTitle>
                <CardDescription>
                  Elenco dettagliato di tutte le operazioni del {format(selectedDate, 'dd/MM/yyyy', { locale: it })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {operations && operations.length > 0 ? (
                  <div className="overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Ora</th>
                          <th className="text-left py-2 px-3 font-medium">Tipo</th>
                          <th className="text-left py-2 px-3 font-medium">Cestello</th>
                          <th className="text-left py-2 px-3 font-medium">Flupsy</th>
                          <th className="text-right py-2 px-3 font-medium">Animali</th>
                          <th className="text-right py-2 px-3 font-medium">Animali/Kg</th>
                          <th className="text-left py-2 px-3 font-medium">Taglia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map((op: any, idx: number) => (
                          <tr key={op.id || idx} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 text-sm">
                              {op.created_at ? format(new Date(op.created_at), 'HH:mm') : '-'}
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant={getBadgeVariantForOperationType(op.type)}>
                                {getOperationTypeLabel(op.type)}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-sm">{op.basket_number || '-'}</td>
                            <td className="py-2 px-3 text-sm">{op.flupsy_name || '-'}</td>
                            <td className="py-2 px-3 text-right font-medium">
                              {op.animal_count?.toLocaleString('it-IT') || '-'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {op.animals_per_kg?.toLocaleString('it-IT') || '-'}
                            </td>
                            <td className="py-2 px-3 text-sm">
                              {op.size_code === 'Non specificata' ? 'In attesa' : op.size_code || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    Nessuna operazione registrata per questa data.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}