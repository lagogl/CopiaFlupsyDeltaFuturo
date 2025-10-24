import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { AlertCircle, DatabaseBackup, Save, Smartphone, Trash2, HelpCircle, RefreshCw, RotateCw, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NFCReader from "@/components/NFCReader";
import { useToast } from "@/hooks/use-toast";
import { useTooltip } from "@/contexts/TooltipContext";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [readingNfc, setReadingNfc] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingScreening, setIsResettingScreening] = useState(false);
  const [isResettingSelections, setIsResettingSelections] = useState(false);
  const [isResettingLotSequence, setIsResettingLotSequence] = useState(false);
  const [isResettingLots, setIsResettingLots] = useState(false);
  const { toast } = useToast();
  const [resetPassword, setResetPassword] = useState("");
  const { areTooltipsEnabled, enableAllTooltips, disableAllTooltips, markTooltipAsSeen, setFirstTimeUser } = useTooltip();
  
  // Stati per configurazione email
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  
  // Check NFC support on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  }, []);

  // Funzione per azzerare le operazioni e i cicli
  const resetOperationsAndCycles = async () => {
    try {
      setIsResetting(true);
      const response = await fetch('/api/reset-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      
      if (response.ok) {
        toast({
          title: "Azzeramento completato",
          description: "Le operazioni, i cicli, i cestelli e le posizioni sono stati azzerati correttamente.",
        });
        setResetPassword("");
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "Errore durante l'azzeramento",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Funzione per azzerare i dati delle vagliature
  const resetScreeningData = async () => {
    try {
      setIsResettingScreening(true);
      const response = await fetch('/api/reset-screening', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      
      if (response.ok) {
        toast({
          title: "Azzeramento completato",
          description: "Tutte le operazioni di vagliatura, le analisi AI e i dati correlati sono stati eliminati correttamente.",
        });
        setResetPassword("");
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "Errore durante l'azzeramento",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsResettingScreening(false);
    }
  };
  
  // Funzione per azzerare i dati delle selezioni
  const resetSelectionsData = async () => {
    try {
      setIsResettingSelections(true);
      const response = await fetch('/api/reset-selections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      
      if (response.ok) {
        toast({
          title: "Azzeramento completato",
          description: "Tutte le operazioni di selezione e i dati correlati sono stati eliminati correttamente.",
        });
        setResetPassword("");
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "Errore durante l'azzeramento",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsResettingSelections(false);
    }
  };
  
  // Funzione per resettare la sequenza ID dei lotti
  const resetLotSequence = async () => {
    try {
      setIsResettingLotSequence(true);
      const response = await fetch('/api/sequences/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: 'lots',
          startValue: 1,
          password: resetPassword
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Reset sequenza completato",
          description: data.message || "La sequenza ID dei lotti è stata resettata con successo.",
        });
        setResetPassword("");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "Errore durante il reset della sequenza",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsResettingLotSequence(false);
    }
  };

  // Funzione per eliminare tutti i dati relativi ai lotti
  const resetLotsData = async () => {
    try {
      setIsResettingLots(true);
      const response = await fetch('/api/reset-lots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      
      if (response.ok) {
        toast({
          title: "Eliminazione lotti completata",
          description: "Tutti i dati relativi ai lotti sono stati eliminati correttamente.",
        });
        setResetPassword("");
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "Errore durante l'eliminazione lotti",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsResettingLots(false);
    }
  };

  // Carica configurazione email
  useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        const response = await fetch('/api/email/config');
        if (!response.ok) {
          throw new Error('Errore nel caricamento della configurazione email');
        }
        
        const data = await response.json();
        
        if (data.success && data.config) {
          setEmailRecipients(data.config.recipients?.split(',').join(', ') || '');
        }
      } catch (error) {
        console.error('Errore nel caricamento della configurazione email:', error);
      }
    };
    
    loadEmailConfig();
  }, []);

  // Salva configurazione email
  const saveEmailConfig = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: "Attenzione",
        description: "Inserisci almeno un indirizzo email",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingEmail(true);
      
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: emailRecipients.split(',').map(email => email.trim()),
          cc: '',
          send_time: '20:00',
          auto_enabled: 'false'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio della configurazione email');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Configurazione salvata',
          description: 'I destinatari email sono stati aggiornati con successo',
        });
      }
    } catch (error) {
      console.error('Errore nel salvataggio della configurazione email:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione email",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Impostazioni</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="general">Generale</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="nfc">NFC</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="about">Informazioni</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferenze Utente</CardTitle>
              <CardDescription>
                Modifica le preferenze dell'applicazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome Utente</Label>
                  <Input id="username" defaultValue="Admin" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Lingua</Label>
                  <select 
                    id="language" 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="notifications" defaultChecked />
                <Label htmlFor="notifications">Abilita Notifiche</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="dark-mode" />
                <Label htmlFor="dark-mode">Modalità Scura</Label>
              </div>
              
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Salva Preferenze
              </Button>
            </CardContent>
          </Card>
          
          {/* Card per i tooltip contestuali */}
          <Card>
            <CardHeader>
              <CardTitle>Suggerimenti e Guide</CardTitle>
              <CardDescription>
                Gestisci i suggerimenti contestuali e i tooltip di aiuto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="tooltips-enabled" 
                    checked={areTooltipsEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        enableAllTooltips();
                      } else {
                        disableAllTooltips();
                      }
                      
                      toast({
                        title: checked ? "Suggerimenti abilitati" : "Suggerimenti disabilitati",
                        description: checked 
                          ? "I suggerimenti contestuali verranno mostrati durante l'utilizzo dell'applicazione." 
                          : "I suggerimenti contestuali sono stati disabilitati.",
                      });
                    }}
                  />
                  <Label htmlFor="tooltips-enabled">Mostra suggerimenti contestuali</Label>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Ripristina guida introduttiva</h3>
                    <p className="text-sm text-gray-500">
                      Mostra nuovamente tutti i suggerimenti e le guide come se stessi utilizzando l'applicazione 
                      per la prima volta. Utile se vuoi rivedere le spiegazioni delle funzionalità.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="whitespace-nowrap ml-4"
                    onClick={() => {
                      // Resetta lo stato dell'utente come se fosse nuovo
                      setFirstTimeUser(true);
                      
                      // Rimuovi dal localStorage l'indicazione che l'utente ha già visto i tooltip
                      localStorage.removeItem('flupsy-seen-tooltips');
                      
                      // Mostra un messaggio di conferma
                      toast({
                        title: "Guide ripristinate",
                        description: "I suggerimenti e le guide sono stati ripristinati. Verranno mostrati nuovamente durante l'utilizzo dell'applicazione.",
                      });
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ripristina Guide
                  </Button>
                </div>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Suggerimento</AlertTitle>
                <AlertDescription>
                  I suggerimenti contestuali ti aiutano a comprendere le funzionalità dell'applicazione 
                  mostrando brevi spiegazioni quando passi con il mouse sopra gli elementi o quando accedi 
                  a una nuova sezione per la prima volta.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Email</CardTitle>
              <CardDescription>
                Configura i destinatari per le email automatiche di conferma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Mail className="h-4 w-4" />
                <AlertTitle>Email automatiche attive</AlertTitle>
                <AlertDescription>
                  Il sistema invia automaticamente email di conferma quando:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Viene confermata una vagliatura</li>
                    <li>Viene inviato un DDT a Fatture in Cloud (con PDF allegato)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-recipients">
                    Destinatari Email
                  </Label>
                  <Input
                    id="email-recipients"
                    type="text"
                    placeholder="esempio@email.com, altro@email.com"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500">
                    Inserisci uno o più indirizzi email separati da virgola. 
                    Questi destinatari riceveranno le email di conferma automatiche.
                  </p>
                </div>

                <Button 
                  onClick={saveEmailConfig}
                  disabled={isSavingEmail || !emailRecipients.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingEmail ? 'Salvataggio...' : 'Salva Configurazione'}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nota</AlertTitle>
                <AlertDescription>
                  Le email vengono inviate tramite Gmail usando l'integrazione OAuth2 configurata. 
                  Assicurati che gli indirizzi email siano corretti per ricevere le notifiche.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="nfc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestione NFC</CardTitle>
              <CardDescription>
                Configura le impostazioni per i tag NFC delle ceste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nfcSupported === false && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Attenzione</AlertTitle>
                  <AlertDescription>
                    Il tuo dispositivo non supporta la tecnologia NFC. 
                    Per utilizzare questa funzionalità, prova con un dispositivo compatibile.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center space-x-2">
                <Switch id="nfc-enabled" defaultChecked />
                <Label htmlFor="nfc-enabled">Abilita Lettura NFC</Label>
              </div>
              
              <div className="p-6 border-2 border-dashed rounded-md text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Test Lettura Tag NFC</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Avvicina un tag NFC al dispositivo per leggerne i dati
                </p>
                
                <Button
                  onClick={() => setReadingNfc(true)}
                  disabled={nfcSupported === false || readingNfc}
                >
                  {readingNfc ? "In ascolto..." : "Inizia lettura NFC"}
                </Button>
                
                {readingNfc && (
                  <NFCReader
                    onRead={(message) => {
                      alert(`Tag letto: ${JSON.stringify(message)}`);
                      setReadingNfc(false);
                    }}
                    onError={(error) => {
                      alert(`Errore nella lettura: ${error}`);
                      setReadingNfc(false);
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Database</CardTitle>
              <CardDescription>
                Operazioni di manutenzione sul database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-900">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                  Le operazioni in questa sezione possono eliminare dati in modo permanente.
                  Assicurati di capire l'impatto di ciascuna azione prima di procedere.
                </AlertDescription>
              </Alert>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Azzeramento Operazioni, Cicli e Cestelli</h3>
                    <p className="text-sm text-gray-500">
                      Elimina tutte le operazioni, i cicli, i cestelli e le composizioni lotti misti.
                      I contatori verranno ripristinati a 1.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="whitespace-nowrap ml-4">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Azzera Dati
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conferma Azzeramento</DialogTitle>
                        <DialogDescription>
                          Stai per eliminare TUTTI i dati operativi del sistema. Questa azione:
                          <ul className="list-disc list-inside my-2 space-y-1">
                            <li>Eliminerà tutte le operazioni registrate</li>
                            <li>Eliminerà tutti i cicli di crescita</li>
                            <li>Eliminerà tutti i cestelli e le loro composizioni lotti misti</li>
                            <li>Resetterà i contatori delle sequenze ID a 1</li>
                          </ul>
                          Questa operazione non può essere annullata.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="my-4 space-y-2">
                        <Label htmlFor="reset-password">Password di Sicurezza</Label>
                        <Input 
                          id="reset-password" 
                          type="password"
                          placeholder="Inserisci la password di sicurezza"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setResetPassword("");
                        }}>
                          Annulla
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={resetOperationsAndCycles}
                          disabled={isResetting || !resetPassword}
                        >
                          {isResetting ? "Azzeramento in corso..." : "Conferma Azzeramento"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Azzeramento Dati Vagliatura</h3>
                    <p className="text-sm text-gray-500">
                      Elimina tutte le operazioni di vagliatura, le ceste di origine e destinazione, 
                      le composizioni lotti misti, i riferimenti ai lotti, lo storico delle relazioni tra ceste 
                      e tutte le analisi AI di crescita e variabilità.
                      I contatori verranno ripristinati a 1.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="whitespace-nowrap ml-4">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Azzera Vagliature
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conferma Azzeramento Vagliature</DialogTitle>
                        <DialogDescription>
                          Stai per eliminare TUTTI i dati relativi alle vagliature. Questa azione:
                          <ul className="list-disc list-inside my-2 space-y-1">
                            <li>Eliminerà tutte le analisi AI di crescita e variabilità</li>
                            <li>Eliminerà tutte le operazioni di vagliatura</li>
                            <li>Eliminerà tutte le ceste di origine e destinazione</li>
                            <li>Eliminerà le composizioni lotti misti create dalle vagliature</li>
                            <li>Eliminerà lo storico delle relazioni tra ceste</li>
                            <li>Eliminerà i riferimenti ai lotti delle ceste</li>
                            <li>Resetterà i contatori delle sequenze ID a 1</li>
                          </ul>
                          Questa operazione non può essere annullata.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="my-4 space-y-2">
                        <Label htmlFor="reset-screening-password">Password di Sicurezza</Label>
                        <Input 
                          id="reset-screening-password" 
                          type="password"
                          placeholder="Inserisci la password di sicurezza"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setResetPassword("");
                        }}>
                          Annulla
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={resetScreeningData}
                          disabled={isResettingScreening || !resetPassword}
                        >
                          {isResettingScreening ? "Azzeramento in corso..." : "Conferma Azzeramento"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Azzeramento Dati Selezioni</h3>
                    <p className="text-sm text-gray-500">
                      Elimina tutte le operazioni di selezione, le ceste di origine e destinazione, 
                      i riferimenti ai lotti e lo storico delle relazioni tra ceste.
                      I contatori verranno ripristinati a 1.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="whitespace-nowrap ml-4">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Azzera Selezioni
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conferma Azzeramento Selezioni</DialogTitle>
                        <DialogDescription>
                          Stai per eliminare TUTTI i dati relativi alle selezioni. Questa azione:
                          <ul className="list-disc list-inside my-2 space-y-1">
                            <li>Eliminerà tutte le operazioni di selezione</li>
                            <li>Eliminerà tutte le ceste di origine e destinazione</li>
                            <li>Eliminerà lo storico delle relazioni tra ceste</li>
                            <li>Eliminerà i riferimenti ai lotti delle ceste</li>
                            <li>Resetterà i contatori delle sequenze ID a 1</li>
                          </ul>
                          Questa operazione non può essere annullata.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="my-4 space-y-2">
                        <Label htmlFor="reset-selections-password">Password di Sicurezza</Label>
                        <Input 
                          id="reset-selections-password" 
                          type="password"
                          placeholder="Inserisci la password di sicurezza"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setResetPassword("");
                        }}>
                          Annulla
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={resetSelectionsData}
                          disabled={isResettingSelections || !resetPassword}
                        >
                          {isResettingSelections ? "Azzeramento in corso..." : "Conferma Azzeramento"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Eliminazione Dati Lotti</h3>
                    <p className="text-sm text-gray-500">
                      Elimina tutti i dati relativi ai lotti: composizioni lotti misti, transazioni inventario, record mortalità, 
                      riferimenti nelle operazioni di screening e selezione, e i lotti stessi.
                      I contatori verranno ripristinati a 1.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="whitespace-nowrap ml-4">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Elimina Lotti
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conferma Eliminazione Lotti</DialogTitle>
                        <DialogDescription>
                          Stai per eliminare TUTTI i dati relativi ai lotti. Questa azione:
                          <ul className="list-disc list-inside my-2 space-y-1">
                            <li>Eliminerà tutte le transazioni dell'inventario lotti</li>
                            <li>Eliminerà tutti i record di mortalità dei lotti</li>
                            <li>Eliminerà i riferimenti ai lotti nelle operazioni di screening</li>
                            <li>Eliminerà i riferimenti ai lotti nelle operazioni di selezione</li>
                            <li>Eliminerà tutti i lotti principali</li>
                            <li>Resetterà i contatori delle sequenze ID a 1</li>
                          </ul>
                          Questa operazione non può essere annullata.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="my-4 space-y-2">
                        <Label htmlFor="reset-lots-password">Password di Sicurezza</Label>
                        <Input 
                          id="reset-lots-password" 
                          type="password"
                          placeholder="Inserisci la password di sicurezza"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setResetPassword("");
                        }}>
                          Annulla
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={resetLotsData}
                          disabled={isResettingLots || !resetPassword}
                        >
                          {isResettingLots ? "Eliminazione in corso..." : "Conferma Eliminazione"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Reset Sequenza ID Lotti</h3>
                    <p className="text-sm text-gray-500">
                      Reimposta il contatore degli ID dei lotti. Questa operazione non elimina i lotti esistenti
                      ma fa ripartire la numerazione dal valore specificato per i nuovi lotti.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="whitespace-nowrap ml-4"
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Reset Sequenza Lotti
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conferma reset sequenza ID lotti</DialogTitle>
                        <DialogDescription>
                          Questa operazione reimposta il contatore degli ID dei lotti. I lotti esistenti
                          manterranno i loro ID attuali, ma i nuovi lotti inizieranno dalla numerazione specificata.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Label htmlFor="reset-password-lot-sequence">Password di sicurezza</Label>
                        <Input 
                          id="reset-password-lot-sequence" 
                          type="password" 
                          placeholder="Inserisci la password di sicurezza"
                          value={resetPassword || "Gianluigi"}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setResetPassword("")}
                        >
                          Annulla
                        </Button>
                        <Button 
                          variant="default"
                          onClick={resetLotSequence}
                          disabled={isResettingLotSequence}
                        >
                          {isResettingLotSequence ? "Reset in corso..." : "Conferma Reset"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Backup Database</h3>
                    <p className="text-sm text-gray-500">
                      Esporta un backup completo del database in formato SQL.
                    </p>
                  </div>
                  <Button variant="outline" className="whitespace-nowrap ml-4">
                    <DatabaseBackup className="h-4 w-4 mr-2" />
                    Esporta Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni sull'Applicazione</CardTitle>
              <CardDescription>
                Dettagli sul software FLUPSY Delta Futuro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">FLUPSY Delta Futuro</h3>
                <p className="text-sm text-gray-500">Versione 1.0.0</p>
                <p className="text-sm text-gray-500">© 2023 Delta Futuro S.r.l.</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Descrizione</h4>
                <p className="text-sm text-gray-600">
                  Applicazione per la gestione e il monitoraggio delle unità FLUPSY (FLoating UPweller SYstem) 
                  per l'acquacoltura. Consente il tracciamento di ceste, cicli produttivi, operazioni 
                  e statistiche di crescita.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Contatti</h4>
                <p className="text-sm text-gray-600">
                  Email: lago.gianluigi@gmail.com<br />
                  Telefono: +39 3484105353<br />
                  Sito web: www.deltafuturo.it
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
