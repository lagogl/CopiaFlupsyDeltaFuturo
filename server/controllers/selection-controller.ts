/**
 * Controller per la gestione delle operazioni di Selezione
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";
import { 
  selections, 
  selectionSourceBaskets, 
  selectionDestinationBaskets, 
  selectionBasketHistory, 
  selectionLotReferences,
  operations,
  cycles,
  baskets,
  basketPositionHistory,
  flupsys,
  sizes
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
    
    let selectionQuery = db.select().from(selections);
    
    // Applicazione filtri
    if (status && typeof status === 'string') {
      if (status === 'draft' || status === 'completed' || status === 'cancelled') {
        selectionQuery = selectionQuery.where(eq(selections.status, status));
      }
    }
    
    // Ordina per data decrescente e poi per ID decrescente
    selectionQuery = selectionQuery.orderBy(
      sql`${selections.date} DESC`,
      sql`${selections.id} DESC`
    );
    
    const result = await selectionQuery;
    
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
 * Recupera tutte le ceste disponibili per l'aggiunta a una selezione,
 * opzionalmente ordinate per similarità con una taglia di riferimento
 */
export async function getAvailableBaskets(req: Request, res: Response) {
  try {
    const { referenceSizeId } = req.query;
    
    // 1. Recupera tutte le ceste attive (con ciclo attivo)
    const activeBaskets = await db.select({
      basketId: baskets.id,
      cycleId: baskets.currentCycleId,
      physicalNumber: baskets.physicalNumber,
      flupsyId: baskets.flupsyId,
      position: baskets.position,
      row: baskets.row,
      state: baskets.state
    })
    .from(baskets)
    .where(
      and(
        eq(baskets.state, 'active'),
        isNotNull(baskets.currentCycleId)
      )
    );
    
    // 2. Arricchisci i dati con informazioni sul FLUPSY e sull'ultima operazione per ogni cestello
    const basketsWithDetails = await Promise.all(activeBaskets.map(async (basket) => {
      // Recupera il FLUPSY
      const flupsyData = basket.flupsyId ? await db.select()
        .from(flupsys)
        .where(eq(flupsys.id, basket.flupsyId))
        .limit(1) : [];
      
      // Recupera l'ultima operazione per questo cestello
      const latestOperation = await db.select()
        .from(operations)
        .where(eq(operations.basketId, basket.basketId))
        .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
        .limit(1);
      
      // Recupera la taglia se presente nell'ultima operazione
      let sizeData = null;
      if (latestOperation.length > 0 && latestOperation[0].sizeId) {
        try {
          const sizeResult = await db.select()
            .from(sizes)
            .where(eq(sizes.id, latestOperation[0].sizeId))
            .limit(1);
          sizeData = sizeResult.length > 0 ? sizeResult[0] : null;
        } catch (error) {
          console.error("Errore recupero taglia:", error);
        }
      }
      
      // Recupera il ciclo attuale
      const cycle = basket.cycleId ? await db.select()
        .from(cycles)
        .where(eq(cycles.id, basket.cycleId))
        .limit(1) : [];
      
      return {
        basketId: basket.basketId,
        physicalNumber: basket.physicalNumber,
        cycleId: basket.cycleId,
        flupsy: flupsyData.length > 0 ? flupsyData[0] : null,
        position: basket.position,
        row: basket.row,
        lastOperation: latestOperation.length > 0 ? latestOperation[0] : null,
        size: sizeData,
        cycle: cycle.length > 0 ? cycle[0] : null
      };
    }));
    
    // 3. Se è fornito un ID di taglia di riferimento, ordina i cestelli per similarità a quella taglia
    if (referenceSizeId && !isNaN(Number(referenceSizeId))) {
      // Recupera la taglia di riferimento
      const refSizeResults = await db.select()
        .from(sizes)
        .where(eq(sizes.id, Number(referenceSizeId)))
        .limit(1);
      
      const refSize = refSizeResults.length > 0 ? refSizeResults[0] : null;
      
      if (refSize) {
        const referenceMinAnimals = refSize.minAnimalsPerKg || 0;
        const referenceMaxAnimals = refSize.maxAnimalsPerKg || 0;
        const referenceAvg = (referenceMinAnimals + referenceMaxAnimals) / 2;
        
        // Calcola la distanza di ogni cestello dalla taglia di riferimento
        basketsWithDetails.sort((a, b) => {
          const aSize = a.size ? ((a.size.minAnimalsPerKg || 0) + (a.size.maxAnimalsPerKg || 0)) / 2 : null;
          const bSize = b.size ? ((b.size.minAnimalsPerKg || 0) + (b.size.maxAnimalsPerKg || 0)) / 2 : null;
          
          // Se entrambi hanno una taglia, ordina per vicinanza alla taglia di riferimento
          if (aSize !== null && bSize !== null) {
            const aDiff = Math.abs(aSize - referenceAvg);
            const bDiff = Math.abs(bSize - referenceAvg);
            return aDiff - bDiff;
          }
          
          // Se solo uno ha una taglia, quello con la taglia viene prima
          if (aSize !== null) return -1;
          if (bSize !== null) return 1;
          
          // Altrimenti, ordina per numero fisico del cestello
          return a.physicalNumber - b.physicalNumber;
        });
      }
    }
    
    return res.status(200).json(basketsWithDetails);
    
  } catch (error) {
    console.error("Errore durante il recupero delle ceste disponibili:", error);
    return res.status(500).json({ 
      success: false, 
      error: `Errore durante il recupero delle ceste disponibili: ${error instanceof Error ? error.message : String(error)}` 
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
 * Crea una nuova selezione (prima fase)
 * Questa funzione crea solo il record principale della selezione, senza 
 * gestire ancora le ceste di origine e destinazione
 */
export async function createSelection(req: Request, res: Response) {
  try {
    const selectionData = req.body;
    
    // Prima fase: crea solo il record principale della selezione
    // I cestelli verranno aggiunti in fasi successive
    
    // Controllo e conversione dei dati di input
    let referenceSizeId: number | null = null;
    if (selectionData.referenceSizeId) {
      referenceSizeId = Number(selectionData.referenceSizeId);
      
      // Verifica che la taglia di riferimento esista
      if (!isNaN(referenceSizeId)) {
        const sizeExists = await db.select({ id: sizes.id })
          .from(sizes)
          .where(eq(sizes.id, referenceSizeId))
          .limit(1);
        
        if (!sizeExists || sizeExists.length === 0) {
          return res.status(400).json({
            success: false,
            error: `La taglia di riferimento con ID ${referenceSizeId} non esiste.`
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: `ID taglia di riferimento non valido: ${selectionData.referenceSizeId}`
        });
      }
    }
    
    // Esecuzione in una singola transazione
    const selection = await db.transaction(async (tx) => {
      // 1. Crea record principale della selezione
      const [selection] = await tx.insert(selections).values({
        date: selectionData.date,
        selectionNumber: await getNextSelectionNumber(tx),
        purpose: selectionData.purpose || null,
        screeningType: selectionData.screeningType || null,
        referenceSizeId: referenceSizeId,
        notes: selectionData.notes || null,
        status: 'draft' // Inizia come bozza, sarà completata durante il processo di selezione
      }).returning();
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selection_created', {
          selection: selection,
          message: `Nuova operazione di selezione #${selection.selectionNumber} creata`
        });
      }
      
      return selection;
    });
    
    return res.status(201).json({
      success: true,
      message: "Operazione di selezione creata con successo",
      id: selection.id,
      selectionNumber: selection.selectionNumber
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
    const flupsy = await db.select().from(flupsys)
      .where(eq(flupsys.id, Number(flupsyId)))
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
    const allPositions: Array<{flupsyId: number, flupsyName: string, position: string, available: boolean}> = [];
    
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
 * Aggiunge ceste di origine alla selezione (seconda fase)
 */
export async function addSourceBaskets(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const sourceBaskets = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID selezione non fornito"
      });
    }
    
    if (!Array.isArray(sourceBaskets) || sourceBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare almeno una cesta di origine"
      });
    }
    
    // Verifica che la selezione esista
    const selection = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
      
    if (!selection || selection.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Selezione con ID ${id} non trovata`
      });
    }
    
    // Verifica che la selezione sia in stato modificabile (non completed o cancelled)
    if (selection[0].status === 'completed' || selection[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: `La selezione con ID ${id} non è modificabile (stato corrente: ${selection[0].status})`
      });
    }
    
    // Esecuzione in una transazione
    await db.transaction(async (tx) => {
      // Salva ogni cesta di origine
      for (const sourceBasket of sourceBaskets) {
        await tx.insert(selectionSourceBaskets).values({
          selectionId: Number(id),
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount,
          totalWeight: sourceBasket.totalWeight,
          animalsPerKg: sourceBasket.animalsPerKg,
          sizeId: sourceBasket.sizeId,
          lotId: sourceBasket.lotId
        });
      }
      
      // Aggiorna lo stato della selezione (opzionale, può rimanere in draft)
      // await tx.update(selections)
      //   .set({ status: 'in_progress' })
      //   .where(eq(selections.id, Number(id)));
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selection_updated', {
          selectionId: Number(id),
          message: `Ceste di origine aggiunte alla selezione #${selection[0].selectionNumber}`
        });
      }
    });
    
    return res.status(200).json({
      success: true,
      message: "Ceste di origine aggiunte con successo",
      selectionId: Number(id)
    });
    
  } catch (error) {
    console.error("Errore durante l'aggiunta di ceste di origine:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante l'aggiunta di ceste di origine: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Aggiunge ceste di destinazione e completa la selezione (fase finale)
 */
export async function addDestinationBaskets(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const destinationBaskets = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID selezione non fornito"
      });
    }
    
    if (!Array.isArray(destinationBaskets) || destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare almeno una cesta di destinazione"
      });
    }
    
    // Verifica destinazioni valide
    const invalidDestinations = destinationBaskets.filter(basket => {
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
    
    // Verifica che la selezione esista
    const selection = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
      
    if (!selection || selection.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Selezione con ID ${id} non trovata`
      });
    }
    
    // Verifica che la selezione sia in stato modificabile (non completed o cancelled)
    if (selection[0].status === 'completed' || selection[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: `La selezione con ID ${id} non è modificabile (stato corrente: ${selection[0].status})`
      });
    }
    
    // Verifica che ci siano ceste di origine
    const sourceCount = await db.select({ count: sql`count(*)` })
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    if (!sourceCount[0] || sourceCount[0].count === 0) {
      return res.status(400).json({
        success: false,
        error: "La selezione non ha ceste di origine. Aggiungi prima le ceste di origine."
      });
    }
    
    // Ottieni le ceste di origine per il tracciamento delle relazioni
    const sourceBaskets = await db.select()
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    // Esecuzione in una transazione
    await db.transaction(async (tx) => {
      // Chiudi i cicli delle ceste di origine
      for (const sourceBasket of sourceBaskets) {
        // Crea operazione di chiusura per il ciclo di origine
        await tx.insert(operations).values({
          date: selection[0].date,
          type: 'selezione-origine',
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount,
          totalWeight: sourceBasket.totalWeight,
          animalsPerKg: sourceBasket.animalsPerKg,
          notes: `Chiuso per selezione #${selection[0].selectionNumber}`
        });
        
        // Chiudi il ciclo di origine
        await tx.update(cycles)
          .set({ 
            state: 'closed', 
            endDate: selection[0].date 
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
      
      // Processa le ceste di destinazione
      for (const destBasket of destinationBaskets) {
        // Crea operazione di prima attivazione
        const [operation] = await tx.insert(operations).values({
          date: selection[0].date,
          type: 'prima-attivazione',
          basketId: destBasket.basketId,
          cycleId: 0, // Placeholder, aggiornato dopo
          animalCount: destBasket.animalCount,
          totalWeight: destBasket.totalWeight,
          animalsPerKg: destBasket.animalsPerKg,
          averageWeight: destBasket.totalWeight / destBasket.animalCount,
          deadCount: destBasket.deadCount || 0,
          mortalityRate: destBasket.mortalityRate || 0,
          sizeId: destBasket.sizeId,
          notes: `Nuova cesta da selezione #${selection[0].selectionNumber}`
        }).returning();
        
        // Crea nuovo ciclo per la cesta
        const [cycle] = await tx.insert(cycles).values({
          basketId: destBasket.basketId,
          startDate: selection[0].date,
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
            date: selection[0].date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`
          });
          
          // Chiudi il ciclo appena creato
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
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
            selectionId: Number(id),
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            destinationType: 'sold',
            animalCount: destBasket.animalCount,
            liveAnimals: destBasket.animalCount - (destBasket.deadCount || 0),
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            sizeId: destBasket.sizeId,
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
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
            selectionId: Number(id),
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
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
            sampleWeight: destBasket.sampleWeight,
            sampleCount: destBasket.sampleCount,
            notes: destBasket.notes
          });
          
          // Registra il movimento di posizione nella cronologia
          await tx.insert(basketPositionHistory).values({
            basketId: destBasket.basketId,
            flupsyId: destBasket.flupsyId,
            row: destBasket.row, // Utilizziamo direttamente il campo row
            position: destBasket.position, // Utilizziamo direttamente il campo position
            startDate: selection[0].date,
            operationId: operation.id
          });
        }
        
        // Traccia relazioni tra ceste di origine e destinazione
        for (const sourceBasket of sourceBaskets) {
          await tx.insert(selectionBasketHistory).values({
            selectionId: Number(id),
            sourceBasketId: sourceBasket.basketId,
            sourceCycleId: sourceBasket.cycleId,
            destinationBasketId: destBasket.basketId,
            destinationCycleId: cycle.id
          });
          
          // Se il lotto è specificato, traccia anche la relazione
          if (sourceBasket.lotId) {
            await tx.insert(selectionLotReferences).values({
              selectionId: Number(id),
              destinationBasketId: destBasket.basketId,
              destinationCycleId: cycle.id,
              lotId: sourceBasket.lotId
            });
          }
        }
      }
      
      // Aggiorna lo stato della selezione a completato
      await tx.update(selections)
        .set({ status: 'completed' })
        .where(eq(selections.id, Number(id)));
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selection_completed', {
          selectionId: Number(id),
          message: `Selezione #${selection[0].selectionNumber} completata con successo`
        });
      }
    });
    
    return res.status(200).json({
      success: true,
      message: "Selezione completata con successo",
      selectionId: Number(id)
    });
    
  } catch (error) {
    console.error("Errore durante il completamento della selezione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il completamento della selezione: ${error instanceof Error ? error.message : String(error)}`
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