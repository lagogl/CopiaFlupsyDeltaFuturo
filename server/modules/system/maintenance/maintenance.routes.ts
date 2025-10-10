/**
 * Modulo per route di manutenzione, test e debugging del sistema
 * Contiene endpoint di utilità per sviluppo e diagnostica
 */
import { Router, Request, Response } from "express";
import { sendError, sendSuccess } from "../../../utils/error-handler";
import { db } from "../../../db";
import { 
  eq, and, sql, desc, count, isNull, inArray 
} from "drizzle-orm";
import { 
  operations, baskets, flupsys, cycles, sizes, lots,
  basketLotComposition, lotLedger
} from "../../../../shared/schema";
import { 
  handleBasketLotCompositionOnUpdate 
} from "../../../services/basket-lot-composition.service";
import { storage } from "../../../storage";

export const maintenanceRoutes = Router();

/**
 * WORKAROUND: GET endpoint per aggiornare operazioni 
 * (quando i metodi POST/PATCH non funzionano da client specifici)
 */
maintenanceRoutes.get('/operations/:id/update', async (req: Request, res: Response) => {
  try {
    const operationId = parseInt(req.params.id);
    console.log(`📝 WORKAROUND GET UPDATE per operazione ${operationId}:`, req.query);
    
    if (isNaN(operationId)) {
      return res.status(400).json({ success: false, message: "Invalid operation ID" });
    }

    // Estrai i parametri dalla query string
    const updateData: any = {};
    if (req.query.notes) updateData.notes = req.query.notes;
    if (req.query.animalCount) updateData.animalCount = parseInt(req.query.animalCount as string);
    if (req.query.totalWeight) updateData.totalWeight = parseInt(req.query.totalWeight as string);
    if (req.query.averageWeight) updateData.averageWeight = parseFloat(req.query.averageWeight as string);

    // Recupera l'operazione esistente
    const [existingOperation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, operationId))
      .limit(1);

    if (!existingOperation) {
      return res.status(404).json({ success: false, message: "Operazione non trovata" });
    }

    // Aggiorna l'operazione nel database
    const [updatedOperation] = await db
      .update(operations)
      .set(updateData)
      .where(eq(operations.id, operationId))
      .returning();

    // Gestisci impatto su lotti misti se necessario
    await handleBasketLotCompositionOnUpdate(existingOperation, updateData);

    console.log(`✅ Operazione ${operationId} aggiornata con successo via workaround GET`);

    return sendSuccess(res, { 
      operation: updatedOperation,
      updated: true
    }, "Operazione aggiornata con successo");

  } catch (error) {
    return sendError(res, error, "Errore durante l'aggiornamento dell'operazione");
  }
});

/**
 * Route di test per verificare il routing e debugging
 * Solo per ambiente di sviluppo
 */
