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

  // Accumula la composizione totale
  const totalComposition = new Map<number, number>(); // lotId -> totalAnimals
  let grandTotal = 0;

  for (const source of sourceBaskets) {
    // Verifica se il cestello ha già una composizione registrata
    const existingComposition = await getBasketLotComposition(source.basketId, source.cycleId);
    
    if (existingComposition.length > 0) {
      // Cestello con composizione mista - somma tutti i lotti
      for (const comp of existingComposition) {
        const current = totalComposition.get(comp.lotId) || 0;
        totalComposition.set(comp.lotId, current + comp.animalCount);
        grandTotal += comp.animalCount;
      }
      console.log(`📦 Cestello ${source.basketId} (composizione mista):`, existingComposition);
    } else {
      // Cestello puro - usa il lotto dalle operazioni
      if (source.lotId && source.animalCount) {
        const current = totalComposition.get(source.lotId) || 0;
        totalComposition.set(source.lotId, current + source.animalCount);
        grandTotal += source.animalCount;
        console.log(`📦 Cestello ${source.basketId} (puro) - Lotto ${source.lotId}: ${source.animalCount} animali`);
      }
    }
  }

  // Converti in array con percentuali
  const aggregatedComposition = Array.from(totalComposition.entries()).map(([lotId, animalCount]) => ({
    lotId,
    animalCount,
    percentage: grandTotal > 0 ? (animalCount / grandTotal) * 100 : 0
  }));

  console.log(`🧮 Composizione aggregata (${grandTotal} animali totali):`, aggregatedComposition);
  return { aggregatedComposition, totalSourceAnimals: grandTotal };
}

/**
 * Distribuisce la composizione nei cestelli destinazione
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

  console.log(`🎯 Distribuzione composizione in ${destinationBaskets.length} cestelli destinazione`);

  for (const destination of destinationBaskets) {
    if (!destination.cycleId) {
      console.log(`⚠️ Cestello ${destination.basketId} senza cycleId - skip`);
      continue;
    }

    const destAnimalCount = destination.animalCount || 0;
    console.log(`📦 Cestello destinazione ${destination.basketId}: ${destAnimalCount} animali`);

    for (const lot of aggregatedComposition) {
      const animalCount = Math.round(destAnimalCount * (lot.percentage / 100));
      
      if (animalCount > 0) {
        await db.insert(basketLotComposition).values({
          basketId: destination.basketId,
          cycleId: destination.cycleId,
          lotId: lot.lotId,
          animalCount: animalCount,
          percentage: lot.percentage,
          sourceSelectionId: selectionId,
          notes: `Vagliatura #${selectionId} - ${lot.percentage.toFixed(2)}% del totale`
        });

        console.log(`  ├── Lotto ${lot.lotId}: ${animalCount} animali (${lot.percentage.toFixed(2)}%)`);
      }
    }
  }
}

/**
 * Calcola e registra la mortalità per ogni lotto
 */
async function calculateAndRegisterMortality(selectionId: number, aggregatedComposition: Array<{lotId: number, animalCount: number, percentage: number}>, totalSourceAnimals: number, totalDestinationAnimals: number, selectionDate: string) {
  const totalMortality = totalSourceAnimals - totalDestinationAnimals;
  
  if (totalMortality <= 0) {
    console.log(`✅ Nessuna mortalità registrata (differenza: ${totalMortality})`);
    return;
  }

  console.log(`💀 MORTALITÀ TOTALE: ${totalMortality} animali da distribuire`);

  for (const lot of aggregatedComposition) {
    const lotMortality = Math.round(totalMortality * (lot.percentage / 100));
    
    if (lotMortality > 0) {
      await db.update(lots)
        .set({ 
          totalMortality: sql`COALESCE(total_mortality, 0) + ${lotMortality}`,
          lastMortalityDate: selectionDate,
          mortalityNotes: sql`COALESCE(mortality_notes, '') || ${`Vagliatura #${selectionId}: -${lotMortality} animali (${lot.percentage.toFixed(2)}%). `}`
        })
        .where(eq(lots.id, lot.lotId));

      console.log(`  💀 Lotto ${lot.lotId}: -${lotMortality} animali (${lot.percentage.toFixed(2)}%)`);
    }
  }
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
 * Ottieni tutte le selezioni
 */
export async function getSelections(req: Request, res: Response) {
  try {
    const selectionsData = await db.select().from(selections);
    return res.status(200).json({
      success: true,
      selections: selectionsData
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
    const selection = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
    
    if (!selection || selection.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Selezione non trovata"
      });
    }

    return res.status(200).json({
      success: true,
      selection: selection[0]
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
      // Prima ottieni il ciclo corrente del cestello
      const [basketData] = await db.select({
        currentCycleId: baskets.currentCycleId,
        physicalNumber: baskets.physicalNumber
      })
      .from(baskets)
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
        lotId: sourceBasket.lotId, // ✅ RIMOSSO || null - deve essere presente
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
          
          // 1. OPERAZIONE CHIUSURA-CICLO-VAGLIATURA (specifica per tracciabilità)
          await tx.insert(operations).values({
            date: selection[0].date,
            type: 'chiusura-ciclo-vagliatura',
            basketId: sourceBasket.basketId,
            cycleId: basketInfo[0].currentCycleId,
            animalCount: sourceBasket.animalCount,
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
          
          await tx.insert(operations).values({
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
          });

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