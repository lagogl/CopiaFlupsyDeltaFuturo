import { db } from "../db";
import { 
  cycles, 
  operations, 
  sizes, 
  baskets,
  flupsys
} from "../../shared/schema";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

// Tipo per le statistiche dei FLUPSY
export interface FlupsyStatistics {
  totalBaskets: number;
  activeBaskets: number;
  availableBaskets: number;
  occupationPercentage: number;
  totalAnimals: number;
  sizeDistribution: Record<string, number>;
  basketsWithAnimals: number;
}

/**
 * Funzione per calcolare statistiche di un singolo FLUPSY
 * @param flupsyId ID del FLUPSY
 * @returns Statistiche complete del FLUPSY
 */
export async function getFlupsyStatistics(flupsyId: number): Promise<FlupsyStatistics> {
  try {
    // Ottieni informazioni sui cestelli nel FLUPSY
    const basketStats = await db.select({
      totalBaskets: count()
    })
    .from(baskets)
    .where(eq(baskets.flupsyId, flupsyId));
    
    const totalBaskets = basketStats[0]?.totalBaskets || 0;
    
    // Se non ci sono cestelli, restituisci statistiche vuote
    if (totalBaskets === 0) {
      return {
        totalBaskets: 0,
        activeBaskets: 0,
        availableBaskets: 0,
        occupationPercentage: 0,
        totalAnimals: 0,
        sizeDistribution: {},
        basketsWithAnimals: 0
      };
    }
    
    // Ottieni i cestelli in questo FLUPSY
    const basketsQuery = await db.select({ id: baskets.id })
      .from(baskets)
      .where(eq(baskets.flupsyId, flupsyId));
    
    const basketIds = basketsQuery.map(b => b.id);
    
    // Conta i cicli attivi
    const activeCyclesCount = await db.select({ count: count() })
      .from(cycles)
      .where(
        and(
          inArray(cycles.basketId, basketIds),
          isNull(cycles.endDate)
        )
      );
    
    const activeBaskets = activeCyclesCount[0]?.count || 0;
    const availableBaskets = totalBaskets - activeBaskets;
    
    // Ottieni il FLUPSY per le informazioni sulla capacità
    const flupsyInfo = await db.select()
      .from(flupsys)
      .where(eq(flupsys.id, flupsyId))
      .limit(1);
    
    // Calcola le posizioni occupate e libere
    const maxPositions = flupsyInfo[0]?.maxPositions || 0;
    const occupiedPositions = totalBaskets;
    const occupationPercentage = maxPositions > 0 
      ? Math.round((occupiedPositions / maxPositions) * 100) 
      : 0;
    
    // Ottieni i cicli attivi
    const activeCycles = await db.select()
      .from(cycles)
      .where(
        and(
          inArray(cycles.basketId, basketIds),
          isNull(cycles.endDate)
        )
      );
    
    // Ottieni le statistiche sugli animali
    let totalAnimals = 0;
    let basketsWithAnimals = 0;
    const sizeDistribution: Record<string, number> = {};
    
    // Usa una query più efficiente per ottenere l'ultima operazione per ogni ciclo
    const cycleIds = activeCycles.map(cycle => cycle.id);
    
    if (cycleIds.length > 0) {
      // Strategia ottimizzata
      const latestOperations = await db.select({
        cycleId: operations.cycleId,
        animalCount: operations.animalCount,
        sizeId: operations.sizeId
      })
      .from(operations)
      .where(inArray(operations.cycleId, cycleIds))
      .orderBy(desc(operations.date));
      
      // Mappa per tenere traccia dell'ultima operazione per ciascun ciclo
      const cycleToOperation = new Map();
      
      // Filtra solo l'ultima operazione valida per ciascun ciclo
      for (const operation of latestOperations) {
        if (!cycleToOperation.has(operation.cycleId) && 
            operation.animalCount !== null && 
            operation.animalCount > 0) {
          cycleToOperation.set(operation.cycleId, operation);
        }
      }
      
      // Ottieni le taglie in un'unica query
      const sizeIds = Array.from(cycleToOperation.values())
        .map(op => op.sizeId)
        .filter(sizeId => sizeId !== null);
      
      // Mappa delle taglie
      const sizeMap = new Map();
      
      if (sizeIds.length > 0) {
        const sizeData = await db.select()
          .from(sizes)
          .where(inArray(sizes.id, sizeIds as number[]));
        
        for (const size of sizeData) {
          sizeMap.set(size.id, size.code);
        }
      }
      
      // Elabora le operazioni e calcola le statistiche
      for (const operation of cycleToOperation.values()) {
        if (operation.animalCount !== null && operation.animalCount > 0) {
          totalAnimals += operation.animalCount;
          basketsWithAnimals++;
          
          // Aggiungi alla distribuzione per taglia
          const sizeCode = operation.sizeId !== null ? sizeMap.get(operation.sizeId) || 'Sconosciuta' : 'Sconosciuta';
          sizeDistribution[sizeCode] = (sizeDistribution[sizeCode] || 0) + operation.animalCount;
        }
      }
    }
    
    return {
      totalBaskets,
      activeBaskets,
      availableBaskets,
      occupationPercentage,
      totalAnimals,
      sizeDistribution,
      basketsWithAnimals
    };
  } catch (error) {
    console.error(`Errore nel calcolo delle statistiche del FLUPSY ${flupsyId}:`, error);
    return {
      totalBaskets: 0,
      activeBaskets: 0,
      availableBaskets: 0,
      occupationPercentage: 0,
      totalAnimals: 0,
      sizeDistribution: {},
      basketsWithAnimals: 0
    };
  }
}

