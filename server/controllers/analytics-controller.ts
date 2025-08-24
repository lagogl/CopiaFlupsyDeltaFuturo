import { Request, Response } from 'express';
import { db } from '../db.js';
import { 
  lots, operations, cycles, baskets, basketLotComposition, flupsys, sizes
} from '../../shared/schema.js';
import { eq, and, gte, lte, sql, desc, asc, isNull, isNotNull } from 'drizzle-orm';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';

/**
 * Controller per analytics avanzati di lotti, mortalità e giacenze
 */

interface LotAnalytics {
  id: number;
  supplier: string;
  supplierLotNumber: string;
  arrivalDate: string;
  initialCount: number;
  currentCount: number;
  soldCount: number;
  mortalityCount: number;
  mortalityPercentage: number;
  averageWeight: number;
  totalWeight: number;
  status: 'active' | 'sold' | 'completed';
  daysInSystem: number;
  basketsUsed: number;
  lastOperation: string;
}

/**
 * Analytics completi per lotti
 * GET /api/analytics/lots?period=30&supplier=all&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
export async function getLotsAnalytics(req: Request, res: Response) {
  try {
    const { period = '30', supplier = 'all', dateFrom, dateTo } = req.query;
    
    console.log(`📊 ANALYTICS LOTTI: periodo=${period}, fornitore=${supplier}`);
    
    const startTime = Date.now();
    
    // Calcola range date
    let startDate: Date, endDate: Date;
    
    if (dateFrom && dateTo) {
      startDate = parseISO(dateFrom as string);
      endDate = parseISO(dateTo as string);
      
      if (!isValid(startDate) || !isValid(endDate)) {
        return res.status(400).json({
          success: false,
          error: "Formato date non valido. Utilizzare YYYY-MM-DD"
        });
      }
    } else {
      const days = parseInt(period as string);
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }
    
    // Query base per i lotti nel periodo
    let lotsQuery = db
      .select({
        id: lots.id,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        arrivalDate: lots.arrivalDate,
        initialCount: lots.animalCount,
        weight: lots.weight,
        notes: lots.notes,
        totalMortality: lots.totalMortality,
        mortalityNotes: lots.mortalityNotes
      })
      .from(lots)
      .where(
        and(
          gte(lots.arrivalDate, format(startDate, 'yyyy-MM-dd')),
          lte(lots.arrivalDate, format(endDate, 'yyyy-MM-dd'))
        )
      );
    
    // Applica filtro fornitore se specificato
    if (supplier !== 'all') {
      lotsQuery = db
        .select({
          id: lots.id,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          arrivalDate: lots.arrivalDate,
          initialCount: lots.animalCount,
          weight: lots.weight,
          notes: lots.notes,
          totalMortality: lots.totalMortality,
          mortalityNotes: lots.mortalityNotes
        })
        .from(lots)
        .where(
          and(
            gte(lots.arrivalDate, format(startDate, 'yyyy-MM-dd')),
            lte(lots.arrivalDate, format(endDate, 'yyyy-MM-dd')),
            eq(lots.supplier, supplier as string)
          )
        );
    }
    
    const lotsData = await lotsQuery;
    
    // Per ogni lotto, calcola analytics dettagliati
    const analyticsResults: LotAnalytics[] = [];
    
    for (const lot of lotsData) {
      // Calcola conteggio attuale e vendite dal basket_lot_composition
      const compositionResults = await db
        .select({
          basketId: basketLotComposition.basketId,
          animalCount: basketLotComposition.animalCount,
          cycleId: basketLotComposition.cycleId
        })
        .from(basketLotComposition)
        .where(eq(basketLotComposition.lotId, lot.id));
      
      // Calcola operazioni di vendita per questo lotto
      const salesResults = await db
        .select({
          animalCount: operations.animalCount
        })
        .from(operations)
        .where(
          and(
            eq(operations.lotId, lot.id),
            eq(operations.type, 'vendita')
          )
        );
      
      // Conta cestelli utilizzati
      const basketsUsed = new Set(compositionResults.map(c => c.basketId)).size;
      
      // Calcola totali
      const currentCount = compositionResults.reduce((sum, comp) => sum + (comp.animalCount || 0), 0);
      const soldCount = salesResults.reduce((sum, sale) => sum + (sale.animalCount || 0), 0);
      const mortalityCount = lot.totalMortality || 0;
      const initialCount = lot.initialCount || 0;
      const mortalityPercentage = initialCount > 0 ? (mortalityCount / initialCount) * 100 : 0;
      
      // Determina stato
      let status: 'active' | 'sold' | 'completed' = 'active';
      if (soldCount >= initialCount * 0.9) status = 'sold';
      else if (currentCount === 0 && soldCount === 0) status = 'completed';
      
      // Ultima operazione
      const [lastOp] = await db
        .select({
          date: operations.date,
          type: operations.type
        })
        .from(operations)
        .where(eq(operations.lotId, lot.id))
        .orderBy(desc(operations.date))
        .limit(1);
      
      // Calcola peso medio attuale
      const avgWeightResults = await db
        .select({
          averageWeight: sql<number>`AVG(${operations.averageWeight})`
        })
        .from(operations)
        .where(
          and(
            eq(operations.lotId, lot.id),
            isNotNull(operations.averageWeight)
          )
        );
      
      const averageWeight = avgWeightResults[0]?.averageWeight || 0;
      const totalWeight = currentCount * averageWeight / 1000; // Convert to grams
      
      analyticsResults.push({
        id: lot.id,
        supplier: lot.supplier || '',
        supplierLotNumber: lot.supplierLotNumber || '',
        arrivalDate: lot.arrivalDate,
        initialCount: initialCount,
        currentCount,
        soldCount,
        mortalityCount,
        mortalityPercentage,
        averageWeight,
        totalWeight,
        status,
        daysInSystem: differenceInDays(new Date(), new Date(lot.arrivalDate)),
        basketsUsed,
        lastOperation: lastOp ? `${lastOp.type} (${lastOp.date})` : 'Nessuna'
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ ANALYTICS LOTTI COMPLETATI: ${duration}ms - ${analyticsResults.length} lotti`);
    
    return res.json(analyticsResults);
    
  } catch (error) {
    console.error("❌ ERRORE ANALYTICS LOTTI:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno durante il calcolo analytics lotti"
    });
  }
}

/**
 * Lista fornitori per filtri
 * GET /api/analytics/suppliers
 */