maintenanceRoutes.get('/test-delete/:id', async (req: Request, res: Response) => {
  console.log("🧪🧪🧪 TEST ROUTE CHIAMATA! 🧪🧪🧪");
  const id = req.params.id;
  console.log(`🧪 TEST: ID ricevuto: ${id}`);
  return res.json({ 
    message: "Test route funziona!", 
    id, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Endpoint per generare uno snapshot completo del database
 * Utile per debugging e test di vagliatura
 */
maintenanceRoutes.get('/database-snapshot', async (req: Request, res: Response) => {
  try {
    console.log('📊 Generazione snapshot database...');
    
    // 1. FLUPSYS CON CESTELLI E CICLI ATTIVI
    const flupsysData = await db
      .select({
        flupsy: flupsys,
        basket: baskets,
        cycle: cycles,
        lastOperation: {
          id: operations.id,
          type: operations.type,
          date: operations.date,
          totalWeight: operations.totalWeight,
          animalCount: operations.animalCount,
          averageWeight: operations.averageWeight,
          sizeId: operations.sizeId
        }
      })
      .from(flupsys)
      .leftJoin(baskets, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(cycles, and(
        eq(cycles.basketId, baskets.id),
        eq(cycles.state, 'active')
      ))
      .leftJoin(operations, sql`${operations.id} = (
        SELECT o.id FROM ${operations} o 
        WHERE o.basket_id = ${baskets.id} 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
      )`)
      .where(eq(flupsys.active, true))
      .orderBy(flupsys.name, baskets.physicalNumber);

    // 2. RAGGRUPPAMENTO PER FLUPSYS
    const flupsysMap = new Map();
    
    for (const row of flupsysData) {
      const flupsyId = row.flupsy.id;
      
      if (!flupsysMap.has(flupsyId)) {
        flupsysMap.set(flupsyId, {
          flupsy: row.flupsy,
          baskets: [],
          totalBaskets: 0,
          activeBaskets: 0,
          totalAnimals: 0,
          totalWeight: 0
        });
      }
      
      const flupsyData = flupsysMap.get(flupsyId);
      
      if (row.basket) {
        const basketInfo = {
          basket: row.basket,
          cycle: row.cycle,
          lastOperation: row.lastOperation,
          animals: row.lastOperation?.animalCount || 0,
          weight: row.lastOperation?.totalWeight || 0,
          averageWeight: row.lastOperation?.averageWeight || 0,
          hasActiveCycle: !!row.cycle
        };
        
        flupsyData.baskets.push(basketInfo);
        flupsyData.totalBaskets++;
        
        if (row.cycle) {
          flupsyData.activeBaskets++;
          flupsyData.totalAnimals += basketInfo.animals;
          flupsyData.totalWeight += basketInfo.weight;
        }
      }
    }

    // 3. LOTTI ATTIVI
    const activeLots = await db
      .select()
      .from(lots)
      .where(eq(lots.active, true))
      .orderBy(lots.supplier, lots.supplierLotNumber);

    // 4. OPERAZIONI RECENTI (ultime 50)
    const recentOperations = await db
      .select({
        operation: operations,
        basketPhysical: baskets.physicalNumber,
        flupsyName: flupsys.name,
        cycleName: sql`CONCAT('Ciclo-', ${cycles.id})`.as('cycleName'),
        sizeName: sizes.name
      })
      .from(operations)
      .leftJoin(baskets, eq(operations.basketId, baskets.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(sizes, eq(operations.sizeId, sizes.id))
      .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
      .limit(50);

    // 5. STATISTICHE GENERALI
    const [basketStats] = await db
      .select({
        totalBaskets: count(baskets.id),
        activeBaskets: count(sql`CASE WHEN ${baskets.currentCycleId} IS NOT NULL THEN 1 END`),
        availableBaskets: count(sql`CASE WHEN ${baskets.currentCycleId} IS NULL THEN 1 END`)
      })
      .from(baskets);

    const [operationStats] = await db
      .select({
        totalOperations: count(operations.id),
        activations: count(sql`CASE WHEN ${operations.type} = 'prima-attivazione' THEN 1 END`),
        weighings: count(sql`CASE WHEN ${operations.type} = 'pesata' THEN 1 END`),
        sales: count(sql`CASE WHEN ${operations.type} = 'vendita' THEN 1 END`)
      })
      .from(operations);

    // 6. COMPOSIZIONE LOTTI MISTI
    const mixedLotsData = await db
      .select({
        basketId: basketLotComposition.basketId,
        cycleId: basketLotComposition.cycleId,
        lotId: basketLotComposition.lotId,
        animalCount: basketLotComposition.animalCount,
        percentage: basketLotComposition.percentage,
        basketPhysical: baskets.physicalNumber
      })
      .from(basketLotComposition)
      .leftJoin(baskets, eq(basketLotComposition.basketId, baskets.id))
      .orderBy(basketLotComposition.basketId, desc(basketLotComposition.percentage));

    // Raggruppa per cestello
    const mixedLotsMap = new Map();
    for (const row of mixedLotsData) {
      if (!mixedLotsMap.has(row.basketId)) {
        mixedLotsMap.set(row.basketId, {
          basketId: row.basketId,
          basketPhysical: row.basketPhysical,
          cycleId: row.cycleId,
          lots: [],
          totalLots: 0,
          isMixed: false
        });
      }
      
      const basketData = mixedLotsMap.get(row.basketId);
      basketData.lots.push({
        lotId: row.lotId,
        animalCount: row.animalCount,
        percentage: row.percentage
      });
      basketData.totalLots++;
      basketData.isMixed = basketData.totalLots > 1;
    }

    // Costruisci il risultato finale
    const snapshot = {
      timestamp: new Date().toISOString(),
      flupsys: Array.from(flupsysMap.values()),
      activeLots,
      recentOperations,
      statistics: {
        baskets: basketStats,
        operations: operationStats
      },
      mixedLots: {
        totalMixedBaskets: Array.from(mixedLotsMap.values()).filter(b => b.isMixed).length,
        baskets: Array.from(mixedLotsMap.values())
      }
    };

    console.log('✅ Snapshot database generato con successo');
    return sendSuccess(res, { snapshot }, "Snapshot database generato");
    
  } catch (error) {
    return sendError(res, error, "Errore durante la generazione dello snapshot");
  }
});

/**
 * Route per invalidare manualmente la cache delle operazioni
 */
maintenanceRoutes.get('/operations-cache-clear', async (req: Request, res: Response) => {
  try {
    console.log('🗑️ Pulizia cache operazioni richiesta...');
    
    // Chiama il metodo di invalidazione cache del controller operations
    const { invalidateUnifiedCache } = await import("../../../controllers/operations-unified-controller");
    invalidateUnifiedCache();
    
    return sendSuccess(res, { 
      cleared: true,
      timestamp: new Date().toISOString()
    }, "Cache operazioni invalidata con successo");
    
  } catch (error) {
    return sendError(res, error, "Errore durante l'invalidazione della cache");
  }
});

/**
 * Route di emergenza per eliminazione diretta
 * ATTENZIONE: Usare solo in caso di emergenza!
 */
maintenanceRoutes.delete('/emergency-delete/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🚨 EMERGENZA: Richiesta eliminazione diretta operazione ${id}`);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "ID operazione non valido" 
      });
    }

    // Recupera l'operazione prima di eliminarla
    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);

    if (!operation) {
      return res.status(404).json({ 
        success: false, 
        message: "Operazione non trovata" 
      });
    }

    // Elimina l'operazione
    const [deleted] = await db
      .delete(operations)
      .where(eq(operations.id, id))
      .returning();

    console.log(`✅ EMERGENZA: Operazione ${id} eliminata con successo`);
    
    return sendSuccess(res, { 
      deleted: true,
      operation: deleted 
    }, "Operazione eliminata con successo (modalità emergenza)");
    
  } catch (error) {
    return sendError(res, error, "Errore durante l'eliminazione di emergenza");
  }
});