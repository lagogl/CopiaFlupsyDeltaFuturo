// Servizio NFC per interagire con tag NFC fisici
// Utilizza Web NFC API dove disponibile, altrimenti usa il simulatore

import { toast } from "@/hooks/use-toast";
import { nfcSimulator, type NfcTag } from "./nfcSimulator";
import { bluetoothNFCDetector } from './bluetoothNFCDetector';
import { wechatNFCBridge } from './wechatNFCBridge';

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
    return this.detectNFCSupport() || nfcSimulator.isSimulatorEnabled();
  }

  // Metodo avanzato per rilevare il supporto NFC
  private detectNFCSupport(): boolean {
    // 1. Controlla Web NFC API (limitata a Chrome Android)
    if ('NDEFReader' in window) {
      return true;
    }

    // 2. Controlla WeChat NFC Bridge
    if (wechatNFCBridge.isWeChatAvailable()) {
      return true;
    }

    // 3. Controlla Bluetooth NFC  
    try {
      if (bluetoothNFCDetector.isBluetoothAvailable()) {
        return true;
      }
    } catch (error) {
      console.log('Bluetooth NFC non disponibile:', error);
    }

    // 2. Controlla WebUSB API per lettori USB NFC
    if ('usb' in navigator) {
      return true;
    }

    // 3. Controlla WebHID API per dispositivi HID NFC
    if ('hid' in navigator) {
      return true;
    }

    // 4. Controlla se è presente un service worker che potrebbe gestire NFC
    if ('serviceWorker' in navigator) {
      return true;
    }

    return false;
  }

  // Rileva il tipo di supporto NFC disponibile
  getNFCSupportType(): { type: string; description: string; recommended: string } {
    // Rileva se siamo su PC
    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isDesktop) {
      return {
        type: 'none',
        description: 'PC/Desktop rilevato - NFC non disponibile',
        recommended: '⚠️ Le funzioni NFC non sono operative su PC. Utilizza un dispositivo mobile con NFC integrato per programmare e leggere i tag.'
      };
    }

    // Su mobile, controlla Web NFC API nativa
    if ('NDEFReader' in window) {
      return {
        type: 'web-nfc',
        description: 'NFC integrato del dispositivo disponibile',
        recommended: 'Lettore NFC nativo del dispositivo attivo. Pronto per leggere e scrivere tag NFC.'
      };
    }

    // Mobile senza supporto NFC
    return {
      type: 'none',
      description: 'NFC non supportato su questo dispositivo mobile',
      recommended: 'Verifica che il NFC sia attivo nelle impostazioni del dispositivo o usa un dispositivo con supporto NFC integrato.'
    };
  }

  // Gestisce lettori NFC USB attraverso WebUSB o WebHID
  private async handleUSBNFCReader(options: ScanOptions, supportInfo: { type: string; description: string; recommended: string }): Promise<void> {
    try {
      this.isScanning = true;
      
      toast({
        title: "Rilevato lettore NFC esterno",
        description: `${supportInfo.description}. ${supportInfo.recommended}`,
      });

      // Fallback alla modalità simulazione con messaggio informativo
      setTimeout(() => {
        if (this.isScanning) {
          toast({
            title: "Usa la modalità simulazione",
            description: "Per i lettori NFC USB, usa temporaneamente la modalità simulazione mentre configuriamo il supporto hardware.",
            variant: "default"
          });
          this.isScanning = false;
        }
      }, 5000);

    } catch (error) {
      console.error("Errore nella gestione del lettore USB NFC:", error);
      this.isScanning = false;
      
      toast({
        title: "Errore lettore USB",
        description: "Impossibile accedere al lettore NFC USB. Usa la modalità simulazione.",
        variant: "destructive"
      });
      
      if (options.onError) options.onError(error as Error);
    }
  }

  // Richiede accesso al dispositivo USB
  private async requestUSBDevice(options: ScanOptions): Promise<void> {
    try {
      if ('usb' in navigator) {
        // Filtri per comuni lettori NFC USB
        const filters = [
          { vendorId: 0x072f }, // Advanced Card Systems Ltd
          { vendorId: 0x04e6 }, // SCM Microsystems
          { vendorId: 0x0b97 }, // O2 Micro
          { vendorId: 0x08e6 }, // Gemalto
          { vendorId: 0x04cc }, // ST-Ericsson
          { vendorId: 0x1fc9 }, // NXP Semiconductors
        ];

        const device = await (navigator as any).usb.requestDevice({ filters });
        
        if (device) {
          toast({
            title: "Lettore NFC connesso",
            description: `Dispositivo ${device.productName || 'NFC USB'} collegato con successo.`,
          });
          
          // Qui andrebbe implementata la logica specifica per il lettore
          // Per ora, attiviamo la modalità simulazione come fallback sicuro
          this.fallbackToSimulation();
        }
      } else if ('hid' in navigator) {
        // Gestione per dispositivi HID
        const devices = await (navigator as any).hid.requestDevice({ filters: [] });
        
        if (devices.length > 0) {
          toast({
            title: "Dispositivo HID rilevato",
            description: "Possibile lettore NFC HID trovato. Configurazione in corso...",
          });
          
          this.fallbackToSimulation();
        }
      }
    } catch (error) {
      console.error("Errore nell'accesso al dispositivo USB/HID:", error);
      
      toast({
        title: "Accesso negato",
        description: "L'utente ha negato l'accesso al dispositivo USB. Usa la modalità simulazione.",
        variant: "destructive"
      });
      
      this.fallbackToSimulation();
      if (options.onError) options.onError(error as Error);
    }
  }

  // Attiva automaticamente la modalità simulazione come fallback
  private fallbackToSimulation(): void {
    this.isScanning = false;
    nfcSimulator.setEnabled(true);
    
    toast({
      title: "Modalità simulazione attivata",
      description: "È ora possibile utilizzare la simulazione NFC per i test. Usa il pulsante 'Simula Scansione'.",
    });
  }

  // Metodo pubblico per attivare la modalità simulazione
  enableSimulationMode(): void {
    this.fallbackToSimulation();
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

    // Ottieni informazioni dettagliate sul supporto NFC
    const supportInfo = this.getNFCSupportType();
    
    // Se non c'è alcun supporto, mostra messaggio dettagliato
    if (supportInfo.type === 'none') {
      const error = new Error("NFC non supportato da questo browser");
      if (options.onError) options.onError(error);
      toast({
        title: "NFC non supportato",
        description: "Il tuo browser non supporta NFC. Attiva la modalità simulazione per i test.",
        variant: "destructive"
      });
      return;
    }

    // Per lettori USB/HID, proviamo approcci alternativi
    if (supportInfo.type === 'usb-nfc' || supportInfo.type === 'hid-nfc') {
      await this.handleUSBNFCReader(options, supportInfo);
      return;
    }

    // Per Web NFC API standard
    if (!('NDEFReader' in window)) {
      const error = new Error("Web NFC API non disponibile");
      if (options.onError) options.onError(error);
      toast({
        title: "Web NFC non disponibile",
        description: `${supportInfo.description}. ${supportInfo.recommended}`,
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