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
  activeBasketsUsed: number;
  lastOperation: string;
  // Nuovi campi per lotti misti
  mixedBasketsCount: number;
  pureBasketsCount: number;
  averageDistributionPercentage: number;
  fragmentationLevel: number;
  isMixedLot: boolean;
  riskLevel: 'basso' | 'medio' | 'alto';
  soldWeight: number;
  distributionEfficiency: number;
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
    
    // Per ogni lotto, calcola analytics dettagliati considerando i lotti misti
    const analyticsResults: LotAnalytics[] = [];
    
    for (const lot of lotsData) {
      // Calcola conteggio attuale dal basket_lot_composition (più accurato per lotti misti)
      const compositionResults = await db
        .select({
          basketId: basketLotComposition.basketId,
          animalCount: basketLotComposition.animalCount,
          percentage: basketLotComposition.percentage,
          cycleId: basketLotComposition.cycleId,
          cycleState: cycles.state
        })
        .from(basketLotComposition)
        .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
        .where(eq(basketLotComposition.lotId, lot.id));
      
      // Calcola operazioni di vendita per questo lotto (da operations dove lotId match)
      const salesResults = await db
        .select({
          animalCount: operations.animalCount,
          totalWeight: operations.totalWeight
        })
        .from(operations)
        .where(
          and(
            eq(operations.lotId, lot.id),
            eq(operations.type, 'vendita')
          )
        );
      
      // Conta cestelli utilizzati (totali e attivi)
      const basketsUsed = new Set(compositionResults.map(c => c.basketId)).size;
      const activeBasketsUsed = new Set(
        compositionResults.filter(c => c.cycleState === 'active').map(c => c.basketId)
      ).size;
      
      // Calcola totali considerando la composizione mista
      const currentCount = compositionResults
        .filter(comp => comp.cycleState === 'active')
        .reduce((sum, comp) => sum + (comp.animalCount || 0), 0);
      
      const soldCount = salesResults.reduce((sum, sale) => sum + (sale.animalCount || 0), 0);
      const soldWeight = salesResults.reduce((sum, sale) => sum + (sale.totalWeight || 0), 0);
      
      // Calcola mortalità migliorata per lotti misti
      const mortalityCount = lot.totalMortality || 0;
      const initialCount = lot.initialCount || 0;
      const mortalityPercentage = initialCount > 0 ? (mortalityCount / initialCount) * 100 : 0;
      
      // Calcola distribuzione attuale del lotto (quanti cestelli, che percentuali)
      const distributionInfo = {
        totalBaskets: basketsUsed,
        activeBasketsCount: activeBasketsUsed,
        mixedBaskets: compositionResults.filter(c => c.percentage < 100).length,
        pureBaskets: compositionResults.filter(c => c.percentage >= 100).length,
        averagePercentage: compositionResults.length > 0 ? 
          compositionResults.reduce((sum, c) => sum + (c.percentage || 0), 0) / compositionResults.length : 0
      };
      
      // Determina stato con più accuratezza per lotti misti
      let status: 'active' | 'sold' | 'completed' = 'active';
      if (soldCount >= initialCount * 0.9) status = 'sold';
      else if (currentCount === 0 && soldCount === 0) status = 'completed';
      
      // Ultima operazione su questo lotto
      const [lastOp] = await db
        .select({
          date: operations.date,
          type: operations.type
        })
        .from(operations)
        .where(eq(operations.lotId, lot.id))
        .orderBy(desc(operations.date))
        .limit(1);
      
      // Calcola peso medio attuale considerando lotti misti
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
      
      // Calcola indicatori specifici per lotti misti
      const mixedLotIndicators = {
        isMixed: distributionInfo.mixedBaskets > 0,
        distributionEfficiency: distributionInfo.averagePercentage,
        fragmentationLevel: basketsUsed > 0 ? (distributionInfo.mixedBaskets / basketsUsed) * 100 : 0,
        riskLevel: mortalityPercentage > 10 ? 'alto' : 
                   mortalityPercentage > 5 ? 'medio' : 'basso'
      };
      
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
        basketsUsed: distributionInfo.totalBaskets,
        activeBasketsUsed: distributionInfo.activeBasketsCount,
        lastOperation: lastOp ? `${lastOp.type} (${lastOp.date})` : 'Nessuna',
        // Nuovi campi per lotti misti
        mixedBasketsCount: distributionInfo.mixedBaskets,
        pureBasketsCount: distributionInfo.pureBaskets,
        averageDistributionPercentage: Math.round(distributionInfo.averagePercentage * 10) / 10,
        fragmentationLevel: Math.round(mixedLotIndicators.fragmentationLevel * 10) / 10,
        isMixedLot: mixedLotIndicators.isMixed,
        riskLevel: mixedLotIndicators.riskLevel,
        soldWeight: Math.round(soldWeight),
        distributionEfficiency: Math.round(mixedLotIndicators.distributionEfficiency * 10) / 10
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
 * Analytics per singolo lotto
 * GET /api/analytics/lots/:id
 */
export async function getSingleLotAnalytics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const lotId = parseInt(id);
    
    if (!lotId || isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        error: "ID lotto non valido"
      });
    }
    
    console.log(`📊 ANALYTICS SINGOLO LOTTO: ID ${lotId}`);
    
    const startTime = Date.now();
    
    // Query per il lotto specifico
    const lotResult = await db
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
      .where(eq(lots.id, lotId))
      .limit(1);
    
    if (lotResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lotto non trovato"
      });
    }
    
    const lot = lotResult[0];
    const initialCount = lot.initialCount || 0;
    
    // Calcola mortalità dal lotto
    let mortalityCount = lot.totalMortality || 0;
    
    // Calcola vendite per questo lotto
    const soldResults = await db
      .select({
        totalSold: sql<number>`COALESCE(SUM(${operations.animalCount}), 0)`
      })
      .from(operations)
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .innerJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .where(
        and(
          eq(basketLotComposition.lotId, lotId),
          eq(operations.type, 'vendita')
        )
      );
    
    const soldCount = Number(soldResults[0]?.totalSold || 0);
    
    // Calcola animali attualmente presenti
    const currentCountResults = await db
      .select({
        totalCurrent: sql<number>`COALESCE(SUM(${basketLotComposition.animalCount}), 0)`
      })
      .from(basketLotComposition)
      .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
      .where(
        and(
          eq(basketLotComposition.lotId, lotId),
          eq(cycles.state, 'active')
        )
      );
    
    const currentCount = Number(currentCountResults[0]?.totalCurrent || 0);
    
    // Calcola percentuale mortalità
    const mortalityPercentage = initialCount > 0 ? (mortalityCount / initialCount) * 100 : 0;
    
    // Determina status
    let status: 'active' | 'warning' | 'critical' = 'active';
    if (mortalityPercentage > 15) {
      status = 'critical';
    } else if (mortalityPercentage > 8 || currentCount < (initialCount * 0.1)) {
      status = 'warning';
    }
    
    // Calcola numero cestelli utilizzati
    const basketCountResults = await db
      .selectDistinct({ basketId: basketLotComposition.basketId })
      .from(basketLotComposition)
      .where(eq(basketLotComposition.lotId, lotId));
    
    const basketsUsed = basketCountResults.length;
    const activeBasketsCount = await db
      .selectDistinct({ basketId: basketLotComposition.basketId })
      .from(basketLotComposition)
      .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
      .where(
        and(
          eq(basketLotComposition.lotId, lotId),
          eq(cycles.state, 'active')
        )
      );
    
    // Trova ultima operazione
    const lastOpResults = await db
      .select({
        type: operations.type,
        date: operations.date
      })
      .from(operations)
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .innerJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .where(eq(basketLotComposition.lotId, lotId))
      .orderBy(desc(operations.date))
      .limit(1);
    
    const lastOp = lastOpResults[0];
    
    // Calcola peso medio attuale
    const avgWeightResults = await db
      .select({
        averageWeight: sql<number>`COALESCE(AVG(${operations.animalsPerKg}), 0)`
      })
      .from(operations)
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .innerJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .where(
        and(
          eq(basketLotComposition.lotId, lotId),
          isNotNull(operations.animalsPerKg),
          sql`${operations.date} >= NOW() - INTERVAL '30 days'`
        )
      );
    
    const animalsPerKg = avgWeightResults[0]?.averageWeight || 0;
    const averageWeightInMg = animalsPerKg > 0 ? (1000000 / animalsPerKg) : 0;
    
    // Calcola SGR medio
    const sgrResults = await db
      .select({
        averageSgr: sql<number>`COALESCE(AVG(CAST(${operations.sgrId} AS FLOAT)), 0)`
      })
      .from(operations)
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .innerJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .where(
        and(
          eq(basketLotComposition.lotId, lotId),
          isNotNull(operations.sgrId),
          sql`${operations.date} >= NOW() - INTERVAL '30 days'`
        )
      );
    
    const averageSgr = Number(sgrResults[0]?.averageSgr || 0);
    
    // Calcola crescita peso (confronta peso iniziale vs attuale)
    const initialWeight = lot.weight || 0;
    const currentWeight = currentCount * (averageWeightInMg / 1000); // Convert to grams
    const weightGrowth = initialWeight > 0 ? ((currentWeight - initialWeight) / initialWeight) * 100 : 0;
    
    const lotAnalytics = {
      id: lot.id,
      supplier: lot.supplier || '',
      supplierLotNumber: lot.supplierLotNumber || '',
      arrivalDate: lot.arrivalDate,
      initialCount,
      currentCount,
      soldCount,
      mortalityCount,
      mortalityPercentage: Math.round(mortalityPercentage * 10) / 10,
      averageSgr: Math.round(averageSgr * 10) / 10,
      currentWeight: Math.round(currentWeight),
      initialWeight: Math.round(initialWeight),
      weightGrowth: Math.round(weightGrowth * 10) / 10,
      activeBasketsCount: activeBasketsCount.length,
      lastOperationDate: lastOp ? lastOp.date : lot.arrivalDate,
      lastOperationType: lastOp ? lastOp.type : 'prima-attivazione',
      quality: mortalityPercentage < 5 ? 'Ottima' : mortalityPercentage < 8 ? 'Buona' : mortalityPercentage < 15 ? 'Accettabile' : 'Problematica',
      status,
      daysInSystem: differenceInDays(new Date(), new Date(lot.arrivalDate)),
      basketsUsed,
      notes: lot.notes
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ ANALYTICS SINGOLO LOTTO COMPLETATO: ${duration}ms - Lotto ID ${lotId}`);
    
    return res.json({
      success: true,
      lotAnalytics
    });
    
  } catch (error) {
    console.error("❌ ERRORE ANALYTICS SINGOLO LOTTO:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno durante il calcolo analytics lotto"
    });
  }
}

/**
 * NUOVE FUNZIONI PER LOTTI MISTI
 */

/**
 * Analytics composizione lotti misti
 * GET /api/analytics/mixed-lots-composition
 */
export async function getMixedLotsComposition(req: Request, res: Response) {
  try {
    const { period = '30', flupsyId } = req.query;
    
    console.log(`🧩 ANALYTICS COMPOSIZIONE LOTTI MISTI: periodo=${period}`);
    
    const startTime = Date.now();
    
    // Costruisci le condizioni WHERE
    const whereConditions = [eq(cycles.state, 'active')];
    
    // Applica filtro FLUPSY se specificato
    if (flupsyId && flupsyId !== 'all') {
      whereConditions.push(eq(baskets.flupsyId, parseInt(flupsyId as string)));
    }
    
    // Trova cestelli con composizione mista (più lotti)
    const mixedBaskets = await db
      .select({
        basketId: basketLotComposition.basketId,
        cycleId: basketLotComposition.cycleId,
        basketPhysical: baskets.physicalNumber,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        lotCount: sql<number>`COUNT(DISTINCT ${basketLotComposition.lotId})`,
        totalAnimals: sql<number>`SUM(${basketLotComposition.animalCount})`,
        compositions: sql<string>`STRING_AGG(
          CONCAT(${lots.supplier}, ' L', ${basketLotComposition.lotId}, ' (', ${basketLotComposition.percentage}, '%)'),
          '; '
          ORDER BY ${basketLotComposition.percentage} DESC
        )`
      })
      .from(basketLotComposition)
      .innerJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
      .innerJoin(lots, eq(basketLotComposition.lotId, lots.id))
      .where(and(...whereConditions))
      .groupBy(basketLotComposition.basketId, basketLotComposition.cycleId, baskets.physicalNumber, baskets.flupsyId, flupsys.name)
      .having(sql`COUNT(DISTINCT ${basketLotComposition.lotId}) > 1`);
    
    // Calcola distribuzione mortalità per composizione mista
    const mortalityByComposition = await Promise.all(
      mixedBaskets.map(async (basket) => {
        const compositions = await db
          .select({
            lotId: basketLotComposition.lotId,
            percentage: basketLotComposition.percentage,
            animalCount: basketLotComposition.animalCount,
            supplier: lots.supplier,
            lotNumber: lots.supplierLotNumber,
            totalMortality: lots.totalMortality
          })
          .from(basketLotComposition)
          .innerJoin(lots, eq(basketLotComposition.lotId, lots.id))
          .where(
            and(
              eq(basketLotComposition.basketId, basket.basketId),
              eq(basketLotComposition.cycleId, basket.cycleId)
            )
          );
        
        // Calcola mortalità stimata per questo cestello misto
        const estimatedMortality = compositions.reduce((acc, comp) => {
          // Usa il total mortality già presente nel comp, senza query aggiuntive
          const lotMortalityRate = comp.totalMortality ? 
            (comp.totalMortality / (comp.animalCount || 1)) : 0;
          return acc + (comp.animalCount * lotMortalityRate);
        }, 0);
        
        return {
          ...basket,
          compositions: compositions,
          estimatedMortalityRate: (estimatedMortality / basket.totalAnimals) * 100,
          riskLevel: estimatedMortality > (basket.totalAnimals * 0.1) ? 'alto' : 
                    estimatedMortality > (basket.totalAnimals * 0.05) ? 'medio' : 'basso'
        };
      })
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ ANALYTICS COMPOSIZIONE LOTTI MISTI: ${duration}ms - ${mixedBaskets.length} cestelli`);
    
    return res.json({
      success: true,
      mixedBaskets: mortalityByComposition,
      summary: {
        totalMixedBaskets: mixedBaskets.length,
        averageLotsPerBasket: mixedBaskets.length > 0 ? 
          mixedBaskets.reduce((sum, b) => sum + b.lotCount, 0) / mixedBaskets.length : 0,
        totalAnimalsInMixedBaskets: mixedBaskets.reduce((sum, b) => sum + b.totalAnimals, 0)
      }
    });
    
  } catch (error) {
    console.error("❌ ERRORE ANALYTICS COMPOSIZIONE LOTTI MISTI:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno durante il calcolo composizione lotti misti"
    });
  }
}

