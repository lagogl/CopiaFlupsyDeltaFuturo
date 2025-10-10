import type { Request, Response } from "express";
import { selectionsService } from "./selections.service";
import { insertSelectionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

// Import legacy controller functions for complex operations
import {
  getSelections,
  getSelectionById,
  getSelectionStats,
  getAvailablePositions,
  getAllAvailablePositions,
  createSelection,
  addSourceBaskets,
  addDestinationBaskets,
  removeSourceBasket,
  removeDestinationBasket,
  completeSelectionFixed,
  migrateBasketLotData,
  generatePDFReport
} from "../../../controllers/selection-controller";

export class SelectionsController {
  /**
   * GET /api/selections
   * Get all selections
   */
  async getAll(req: Request, res: Response) {
    return await getSelections(req, res);
  }

  /**
   * GET /api/selections/:id
   * Get selection by ID
   */
  async getById(req: Request, res: Response) {
    return await getSelectionById(req, res);
  }

  /**
   * GET /api/selections/statistics
   * Get selection statistics
   */
  async getStats(req: Request, res: Response) {
    return await getSelectionStats(req, res);
  }

  /**
   * GET /api/selections/available-positions/:flupsyId
   * Get available positions
   */
  async getAvailablePositions(req: Request, res: Response) {
    return await getAvailablePositions(req, res);
  }

  /**
   * GET /api/flupsy/available-positions
   * Get all available positions
   */
  async getAllAvailablePositions(req: Request, res: Response) {
    return await getAllAvailablePositions(req, res);
  }

  /**
   * GET /api/selections/:id/source-baskets
   * Get source baskets for a selection
   */
  async getSourceBaskets(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID selezione non valido" });
      }

      const selection = await selectionsService.getSelectionById(id);
      if (!selection) {
        return res.status(404).json({ error: `Selezione con ID ${id} non trovata` });
      }

      const sourceBaskets = await selectionsService.getSourceBaskets(id);
      res.json(sourceBaskets);
    } catch (error) {
      console.error("Errore nel recupero dei source baskets:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  }

  /**
   * GET /api/selections/:id/destination-baskets
   * Get destination baskets for a selection
   */
  async getDestinationBaskets(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID selezione non valido" });
      }

      const selection = await selectionsService.getSelectionById(id);
      if (!selection) {
        return res.status(404).json({ error: `Selezione con ID ${id} non trovata` });
      }

      const destinationBaskets = await selectionsService.getDestinationBaskets(id);
      res.json(destinationBaskets);
    } catch (error) {
      console.error("Errore nel recupero dei destination baskets:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  }

  /**
   * POST /api/selections
   * Create new selection
   */
  async create(req: Request, res: Response) {
    try {
      const validatedData = insertSelectionSchema.parse(req.body);
      return await createSelection(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: "Errore di validazione",
          errors: validationError.details
        });
      }
      
      console.error("Errore durante la creazione della selezione:", error);
      return res.status(500).json({
        success: false,
        message: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      });
    }
  }

  /**
   * POST /api/selections/:id/source-baskets
   * Add source baskets
   */
  async addSourceBaskets(req: Request, res: Response) {
    return await addSourceBaskets(req, res);
  }

  /**
   * POST /api/selections/:id/destination-baskets
   * Add destination baskets
   */
  async addDestinationBaskets(req: Request, res: Response) {
    return await addDestinationBaskets(req, res);
  }

  /**
   * POST /api/selections/:id/complete
   * Complete selection
   */
  async complete(req: Request, res: Response) {
    return await completeSelectionFixed(req, res);
  }

  /**
   * POST /api/selections/migrate-basket-lot-data
   * Migrate basket lot data
   */
  async migrateData(req: Request, res: Response) {
    return await migrateBasketLotData(req, res);
  }

  /**
   * DELETE /api/selections/:id/source-baskets/:sourceBasketId
   * Remove source basket
   */
  async removeSourceBasket(req: Request, res: Response) {
    return await removeSourceBasket(req, res);
  }

  /**
   * DELETE /api/selections/:id/destination-baskets/:destinationBasketId
   * Remove destination basket
   */
  async removeDestinationBasket(req: Request, res: Response) {
    return await removeDestinationBasket(req, res);
  }

  /**
   * GET /api/selections/:id/report.pdf
   * Generate PDF report for a selection
   */
  async generatePDFReport(req: Request, res: Response) {
    return await generatePDFReport(req, res);
  }
}

export const selectionsController = new SelectionsController();
