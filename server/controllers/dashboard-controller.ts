import { Request, Response } from "express";
import { db } from "../db";
import { format } from "date-fns";
import { storage } from "../storage";
import { eq, desc, and, gt, isNotNull } from "drizzle-orm";
import { baskets, cycles, lots, operations } from "@shared/schema";

/**
 * Controller ottimizzato per la dashboard
 * Questo endpoint consolida 4+ chiamate API in una sola, riducendo drasticamente i tempi di caricamento
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Leggi i parametri di filtro
    const flupsyIdsParam = req.query.flupsyIds as string;
    
    // Converte i flupsyIds in array di numeri se presente
    const flupsyIds = flupsyIdsParam ? flupsyIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
    
    // Prepara i contenitori per i risultati
    let activeBasketsData: any[] = [];
    let activeCyclesData: any[] = [];
    let activeLotsData: any[] = [];
    let recentOperationsData: any[] = [];
    let todayOperationsData: any[] = [];
    
    const today = format(new Date(), 'yyyy-MM-dd');
    let totalAnimalCount = 0;
    
    // Eseguiamo le query SQL direttamente per evitare problemi di tipizzazione e ottimizzare le prestazioni
    try {
      // Utilizziamo metodi semplici e diretti di Drizzle ORM
      // 1. Recupera i cestelli attivi
      if (flupsyIds.length > 0) {
        activeBasketsData = await db
          .select()
          .from(baskets)
          .where(
            and(
              eq(baskets.state, 'active'),
              inArray(baskets.flupsyId, flupsyIds)
            )
          );
      } else {
        activeBasketsData = await db
          .select()
          .from(baskets)
          .where(eq(baskets.state, 'active'));
      }
      console.log(`Dashboard: Recuperati ${activeBasketsData.length} cestelli attivi`);
      
      // 2. Recupera i cicli attivi
      activeCyclesData = await db
        .select()
        .from(cycles)
        .where(eq(cycles.state, 'active'))
        .limit(100);
      console.log(`Dashboard: Recuperati ${activeCyclesData.length} cicli attivi`);
      
      // 3. Recupera i lotti attivi
      activeLotsData = await db
        .select()
        .from(lots)
        .where(eq(lots.state, 'active'))
        .limit(100);
      console.log(`Dashboard: Recuperati ${activeLotsData.length} lotti attivi`);
      
      // 4. Recupera le operazioni recenti
      recentOperationsData = await db
        .select()
        .from(operations)
        .orderBy(desc(operations.date), desc(operations.id))
        .limit(200);
      console.log(`Dashboard: Recuperate ${recentOperationsData.length} operazioni recenti`);
      
      // 5. Filtra le operazioni di oggi
      todayOperationsData = recentOperationsData.filter(op => op.date === today);
      console.log(`Dashboard: Filtrate ${todayOperationsData.length} operazioni di oggi`);
      
      // 6. Recupera il conteggio degli animali con una query SQL nativa
      const animalCountQuery = `
        WITH LastOperationWithCount AS (
          SELECT DISTINCT ON (basket_id) 
            basket_id, 
            animal_count
          FROM operations
          WHERE animal_count IS NOT NULL AND animal_count > 0
          ORDER BY basket_id, date DESC, id DESC
        )
        SELECT basket_id, animal_count FROM LastOperationWithCount
      `;
      
      const animalCounts = await db.execute(animalCountQuery);
      
      // Associa i conteggi animali ai cestelli corrispondenti
      const animalCountByBasket = new Map();
      
      // Processa i risultati della query SQL
      if (animalCounts.rows && animalCounts.rows.length > 0) {
        // Elabora i risultati
        for (const row of animalCounts.rows) {
          const basketId = Number(row.basket_id);
          const count = Number(row.animal_count);
          
          if (!isNaN(basketId) && !isNaN(count) && count > 0) {
            animalCountByBasket.set(basketId, count);
          }
        }
        
        // Aggiorna i dati dei cestelli con i conteggi degli animali
        activeBasketsData = activeBasketsData.map(basket => ({
          ...basket,
          animalCount: animalCountByBasket.get(Number(basket.id)) || 0
        }));
        
        // Calcola il totale degli animali
        for (const count of animalCountByBasket.values()) {
          totalAnimalCount += count;
        }
        
        console.log(`Dashboard: Calcolato conteggio animali totale: ${totalAnimalCount}`);
      }
      
      // Trova l'ultima operazione per ogni cestello (priorità a quelle con conteggio animali)
      const lastOperationByBasket = new Map();
      
      // Prima le operazioni con conteggio animali
      for (const op of recentOperationsData) {
        const basketId = Number(op.basket_id);
        const hasCount = op.animal_count && Number(op.animal_count) > 0;
        
        if (hasCount && !lastOperationByBasket.has(basketId)) {
          lastOperationByBasket.set(basketId, op);
        }
      }
      
      // Poi le altre operazioni
      for (const op of recentOperationsData) {
        const basketId = Number(op.basket_id);
        
        if (!lastOperationByBasket.has(basketId)) {
          lastOperationByBasket.set(basketId, op);
        }
      }
      
      const latestOperations = Array.from(lastOperationByBasket.values());
      
      // Calcola le statistiche finali
      const totalActiveBaskets = activeBasketsData.length;
      const totalActiveCycles = activeCyclesData.length;
      const operationsToday = todayOperationsData.length;
      const totalActiveLots = activeLotsData.length;
      
      // Se ancora non abbiamo conteggio animali, utilizziamo un'altra strategia
      if (totalAnimalCount === 0) {
        // Tenta una query separata per ottenere la somma
        try {
          const sumResult = await db.execute(`
            SELECT SUM(animal_count) as total_count 
            FROM operations 
            WHERE animal_count IS NOT NULL AND animal_count > 0
          `);
          
          if (sumResult.rows && sumResult.rows.length > 0) {
            const count = Number(sumResult.rows[0].total_count);
            if (!isNaN(count) && count > 0) {
              totalAnimalCount = count;
              console.log(`Dashboard: Recuperato conteggio animali alternativo: ${totalAnimalCount}`);
            }
          }
        } catch (err) {
          console.error("Errore nel recupero del conteggio animali alternativo:", err);
        }
      }
      
      // Timestamp dell'aggiornamento dati
      const updatedAt = Date.now();
      
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
      console.error("Errore nell'esecuzione delle query:", error);
      res.status(500).json({ 
        error: "Errore nel recupero delle statistiche dashboard", 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Errore globale nel controller dashboard:", error);
    res.status(500).json({ 
      error: "Errore nel recupero delle statistiche dashboard", 
      message: error instanceof Error ? error.message : String(error)
    });
  }
};