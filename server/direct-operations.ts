// File: server/direct-operations.ts
// Implementazione diretta delle route per le operazioni che bypassano i problemi nel sistema esistente

import type { Express } from "express";
import { db } from './db';
import { operations, cycles, baskets, sizes } from '../shared/schema';
import { sql, eq, and, between } from 'drizzle-orm';

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
      
      // Preserviamo esplicitamente animalCount quando viene fornito
      // Questo è particolarmente importante per le operazioni di tipo 'misura' o 'peso'
      const hasAnimalCount = operationData.animalCount !== undefined;
      
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
      
      // Ricorda il valore originale di animalCount
      const originalAnimalCount = operationData.animalCount;
      
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
      
      // Gestisci la logica di animalCount per operazioni "misura" e "peso"
      if (hasAnimalCount) {
        // Per operazioni di tipo 'peso', mantieni SEMPRE il conteggio animali originale
        if (operationData.type === 'peso') {
          // L'operazione 'peso' non deve MAI modificare il numero di animali
          console.log(`IMPORTANTE: Per operazione 'peso', preservato SEMPRE il conteggio animali originale:`, originalAnimalCount);
          operationData.animalCount = originalAnimalCount;
        } 
        // Per operazioni di tipo 'misura', considera la mortalità
        else if (operationData.type === 'misura') {
          // Controlla se c'è stata una mortalità registrata
          const hasMortality = operationData.deadCount && operationData.deadCount > 0;
          
          if (hasMortality) {
            // Se c'è mortalità, utilizziamo il nuovo valore calcolato di animalCount (già presente in operationData)
            console.log(`IMPORTANTE: Per operazione 'misura' CON MORTALITÀ (${operationData.deadCount} animali), utilizziamo il conteggio animali aggiornato:`, operationData.animalCount);
          } else {
            // Se non c'è mortalità, preserviamo il conteggio animali originale
            console.log(`IMPORTANTE: Per operazione 'misura' SENZA MORTALITÀ, preservato conteggio animali originale:`, originalAnimalCount);
            operationData.animalCount = originalAnimalCount;
          }
        }
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
        
        // Verifica che il cestello sia disponibile o attivo senza ciclo
        const isAvailable = basket[0].state === 'available';
        const isActiveWithoutCycle = basket[0].state === 'active' && !basket[0].currentCycleId;
        
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