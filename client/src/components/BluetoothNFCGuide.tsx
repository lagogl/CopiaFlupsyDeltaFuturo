import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BluetoothIcon, ExternalLinkIcon, InfoIcon, CheckCircleIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BluetoothNFCGuideProps {
  onSimulationMode: () => void;
}

export default function BluetoothNFCGuide({ onSimulationMode }: BluetoothNFCGuideProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BluetoothIcon className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle className="text-blue-800">Lettore NFC Bluetooth Rilevato</CardTitle>
            <p className="text-sm text-blue-600 mt-1">
              Sistema Bluetooth disponibile per lettori NFC esterni
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <InfoIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Configurazione Richiesta</h4>
              <p className="text-sm text-blue-700 mb-3">
                I lettori NFC Bluetooth richiedono configurazione manuale nel sistema operativo 
                e software dedicato per funzionare con applicazioni web.
              </p>
              
              <div className="space-y-2">
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Associazione Bluetooth necessaria
                </Badge>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Driver dedicati richiesti
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                Guida Configurazione
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configurazione Lettore NFC Bluetooth</DialogTitle>
                <DialogDescription>
                  Guida passo-passo per configurare lettori NFC Bluetooth su PC
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="font-medium">1. Associazione Bluetooth</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-3">
                      <p className="text-sm">
                        <strong>Windows 10/11:</strong>
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Vai in Impostazioni → Dispositivi → Bluetooth</li>
                        <li>Attiva il Bluetooth se non è già attivo</li>
                        <li>Metti il lettore NFC in modalità associazione</li>
                        <li>Clicca "Aggiungi Bluetooth o altro dispositivo"</li>
                        <li>Seleziona il lettore dall'elenco e completa l'associazione</li>
                      </ul>
                      
                      <Separator className="my-3" />
                      
                      <p className="text-sm">
                        <strong>macOS:</strong>
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Apri Preferenze di Sistema → Bluetooth</li>
                        <li>Assicurati che il Bluetooth sia attivo</li>
                        <li>Metti il lettore in modalità associazione</li>
                        <li>Clicca "Connetti" quando appare nell'elenco</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <CheckCircleIcon className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">2. Driver e Software</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-3">
                      <p className="text-sm">
                        I lettori NFC Bluetooth richiedono software dedicato per interfacciarsi con le applicazioni web:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Installa i driver forniti dal produttore del lettore</li>
                        <li>Configura il lettore come dispositivo HID o COM</li>
                        <li>Verifica che il lettore sia riconosciuto dal sistema</li>
                        <li>Alcuni lettori richiedono software bridge per WebUSB/WebHID</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <CheckCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="font-medium">3. Limitazioni Browser</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 bg-gray-50 rounded-b-lg">
                    <div className="space-y-3">
                      <p className="text-sm">
                        Le applicazioni web hanno limitazioni nell'accesso diretto ai dispositivi Bluetooth NFC:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Web Bluetooth API non supporta dispositivi NFC</li>
                        <li>WebUSB/WebHID richiedono configurazione specifica</li>
                        <li>Alcuni lettori funzionano solo con software nativo</li>
                        <li>La sicurezza del browser limita l'accesso diretto</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800 mb-1">NFC Tool Pro Rilevato</h4>
                      <p className="text-sm text-green-700 mb-2">
                        Hai "NFC Tool Pro" associato tramite Bluetooth nelle impostazioni di Windows. 
                        Questo è un lettore professionale che dovrebbe funzionare con driver dedicati.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-green-700">
                          <strong>Passi per l'attivazione:</strong>
                        </p>
                        <ul className="text-sm space-y-1 ml-4 list-disc text-green-700">
                          <li>Verifica che il dispositivo sia connesso (visibile nelle impostazioni Bluetooth)</li>
                          <li>Avvia l'app NFC Tool Pro sul tuo sistema se disponibile</li>
                          <li>Configura il lettore per modalità bridge/passthrough</li>
                          <li>Per test immediati, usa la modalità simulazione qui sotto</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={onSimulationMode} className="flex-1">
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Usa Modalità Simulazione
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}