import type { Request, Response } from "express";
import { storage } from "../../../storage";
import { flupsyService } from "./flupsys.service";
import { insertFlupsySchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export class FlupsyController {
  async getAll(req: Request, res: Response) {
    try {
      const flupsys = await storage.getFlupsys();
      const includeStats = req.query.includeStats === 'true';

      console.log("Server: Richiesta FLUPSY con includeStats =", includeStats);

      if (includeStats) {
        const enhancedFlupsys = await Promise.all(
          flupsys.map(async (flupsy) => {
            const stats = await flupsyService.calculateFlupsyStats(flupsy.id);
            return { ...flupsy, ...stats };
          })
        );
        return res.json(enhancedFlupsys);
      }

      res.json(flupsys);
    } catch (error) {
      console.error("Error fetching FLUPSY units:", error);
      res.status(500).json({ message: "Failed to fetch FLUPSY units" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY not found" });
      }

      const stats = await flupsyService.calculateFlupsyStats(id);
      const enhancedFlupsy = { ...flupsy, ...stats };

      res.json(enhancedFlupsy);
    } catch (error) {
      console.error("Error fetching FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch FLUPSY" });
    }
  }

  async getPositions(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const positions = await flupsyService.getFlupsyPositions(id);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching FLUPSY positions:", error);
      res.status(500).json({ message: "Failed to fetch FLUPSY positions" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsedData = insertFlupsySchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const existingFlupsy = await storage.getFlupsyByName(parsedData.data.name);
      if (existingFlupsy) {
        return res.status(400).json({ message: "A FLUPSY with this name already exists" });
      }

      const newFlupsy = await storage.createFlupsy(parsedData.data);
      res.status(201).json(newFlupsy);
    } catch (error) {
      console.error("Error creating FLUPSY:", error);
      res.status(500).json({ message: "Failed to create FLUPSY" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY not found" });
      }

      const updateData = req.body;

      if (updateData.name && updateData.name !== flupsy.name) {
        const existingFlupsy = await storage.getFlupsyByName(updateData.name);
        if (existingFlupsy && existingFlupsy.id !== id) {
          return res.status(400).json({ message: "A FLUPSY with this name already exists" });
        }
      }

      const updatedFlupsy = await storage.updateFlupsy(id, updateData);

      if (updatedFlupsy && typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('flupsy_updated', {
          flupsy: updatedFlupsy,
          message: `FLUPSY ${updatedFlupsy.name} aggiornato`
        });
      }

      res.json(updatedFlupsy);
    } catch (error) {
      console.error("Error updating FLUPSY:", error);
      res.status(500).json({ message: "Failed to update FLUPSY" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "ID FLUPSY non valido" });
      }

      console.log(`Richiesta di eliminazione FLUPSY ID: ${id}`);

      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ success: false, message: "FLUPSY non trovato" });
      }

      const basketsInFlupsy = await storage.getBasketsByFlupsy(id);
      const basketsWithActiveCycles = basketsInFlupsy.filter(basket => 
        basket.currentCycleId !== null
      );

      console.log("Ceste con cicli attivi:", JSON.stringify(basketsWithActiveCycles, null, 2));

      if (basketsWithActiveCycles.length > 0) {
        const activeBasketNumbers = basketsWithActiveCycles
          .map(b => `Cestello #${b.physicalNumber}`)
          .join(', ');

        return res.status(409).json({ 
          success: false, 
          message: `Impossibile eliminare il FLUPSY. Le seguenti ceste hanno cicli attivi: ${activeBasketNumbers}. Terminare prima i cicli attivi.` 
        });
      }

      const result = await storage.deleteFlupsy(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error deleting flupsy:", error);
      res.status(500).json({ 
        success: false, 
        message: `Errore durante l'eliminazione del FLUPSY: ${(error as Error).message}` 
      });
    }
  }

  async refreshStats(req: Request, res: Response) {
    try {
      console.log("🔄 Forzando aggiornamento statistiche FLUPSY...");

      try {
        const { invalidateCache: invalidateBasketsCache } = await import("../../../controllers/baskets-controller");
        if (typeof invalidateBasketsCache === 'function') {
          invalidateBasketsCache();
          console.log("✅ Cache cestelli invalidata");
        }
      } catch (error: any) {
        console.log("⚠️ Errore invalidazione cache cestelli:", error.message);
      }

      try {
        const cyclesController = await import("../../../controllers/cycles-controller");
        if (typeof cyclesController.invalidateCache === 'function') {
          cyclesController.invalidateCache();
          console.log("✅ Cache cicli invalidata");
        }
      } catch (error: any) {
        console.log("⚠️ Errore invalidazione cache cicli:", error.message);
      }

      try {
        const operationsController = await import("../../../controllers/operations-unified-controller");
        if (operationsController.invalidateUnifiedCache) {
          operationsController.invalidateUnifiedCache();
          console.log("✅ Cache operazioni invalidata");
        }
      } catch (error: any) {
        console.log("⚠️ Errore invalidazione cache operazioni:", error.message);
      }

      res.json({ 
        success: true, 
        message: "Statistiche FLUPSY aggiornate con successo" 
      });
    } catch (error) {
      console.error("Errore durante l'aggiornamento statistiche FLUPSY:", error);
      res.status(500).json({ 
        success: false, 
        message: "Errore durante l'aggiornamento delle statistiche" 
      });
    }
  }

  async populate(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "ID FLUPSY non valido" });
      }

      const { broadcastMessage } = await import("../../../websocket");
      const result = await flupsyService.populateFlupsy(id, broadcastMessage);

      res.json(result);
    } catch (error) {
      console.error("Errore durante il popolamento del FLUPSY:", error);
      res.status(500).json({ 
        success: false, 
        message: `Errore: ${(error as Error).message}`,
        error: (error as Error).message 
      });
    }
  }

  async getBaskets(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const baskets = await storage.getBasketsByFlupsy(id);
      res.json(baskets);
    } catch (error) {
      console.error("Error fetching baskets for FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch baskets for FLUPSY" });
    }
  }

  async getCycles(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const baskets = await storage.getBasketsByFlupsy(id);
      const cycleIds = baskets
        .filter(b => b.currentCycleId !== null)
        .map(b => b.currentCycleId as number);

      const cycles = await Promise.all(
        cycleIds.map(cycleId => storage.getCycle(cycleId))
      );

      res.json(cycles.filter(c => c !== null));
    } catch (error) {
      console.error("Error fetching cycles for FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch cycles for FLUPSY" });
    }
  }
}

export const flupsyController = new FlupsyController();
