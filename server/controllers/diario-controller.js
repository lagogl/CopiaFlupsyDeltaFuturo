/**
 * Controller per le funzionalità del Diario di Bordo
 * Fornisce API ottimizzate per il caricamento dei dati mensili
 */

import { db } from "../db.js";
import { operations, baskets, flupsys, lots, measurements, sizes, cycles } from "../../shared/schema.js";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

/**
 * Recupera tutti i dati per un intero mese in una singola chiamata
 * @param {Object} req - La richiesta HTTP
 * @param {Object} res - La risposta HTTP
 */
export async function getMonthData(req, res) {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato mese non valido. Utilizzare il formato YYYY-MM" });
  }

  try {
    // Ottieni il range di date per il mese specificato
    const startDate = startOfMonth(new Date(`${month}-01`));
    const endDate = endOfMonth(new Date(`${month}-01`));
    
    // Crea un array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    // Inizializza l'oggetto di risposta con tutti i giorni del mese
    const monthData = {};
    
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

    // Ottieni tutte le operazioni del mese in un'unica query
    const monthOperations = await db.select({
      id: operations.id,
      date: operations.date,
      type: operations.type,
      basket_id: operations.basketId,
      created_at: operations.createdAt,
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

    // Organizza le operazioni per data
    monthOperations.forEach(op => {
      const dateKey = format(new Date(op.date), "yyyy-MM-dd");
      if (monthData[dateKey]) {
        monthData[dateKey].operations.push(op);
        monthData[dateKey].totals.numero_operazioni = monthData[dateKey].operations.length;
      }
    });

    // Recupera i dati di giacenza per ogni giorno
    // Nota: Questa è una serie di operazioni costose che potrebbero richiedere ottimizzazione
    // In una versione futura, si potrebbe considerare di calcolare la giacenza giornaliera 
    // in modo incrementale basandosi sulle operazioni

    for (const dateKey of Object.keys(monthData)) {
      try {
        // Recupera la giacenza per questa data
        // Questa è l'operazione più costosa, si può ottimizzare ulteriormente
        const cyclesForDate = await getCyclesActiveAtDate(dateKey);
        const giacenzaData = await calculateGiacenzaForDate(dateKey, cyclesForDate);
        
        monthData[dateKey].giacenza = giacenzaData.totale_giacenza || 0;
        monthData[dateKey].dettaglio_taglie = giacenzaData.dettaglio_taglie || [];
        
        // Calcola i totali giornalieri e le statistiche per taglia
        monthData[dateKey].totals = await calculateDailyTotals(dateKey);
        monthData[dateKey].taglie = await calculateSizeStats(dateKey);
      } catch (error) {
        console.error(`Errore nell'elaborazione dei dati per ${dateKey}:`, error);
      }
    }

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
async function getCyclesActiveAtDate(date) {
  // Implementazione semplificata, da completare con la logica effettiva
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
async function calculateGiacenzaForDate(date, activeCycles) {
  // Implementazione semplificata, da completare con la logica effettiva
  // Questa è solo una struttura di base, il calcolo reale sarà più complesso
  
  try {
    // Ottieni tutti i cestelli attivi per i cicli attivi
    const cyclesToCheck = activeCycles.map(cycle => cycle.id);
    
    if (cyclesToCheck.length === 0) {
      return { totale_giacenza: 0, dettaglio_taglie: [] };
    }
    
    // Query per ottenere i dettagli della giacenza dalla tabella appropriata
    // Questa è una simulazione, la query reale dipenderà dalla struttura del database
    const taglieResults = await db.execute(
      sql`SELECT s.code as taglia, SUM(m.animal_count) as quantita
          FROM operations o
          JOIN baskets b ON o.basket_id = b.id
          JOIN measurements m ON m.operation_id = o.id
          JOIN sizes s ON o.size_id = s.id
          WHERE o.date <= ${date}
          AND o.type != 'cessazione'
          GROUP BY s.code`
    );
    
    // Elabora i risultati
    let totaleGiacenza = 0;
    const dettaglioTaglie = [];
    
    taglieResults.forEach(row => {
      const quantita = parseInt(row.quantita, 10) || 0;
      totaleGiacenza += quantita;
      
      if (row.taglia && row.taglia !== 'Non specificata') {
        dettaglioTaglie.push({
          taglia: row.taglia,
          quantita: quantita
        });
      }
    });
    
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
async function calculateDailyTotals(date) {
  try {
    // Ottieni le operazioni del giorno
    const dayOperations = await db.select()
      .from(operations)
      .where(eq(operations.date, date));
    
    // Calcola i totali
    let totaleEntrate = 0;
    let totaleUscite = 0;
    
    dayOperations.forEach(op => {
      // Logica per calcolare entrate e uscite in base al tipo di operazione
      if (op.type === 'prima-attivazione' && op.animalCount) {
        totaleEntrate += op.animalCount;
      } else if (op.type === 'cessazione' && op.animalCount) {
        totaleUscite += op.animalCount;
      }
      // Aggiungi altri tipi di operazioni se necessario
    });
    
    return {
      totale_entrate: totaleEntrate.toString(),
      totale_uscite: totaleUscite.toString(),
      bilancio_netto: (totaleEntrate - totaleUscite).toString(),
      numero_operazioni: dayOperations.length.toString()
    };
  } catch (error) {
    console.error(`Errore nel calcolo dei totali giornalieri per ${date}:`, error);
    return {
      totale_entrate: null,
      totale_uscite: null,
      bilancio_netto: null,
      numero_operazioni: '0'
    };
  }
}

/**
 * Calcola le statistiche per taglia per una data specifica
 * @param {string} date - La data in formato YYYY-MM-DD
 * @returns {Promise<Array>} - Array con le statistiche per taglia
 */
async function calculateSizeStats(date) {
  try {
    // Ottieni le operazioni del giorno raggruppate per taglia
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
      taglia: row.taglia,
      entrate: row.entrate.toString(),
      uscite: row.uscite.toString(),
      bilancio: (parseInt(row.entrate, 10) - parseInt(row.uscite, 10)).toString()
    }));
  } catch (error) {
    console.error(`Errore nel calcolo delle statistiche per taglia per ${date}:`, error);
    return [];
  }
}