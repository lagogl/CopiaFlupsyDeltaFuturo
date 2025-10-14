/**
 * CORREZIONE LOGICA VAGLIATURA - Implementazione corretta per gestire:
 * 1. Cessazione SEMPRE dei cestelli origine (non riattivazione)
 * 2. Calcolo e registrazione mortalità del lotto
 * 3. Tracciabilità completa della vagliatura
 * 4. Operazione "chiusura-ciclo-vagliatura" per storicizzazione
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
  basketLotComposition,
  lotLedger,
  operations,
  cycles,
  baskets,
  flupsys,
  sizes,
  lots
} from "../../shared/schema";
import { format } from "date-fns";
import { 
  balancedRounding, 
  generateIdempotencyKey, 
  createAllocationBasis 
} from "../utils/balanced-rounding";
import {
  calculateAggregatedComposition as calculateComposition,
  distributeCompositionToDestinations as distributeComposition,
  calculateAndRegisterMortality as registerMortality,
  type SourceBasket,
  type DestinationBasket
} from "../modules/operations/shared/allocation";

// =============== COMPOSIZIONE LOTTI ===============

/**
 * Popola dati esistenti nella tabella basket_lot_composition per cestelli che già hanno lotti
 */
async function migrateExistingBasketLotData() {
  console.log("🔄 Migrazione dati esistenti basket-lotto...");
  
  // Trova tutte le operazioni di attivazione con lotId
  const activationOperations = await db.select({
    basketId: operations.basketId,
    cycleId: operations.cycleId,
    lotId: operations.lotId,
    animalCount: operations.animalCount,
    date: operations.date
  })
  .from(operations)
  .where(
    and(
      eq(operations.type, 'prima-attivazione'),
      isNotNull(operations.lotId),
      isNotNull(operations.cycleId)
    )
  );

  console.log(`📦 Trovate ${activationOperations.length} operazioni di attivazione con lotti`);

  for (const op of activationOperations) {
    if (!op.lotId || !op.cycleId || !op.animalCount) continue;
    
    // Verifica se già esiste composizione per questo cestello
    const existing = await db.select()
      .from(basketLotComposition)
      .where(
        and(
          eq(basketLotComposition.basketId, op.basketId),
          eq(basketLotComposition.cycleId, op.cycleId)
        )
      );
    
    if (existing.length === 0) {
      // Inserisci composizione pura (100% un lotto)
      await db.insert(basketLotComposition).values({
        basketId: op.basketId,
        cycleId: op.cycleId,
        lotId: op.lotId,
        animalCount: op.animalCount,
        percentage: 100.0,
        sourceSelectionId: null,
        notes: `Migrazione automatica - lotto puro da attivazione ${op.date}`
      });
      
      console.log(`✅ Cestello ${op.basketId} - Lotto ${op.lotId}: ${op.animalCount} animali (100%)`);
    }
  }
  
  console.log("✅ Migrazione dati basket-lotto completata");
}

// =============== COMPOSIZIONE LOTTI ===============

/**
 * Ottieni la composizione di lotti per un cestello
 */
async function getBasketLotComposition(basketId: number, cycleId: number) {
  return await db.select({
    lotId: basketLotComposition.lotId,
    animalCount: basketLotComposition.animalCount,
    percentage: basketLotComposition.percentage,
    sourceSelectionId: basketLotComposition.sourceSelectionId,
    notes: basketLotComposition.notes
  })
  .from(basketLotComposition)
  .where(
    and(
      eq(basketLotComposition.basketId, basketId),
      eq(basketLotComposition.cycleId, cycleId)
    )
  );
}

/**
 * Calcola la composizione aggregata di tutti i cestelli origine
 * REFACTORED: usa servizio condiviso
 */
async function calculateAggregatedComposition(selectionId: number) {
  // Ottieni tutti i cestelli origine con i loro dati
  const sourceBaskets = await db.select({
    basketId: selectionSourceBaskets.basketId,
    cycleId: selectionSourceBaskets.cycleId,
    animalCount: selectionSourceBaskets.animalCount,
    lotId: selectionSourceBaskets.lotId
  })
  .from(selectionSourceBaskets)
  .where(eq(selectionSourceBaskets.selectionId, selectionId));

  console.log(`🧩 Cestelli origine per selezione ${selectionId}:`, sourceBaskets);

  // Usa il servizio condiviso
  return await calculateComposition(sourceBaskets as SourceBasket[]);
}

/**
 * Distribuisce la composizione nei cestelli destinazione
 * REFACTORED: usa servizio condiviso
 */
async function distributeCompositionToDestinations(selectionId: number, aggregatedComposition: Array<{lotId: number, animalCount: number, percentage: number}>, totalSourceAnimals: number) {
  // Ottieni cestelli destinazione
  const destinationBaskets = await db.select({
    basketId: selectionDestinationBaskets.basketId,
    cycleId: selectionDestinationBaskets.cycleId,
    animalCount: selectionDestinationBaskets.animalCount
  })
  .from(selectionDestinationBaskets)
  .where(eq(selectionDestinationBaskets.selectionId, selectionId));

  // Usa il servizio condiviso
  await distributeComposition(
    destinationBaskets as DestinationBasket[],
    aggregatedComposition,
    selectionId,
    'vagliatura'
  );
}

/**
 * Calcola e registra la mortalità per ogni lotto
 * REFACTORED: usa servizio condiviso
 */
async function calculateAndRegisterMortality(selectionId: number, aggregatedComposition: Array<{lotId: number, animalCount: number, percentage: number}>, totalSourceAnimals: number, totalDestinationAnimals: number, selectionDate: string) {
  // Usa il servizio condiviso
  await registerMortality(
    aggregatedComposition,
    totalSourceAnimals,
    totalDestinationAnimals,
    selectionDate,
    selectionId,
    'vagliatura'
  );
}

/**
 * Migra dati esistenti (chiamata una tantum)
 */
