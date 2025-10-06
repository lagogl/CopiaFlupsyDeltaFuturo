/**
 * Controller per il calcolo delle giacenze personalizzate
 * Implementa il calcolo di giacenze esatte tra due date specifiche
 */
import { Request, Response } from 'express';
import { db } from '../db.js';
import { operations, baskets, flupsys, sizes, cycles } from '../../shared/schema.js';
import { eq, and, gte, lte, sql, isNull, or } from 'drizzle-orm';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Endpoint principale per calcolare le giacenze tra due date
 * GET /api/giacenze/range?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD[&flupsyId=ID]
 */
export async function getGiacenzeRange(req: Request, res: Response) {
  const { dateFrom, dateTo, flupsyId } = req.query;

  // Validazione parametri
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ 
      success: false, 
      error: "Parametri dateFrom e dateTo sono obbligatori. Formato: YYYY-MM-DD" 
    });
  }

  // Validazione formato date
  const startDate = parseISO(dateFrom as string);
  const endDate = parseISO(dateTo as string);
  
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
    const giacenzeData = await calculateGiacenzeForRange(startDate, endDate, flupsyId as string);
    
    const duration = Date.now() - startTime;
    console.log(`✅ GIACENZE CALCOLATE: ${duration}ms - Totale: ${giacenzeData.totale_giacenza} animali`);
    
    res.json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        flupsyId: flupsyId ? parseInt(flupsyId as string) : null,
        ...giacenzeData,
        calculationTime: `${duration}ms`
      }
    });

  } catch (error: any) {
    console.error("❌ ERRORE CALCOLO GIACENZE:", error);
    res.status(500).json({ 
      success: false, 
      error: "Errore interno nel calcolo delle giacenze" 
    });
  }
}

/**
 * Endpoint per riepilogo rapido giacenze
 * GET /api/giacenze/summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
export async function getGiacenzeSummary(req: Request, res: Response) {
  const { dateFrom, dateTo } = req.query;

  // Validazione parametri
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ 
      success: false, 
      error: "Parametri dateFrom e dateTo sono obbligatori. Formato: YYYY-MM-DD" 
    });
  }

  // Validazione formato date
  const startDate = parseISO(dateFrom as string);
  const endDate = parseISO(dateTo as string);
  
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
    console.log(`📊 RIEPILOGO GIACENZE: Range ${dateFrom} - ${dateTo}`);
    
    const startTime = Date.now();
    
    // Query per statistiche aggregate
    const stats = await db.select({
      totale_entrate: sql<number>`COALESCE(SUM(CASE 
        WHEN ${operations.type} IN ('prima-attivazione', 'misura', 'peso', 'pulizia') 
        THEN COALESCE(${operations.animalCount}, 0) 
        ELSE 0 
      END), 0)`,
      totale_uscite: sql<number>`COALESCE(SUM(CASE 
        WHEN ${operations.type} = 'vendita' 
        THEN COALESCE(${operations.animalCount}, 0) 
        ELSE 0 
      END), 0)`,
      numero_operazioni: sql<number>`COUNT(*)`,
      cestelli_coinvolti: sql<number>`COUNT(DISTINCT ${operations.basketId})`,
      flupsys_coinvolti: sql<number>`COUNT(DISTINCT ${baskets.flupsyId})`
    })
    .from(operations)
    .leftJoin(baskets, eq(operations.basketId, baskets.id))
    .where(
      and(
        gte(operations.date, dateFrom as string),
        lte(operations.date, dateTo as string)
      )
    );

    const result = stats[0] || {
      totale_entrate: 0,
      totale_uscite: 0,
      numero_operazioni: 0,
      cestelli_coinvolti: 0,
      flupsys_coinvolti: 0
    };

    // Converti stringhe in numeri (PostgreSQL restituisce SUM come numeric/string)
    const totale_entrate = Number(result.totale_entrate) || 0;
    const totale_uscite = Number(result.totale_uscite) || 0;
    const numero_operazioni = Number(result.numero_operazioni) || 0;
    const cestelli_coinvolti = Number(result.cestelli_coinvolti) || 0;
    const flupsys_coinvolti = Number(result.flupsys_coinvolti) || 0;
    
    const totale_giacenza = totale_entrate - totale_uscite;
    
    const duration = Date.now() - startTime;
    console.log(`✅ RIEPILOGO COMPLETATO: ${duration}ms - Giacenza: ${totale_giacenza} animali`);
    
    res.json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        totale_giacenza,
        totale_entrate,
        totale_uscite,
        numero_operazioni,
        cestelli_coinvolti,
        flupsys_coinvolti
      }
    });

  } catch (error: any) {
    console.error("❌ ERRORE RIEPILOGO GIACENZE:", error);
    res.status(500).json({ 
      success: false, 
      error: "Errore interno nel calcolo del riepilogo" 
    });
  }
}

/**
 * Calcola le giacenze esatte per un range di date
 */
