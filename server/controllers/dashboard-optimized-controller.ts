import { db } from "../db";
import { 
  baskets,
  operations,
  cycles, 
  flupsys,
  sizes,
  lots
} from "../../shared/schema";
import { and, count, desc, eq, inArray, isNull, sql, sum } from "drizzle-orm";

/**
 * Ottiene le statistiche generali della dashboard in modo ottimizzato
 * Utilizza aggregazioni SQL anziché multipli cicli for e query annidate
 */
export async function getDashboardStatistics() {
  try {
    // Ottieni le statistiche dei FLUPSY in un'unica query aggregata
    const flupsyStats = await db.select({
      totalFlupsys: count(flupsys.id),
      // Posizioni totali (massime)
      totalPositions: sum(flupsys.maxPositions),
    })
    .from(flupsys);
    
    // Ottieni le statistiche dei cestelli in un'unica query
    const basketStats = await db.select({
      totalBaskets: count(baskets.id),
      // Cestelli attivi sono quelli con un ciclo attivo
      activeBaskets: sql<number>`
        (SELECT COUNT(DISTINCT b.id) 
         FROM ${baskets} b 
         JOIN ${cycles} c ON b.id = c.basket_id 
         WHERE c.end_date IS NULL)
      `,
      // Posizioni occupate sono il numero totale di cestelli
      occupiedPositions: count(baskets.id),
    })
    .from(baskets);
    
    // Calcola le posizioni libere
    const totalPositions = flupsyStats[0]?.totalPositions || 0;
    const occupiedPositions = basketStats[0]?.occupiedPositions || 0;
    const freePositions = Math.max(0, Number(totalPositions) - occupiedPositions);
    
    // Ottieni il numero totale di cicli attivi
    const activeCyclesStats = await db.select({
      activeCycles: count()
    })
    .from(cycles)
    .where(isNull(cycles.endDate));
    
    // Recupera gli ID dei cicli attivi per i dettagli
    const activeCyclesQuery = await db.select({
      id: cycles.id,
      basketId: cycles.basketId
    })
    .from(cycles)
    .where(isNull(cycles.endDate));
    
    const activeCycleIds = activeCyclesQuery.map(c => c.id);
    
    // Ottieni le statistiche sugli animali dai cicli attivi in modo efficiente
    let totalAnimals = 0;
    let sizeDistribution: Record<string, number> = {};
    
    if (activeCycleIds.length > 0) {
      // Ottieni l'ultima operazione per ogni ciclo attivo con animalCount > 0 in un'unica query complessa
      // Nota: questa è una query avanzata che utilizza le funzioni window di SQL
      const lastOperationsQuery = await db.execute(sql`
        WITH ranked_ops AS (
          SELECT 
            o.*,
            ROW_NUMBER() OVER (PARTITION BY o.cycle_id ORDER BY o.date DESC) as rn
          FROM operations o
          WHERE o.cycle_id IN (${sql.join(activeCycleIds)})
            AND o.animal_count IS NOT NULL 
            AND o.animal_count > 0
        )
        SELECT * FROM ranked_ops WHERE rn = 1
      `);
      
      // Converti i risultati in un formato utilizzabile
      const lastOperations = lastOperationsQuery.rows as any[];
      
      // Recupera tutte le taglie necessarie in una sola query
      const sizeIds = lastOperations
        .map(op => op.size_id)
        .filter(id => id !== null);
      
      const sizesMap = new Map();
      
      if (sizeIds.length > 0) {
        const sizesData = await db.select()
          .from(sizes)
          .where(inArray(sizes.id, sizeIds));
        
        sizesData.forEach(size => {
          sizesMap.set(size.id, size);
        });
      }
      
      // Elabora le operazioni per calcolare le statistiche
      lastOperations.forEach(op => {
        if (op.animal_count) {
          const animalCount = Number(op.animal_count);
          totalAnimals += animalCount;
          
          // Aggiungi alla distribuzione per taglia
          if (op.size_id) {
            const size = sizesMap.get(op.size_id);
            if (size) {
              const sizeCode = size.code;
              sizeDistribution[sizeCode] = (sizeDistribution[sizeCode] || 0) + animalCount;
            }
          }
        }
      });
    }
    
    // Recupera informazioni sui lotti attivi
    const lotStats = await db.select({
      totalLots: count(),
      activeLots: sql<number>`SUM(CASE WHEN state = 'attivo' THEN 1 ELSE 0 END)`,
      availableLots: sql<number>`SUM(CASE WHEN state = 'disponibile' THEN 1 ELSE 0 END)`,
      soldLots: sql<number>`SUM(CASE WHEN state = 'venduto' THEN 1 ELSE 0 END)`,
    })
    .from(lots);
    
    // Recupera statistiche sulle operazioni
    const recentOperationsCount = await db.select({
      count: count(),
      // Operazioni degli ultimi 30 giorni
      recentCount: sql<number>`
        SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END)
      `,
    })
    .from(operations);
    
    // Componi le statistiche finali
    return {
      flupsys: {
        total: flupsyStats[0]?.totalFlupsys || 0,
        totalPositions: Number(totalPositions),
        occupiedPositions,
        freePositions,
        occupationPercentage: totalPositions > 0 
          ? Math.round((occupiedPositions / Number(totalPositions)) * 100)
          : 0
      },
      baskets: {
        total: basketStats[0]?.totalBaskets || 0,
        active: basketStats[0]?.activeBaskets || 0,
        available: (basketStats[0]?.totalBaskets || 0) - (basketStats[0]?.activeBaskets || 0)
      },
      cycles: {
        active: activeCyclesStats[0]?.activeCycles || 0
      },
      animals: {
        total: totalAnimals,
        sizeDistribution
      },
      lots: {
        total: lotStats[0]?.totalLots || 0,
        active: lotStats[0]?.activeLots || 0,
        available: lotStats[0]?.availableLots || 0,
        sold: lotStats[0]?.soldLots || 0
      },
      operations: {
        total: recentOperationsCount[0]?.count || 0,
        recent: recentOperationsCount[0]?.recentCount || 0
      }
    };
  } catch (error) {
    console.error("Errore nell'ottenere le statistiche della dashboard:", error);
    throw error;
  }
}