export async function migrateBasketLotData(req: Request, res: Response) {
  try {
    await migrateExistingBasketLotData();
    
    return res.status(200).json({
      success: true,
      message: "Migrazione basket-lotto completata con successo"
    });
  } catch (error) {
    console.error("Errore durante la migrazione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la migrazione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

// =============== FUNZIONI CRUD STANDARD ===============

/**
 * Ottieni tutte le selezioni con dati aggregati, paginazione e filtri
 */
export async function getSelections(req: Request, res: Response) {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const screeningNumber = req.query.screeningNumber as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    // Build where conditions
    const conditions = [];
    if (screeningNumber) {
      conditions.push(eq(selections.selectionNumber, parseInt(screeningNumber)));
    }
    if (dateFrom) {
      conditions.push(sql`${selections.date} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${selections.date} <= ${dateTo}`);
    }
    
    // Count total records
    const totalCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(selections)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(totalCount[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    
    // Fetch paginated selections
    const selectionsQuery = db.select()
      .from(selections)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${selections.date} DESC, ${selections.id} DESC`)
      .limit(pageSize)
      .offset(offset);
      
    const selectionsData = await selectionsQuery;
    
    // Ottimizza con query aggregate singole per tutti i record
    if (selectionsData.length > 0) {
      const selectionIds = selectionsData.map(s => s.id);
      
      // Aggregazione cestelli origine in una singola query
      const sourceAggregation = await db.select({
        selectionId: selectionSourceBaskets.selectionId,
        count: sql<number>`COUNT(*)`,
        totalAnimals: sql<number>`COALESCE(SUM(animal_count), 0)`
      })
      .from(selectionSourceBaskets)
      .where(sql`${selectionSourceBaskets.selectionId} IN (${sql.join(selectionIds, sql`, `)})`)
      .groupBy(selectionSourceBaskets.selectionId);
      
      // Aggregazione cestelli destinazione in una singola query
      const destAggregation = await db.select({
        selectionId: selectionDestinationBaskets.selectionId,
        count: sql<number>`COUNT(*)`,
        totalAnimals: sql<number>`COALESCE(SUM(animal_count), 0)`
      })
      .from(selectionDestinationBaskets)
      .where(sql`${selectionDestinationBaskets.selectionId} IN (${sql.join(selectionIds, sql`, `)})`)
      .groupBy(selectionDestinationBaskets.selectionId);
      
      // Recupera tutte le taglie di riferimento in una singola query
      const sizeIds = selectionsData
        .filter(s => s.referenceSizeId)
        .map(s => s.referenceSizeId);
        
      let sizesMap: Record<number, any> = {};
      if (sizeIds.length > 0) {
        const sizesData = await db.select()
          .from(sizes)
          .where(sql`${sizes.id} IN (${sql.join(sizeIds, sql`, `)})`);
        sizesMap = Object.fromEntries(sizesData.map(s => [s.id, s]));
      }
      
      // Map aggregations per ID
      const sourceMap = Object.fromEntries(sourceAggregation.map(s => [s.selectionId, s]));
      const destMap = Object.fromEntries(destAggregation.map(d => [d.selectionId, d]));
      
      // Arricchisci le selezioni con i dati aggregati
      const enrichedSelections = selectionsData.map(selection => {
        const source = sourceMap[selection.id];
        const dest = destMap[selection.id];
        
        const totalSource = Number(source?.totalAnimals || 0);
        const totalDest = Number(dest?.totalAnimals || 0);
        // Evita mortalità negative con Math.max
        const mortality = Math.max(0, totalSource - totalDest);
        
        return {
          ...selection,
          sourceCount: Number(source?.count || 0),
          destinationCount: Number(dest?.count || 0),
          totalSourceAnimals: totalSource,
          totalDestAnimals: totalDest,
          mortalityAnimals: mortality,
          referenceSize: selection.referenceSizeId ? sizesMap[selection.referenceSizeId] : null
        };
      });
      
      return res.status(200).json({
        success: true,
        selections: enrichedSelections,
        pagination: {
          page,
          pageSize,
          totalCount: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    }
    
    // Nessun risultato
    return res.status(200).json({
      success: true,
      selections: [],
      pagination: {
        page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });
  } catch (error) {
    console.error("Errore durante il recupero delle selezioni:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero delle selezioni: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottieni selezione per ID
 */
export async function getSelectionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Recupera la selezione base
    const [selection] = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
    
    if (!selection) {
      return res.status(404).json({
        success: false,
        error: "Selezione non trovata"
      });
    }

    // Recupera la taglia di riferimento se presente
    let referenceSize = null;
    if (selection.referenceSizeId) {
      const [size] = await db.select().from(sizes)
        .where(eq(sizes.id, selection.referenceSizeId))
        .limit(1);
      if (size) {
        referenceSize = {
          id: size.id,
          code: size.code,
          name: size.name
        };
      }
    }

    // Recupera i cestelli di origine (solo dalla tabella)
    const sourceBasketRows = await db.select().from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));

    // Arricchisci con flupsyName
    const sourceBaskets = await Promise.all(sourceBasketRows.map(async (sb) => {
      let flupsyName = null;
      // Recupera basket per ottenere flupsyId
      const [basket] = await db.select().from(baskets)
        .where(eq(baskets.id, sb.basketId))
        .limit(1);
      
      if (basket?.flupsyId) {
        const [flupsy] = await db.select().from(flupsys)
          .where(eq(flupsys.id, basket.flupsyId))
          .limit(1);
        flupsyName = flupsy?.name || null;
      }
      return { ...sb, flupsyName };
    }));

    // Recupera i cestelli di destinazione (solo dalla tabella)
    const destBasketRows = await db.select().from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));

    // Arricchisci con flupsyName, row, position e size
    const destinationBaskets = await Promise.all(destBasketRows.map(async (destBasket) => {
      let flupsyName = null;
      let flupsyId = null;
      let row = null;
      let position = null;
      let size = null;
      
      // Recupera basket per ottenere flupsyId, row e position
      const [basket] = await db.select().from(baskets)
        .where(eq(baskets.id, destBasket.basketId))
        .limit(1);
      
      if (basket) {
        flupsyId = basket.flupsyId;
        row = basket.row;
        position = basket.position;
        
        if (basket.flupsyId) {
          const [flupsy] = await db.select().from(flupsys)
            .where(eq(flupsys.id, basket.flupsyId))
            .limit(1);
          flupsyName = flupsy?.name || null;
        }
      }
      
      if (destBasket.sizeId) {
        const [sizeData] = await db.select().from(sizes)
          .where(eq(sizes.id, destBasket.sizeId))
          .limit(1);
        if (sizeData) {
          size = {
            id: sizeData.id,
            code: sizeData.code,
            name: sizeData.name
          };
        }
      }
      
      return {
        ...destBasket,
        flupsyId,
        flupsyName,
        row,
        position,
        positionAssigned: row !== null && position !== null,
        size
      };
    }));

    // Costruisce la risposta con dati completi
    const detailedSelection = {
      ...selection,
      screeningNumber: selection.selectionNumber,
      referenceSize,
      sourceBaskets,
      destinationBaskets
    };

    return res.status(200).json({
      success: true,
      selection: detailedSelection
    });
  } catch (error) {
    console.error("Errore durante il recupero della selezione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero della selezione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Crea nuova selezione
 */
export async function createSelection(req: Request, res: Response) {
  try {
    const { date, notes, purpose = 'vagliatura' } = req.body;
    
    // Genera selectionNumber - dovrebbe essere incrementale
    const lastSelection = await db.select({ selectionNumber: selections.selectionNumber })
      .from(selections)
      .orderBy(sql`${selections.selectionNumber} DESC`)
      .limit(1);
      
    const nextSelectionNumber = lastSelection.length > 0 ? lastSelection[0].selectionNumber + 1 : 1;
    
    const [newSelection] = await db.insert(selections).values({
      date: date,
      selectionNumber: nextSelectionNumber,
      purpose: purpose,
      status: 'draft',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return res.status(201).json({
      success: true,
      selection: newSelection
    });
  } catch (error) {
    console.error("Errore durante la creazione della selezione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la creazione della selezione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottieni posizioni disponibili
 */
export async function getAvailablePositions(req: Request, res: Response) {
  try {
    const { flupsyId } = req.params;
    
    // Mock response per ora
    return res.status(200).json({
      success: true,
      positions: []
    });
  } catch (error) {
    console.error("Errore durante il recupero delle posizioni:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero delle posizioni: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottieni tutte le posizioni disponibili
 */
export async function getAllAvailablePositions(req: Request, res: Response) {
  try {
    return res.status(200).json({
      success: true,
      positions: []
    });
  } catch (error) {
    console.error("Errore durante il recupero delle posizioni:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero delle posizioni: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottieni statistiche selezione
 */
export async function getSelectionStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    return res.status(200).json({
      success: true,
      stats: {
        sourceBaskets: 0,
        destinationBaskets: 0,
        totalAnimals: 0
      }
    });
  } catch (error) {
    console.error("Errore durante il recupero delle statistiche:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero delle statistiche: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Aggiungi cestelli di origine
 */
export async function addSourceBaskets(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sourceBaskets } = req.body;
    
    console.log(`📥 Aggiunta ${sourceBaskets?.length || 0} cestelli origine alla selezione ${id}`);
    
    if (!sourceBaskets || !Array.isArray(sourceBaskets)) {
      return res.status(400).json({
        success: false,
        error: "Parametro sourceBaskets mancante o non valido"
      });
    }
    
    // Ottieni la data della selezione
    const [selection] = await db.select({
      date: selections.date
    })
    .from(selections)
    .where(eq(selections.id, Number(id)))
    .limit(1);
    
    if (!selection?.date) {
      return res.status(400).json({
        success: false,
        error: "Data di selezione non trovata"
      });
    }
    
    const selectionDate = new Date(selection.date);
    selectionDate.setHours(23, 59, 59, 999); // Fine della giornata per includere tutto il giorno
    
    // Inserisci tutti i cestelli origine
    for (const sourceBasket of sourceBaskets) {
      // Prima ottieni il ciclo corrente del cestello E il suo lotto
      const [basketData] = await db.select({
        currentCycleId: baskets.currentCycleId,
        physicalNumber: baskets.physicalNumber,
        lotId: cycles.lotId
      })
      .from(baskets)
      .leftJoin(cycles, eq(baskets.currentCycleId, cycles.id))
      .where(eq(baskets.id, sourceBasket.basketId))
      .limit(1);
      
      if (!basketData?.currentCycleId) {
        console.log(`⚠️ Cestello ${sourceBasket.basketId} senza ciclo attivo`);
        continue;
      }
      
      // VALIDAZIONE: Verifica che il cestello non abbia operazioni future rispetto alla data di vagliatura
      const futureOperations = await db.select({
        id: operations.id,
        date: operations.date,
        type: operations.type
      })
      .from(operations)
      .where(
        and(
          eq(operations.basketId, sourceBasket.basketId),
          sql`${operations.date} > ${selectionDate.toISOString().split('T')[0]}`
        )
      )
      .limit(1);
      
      if (futureOperations.length > 0) {
        console.log(`❌ Cestello #${basketData.physicalNumber} (ID: ${sourceBasket.basketId}) ha operazioni future:`, futureOperations[0]);
        return res.status(400).json({
          success: false,
          error: `Il cestello #${basketData.physicalNumber} ha operazioni successive alla data di vagliatura ${selection.date}. Non può essere selezionato come origine.`
        });
      }
      
      const sourceBasketData = {
        selectionId: Number(id),
        basketId: sourceBasket.basketId,
        cycleId: basketData.currentCycleId,
        animalCount: sourceBasket.animalCount,
        totalWeight: sourceBasket.totalWeight || null,
        animalsPerKg: sourceBasket.animalsPerKg || null,
        sizeId: sourceBasket.sizeId || null,
        lotId: basketData.lotId, // ✅ Recuperato automaticamente dal ciclo
        notes: sourceBasket.notes || null
      };
      
      await db.insert(selectionSourceBaskets).values(sourceBasketData);
      
      console.log(`✅ Cestello origine ${sourceBasket.basketId} aggiunto (${sourceBasket.animalCount} animali)`);
    }
    
    return res.status(200).json({
      success: true,
      message: "Cestelli di origine aggiunti"
    });
  } catch (error) {
    console.error("Errore durante l'aggiunta dei cestelli di origine:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante l'aggiunta dei cestelli di origine: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Aggiungi cestelli di destinazione
 */
export async function addDestinationBaskets(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { destinationBaskets } = req.body;
    
    console.log(`📤 Aggiunta ${destinationBaskets?.length || 0} cestelli destinazione alla selezione ${id}`);
    
    if (!destinationBaskets || !Array.isArray(destinationBaskets)) {
      return res.status(400).json({
        success: false,
        error: "Parametro destinationBaskets mancante o non valido"
      });
    }
    
    if (destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Devi selezionare almeno un cestello destinazione per completare la vagliatura"
      });
    }
    
    // Inserisci tutti i cestelli destinazione
    for (const destBasket of destinationBaskets) {
      await db.insert(selectionDestinationBaskets).values({
        selectionId: Number(id),
        basketId: destBasket.basketId,
        cycleId: null, // Sarà creato al completamento
        destinationType: destBasket.destinationType || 'positioned',
        flupsyId: destBasket.flupsyId || null,
        position: destBasket.position || null,
        animalCount: destBasket.animalCount,
        liveAnimals: destBasket.liveAnimals || destBasket.animalCount,
        totalWeight: destBasket.totalWeight || null,
        animalsPerKg: destBasket.animalsPerKg || null,
        sizeId: destBasket.sizeId || null,
        deadCount: destBasket.deadCount || 0,
        mortalityRate: destBasket.mortalityRate || 0,
        sampleWeight: destBasket.sampleWeight || null,
        sampleCount: destBasket.sampleCount || null,
        notes: destBasket.notes || null
      });
      
      console.log(`✅ Cestello destinazione ${destBasket.basketId} aggiunto (${destBasket.animalCount} animali)`);
    }
    
    return res.status(200).json({
      success: true,
      message: "Cestelli di destinazione aggiunti"
    });
  } catch (error) {
    console.error("Errore durante l'aggiunta dei cestelli di destinazione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante l'aggiunta dei cestelli di destinazione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Ottieni cestelli disponibili
 */
export async function getAvailableBaskets(req: Request, res: Response) {
  try {
    const availableBaskets = await db.select().from(baskets)
      .where(eq(baskets.state, 'available'));
    
    return res.status(200).json({
      success: true,
      baskets: availableBaskets
    });
  } catch (error) {
    console.error("Errore durante il recupero dei cestelli disponibili:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il recupero dei cestelli disponibili: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Rimuovi cestello di origine
 */
export async function removeSourceBasket(req: Request, res: Response) {
  try {
    const { id, basketId } = req.params;
    
    return res.status(200).json({
      success: true,
      message: "Cestello di origine rimosso"
    });
  } catch (error) {
    console.error("Errore durante la rimozione del cestello di origine:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la rimozione del cestello di origine: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Rimuovi cestello di destinazione
 */
export async function removeDestinationBasket(req: Request, res: Response) {
  try {
    const { id, basketId } = req.params;
    
    return res.status(200).json({
      success: true,
      message: "Cestello di destinazione rimosso"
    });
  } catch (error) {
    console.error("Errore durante la rimozione del cestello di destinazione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la rimozione del cestello di destinazione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * COMPLETA SELEZIONE - IMPLEMENTAZIONE CORRETTA
 * 
 * LOGICA CORRETTA:
 * 1. TUTTI i cestelli origine vengono SEMPRE cessati (operazione "chiusura-ciclo-vagliatura")
 * 2. I cestelli destinazione ricevono nuovi cicli normalmente
 * 3. La mortalità viene calcolata e registrata sul lotto
 * 4. Tracciabilità completa per ricostruire la storia
 */
/**
 * Alias per mantenere compatibilità con routes.ts
 */
export const completeSelection = completeSelectionFixed;

export async function completeSelectionFixed(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    console.log(`🔄 AVVIO COMPLETAMENTO VAGLIATURA CORRETTO - Selezione ID: ${id}`);
    
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

    // Recupera i cestelli di origine
    const sourceBaskets = await db.select({
      basketId: selectionSourceBaskets.basketId,
      animalCount: selectionSourceBaskets.animalCount,
      lotId: selectionSourceBaskets.lotId,
      cycleId: selectionSourceBaskets.cycleId
    })
    .from(selectionSourceBaskets)
    .where(eq(selectionSourceBaskets.selectionId, Number(id)));

    // Recupera i cestelli di destinazione
    const destinationBaskets = await db.select({
      basketId: selectionDestinationBaskets.basketId,
      destinationType: selectionDestinationBaskets.destinationType,
      flupsyId: selectionDestinationBaskets.flupsyId,
      position: selectionDestinationBaskets.position,
      animalCount: selectionDestinationBaskets.animalCount,
      totalWeight: selectionDestinationBaskets.totalWeight,
      animalsPerKg: selectionDestinationBaskets.animalsPerKg,
      sizeId: selectionDestinationBaskets.sizeId,
      deadCount: selectionDestinationBaskets.deadCount,
      mortalityRate: selectionDestinationBaskets.mortalityRate
    })
    .from(selectionDestinationBaskets)
    .where(eq(selectionDestinationBaskets.selectionId, Number(id)));

    if (sourceBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun cestello di origine trovato per questa selezione"
      });
    }

    if (destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun cestello di destinazione trovato per questa selezione"
      });
    }

    // CALCOLA MORTALITÀ
    const totalAnimalsOrigin = sourceBaskets.reduce((sum, sb) => sum + (sb.animalCount || 0), 0);
    const totalAnimalsDestination = destinationBaskets.reduce((sum, db) => sum + (db.animalCount || 0), 0);
    const mortality = totalAnimalsOrigin - totalAnimalsDestination;
    
    console.log(`📊 CALCOLO MORTALITÀ:`);
    console.log(`   Animali origine: ${totalAnimalsOrigin}`);
    console.log(`   Animali destinazione: ${totalAnimalsDestination}`);
    console.log(`   Mortalità calcolata: ${mortality} (${mortality > 0 ? 'perdita' : 'guadagno'})`);

    // VALIDAZIONE AGGIUNTIVA: Verifica cestelli con doppio ruolo (origine E destinazione)
    const sourceBasketsIds = new Set(sourceBaskets.map(sb => sb.basketId));
    const destBasketsIds = new Set(destinationBaskets.map(db => db.basketId));
    const doublRoleBaskets = Array.from(sourceBasketsIds).filter(id => destBasketsIds.has(id));
    
    if (doublRoleBaskets.length > 0) {
      console.log(`⚠️ ATTENZIONE: ${doublRoleBaskets.length} cestelli sono sia origine che destinazione:`, doublRoleBaskets);
      console.log(`   Questo è supportato: prima verranno cessati, poi riattivati con nuovo ciclo.`);
    }

    // TRANSAZIONE CORRETTA
    // Array per salvare gli ID delle operazioni di vendita create
    const saleOperationIds: number[] = [];
    
    await db.transaction(async (tx) => {
      
      // ====== FASE 1: CHIUSURA CESTELLI ORIGINE (TUTTI) ======
      console.log(`🔒 FASE 1: Chiusura ${sourceBaskets.length} cestelli origine`);
      
      for (const sourceBasket of sourceBaskets) {
        console.log(`   Processando cestello origine ${sourceBasket.basketId}...`);
        
        // Ottieni info cestello
        const basketInfo = await tx.select()
          .from(baskets)
          .where(eq(baskets.id, sourceBasket.basketId))
          .limit(1);

        if (basketInfo.length > 0 && basketInfo[0].currentCycleId) {
          
          // Recupera l'ultima operazione del cestello per ottenere taglia e peso
          const lastOp = await tx.select()
            .from(operations)
            .where(
              and(
                eq(operations.basketId, sourceBasket.basketId),
                eq(operations.cycleId, basketInfo[0].currentCycleId)
              )
            )
            .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
            .limit(1);
          
          // 1. OPERAZIONE CHIUSURA-CICLO-VAGLIATURA (specifica per tracciabilità)
          await tx.insert(operations).values({
            date: selection[0].date,
            type: 'chiusura-ciclo-vagliatura',
            basketId: sourceBasket.basketId,
            cycleId: basketInfo[0].currentCycleId,
            animalCount: sourceBasket.animalCount,
            totalWeight: sourceBasket.totalWeight || (lastOp.length > 0 ? lastOp[0].totalWeight : null),
            sizeId: sourceBasket.sizeId || (lastOp.length > 0 ? lastOp[0].sizeId : null),
            animalsPerKg: sourceBasket.animalsPerKg || (lastOp.length > 0 ? lastOp[0].animalsPerKg : null),
            notes: `Chiusura per vagliatura #${selection[0].selectionNumber} del ${selection[0].date}. ` +
                   `Animali distribuiti: ${totalAnimalsDestination}. Mortalità: ${mortality}`
          });

          // 2. CHIUDI IL CICLO
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
            })
            .where(eq(cycles.id, basketInfo[0].currentCycleId));

          // 3. LIBERA IL CESTELLO (disponibile per riutilizzo)
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null
            })
            .where(eq(baskets.id, sourceBasket.basketId));

          console.log(`   ✅ Cestello ${sourceBasket.basketId} cessato correttamente`);
        }
      }

      // ====== FASE 2: ATTIVAZIONE CESTELLI DESTINAZIONE ======
      console.log(`🆕 FASE 2: Attivazione ${destinationBaskets.length} cestelli destinazione`);
      
      // ====== DISTRIBUZIONE PROPORZIONALE DEI LOTTI ======
      // Raccogli lotti dalle origini REALI nel database (non dai dati input)
      const sourceBasketData = await tx.select()
        .from(selectionSourceBaskets)
        .where(eq(selectionSourceBaskets.selectionId, Number(id)));
      
      const lotComposition = new Map<number, number>();
      
      for (const sourceBasket of sourceBasketData) {
        if (sourceBasket.lotId) {
          const current = lotComposition.get(sourceBasket.lotId) || 0;
          lotComposition.set(sourceBasket.lotId, current + (sourceBasket.animalCount || 0));
          console.log(`🔍 Lotto trovato: ${sourceBasket.lotId} con ${sourceBasket.animalCount} animali (cestello ${sourceBasket.basketId})`);
        }
      }
      
      // Gestione caso senza lotti: usa lotto di default
      let primaryLotId: number;
      let lotPercentages = new Map<number, number>();
      let isMixedLot = false;
      
      if (lotComposition.size === 0) {
        console.log(`⚠️ ATTENZIONE: Nessun lotto trovato nei cestelli origine, uso lotto di default`);
        // Usa il primo lotto disponibile nel sistema come default
        const [defaultLot] = await tx.select({ id: lots.id }).from(lots).limit(1);
        if (!defaultLot) {
          await tx.rollback();
          return res.status(400).json({
            success: false,
            error: "ERRORE CRITICO: Nessun lotto disponibile nel sistema per completare la vagliatura"
          });
        }
        primaryLotId = defaultLot.id;
        lotPercentages.set(primaryLotId, 1.0); // 100% al lotto default
        console.log(`🎯 Lotto default assegnato: ${primaryLotId} (100%)`);
      } else {
        // Calcola percentuali per distribuzione proporzionale
        const totalAnimals = Array.from(lotComposition.values()).reduce((a, b) => a + b, 0);
        isMixedLot = lotComposition.size > 1;
        
        for (const [lotId, count] of Array.from(lotComposition.entries())) {
          lotPercentages.set(lotId, count / totalAnimals);
        }
        
        // Trova il lotto PRINCIPALE per il ciclo (maggior quantità)
        const dominantLot = Array.from(lotComposition.entries())
          .sort(([, a], [, b]) => b - a)[0];
        primaryLotId = dominantLot[0];
        
        console.log(`🎯 Lotto principale: ${primaryLotId} (${dominantLot[1]} animali)`);
        if (isMixedLot) {
          console.log(`🔀 Vagliatura MISTA rilevata: ${lotComposition.size} lotti diversi`);
          console.log(`📊 Composizione percentuale:`, Array.from(lotPercentages.entries()).map(([id, perc]) => `Lotto ${id}: ${(perc * 100).toFixed(1)}%`));
        }
      }
      
      for (const destBasket of destinationBaskets) {
        console.log(`   Processando cestello destinazione ${destBasket.basketId}...`);
        
        // 1. CREA NUOVO CICLO
        const [newCycle] = await tx.insert(cycles).values({
          basketId: destBasket.basketId,
          lotId: primaryLotId, // ✅ LOTTO PRINCIPALE per compatibilità DB
          startDate: selection[0].date,
          state: 'active'
        }).returning();

        // 1.1. AGGIORNA cycle_id in selection_destination_baskets
        await tx.update(selectionDestinationBaskets)
          .set({ cycleId: newCycle.id })
          .where(
            and(
              eq(selectionDestinationBaskets.selectionId, Number(id)),
              eq(selectionDestinationBaskets.basketId, destBasket.basketId)
            )
          );

        // 1.5. DISTRIBUZIONE PROPORZIONALE DEI LOTTI
        console.log(`   📊 Distribuzione proporzionale ${lotPercentages.size} lotti nel cestello ${destBasket.basketId}:`);
        let totalDistributed = 0;
        const lotDistributions: { lotId: number; animals: number }[] = [];
        
        // Calcola animali per ogni lotto secondo le percentuali  
        const basketAnimalCount = destBasket.animalCount || 0;
        for (const [lotId, percentage] of Array.from(lotPercentages.entries())) {
          const proportionalAnimals = Math.round(basketAnimalCount * percentage);
          lotDistributions.push({ lotId, animals: proportionalAnimals });
          totalDistributed += proportionalAnimals;
          console.log(`      Lotto ${lotId}: ${proportionalAnimals} animali (${(percentage * 100).toFixed(1)}%)`);
        }
        
        // Gestione remainder per arrotondamenti
        const remainder = basketAnimalCount - totalDistributed;
        if (remainder !== 0 && lotDistributions.length > 0) {
          lotDistributions[0].animals += remainder; // Assegna il remainder al lotto principale
          console.log(`      Remainder ${remainder} animali assegnati al lotto principale ${lotDistributions[0].lotId}`);
        }
        
        // Registra composizione nella tabella basketLotComposition
        for (const { lotId, animals } of lotDistributions) {
          if (animals > 0) { // Solo se ci sono animali da registrare
            const percentage = basketAnimalCount > 0 ? (animals / basketAnimalCount) : 0;
            await tx.insert(basketLotComposition).values({
              basketId: destBasket.basketId,
              cycleId: newCycle.id,
              lotId: lotId,
              animalCount: animals,
              percentage: percentage,
              sourceSelectionId: Number(id), // Tracciabilità della vagliatura
              notes: `Da vagliatura #${selection[0].selectionNumber} del ${selection[0].date}`
            });
          }
        }

        // 2. DETERMINA TAGLIA
        let actualSizeId = destBasket.sizeId;
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            actualSizeId = await determineSizeId(destBasket.animalsPerKg);
          }
        }

        // 3. OPERAZIONE PRIMA-ATTIVAZIONE (APPROCCIO IBRIDO)
        let operationNotes = `Da vagliatura #${selection[0].selectionNumber} del ${selection[0].date}`;
        
        if (isMixedLot) {
          // Crea stringa con composizione dettagliata
          const compositionDetails = lotDistributions
            .map(({ lotId, animals }) => {
              const percentage = basketAnimalCount > 0 ? ((animals / basketAnimalCount) * 100).toFixed(1) : '0.0';
              return `Lotto ${lotId} (${percentage}%, ${animals.toLocaleString('it-IT')} pz)`;
            })
            .join(', ');
          
          operationNotes += ` - LOTTO MISTO: ${compositionDetails}`;
        }
        
        const operationMetadata = isMixedLot 
          ? JSON.stringify({ isMixed: true, sourceSelection: Number(id), dominantLot: primaryLotId, lotCount: lotComposition.size })
          : null;
        
        await tx.insert(operations).values({
          date: selection[0].date,
          type: 'prima-attivazione',
          basketId: destBasket.basketId,
          cycleId: newCycle.id,
          lotId: primaryLotId, // ✅ LOTTO DOMINANTE per query veloci
          animalCount: destBasket.animalCount,
          totalWeight: destBasket.totalWeight,
          animalsPerKg: destBasket.animalsPerKg,
          averageWeight: destBasket.totalWeight && destBasket.animalCount 
                        ? Math.round((destBasket.totalWeight / destBasket.animalCount) * 1000) 
                        : 0,
          deadCount: destBasket.deadCount || 0,
          mortalityRate: destBasket.mortalityRate || 0,
          sizeId: actualSizeId,
          metadata: operationMetadata,
          notes: operationNotes
        });

        // 4. GESTISCI POSIZIONAMENTO O VENDITA
        if (destBasket.destinationType === 'sold') {
          // VENDITA IMMEDIATA (APPROCCIO IBRIDO)
          let saleNotes = `Vendita diretta da vagliatura #${selection[0].selectionNumber}`;
          
          if (isMixedLot) {
            // Crea stringa con composizione dettagliata
            const compositionDetails = lotDistributions
              .map(({ lotId, animals }) => {
                const percentage = basketAnimalCount > 0 ? ((animals / basketAnimalCount) * 100).toFixed(1) : '0.0';
                return `Lotto ${lotId} (${percentage}%, ${animals.toLocaleString('it-IT')} pz)`;
              })
              .join(', ');
            
            saleNotes += ` - LOTTO MISTO: ${compositionDetails}`;
          }
          
          const [saleOperation] = await tx.insert(operations).values({
            date: selection[0].date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: newCycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            averageWeight: destBasket.totalWeight && destBasket.animalCount 
                          ? Math.round((destBasket.totalWeight / destBasket.animalCount) * 1000) 
                          : 0,
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
            sizeId: actualSizeId,
            lotId: primaryLotId, // ✅ LOTTO DOMINANTE
            metadata: operationMetadata,
            notes: saleNotes
          }).returning();
          
          // Salva l'ID dell'operazione di vendita per creare la notifica DOPO il commit
          if (saleOperation) {
            saleOperationIds.push(saleOperation.id);
            console.log(`📧 Operazione vendita ${saleOperation.id} salvata per notifica post-commit`);
          }

          // Chiudi ciclo per vendita
          await tx.update(cycles)
            .set({ state: 'closed', endDate: selection[0].date })
            .where(eq(cycles.id, newCycle.id));

          // Rendi cestello disponibile - CORREZIONE: Non forzare posizione hardcoded
          // Se il cestello venduto aveva una posizione specificata, la mantiene
          // Altrimenti, lascia NULL per evitare conflitti
          let updateData: any = { 
            state: 'available',
            currentCycleId: null  // Usa null invece di undefined
          };

          // Se c'è una posizione specificata per il cestello venduto, usala
          if (destBasket.position) {
            const positionStr = String(destBasket.position);
            const match = positionStr.match(/^([A-Z]+)(\d+)$/);
            if (match) {
              updateData.row = match[1];
              updateData.position = parseInt(match[2]);
              updateData.flupsyId = destBasket.flupsyId || null;
              console.log(`      📍 Cestello venduto ${destBasket.basketId} mantiene posizione ${match[1]}-${match[2]}`);
            } else {
              // Se il formato non è valido, lascia posizione NULL
              updateData.row = null;
              updateData.position = null;
              updateData.flupsyId = null;
              console.log(`      📍 Cestello venduto ${destBasket.basketId} senza posizione valida - liberato`);
            }
          } else {
            // Nessuna posizione specificata - libera completamente il cestello
            updateData.row = null;
            updateData.position = null;
            updateData.flupsyId = null;
            console.log(`      📍 Cestello venduto ${destBasket.basketId} liberato senza posizione`);
          }

          await tx.update(baskets)
            .set(updateData)
            .where(eq(baskets.id, destBasket.basketId));

        } else {
          // POSIZIONAMENTO NORMALE
          const positionStr = String(destBasket.position || '');
          const match = positionStr.match(/^([A-Z]+)(\d+)$/);
          
          if (match) {
            const row = match[1];
            const position = parseInt(match[2]);
            
            await tx.update(baskets)
              .set({
                flupsyId: destBasket.flupsyId || 1,
                row: row,
                position: position,
                state: 'active',
                currentCycleId: newCycle.id
              })
              .where(eq(baskets.id, destBasket.basketId));
          }
        }

        console.log(`   ✅ Cestello ${destBasket.basketId} attivato correttamente`);
      }

      // ====== FASE 2.5: REGISTRAZIONE LOT LEDGER (TRACCIABILITÀ PRECISA) ======
      console.log(`📋 FASE 2.5: Registrazione lot ledger per tracciabilità precisa`);
      
      // Prepara allocation basis per audit trail
      const allocationBasis = createAllocationBasis(
        'proportional',
        lotComposition,
        Array.from(lotComposition.values()).reduce((a, b) => a + b, 0),
        'balanced_rounding_v1'
      );
      
      // REGISTRA TRANSFER_OUT dalle ceste origine (usando arrotondamento bilanciato)
      console.log(`   📤 Registrando ${lotComposition.size} lotti in uscita dalle origine`);
      for (const [lotId, totalAnimals] of Array.from(lotComposition.entries())) {
        const idempotencyKey = generateIdempotencyKey('transfer_out', Number(id), lotId);
        
        try {
          await tx.insert(lotLedger).values({
            date: selection[0].date,
            lotId: lotId,
            type: 'transfer_out',
            quantity: totalAnimals.toString(),
            selectionId: Number(id),
            allocationMethod: 'proportional',
            allocationBasis: allocationBasis,
            idempotencyKey: idempotencyKey,
            notes: `Uscita da vagliatura #${selection[0].selectionNumber} - ${totalAnimals} animali`
          });
          console.log(`      ✅ Transfer_out lotto ${lotId}: ${totalAnimals} animali`);
        } catch (error: any) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`      ⚠️ Transfer_out lotto ${lotId} già registrato (idempotent)`);
          } else {
            throw error;
          }
        }
      }
      
      // REGISTRA TRANSFER_IN/SALE nelle ceste destinazione (usando arrotondamento bilanciato)
      console.log(`   📥 Registrando distribuzione nelle ${destinationBaskets.length} ceste destinazione`);
      for (const destBasket of destinationBaskets) {
        const basketAnimalCount = destBasket.animalCount || 0;
        
        if (basketAnimalCount > 0) {
          // Usa arrotondamento bilanciato per preservare totali esatti
          const balancedResult = balancedRounding(basketAnimalCount, lotPercentages);
          
          console.log(`      📊 Cestello ${destBasket.basketId} (${basketAnimalCount} animali):`);
          
          for (const allocation of balancedResult.allocations) {
            const ledgerType = destBasket.destinationType === 'sold' ? 'sale' : 'transfer_in';
            const idempotencyKey = generateIdempotencyKey(
              ledgerType, 
              Number(id), 
              allocation.lotId, 
              destBasket.basketId
            );
            
            try {
              await tx.insert(lotLedger).values({
                date: selection[0].date,
                lotId: allocation.lotId,
                type: ledgerType,
                quantity: allocation.roundedQuantity.toString(),
                destCycleId: destBasket.destinationType === 'sold' ? null : undefined,
                selectionId: Number(id),
                basketId: destBasket.basketId,
                allocationMethod: 'proportional',
                allocationBasis: allocationBasis,
                idempotencyKey: idempotencyKey,
                notes: `${ledgerType === 'sale' ? 'Vendita' : 'Ingresso'} da vagliatura #${selection[0].selectionNumber} - ${allocation.roundedQuantity} animali (${(allocation.percentage * 100).toFixed(1)}%)`
              });
              
              console.log(`         ✅ ${ledgerType} lotto ${allocation.lotId}: ${allocation.roundedQuantity} animali (${(allocation.percentage * 100).toFixed(1)}%)`);
            } catch (error: any) {
              if (error.code === '23505') { // Unique constraint violation
                console.log(`         ⚠️ ${ledgerType} lotto ${allocation.lotId} già registrato (idempotent)`);
              } else {
                throw error;
              }
            }
          }
          
          // Verifica matematica
          const totalAllocated = balancedResult.allocations.reduce((sum, alloc) => sum + alloc.roundedQuantity, 0);
          if (totalAllocated !== basketAnimalCount) {
            console.error(`❌ ERRORE MATEMATICO: Cestello ${destBasket.basketId} atteso ${basketAnimalCount}, allocato ${totalAllocated}`);
          } else {
            console.log(`         ✅ Verifica matematica: ${totalAllocated} = ${basketAnimalCount} ✓`);
          }
        }
      }
      
      // REGISTRA MORTALITÀ (usando arrotondamento bilanciato)
      if (mortality > 0) {
        console.log(`   💀 Registrando mortalità di ${mortality} animali`);
        const mortalityResult = balancedRounding(mortality, lotPercentages);
        
        for (const allocation of mortalityResult.allocations) {
          const idempotencyKey = generateIdempotencyKey('mortality', Number(id), allocation.lotId);
          
          try {
            await tx.insert(lotLedger).values({
              date: selection[0].date,
              lotId: allocation.lotId,
              type: 'mortality',
              quantity: allocation.roundedQuantity.toString(),
              selectionId: Number(id),
              allocationMethod: 'proportional',
              allocationBasis: allocationBasis,
              idempotencyKey: idempotencyKey,
              notes: `Mortalità da vagliatura #${selection[0].selectionNumber} - ${allocation.roundedQuantity} animali (${(allocation.percentage * 100).toFixed(1)}%)`
            });
            
            console.log(`      ✅ Mortalità lotto ${allocation.lotId}: ${allocation.roundedQuantity} animali (${(allocation.percentage * 100).toFixed(1)}%)`);
          } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
              console.log(`      ⚠️ Mortalità lotto ${allocation.lotId} già registrata (idempotent)`);
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log(`✅ FASE 2.5 COMPLETATA: Lot ledger registrato con arrotondamento bilanciato`);

      // ====== FASE 3: GESTIONE MORTALITÀ MISTA AVANZATA ======
      console.log(`🧮 FASE 3: Calcolo composizione aggregata e mortalità proporzionale`);
      
      // Calcola la composizione aggregata dai cestelli origine
      const { aggregatedComposition, totalSourceAnimals } = await calculateAggregatedComposition(Number(id));
      
      // Distribuisce la composizione nei cestelli destinazione
      await distributeCompositionToDestinations(Number(id), aggregatedComposition, totalSourceAnimals);
      
      // Calcola e registra mortalità per ogni lotto proporzionalmente
      await calculateAndRegisterMortality(
        Number(id), 
        aggregatedComposition, 
        totalSourceAnimals, 
        totalAnimalsDestination, 
        selection[0].date
      );
      
      console.log(`✅ Mortalità distribuita proporzionalmente su ${aggregatedComposition.length} lotti`);

      // ====== FASE 4: STORICIZZAZIONE RELAZIONI ======
      console.log(`📝 FASE 4: Storicizzazione relazioni vagliatura`);
      
      // Registra relazioni fonte->destinazione per tracciabilità
      for (const sourceBasket of sourceBaskets) {
        for (const destBasket of destinationBaskets) {
          await tx.insert(selectionBasketHistory).values({
            selectionId: Number(id),
            sourceBasketId: sourceBasket.basketId,
            sourceCycleId: sourceBasket.cycleId,
            destinationBasketId: destBasket.basketId,
            destinationCycleId: 0 // Sarà aggiornato con l'ID reale del nuovo ciclo
          });
        }
      }

      // ====== FASE 5: FINALIZZAZIONE SELEZIONE ======
      await tx.update(selections)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(selections.id, Number(id)));

      console.log(`✅ VAGLIATURA COMPLETATA CORRETTAMENTE!`);
    });

    // Crea notifiche per le operazioni di vendita DOPO il commit della transazione
    if (saleOperationIds.length > 0 && req.app?.locals?.createSaleNotification) {
      console.log(`📧 Creazione ${saleOperationIds.length} notifiche vendita post-commit...`);
      for (const operationId of saleOperationIds) {
        try {
          const notification = await req.app.locals.createSaleNotification(operationId);
          if (notification) {
            console.log(`✅ Notifica vendita ${notification.id} creata per operazione ${operationId}`);
          }
        } catch (err) {
          console.error(`❌ Errore creazione notifica vendita per operazione ${operationId}:`, err);
        }
      }
    }

    // Invia email di conferma vagliatura
    try {
      const { sendScreeningConfirmationEmail } = await import('../services/screening-email-service');
      
      // Recupera info FLUPSY e cestello del primo origine per l'email
      const firstSourceBasket = sourceBaskets[0];
      const basketInfo = await db.select({
        basketNumber: baskets.physicalNumber,
        flupsyName: flupsys.name,
        flupsyLocation: flupsys.location
      })
      .from(baskets)
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .where(eq(baskets.id, firstSourceBasket.basketId))
      .limit(1);
      
      // Recupera info dettagliate dei cestelli origine
      const sourceBasketDetails = await Promise.all(
        sourceBaskets.map(async (source) => {
          const basket = await db.select({
            basketNumber: baskets.physicalNumber,
            animalCount: sql<number>`${source.animalCount}`,
            sizeCode: sizes.code
          })
          .from(baskets)
          .leftJoin(sizes, eq(sizes.id, source.sizeId))
          .where(eq(baskets.id, source.basketId))
          .limit(1);
          
          return {
            basketNumber: basket[0]?.basketNumber || 'N/A',
            animalCount: source.animalCount || 0,
            sizeCode: basket[0]?.sizeCode || 'N/A'
          };
        })
      );
      
      // Recupera info taglie per i risultati con destinazione dettagliata
      const resultsWithSizes = await Promise.all(
        destinationBaskets.map(async (dest) => {
          const sizeInfo = dest.sizeId ? await db.select()
            .from(sizes)
            .where(eq(sizes.id, dest.sizeId))
            .limit(1) : [];
          
          return {
            sizeCode: sizeInfo[0]?.code || 'N/A',
            quantity: dest.animalCount || 0,
            averageWeight: dest.animalsPerKg ? (1000 / dest.animalsPerKg) : null,
            destination: dest.destinationType === 'sale' ? 'sale' : 
                        dest.destinationType === 'basket' ? 'basket' : 'discard',
            targetBasketNumber: dest.destinationType === 'basket' ? dest.position : null
          };
        })
      );
      
      const totalSold = destinationBaskets
        .filter(d => d.destinationType === 'sale')
        .reduce((sum, d) => sum + (d.animalCount || 0), 0);
      
      const totalRepositioned = destinationBaskets
        .filter(d => d.destinationType === 'basket')
        .reduce((sum, d) => sum + (d.animalCount || 0), 0);
      
      const totalDiscarded = destinationBaskets
        .filter(d => d.destinationType === 'discard')
        .reduce((sum, d) => sum + (d.animalCount || 0), 0);
      
      await sendScreeningConfirmationEmail({
        date: selection[0].selectionDate || new Date(),
        flupsyName: basketInfo[0]?.flupsyName || 'N/A',
        flupsyLocation: basketInfo[0]?.flupsyLocation || 'N/A',
        basketNumber: basketInfo[0]?.basketNumber || 'N/A',
        type: selection[0].type || 'normal',
        sourceBaskets: sourceBasketDetails,
        results: resultsWithSizes,
        totalSold,
        totalRepositioned,
        totalDiscarded,
        totalOrigin: totalAnimalsOrigin,
        mortality: mortality,
        notes: selection[0].notes || ''
      });
      
      console.log('✅ Email conferma vagliatura inviata');
    } catch (emailError) {
      console.error('❌ Errore invio email vagliatura (non bloccante):', emailError);
    }

    // Invia notifiche WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('selection_completed', {
        selectionId: Number(id),
        message: `Vagliatura #${selection[0].selectionNumber} completata con successo`,
        mortality: mortality,
        totalAnimalsOrigin: totalAnimalsOrigin,
        totalAnimalsDestination: totalAnimalsDestination
      });
    }

    return res.status(200).json({
      success: true,
      message: `Vagliatura #${selection[0].selectionNumber} completata con successo`,
      selectionId: Number(id),
      mortality: mortality,
      totalAnimalsOrigin: totalAnimalsOrigin,
      totalAnimalsDestination: totalAnimalsDestination,
      sourceBasketsClosed: sourceBaskets.length,
      destinationBasketsActivated: destinationBaskets.length
    });

  } catch (error) {
    console.error("❌ ERRORE DURANTE COMPLETAMENTO VAGLIATURA:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il completamento della vagliatura: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Determina automaticamente l'ID della taglia basandosi sugli animali per kg
 */
async function determineSizeId(animalsPerKg: number): Promise<number | null> {
  try {
    const sizeResult = await db.select()
      .from(sizes)
      .where(
        and(
          sql`${animalsPerKg} >= ${sizes.minAnimalsPerKg}`,
          sql`${animalsPerKg} <= ${sizes.maxAnimalsPerKg}`
        )
      )
      .limit(1);
    
    return sizeResult.length > 0 ? sizeResult[0].id : null;
  } catch (error) {
    console.error("Errore determinazione taglia:", error);
    return null;
  }
}

/**
 * Genera un report PDF per una selezione/vagliatura
 */
export async function generatePDFReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Recupera dati selezione
    const selection = await db.select()
      .from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
    
    if (!selection || selection.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Selezione non trovata"
      });
    }
    
    // Recupera cestelli origine
    const sourceBaskets = await db.select()
    .from(selectionSourceBaskets)
    .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    // Recupera cestelli destinazione
    const destBaskets = await db.select()
    .from(selectionDestinationBaskets)
    .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    // Calcola totali
    const totalSourceAnimals = sourceBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
    const totalDestAnimals = destBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
    const mortality = Math.max(0, totalSourceAnimals - totalDestAnimals);
    const mortalityPercent = totalSourceAnimals > 0 ? ((mortality / totalSourceAnimals) * 100).toFixed(2) : '0';
    
    // Genera HTML
    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Vagliatura #${selection[0].selectionNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #1e40af;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-box {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: bold;
        }
        .summary {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .mortality {
            color: #dc2626;
            font-weight: bold;
        }
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <h1>Report Vagliatura #${selection[0].selectionNumber}</h1>
    
    <div class="info-grid">
        <div class="info-box">
            <h3>Data Vagliatura</h3>
            <p>${new Date(selection[0].date).toLocaleDateString('it-IT')}</p>
        </div>
        <div class="info-box">
            <h3>Stato</h3>
            <p>${selection[0].status === 'completed' ? 'Completata' : 'In corso'}</p>
        </div>
    </div>
    
    <h2>Cestelli Origine (${sourceBaskets.length})</h2>
    <table>
        <thead>
            <tr>
                <th>Cestello ID</th>
                <th>Animali</th>
                <th>Peso (kg)</th>
                <th>Animali/kg</th>
            </tr>
        </thead>
        <tbody>
            ${sourceBaskets.map(b => `
                <tr>
                    <td>#${b.basketId}</td>
                    <td>${(b.animalCount || 0).toLocaleString('it-IT')}</td>
                    <td>${(b.totalWeight || 0).toFixed(2)}</td>
                    <td>${(b.animalsPerKg || 0).toLocaleString('it-IT')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2>Cestelli Destinazione (${destBaskets.length})</h2>
    <table>
        <thead>
            <tr>
                <th>Cestello ID</th>
                <th>Animali</th>
                <th>Peso (kg)</th>
                <th>Animali/kg</th>
            </tr>
        </thead>
        <tbody>
            ${destBaskets.map(b => `
                <tr>
                    <td>#${b.basketId}</td>
                    <td>${(b.animalCount || 0).toLocaleString('it-IT')}</td>
                    <td>${(b.totalWeight || 0).toFixed(2)}</td>
                    <td>${(b.animalsPerKg || 0).toLocaleString('it-IT')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="summary">
        <h2>Riepilogo</h2>
        <p><strong>Totale Animali Origine:</strong> ${totalSourceAnimals.toLocaleString('it-IT')}</p>
        <p><strong>Totale Animali Destinazione:</strong> ${totalDestAnimals.toLocaleString('it-IT')}</p>
        <p class="mortality"><strong>Mortalità:</strong> ${mortality.toLocaleString('it-IT')} (${mortalityPercent}%)</p>
    </div>
    
    <p style="text-align: center; margin-top: 50px; color: #6b7280; font-size: 12px;">
        Report generato il ${new Date().toLocaleString('it-IT')} - FLUPSY Management System
    </p>
</body>
</html>
    `;
    
    // Usa puppeteer per generare PDF
    const { pdfGenerator } = await import('../services/pdf-generator');
    const pdfBuffer = await pdfGenerator.generateFromHTML(html, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    // Converti Uint8Array in Buffer (puppeteer restituisce Uint8Array)
    const buffer = Buffer.from(pdfBuffer);
    
    // Invia PDF al client
    res.status(200);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="vagliatura-${selection[0].selectionNumber}.pdf"`,
      'Content-Length': buffer.length
    });
    res.end(buffer);
    
  } catch (error) {
    console.error("Errore durante la generazione del PDF:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la generazione del PDF: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}