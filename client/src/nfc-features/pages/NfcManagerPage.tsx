import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, 
  Info, 
  MapPin, 
  HelpCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { nfcSimulator, NfcTag } from '../utils/nfcSimulator';
import NfcController from '../components/NfcController';

const NfcManagerPage: React.FC = () => {
  const [scannedTags, setScannedTags] = useState<NfcTag[]>([]);

  // Quando un tag viene scansionato, lo aggiungiamo alla lista
  const handleTagScanned = (tag: NfcTag) => {
    setScannedTags(prev => {
      // Se il tag è già nella lista, lo sostituiamo
      const exists = prev.some(t => t.id === tag.id);
      if (exists) {
        return prev.map(t => t.id === tag.id ? tag : t);
      }
      // Altrimenti lo aggiungiamo all'inizio
      return [tag, ...prev];
    });
  };

  // Formatta la data del timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Gestione NFC</h1>
      <p className="text-muted-foreground mt-2">
        Questa pagina permette di gestire e testare le funzionalità NFC per le ceste FLUPSY.
      </p>

      <Separator className="my-6" />

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scanner">
            <Rocket className="h-4 w-4 mr-2" />
            Scanner NFC
          </TabsTrigger>
          <TabsTrigger value="history">
            <MapPin className="h-4 w-4 mr-2" />
            Cronologia Scansioni
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Info className="h-4 w-4 mr-2" />
            Informazioni
          </TabsTrigger>
          <TabsTrigger value="help">
            <HelpCircle className="h-4 w-4 mr-2" />
            Aiuto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-6">
          <NfcController onTagScanned={handleTagScanned} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cronologia Scansioni</CardTitle>
              <CardDescription>
                Elenco degli ultimi tag NFC scansionati in questa sessione
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scannedTags.length > 0 ? (
                <Table>
                  <TableCaption>Elenco dei tag NFC scansionati</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID Tag</TableHead>
                      <TableHead>Cesta #</TableHead>
                      <TableHead>Ultima Operazione</TableHead>
                      <TableHead className="text-right">Scansionato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scannedTags.map((tag) => (
                      <TableRow key={tag.id + tag.timestamp}>
                        <TableCell className="font-mono text-xs">
                          {tag.id.substring(0, 10)}...
                        </TableCell>
                        <TableCell className="font-medium">#{tag.basketId || "N/D"}</TableCell>
                        <TableCell>
                          {tag.lastOperation ? (
                            <span className="capitalize">{tag.lastOperation.type}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Nessuna</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatTimestamp(tag.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun tag NFC scansionato in questa sessione
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
              <CardDescription>
                Informazioni sulle funzionalità NFC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Compatibilità</h3>
                <p className="text-muted-foreground">
                  Il supporto NFC è disponibile sui seguenti browser e dispositivi:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Chrome 89+ su Android</li>
                  <li>Edge 89+ su Android</li>
                  <li>Samsung Internet 14.0+ su Android</li>
                  <li>Chrome 89+ su Chrome OS</li>
                  <li>iOS 16+ Safari (limitato)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Utilizzo Tag NFC</h3>
                <p className="text-muted-foreground">
                  I tag NFC utilizzati per le ceste FLUPSY devono essere compatibili con NDEF e avere una capacità di almeno 144 byte.
                  Si consiglia l'utilizzo di tag NFC di tipo NTAG213 o superiori per garantire la compatibilità.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Sicurezza</h3>
                <p className="text-muted-foreground">
                  Le letture NFC sono possibili solo quando la pagina è attiva e l'utente ha dato il permesso.
                  La scrittura sui tag NFC richiede un'interazione esplicita dell'utente.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Modalità Offline</h3>
                <p className="text-muted-foreground">
                  Le operazioni NFC possono essere eseguite in modalità offline. I dati verranno sincronizzati
                  automaticamente quando la connessione Internet sarà disponibile.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Aiuto</CardTitle>
              <CardDescription>
                Come utilizzare le funzionalità NFC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Come scansionare un tag NFC</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Attiva la scansione NFC cliccando su "Avvia Scansione"</li>
                  <li>Avvicina il dispositivo al tag NFC della cesta</li>
                  <li>Mantieni il dispositivo vicino al tag finché non viene rilevato</li>
                  <li>Il tag verrà letto e verranno mostrate le azioni rapide disponibili</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Modalità Simulazione</h3>
                <p className="text-muted-foreground">
                  Se il tuo dispositivo non supporta NFC o vuoi testare la funzionalità:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Attiva la "Modalità Simulazione" utilizzando l'interruttore</li>
                  <li>Clicca su "Avvia Scansione"</li>
                  <li>Clicca su "Simula Scansione" per simulare la lettura di un tag NFC</li>
                  <li>Verranno mostrate le stesse funzionalità disponibili con un tag reale</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Risoluzione Problemi</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Il tag non viene rilevato</strong> - Assicurati che il tag sia posizionato correttamente. L'antenna NFC si trova solitamente nella parte superiore o centrale del dispositivo.</li>
                  <li><strong>Errore di permesso</strong> - Assicurati di aver dato il permesso al browser di accedere al sensore NFC.</li>
                  <li><strong>Impossibile avviare la scansione</strong> - Verifica che il tuo dispositivo supporti NFC e che sia abilitato nelle impostazioni.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NfcManagerPage;