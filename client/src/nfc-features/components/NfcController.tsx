import React, { useState } from 'react';
import { useNfc } from '../hooks/useNfc';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, Smartphone, Tag, Check, X, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NfcTag } from '../utils/nfcSimulator';
import NfcQuickActions from '@/nfc-features/components/NfcQuickActions';

interface NfcControllerProps {
  onTagScanned?: (tag: NfcTag) => void;
}

const NfcController: React.FC<NfcControllerProps> = ({ onTagScanned }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const { 
    isScanning, 
    isSupported, 
    isSimulationMode,
    lastScannedTag,
    error,
    startScan,
    stopScan,
    simulateScan,
    toggleSimulationMode
  } = useNfc({
    onTag: (tag) => {
      if (onTagScanned) {
        onTagScanned(tag);
      }
    }
  });

  // Gestisce lo stato di scansione
  const handleScanToggle = async () => {
    if (isScanning) {
      await stopScan();
    } else {
      await startScan();
    }
  };

  // Simula una scansione (per testing)
  const handleSimulateScan = async () => {
    await simulateScan();
  };

  // Formatta la data del timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Stato NFC */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center">
              <Smartphone className="mr-2 h-5 w-5" />
              NFC Manager
            </CardTitle>
            <Badge variant={isSupported ? "outline" : "destructive"}>
              {isSupported ? "Supportato" : "Non Supportato"}
            </Badge>
          </div>
          <CardDescription>
            Gestisci le interazioni con i tag NFC per le ceste
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          {/* Avviso di supporto */}
          {!isSupported && !isSimulationMode && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>NFC non supportato</AlertTitle>
              <AlertDescription>
                Il tuo browser o dispositivo non supporta NFC. Attiva la modalità simulazione per i test.
              </AlertDescription>
            </Alert>
          )}

          {/* Controlli principali */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="simulation-mode"
                  checked={isSimulationMode}
                  onCheckedChange={toggleSimulationMode}
                />
                <Label htmlFor="simulation-mode">Modalità Simulazione</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={isScanning ? "destructive" : "default"}
                  onClick={handleScanToggle}
                  disabled={!isSupported && !isSimulationMode}
                >
                  {isScanning ? "Ferma Scansione" : "Avvia Scansione"}
                </Button>
                
                {isSimulationMode && isScanning && (
                  <Button onClick={handleSimulateScan} variant="outline">
                    Simula Scansione
                  </Button>
                )}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
              <span className="text-sm font-medium">Stato:</span>
              <div className="flex items-center">
                {isScanning ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Scansione attiva
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <span className="mr-1 h-2 w-2 rounded-full bg-amber-500"></span>
                    In attesa
                  </Badge>
                )}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Nascondi Dettagli" : "Mostra Dettagli"}
          </Button>
        </CardFooter>
      </Card>

      {/* Ultimo tag scansionato e azioni rapide */}
      {lastScannedTag && (
        <Card className="border-2 border-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Tag className="mr-2 h-5 w-5" />
                Tag Scansionato
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Cesta #{lastScannedTag.basketId || "N/D"}
              </Badge>
            </div>
            <CardDescription>
              ID: {lastScannedTag.id.substring(0, 8)}...
              {" • "}
              Scansionato: {formatTimestamp(lastScannedTag.timestamp)}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Quick Actions Menu */}
            <NfcQuickActions tag={lastScannedTag} />

            {/* Tag details */}
            {showDetails && (
              <div className="mt-4 bg-muted/30 p-3 rounded-md text-sm">
                <h4 className="font-semibold mb-2 text-xs text-muted-foreground">DETTAGLI COMPLETI</h4>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(lastScannedTag, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info per utilizzo */}
      <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>Come utilizzare</AlertTitle>
        <AlertDescription className="text-sm">
          Questa funzionalità permette di interagire con i tag NFC associati alle ceste.
          Avvia la scansione e avvicina il dispositivo al tag NFC per leggerne i dati e
          accedere alle operazioni rapide.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NfcController;