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
    console.log(`API Diario Month Data - Mese richiesto: ${month}`);
    
    // Ottieni il range di date per il mese specificato
    const startDate = startOfMonth(new Date(`${month}-01`));
    const endDate = endOfMonth(new Date(`${month}-01`));
    
    // Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    // Inizializza l'oggetto di risposta con tutti i giorni del mese
    const monthData: Record<string, any> = {};
    
    // Inizializza ogni giorno con dati vuoti
    daysInMonth.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      monthData[dateKey] = {
        operations: [],
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        giacenza: 0,
        taglie: [],
        dettaglio_taglie: []
      };
    });

    console.log(`Recupero operazioni per il mese ${month}...`);
    
    // Ottieni tutte le operazioni del mese in un'unica query
    const monthOperations = await db.select({
      id: operations.id,
      date: operations.date,
      type: operations.type,
      basket_id: operations.basketId,
      animal_count: operations.animalCount,
      basket_number: baskets.number,
      flupsy_name: flupsys.name,
      size_code: sizes.code,
      animals_per_kg: operations.animalsPerKg
    })
    .from(operations)
    .leftJoin(baskets, eq(operations.basketId, baskets.id))
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
    .leftJoin(sizes, eq(operations.sizeId, sizes.id))
    .where(
      and(
        gte(operations.date, format(startDate, "yyyy-MM-dd")),
        lte(operations.date, format(endDate, "yyyy-MM-dd"))
      )
    );

    console.log(`Trovate ${monthOperations.length} operazioni per il mese ${month}`);
    
    // Organizza le operazioni per data
    monthOperations.forEach(op => {
      if (op.date) {
        const dateKey = format(new Date(op.date), "yyyy-MM-dd");
        if (monthData[dateKey]) {
          monthData[dateKey].operations.push(op);
          // Aggiorniamo il conteggio delle operazioni
          monthData[dateKey].totals.numero_operazioni = monthData[dateKey].operations.length;
        }
      }
    });

    // Recupera i dati di giacenza e totali per ogni giorno in un unico passaggio
    console.log("Recupero giacenze e totali giornalieri...");
    
    // Array di tutte le date da elaborare
    const dates = Object.keys(monthData).sort();
    
    // Funzione per eseguire calcoli batch per 3 giorni alla volta
    // per ridurre il carico e migliorare le prestazioni
    const batchSize = 3;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      console.log(`Elaborazione batch di date: ${batchDates.join(', ')}`);
      
      // Elabora le date in parallelo all'interno di ogni batch
      await Promise.all(batchDates.map(async (dateKey) => {
        try {
          // Giacenza
          const cyclesForDate = await getCyclesActiveAtDate(dateKey);
          const giacenzaData = await calculateGiacenzaForDate(dateKey, cyclesForDate);
          
          monthData[dateKey].giacenza = giacenzaData.totale_giacenza || 0;
          monthData[dateKey].dettaglio_taglie = giacenzaData.dettaglio_taglie || [];
          
          // Totali giornalieri
          const dayTotals = await calculateDailyTotals(dateKey);
          monthData[dateKey].totals = dayTotals;
          
          // Statistiche per taglia
          const sizeStats = await calculateSizeStats(dateKey);
          monthData[dateKey].taglie = sizeStats;
          
          console.log(`Completata elaborazione per ${dateKey}`);
        } catch (error) {
          console.error(`Errore nell'elaborazione dei dati per ${dateKey}:`, error);
        }
      }));
    }

    console.log("Elaborazione completata, invio risposta");
    res.json(monthData);
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