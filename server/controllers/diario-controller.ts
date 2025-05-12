import { Request, Response } from "express";
import { db } from "../db";
import { operations, baskets, flupsys, lots, sizes, cycles } from "../../shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

/**
 * Versione riutilizzabile della funzione getMonthData che può essere chiamata 
 * direttamente da altre funzioni
 * 
 * @param {any} db - Connessione al database
 * @param {string} month - Mese in formato YYYY-MM
 * @returns {Promise<Record<string, any>>} - Dati mensili
 */
export async function getMonthDataForExport(db: any, month: string): Promise<Record<string, any>> {
  try {
    // Step 1: Prepara le date di inizio e fine mese
    const startDate = startOfMonth(new Date(`${month}-01`));
    const endDate = endOfMonth(new Date(`${month}-01`));
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    console.log(`Range di date: ${startDateStr} - ${endDateStr}`);
    
    // Step 2: Determina le taglie attive nel mese
    console.log("Determinazione delle taglie attive nel mese...");
    const taglieAttiveResult = await db.execute(sql`
      SELECT DISTINCT s.code
      FROM sizes s
      JOIN operations o ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
      ORDER BY s.code
    `);
    
    const taglieAttiveList = taglieAttiveResult.map((row: any) => row.code);
    console.log(`Taglie attive trovate: ${taglieAttiveList.length}`);
    console.log(`Taglie attive: ${taglieAttiveList.join(', ')}`);
    
    // Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // Crea un oggetto vuoto per i dati del mese, con un'entry per ogni giorno
    const monthData: Record<string, any> = {};
    
    // Inizializza i dati base per ogni giorno
    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      monthData[dateStr] = {
        operations: [],
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        dettaglio_taglie: [],
        giacenza: 0
      };
    });
    
    // Step 3: Recupera tutte le operazioni per il mese
    console.log(`Recupero operazioni per il mese ${month}...`);
    const allOperationsResult = await db.execute(sql`
      SELECT 
        o.id,
        o.date::text,
        o.type,
        o.animal_count,
        o.notes,
        s.code as size_code
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
      ORDER BY o.date, o.id
    `);
    
    console.log(`Operazioni recuperate: ${allOperationsResult.length}`);
    
    // Organizza le operazioni per data
    const operationsByDate: Record<string, any[]> = {};
    
    allOperationsResult.forEach((op: any) => {
      const dateStr = op.date;
      // Converti i valori numerici in interi
      if (op.animal_count) {
        op.animal_count = parseInt(op.animal_count, 10);
      }
      
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
      giacenzeTotaliByDate[row.date] = parseInt(row.totale_giacenza, 10);
    }
    
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
 * Restituisce tutti i dati del mese per il diario
 */
export async function getMonthData(req: Request, res: Response) {
  try {
    // Ottieni il mese dall'URL
    const month = req.query.month as string || format(new Date(), 'yyyy-MM');
    
    // Verifica il formato del mese
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Formato mese non valido. Utilizzare YYYY-MM' });
    }
    
    const monthData = await getMonthDataForExport(db, month);
    
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
    
    console.log('Preparazione dati per esportazione calendario in CSV...');
    
    // FASE 1: Ottieni le taglie che sono attive a fine mese
    // Questa query è identica a quella usata per la giacenza dell'interfaccia web
    const giacenzaResponse = await db.execute(sql`
      WITH giacenze_cumulative AS (
        -- Calcola tutte le entrate cumulative fino alla data specificata
        SELECT
          s.id as size_id,
          s.code as taglia,
          COALESCE(SUM(CASE 
            WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0
          END), 0) as quantita
        FROM sizes s
        LEFT JOIN operations o ON o.size_id = s.id AND o.date <= ${endDateStr}::date
        GROUP BY s.id, s.code
      )
      -- Seleziona solo le taglie con quantità positiva
      SELECT taglia, quantita
      FROM giacenze_cumulative
      WHERE quantita > 0
      ORDER BY taglia
    `);
    
    // Converti il risultato in un array di taglie attive
    const taglieAttiveSet = new Set<string>();
    (giacenzaResponse as any[]).forEach(row => {
      taglieAttiveSet.add(row.taglia);
    });
    
    // FASE 2: Aggiungi le taglie dalle operazioni di questo mese (anche se non hanno giacenza)
    const taglieOperazioniResult = await db.execute(sql`
      SELECT DISTINCT s.code 
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr}::date AND ${endDateStr}::date
      ORDER BY s.code
    `);
    
    // Aggiungi le taglie con operazioni
    taglieOperazioniResult.forEach((row: any) => {
      taglieAttiveSet.add(row.code);
    });
    
    // Converti il Set in un array ordinato
    const taglieAttive = Array.from(taglieAttiveSet).sort();
    
    console.log(`Taglie per esportazione CSV: ${taglieAttive.join(', ')}`);
    
    // FASE 3: Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // FASE 4: Recupera tutti i dati mensili di base
    console.log('Recupero dati mensili di base...');
    const monthData = await getMonthDataForExport(db, month);
    
    // FASE 5: Per ogni giorno, recupera i dati delle operazioni per taglia
    console.log('Recupero operazioni giornaliere per ogni taglia...');
    
    // Questa mappa conterrà le operazioni giornaliere per taglia per ogni giorno
    const operazioniGiornaliereMappa = new Map<string, Map<string, number>>();
    
    // Per ogni giorno del mese, recupera le operazioni per taglia
    for (const day of daysInMonth) {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Recupera le operazioni per taglia per questo giorno
      const operazioniGiorno = await db.execute(sql`
        SELECT
          s.code as taglia,
          SUM(CASE 
            WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0
          END) as bilancio
        FROM operations o
        JOIN sizes s ON o.size_id = s.id
        WHERE o.date = ${dateStr}::date
        GROUP BY s.code
        HAVING SUM(CASE 
                WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
                WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
                ELSE 0
              END) != 0
        ORDER BY s.code
      `);
      
      // Crea una mappa per le operazioni di questo giorno
      const operazioniGiornoMappa = new Map<string, number>();
      
      // Popola la mappa con i risultati della query
      (operazioniGiorno as any[]).forEach(op => {
        operazioniGiornoMappa.set(op.taglia, op.bilancio);
      });
      
      // Aggiungi questa mappa alla mappa principale
      operazioniGiornaliereMappa.set(dateStr, operazioniGiornoMappa);
    }
    
    // FASE 6: Costruisci le intestazioni del CSV
    const headers = ['Data', 'Operazioni', 'Entrate', 'Uscite', 'Bilancio', 'Totale'];
    
    // Aggiungi le taglie alle intestazioni
    taglieAttive.forEach(taglia => {
      headers.push(taglia);
    });
    
    console.log(`Intestazioni CSV: ${headers.join(';')}`);
    
    // FASE 7: Costruisci il contenuto del CSV
    let csvContent = headers.join(';') + '\n';
    
    // Inizializza i totali del mese
    let totale_operazioni = 0;
    let totale_entrate = 0;
    let totale_uscite = 0;
    let totale_bilancio = 0;
    let giacenza_finale = 0;
    
    // Crea un oggetto per i totali delle taglie (invece di una Map)
    const totaliTaglie: Record<string, number> = {};
    
    // Inizializza tutti i totali a 0
    taglieAttive.forEach(taglia => {
      totaliTaglie[taglia] = 0;
    });
    
    // Per ogni giorno, aggiungi una riga al CSV e aggiorna i totali
    for (const day of daysInMonth) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const italianDate = format(day, 'dd/MM/yyyy');
      
      // Recupera i dati di base per questo giorno
      const dayData = monthData[dateStr] || { 
        operations: [], 
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        giacenza: 0,
        dettaglio_taglie: []
      };
      
      // Recupera le operazioni per taglia per questo giorno
      const operazioniGiorno = operazioniGiornaliereMappa.get(dateStr) || new Map<string, number>();
      
      // Aggiorna i totali del mese
      totale_operazioni += dayData.operations?.length || 0;
      totale_entrate += dayData.totals?.totale_entrate || 0;
      totale_uscite += dayData.totals?.totale_uscite || 0;
      totale_bilancio += dayData.totals?.bilancio_netto || 0;
      
      // L'ultimo giorno del mese avrà la giacenza finale
      if (dateStr === endDateStr) {
        giacenza_finale = dayData.giacenza || 0;
      }
      
      // Aggiorna i totali per ogni taglia
      taglieAttive.forEach(taglia => {
        if (operazioniGiorno.has(taglia)) {
          const valore = operazioniGiorno.get(taglia) || 0;
          if (valore !== 0) {
            totaliTaglie[taglia] += valore;
          }
        }
      });
      
      // Costruisci la riga base
      const row = [
        italianDate,
        String(dayData.operations?.length || '0'),
        String(dayData.totals?.totale_entrate || '0'),
        String(dayData.totals?.totale_uscite || '0'),
        String(dayData.totals?.bilancio_netto || '0'),
        String(dayData.giacenza || '0')
      ];
      
      // Aggiungi le operazioni per ogni taglia
      taglieAttive.forEach(taglia => {
        const valore = operazioniGiorno.has(taglia) ? String(operazioniGiorno.get(taglia)) : '0';
        row.push(valore);
      });
      
      // Log di debug
      console.log(`Riga CSV per ${italianDate}: ${row.join(';')}`);
      
      // Aggiungi la riga al CSV
      csvContent += row.join(';') + '\n';
    }
    
    // Aggiungi una riga vuota come separatore
    csvContent += Array(headers.length + 1).join(';') + '\n';
    
    // Crea la riga dei totali
    const totaliRow = [
      'TOTALI MESE',
      String(totale_operazioni),
      String(totale_entrate),
      String(totale_uscite),
      String(totale_bilancio),
      String(giacenza_finale)
    ];
    
    // Aggiungi i totali per le taglie
    taglieAttive.forEach(taglia => {
      totaliRow.push(String(totaliTaglie[taglia]));
    });
    
    // Log di debug per i totali
    console.log("Totali per taglie:", totaliTaglie);
    console.log(`Riga CSV per i totali del mese: ${totaliRow.join(';')}`);
    
    // Aggiungi la riga dei totali al CSV
    csvContent += totaliRow.join(';') + '\n';
    
    // FASE 8: Imposta gli header per il download
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="calendario_${month}.csv"`);
    
    // Aggiungi il BOM (Byte Order Mark) per Excel
    const BOM = '\ufeff';
    csvContent = BOM + csvContent;
    
    // Invia il CSV
    res.send(csvContent);
    
  } catch (error) {
    console.error("Errore nell'esportazione del calendario CSV:", error);
    res.status(500).json({ error: "Errore nell'esportazione del calendario CSV" });
  }
}

/**
 * Recupera i cicli attivi a una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Array>} - Array dei cicli attivi
 */
export async function getActiveCyclesAtDate(date: string) {
  return await db.execute(sql`
    SELECT c.id, c.basket_id, c.start_date, c.end_date
    FROM cycles c
    WHERE c.start_date <= ${date}
    AND (
        ${cycles.endDate} IS NULL OR ${cycles.endDate} >= ${date}
    )
  `);
}

/**
 * Calcola la giacenza totale ad una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @param {Array} activeCycles - Array dei cicli attivi alla data specificata
 * @returns {Promise<Object>} - Oggetto con la giacenza totale e il dettaglio per taglia
 */
export async function calculateGiacenzaAtDate(date: string, activeCycles?: any[]) {
  try {
    // Otteniamo i cicli attivi se non sono stati passati
    if (!activeCycles) {
      activeCycles = await getActiveCyclesAtDate(date);
      if (!activeCycles || activeCycles.length === 0) {
        return { totale_giacenza: 0, dettaglio_taglie: [] };
      }
    }
    
    // Calcola la giacenza totale per la data
    const result = await db.execute(sql`
      WITH operazioni_cumulative AS (
        SELECT o.size_id, s.code as taglia, 
          SUM(CASE 
            WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0 END) as animal_count
        FROM operations o
        JOIN sizes s ON o.size_id = s.id
        WHERE o.date <= ${date}
        GROUP BY o.size_id, s.code
      )
      SELECT SUM(CASE WHEN animal_count > 0 THEN animal_count ELSE 0 END) as totale_giacenza
      FROM operazioni_cumulative
    `);
    
    // Estrai la giacenza totale dal risultato
    const totaleGiacenza = result[0]?.totale_giacenza ? parseInt(result[0].totale_giacenza, 10) : 0;
    
    // Prepara l'array per il dettaglio delle taglie
    const dettaglioTaglie: { taglia: string, quantita: number }[] = [];
    
    // Calcola il dettaglio per taglia
    const dettaglioResult = await db.execute(sql`
      WITH operazioni_cumulative AS (
        SELECT o.size_id, s.code as taglia, 
          SUM(CASE 
            WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
            WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
            ELSE 0 END) as animal_count
        FROM operations o
        JOIN sizes s ON o.size_id = s.id
        WHERE o.date <= ${date}
        GROUP BY o.size_id, s.code
      )
      SELECT taglia, animal_count as quantita
      FROM operazioni_cumulative
      WHERE animal_count > 0
      ORDER BY taglia
    `);
    
    if (dettaglioResult && dettaglioResult.length > 0) {
      for (const row of dettaglioResult as any[]) {
        if (row && row.taglia) {
          dettaglioTaglie.push({
            taglia: row.taglia,
            quantita: parseInt(row.quantita, 10)
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
export async function calculateDailyTotals(date: string) {
  try {
    // Calcola i totali giornalieri per la data
    const result = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) as totale_entrate,
        SUM(CASE WHEN o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as totale_uscite,
        COUNT(*) as numero_operazioni
      FROM operations o
      WHERE o.date::text = ${date}
    `);
    
    const row = result[0];
    return {
      totale_entrate: row?.totale_entrate ? parseInt(row.totale_entrate, 10) : 0,
      totale_uscite: row?.totale_uscite ? parseInt(row.totale_uscite, 10) : 0,
      numero_operazioni: row?.numero_operazioni ? parseInt(row.numero_operazioni, 10) : 0,
      bilancio_netto: (row?.totale_entrate ? parseInt(row.totale_entrate, 10) : 0) - (row?.totale_uscite ? parseInt(row.totale_uscite, 10) : 0)
    };
  } catch (error) {
    console.error(`Errore nel calcolo dei totali giornalieri per ${date}:`, error);
    return {
      totale_entrate: 0,
      totale_uscite: 0,
      numero_operazioni: 0,
      bilancio_netto: 0
    };
  }
}

