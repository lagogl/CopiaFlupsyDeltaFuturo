import { Request, Response } from "express";
import { lotInventoryService } from "../services/lot-inventory-service";
import { z } from "zod";
import { insertLotInventoryTransactionSchema } from "@shared/schema";

/**
 * Controller per la gestione dell'inventario dei lotti
 * Fornisce API per registrare transazioni, calcolare mortalità e ottenere report
 */
export const lotInventoryController = {
  /**
   * Registra una nuova transazione di inventario
   */
  async recordTransaction(req: Request, res: Response) {
    try {
      const schema = insertLotInventoryTransactionSchema;
      const transactionData = schema.parse(req.body);
      
      const transaction = await lotInventoryService.recordTransaction(transactionData);
      
      return res.status(201).json({
        success: true,
        transaction
      });
    } catch (error) {
      console.error("Errore durante la registrazione della transazione:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dati della transazione non validi",
          errors: error.errors
        });
      }
      return res.status(500).json({
        success: false,
        message: "Errore durante la registrazione della transazione"
      });
    }
  },

  /**
   * Calcola la giacenza attuale di un lotto
   */
  async getCurrentInventory(req: Request, res: Response) {
    try {
      const lotId = parseInt(req.params.lotId);
      if (isNaN(lotId)) {
        return res.status(400).json({
          success: false,
          message: "ID lotto non valido"
        });
      }
      
      const inventory = await lotInventoryService.calculateCurrentInventory(lotId);
      
      return res.json({
        success: true,
        inventory
      });
    } catch (error) {
      console.error("Errore durante il recupero dell'inventario:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante il recupero dell'inventario"
      });
    }
  },

  /**
   * Registra un calcolo di mortalità per un lotto
   */
  async recordMortalityCalculation(req: Request, res: Response) {
    try {
      const lotId = parseInt(req.params.lotId);
      if (isNaN(lotId)) {
        return res.status(400).json({
          success: false,
          message: "ID lotto non valido"
        });
      }
      
      const { notes } = req.body;
      
      const mortalityRecord = await lotInventoryService.recordMortalityCalculation(lotId, notes);
      
      return res.status(201).json({
        success: true,
        mortalityRecord
      });
    } catch (error) {
      console.error("Errore durante la registrazione del calcolo di mortalità:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante la registrazione del calcolo di mortalità"
      });
    }
  },

  /**
   * Ottiene l'ultimo calcolo di mortalità per un lotto
   */
  async getLatestMortalityRecord(req: Request, res: Response) {
    try {
      const lotId = parseInt(req.params.lotId);
      if (isNaN(lotId)) {
        return res.status(400).json({
          success: false,
          message: "ID lotto non valido"
        });
      }
      
      const record = await lotInventoryService.getLatestMortalityRecord(lotId);
      
      return res.json({
        success: true,
        record
      });
    } catch (error) {
      console.error("Errore durante il recupero del calcolo di mortalità:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante il recupero del calcolo di mortalità"
      });
    }
  },

  /**
   * Ottiene la cronologia dei calcoli di mortalità per un lotto
   */
  async getMortalityHistory(req: Request, res: Response) {
    try {
      const lotId = parseInt(req.params.lotId);
      if (isNaN(lotId)) {
        return res.status(400).json({
          success: false,
          message: "ID lotto non valido"
        });
      }
      
      const records = await lotInventoryService.getMortalityHistory(lotId);
      
      return res.json({
        success: true,
        records
      });
    } catch (error) {
      console.error("Errore durante il recupero della cronologia di mortalità:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante il recupero della cronologia di mortalità"
      });
    }
  },

  /**
   * Ottiene tutte le transazioni di inventario per un lotto
   */
  async getLotTransactions(req: Request, res: Response) {
    try {
      const lotId = parseInt(req.params.lotId);
      if (isNaN(lotId)) {
        return res.status(400).json({
          success: false,
          message: "ID lotto non valido"
        });
      }
      
      const transactions = await lotInventoryService.getLotTransactions(lotId);
      
      return res.json({
        success: true,
        transactions
      });
    } catch (error) {
      console.error("Errore durante il recupero delle transazioni:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante il recupero delle transazioni"
      });
    }
  }
};