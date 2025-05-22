import { Request, Response } from "express";
import { db } from "../db";
import { eq, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";
import { baskets, cycles, lots, operations } from "@shared/schema";

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
    
    // Query per recuperare SOLO i cestelli attivi (o filtrati)
    let basketsQuery = db.select().from(baskets).where(eq(baskets.state, 'active'));
    
    // Applica filtri aggiuntivi se specificati
    if (flupsyIds.length > 0) {
      basketsQuery = basketsQuery.where(inArray(baskets.flupsyId, flupsyIds));
    }
    
    // Esegue le query in parallelo per massimizzare la velocità
    const [
      activeBasketsData,
      activeCyclesData,
      activeLotsData
    ] = await Promise.all([
      // Query cestelli già definita sopra
      basketsQuery,
      
      // Query per recuperare solo i cicli attivi
      db.select().from(cycles).where(eq(cycles.state, 'active')),
      
      // Query per recuperare solo i lotti attivi
      db.select().from(lots).where(eq(lots.state, 'active'))
    ]);
    
    // Recupera gli ID dei cestelli per filtrare le operazioni
    const basketIds = activeBasketsData.map(b => b.id);
    
    let todayOperationsData: any[] = [];
    let recentOperations: any[] = [];
    
    if (basketIds.length > 0) {
      // Query per recuperare le operazioni di oggi
      const today = format(new Date(), 'yyyy-MM-dd');
      todayOperationsData = await db.select()
        .from(operations)
        .where(eq(operations.date, today))
        .where(inArray(operations.basketId, basketIds));
      
      // Query per recuperare solo le operazioni più recenti per ogni cestello
      recentOperations = await db.select()
        .from(operations)
        .where(inArray(operations.basketId, basketIds))
        .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`);
    }
    
    // Trova l'operazione più recente per ogni cestello
    const lastOperationByBasket = new Map();
    recentOperations.forEach(op => {
      if (!lastOperationByBasket.has(op.basketId)) {
        lastOperationByBasket.set(op.basketId, op);
      }
    });
    
    // Converti la mappa in array
    const latestOperations = Array.from(lastOperationByBasket.values());
    
    console.timeEnd('dashboard-stats');
    
    // Restituisci tutti i dati necessari in un'unica risposta
    res.status(200).json({
      baskets: activeBasketsData,
      cycles: activeCyclesData,
      operations: latestOperations,
      todayOperations: todayOperationsData,
      lots: activeLotsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Errore nel recupero delle statistiche dashboard:", error);
    res.status(500).json({ error: "Errore nel recupero delle statistiche dashboard" });
  }
};