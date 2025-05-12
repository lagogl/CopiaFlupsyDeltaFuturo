/**
 * Controller per le funzionalità del Diario di Bordo
 * Fornisce API ottimizzate per il caricamento dei dati mensili
 */

import { Request, Response } from "express";
import { db } from "../db";
import { operations, baskets, flupsys, lots, sizes, cycles } from "../../shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

/**
 * Versione riutilizzabile della funzione getMonthData che può essere chiamata 
 * internamente da altri metodi (come generazione CSV)
 * @param {any} db - Connessione al database
 * @param {string} month - Mese in formato YYYY-MM
 * @returns {Promise<Record<string, any>>} - Dati mensili
 */
export async function getMonthDataForExport(db: any, month: string): Promise<Record<string, any>> {
  try {
    // Ottieni il range di date per il mese specificato
    const startDate = startOfMonth(new Date(`${month}-01`));
    const endDate = endOfMonth(new Date(`${month}-01`));
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    console.log(`Range di date: ${startDateStr} - ${endDateStr}`);
    
    // Determina le taglie attive nel mese
    console.log("Determinazione delle taglie attive nel mese...");
    const taglieResult = await db.execute(sql`
      SELECT DISTINCT s.code 
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
      ORDER BY s.code
    `);
    
    const taglieAttiveList = taglieResult.map((row: any) => row.code);
    console.log(`Taglie attive trovate: ${taglieAttiveList.length}`);
    console.log(`Taglie attive: ${taglieAttiveList.join(', ')}`);
    
    // Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // Inizializza l'oggetto di risposta con tutti i giorni del mese
    const monthData: Record<string, any> = {};
    
    // Prepariamo un array di oggetti con le taglie attive e quantità 0 per inizializzare i giorni
    const taglieVuote = taglieAttiveList.map((code: string) => ({
      taglia: code,
      quantita: 0
    }));
    
    // Inizializza ogni giorno con dati vuoti, ma con le taglie attive pre-popolate
    daysInMonth.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      monthData[dateKey] = {
        operations: [],
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        giacenza: 0,
        taglie: [],
        // Inizializziamo con tutte le taglie attive e valore 0
        dettaglio_taglie: [...taglieVuote]
      };
    });
    
    // Step 2: Recupera tutte le operazioni del mese in una sola query
    console.log(`Recupero operazioni per il mese ${month}...`);
    const allOperationsResult = await db.execute(sql`
      SELECT 
        o.id, o.date, o.type, o.basket_id, o.animal_count,
        b.physical_number as basket_physical_number,
        f.name as flupsy_name,
        s.code as size_code
      FROM operations o
      LEFT JOIN baskets b ON o.basket_id = b.id
      LEFT JOIN flupsys f ON b.flupsy_id = f.id
      LEFT JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
    `);
    
    console.log(`Operazioni recuperate: ${allOperationsResult.length}`);
    
    // Organizza le operazioni per data
    const operationsByDate: Record<string, any[]> = {};
    allOperationsResult.forEach((op: any) => {
      if (!op.date) return;
      
      const dateStr = typeof op.date === 'string' 
        ? op.date 
        : format(new Date(op.date), "yyyy-MM-dd");
        
      if (!operationsByDate[dateStr]) {
        operationsByDate[dateStr] = [];
      }
      operationsByDate[dateStr].push(op);
    });
    
    // Step 3: Recupera le giacenze per ogni taglia attiva e per ogni giorno
    console.log("Recupero giacenze giornaliere per le taglie attive...");
    
    // Esegui due query: 
    // 1. Una per ottenere le giacenze cumulative giornaliere per il totale
    // 2. Una per ottenere solo le operazioni giornaliere per taglia

    // Query 1: Giacenze cumulative totali per la colonna "Totale"
    const giacenzeTotaliResult = await db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(${startDateStr}::date, ${endDateStr}::date, '1 day'::interval) AS day
      ),
      entrate_cumulative AS (
        SELECT 
          d::date as giorno,
          SUM(CASE WHEN o.date <= d AND o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) as entrate
        FROM generate_series(${startDateStr}::date, ${endDateStr}::date, '1 day'::interval) d
        LEFT JOIN operations o ON o.date <= d
        GROUP BY d
      ),
      uscite_cumulative AS (
        SELECT 
          d::date as giorno,
          SUM(CASE WHEN o.date <= d AND o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as uscite
        FROM generate_series(${startDateStr}::date, ${endDateStr}::date, '1 day'::interval) d
        LEFT JOIN operations o ON o.date <= d
        GROUP BY d
      )
      SELECT 
        ec.giorno::text as date,
        GREATEST(0, (COALESCE(ec.entrate, 0) - COALESCE(uc.uscite, 0))) as totale_giacenza
      FROM entrate_cumulative ec
      JOIN uscite_cumulative uc ON ec.giorno = uc.giorno
      ORDER BY ec.giorno
    `);

    // Query 2: Operazioni giornaliere per taglia (non cumulative)
    const operazioniGiornaliereResult = await db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(${startDateStr}::date, ${endDateStr}::date, '1 day'::interval) AS day
      )
      SELECT 
        d.day::text as date,
        s.code as taglia,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) as entrate,
        SUM(CASE WHEN o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as uscite,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count 
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0 END) as bilancio
      FROM date_range d
      CROSS JOIN sizes s
      LEFT JOIN operations o ON o.date = d.day AND o.size_id = s.id
      WHERE s.code IS NOT NULL
      ${taglieAttiveList.length > 0 ? sql`AND s.code IN ${taglieAttiveList}` : sql``}
      GROUP BY d.day, s.code
      ORDER BY d.day, s.code
    `);
    
    console.log(`Dati giacenze totali recuperati: ${(giacenzeTotaliResult as any[]).length} righe`);
    console.log(`Dati operazioni giornaliere recuperati: ${(operazioniGiornaliereResult as any[]).length} righe`);
    
    // Questo era usato in precedenza, impostiamo un valore per retrocompatibilità
    const giacenzeResult = operazioniGiornaliereResult;
    
    // Organizza le giacenze totali per data
    const giacenzeTotaliByDate: Record<string, number> = {};
    for (const row of giacenzeTotaliResult as any[]) {
      giacenzeTotaliByDate[row.date] = parseInt(row.totale_giacenza || '0', 10);
    }
    
    // Organizza le operazioni giornaliere per data e taglia
    const operazioniByDate: Record<string, any[]> = {};
    for (const row of operazioniGiornaliereResult as any[]) {
      if (!operazioniByDate[row.date]) {
        operazioniByDate[row.date] = [];
      }
      // Includiamo solo le righe che hanno entrate o uscite > 0
      const entrate = parseInt(row.entrate || '0', 10);
      const uscite = parseInt(row.uscite || '0', 10);
      const bilancio = parseInt(row.bilancio || '0', 10);
      
      operazioniByDate[row.date].push({
        taglia: row.taglia,
        entrate: entrate,
        uscite: uscite,
        bilancio: bilancio
      });
    }
    
    // Per retrocompatibilità con il resto del codice, mantenere anche la variabile giacenzeByDate
    const giacenzeByDate = operazioniByDate;
    
    // Step 4: Calcola i totali per ogni giorno
    for (const day of daysInMonth) {
      const dateStr = format(day, "yyyy-MM-dd");
      
      // Aggiungi le operazioni del giorno, se presenti
      if (operationsByDate[dateStr]) {
        monthData[dateStr].operations = operationsByDate[dateStr];
        
        // Conta le operazioni
        const numOperazioni = operationsByDate[dateStr].length;
        monthData[dateStr].totals.numero_operazioni = numOperazioni;
        
        // Calcola entrate e uscite
        let totaleEntrate = 0;
        let totaleUscite = 0;
        
        operationsByDate[dateStr].forEach((op: any) => {
          if (['prima-attivazione', 'prima-attivazione-da-vagliatura'].includes(op.type) && op.animal_count) {
            totaleEntrate += parseInt(op.animal_count);
          } else if (['cessazione', 'vendita'].includes(op.type) && op.animal_count) {
            totaleUscite += parseInt(op.animal_count);
          }
        });
        
        monthData[dateStr].totals.totale_entrate = totaleEntrate;
        monthData[dateStr].totals.totale_uscite = totaleUscite;
        monthData[dateStr].totals.bilancio_netto = totaleEntrate - totaleUscite;
      }
      
      // Aggiungi la giacenza totale dal totale cumulativo
      monthData[dateStr].giacenza = giacenzeTotaliByDate[dateStr] || 0;
      
      // Aggiungi le operazioni giornaliere per taglia (non cumulative)
      if (operazioniByDate[dateStr]) {
        // Crea un array delle operazioni giornaliere - mostra solo il bilancio del giorno
        const operazioniDiQuestoGiorno = operazioniByDate[dateStr]
          .filter((op: any) => op.bilancio !== 0) // Mostra solo le taglie con operazioni
          .map((op: any) => ({
            taglia: op.taglia,
            quantita: op.bilancio // Bilancio giornaliero (entrate-uscite del giorno)
          }));
        
        monthData[dateStr].dettaglio_taglie = operazioniDiQuestoGiorno;
      } else {
        monthData[dateStr].dettaglio_taglie = [];
      }
    }
    
    return monthData;
  } catch (error) {
    console.error("Errore nel recupero dei dati mensili:", error);
    throw error;
  }
}