/**
 * Tracciabilità lotto attraverso operazioni di vagliatura
 * GET /api/analytics/lot-traceability/:lotId
 */
export async function getLotTraceability(req: Request, res: Response) {
  try {
    const { lotId } = req.params;
    const lotIdNum = parseInt(lotId);
    
    if (!lotIdNum || isNaN(lotIdNum)) {
      return res.status(400).json({
        success: false,
        error: "ID lotto non valido"
      });
    }
    
    console.log(`🔍 TRACCIABILITÀ LOTTO: ID ${lotIdNum}`);
    
    const startTime = Date.now();
    
    // Informazioni base del lotto
    const lotInfo = await db
      .select({
        id: lots.id,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        arrivalDate: lots.arrivalDate,
        initialAnimalCount: lots.animalCount,
        initialWeight: lots.weight,
        totalMortality: lots.totalMortality
      })
      .from(lots)
      .where(eq(lots.id, lotIdNum))
      .limit(1);
    
    if (lotInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Lotto non trovato"
      });
    }
    
    // Storia delle composizioni di questo lotto
    const compositionHistory = await db
      .select({
        basketId: basketLotComposition.basketId,
        basketPhysical: baskets.physicalNumber,
        cycleId: basketLotComposition.cycleId,
        animalCount: basketLotComposition.animalCount,
        percentage: basketLotComposition.percentage,
        sourceSelectionId: basketLotComposition.sourceSelectionId,
        flupsyName: flupsys.name,
        position: sql<string>`${baskets.row} || ${baskets.position}`,
        createdAt: basketLotComposition.createdAt,
        notes: basketLotComposition.notes
      })
      .from(basketLotComposition)
      .innerJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(basketLotComposition.lotId, lotIdNum))
      .orderBy(desc(basketLotComposition.createdAt));
    
    // Operazioni storiche su questo lotto
    const operationsHistory = await db
      .select({
        id: operations.id,
        date: operations.date,
        type: operations.type,
        basketId: operations.basketId,
        basketPhysical: baskets.physicalNumber,
        animalCount: operations.animalCount,
        totalWeight: operations.totalWeight,
        deadCount: operations.deadCount,
        notes: operations.notes,
        flupsyName: flupsys.name
      })
      .from(operations)
      .innerJoin(baskets, eq(operations.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(operations.lotId, lotIdNum))
      .orderBy(desc(operations.date));
    
    // Analisi distribuzione attuale
    const currentDistribution = await db
      .select({
        basketId: basketLotComposition.basketId,
        basketPhysical: baskets.physicalNumber,
        flupsyName: flupsys.name,
        animalCount: basketLotComposition.animalCount,
        percentage: basketLotComposition.percentage,
        cycleState: cycles.state,
        position: sql<string>`${baskets.row} || ${baskets.position}`
      })
      .from(basketLotComposition)
      .innerJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .innerJoin(cycles, eq(basketLotComposition.cycleId, cycles.id))
      .where(
        and(
          eq(basketLotComposition.lotId, lotIdNum),
          eq(cycles.state, 'active')
        )
      );
    
    const result = {
      lotInfo: lotInfo[0],
      compositionHistory,
      operationsHistory,
      currentDistribution,
      summary: {
        totalOperations: operationsHistory.length,
        basketsUsedHistorically: new Set(compositionHistory.map(c => c.basketId)).size,
        currentActiveBasketsCount: currentDistribution.length,
        currentTotalAnimals: currentDistribution.reduce((sum, d) => sum + d.animalCount, 0),
        distributionEfficiency: currentDistribution.length > 0 ? 
          (currentDistribution.reduce((sum, d) => sum + d.animalCount, 0) / lotInfo[0].initialAnimalCount) * 100 : 0
      }
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ TRACCIABILITÀ LOTTO COMPLETATA: ${duration}ms - Lotto ID ${lotIdNum}`);
    
    return res.json({
      success: true,
      traceability: result
    });
    
  } catch (error) {
    console.error("❌ ERRORE TRACCIABILITÀ LOTTO:", error);
    return res.status(500).json({
      success: false,
      error: "Errore interno durante il calcolo tracciabilità lotto"
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
      growthData: (size.sizeId && growthBySize[size.sizeId]) ? growthBySize[size.sizeId] : [],
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