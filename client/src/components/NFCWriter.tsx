import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, XCircle, WifiIcon, AlertTriangle, Usb } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { nfcService } from '@/nfc-features/utils/nfcService';
import { wechatNFCBridge } from '@/nfc-features/utils/wechatNFCBridge';
import { useNFCBridge } from '@/hooks/useNFCBridge';

interface NFCWriterProps {
  basketId: number;
  basketNumber: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context: string;
  userAgent: string;
  timestamp: string;
}

export default function NFCWriter({ basketId, basketNumber, onSuccess, onCancel }: NFCWriterProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [success, setSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  
  // Bridge USB per lettori desktop (auto-connessione attiva)
  const usbBridge = useNFCBridge(undefined, true); // Auto-connect per essere sempre pronto
  
  // Helper per catturare e riportare errori con dettagli completi
  const reportError = async (err: unknown, context: string) => {
    const details: ErrorDetails = {
      message: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code,
      stack: err instanceof Error ? err.stack : undefined,
      context,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    // Mostra nell'UI
    setError(details.message);
    setErrorDetails(details);
    setIsScanning(false);
    
    // Invia al server per il log
    try {
      await apiRequest({
        url: '/api/nfc-debug',
        method: 'POST',
        body: { 
          basketId, 
          basketNumber, 
          error: details 
        }
      });
    } catch (logError) {
      console.error('Impossibile inviare errore al server:', logError);
    }
  };
  
  useEffect(() => {
    // Verifica se NFC è supportato (Web NFC, WeChat Bridge, USB Bridge o Bluetooth)
    const isSupported = 'NDEFReader' in window || 
                       wechatNFCBridge.isWeChatAvailable() || 
                       usbBridge.isConnected ||
                       nfcService.isSupported();
    setNfcSupported(isSupported);

    // Inizializza WeChat bridge se disponibile
    if (wechatNFCBridge.isWeChatAvailable()) {
      wechatNFCBridge.initialize();
    }
  }, [usbBridge.isConnected]);
  
  const startWriting = async () => {
    if (!nfcSupported && !usbBridge.isConnected) {
      setError('NFC non è supportato. Avvia il bridge USB o usa smartphone.');
      return;
    }
    
    setIsScanning(true);
    setError(null);
    
    try {
      // 1. Bridge USB (priorità se connesso)
      if (usbBridge.isConnected) {
        console.log('🔌 Usando lettore USB NFC...');
        await handleUSBNFC();
        return;
      }

      // 2. Web NFC API (smartphone Android)
      if ('NDEFReader' in window) {
        console.log('📱 Usando lettore NFC integrato del dispositivo...');
        await handleNativeNFC();
        return;
      }

      // 3. Fallback
      setError('NFC non disponibile. Avvia il bridge USB o usa smartphone con NFC.');
      setIsScanning(false);

    } catch (error: any) {
      await reportError(error, 'startWriting');
    }
  };

  const writeViaWeChatBridge = async () => {
    try {
      // Ottieni dettagli cestello
      console.log("Recupero dettagli cestello per ID:", basketId);
      const basketDetailsArray = await apiRequest({
        url: `/api/baskets/details/${basketId}`,
        method: 'GET'
      }) as any[];

      // L'API restituisce un array, prendiamo il primo elemento
      const basketDetails = basketDetailsArray && basketDetailsArray.length > 0 ? basketDetailsArray[0] : null;

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
        cycleCode: basketDetails?.cycleCode || null,
        flupsyId: basketDetails?.flupsyId || 570,
        row: basketDetails?.row || null,
        position: basketDetails?.position || null,
        
        // Metadati tecnici
        url: redirectPath,
        type: 'basket-tag',
        version: '2.0'
      });

      if (result.success) {
        // Aggiorna il cestello nel database: imposta nfcData E stato "active"
        const uniqueNfcId = `basket-${basketId}-${Date.now()}`;
        await apiRequest({
          url: `/api/baskets/${basketId}`,
          method: 'PATCH',
          body: { 
            nfcData: uniqueNfcId,
            state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
          }
        });
        
        console.log(`✅ Cestello #${basketNumber} programmato via WeChat - nfcData: ${uniqueNfcId}`);
        
        // Invalida e ricarica immediatamente per refresh rapido
        await queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
        
        setSuccess(true);
        setIsScanning(false);
        
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(result.error || 'Errore WeChat bridge');
      }
    } catch (err: any) {
      await reportError(err, 'writeViaWeChatBridge');
    }
  };

  const handleNativeNFC = async () => {
    try {
      // @ts-ignore - NDEFReader non è ancora nei tipi standard di TypeScript
      const ndef = new window.NDEFReader();
      
      // Prima otteniamo i dettagli del cestello
      console.log("Recupero dettagli cestello per ID:", basketId);
      const basketDetailsArray = await apiRequest({
        url: `/api/baskets/details/${basketId}`,
        method: 'GET'
      }) as any[];
      
      // L'API restituisce un array, prendiamo il primo elemento
      const basketDetails = basketDetailsArray && basketDetailsArray.length > 0 ? basketDetailsArray[0] : null;
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
        cycleCode: basketDetails?.cycleCode || null,
        flupsyId: basketDetails?.flupsyId || 570,
        row: basketDetails?.row || null,
        position: basketDetails?.position || null,
        
        // Compatibilità legacy v1.0
        id: basketId,
        number: basketNumber,
        
        // Metadati tecnici
        redirectTo: redirectPath,
        timestamp: new Date().toISOString(),
        type: 'basket-tag',
        version: '2.0'
      };
      
      // Codifica JSON
      const jsonData = JSON.stringify(basketData);
      console.log("Dati JSON da scrivere sul tag:", jsonData);
      
      // Scrivi i dati sul tag NFC con formato NDEF standard
      console.log("Scrittura dati su tag NFC in corso...");
      await ndef.write({ 
        records: [{ 
          recordType: "text",
          encoding: "utf-8",
          lang: "en",
          data: jsonData 
        }] 
      });
      console.log("Scrittura tag NFC completata con successo");
      
      // Aggiorna il cestello nel database: imposta nfcData E stato "active"
      // nfcData ora contiene un ID univoco per il cestello, NON il serialNumber del tag fisico
      const uniqueNfcId = `basket-${basketId}-${Date.now()}`;
      await apiRequest({
        url: `/api/baskets/${basketId}`,
        method: 'PATCH',
        body: { 
          nfcData: uniqueNfcId,
          state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
        }
      });
      
      console.log(`✅ Cestello #${basketNumber} programmato - nfcData: ${uniqueNfcId}`);
      
      // Invalida la cache immediatamente per refresh rapido
      await queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
      
      // Feedback visivo
      setSuccess(true);
      setIsScanning(false);
      
      // Tempo per vedere il feedback di successo
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err: any) {
      await reportError(err, 'handleNativeNFC');
    }
  };

  const handleUSBNFC = async () => {
    try {
      console.log('🔌 Scrittura tramite lettore USB NFC...');
      
      // Ottieni dettagli cestello
      const basketDetailsArray = await apiRequest({
        url: `/api/baskets/details/${basketId}`,
        method: 'GET'
      }) as any[];
      
      // L'API restituisce un array, prendiamo il primo elemento
      const basketDetails = basketDetailsArray && basketDetailsArray.length > 0 ? basketDetailsArray[0] : null;
      
      // Prepara URL di redirect
      const baseUrl = window.location.origin;
      let redirectPath;
      
      if (basketDetails?.currentCycleId) {
        redirectPath = `${baseUrl}/cycles/${basketDetails.currentCycleId}`;
      } else {
        redirectPath = `${baseUrl}/nfc-scan/basket/${basketId}`;
      }
      
      // Struttura NFC v2.0 COMPATTA (ottimizzata per tag NTAG)
      const basketData = {
        id: basketId,
        num: basketDetails?.physicalNumber || basketNumber,
        cid: basketDetails?.currentCycleId || null,
        cc: basketDetails?.cycleCode || null,
        fid: basketDetails?.flupsyId || 570,
        row: basketDetails?.row || null,
        pos: basketDetails?.position || null,
        url: redirectPath,
        v: '2.0'
      };
      
      // Verifica dimensione payload (max 144 bytes per NTAG212)
      const jsonData = JSON.stringify(basketData);
      const dataSize = new TextEncoder().encode(jsonData).length;
      
      if (dataSize > 140) { // Margine sicurezza
        throw new Error(`Payload troppo grande (${dataSize} bytes, max 140). Riduci dati o usa tag più capiente.`);
      }
      
      console.log(`📏 Dimensione payload: ${dataSize} bytes (OK per NTAG)`);
      
      // Invia al bridge USB per scrittura (AWAIT Promise!)
      const result = await usbBridge.writeTag(basketData);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      console.log(`✅ Tag scritto via USB: ${result.message}`);
      
      // Aggiorna database
      const uniqueNfcId = `basket-${basketId}-${Date.now()}`;
      await apiRequest({
        url: `/api/baskets/${basketId}`,
        method: 'PATCH',
        body: { 
          nfcData: uniqueNfcId,
          state: 'active'
        }
      });
      
      console.log(`✅ Cestello #${basketNumber} programmato via USB - nfcData: ${uniqueNfcId}`);
      
      // Invalida cache
      await queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
      
      // Feedback visivo
      setSuccess(true);
      setIsScanning(false);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err: any) {
      setIsScanning(false); // Importante: resetta UI in caso di errore
      await reportError(err, 'handleUSBNFC');
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

      const uniqueNfcId = `basket-${basketId}-${Date.now()}`;

      await apiRequest({
        url: `/api/baskets/${basketId}`,
        method: 'PATCH',
        body: { 
          nfcData: uniqueNfcId,
          state: 'active'  // Imposta automaticamente come "in uso" quando programmi il tag
        }
      });
      
      console.log(`✅ Cestello #${basketNumber} programmato (simulazione) - nfcData: ${uniqueNfcId}`);
      
      // Invalida e ricarica immediatamente per refresh rapido
      await queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
      
      setSuccess(true);
      setIsScanning(false);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error: any) {
      await reportError(error, 'handleSimulationFallback');
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
          <DialogTitle className="text-center text-red-600">Si è verificato un errore</DialogTitle>
          <DialogDescription className="text-center text-lg font-medium">
            {error}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        
        {/* Dettagli dell'errore per debugging da mobile */}
        {errorDetails && (
          <div className="w-full bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800 space-y-3">
            <h3 className="font-bold text-sm text-red-900 dark:text-red-100">📋 Dettagli Errore (copia e invia allo sviluppatore):</h3>
            
            <div className="text-xs font-mono bg-white dark:bg-gray-900 p-3 rounded border border-red-200 dark:border-red-700 break-all space-y-2">
              <div><strong>Messaggio:</strong> {errorDetails.message}</div>
              {errorDetails.code && <div><strong>Codice:</strong> {errorDetails.code}</div>}
              <div><strong>Contesto:</strong> {errorDetails.context}</div>
              <div><strong>Timestamp:</strong> {new Date(errorDetails.timestamp).toLocaleString('it-IT')}</div>
              <div><strong>Browser:</strong> {errorDetails.userAgent.substring(0, 60)}...</div>
              {errorDetails.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-600 dark:text-red-400 font-semibold">Stack Trace</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">{errorDetails.stack}</pre>
                </details>
              )}
            </div>
            
            <p className="text-xs text-red-700 dark:text-red-300">
              ℹ️ Questo errore è stato automaticamente inviato al server per l'analisi.
            </p>
          </div>
        )}
        
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
            {usbBridge.isConnected 
              ? "🔌 Usando lettore USB NFC. Avvicina il tag al lettore."
              : wechatNFCBridge.isWeChatAvailable() 
                ? "Utilizzo WeChat bridge per NFC Tool Pro. Avvicina il tag al lettore."
                : "📱 Avvicina il tag NFC al dispositivo per programmarlo."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            {usbBridge.isConnected ? (
              <Usb className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            ) : (
              <WifiIcon className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            )}
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
          {usbBridge.isConnected && (
            <span className="block mt-2 text-green-600 font-medium">
              🔌 Lettore USB connesso - NFC Tool Pro pronto
            </span>
          )}
          {!usbBridge.isConnected && wechatNFCBridge.isWeChatAvailable() && (
            <span className="block mt-2 text-blue-600 font-medium">
              WeChat bridge rilevato - Supporto NFC Tool Pro attivo
            </span>
          )}
          {!usbBridge.isConnected && !wechatNFCBridge.isWeChatAvailable() && (
            <span className="block mt-2 text-gray-600 text-sm">
              📱 Usa smartphone con NFC o avvia bridge USB
            </span>
          )}
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex items-center justify-center p-4">
        {usbBridge.isConnected ? (
          <Usb className="h-16 w-16 text-green-600" />
        ) : (
          <WifiIcon className="h-16 w-16 text-gray-400" />
        )}
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