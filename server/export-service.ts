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
  console.log("Inizio generazione export giacenze");
  const {
    fornitore = 'Flupsy Manager',
    dataEsportazione = new Date()
  } = options;

  // Formato data YYYY-MM-DD
  const dataFormattata = format(dataEsportazione, 'yyyy-MM-dd');
  console.log(`Data formattata: ${dataFormattata}, fornitore: ${fornitore}`);
  
  // Array per raccogliere le giacenze
  const giacenze: GiacenzaItem[] = [];
  
  try {
    console.log("Recupero cicli attivi...");
    // Recupera tutti i cicli attivi
    const activeCycles = await storage.getActiveCycles();
    console.log(`Trovati ${activeCycles.length} cicli attivi`);
    
    // Per ogni ciclo attivo, recupera i dati necessari
    console.log("Elaboro i dati di ciascun ciclo...");
    for (const cycle of activeCycles) {
      console.log(`Elaborazione ciclo ID ${cycle.id}, basket ID ${cycle.basketId}`);
      // Recupera il cestello associato al ciclo
      const basket = await storage.getBasket(cycle.basketId);
      if (!basket) {
        console.log(`Cestello ID ${cycle.basketId} non trovato, salto ciclo`);
        continue;
      }

      // Recupera il flupsy associato al cestello
      const flupsy = basket.flupsyId ? await storage.getFlupsy(basket.flupsyId) : null;
      if (!flupsy) {
        console.log(`FLUPSY ID ${basket.flupsyId} non trovato, salto ciclo`);
        continue;
      }
      console.log(`FLUPSY trovato: ${flupsy.name}`);
      
      // Recupera tutte le operazioni per questo cestello
      console.log(`Recupero operazioni per cestello ID ${basket.id}...`);
      const operations = await storage.getOperationsByBasket(basket.id);
      if (operations.length === 0) {
        console.log(`Nessuna operazione trovata per cestello ID ${basket.id}, salto ciclo`);
        continue;
      }
      console.log(`Trovate ${operations.length} operazioni per cestello ID ${basket.id}`);
      
      // Ordina le operazioni per data (più recente prima)
      const sortedOps = operations.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Trova l'ultima operazione con misurazione
      const lastOperation = sortedOps.find(op => 
        op.animalsPerKg !== null && op.animalsPerKg > 0
      );
      if (!lastOperation) {
        console.log(`Nessuna operazione con animalsPerKg > 0 trovata, salto ciclo`);
        continue;
      }
      console.log(`Ultima operazione valida ID ${lastOperation.id}, tipo ${lastOperation.type}, animalsPerKg: ${lastOperation.animalsPerKg}`);
      
      // Recupera la taglia associata all'operazione
      if (!lastOperation.sizeId) {
        console.log(`Operazione senza sizeId, salto ciclo`);
        continue;
      }
      console.log(`Recupero taglia ID ${lastOperation.sizeId}...`);
      const size = await storage.getSize(lastOperation.sizeId);
      if (!size) {
        console.log(`Taglia ID ${lastOperation.sizeId} non trovata, salto ciclo`);
        continue;
      }
      console.log(`Taglia trovata: ${size.code}`);
      
      // Recupera il lotto associato all'operazione
      const lot = lastOperation.lotId ? await storage.getLot(lastOperation.lotId) : null;
      console.log(`Lotto associato: ${lot ? 'ID ' + lot.id : 'nessuno'}`);
      
      // Data iniziale del ciclo
      const startDate = format(new Date(cycle.startDate), 'yyyy-MM-dd');
      console.log(`Data iniziale ciclo: ${startDate}`);
      
      // Calcola il peso medio della vongola in mg
      // Il peso medio è 1kg (1.000.000 mg) diviso il numero di vongole per kg
      let mgVongola = 0;
      if (lastOperation.animalsPerKg && lastOperation.animalsPerKg > 0) {
        // Converta il valore a Number per sicurezza e fissa a 3 cifre decimali per precisione
        const animalsPerKg = parseFloat(String(lastOperation.animalsPerKg));
        if (animalsPerKg > 0) {
          // Utilizza calcolo diretto invece di Math.round che potrebbe arrotondare a 0
          // Con valori grandi di animalsPerKg
          mgVongola = Math.ceil(1000000 / animalsPerKg);
          // Assicurati che ci sia sempre almeno 1mg
          if (mgVongola < 1) {
            mgVongola = 1;
          }
        }
      }
      console.log(`Calcolo mg_vongola: 1.000.000 / ${lastOperation.animalsPerKg} = ${mgVongola} mg`);
      
      // Genera identificativo univoco (prefisso flupsy + codice ciclo)
      const prefix = flupsy.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const identifier = lot ? 
        `${prefix}-${'L' + lot.id}` : 
        `${prefix}-${cycle.id}`;
      console.log(`Identificativo generato: ${identifier}`);
      
      // Calcola pezzi per kg (animalsPerKg)
      const pezziKgAttuali = lastOperation.animalsPerKg || 0;
      console.log(`Pezzi per kg attuali: ${pezziKgAttuali}`);
      
      // Aggiungi all'array delle giacenze
      const giacenzaItem = {
        identificativo: identifier + "-B" + basket.physicalNumber,
        taglia: size.code,
        quantita: lastOperation.animalCount || 0,
        data_iniziale: startDate,
        mg_vongola: mgVongola,
        pezzi_kg_attuali: pezziKgAttuali
      };
      console.log(`Aggiungo elemento giacenza:`, giacenzaItem);
      giacenze.push(giacenzaItem);
    }
    
    console.log(`Costruzione oggetto finale con ${giacenze.length} elementi`);
    // Costruisci l'oggetto finale
    const result: GiacenzeExport = {
      data_importazione: dataFormattata,
      fornitore: fornitore,
      giacenze: giacenze
    };
    
    console.log(`Oggetto finale costruito:`, JSON.stringify(result, null, 2));
    console.log("Generazione export giacenze completata con successo");
    return result;
  } catch (error) {
    console.error('Errore durante la generazione del JSON per le giacenze:', error);
    throw new Error(`Errore durante l'esportazione: ${(error as Error).message}`);
  }
}