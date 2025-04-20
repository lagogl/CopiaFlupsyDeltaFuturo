// File: server/direct-operations.ts
// Implementazione diretta delle route per le operazioni che bypassano i problemi nel sistema esistente

import type { Express } from "express";
import { db } from './db';
import { operations, cycles, baskets } from '../shared/schema';
import { sql, eq, and } from 'drizzle-orm';

/**
 * Implementa la route diretta per le operazioni che risolve i problemi di inserimento
 * nel database, in particolare per le operazioni di prima attivazione.
 */
export function implementDirectOperationRoute(app: Express) {
  console.log("Registrazione della route diretta per le operazioni (/api/direct-operations)");
  
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
      
      // 2. Assicurati che i tipi di dati siano corretti
      console.log("Conversione e validazione dei dati...");
      
      // Converti la data in formato stringa se necessario
      if (operationData.date && typeof operationData.date === 'object' && operationData.date.toISOString) {
        operationData.date = operationData.date.toISOString().split('T')[0];
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
      
      // 3. Calcola averageWeight se viene fornito animalsPerKg
      if (operationData.animalsPerKg && operationData.animalsPerKg > 0) {
        const averageWeight = 1000000 / operationData.animalsPerKg;
        operationData.averageWeight = averageWeight;
        console.log(`Calcolato averageWeight: ${averageWeight} da animalsPerKg: ${operationData.animalsPerKg}`);
      }
      
      console.log("Dati operazione dopo la normalizzazione:");
      console.log(JSON.stringify(operationData, null, 2));
      
      // Verifica la presenza del cestello
      const basket = await db.select().from(baskets).where(eq(baskets.id, operationData.basketId)).limit(1);
      if (!basket || basket.length === 0) {
        throw new Error(`Cestello con ID ${operationData.basketId} non trovato`);
      }
      
      // 4. LOGICA SPECIALIZZATA PER PRIMA ATTIVAZIONE
      if (operationData.type === 'prima-attivazione') {
        console.log("Rilevata operazione di PRIMA ATTIVAZIONE - Esecuzione flusso speciale");
        
        // Verifica che il cestello sia disponibile oppure sia attivo ma senza ciclo
        const hasActiveCycle = await db.select().from(cycles)
          .where(and(
            eq(cycles.basketId, operationData.basketId),
            eq(cycles.state, 'active')
          ));
          
        // Verifica extra sulla presenza di current_cycle_id
        const currentCycleId = basket[0].currentCycleId;
        
        console.log(`Verifica dei cicli attivi per il cestello: trovati ${hasActiveCycle.length} cicli. Current cycle ID: ${currentCycleId || 'nessuno'}`);
        
        if (hasActiveCycle.length > 0) {
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
          
          // 4. Aggiorna lo stato del cestello
          console.log("Aggiornamento stato cestello...");
          const updatedBasket = await tx.update(baskets)
            .set({ 
              state: 'active',
              currentCycleId: cycleId,
              cycleCode: `C-${cycleId}`
            })
            .where(eq(baskets.id, operationData.basketId))
            .returning();
          
          console.log("Cestello aggiornato:", updatedBasket[0]);
          
          // 5. Notifica via WebSocket se disponibile
          if (typeof (global as any).broadcastUpdate === 'function') {
            try {
              console.log("Invio notifica WebSocket per nuova operazione");
              (global as any).broadcastUpdate('operation_created', {
                operation: newOperation[0],
                message: `Nuova operazione di tipo ${newOperation[0].type} registrata`
              });
              
              (global as any).broadcastUpdate('cycle_created', {
                cycle: newCycle[0],
                basketId: operationData.basketId,
                message: `Nuovo ciclo ${cycleId} creato per il cestello ${operationData.basketId}`
              });
            } catch (wsError) {
              console.error("Errore nell'invio della notifica WebSocket:", wsError);
            }
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
              state: 'available',
              currentCycleId: null,
              cycleCode: null
            })
            .where(eq(baskets.id, operationData.basketId))
            .returning();
          
          console.log("Cestello aggiornato:", updatedBasket[0]);
          
          // 4. Notifica via WebSocket
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
          if (basket[0].currentCycleId) {
            operationData.cycleId = basket[0].currentCycleId;
            console.log(`Recuperato automaticamente cycleId ${operationData.cycleId} dal cestello`);
          } else {
            throw new Error("cycleId è obbligatorio per operazioni che non sono di prima attivazione");
          }
        }
        
        // 5. Inserisci direttamente nel database
        console.log("Tentativo inserimento standard nel database...");
        
        // Esecuzione dell'inserimento
        const insertResult = await db.insert(operations).values(operationData).returning();
        
        if (!insertResult || insertResult.length === 0) {
          throw new Error("Nessun risultato restituito dall'inserimento dell'operazione");
        }
        
        const createdOperation = insertResult[0];
        console.log("Operazione creata con successo:", createdOperation);
        
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