/**
 * Recupera tutti i dati per un intero mese in una singola chiamata
 * @param {Request} req - La richiesta HTTP
 * @param {Response} res - La risposta HTTP
 */
export async function getMonthData(req: Request, res: Response) {
  const { month } = req.query;

  if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato mese non valido. Utilizzare il formato YYYY-MM" });
  }

  try {
    // Utilizziamo la funzione di supporto per ottenere i dati del mese
    const monthData = await getMonthDataForExport(db, month);
    
    // Invia i dati come risposta
    res.json(monthData);
  } catch (error) {
    console.error("Errore nel recupero dei dati mensili:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati mensili" });
  }
}

/**
 * Genera un file CSV con i dati del calendario mensile
 * @param {Request} req - La richiesta HTTP
 * @param {Response} res - La risposta HTTP
 */
export async function exportCalendarCsv(req: Request, res: Response) {
  try {
    // Ottieni il mese dall'URL
    const month = req.query.month as string || format(new Date(), 'yyyy-MM');
    
    // Valida il formato del mese
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Formato mese non valido. Utilizzare YYYY-MM' });
    }
    
    // Estrai l'anno e il mese dal formato yyyy-MM
    const [year, monthNum] = month.split('-').map(n => parseInt(n));
    
    // Prepara le date di inizio e fine mese
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Determina le taglie che hanno operazioni o hanno giacenze attive nel mese
    console.log('Determinazione delle taglie attive o con giacenze per il calendario CSV...');
    
    // Query per trovare le taglie con operazioni nel mese
    const taglieOperazioniResult = await db.execute(sql`
      SELECT DISTINCT s.code 
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr}::date AND ${endDateStr}::date
      AND o.animal_count > 0
      ORDER BY s.code
    `);
    
    // Query semplificata per trovare tutte le taglie usate nelle operazioni 
    // per evitare problemi con la struttura del database
    const taglieGiacenzeResult = await db.execute(sql`
      SELECT DISTINCT s.code
      FROM sizes s
      JOIN operations o ON o.size_id = s.id
      WHERE o.date <= ${endDateStr}::date
      ORDER BY s.code
    `);
    
    // Combina i risultati delle due query
    const taglieAttiveSet = new Set<string>();
    
    // Aggiungi le taglie con operazioni
    taglieOperazioniResult.forEach((row: any) => {
      taglieAttiveSet.add(row.code);
    });
    
    // Aggiungi le taglie con giacenze
    taglieGiacenzeResult.forEach((row: any) => {
      taglieAttiveSet.add(row.code);
    });
    
    // Converti il Set in un array
    const taglieAttiveList = Array.from(taglieAttiveSet);
    
    console.log(`Taglie attive per il calendario CSV: ${taglieAttiveList.join(', ')}`);
    
    // Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // Recupera i dati mensili utilizzando la funzione di supporto
    const monthData = await getMonthDataForExport(db, month);
    
    // Esegui la query per ottenere le operazioni giornaliere (non cumulative)
    // Verifica anche quali taglie hanno avuto operazioni con valore diverso da zero
    const operazioniGiornaliereResult = await db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(${startDateStr}::date, ${endDateStr}::date, '1 day'::interval) AS day
      )
      SELECT 
        d.day::text as date,
        s.code as taglia,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) as entrate,
        SUM(CASE WHEN o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as uscite,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count 
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0 END) as bilancio
      FROM date_range d
      CROSS JOIN sizes s
      LEFT JOIN operations o ON o.date = d.day AND o.size_id = s.id
      WHERE s.code IS NOT NULL
      ${taglieAttiveList.length > 0 ? sql`AND s.code IN ${taglieAttiveList}` : sql``}
      GROUP BY d.day, s.code
      ORDER BY d.day, s.code
    `);
    
    // Otteniamo le operazioni giornaliere effettive con valore diverso da zero
    // Cast a any[] per lavorare più facilmente con i risultati
    const operazioniArray = operazioniGiornaliereResult as any[];
    
    // Utilizziamo direttamente le taglie attive che abbiamo già determinato
    // (quelle con operazioni o giacenze)
    const taglieFinali = taglieAttiveList.sort();
    
    // Prepariamo una mappa delle operazioni per ottimizzare le ricerche
    const operazioniMap = new Map();
    
    // Popoliamo la mappa con i dati delle operazioni
    operazioniArray.forEach(op => {
      const key = `${op.date}-${op.taglia}`;
      operazioniMap.set(key, op);
    });
    
    console.log(`Taglie con operazioni effettive nel CSV: ${taglieFinali.join(', ')}`);
    
    // Costruisci le intestazioni del CSV
    const headers = ['Data', 'Operazioni', 'Entrate', 'Uscite', 'Bilancio', 'Totale'];
    
    // Aggiungi solo le taglie che hanno operazioni con valori non zero
    if (taglieFinali.length > 0) {
      taglieFinali.forEach(taglia => {
        headers.push(taglia);
      });
    }
    
    console.log("Intestazioni CSV:", headers.join(';'));
    
    // Inizia a costruire il contenuto CSV con punto e virgola come separatore (formato europeo)
    let csvContent = headers.join(';') + '\n';
    
    // Aggiungi i dati per ogni giorno
    daysInMonth.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayData = monthData[dateKey] || { 
        operations: [], 
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        dettaglio_taglie: []
      };
      
      // Formatta la data in formato italiano (gg/mm/yyyy)
      const italianDate = format(day, 'dd/MM/yyyy');
      
      // Prepara la riga base
      const row = [
        italianDate,
        dayData.operations?.length || '0',
        dayData.totals?.totale_entrate || '0',
        dayData.totals?.totale_uscite || '0',
        dayData.totals?.bilancio_netto || '0',
        dayData.giacenza || '0'
      ];
      
      // Recupera le operazioni giornaliere per ogni taglia (non i valori cumulativi)
      if (taglieFinali.length > 0) {
        // Ottieni la data in formato ISO
        const dateKey = format(day, 'yyyy-MM-dd');
        
        // Per ogni taglia nella lista di taglie finali (quelle con operazioni o giacenze)
        taglieFinali.forEach(taglia => {
          // Usa la mappa per trovare le operazioni di questa taglia in questo giorno
          const mapKey = `${dateKey}-${taglia}`;
          const operazioniTaglia = operazioniMap.get(mapKey);
          
          // Se ci sono operazioni e il bilancio è diverso da zero, mostra il bilancio
          // altrimenti mostra 0
          const bilancio = operazioniTaglia && parseInt(operazioniTaglia.bilancio || '0', 10) !== 0 
            ? operazioniTaglia.bilancio 
            : '0';
            
          row.push(String(bilancio));
        });
      }
      
      // Log di debug per vedere cosa viene esportato in ciascuna riga
      console.log(`Riga CSV per ${italianDate}:`, row.join(';'));
      
      // Aggiungi la riga al CSV
      csvContent += row.join(';') + '\n';
    });
    
    // Imposta l'header per il download
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="calendario_${month}.csv"`);
    
    // Aggiungi il BOM (Byte Order Mark) per Excel
    const BOM = '\ufeff';
    csvContent = BOM + csvContent;
    
    // Invia il contenuto CSV
    res.send(csvContent);
  } catch (error) {
    console.error("Errore nel recupero dei dati mensili:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati mensili" });
  }
}

