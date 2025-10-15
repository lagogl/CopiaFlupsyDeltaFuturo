import { Request, Response } from 'express';
import { screeningService } from './screening.service';
import { 
  insertScreeningOperationSchema,
  insertScreeningSourceBasketSchema,
  insertScreeningDestinationBasketSchema,
  insertScreeningBasketHistorySchema,
  insertScreeningLotReferenceSchema
} from '../../../shared/schema';

/**
 * Controller per le operazioni di screening (vagliatura)
 * Gestisce le richieste HTTP e la validazione
 */
export class ScreeningController {
  /**
   * GET /api/screenings
   * Lista operazioni di screening con paginazione
   */
  async getScreenings(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = (req.query.status as string) || 'completed';

      const result = await screeningService.getScreenings({
        page,
        pageSize,
        status
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching screenings:", error);
      res.status(500).json({ message: "Failed to fetch screenings" });
    }
  }

  /**
   * GET /api/screenings/:id
   * Dettaglio completo di un'operazione di screening
   */
  async getScreeningById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid screening ID" });
      }

      const screening = await screeningService.getScreeningById(id);

      if (!screening) {
        return res.status(404).json({ message: "Screening not found" });
      }

      res.json(screening);
    } catch (error) {
      console.error("Error fetching screening details:", error);
      res.status(500).json({ message: "Failed to fetch screening details" });
    }
  }

  /**
   * GET /api/screening/next-number
   * Ottieni il prossimo numero di vagliatura disponibile
   */
  async getNextScreeningNumber(req: Request, res: Response) {
    try {
      const nextNumber = await screeningService.getNextScreeningNumber();
      res.json({ nextNumber });
    } catch (error) {
      console.error("Error getting next screening number:", error);
      res.status(500).json({ message: "Failed to get next screening number" });
    }
  }

  /**
   * GET /api/screening/operations
   * Lista operazioni di screening filtrate per status
   */
  async getScreeningOperations(req: Request, res: Response) {
    try {
      const status = req.query.status as string;
      const operations = await screeningService.getScreeningOperations(status);
      res.json(operations);
    } catch (error) {
      console.error("Error fetching screening operations:", error);
      res.status(500).json({ message: "Failed to fetch screening operations" });
    }
  }

  /**
   * GET /api/screening/operations/:id
   * Dettaglio di una singola operazione di screening
   */
  async getScreeningOperationById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const screening = await screeningService.getScreeningById(id);

      if (!screening) {
        return res.status(404).json({ message: "Screening operation not found" });
      }

      res.json(screening);
    } catch (error) {
      console.error("Error fetching screening operation:", error);
      res.status(500).json({ message: "Failed to fetch screening operation" });
    }
  }

  /**
   * POST /api/screening/operations
   * Crea una nuova operazione di screening
   */
  async createScreeningOperation(req: Request, res: Response) {
    try {
      const validatedData = insertScreeningOperationSchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validatedData.error.errors 
        });
      }

      const result = await screeningService.createScreeningOperation(validatedData.data);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating screening operation:", error);
      res.status(500).json({ message: "Failed to create screening operation" });
    }
  }

  /**
   * PATCH /api/screening/operations/:id
   * Aggiorna un'operazione di screening
   */
  async updateScreeningOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const result = await screeningService.updateScreeningOperation(id, updateData);

      if (!result) {
        return res.status(404).json({ message: "Screening operation not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating screening operation:", error);
      res.status(500).json({ message: "Failed to update screening operation" });
    }
  }

  /**
   * POST /api/screening/operations/:id/complete
   * Completa un'operazione di screening
   */
  async completeScreeningOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await screeningService.completeScreeningOperation(id);

      if (!result) {
        return res.status(404).json({ message: "Screening operation not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error completing screening operation:", error);
      res.status(500).json({ message: "Failed to complete screening operation" });
    }
  }

  /**
   * POST /api/screening/operations/:id/cancel
   * Annulla un'operazione di screening
   */
  async cancelScreeningOperation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await screeningService.cancelScreeningOperation(id);

      if (!result) {
        return res.status(404).json({ message: "Screening operation not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error cancelling screening operation:", error);
      res.status(500).json({ message: "Failed to cancel screening operation" });
    }
  }

  // Source Baskets Methods
  async getSourceBaskets(req: Request, res: Response) {
    try {
      const screeningId = parseInt(req.params.screeningId);
      const baskets = await screeningService.getSourceBaskets(screeningId);
      res.json(baskets);
    } catch (error) {
      console.error("Error fetching source baskets:", error);
      res.status(500).json({ message: "Failed to fetch source baskets" });
    }
  }

  async createSourceBasket(req: Request, res: Response) {
    try {
      const validatedData = insertScreeningSourceBasketSchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validatedData.error.errors 
        });
      }

      const result = await screeningService.createSourceBasket(validatedData.data);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating source basket:", error);
      res.status(500).json({ message: "Failed to create source basket" });
    }
  }

  async updateSourceBasket(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const result = await screeningService.updateSourceBasket(id, updateData);

      if (!result) {
        return res.status(404).json({ message: "Source basket not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating source basket:", error);
      res.status(500).json({ message: "Failed to update source basket" });
    }
  }

  async dismissSourceBasket(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await screeningService.dismissSourceBasket(id);

      if (!result) {
        return res.status(404).json({ message: "Source basket not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error dismissing source basket:", error);
      res.status(500).json({ message: "Failed to dismiss source basket" });
    }
  }

  async deleteSourceBasket(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await screeningService.deleteSourceBasket(id);

      if (!result) {
        return res.status(404).json({ message: "Source basket not found" });
      }

      res.json({ message: "Source basket deleted successfully" });
    } catch (error) {
      console.error("Error deleting source basket:", error);
      res.status(500).json({ message: "Failed to delete source basket" });
    }
  }

  // Destination Baskets Methods
  async getDestinationBaskets(req: Request, res: Response) {
    try {
      const screeningId = parseInt(req.params.screeningId);
      const baskets = await screeningService.getDestinationBaskets(screeningId);
      res.json(baskets);
    } catch (error) {
      console.error("Error fetching destination baskets:", error);
      res.status(500).json({ message: "Failed to fetch destination baskets" });
    }
  }

  async createDestinationBasket(req: Request, res: Response) {
    try {
      const validatedData = insertScreeningDestinationBasketSchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validatedData.error.errors 
        });
      }

      const result = await screeningService.createDestinationBasket(validatedData.data);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating destination basket:", error);
      res.status(500).json({ message: "Failed to create destination basket" });
    }
  }

  async updateDestinationBasket(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const result = await screeningService.updateDestinationBasket(id, updateData);

      if (!result) {
        return res.status(404).json({ message: "Destination basket not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating destination basket:", error);
      res.status(500).json({ message: "Failed to update destination basket" });
    }
  }

  async assignPosition(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { position } = req.body;

      if (!position) {
        return res.status(400).json({ message: "Position is required" });
      }

      const result = await screeningService.assignPosition(id, position);

      if (!result) {
        return res.status(404).json({ message: "Destination basket not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error assigning position:", error);
      res.status(500).json({ message: "Failed to assign position" });
    }
  }

  async deleteDestinationBasket(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const result = await screeningService.deleteDestinationBasket(id);

      if (!result) {
        return res.status(404).json({ message: "Destination basket not found" });
      }

      res.json({ message: "Destination basket deleted successfully" });
    } catch (error) {
      console.error("Error deleting destination basket:", error);
      res.status(500).json({ message: "Failed to delete destination basket" });
    }
  }

  // History and Lot References Methods
  async createHistory(req: Request, res: Response) {
    try {
      const validatedData = insertScreeningBasketHistorySchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validatedData.error.errors 
        });
      }

      const result = await screeningService.createHistory(validatedData.data);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating history:", error);
      res.status(500).json({ message: "Failed to create history" });
    }
  }

  async createLotReference(req: Request, res: Response) {
    try {
      const validatedData = insertScreeningLotReferenceSchema.safeParse(req.body);

      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validatedData.error.errors 
        });
      }

      const result = await screeningService.createLotReference(validatedData.data);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating lot reference:", error);
      res.status(500).json({ message: "Failed to create lot reference" });
    }
  }
}

export const screeningController = new ScreeningController();
