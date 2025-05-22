import { db } from "../db";
import { 
  lots,
  baskets,
  operations,
  cycles, 
  sizes
} from "../../shared/schema";
import { and, count, desc, eq, gt, gte, inArray, isNull, lte, not, sql } from "drizzle-orm";

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
  filters: {
    id?: number;
    supplier?: string;
    quality?: string;
    dateFrom?: string;
    dateTo?: string;
    sizeId?: number;
  } = {}
) {
  try {
    // Calcola offset per la paginazione
    const offset = (page - 1) * pageSize;
    
    // Costruisci condizioni di filtro
    const conditions = [];
    
    if (filters.id) {
      conditions.push(eq(lots.id, filters.id));
    }
    
    if (filters.supplier) {
      conditions.push(sql`${lots.supplier} ILIKE ${`%${filters.supplier}%`}`);
    }
    
    if (filters.quality) {
      conditions.push(eq(lots.quality, filters.quality));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(lots.arrivalDate, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(lots.arrivalDate, filters.dateTo));
    }
    
    if (filters.sizeId) {
      conditions.push(eq(lots.sizeId, filters.sizeId));
    }
    
    // Costruisci la query base
    let baseQuery = db.select().from(lots);
    let countQuery = db.select({ count: count() }).from(lots);
    
    // Applica condizioni di filtro
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }
    
    // Esegui query per ottenere lotti paginati
    const lotsList = await baseQuery
      .orderBy(desc(lots.arrivalDate))
      .limit(pageSize)
      .offset(offset);
    
    // Ottieni conteggio totale
    const totalCount = await countQuery;
    const total = totalCount[0]?.count || 0;
    
    // Prepara array IDs dei lotti per query correlate
    const lotIds = lotsList.map(lot => lot.id);
    
    // Se non ci sono lotti, restituisci risultato vuoto
    if (lotIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0
        },
        statistics: {
          totalAnimals: 0,
          qualityBreakdown: {}
        }
      };
    }
    
    // Ottieni le taglie correlate
    const sizeIds = lotsList
      .map(lot => lot.sizeId)
      .filter((id): id is number => id !== null);
    
    const sizeMap = new Map();
    if (sizeIds.length > 0) {
      const sizesList = await db.select()
        .from(sizes)
        .where(inArray(sizes.id, sizeIds));
      
      sizesList.forEach(size => {
        sizeMap.set(size.id, size);
      });
    }
    
    // Ottieni statistiche sui cestelli per lotto
    const basketsQuery = await db.select({
      lotId: cycles.lotId,
      basketCount: count()
    })
    .from(cycles)
    .where(and(
      inArray(cycles.lotId, lotIds),
      isNull(cycles.endDate)
    ))
    .groupBy(cycles.lotId);
    
    const basketsMap = new Map();
    basketsQuery.forEach(item => {
      basketsMap.set(item.lotId, item.basketCount);
    });
    
    // Arricchisci i dati dei lotti
    const enhancedLots = lotsList.map(lot => {
      const size = lot.sizeId !== null ? sizeMap.get(lot.sizeId) : null;
      const basketCount = basketsMap.get(lot.id) || 0;
      
      return {
        ...lot,
        size,
        basketCount,
        formattedArrivalDate: new Date(lot.arrivalDate).toLocaleDateString('it-IT')
      };
    });
    
    // Calcola statistiche globali per i lotti filtrati
    const statistics = await getLotStatistics(conditions);
    
    return {
      data: enhancedLots,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      statistics
    };
  } catch (error) {
    console.error("Errore nell'ottenere i lotti paginati:", error);
    throw error;
  }
}

/**
 * Calcola statistiche per i lotti filtrati
 * @param conditions Condizioni di filtro da applicare
 * @returns Statistiche sui lotti
 */
export async function getLotStatistics(conditions: any[] = []) {
  try {
    // Ottieni conteggio totale animali per qualità
    let qualityQuery = db.select({
      quality: lots.quality,
      totalAnimals: sql<number>`sum(${lots.animalCount})`
    })
    .from(lots)
    .groupBy(lots.quality);
    
    if (conditions.length > 0) {
      qualityQuery = qualityQuery.where(and(...conditions));
    }
    
    const qualityResults = await qualityQuery;
    
    // Organizza risultati in un oggetto
    const qualityBreakdown: Record<string, number> = {};
    let totalAnimals = 0;
    
    qualityResults.forEach(result => {
      const quality = result.quality || 'sconosciuta';
      const count = Number(result.totalAnimals) || 0;
      qualityBreakdown[quality] = count;
      totalAnimals += count;
    });
    
    return {
      totalAnimals,
      qualityBreakdown
    };
  } catch (error) {
    console.error("Errore nel calcolo delle statistiche dei lotti:", error);
    return {
      totalAnimals: 0,
      qualityBreakdown: {}
    };
  }
}