/**
 * Recupera i cicli attivi a una determinata data
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Array>} - Array dei cicli attivi
 */
async function getCyclesActiveAtDate(date: string) {
  return await db.select()
    .from(cycles)
    .where(
      and(
        lte(cycles.startDate, date),
        sql`${cycles.endDate} IS NULL OR ${cycles.endDate} >= ${date}`
      )
    );
}

/**
 * Calcola la giacenza per una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @param {Array} activeCycles - Array dei cicli attivi alla data specificata
 * @returns {Promise<Object>} - Oggetto con la giacenza totale e il dettaglio per taglia
 */
async function calculateGiacenzaForDate(date: string, activeCycles: any[]) {
  try {
    // Ottieni tutti i cestelli attivi per i cicli attivi
    const cyclesToCheck = activeCycles.map(cycle => cycle.id);
    
    if (cyclesToCheck.length === 0) {
      return { totale_giacenza: 0, dettaglio_taglie: [] };
    }
    
    // Query per ottenere i dettagli della giacenza
    const taglieResults = await db.execute(
      sql`SELECT s.code as taglia, SUM(o.animal_count) as quantita
          FROM operations o
          JOIN baskets b ON o.basket_id = b.id
          JOIN sizes s ON o.size_id = s.id
          WHERE o.date <= ${date}
          AND o.type NOT IN ('cessazione', 'vendita')
          GROUP BY s.code`
    );
    
    // Elabora i risultati
    let totaleGiacenza = 0;
    const dettaglioTaglie: { taglia: string, quantita: number }[] = [];
    
    for (const row of taglieResults) {
      if (row.taglia) {
        const quantita = parseInt(row.quantita, 10) || 0;
        totaleGiacenza += quantita;
        
        if (row.taglia && row.taglia !== 'Non specificata') {
          dettaglioTaglie.push({
            taglia: row.taglia,
            quantita: quantita
          });
        }
      }
    }
    
    return {
      totale_giacenza: totaleGiacenza,
      dettaglio_taglie: dettaglioTaglie
    };
  } catch (error) {
    console.error(`Errore nel calcolo della giacenza per ${date}:`, error);
    return { totale_giacenza: 0, dettaglio_taglie: [] };
  }
}

