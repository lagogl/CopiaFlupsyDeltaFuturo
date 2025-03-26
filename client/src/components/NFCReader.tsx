import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NFCReaderProps {
  onRead: (message: any) => void;
  onError: (error: string) => void;
  onAbort: () => void;
}

export default function NFCReader({ onRead, onError, onAbort }: NFCReaderProps) {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Se non siamo su un dispositivo mobile, simula una lettura NFC per test
    if (!isMobile) {
      console.log("Non su mobile, simulando lettura NFC per test...");
      
      // Simula la lettura di un tag dopo un breve ritardo
      const simulationTimer = setTimeout(() => {
        // Crea un oggetto tag NFC simulato per test
        const simulatedTagData = [
          {
            recordType: 'text',
            mediaType: null,
            data: JSON.stringify({
              id: 3, // Esempio di ID cestello per test
              number: 2, // Esempio di numero fisico per test
              serialNumber: "SIMULATED-NFC-TAG",
              redirectTo: "/nfc-scan/basket/3",
              timestamp: new Date().toISOString()
            })
          }
        ];
        
        console.log("Per test su altri cestelli, modifica l'ID e il numero nel componente NFCReader");
        
        console.log("Simulazione di tag NFC completata:", simulatedTagData);
        onRead(simulatedTagData);
      }, 2000);
      
      // Clean up timer
      return () => {
        clearTimeout(simulationTimer);
        onAbort();
      };
    }
    
    // Check if the browser supports the Web NFC API
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      let aborted = false;
      
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
        onAbort();
      };
    } else {
      // Browser doesn't support NFC, ma lo gestiamo solo se siamo su mobile
      if (isMobile) {
        onError('Il tuo browser non supporta la tecnologia NFC. Prova con Chrome su Android.');
      }
    }
  }, [onRead, onError, onAbort, isMobile]);
  
  // No visible UI, this is just a functional component
  return null;
}