/**
 * Calcola le statistiche per taglia per una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Array>} - Array con le statistiche per taglia
 */
export async function calculateDailyTaglieStats(date: string) {
  try {
    // Calcola le statistiche per taglia per la data
    return await db.execute(sql`
      SELECT 
        s.code as taglia,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) as entrate,
        SUM(CASE WHEN o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as uscite,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
                 WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
                 ELSE 0 END) as bilancio
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE o.date = ${date}
      GROUP BY s.code
      HAVING SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count
                     WHEN o.type IN ('cessazione', 'vendita') THEN -o.animal_count
                     ELSE 0 END) != 0
      ORDER BY s.code
    `);
  } catch (error) {
    console.error(`Errore nel calcolo delle statistiche per taglia per ${date}:`, error);
    return [];
  }
}

/**
 * Restituisce i dati della giacenza corrente
 */
export async function getGiacenza(req: Request, res: Response) {
  try {
    // Ottieni la data dalla query, se presente, altrimenti usa la data corrente
    const dateParam = req.query.date as string;
    const date = dateParam || format(new Date(), 'yyyy-MM-dd');
    
    // Ottieni i cicli attivi alla data specificata
    const activeCycles = await getActiveCyclesAtDate(date);
    
    // Calcola la giacenza totale
    const giacenza = await calculateGiacenzaAtDate(date, activeCycles);
    
    console.log("API giacenza - Risultati:", giacenza);
    
    // Restituisci il risultato
    return giacenza;
    
  } catch (error) {
    console.error("Errore nel recupero della giacenza:", error);
    throw error;
  }
}

