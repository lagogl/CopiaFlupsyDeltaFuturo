import { IStorage } from './storage';
import { format } from 'date-fns';

interface ExportOptions {
  fornitore?: string;
  dataEsportazione?: Date;
}

interface GiacenzaItem {
  identificativo: string;
  taglia: string;
  quantita: number;
  data_iniziale: string;
  mg_vongola: number;
  pezzi_kg_attuali: number;
}

interface GiacenzeExport {
  data_importazione: string;
  fornitore: string;
  giacenze: GiacenzaItem[];
}

/**
 * Genera il JSON per l'esportazione delle giacenze in formato standard
 * 
 * @param {IStorage} storage - L'interfaccia per interagire con il database
 * @param {ExportOptions} options - Opzioni per l'esportazione
 * @returns {Promise<GiacenzeExport>} JSON con i dati delle giacenze
 */
export async function generateExportGiacenze(
  storage: IStorage,
  options: ExportOptions = {}
): Promise<GiacenzeExport> {
  const {
    fornitore = 'Flupsy Manager',
    dataEsportazione = new Date()
  } = options;

  // Formato data YYYY-MM-DD
  const dataFormattata = format(dataEsportazione, 'yyyy-MM-dd');
  
  // Array per raccogliere le giacenze
  const giacenze: GiacenzaItem[] = [];
  
  try {
    // Recupera tutti i cicli attivi
    const activeCycles = await storage.getActiveCycles();
    
    // Per ogni ciclo attivo, recupera i dati necessari
    for (const cycle of activeCycles) {
      // Recupera il cestello associato al ciclo
      const basket = await storage.getBasket(cycle.basketId);
      if (!basket) continue;

      // Recupera il flupsy associato al cestello
      const flupsy = basket.flupsyId ? await storage.getFlupsy(basket.flupsyId) : null;
      if (!flupsy) continue;
      
      // Recupera tutte le operazioni per questo cestello
      const operations = await storage.getOperationsByBasket(basket.id);
      if (operations.length === 0) continue;
      
      // Ordina le operazioni per data (più recente prima)
      const sortedOps = operations.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Trova l'ultima operazione con misurazione
      const lastOperation = sortedOps.find(op => 
        op.animalsPerKg !== null && op.animalsPerKg > 0
      );
      if (!lastOperation) continue;
      
      // Recupera la taglia associata all'operazione
      if (!lastOperation.sizeId) continue;
      const size = await storage.getSize(lastOperation.sizeId);
      if (!size) continue;
      
      // Recupera il lotto associato all'operazione
      const lot = lastOperation.lotId ? await storage.getLot(lastOperation.lotId) : null;
      
      // Data iniziale del ciclo
      const startDate = format(new Date(cycle.startDate), 'yyyy-MM-dd');
      
      // Calcola il peso medio della vongola in mg
      // Il peso medio è 1kg (1.000.000 mg) diviso il numero di vongole per kg
      const mgVongola = lastOperation.animalsPerKg && lastOperation.animalsPerKg > 0 ? 
        Math.round(1000000 / lastOperation.animalsPerKg) : 0;
      
      // Genera identificativo univoco (prefisso flupsy + codice ciclo)
      const prefix = flupsy.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const identifier = lot ? 
        `${prefix}-${'L' + lot.id}` : 
        `${prefix}-${cycle.id}`;
      
      // Calcola pezzi per kg (animalsPerKg)
      const pezziKgAttuali = lastOperation.animalsPerKg || 0;
      
      // Aggiungi all'array delle giacenze
      giacenze.push({
        identificativo: identifier + "-B" + basket.physicalNumber, // Identificativo unico che include il numero del cestello
        taglia: size.code,
        quantita: lastOperation.animalCount || 0,
        data_iniziale: startDate,
        mg_vongola: mgVongola,
        pezzi_kg_attuali: pezziKgAttuali
      });
    }
    
    // Costruisci l'oggetto finale
    const result: GiacenzeExport = {
      data_importazione: dataFormattata,
      fornitore: fornitore,
      giacenze: giacenze
    };
    
    return result;
  } catch (error) {
    console.error('Errore durante la generazione del JSON per le giacenze:', error);
    throw new Error(`Errore durante l'esportazione: ${(error as Error).message}`);
  }
}