export async function getSuppliers(req: Request, res: Response) {
  try {
    const suppliers = await db
      .selectDistinct({ supplier: lots.supplier })
      .from(lots)
      .where(isNotNull(lots.supplier))
      .orderBy(asc(lots.supplier));
    
    return res.json(suppliers.map(s => s.supplier));
    
  } catch (error) {
    console.error("❌ ERRORE LISTA FORNITORI:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante il recupero dei fornitori"
    });
  }
}

/**
 * Giacenze in tempo reale con dettagli avanzati
 * GET /api/analytics/inventory-live
 */
export async function getLiveInventory(req: Request, res: Response) {
  try {
    const { flupsyId } = req.query;
    
    console.log(`📦 GIACENZE LIVE${flupsyId ? ` - FLUPSY ${flupsyId}` : ''}`);
    
    const startTime = Date.now();
    
    // Query complex per giacenze dettagliate per lotto
    let inventoryQuery = db
      .select({
        lotId: basketLotComposition.lotId,
        lotSupplier: lots.supplier,
        lotNumber: lots.supplierLotNumber,
        lotArrival: lots.arrivalDate,
        basketId: basketLotComposition.basketId,
        basketPhysical: baskets.physicalNumber,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        cycleId: basketLotComposition.cycleId,
        animalCount: basketLotComposition.animalCount,
        percentage: basketLotComposition.percentage,
        position: sql<string>`${baskets.row} || ${baskets.position}`,
        cycleState: cycles.state
      })
      .from(basketLotComposition)
      .innerJoin(lots, eq(basketLotComposition.lotId, lots.id))
      .innerJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
      .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(cycles.state, 'active'));
    
    // Applica filtro FLUPSY se specificato
    if (flupsyId) {
      inventoryQuery = db
        .select({
          lotId: basketLotComposition.lotId,
          lotSupplier: lots.supplier,
          lotNumber: lots.supplierLotNumber,
          lotArrival: lots.arrivalDate,
          basketId: basketLotComposition.basketId,
          basketPhysical: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          flupsyName: flupsys.name,
          cycleId: basketLotComposition.cycleId,
          animalCount: basketLotComposition.animalCount,
          percentage: basketLotComposition.percentage,
          position: sql<string>`${baskets.row} || ${baskets.position}`,
          cycleState: cycles.state
        })
        .from(basketLotComposition)
        .innerJoin(lots, eq(basketLotComposition.lotId, lots.id))
        .innerJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
        .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
        .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
        .where(
          and(
            eq(cycles.state, 'active'),
            eq(baskets.flupsyId, parseInt(flupsyId as string))
          )
        );
    }
    
    const inventoryData = await inventoryQuery;
    
    // Raggruppa per lotto
    const lotInventory = inventoryData.reduce((acc, item) => {
      if (!acc[item.lotId]) {
        acc[item.lotId] = {
          lotId: item.lotId,
          supplier: item.lotSupplier,
          lotNumber: item.lotNumber,
          arrivalDate: item.lotArrival,
          totalAnimals: 0,
          baskets: [],
          flupsys: new Set()
        };
      }
      
      acc[item.lotId].totalAnimals += item.animalCount || 0;
      acc[item.lotId].baskets.push({
        basketId: item.basketId,
        physicalNumber: item.basketPhysical,
        flupsyName: item.flupsyName,
        position: item.position,
        animalCount: item.animalCount,
        percentage: item.percentage
      });
      if (item.flupsyName) {
        acc[item.lotId].flupsys.add(item.flupsyName);
      }
      
      return acc;
    }, {} as Record<number, any>);
    
    // Converti in array e aggiungi statistiche
    const result = Object.values(lotInventory).map((lot: any) => ({
      ...lot,
      flupsys: Array.from(lot.flupsys),
      basketCount: lot.baskets.length,
      averageAnimalsPerBasket: lot.totalAnimals / lot.baskets.length,
      daysInSystem: differenceInDays(new Date(), new Date(lot.arrivalDate))
    }));
    
    const duration = Date.now() - startTime;
    console.log(`✅ GIACENZE LIVE COMPLETATE: ${duration}ms - ${result.length} lotti`);
    
    return res.json({
      success: true,
      inventory: result,
      summary: {
        totalLots: result.length,
        totalAnimals: result.reduce((sum, lot) => sum + lot.totalAnimals, 0),
        totalBaskets: result.reduce((sum, lot) => sum + lot.basketCount, 0),
        calculationTime: `${duration}ms`
      }
    });
    
  } catch (error) {
    console.error("❌ ERRORE GIACENZE LIVE:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante il calcolo giacenze live"
    });
  }
}

