import type { Request, Response } from "express";
import { mortalityRatesService } from "./mortality-rates.service";
import { insertMortalityRateSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export class MortalityRatesController {
  async getAll(req: Request, res: Response) {
    try {
      const rates = await mortalityRatesService.getAll();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching mortality rates:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid mortality rate ID" });
      }

      const rate = await mortalityRatesService.getById(id);
      if (!rate) {
        return res.status(404).json({ message: "Mortality rate not found" });
      }

      res.json(rate);
    } catch (error) {
      console.error("Error fetching mortality rate:", error);
      res.status(500).json({ message: "Failed to fetch mortality rate" });
    }
  }

  async getByMonthAndSize(req: Request, res: Response) {
    try {
      const month = req.query.month as string;
      const sizeIdStr = req.query.sizeId as string;
      
      if (!month || !sizeIdStr) {
        return res.status(400).json({ message: "Both month and sizeId are required parameters" });
      }
      
      const sizeId = parseInt(sizeIdStr);
      if (isNaN(sizeId)) {
        return res.status(400).json({ message: "sizeId must be a valid number" });
      }

      const rate = await mortalityRatesService.getByMonthAndSize(month, sizeId);
      if (!rate) {
        return res.status(404).json({ message: `No mortality rate found for month ${month} and size ID ${sizeId}` });
      }

      res.json(rate);
    } catch (error) {
      console.error("Error fetching mortality rate:", error);
      res.status(500).json({ message: "Failed to fetch mortality rate by month and size" });
    }
  }

  async getByMonth(req: Request, res: Response) {
    try {
      const rates = await mortalityRatesService.getByMonth(req.params.month);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching mortality rates by month:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates by month" });
    }
  }

  async getBySize(req: Request, res: Response) {
    try {
      const sizeId = parseInt(req.params.sizeId);
      if (isNaN(sizeId)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }

      const rates = await mortalityRatesService.getBySize(sizeId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching mortality rates by size:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates by size" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const parsedData = insertMortalityRateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const existingRate = await mortalityRatesService.getByMonthAndSize(
        parsedData.data.month, 
        parsedData.data.sizeId
      );
      if (existingRate) {
        return res.status(409).json({ message: "Un tasso di mortalità per questa combinazione mese/taglia esiste già", existingRate });
      }

      const newRate = await mortalityRatesService.create(parsedData.data);
      const size = newRate.sizeId ? await mortalityRatesService.getById(newRate.id) : null;
      res.status(201).json(size || newRate);
    } catch (error) {
      console.error("Error creating mortality rate:", error);
      res.status(500).json({ message: "Failed to create mortality rate" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid mortality rate ID" });
      }

      const rate = await mortalityRatesService.getById(id);
      if (!rate) {
        return res.status(404).json({ message: "Mortality rate not found" });
      }

      const updatedRate = await mortalityRatesService.update(id, req.body);
      res.json(updatedRate);
    } catch (error) {
      console.error("Error updating mortality rate:", error);
      res.status(500).json({ message: "Failed to update mortality rate" });
    }
  }
}

export const mortalityRatesController = new MortalityRatesController();
