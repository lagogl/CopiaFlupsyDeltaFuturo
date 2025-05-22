import { db } from "../db";
import { 
  baskets,
  operations,
  cycles, 
  flupsys,
  sizes
} from "../../shared/schema";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

/**
 * Ottiene tutti i cestelli con paginazione e ottimizzazione delle query
 * @param page Numero di pagina (default: 1)
 * @param pageSize Dimensione della pagina (default: 20)
 * @param flupsyId Filtra per ID del FLUPSY (opzionale)
 * @param withActiveCycle Filtra solo cestelli con cicli attivi (opzionale)
 * @returns Dati cestelli paginati
 */
export async function getPaginatedBaskets(page = 1, pageSize = 20, flupsyId?: number, withActiveCycle?: boolean) {
  try {
    // Calcola offset per la paginazione
    const offset = (page - 1) * pageSize;
    
    // Costruisci la query di base con le condizioni di filtro
    let query = db.select()
      .from(baskets);
    
    let countQuery = db.select({ count: count() })
      .from(baskets);
    
    // Applica i filtri se specificati
    if (flupsyId !== undefined) {
      query = query.where(eq(baskets.flupsyId, flupsyId));
      countQuery = countQuery.where(eq(baskets.flupsyId, flupsyId));
    }
    
    // Esegui le query
    const basketsList = await query
      .limit(pageSize)
      .offset(offset);
    
    const totalCount = await countQuery;
    const total = totalCount[0]?.count || 0;
    
    // Se richiesto, filtra solo quelli con cicli attivi
    let enhancedBaskets = basketsList;
    
    if (withActiveCycle) {
      // Ottieni tutti gli ID dei cestelli
      const basketIds = basketsList.map(b => b.id);
      
      if (basketIds.length > 0) {
        // Ottieni i cicli attivi per questi cestelli in un'unica query
        const activeCyclesQuery = await db.select({
          basketId: cycles.basketId
        })
        .from(cycles)
        .where(
          and(
            inArray(cycles.basketId, basketIds),
            isNull(cycles.endDate)
          )
        );
        
        // Crea un set di ID cestelli con cicli attivi
        const basketsWithActiveCycle = new Set(activeCyclesQuery.map(c => c.basketId));
        
        // Filtra i cestelli
        enhancedBaskets = basketsList.filter(basket => basketsWithActiveCycle.has(basket.id));
      } else {
        enhancedBaskets = [];
      }
    }
    
    // Arricchisci i dati del cestello con informazioni sul FLUPSY e sul ciclo attivo
    if (enhancedBaskets.length > 0) {
      // Raccogli tutti gli ID dei FLUPSY
      const flupsyIds = enhancedBaskets
        .map(b => b.flupsyId)
        .filter((id): id is number => id !== null);
      
      // Ottieni tutti i FLUPSY in una sola query
      const flupsyMap = new Map();
      if (flupsyIds.length > 0) {
        const flupsyList = await db.select()
          .from(flupsys)
          .where(inArray(flupsys.id, flupsyIds));
        
        flupsyList.forEach(flupsy => {
          flupsyMap.set(flupsy.id, flupsy);
        });
      }
      
      // Ottieni i cicli attivi per tutti i cestelli in una sola query
      const basketIds = enhancedBaskets.map(b => b.id);
      const activeCyclesMap = new Map();
      
      if (basketIds.length > 0) {
        const activeCycles = await db.select()
          .from(cycles)
          .where(
            and(
              inArray(cycles.basketId, basketIds),
              isNull(cycles.endDate)
            )
          );
        
        activeCycles.forEach(cycle => {
          activeCyclesMap.set(cycle.basketId, cycle);
        });
      }
      
      // Arricchisci i dati con FLUPSY e ciclo in una sola passata
      enhancedBaskets = await Promise.all(enhancedBaskets.map(async (basket) => {
        // Aggiungi i dati del FLUPSY
        const flupsy = basket.flupsyId !== null ? flupsyMap.get(basket.flupsyId) || null : null;
        
        // Aggiungi i dati del ciclo attivo
        const activeCycle = activeCyclesMap.get(basket.id) || null;
        
        // Per i cestelli con ciclo attivo, ottieni l'ultima operazione con conteggio animali
        let lastOperation = null;
        if (activeCycle) {
          const operations_list = await db.select()
            .from(operations)
            .where(eq(operations.cycleId, activeCycle.id))
            .orderBy(desc(operations.date))
            .limit(5);
          
          // Trova la prima operazione con conteggio animali valido
          lastOperation = operations_list.find(op => op.animalCount !== null && op.animalCount > 0) || null;
          
          // Se c'è un'operazione e una taglia, ottieni i dati della taglia
          if (lastOperation && lastOperation.sizeId) {
            const size = await db.select()
              .from(sizes)
              .where(eq(sizes.id, lastOperation.sizeId))
              .limit(1);
            
            if (size.length > 0) {
              lastOperation = { ...lastOperation, size: size[0] };
            }
          }
        }
        
        // Componi il risultato finale
        return {
          ...basket,
          flupsy,
          activeCycle,
          lastOperation
        };
      }));
    }
    
    return {
      data: enhancedBaskets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    console.error("Errore nell'ottenere i cestelli paginati:", error);
    throw error;
  }
}