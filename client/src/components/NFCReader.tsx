import { useEffect } from 'react';
import { wechatNFCBridge } from '@/nfc-features/utils/wechatNFCBridge';
import { useNFCBridge } from '@/hooks/useNFCBridge';

interface NFCReaderProps {
  onRead: (message: any) => void;
  onError: (error: string) => void;
}

export default function NFCReader({ onRead, onError }: NFCReaderProps) {
  // Bridge USB per lettori desktop (auto-connessione)
  const usbBridge = useNFCBridge(
    (serialNumber) => {
      // Tag rilevato da lettore USB
      console.log('📱 Tag USB rilevato:', serialNumber);
      const records = [{
        recordType: 'text',
        data: JSON.stringify({ serialNumber })
      }];
      onRead(records);
    },
    true // auto-connect
  );

  useEffect(() => {
    const startNFCReading = async () => {
      try {
        // 1. Bridge USB già attivo in background (useNFCBridge hook)
        if (usbBridge.isConnected) {
          console.log('🔌 Lettore USB NFC attivo');
          return; // Callback già configurato
        }

        // 2. Prova WeChat NFC Bridge se disponibile
        if (wechatNFCBridge.isWeChatAvailable()) {
          console.log('🔄 NFCReader usando WeChat NFC Bridge per lettura...');
          await readViaWeChatBridge();
          return;
        }

        // 3. Usa Web NFC API standard se disponibile (smartphone)
        if (typeof window !== 'undefined' && 'NDEFReader' in window) {
          await startNativeNFCReader();
          return;
        }

        // 4. Nessun lettore disponibile
        onError('Nessun lettore NFC disponibile. Avvia il bridge USB o usa smartphone.');
        
      } catch (error: any) {
        console.error('Errore durante l\'avvio lettura NFC:', error);
        onError(error.message || 'Errore durante l\'avvio della lettura NFC');
      }
    };

    startNFCReading();
  }, [onRead, onError, usbBridge.isConnected]);

  const readViaWeChatBridge = async () => {
    try {
      console.log('🔄 Lettura diretta WeChat NFC Bridge...');
      
      const result = await wechatNFCBridge.readNFCTag();
      
      if (result.success && result.data) {
        // Converti il risultato WeChat nel formato atteso da NFCReader
        const records = [{
          recordType: 'text',
          data: JSON.stringify({
            id: result.data.basketId,
            number: result.data.physicalNumber,
            redirectTo: result.data.url
          })
        }];
        
        console.log('✅ Tag NFC letto da WeChat Bridge:', records);
        onRead(records);
      } else {
        onError(result.error || 'Errore lettura NFC');
      }
    } catch (error: any) {
      console.error('Errore WeChat NFC bridge:', error);
      onError(error.message || 'Errore comunicazione lettore NFC');
    }
  };

  const startNativeNFCReader = async () => {
    try {
      // Controlla se i permessi NFC sono già stati concessi
      if ('permissions' in navigator) {
        try {
          // @ts-ignore - TypeScript non conosce la permission "nfc"
          const permissionStatus = await navigator.permissions.query({ name: "nfc" });
          console.log("📋 Stato permesso NFC:", permissionStatus.state);
          
          if (permissionStatus.state === "denied") {
            onError("Permesso NFC negato. Abilita NFC nelle impostazioni del browser.");
            return;
          }
        } catch (permError) {
          console.log("⚠️ Impossibile verificare permessi NFC (normale su alcuni browser)");
        }
      }

      // @ts-ignore - TypeScript non conosce l'API NDEFReader
      const ndef = new window.NDEFReader();
      
      // Gestione visibilità pagina - pausa NFC se la pagina va in background
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log("📱 Pagina nascosta - NFC in pausa");
        } else {
          console.log("📱 Pagina visibile - NFC attivo");
        }
      };
      
      document.addEventListener("visibilitychange", handleVisibilityChange);
      
      // Iniziamo la scansione
      await ndef.scan();
      console.log("✅ Scansione NFC nativa avviata");
      
      // Handler per la lettura
      ndef.onreading = (event: any) => {
        console.log("📱 Tag NFC letto:", event);
        
        // Vibrazione feedback se disponibile
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
        
        // Analizza il messaggio NDEF
        const message = event.message;
        const records = [];
        
        // Processa ogni record nel messaggio
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder();
            const text = textDecoder.decode(record.data);
            records.push({
              recordType: 'text',
              data: text
            });
          }
        }
        
        onRead(records);
        
        // Cleanup listener visibilità dopo lettura
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
      
      // Handler per gli errori
      ndef.onerror = (event: any) => {
        console.error("❌ Errore NFC:", event);
        onError(event.message || 'Errore sconosciuto NFC');
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    } catch (error) {
      console.error("❌ Errore avvio scansione NFC nativa:", error);
      const errorMsg = error instanceof Error ? error.message : 'Impossibile avviare la scansione NFC nativa';
      
      // Messaggi di errore più chiari per l'utente
      if (errorMsg.includes("not allowed")) {
        onError("Permesso NFC richiesto. Clicca 'Consenti' quando richiesto dal browser.");
      } else if (errorMsg.includes("not supported")) {
        onError("NFC non supportato su questo dispositivo.");
      } else {
        onError(errorMsg);
      }
    }
  };
  
  // Nessuna UI visibile, solo funzionalità
  return null;
}