import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, XCircle, WifiIcon } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface NFCWriterProps {
  basketId: number;
  basketNumber: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NFCWriter({ basketId, basketNumber, onSuccess, onCancel }: NFCWriterProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Verifica se NFC è supportato
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  }, []);
  
  const startWriting = async () => {
    if (!nfcSupported) {
      setError('NFC non è supportato su questo dispositivo.');
      return;
    }
    
    setIsScanning(true);
    setError(null);
    
    try {
      // @ts-ignore - NDEFReader non è ancora nei tipi standard di TypeScript
      const ndef = new window.NDEFReader();
      
      await ndef.scan();
      
      // Gestisce l'evento di lettura
      ndef.addEventListener("reading", async ({ message, serialNumber }: any) => {
        try {
          // Prima otteniamo i dettagli del cestello per verificare se ha un ciclo attivo
          const basketDetails = await apiRequest('GET', `/api/baskets/details/${basketId}`) as any;
          
          // Prepara i dati da scrivere con tutte le informazioni necessarie
          // Se il cestello ha un ciclo attivo, reindirizza direttamente alla pagina del ciclo
          const redirectPath = basketDetails && basketDetails.currentCycleId 
            ? `/cycles/${basketDetails.currentCycleId}` 
            : `/nfc-scan/basket/${basketId}`;
            
          const basketData = {
            id: basketId,
            number: basketNumber,
            serialNumber: serialNumber,
            redirectTo: redirectPath,
            timestamp: new Date().toISOString()
          };
          
          // Codifica JSON
          const jsonData = JSON.stringify(basketData);
          
          // Scrivi i dati sul tag NFC
          await ndef.write({ 
            records: [{ recordType: "text", data: jsonData }] 
          });
          
          // Aggiorna il cestello nel database per salvare il numero di serie NFC
          await apiRequest(
            'PATCH',
            `/api/baskets/${basketId}`,
            { nfcData: serialNumber }
          );
          
          // Invalida la cache
          queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
          
          // Feedback visivo
          setSuccess(true);
          setIsScanning(false);
          
          // Tempo per vedere il feedback di successo
          setTimeout(() => {
            onSuccess();
          }, 1500);
          
        } catch (err: any) {
          console.error("Errore durante la scrittura NFC:", err);
          setError(err.message || 'Errore durante la scrittura del tag NFC.');
          setIsScanning(false);
        }
      });
      
      // Gestisce errori durante la scansione
      ndef.addEventListener("error", (error: any) => {
        console.error("Errore NFC:", error);
        setError(error.message || 'Errore di comunicazione NFC.');
        setIsScanning(false);
      });
      
    } catch (err: any) {
      console.error("Errore nell'avvio della scrittura NFC:", err);
      setError(err.message || 'Impossibile avviare la funzionalità NFC.');
      setIsScanning(false);
    }
  };
  
  const cancelScanning = async () => {
    setIsScanning(false);
    onCancel();
  };
  
  if (success) {
    return (
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-center">Tag NFC Programmato!</DialogTitle>
          <DialogDescription className="text-center">
            Il tag NFC è stato associato con successo al cestello #{basketNumber}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-center">Si è verificato un errore</DialogTitle>
          <DialogDescription className="text-center">
            {error}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <div className="flex space-x-4">
          <Button variant="ghost" onClick={cancelScanning}>
            Annulla
          </Button>
          <Button onClick={startWriting}>
            Riprova
          </Button>
        </div>
      </div>
    );
  }
  
  if (nfcSupported === false) {
    return (
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-center">NFC non supportato</DialogTitle>
          <DialogDescription className="text-center">
            Questo dispositivo non supporta la tecnologia NFC. Utilizza un dispositivo compatibile con NFC per programmare i tag.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <Button variant="ghost" onClick={onCancel}>
          Chiudi
        </Button>
      </div>
    );
  }
  
  if (isScanning) {
    return (
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-center">Avvicina il tag NFC</DialogTitle>
          <DialogDescription className="text-center">
            Avvicina il tag NFC al retro del dispositivo e mantienilo in posizione fino al completamento della scrittura.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative flex items-center justify-center p-4">
          <WifiIcon className="h-16 w-16 text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 animate-ping rounded-full border-4 border-primary opacity-20"></div>
          </div>
        </div>
        
        <Button variant="ghost" onClick={cancelScanning}>
          Annulla
        </Button>
      </div>
    );
  }
  
  return (
    <div className="py-6 flex flex-col items-center justify-center space-y-4">
      <DialogHeader>
        <DialogTitle className="text-center">Programma Tag NFC</DialogTitle>
        <DialogDescription className="text-center">
          Stai per programmare un tag NFC per il cestello #{basketNumber}. 
          Clicca "Avvia programmazione" e tieni pronto il tag NFC.
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex items-center justify-center p-4">
        <WifiIcon className="h-16 w-16 text-primary" />
      </div>
      
      <div className="flex space-x-4">
        <Button variant="ghost" onClick={onCancel}>
          Annulla
        </Button>
        <Button onClick={startWriting}>
          Avvia programmazione
        </Button>
      </div>
    </div>
  );
}