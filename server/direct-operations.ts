// File: server/direct-operations.ts
// Implementazione diretta delle route per le operazioni che bypassano i problemi nel sistema esistente

import type { Express } from "express";
import { db } from './db';
import { operations, cycles, baskets, sizes } from '../shared/schema';
import { sql, eq, and, between } from 'drizzle-orm';
import { broadcastMessage } from './websocket';
import { BasketsCache } from './baskets-cache-service.js';
import { OperationsCache } from './operations-cache-service.js';
import { invalidateUnifiedCache } from './controllers/operations-unified-controller.js';

/**
 * Trova automaticamente il sizeId corretto in base al numero di animali per kg.
 * @param animalsPerKg Numero di animali per kg
 * @returns Promise che risolve con il sizeId appropriato
 */
async function findSizeIdByAnimalsPerKg(animalsPerKg: number): Promise<number | null> {
  try {
    // Cerca la taglia appropriata in base al range di animali per kg
    const appropriateSize = await db
      .select()
      .from(sizes)
      .where(
        and(
          sql`${animalsPerKg} >= ${sizes.minAnimalsPerKg}`,
          sql`${animalsPerKg} <= ${sizes.maxAnimalsPerKg}`
        )
      )
      .limit(1);
    
    if (appropriateSize && appropriateSize.length > 0) {
      console.log(`Trovata taglia appropriata per ${animalsPerKg} animali/kg:`, appropriateSize[0]);
      return appropriateSize[0].id;
    }
    
    // Se non troviamo un range esatto, cerchiamo la taglia più vicina
    console.log(`Nessuna taglia esatta trovata per ${animalsPerKg} animali/kg, cercando la più vicina...`);
    const allSizes = await db.select().from(sizes).orderBy(sizes.minAnimalsPerKg);
    
    if (allSizes.length === 0) {
      console.error("Nessuna taglia trovata nel database!");
      return null;
    }
    
    // Trova la taglia più vicina
    let closestSize = allSizes[0];
    let minDifference = Math.abs(animalsPerKg - ((closestSize.minAnimalsPerKg || 0) + (closestSize.maxAnimalsPerKg || 0)) / 2);
    
    for (const size of allSizes) {
      const avgAnimalsPerKg = ((size.minAnimalsPerKg || 0) + (size.maxAnimalsPerKg || 0)) / 2;
      const difference = Math.abs(animalsPerKg - avgAnimalsPerKg);
      
      if (difference < minDifference) {
        minDifference = difference;
        closestSize = size;
      }
    }
    
    console.log(`Trovata taglia più vicina per ${animalsPerKg} animali/kg:`, closestSize);
    return closestSize.id;
  } catch (error) {
    console.error("Errore nella ricerca della taglia:", error);
    return null;
  }
}

/**
 * Implementa la route diretta per le operazioni che risolve i problemi di inserimento
 * nel database, in particolare per le operazioni di prima attivazione.
 */
