import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Download, Share, Filter, Clock, Mail, Loader2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
      return "destructive"; // Rosso
    case 'misura':
    case 'peso':
      return "outline"; // Nero bordo
    case 'vendita':
    case 'selezione-vendita':
      return "destructive"; // Rosso
    case 'cessazione':
      return "destructive"; // Rosso
    case 'selezione-origine':
      return "outline"; // Nero bordo
    default:
      return "outline";
  }
};

// Funzione per creare il testo formattato per Telegram
const createTelegramText = (data: any, date: Date) => {
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
      alert('Testo copiato negli appunti! Puoi incollarlo direttamente su Telegram.');
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

// Funzione principale per condividere su Telegram
const shareOnTelegram = (text: string) => {
  // Codifica il testo per URL
  const encodedText = encodeURIComponent(text);
  // Crea URL per Telegram web
  const telegramUrl = `https://t.me/share/url?url=&text=${encodedText}`;
  
  // Apri in una nuova finestra
  window.open(telegramUrl, '_blank');
};

export default function DiarioDiBordo() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [telegramText, setTelegramText] = useState<string>('');
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
  
  // Stati per la configurazione Telegram
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState<boolean>(false);
  const [telegramChatIds, setTelegramChatIds] = useState<string>('');
  const [autoTelegramEnabled, setAutoTelegramEnabled] = useState<boolean>(false);
  const [telegramTime, setTelegramTime] = useState<string>('20:00');
  const [isLoadingTelegramConfig, setIsLoadingTelegramConfig] = useState<boolean>(false);
  const [isSavingTelegramConfig, setIsSavingTelegramConfig] = useState<boolean>(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);
  
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
  
  // Combina tutti i dati per la visualizzazione e per il testo Telegram
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
  
  // Aggiorna il testo di Telegram quando cambiano i dati
  useEffect(() => {
    if (operations && sizeStats && totals && giacenza) {
      const text = createTelegramText(diaryData, selectedDate);
      setTelegramText(text);
    }
  }, [operations, sizeStats, totals, giacenza, selectedDate]);
  
  // Carica la configurazione email all'apertura del dialogo
  useEffect(() => {
    if (isEmailDialogOpen) {
      loadEmailConfig();
    }
  }, [isEmailDialogOpen]);
  
  // Carica la configurazione Telegram all'apertura del dialogo
  useEffect(() => {
    if (isTelegramDialogOpen) {
      loadTelegramConfig();
    }
  }, [isTelegramDialogOpen]);
  
  // Carica la configurazione Telegram
  const loadTelegramConfig = async () => {
    setIsLoadingTelegramConfig(true);
    try {
      const response = await fetch('/api/telegram/config');
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento della configurazione Telegram');
      }
      
      const config = await response.json();
      
      if (config && config.config) {
        setTelegramChatIds(config.config.chat_ids?.split(',').join(', ') || '');
        
        // Gestione corretta del valore stringa per l'abilitazione
        const autoEnabled = config.config.auto_enabled === 'true' || config.config.auto_enabled === true;
        setAutoTelegramEnabled(autoEnabled);
        
        setTelegramTime(config.config.send_time || '20:00');
      }
    } catch (error) {
      console.error('Errore nel caricamento della configurazione Telegram:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare la configurazione Telegram',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingTelegramConfig(false);
    }
  };
  
  // Salva la configurazione Telegram
  const saveTelegramConfig = async () => {
    // Verifica che ci siano chat ID validi
    if (!telegramChatIds.trim()) {
      toast({
        title: 'Chat ID obbligatori',
        description: 'Specifica almeno un ID chat Telegram',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSavingTelegramConfig(true);
    try {
      const config = {
        chat_ids: telegramChatIds.split(',').map(id => id.trim()).join(','),
        auto_enabled: autoTelegramEnabled,
        send_time: telegramTime
      };
      
      const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della configurazione Telegram');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Configurazione salvata',
          description: 'Le impostazioni di invio Telegram sono state salvate con successo',
          variant: 'default'
        });
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio della configurazione Telegram:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Si è verificato un errore imprevisto',
        variant: 'destructive'
      });
    } finally {
      setIsSavingTelegramConfig(false);
    }
  };
  
  // Funzione per inviare il messaggio Telegram manualmente
  const sendTelegramMessage = async () => {
    setIsSendingTelegram(true);
    try {
      const response = await fetch('/api/telegram/send-diario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: diaryData,
          date: selectedDate.toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'invio del messaggio Telegram');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Messaggio inviato',
          description: 'Il diario di bordo è stato inviato via Telegram con successo',
          variant: 'default'
        });
        setIsTelegramDialogOpen(false);
      } else {
        throw new Error(result.error || 'Errore durante l\'invio');
      }
    } catch (error) {
      console.error('Errore nell\'invio del messaggio Telegram:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Si è verificato un errore imprevisto',
        variant: 'destructive'
      });
    } finally {
      setIsSendingTelegram(false);
    }
  };
  
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
        text: telegramText,
        html: `<pre style="font-family: monospace;">${telegramText.replace(/\n/g, '<br>').replace(/\*/g, '<strong>').replace(/\*/g, '</strong>')}</pre>`
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
      
      {/* Dialog per configurazione e invio Telegram */}
      <Dialog open={isTelegramDialogOpen} onOpenChange={setIsTelegramDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configura Telegram</DialogTitle>
            <DialogDescription>
              Imposta le configurazioni per l'invio automatico dei resoconti giornalieri via Telegram.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="config">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Configurazione</TabsTrigger>
              <TabsTrigger value="auto">Invio Automatico</TabsTrigger>
              <TabsTrigger value="preview">Anteprima</TabsTrigger>
            </TabsList>
            
            {/* Tab Configurazione */}
            <TabsContent value="config" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat-ids">ID Chat (obbligatorio)</Label>
                  <Input 
                    id="telegram-chat-ids" 
                    placeholder="12345678, -1001234567890" 
                    value={telegramChatIds}
                    onChange={(e) => setTelegramChatIds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Inserisci gli ID delle chat Telegram a cui inviare i messaggi. Puoi ottenere gli ID utilizzando il @DeltaFuturo_bot.
                    <br />
                    Se vuoi inviare i messaggi a un gruppo, aggiungilo prima al bot come amministratore.
                  </p>
                </div>
                
                <Button
                  type="button"
                  className="w-full"
                  onClick={saveTelegramConfig}
                  disabled={isSavingTelegramConfig}
                >
                  {isSavingTelegramConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : (
                    'Salva Configurazione'
                  )}
                </Button>
                
                {isLoadingTelegramConfig && (
                  <div className="mt-2 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">Caricamento configurazione...</span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab Invio Automatico */}
            <TabsContent value="auto" className="space-y-4 py-4">
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Configurazione Invio Automatico Telegram</h3>
                  <p className="text-sm text-muted-foreground">
                    Imposta l'invio automatico del diario di bordo via Telegram ogni giorno all'orario specificato.
                    I messaggi saranno inviati con i dati relativi al giorno corrente.
                  </p>
                </div>
                
                <div className="space-y-2 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-telegram-enabled" className="font-medium">Attiva invio automatico</Label>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="auto-telegram-enabled" className={!autoTelegramEnabled ? 'text-muted-foreground' : ''}>
                        {autoTelegramEnabled ? 'Attivo' : 'Disattivato'}
                      </Label>
                      <input
                        type="checkbox"
                        id="auto-telegram-enabled"
                        checked={autoTelegramEnabled}
                        onChange={(e) => setAutoTelegramEnabled(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-primary rounded"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando attivo, il sistema invierà automaticamente i messaggi di riepilogo giornaliero su Telegram.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telegram-time">Orario di invio giornaliero</Label>
                  <Input 
                    id="telegram-time" 
                    type="time"
                    value={telegramTime}
                    onChange={(e) => setTelegramTime(e.target.value)}
                    className="w-full"
                    disabled={!autoTelegramEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Seleziona l'orario in cui inviare automaticamente il messaggio Telegram ogni giorno.
                  </p>
                </div>
                
                <Button
                  type="button"
                  className="w-full"
                  onClick={saveTelegramConfig}
                  disabled={isSavingTelegramConfig}
                >
                  {isSavingTelegramConfig ? (
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
            
            {/* Tab Anteprima */}
            <TabsContent value="preview" className="space-y-4 py-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg">Anteprima Messaggio Telegram</CardTitle>
                      <CardDescription>
                        Così apparirà il tuo messaggio su Telegram
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ScrollArea className="h-[300px] w-full rounded border p-4 bg-blue-50">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{telegramText}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(telegramText)}
                    >
                      Copia testo
                    </Button>
                    <Button
                      variant="default"
                      onClick={sendTelegramMessage}
                      disabled={isSendingTelegram || !telegramChatIds.trim()}
                    >
                      {isSendingTelegram ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        'Invia via Telegram'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTelegramDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            
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
                    L'email del diario di bordo verrà inviata automaticamente a quest'ora ogni giorno
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="button" 
                    onClick={saveEmailConfig}
                    disabled={isSavingConfig || isLoadingConfig}
                    className="w-full"
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
                  
                  {isLoadingConfig && (
                    <div className="mt-2 flex justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Caricamento configurazione...</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="border rounded-lg p-4 my-4 max-h-[300px] overflow-y-auto">
                <div className="mb-4 p-2 bg-gray-100 rounded">
                  <p><strong>Da:</strong> Sistema FLUPSY</p>
                  <p><strong>A:</strong> {emailRecipients || "[Nessun destinatario specificato]"}</p>
                  {emailCC && <p><strong>CC:</strong> {emailCC}</p>}
                  <p><strong>Oggetto:</strong> {emailSubject || `Diario di Bordo FLUPSY - ${format(selectedDate, 'dd/MM/yyyy', { locale: it })}`}</p>
                </div>
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {telegramText}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              type="button" 
              onClick={sendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invia Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                  onClick={() => copyToClipboard(telegramText)}
                  title="Copia testo per Telegram"
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
                  onClick={() => shareOnTelegram(telegramText)}
                  title="Condividi su Telegram"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Telegram
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEmailDialogTab('config');
                    setIsEmailDialogOpen(true);
                  }}
                  title="Invia via Email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEmailDialogTab('auto');
                    setIsEmailDialogOpen(true);
                  }}
                  title="Configura invio automatico email"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Auto Email
                </Button>

                {/* Pulsanti per Telegram */}
                <Separator orientation="vertical" className="h-8 mx-2" />
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Apre il dialogo Telegram direttamente sulla tab di anteprima per inviare il messaggio
                    setIsTelegramDialogOpen(true);
                  }}
                  title="Invia via Telegram"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Telegram
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Apre il dialogo Telegram sulla tab di configurazione
                    setIsTelegramDialogOpen(true);
                  }}
                  title="Configura Telegram"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Auto Telegram
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
                <TabsTrigger value="anteprima">Anteprima Telegram</TabsTrigger>
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
                            <Badge 
                              className="mr-2" 
                              variant={getBadgeVariantForOperationType(op.type)}
                            >
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
                            <p className="font-medium">
                              {op.size_code && op.size_code !== 'Non specificata' 
                                ? op.size_code 
                                : op.size_code === 'Non specificata' 
                                  ? 'In attesa di misurazione' 
                                  : 'In attesa di misurazione'
                              }
                            </p>
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
                                  <Badge>{stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia}</Badge>
                                  <span className="text-sm text-muted-foreground">{stat.num_operazioni} operazioni</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Entrate</p>
                                    <p className="text-lg font-semibold text-emerald-600">
                                      {stat.entrate ? stat.entrate.toLocaleString('it-IT') : '0'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Uscite</p>
                                    <p className="text-lg font-semibold text-red-600">
                                      {stat.uscite ? stat.uscite.toLocaleString('it-IT') : '0'}
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
                          <div className="space-y-6">
                            {/* Giacenza alla data corrente */}
                            {!isLoadingGiacenza && giacenza && (
                              <div className="border rounded-lg p-4 bg-blue-50">
                                <h3 className="text-md font-semibold mb-3">
                                  Giacenza al {format(selectedDate, 'dd/MM/yyyy', { locale: it })}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-3 border rounded-lg bg-white">
                                    <p className="text-xs text-muted-foreground">Totale Giacenza</p>
                                    <p className="text-lg font-semibold text-blue-600">
                                      {giacenza.totale_giacenza ? giacenza.totale_giacenza.toLocaleString('it-IT') : '0'} animali
                                    </p>
                                  </div>
                                  
                                  <div className="p-3 border rounded-lg bg-white">
                                    <p className="text-xs text-muted-foreground">Dettaglio Giacenza per Taglia</p>
                                    <div className="mt-1 space-y-1">
                                      {giacenza.dettaglio_taglie && giacenza.dettaglio_taglie.length > 0 ? (
                                        giacenza.dettaglio_taglie.map((taglia, idx) => (
                                          <div key={idx} className="flex justify-between items-center">
                                            <Badge variant="outline">{taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia}</Badge>
                                            <span className="font-medium">{taglia.quantita.toLocaleString('it-IT')}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Bilancio Giornaliero */}
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
                                <p className={`text-lg font-semibold ${(totals.bilancio_netto || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
                            
                            {/* Bilancio Finale (Giacenza + Bilancio Netto) */}
                            {!isLoadingGiacenza && giacenza && (
                              <div className="border-t pt-4 mt-4">
                                <div className="p-3 border rounded-lg bg-green-50">
                                  <p className="text-xs text-muted-foreground">Bilancio Finale (Giacenza + Bilancio Netto)</p>
                                  <p className="text-xl font-bold text-emerald-700">
                                    {(giacenza.totale_giacenza + (parseInt(totals.bilancio_netto) || 0)).toLocaleString('it-IT')} animali
                                  </p>
                                </div>
                              </div>
                            )}
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
                      <CardTitle className="text-lg">Anteprima Messaggio Telegram</CardTitle>
                      <CardDescription>
                        Così apparirà il tuo messaggio su Telegram
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ScrollArea className="h-[400px] w-full rounded border p-4 bg-blue-50">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{telegramText}</pre>
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