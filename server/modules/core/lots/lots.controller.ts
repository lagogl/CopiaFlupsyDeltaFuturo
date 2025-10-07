import type { Request, Response } from "express";
import { lotsService } from "./lots.service";
import { insertLotSchema, lotSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export class LotsController {
  /**
   * GET /api/lots
   * Get all lots with optional sizes
   */
  async getAll(req: Request, res: Response) {
    try {
      const includeSizes = req.query.includeSizes !== 'false';
      const lots = await lotsService.getAllLots(includeSizes);
      res.json(lots);
    } catch (error) {
      console.error("Error fetching lots:", error);
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  }

  /**
   * GET /api/lots/optimized
   * Get optimized lots with filtering and pagination
   */
  async getOptimized(req: Request, res: Response) {
    try {
      const filters = {
        state: req.query.state as string | undefined,
        supplier: req.query.supplier as string | undefined,
        quality: req.query.quality as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        sizeId: req.query.sizeId as string | undefined
      };

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const allLots = await lotsService.getOptimizedLots(filters);
      
      // Calculate statistics
      const statistics = {
        counts: {
          normali: allLots.filter(l => l.quality === 'normali').length,
          teste: allLots.filter(l => l.quality === 'teste').length,
          code: allLots.filter(l => l.quality === 'code').length,
          totale: allLots.length
        },
        percentages: {
          normali: allLots.length > 0 ? (allLots.filter(l => l.quality === 'normali').length / allLots.length * 100) : 0,
          teste: allLots.length > 0 ? (allLots.filter(l => l.quality === 'teste').length / allLots.length * 100) : 0,
          code: allLots.length > 0 ? (allLots.filter(l => l.quality === 'code').length / allLots.length * 100) : 0
        }
      };

      // Pagination
      const totalCount = allLots.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLots = allLots.slice(startIndex, endIndex);

      res.json({
        lots: paginatedLots,
        totalPages,
        totalCount,
        statistics
      });
    } catch (error) {
      console.error("Error fetching optimized lots:", error);
      res.status(500).json({ message: "Failed to fetch optimized lots" });
    }
  }

  /**
   * GET /api/lots/active
   * Get active lots only
   */
  async getActive(req: Request, res: Response) {
    try {
      const lots = await lotsService.getActiveLots();
      res.json(lots);
    } catch (error) {
      console.error("Error fetching active lots:", error);
      res.status(500).json({ message: "Failed to fetch active lots" });
    }
  }

  /**
   * GET /api/lots/timeline
   * Get lots timeline ordered by arrival date
   */
  async getTimeline(req: Request, res: Response) {
    try {
      const lots = await lotsService.getLotTimeline();
      res.json(lots);
    } catch (error) {
      console.error("Error fetching lots timeline:", error);
      res.status(500).json({ message: "Failed to fetch lots timeline" });
    }
  }

  /**
   * GET /api/lots/:id
   * Get lot by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      const lot = await lotsService.getLotById(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      res.json(lot);
    } catch (error) {
      console.error("Error fetching lot:", error);
      res.status(500).json({ message: "Failed to fetch lot" });
    }
  }

  /**
   * GET /api/lots/:id/stats
   * Get lot statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      const stats = await lotsService.getLotStats(id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching lot stats:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch lot stats";
      res.status(500).json({ message });
    }
  }

  /**
   * POST /api/lots
   * Create new lot
   */
  async create(req: Request, res: Response) {
    try {
      const parsedData = insertLotSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const newLot = await lotsService.createLot(parsedData.data);
      
      // Broadcast update if WebSocket is available
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('lot_created', {
          lot: newLot,
          message: `Lotto ${newLot.supplier} - ${newLot.supplierLotNumber} creato`
        });
      }

      res.status(201).json(newLot);
    } catch (error) {
      console.error("Error creating lot:", error);
      res.status(500).json({ message: "Failed to create lot" });
    }
  }

  /**
   * PATCH /api/lots/:id
   * Update lot
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      const lot = await lotsService.getLotById(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      const updatedLot = await lotsService.updateLot(id, req.body);

      // Broadcast update if WebSocket is available
      if (updatedLot && typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('lot_updated', {
          lot: updatedLot,
          message: `Lotto ${updatedLot.supplier} - ${updatedLot.supplierLotNumber} aggiornato`
        });
      }

      res.json(updatedLot);
    } catch (error) {
      console.error("Error updating lot:", error);
      res.status(500).json({ message: "Failed to update lot" });
    }
  }

  /**
   * DELETE /api/lots/:id
   * Delete lot
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      const lot = await lotsService.getLotById(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      await lotsService.deleteLot(id);

      // Broadcast update if WebSocket is available
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('lot_deleted', {
          lotId: id,
          message: `Lotto ${lot.supplier} - ${lot.supplierLotNumber} eliminato`
        });
      }

      res.json({ success: true, message: "Lot deleted successfully" });
    } catch (error) {
      console.error("Error deleting lot:", error);
      res.status(500).json({ message: "Failed to delete lot" });
    }
  }

  /**
   * POST /api/lots/refresh-cache
   * Refresh lots cache
   */
  async refreshCache(req: Request, res: Response) {
    try {
      const result = lotsService.refreshCache();
      res.json(result);
    } catch (error) {
      console.error("Error refreshing lots cache:", error);
      res.status(500).json({ message: "Failed to refresh cache" });
    }
  }
}

export const lotsController = new LotsController();
