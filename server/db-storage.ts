import { and, eq, isNull, desc, gte, lte, sql, inArray, or, count, sum, countDistinct, max } from 'drizzle-orm';
import { db } from './db';
import bcrypt from 'bcrypt';
import { 
  Flupsy, InsertFlupsy, flupsys,
  Basket, Cycle, InsertBasket, InsertCycle, InsertLot, InsertOperation, 
  InsertSgr, InsertSize, Lot, Operation, Size, Sgr, baskets, cycles, lots,
  operations, sgr, sizes,
  SgrGiornaliero, InsertSgrGiornaliero, sgrGiornalieri, MortalityRate, InsertMortalityRate, mortalityRates,
  TargetSizeAnnotation, InsertTargetSizeAnnotation, targetSizeAnnotations,
  // Modulo di vagliatura
  ScreeningOperation, InsertScreeningOperation, screeningOperations,
  ScreeningSourceBasket, InsertScreeningSourceBasket, screeningSourceBaskets,
  ScreeningDestinationBasket, InsertScreeningDestinationBasket, screeningDestinationBaskets,
  ScreeningBasketHistory, InsertScreeningBasketHistory, screeningBasketHistory,
  ScreeningLotReference, InsertScreeningLotReference, screeningLotReferences,
  // Sales sync tables
  ExternalSaleSync, InsertExternalSaleSync, externalSalesSync,
  ExternalCustomerSync, InsertExternalCustomerSync, externalCustomersSync,
  ExternalDeliverySync, InsertExternalDeliverySync, externalDeliveriesSync,
  ExternalDeliveryDetailSync, InsertExternalDeliveryDetailSync, externalDeliveryDetailsSync,
  SyncStatus, InsertSyncStatus, syncStatus,
  // Autenticazione
  User, InsertUser, users
} from '../shared/schema';
import { IStorage } from './storage';

export class DbStorage implements IStorage {
  // Cache per i lotti
  private lotsCache: Map<string, { data: any[], timestamp: number }> = new Map();
  private lotsCacheExpiry = 5 * 60 * 1000; // 5 minuti

  // AUTH
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // Hash the password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    
    const userWithHashedPassword = {
      ...user,
      password: hashedPassword
    };
    
