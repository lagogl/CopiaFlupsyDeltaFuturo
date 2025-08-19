import { useEffect } from 'react';
import { wechatNFCBridge } from '@/nfc-features/utils/wechatNFCBridge';

interface NFCReaderProps {
  onRead: (message: any) => void;
  onError: (error: string) => void;
}

export default function NFCReader({ onRead, onError }: NFCReaderProps) {
  useEffect(() => {
    const startNFCReading = async () => {
      try {
        // 1. Prova WeChat NFC Bridge se disponibile (stessa logica di NFCWriter che funziona)
        if (wechatNFCBridge.isWeChatAvailable()) {
          console.log('🔄 NFCReader usando WeChat NFC Bridge per lettura...');
          await readViaWeChatBridge();
          return;
        }

        // 2. Usa Web NFC API standard se disponibile
        if (typeof window !== 'undefined' && 'NDEFReader' in window) {
          await startNativeNFCReader();
          return;
        }

        // 3. Nessun lettore disponibile
        onError('Nessun lettore NFC disponibile su questo dispositivo.');
        
      } catch (error: any) {
        console.error('Errore durante l\'avvio lettura NFC:', error);
        onError(error.message || 'Errore durante l\'avvio della lettura NFC');
      }
    };

    startNFCReading();
  }, [onRead, onError]);

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
      // @ts-ignore - TypeScript non conosce l'API NDEFReader
      const ndef = new window.NDEFReader();
      
      // Iniziamo la scansione
      await ndef.scan();
      console.log("Scansione NFC nativa avviata");
      
      // Handler per la lettura
      ndef.onreading = (event: any) => {
        console.log("Tag NFC letto:", event);
        
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
      };
      
      // Handler per gli errori
      ndef.onerror = (event: any) => {
        console.error("Errore NFC:", event);
        onError(event.message || 'Errore sconosciuto NFC');
      };
    } catch (error) {
      console.error("Errore avvio scansione NFC nativa:", error);
      onError(error instanceof Error ? error.message : 'Impossibile avviare la scansione NFC nativa');
    }
  };
  
  // Nessuna UI visibile, solo funzionalità
  return null;
}