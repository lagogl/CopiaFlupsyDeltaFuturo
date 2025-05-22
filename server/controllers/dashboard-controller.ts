import { Request, Response } from "express";
import { db } from "../db";
import { eq, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";
import { baskets, cycles, lots, operations } from "@shared/schema";
import { storage } from "../storage";
import { PgSelect } from "drizzle-orm/pg-core";

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
    
    // Costruisci la query SQL ottimizzata direttamente per recuperare le ultime operazioni per cestello
    // Utilizzando SQL nativo per massimizzare le prestazioni
    
    // Query SQL per recuperare l'ultima operazione per ogni cestello
    const latestOperationsSql = flupsyIds.length > 0
      ? sql`
          WITH ranked_operations AS (
            SELECT 
              o.*,
              ROW_NUMBER() OVER (PARTITION BY o.basket_id ORDER BY o.date DESC, o.id DESC) as rn
            FROM operations o
            JOIN baskets b ON o.basket_id = b.id
            WHERE b.state = 'active' AND b.flupsy_id IN (${flupsyIds.join(',')})
          )
          SELECT * FROM ranked_operations WHERE rn = 1
        `
      : sql`
          WITH ranked_operations AS (
            SELECT 
              o.*,
              ROW_NUMBER() OVER (PARTITION BY o.basket_id ORDER BY o.date DESC, o.id DESC) as rn
            FROM operations o
            JOIN baskets b ON o.basket_id = b.id
            WHERE b.state = 'active'
          )
          SELECT * FROM ranked_operations WHERE rn = 1
        `;
    
    // Query per recuperare le operazioni di oggi - ottimizzata
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayOperationsSql = flupsyIds.length > 0
      ? sql`
          SELECT o.* FROM operations o
          JOIN baskets b ON o.basket_id = b.id
          WHERE b.state = 'active' AND o.date = ${today}
          AND b.flupsy_id IN (${flupsyIds.join(',')})
        `
      : sql`
          SELECT o.* FROM operations o
          JOIN baskets b ON o.basket_id = b.id
          WHERE b.state = 'active' AND o.date = ${today}
        `;

    // Esegue le query in parallelo per massimizzare la velocità
    // Usiamo try/catch individuali per prevenire che un errore in una query blocchi tutte le altre
    
    let activeBasketsData = [];
    let activeCyclesData = [];
    let activeLotsData = [];
    let recentOperations = [];
    let todayOperationsData = [];
    
    try {
      // Query cestelli già definita sopra
      activeBasketsData = await basketsQuery;
      console.log(`Dashboard: Recuperati ${activeBasketsData.length} cestelli attivi`);
    } catch (error) {
      console.error("Errore nel recupero dei cestelli attivi:", error);
    }
    
    try {
      // Query per recuperare solo i cicli attivi
      activeCyclesData = await db.select().from(cycles).where(eq(cycles.state, 'active'));
      console.log(`Dashboard: Recuperati ${activeCyclesData.length} cicli attivi`);
    } catch (error) {
      console.error("Errore nel recupero dei cicli attivi:", error);
    }
    
    try {
      // Query per recuperare solo i lotti attivi
      activeLotsData = await db.select().from(lots).where(eq(lots.state, 'active'));
      console.log(`Dashboard: Recuperati ${activeLotsData.length} lotti attivi`);
    } catch (error) {
      console.error("Errore nel recupero dei lotti attivi:", error);
    }
    
    try {
      // Query ottimizzata per le operazioni più recenti
      recentOperations = await db.execute(latestOperationsSql);
      console.log(`Dashboard: Recuperate ${recentOperations.length} operazioni recenti`);
    } catch (error) {
      console.error("Errore nel recupero delle operazioni recenti:", error);
    }
    
    try {
      // Query ottimizzata per le operazioni di oggi
      todayOperationsData = await db.execute(todayOperationsSql);
      console.log(`Dashboard: Recuperate ${todayOperationsData.length} operazioni di oggi`);
    } catch (error) {
      console.error("Errore nel recupero delle operazioni di oggi:", error);
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