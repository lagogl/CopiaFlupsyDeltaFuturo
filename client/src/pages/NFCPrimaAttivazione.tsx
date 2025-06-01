import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  Smartphone, QrCode, Calculator, Save, AlertTriangle,
  MapPin, Package, Waves, ScanLine, Camera, ArrowLeft, Settings
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import DraggableCalculator from "@/components/DraggableCalculator";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Schema di validazione per la prima attivazione
const primaAttivazioneSchema = z.object({
  date: z.date({
    required_error: "La data è obbligatoria",
  }),
  flupsyId: z.string().min(1, "Seleziona un FLUPSY"),
  basketId: z.string().min(1, "Seleziona un cestello"),
  row: z.string().min(1, "La riga è obbligatoria"),
  position: z.coerce.number().min(1, "La posizione deve essere maggiore di 0"),
  lotId: z.string().min(1, "Seleziona un lotto"),
  sizeId: z.string().min(1, "Seleziona una taglia"),
  animalCount: z.coerce.number().min(1, "Il numero di animali deve essere maggiore di 0"),
  totalWeight: z.coerce.number().min(0.01, "Il peso totale deve essere maggiore di 0"),
  animalsPerKg: z.coerce.number().optional(),
  sampleWeight: z.coerce.number().min(0.01, "Il peso del campione deve essere maggiore di 0"),
  liveAnimals: z.coerce.number().min(1, "Il numero di animali vivi deve essere maggiore di 0"),
  notes: z.string().optional(),
});

type PrimaAttivazioneFormData = z.infer<typeof primaAttivazioneSchema>;

