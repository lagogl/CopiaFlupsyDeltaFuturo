import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NFCReaderProps {
  onRead: (message: any) => void;
  onError: (error: string) => void;
  onAbort: () => void;
  forceSimulation?: boolean; // Nuovo parametro per forzare la simulazione
}

export default function NFCReader({ onRead, onError, onAbort, forceSimulation = false }: NFCReaderProps) {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("NFCReader attivato");
    
    // Se forceSimulation è true, eseguiamo sempre la simulazione per test
    if (forceSimulation) {
      console.log("MODALITÀ SIMULAZIONE FORZATA ATTIVA");
      const timer = setTimeout(() => {
        const simulatedData = [
          {
            recordType: 'text',
            mediaType: null,
            data: JSON.stringify({
              id: 3,
              number: 2,
              serialNumber: "SIMULATED-NFC-TAG",
              redirectTo: "/nfc-scan/basket/3",
              timestamp: new Date().toISOString()
            })
          }
        ];
        
        onRead(simulatedData);
      }, 2000);
      
      return () => {
        clearTimeout(timer);
        onAbort();
      };
    }
    
    // Check if the browser supports the Web NFC API
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      let aborted = false;
      
      console.log("Browser supporta NFC, avvio scanner...");
      
      const startNFCReader = async () => {
        try {
          // @ts-ignore - TypeScript doesn't know about the NDEFReader API yet
          const ndef = new window.NDEFReader();
          
          // Start NFC scanning
          await ndef.scan();
          console.log("NFC scan started successfully");
          
          // Set up reading handler
          ndef.onreading = (event: any) => {
            console.log("NFC tag read:", event);
            
            // Parse the NDEF message
            const message = event.message;
            const records = [];
            
            // Process each record in the message
            for (const record of message.records) {
              const recordObj = {
                recordType: record.recordType,
                mediaType: record.mediaType,
                data: null as any
              };
              
              // Handle different record types
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder();
                recordObj.data = textDecoder.decode(record.data);
              } else if (record.recordType === 'url') {
                const textDecoder = new TextDecoder();
                recordObj.data = textDecoder.decode(record.data);
              } else if (record.recordType === 'mime') {
                // For JSON or other MIME types
                try {
                  if (record.mediaType === 'application/json') {
                    const textDecoder = new TextDecoder();
                    recordObj.data = JSON.parse(textDecoder.decode(record.data));
                  } else {
                    const textDecoder = new TextDecoder();
                    recordObj.data = textDecoder.decode(record.data);
                  }
                } catch (e) {
                  console.error('Error parsing MIME record:', e);
                  recordObj.data = 'Error parsing data';
                }
              } else {
                // For unknown types, store as hexadecimal
                recordObj.data = 'Binary data';
              }
              
              records.push(recordObj);
            }
            
            if (!aborted) {
              onRead(records);
            }
          };
          
          // Set up error handler
          ndef.onerror = (event: any) => {
            console.error("NFC error:", event);
            if (!aborted) {
              onError(event.message || 'Unknown NFC error');
            }
          };
        } catch (error) {
          console.error("Error starting NFC scan:", error);
          if (!aborted) {
            onError(error instanceof Error ? error.message : 'Failed to start NFC scanning');
          }
        }
      };
      
      startNFCReader();
      
      // Clean up function
      return () => {
        aborted = true;
        console.log("Pulizia scanner NFC");
        onAbort();
      };
    } else {
      // Browser doesn't support NFC
      console.log("Browser non supporta NFC", { isMobile });
      
      // Se siamo su mobile, mostriamo un errore
      if (isMobile) {
        onError('Il tuo browser non supporta la tecnologia NFC. Prova con Chrome su Android.');
      } else {
        // Su desktop, invoca direttamente onAbort senza mostrare errori
        // perché è normale che un desktop non supporti NFC
        onAbort();
      }
    }
  }, [onRead, onError, onAbort, isMobile, forceSimulation]);
  
  // No visible UI, this is just a functional component
  return null;
}
