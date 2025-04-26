/**
 * Controller per la gestione delle operazioni di Selezione
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, or, isNull, isNotNull, sql } from "drizzle-orm";
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
    
    // 1. Recupera sia le ceste con stato "available" che quelle con stato "active" e ciclo attivo
    const allBaskets = await db.select({
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
      or(
        eq(baskets.state, 'available'),
        and(
          eq(baskets.state, 'active'),
          isNotNull(baskets.currentCycleId)
        )
      )
    );
    
    // 2. Arricchisci i dati con informazioni sul FLUPSY e sull'ultima operazione per ogni cestello
    const basketsWithDetails = await Promise.all(allBaskets.map(async (basket) => {
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
        flupsyId: basket.flupsyId,
        flupsy: flupsyData.length > 0 ? flupsyData[0] : null,
        position: basket.position,
        row: basket.row,
        state: basket.state,
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
    
    // Arricchisci le ceste di origine con informazioni sulla taglia
    const enrichedSourceBaskets = await Promise.all(sourceBaskets.map(async (basket) => {
      // Se esiste un sizeId, recupera i dettagli della taglia
      let size = null;
      if (basket.sizeId) {
        const sizeResult = await db.select()
          .from(sizes)
          .where(eq(sizes.id, basket.sizeId))
          .limit(1);
        size = sizeResult.length > 0 ? sizeResult[0] : null;
      }
      
      // Recupera i dettagli del FLUPSY se presente
      let flupsy = null;
      if (basket.flupsyId) {
        const flupsyResult = await db.select()
          .from(flupsys)
          .where(eq(flupsys.id, basket.flupsyId))
          .limit(1);
        flupsy = flupsyResult.length > 0 ? flupsyResult[0] : null;
      }
      
      return {
        ...basket,
        basket: await db.select().from(baskets).where(eq(baskets.id, basket.basketId)).limit(1).then(res => res[0] || null),
        size,
        flupsy
      };
    }));
    
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
    
    // 3.1. Arricchisci le ceste di destinazione con informazioni sulla taglia
    const enrichedDestinationBaskets = await Promise.all(destinationBaskets.map(async (basket) => {
      // Se esiste un sizeId, recupera i dettagli della taglia
      let size = null;
      if (basket.sizeId) {
        const sizeResult = await db.select()
          .from(sizes)
          .where(eq(sizes.id, basket.sizeId))
          .limit(1);
        size = sizeResult.length > 0 ? sizeResult[0] : null;
      }
      
      // Recupera i dettagli del FLUPSY se presente
      let flupsy = null;
      if (basket.flupsyId) {
        const flupsyResult = await db.select()
          .from(flupsys)
          .where(eq(flupsys.id, basket.flupsyId))
          .limit(1);
        flupsy = flupsyResult.length > 0 ? flupsyResult[0] : null;
      }
      
      // Se la posizione è nel formato "ROW+NUMBER" (es. "DX5"), suddividi in positionRow e positionNumber
      let positionRow = null;
      let positionNumber = null;
      
      if (basket.position) {
        // Estrai la parte alfabetica all'inizio come "row"
        const match = basket.position.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
          positionRow = match[1];
          positionNumber = match[2];
        }
      }
      
      return {
        ...basket,
        basket: await db.select().from(baskets).where(eq(baskets.id, basket.basketId)).limit(1).then(res => res[0] || null),
        size,
        flupsy,
        positionRow,
        positionNumber,
        saleDestination: basket.destinationType === 'sold'
      };
    }));
    
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
      sourceBaskets: enrichedSourceBaskets,  // Usiamo i dati arricchiti
      destinationBaskets: enrichedDestinationBaskets,  // Usiamo i dati arricchiti anche qui
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
 * Ottiene tutte le posizioni disponibili in tutti i FLUPSY, oppure per un FLUPSY specifico
 */