export function implementDirectOperationRoute(app: Express) {
  console.log("🚀 REGISTRAZIONE ROUTE DIRETTE - INIZIO");
  console.log("Registrazione della route diretta per le operazioni (/api/direct-operations)");
  
  // ===== ROUTE DI TEST =====
  console.log("🧪 Registrazione route TEST: /api/test-delete/:id");
  app.get('/api/test-delete/:id', async (req, res) => {
    console.log("🧪🧪🧪 TEST ROUTE CHIAMATA! 🧪🧪🧪");
    const id = req.params.id;
    console.log(`🧪 TEST: ID ricevuto: ${id}`);
    return res.json({ message: "Test route funziona!", id, timestamp: new Date().toISOString() });
  });
  
  // ===== ROUTE DI INVALIDAZIONE CACHE =====
  console.log("🗑️ Registrazione route CACHE INVALIDATION: /api/operations-cache-clear");
  app.post('/api/operations-cache-clear', async (req, res) => {
    console.log("🔄🔄🔄 CACHE INVALIDATION ROUTE CHIAMATA! 🔄🔄🔄");
    try {
      // Invalida la cache delle operazioni
      const { OperationsCache } = await import('./operations-cache-service.js');
      OperationsCache.clear();
      console.log('🗑️ Cache operazioni completamente invalidata');
      
      // Invalida anche la cache unificata se presente
      try {
        const { invalidateUnifiedCache } = await import('./routes.js');
        invalidateUnifiedCache();
        console.log('🔄 Cache unificata invalidata');
      } catch (error) {
        console.warn('⚠️ Errore nell\'invalidazione cache unificata:', error);
      }
      
      // Invia notifica WebSocket per refresh delle interfacce
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('cache_cleared', {
          cacheType: 'operations',
          timestamp: new Date().toISOString(),
          message: 'Cache operazioni invalidata - refresh richiesto'
        });
        console.log('📡 Notifica WebSocket di cache clearing inviata');
      }
      
      return res.json({
        success: true,
        message: 'Operations cache cleared successfully',
        timestamp: new Date().toISOString(),
        cleared: ['operations_cache', 'unified_cache']
      });
    } catch (error) {
      console.error('❌ Errore durante l\'invalidazione cache:', error);
      return res.status(500).json({
        success: false,
        message: 'Error clearing operations cache',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // ===== ROUTE DI ELIMINAZIONE DIRETTA =====
  console.log("🗑️ Registrazione route DELETE: /api/emergency-delete/:id");
  app.post('/api/emergency-delete/:id', async (req, res) => {
    console.log("🚨🚨🚨 DIRECT DELETE ROUTE CHIAMATA! 🚨🚨🚨");
    try {
      const id = parseInt(req.params.id);
      console.log(`🚨 DIRECT DELETE: Eliminazione operazione ID: ${id}`);

      if (isNaN(id)) {
        console.log("❌ ID non valido");
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      // Prima recupera l'operazione per ottenere i dettagli
      const operationToDelete = await db.select().from(operations).where(eq(operations.id, id)).limit(1);
      
      if (!operationToDelete || operationToDelete.length === 0) {
        console.log(`❌ Nessuna operazione trovata con ID ${id}`);
        return res.status(404).json({ message: "Operation not found" });
      }

      const operation = operationToDelete[0];
      console.log(`🔍 Operazione trovata: tipo=${operation.type}, basketId=${operation.basketId}, cycleId=${operation.cycleId}`);

      // Elimina l'operazione dal database
      console.log("🗑️ Eliminazione operazione dal database...");
      const deletedOperations = await db.delete(operations).where(eq(operations.id, id)).returning();
      
      if (deletedOperations && deletedOperations.length > 0) {
        console.log(`✅ Operazione ${id} eliminata con successo`);

        // Se è un'operazione di prima attivazione, elimina anche il ciclo e resetta il cestello
        if (operation.type === 'prima-attivazione' && operation.cycleId) {
          console.log(`🔄 Eliminazione ciclo associato ID: ${operation.cycleId}`);
          
          // Elimina il ciclo
          await db.delete(cycles).where(eq(cycles.id, operation.cycleId));
          console.log(`✅ Ciclo ${operation.cycleId} eliminato`);
          
          // Resetta il cestello a stato disponibile
          await db.update(baskets)
            .set({
              state: 'disponibile',
              currentCycleId: null,
              cycleCode: null
            })
            .where(eq(baskets.id, operation.basketId));
          console.log(`✅ Cestello ${operation.basketId} resettato a disponibile`);
        }

        // Invalida cache operazioni
        const { OperationsCache } = await import('./operations-cache-service.js');
        OperationsCache.clear();
        console.log('🔄 Cache operazioni invalidata');

        // Invia notifiche WebSocket per aggiornamenti real-time
        if (typeof (global as any).broadcastUpdate === 'function') {
          console.log("📡 Invio notifiche WebSocket per eliminazione operazione");
          
          (global as any).broadcastUpdate('operation_deleted', {
            operationId: id,
            basketId: operation.basketId,
            operationType: operation.type,
            message: `Operazione ${operation.type} eliminata`
          });
          
          if (operation.type === 'prima-attivazione' && operation.cycleId) {
            (global as any).broadcastUpdate('cycle_deleted', {
              cycleId: operation.cycleId,
              basketId: operation.basketId,
              message: `Ciclo eliminato dopo rimozione prima attivazione`
            });
          }
          
          (global as any).broadcastUpdate('basket_updated', {
            basketId: operation.basketId,
            state: 'disponibile',
            message: `Cestello aggiornato dopo eliminazione operazione`
          });
          
          console.log("✅ Notifiche WebSocket inviate");
        } else {
          console.warn("⚠️ WebSocket non disponibile per notifiche");
        }

        return res.status(200).json({ 
          message: "Operation deleted successfully with all related data cleanup",
          operationId: id,
          deletedOperation: deletedOperations[0],
          cycleDeleted: operation.type === 'prima-attivazione' && operation.cycleId ? operation.cycleId : null,
          basketReset: operation.basketId
        });
      } else {
        console.log(`❌ Nessuna operazione eliminata`);
        return res.status(404).json({ message: "Operation not found" });
      }
    } catch (error) {
      console.error("❌ Error in direct delete:", error);
      return res.status(500).json({ 
        message: "Failed to delete operation", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Bypass completo della route esistente con una versione specializzata
  app.post('/api/direct-operations', async (req, res) => {
    console.log("============= DIRECT OPERATION ROUTE START =============");
    console.log("Ricevuta richiesta per creazione diretta operazione:");
    console.log(JSON.stringify(req.body, null, 2));
    
    try {
      // 1. Valida manualmente i dati di input
      const operationData: any = { ...req.body };
      
      if (!operationData.type) {
        throw new Error("Il tipo di operazione è obbligatorio");
      }
      
      if (!operationData.basketId) {
        throw new Error("L'ID del cestello è obbligatorio");
      }
      
      if (!operationData.date) {
        throw new Error("La data è obbligatoria");
      }
      
      if (!operationData.lotId) {
        throw new Error("Il lotto è obbligatorio");
      }
      
      // VALIDAZIONE CAMPI OBBLIGATORI
      // Per operazioni di misura, animalCount può essere calcolato automaticamente
      if (operationData.type === 'misura') {
        // Se non è fornito animalCount ma abbiamo i dati per calcolarlo
        if (!operationData.animalCount && operationData.liveAnimals && operationData.sampleWeight && operationData.totalWeight) {
          operationData.animalCount = Math.round((operationData.liveAnimals / operationData.sampleWeight) * operationData.totalWeight);
          console.log(`AnimalCount calcolato automaticamente: ${operationData.animalCount}`);
        }
      }
      
      // Controllo finale: animalCount deve essere presente dopo i calcoli
      if (!operationData.animalCount || operationData.animalCount <= 0) {
        throw new Error("Il numero animali vivi è obbligatorio e deve essere maggiore di 0");
      }
      
      if (!operationData.totalWeight || operationData.totalWeight <= 0) {
        throw new Error("Il peso totale grammi è obbligatorio e deve essere maggiore di 0");
      }
      
      // I grammi sample sono obbligatori solo per operazioni misura (NON per operazioni peso) e se NON è modalità manuale
      if (operationData.type !== 'peso' && !operationData.manualCountAdjustment && (!operationData.sampleWeight || operationData.sampleWeight <= 0)) {
        throw new Error("I grammi sample sono obbligatori e devono essere maggiori di 0");
      }
      
      // Per le operazioni peso rapide, deadCount non è obbligatorio
      if (operationData.type !== 'peso' && (operationData.deadCount === undefined || operationData.deadCount === null || operationData.deadCount < 0)) {
        throw new Error("Il numero animali morti è obbligatorio e deve essere maggiore o uguale a 0");
      }
      
      // Imposta deadCount a 0 per le operazioni peso se non fornito
      if (operationData.type === 'peso' && (operationData.deadCount === undefined || operationData.deadCount === null)) {
        operationData.deadCount = 0;
      }
      
      // Preserviamo esplicitamente animalCount quando viene fornito
      // Questo è particolarmente importante per le operazioni di tipo 'misura' o 'peso'
      const hasAnimalCount = operationData.animalCount !== undefined;
      
      // 2. Assicurati che i tipi di dati siano corretti
      console.log("Conversione e validazione dei dati...");
      
      // Converti la data in formato stringa se necessario - FIX TIMEZONE BUG
      if (operationData.date && typeof operationData.date === 'object' && operationData.date.toISOString) {
        // Usa il fuso orario locale invece di UTC per evitare il bug del giorno precedente
        const date = new Date(operationData.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        operationData.date = `${year}-${month}-${day}`;
        console.log(`🗓️ DIRECT OPERATIONS TIMEZONE FIX: Converted ${date.toISOString()} to ${operationData.date} (local date)`);
      }
      
      // Converti gli ID a numeri
      operationData.basketId = Number(operationData.basketId);
      
      if (operationData.cycleId) {
        operationData.cycleId = Number(operationData.cycleId);
      }
      
      if (operationData.sizeId) {
        operationData.sizeId = Number(operationData.sizeId);
      }
      
      if (operationData.lotId) {
        operationData.lotId = Number(operationData.lotId);
      }
      
      // Ricorda il valore originale di animalCount
      const originalAnimalCount = operationData.animalCount;
      
      // Recupera subito i dati del cestello per poterli utilizzare dopo
      const basketResult = await db.select().from(baskets).where(eq(baskets.id, operationData.basketId)).limit(1);
      if (!basketResult || basketResult.length === 0) {
        throw new Error(`Cestello con ID ${operationData.basketId} non trovato`);
      }
      
      const basket = basketResult[0];
      
      // 3. VALIDAZIONI DATE - Impedire date duplicate e anteriori
      console.log("Validazione date per operazione...");
      
      // Recupera tutte le operazioni esistenti per questa cesta
      const existingOperations = await db
        .select()
        .from(operations)
        .where(eq(operations.basketId, operationData.basketId))
        .orderBy(sql`${operations.date} DESC`);
      
      console.log(`Trovate ${existingOperations.length} operazioni esistenti per cesta ${operationData.basketId}`);
      
      // Converti la data dell'operazione corrente in formato Date per confronti
      const operationDate = new Date(operationData.date);
      const operationDateString = operationData.date;
      
      // Validazione 1: Operazioni multiple nella stessa data (solo per causali diverse da "peso")
      const sameDate = existingOperations.find(op => op.date === operationDateString);
      if (sameDate && operationData.type !== 'peso') {
        throw new Error(`Esiste già un'operazione per la cesta ${basket.physicalNumber} nella data ${operationDateString}. Per causali diverse da "peso", ogni cesta può avere massimo una operazione per data.`);
      }
      
      // Validazione 2: Data non anteriore alla ultima operazione
      if (existingOperations.length > 0) {
        const lastOperation = existingOperations[0]; // Prima operazione = più recente (ORDER BY date DESC)
        const lastDate = new Date(lastOperation.date);
        
        console.log(`Ultima operazione: ${lastOperation.date}, Nuova operazione: ${operationDateString}`);
        
        if (operationDate < lastDate) {
          throw new Error(`La data ${operationDateString} è anteriore all'ultima operazione (${lastOperation.date}) per la cesta ${basket.physicalNumber}. Le operazioni devono essere inserite in ordine cronologico.`);
        }
      }
      
      console.log("✅ Validazioni date completate con successo");
      
      // 3. Calcola averageWeight e sizeId appropriato se viene fornito animalsPerKg
      if (operationData.animalsPerKg && operationData.animalsPerKg > 0) {
        // Calcola il peso medio in mg per ogni animale
        const averageWeight = 1000000 / operationData.animalsPerKg;
        operationData.averageWeight = averageWeight;
        console.log(`Calcolato averageWeight: ${averageWeight} da animalsPerKg: ${operationData.animalsPerKg}`);
        
        // Se l'operazione è di tipo "misura" o "peso", aggiorna automaticamente sizeId
        if (
          (operationData.type === 'misura' || operationData.type === 'peso' || operationData.type === 'prima-attivazione') && 
          operationData.animalsPerKg > 0
        ) {
          console.log(`Calcolo automatico della taglia in base a ${operationData.animalsPerKg} animali/kg...`);
          
          // Trova la taglia appropriata in base al numero di animali per kg
          const appropriateSizeId = await findSizeIdByAnimalsPerKg(operationData.animalsPerKg);
          
          if (appropriateSizeId) {
            // Se l'utente non ha specificato una taglia o se la taglia è diversa da quella calcolata
            if (!operationData.sizeId || operationData.sizeId !== appropriateSizeId) {
              console.log(`Aggiornamento automatico della taglia da ${operationData.sizeId || 'non specificata'} a ${appropriateSizeId} in base al peso`);
              operationData.sizeId = appropriateSizeId;
            }
          } else {
            console.warn("Impossibile calcolare automaticamente la taglia appropriata, viene mantenuta quella specificata dall'utente.");
          }
        }
      }

      // Per le operazioni di tipo 'peso', dobbiamo recuperare l'ultima operazione
      // per ottenere il conteggio animali reale da mantenere
      if (operationData.type === 'peso') {
        try {
          // Ottieni l'ultima operazione per questo cestello
          const lastOperation = await db
            .select()
            .from(operations)
            .where(eq(operations.basketId, operationData.basketId))
            .orderBy(sql`${operations.id} DESC`)
            .limit(1);

          if (lastOperation && lastOperation.length > 0) {
            // Usa il conteggio animali dell'ultima operazione (indipendentemente da quella fornita dal client)
            const lastAnimalCount = lastOperation[0].animalCount;
            console.log(`IMPORTANTE: Per operazione 'peso', sostituito conteggio animali client (${operationData.animalCount}) con ultimo conteggio registrato:`, lastAnimalCount);
            operationData.animalCount = lastAnimalCount;
          } else {
            console.log(`AVVISO: Nessuna operazione precedente trovata per cestello ${operationData.basketId}, si utilizzerà il conteggio animali fornito: ${operationData.animalCount}`);
          }
        } catch (error) {
          console.error("Errore durante il recupero dell'ultima operazione:", error);
          console.log(`FALLBACK: Per operazione 'peso', si utilizza il conteggio animali fornito dal client:`, operationData.animalCount);
        }
      } 
      // Per operazioni di tipo 'misura', considera la mortalità come prima
      else if (operationData.type === 'misura' && hasAnimalCount) {
        const hasMortality = operationData.deadCount && operationData.deadCount > 0;
        const isSpreadsheetMode = (req.body as any)?._spreadsheetMode === true;
        
        if (hasMortality) {
          // Se c'è mortalità, utilizziamo il nuovo valore calcolato di animalCount (già presente in operationData)
          console.log(`IMPORTANTE: Per operazione 'misura' CON MORTALITÀ (${operationData.deadCount} animali), utilizziamo il conteggio animali aggiornato:`, operationData.animalCount);
        } else if (isSpreadsheetMode) {
          // Se è in modalità Spreadsheet, NON sovrascrivere i valori calcolati
          console.log(`🟢 SPREADSHEET MODE: Mantengo i valori calcolati - animalCount: ${operationData.animalCount}, totalWeight: ${operationData.totalWeight}`);
        } else {
          // Se non c'è mortalità e non è Spreadsheet Mode, preserviamo il conteggio animali originale
          console.log(`IMPORTANTE: Per operazione 'misura' SENZA MORTALITÀ, preservato conteggio animali originale:`, originalAnimalCount);
          operationData.animalCount = originalAnimalCount;
        }
      }
      
      console.log("Dati operazione dopo la normalizzazione:");
      console.log(JSON.stringify(operationData, null, 2));
      
      // 4. LOGICA SPECIALIZZATA PER PRIMA ATTIVAZIONE
      if (operationData.type === 'prima-attivazione') {
        console.log("Rilevata operazione di PRIMA ATTIVAZIONE - Esecuzione flusso speciale");
        
        // Verifica che il cestello sia disponibile o attivo senza ciclo
        const isAvailable = basket.state === 'disponibile';
        const isActiveWithoutCycle = basket.state === 'active' && !basket.currentCycleId;
        
        if (!isAvailable && !isActiveWithoutCycle) {
          throw new Error(`Impossibile eseguire la prima attivazione: cestello ${operationData.basketId} ha già un ciclo attivo`);
        }
        
        // TRASAZIONE: Crea prima il ciclo, poi l'operazione con cycleId corretto
        return await db.transaction(async (tx) => {
          // 1. Crea il ciclo
          console.log("Creazione ciclo per prima attivazione...");
          const cycleData = {
            basketId: operationData.basketId,
            startDate: operationData.date,
            state: 'active' as const,
          };
          
          const newCycle = await tx.insert(cycles).values(cycleData).returning();
          if (!newCycle || newCycle.length === 0) {
            throw new Error("Impossibile creare il ciclo");
          }
          
          console.log("Ciclo creato con successo:", newCycle[0]);
          const cycleId = newCycle[0].id;
          
          // 2. Imposta il cycleId nell'operazione
          operationData.cycleId = cycleId;
          
          // 3. Inserisci l'operazione
          console.log("Inserimento operazione con cycleId:", cycleId);
          const newOperation = await tx.insert(operations).values(operationData).returning();
          if (!newOperation || newOperation.length === 0) {
            throw new Error("Impossibile creare l'operazione");
          }
          
          console.log("Operazione creata con successo:", newOperation[0]);
          
          // 4. Genera il cicle code nel formato corretto: numeroCesta-numeroFlupsy-YYMM
          const operationYear = new Date(operationData.date).getFullYear();
          const operationMonth = new Date(operationData.date).getMonth() + 1; // getMonth() restituisce 0-11
          const yearMonth = `${operationYear.toString().slice(-2)}${operationMonth.toString().padStart(2, '0')}`;
          const cycleCode = `${basket.physicalNumber}-${basket.flupsyId}-${yearMonth}`;
          
          console.log(`Generato cycle code: ${cycleCode} (cesta ${basket.physicalNumber}, flupsy ${basket.flupsyId}, periodo ${yearMonth})`);
          
          // 5. Aggiorna lo stato del cestello
          console.log("Aggiornamento stato cestello...");
          const updatedBasket = await tx.update(baskets)
            .set({ 
              state: 'active',
              currentCycleId: cycleId,
              cycleCode: cycleCode
            })
            .where(eq(baskets.id, operationData.basketId))
            .returning();
          
          console.log("Cestello aggiornato:", updatedBasket[0]);
          
          // 5. Invalidazione cache del server e notifica WebSocket
          try {
            // Invalida la cache cestelli e operazioni nel server
            console.log("🗑️ DIRECT-OPERATIONS: Invalidando cache del server...");
            BasketsCache.clear();
            OperationsCache.clear();
            invalidateUnifiedCache(); // Invalida anche la cache unificata operations
            console.log("✅ DIRECT-OPERATIONS: Cache cestelli, operazioni e cache unificata invalidate");
            
            console.log("🚨 DIRECT-OPERATIONS: Invio notifica WebSocket per nuova operazione");
            const result = broadcastMessage('operation_created', {
              operation: newOperation[0],
              message: `Nuova operazione di tipo ${newOperation[0].type} registrata`
            });
            console.log("🚨 DIRECT-OPERATIONS: Notifica WebSocket inviata con successo, clienti raggiunti:", result);
          } catch (wsError) {
            console.error("❌ DIRECT-OPERATIONS: Errore nell'invio della notifica WebSocket:", wsError);
          }
          
          return res.status(201).json(newOperation[0]);
        });
      } else if (operationData.type === 'vendita' || operationData.type === 'selezione-vendita' || operationData.type === 'cessazione') {
        console.log(`Rilevata operazione di CHIUSURA CICLO: ${operationData.type} - Esecuzione flusso speciale`);
        
        // Per operazioni standard, il cycleId deve essere fornito
        if (!operationData.cycleId) {
          // Tenta di recuperare il ciclo attivo del cestello
          if (basket[0].currentCycleId) {
            operationData.cycleId = basket[0].currentCycleId;
            console.log(`Recuperato automaticamente cycleId ${operationData.cycleId} dal cestello`);
          } else {
            throw new Error("cycleId è obbligatorio per operazioni che non sono di prima attivazione");
          }
        }
        
        // Verifica che il ciclo sia attivo
        const cycle = await db.select().from(cycles).where(eq(cycles.id, operationData.cycleId)).limit(1);
        if (!cycle || cycle.length === 0) {
          throw new Error(`Ciclo con ID ${operationData.cycleId} non trovato`);
        }
        
        if (cycle[0].state === 'closed') {
          throw new Error("Non è possibile aggiungere un'operazione di chiusura a un ciclo già chiuso");
        }
        
        // TRANSAZIONE: Crea l'operazione, chiudi il ciclo e aggiorna lo stato del cestello
        return await db.transaction(async (tx) => {
          // 1. Inserisci l'operazione
          console.log("Inserimento operazione di chiusura ciclo...");
          const newOperation = await tx.insert(operations).values(operationData).returning();
          if (!newOperation || newOperation.length === 0) {
            throw new Error("Impossibile creare l'operazione");
          }
          
          console.log("Operazione creata con successo:", newOperation[0]);
          
          // 1.1 Crea notifica per operazione di vendita se è di tipo vendita
          if (operationData.type === 'vendita' && app.locals.createSaleNotification) {
            try {
              console.log("Creazione notifica per operazione di vendita...");
              app.locals.createSaleNotification(newOperation[0].id)
                .then((notification) => {
                  if (notification) {
                    console.log("Notifica di vendita creata con successo:", notification.id);
                  } else {
                    console.log("Nessuna notifica creata");
                  }
                })
                .catch((notificationError) => {
                  console.error("Errore nella creazione della notifica di vendita:", notificationError);
                });
            } catch (notificationError) {
              console.error("Errore durante la creazione della notifica di vendita:", notificationError);
              // Continuiamo con l'operazione anche se la creazione della notifica fallisce
            }
          }
          
          // 2. Chiudi il ciclo
          console.log("Chiusura ciclo...");
          const updatedCycle = await tx.update(cycles)
            .set({ 
              state: 'closed',
              endDate: operationData.date
            })
            .where(eq(cycles.id, operationData.cycleId))
            .returning();
          
          console.log("Ciclo chiuso:", updatedCycle[0]);
          
          // 3. Aggiorna lo stato del cestello
          console.log("Aggiornamento stato cestello...");
          const updatedBasket = await tx.update(baskets)
            .set({ 
              state: 'disponibile',
              currentCycleId: null,
              cycleCode: null
            })
            .where(eq(baskets.id, operationData.basketId))
            .returning();
          
          console.log("Cestello aggiornato:", updatedBasket[0]);
          
          // 4. Invalidazione cache del server e notifica WebSocket
          try {
            console.log("🗑️ DIRECT-OPERATIONS: Invalidando cache del server...");
            BasketsCache.clear();
            OperationsCache.clear();
            invalidateUnifiedCache(); // Invalida anche la cache unificata operations
            console.log("✅ DIRECT-OPERATIONS: Cache cestelli, operazioni e cache unificata invalidate");
          } catch (cacheError) {
            console.error("❌ DIRECT-OPERATIONS: Errore nell'invalidazione cache:", cacheError);
          }
          
          if (typeof (global as any).broadcastUpdate === 'function') {
            try {
              console.log("Invio notifica WebSocket per operazione di chiusura");
              (global as any).broadcastUpdate('operation_created', {
                operation: newOperation[0],
                message: `Nuova operazione di tipo ${newOperation[0].type} registrata`
              });
              
              (global as any).broadcastUpdate('cycle_closed', {
                cycleId: operationData.cycleId,
                basketId: operationData.basketId,
                message: `Ciclo ${operationData.cycleId} chiuso per il cestello ${operationData.basketId}`
              });
            } catch (wsError) {
              console.error("Errore nell'invio della notifica WebSocket:", wsError);
            }
          }
          
          console.log("============= DIRECT OPERATION ROUTE END =============");
          return res.status(201).json(newOperation[0]);
        });
      } else {
        console.log("Operazione standard - Verifica il cycleId...");
        
        // Per operazioni standard, il cycleId deve essere fornito
        if (!operationData.cycleId) {
          // Tenta di recuperare il ciclo attivo del cestello
          if (basket.currentCycleId) {
            operationData.cycleId = basket.currentCycleId;
            console.log(`Recuperato automaticamente cycleId ${operationData.cycleId} dal cestello`);
          } else {
            throw new Error("cycleId è obbligatorio per operazioni che non sono di prima attivazione");
          }
        }
        
        // 5. CALCOLO AUTOMATICO TAGLIA PER OPERAZIONI PESO (prima dell'inserimento)
        if (operationData.type === 'peso' && operationData.totalWeight && operationData.animalCount && operationData.animalCount > 0) {
          // Calcola il peso medio per animale in grammi
          const averageWeightGrams = operationData.totalWeight / operationData.animalCount;
          // Converte in animali per kg (1000g = 1kg)
          const calculatedAnimalsPerKg = Math.round(1000 / averageWeightGrams);
          
          console.log(`PESO: Calcolo taglia automatica - ${operationData.totalWeight}g / ${operationData.animalCount} animali = ${averageWeightGrams}g/animale = ${calculatedAnimalsPerKg} animali/kg`);
          
          // Trova la taglia appropriata
          const appropriateSizeId = await findSizeIdByAnimalsPerKg(calculatedAnimalsPerKg);
          
          if (appropriateSizeId) {
            operationData.sizeId = appropriateSizeId;
            operationData.animalsPerKg = calculatedAnimalsPerKg;
            console.log(`PESO: Taglia automatica assegnata: ID ${appropriateSizeId} (${calculatedAnimalsPerKg} animali/kg)`);
          } else {
            console.warn(`PESO: Impossibile trovare taglia appropriata per ${calculatedAnimalsPerKg} animali/kg`);
          }
        }
        
        // 6. Inserisci direttamente nel database
        console.log("Tentativo inserimento standard nel database...");
        
        // Esecuzione dell'inserimento
        const insertResult = await db.insert(operations).values(operationData).returning();
        
        if (!insertResult || insertResult.length === 0) {
          throw new Error("Nessun risultato restituito dall'inserimento dell'operazione");
        }
        
        const createdOperation = insertResult[0];
        console.log("Operazione creata con successo:", createdOperation);
        
        // Invalidazione cache del server
        try {
          console.log("🗑️ DIRECT-OPERATIONS: Invalidando cache del server...");
          BasketsCache.clear();
          OperationsCache.clear();
          invalidateUnifiedCache(); // Invalida anche la cache unificata operations
          console.log("✅ DIRECT-OPERATIONS: Cache cestelli, operazioni e cache unificata invalidate");
        } catch (cacheError) {
          console.error("❌ DIRECT-OPERATIONS: Errore nell'invalidazione cache:", cacheError);
        }
        
        // Notifica via WebSocket se disponibile
        if (typeof (global as any).broadcastUpdate === 'function') {
          try {
            (global as any).broadcastUpdate('operation_created', {
              operation: createdOperation,
              message: `Nuova operazione di tipo ${createdOperation.type} registrata`
            });
          } catch (wsError) {
            console.error("Errore nell'invio della notifica WebSocket:", wsError);
          }
        }
        
        // 6. Restituisci la risposta
        console.log("============= DIRECT OPERATION ROUTE END =============");
        return res.status(201).json(createdOperation);
      }
      
    } catch (error) {
      console.error("ERRORE CATTURATO NELLA ROUTE DIRETTA:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : "Nessuno stack trace disponibile");
      
      // Analisi dettagliata dell'errore
      let errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      let statusCode = 500;
      
      // Errori di constraint o validazione
      if (errorMessage.includes('duplicate key')) {
        errorMessage = "Esiste già un'operazione con questi dati";
        statusCode = 409; // Conflict
      } else if (errorMessage.includes('foreign key constraint')) {
        errorMessage = "Riferimento a un record che non esiste. Verifica che cestello e altri dati esistano.";
        statusCode = 400; // Bad Request
      } else if (errorMessage.includes('violates not-null constraint')) {
        errorMessage = "Mancano dati obbligatori per l'operazione";
        statusCode = 400; // Bad Request
      }
      
      console.log("============= DIRECT OPERATION ROUTE END (ERROR) =============");
      return res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        detailedError: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
      });
    }
  });
  
  console.log("Route diretta per le operazioni registrata con successo");
}