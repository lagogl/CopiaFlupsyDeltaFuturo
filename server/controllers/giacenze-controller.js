/**
 * Controller per il calcolo delle giacenze personalizzate
 * Implementa il calcolo di giacenze esatte tra due date specifiche
 */
import { db } from '../db.js';
import { operations, baskets, flupsys, sizes, cycles } from '../../shared/schema.js';
import { eq, and, gte, lte, sql, isNull, or } from 'drizzle-orm';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Endpoint principale per calcolare le giacenze tra due date
 * GET /api/giacenze/range?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD[&flupsyId=ID]
 */
export async function getGiacenzeRange(req, res) {
  const { dateFrom, dateTo, flupsyId } = req.query;

  // Validazione parametri
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ 
      success: false, 
      error: "Parametri dateFrom e dateTo sono obbligatori. Formato: YYYY-MM-DD" 
    });
  }

  // Validazione formato date
  const startDate = parseISO(dateFrom);
  const endDate = parseISO(dateTo);
  
  if (!isValid(startDate) || !isValid(endDate)) {
    return res.status(400).json({ 
      success: false, 
      error: "Formato date non valido. Utilizzare il formato YYYY-MM-DD" 
    });
  }

  if (startDate > endDate) {
    return res.status(400).json({ 
      success: false, 
      error: "La data di inizio deve essere antecedente o uguale alla data di fine" 
    });
  }

  try {
    console.log(`🏭 CALCOLO GIACENZE: Range ${dateFrom} - ${dateTo}${flupsyId ? ` per FLUPSY ${flupsyId}` : ''}`);
    
    const startTime = Date.now();
    
    // Calcola giacenze per il range specificato
    const giacenzeData = await calculateGiacenzeForRange(startDate, endDate, flupsyId);
    
    const duration = Date.now() - startTime;
    console.log(`✅ GIACENZE CALCOLATE: ${duration}ms - Totale: ${giacenzeData.totale_giacenza} animali`);
    
    res.json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        flupsyId: flupsyId ? parseInt(flupsyId) : null,
        ...giacenzeData,
        calculationTime: `${duration}ms`
      }
    });

  } catch (error) {
    console.error("❌ ERRORE CALCOLO GIACENZE:", error);
    res.status(500).json({ 
      success: false, 
      error: "Errore interno nel calcolo delle giacenze" 
    });
  }
}

/**
 * Calcola le giacenze esatte per un range di date
 * @param {Date} startDate - Data di inizio
 * @param {Date} endDate - Data di fine
 * @param {string|undefined} flupsyId - ID FLUPSY opzionale per filtro
 * @returns {Promise<Object>} Dati delle giacenze calcolati
 */
