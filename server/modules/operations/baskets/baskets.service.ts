/**
 * Service per la gestione dei cestelli
 * Gestisce tutta la logica business relativa ai cestelli
 */

import { db } from '../../../db';
import { storage } from '../../../storage';
import { baskets, flupsys, cycles, operations } from '../../../../shared/schema';
import { eq, and, isNull, sql, or, not, inArray, desc, asc } from 'drizzle-orm';
import { BasketsCache } from '../../../baskets-cache-service';
import { validateBasketRow, validateBasketPosition } from '../../../utils/validation';

export class BasketsService {
  /**
   * Trova un cestello tramite NFC data
   */
  async findByNfc(params: {
    physicalNumber?: number;
    currentCycleId?: number;
    basketId?: number;
  }) {
    // Compatibilità v1.0 - cerca per basketId
    if (params.basketId) {
      const basket = await storage.getBasket(params.basketId);
      if (basket) {
        return {
          success: true,
          basket,
          identificationMethod: 'basketId',
          version: '1.0-compatible'
        };
      } else {
        return {
          success: false,
          error: 'Cestello non trovato per basketId fornito',
          basketId: params.basketId,
          status: 404
        };
      }
    }

    // Nuova logica v2.0: cerca per physicalNumber + currentCycleId
    if (params.physicalNumber !== undefined && params.currentCycleId !== undefined) {
      const foundBaskets = await db
        .select()
        .from(baskets)
        .where(
          and(
            eq(baskets.physicalNumber, params.physicalNumber),
            eq(baskets.currentCycleId, params.currentCycleId)
          )
        );

      if (foundBaskets.length === 1) {
        return {
          success: true,
          basket: foundBaskets[0],
          identificationMethod: 'physicalNumber+currentCycleId',
          version: '2.0'
        };
      } else if (foundBaskets.length === 0) {
        return {
          success: false,
          error: 'Nessun cestello trovato per la combinazione physicalNumber+currentCycleId',
          physicalNumber: params.physicalNumber,
          currentCycleId: params.currentCycleId,
          status: 404
        };
      } else {
        return {
          success: false,
          error: 'Trovati cestelli multipli per la combinazione physicalNumber+currentCycleId (errore di integrità dati)',
          physicalNumber: params.physicalNumber,
          currentCycleId: params.currentCycleId,
          foundCount: foundBaskets.length,
          status: 409
        };
      }
    }

    // Parametri insufficienti
    return {
      success: false,
      error: 'Parametri insufficienti. Fornire basketId oppure physicalNumber+currentCycleId',
      receivedParams: params,
      status: 400
    };
  }

  /**
   * Ottiene lista cestelli con filtri e paginazione (usa cache ottimizzata)
   */
  async getBaskets(options: {
    page?: number;
    pageSize?: number;
    state?: string;
    flupsyId?: number | string;
    cycleId?: number;
    includeEmpty?: boolean;
    sortBy?: string;
    sortOrder?: string;
    includeAll?: boolean;
    forceRefresh?: boolean;
  }) {
    const { getBasketsOptimized } = await import('../../../controllers/baskets-controller');
    
    // Se è richiesto un refresh forzato, pulisci il cache
    if (options.forceRefresh) {
      BasketsCache.clear();
      console.log("Cache cestelli pulito per force_refresh");
    }

    const finalPageSize = options.includeAll ? 1000 : (options.pageSize || 50);
    
    return await getBasketsOptimized({
      page: options.page || 1,
      pageSize: finalPageSize,
      state: options.state,
      flupsyId: options.flupsyId,
      cycleId: options.cycleId,
      includeEmpty: options.includeEmpty,
      sortBy: options.sortBy || 'id',
      sortOrder: options.sortOrder || 'asc',
      includeAll: options.includeAll
    });
  }

