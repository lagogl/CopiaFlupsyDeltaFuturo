/**
 * Controller per la gestione delle operazioni di Selezione
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { 
  selections, 
  selectionSourceBaskets, 
  selectionDestinationBaskets, 
  selectionBasketHistory, 
  selectionLotReferences,
  operations,
  cycles,
  baskets,
  basketPositionHistory
} from "../../shared/schema";
import { format } from "date-fns";

/**
 * Ottiene il prossimo numero di selezione disponibile
 */
export async function getNextSelectionNumber(transaction: any = db): Promise<number> {
  // Selezioniamo il massimo selectionNumber esistente
  const result = await transaction.select({
    maxNumber: sql`MAX(selection_number)`.as("max_number")
  }).from(selections);
  
  // Se non ci sono selezioni, inizia da 1
  if (!result || !result[0] || !result[0].maxNumber) {
    return 1;
  }
  
  // Altrimenti incrementa di 1
  return result[0].maxNumber + 1;
}

/**
 * Ottiene tutte le selezioni, con filtri opzionali
 */
export async function getSelections(req: Request, res: Response) {
  try {
    const { status } = req.query;
    
    let query = db.select().from(selections);
    
    // Applicazione filtri
    if (status) {
      query = query.where(eq(selections.status, status as string));
    }
    
    // Ordina per data decrescente e poi per ID decrescente
    query = query.orderBy(sql`${selections.date} DESC, ${selections.id} DESC`);
    
    const result = await query;
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Errore durante il recupero delle selezioni:", error);
    return res.status(500).json({ 
      success: false, 
      error: `Errore durante il recupero delle selezioni: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}

/**
 * Ottiene una singola selezione con tutti i dettagli correlati
 */
export async function getSelectionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: "ID selezione non fornito" 
      });
    }
    
    // 1. Recupera la selezione principale
    const selection = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
      
    if (!selection || selection.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Selezione con ID ${id} non trovata` 
      });
    }
    
    // 2. Recupera le ceste di origine
    const sourceBaskets = await db.select({
      id: selectionSourceBaskets.id,
      selectionId: selectionSourceBaskets.selectionId,
      basketId: selectionSourceBaskets.basketId,
      cycleId: selectionSourceBaskets.cycleId,
      animalCount: selectionSourceBaskets.animalCount,
      totalWeight: selectionSourceBaskets.totalWeight,
      animalsPerKg: selectionSourceBaskets.animalsPerKg,
      sizeId: selectionSourceBaskets.sizeId,
      lotId: selectionSourceBaskets.lotId,
      createdAt: selectionSourceBaskets.createdAt,
      // Campi correlati del basket
      physicalNumber: baskets.physicalNumber,
      flupsyId: baskets.flupsyId,
      position: baskets.position
    })
    .from(selectionSourceBaskets)
    .leftJoin(baskets, eq(selectionSourceBaskets.basketId, baskets.id))
    .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    // 3. Recupera le ceste di destinazione
    const destinationBaskets = await db.select({
      id: selectionDestinationBaskets.id,
      selectionId: selectionDestinationBaskets.selectionId,
      basketId: selectionDestinationBaskets.basketId,
      cycleId: selectionDestinationBaskets.cycleId,
      destinationType: selectionDestinationBaskets.destinationType,
      flupsyId: selectionDestinationBaskets.flupsyId,
      position: selectionDestinationBaskets.position,
      animalCount: selectionDestinationBaskets.animalCount,
      liveAnimals: selectionDestinationBaskets.liveAnimals,
      totalWeight: selectionDestinationBaskets.totalWeight,
      animalsPerKg: selectionDestinationBaskets.animalsPerKg,
      sizeId: selectionDestinationBaskets.sizeId,
      deadCount: selectionDestinationBaskets.deadCount,
      mortalityRate: selectionDestinationBaskets.mortalityRate,
      sampleWeight: selectionDestinationBaskets.sampleWeight,
      sampleCount: selectionDestinationBaskets.sampleCount,
      notes: selectionDestinationBaskets.notes,
      createdAt: selectionDestinationBaskets.createdAt,
      // Campi correlati del basket
      physicalNumber: baskets.physicalNumber
    })
    .from(selectionDestinationBaskets)
    .leftJoin(baskets, eq(selectionDestinationBaskets.basketId, baskets.id))
    .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    // 4. Recupera le relazioni tra ceste di origine e destinazione
    const basketHistory = await db.select()
      .from(selectionBasketHistory)
      .where(eq(selectionBasketHistory.selectionId, Number(id)));
    
    // 5. Recupera i riferimenti ai lotti
    const lotReferences = await db.select()
      .from(selectionLotReferences)
      .where(eq(selectionLotReferences.selectionId, Number(id)));
    
    // 6. Prepara la risposta
    const result = {
      ...selection[0],
      sourceBaskets,
      destinationBaskets,
      basketHistory,
      lotReferences
    };
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Errore durante il recupero della selezione:", error);
    return res.status(500).json({ 
      success: false, 
      error: `Errore durante il recupero della selezione: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}

/**
 * Crea una nuova selezione
 */
export async function createSelection(req: Request, res: Response) {
  try {
    const selectionData = req.body;
    
    // Validazione dei dati
    if (!selectionData.sourceBaskets || selectionData.sourceBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare almeno una cesta di origine"
      });
    }
    
    if (!selectionData.destinationBaskets || selectionData.destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare almeno una cesta di destinazione"
      });
    }
    
    // Verifica che tutte le ceste destinazione abbiano una destinazione valida
    const invalidDestinations = selectionData.destinationBaskets.filter((basket: any) => {
      if (basket.destinationType === 'sold') {
        return false; // Valida
      } else if (basket.destinationType === 'placed') {
        return !basket.flupsyId || !basket.position; // Invalida se manca FLUPSY o posizione
      }
      return true; // Invalida per qualsiasi altro valore
    });
    
    if (invalidDestinations.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Alcune ceste non hanno una destinazione valida. " +
               "Assicurati che ogni cesta sia impostata per la vendita o abbia un FLUPSY e una posizione."
      });
    }
    
    // Esecuzione in una singola transazione
    const selection = await db.transaction(async (tx) => {
      // 1. Crea record principale della selezione
      const [selection] = await tx.insert(selections).values({
        date: selectionData.date,
        selectionNumber: await getNextSelectionNumber(tx),
        purpose: selectionData.purpose,
        screeningType: selectionData.screeningType,
        notes: selectionData.notes,
        status: 'completed' // Le selezioni sono completate immediatamente
      }).returning();
      
      // 2. Processa le ceste origine (chiudendole)
      for (const sourceBasket of selectionData.sourceBaskets) {
        // Registra nella tabella di relazione
        await tx.insert(selectionSourceBaskets).values({
          selectionId: selection.id,
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount,
          totalWeight: sourceBasket.totalWeight,
          animalsPerKg: sourceBasket.animalsPerKg,
          sizeId: sourceBasket.sizeId,
          lotId: sourceBasket.lotId
        });
        
        // Crea operazione di chiusura per il ciclo di origine
        await tx.insert(operations).values({
          date: selectionData.date,
          type: 'selezione-origine',
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount,
          totalWeight: sourceBasket.totalWeight,
          animalsPerKg: sourceBasket.animalsPerKg,
          notes: `Chiuso per selezione #${selection.selectionNumber}`
        });
        
        // Chiudi il ciclo di origine
        await tx.update(cycles)
          .set({ 
            state: 'closed', 
            endDate: selectionData.date 
          })
          .where(eq(cycles.id, sourceBasket.cycleId));
        
        // Aggiorna lo stato del cestello origine a disponibile
        await tx.update(baskets)
          .set({ 
            state: 'available',
            currentCycleId: null 
          })
          .where(eq(baskets.id, sourceBasket.basketId));
      }
      
      // 3. Processa le ceste destinazione con gestione delle collocazioni
      for (const destBasket of selectionData.destinationBaskets) {
        // Crea operazione di prima attivazione
        const [operation] = await tx.insert(operations).values({
          date: selectionData.date,
          type: 'prima-attivazione',
          basketId: destBasket.basketId,
          cycleId: 0, // Placeholder, aggiornato dopo
          animalCount: destBasket.animalCount,
          totalWeight: destBasket.totalWeight, // già in grammi
          animalsPerKg: destBasket.animalsPerKg,
          averageWeight: 1000000 / destBasket.animalsPerKg,
          deadCount: destBasket.deadCount,
          mortalityRate: destBasket.mortalityRate,
          sizeId: destBasket.sizeId,
          notes: `Nuova cesta da selezione #${selection.selectionNumber}`
        }).returning();
        
        // Crea nuovo ciclo per la cesta
        const [cycle] = await tx.insert(cycles).values({
          basketId: destBasket.basketId,
          startDate: selectionData.date,
          state: 'active'
        }).returning();
        
        // Aggiorna l'operazione con l'ID del ciclo
        await tx.update(operations)
          .set({ cycleId: cycle.id })
          .where(eq(operations.id, operation.id));
        
        // Gestione in base al tipo di destinazione
        if (destBasket.destinationType === 'sold') {
          // Caso 1: Vendita immediata
          
          // Crea operazione di vendita
          await tx.insert(operations).values({
            date: selectionData.date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            notes: `Vendita immediata dopo selezione #${selection.selectionNumber}`
          });
          
          // Chiudi il ciclo appena creato
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selectionData.date 
            })
            .where(eq(cycles.id, cycle.id));
          
          // Aggiorna lo stato del cestello a disponibile
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              flupsyId: null,
              position: null
            })
            .where(eq(baskets.id, destBasket.basketId));
          
          // Registra nella tabella di relazione
          await tx.insert(selectionDestinationBaskets).values({
            selectionId: selection.id,
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            destinationType: 'sold',
            animalCount: destBasket.animalCount,
            liveAnimals: destBasket.animalCount - (destBasket.deadCount || 0),
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            sizeId: destBasket.sizeId,
            deadCount: destBasket.deadCount,
            mortalityRate: destBasket.mortalityRate,
            sampleWeight: destBasket.sampleWeight,
            sampleCount: destBasket.sampleCount
          });
          
        } else if (destBasket.destinationType === 'placed') {
          // Caso 2: Collocazione in un FLUPSY
          
          // Verifica che la posizione sia disponibile
          const basketInPosition = await tx.select().from(baskets)
            .where(and(
              eq(baskets.flupsyId, destBasket.flupsyId),
              eq(baskets.position, destBasket.position),
              eq(baskets.state, 'active')
            ));
          
          if (basketInPosition.length > 0 && basketInPosition[0].id !== destBasket.basketId) {
            throw new Error(`Posizione ${destBasket.position} nel FLUPSY ${destBasket.flupsyId} già occupata`);
          }
          
          // Aggiorna stato del cestello con FLUPSY e posizione
          await tx.update(baskets)
            .set({ 
              state: 'active',
              currentCycleId: cycle.id,
              flupsyId: destBasket.flupsyId,
              position: destBasket.position
            })
            .where(eq(baskets.id, destBasket.basketId));
          
          // Registra nella tabella di relazione
          await tx.insert(selectionDestinationBaskets).values({
            selectionId: selection.id,
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            destinationType: 'placed',
            flupsyId: destBasket.flupsyId,
            position: destBasket.position,
            animalCount: destBasket.animalCount,
            liveAnimals: destBasket.animalCount - (destBasket.deadCount || 0),
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            sizeId: destBasket.sizeId,
            deadCount: destBasket.deadCount,
            mortalityRate: destBasket.mortalityRate,
            sampleWeight: destBasket.sampleWeight,
            sampleCount: destBasket.sampleCount,
            notes: destBasket.notes
          });
          
          // Registra il movimento di posizione nella cronologia
          await tx.insert(basketPositionHistory).values({
            basketId: destBasket.basketId,
            flupsyId: destBasket.flupsyId,
            position: destBasket.position,
            startDate: selectionData.date,
            operationId: operation.id
          });
        }
        
        // Traccia relazioni tra ceste di origine e destinazione
        for (const sourceBasket of selectionData.sourceBaskets) {
          await tx.insert(selectionBasketHistory).values({
            selectionId: selection.id,
            sourceBasketId: sourceBasket.basketId,
            sourceCycleId: sourceBasket.cycleId,
            destinationBasketId: destBasket.basketId,
            destinationCycleId: cycle.id
          });
          
          // Se il lotto è specificato, traccia anche la relazione
          if (sourceBasket.lotId) {
            await tx.insert(selectionLotReferences).values({
              selectionId: selection.id,
              destinationBasketId: destBasket.basketId,
              destinationCycleId: cycle.id,
              lotId: sourceBasket.lotId
            });
          }
        }
      }
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selection_created', {
          selection: selection,
          message: `Nuova operazione di selezione #${selection.selectionNumber} completata`
        });
      }
      
      return selection;
    });
    
    return res.status(201).json({
      success: true,
      message: "Operazione di selezione completata con successo",
      selection
    });
    
  } catch (error) {
    console.error("ERRORE DURANTE CREAZIONE SELEZIONE:", error);
    return res.status(500).json({ 
      success: false,
      error: `Errore durante la creazione della selezione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottiene le posizioni disponibili in un FLUPSY
 */
export async function getAvailablePositions(req: Request, res: Response) {
  try {
    const { flupsyId } = req.params;
    
    if (!flupsyId) {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare l'ID del FLUPSY"
      });
    }
    
    // Ottieni informazioni sul FLUPSY
    const flupsy = await db.select().from(db.flupsys)
      .where(eq(db.flupsys.id, Number(flupsyId)))
      .limit(1);
    
    if (!flupsy || flupsy.length === 0) {
      return res.status(404).json({
        success: false,
        error: "FLUPSY non trovato"
      });
    }
    
    // Ottieni le posizioni già occupate
    const occupiedPositions = await db.select({
      position: baskets.position
    })
    .from(baskets)
    .where(and(
      eq(baskets.flupsyId, Number(flupsyId)),
      eq(baskets.state, 'active'),
      sql`${baskets.position} IS NOT NULL`
    ));
    
    // Mappatura delle posizioni occupate
    const occupiedPositionsMap = new Map();
    occupiedPositions.forEach(p => {
      if (p.position) {
        occupiedPositionsMap.set(p.position, true);
      }
    });
    
    // Lista di tutte le posizioni possibili
    const allPositions = [];
    
    // Generiamo le posizioni in formato "A1", "A2", "B1", "B2", ecc.
    const rows = ['A', 'B', 'C', 'D'];
    const cols = [1, 2, 3, 4, 5, 6, 7, 8];
    
    rows.forEach(row => {
      cols.forEach(col => {
        const position = `${row}${col}`;
        const isOccupied = occupiedPositionsMap.has(position);
        
        allPositions.push({
          flupsyId: Number(flupsyId),
          flupsyName: flupsy[0].name,
          position,
          available: !isOccupied
        });
      });
    });
    
    return res.status(200).json(allPositions);
    
  } catch (error) {
    console.error("ERRORE DURANTE RECUPERO POSIZIONI DISPONIBILI:", error);
    return res.status(500).json({ 
      success: false,
      error: `Errore durante il recupero delle posizioni disponibili: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottiene statistiche sulle selezioni
 */
export async function getSelectionStats(req: Request, res: Response) {
  try {
    // 1. Conteggio totale selezioni
    const totalStats = await db.select({
      total: sql`COUNT(*)`.as("total"),
      completed: sql`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`.as("completed"),
      draft: sql`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`.as("draft"),
      cancelled: sql`SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`.as("cancelled")
    }).from(selections);
    
    // 2. Conteggio baskets per type
    const basketStats = await db.select({
      sold: sql`SUM(CASE WHEN destination_type = 'sold' THEN 1 ELSE 0 END)`.as("sold"),
      placed: sql`SUM(CASE WHEN destination_type = 'placed' THEN 1 ELSE 0 END)`.as("placed"),
      total: sql`COUNT(*)`.as("total")
    }).from(selectionDestinationBaskets);
    
    return res.status(200).json({
      selections: totalStats[0],
      baskets: basketStats[0]
    });
    
  } catch (error) {
    console.error("ERRORE DURANTE RECUPERO STATISTICHE SELEZIONI:", error);
    return res.status(500).json({ 
      success: false,
      error: `Errore durante il recupero delle statistiche: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}