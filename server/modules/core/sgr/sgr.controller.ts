import type { Request, Response } from "express";
import { sgrService } from "./sgr.service";
import { insertSgrSchema, insertSgrGiornalieriSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { sgrScheduler } from "./sgr-scheduler";
import { broadcastMessage } from "../../../websocket";

export class SgrController {
  // ========== SGR Mensili (Monthly) ==========

  /**
   * GET /api/sgr
   * Get all SGR
   */
  async getAllSgr(req: Request, res: Response) {
    try {
      const sgrs = await sgrService.getAllSgr();
      res.json(sgrs);
    } catch (error) {
      console.error("Error fetching SGRs:", error);
      res.status(500).json({ message: "Failed to fetch SGRs" });
    }
  }

  /**
   * GET /api/sgr/:id
   * Get SGR by ID
   */
  async getSgrById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR ID" });
      }

      const sgr = await sgrService.getSgrById(id);
      if (!sgr) {
        return res.status(404).json({ message: "SGR not found" });
      }

      res.json(sgr);
    } catch (error) {
      console.error("Error fetching SGR:", error);
      res.status(500).json({ message: "Failed to fetch SGR" });
    }
  }

  /**
   * POST /api/sgr
   * Create new SGR
   */
  async createSgr(req: Request, res: Response) {
    try {
      const parsedData = insertSgrSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if a SGR for the same month already exists
      const existingSgr = await sgrService.getSgrByMonth(parsedData.data.month.toString());
      if (existingSgr) {
        return res.status(400).json({ message: "A SGR entry for this month already exists" });
      }

      const newSgr = await sgrService.createSgr(parsedData.data);
      res.status(201).json(newSgr);
    } catch (error) {
      console.error("Error creating SGR:", error);
      res.status(500).json({ message: "Failed to create SGR" });
    }
  }

  /**
   * PATCH /api/sgr/:id
   * Update SGR
   */
  async updateSgr(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR ID" });
      }

      // Verify the SGR exists
      const sgr = await sgrService.getSgrById(id);
      if (!sgr) {
        return res.status(404).json({ message: "SGR not found" });
      }

      // Parse and validate the update data
      const updateSchema = z.object({
        percentage: z.number().optional(),
        calculatedFromReal: z.boolean().nullable().optional()
      });

      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedSgr = await sgrService.updateSgr(id, parsedData.data);
      res.json(updatedSgr);
    } catch (error) {
      console.error("Error updating SGR:", error);
      res.status(500).json({ message: "Failed to update SGR" });
    }
  }

  // ========== SGR Giornalieri (Daily) ==========

  /**
   * GET /api/sgr-giornalieri
   * Get all SGR Giornalieri
   */
  async getAllSgrGiornalieri(req: Request, res: Response) {
    try {
      const sgrGiornalieri = await sgrService.getAllSgrGiornalieri();
      res.json(sgrGiornalieri);
    } catch (error) {
      console.error("Error fetching SGR giornalieri:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornalieri" });
    }
  }

  /**
   * GET /api/sgr-giornalieri/by-id/:id
   * Get SGR Giornaliero by ID
   */
  async getSgrGiornalieroById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      const sgrGiornaliero = await sgrService.getSgrGiornalieroById(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }

      res.json(sgrGiornaliero);
    } catch (error) {
      console.error("Error fetching SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornaliero" });
    }
  }

  /**
   * GET /api/sgr-giornalieri/date-range
   * Get SGR Giornalieri by date range
   */
  async getSgrGiornalieriByDateRange(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Both startDate and endDate are required" });
      }

      const sgrGiornalieri = await sgrService.getSgrGiornalieriByDateRange(startDate, endDate);
      res.json(sgrGiornalieri);
    } catch (error) {
      console.error("Error fetching SGR giornalieri by date range:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornalieri by date range" });
    }
  }

  /**
   * POST /api/sgr-giornalieri
   * Create new SGR Giornaliero
   */
  async createSgrGiornaliero(req: Request, res: Response) {
    try {
      const parsedData = insertSgrGiornalieriSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const newSgrGiornaliero = await sgrService.createSgrGiornaliero(parsedData.data);
      res.status(201).json(newSgrGiornaliero);
    } catch (error) {
      console.error("Error creating SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to create SGR giornaliero" });
    }
  }

  /**
   * PATCH /api/sgr-giornalieri/:id
   * Update SGR Giornaliero
   */
  async updateSgrGiornaliero(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      const sgrGiornaliero = await sgrService.getSgrGiornalieroById(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }

      const updatedSgrGiornaliero = await sgrService.updateSgrGiornaliero(id, req.body);
      res.json(updatedSgrGiornaliero);
    } catch (error) {
      console.error("Error updating SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to update SGR giornaliero" });
    }
  }

  /**
   * DELETE /api/sgr-giornalieri/:id
   * Delete SGR Giornaliero
   */
  async deleteSgrGiornaliero(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      const sgrGiornaliero = await sgrService.getSgrGiornalieroById(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }

      await sgrService.deleteSgrGiornaliero(id);
      res.json({ success: true, message: "SGR giornaliero deleted successfully" });
    } catch (error) {
      console.error("Error deleting SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to delete SGR giornaliero" });
    }
  }

  // ========== SGR Per Taglia (Calculated SGR) ==========

  /**
   * GET /api/sgr-per-taglia
   * Get all calculated SGR per taglia
   */
  async getAllSgrPerTaglia(req: Request, res: Response) {
    try {
      const sgrPerTaglia = await sgrService.getSgrPerTaglia();
      res.json(sgrPerTaglia);
    } catch (error) {
      console.error("Error fetching SGR per taglia:", error);
      res.status(500).json({ message: "Failed to fetch SGR per taglia" });
    }
  }

  /**
   * POST /api/sgr-per-taglia/calculate
   * Manually trigger SGR calculation with WebSocket progress updates
   */
  async triggerSgrCalculation(req: Request, res: Response) {
    try {
      const { month } = req.body;
      
      console.log("🔧 SGR CONTROLLER: Manual calculation triggered");
      
      // Send initial WebSocket event
      broadcastMessage({
        type: "sgr_calculation_start",
        data: {
          month: month || 'current',
          progress: 0,
          status: "Inizializzazione calcolo SGR..."
        }
      });

      // Trigger calculation in background
      setTimeout(async () => {
        try {
          // Progress: Loading operations
          broadcastMessage({
            type: "sgr_calculation_progress",
            data: {
              progress: 20,
              status: "Recupero operazioni storiche..."
            }
          });

          const result = await sgrScheduler.triggerManualCalculation(month);

          // Progress: Size calculations
          const sizeCount = result.results.length;
          for (let i = 0; i < sizeCount; i++) {
            broadcastMessage({
              type: "sgr_calculation_progress",
              data: {
                progress: 40 + (i / sizeCount) * 40,
                status: `Calcolo SGR Taglia ${i + 1}/${sizeCount}...`,
                currentSize: result.results[i].sizeName
              }
            });
          }

          // Progress: Saving
          broadcastMessage({
            type: "sgr_calculation_progress",
            data: {
              progress: 90,
              status: "Salvataggio dati..."
            }
          });

          // Complete
          broadcastMessage({
            type: "sgr_calculation_complete",
            data: {
              progress: 100,
              status: "Calcolo completato!",
              results: result.results,
              month: result.month,
              year: result.year
            }
          });

        } catch (error) {
          console.error("Error during SGR calculation:", error);
          broadcastMessage({
            type: "sgr_calculation_error",
            data: {
              status: "Errore durante il calcolo",
              error: error instanceof Error ? error.message : "Unknown error"
            }
          });
        }
      }, 100);

      // Return immediately with accepted status
      res.status(202).json({
        message: "SGR calculation started",
        status: "processing"
      });

    } catch (error) {
      console.error("Error triggering SGR calculation:", error);
      res.status(500).json({ message: "Failed to trigger SGR calculation" });
    }
  }
}

export const sgrController = new SgrController();
