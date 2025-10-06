import type { Request, Response } from "express";
import { sizesService } from "./sizes.service";
import { insertSizeSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export class SizesController {
  /**
   * GET /api/sizes
   * Get all sizes
   */
  async getAll(req: Request, res: Response) {
    try {
      const sizes = await sizesService.getAllSizes();
      res.json(sizes);
    } catch (error) {
      console.error("Error fetching sizes:", error);
      res.status(500).json({ message: "Failed to fetch sizes" });
    }
  }

  /**
   * GET /api/sizes/:id
   * Get size by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }

      const size = await sizesService.getSizeById(id);
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.json(size);
    } catch (error) {
      console.error("Error fetching size:", error);
      res.status(500).json({ message: "Failed to fetch size" });
    }
  }

  /**
   * POST /api/sizes
   * Create new size
   */
  async create(req: Request, res: Response) {
    try {
      const parsedData = insertSizeSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check for duplicate code
      const allSizes = await sizesService.getAllSizes();
      const existingSize = allSizes.find(s => s.code === parsedData.data.code);
      if (existingSize) {
        return res.status(400).json({ message: "A size with this code already exists" });
      }

      const newSize = await sizesService.createSize(parsedData.data);
      
      // Broadcast update if WebSocket is available
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('size_created', {
          size: newSize,
          message: `Taglia ${newSize.code} creata`
        });
      }

      res.status(201).json(newSize);
    } catch (error) {
      console.error("Error creating size:", error);
      res.status(500).json({ message: "Failed to create size" });
    }
  }

  /**
   * PATCH /api/sizes/:id
   * Update size
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }

      const size = await sizesService.getSizeById(id);
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      // Check for duplicate code if changing it
      if (req.body.code && req.body.code !== size.code) {
        const allSizes = await sizesService.getAllSizes();
        const existingSize = allSizes.find(s => s.code === req.body.code && s.id !== id);
        if (existingSize) {
          return res.status(400).json({ message: "A size with this code already exists" });
        }
      }

      const updatedSize = await sizesService.updateSize(id, req.body);

      // Broadcast update if WebSocket is available
      if (updatedSize && typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('size_updated', {
          size: updatedSize,
          message: `Taglia ${updatedSize.code} aggiornata`
        });
      }

      res.json(updatedSize);
    } catch (error) {
      console.error("Error updating size:", error);
      res.status(500).json({ message: "Failed to update size" });
    }
  }

  /**
   * DELETE /api/sizes/:id
   * Delete size
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }

      const size = await sizesService.getSizeById(id);
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      await sizesService.deleteSize(id);

      // Broadcast update if WebSocket is available
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('size_deleted', {
          sizeId: id,
          message: `Taglia ${size.code} eliminata`
        });
      }

      res.json({ success: true, message: "Size deleted successfully" });
    } catch (error) {
      console.error("Error deleting size:", error);
      res.status(500).json({ message: "Failed to delete size" });
    }
  }
}

export const sizesController = new SizesController();