/**
 * Report trend mortalità per periodo
 * GET /api/analytics/mortality-trends?days=30
 */
export async function getMortalityTrends(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    
    console.log(`📈 TREND MORTALITÀ: ${daysNum} giorni`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    // Query mortalità per data
    const mortalityData = await db
      .select({
        date: operations.date,
        lotId: operations.lotId,
        supplier: lots.supplier,
        lotNumber: lots.supplierLotNumber,
        mortalityCount: operations.deadCount,
        totalAnimals: operations.animalCount
      })
      .from(operations)
      .innerJoin(lots, eq(operations.lotId, lots.id))
      .where(
        and(
          gte(operations.date, format(startDate, 'yyyy-MM-dd')),
          isNotNull(operations.deadCount),
          sql`${operations.deadCount} > 0`
        )
      )
      .orderBy(asc(operations.date));
    
    // Raggruppa per data
    const trendData = mortalityData.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalMortality: 0,
          totalAnimals: 0,
          lots: []
        };
      }
      
      acc[date].totalMortality += item.mortalityCount || 0;
      acc[date].totalAnimals += item.totalAnimals || 0;
      acc[date].lots.push({
        lotId: item.lotId,
        supplier: item.supplier,
        lotNumber: item.lotNumber,
        mortality: item.mortalityCount
      });
      
      return acc;
    }, {} as Record<string, any>);
    
    // Converti in array e calcola percentuali
    const result = Object.values(trendData).map((day: any) => ({
      ...day,
      mortalityPercentage: day.totalAnimals > 0 ? (day.totalMortality / day.totalAnimals) * 100 : 0,
      lotCount: day.lots.length
    }));
    
    return res.json({
      success: true,
      trends: result,
      period: `${daysNum} giorni`,
      summary: {
        totalDays: result.length,
        totalMortality: result.reduce((sum, day) => sum + day.totalMortality, 0),
        averageMortalityRate: result.length > 0 
          ? result.reduce((sum, day) => sum + day.mortalityPercentage, 0) / result.length 
          : 0
      }
    });
    
  } catch (error) {
    console.error("❌ ERRORE TREND MORTALITÀ:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante il calcolo trend mortalità"
    });
  }
}