async function calculateGiacenzeForRange(startDate, endDate, flupsyId) {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  console.log(`📊 Calcolo giacenze dal ${startDateStr} al ${endDateStr}`);
  
  // Query per ottenere tutte le operazioni nel range di date
  // Include solo operazioni che impattano le giacenze
  let whereClause = and(
    gte(operations.date, startDateStr),
    lte(operations.date, endDateStr)
  );
  
  // Aggiungi filtro FLUPSY se specificato
  if (flupsyId) {
    whereClause = and(
      whereClause,
      eq(baskets.flupsyId, parseInt(flupsyId))
    );
  }

  const operationsInRange = await db.select({
    id: operations.id,
    date: operations.date,
    type: operations.type,
    animalCount: operations.animalCount,
    totalWeight: operations.totalWeight,
    basketId: operations.basketId,
    basketNumber: baskets.number,
    flupsyId: baskets.flupsyId,
    flupsyName: flupsys.name,
    sizeId: operations.sizeId,
    sizeCode: sizes.code,
    sizeName: sizes.name,
    animalsPerKg: operations.animalsPerKg
  })
  .from(operations)
  .leftJoin(baskets, eq(operations.basketId, baskets.id))
  .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
  .leftJoin(sizes, eq(operations.sizeId, sizes.id))
  .where(whereClause)
  .orderBy(operations.date);

  console.log(`📋 Operazioni trovate nel range: ${operationsInRange.length}`);

  // Calcola giacenze per tipologia di operazione
  const giacenzeByType = {
    'prima-attivazione': 0,
    'ripopolamento': 0,
    'cessazione': 0,
    'vendita': 0,
    'vagliatura': 0,
    'misura': 0,
    'peso': 0,
    'pulizia': 0
  };

  const giacenzeBySize = new Map();
  const giacenzeByFlupsy = new Map();
  const operationsByDate = new Map();

  // Elabora ogni operazione
  operationsInRange.forEach(op => {
    const animalCount = op.animalCount || 0;
    const dateKey = op.date;
    
    // Raggruppa per tipo operazione
    if (giacenzeByType.hasOwnProperty(op.type)) {
      // Le operazioni che riducono le giacenze
      if (['cessazione', 'vendita'].includes(op.type)) {
        giacenzeByType[op.type] += animalCount;
      } else if (['prima-attivazione', 'ripopolamento'].includes(op.type)) {
        // Le operazioni che aumentano le giacenze
        giacenzeByType[op.type] += animalCount;
      }
      // Altre operazioni (misura, peso, pulizia, vagliatura) non modificano le giacenze
    }

    // Raggruppa per taglia
    if (op.sizeCode && animalCount > 0) {
      const currentSize = giacenzeBySize.get(op.sizeCode) || {
        code: op.sizeCode,
        name: op.sizeName,
        entrate: 0,
        uscite: 0,
        giacenza: 0
      };

      if (['prima-attivazione', 'ripopolamento'].includes(op.type)) {
        currentSize.entrate += animalCount;
      } else if (['cessazione', 'vendita'].includes(op.type)) {
        currentSize.uscite += animalCount;
      }

      currentSize.giacenza = currentSize.entrate - currentSize.uscite;
      giacenzeBySize.set(op.sizeCode, currentSize);
    }

    // Raggruppa per FLUPSY
    if (op.flupsyId && op.flupsyName) {
      const currentFlupsy = giacenzeByFlupsy.get(op.flupsyId) || {
        id: op.flupsyId,
        name: op.flupsyName,
        entrate: 0,
        uscite: 0,
        giacenza: 0
      };

      if (['prima-attivazione', 'ripopolamento'].includes(op.type)) {
        currentFlupsy.entrate += animalCount;
      } else if (['cessazione', 'vendita'].includes(op.type)) {
        currentFlupsy.uscite += animalCount;
      }

      currentFlupsy.giacenza = currentFlupsy.entrate - currentFlupsy.uscite;
      giacenzeByFlupsy.set(op.flupsyId, currentFlupsy);
    }

    // Raggruppa per data
    if (!operationsByDate.has(dateKey)) {
      operationsByDate.set(dateKey, []);
    }
    operationsByDate.get(dateKey).push({
      id: op.id,
      type: op.type,
      animalCount,
      basketNumber: op.basketNumber,
      flupsyName: op.flupsyName,
      sizeCode: op.sizeCode
    });
  });

  // Calcola giacenza totale
  const totaleEntrate = giacenzeByType['prima-attivazione'] + giacenzeByType['ripopolamento'];
  const totaleUscite = giacenzeByType['cessazione'] + giacenzeByType['vendita'];
  const totaleGiacenza = totaleEntrate - totaleUscite;

  // Converti Maps in arrays
  const dettaglioTaglie = Array.from(giacenzeBySize.values())
    .filter(size => size.giacenza > 0)
    .sort((a, b) => b.giacenza - a.giacenza);

  const dettaglioFlupsys = Array.from(giacenzeByFlupsy.values())
    .filter(flupsy => flupsy.giacenza > 0)
    .sort((a, b) => b.giacenza - a.giacenza);

  const operationsGroupedByDate = Object.fromEntries(operationsByDate);

  console.log(`📈 RIEPILOGO GIACENZE:`);
  console.log(`   Entrate totali: ${totaleEntrate.toLocaleString()}`);
  console.log(`   Uscite totali: ${totaleUscite.toLocaleString()}`);
  console.log(`   Giacenza netta: ${totaleGiacenza.toLocaleString()}`);
  console.log(`   Taglie attive: ${dettaglioTaglie.length}`);
  console.log(`   FLUPSY coinvolti: ${dettaglioFlupsys.length}`);

  return {
    totale_giacenza: totaleGiacenza,
    totale_entrate: totaleEntrate,
    totale_uscite: totaleUscite,
    dettaglio_operazioni: {
      'prima-attivazione': giacenzeByType['prima-attivazione'],
      'ripopolamento': giacenzeByType['ripopolamento'],
      'cessazione': giacenzeByType['cessazione'],
      'vendita': giacenzeByType['vendita']
    },
    dettaglio_taglie: dettaglioTaglie,
    dettaglio_flupsys: dettaglioFlupsys,
    operations_by_date: operationsGroupedByDate,
    statistiche: {
      numero_operazioni: operationsInRange.length,
      giorni_analizzati: operationsByDate.size,
      media_giornaliera: operationsByDate.size > 0 ? Math.round(operationsInRange.length / operationsByDate.size) : 0
    }
  };
}

/**
 * Endpoint per ottenere un riepilogo rapido delle giacenze
 * GET /api/giacenze/summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
export async function getGiacenzeSummary(req, res) {
  const { dateFrom, dateTo } = req.query;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ 
      success: false, 
      error: "Parametri dateFrom e dateTo sono obbligatori" 
    });
  }

  try {
    // Query semplificata per il riepilogo
    const startDateStr = format(parseISO(dateFrom), 'yyyy-MM-dd');
    const endDateStr = format(parseISO(dateTo), 'yyyy-MM-dd');

    const summary = await db.execute(sql`
      SELECT 
        COUNT(*) as numero_operazioni,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'ripopolamento') THEN o.animal_count ELSE 0 END) as totale_entrate,
        SUM(CASE WHEN o.type IN ('cessazione', 'vendita') THEN o.animal_count ELSE 0 END) as totale_uscite,
        COUNT(DISTINCT o.basket_id) as cestelli_coinvolti,
        COUNT(DISTINCT b.flupsy_id) as flupsys_coinvolti
      FROM operations o
      LEFT JOIN baskets b ON o.basket_id = b.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
    `);

    const result = summary[0];
    const giacenzaNetta = parseInt(result.totale_entrate) - parseInt(result.totale_uscite);

    res.json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        totale_giacenza: giacenzaNetta,
        totale_entrate: parseInt(result.totale_entrate),
        totale_uscite: parseInt(result.totale_uscite),
        numero_operazioni: parseInt(result.numero_operazioni),
        cestelli_coinvolti: parseInt(result.cestelli_coinvolti),
        flupsys_coinvolti: parseInt(result.flupsys_coinvolti)
      }
    });

  } catch (error) {
    console.error("Errore nel calcolo del riepilogo giacenze:", error);
    res.status(500).json({ 
      success: false, 
      error: "Errore interno nel calcolo del riepilogo" 
    });
  }
}