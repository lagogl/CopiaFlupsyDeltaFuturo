// Simulatore di tag NFC per testare la funzionalità anche su dispositivi che non supportano NFC

// Funzione per generare un ID casuale (sostituto di uuid)
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Interfaccia per i tag NFC - AGGIORNATA per identificazione univoca
export interface NfcTag {
  id: string;
  timestamp: number;
  basketId?: number;
  physicalNumber?: number;    // Numero fisico del cestello
  currentCycleId?: number;    // ID del ciclo corrente
  data: any;
  lastOperation?: {
    type: string;
    date: string;
  };
}

// Collezione di tag NFC di esempio per la simulazione - AGGIORNATA con nuova struttura
const sampleTags: NfcTag[] = [
  {
    id: generateId(),
    timestamp: Date.now(),
    basketId: 1001,
    physicalNumber: 1,
    currentCycleId: 5,
    data: {
      basketId: 1001,
      physicalNumber: 1,
      currentCycleId: 5,
      flupsy: "Flupsy A",
      flupsyId: 570,
      position: 1,
      row: "DX",
      cycleCode: "C-5",
      sizeClass: "TP-500",
      lastWeight: 15.3,
      count: 5000,
      type: 'basket-tag',
      version: '2.0'
    },
    lastOperation: {
      type: "peso",
      date: new Date().toISOString()
    }
  },
  {
    id: generateId(),
    timestamp: Date.now() - 86400000, // 1 giorno fa
    basketId: 1002,
    physicalNumber: 2,
    currentCycleId: 4,
    data: {
      basketId: 1002,
      physicalNumber: 2,
      currentCycleId: 4,
      flupsy: "Flupsy A",
      flupsyId: 570,
      position: 2,
      row: "SX",
      cycleCode: "C-4",
      sizeClass: "TP-1000",
      lastWeight: 25.7,
      count: 3500,
      type: 'basket-tag',
      version: '2.0'
    },
    lastOperation: {
      type: "misura",
      date: new Date(Date.now() - 86400000).toISOString()
    }
  },
  {
    id: generateId(),
    timestamp: Date.now() - 172800000, // 2 giorni fa
    basketId: 1003,
    physicalNumber: 1,  // Stesso numero fisico ma ciclo diverso
    currentCycleId: 3,  // Ciclo diverso dal primo
    data: {
      basketId: 1003,
      physicalNumber: 1,
      currentCycleId: 3,
      flupsy: "Flupsy B",
      flupsyId: 582,
      position: 1,
      row: "DX",
      cycleCode: "C-3",
      sizeClass: "TP-180",
      lastWeight: 5.2,
      count: 10000,
      type: 'basket-tag',
      version: '2.0'
    },
    lastOperation: {
      type: "prima-attivazione",
      date: new Date(Date.now() - 172800000).toISOString()
    }
  }
];

class NfcSimulator {
  private enabled: boolean = false;
  private scanListeners: Array<(tag: NfcTag) => void> = [];

  // Attiva o disattiva il simulatore
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Verifica se il simulatore è attivo
  isSimulatorEnabled(): boolean {
    return this.enabled;
  }

  // Simula la scansione di un tag NFC
  async scanTag(tagId?: string): Promise<NfcTag> {
    if (!this.enabled) {
      throw new Error("Il simulatore NFC non è attivo");
    }

    // Se viene fornito un ID specifico, trova il tag corrispondente
    if (tagId) {
      const tag = sampleTags.find(t => t.id === tagId);
      if (tag) {
        // Aggiorna il timestamp per simulare una nuova scansione
        const updatedTag = {
          ...tag,
          timestamp: Date.now()
        };
        this.notifyListeners(updatedTag);
        return updatedTag;
      }
    }

    // Altrimenti seleziona un tag casuale dalla collezione di esempio
    const randomIndex = Math.floor(Math.random() * sampleTags.length);
    const tag = sampleTags[randomIndex];
    
    // Aggiorna il timestamp per simulare una nuova scansione
    const updatedTag = {
      ...tag,
      timestamp: Date.now()
    };
    
    this.notifyListeners(updatedTag);
    return updatedTag;
  }

  // Crea un nuovo tag NFC simulato
  createNewTag(basketId: number, data: any = {}): NfcTag {
    const newTag: NfcTag = {
      id: generateId(),
      timestamp: Date.now(),
      basketId,
      data: {
        basketId,
        ...data
      }
    };
    
    // Aggiungi il nuovo tag alla collezione di esempio
    sampleTags.push(newTag);
    
    return newTag;
  }

  // Aggiorna un tag NFC esistente
  updateTag(tagId: string, data: any): NfcTag | null {
    const tagIndex = sampleTags.findIndex(t => t.id === tagId);
    if (tagIndex === -1) {
      return null;
    }
    
    // Aggiorna i dati del tag
    const updatedTag = {
      ...sampleTags[tagIndex],
      timestamp: Date.now(),
      data: {
        ...sampleTags[tagIndex].data,
        ...data
      }
    };
    
    sampleTags[tagIndex] = updatedTag;
    return updatedTag;
  }

  // Aggiungi un listener per le scansioni
  addScanListener(listener: (tag: NfcTag) => void): () => void {
    this.scanListeners.push(listener);
    return () => {
      this.scanListeners = this.scanListeners.filter(l => l !== listener);
    };
  }

  // Notifica tutti i listener
  private notifyListeners(tag: NfcTag): void {
    this.scanListeners.forEach(listener => listener(tag));
  }
}

// Esporta un'istanza singola per tutta l'applicazione
export const nfcSimulator = new NfcSimulator();