// File: fix_direct_operation_route.js
// Questo file implementa una route Express specializzata per la creazione di operazioni
// con gestione completa degli errori e log dettagliati per il debugging

/**
 * Implementazione diretta della route per le operazioni che bypassa tutte le potenziali
 * cause di errore nel sistema esistente.
 * 
 * @param {Object} app - L'applicazione Express
 * @param {Object} db - Connessione al database Drizzle
 * @param {Array} operations - Lo schema della tabella operations
 * @returns {void}
 */
function implementDirectOperationRoute(app, db, operations) {
  console.log("Registrazione della route diretta per le operazioni");
  
  // Bypass completo della route esistente con una versione specializzata
  app.post('/api/direct-operations', async (req, res) => {
    console.log("============= DIRECT OPERATION ROUTE START =============");
    console.log("Ricevuta richiesta per creazione diretta operazione:");
    console.log(JSON.stringify(req.body, null, 2));
    
    try {
      // 1. Valida manualmente i dati di input
      const operationData = { ...req.body };
      
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
      
      // 4. Inserisci direttamente nel database con minimal SQL
      console.log("Tentativo inserimento diretto nel database...");
      
      // Usa PG diretta per ottenere un errore più leggibile in caso di problemi
      const { PgDatabase } = require('drizzle-orm/pg-core');
      
      // Crea una query di inserimento direttamente usando drizzle-orm
      const insertResult = await db.insert(operations).values(operationData).returning();
      
      console.log("Risultato dell'inserimento:", insertResult);
      
      if (!insertResult || insertResult.length === 0) {
        throw new Error("Nessun risultato restituito dall'inserimento dell'operazione");
      }
      
      const createdOperation = insertResult[0];
      console.log("Operazione creata con successo:", createdOperation);
      
      // Notifica via WebSocket se disponibile
      if (typeof global.broadcastUpdate === 'function') {
        try {
          global.broadcastUpdate('operation_created', {
            operation: createdOperation,
            message: `Nuova operazione di tipo ${createdOperation.type} registrata`
          });
          console.log("Notifica WebSocket inviata con successo");
        } catch (wsError) {
          console.error("Errore nell'invio della notifica WebSocket:", wsError);
        }
      }
      
      // 5. Gestione della logica post-inserimento per la prima attivazione
      if (operationData.type === 'prima-attivazione') {
        try {
          console.log("Operazione di prima attivazione - creazione del ciclo...");
          
          // Creiamo un nuovo ciclo
          const cycleData = {
            basketId: operationData.basketId,
            startDate: operationData.date,
            state: 'active',
            endDate: null,
          };
          
          // Creiamo il ciclo
          const cycleResult = await db.insert(db.cycles).values(cycleData).returning();
          
          if (cycleResult && cycleResult.length > 0) {
            const createdCycle = cycleResult[0];
            console.log("Ciclo creato con successo:", createdCycle);
            
            // Aggiorniamo l'operazione con l'ID del ciclo creato
            const updatedOperationResult = await db.update(operations)
              .set({ cycleId: createdCycle.id })
              .where(operations.id === createdOperation.id)
              .returning();
            
            console.log("Operazione aggiornata con cycleId:", updatedOperationResult[0]);
            
            // Aggiorniamo lo stato del cestello
            const updatedBasketResult = await db.update(db.baskets)
              .set({ 
                state: 'active',
                currentCycleId: createdCycle.id,
                // Aggiorna anche cycleCode se necessario
                cycleCode: \`C-\${createdCycle.id}\`
              })
              .where(db.baskets.id === operationData.basketId)
              .returning();
            
            console.log("Cestello aggiornato:", updatedBasketResult[0]);
            
            // Aggiorniamo l'oggetto operazione da restituire
            createdOperation.cycleId = createdCycle.id;
          } else {
            console.error("Errore nella creazione del ciclo - nessun risultato restituito");
          }
        } catch (postError) {
          console.error("Errore nelle operazioni post-inserimento:", postError);
          console.error("L'operazione è stata creata, ma potrebbero esserci problemi con ciclo o stato cestello");
        }
      }
      
      // 6. Restituisci la risposta
      console.log("============= DIRECT OPERATION ROUTE END =============");
      return res.status(201).json(createdOperation);
      
    } catch (error) {
      console.error("ERRORE CATTURATO NELLA ROUTE DIRETTA:", error);
      console.error("Stack trace:", error.stack || "Nessuno stack trace disponibile");
      
      // Analisi dettagliata dell'errore
      let errorMessage = error.message || 'Errore sconosciuto';
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
        detailedError: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });
  
  console.log("Route diretta per le operazioni registrata con successo");
}

module.exports = {
  implementDirectOperationRoute
};