/**
 * Ottiene tutti i FLUPSY con statistiche ottimizzate e paginazione
 * @param page Numero di pagina (default: 1)
 * @param pageSize Dimensione della pagina (default: 10)
 * @param includeStats Includere statistiche dettagliate (default: false)
 * @returns Dati FLUPSY paginati con statistiche
 */
export async function getPaginatedFlupsys(page = 1, pageSize = 10, includeStats = false) {
  try {
    // Calcola offset per la paginazione
    const offset = (page - 1) * pageSize;
    
    // Query di base per ottenere i FLUPSY con paginazione
    const flupsysList = await db.select()
      .from(flupsys)
      .limit(pageSize)
      .offset(offset);
    
    // Query per contare il numero totale di FLUPSY (per la paginazione)
    const totalCount = await db.select({ count: count() })
      .from(flupsys);
    
    const total = totalCount[0]?.count || 0;
    
    // Se non servono statistiche dettagliate, restituisci subito i risultati base
    if (!includeStats) {
      return {
        data: flupsysList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    }
    
    // Ottieni statistiche ottimizzate per i FLUPSY nella pagina corrente
    const enhancedFlupsys = await Promise.all(flupsysList.map(async (flupsy) => {
      // Ottieni statistiche baskets in un'unica query
      const basketStats = await db.select({
        totalBaskets: count()
      })
      .from(baskets)
      .where(eq(baskets.flupsyId, flupsy.id));
      
      const totalBaskets = basketStats[0]?.totalBaskets || 0;
      
      // Ottieni i basket IDs in un'unica query per riutilizzarli
      const basketsQuery = await db.select({ id: baskets.id })
        .from(baskets)
        .where(eq(baskets.flupsyId, flupsy.id));
      
      const basketIds = basketsQuery.map(b => b.id);
      
      // Se non ci sono cestelli, restituisci statistiche vuote
      if (basketIds.length === 0) {
        return {
          ...flupsy,
          statistics: {
            totalBaskets: 0,
            activeBaskets: 0,
            availableBaskets: 0,
            occupationPercentage: 0,
            totalAnimals: 0,
            sizeDistribution: {},
            basketsWithAnimals: 0
          }
        };
      }
      
      // Conta i cicli attivi in un'unica query
      const activeCyclesCount = await db.select({ count: count() })
        .from(cycles)
        .where(
          and(
            inArray(cycles.basketId, basketIds),
            isNull(cycles.endDate)
          )
        );
      
      const activeBaskets = activeCyclesCount[0]?.count || 0;
      const availableBaskets = totalBaskets - activeBaskets;
      
      // Calcola le posizioni occupate e libere
      const maxPositions = flupsy.maxPositions || 0;
      const occupiedPositions = totalBaskets;
      const freePositions = Math.max(0, maxPositions - occupiedPositions);
      const occupationPercentage = maxPositions > 0 
        ? Math.round((occupiedPositions / maxPositions) * 100) 
        : 0;
      
      // Ottieni i cicli attivi
      const activeCycles = await db.select()
        .from(cycles)
        .where(
          and(
            inArray(cycles.basketId, basketIds),
            isNull(cycles.endDate)
          )
        );
      
      // Ottieni le statistiche sugli animali in modo ottimizzato
      let totalAnimals = 0;
      let basketsWithAnimals = 0;
      let sizeDistribution: Record<string, number> = {};
      
      // Usa una query più efficiente per ottenere l'ultima operazione per ogni ciclo
      const cycleIds = activeCycles.map(cycle => cycle.id);
      
      if (cycleIds.length > 0) {
        // Strategia ottimizzata: ottieni tutte le ultime operazioni in un'unica query
        // Questa è una query complessa ma evita di fare N query per N cicli
        const latestOperations = await db.select({
          cycleId: operations.cycleId,
          animalCount: operations.animalCount,
          sizeId: operations.sizeId
        })
        .from(operations)
        .where(inArray(operations.cycleId, cycleIds))
        .orderBy(desc(operations.date));
        
        // Mappa per tenere traccia dell'ultima operazione per ciascun ciclo
        const cycleToOperation = new Map();
        
        // Filtra solo l'ultima operazione valida per ciascun ciclo
        for (const operation of latestOperations) {
          if (!cycleToOperation.has(operation.cycleId) && 
              operation.animalCount !== null && 
              operation.animalCount > 0) {
            cycleToOperation.set(operation.cycleId, operation);
          }
        }
        
        // Ora recuperiamo le taglie in una sola query per tutte le operazioni
        const sizeIds = Array.from(cycleToOperation.values())
          .map(op => op.sizeId)
          .filter(sizeId => sizeId !== null);
        
        // Mappa delle taglie
        const sizeMap = new Map();
        
        if (sizeIds.length > 0) {
          const sizeData = await db.select()
            .from(sizes)
            .where(inArray(sizes.id, sizeIds as number[]));
          
          for (const size of sizeData) {
            sizeMap.set(size.id, size.code);
          }
        }
        
        // Elabora le operazioni e calcola le statistiche
        for (const operation of cycleToOperation.values()) {
          if (operation.animalCount !== null && operation.animalCount > 0) {
            totalAnimals += operation.animalCount;
            basketsWithAnimals++;
            
            // Aggiungi alla distribuzione per taglia
            const sizeCode = operation.sizeId !== null ? sizeMap.get(operation.sizeId) || 'Sconosciuta' : 'Sconosciuta';
            sizeDistribution[sizeCode] = (sizeDistribution[sizeCode] || 0) + operation.animalCount;
          }
        }
      }
      
      return {
        ...flupsy,
        statistics: {
          totalBaskets,
          activeBaskets,
          availableBaskets,
          occupationPercentage,
          totalAnimals,
          sizeDistribution,
          basketsWithAnimals
        }
      };
    }));
    
    return {
      data: enhancedFlupsys,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    console.error("Errore nell'ottenere i FLUPSY paginati:", error);
    throw error;
  }
}