// NOTA: Questo componente è temporaneamente disabilitato e mostra una pagina "in lavorazione"
// Tutto il codice originale è mantenuto per i futuri sviluppi
function NFCPrimaAttivazioneOriginal() {
  const { toast } = useToast();
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const form = useForm<PrimaAttivazioneFormData>({
    resolver: zodResolver(primaAttivazioneSchema),
    defaultValues: {
      date: new Date(),
      flupsyId: "",
      basketId: "",
      row: "",
      position: 1,
      lotId: "",
      sizeId: "",
      animalCount: 0,
      totalWeight: 0,
      animalsPerKg: 0,
      sampleWeight: 0,
      liveAnimals: 0,
      notes: "",
    },
  });

  // Controlla supporto NFC
  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsNFCSupported(true);
    }
  }, []);

  // Query per ottenere dati
  const { data: flupsys } = useQuery({ queryKey: ['/api/flupsys'] });
  const { data: baskets } = useQuery({ queryKey: ['/api/baskets?includeAll=true'] });
  const { data: lots } = useQuery({ queryKey: ['/api/lots/active'] });
  const { data: sizes } = useQuery({ queryKey: ['/api/sizes'] });

  // Filtra cestelli per FLUPSY selezionato
  const selectedFlupsyId = form.watch("flupsyId");
  const filteredBaskets = Array.isArray(baskets) ? baskets.filter((basket: any) => 
    basket.flupsyId.toString() === selectedFlupsyId && basket.state === 'available'
  ) : [];

  // Mutazione per creare l'operazione
  const createOperationMutation = useMutation({
    mutationFn: async (data: PrimaAttivazioneFormData) => {
      // Validazione dei dati obbligatori
      if (!data.lotId) {
        throw new Error('È necessario selezionare un lotto per procedere con la prima attivazione.');
      }

      if (!data.basketId) {
        throw new Error('È necessario selezionare un cestello.');
      }

      if (!data.sizeId) {
        throw new Error('È necessario selezionare una taglia.');
      }

      // Prima crea il ciclo
      const cycleData = {
        basketId: parseInt(data.basketId),
        lotId: parseInt(data.lotId),
        sizeId: parseInt(data.sizeId),
        startDate: format(data.date, 'yyyy-MM-dd'),
      };

      const cycleResponse = await apiRequest('/api/cycles', {
        method: 'POST',
        body: JSON.stringify(cycleData),
      });

      if (!cycleResponse.ok) {
        const errorData = await cycleResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Impossibile creare il nuovo ciclo. Verifica che il cestello sia disponibile.');
      }

      const cycle = await cycleResponse.json();

      // Poi crea l'operazione di prima attivazione
      const operationData = {
        type: 'prima-attivazione',
        date: format(data.date, 'yyyy-MM-dd'),
        basketId: parseInt(data.basketId),
        cycleId: cycle.id,
        lotId: parseInt(data.lotId),
        sizeId: parseInt(data.sizeId),
        animalCount: data.animalCount,
        totalWeight: data.totalWeight,
        animalsPerKg: data.animalsPerKg,
        sampleWeight: data.sampleWeight,
        liveAnimals: data.liveAnimals,
        notes: data.notes,
      };

      const operationResponse = await apiRequest('/api/operations', {
        method: 'POST',
        body: JSON.stringify(operationData),
      });

      if (!operationResponse.ok) {
        const errorData = await operationResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Impossibile registrare l\'operazione. Riprova.');
      }

      // Aggiorna la posizione del cestello
      const basketUpdateData = {
        row: data.row,
        position: data.position,
        state: 'active',
        currentCycleId: cycle.id,
      };

      const basketResponse = await apiRequest(`/api/baskets/${data.basketId}`, {
        method: 'PATCH',
        body: JSON.stringify(basketUpdateData),
      });

      if (!basketResponse.ok) {
        throw new Error('Errore nell\'aggiornamento del cestello');
      }

      return operationResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Prima attivazione completata",
        description: "L'operazione è stata registrata con successo.",
      });
      
      // Invalida le cache per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      // Reset del form
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funzione per leggere NFC
  const readNFC = async () => {
    if (!isNFCSupported) {
      toast({
        title: "NFC non supportato",
        description: "Il dispositivo non supporta la lettura NFC.",
        variant: "destructive",
      });
      return;
    }

    try {
      setNfcReading(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", ({ message }: any) => {
        const record = message.records[0];
        if (record?.recordType === "text") {
          const textDecoder = new TextDecoder(record.encoding || "utf-8");
          const nfcData = textDecoder.decode(record.data);
          
          try {
            const data = JSON.parse(nfcData);
            if (data.flupsyId) form.setValue("flupsyId", data.flupsyId.toString());
            if (data.basketId) form.setValue("basketId", data.basketId.toString());
            
            toast({
              title: "NFC letto con successo",
              description: `Dati caricati dal tag NFC`,
            });
          } catch {
            toast({
              title: "Formato NFC non valido",
              description: "Il tag NFC non contiene dati validi.",
              variant: "destructive",
            });
          }
        }
        setNfcReading(false);
      });

    } catch (error) {
      setNfcReading(false);
      toast({
        title: "Errore NFC",
        description: "Errore durante la lettura del tag NFC.",
        variant: "destructive",
      });
    }
  };

  // Funzione per scansionare QR Code (simulata)
  const scanQRCode = () => {
    // Qui implementeresti la scansione QR reale
    // Per ora simuliamo il risultato
    setIsQRScannerOpen(true);
    
    setTimeout(() => {
      // Simula la lettura di un QR code con posizione
      const qrData = { row: "DX", position: 3 };
      form.setValue("row", qrData.row);
      form.setValue("position", qrData.position);
      setIsQRScannerOpen(false);
      
      toast({
        title: "QR Code scansionato",
        description: `Posizione impostata: ${qrData.row}-${qrData.position}`,
      });
    }, 2000);
  };

  // Funzione per aprire il calcolatore
  const openCalculator = () => {
    setCalculatorOpen(true);
  };

  // Callback per ricevere i risultati dal calcolatore
  const handleCalculatorConfirm = (data: any) => {
    if (data.animalCount) form.setValue("animalCount", data.animalCount);
    if (data.animalsPerKg) form.setValue("animalsPerKg", data.animalsPerKg);
    if (data.totalWeight) form.setValue("totalWeight", data.totalWeight);
    if (data.sampleWeight) form.setValue("sampleWeight", data.sampleWeight);
    if (data.sampleCount) form.setValue("liveAnimals", data.sampleCount);
    setCalculatorOpen(false);
  };

  const onSubmit = (data: PrimaAttivazioneFormData) => {
    createOperationMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prima Attivazione NFC</h1>
          <p className="text-muted-foreground">
            Registra operazioni di prima attivazione tramite NFC e QR Code
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pannello principale del form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dati Operazione
              </CardTitle>
              <CardDescription>
                Compila i dati per la prima attivazione del cestello
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Data */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* FLUPSY */}
                    <FormField
                      control={form.control}
                      name="flupsyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>FLUPSY</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona FLUPSY" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(flupsys) && flupsys.map((flupsy: any) => (
                                <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                                  {flupsy.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cestello */}
                    <FormField
                      control={form.control}
                      name="basketId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cestello</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!selectedFlupsyId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona cestello" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredBaskets.map((basket: any) => (
                                <SelectItem key={basket.id} value={basket.id.toString()}>
                                  #{basket.physicalNumber}
                                  {basket.row && basket.position && ` (${basket.row}-${basket.position})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Riga */}
                    <FormField
                      control={form.control}
                      name="row"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Riga</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: DX, SX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Posizione */}
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posizione</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1"
                              placeholder="1, 2, 3..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Lotto */}
                  <FormField
                    control={form.control}
                    name="lotId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lotto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona lotto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(lots) && lots.map((lot: any) => (
                              <SelectItem key={lot.id} value={lot.id.toString()}>
                                Lotto #{lot.id} - {lot.supplier} ({lot.arrivalDate})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Taglia */}
                  <FormField
                    control={form.control}
                    name="sizeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taglia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona taglia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(sizes) && sizes.map((size: any) => (
                              <SelectItem key={size.id} value={size.id.toString()}>
                                {size.code} - {size.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Peso campione */}
                    <FormField
                      control={form.control}
                      name="sampleWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso Campione (g)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Animali vivi */}
                    <FormField
                      control={form.control}
                      name="liveAnimals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Animali Vivi</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Peso totale */}
                    <FormField
                      control={form.control}
                      name="totalWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso Totale (kg)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Note */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Inserisci eventuali note sull'operazione..."
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createOperationMutation.isPending}
                  >
                    {createOperationMutation.isPending && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    )}
                    <Save className="h-4 w-4 mr-2" />
                    Registra Prima Attivazione
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Pannello strumenti */}
        <div className="space-y-4">
          {/* Scanner NFC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Scanner NFC
              </CardTitle>
              <CardDescription>
                Leggi i dati del cestello dal tag NFC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={readNFC}
                disabled={!isNFCSupported || nfcReading}
                className="w-full"
                variant={isNFCSupported ? "default" : "secondary"}
              >
                {nfcReading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Lettura in corso...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    {isNFCSupported ? "Leggi NFC" : "NFC non supportato"}
                  </>
                )}
              </Button>
              {!isNFCSupported && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Il dispositivo non supporta la lettura NFC
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Scanner QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scanner QR Code
              </CardTitle>
              <CardDescription>
                Scansiona il QR code per la posizione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={scanQRCode}
                disabled={isQRScannerOpen}
                className="w-full"
                variant="outline"
              >
                {isQRScannerOpen ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    Scansione in corso...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Scansiona QR Posizione
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Calcolatore */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calcolatore
              </CardTitle>
              <CardDescription>
                Calcola automaticamente animali e taglia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={openCalculator}
                className="w-full"
                variant="outline"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Apri Calcolatore
              </Button>
            </CardContent>
          </Card>

          {/* Stato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Stato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">NFC</span>
                  <Badge variant={isNFCSupported ? "default" : "secondary"}>
                    {isNFCSupported ? "Supportato" : "Non supportato"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">FLUPSY</span>
                  <Badge variant={selectedFlupsyId ? "default" : "outline"}>
                    {selectedFlupsyId ? "Selezionato" : "Non selezionato"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calcolatore draggabile */}
      {calculatorOpen && (
        <DraggableCalculator
          isOpen={calculatorOpen}
          onClose={() => setCalculatorOpen(false)}
          onConfirm={handleCalculatorConfirm}
          initialData={{
            sampleWeight: form.watch("sampleWeight"),
            sampleCount: form.watch("liveAnimals"),
            totalWeight: form.watch("totalWeight"),
            animalsPerKg: form.watch("animalsPerKg")
          }}
        />
      )}
    </div>
  );
}

// Pagina temporanea "in lavorazione" - sostituisce il componente principale
export default function NFCPrimaAttivazione() {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation("/");
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Settings className="h-16 w-16 text-orange-600" />
            </div>
            <CardTitle className="text-2xl text-orange-800">
              Funzionalità in Lavorazione
            </CardTitle>
            <CardDescription className="text-orange-700">
              Prima Attivazione NFC
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <Alert className="border-orange-300 bg-orange-100">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">
                Sviluppo in Corso
              </AlertTitle>
              <AlertDescription className="text-orange-700">
                Questa funzionalità è attualmente in fase di sviluppo e non è ancora disponibile. 
                Il team sta lavorando per completare l'implementazione del sistema NFC per la prima attivazione dei cestelli.
              </AlertDescription>
            </Alert>

            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">
                Funzionalità Previste:
              </h3>
              <ul className="text-left text-orange-700 space-y-1">
                <li>• Lettura tag NFC per identificazione cestelli</li>
                <li>• Scansione QR code per posizioni</li>
                <li>• Configurazione automatica parametri</li>
                <li>• Integrazione con sistema FLUPSY</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-orange-700">
                Per ora, utilizza le altre funzionalità del sistema per gestire cestelli e operazioni.
              </p>
              
              <Button 
                onClick={handleGoBack}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}