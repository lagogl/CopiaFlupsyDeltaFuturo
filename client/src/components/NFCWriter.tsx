import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, XCircle, WifiIcon, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { nfcService } from '@/nfc-features/utils/nfcService';
import { wechatNFCBridge } from '@/nfc-features/utils/wechatNFCBridge';

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
    // Verifica se NFC è supportato (Web NFC, WeChat Bridge o Bluetooth)
    const isSupported = 'NDEFReader' in window || 
                       wechatNFCBridge.isWeChatAvailable() || 
                       nfcService.isSupported();
    setNfcSupported(isSupported);

    // Inizializza WeChat bridge se disponibile
    if (wechatNFCBridge.isWeChatAvailable()) {
      wechatNFCBridge.initialize();
    }
  }, []);
  
  const startWriting = async () => {
    if (!nfcSupported) {
      setError('NFC non è supportato su questo dispositivo.');
      return;
    }
    
    // Controlla se siamo su PC - NFC non disponibile su desktop
    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isDesktop) {
      setError('⚠️ Funzione NFC non disponibile su PC. Utilizza un dispositivo mobile con NFC integrato per programmare i tag.');
      return;
    }
    
    setIsScanning(true);
    setError(null);
    
    try {
      // Usa Web NFC API nativa del dispositivo mobile
      if ('NDEFReader' in window) {
        console.log('📱 Usando lettore NFC integrato del dispositivo...');
        await handleNativeNFC();
        return;
      }

      // Fallback se Web NFC non disponibile
      setError('NFC non è disponibile su questo dispositivo. Assicurati che il NFC sia attivo nelle impostazioni.');
      setIsScanning(false);

    } catch (error: any) {
      console.error('Errore durante la programmazione NFC:', error);
      setError(error.message || 'Errore durante la programmazione del tag NFC');
      setIsScanning(false);
    }
  };

  const writeViaWeChatBridge = async () => {
    try {
      // Ottieni dettagli cestello
      console.log("Recupero dettagli cestello per ID:", basketId);
      const basketDetails = await apiRequest({
        url: `/api/baskets/details/${basketId}`,
        method: 'GET'
      }) as any;

      // Prepara URL di redirect
      const baseUrl = window.location.origin;
      let redirectPath;
      
      if (basketDetails && basketDetails.currentCycleId) {
        redirectPath = `${baseUrl}/cycles/${basketDetails.currentCycleId}`;
      } else {
        redirectPath = `${baseUrl}/nfc-scan/basket/${basketId}`;
      }

      // Scrivi tramite WeChat bridge con struttura v2.0 OTTIMIZZATA
      const result = await wechatNFCBridge.writeNFCTag({
        // Identificazione primaria v2.0 (SEMPRE UNIVOCA)
        basketId: basketId,
        physicalNumber: basketDetails?.physicalNumber || basketNumber,
        currentCycleId: basketDetails?.currentCycleId || null,
        flupsyId: basketDetails?.flupsyId || 570,
        position: basketDetails?.position || null,
        
        // Metadati tecnici
        url: redirectPath,
        type: 'basket-tag',
        version: '2.0'
      });

      if (result.success) {
        // Aggiorna il cestello nel database: imposta nfcData E stato "active"
        await apiRequest({
          url: `/api/baskets/${basketId}`,
          method: 'PATCH',
          body: { 
            nfcData: result.data?.tagId || `wechat-${Date.now()}`,
            state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
          }
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        setSuccess(true);
        setIsScanning(false);
        
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(result.error || 'Errore WeChat bridge');
      }
    } catch (err: any) {
      console.error("Errore WeChat NFC:", err);
      setError(err.message || 'Errore durante la scrittura WeChat NFC.');
      setIsScanning(false);
    }
  };

  const handleNativeNFC = async () => {
    try {
      // @ts-ignore - NDEFReader non è ancora nei tipi standard di TypeScript
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      // Gestisce l'evento di lettura per Web NFC API
      ndef.addEventListener("reading", async ({ message, serialNumber }: any) => {
        try {
          // Prima otteniamo i dettagli del cestello
          console.log("Recupero dettagli cestello per ID:", basketId);
          const basketDetails = await apiRequest({
            url: `/api/baskets/details/${basketId}`,
            method: 'GET'
          }) as any;
          console.log("Dettagli cestello ricevuti:", basketDetails);
          
          // Prepara i dati da scrivere con tutte le informazioni necessarie
          // Se il cestello ha un ciclo attivo, reindirizza direttamente alla pagina del ciclo
          let redirectPath;
          // Ottiene l'URL base dell'applicazione senza il percorso
          const baseUrl = window.location.origin;
          console.log("URL base dell'applicazione:", baseUrl);
          
          if (basketDetails && basketDetails.currentCycleId) {
            redirectPath = `${baseUrl}/cycles/${basketDetails.currentCycleId}`;
            console.log("Cestello ha ciclo attivo, redirectPath completo impostato a:", redirectPath);
          } else {
            redirectPath = `${baseUrl}/nfc-scan/basket/${basketId}`;
            console.log("Cestello senza ciclo attivo, redirectPath completo impostato a:", redirectPath);
          }
            
          // Struttura NFC v2.0 OTTIMIZZATA - Identificazione univoca garantita
          const basketData = {
            // Identificazione primaria v2.0 (SEMPRE UNIVOCA)
            basketId: basketId,
            physicalNumber: basketDetails?.physicalNumber || basketNumber,
            currentCycleId: basketDetails?.currentCycleId || null,
            flupsyId: basketDetails?.flupsyId || 570,
            position: basketDetails?.position || null,
            
            // Compatibilità legacy v1.0
            id: basketId,
            number: basketNumber,
            
            // Metadati tecnici
            serialNumber: serialNumber,
            redirectTo: redirectPath,
            timestamp: new Date().toISOString(),
            type: 'basket-tag',
            version: '2.0'
          };
          
          // Codifica JSON
          const jsonData = JSON.stringify(basketData);
          console.log("Dati JSON da scrivere sul tag:", jsonData);
          
          // Scrivi i dati sul tag NFC
          console.log("Scrittura dati su tag NFC in corso...");
          await ndef.write({ 
            records: [{ recordType: "text", data: jsonData }] 
          });
          console.log("Scrittura tag NFC completata con successo");
          
          // Aggiorna il cestello nel database: imposta nfcData E stato "active"
          await apiRequest({
            url: `/api/baskets/${basketId}`,
            method: 'PATCH',
            body: { 
              nfcData: serialNumber,
              state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
            }
          });
          
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

  const handleSimulationFallback = async () => {
    try {
      console.log('🔄 Fallback su modalità simulazione NFC...');
      
      nfcService.setSimulationMode(true);
      
      const basketDetails = await apiRequest({
        url: `/api/baskets/details/${basketId}`,
        method: 'GET'
      }) as any;

      const simulatedTagId = `sim-${basketId}-${Date.now()}`;

      await apiRequest({
        url: `/api/baskets/${basketId}`,
        method: 'PATCH',
        body: { 
          nfcData: simulatedTagId,
          state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      setSuccess(true);
      setIsScanning(false);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error: any) {
      console.error("Errore simulazione:", error);
      setError(error.message || 'Errore durante la simulazione NFC.');
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
          <DialogTitle className="text-center">Configurazione NFC</DialogTitle>
          <DialogDescription className="text-center">
            Il sistema ha rilevato che il supporto NFC nativo non è disponibile. 
            Puoi utilizzare modalità alternative come lettori USB o simulazione per test.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              nfcService.setSimulationMode(true);
              startWriting();
            }}
          >
            <WifiIcon className="mr-2 h-4 w-4" />
            Usa Simulazione
          </Button>
          <Button variant="ghost" onClick={cancelScanning}>
            Annulla
          </Button>
        </div>
      </div>
    );
  }
  
  if (isScanning) {
    return (
      <div className="py-6 flex flex-col items-center justify-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-center">Programmazione tag NFC in corso...</DialogTitle>
          <DialogDescription className="text-center">
            {wechatNFCBridge.isWeChatAvailable() 
              ? "Utilizzo WeChat bridge per NFC Tool Pro. Avvicina il tag al lettore."
              : "Avvicina il tag NFC al dispositivo per programmarlo."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            <WifiIcon className="absolute inset-0 m-auto h-8 w-8 text-primary" />
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
        <DialogTitle className="text-center">Programmazione Tag NFC</DialogTitle>
        <DialogDescription className="text-center">
          Stai per programmare un tag NFC per il cestello #{basketNumber}.
          {wechatNFCBridge.isWeChatAvailable() && (
            <span className="block mt-2 text-blue-600 font-medium">
              WeChat bridge rilevato - Supporto NFC Tool Pro attivo
            </span>
          )}
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex items-center justify-center p-4">
        <WifiIcon className="h-16 w-16 text-gray-400" />
      </div>
      
      <div className="flex space-x-4">
        <Button variant="ghost" onClick={cancelScanning}>
          Annulla
        </Button>
        <Button onClick={startWriting}>
          Inizia programmazione
        </Button>
      </div>
    </div>
  );
}