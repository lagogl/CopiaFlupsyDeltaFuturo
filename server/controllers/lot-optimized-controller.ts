import { db } from '../db';
import { and, count, eq, gte, ilike, inArray, like, lte, or, sql } from 'drizzle-orm';
import { lots, sizes, cycles, baskets, operations, measurements } from '@shared/schema';

/**
 * Interfaccia per i filtri dei lotti
 */
export interface LotFilters {
  id?: number;
  supplierId?: number;
  supplier?: string;
  fromDate?: string;
  toDate?: string;
  quality?: string;
  sizeId?: number;
  state?: string;
}

/**
 * Ottiene i lotti paginati con filtri opzionali
 * @param page Numero pagina (default: 1)
 * @param pageSize Dimensione pagina (default: 20)
 * @param filters Filtri opzionali per la query
 * @returns Dati lotti paginati con statistiche
 */
export async function getPaginatedLots(
  page = 1,
  pageSize = 20,
  filters: LotFilters = {}
) {
  try {
    const offset = (page - 1) * pageSize;
    
    // Costruisci le condizioni di filtro
    const conditions = buildLotFilterConditions(filters);
    
    // Query principale per ottenere i lotti paginati
    const lotsQuery = db
      .select({
        id: lots.id,
        state: lots.state,
        arrivalDate: lots.arrivalDate,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        quality: lots.quality,
        weight: lots.weight,
        sizeId: lots.sizeId,
        animalCount: lots.animalCount,
        notes: lots.notes
      })
      .from(lots)
      .where(and(...conditions))
      .orderBy(lots.id)
      .limit(pageSize)
      .offset(offset);
    
    // Ottieni il conteggio totale per la paginazione
    const countQuery = db
      .select({
        count: count()
      })
      .from(lots)
      .where(and(...conditions));
      
    // Esegui le query in parallelo
    const [lotsData, countData] = await Promise.all([
      lotsQuery,
      countQuery
    ]);
    
    // Ottieni i dettagli delle taglie per i lotti
    const sizeIds = lotsData.map(lot => lot.sizeId).filter(Boolean);
    let sizesData: any[] = [];
    
    if (sizeIds.length > 0) {
      sizesData = await db
        .select()
        .from(sizes)
        .where(inArray(sizes.id, sizeIds as number[]));
    }
    
    // Ottieni statistiche di inventario per ciascun lotto
    const lotsWithInventory = await enhanceLotsWithInventoryData(lotsData);
    
    // Statistiche aggiuntive filtrate
    const lotStatistics = await getLotStatistics(conditions);
    
    return {
      data: lotsWithInventory,
      sizes: sizesData,
      meta: {
        currentPage: page,
        pageSize,
        totalItems: countData[0]?.count || 0,
        totalPages: Math.ceil((countData[0]?.count || 0) / pageSize)
      },
      statistics: lotStatistics
    };
  } catch (error) {
    console.error('Error fetching paginated lots:', error);
    throw new Error('Failed to fetch paginated lots data');
  }
}

/**
 * Costruisce le condizioni di filtro per la query dei lotti
 * @param filters Filtri da applicare
 * @returns Array di condizioni di filtro
 */
function buildLotFilterConditions(filters: LotFilters) {
  const conditions = [sql`1=1`]; // Base condition that's always true
  
  if (filters.id) {
    conditions.push(eq(lots.id, filters.id));
  }
  
  if (filters.supplier) {
    conditions.push(ilike(lots.supplier, `%${filters.supplier}%`));
  }
  
  if (filters.fromDate) {
    conditions.push(gte(lots.arrivalDate, filters.fromDate));
  }
  
  if (filters.toDate) {
    conditions.push(lte(lots.arrivalDate, filters.toDate));
  }
  
  if (filters.quality) {
    conditions.push(eq(lots.quality, filters.quality));
  }
  
  if (filters.sizeId) {
    conditions.push(eq(lots.sizeId, filters.sizeId));
  }
  
  if (filters.state) {
    conditions.push(eq(lots.state, filters.state));
  }
  
  return conditions;
}

/**
 * Arricchisce i dati dei lotti con informazioni di inventario
 * @param lotsData Array di dati dei lotti
 * @returns Lotti arricchiti con dati di inventario
 */
