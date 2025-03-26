import { useEffect } from 'react';

interface NFCReaderProps {
  onRead: (message: any) => void;
  onError: (error: string) => void;
}

export default function NFCReader({ onRead, onError }: NFCReaderProps) {
  useEffect(() => {
    // Verifichiamo se il browser supporta l'API Web NFC
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      const startNFCReader = async () => {
        try {
          // @ts-ignore - TypeScript non conosce l'API NDEFReader
          const ndef = new window.NDEFReader();
          
          // Iniziamo la scansione
          await ndef.scan();
          console.log("Scansione NFC avviata");
          
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
          console.error("Errore avvio scansione NFC:", error);
          onError(error instanceof Error ? error.message : 'Impossibile avviare la scansione NFC');
        }
      };
      
      startNFCReader();
    } else {
      // Browser non supporta NFC
      onError('Il tuo browser non supporta NFC. Utilizza Chrome su Android.');
    }
  }, [onRead, onError]);
  
  // Nessuna UI visibile, solo funzionalità
  return null;
}