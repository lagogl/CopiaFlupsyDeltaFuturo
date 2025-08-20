import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, Tag, Database, HelpCircle, Smartphone, QrCode } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import NfcController from '../components/NfcController';
import { useNfc } from '../hooks/useNfc';
import { NfcTag } from '../utils/nfcSimulator';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const NfcManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('scanner');
  const [selectedBasketId, setSelectedBasketId] = useState<string>('');
  const [tagData, setTagData] = useState<any>({});
  
  const { writeTag, isSimulationMode } = useNfc();

  // Query per ottenere tutte le ceste disponibili
  const { data: baskets, isLoading } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: async () => {
      const response = await fetch('/api/baskets');
      if (!response.ok) throw new Error('Errore nel recupero delle ceste');
      return response.json();
    },
  });

  // Gestione della scrittura di un tag
  const handleWriteTag = async () => {
    if (!selectedBasketId) {
      toast({
        title: "Seleziona una cesta",
        description: "Devi selezionare una cesta valida prima di scrivere il tag",
        variant: "destructive"
      });
      return;
    }

    // Prepara i dati da scrivere sul tag
    const basketId = parseInt(selectedBasketId, 10);
    const basket = baskets?.find((b: any) => b.id === basketId);
    
    if (!basket) {
      toast({
        title: "Cesta non trovata",
        description: "La cesta selezionata non esiste nel sistema",
        variant: "destructive"
      });
      return;
    }

    // Struttura NFC v2.0 OTTIMIZZATA - Solo dati essenziali per identificazione univoca
    const dataToWrite = {
      // Identificazione primaria v2.0
      basketId,
      physicalNumber: basket.physicalNumber,
      currentCycleId: basket.currentCycleId,
      
      // Compatibilità legacy v1.0
      id: basketId,
      number: basket.physicalNumber,
      
      // Metadati tecnici
      timestamp: Date.now(),
      type: 'basket-tag',
      version: '2.0'
    };

    // Memorizza i dati per riferimento futuro
    setTagData(dataToWrite);

    // Scrivi i dati sul tag
    const success = await writeTag(dataToWrite);
    
    if (success) {
      toast({
        title: "Tag scritto con successo",
        description: `Il tag è stato programmato per la cesta #${basketId}`,
      });
    }
  };

  // Gestione del tag scansionato
  const handleTagScanned = (tag: NfcTag) => {
    // Gestione della nuova struttura di identificazione
    const tagInfo = tag.data || {};
    let description = "Nessuna cesta associata a questo tag";
    
    if (tagInfo.basketId || (tagInfo.physicalNumber && tagInfo.currentCycleId)) {
      const basketInfo = tagInfo.basketId 
        ? `ID: ${tagInfo.basketId}` 
        : `Numero fisico: ${tagInfo.physicalNumber}`;
      
      const cycleInfo = tagInfo.currentCycleId 
        ? `, Ciclo: ${tagInfo.currentCycleId}` 
        : '';
      
      const versionInfo = tagInfo.version 
        ? ` (v${tagInfo.version})` 
        : ' (v1.0)';
        
      description = `Cesta ${basketInfo}${cycleInfo}${versionInfo}`;
    }
    
    toast({
      title: "Tag NFC rilevato",
      description,
    });
  };

  return (
    <>
      <Helmet>
        <title>NFC Manager | FLUPSY Delta Futuro</title>
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">NFC Manager</h1>
            <p className="text-muted-foreground">Gestisci i tag NFC per le ceste e le unità FLUPSY</p>
          </div>
        </div>

        <Tabs defaultValue="scanner" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="scanner" className="flex items-center">
              <Smartphone className="h-4 w-4 mr-2" />
              Scanner NFC
            </TabsTrigger>
            <TabsTrigger value="writer" className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Programmazione Tag
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              Aiuto
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-4">
            <NfcController onTagScanned={handleTagScanned} />
          </TabsContent>

          {/* Writer Tab */}
          <TabsContent value="writer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Programmazione Tag NFC
                </CardTitle>
                <CardDescription>
                  Seleziona una cesta e programma un tag NFC da associare ad essa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isSimulationMode && (
                  <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-800">
                    <Wifi className="h-4 w-4" />
                    <AlertTitle>Attiva la scansione</AlertTitle>
                    <AlertDescription>
                      Prima di programmare un tag, assicurati di aver attivato la scansione NFC nella scheda Scanner.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="basketId">Seleziona Cesta</Label>
                    <Select 
                      value={selectedBasketId} 
                      onValueChange={setSelectedBasketId}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona una cesta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {baskets?.map((basket: any) => (
                          <SelectItem key={basket.id} value={basket.id.toString()}>
                            Cesta #{basket.id} - {basket.flupsyName} {basket.position ? `(${basket.position})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleWriteTag} 
                    disabled={!selectedBasketId}
                    className="w-full"
                  >
                    Programma Tag NFC
                  </Button>

                  {Object.keys(tagData).length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Dati da scrivere sul tag:</h4>
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(tagData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Guida all'utilizzo dell'NFC Manager
                </CardTitle>
                <CardDescription>
                  Informazioni e suggerimenti per l'uso ottimale della funzionalità NFC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-blue-50 border border-blue-100">
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
                      Requisiti di sistema
                    </h3>
                    <p className="text-sm mb-2">
                      Per utilizzare la funzionalità NFC è necessario:
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>Dispositivo con supporto NFC (la maggior parte degli smartphone moderni)</li>
                      <li>Browser compatibile con Web NFC API (Chrome su Android è consigliato)</li>
                      <li>Accesso ai permessi NFC sul dispositivo</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-md bg-green-50 border border-green-100">
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <Database className="h-5 w-5 mr-2 text-green-600" />
                      Contenuto dei tag
                    </h3>
                    <p className="text-sm mb-2">
                      I tag NFC contengono le seguenti informazioni:
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>ID della cesta associata</li>
                      <li>Unità FLUPSY e posizione</li>
                      <li>Taglia e peso attuale</li>
                      <li>Numero di animali</li>
                      <li>Timestamp dell'ultima operazione</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-md bg-purple-50 border border-purple-100">
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <QrCode className="h-5 w-5 mr-2 text-purple-600" />
                      Modalità simulazione
                    </h3>
                    <p className="text-sm">
                      La modalità simulazione ti permette di testare la funzionalità NFC anche su dispositivi
                      che non supportano NFC. Attiva questa modalità nella scheda Scanner e utilizza il pulsante
                      "Simula Scansione" per generare eventi di scansione simulati.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default NfcManagerPage;