/**
 * Restituisce i dati di un giorno specifico per il diario
 */
export async function getDailyData(req: Request, res: Response) {
  try {
    // Ottieni la data dalla query, se presente, altrimenti usa la data corrente
    const date = req.query.date as string || format(new Date(), 'yyyy-MM-dd');
    
    // Ottieni i cicli attivi alla data specificata
    const activeCycles = await getActiveCyclesAtDate(date);
    
    // Calcola la giacenza totale
    const giacenza = await calculateGiacenzaAtDate(date, activeCycles);
    
    // Calcola i totali giornalieri
    const totals = await calculateDailyTotals(date);
    
    // Ottieni le operazioni per la data specificata
    const operations = await db.execute(sql`
      SELECT o.id, o.date, o.type, o.animal_count, o.notes, s.code as size_code, b.id as basket_id, f.id as flupsy_id, l.id as lot_id
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      LEFT JOIN baskets b ON o.basket_id = b.id
      LEFT JOIN flupsys f ON b.flupsy_id = f.id
      LEFT JOIN lots l ON o.lot_id = l.id
      WHERE o.date::text = ${date}
      ORDER BY o.id
    `);
    
    // Calcola le statistiche per taglia
    const taglieStats = await calculateDailyTaglieStats(date);
    
    // Restituisci i dati completi
    res.json({
      date,
      giacenza,
      totals,
      operations,
      taglieStats
    });
  } catch (error) {
    console.error("Errore nel recupero dei dati giornalieri:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati giornalieri" });
  }
}