    const [result] = await db.insert(users).values(userWithHashedPassword).returning();
    return result;
  }
  
  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }
  
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    
    let isPasswordValid = false;
    
    // Check if password is already hashed (starts with $2b$ or $2a$ which are bcrypt prefixes)
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      // Password is hashed, use bcrypt.compare()
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Password is still in plain text (legacy), do direct comparison
      // This provides backward compatibility during migration
      isPasswordValid = user.password === password;
      
      // If plain text password matches, hash it for future use
      if (isPasswordValid) {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        console.log(`Password hashed for user: ${username}`);
      }
    }
    
    if (isPasswordValid) {
      await this.updateUserLastLogin(user.id);
      return user;
    }
    
    return null;
  }
  
  // MIGRATION: Hash existing plain text passwords
  async hashExistingPasswords(): Promise<{ migrated: number; alreadyHashed: number; errors: number }> {
    const allUsers = await this.getUsers();
    let migrated = 0;
    let alreadyHashed = 0;
    let errors = 0;
    
    console.log(`Starting password migration for ${allUsers.length} users`);
    
    for (const user of allUsers) {
      try {
        // Check if password is already hashed
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          alreadyHashed++;
          continue;
        }
        
        // Hash the plain text password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        // Update the user's password
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
          
        migrated++;
        console.log(`Password hashed for user ID ${user.id} (${user.username})`);
      } catch (error) {
        console.error(`Error hashing password for user ID ${user.id} (${user.username}):`, error);
        errors++;
      }
    }
    
    console.log(`Password migration completed: ${migrated} migrated, ${alreadyHashed} already hashed, ${errors} errors`);
    return { migrated, alreadyHashed, errors };
  }
  
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
  
  async deleteFlupsy(id: number): Promise<{ success: boolean; message: string }> {
    console.log(`deleteFlupsy - Tentativo di eliminazione FLUPSY ID: ${id}`);
    
    // 1. Verifica se il FLUPSY esiste
    const flupsy = await this.getFlupsy(id);
    if (!flupsy) {
      return { success: false, message: "FLUPSY non trovato" };
    }
    
    // 2. Recupera tutte le ceste associate a questo FLUPSY
    const flupsyBaskets = await this.getBasketsByFlupsy(id);
    console.log(`deleteFlupsy - Trovate ${flupsyBaskets.length} ceste associate al FLUPSY ID: ${id}`);
    
    // 3. Verifica se qualche cesta ha un ciclo attivo
    const basketsWithActiveCycles = flupsyBaskets.filter(basket => 
      basket.currentCycleId !== null || basket.state === 'active'
    );
    
    if (basketsWithActiveCycles.length > 0) {
      const basketNumbers = basketsWithActiveCycles.map(b => b.physicalNumber).join(', ');
      return { 
        success: false, 
        message: `Impossibile eliminare il FLUPSY. Le seguenti ceste hanno cicli attivi: ${basketNumbers}. Terminare prima i cicli attivi.` 
      };
    }
    
    try {
      // 4. Utilizziamo una transazione per eseguire l'eliminazione in modo consistente
      await db.transaction(async (tx) => {
        // Estrai tutti gli ID delle ceste
        const basketIds = flupsyBaskets.map(basket => basket.id);
        
        if (basketIds.length > 0) {
          // 4.1 Eliminazione di tutte le operazioni associate alle ceste
          // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
          console.log(`deleteFlupsy - Eliminazione operazioni per ${basketIds.length} ceste`);
          await tx
            .delete(operations)
            .where(inArray(operations.basketId, basketIds))
          
          // 4.2 Eliminazione della cronologia delle posizioni
          // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
          console.log(`deleteFlupsy - Cronologia posizioni rimossa per performance`);
          
          // 4.3 Controlla e pulisci eventuali riferimenti nelle tabelle di screening
          try {
            // Per la tabella screeningSourceBaskets
            // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningSourceBaskets)
              .where(inArray(screeningSourceBaskets.basketId, basketIds))
            
            // Per la tabella screeningDestinationBaskets
            // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningDestinationBaskets)
              .where(inArray(screeningDestinationBaskets.basketId, basketIds))
              
            // Per la tabella screeningBasketHistory
            // FIX: Utilizziamo or e inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningBasketHistory)
              .where(
                or(
                  inArray(screeningBasketHistory.sourceBasketId, basketIds),
                  inArray(screeningBasketHistory.destinationBasketId, basketIds)
                )
              )
          } catch (error) {
            console.error("Errore durante pulizia tabelle di screening:", error);
            // Continuiamo con la cancellazione anche se questa parte fallisce
          }
        }
        
        // 4.4 Eliminazione di tutte le ceste
        console.log(`deleteFlupsy - Eliminazione ${basketIds.length} ceste del FLUPSY ${id}`);
        await tx
          .delete(baskets)
          .where(eq(baskets.flupsyId, id))
        
        // 4.5 Infine, elimina il FLUPSY stesso
        console.log(`deleteFlupsy - Eliminazione FLUPSY ${id}`);
        await tx
          .delete(flupsys)
          .where(eq(flupsys.id, id))
      });
      
      // Se arriviamo qui, la transazione è stata completata con successo
      // Notifica WebSocket per l'eliminazione riuscita
      if (typeof (global as any).broadcastUpdate === 'function') {
        console.log(`deleteFlupsy - Invio notifica WebSocket per eliminazione FLUPSY ${id}`);
        (global as any).broadcastUpdate('flupsy_deleted', {
          flupsyId: id,
          message: `FLUPSY ${flupsy.name} eliminato con ${flupsyBaskets.length} ceste associate`
        });
      }
      
      return { 
        success: true, 
        message: `FLUPSY ${flupsy.name} eliminato con successo insieme a ${flupsyBaskets.length} ceste associate e tutti i relativi dati` 
      };
      
    } catch (error) {
      console.error(`deleteFlupsy - Errore durante l'eliminazione del FLUPSY ID: ${id}:`, error);
      return { 
        success: false, 
        message: `Errore durante l'eliminazione: ${(error as Error).message}` 
      };
    }
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
    // Verifica se il cestello ha un ciclo attivo
    const basket = await this.getBasket(id);
    if (!basket) {
      console.error(`deleteBasket - Cestello con ID ${id} non trovato`);
      return false;
    }
    
    // Controlla se il cestello ha un ciclo attivo
    if (basket.currentCycleId !== null || basket.state === 'active') {
      console.error(`deleteBasket - Impossibile eliminare cestello con ID ${id}. Il cestello ha un ciclo attivo o è in stato 'active'`);
      throw new Error("Non è possibile eliminare un cestello con un ciclo attivo. Terminare prima il ciclo corrente.");
    }
    
    // Sistema cronologia posizioni rimosso per performance
    // La cronologia delle posizioni basketPositionHistory è stata rimossa per ottimizzare le performance
    // Le posizioni dei cestelli vengono ora gestite direttamente tramite i campi row e position nella tabella baskets
    console.log(`deleteBasket - Sistema ottimizzato senza cronologia posizioni per cestello ${id}`);
    
    // Elimina il cestello
    console.log(`deleteBasket - Eliminazione cestello ${id}`);
    const results = await db.delete(baskets).where(eq(baskets.id, id)).returning();
    
    // Notifica WebSocket se il cestello è stato eliminato con successo
    if (results.length > 0 && typeof (global as any).broadcastUpdate === 'function') {
      console.log(`deleteBasket - Invio notifica WebSocket per eliminazione cestello ${id}`);
      (global as any).broadcastUpdate('basket_deleted', {
        basketId: id,
        message: `Cestello ${basket.physicalNumber} eliminato`
      });
    }
    
    return results.length > 0;
  }

  // OPERATIONS
  async getOperations(): Promise<Operation[]> {
    return await db.select().from(operations);
  }
  
  // Versione ottimizzata di getOperations che utilizza JOIN e paginazione
  async getOperationsOptimized(options?: {
    page?: number; 
    pageSize?: number; 
    cycleId?: number;
    flupsyId?: number;
    basketId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    type?: string;
  }): Promise<{operations: Operation[]; totalCount: number}> {
    console.log("Esecuzione query ottimizzata per operazioni con opzioni:", options);
    
    // Valori predefiniti per paginazione
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;
    
    try {
      // Costruisci le condizioni di filtro
      const whereConditions = [];
      
      if (options?.cycleId) {
        whereConditions.push(eq(operations.cycleId, options.cycleId));
      }
      
      if (options?.basketId) {
        whereConditions.push(eq(operations.basketId, options.basketId));
      }
      
      // Se c'è un filtro per flupsyId, prima ottieni i cestelli in quel flupsy
      // poi filtra per i loro ID
      if (options?.flupsyId) {
        const basketsInFlupsy = await this.getBasketsByFlupsy(options.flupsyId);
        console.log(`Filtro per flupsyId ${options.flupsyId}: trovati ${basketsInFlupsy.length} cestelli`);
        if (basketsInFlupsy.length > 0) {
          const basketIds = basketsInFlupsy.map(b => b.id);
          console.log(`ID cestelli trovati in flupsyId ${options.flupsyId}:`, basketIds);
          whereConditions.push(inArray(operations.basketId, basketIds));
        } else {
          // Se non ci sono cestelli, aggiungi una condizione impossibile per non trovare risultati
          // invece di ignorare il filtro
          whereConditions.push(eq(operations.id, -1));
        }
      }
      
      // Gestione dei filtri di data
      if (options?.dateFrom) {
        const dateFromString = options.dateFrom instanceof Date 
          ? options.dateFrom.toISOString().split('T')[0]
          : String(options.dateFrom);
        whereConditions.push(gte(operations.date, dateFromString));
      }
      
      if (options?.dateTo) {
        const dateToString = options.dateTo instanceof Date 
          ? options.dateTo.toISOString().split('T')[0] 
          : String(options.dateTo);
        whereConditions.push(lte(operations.date, dateToString));
      }
      
      if (options?.type) {
        whereConditions.push(eq(operations.type, options.type as any));
      }
      
      // Costruisci la condizione WHERE completa
      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined;
        
      // 1. Prima esegui una query per ottenere il conteggio totale
      let totalCountQuery = db
        .select({ count: sql`count(*)` })
        .from(operations);
        
      if (whereClause) {
        totalCountQuery = totalCountQuery.where(whereClause);
      }
      
      const totalCountResult = await totalCountQuery;
      const totalCount = Number(totalCountResult[0].count || 0);
      
      // 2. Poi esegui la query paginata con JOIN per includere i dati del cestello e FLUPSY
      let query = db
        .select({
          // Seleziona tutti i campi delle operazioni esistenti
          id: operations.id,
          date: operations.date,
          type: operations.type,
          basketId: operations.basketId,
          cycleId: operations.cycleId,
          sizeId: operations.sizeId,
          sgrId: operations.sgrId,
          lotId: operations.lotId,
          animalCount: operations.animalCount,
          totalWeight: operations.totalWeight,
          animalsPerKg: operations.animalsPerKg,
          averageWeight: operations.averageWeight,
          deadCount: operations.deadCount,
          mortalityRate: operations.mortalityRate,
          notes: operations.notes,
          metadata: operations.metadata,
          // Aggiungi i campi necessari dal cestello e FLUPSY
          basketPhysicalNumber: baskets.physicalNumber,
          basketRow: baskets.row,
          basketPosition: baskets.position,
          flupsyName: flupsys.name,
          flupsyLocation: flupsys.location,
          flupsyId: baskets.flupsyId
        })
        .from(operations)
        .leftJoin(baskets, eq(operations.basketId, baskets.id))
        .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
        .orderBy(desc(operations.date));
      
      if (whereClause) {
        query = query.where(whereClause);
      }
      
      // Applica paginazione
      query = query.limit(pageSize).offset(offset);
      
      const results = await query;
      
      console.log(`Query completata: ${results.length} risultati su ${totalCount} totali`);
      
      return {
        operations: results,
        totalCount
      };
    } catch (error) {
      console.error("Errore in getOperationsOptimized:", error);
      return {
        operations: [],
        totalCount: 0
      };
    }
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
      // Convert any dates to string format - FIX TIMEZONE BUG
      if (typeof operation.date === 'object' && operation.date && 'toISOString' in operation.date) {
        // Usa il fuso orario locale invece di UTC per evitare il bug del giorno precedente
        const date = operation.date as Date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        operationData.date = `${year}-${month}-${day}`;
        console.log(`🗓️ TIMEZONE FIX: Converted ${date.toISOString()} to ${operationData.date} (local date)`);
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
        console.log(`DB-STORAGE - updateOperation - Calculated averageWeight: ${averageWeight} from animalsPerKg: ${updateData.animalsPerKg}`);
        
        // CRITICAL FIX: Ricalcola automaticamente la taglia corretta quando animalsPerKg viene aggiornato
        try {
          const allSizes = await db.select().from(sizes).orderBy(sizes.minAnimalsPerKg);
          
          // Trova la taglia che corrisponde agli animali per kg aggiornati
          const matchingSize = allSizes.find(size => 
            size.minAnimalsPerKg !== null && 
            size.maxAnimalsPerKg !== null && 
            updateData.animalsPerKg! >= size.minAnimalsPerKg && 
            updateData.animalsPerKg! <= size.maxAnimalsPerKg
          );
          
          if (matchingSize) {
            console.log(`DB-STORAGE - updateOperation - Auto-assigned size: ${matchingSize.code} (ID: ${matchingSize.id}) per ${updateData.animalsPerKg} animali/kg`);
            updateData.sizeId = matchingSize.id;
          } else {
            console.log(`DB-STORAGE - updateOperation - ATTENZIONE: Nessuna taglia trovata per ${updateData.animalsPerKg} animali/kg`);
          }
        } catch (sizeError) {
          console.error("DB-STORAGE - updateOperation - Errore nel recupero delle taglie per ricalcolo automatico:", sizeError);
        }
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
        
        // 1. Prima elimina l'operazione principale
        console.log(`Eliminazione operazione principale ID: ${id}`);
        await db.delete(operations)
          .where(eq(operations.id, id));
        
        // 2. Poi elimina tutte le altre operazioni associate al ciclo
        const cycleOperations = await this.getOperationsByCycle(cycleId);
        console.log(`Trovate ${cycleOperations.length} operazioni rimanenti associate al ciclo ${cycleId}`);
        
        for (const op of cycleOperations) {
          console.log(`Eliminazione operazione correlata ID: ${op.id}`);
          await db.delete(operations)
            .where(eq(operations.id, op.id));
        }
        
        // 2. Elimina i record correlati al ciclo in tutte le tabelle
        console.log(`Eliminazione dati correlati al ciclo ID: ${cycleId} in tutte le tabelle`);
        
        // 2.1 Elimina eventuali impatti ambientali associati al ciclo
        try {
          // Prova a eliminare gli impatti ambientali se la tabella esiste
          const impactResult = await db.execute(sql`
            DELETE FROM operation_impacts 
            WHERE operation_id IN (
              SELECT id FROM operations WHERE cycle_id = ${cycleId}
            )
          `);
          console.log(`Eliminati impatti ambientali per operazioni del ciclo ID: ${cycleId}`);
        } catch (error) {
          // Ignora errori se la tabella non esiste (ancora)
          console.log(`Tabella impatti ambientali non presente, continuando...`);
        }
        
        // 2.2 Gestione dati di vagliatura correlati
        try {
          const { screeningSourceBaskets, screeningDestinationBaskets, screeningBasketHistory } = await import('@shared/schema');
          
          // Elimina riferimenti nelle ceste di origine della vagliatura
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nelle ceste di origine della vagliatura`);
          await db.update(screeningSourceBaskets)
            .set({ cycleId: null })
            .where(eq(screeningSourceBaskets.cycleId, cycleId));
          
          // Elimina riferimenti nelle ceste di destinazione della vagliatura
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nelle ceste di destinazione della vagliatura`);
          await db.update(screeningDestinationBaskets)
            .set({ cycleId: null })
            .where(eq(screeningDestinationBaskets.cycleId, cycleId));
          
          // Aggiorna storia delle ceste nella vagliatura
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nella storia delle ceste di vagliatura`);
          await db.update(screeningBasketHistory)
            .set({ sourceCycleId: null })
            .where(eq(screeningBasketHistory.sourceCycleId, cycleId));
          
          await db.update(screeningBasketHistory)
            .set({ destinationCycleId: null })
            .where(eq(screeningBasketHistory.destinationCycleId, cycleId));
        } catch (error) {
          console.error(`Errore durante pulizia riferimenti alla vagliatura: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.3 Gestione dati di selezione correlati
        try {
          const { selectionSourceBaskets, selectionDestinationBaskets, selectionBasketHistory } = await import('@shared/schema');
          
          // Elimina riferimenti nelle ceste di origine della selezione
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nelle ceste di origine della selezione`);
          await db.update(selectionSourceBaskets)
            .set({ cycleId: null })
            .where(eq(selectionSourceBaskets.cycleId, cycleId));
          
          // Elimina riferimenti nelle ceste di destinazione della selezione
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nelle ceste di destinazione della selezione`);
          await db.update(selectionDestinationBaskets)
            .set({ cycleId: null })
            .where(eq(selectionDestinationBaskets.cycleId, cycleId));
          
          // Aggiorna storia delle ceste nella selezione
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nella storia delle ceste di selezione`);
          await db.update(selectionBasketHistory)
            .set({ sourceCycleId: null })
            .where(eq(selectionBasketHistory.sourceCycleId, cycleId));
          
          await db.update(selectionBasketHistory)
            .set({ destinationCycleId: null })
            .where(eq(selectionBasketHistory.destinationCycleId, cycleId));
        } catch (error) {
          console.error(`Errore durante pulizia riferimenti alla selezione: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.4 Eliminazione composizione lotti misti (basket_lot_composition)
        try {
          const { basketLotComposition } = await import('@shared/schema');
          
          console.log(`Eliminazione composizione lotti per ciclo ${cycleId} dalla tabella basket_lot_composition`);
          const deletedCompositions = await db.delete(basketLotComposition)
            .where(eq(basketLotComposition.cycleId, cycleId))
            .returning({ id: basketLotComposition.id });
          
          console.log(`✅ Eliminati ${deletedCompositions.length} record di composizione lotti per ciclo ${cycleId}`);
        } catch (error) {
          console.error(`Errore durante eliminazione composizione lotti: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.5 Eliminazione impatti del ciclo (cycle_impacts)
        try {
          const { cycleImpacts } = await import('@shared/schema');
          
          console.log(`Eliminazione impatti per ciclo ${cycleId} dalla tabella cycle_impacts`);
          const deletedImpacts = await db.delete(cycleImpacts)
            .where(eq(cycleImpacts.cycleId, cycleId))
            .returning({ id: cycleImpacts.id });
          
          console.log(`✅ Eliminati ${deletedImpacts.length} record di impatti per ciclo ${cycleId}`);
        } catch (error) {
          console.error(`Errore durante eliminazione impatti ciclo: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.6 Pulizia movimenti lotti (lot_ledger)
        try {
          const { lotLedger } = await import('@shared/schema');
          
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nella tabella lot_ledger`);
          
          // Azzera source_cycle_id
          await db.update(lotLedger)
            .set({ sourceCycleId: null })
            .where(eq(lotLedger.sourceCycleId, cycleId));
          
          // Azzera dest_cycle_id
          await db.update(lotLedger)
            .set({ destCycleId: null })
            .where(eq(lotLedger.destCycleId, cycleId));
          
          console.log(`✅ Puliti riferimenti al ciclo ${cycleId} in lot_ledger`);
        } catch (error) {
          console.error(`Errore durante pulizia lot_ledger: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.7 Pulizia riferimenti lotti screening (screening_lot_references)
        try {
          const { screeningLotReferences } = await import('@shared/schema');
          
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nella tabella screening_lot_references`);
          await db.update(screeningLotReferences)
            .set({ destinationCycleId: null })
            .where(eq(screeningLotReferences.destinationCycleId, cycleId));
          
          console.log(`✅ Puliti riferimenti al ciclo ${cycleId} in screening_lot_references`);
        } catch (error) {
          console.error(`Errore durante pulizia screening_lot_references: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.8 Pulizia riferimenti lotti selezione (selection_lot_references)
        try {
          const { selectionLotReferences } = await import('@shared/schema');
          
          console.log(`Pulizia riferimenti al ciclo ${cycleId} nella tabella selection_lot_references`);
          await db.update(selectionLotReferences)
            .set({ destinationCycleId: null })
            .where(eq(selectionLotReferences.destinationCycleId, cycleId));
          
          console.log(`✅ Puliti riferimenti al ciclo ${cycleId} in selection_lot_references`);
        } catch (error) {
          console.error(`Errore durante pulizia selection_lot_references: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 2.9 Infine, elimina il ciclo
        console.log(`Eliminazione ciclo ID: ${cycleId}`);
        await db.delete(cycles)
          .where(eq(cycles.id, cycleId));
        
        // 3. Libera il cestello e resetta la posizione
        if (basketId) {
          console.log(`Aggiornamento stato cestello ID: ${basketId} a disponibile`);
          
          // 3.1. Sistema cronologia posizioni rimosso per performance
          // La cronologia delle posizioni basketPositionHistory è stata rimossa per ottimizzare le performance
          // Le posizioni dei cestelli vengono ora gestite direttamente tramite i campi row e position nella tabella baskets
          console.log(`Sistema cronologia posizioni rimosso - aggiornamento diretto stato cestello ${basketId}`);
          
          // 3.2. Aggiorna lo stato del cestello
          // IMPORTANTE: Manteniamo la posizione fisica (row, position) del cestello
          // perché eliminiamo solo il ciclo, non la posizione fisica del cestello
          await this.updateBasket(basketId, {
            state: 'available',
            currentCycleId: null,
            cycleCode: null,
            nfcData: null
            // NON resettiamo row e position perché il cestello rimane fisicamente nella stessa posizione
          });
        }
        
        // Per le operazioni di prima attivazione, l'operazione è già stata eliminata sopra
        return true;
      }
      
      // Per le operazioni normali, elimina solo l'operazione richiesta
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
  // Cache per sizes (cambiano raramente)
  private sizesCache: Size[] | null = null;
  private sizesCacheTimestamp = 0;
  private SIZES_CACHE_TTL = 300000; // 5 minuti

  async getSizes(): Promise<Size[]> {
    // 🚀 OTTIMIZZAZIONE: Cache per sizes
    const now = Date.now();
    if (this.sizesCache && (now - this.sizesCacheTimestamp) < this.SIZES_CACHE_TTL) {
      return this.sizesCache;
    }

    // Query ottimizzata senza mapping inutile
    const allSizes = await db.select().from(sizes).orderBy(sizes.minAnimalsPerKg);
    
    // Salva in cache
    this.sizesCache = allSizes;
    this.sizesCacheTimestamp = now;
    
    return allSizes;
  }
  
  // Added this method to support FLUPSY units view with main sizes data
  async getAllSizes(): Promise<Size[]> {
    // Ordina per minAnimalsPerKg crescente (meno animali per kg = animali più grandi)
    return await db.select().from(sizes).orderBy(sizes.minAnimalsPerKg);
  }

  async getAllSgr(): Promise<Sgr[]> {
    return await db.select().from(sgr).orderBy(sgr.month);
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
    const cacheKey = 'all_lots_ordered';
    const cached = this.lotsCache.get(cacheKey);
    
    // Verifica se abbiamo dati in cache validi
    if (cached && (Date.now() - cached.timestamp) < this.lotsCacheExpiry) {
      console.log('🚀 LOTTI: Cache HIT - recuperati in 0ms');
      return cached.data;
    }

    try {
      console.log('🔄 LOTTI: Cache MISS - query al database...');
      const startTime = Date.now();
      const lotsData = await db.select().from(lots).orderBy(desc(lots.arrivalDate));
      const duration = Date.now() - startTime;
      
      // Salva in cache
      this.lotsCache.set(cacheKey, {
        data: lotsData,
        timestamp: Date.now()
      });
      
      console.log(`🚀 LOTTI: Cache SAVED (${lotsData.length} lotti) - query completata in ${duration}ms`);
      return lotsData;
    } catch (error) {
      console.error('Error in getLots:', error);
      throw error;
    }
  }

  // Metodo per invalidare la cache dei lotti
  invalidateLotsCache(): void {
    this.lotsCache.clear();
    console.log('🧹 LOTTI: Cache invalidata');
  }
  
  /**
   * 🔧 FALLBACK: Versione semplificata che funziona - senza sizes integrate
   * @param options Opzioni di paginazione e filtraggio
   * @returns Lista paginata di lotti e conteggio totale
   */
  async getLotsOptimized(options: {
    page?: number;
    pageSize?: number;
    supplier?: string;
    quality?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sizeId?: number;
  }): Promise<{ lots: Lot[], totalCount: number }> {
    try {
      // Valori predefiniti
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const offset = (page - 1) * pageSize;
      
      // Costruisci la query base per il conteggio totale
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(lots);
      
      // Query principale - semplice e sicura
      let query = db.select().from(lots);
      
      // Applica i filtri a entrambe le query
      const filters = [];
      
      if (options.supplier) {
        filters.push(eq(lots.supplier, options.supplier));
      }
      
      if (options.quality) {
        filters.push(eq(lots.quality, options.quality));
      }
      
      if (options.sizeId) {
        filters.push(eq(lots.sizeId, options.sizeId));
      }
      
      if (options.dateFrom) {
        const dateFromStr = options.dateFrom.toISOString().split('T')[0];
        filters.push(gte(lots.arrivalDate, dateFromStr));
      }
      
      if (options.dateTo) {
        const dateToStr = options.dateTo.toISOString().split('T')[0];
        filters.push(lte(lots.arrivalDate, dateToStr));
      }
      
      // Applica tutti i filtri alle query
      if (filters.length > 0) {
        const condition = and(...filters);
        countQuery = countQuery.where(condition);
        query = query.where(condition);
      }
      
      // Esegui la query di conteggio
      const countResult = await countQuery;
      const totalCount = countResult[0]?.count || 0;
      
      // Esegui la query principale con paginazione e ordinamento
      const results = await query
        .orderBy(desc(lots.arrivalDate))
        .limit(pageSize)
        .offset(offset);
      
      return {
        lots: results,
        totalCount
      };
    } catch (error) {
      console.error('Errore nell\'ottenere i lotti con paginazione:', error);
      throw error;
    }
  }

  async getActiveLots(): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.state, 'active')).orderBy(desc(lots.arrivalDate));
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
    
    // 🚀 OTTIMIZZAZIONE: Inserimento diretto senza sequence management
    // PostgreSQL gestisce automaticamente l'auto-increment
    const results = await db.insert(lots).values({
      ...lot,
      state: 'active'
    }).returning();
    
    // Invalida la cache dei lotti
    this.invalidateLotsCache();
    
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
    
    // Invalida la cache dei lotti
    this.invalidateLotsCache();
    
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
      
      // Invalida la cache dei lotti
      this.invalidateLotsCache();
      
      // Restituisce true se almeno un record è stato eliminato
      return results.length > 0;
    } catch (error) {
      console.error(`Errore durante l'eliminazione del lotto ID ${id}:`, error);
      return false;
    }
  }
  
  // BASKET POSITION HISTORY REMOVED FOR PERFORMANCE OPTIMIZATION
  // Le funzioni createBasketPositionHistory, closeBasketPositionHistory e getCurrentBasketPosition 
  // sono state rimosse per ottimizzare le performance delle API di posizionamento.
  // La gestione delle posizioni dei cestelli avviene ora direttamente tramite i campi row e position nella tabella baskets.

  
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
    
    // Traduce destinationType in category italiana
    let category = basket.category;
    if (!category && (basket as any).destinationType) {
      const destType = (basket as any).destinationType;
      if (destType === 'sold') {
        category = 'Venduta';
      } else if (destType === 'placed') {
        category = 'Riposizionata';
      }
    }
    
    const results = await db.insert(screeningDestinationBaskets)
      .values({
        ...basket,
        category,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return results[0];
  }
  
  async updateScreeningDestinationBasket(id: number, basket: Partial<ScreeningDestinationBasket>): Promise<ScreeningDestinationBasket | undefined> {
    const now = new Date();
    
    // Traduce destinationType in category italiana se presente
    let updateData = { ...basket };
    if (!updateData.category && (basket as any).destinationType) {
      const destType = (basket as any).destinationType;
      if (destType === 'sold') {
        updateData.category = 'Venduta';
      } else if (destType === 'placed') {
        updateData.category = 'Riposizionata';
      }
    }
    
    const results = await db.update(screeningDestinationBaskets)
      .set({
        ...updateData,
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
  

  // Sales sync and reporting methods
  async getSyncStatus(): Promise<any[]> {
    try {
      const results = await db.select().from(syncStatus);
      return results;
    } catch (error) {
      console.error('Errore nel recupero dello stato di sincronizzazione:', error);
      throw error;
    }
  }

  async getExternalCustomersSync(): Promise<any[]> {
    try {
      const results = await db.select().from(externalCustomersSync);
      return results;
    } catch (error) {
      console.error('Errore nel recupero dei clienti sincronizzati:', error);
      throw error;
    }
  }

  async getExternalSalesSync(): Promise<any[]> {
    try {
      const results = await db.select().from(externalSalesSync);
      return results;
    } catch (error) {
      console.error('Errore nel recupero delle vendite sincronizzate:', error);
      throw error;
    }
  }

  async getExternalSalesSyncByDateRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const results = await db.select()
        .from(externalSalesSync)
        .where(
          and(
            gte(externalSalesSync.saleDate, startDate),
            lte(externalSalesSync.saleDate, endDate)
          )
        );
      return results;
    } catch (error) {
      console.error('Errore nel recupero delle vendite per intervallo di date:', error);
      throw error;
    }
  }

  async getExternalSalesSyncByCustomer(customerId: number): Promise<any[]> {
    try {
      const results = await db.select()
        .from(externalSalesSync)
        .where(eq(externalSalesSync.customerId, customerId));
      return results;
    } catch (error) {
      console.error('Errore nel recupero delle vendite per cliente:', error);
      throw error;
    }
  }

  async getSalesReportsSummary(startDate?: string, endDate?: string): Promise<any> {
    try {
      let query = db.select({
        totalSales: count(externalSalesSync.id),
        totalRevenue: sum(externalSalesSync.totalAmount),
        totalCustomers: countDistinct(externalSalesSync.customerId)
      }).from(externalSalesSync);

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(externalSalesSync.saleDate, startDate),
            lte(externalSalesSync.saleDate, endDate)
          )
        );
      }

      const result = await query;
      return result[0] || { totalSales: 0, totalRevenue: 0, totalCustomers: 0 };
    } catch (error) {
      console.error('Errore nel calcolo del riepilogo vendite:', error);
      throw error;
    }
  }

  async getSalesReportsByProduct(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = db.select({
        productName: externalSalesSync.productName,
        productCode: externalSalesSync.productCode,
        totalQuantity: sum(externalSalesSync.quantity),
        totalRevenue: sum(externalSalesSync.totalAmount),
        orderCount: count(externalSalesSync.id)
      })
      .from(externalSalesSync)
      .groupBy(externalSalesSync.productCode, externalSalesSync.productName);

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(externalSalesSync.saleDate, startDate),
            lte(externalSalesSync.saleDate, endDate)
          )
        );
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Errore nel recupero dei report prodotti:', error);
      throw error;
    }
  }

  async getSalesReportsByCustomer(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = db.select({
        customerName: externalSalesSync.customerName,
        customerId: externalSalesSync.customerId,
        totalOrders: count(externalSalesSync.id),
        totalRevenue: sum(externalSalesSync.totalAmount),
        lastOrderDate: max(externalSalesSync.saleDate)
      })
      .from(externalSalesSync)
      .groupBy(externalSalesSync.customerId, externalSalesSync.customerName);

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(externalSalesSync.saleDate, startDate),
            lte(externalSalesSync.saleDate, endDate)
          )
        );
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Errore nel recupero dei report clienti:', error);
      throw error;
    }
  }

  async getSalesReportsMonthly(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = db.select({
        month: sql<string>`EXTRACT(MONTH FROM ${externalSalesSync.saleDate})`,
        year: sql<number>`EXTRACT(YEAR FROM ${externalSalesSync.saleDate})`,
        totalSales: count(externalSalesSync.id),
        totalRevenue: sum(externalSalesSync.totalAmount),
        uniqueCustomers: countDistinct(externalSalesSync.customerId)
      })
      .from(externalSalesSync)
      .groupBy(
        sql`EXTRACT(YEAR FROM ${externalSalesSync.saleDate})`,
        sql`EXTRACT(MONTH FROM ${externalSalesSync.saleDate})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${externalSalesSync.saleDate}) DESC`,
        sql`EXTRACT(MONTH FROM ${externalSalesSync.saleDate}) DESC`
      );

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(externalSalesSync.saleDate, startDate),
            lte(externalSalesSync.saleDate, endDate)
          )
        );
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Errore nel recupero dei report mensili:', error);
      throw error;
    }
  }

  // Metodi per il conteggio dei record sincronizzati
  async getSyncCustomersCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: count() }).from(externalCustomersSync);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Errore nel conteggio clienti sincronizzati:', error);
      return 0;
    }
  }

  async getSyncSalesCount(): Promise<number> {
    try {
      const result = await this.db.select({ count: count() }).from(externalSalesSync);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Errore nel conteggio vendite sincronizzate:', error);
      return 0;
    }
  }

  async bulkUpsertExternalCustomersSync(customers: any[]): Promise<void> {
    try {
      if (customers.length === 0) return;
      
      await db.insert(externalCustomersSync)
        .values(customers)
        .onConflictDoUpdate({
          target: externalCustomersSync.externalId,
          set: {
            customerName: sql`excluded.customer_name`,
            customerCode: sql`excluded.customer_code`,
            email: sql`excluded.email`,
            phone: sql`excluded.phone`,
            address: sql`excluded.address`,
            city: sql`excluded.city`,
            zipCode: sql`excluded.zip_code`,
            country: sql`excluded.country`,
            vatNumber: sql`excluded.vat_number`,
            fiscalCode: sql`excluded.fiscal_code`,
            lastSyncAt: sql`excluded.last_sync_at`
          }
        });
    } catch (error) {
      console.error('Errore nell\'upsert bulk clienti:', error);
      throw error;
    }
  }

  async bulkUpsertExternalSalesSync(sales: any[]): Promise<void> {
    try {
      if (sales.length === 0) return;
      
      await db.insert(externalSalesSync)
        .values(sales)
        .onConflictDoUpdate({
          target: externalSalesSync.externalId,
          set: {
            customerId: sql`excluded.customer_id`,
            customerName: sql`excluded.customer_name`,
            productName: sql`excluded.product_name`,
            productCode: sql`excluded.product_code`,
            quantity: sql`excluded.quantity`,
            unitPrice: sql`excluded.unit_price`,
            totalAmount: sql`excluded.total_amount`,
            saleDate: sql`excluded.sale_date`,
            lastSyncAt: sql`excluded.last_sync_at`
          }
        });
    } catch (error) {
      console.error('Errore nell\'upsert bulk vendite:', error);
      throw error;
    }
  }

  async clearExternalDeliveriesSync(): Promise<void> {
    try {
      await db.delete(externalDeliveriesSync);
      console.log('🧹 Tabella consegne sincronizzate pulita');
    } catch (error) {
      console.error('Errore pulizia tabella consegne:', error);
      throw error;
    }
  }

  async clearExternalDeliveryDetailsSync(): Promise<void> {
    try {
      await db.delete(externalDeliveryDetailsSync);
      console.log('🧹 Tabella dettagli consegne sincronizzati pulita');
    } catch (error) {
      console.error('Errore pulizia tabella dettagli consegne:', error);
      throw error;
    }
  }

  async bulkUpsertExternalDeliveriesSync(deliveries: InsertExternalDeliverySync[]): Promise<ExternalDeliverySync[]> {
    try {
      if (deliveries.length === 0) return [];
      
      const result = await db.insert(externalDeliveriesSync)
        .values(deliveries)
        .onConflictDoUpdate({
          target: externalDeliveriesSync.externalId,
          set: {
            dataCreazione: sql`excluded.data_creazione`,
            clienteId: sql`excluded.cliente_id`,
            ordineId: sql`excluded.ordine_id`,
            dataConsegna: sql`excluded.data_consegna`,
            stato: sql`excluded.stato`,
            numeroTotaleCeste: sql`excluded.numero_totale_ceste`,
            pesoTotaleKg: sql`excluded.peso_totale_kg`,
            totaleAnimali: sql`excluded.totale_animali`,
            tagliaMedia: sql`excluded.taglia_media`,
            qrcodeUrl: sql`excluded.qrcode_url`,
            note: sql`excluded.note`,
            numeroProgressivo: sql`excluded.numero_progressivo`,
            lastModifiedExternal: sql`excluded.last_modified_external`,
            syncedAt: sql`CURRENT_TIMESTAMP`
          }
        })
        .returning();
      
      return result;
    } catch (error) {
      console.error('Errore nell\'upsert bulk consegne:', error);
      throw error;
    }
  }

  async bulkUpsertExternalDeliveryDetailsSync(deliveryDetails: InsertExternalDeliveryDetailSync[]): Promise<ExternalDeliveryDetailSync[]> {
    try {
      if (deliveryDetails.length === 0) return [];
      
      const result = await db.insert(externalDeliveryDetailsSync)
        .values(deliveryDetails)
        .onConflictDoUpdate({
          target: externalDeliveryDetailsSync.externalId,
          set: {
            reportId: sql`excluded.report_id`,
            misurazioneId: sql`excluded.misurazione_id`,
            vascaId: sql`excluded.vasca_id`,
            codiceSezione: sql`excluded.codice_sezione`,
            numeroCeste: sql`excluded.numero_ceste`,
            pesoCesteKg: sql`excluded.peso_ceste_kg`,
            taglia: sql`excluded.taglia`,
            animaliPerKg: sql`excluded.animali_per_kg`,
            percentualeGuscio: sql`excluded.percentuale_guscio`,
            percentualeMortalita: sql`excluded.percentuale_mortalita`,
            numeroAnimali: sql`excluded.numero_animali`,
            note: sql`excluded.note`,
            lastModifiedExternal: sql`excluded.last_modified_external`,
            syncedAt: sql`CURRENT_TIMESTAMP`
          }
        })
        .returning();
      
      return result;
    } catch (error) {
      console.error('Errore nell\'upsert bulk dettagli consegne:', error);
      throw error;
    }
  }

  async getExternalDeliveriesSync(): Promise<ExternalDeliverySync[]> {
    try {
      return await db.select({
        id: externalDeliveriesSync.id,
        externalId: externalDeliveriesSync.externalId,
        dataCreazione: externalDeliveriesSync.dataCreazione,
        clienteId: externalDeliveriesSync.clienteId,
        ordineId: externalDeliveriesSync.ordineId,
        dataConsegna: externalDeliveriesSync.dataConsegna,
        stato: externalDeliveriesSync.stato,
        numeroTotaleCeste: externalDeliveriesSync.numeroTotaleCeste,
        pesoTotaleKg: externalDeliveriesSync.pesoTotaleKg,
        totaleAnimali: externalDeliveriesSync.totaleAnimali,
        tagliaMedia: externalDeliveriesSync.tagliaMedia,
        qrcodeUrl: externalDeliveriesSync.qrcodeUrl,
        note: externalDeliveriesSync.note,
        numeroProgressivo: externalDeliveriesSync.numeroProgressivo,
        syncedAt: externalDeliveriesSync.syncedAt
      }).from(externalDeliveriesSync).orderBy(desc(externalDeliveriesSync.dataConsegna));
    } catch (error) {
      console.error('Errore nel recupero consegne sincronizzate:', error);
      return [];
    }
  }

  async getExternalDeliveryDetailsSync(): Promise<ExternalDeliveryDetailSync[]> {
    try {
      return await db.select({
        id: externalDeliveryDetailsSync.id,
        externalId: externalDeliveryDetailsSync.externalId,
        reportId: externalDeliveryDetailsSync.reportId,
        misurazioneId: externalDeliveryDetailsSync.misurazioneId,
        vascaId: externalDeliveryDetailsSync.vascaId,
        codiceSezione: externalDeliveryDetailsSync.codiceSezione,
        numeroCeste: externalDeliveryDetailsSync.numeroCeste,
        pesoCesteKg: externalDeliveryDetailsSync.pesoCesteKg,
        taglia: externalDeliveryDetailsSync.taglia,
        animaliPerKg: externalDeliveryDetailsSync.animaliPerKg,
        percentualeScarto: externalDeliveryDetailsSync.percentualeScarto,
        percentualeMortalita: externalDeliveryDetailsSync.percentualeMortalita,
        numeroAnimali: externalDeliveryDetailsSync.numeroAnimali,
        note: externalDeliveryDetailsSync.note,
        syncedAt: externalDeliveryDetailsSync.syncedAt
      }).from(externalDeliveryDetailsSync).orderBy(externalDeliveryDetailsSync.reportId);
    } catch (error) {
      console.error('Errore nel recupero dettagli consegne sincronizzati:', error);
      return [];
    }
  }

  async getSyncStatusByTable(tableName: string): Promise<any> {
    try {
      const result = await db.select()
        .from(syncStatus)
        .where(eq(syncStatus.tableName, tableName))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Errore nel recupero stato sincronizzazione:', error);
      return null;
    }
  }

  async upsertSyncStatus(tableName: string, data: any): Promise<void> {
    try {
      await db.insert(syncStatus)
        .values({
          tableName,
          lastSyncAt: data.lastSyncAt || null,
          lastSyncSuccess: data.lastSyncSuccess || false,
          syncInProgress: data.syncInProgress || false,
          recordCount: data.recordCount || 0,
          errorMessage: data.errorMessage || null
        })
        .onConflictDoUpdate({
          target: syncStatus.tableName,
          set: {
            lastSyncAt: sql`excluded.last_sync_at`,
            lastSyncSuccess: sql`excluded.last_sync_success`,
            syncInProgress: sql`excluded.sync_in_progress`,
            recordCount: sql`excluded.record_count`,
            errorMessage: sql`excluded.error_message`,
            updatedAt: sql`CURRENT_TIMESTAMP`
          }
        });
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato sync:', error);
      throw error;
    }
  }

  async updateSyncStatus(tableName: string, data: any): Promise<SyncStatus | undefined> {
    try {
      const [result] = await db.update(syncStatus)
        .set({
          lastSyncAt: data.lastSyncAt,
          lastSyncSuccess: data.lastSyncSuccess,
          syncInProgress: data.syncInProgress,
          recordCount: data.recordCount,
          errorMessage: data.errorMessage,
          updatedAt: new Date()
        })
        .where(eq(syncStatus.tableName, tableName))
        .returning();
      
      return result;
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato sync:', error);
      return undefined;
    }
  }

  async clearExternalCustomersSync(): Promise<void> {
    try {
      await db.delete(externalCustomersSync);
      console.log('🧹 Tabella clienti sincronizzati pulita');
    } catch (error) {
      console.error('Errore nella pulizia clienti sincronizzati:', error);
      throw error;
    }
  }

  async clearExternalSalesSync(): Promise<void> {
    try {
      await db.delete(externalSalesSync);
      console.log('🧹 Tabella vendite sincronizzate pulita');
    } catch (error) {
      console.error('Errore nella pulizia vendite sincronizzate:', error);
      throw error;
    }
  }
}