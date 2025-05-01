import { IStorage } from './storage';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

interface BasketDetailData {
  physicalNumber: number;
  flupsyName: string;
  position: string;
  sizeCode: string;
  animalsPerKg: number;
  averageWeight: number;
  totalAnimals: number;
  sgrMensile: string;
  lastOperation: string;
  cycleDuration: number;
}

/**
 * Genera il JSON per l'esportazione delle giacenze in formato standard
 * 
 * @param {IStorage} storage - L'interfaccia per interagire con il database
 * @param {ExportOptions} options - Opzioni per l'esportazione
 * @returns {Promise<GiacenzeExport>} JSON con i dati delle giacenze
 */
/**
 * Genera un file CSV con i dati di tutte le ceste attive
 * 
 * @param {IStorage} storage - L'interfaccia per interagire con il database
 * @returns {Promise<string>} Il contenuto CSV da scrivere nel file
 */
export async function generateBasketDetailCSV(storage: IStorage): Promise<string> {
  console.log("Inizio generazione export CSV dettaglio ceste");
  
  try {
    // Recupera tutti i cicli attivi
    const activeCycles = await storage.getActiveCycles();
    console.log(`Trovati ${activeCycles.length} cicli attivi`);
    
    // Array per raccogliere i dati delle ceste
    const basketsData: BasketDetailData[] = [];
    
    // Per ogni ciclo attivo, recupera i dati necessari
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
      
      // Recupera tutte le operazioni per questo cestello
      const operations = await storage.getOperationsByBasket(basket.id);
      if (operations.length === 0) {
        console.log(`Nessuna operazione trovata per cestello ID ${basket.id}, salto ciclo`);
        continue;
      }
      
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
      
      // Recupera la taglia associata all'operazione
      if (!lastOperation.sizeId) {
        console.log(`Operazione senza sizeId, salto ciclo`);
        continue;
      }
      const size = await storage.getSize(lastOperation.sizeId);
      if (!size) {
        console.log(`Taglia ID ${lastOperation.sizeId} non trovata, salto ciclo`);
        continue;
      }
      
      // Calcola il tasso di crescita se ci sono almeno due operazioni
      let growthRate = "N/D";
      if (operations.length >= 2) {
        const firstMeasureOp = [...sortedOps]
          .filter(op => op.type === 'misura' || op.type === 'peso')
          .pop(); // Prende la prima operazione di misura
          
        const lastMeasureOp = [...sortedOps]
          .filter(op => op.type === 'misura' || op.type === 'peso')
          .shift(); // Prende l'ultima operazione di misura
          
        if (firstMeasureOp && lastMeasureOp && 
            firstMeasureOp.averageWeight && lastMeasureOp.averageWeight) {
          const daysDiff = Math.max(1, (new Date(lastMeasureOp.date).getTime() - new Date(firstMeasureOp.date).getTime()) / (1000 * 60 * 60 * 24));
          
          // Calcola SGR come percentuale mensile
          const dailyGrowthRate = Math.pow(
            lastMeasureOp.averageWeight / firstMeasureOp.averageWeight, 
            1 / daysDiff
          ) - 1;
          const monthlyGrowthRate = dailyGrowthRate * 30 * 100; // Converti in percentuale mensile
          growthRate = monthlyGrowthRate.toFixed(2) + "%";
        }
      }
      
      // Posizione nella forma "RIGA-POSIZIONE"
      const position = basket.row && basket.position ? 
        `${basket.row}-${basket.position}` : 'Non posizionata';
      
      // Formatta la data dell'ultima operazione
      const formattedDate = format(new Date(lastOperation.date), 'dd/MM/yyyy', { locale: it });
      const lastOpInfo = `${formattedDate} (${lastOperation.type})`;
      
      // Calcola la durata del ciclo in giorni
      const cycleDuration = Math.max(0, (new Date().getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24));
      
      // Aggiungi alla lista dei dati
      basketsData.push({
        physicalNumber: basket.physicalNumber,
        flupsyName: flupsy.name,
        position: position,
        sizeCode: size.code,
        animalsPerKg: lastOperation.animalsPerKg || 0,
        averageWeight: lastOperation.averageWeight || 0,
        totalAnimals: lastOperation.animalCount || 0,
        sgrMensile: growthRate,
        lastOperation: lastOpInfo,
        cycleDuration: Math.floor(cycleDuration)
      });
    }
    
    // Ordina per numero fisico della cesta
    basketsData.sort((a, b) => a.physicalNumber - b.physicalNumber);
    
    // Crea l'intestazione CSV
    const headers = [
      "Cesta",
      "FLUPSY",
      "Posizione",
      "Taglia",
      "Animali/kg",
      "Peso medio (mg)",
      "Animali totali",
      "SGR mensile",
      "Ultima operazione",
      "Età (giorni)"
    ];
    
    // Crea le righe CSV
    const rows = basketsData.map(basket => [
      basket.physicalNumber.toString(),
      basket.flupsyName,
      basket.position,
      basket.sizeCode,
      basket.animalsPerKg.toString(),
      basket.averageWeight.toString(),
      basket.totalAnimals.toString(),
      basket.sgrMensile,
      basket.lastOperation,
      basket.cycleDuration.toString()
    ]);
    
    // Unisce tutto nel formato CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    console.log("Generazione export CSV dettaglio ceste completata con successo");
    return csvContent;
  } catch (error) {
    console.error('Errore durante la generazione del CSV:', error);
    throw new Error(`Errore durante l'esportazione CSV: ${(error as Error).message}`);
  }
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
      
      // Ottieni o calcola il valore per mg_vongola dai dati dell'operazione
      // IMPORTANTE: manteniamo il valore ESATTO come nel database, senza arrotondare o modificare
      let mgVongola = 0.1; // Valore di default che verrà sovrascritto
      
      console.log(`Verifico average_weight: type=${typeof lastOperation.averageWeight}, value=${lastOperation.averageWeight}`);
      
      // Determiniamo il valore corretto per mg_vongola
      if (lastOperation.averageWeight !== undefined && lastOperation.averageWeight !== null) {
        // Preserva esattamente il valore originale di averageWeight senza alcuna modifica
        mgVongola = Number(lastOperation.averageWeight);
        console.log(`Utilizzo average_weight originale: ${mgVongola} mg (ESATTO)`);
      } else if (lastOperation.animalsPerKg && lastOperation.animalsPerKg > 0) {
        // Calcolo alternativo se average_weight non è disponibile
        mgVongola = 1000000 / Number(lastOperation.animalsPerKg);
        console.log(`Calcolato mg_vongola da animalsPerKg: ${mgVongola} mg`);
      }
      
      // Controllo solo per valori non validi o negativi
      // NON applichiamo più alcun limite minimo, preserviamo il valore esatto originale
      if (isNaN(mgVongola) || !isFinite(mgVongola) || mgVongola <= 0) {
        console.warn(`Valore non valido o negativo (${mgVongola}), impostato a 0.001 mg`);
        mgVongola = 0.001; // valore minimo positivo solo in caso di errore
      }
      
      // Genera identificativo univoco con nome flupsy + codice ciclo
      // Usiamo il nome completo del FLUPSY invece dell'abbreviazione
      // Rimuoviamo spazi e caratteri speciali dal nome flupsy
      const prefixSanitized = flupsy.name.replace(/[^a-zA-Z0-9]/g, '');
      
      // Creazione dell'identificativo
      const identifier = lot ? 
        `${prefixSanitized}-${'L' + lot.id}` : 
        `${prefixSanitized}-${cycle.id}`;
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
        mg_vongola: mgVongola, // Usa il valore calcolato sopra
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