export async function getAvailablePositions(req: Request, res: Response) {
  try {
    const { flupsyId } = req.params;
    const { originFlupsyId } = req.query;
    
    // Lista finale di tutte le posizioni disponibili
    const allAvailablePositions: Array<{
      flupsyId: number,
      flupsyName: string,
      row: string,
      position: number,
      positionDisplay: string,
      available: boolean,
      sameFlupsy: boolean
    }> = [];
    
    // Se flupsyId è 'all', recuperiamo tutti i FLUPSY attivi
    let flupsysToProcess = [];
    
    if (flupsyId === 'all') {
      flupsysToProcess = await db.select().from(flupsys).where(eq(flupsys.active, true));
    } else if (flupsyId) {
      // Altrimenti prendiamo solo il FLUPSY specificato
      const flupsy = await db.select().from(flupsys)
        .where(eq(flupsys.id, Number(flupsyId)))
        .limit(1);
      
      if (!flupsy || flupsy.length === 0) {
        return res.status(404).json({
          success: false,
          error: "FLUPSY non trovato"
        });
      }
      
      flupsysToProcess = flupsy;
    } else {
      return res.status(400).json({
        success: false,
        error: "È necessario specificare l'ID del FLUPSY o 'all' per tutti"
      });
    }
    
    // Per ogni FLUPSY, recuperiamo le posizioni disponibili
    for (const flupsy of flupsysToProcess) {
      // Ottieni le posizioni già occupate
      const occupiedPositions = await db.select({
        position: baskets.position,
        row: baskets.row
      })
      .from(baskets)
      .where(and(
        eq(baskets.flupsyId, flupsy.id),
        eq(baskets.state, 'active'),
        sql`${baskets.position} IS NOT NULL`
      ));
      
      // Mappatura delle posizioni occupate
      const occupiedPositionsMap = new Map();
      occupiedPositions.forEach(p => {
        if (p.position && p.row) {
          const key = `${p.row}-${p.position}`;
          occupiedPositionsMap.set(key, true);
        }
      });
      
      // Determina se è lo stesso FLUPSY di origine
      let originId = null;
      if (originFlupsyId && !isNaN(Number(originFlupsyId))) {
        originId = Number(originFlupsyId);
      }
      const isSameFlupsy = originId !== null && originId === flupsy.id;
      
      // Generiamo le posizioni in formato "DX-1", "DX-2", "SX-1", "SX-2", ecc.
      const rows = ['DX', 'SX'];
      const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      rows.forEach(posRow => {
        positions.forEach(pos => {
          const key = `${posRow}-${pos}`;
          const isOccupied = occupiedPositionsMap.has(key);
          
          if (!isOccupied) {
            allAvailablePositions.push({
              flupsyId: flupsy.id,
              flupsyName: flupsy.name,
              row: posRow,
              position: pos,
              positionDisplay: `${flupsy.name} ${posRow}-${pos}`,
              available: true,
              sameFlupsy: isSameFlupsy
            });
          }
        });
      });
    }
    
    // Ordina le posizioni: prima quelle nello stesso FLUPSY di origine, poi le altre
    allAvailablePositions.sort((a, b) => {
      // Se sono entrambe nello stesso FLUPSY di origine o entrambe in FLUPSY differenti, ordina per nome FLUPSY
      if (a.sameFlupsy === b.sameFlupsy) {
        // Ordina prima per nome FLUPSY
        if (a.flupsyName !== b.flupsyName) {
          return a.flupsyName.localeCompare(b.flupsyName);
        }
        // Poi per fila (DX prima di SX)
        if (a.row !== b.row) {
          return a.row === 'DX' ? -1 : 1;
        }
        // Infine per posizione
        return a.position - b.position;
      }
      // Altrimenti, mostra prima quelle nello stesso FLUPSY di origine
      return a.sameFlupsy ? -1 : 1;
    });
    
    return res.status(200).json(allAvailablePositions);
    
  } catch (error) {
    console.error("ERRORE DURANTE RECUPERO POSIZIONI DISPONIBILI:", error);
    return res.status(500).json({ 
      success: false,
      error: `Errore durante il recupero delle posizioni disponibili: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottiene tutte le posizioni disponibili in tutti i FLUPSY senza alcun legame con le selezioni
 */
export async function getAllAvailablePositions(req: Request, res: Response) {
  try {
    // Estraiamo esplicitamente il FLUPSY di origine come stringa e lo convertiamo se valido
    const originFlupsyIdParam = req.query.originFlupsyId as string;
    let originFlupsyId: number | null = null;
    
    if (originFlupsyIdParam && !isNaN(Number(originFlupsyIdParam))) {
      originFlupsyId = Number(originFlupsyIdParam);
    }
    
    // Lista finale di tutte le posizioni disponibili
    const allAvailablePositions: Array<{
      flupsyId: number,
      flupsyName: string,
      row: string,
      position: number,
      positionDisplay: string,
      available: boolean,
      sameFlupsy: boolean
    }> = [];
    
    // Recupera tutti i FLUPSY attivi direttamente
    const activeFlupsys = await db.select().from(flupsys).where(eq(flupsys.active, true));
    
    // Per ogni FLUPSY attivo, recuperiamo le posizioni disponibili
    for (const flupsy of activeFlupsys) {
      // Ottieni le posizioni già occupate
      const occupiedPositions = await db.select({
        position: baskets.position,
        row: baskets.row
      })
      .from(baskets)
      .where(and(
        eq(baskets.flupsyId, flupsy.id),
        eq(baskets.state, 'active'),
        sql`${baskets.position} IS NOT NULL`
      ));
      
      // Mappatura delle posizioni occupate
      const occupiedPositionsMap = new Map();
      occupiedPositions.forEach(p => {
        if (p.position && p.row) {
          const key = `${p.row}-${p.position}`;
          occupiedPositionsMap.set(key, true);
        }
      });
      
      // Determina se è lo stesso FLUPSY di origine
      const isSameFlupsy = originFlupsyId !== null && originFlupsyId === flupsy.id;
      
      // Generiamo le posizioni in formato "DX-1", "DX-2", "SX-1", "SX-2", ecc.
      const rows = ['DX', 'SX'];
      const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      rows.forEach(posRow => {
        positions.forEach(pos => {
          const key = `${posRow}-${pos}`;
          const isOccupied = occupiedPositionsMap.has(key);
          
          if (!isOccupied) {
            allAvailablePositions.push({
              flupsyId: flupsy.id,
              flupsyName: flupsy.name,
              row: posRow,
              position: pos,
              positionDisplay: `${flupsy.name} ${posRow}-${pos}`,
              available: true,
              sameFlupsy: isSameFlupsy
            });
          }
        });
      });
    }
    
    // Ordina le posizioni: prima quelle nello stesso FLUPSY di origine, poi le altre
    allAvailablePositions.sort((a, b) => {
      // Se sono entrambe nello stesso FLUPSY di origine o entrambe in FLUPSY differenti, ordina per nome FLUPSY
      if (a.sameFlupsy === b.sameFlupsy) {
        // Ordina prima per nome FLUPSY
        if (a.flupsyName !== b.flupsyName) {
          return a.flupsyName.localeCompare(b.flupsyName);
        }
        // Poi per fila (DX prima di SX)
        if (a.row !== b.row) {
          return a.row === 'DX' ? -1 : 1;
        }
        // Infine per posizione
        return a.position - b.position;
      }
      // Altrimenti, mostra prima quelle nello stesso FLUPSY di origine
      return a.sameFlupsy ? -1 : 1;
    });
    
    return res.status(200).json(allAvailablePositions);
    
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
        // Recupera l'ultima operazione per questo cestello per ottenere i dati correnti
        const latestOperation = await tx.select()
          .from(operations)
          .where(eq(operations.basketId, sourceBasket.basketId))
          .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
          .limit(1);
          
        // Recupera anche i dati del ciclo per ottenere il lotto
        const cycleData = await tx.select()
          .from(cycles)
          .where(eq(cycles.id, sourceBasket.cycleId))
          .limit(1);
        
        // Usa i dati dell'ultima operazione se disponibili, altrimenti usa i dati forniti (o null)
        const lastOp = latestOperation.length > 0 ? latestOperation[0] : null;
        const cycle = cycleData.length > 0 ? cycleData[0] : null;
        
        await tx.insert(selectionSourceBaskets).values({
          selectionId: Number(id),
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount || lastOp?.animalCount || null,
          totalWeight: sourceBasket.totalWeight || lastOp?.totalWeight || null,
          animalsPerKg: sourceBasket.animalsPerKg || lastOp?.animalsPerKg || null,
          sizeId: sourceBasket.sizeId || lastOp?.sizeId || null,
          lotId: sourceBasket.lotId || cycle?.lotId || null
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
/**
 * Funzione di utilità per determinare la taglia (sizeId) in base al valore animalsPerKg
 * @param animalsPerKg - Numero di animali per kg
 * @returns Promise<number|null> - ID della taglia o null se non trovata
 */
async function determineSizeId(animalsPerKg: number): Promise<number | null> {
  if (!animalsPerKg || animalsPerKg <= 0) return null;
  
  try {
    // Recupera tutte le taglie disponibili
    const allSizes = await db.select().from(sizes);
    
    // Trova la taglia corrispondente in base a animalsPerKg
    const matchingSize = allSizes.find(size => 
      size.minAnimalsPerKg !== null && 
      size.maxAnimalsPerKg !== null && 
      animalsPerKg >= size.minAnimalsPerKg && 
      animalsPerKg <= size.maxAnimalsPerKg
    );
    
    if (matchingSize) {
      console.log(`Taglia determinata automaticamente: ${matchingSize.code} (ID: ${matchingSize.id})`);
      return matchingSize.id;
    } else {
      console.log(`Nessuna taglia trovata per animalsPerKg: ${animalsPerKg}`);
      return null;
    }
  } catch (error) {
    console.error("Errore durante la determinazione della taglia:", error);
    return null;
  }
}

export async function addDestinationBaskets(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const destinationBaskets = req.body;
    
    // Aggiungi log per debug
    console.log(`Ricevuta richiesta di aggiunta cestelli di destinazione per selezione ${id}:`);
    console.log(`Payload ricevuto:`, JSON.stringify(destinationBaskets, null, 2));
    
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
    
    // Verifica che tutti i campi necessari siano presenti
    for (const basket of destinationBaskets) {
      if (!basket.basketId) {
        return res.status(400).json({
          success: false,
          error: "Tutti i cestelli devono avere un basketId valido"
        });
      }
      
      if (!basket.destinationType) {
        return res.status(400).json({
          success: false,
          error: "Tutti i cestelli devono avere un tipo di destinazione (placed o sold)"
        });
      }
      
      if (basket.destinationType === 'placed' && (!basket.position || !basket.flupsyId)) {
        console.error(`Cestello ${basket.basketId} ha destinationType=${basket.destinationType} ma manca position=${basket.position} o flupsyId=${basket.flupsyId}`);
        return res.status(400).json({
          success: false,
          error: `Il cestello ${basket.basketId} è di tipo 'placed' ma manca la posizione o l'ID del FLUPSY`
        });
      }
      
      if (!basket.animalCount) {
        console.error(`Cestello ${basket.basketId} manca di animalCount`);
        return res.status(400).json({
          success: false,
          error: `Il cestello ${basket.basketId} non ha un conteggio di animali valido`
        });
      }
    }
    
    // Verifica destinazioni valide e assegna flupsyId predefinito ai cestelli venduti
    // Modificato per assicurarsi che i cestelli venduti abbiano un flupsyId
    const processedDestinationBaskets = destinationBaskets.map(basket => {
      if (basket.destinationType === 'sold' && !basket.flupsyId) {
        // Se è un cestello venduto senza FLUPSY, assegna il FLUPSY ID 1 come predefinito
        console.log('Assegnazione flupsyId predefinito (1) per cestello venduto');
        return {
          ...basket,
          flupsyId: 1 // Usa il primo FLUPSY come predefinito per i cestelli venduti
        };
      }
      return basket;
    });
    
    // Aggiorna la lista dei cestelli con quella processata
    const destinationBasketsWithValidFlupsyId = processedDestinationBaskets;
    
    // Verifica destinazioni valide
    const invalidDestinations = destinationBasketsWithValidFlupsyId.filter(basket => {
      if (basket.destinationType === 'sold') {
        return false; // Valida se è un cestello venduto (ora avrà sempre un flupsyId)
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
      // Registra i cestelli di destinazione senza chiudere i cicli delle origini
      // I cicli di origine saranno chiusi solo quando la selezione viene completata
      
      // Registra le nuove destinazioni nella tabella selectionDestinationBaskets
      for (const destBasket of destinationBasketsWithValidFlupsyId) {
        // Assicura che ogni cesta abbia un valore di sizeId basato su animalsPerKg
        let actualSizeId = destBasket.sizeId;
        
        // Se non c'è sizeId oppure è 0 o null, tenta di determinarlo automaticamente
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            const calculatedSizeId = await determineSizeId(destBasket.animalsPerKg);
            if (calculatedSizeId) {
              console.log(`Taglia determinata automaticamente: ${calculatedSizeId}`);
              console.log(`Taglia determinata automaticamente per cesta ${destBasket.basketId}: ID ${calculatedSizeId}`);
              actualSizeId = calculatedSizeId;
            }
          }
        }

        // Se si tratta di posizionamento in FLUPSY, verifica il formato della posizione
        if (destBasket.destinationType === 'placed') {
          console.log("Posizione ricevuta:", destBasket.position);
          
          try {
            // Verifica che la posizione sia una stringa valida
            if (!destBasket.position || typeof destBasket.position !== 'string') {
              throw new Error("Posizione non valida o non specificata");
            }
            
            // Estrai la riga (DX, SX) e la posizione numerica
            const positionStr = String(destBasket.position || '');
            console.log(`Posizione in elaborazione: "${positionStr}" per cestello ${destBasket.basketId}`);
            
            const rowMatch = positionStr.match(/^([A-Za-z]+)(\d+)$/);
            if (!rowMatch) {
              throw new Error(`Formato posizione non valido: ${positionStr}. Formato atteso: FILA+NUMERO (es. DX2)`);
            }
            
            const row = rowMatch[1];
            const positionNumber = parseInt(rowMatch[2]);
            
            console.log("Riga estratta:", row);
            console.log("Numero posizione estratto:", positionNumber);
            
            if (isNaN(positionNumber)) {
              throw new Error(`Numero posizione non valido in: ${destBasket.position}`);
            }
            
            // Verifica che la posizione sia disponibile
            const basketInPosition = await tx.select().from(baskets)
              .where(and(
                eq(baskets.flupsyId, destBasket.flupsyId),
                eq(baskets.row, row),
                eq(baskets.position, positionNumber),
                eq(baskets.state, 'active')
              ));
            
            if (basketInPosition.length > 0 && basketInPosition[0].id !== destBasket.basketId) {
              throw new Error(`Posizione ${row}${positionNumber} nel FLUPSY ${destBasket.flupsyId} già occupata`);
            }
          } catch (positionError) {
            console.error(`Errore di elaborazione posizione: ${positionError.message}`);
            throw new Error(`Errore nella posizione del cestello ${destBasket.basketId}: ${positionError.message}`);
          }
        }
        
        // Registra nella tabella di relazione temporanea
        await tx.insert(selectionDestinationBaskets).values({
          selectionId: Number(id),
          basketId: destBasket.basketId,
          cycleId: 0, // Temporaneo, sarà aggiornato durante il completamento
          destinationType: destBasket.destinationType,
          flupsyId: destBasket.flupsyId,
          position: destBasket.position,
          animalCount: destBasket.animalCount,
          liveAnimals: destBasket.animalCount - (destBasket.deadCount || 0),
          totalWeight: destBasket.totalWeight,
          animalsPerKg: destBasket.animalsPerKg,
          sizeId: actualSizeId,
          deadCount: destBasket.deadCount || 0,
          mortalityRate: destBasket.mortalityRate || 0,
          sampleWeight: destBasket.sampleWeight,
          sampleCount: destBasket.sampleCount,
          saleClient: destBasket.saleClient || null,
          saleDate: destBasket.saleDate || null
        });
      }
      
      // Processa le ceste di destinazione
      for (const destBasket of destinationBasketsWithValidFlupsyId) {
        // Assicura che ogni cesta abbia un valore di sizeId basato su animalsPerKg
        let actualSizeId = destBasket.sizeId;
        
        // Se non c'è sizeId oppure è 0 o null, tenta di determinarlo automaticamente
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            const calculatedSizeId = await determineSizeId(destBasket.animalsPerKg);
            if (calculatedSizeId) {
              console.log(`Taglia determinata automaticamente per cesta ${destBasket.basketId}: ID ${calculatedSizeId}`);
              actualSizeId = calculatedSizeId;
            } else {
              console.log(`Impossibile determinare la taglia automaticamente per cesta ${destBasket.basketId}`);
            }
          } else {
            console.log(`Manca animalsPerKg per cesta ${destBasket.basketId}, impossibile determinare la taglia`);
          }
        }
        
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
          sizeId: actualSizeId,
          notes: `Nuova cesta da vagliatura #${selection[0].selectionNumber}`,
          // Aggiungi il riferimento al lotto (il primo disponibile dalle ceste di origine)
          lotId: sourceBaskets.find(sb => sb.lotId)?.lotId || null
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
          
          // Ottieni i riferimenti ai lotti provenienti dai cestelli di origine
          const lotReferences = [];
          for (const sourceBasket of sourceBaskets) {
            if (sourceBasket.lotId) {
              lotReferences.push(sourceBasket.lotId);
            }
          }
          
          // Usa il primo lotto disponibile (se presente) per l'operazione di vendita
          const primaryLotId = lotReferences.length > 0 ? lotReferences[0] : null;
          
          // Crea operazione di vendita con il lotto associato
          const [saleOperation] = await tx.insert(operations).values({
            date: selection[0].date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`,
            lotId: primaryLotId // Associa il lotto all'operazione di vendita
          }).returning();
          
          // Se l'app ha la funzione di creazione notifiche, registra la notifica per essere processata dopo il commit
          if (req.app.locals.createSaleNotification && saleOperation) {
            saleNotificationsToCreate.push(saleOperation.id);
          }
          
          // Chiudi il ciclo appena creato
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
            })
            .where(eq(cycles.id, cycle.id));
          
          // Aggiorna lo stato del cestello a disponibile
          // IMPORTANTE: Manteniamo il flupsyId a un valore valido (quello attuale o 1 di default)
          // per rispettare il vincolo not-null del database, ma impostiamo position a null
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              position: null,
              row: null, // La row può essere null
              // NON impostiamo flupsyId a null, manteniamo quello esistente o il default
              // flupsyId: destBasket.flupsyId // Assicuriamo che ci sia un flupsyId valido
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
            sizeId: actualSizeId,
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
            sampleWeight: destBasket.sampleWeight,
            sampleCount: destBasket.sampleCount
          });
          
        } else if (destBasket.destinationType === 'placed') {
          // Caso 2: Collocazione in un FLUPSY
          
          // Estrai la riga e la posizione numerica dalla stringa di posizione
          // Il formato atteso è "DX2", "SX3", ecc. dove le prime due lettere sono la riga
          // e il resto è il numero di posizione
          console.log("Posizione ricevuta:", destBasket.position);
          
          let row: string;
          let positionNumber: number;
          
          try {
              // Verifica che la posizione sia una stringa valida
              if (!destBasket.position || typeof destBasket.position !== 'string') {
                console.error(`Posizione non valida per cestello ${destBasket.basketId}: ${JSON.stringify(destBasket.position)}`);
                throw new Error("Posizione non valida o non specificata");
              }
              
              // Estrai la riga (DX, SX) e la posizione numerica
              // Controllo aggiuntivo: Se position è null o undefined, gestisci appositamente
              const positionStr = String(destBasket.position || ''); // Converti a stringa o usa stringa vuota
              console.log(`Posizione in elaborazione: "${positionStr}" per cestello ${destBasket.basketId}`);
              
              const rowMatch = positionStr.match(/^([A-Za-z]+)(\d+)$/);
              if (!rowMatch) {
                console.error(`Errore formato posizione per cestello ${destBasket.basketId}: "${positionStr}" non rispetta il formato atteso`);
                throw new Error(`Formato posizione non valido: ${positionStr}. Formato atteso: FILA+NUMERO (es. DX2)`);
              }
              
              // Estrae i valori all'interno del try per evitare errori di scope
              row = rowMatch[1];
              positionNumber = parseInt(rowMatch[2]);
              
              console.log("Riga estratta:", row);
              console.log("Numero posizione estratto:", positionNumber);
              
              if (isNaN(positionNumber)) {
                throw new Error(`Numero posizione non valido in: ${destBasket.position}`);
              }
              
          } catch (positionError) {
              console.error(`Errore di elaborazione posizione: ${positionError.message}`);
              throw new Error(`Errore nella posizione del cestello ${destBasket.basketId}: ${positionError.message}`);
          }
          
          // Verifica che la posizione sia disponibile
          const basketInPosition = await tx.select().from(baskets)
            .where(and(
              eq(baskets.flupsyId, destBasket.flupsyId),
              eq(baskets.row, row),
              eq(baskets.position, positionNumber),
              eq(baskets.state, 'active')
            ));
          
          if (basketInPosition.length > 0 && basketInPosition[0].id !== destBasket.basketId) {
            throw new Error(`Posizione ${row}${positionNumber} nel FLUPSY ${destBasket.flupsyId} già occupata`);
          }
          
          // Aggiorna stato del cestello con FLUPSY e posizione
          await tx.update(baskets)
            .set({ 
              state: 'active',
              currentCycleId: cycle.id,
              flupsyId: destBasket.flupsyId,
              row: row,
              position: positionNumber
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
            sizeId: actualSizeId,
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
            row: row, // Utilizziamo la riga estratta
            position: positionNumber, // Utilizziamo il numero di posizione estratto
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
      
      // Non aggiorniamo lo stato qui, in quanto verrà fatto in un passaggio successivo
      // esplicito al termine del processo di aggiunta dei cestelli di destinazione
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('destination_baskets_added', {
          selectionId: Number(id),
          message: `Cestelli di destinazione aggiunti alla selezione #${selection[0].selectionNumber}`
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
 * Completa definitivamente una selezione e processa i cestelli
 */
export async function completeSelection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const saleNotificationsToCreate: number[] = [];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID selezione non fornito"
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
    
    // Verifica che la selezione sia in stato draft
    if (selection[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: `La selezione non può essere completata perché è in stato "${selection[0].status}"`
      });
    }
    
    // Verifica la presenza di cestelli di destinazione
    const destinationCount = await db.select({ count: sql`count(*)` })
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    if (!destinationCount[0] || destinationCount[0].count === 0) {
      return res.status(400).json({
        success: false,
        error: "La selezione non ha ceste di destinazione. Aggiungi prima le ceste di destinazione."
      });
    }
    
    // Ottieni tutte le ceste di destinazione
    const destinationBaskets = await db.select()
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    // Assicurati che tutti i cestelli venduti abbiano un FLUPSY ID valido
    const processedDestinationBaskets = destinationBaskets.map(basket => {
      if (basket.destinationType === 'sold' && !basket.flupsyId) {
        // Se è un cestello venduto senza FLUPSY, assegna il FLUPSY ID 1 come predefinito
        console.log('Assegnazione flupsyId predefinito (1) per cestello venduto in fase di completamento');
        return {
          ...basket,
          flupsyId: 1 // Usa il primo FLUPSY come predefinito per i cestelli venduti
        };
      }
      return basket;
    });
    
    // Ottieni le ceste di origine per il tracciamento delle relazioni
    const sourceBaskets = await db.select()
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    // Esecuzione in una transazione
    await db.transaction(async (tx) => {
      // Salva la transazione per le notifiche post-commit
      const operationsWithNotifications: number[] = [];
      
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
      for (const destBasket of processedDestinationBaskets) {
        // Assicura che ogni cesta abbia un valore di sizeId basato su animalsPerKg
        let actualSizeId = destBasket.sizeId;
        
        // Se non c'è sizeId oppure è 0 o null, tenta di determinarlo automaticamente
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            const calculatedSizeId = await determineSizeId(destBasket.animalsPerKg);
            if (calculatedSizeId) {
              console.log(`Taglia determinata automaticamente per cesta ${destBasket.basketId}: ID ${calculatedSizeId}`);
              actualSizeId = calculatedSizeId;
            } else {
              console.log(`Impossibile determinare la taglia automaticamente per cesta ${destBasket.basketId}`);
            }
          } else {
            console.log(`Manca animalsPerKg per cesta ${destBasket.basketId}, impossibile determinare la taglia`);
          }
        }
        
        // Verifica se il cestello ha già un ciclo creato nell'aggiunta cestelli destinazione
        const existingCycles = await tx.select()
          .from(cycles)
          .where(and(
            eq(cycles.basketId, destBasket.basketId),
            eq(cycles.startDate, selection[0].date)
          ));
        
        let cycleId = 0;
        
        // Se non esiste un ciclo, lo creiamo ora
        if (existingCycles.length === 0) {
          // Crea operazione di prima attivazione da vagliatura
          const [operation] = await tx.insert(operations).values({
            date: selection[0].date,
            type: 'prima-attivazione-da-vagliatura',
            basketId: destBasket.basketId,
            cycleId: 0, // Placeholder, aggiornato dopo
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            averageWeight: destBasket.totalWeight && destBasket.animalCount 
                            ? Math.round(destBasket.totalWeight / destBasket.animalCount) 
                            : 0,
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
            sizeId: actualSizeId,
            notes: `Aperto ciclo da vagliatura #${selection[0].selectionNumber}`
          }).returning();
          
          // Crea nuovo ciclo per la cesta
          const [cycle] = await tx.insert(cycles).values({
            basketId: destBasket.basketId,
            startDate: selection[0].date,
            state: 'active'
          }).returning();
          
          cycleId = cycle.id;
          
          // Aggiorna l'operazione con l'ID del ciclo
          await tx.update(operations)
            .set({ cycleId: cycle.id })
            .where(eq(operations.id, operation.id));
        } else {
          cycleId = existingCycles[0].id;
        }
        
        // Gestione in base al tipo di destinazione
        if (destBasket.destinationType === 'sold') {
          // Caso 1: Vendita immediata
          
          // Crea operazione di vendita se non esiste già
          const existingOperation = await tx.select()
            .from(operations)
            .where(and(
              eq(operations.type, 'vendita'),
              eq(operations.basketId, destBasket.basketId),
              eq(operations.cycleId, cycleId)
            ));
          
          if (existingOperation.length === 0) {
            const [saleOperation] = await tx.insert(operations).values({
              date: selection[0].date,
              type: 'vendita',
              basketId: destBasket.basketId,
              cycleId: cycleId,
              animalCount: destBasket.animalCount,
              totalWeight: destBasket.totalWeight,
              animalsPerKg: destBasket.animalsPerKg,
              notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`
            }).returning();
            
            // Se l'app ha la funzione di creazione notifiche, aggiungi questo ID operazione alla lista
            if (req.app.locals.createSaleNotification && saleOperation) {
              saleNotificationsToCreate.push(saleOperation.id);
            }
          }
          
          // Chiudi il ciclo se non è già chiuso
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
            })
            .where(and(
              eq(cycles.id, cycleId),
              eq(cycles.state, 'active') // Solo se è ancora attivo
            ));
          
          // Aggiorna lo stato del cestello a disponibile
          // IMPORTANTE: Manteniamo il flupsyId a un valore valido (quello attuale o 1 di default)
          // per rispettare il vincolo not-null del database, ma impostiamo position a null
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              position: null,
              row: null // La row può essere null
              // NON impostiamo flupsyId: null qui, lo lasciamo invariato
            })
            .where(eq(baskets.id, destBasket.basketId));
          
        } else if (destBasket.destinationType === 'placed') {
          // Caso 2: Collocazione in un FLUPSY
          
          // Estrai la riga e la posizione numerica dalla stringa di posizione
          if (destBasket.position && typeof destBasket.position === 'string') {
            try {
              // Estrai la riga (DX, SX) e la posizione numerica
              const positionStr = String(destBasket.position || '');
              const rowMatch = positionStr.match(/^([A-Za-z]+)(\d+)$/);
              
              if (rowMatch) {
                const row = rowMatch[1];
                const positionNumber = parseInt(rowMatch[2]);
                
                if (!isNaN(positionNumber)) {
                  // Aggiorna lo stato del cestello a active e setta la posizione
                  await tx.update(baskets)
                    .set({ 
                      state: 'active',
                      currentCycleId: cycleId,
                      flupsyId: destBasket.flupsyId,
                      position: positionNumber,
                      row: row
                    })
                    .where(eq(baskets.id, destBasket.basketId));
                }
              }
            } catch (error) {
              console.error(`Errore nell'elaborazione della posizione per il cestello ${destBasket.basketId}:`, error);
            }
          }
        }
        
        // Traccia relazioni tra ceste di origine e destinazione
        for (const sourceBasket of sourceBaskets) {
          // Verifica se la relazione esiste già
          const existingRelation = await tx.select()
            .from(selectionBasketHistory)
            .where(and(
              eq(selectionBasketHistory.selectionId, Number(id)),
              eq(selectionBasketHistory.sourceBasketId, sourceBasket.basketId),
              eq(selectionBasketHistory.destinationBasketId, destBasket.basketId)
            ));
          
          if (existingRelation.length === 0) {
            await tx.insert(selectionBasketHistory).values({
              selectionId: Number(id),
              sourceBasketId: sourceBasket.basketId,
              sourceCycleId: sourceBasket.cycleId,
              destinationBasketId: destBasket.basketId,
              destinationCycleId: cycleId
            });
          }
          
          // Se il lotto è specificato, traccia anche la relazione
          if (sourceBasket.lotId) {
            const existingLotRef = await tx.select()
              .from(selectionLotReferences)
              .where(and(
                eq(selectionLotReferences.selectionId, Number(id)),
                eq(selectionLotReferences.destinationBasketId, destBasket.basketId),
                eq(selectionLotReferences.lotId, sourceBasket.lotId)
              ));
            
            if (existingLotRef.length === 0) {
              await tx.insert(selectionLotReferences).values({
                selectionId: Number(id),
                destinationBasketId: destBasket.basketId,
                destinationCycleId: cycleId,
                lotId: sourceBasket.lotId
              });
            }
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

/**
 * Rimuove una cesta di origine dalla selezione
 */
export async function removeSourceBasket(req: Request, res: Response) {
  try {
    const { id, sourceBasketId } = req.params;
    
    if (!id || !sourceBasketId) {
      return res.status(400).json({
        success: false,
        error: "ID selezione o ID cesta di origine non fornito"
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
    
    // Verifica che la selezione sia in stato modificabile (draft)
    if (selection[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: `La selezione con ID ${id} non è modificabile (stato corrente: ${selection[0].status})`
      });
    }
    
    // Verifica che la cesta di origine esista
    const sourceBasket = await db.select().from(selectionSourceBaskets)
      .where(and(
        eq(selectionSourceBaskets.id, Number(sourceBasketId)),
        eq(selectionSourceBaskets.selectionId, Number(id))
      ))
      .limit(1);
      
    if (!sourceBasket || sourceBasket.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Cesta di origine con ID ${sourceBasketId} non trovata per la selezione ${id}`
      });
    }
    
    // Elimina la cesta di origine
    await db.delete(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.id, Number(sourceBasketId)));
    
    // Invia notifiche WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('selection_source_basket_removed', {
        selectionId: Number(id),
        sourceBasketId: Number(sourceBasketId),
        message: `Cesta di origine rimossa dalla selezione #${selection[0].selectionNumber}`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Cesta di origine rimossa con successo"
    });
    
  } catch (error) {
    console.error("Errore durante la rimozione della cesta di origine:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la rimozione della cesta di origine: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Rimuove una cesta di destinazione dalla selezione
 */
export async function removeDestinationBasket(req: Request, res: Response) {
  try {
    const { id, destinationBasketId } = req.params;
    
    if (!id || !destinationBasketId) {
      return res.status(400).json({
        success: false,
        error: "ID selezione o ID cesta di destinazione non fornito"
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
    
    // Verifica che la selezione sia in stato modificabile (draft)
    if (selection[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: `La selezione con ID ${id} non è modificabile (stato corrente: ${selection[0].status})`
      });
    }
    
    // Verifica che la cesta di destinazione esista
    const destinationBasket = await db.select().from(selectionDestinationBaskets)
      .where(and(
        eq(selectionDestinationBaskets.id, Number(destinationBasketId)),
        eq(selectionDestinationBaskets.selectionId, Number(id))
      ))
      .limit(1);
      
    if (!destinationBasket || destinationBasket.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Cesta di destinazione con ID ${destinationBasketId} non trovata per la selezione ${id}`
      });
    }
    
    // Elimina la cesta di destinazione
    await db.delete(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.id, Number(destinationBasketId)));
    
    // Elimina anche le relazioni nella history
    await db.delete(selectionBasketHistory)
      .where(eq(selectionBasketHistory.destinationBasketId, Number(destinationBasketId)));
    
    // Invia notifiche WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('selection_destination_basket_removed', {
        selectionId: Number(id),
        destinationBasketId: Number(destinationBasketId),
        message: `Cesta di destinazione rimossa dalla selezione #${selection[0].selectionNumber}`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Cesta di destinazione rimossa con successo"
    });
    
  } catch (error) {
    console.error("Errore durante la rimozione della cesta di destinazione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la rimozione della cesta di destinazione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}