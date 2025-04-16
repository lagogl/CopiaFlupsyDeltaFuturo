import { Lot, Size, Operation, Cycle } from '@shared/schema';
import { format } from 'date-fns';
import { IStorage } from './storage';

/**
 * Interfaccia per la struttura del JSON di esportazione giacenze
 */
interface ExportFormatoGiacenze {
  data_importazione: string;
  fornitore: string;
  giacenze: Array<{
    identificativo: string;
    taglia: string;
    quantita: number;
    data_iniziale: string;
    mg_vongola: number;
  }>;
}

/**
 * Genera un JSON con le giacenze nel formato specificato per l'importazione esterna
 * @param storage - Istanza dello storage per accedere ai dati
 * @param options - Opzioni di esportazione
 * @returns Promise con il JSON formattato per l'esportazione
 */
export async function generateExportGiacenze(
  storage: IStorage,
  options: {
    fornitore?: string;
    dataEsportazione?: Date;
  } = {}
): Promise<ExportFormatoGiacenze> {
  // Utilizzare la data corrente se non specificata
  const dataEsportazione = options.dataEsportazione || new Date();
  const dataFormattata = format(dataEsportazione, 'yyyy-MM-dd');
  
  // Recupera tutti i lotti attivi
  const lotti = await storage.getActiveLots();
  
  // Recupera tutte le taglie disponibili
  const taglie = await storage.getSizes();
  
  // Recupera tutti i cicli attivi
  const cicli = await storage.getActiveCycles();
  
  // Per ogni ciclo attivo, recuperiamo l'ultima operazione per ottenere il peso attuale
  const giacenze = await Promise.all(
    cicli.map(async (ciclo) => {
      // Recupera tutte le operazioni del ciclo
      const operazioni = await storage.getOperationsByCycle(ciclo.id);
      
      // Ordina le operazioni per data (la più recente prima)
      const operazioniOrdinate = operazioni.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // Trova l'ultima operazione che ha dati sul peso (tipo "peso" o "misura")
      const ultimaOperazionePeso = operazioniOrdinate.find(op => 
        (op.type === 'peso' || op.type === 'misura') && op.animalsPerKg
      );
      
      // Se non troviamo un'operazione con dati sul peso, saltiamo questo ciclo
      if (!ultimaOperazionePeso || !ultimaOperazionePeso.animalsPerKg) {
        return null;
      }
      
      // Recupera il lotto associato a questa operazione
      const lotto = ultimaOperazionePeso.lotId 
        ? await storage.getLot(ultimaOperazionePeso.lotId)
        : null;
      
      // Se non troviamo il lotto, saltiamo questo ciclo
      if (!lotto) {
        return null;
      }
      
      // Recupera la taglia associata a questa operazione
      const taglia = ultimaOperazionePeso.sizeId 
        ? await storage.getSize(ultimaOperazionePeso.sizeId)
        : null;
      
      // Calcoliamo il peso medio in milligrammi
      const pesoMedioMg = Math.round(1000000 / ultimaOperazionePeso.animalsPerKg);
      
      // Creiamo un identificativo univoco per il lotto
      const identificativo = `LOTTO-${lotto.id.toString().padStart(3, '0')}`;
      
      // Utilizziamo la data di arrivo del lotto come data iniziale
      const dataIniziale = format(new Date(lotto.arrivalDate), 'yyyy-MM-dd');
      
      return {
        identificativo,
        taglia: taglia ? taglia.code : 'TP-UNKN',
        quantita: ultimaOperazionePeso.animalCount || 0,
        data_iniziale: dataIniziale,
        mg_vongola: pesoMedioMg
      };
    })
  );
  
  // Filtra eventuali cicli senza dati validi
  const giacenzeFiltrate = giacenze.filter(g => g !== null) as Array<ExportFormatoGiacenze['giacenze'][0]>;
  
  // Assembla il risultato finale
  const risultato: ExportFormatoGiacenze = {
    data_importazione: dataFormattata,
    fornitore: options.fornitore || 'Flupsy Manager', // Valore predefinito
    giacenze: giacenzeFiltrate
  };
  
  return risultato;
}