  /**
   * Ottiene cestelli con dettagli completi del flupsy
   */
  async getBasketsWithFlupsyDetails() {
    const result = await db
      .select({
        id: baskets.id,
        physicalNumber: baskets.physicalNumber,
        cycleCode: baskets.cycleCode,
        state: baskets.state,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name
      })
      .from(baskets)
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id));

    return result;
  }

  /**
   * Ottiene dettagli di uno o più cestelli
   */
  async getBasketDetails(id?: number) {
    if (id) {
      const basket = await storage.getBasket(id);
      return basket ? [basket] : [];
    }
    // Se non c'è ID, ritorna tutti i cestelli (per compatibilità)
    return await storage.getBaskets();
  }

  /**
   * Verifica esistenza cestello per numero fisico nel flupsy
   */
  async checkBasketExists(flupsyId: number, physicalNumber: number) {
    const existingBaskets = await db
      .select()
      .from(baskets)
      .where(
        and(
          eq(baskets.flupsyId, flupsyId),
          eq(baskets.physicalNumber, physicalNumber)
        )
      );

    return {
      exists: existingBaskets.length > 0,
      basket: existingBaskets[0] || null
    };
  }

  /**
   * Verifica se una posizione è occupata nel flupsy
   */
  async checkPosition(flupsyId: number, row: string, position: number) {
    const occupyingBasket = await db
      .select()
      .from(baskets)
      .where(
        and(
          eq(baskets.flupsyId, flupsyId),
          eq(baskets.row, row),
          eq(baskets.position, position)
        )
      )
      .limit(1);

    return {
      occupied: occupyingBasket.length > 0,
      basket: occupyingBasket[0] || null
    };
  }

  /**
   * Ottiene il prossimo numero disponibile per un flupsy
   */
  async getNextNumber(flupsyId: number) {
    const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
    const usedNumbers = flupsyBaskets.map(b => b.physicalNumber);
    
    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber) && nextNumber <= 20) {
      nextNumber++;
    }

    return { 
      nextNumber: nextNumber <= 20 ? nextNumber : -1
    };
  }

  /**
   * Calcola le prossime posizioni disponibili per un flupsy
   */
  async getNextPosition(flupsyId: number) {
    const flupsy = await storage.getFlupsy(flupsyId);
    if (!flupsy) {
      throw new Error("FLUPSY non trovato");
    }

    const maxPositions = Math.floor((flupsy.maxPositions || 20) / 2);
    const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);

    const occupiedPositions = new Map<string, number[]>();
    occupiedPositions.set('DX', []);
    occupiedPositions.set('SX', []);

    flupsyBaskets.forEach(basket => {
      if (basket.row && basket.position) {
        const row = basket.row.toUpperCase();
        if (!occupiedPositions.has(row)) {
          occupiedPositions.set(row, []);
        }
        occupiedPositions.get(row)!.push(basket.position);
      }
    });

    const availablePositions: { [key: string]: number } = {};

    occupiedPositions.forEach((positions, currentRow) => {
      let nextPosition = 1;
      while (positions.includes(nextPosition) && nextPosition <= maxPositions) {
        nextPosition++;
      }
      
      availablePositions[currentRow] = nextPosition > maxPositions ? -1 : nextPosition;
    });

    return { 
      maxPositions, 
      availablePositions
    };
  }

  /**
   * Ottiene cestelli disponibili per la selezione
   */
  async getAvailableBaskets() {
    const availableBaskets = await db.select()
      .from(baskets)
      .where(eq(baskets.state, 'available'));
    
    return {
      success: true,
      baskets: availableBaskets,
      count: availableBaskets.length
    };
  }

  /**
   * Ottiene un singolo cestello per ID
   */
  async getBasket(id: number) {
    const basket = await storage.getBasket(id);
    if (!basket) {
      throw new Error("Basket not found");
    }
    return basket;
  }

  /**
   * Crea un nuovo cestello
   */
  async createBasket(data: any) {
    const { flupsyId, physicalNumber, row, position } = data;

    // Validazioni
    if (!row || !position) {
      throw new Error("La fila (row) e la posizione (position) sono campi obbligatori");
    }

    const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
    
    // Verifica limite 20 cestelli
    if (flupsyBaskets.length >= 20) {
      throw new Error("Limite massimo di 20 ceste per FLUPSY raggiunto");
    }

    // Verifica numero duplicato
    const basketWithSameNumber = flupsyBaskets.find(b => b.physicalNumber === physicalNumber);
    if (basketWithSameNumber) {
      throw new Error(`Esiste già una cesta con il numero ${physicalNumber} in questa unità FLUPSY`);
    }

    // Verifica posizione occupata
    const existingBasket = flupsyBaskets.find(basket => 
      basket.row === row && 
      basket.position === position
    );
    
    if (existingBasket) {
      const basketState = existingBasket.state === 'active' ? 'attiva' : 'disponibile';
      throw new Error(`La posizione ${row}-${position} è già occupata dalla cesta #${existingBasket.physicalNumber} (${basketState})`);
    }

    // Crea il cestello
    const newBasket = await storage.createBasket(data);

    // Invalida cache posizioni
    try {
      const { positionCache } = await import('../../../position-cache-service');
      positionCache.invalidate(newBasket.id);
    } catch (error) {
      console.warn('Failed to invalidate position cache:', error);
    }

    // Broadcast via WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('basket_created', {
        basket: newBasket,
        message: `Nuovo cestello ${newBasket.physicalNumber} creato`
      });
    }

    return newBasket;
  }

  /**
   * Sposta un cestello in una nuova posizione
   */
  async moveBasket(id: number, data: { flupsyId: number; row: string; position: number }) {
    const validatedRow = validateBasketRow(data.row);
    const validatedPosition = validateBasketPosition(data.position);

    // Verifica in parallelo l'esistenza del cestello e se la posizione è occupata
    const [basket, basketAtPosition] = await Promise.all([
      storage.getBasket(id),
      db.select()
        .from(baskets)
        .where(and(
          eq(baskets.flupsyId, data.flupsyId),
          eq(baskets.row, validatedRow),
          eq(baskets.position, validatedPosition)
        ))
        .limit(1)
        .then(results => results[0])
    ]);

    if (!basket) {
      throw new Error("Basket not found");
    }

    // Se la posizione è occupata da un altro cestello
    if (basketAtPosition && basketAtPosition.id !== id) {
      return {
        positionOccupied: true,
        basketAtPosition: {
          id: basketAtPosition.id,
          physicalNumber: basketAtPosition.physicalNumber,
          flupsyId: basketAtPosition.flupsyId,
          row: basketAtPosition.row,
          position: basketAtPosition.position
        },
        message: `Esiste già una cesta (numero ${basketAtPosition.physicalNumber}) in questa posizione`
      };
    }

    // Pre-invalida cache posizioni
    try {
      const { positionCache } = await import('../../../position-cache-service');
      positionCache.invalidate(id);
    } catch (error) {
      // Non bloccare se la cache fallisce
    }

    // Aggiorna il cestello
    const updatedBasket = await storage.updateBasket(id, {
      flupsyId: data.flupsyId,
      row: validatedRow,
      position: validatedPosition
    });

    // Recupera il cestello completo
    const completeBasket = await storage.getBasket(id);

    // Notifica WebSocket
    if (typeof (global as any).broadcastUpdate === 'function' && completeBasket) {
      (global as any).broadcastUpdate('basket_moved', {
        basket: completeBasket,
        previousPosition: null,
        newPosition: { flupsyId: data.flupsyId, row: validatedRow, position: validatedPosition },
        message: `Cestello ${completeBasket.physicalNumber} spostato`
      });
    }

    return completeBasket || updatedBasket;
  }

  /**
   * Scambia le posizioni di due cestelli
   */
  async switchPositions(basket1Id: number, basket2Id: number) {
    // Recupera i due cestelli
    const [basket1, basket2] = await Promise.all([
      storage.getBasket(basket1Id),
      storage.getBasket(basket2Id)
    ]);

    if (!basket1 || !basket2) {
      throw new Error("Uno o entrambi i cestelli non trovati");
    }

    // Salva le posizioni originali
    const position1 = {
      flupsyId: basket1.flupsyId,
      row: basket1.row,
      position: basket1.position
    };

    const position2 = {
      flupsyId: basket2.flupsyId,
      row: basket2.row,
      position: basket2.position
    };

    // Esegui lo scambio in una transazione
    const [updatedBasket1, updatedBasket2] = await Promise.all([
      storage.updateBasket(basket1Id, position2),
      storage.updateBasket(basket2Id, position1)
    ]);

    // Invalida cache posizioni
    try {
      const { positionCache } = await import('../../../position-cache-service');
      await Promise.all([
        positionCache.invalidate(basket1Id),
        positionCache.invalidate(basket2Id)
      ]);
    } catch (error) {
      // Non bloccare se la cache fallisce
    }

    // Notifica WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('baskets_switched', {
        basket1: updatedBasket1,
        basket2: updatedBasket2,
        message: `Posizioni scambiate tra cestelli ${basket1.physicalNumber} e ${basket2.physicalNumber}`
      });
    }

    return {
      basket1: updatedBasket1,
      basket2: updatedBasket2
    };
  }

  /**
   * Aggiorna un cestello
   */
  async updateBasket(id: number, data: any) {
    // Verifica che il cestello esista
    const basket = await storage.getBasket(id);
    if (!basket) {
      throw new Error("Basket not found");
    }

    const hasActiveCycle = basket.currentCycleId !== null;

    // Se il cestello non è attivo e si sta cercando di cambiare la posizione
    if (!hasActiveCycle && 
        ((data.row !== undefined && data.row !== basket.row) || 
         (data.position !== undefined && data.position !== basket.position))) {
      throw new Error("Impossibile cambiare la posizione di un cestello non attivo. Solo i cestelli con ciclo attivo possono essere riposizionati.");
    }

    // Se la posizione sta cambiando, verifica che non ci siano duplicati
    if ((data.row !== undefined && data.row !== basket.row) || 
        (data.position !== undefined && data.position !== basket.position)) {
      
      if (data.row && data.position) {
        const flupsyId = data.flupsyId || basket.flupsyId;
        const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
        
        const basketAtPosition = flupsyBaskets.find(b => 
          b.id !== id && 
          b.row === data.row && 
          b.position === data.position
        );
        
        if (basketAtPosition) {
          return {
            positionOccupied: true,
            basketAtPosition: {
              id: basketAtPosition.id,
              physicalNumber: basketAtPosition.physicalNumber,
              flupsyId: basketAtPosition.flupsyId,
              row: basketAtPosition.row,
              position: basketAtPosition.position
            },
            message: `Esiste già una cesta (numero ${basketAtPosition.physicalNumber}) in questa posizione`
          };
        }
      }
    }

    // Aggiorna il cestello
    const updatedBasket = await storage.updateBasket(id, data);
    
    // Ottieni il cestello completo
    const completeBasket = await storage.getBasket(id);

    // Invalida cache cestelli
    try {
      BasketsCache.invalidateAll();
    } catch (error) {
      console.error('Errore nell\'invalidazione cache cestelli:', error);
    }

    // Broadcast via WebSocket
    if (typeof (global as any).broadcastUpdate === 'function' && completeBasket) {
      (global as any).broadcastUpdate('basket_updated', {
        basket: completeBasket,
        message: `Cestello ${completeBasket.physicalNumber} aggiornato`
      });
    }

    return completeBasket || updatedBasket;
  }

  /**
   * Elimina un cestello
   */
  async deleteBasket(id: number) {
    // Verifica che il cestello esista
    const basket = await storage.getBasket(id);
    if (!basket) {
      throw new Error("Basket not found");
    }

    // Verifica che non abbia un ciclo attivo
    if (basket.currentCycleId !== null) {
      throw new Error("Cannot delete a basket with an active cycle. Close the cycle first.");
    }

    // Elimina il cestello
    const result = await storage.deleteBasket(id);
    if (!result) {
      throw new Error("Failed to delete basket");
    }

    return { message: "Basket deleted successfully" };
  }

  /**
   * Corregge cestelli con row NULL
   */
  async fixNullRows() {
    const nullRowBaskets = await db
      .select()
      .from(baskets)
      .where(
        and(
          isNull(baskets.row),
          not(isNull(baskets.position))
        )
      );

    console.log(`Found ${nullRowBaskets.length} baskets with NULL row but non-NULL position`);

    const updates = [];
    for (const basket of nullRowBaskets) {
      const defaultRow = 'DX';
      console.log(`Fixing basket ${basket.id} (physical #${basket.physicalNumber}): setting row to ${defaultRow}`);
      
      updates.push(
        db
          .update(baskets)
          .set({ row: defaultRow })
          .where(eq(baskets.id, basket.id))
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`Fixed ${updates.length} baskets`);
    }

    return {
      fixed: updates.length,
      baskets: nullRowBaskets
    };
  }
}

// Export singleton instance
export const basketsService = new BasketsService();