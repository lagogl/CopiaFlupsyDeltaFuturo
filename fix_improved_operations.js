// File: fix_improved_operations.js
// This script contains a complete solution to fix the operations
// storage issue in the FLUPSY management system

/**
 * Funzione per creare un'operazione con validazione e gestione degli errori migliorata
 * @param {Object} operationData - I dati dell'operazione da creare
 * @param {Object} storage - L'oggetto storage per interagire con il database
 * @returns {Promise<Object>} - Un oggetto con flag di successo e i dati dell'operazione o un errore
 */
const createOperationSafely = async (operationData, storage) => {
  console.log("AVVIO CREAZIONE OPERAZIONE - Dati ricevuti:", JSON.stringify(operationData, null, 2));
  
  try {
    // 1. Valida i campi obbligatori
    if (!operationData.basketId) {
      throw new Error("basketId è richiesto per creare un'operazione");
    }
    if (!operationData.date) {
      throw new Error("date è richiesto per creare un'operazione");
    }
    if (!operationData.type) {
      throw new Error("type è richiesto per creare un'operazione");
    }
    
    // Operazioni non prima-attivazione devono avere un cycleId
    if (operationData.type !== 'prima-attivazione' && !operationData.cycleId) {
      throw new Error("cycleId è richiesto per operazioni diverse da prima-attivazione");
    }

    // 2. Crea una copia per la manipolazione
    const processedData = { ...operationData };
    
    // 3. Converti date in formato stringa
    if (typeof processedData.date === 'object' && processedData.date && 'toISOString' in processedData.date) {
      processedData.date = processedData.date.toISOString().split('T')[0];
    }
    
    // 4. Converti ID a numeri
    if (processedData.basketId && typeof processedData.basketId !== 'number') {
      console.log(`Conversione basketId da ${typeof processedData.basketId} a number`);
      processedData.basketId = Number(processedData.basketId);
    }
    if (processedData.cycleId && typeof processedData.cycleId !== 'number') {
      console.log(`Conversione cycleId da ${typeof processedData.cycleId} a number`);
      processedData.cycleId = Number(processedData.cycleId);
    }
    
    // 5. Calcola averageWeight se animalsPerKg è fornito
    if (processedData.animalsPerKg && processedData.animalsPerKg > 0) {
      const averageWeight = 1000000 / processedData.animalsPerKg;
      processedData.averageWeight = averageWeight;
      console.log(`Calcolato averageWeight: ${averageWeight} da animalsPerKg: ${processedData.animalsPerKg}`);
    }
    
    // 6. Crea l'operazione con gestione esplicita degli errori
    console.log("ESECUZIONE INSERIMENTO DB - Dati:", JSON.stringify(processedData, null, 2));
    
    try {
      const createdOperation = await storage.createOperation(processedData);
      
      if (!createdOperation) {
        throw new Error("Operazione non creata - nessun risultato restituito dal database");
      }
      
      console.log("OPERAZIONE CREATA CON SUCCESSO:", JSON.stringify(createdOperation, null, 2));
      
      // 7. Broadcast dell'evento tramite WebSocket se disponibile
      if (typeof global.broadcastUpdate === 'function') {
        console.log("Invio notifica WebSocket per nuova operazione");
        global.broadcastUpdate('operation_created', {
          operation: createdOperation,
          message: `Nuova operazione di tipo ${createdOperation.type} registrata`
        });
      }
      
      return { success: true, operation: createdOperation };
    } catch (dbError) {
      console.error("ERRORE DATABASE DURANTE INSERIMENTO:", dbError);
      console.error("Stack trace:", dbError.stack || "No stack trace available");
      
      // Analisi dei possibili errori specifici del database
      let errorMessage = dbError.message || 'Errore sconosciuto del database';
      
      // Verifica per problemi comuni
      if (errorMessage.includes('duplicate key')) {
        errorMessage = "Esiste già un record con questi dati. Potrebbe esserci un'operazione duplicata.";
      } else if (errorMessage.includes('foreign key constraint')) {
        errorMessage = "Riferimento a un record che non esiste. Verifica che cestello e ciclo esistano.";
      } else if (errorMessage.includes('null value')) {
        errorMessage = "Valore obbligatorio mancante. Verifica tutti i campi richiesti.";
      }
      
      throw new Error(`Errore database: ${errorMessage}`);
    }
  } catch (error) {
    console.error("ERRORE GESTITO DURANTE CREAZIONE OPERAZIONE:", error);
    console.error("Stack trace:", error.stack || "No stack trace available");
    return { 
      success: false, 
      error: `Errore durante la creazione dell'operazione: ${error.message || String(error)}`
    };
  }
};

/**
 * Funzione da integrare in routes.ts per gestire la creazione di operazioni
 * @param {Object} req - L'oggetto request di Express
 * @param {Object} res - L'oggetto response di Express
 * @param {Object} storage - L'oggetto storage per interagire con il database
 * @returns {Promise<void>} - Invia la risposta HTTP
 */
const handleCreateOperation = async (req, res, storage) => {
  console.log("HANDLE CREATE OPERATION - Body ricevuto:", JSON.stringify(req.body, null, 2));
  
  try {
    const result = await createOperationSafely(req.body, storage);
    
    if (result.success) {
      return res.status(201).json(result.operation);
    } else {
      console.error("Errore nella creazione dell'operazione:", result.error);
      return res.status(500).json({ message: result.error });
    }
  } catch (error) {
    console.error("Errore non gestito:", error);
    return res.status(500).json({ 
      message: `Errore interno del server: ${error.message || String(error)}` 
    });
  }
};

// Esporta le funzioni per l'integrazione
module.exports = {
  createOperationSafely,
  handleCreateOperation
};