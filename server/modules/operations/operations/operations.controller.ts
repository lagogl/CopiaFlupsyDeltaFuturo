/**
 * Controller per la gestione delle operazioni
 * Gestisce le richieste HTTP e coordina con il service
 */

import { Request, Response } from 'express';
import { operationsService } from './operations.service';

// Helper function per disabilitare la cache HTTP
function forceNoCacheHeaders(res: Response) {
  const timestamp = Date.now();
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'Last-Modified': new Date(timestamp).toUTCString(),
    'ETag': `"${timestamp}"`
  });
}

export class OperationsController {
  /**
   * GET /api/operations
   * Lista operazioni con filtri e paginazione
   */
  async getOperations(req: Request, res: Response) {
    try {
      const startTime = Date.now();
      
      // Estrai parametri dalla query
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
      const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : undefined;
      const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId as string) : undefined;
      const basketId = req.query.basketId ? parseInt(req.query.basketId as string) : undefined;
      
      // Gestione date
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // Tipo di operazione
      const type = req.query.type as string | undefined;
      
      console.log("Utilizzo implementazione ottimizzata per le operazioni");
      
      // Applica headers anti-cache
      forceNoCacheHeaders(res);
      
      const result = await operationsService.getOperations({
        page,
        pageSize,
        cycleId,
        flupsyId,
        basketId,
        dateFrom,
        dateTo,
        type
      });
      
      const duration = Date.now() - startTime;
      console.log(`Operazioni recuperate in ${duration}ms (ottimizzato)`);
      
      // Restituisci solo le operazioni per compatibilità con frontend esistente
      res.json(result.operations);
    } catch (error) {
      console.error("Error getting operations:", error);
      res.status(500).json({ 
        message: "Failed to get operations",
        error: (error as Error).message 
      });
    }
  }

  /**
   * GET /api/operations-optimized
   * Versione ottimizzata con metadata di paginazione
   */
  async getOperationsOptimized(req: Request, res: Response) {
    try {
      console.log("Richiesta operazioni ottimizzate con query params:", req.query);
      
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
      const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : undefined;
      const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId as string) : undefined;
      const basketId = req.query.basketId ? parseInt(req.query.basketId as string) : undefined;
      
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      const type = req.query.type as string | undefined;
      
      const result = await operationsService.getOperations({
        page,
        pageSize,
        cycleId,
        flupsyId,
        basketId,
        dateFrom,
        dateTo,
        type
      });
      
      // Calcola metadata paginazione
      const totalPages = Math.ceil(result.totalCount / pageSize);
      
      const response = {
        operations: result.operations,
        pagination: {
          page,
          pageSize,
          totalItems: result.totalCount,
          totalPages
        }
      };
      
      console.log(`Risposta API paginata: pagina ${page}/${totalPages}, ${result.operations.length} elementi su ${result.totalCount} totali`);
      
      res.json(response);
    } catch (error) {
      console.error("Error in optimized operations endpoint:", error);
      res.status(500).json({ 
        message: "Errore nell'endpoint ottimizzato delle operazioni",
        error: (error as Error).message 
      });
    }
  }

  /**
   * GET /api/operations/:id
   * Singola operazione per ID
   */
  async getOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      const operation = await operationsService.getOperationById(id);
      if (!operation) {
        return res.status(404).json({ message: "Operation not found" });
      }

      res.json(operation);
    } catch (error) {
      console.error("Error getting operation:", error);
      res.status(500).json({ message: "Failed to get operation" });
    }
  }

  /**
   * GET /api/operations/basket/:basketId
   * Operazioni per cestello
   */
  async getOperationsByBasket(req: Request, res: Response) {
    try {
      const basketId = parseInt(req.params.basketId);
      if (isNaN(basketId)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      const ops = await operationsService.getOperationsByBasket(basketId);
      res.json(ops);
    } catch (error) {
      console.error("Error getting operations by basket:", error);
      res.status(500).json({ message: "Failed to get operations by basket" });
    }
  }

  /**
   * GET /api/operations/cycle/:cycleId
   * Operazioni per ciclo
   */
  async getOperationsByCycle(req: Request, res: Response) {
    try {
      const cycleId = parseInt(req.params.cycleId);
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      const ops = await operationsService.getOperationsByCycle(cycleId);
      res.json(ops);
    } catch (error) {
      console.error("Error getting operations by cycle:", error);
      res.status(500).json({ message: "Failed to get operations by cycle" });
    }
  }

  /**
   * GET /api/operations/date-range
   * Operazioni per intervallo di date
   */
  async getOperationsByDateRange(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: "Both startDate and endDate are required" 
        });
      }

      const ops = await operationsService.getOperationsByDateRange(startDate, endDate);
      res.json(ops);
    } catch (error) {
      console.error("Error getting operations by date range:", error);
      res.status(500).json({ message: "Failed to get operations by date range" });
    }
  }

  /**
   * POST /api/operations
   * Crea nuova operazione
   */
  async createOperation(req: Request, res: Response) {
    try {
      const operation = await operationsService.createOperation(req.body);
      res.status(201).json(operation);
    } catch (error) {
      console.error("Error creating operation:", error);
      res.status(500).json({ 
        message: "Failed to create operation",
        error: (error as Error).message 
      });
    }
  }

  /**
   * PATCH /api/operations/:id
   * Aggiorna operazione
   */
  async updateOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      const updated = await operationsService.updateOperation(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Operation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating operation:", error);
      res.status(500).json({ 
        message: "Failed to update operation",
        error: (error as Error).message 
      });
    }
  }

  /**
   * DELETE /api/operations/:id
   * Elimina operazione
   */
  async deleteOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      const deleted = await operationsService.deleteOperation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Operation not found" });
      }

      res.status(200).json({ 
        message: "Operation deleted successfully",
        operation: deleted 
      });
    } catch (error) {
      console.error("Error deleting operation:", error);
      res.status(500).json({ 
        message: "Failed to delete operation",
        error: (error as Error).message 
      });
    }
  }
}

export const operationsController = new OperationsController();
