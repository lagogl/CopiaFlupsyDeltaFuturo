/**
 * Modulo per gestione report di vendita
 * Fornisce statistiche e analisi sulle vendite
 */
import { Router, Request, Response } from "express";
import { sendError, sendSuccess } from "../../../utils/error-handler";
import { db } from "../../../db";
import { 
  eq, and, sql, desc, gte, lte, inArray 
} from "drizzle-orm";
import { 
  operations, baskets, flupsys, cycles, lots 
} from "../../../../shared/schema";

export const salesReportsRoutes = Router();

/**
 * Report vendite per periodo
 * Restituisce statistiche complete sulle vendite nel periodo specificato
 */
salesReportsRoutes.get('/sales', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    
    if (!from || !to) {
      return res.status(400).json({ 
        success: false,
        message: "Date range required (from, to)" 
      });
    }
    
    console.log(`📊 Generazione report vendite dal ${from} al ${to}`);
    
    // Query per ottenere tutte le operazioni di vendita nel periodo
    const salesOperations = await db.select({
      id: operations.id,
      date: operations.date,
      type: operations.type,
      basketId: operations.basketId,
      cycleId: operations.cycleId,
      animalCount: operations.animalCount,
      totalWeight: operations.totalWeight,
      animalsPerKg: operations.animalsPerKg,
      notes: operations.notes,
      basketPhysicalNumber: baskets.physicalNumber,
      flupsyName: flupsys.name,
      lotSupplier: lots.supplier
    })
    .from(operations)
    .leftJoin(baskets, eq(operations.basketId, baskets.id))
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
    .leftJoin(cycles, eq(operations.cycleId, cycles.id))
    .leftJoin(lots, eq(operations.lotId, lots.id))
    .where(
      and(
        inArray(operations.type, ['vendita', 'selezione-per-vendita', 'cessazione']),
        gte(operations.date, from),
        lte(operations.date, to)
      )
    )
    .orderBy(desc(operations.date));
    
    // Calcola statistiche
    const totalSales = salesOperations.length;
    const totalAnimals = salesOperations.reduce((sum, op) => sum + (op.animalCount || 0), 0);
    const totalWeight = salesOperations.reduce((sum, op) => sum + (op.totalWeight || 0), 0);
    const averagePrice = totalWeight > 0 ? totalAnimals / totalWeight : 0;
    
    const salesStats = {
      totalSales,
      totalAnimals,
      totalWeight,
      averagePrice,
      operations: salesOperations
    };
    
    console.log(`✅ Report vendite generato: ${totalSales} operazioni trovate`);
    
    res.json(salesStats);
  } catch (error) {
    console.error("Error fetching sales reports:", error);
    return sendError(res, error, "Failed to fetch sales reports");
  }
});

/**
 * Report sommario vendite
 * Fornisce un riepilogo aggregato delle vendite
 */
salesReportsRoutes.get('/sales/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: "Periodo richiesto (startDate, endDate)" 
      });
    }
    
    console.log(`📈 Generazione sommario vendite dal ${startDate} al ${endDate}`);
    
    // Query aggregata per il sommario
    const summary = await db
      .select({
        totalOperations: sql<number>`COUNT(*)`,
        totalAnimals: sql<number>`COALESCE(SUM(${operations.animalCount}), 0)`,
        totalWeight: sql<number>`COALESCE(SUM(${operations.totalWeight}), 0)`,
        avgAnimalsPerOperation: sql<number>`COALESCE(AVG(${operations.animalCount}), 0)`,
        avgWeightPerOperation: sql<number>`COALESCE(AVG(${operations.totalWeight}), 0)`
      })
      .from(operations)
      .where(
        and(
          inArray(operations.type, ['vendita', 'selezione-per-vendita']),
          gte(operations.date, startDate as string),
          lte(operations.date, endDate as string)
        )
      );
    
    const result = summary[0] || {
      totalOperations: 0,
      totalAnimals: 0,
      totalWeight: 0,
      avgAnimalsPerOperation: 0,
      avgWeightPerOperation: 0
    };
    
    console.log(`✅ Sommario vendite generato: ${result.totalOperations} operazioni`);
    
    return sendSuccess(res, result, "Sommario vendite generato con successo");
    
  } catch (error) {
    console.error("Error fetching sales summary:", error);
    return sendError(res, error, "Failed to fetch sales summary");
  }
});

/**
 * Report vendite per prodotto/taglia
 * Analisi vendite raggruppate per dimensione prodotto
 */
salesReportsRoutes.get('/sales/by-product', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log(`📦 Generazione report vendite per prodotto`);
    
    // Implementazione report per prodotto
    // TODO: Aggiungere logica di raggruppamento per taglia/size
    
    return sendSuccess(res, {
      message: "Report per prodotto in sviluppo",
      startDate,
      endDate
    }, "Report per prodotto");
    
  } catch (error) {
    console.error("Error fetching sales by product:", error);
    return sendError(res, error, "Failed to fetch sales by product");
  }
});

/**
 * Report vendite per cliente
 * Analisi vendite raggruppate per cliente
 */
salesReportsRoutes.get('/sales/by-customer', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log(`👥 Generazione report vendite per cliente`);
    
    // Implementazione report per cliente
    // TODO: Aggiungere logica quando sarà disponibile tabella clienti
    
    return sendSuccess(res, {
      message: "Report per cliente in sviluppo",
      startDate,
      endDate
    }, "Report per cliente");
    
  } catch (error) {
    console.error("Error fetching sales by customer:", error);
    return sendError(res, error, "Failed to fetch sales by customer");
  }
});

/**
 * Report vendite mensili
 * Trend mensile delle vendite per l'anno specificato
 */
salesReportsRoutes.get('/sales/monthly', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({ 
        success: false,
        message: "Anno richiesto (year)" 
      });
    }
    
    console.log(`📅 Generazione report vendite mensili per l'anno ${year}`);
    
    // Query per trend mensile
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${operations.date}, 'YYYY-MM')`,
        totalOperations: sql<number>`COUNT(*)`,
        totalAnimals: sql<number>`COALESCE(SUM(${operations.animalCount}), 0)`,
        totalWeight: sql<number>`COALESCE(SUM(${operations.totalWeight}), 0)`
      })
      .from(operations)
      .where(
        and(
          inArray(operations.type, ['vendita', 'selezione-per-vendita']),
          sql`EXTRACT(YEAR FROM ${operations.date}) = ${year}`
        )
      )
      .groupBy(sql`TO_CHAR(${operations.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${operations.date}, 'YYYY-MM')`);
    
    console.log(`✅ Report mensile generato: ${monthlyData.length} mesi con vendite`);
    
    return sendSuccess(res, {
      year,
      monthlyData
    }, "Report vendite mensili generato con successo");
    
  } catch (error) {
    console.error("Error fetching monthly sales:", error);
    return sendError(res, error, "Failed to fetch monthly sales");
  }
});