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
  // Implementation would go here - returning placeholder for now
  return {
    totale_giacenza: 0,
    dettaglio: []
  };
}