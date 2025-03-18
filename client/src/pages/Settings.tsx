import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { AlertCircle, Save, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NFCReader from "@/components/NFCReader";

export default function Settings() {
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [readingNfc, setReadingNfc] = useState(false);
  
  // Check NFC support on component mount
  useState(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Impostazioni</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="general">Generale</TabsTrigger>
          <TabsTrigger value="nfc">NFC</TabsTrigger>
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
                    onAbort={() => setReadingNfc(false)}
                  />
                )}
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
                  Email: supporto@deltafuturo.it<br />
                  Telefono: +39 0123 456789<br />
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
