/**
 * Controller per la gestione delle operazioni di Vagliatura
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { 
  operations,
  operationTypes,
  cycles,
  baskets,
  flupsys,
  sizes
} from "../../shared/schema";
import { format } from "date-fns";

/**
 * Safe conversion utilities to prevent NaN values
 */
function safeNumber(value: any, defaultValue: number | null = null): number | null {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function safeInteger(value: any, defaultValue: number | null = null): number | null {
  const num = safeNumber(value, defaultValue);
  return num !== null ? Math.round(num) : null;
}

/**
 * Prepara i dati per un'operazione di vagliatura senza fare modifiche al database
 * Calcola tutti i parametri necessari in base ai dati di input
 */
export async function prepareScreeningOperation(req: Request, res: Response) {
  try {
    const { 
      sourceBasketIds, 
      sampleWeight,
      sampleCount,
      deadCount,
      date,
      notes
    } = req.body;
    
    if (!sourceBasketIds || !Array.isArray(sourceBasketIds) || sourceBasketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario fornire almeno un cestello di origine"
      });
    }
    
    if (!sampleWeight || isNaN(Number(sampleWeight)) || Number(sampleWeight) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Peso del campione non valido"
      });
    }
    
    if (!sampleCount || isNaN(Number(sampleCount)) || Number(sampleCount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Numero di animali nel campione non valido"
      });
    }
    
    // 1. Recupero informazioni sui cestelli di origine
    const sourceBasketsData = await Promise.all(sourceBasketIds.map(async (basketId) => {
      const basket = await db.select()
        .from(baskets)
        .where(eq(baskets.id, basketId))
        .limit(1);
      
      if (!basket || basket.length === 0) {
        throw new Error(`Cestello con ID ${basketId} non trovato`);
      }
      
      // Recupera l'ultima operazione per questo cestello
      const latestOperation = await db.select()
        .from(operations)
        .where(eq(operations.basketId, basketId))
        .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
        .limit(1);
        
      // Recupera i dati del ciclo corrente
      let cycle = null;
      if (basket[0].currentCycleId) {
        const cycleData = await db.select()
          .from(cycles)
          .where(eq(cycles.id, basket[0].currentCycleId))
          .limit(1);
        
        if (cycleData && cycleData.length > 0) {
          cycle = cycleData[0];
        }
      }
      
      return {
        basket: basket[0],
        lastOperation: latestOperation.length > 0 ? latestOperation[0] : null,
        cycle
      };
    }));
    
    // 2. Calcoli
    // Calcolo animali per kg
    const animalsPerKg = Number(sampleCount) / (Number(sampleWeight) / 1000); // sampleWeight è in grammi
    
    // Calcolo mortalità
    const mortalityRate = (Number(deadCount) / Number(sampleCount)) * 100;
    
    // Determinazione taglia in base ad animali per kg
    const sizeId = await determineSizeId(animalsPerKg);
    
    // 3. Recupero informazioni taglia
    let sizeData = null;
    if (sizeId) {
      const sizeResult = await db.select()
        .from(sizes)
        .where(eq(sizes.id, sizeId))
        .limit(1);
      
      if (sizeResult && sizeResult.length > 0) {
        sizeData = sizeResult[0];
      }
    }
    
    // 4. Cerca cestelli disponibili da suggerire come destinazione
    const availableBaskets = await db.select({
      id: baskets.id,
      physicalNumber: baskets.physicalNumber,
      state: baskets.state,
      flupsyId: baskets.flupsyId,
      row: baskets.row,
      position: baskets.position
    })
    .from(baskets)
    .where(
      and(
        eq(baskets.state, 'active'),
        isNull(baskets.currentCycleId)
      )
    )
    .limit(10); // Suggeriamo massimo 10 cestelli
    
    // 5. Trova posizioni disponibili nei FLUPSY
    const availablePositions = await findAvailablePositions();
    
    // 6. Prepara la risposta
    const result = {
      sourceBaskets: sourceBasketsData,
      calculatedValues: {
        animalsPerKg: Math.round(animalsPerKg),
        mortalityRate: mortalityRate.toFixed(2),
        sizeId,
        size: sizeData
      },
      suggestedDestinations: {
        availableBaskets,
        availablePositions
      },
      previewOnly: true // Indica che questa è solo una preview, non sono state fatte modifiche al DB
    };
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error("Errore durante la preparazione dell'operazione di vagliatura:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante la preparazione dell'operazione di vagliatura: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Esegue un'operazione di vagliatura con tutti i suoi effetti (le scritture DB avvengono solo qui)
 */
export async function executeScreeningOperation(req: Request, res: Response) {
  try {
    const { 
      sourceBasketIds, 
      destinationBaskets,
      sampleWeight,
      sampleCount,
      deadCount,
      date,
      notes,
      sizeId,
      animalsPerKg, // Potrebbe essere ri-calcolato o usato direttamente
      mortalityRate  // Potrebbe essere ri-calcolato o usato direttamente
    } = req.body;
    
    // Safely convert numeric values to prevent NaN
    const safeSampleWeight = safeNumber(sampleWeight);
    const safeSampleCount = safeInteger(sampleCount);
    const safeDeadCount = safeInteger(deadCount, 0);
    const safeAnimalsPerKg = safeInteger(animalsPerKg);
    const safeMortalityRate = safeNumber(mortalityRate);
    const safeSizeId = safeInteger(sizeId);
    
    // Controlli di validazione
    if (!sourceBasketIds || !Array.isArray(sourceBasketIds) || sourceBasketIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario fornire almeno un cestello di origine"
      });
    }
    
    if (!destinationBaskets || !Array.isArray(destinationBaskets) || destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario fornire almeno un cestello di destinazione"
      });
    }
    
    if (!safeSampleWeight || safeSampleWeight <= 0) {
      return res.status(400).json({
        success: false,
        error: "Peso del campione non valido"
      });
    }
    
    if (!safeSampleCount || safeSampleCount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Numero di animali nel campione non valido"
      });
    }
    
    // Esegui tutta l'operazione in una singola transazione
    const result = await db.transaction(async (tx) => {
      // 1. Verifica e recupera informazioni sui cestelli di origine
      const sourceBasketData = await Promise.all(sourceBasketIds.map(async (basketId) => {
        const basket = await tx.select()
          .from(baskets)
          .where(eq(baskets.id, basketId))
          .limit(1);
        
        if (!basket || basket.length === 0) {
          throw new Error(`Cestello di origine con ID ${basketId} non trovato`);
        }
        
        if (!basket[0].currentCycleId) {
          throw new Error(`Il cestello di origine ${basket[0].physicalNumber} non ha un ciclo attivo`);
        }
        
        return basket[0];
      }));
      
      // 2. Verifica e prepara i cestelli di destinazione
      const destinationBasketData = await Promise.all(destinationBaskets.map(async (destBasket) => {
        const basket = await tx.select()
          .from(baskets)
          .where(eq(baskets.id, destBasket.basketId))
          .limit(1);
        
        if (!basket || basket.length === 0) {
          throw new Error(`Cestello di destinazione con ID ${destBasket.basketId} non trovato`);
        }
        
        if (basket[0].currentCycleId) {
          throw new Error(`Il cestello di destinazione ${basket[0].physicalNumber} ha già un ciclo attivo`);
        }
        
        // Controlla se la posizione richiesta è già occupata
        if (destBasket.flupsyId && destBasket.row && destBasket.position) {
          const existingBasket = await tx.select()
            .from(baskets)
            .where(
              and(
                eq(baskets.flupsyId, destBasket.flupsyId),
                eq(baskets.row, destBasket.row),
                eq(baskets.position, destBasket.position),
                isNotNull(baskets.row),  // assicura che ci sia un valore in row
                isNotNull(baskets.position)  // assicura che ci sia un valore in position
              )
            )
            .limit(1);
          
          if (existingBasket && existingBasket.length > 0 && existingBasket[0].id !== destBasket.basketId) {
            throw new Error(`La posizione ${destBasket.row}-${destBasket.position} nel FLUPSY ${destBasket.flupsyId} è già occupata`);
          }
        }
        
        return {
          ...destBasket,
          basketData: basket[0]
        };
      }));
      
      // 3. Ottieni il ciclo del primo cestello di origine (tutti dovrebbero avere lo stesso ciclo)
      const sourceCycleId = sourceBasketData[0].currentCycleId;
      
      if (!sourceCycleId) {
        throw new Error(`Il cestello di origine non ha un ciclo attivo`);
      }
      
      const cycleData = await tx.select()
        .from(cycles)
        .where(eq(cycles.id, sourceCycleId))
        .limit(1);
      
      if (!cycleData || cycleData.length === 0) {
        throw new Error(`Ciclo con ID ${sourceCycleId} non trovato`);
      }
      
      // 4. Crea una nuova operazione di tipo "vagliatura"
      // operationTypes è un enum, quindi usiamo direttamente la stringa
      const operationType: 'vagliatura' = 'vagliatura';
      
      // Verifica che il tipo sia valido
      if (!operationTypes.includes(operationType)) {
        throw new Error("Tipo di operazione 'vagliatura' non valido");
      }
      
      // 5. Crea un'operazione per ogni cestello di origine
      const sourceOperations = await Promise.all(sourceBasketData.map(async (sourceBasket) => {
        const [operation] = await tx.insert(operations).values({
          date: date || new Date().toISOString().split('T')[0], // date field expects YYYY-MM-DD format
          type: operationType,
          basketId: sourceBasket.id,
          cycleId: sourceCycleId,
          deadCount: safeDeadCount,
          animalsPerKg: safeAnimalsPerKg,
          sizeId: safeSizeId,
          mortalityRate: safeMortalityRate,
          notes: notes || null
        }).returning();
        
        return operation;
      }));
      
      // 6. Crea un'operazione per ogni cestello di destinazione
      const destOperations = await Promise.all(destinationBasketData.map(async (destBasket) => {
        // Safe conversion of basket-specific values
        const safeAnimalCount = safeInteger(destBasket.animalCount);
        const safeTotalWeight = safeNumber(destBasket.totalWeight);
        
        const [operation] = await tx.insert(operations).values({
          date: date || new Date().toISOString().split('T')[0], // date field expects YYYY-MM-DD format
          type: operationType,
          basketId: destBasket.basketId,
          cycleId: sourceCycleId, // Usa lo stesso ciclo dei cestelli origine
          animalCount: safeAnimalCount,
          totalWeight: safeTotalWeight,
          animalsPerKg: safeAnimalsPerKg,
          sizeId: safeSizeId,
          deadCount: safeDeadCount,
          mortalityRate: safeMortalityRate,
          notes: destBasket.notes || notes || null,
          // Add sale fields support
          saleClient: destBasket.saleClient || null,
          saleDate: destBasket.saleDate || null
        }).returning();
        
        return operation;
      }));
      
      // 7. Aggiorna i cestelli di destinazione (assegna ciclo e posizione)
      await Promise.all(destinationBasketData.map(async (destBasket) => {
        // Sistema cronologia posizioni rimosso per performance
        // La gestione delle posizioni avviene ora direttamente tramite i campi della tabella baskets
        
        // Handle different destination types
        if (destBasket.destinationType === 'sold') {
          // Per cestelli venduti, aggiorna solo il ciclo (nessuna posizione FLUPSY)
          await tx.update(baskets)
            .set({
              currentCycleId: sourceCycleId
              // Non aggiorniamo flupsyId, row, position per cestelli venduti
            })
            .where(eq(baskets.id, destBasket.basketId));
        } else {
          // Per cestelli posizionati, aggiorna ciclo e posizione
          const safePosition = safeInteger(destBasket.position);
          const safeFlupsyId = safeInteger(destBasket.flupsyId);
          
          await tx.update(baskets)
            .set({
              currentCycleId: sourceCycleId,
              flupsyId: safeFlupsyId,
              row: destBasket.row,
              position: safePosition
            })
            .where(eq(baskets.id, destBasket.basketId));
            
          // Sistema cronologia posizioni rimosso per performance
          // Le posizioni vengono ora gestite direttamente tramite i campi flupsyId, row, position della tabella baskets
        }
      }));
      
      // 8. Aggiorna i cestelli di origine (liberali dal ciclo attivo)
      await Promise.all(sourceBasketData.map(async (sourceBasket) => {
        // Sistema cronologia posizioni rimosso per performance
        // La gestione delle posizioni avviene ora direttamente tramite i campi della tabella baskets
        
        // Aggiorna il cestello come disponibile (libero)
        // Non modificiamo row e position perché sono campi non-nullable nella tabella baskets
        await tx.update(baskets)
          .set({
            currentCycleId: null
          })
          .where(eq(baskets.id, sourceBasket.id));
      }));
      
      // 9. Prepara l'oggetto con tutti i dati dell'operazione
      return {
        sourceOperations,
        destOperations,
        sourceBaskets: sourceBasketData,
        destinationBaskets: destinationBasketData,
        cycle: cycleData[0],
        date: date || new Date().toISOString(),
        sampleWeight,
        sampleCount,
        deadCount,
        animalsPerKg,
        mortalityRate,
        sizeId,
        notes
      };
    });
    
    // 10. Invia aggiornamento WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('operation_completed', {
        type: 'vagliatura',
        date: date || new Date().toISOString(),
        sourceBaskets: result.sourceBaskets.map(b => b.physicalNumber),
        destinationBaskets: result.destinationBaskets.map(d => d.basketData.physicalNumber),
        message: 'Operazione di vagliatura completata'
      });
    }
    
    return res.status(201).json({
      success: true,
      message: "Operazione di vagliatura completata con successo",
      result
    });
    
  } catch (error) {
    console.error("Errore durante l'esecuzione dell'operazione di vagliatura:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante l'esecuzione dell'operazione di vagliatura: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

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

/**
 * Cerca e restituisce posizioni disponibili nei FLUPSY
 */
async function findAvailablePositions() {
  try {
    // 1. Recupera tutti i FLUPSY attivi
    const activeFlupsys = await db.select()
      .from(flupsys)
      .where(eq(flupsys.active, true));
    
    // 2. Per ciascun FLUPSY, trova le posizioni occupate
    const flupsyPositions = await Promise.all(activeFlupsys.map(async (flupsy) => {
      // Recupera i cestelli attualmente in questo FLUPSY
      const basketsInFlupsy = await db.select({
        id: baskets.id,
        physicalNumber: baskets.physicalNumber,
        row: baskets.row,
        position: baskets.position
      })
      .from(baskets)
      .where(
        and(
          eq(baskets.flupsyId, flupsy.id),
          isNotNull(baskets.row),
          isNotNull(baskets.position)
        )
      );
      
      // Calcola posizioni disponibili
      const occupiedPositions = basketsInFlupsy.map(b => `${b.row}-${b.position}`);
      
      // Per semplicità, assumiamo che ci siano 10 posizioni per riga (DX e SX)
      const rows = ['DX', 'SX'];
      const positions = Array.from({ length: 10 }, (_, i) => i + 1);
      
      const availablePositions: Array<{
        flupsyId: number;
        flupsyName: string;
        row: string;
        position: number;
      }> = [];
      
      rows.forEach(row => {
        positions.forEach(pos => {
          const posKey = `${row}-${pos}`;
          if (!occupiedPositions.includes(posKey)) {
            availablePositions.push({
              flupsyId: flupsy.id,
              flupsyName: flupsy.name,
              row,
              position: pos
            });
          }
        });
      });
      
      return {
        flupsyId: flupsy.id,
        flupsyName: flupsy.name,
        availablePositions,
        occupiedPositions: basketsInFlupsy
      };
    }));
    
    return flupsyPositions;
  } catch (error) {
    console.error("Errore durante la ricerca delle posizioni disponibili:", error);
    return [];
  }
}

/**
 * Sistema cronologia posizioni rimosso per performance
 * La funzione closeBasketPositionHistory è stata rimossa per ottimizzare le performance delle API di posizionamento.
 * La gestione delle posizioni dei cestelli avviene ora direttamente tramite i campi row e position nella tabella baskets.
 */