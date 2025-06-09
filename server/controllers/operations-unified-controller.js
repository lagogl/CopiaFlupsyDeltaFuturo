/**
 * Controller unificato per la pagina Operations
 * Combina tutte le query necessarie in una singola chiamata API ottimizzata
 */

import { eq, desc, and, or, gte, lte, sql, inArray } from 'drizzle-orm';
import { operations, baskets, cycles, lots, sizes, flupsys, sgr } from '../../shared/schema.ts';

let unifiedCache = {
  data: null,
  timestamp: null,
  ttl: 30000, // 30 secondi
};

export async function getOperationsUnified(req, res, db) {
  try {
    console.log('🚀 OPERAZIONI UNIFICATE: Richiesta ricevuta');
    
    // Controlla cache
    const now = Date.now();
    if (unifiedCache.data && unifiedCache.timestamp && (now - unifiedCache.timestamp) < unifiedCache.ttl) {
      console.log('✅ CACHE HIT: Dati recuperati dalla cache');
      return res.json({
        success: true,
        data: unifiedCache.data,
        fromCache: true,
        cacheAge: now - unifiedCache.timestamp
      });
    }

    console.log('🔄 CACHE MISS: Eseguendo query unificata...');
    const startTime = Date.now();

    // Query unificata con tutti i join necessari
    const unifiedResults = await db
      .select({
        // Operations fields
        operationId: operations.id,
        operationDate: operations.date,
        operationType: operations.type,
        operationBasketId: operations.basketId,
        operationCycleId: operations.cycleId,
        operationSizeId: operations.sizeId,
        operationLotId: operations.lotId,
        operationAnimalCount: operations.animalCount,
        operationTotalWeight: operations.totalWeight,
        operationAnimalsPerKg: operations.animalsPerKg,
        operationAverageWeight: operations.averageWeight,
        operationDeadCount: operations.deadCount,
        operationMortalityRate: operations.mortalityRate,
        operationNotes: operations.notes,
        operationMetadata: operations.metadata,
        
        // Basket fields
        basketPhysicalNumber: baskets.physicalNumber,
        basketRow: baskets.row,
        basketPosition: baskets.position,
        basketState: baskets.state,
        basketFlupsyId: baskets.flupsyId,
        
        // Cycle fields
        cycleStartDate: cycles.startDate,
        cycleEndDate: cycles.endDate,
        cycleState: cycles.state,
        
        // FLUPSY fields
        flupsyName: flupsys.name,
        flupsyLocation: flupsys.location,
        
        // Size fields
        sizeCode: sizes.code,
        sizeName: sizes.name,
        sizeColor: sizes.color,
        
        // Lot fields
        lotName: lots.name,
        lotSupplier: lots.supplier,
        lotArrivalDate: lots.arrivalDate,
      })
      .from(operations)
      .leftJoin(baskets, eq(operations.basketId, baskets.id))
      .leftJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(sizes, eq(operations.sizeId, sizes.id))
      .leftJoin(lots, eq(operations.lotId, lots.id))
      .orderBy(desc(operations.date), desc(operations.id))
      .limit(1000); // Limite ragionevole

    // Query separate per dati di supporto (cache più lunga)
    const [allBaskets, allCycles, allFlupsys, allSizes, allLots, allSgr] = await Promise.all([
      db.select().from(baskets).limit(500),
      db.select().from(cycles).orderBy(desc(cycles.startDate)).limit(100),
      db.select().from(flupsys).limit(50),
      db.select().from(sizes).limit(50),
      db.select().from(lots).orderBy(desc(lots.arrivalDate)).limit(200),
      db.select().from(sgr).limit(20)
    ]);

    // Trasforma i risultati in formato ottimizzato
    const operationsFormatted = unifiedResults.map(row => ({
      id: row.operationId,
      date: row.operationDate,
      type: row.operationType,
      basketId: row.operationBasketId,
      cycleId: row.operationCycleId,
      sizeId: row.operationSizeId,
      lotId: row.operationLotId,
      animalCount: row.operationAnimalCount,
      totalWeight: row.operationTotalWeight,
      animalsPerKg: row.operationAnimalsPerKg,
      averageWeight: row.operationAverageWeight,
      deadCount: row.operationDeadCount,
      mortalityRate: row.operationMortalityRate,
      notes: row.operationNotes,
      metadata: row.operationMetadata,
      
      // Dati correlati denormalizzati
      basketPhysicalNumber: row.basketPhysicalNumber,
      basketRow: row.basketRow,
      basketPosition: row.basketPosition,
      basketState: row.basketState,
      flupsyId: row.basketFlupsyId,
      flupsyName: row.flupsyName,
      flupsyLocation: row.flupsyLocation,
      
      cycleStartDate: row.cycleStartDate,
      cycleEndDate: row.cycleEndDate,
      cycleState: row.cycleState,
      
      sizeCode: row.sizeCode,
      sizeName: row.sizeName,
      sizeColor: row.sizeColor,
      
      lotName: row.lotName,
      lotSupplier: row.lotSupplier,
      lotArrivalDate: row.lotArrivalDate,
      
      // Calcoli derivati
      lot: row.lotName ? {
        id: row.operationLotId,
        name: row.lotName,
        supplier: row.lotSupplier,
        arrivalDate: row.lotArrivalDate
      } : null
    }));

    const unifiedData = {
      operations: operationsFormatted,
      baskets: allBaskets,
      cycles: allCycles,
      flupsys: allFlupsys,
      sizes: allSizes,
      lots: allLots,
      sgr: allSgr,
      pagination: {
        totalOperations: operationsFormatted.length,
        page: 1,
        pageSize: operationsFormatted.length
      }
    };

    // Salva in cache
    unifiedCache.data = unifiedData;
    unifiedCache.timestamp = now;

    const queryTime = Date.now() - startTime;
    console.log(`✅ QUERY UNIFICATA COMPLETATA in ${queryTime}ms: ${operationsFormatted.length} operazioni`);

    res.json({
      success: true,
      data: unifiedData,
      fromCache: false,
      queryTime: queryTime
    });

  } catch (error) {
    console.error('❌ Errore nella query unificata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export function invalidateUnifiedCache() {
  unifiedCache.data = null;
  unifiedCache.timestamp = null;
  console.log('🗑️ CACHE UNIFICATA INVALIDATA');
}