/**
 * Analytics per taglie con distribuzione e crescita
 * GET /api/analytics/sizes-distribution
 */
export async function getSizesDistribution(req: Request, res: Response) {
  try {
    console.log(`📏 DISTRIBUZIONE TAGLIE`);
    
    // Query distribuzione taglie correnti
    const sizeDistribution = await db
      .select({
        sizeId: operations.sizeId,
        sizeCode: sizes.code,
        sizeName: sizes.name,
        basketCount: sql<number>`COUNT(DISTINCT ${operations.basketId})`,
        totalAnimals: sql<number>`SUM(${operations.animalCount})`,
        averageWeight: sql<number>`AVG(${operations.averageWeight})`,
        lastUpdate: sql<string>`MAX(${operations.date})`
      })
      .from(operations)
      .innerJoin(sizes, eq(operations.sizeId, sizes.id))
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .where(
        and(
          eq(cycles.state, 'active'),
          isNotNull(operations.sizeId)
        )
      )
      .groupBy(operations.sizeId, sizes.code, sizes.name)
      .orderBy(desc(sql`SUM(${operations.animalCount})`));
    
    // Query crescita per taglia negli ultimi 30 giorni
    const growthData = await db
      .select({
        sizeId: operations.sizeId,
        date: operations.date,
        averageWeight: operations.averageWeight
      })
      .from(operations)
      .where(
        and(
          gte(operations.date, format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')),
          isNotNull(operations.sizeId),
          isNotNull(operations.averageWeight)
        )
      )
      .orderBy(asc(operations.date));
    
    // Raggruppa crescita per taglia
    const growthBySize = growthData.reduce((acc, item) => {
      const sizeId = item.sizeId;
      if (sizeId && !acc[sizeId]) {
        acc[sizeId] = [];
      }
      if (sizeId) {
        acc[sizeId].push({
          date: item.date,
          weight: item.averageWeight
        });
      }
      return acc;
    }, {} as Record<number, any[]>);
    
    // Combina i dati
    const result = sizeDistribution.map(size => ({
      ...size,
      growthData: growthBySize[size.sizeId] || [],
      percentage: 0 // Calcolato dopo
    }));
    
    // Calcola percentuali
    const totalAnimals = result.reduce((sum, size) => sum + (size.totalAnimals || 0), 0);
    result.forEach(size => {
      (size as any).percentage = totalAnimals > 0 ? ((size.totalAnimals || 0) / totalAnimals) * 100 : 0;
    });
    
    return res.json({
      success: true,
      distribution: result,
      summary: {
        totalSizes: result.length,
        totalAnimals,
        totalBaskets: result.reduce((sum, size) => sum + (size.basketCount || 0), 0)
      }
    });
    
  } catch (error) {
    console.error("❌ ERRORE DISTRIBUZIONE TAGLIE:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante il calcolo distribuzione taglie"
    });
  }
}