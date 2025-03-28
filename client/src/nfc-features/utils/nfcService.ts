// Servizio NFC per interagire con tag NFC fisici
// Utilizza Web NFC API dove disponibile, altrimenti usa il simulatore

import { toast } from "@/hooks/use-toast";
import { nfcSimulator, type NfcTag } from "./nfcSimulator";

type ScanOptions = {
  onReading?: (tag: NfcTag) => void;
  onError?: (error: Error) => void;
};

class NfcService {
  private isScanning: boolean = false;
  private reader: any = null; // NDEFReader type
  private listeners: Array<(tag: NfcTag) => void> = [];

  constructor() {
    // Inizializza il servizio e registra il listener del simulatore
    this.init();
  }

  private init(): void {
    // Registra un listener per il simulatore
    nfcSimulator.addScanListener((tag: NfcTag) => {
      this.notifyListeners(tag);
    });
  }

  // Verifica se il NFC è supportato dal dispositivo
  isSupported(): boolean {
    return 'NDEFReader' in window || nfcSimulator.isSimulatorEnabled();
  }

  // Avvia la scansione di tag NFC
  async startScan(options: ScanOptions = {}): Promise<void> {
    if (this.isScanning) {
      return; // Già in scansione
    }

    // Se il simulatore è attivo, non utilizziamo il vero hardware NFC
    if (nfcSimulator.isSimulatorEnabled()) {
      this.isScanning = true;
      toast({
        title: "Simulazione NFC attiva",
        description: "Usa il pulsante 'Simula Scansione' per testare",
      });
      return;
    }

    // Verifica se il browser supporta NFC
    if (!('NDEFReader' in window)) {
      const error = new Error("NFC non supportato da questo browser");
      if (options.onError) options.onError(error);
      toast({
        title: "NFC non supportato",
        description: "Il tuo browser o dispositivo non supporta NFC. Attiva la modalità simulazione per i test.",
        variant: "destructive"
      });
      return;
    }

    try {
      // @ts-ignore - NDEFReader potrebbe non essere riconosciuto dal TS
      this.reader = new NDEFReader();
      this.isScanning = true;

      await this.reader.scan();
      
      toast({
        title: "Scansione NFC avviata",
        description: "Avvicina un tag NFC al dispositivo per leggerlo",
      });

      // Evento di lettura
      this.reader.addEventListener("reading", (event: any) => {
        try {
          const { serialNumber, message } = event;
          
          let data = {};
          // Estrai i dati dal messaggio NDEF
          if (message && message.records) {
            message.records.forEach((record: any) => {
              if (record.recordType === "text") {
                try {
                  const decoder = new TextDecoder();
                  const text = decoder.decode(record.data);
                  data = JSON.parse(text);
                } catch (e) {
                  console.error("Errore nel parsing del testo dal tag NFC", e);
                }
              }
            });
          }

          const tag: NfcTag = {
            id: serialNumber,
            timestamp: Date.now(),
            data
          };

          // Notifica il callback e i listener
          if (options.onReading) options.onReading(tag);
          this.notifyListeners(tag);
          
        } catch (e) {
          console.error("Errore durante la lettura del tag NFC", e);
          if (options.onError) options.onError(e as Error);
        }
      });

      // Evento di errore
      this.reader.addEventListener("error", (event: any) => {
        const error = new Error(event.message || "Errore nella lettura NFC");
        console.error("Errore NFC:", error);
        if (options.onError) options.onError(error);
      });

    } catch (e) {
      console.error("Errore nell'avvio della scansione NFC", e);
      this.isScanning = false;
      const error = e as Error;
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Accesso NFC negato",
          description: "L'utente ha negato l'accesso alla funzionalità NFC. Verifica le autorizzazioni.",
          variant: "destructive"
        });
      } else if (error.name === 'NotSupportedError') {
        toast({
          title: "NFC non supportato",
          description: "Il tuo browser o dispositivo non supporta NFC. Attiva la modalità simulazione per i test.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Errore NFC",
          description: error.message || "Si è verificato un errore durante l'avvio della scansione NFC",
          variant: "destructive"
        });
      }
      
      if (options.onError) options.onError(error);
    }
  }

  // Ferma la scansione NFC
  async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return; // Non in scansione
    }

    if (nfcSimulator.isSimulatorEnabled()) {
      this.isScanning = false;
      toast({
        title: "Simulazione NFC fermata",
        description: "La scansione in modalità simulazione è stata interrotta",
      });
      return;
    }

    try {
      if (this.reader) {
        // Non esiste un metodo diretto per fermare la scansione nella Web NFC API
        // ma possiamo rimuovere i listener
        this.reader = null;
      }
      
      this.isScanning = false;
      toast({
        title: "Scansione NFC fermata",
        description: "La scansione NFC è stata interrotta",
      });
    } catch (e) {
      console.error("Errore durante l'arresto della scansione NFC", e);
    }
  }

  // Simula la scansione di un tag (utile per testing)
  async simulateScan(tagId?: string): Promise<NfcTag | null> {
    if (!nfcSimulator.isSimulatorEnabled()) {
      toast({
        title: "Simulazione disattivata",
        description: "Attiva la modalità simulazione per utilizzare questa funzionalità",
        variant: "destructive"
      });
      return null;
    }

    try {
      return await nfcSimulator.scanTag(tagId);
    } catch (e) {
      console.error("Errore durante la simulazione di scansione NFC", e);
      return null;
    }
  }

  // Scrive dati su un tag NFC
  async writeTag(data: any, options: { overwrite?: boolean } = {}): Promise<boolean> {
    // Nel simulatore, aggiorniamo semplicemente il tag simulato
    if (nfcSimulator.isSimulatorEnabled()) {
      toast({
        title: "Scrittura simulata",
        description: "In modalità simulazione, esegui prima una scansione per selezionare un tag da aggiornare",
      });
      return false;
    }

    if (!('NDEFReader' in window)) {
      toast({
        title: "NFC non supportato",
        description: "Il tuo browser o dispositivo non supporta NFC. Attiva la modalità simulazione per i test.",
        variant: "destructive"
      });
      return false;
    }

    try {
      // @ts-ignore - NDEFReader potrebbe non essere riconosciuto dal TS
      const writer = new NDEFReader();
      
      toast({
        title: "Pronto a scrivere",
        description: "Avvicina un tag NFC al dispositivo per scrivere i dati",
      });

      // Prepara i dati da scrivere
      const jsonData = JSON.stringify(data);
      
      // Scrivi i dati sul tag
      await writer.write({
        records: [{
          recordType: "text",
          data: jsonData
        }]
      }, { overwrite: options.overwrite ?? true });

      toast({
        title: "Scrittura completata",
        description: "I dati sono stati scritti con successo sul tag NFC",
      });

      return true;
    } catch (e) {
      console.error("Errore durante la scrittura del tag NFC", e);
      const error = e as Error;
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Accesso NFC negato",
          description: "L'utente ha negato l'accesso alla funzionalità NFC. Verifica le autorizzazioni.",
          variant: "destructive"
        });
      } else if (error.name === 'NotSupportedError') {
        toast({
          title: "NFC non supportato",
          description: "Il tuo browser o dispositivo non supporta NFC. Attiva la modalità simulazione per i test.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Errore di scrittura NFC",
          description: error.message || "Si è verificato un errore durante la scrittura sul tag NFC",
          variant: "destructive"
        });
      }
      
      return false;
    }
  }

  // Verifica se è in corso una scansione
  isActive(): boolean {
    return this.isScanning;
  }

  // Attiva o disattiva la modalità simulazione
  setSimulationMode(enabled: boolean): void {
    nfcSimulator.setEnabled(enabled);
    
    // Se disattiviamo la simulazione mentre stiamo scansionando, fermiamo la scansione
    if (!enabled && this.isScanning) {
      this.stopScan();
    }
  }

  // Verifica se la modalità simulazione è attiva
  isSimulationModeEnabled(): boolean {
    return nfcSimulator.isSimulatorEnabled();
  }

  // Aggiunge un listener per la scansione di un tag
  addScanListener(listener: (tag: NfcTag) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notifica tutti i listener
  private notifyListeners(tag: NfcTag): void {
    this.listeners.forEach(listener => listener(tag));
  }
}

// Esporta un'istanza singola per tutta l'applicazione
export const nfcService = new NfcService();