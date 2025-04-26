import { Request, Response } from "express";
import { lotInventoryService } from "../services/lot-inventory-service";

/**
 * Ottiene lo stato attuale dell'inventario di un lotto
 */
export async function getCurrentInventory(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.lotId);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido"
      });
    }
    
    const inventory = await lotInventoryService.calculateCurrentInventory(lotId);
    
    return res.status(200).json({
      success: true,
      inventory
    });
  } catch (error) {
    console.error("Errore durante il recupero dell'inventario:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
}

/**
 * Registra una nuova transazione di inventario
 */
export async function createTransaction(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.lotId);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido"
      });
    }
    
    // Controlla i dati minimi
    const { transactionType, animalCount } = req.body;
    
    if (!transactionType || animalCount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Dati transazione incompleti"
      });
    }
    
    // Crea transazione
    const transaction = await lotInventoryService.createTransaction({
      lotId,
      transactionType,
      animalCount,
      notes: req.body.notes
    });
    
    return res.status(201).json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error("Errore durante la creazione della transazione:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
}

/**
 * Registra un nuovo calcolo di mortalità
 */
export async function recordMortalityCalculation(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.lotId);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido"
      });
    }
    
    const mortalityRecord = await lotInventoryService.recordMortalityCalculation(
      lotId,
      req.body.notes
    );
    
    // Assicuriamoci che il valore sia un numero prima di chiamare toFixed
    const mortalityPercentage = parseFloat(String(mortalityRecord.mortality_percentage || 0));
    console.log(`Registrato calcolo mortalità per lotto ${lotId}: ${mortalityPercentage.toFixed(2)}%`);
    
    return res.status(201).json({
      success: true,
      mortalityRecord
    });
  } catch (error) {
    console.error("Errore durante la registrazione del calcolo di mortalità:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
}

/**
 * Ottiene tutte le transazioni di un lotto
 */
export async function getLotTransactions(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.lotId);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido"
      });
    }
    
    try {
      const transactions = await lotInventoryService.getLotTransactions(lotId);
      
      return res.status(200).json({
        success: true,
        transactions
      });
    } catch (error) {
      console.error("Errore durante il recupero delle transazioni:", error);
      // In caso di errore specifico con le transazioni, restituisci un array vuoto
      return res.status(200).json({
        success: true,
        transactions: []
      });
    }
  } catch (error) {
    console.error("Errore durante il recupero delle transazioni:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
}

/**
 * Ottiene la cronologia dei calcoli di mortalità
 */
export async function getMortalityHistory(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.lotId);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido"
      });
    }
    
    const records = await lotInventoryService.getMortalityHistory(lotId);
    
    return res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    console.error("Errore durante il recupero della cronologia di mortalità:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
}