async function calculateGiacenzeForRange(startDate: Date, endDate: Date, flupsyId?: string) {
  const dateFromStr = format(startDate, 'yyyy-MM-dd');
  const dateToStr = format(endDate, 'yyyy-MM-dd');

  // Costruisci condizioni per la query
  let whereConditions = and(
    gte(operations.date, dateFromStr),
    lte(operations.date, dateToStr)
  );

  // Se è specificato un FLUPSY, filtra anche per quello
  if (flupsyId) {
    whereConditions = and(
      whereConditions,
      eq(baskets.flupsyId, parseInt(flupsyId))
    );
  }

  // Query principale con tutte le operazioni del periodo
  const operationsData = await db.select({
    id: operations.id,
    date: operations.date,
    type: operations.type,
    animalCount: operations.animalCount,
    basketId: operations.basketId,
    basketNumber: baskets.physicalNumber,
    sizeCode: sizes.code,
    flupsyId: baskets.flupsyId,
    flupsyName: flupsys.name,
  })
  .from(operations)
  .leftJoin(baskets, eq(operations.basketId, baskets.id))
  .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
  .leftJoin(sizes, eq(operations.sizeId, sizes.id))
  .where(whereConditions)
  .orderBy(operations.date);

  // Calcola totali e dettagli
  let totale_entrate = 0;
  let totale_uscite = 0;
  const dettaglio_operazioni = {
    'prima-attivazione': 0,
    'ripopolamento': 0,
    'cessazione': 0,
    'vendita': 0,
  };

  // Mappa per dettagli per taglia
  const taglieMap = new Map<string, { entrate: number; uscite: number }>();
  
  // Mappa per dettagli per FLUPSY
  const flupsysMap = new Map<number, { name: string; entrate: number; uscite: number }>();

  // Mappa per operazioni per data
  const operationsByDate: Record<string, Array<any>> = {};

  // Processa ogni operazione
  for (const op of operationsData) {
    const animalCount = op.animalCount || 0;
    
    // Classifica entrate e uscite
    const isEntrata = ['prima-attivazione', 'ripopolamento'].includes(op.type);
    const isUscita = ['vendita', 'cessazione'].includes(op.type);

    if (isEntrata) {
      totale_entrate += animalCount;
      if (op.type in dettaglio_operazioni) {
        dettaglio_operazioni[op.type as keyof typeof dettaglio_operazioni] += animalCount;
      }
    } else if (isUscita) {
      totale_uscite += animalCount;
      if (op.type in dettaglio_operazioni) {
        dettaglio_operazioni[op.type as keyof typeof dettaglio_operazioni] += animalCount;
      }
    }

    // Aggrega per taglia
    if (op.sizeCode) {
      if (!taglieMap.has(op.sizeCode)) {
        taglieMap.set(op.sizeCode, { entrate: 0, uscite: 0 });
      }
      const taglia = taglieMap.get(op.sizeCode)!;
      if (isEntrata) taglia.entrate += animalCount;
      if (isUscita) taglia.uscite += animalCount;
    }

    // Aggrega per FLUPSY
    if (op.flupsyId && op.flupsyName) {
      if (!flupsysMap.has(op.flupsyId)) {
        flupsysMap.set(op.flupsyId, { name: op.flupsyName, entrate: 0, uscite: 0 });
      }
      const flupsy = flupsysMap.get(op.flupsyId)!;
      if (isEntrata) flupsy.entrate += animalCount;
      if (isUscita) flupsy.uscite += animalCount;
    }

    // Aggrega per data
    const dateKey = op.date;
    if (!operationsByDate[dateKey]) {
      operationsByDate[dateKey] = [];
    }
    operationsByDate[dateKey].push({
      id: op.id,
      type: op.type,
      animalCount: animalCount,
      basketNumber: op.basketNumber,
      flupsyName: op.flupsyName || 'N/A',
      sizeCode: op.sizeCode || 'N/A'
    });
  }

  // Costruisci array dettaglio taglie
  const dettaglio_taglie = Array.from(taglieMap.entries()).map(([code, data]) => ({
    code,
    name: code, // Il nome coincide con il codice
    entrate: data.entrate,
    uscite: data.uscite,
    giacenza: data.entrate - data.uscite
  }));

  // Costruisci array dettaglio FLUPSY
  const dettaglio_flupsys = Array.from(flupsysMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    entrate: data.entrate,
    uscite: data.uscite,
    giacenza: data.entrate - data.uscite
  }));

  // Calcola statistiche
  const totale_giacenza = totale_entrate - totale_uscite;
  const numeroOperazioni = operationsData.length;
  const giorniAnalizzati = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const mediaGiornaliera = giorniAnalizzati > 0 ? Math.round(numeroOperazioni / giorniAnalizzati) : 0;

  return {
    totale_giacenza,
    totale_entrate,
    totale_uscite,
    dettaglio_operazioni,
    dettaglio_taglie,
    dettaglio_flupsys,
    operations_by_date: operationsByDate,
    statistiche: {
      numero_operazioni: numeroOperazioni,
      giorni_analizzati: giorniAnalizzati,
      media_giornaliera: mediaGiornaliera,
    }
  };
}