/**
 * Calcola i totali giornalieri per una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Object>} - Oggetto con i totali giornalieri
 */
async function calculateDailyTotals(date: string) {
  try {
    // Query ottimizzata direttamente in SQL
    const [totals] = await db.execute(sql`
      SELECT
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
            THEN o.animal_count ELSE 0 END) AS totale_entrate,
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS totale_uscite,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
            THEN o.animal_count ELSE 0 END) - 
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS bilancio_netto,
        COUNT(DISTINCT o.id) AS numero_operazioni
      FROM operations o
      WHERE o.date::text = ${date}
    `);
    
    return {
      totale_entrate: parseInt(totals?.totale_entrate || '0', 10),
      totale_uscite: parseInt(totals?.totale_uscite || '0', 10),
      bilancio_netto: parseInt(totals?.bilancio_netto || '0', 10),
      numero_operazioni: parseInt(totals?.numero_operazioni || '0', 10)
    };
  } catch (error) {
    console.error(`Errore nel calcolo dei totali giornalieri per ${date}:`, error);
    return {
      totale_entrate: 0,
      totale_uscite: 0,
      bilancio_netto: 0,
      numero_operazioni: 0
    };
  }
}

/**
 * Calcola le statistiche per taglia per una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Array>} - Array con le statistiche per taglia
 */
async function calculateSizeStats(date: string) {
  try {
    // Query ottimizzata per statistiche per taglia
    const sizeResults = await db.execute(
      sql`SELECT s.code as taglia, 
          SUM(CASE WHEN o.type = 'prima-attivazione' THEN o.animal_count ELSE 0 END) as entrate,
          SUM(CASE WHEN o.type = 'cessazione' THEN o.animal_count ELSE 0 END) as uscite
          FROM operations o
          JOIN sizes s ON o.size_id = s.id
          WHERE o.date = ${date}
          GROUP BY s.code`
    );
    
    return sizeResults.map(row => ({
      taglia: row.taglia || '',
      entrate: parseInt(row.entrate || '0', 10),
      uscite: parseInt(row.uscite || '0', 10),
      bilancio: parseInt(row.entrate || '0', 10) - parseInt(row.uscite || '0', 10)
    }));
  } catch (error) {
    console.error(`Errore nel calcolo delle statistiche per taglia per ${date}:`, error);
    return [];
  }
}