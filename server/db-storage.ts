import { and, eq, isNull, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from './db';
import { 
  Flupsy, InsertFlupsy, flupsys,
  Basket, Cycle, InsertBasket, InsertCycle, InsertLot, InsertOperation, 
  InsertSgr, InsertSize, Lot, Operation, Size, Sgr, baskets, cycles, lots,
  operations, sgr, sizes, basketPositionHistory, BasketPositionHistory, InsertBasketPositionHistory,
  SgrGiornaliero, InsertSgrGiornaliero, sgrGiornalieri, MortalityRate, InsertMortalityRate, mortalityRates,
  TargetSizeAnnotation, InsertTargetSizeAnnotation, targetSizeAnnotations,
  // Modulo di vagliatura
  ScreeningOperation, InsertScreeningOperation, screeningOperations,
  ScreeningSourceBasket, InsertScreeningSourceBasket, screeningSourceBaskets,
  ScreeningDestinationBasket, InsertScreeningDestinationBasket, screeningDestinationBaskets,
  ScreeningBasketHistory, InsertScreeningBasketHistory, screeningBasketHistory,
  ScreeningLotReference, InsertScreeningLotReference, screeningLotReferences
} from '../shared/schema';
import { IStorage } from './storage';

export class DbStorage implements IStorage {
  // FLUPSY
  async getFlupsys(): Promise<Flupsy[]> {
    return await db.select().from(flupsys);
  }
  
  async getFlupsy(id: number): Promise<Flupsy | undefined> {
    const results = await db.select().from(flupsys).where(eq(flupsys.id, id));
    return results[0];
  }
  
  async getFlupsyByName(name: string): Promise<Flupsy | undefined> {
    const results = await db.select().from(flupsys).where(eq(flupsys.name, name));
    return results[0];
  }
  
  async createFlupsy(flupsy: InsertFlupsy): Promise<Flupsy> {
    const results = await db.insert(flupsys).values(flupsy).returning();
    return results[0];
  }
  
  async updateFlupsy(id: number, flupsyUpdate: Partial<Flupsy>): Promise<Flupsy | undefined> {
    const results = await db.update(flupsys)
      .set(flupsyUpdate)
      .where(eq(flupsys.id, id))
      .returning();
    return results[0];
  }
  
  // BASKETS
  async getBaskets(): Promise<Basket[]> {
    return await db.select().from(baskets);
  }

  async getBasket(id: number): Promise<Basket | undefined> {
    const results = await db.select().from(baskets).where(eq(baskets.id, id));
    return results[0];
  }

  async getBasketByPhysicalNumber(physicalNumber: number): Promise<Basket | undefined> {
    const results = await db.select().from(baskets).where(eq(baskets.physicalNumber, physicalNumber));
    return results[0];
  }
  
  async getBasketsByFlupsy(flupsyId: number): Promise<Basket[]> {
    return await db.select().from(baskets).where(eq(baskets.flupsyId, flupsyId));
  }

  async createBasket(basket: InsertBasket): Promise<Basket> {
    const results = await db.insert(baskets).values(basket).returning();
    return results[0];
  }

  async updateBasket(id: number, basketUpdate: Partial<Basket>): Promise<Basket | undefined> {
    console.log(`updateBasket - Inizio aggiornamento cestello ID:${id} con dati:`, JSON.stringify(basketUpdate));
    
    try {
      // Aggiorniamo il cestello
      const results = await db.update(baskets)
        .set(basketUpdate)
        .where(eq(baskets.id, id))
        .returning();
      
      console.log(`updateBasket - Query eseguita, risultati:`, results ? results.length : 0);
      
      // Recuperiamo il cestello completo con una query separata 
      // per assicurarci di avere tutti i dati aggiornati
      if (results && results.length > 0) {
        console.log(`updateBasket - Cestello aggiornato con successo, recupero dati completi`);
        const updatedBasket = await this.getBasket(id);
        console.log(`updateBasket - Cestello completo recuperato:`, updatedBasket ? 'OK' : 'Non trovato');
        return updatedBasket;
      } else {
        console.warn(`updateBasket - Nessun risultato restituito dall'aggiornamento`);
        // Se per qualche motivo non abbiamo risultati, proviamo a recuperare comunque il cestello
        const basket = await this.getBasket(id);
        if (basket) {
          console.log(`updateBasket - Cestello trovato nonostante nessun risultato dall'aggiornamento`);
          return basket;
        }
      }
      
      console.warn(`updateBasket - Nessun cestello trovato con ID:${id}`);
      return undefined;
    } catch (error) {
      console.error("DB Error [updateBasket]:", error);
      throw new Error(`Errore durante l'aggiornamento del cestello: ${(error as Error).message}`);
    }
  }
  
  async deleteBasket(id: number): Promise<boolean> {
    const results = await db.delete(baskets).where(eq(baskets.id, id)).returning();
    return results.length > 0;
  }

  // OPERATIONS
  async getOperations(): Promise<Operation[]> {
    return await db.select().from(operations);
  }

  async getOperation(id: number): Promise<Operation | undefined> {
    const results = await db.select().from(operations).where(eq(operations.id, id));
    return results[0];
  }

  async getOperationsByBasket(basketId: number): Promise<Operation[]> {
    return await db.select().from(operations).where(eq(operations.basketId, basketId));
  }

  async getOperationsByCycle(cycleId: number): Promise<Operation[]> {
    return await db.select().from(operations).where(eq(operations.cycleId, cycleId));
  }

  async getOperationsByDate(date: Date): Promise<Operation[]> {
    // Convert Date to string in format YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    return await db.select().from(operations).where(eq(operations.date, dateStr));
  }

  async createOperation(operation: InsertOperation): Promise<Operation> {
    // Logging per debugging
    console.log("DB-STORAGE - createOperation - Received data:", JSON.stringify(operation, null, 2));
    
    // Crea una copia dei dati per la manipolazione
    const operationData = { ...operation };
    
    try {
      // Convert any dates to string format
      if (typeof operation.date === 'object' && operation.date && 'toISOString' in operation.date) {
        operationData.date = operation.date.toISOString().split('T')[0];
      }
      
      // Log dopo la conversione della data
      console.log("DB-STORAGE - createOperation - After date conversion:", JSON.stringify(operationData, null, 2));
      
      // Calcola automaticamente averageWeight se animalsPerKg è presente
      if (operationData.animalsPerKg && operationData.animalsPerKg > 0) {
        // Formula: 1,000,000 mg diviso per animalsPerKg = peso medio in milligrammi
        const averageWeight = 1000000 / operationData.animalsPerKg;
        operationData.averageWeight = averageWeight;
        console.log(`DB-STORAGE - createOperation - Calculated averageWeight: ${averageWeight} from animalsPerKg: ${operationData.animalsPerKg}`);
      
        // Se l'operazione include animalsPerKg, assegna automaticamente la taglia corretta
        // basandosi sui valori min e max del database
        if (!operationData.sizeId) {
          console.log(`Determinazione automatica della taglia per animalsPerKg: ${operationData.animalsPerKg}`);
          
          // Ottieni tutte le taglie disponibili
          const allSizes = await this.getSizes();
          
          // Trova la taglia corrispondente in base a animalsPerKg, con controlli per i valori null
          const matchingSize = allSizes.find(size => 
            size.minAnimalsPerKg !== null && 
            size.maxAnimalsPerKg !== null && 
            operationData.animalsPerKg! >= size.minAnimalsPerKg && 
            operationData.animalsPerKg! <= size.maxAnimalsPerKg
          );
          
          if (matchingSize) {
            console.log(`Taglia determinata automaticamente: ${matchingSize.code} (ID: ${matchingSize.id})`);
            operationData.sizeId = matchingSize.id;
          } else {
            console.log(`Nessuna taglia trovata per animalsPerKg: ${operationData.animalsPerKg}`);
          }
        }
      } else {
        // Verifica che la taglia assegnata sia coerente con animalsPerKg solo se entrambi sono definiti
        if (operationData.sizeId && operationData.animalsPerKg) {
          const assignedSize = await this.getSize(operationData.sizeId);
          if (assignedSize && assignedSize.minAnimalsPerKg !== null && assignedSize.maxAnimalsPerKg !== null) {
            const isInRange = operationData.animalsPerKg >= assignedSize.minAnimalsPerKg && 
                            operationData.animalsPerKg <= assignedSize.maxAnimalsPerKg;
            
            if (!isInRange) {
              console.log(`Attenzione: La taglia assegnata ${assignedSize.code} non corrisponde a animalsPerKg ${operationData.animalsPerKg}`);
              console.log(`Range atteso: ${assignedSize.minAnimalsPerKg}-${assignedSize.maxAnimalsPerKg}`);
              
              // Ottieni tutte le taglie disponibili
              const allSizes = await this.getSizes();
              
              // Trova la taglia corretta, con controlli per i valori null
              const correctSize = allSizes.find(size => 
                size.minAnimalsPerKg !== null && 
                size.maxAnimalsPerKg !== null && 
                operationData.animalsPerKg! >= size.minAnimalsPerKg && 
                operationData.animalsPerKg! <= size.maxAnimalsPerKg
              );
              
              if (correctSize) {
                console.log(`Correzione automatica della taglia da ${assignedSize.code} a ${correctSize.code}`);
                operationData.sizeId = correctSize.id;
              }
            }
          }
        }
      }
      
      console.log("==== INSERTING OPERATION IN DATABASE ====");
      console.log("Operation data:", JSON.stringify(operationData, null, 2));
      
      // Verifica che i dati siano validi prima dell'inserimento
      if (!operationData.basketId) {
        throw new Error("basketId è richiesto per creare un'operazione");
      }
      if (!operationData.date) {
        throw new Error("date è richiesto per creare un'operazione");
      }
      if (!operationData.type) {
        throw new Error("type è richiesto per creare un'operazione");
      }
      // Non validiamo cycleId per le operazioni di prima-attivazione
      // perché viene assegnato subito dopo la creazione del ciclo
      
      // Verifica tutti i campi numerici
      if (operationData.basketId && typeof operationData.basketId !== 'number') {
        console.log(`Conversione basketId da ${typeof operationData.basketId} a number`);
        operationData.basketId = Number(operationData.basketId);
      }
      if (operationData.cycleId && typeof operationData.cycleId !== 'number') {
        console.log(`Conversione cycleId da ${typeof operationData.cycleId} a number`);
        operationData.cycleId = Number(operationData.cycleId);
      }
      
      // Esecuzione dell'inserimento con gestione degli errori migliorata
      console.log(`Tentativo di inserimento per operazione di tipo ${operationData.type} sulla cesta ${operationData.basketId} con ciclo ${operationData.cycleId}`);
      const results = await db.insert(operations).values(operationData).returning();
      
      if (!results || results.length === 0) {
        throw new Error("Nessun risultato restituito dall'inserimento dell'operazione");
      }
      
      console.log("Operation created successfully:", JSON.stringify(results[0], null, 2));
      return results[0];
    } catch (error) {
      console.error("ERROR INSERTING OPERATION:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      throw new Error(`Errore durante l'inserimento dell'operazione: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateOperation(id: number, operationUpdate: Partial<Operation>): Promise<Operation | undefined> {
    try {
      // Prima, ottieni l'operazione corrente per riferimento
      const [currentOperation] = await db.select().from(operations)
        .where(eq(operations.id, id));
        
      if (!currentOperation) {
        throw new Error(`Operazione con ID ${id} non trovata`);
      }
      
      // Convert any dates to string format
      if (operationUpdate.date && typeof operationUpdate.date === 'object' && 'toISOString' in operationUpdate.date) {
        operationUpdate.date = operationUpdate.date.toISOString().split('T')[0];
      }
      
      // Calcola automaticamente averageWeight se animalsPerKg è stato aggiornato
      const updateData = { ...operationUpdate };
      if (updateData.animalsPerKg && updateData.animalsPerKg > 0) {
        // Formula: 1,000,000 mg diviso per animalsPerKg = peso medio in milligrammi
        const averageWeight = 1000000 / updateData.animalsPerKg;
        updateData.averageWeight = averageWeight;
      }
      
      // Prevenzione errore di vincolo not-null per cycleId
      if (updateData.cycleId === null) {
        console.log(`PREVENZIONE VINCOLO NOT-NULL: Mantengo il cycleId originale (${currentOperation.cycleId}) per operazione ${id}`);
        updateData.cycleId = currentOperation.cycleId;
      }
      
      console.log(`DATI AGGIORNAMENTO OPERAZIONE ${id}:`, JSON.stringify(updateData, null, 2));
      
      const results = await db.update(operations)
        .set(updateData)
        .where(eq(operations.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error("Error updating operation:", error);
      throw new Error(`Errore durante l'aggiornamento dell'operazione: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteOperation(id: number): Promise<boolean> {
    try {
      // Ottiene i dettagli dell'operazione prima di eliminarla
      const operation = await this.getOperation(id);
      if (!operation) {
        return false;
      }
      
      // Verifica se l'operazione è di tipo "prima-attivazione"
      const isPrimaAttivazione = operation.type === 'prima-attivazione';
      const cycleId = operation.cycleId;
      let basketId = operation.basketId;
      
      // Se l'operazione è una prima-attivazione, gestisce la cancellazione speciale
      if (isPrimaAttivazione && cycleId) {
        console.log(`Operazione di prima-attivazione rilevata (ID: ${id}). Procedendo con la cancellazione a cascata.`);
        
        // Ottiene il ciclo associato per recuperare il cestello
        if (!basketId) {
          const cycle = await this.getCycle(cycleId);
          if (cycle) {
            basketId = cycle.basketId;
          }
        }
        
        // 1. Elimina tutte le operazioni associate al ciclo
        const cycleOperations = await this.getOperationsByCycle(cycleId);
        console.log(`Trovate ${cycleOperations.length} operazioni associate al ciclo ${cycleId}`);
        
        for (const op of cycleOperations) {
          if (op.id !== id) { // Evita di eliminare due volte l'operazione corrente
            console.log(`Eliminazione operazione correlata ID: ${op.id}`);
            await db.delete(operations)
              .where(eq(operations.id, op.id));
          }
        }
        
        // 2. Elimina il ciclo
        console.log(`Eliminazione ciclo ID: ${cycleId}`);
        await db.delete(cycles)
          .where(eq(cycles.id, cycleId));
        
        // 3. Libera il cestello e resetta la posizione
        if (basketId) {
          console.log(`Aggiornamento stato cestello ID: ${basketId} a disponibile`);
          
          // 3.1. Chiudi qualsiasi posizione attiva nella cronologia
          try {
            // Cerca posizioni attive (senza data di fine)
            const activePositions = await db.select()
              .from(basketPositionHistory)
              .where(and(
                eq(basketPositionHistory.basketId, basketId),
                isNull(basketPositionHistory.endDate)
              ));
            
            if (activePositions && activePositions.length > 0) {
              console.log(`Trovate ${activePositions.length} posizioni attive per il cestello ${basketId}`);
              
              // Imposta la data di fine alla data corrente per tutte le posizioni attive
              const currentDate = new Date().toISOString().split('T')[0];
              
              for (const position of activePositions) {
                console.log(`Chiusura della posizione attiva ID: ${position.id} per il cestello ${basketId}`);
                await db.update(basketPositionHistory)
                  .set({
                    endDate: currentDate
                  })
                  .where(eq(basketPositionHistory.id, position.id));
              }
            } else {
              console.log(`Nessuna posizione attiva trovata per il cestello ${basketId}`);
            }
          } catch (error) {
            console.error(`Errore durante la gestione della cronologia posizioni per il cestello ${basketId}:`, error);
          }
          
          // 3.2. Aggiorna lo stato del cestello
          await this.updateBasket(basketId, {
            state: 'available',
            currentCycleId: null,
            nfcData: null,
            row: null,
            position: null
          });
        }
      }
      
      // Elimina l'operazione richiesta
      const deletedCount = await db.delete(operations)
        .where(eq(operations.id, id))
        .returning({ id: operations.id });
      
      return deletedCount.length > 0;
    } catch (error) {
      console.error("Error deleting operation:", error);
      throw new Error(`Errore durante l'eliminazione dell'operazione: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // CYCLES
  async getCycles(): Promise<Cycle[]> {
    return await db.select().from(cycles);
  }

  async getActiveCycles(): Promise<Cycle[]> {
    return await db.select().from(cycles).where(eq(cycles.state, 'active'));
  }

  async getCycle(id: number): Promise<Cycle | undefined> {
    const results = await db.select().from(cycles).where(eq(cycles.id, id));
    return results[0];
  }

  async getCyclesByBasket(basketId: number): Promise<Cycle[]> {
    return await db.select().from(cycles).where(eq(cycles.basketId, basketId));
  }
  
  async getCyclesByFlupsy(flupsyId: number): Promise<Cycle[]> {
    // Prima otteniamo tutti i cestelli associati a questo FLUPSY
    const flupsyBaskets = await this.getBasketsByFlupsy(flupsyId);
    
    if (flupsyBaskets.length === 0) {
      return [];
    }
    
    // Estraiamo gli ID dei cestelli
    const basketIds = flupsyBaskets.map(basket => basket.id);
    
    // Recuperiamo tutti i cicli collegati a questi cestelli
    const allCycles: Cycle[] = [];
    for (const basketId of basketIds) {
      const basketCycles = await this.getCyclesByBasket(basketId);
      allCycles.push(...basketCycles);
    }
    
    return allCycles;
  }

  async createCycle(cycle: InsertCycle): Promise<Cycle> {
    // Convert any dates to string format
    if (cycle.startDate && typeof cycle.startDate === 'object' && 'toISOString' in cycle.startDate) {
      cycle.startDate = cycle.startDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(cycles).values({
      ...cycle,
      state: 'active',
      endDate: null
    }).returning();
    return results[0];
  }

  async closeCycle(id: number, endDate: string | Date): Promise<Cycle | undefined> {
    // Convert date to string format if it's a Date object
    const endDateStr = typeof endDate === 'string' 
      ? endDate 
      : endDate.toISOString().split('T')[0];
    
    const results = await db.update(cycles)
      .set({
        endDate: endDateStr,
        state: 'closed'
      })
      .where(eq(cycles.id, id))
      .returning();
    return results[0];
  }

  // SIZES
  async getSizes(): Promise<Size[]> {
    return await db.select().from(sizes);
  }

  async getSize(id: number): Promise<Size | undefined> {
    const results = await db.select().from(sizes).where(eq(sizes.id, id));
    return results[0];
  }

  async getSizeByCode(code: string): Promise<Size | undefined> {
    const results = await db.select().from(sizes).where(eq(sizes.code, code));
    return results[0];
  }

  async createSize(size: InsertSize): Promise<Size> {
    const results = await db.insert(sizes).values(size).returning();
    return results[0];
  }

  async updateSize(id: number, sizeUpdate: Partial<Size>): Promise<Size | undefined> {
    const results = await db.update(sizes)
      .set(sizeUpdate)
      .where(eq(sizes.id, id))
      .returning();
    return results[0];
  }

  // SGR
  async getSgrs(): Promise<Sgr[]> {
    return await db.select().from(sgr);
  }

  async getSgr(id: number): Promise<Sgr | undefined> {
    const results = await db.select().from(sgr).where(eq(sgr.id, id));
    return results[0];
  }

  async getSgrByMonth(month: string): Promise<Sgr | undefined> {
    const results = await db.select().from(sgr).where(eq(sgr.month, month));
    return results[0];
  }

  async createSgr(sgrData: InsertSgr): Promise<Sgr> {
    const results = await db.insert(sgr).values(sgrData).returning();
    return results[0];
  }

  async updateSgr(id: number, sgrUpdate: Partial<Sgr>): Promise<Sgr | undefined> {
    const results = await db.update(sgr)
      .set(sgrUpdate)
      .where(eq(sgr.id, id))
      .returning();
    return results[0];
  }

  // LOTS
  async getLots(): Promise<Lot[]> {
    return await db.select().from(lots);
  }

  async getActiveLots(): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.state, 'active'));
  }

  async getLot(id: number): Promise<Lot | undefined> {
    const results = await db.select().from(lots).where(eq(lots.id, id));
    return results[0];
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    // Convert any dates to string format
    if (lot.arrivalDate && typeof lot.arrivalDate === 'object' && 'toISOString' in lot.arrivalDate) {
      lot.arrivalDate = lot.arrivalDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(lots).values({
      ...lot,
      state: 'active'
    }).returning();
    return results[0];
  }

  async updateLot(id: number, lotUpdate: Partial<Lot>): Promise<Lot | undefined> {
    // Convert any dates to string format
    if (lotUpdate.arrivalDate && typeof lotUpdate.arrivalDate === 'object' && 'toISOString' in lotUpdate.arrivalDate) {
      lotUpdate.arrivalDate = lotUpdate.arrivalDate.toISOString().split('T')[0];
    }
    
    const results = await db.update(lots)
      .set(lotUpdate)
      .where(eq(lots.id, id))
      .returning();
    return results[0];
  }
  
  async deleteLot(id: number): Promise<boolean> {
    try {
      // Verifica se ci sono cestelli o operazioni associati a questo lotto prima dell'eliminazione
      // Per sicurezza, potremmo implementare questo controllo

      // Elimina il lotto
      const results = await db.delete(lots)
        .where(eq(lots.id, id))
        .returning({ id: lots.id });
      
      // Restituisce true se almeno un record è stato eliminato
      return results.length > 0;
    } catch (error) {
      console.error(`Errore durante l'eliminazione del lotto ID ${id}:`, error);
      return false;
    }
  }
  
  // BASKET POSITION HISTORY
  async getBasketPositionHistory(basketId: number): Promise<BasketPositionHistory[]> {
    return await db.select()
      .from(basketPositionHistory)
      .where(eq(basketPositionHistory.basketId, basketId))
      .orderBy(desc(basketPositionHistory.startDate));
  }

  async getCurrentBasketPosition(basketId: number): Promise<BasketPositionHistory | undefined> {
    if (!basketId || basketId <= 0) {
      console.error("getCurrentBasketPosition - ID cesta non valido:", basketId);
      throw new Error("ID cesta non valido per il recupero della posizione corrente");
    }
    
    console.log(`getCurrentBasketPosition - Ricerca posizione corrente per cesta ID: ${basketId}`);
    
    try {
      const results = await db.select()
        .from(basketPositionHistory)
        .where(and(
          eq(basketPositionHistory.basketId, basketId),
          isNull(basketPositionHistory.endDate)
        ))
        .orderBy(desc(basketPositionHistory.startDate)) // Ordina per data di inizio decrescente
        .limit(1); // Prendi solo il record più recente
      
      if (results.length === 0) {
        console.log(`getCurrentBasketPosition - Nessuna posizione attiva trovata per la cesta ${basketId}`);
        return undefined;
      }
      
      console.log(`getCurrentBasketPosition - Trovata posizione attiva per cesta ${basketId}:`, 
        `ID: ${results[0].id}, FLUPSY: ${results[0].flupsyId}, ` +
        `Riga: ${results[0].row}, Posizione: ${results[0].position}, ` +
        `Data inizio: ${results[0].startDate}`);
      
      return results[0];
    } catch (error) {
      console.error(`getCurrentBasketPosition - Errore durante la ricerca della posizione per la cesta ${basketId}:`, error);
      throw new Error(`Errore durante il recupero della posizione corrente: ${(error as Error).message}`);
    }
  }

  async createBasketPositionHistory(positionHistory: InsertBasketPositionHistory): Promise<BasketPositionHistory> {
    // Assicuriamoci che tutti i campi necessari siano presenti
    if (!positionHistory.basketId || !positionHistory.flupsyId || !positionHistory.row || positionHistory.position === undefined) {
      console.error("Dati di posizione incompleti:", positionHistory);
      throw new Error("Dati di posizione incompleti. Tutti i campi basketId, flupsyId, row e position sono obbligatori.");
    }

    // Formatta la data se è un oggetto Date
    let formattedStartDate: string;
    if (typeof positionHistory.startDate === 'string') {
      formattedStartDate = positionHistory.startDate;
    } else if (positionHistory.startDate instanceof Date) {
      formattedStartDate = positionHistory.startDate.toISOString().split('T')[0]; 
    } else {
      // Se la data non è fornita, usa la data corrente
      formattedStartDate = new Date().toISOString().split('T')[0];
      console.warn("startDate non fornito, usando la data corrente:", formattedStartDate);
    }
    
    console.log("createBasketPositionHistory - Creo nuovo record:", {
      basketId: positionHistory.basketId,
      flupsyId: positionHistory.flupsyId,
      row: positionHistory.row,
      position: positionHistory.position,
      startDate: formattedStartDate,
      operationId: positionHistory.operationId || null
    });
    
    try {
      const results = await db.insert(basketPositionHistory).values({
        basketId: positionHistory.basketId,
        flupsyId: positionHistory.flupsyId, 
        row: positionHistory.row,
        position: positionHistory.position,
        startDate: formattedStartDate,
        endDate: null,
        operationId: positionHistory.operationId || null
      }).returning();
      
      if (!results || results.length === 0) {
        throw new Error("Nessun risultato restituito durante la creazione della cronologia di posizione");
      }
      
      console.log("createBasketPositionHistory - Record creato con successo:", results[0]);
      return results[0];
    } catch (error) {
      console.error("createBasketPositionHistory - Errore durante l'inserimento:", error);
      throw new Error(`Errore durante la creazione della cronologia di posizione: ${(error as Error).message}`);
    }
  }

  async closeBasketPositionHistory(basketId: number, endDate: Date | string): Promise<BasketPositionHistory | undefined> {
    // Verifica che l'ID della cesta sia valido
    if (!basketId || basketId <= 0) {
      console.error("closeBasketPositionHistory - ID cesta non valido:", basketId);
      throw new Error("ID cesta non valido per la chiusura della posizione");
    }

    // Converti la data in formato stringa
    let endDateStr: string;
    if (typeof endDate === 'string') {
      endDateStr = endDate;
    } else if (endDate instanceof Date) {
      endDateStr = endDate.toISOString().split('T')[0];
    } else {
      // Se la data non è valida, usa la data corrente
      endDateStr = new Date().toISOString().split('T')[0];
      console.warn("closeBasketPositionHistory - Data di fine non valida, usando la data corrente:", endDateStr);
    }
    
    console.log(`closeBasketPositionHistory - Chiusura posizione per cesta ${basketId} con data fine ${endDateStr}`);
    
    try {
      // Ottieni la posizione attuale attiva
      const currentPosition = await this.getCurrentBasketPosition(basketId);
      if (!currentPosition) {
        console.warn(`closeBasketPositionHistory - Nessuna posizione attiva trovata per la cesta ${basketId}`);
        return undefined;
      }
      
      console.log(`closeBasketPositionHistory - Trovata posizione attiva ID: ${currentPosition.id}, FLUPSY: ${currentPosition.flupsyId}, Riga: ${currentPosition.row}, Posizione: ${currentPosition.position}`);
      
      try {
        // Chiudi la posizione
        const results = await db.update(basketPositionHistory)
          .set({
            endDate: endDateStr
          })
          .where(eq(basketPositionHistory.id, currentPosition.id))
          .returning();
        
        if (!results || results.length === 0) {
          console.error(`closeBasketPositionHistory - Aggiornamento fallito per la posizione ID: ${currentPosition.id}`);
          throw new Error("Impossibile chiudere la posizione attuale");
        }
        
        console.log(`closeBasketPositionHistory - Posizione chiusa con successo, ID: ${results[0].id}`);
        return results[0];
      } catch (updateError) {
        console.error("closeBasketPositionHistory - Errore specifico durante l'aggiornamento:", updateError);
        throw new Error(`Errore durante l'aggiornamento del record: ${(updateError as Error).message}`);
      }
    } catch (error) {
      console.error("closeBasketPositionHistory - Errore durante la chiusura della posizione:", error);
      throw new Error(`Errore durante la chiusura della posizione: ${(error as Error).message}`);
    }
  }
  
  // SGR Giornalieri methods
  async getSgrGiornalieri(): Promise<SgrGiornaliero[]> {
    return await db.select()
      .from(sgrGiornalieri)
      .orderBy(desc(sgrGiornalieri.recordDate));
  }

  async getSgrGiornaliero(id: number): Promise<SgrGiornaliero | undefined> {
    const results = await db.select()
      .from(sgrGiornalieri)
      .where(eq(sgrGiornalieri.id, id));
    return results[0];
  }

  async getSgrGiornalieriByDateRange(startDate: Date, endDate: Date): Promise<SgrGiornaliero[]> {
    // Convert dates to string format for PostgreSQL compatibility
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Using a different approach to avoid type issues with drizzle
    // Get all records then filter by date
    const allRecords = await db.select().from(sgrGiornalieri);
    
    // Filter the records in JavaScript
    return allRecords
      .filter(record => {
        const recordDate = new Date(record.recordDate).getTime();
        return recordDate >= new Date(startDateStr).getTime() && 
               recordDate <= new Date(endDateStr).getTime();
      })
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
  }

  async createSgrGiornaliero(sgrGiornaliero: InsertSgrGiornaliero): Promise<SgrGiornaliero> {
    // Convert date to string format if it's a Date object
    if (sgrGiornaliero.recordDate && typeof sgrGiornaliero.recordDate === 'object' && 'toISOString' in sgrGiornaliero.recordDate) {
      sgrGiornaliero.recordDate = sgrGiornaliero.recordDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(sgrGiornalieri)
      .values(sgrGiornaliero)
      .returning();
    return results[0];
  }

  async updateSgrGiornaliero(id: number, sgrGiornalieroUpdate: Partial<SgrGiornaliero>): Promise<SgrGiornaliero | undefined> {
    // Convert date to string format if it's a Date object
    if (sgrGiornalieroUpdate.recordDate && typeof sgrGiornalieroUpdate.recordDate === 'object' && 'toISOString' in sgrGiornalieroUpdate.recordDate) {
      sgrGiornalieroUpdate.recordDate = sgrGiornalieroUpdate.recordDate.toISOString().split('T')[0];
    }
    
    const results = await db.update(sgrGiornalieri)
      .set(sgrGiornalieroUpdate)
      .where(eq(sgrGiornalieri.id, id))
      .returning();
    return results[0];
  }

  async deleteSgrGiornaliero(id: number): Promise<boolean> {
    const results = await db.delete(sgrGiornalieri)
      .where(eq(sgrGiornalieri.id, id))
      .returning({
        id: sgrGiornalieri.id
      });
    return results.length > 0;
  }
  
  // MORTALITY RATES
  async getMortalityRates(): Promise<MortalityRate[]> {
    return await db.select().from(mortalityRates);
  }

  async getMortalityRate(id: number): Promise<MortalityRate | undefined> {
    const results = await db.select().from(mortalityRates).where(eq(mortalityRates.id, id));
    return results[0];
  }

  async getMortalityRatesBySize(sizeId: number): Promise<MortalityRate[]> {
    return await db.select().from(mortalityRates).where(eq(mortalityRates.sizeId, sizeId));
  }

  async getMortalityRatesByMonth(month: string): Promise<MortalityRate[]> {
    return await db.select().from(mortalityRates).where(eq(mortalityRates.month, month));
  }

  async getMortalityRateByMonthAndSize(month: string, sizeId: number): Promise<MortalityRate | undefined> {
    const results = await db.select().from(mortalityRates).where(
      and(
        eq(mortalityRates.month, month),
        eq(mortalityRates.sizeId, sizeId)
      )
    );
    return results[0];
  }

  async createMortalityRate(mortalityRate: InsertMortalityRate): Promise<MortalityRate> {
    const results = await db.insert(mortalityRates).values(mortalityRate).returning();
    return results[0];
  }

  async updateMortalityRate(id: number, mortalityRateUpdate: Partial<MortalityRate>): Promise<MortalityRate | undefined> {
    const results = await db.update(mortalityRates)
      .set(mortalityRateUpdate)
      .where(eq(mortalityRates.id, id))
      .returning();
    return results[0];
  }
  
  // TARGET SIZE ANNOTATIONS
  async getTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]> {
    return await db.select().from(targetSizeAnnotations);
  }
  
  async getTargetSizeAnnotation(id: number): Promise<TargetSizeAnnotation | undefined> {
    const results = await db.select().from(targetSizeAnnotations).where(eq(targetSizeAnnotations.id, id));
    return results[0];
  }
  
  async getTargetSizeAnnotationsByBasket(basketId: number): Promise<TargetSizeAnnotation[]> {
    return await db.select()
      .from(targetSizeAnnotations)
      .where(eq(targetSizeAnnotations.basketId, basketId))
      .orderBy(targetSizeAnnotations.predictedDate);
  }
  
  async getTargetSizeAnnotationsByTargetSize(targetSizeId: number): Promise<TargetSizeAnnotation[]> {
    return await db.select()
      .from(targetSizeAnnotations)
      .where(eq(targetSizeAnnotations.targetSizeId, targetSizeId))
      .orderBy(targetSizeAnnotations.predictedDate);
  }
  
  async getPendingTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]> {
    return await db.select()
      .from(targetSizeAnnotations)
      .where(eq(targetSizeAnnotations.status, 'pending'))
      .orderBy(targetSizeAnnotations.predictedDate);
  }
  
  async getBasketsPredictedToReachSize(targetSizeId: number, withinDays: number): Promise<TargetSizeAnnotation[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + withinDays);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    return await db.select()
      .from(targetSizeAnnotations)
      .where(
        and(
          eq(targetSizeAnnotations.targetSizeId, targetSizeId),
          eq(targetSizeAnnotations.status, 'pending'),
          gte(targetSizeAnnotations.predictedDate, todayStr),
          lte(targetSizeAnnotations.predictedDate, futureDateStr)
        )
      )
      .orderBy(targetSizeAnnotations.predictedDate);
  }
  
  async createTargetSizeAnnotation(annotation: InsertTargetSizeAnnotation): Promise<TargetSizeAnnotation> {
    // Convert date strings if they're Date objects
    const annotationData = { ...annotation };
    
    if (annotationData.predictedDate && typeof annotationData.predictedDate === 'object' && 'toISOString' in annotationData.predictedDate) {
      annotationData.predictedDate = annotationData.predictedDate.toISOString().split('T')[0];
    }
    
    if (annotationData.reachedDate && typeof annotationData.reachedDate === 'object' && 'toISOString' in annotationData.reachedDate) {
      annotationData.reachedDate = annotationData.reachedDate.toISOString().split('T')[0];
    }
    
    // Set default status and dates
    const now = new Date();
    
    const results = await db.insert(targetSizeAnnotations).values({
      ...annotationData,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      reachedDate: null
    }).returning();
    
    return results[0];
  }
  
  async updateTargetSizeAnnotation(id: number, annotation: Partial<TargetSizeAnnotation>): Promise<TargetSizeAnnotation | undefined> {
    // Convert date strings if they're Date objects
    const annotationData = { ...annotation };
    
    if (annotationData.predictedDate && typeof annotationData.predictedDate === 'object' && 'toISOString' in annotationData.predictedDate) {
      annotationData.predictedDate = annotationData.predictedDate.toISOString().split('T')[0];
    }
    
    if (annotationData.reachedDate && typeof annotationData.reachedDate === 'object' && 'toISOString' in annotationData.reachedDate) {
      annotationData.reachedDate = annotationData.reachedDate.toISOString().split('T')[0];
    }
    
    // Update the updatedAt timestamp
    annotationData.updatedAt = new Date();
    
    const results = await db.update(targetSizeAnnotations)
      .set(annotationData)
      .where(eq(targetSizeAnnotations.id, id))
      .returning();
      
    return results[0];
  }
  
  async deleteTargetSizeAnnotation(id: number): Promise<boolean> {
    const deletedCount = await db.delete(targetSizeAnnotations)
      .where(eq(targetSizeAnnotations.id, id))
      .returning({ id: targetSizeAnnotations.id });
    
    return deletedCount.length > 0;
  }
  
  // Growth calculations
  async calculateActualSgr(operations: Operation[]): Promise<number | null> {
    // Implementation for calculating the actual SGR based on operations
    if (operations.length < 2) {
      return null; // Need at least two measurements to calculate SGR
    }
    
    // Sort operations by date, oldest first
    operations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Get first and last measurement
    const firstMeasurement = operations[0];
    const lastMeasurement = operations[operations.length - 1];
    
    // Check if we have weight data
    if (!firstMeasurement.averageWeight || !lastMeasurement.averageWeight) {
      return null;
    }
    
    // Calculate days between measurements
    const daysDiff = (new Date(lastMeasurement.date).getTime() - new Date(firstMeasurement.date).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) {
      return null;
    }
    
    // Calculate SGR using the formula: SGR = ((ln(Wt) - ln(W0)) / t) * 100
    // Where Wt is the final weight, W0 is the initial weight, and t is time in days
    const sgr = ((Math.log(lastMeasurement.averageWeight) - Math.log(firstMeasurement.averageWeight)) / daysDiff) * 100;
    
    return sgr;
  }
  
  async calculateGrowthPrediction(
    currentWeight: number, 
    measurementDate: Date, 
    days: number, 
    sgrPercentage: number,
    variationPercentages: {best: number, worst: number}
  ): Promise<any> {
    // Convert SGR from percentage to decimal (SGR è già un valore giornaliero percentuale)
    const dailySgr = sgrPercentage / 100; // Convert % to decimal
    
    // Calculate best and worst case scenarios
    const bestDailySgr = dailySgr * (1 + variationPercentages.best / 100);
    const worstDailySgr = dailySgr * (1 - variationPercentages.worst / 100);
    
    // Calculate projected weights for each day
    const projections = [];
    
    for (let day = 0; day <= days; day++) {
      const date = new Date(measurementDate);
      date.setDate(date.getDate() + day);
      
      // Calculate weights using the formula: W(t) = W(0) * e^(SGR * t)
      const theoreticalWeight = currentWeight * Math.exp(dailySgr * day);
      const bestWeight = currentWeight * Math.exp(bestDailySgr * day);
      const worstWeight = currentWeight * Math.exp(worstDailySgr * day);
      
      projections.push({
        day,
        date: date.toISOString().split('T')[0],
        theoretical: Math.round(theoreticalWeight),
        best: Math.round(bestWeight),
        worst: Math.round(worstWeight)
      });
    }
    
    // Calcola dati di riepilogo (necessari per la visualizzazione nel frontend)
    const lastProjection = projections[projections.length - 1];
    const summary = {
      // Pesi finali per ciascuno scenario alla fine della proiezione
      finalTheoreticalWeight: lastProjection.theoretical,
      finalBestWeight: lastProjection.best,
      finalWorstWeight: lastProjection.worst,
      // Percentuali di crescita totale per ciascuno scenario
      growthPercentageTheoretical: Math.round((lastProjection.theoretical / currentWeight - 1) * 100),
      growthPercentageBest: Math.round((lastProjection.best / currentWeight - 1) * 100),
      growthPercentageWorst: Math.round((lastProjection.worst / currentWeight - 1) * 100)
    };
    
    return {
      currentWeight,
      measurementDate: measurementDate.toISOString().split('T')[0],
      sgrPercentage,
      days,
      variationPercentages,
      summary,  // Aggiunto il riepilogo qui
      projections,
      lastMeasurementDate: measurementDate.toISOString().split('T')[0] // Aggiunto esplicitamente per evitare confusione
    };
  }

  // IMPLEMENTAZIONE METODI PER IL MODULO DI VAGLIATURA
  
  // Screening Operations
  async getScreeningOperations(): Promise<ScreeningOperation[]> {
    return await db.select().from(screeningOperations);
  }

  async getScreeningOperationsByStatus(status: string): Promise<ScreeningOperation[]> {
    return await db.select().from(screeningOperations).where(eq(screeningOperations.status, status));
  }

  async getScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    const results = await db.select().from(screeningOperations).where(eq(screeningOperations.id, id));
    if (results.length === 0) return undefined;
    
    // Aggiungi il riferimento alla taglia
    const operation = results[0];
    if (operation.referenceSizeId) {
      const size = await this.getSize(operation.referenceSizeId);
      return { ...operation, referenceSize: size };
    }
    
    return operation;
  }

  async createScreeningOperation(operation: InsertScreeningOperation): Promise<ScreeningOperation> {
    const now = new Date();
    const results = await db.insert(screeningOperations)
      .values({
        ...operation,
        status: 'draft',
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    const newOperation = results[0];
    // Aggiungi il riferimento alla taglia
    if (newOperation.referenceSizeId) {
      const size = await this.getSize(newOperation.referenceSizeId);
      return { ...newOperation, referenceSize: size };
    }
    
    return newOperation;
  }

  async updateScreeningOperation(id: number, operationUpdate: Partial<ScreeningOperation>): Promise<ScreeningOperation | undefined> {
    // Rimuovi referenceSize se presente (non è una colonna nella tabella)
    const { referenceSize, ...updateData } = operationUpdate as any;
    
    const now = new Date();
    const results = await db.update(screeningOperations)
      .set({
        ...updateData,
        updatedAt: now
      })
      .where(eq(screeningOperations.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    
    // Aggiungi il riferimento alla taglia
    const updatedOperation = results[0];
    if (updatedOperation.referenceSizeId) {
      const size = await this.getSize(updatedOperation.referenceSizeId);
      return { ...updatedOperation, referenceSize: size };
    }
    
    return updatedOperation;
  }

  async completeScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    const now = new Date();
    const results = await db.update(screeningOperations)
      .set({
        status: 'completed',
        updatedAt: now
      })
      .where(eq(screeningOperations.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    
    // Aggiungi il riferimento alla taglia
    const completedOperation = results[0];
    if (completedOperation.referenceSizeId) {
      const size = await this.getSize(completedOperation.referenceSizeId);
      return { ...completedOperation, referenceSize: size };
    }
    
    return completedOperation;
  }

  async cancelScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    // Prima recuperiamo l'operazione per verificare il suo stato attuale
    const operation = await this.getScreeningOperation(id);
    if (!operation) return undefined;
    
    // Se l'operazione è in stato "draft", eliminiamo completamente tutti i dati associati
    if (operation.status === 'draft') {
      // Eliminiamo tutti i riferimenti nelle tabelle correlate
      
      // 1. Eliminiamo i riferimenti ai lotti per le ceste di destinazione
      await db.delete(screeningLotReferences)
        .where(eq(screeningLotReferences.screeningId, id));
      
      // 2. Eliminiamo lo storico delle relazioni tra ceste di origine e destinazione
      await db.delete(screeningBasketHistory)
        .where(eq(screeningBasketHistory.screeningId, id));
      
      // 3. Eliminiamo le ceste di destinazione
      await db.delete(screeningDestinationBaskets)
        .where(eq(screeningDestinationBaskets.screeningId, id));
      
      // 4. Eliminiamo le ceste di origine
      await db.delete(screeningSourceBaskets)
        .where(eq(screeningSourceBaskets.screeningId, id));
      
      // 5. Infine, eliminiamo l'operazione di vagliatura stessa
      const deletedResults = await db.delete(screeningOperations)
        .where(eq(screeningOperations.id, id))
        .returning();
      
      if (deletedResults.length === 0) return undefined;
      
      // Aggiungi il riferimento alla taglia all'operazione eliminata
      const deletedOperation = deletedResults[0];
      if (deletedOperation.referenceSizeId) {
        const size = await this.getSize(deletedOperation.referenceSizeId);
        return { ...deletedOperation, referenceSize: size, status: 'cancelled' };
      }
      
      return { ...deletedOperation, status: 'cancelled' };
    } else {
      // Se l'operazione non è in stato "draft", cambiamo solo lo stato a "cancelled"
      const now = new Date();
      const results = await db.update(screeningOperations)
        .set({
          status: 'cancelled',
          updatedAt: now
        })
        .where(eq(screeningOperations.id, id))
        .returning();
      
      if (results.length === 0) return undefined;
      
      // Aggiungi il riferimento alla taglia
      const cancelledOperation = results[0];
      if (cancelledOperation.referenceSizeId) {
        const size = await this.getSize(cancelledOperation.referenceSizeId);
        return { ...cancelledOperation, referenceSize: size };
      }
      
      return cancelledOperation;
    }
  }
  
  // Screening Source Baskets
  async getScreeningSourceBasketsByScreening(screeningId: number): Promise<any[]> {
    const sourceBaskets = await db.select().from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningId, screeningId));
    
    // Arricchisci i dati aggiungendo informazioni su ceste, cicli e lotti
    const enrichedBaskets = [];
    
    for (const sourceBasket of sourceBaskets) {
      const basket = await this.getBasket(sourceBasket.basketId);
      const cycle = await this.getCycle(sourceBasket.cycleId);
      
      let lot = null;
      if (sourceBasket.lotId) {
        lot = await this.getLot(sourceBasket.lotId);
      }
      
      let size = null;
      if (sourceBasket.sizeId) {
        size = await this.getSize(sourceBasket.sizeId);
      }
      
      enrichedBaskets.push({
        ...sourceBasket,
        basket,
        cycle,
        lot,
        size
      });
    }
    
    return enrichedBaskets;
  }
  
  async addScreeningSourceBasket(basket: InsertScreeningSourceBasket): Promise<ScreeningSourceBasket> {
    const results = await db.insert(screeningSourceBaskets)
      .values(basket)
      .returning();
    
    return results[0];
  }
  
  async removeScreeningSourceBasket(id: number): Promise<boolean> {
    const deleted = await db.delete(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();
    
    return deleted.length > 0;
  }
  
  async updateScreeningSourceBasket(id: number, basket: Partial<ScreeningSourceBasket>): Promise<ScreeningSourceBasket | undefined> {
    const results = await db.update(screeningSourceBaskets)
      .set(basket)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();
    
    return results[0];
  }
  
  async dismissScreeningSourceBasket(id: number): Promise<ScreeningSourceBasket | undefined> {
    // Imposta dismissed a true per marcare la cesta come dismessa
    const results = await db.update(screeningSourceBaskets)
      .set({
        dismissed: true
      })
      .where(eq(screeningSourceBaskets.id, id))
      .returning();
    
    return results[0];
  }
  
  // Screening Destination Baskets
  async getScreeningDestinationBasketsByScreening(screeningId: number): Promise<any[]> {
    const destinationBaskets = await db.select().from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, screeningId));
    
    // Arricchisci i dati aggiungendo informazioni su ceste, cicli e FLUPSY
    const enrichedBaskets = [];
    
    for (const destinationBasket of destinationBaskets) {
      const basket = await this.getBasket(destinationBasket.basketId);
      
      let cycle = null;
      if (destinationBasket.cycleId) {
        cycle = await this.getCycle(destinationBasket.cycleId);
      }
      
      let flupsy = null;
      if (destinationBasket.flupsyId) {
        flupsy = await this.getFlupsy(destinationBasket.flupsyId);
      }
      
      enrichedBaskets.push({
        ...destinationBasket,
        basket,
        cycle,
        flupsy
      });
    }
    
    return enrichedBaskets;
  }
  
  async getScreeningDestinationBasket(id: number): Promise<ScreeningDestinationBasket | undefined> {
    const results = await db.select().from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.id, id));
    
    return results[0];
  }
  
  async addScreeningDestinationBasket(basket: InsertScreeningDestinationBasket): Promise<any> {
    const now = new Date();
    const results = await db.insert(screeningDestinationBaskets)
      .values({
        ...basket,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return results[0];
  }
  
  async updateScreeningDestinationBasket(id: number, basket: Partial<ScreeningDestinationBasket>): Promise<ScreeningDestinationBasket | undefined> {
    const now = new Date();
    const results = await db.update(screeningDestinationBaskets)
      .set({
        ...basket,
        updatedAt: now
      })
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();
    
    return results[0];
  }
  
  async removeScreeningDestinationBasket(id: number): Promise<boolean> {
    const deleted = await db.delete(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();
    
    return deleted.length > 0;
  }
  
  async assignPositionToDestinationBasket(id: number, flupsyId: number, row: string, position: number): Promise<ScreeningDestinationBasket | undefined> {
    const now = new Date();
    const results = await db.update(screeningDestinationBaskets)
      .set({
        flupsyId,
        row,
        position,
        positionAssigned: true,
        updatedAt: now
      })
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();
    
    return results[0];
  }
  
  async isPositionAvailable(flupsyId: number, row: string, position: number): Promise<boolean> {
    // Verifica se la posizione è già occupata
    const results = await db.select()
      .from(baskets)
      .where(
        and(
          eq(baskets.flupsyId, flupsyId),
          eq(baskets.row, row),
          eq(baskets.position, position),
          eq(baskets.state, 'active')
        )
      );
    
    // La posizione è disponibile se non ci sono ceste attive in questa posizione
    return results.length === 0;
  }
  
  // Screening History
  async getScreeningBasketHistoryByDestination(destinationBasketId: number): Promise<ScreeningBasketHistory[]> {
    return await db.select().from(screeningBasketHistory)
      .where(eq(screeningBasketHistory.destinationBasketId, destinationBasketId));
  }
  
  async createScreeningBasketHistory(history: InsertScreeningBasketHistory): Promise<ScreeningBasketHistory> {
    const now = new Date();
    const results = await db.insert(screeningBasketHistory)
      .values({
        ...history,
        createdAt: now
      })
      .returning();
    
    return results[0];
  }
  
  // Screening Lot Reference
  async getScreeningLotReferencesByDestination(destinationBasketId: number): Promise<ScreeningLotReference[]> {
    return await db.select().from(screeningLotReferences)
      .where(eq(screeningLotReferences.destinationBasketId, destinationBasketId));
  }
  
  async createScreeningLotReference(lotReference: InsertScreeningLotReference): Promise<ScreeningLotReference> {
    const now = new Date();
    const results = await db.insert(screeningLotReferences)
      .values({
        ...lotReference,
        createdAt: now
      })
      .returning();
    
    return results[0];
  }
  
  async removeScreeningLotReference(id: number): Promise<boolean> {
    try {
      await db.delete(screeningLotReferences).where(eq(screeningLotReferences.id, id));
      return true;
    } catch (error) {
      console.error("DB Error [removeScreeningLotReference]:", error);
      return false;
    }
  }
  
  // Funzione per ottenere il prossimo numero sequenziale per le vagliature
  async getNextScreeningNumber(): Promise<number> {
    try {
      // Trova il numero di vagliatura più alto attualmente nel database
      const maxResult = await db.select().from(screeningOperations)
        .orderBy(desc(screeningOperations.screeningNumber))
        .limit(1);
      
      // Se non ci sono operazioni, restituisci 1 come primo numero
      const maxNumber = maxResult.length > 0 ? maxResult[0].screeningNumber : 0;
      
      // Restituisci il numero successivo
      return maxNumber + 1;
    } catch (error) {
      console.error("DB Error [getNextScreeningNumber]:", error);
      return 1; // In caso di errore, restituisci 1 come valore predefinito
    }
  }
}