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
    
    // Queste query vengono eseguite in parallelo per massima efficienza
    const [basketsPromise, cyclesPromise, lotsPromise, recentOpsPromise, todayOpsPromise] = [
      // Query per recuperare i cestelli attivi (filtrata per flupsyId se necessario)
      (async () => {
        try {
          let query = db.select().from(baskets).where(eq(baskets.state, 'active'));
          if (flupsyIds.length > 0) {
            query = query.where(inArray(baskets.flupsyId, flupsyIds));
          }
          activeBasketsData = await query;
          console.log(`Dashboard: Recuperati ${activeBasketsData.length} cestelli attivi`);
        } catch (error) {
          console.error("Errore nel recupero dei cestelli attivi:", error);
        }
      })(),
      
      // Query per recuperare i cicli attivi
      (async () => {
        try {
          activeCyclesData = await db.select().from(cycles).where(eq(cycles.state, 'active'));
          console.log(`Dashboard: Recuperati ${activeCyclesData.length} cicli attivi`);
        } catch (error) {
          console.error("Errore nel recupero dei cicli attivi:", error);
        }
      })(),
      
      // Query per recuperare i lotti attivi
      (async () => {
        try {
          activeLotsData = await db.select().from(lots).where(eq(lots.state, 'active'));
          console.log(`Dashboard: Recuperati ${activeLotsData.length} lotti attivi`);
        } catch (error) {
          console.error("Errore nel recupero dei lotti attivi:", error);
        }
      })(),
      
      // Query per recuperare le operazioni recenti
      (async () => {
        try {
          recentOperationsData = await db.select().from(operations)
            .orderBy(desc(operations.date), desc(operations.id))
            .limit(50);
          console.log(`Dashboard: Recuperate ${recentOperationsData.length} operazioni recenti`);
        } catch (error) {
          console.error("Errore nel recupero delle operazioni recenti:", error);
        }
      })(),
      
      // Query per recuperare le operazioni di oggi
      (async () => {
        try {
          todayOperationsData = await db.select().from(operations)
            .where(eq(operations.date, today))
            .orderBy(desc(operations.id))
            .limit(20);
          console.log(`Dashboard: Recuperate ${todayOperationsData.length} operazioni di oggi`);
        } catch (error) {
          console.error("Errore nel recupero delle operazioni di oggi:", error);
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
      if (op.animalCount) {
        totalAnimalCount += op.animalCount;
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