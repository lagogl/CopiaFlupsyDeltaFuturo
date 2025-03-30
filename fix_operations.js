// This script contains improved error handling and validation
// for operations in the FLUPSY management system

// Function to safely create an operation with proper validation
const createOperationWithValidation = async (operationData, storage) => {
  console.log("Creating operation with data:", JSON.stringify(operationData, null, 2));
  
  try {
    // 1. Validate required fields
    if (!operationData.basketId) {
      throw new Error("basketId è richiesto per creare un'operazione");
    }
    if (!operationData.date) {
      throw new Error("date è richiesto per creare un'operazione");
    }
    if (!operationData.type) {
      throw new Error("type è richiesto per creare un'operazione");
    }

    // 2. Convert any dates to string format
    const processedOperation = { ...operationData };
    if (typeof processedOperation.date === 'object' && processedOperation.date && 'toISOString' in processedOperation.date) {
      processedOperation.date = processedOperation.date.toISOString().split('T')[0];
    }
    
    // 3. Convert ID fields to numbers
    if (processedOperation.basketId && typeof processedOperation.basketId !== 'number') {
      console.log(`Converting basketId from ${typeof processedOperation.basketId} to number`);
      processedOperation.basketId = Number(processedOperation.basketId);
    }
    if (processedOperation.cycleId && typeof processedOperation.cycleId !== 'number') {
      console.log(`Converting cycleId from ${typeof processedOperation.cycleId} to number`);
      processedOperation.cycleId = Number(processedOperation.cycleId);
    }
    
    // 4. Calculate averageWeight if animalsPerKg is provided
    if (processedOperation.animalsPerKg && processedOperation.animalsPerKg > 0) {
      // Formula: 1,000,000 mg diviso per animalsPerKg = peso medio in milligrammi
      const averageWeight = 1000000 / processedOperation.animalsPerKg;
      processedOperation.averageWeight = averageWeight;
      console.log(`Calculated averageWeight: ${averageWeight} from animalsPerKg: ${processedOperation.animalsPerKg}`);
    }
    
    // 5. Create the operation
    console.log("Attempting to create operation:", JSON.stringify(processedOperation, null, 2));
    const createdOperation = await storage.createOperation(processedOperation);
    
    if (!createdOperation) {
      throw new Error("Operazione non creata - nessun risultato restituito dal database");
    }
    
    console.log("Operation created successfully:", JSON.stringify(createdOperation, null, 2));
    return { success: true, operation: createdOperation };
  } catch (error) {
    console.error("ERROR CREATING OPERATION:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
    return { 
      success: false, 
      error: `Errore durante la creazione dell'operazione: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Function to safely update an operation with proper validation
const updateOperationWithValidation = async (id, operationData, storage) => {
  console.log(`Updating operation ${id} with data:`, JSON.stringify(operationData, null, 2));
  
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error("ID operazione non valido");
    }
    
    // Convert ID to number
    const operationId = Number(id);
    
    // Convert any dates to string format
    const processedOperation = { ...operationData };
    if (processedOperation.date && typeof processedOperation.date === 'object' && 'toISOString' in processedOperation.date) {
      processedOperation.date = processedOperation.date.toISOString().split('T')[0];
    }
    
    // Calculate averageWeight if animalsPerKg is provided
    if (processedOperation.animalsPerKg && processedOperation.animalsPerKg > 0) {
      const averageWeight = 1000000 / processedOperation.animalsPerKg;
      processedOperation.averageWeight = averageWeight;
    }
    
    // Update the operation
    console.log(`Attempting to update operation ${operationId}:`, JSON.stringify(processedOperation, null, 2));
    const updatedOperation = await storage.updateOperation(operationId, processedOperation);
    
    if (!updatedOperation) {
      throw new Error(`Operazione con ID ${operationId} non trovata o non aggiornata`);
    }
    
    console.log("Operation updated successfully:", JSON.stringify(updatedOperation, null, 2));
    return { success: true, operation: updatedOperation };
  } catch (error) {
    console.error(`ERROR UPDATING OPERATION ${id}:`, error);
    return { 
      success: false, 
      error: `Errore durante l'aggiornamento dell'operazione: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Export functions for use in routes.ts
module.exports = {
  createOperationWithValidation,
  updateOperationWithValidation
};