async function enhanceLotsWithInventoryData(lotsData: any[]) {
  if (lotsData.length === 0) return [];
  
  const lotIds = lotsData.map(lot => lot.id);
  
  // Ottieni tutti i cicli per questi lotti
  const cyclesData = await db
    .select({
      id: cycles.id,
      lotId: cycles.lotId,
      state: cycles.state,
      basketCount: count(baskets.id)
    })
    .from(cycles)
    .leftJoin(baskets, eq(baskets.currentCycleId, cycles.id))
    .where(inArray(cycles.lotId, lotIds))
    .groupBy(cycles.id);
    
  // Ottieni le ultime operazioni per ogni ciclo
  const cycleIds = cyclesData.map(cycle => cycle.id);
  
  let lastOperations: any[] = [];
  if (cycleIds.length > 0) {
    // Subquery per trovare l'ID dell'ultima operazione per ciascun ciclo
    const lastOpIds = await db.execute(sql`
      SELECT DISTINCT ON (cycle_id) id, cycle_id
      FROM operations
      WHERE cycle_id IN (${sql.join(cycleIds)})
      ORDER BY cycle_id, date DESC
    `);
    
    const lastOpIdArray = lastOpIds.rows.map((row: any) => row.id);
    
    if (lastOpIdArray.length > 0) {
      lastOperations = await db
        .select()
        .from(operations)
        .where(inArray(operations.id, lastOpIdArray));
    }
  }
  
  // Mappa i dati ai lotti
  return lotsData.map(lot => {
    const lotCycles = cyclesData.filter(cycle => cycle.lotId === lot.id);
    
    // Calcola informazioni di inventario
    const activeCyclesCount = lotCycles.filter(cycle => cycle.state === 'active').length;
    const totalBaskets = lotCycles.reduce((sum, cycle) => sum + Number(cycle.basketCount || 0), 0);
    
    // Trova le ultime operazioni per ciascun ciclo del lotto
    const cycleOpMap = new Map();
    lotCycles.forEach(cycle => {
      const lastOp = lastOperations.find(op => op.cycleId === cycle.id);
      if (lastOp) {
        cycleOpMap.set(cycle.id, lastOp);
      }
    });
    
    // Calcola animali totali dalle ultime operazioni
    let totalAnimals = 0;
    cycleOpMap.forEach(op => {
      if (op.animalCount !== null) {
        totalAnimals += Number(op.animalCount);
      }
    });
    
    return {
      ...lot,
      inventory: {
        totalCycles: lotCycles.length,
        activeCycles: activeCyclesCount,
        totalBaskets,
        totalAnimals
      }
    };
  });
}

/**
 * Calcola statistiche per i lotti filtrati
 * @param conditions Condizioni di filtro da applicare
 * @returns Statistiche sui lotti
 */
export async function getLotStatistics(conditions: any[] = []) {
  try {
    // Query per ottenere il numero totale di lotti
    const totalCountQuery = db
      .select({
        count: count()
      })
      .from(lots)
      .where(and(...conditions));
      
    // Query per contare i lotti per qualità
    const qualityStatsQuery = db
      .select({
        quality: lots.quality,
        count: count()
      })
      .from(lots)
      .where(and(...conditions))
      .groupBy(lots.quality);
      
    // Query per contare i lotti per fornitore
    const supplierStatsQuery = db
      .select({
        supplier: lots.supplier,
        count: count()
      })
      .from(lots)
      .where(and(...conditions))
      .groupBy(lots.supplier);
      
    // Esegui tutte le query in parallelo
    const [totalCount, qualityStats, supplierStats] = await Promise.all([
      totalCountQuery,
      qualityStatsQuery,
      supplierStatsQuery
    ]);
    
    // Calcola il totale degli animali per tutti i lotti filtrati
    let totalAnimals = 0;
    
    // Se ci sono lotti, conteggia gli animali
    if (totalCount[0]?.count > 0) {
      const lotsData = await db
        .select({
          id: lots.id,
          animalCount: lots.animalCount
        })
        .from(lots)
        .where(and(...conditions));
        
      // Calcola la somma degli animalCount, escludendo i null
      totalAnimals = lotsData.reduce((sum, lot) => {
        return sum + (lot.animalCount || 0);
      }, 0);
    }
    
    return {
      totalLots: totalCount[0]?.count || 0,
      totalAnimals,
      byQuality: qualityStats.reduce((acc, stat) => {
        acc[stat.quality || 'undefined'] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      bySupplier: supplierStats.reduce((acc, stat) => {
        acc[stat.supplier || 'undefined'] = stat.count;
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (error) {
    console.error('Error calculating lot statistics:', error);
    return {
      totalLots: 0,
      totalAnimals: 0,
      byQuality: {},
      bySupplier: {}
    };
  }
}