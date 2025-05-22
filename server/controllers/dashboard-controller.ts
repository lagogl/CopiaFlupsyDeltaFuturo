import { Request, Response } from "express";
import { db } from "../db";
import { eq, inArray, sql, desc } from "drizzle-orm";
import { format } from "date-fns";
import { baskets, cycles, lots, operations } from "@shared/schema";
import { storage } from "../storage";

/**
 * Controller ottimizzato per la dashboard
 * Questo endpoint consolida 4+ chiamate API in una sola, riducendo drasticamente i tempi di caricamento
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  console.time('dashboard-stats');
  
  try {
    // Leggi i parametri di filtro
    const center = req.query.center as string;
    const flupsyIdsParam = req.query.flupsyIds as string;
    
    // Converte i flupsyIds in array di numeri se presente
    const flupsyIds = flupsyIdsParam ? flupsyIdsParam.split(',').map(id => parseInt(id, 10)) : [];
    
    // Esegue le query in parallelo per massimizzare la velocità
    // Usiamo try/catch individuali per prevenire che un errore in una query blocchi tutte le altre
    let activeBasketsData: any[] = [];
    let activeCyclesData: any[] = [];
    let activeLotsData: any[] = [];
    let recentOperationsData: any[] = [];
    let todayOperationsData: any[] = [];
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Query ottimizzate per prestazioni massime
    // 1. Query principale per ottenere cestelli con statistiche correlate
    try {
      // Query più efficiente per recuperare i cestelli attivi con join sulle operazioni più recenti
      const basketsQuery = db.select({
        basket: baskets,
        operationCount: sql`count(DISTINCT o.id)`.as('operation_count'),
        animalCount: sql`MAX(o.animal_count)`.as('animal_count')
      })
      .from(baskets)
      .leftJoin(
        operations.as('o'), 
        eq(baskets.id, operations.basketId)
      )
      .where(eq(baskets.state, 'active'))
      .groupBy(baskets.id);
      
      // Applica filtro per flupsyId se necessario
      if (flupsyIds.length > 0) {
        activeBasketsData = await basketsQuery.where(inArray(baskets.flupsyId, flupsyIds));
      } else {
        activeBasketsData = await basketsQuery;
      }
      
      // Estrai i dati puliti dei cestelli
      activeBasketsData = activeBasketsData.map(item => ({
        ...item.basket,
        operationCount: Number(item.operationCount || 0),
        animalCount: Number(item.animalCount || 0)
      }));
      
      console.log(`Dashboard: Recuperati ${activeBasketsData.length} cestelli attivi`);
    } catch (error) {
      console.error("Errore nel recupero dei cestelli attivi:", error);
    }
    
    // 2. Avvia le altre query in parallelo
    const [cyclesPromise, lotsPromise, operationsPromise] = [
      // Query ottimizzata per i cicli attivi
      (async () => {
        try {
          activeCyclesData = await db.select().from(cycles)
            .where(eq(cycles.state, 'active'))
            .limit(100);
          console.log(`Dashboard: Recuperati ${activeCyclesData.length} cicli attivi`);
        } catch (error) {
          console.error("Errore nel recupero dei cicli attivi:", error);
        }
      })(),
      
      // Query ottimizzata per i lotti attivi
      (async () => {
        try {
          activeLotsData = await db.select().from(lots)
            .where(eq(lots.state, 'active'))
            .limit(100);
          console.log(`Dashboard: Recuperati ${activeLotsData.length} lotti attivi`);
        } catch (error) {
          console.error("Errore nel recupero dei lotti attivi:", error);
        }
      })(),
      
      // Query ottimizzata per le operazioni (sia recenti che di oggi)
      (async () => {
        try {
          // Unifica le due query per ridurre il numero di richieste al database
          const allOperations = await db.select().from(operations)
            .orderBy(desc(operations.date), desc(operations.id))
            .limit(200);
          
          // Separa le operazioni recenti dalle operazioni di oggi
          const todayStr = today;
          recentOperationsData = allOperations;
          todayOperationsData = allOperations.filter(op => op.date === todayStr);
          
          console.log(`Dashboard: Recuperate ${recentOperationsData.length} operazioni totali, di cui ${todayOperationsData.length} di oggi`);
        } catch (error) {
          console.error("Errore nel recupero delle operazioni:", error);
        }
      })()
    ];
    
    // Attende che tutte le query siano completate
    await Promise.all([basketsPromise, cyclesPromise, lotsPromise, recentOpsPromise, todayOpsPromise]);
    
    // Trova l'operazione più recente per ogni cestello
    const lastOperationByBasket = new Map();
    for (const op of recentOperationsData) {
      if (!lastOperationByBasket.has(op.basketId) || 
          new Date(op.date) > new Date(lastOperationByBasket.get(op.basketId).date)) {
        lastOperationByBasket.set(op.basketId, op);
      }
    }
    
    // Converti la mappa in array
    const latestOperations = Array.from(lastOperationByBasket.values());
    
    // Calcola statistiche
    const totalActiveBaskets = activeBasketsData.length;
    const totalActiveCycles = activeCyclesData.length;
    const operationsToday = todayOperationsData.length;
    const totalActiveLots = activeLotsData.length;
    
    // Calcola la somma degli animali nelle operazioni più recenti
    let totalAnimalCount = 0;
    for (const op of latestOperations) {
      if (typeof op.animalCount === 'number') {
        totalAnimalCount += op.animalCount;
      }
    }
    
    // Se il conteggio è ancora 0, proviamo a sommare il numero di animali direttamente dall'ultima operazione per ogni cestello
    if (totalAnimalCount === 0) {
      for (const op of latestOperations) {
        const count = Number(op.animalCount);
        if (!isNaN(count) && count > 0) {
          totalAnimalCount += count;
        }
      }
    }
    
    // Timestamp dell'aggiornamento dati
    const updatedAt = Date.now();
    
    console.timeEnd('dashboard-stats');
    
    // Restituisci tutti i dati necessari in un'unica risposta
    res.json({
      baskets: activeBasketsData,
      cycles: activeCyclesData,
      operations: latestOperations,
      todayOperations: todayOperationsData,
      lots: activeLotsData,
      stats: {
        totalActiveBaskets,
        totalActiveCycles,
        operationsToday,
        totalActiveLots,
        animalCount: totalAnimalCount,
        updatedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Errore nel recupero delle statistiche dashboard:", error);
    res.status(500).json({ 
      error: "Errore nel recupero delle statistiche dashboard", 
      message: error.message 
    });
  }
};