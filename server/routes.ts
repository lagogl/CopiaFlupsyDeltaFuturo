import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFlupsySchema,
  insertBasketSchema, 
  operationSchema, 
  insertOperationSchema, 
  cycleSchema, 
  insertSizeSchema, 
  insertSgrSchema, 
  lotSchema, 
  operationTypes
} from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // === Basket routes ===
  app.get("/api/baskets", async (req, res) => {
    try {
      const baskets = await storage.getBaskets();
      res.json(baskets);
    } catch (error) {
      console.error("Error fetching baskets:", error);
      res.status(500).json({ message: "Failed to fetch baskets" });
    }
  });
  
  app.get("/api/baskets/check-exists", async (req, res) => {
    try {
      const flupsyId = parseInt(req.query.flupsyId as string);
      const physicalNumber = parseInt(req.query.physicalNumber as string);
      
      if (isNaN(flupsyId) || isNaN(physicalNumber)) {
        return res.status(400).json({ 
          message: "flupsyId e physicalNumber sono richiesti e devono essere numeri validi" 
        });
      }
      
      // Verifica se il FLUPSY esiste
      const flupsy = await storage.getFlupsy(flupsyId);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY non trovato" });
      }
      
      // Ottieni tutte le ceste per questo FLUPSY
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      
      // Verifica se esiste già una cesta con lo stesso numero fisico
      const existingBasket = flupsyBaskets.find(basket => basket.physicalNumber === physicalNumber);
      
      if (existingBasket) {
        // Include il nome del FLUPSY per un messaggio di errore migliore
        const flupsyName = flupsy.name;
        const basketState = existingBasket.state;
        
        return res.json({
          exists: true,
          basket: existingBasket,
          message: `Esiste già una cesta con il numero ${physicalNumber} in ${flupsyName} (Stato: ${basketState})`,
          state: basketState
        });
      }
      
      res.json({ exists: false });
    } catch (error) {
      console.error("Error checking basket existence:", error);
      res.status(500).json({ message: "Errore durante la verifica dell'esistenza della cesta" });
    }
  });
  
  app.get("/api/baskets/check-position", async (req, res) => {
    try {
      const flupsyId = parseInt(req.query.flupsyId as string);
      const row = req.query.row as string;
      const position = parseInt(req.query.position as string);
      const basketId = req.query.basketId ? parseInt(req.query.basketId as string) : undefined;
      
      if (isNaN(flupsyId) || !row || isNaN(position)) {
        return res.status(400).json({ 
          message: "flupsyId, row e position sono richiesti e devono essere validi" 
        });
      }
      
      // Verifica se il FLUPSY esiste
      const flupsy = await storage.getFlupsy(flupsyId);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY non trovato" });
      }
      
      // Ottieni tutte le ceste per questo FLUPSY
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      
      // Verifica se esiste già una cesta nella stessa posizione
      // Escludiamo il basket con basketId (se fornito), utile durante la modifica
      const existingBasket = flupsyBaskets.find(basket => 
        basket.row === row && 
        basket.position === position && 
        (!basketId || basket.id !== basketId) // Ignora la cesta stessa durante la modifica
      );
      
      if (existingBasket) {
        const flupsyName = flupsy.name;
        
        return res.json({
          positionTaken: true,
          basket: existingBasket,
          message: `La posizione ${row}-${position} in ${flupsyName} è già occupata dalla cesta #${existingBasket.physicalNumber}`
        });
      }
      
      res.json({ positionTaken: false });
    } catch (error) {
      console.error("Error checking basket position:", error);
      res.status(500).json({ message: "Errore durante la verifica della posizione della cesta" });
    }
  });

  app.get("/api/baskets/next-number/:flupsyId", async (req, res) => {
    try {
      const flupsyId = parseInt(req.params.flupsyId);
      if (isNaN(flupsyId)) {
        return res.status(400).json({ message: "ID FLUPSY non valido" });
      }
      
      // Verifica se il FLUPSY esiste
      const flupsy = await storage.getFlupsy(flupsyId);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY non trovato" });
      }
      
      // Ottieni tutte le ceste per questo FLUPSY
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      
      // Se abbiamo già 20 ceste, restituisci un errore
      if (flupsyBaskets.length >= 20) {
        return res.status(400).json({ 
          message: "Limite massimo di 20 ceste per FLUPSY raggiunto" 
        });
      }
      
      // Trova il prossimo numero disponibile
      const usedNumbers = flupsyBaskets.map(basket => basket.physicalNumber);
      let nextNumber = 1;
      
      while (usedNumbers.includes(nextNumber) && nextNumber <= 20) {
        nextNumber++;
      }
      
      res.json({ nextNumber });
    } catch (error) {
      console.error("Error getting next basket number:", error);
      res.status(500).json({ message: "Errore nel calcolo del prossimo numero di cesta" });
    }
  });

  app.get("/api/baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      const basket = await storage.getBasket(id);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }

      res.json(basket);
    } catch (error) {
      console.error("Error fetching basket:", error);
      res.status(500).json({ message: "Failed to fetch basket" });
    }
  });

  app.post("/api/baskets", async (req, res) => {
    try {
      const parsedData = insertBasketSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const { flupsyId, physicalNumber } = parsedData.data;

      // Get all baskets for this FLUPSY
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      
      // Check if we already have 20 baskets for this FLUPSY
      if (flupsyBaskets.length >= 20) {
        return res.status(400).json({ 
          message: "Limite massimo di 20 ceste per FLUPSY raggiunto. Impossibile aggiungere ulteriori ceste." 
        });
      }

      // Check if a basket with the same physical number already exists in this FLUPSY
      const basketWithSameNumber = flupsyBaskets.find(b => b.physicalNumber === physicalNumber);
      if (basketWithSameNumber) {
        return res.status(400).json({ 
          message: `Esiste già una cesta con il numero ${physicalNumber} in questa unità FLUPSY` 
        });
      }

      // Create the basket
      const newBasket = await storage.createBasket(parsedData.data);
      
      // If basket has position data, record it in the position history
      if (parsedData.data.row && parsedData.data.position) {
        await storage.createBasketPositionHistory({
          basketId: newBasket.id,
          flupsyId: newBasket.flupsyId,
          row: parsedData.data.row,
          position: parsedData.data.position,
          startDate: new Date(),
          operationId: null
        });
      }
      
      res.status(201).json(newBasket);
    } catch (error) {
      console.error("Error creating basket:", error);
      res.status(500).json({ message: "Failed to create basket" });
    }
  });
  
  app.patch("/api/baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      // Verify the basket exists
      const basket = await storage.getBasket(id);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }
      
      // Parse and validate the update data
      const updateSchema = z.object({
        physicalNumber: z.number().optional(),
        flupsyId: z.number().optional(),
        row: z.string().nullable().optional(),
        position: z.number().nullable().optional(),
        state: z.string().optional(),
        nfcData: z.string().nullable().optional(),
        currentCycleId: z.number().nullable().optional()
      });

      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // If position data is changing, verify no duplicates
      if ((parsedData.data.row !== undefined && parsedData.data.row !== basket.row) || 
          (parsedData.data.position !== undefined && parsedData.data.position !== basket.position)) {
        
        // Only check if both row and position are provided
        if (parsedData.data.row && parsedData.data.position) {
          // Get the FLUPSY ID (either from update or from existing basket)
          const flupsyId = parsedData.data.flupsyId || basket.flupsyId;
          
          // Get all baskets for this FLUPSY
          const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
          
          // Check if there's already a different basket at this position
          const basketAtPosition = flupsyBaskets.find(b => 
            b.id !== id && 
            b.row === parsedData.data.row && 
            b.position === parsedData.data.position
          );
          
          if (basketAtPosition) {
            return res.status(400).json({ 
              message: `Esiste già una cesta (numero ${basketAtPosition.physicalNumber}) in questa posizione` 
            });
          }
          
          // Close the current position if exists
          const currentPosition = await storage.getCurrentBasketPosition(id);
          if (currentPosition) {
            await storage.closeBasketPositionHistory(id, new Date());
          }
          
          // Create a new position history entry
          await storage.createBasketPositionHistory({
            basketId: id,
            flupsyId: flupsyId,
            row: parsedData.data.row,
            position: parsedData.data.position,
            startDate: new Date(),
            operationId: null
          });
        }
      }
      
      // Update the basket
      const updatedBasket = await storage.updateBasket(id, parsedData.data);
      res.json(updatedBasket);
    } catch (error) {
      console.error("Error updating basket:", error);
      res.status(500).json({ message: "Failed to update basket" });
    }
  });

  app.delete("/api/baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      // Verify the basket exists
      const basket = await storage.getBasket(id);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }
      
      // Check if basket has an active cycle
      if (basket.currentCycleId !== null) {
        return res.status(400).json({ 
          message: "Cannot delete a basket with an active cycle. Close the cycle first." 
        });
      }

      // Delete the basket
      const result = await storage.deleteBasket(id);
      if (result) {
        res.status(200).json({ message: "Basket deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete basket" });
      }
    } catch (error) {
      console.error("Error deleting basket:", error);
      res.status(500).json({ message: "Failed to delete basket" });
    }
  });
  
  // Basket position history endpoints
  app.get("/api/baskets/:id/positions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      // Verify the basket exists
      const basket = await storage.getBasket(id);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }
      
      // Get position history
      const positionHistory = await storage.getBasketPositionHistory(id);
      
      res.json(positionHistory);
    } catch (error) {
      console.error("Error fetching basket position history:", error);
      res.status(500).json({ message: "Failed to fetch basket position history" });
    }
  });
  
  app.get("/api/baskets/:id/current-position", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      // Verify the basket exists
      const basket = await storage.getBasket(id);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }
      
      // Get current position
      const currentPosition = await storage.getCurrentBasketPosition(id);
      
      res.json(currentPosition || { message: "Basket has no position history" });
    } catch (error) {
      console.error("Error fetching current basket position:", error);
      res.status(500).json({ message: "Failed to fetch current basket position" });
    }
  });

  // === Operation routes ===
  app.get("/api/operations", async (req, res) => {
    try {
      const operations = await storage.getOperations();
      
      // Fetch related entities
      const operationsWithDetails = await Promise.all(
        operations.map(async (op) => {
          const basket = await storage.getBasket(op.basketId);
          const cycle = await storage.getCycle(op.cycleId);
          const size = op.sizeId ? await storage.getSize(op.sizeId) : null;
          const sgr = op.sgrId ? await storage.getSgr(op.sgrId) : null;
          const lot = op.lotId ? await storage.getLot(op.lotId) : null;
          
          return {
            ...op,
            basket,
            cycle,
            size,
            sgr,
            lot
          };
        })
      );
      
      res.json(operationsWithDetails);
    } catch (error) {
      console.error("Error fetching operations:", error);
      res.status(500).json({ message: "Failed to fetch operations" });
    }
  });

  app.get("/api/operations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      const operation = await storage.getOperation(id);
      if (!operation) {
        return res.status(404).json({ message: "Operation not found" });
      }

      // Fetch related entities
      const basket = await storage.getBasket(operation.basketId);
      const cycle = await storage.getCycle(operation.cycleId);
      const size = operation.sizeId ? await storage.getSize(operation.sizeId) : null;
      const sgr = operation.sgrId ? await storage.getSgr(operation.sgrId) : null;
      const lot = operation.lotId ? await storage.getLot(operation.lotId) : null;
      
      res.json({
        ...operation,
        basket,
        cycle,
        size,
        sgr,
        lot
      });
    } catch (error) {
      console.error("Error fetching operation:", error);
      res.status(500).json({ message: "Failed to fetch operation" });
    }
  });

  app.get("/api/operations/basket/:basketId", async (req, res) => {
    try {
      const basketId = parseInt(req.params.basketId);
      if (isNaN(basketId)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      const operations = await storage.getOperationsByBasket(basketId);
      res.json(operations);
    } catch (error) {
      console.error("Error fetching operations by basket:", error);
      res.status(500).json({ message: "Failed to fetch operations by basket" });
    }
  });

  app.get("/api/operations/cycle/:cycleId", async (req, res) => {
    try {
      const cycleId = parseInt(req.params.cycleId);
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      const operations = await storage.getOperationsByCycle(cycleId);
      res.json(operations);
    } catch (error) {
      console.error("Error fetching operations by cycle:", error);
      res.status(500).json({ message: "Failed to fetch operations by cycle" });
    }
  });

  app.post("/api/operations", async (req, res) => {
    try {
      console.log("POST /api/operations - Request Body:", req.body);

      // Prima verifica se si tratta di un'operazione prima-attivazione che non richiede un cycleId
      if (req.body.type === 'prima-attivazione') {
        // Per prima-attivazione utilizziamo un validator senza controllo su cycleId
        const primaAttivSchema = insertOperationSchema.extend({
          date: z.coerce.date(),
          animalsPerKg: z.coerce.number().optional().nullable(),
          totalWeight: z.coerce.number().optional().nullable(),
          animalCount: z.coerce.number().optional().nullable(),
        }).safeParse(req.body);

        if (!primaAttivSchema.success) {
          const errorMessage = fromZodError(primaAttivSchema.error).message;
          console.error("Validation error for prima-attivazione:", errorMessage);
          return res.status(400).json({ message: errorMessage });
        }

        const { basketId, date } = primaAttivSchema.data;
        console.log("Validazione prima-attivazione completata per cesta:", basketId);

        // Check if the basket exists
        const basket = await storage.getBasket(basketId);
        if (!basket) {
          return res.status(404).json({ message: "Cestello non trovato" });
        }

        // Verifica che il cestello sia disponibile
        if (basket.state !== 'available') {
          return res.status(400).json({ message: "Il cestello deve essere disponibile per l'attivazione" });
        }

        const operation = await storage.createOperation(primaAttivSchema.data);
        return res.status(201).json(operation);
      } else {
        // Per le altre operazioni utilizziamo il validator completo
        const parsedData = operationSchema.safeParse(req.body);
        if (!parsedData.success) {
          const errorMessage = fromZodError(parsedData.error).message;
          console.error("Validation error for standard operation:", errorMessage);
          return res.status(400).json({ message: errorMessage });
        }

        const { basketId, cycleId, date, type } = parsedData.data;
        console.log("Validazione operazione standard completata:", { basketId, cycleId, type });

        // Check if the basket exists
        const basket = await storage.getBasket(basketId);
        if (!basket) {
          return res.status(404).json({ message: "Cestello non trovato" });
        }

        // Check if the cycle exists
        const cycle = await storage.getCycle(cycleId);
        if (!cycle) {
          return res.status(404).json({ message: "Ciclo non trovato" });
        }

        // Check if the cycle is active
        if (cycle.state !== 'active') {
          return res.status(400).json({ message: "Non è possibile aggiungere operazioni a un ciclo chiuso" });
        }

        // Check if the cycle belongs to the specified basket
        if (cycle.basketId !== basketId) {
          return res.status(400).json({ message: "Il ciclo specificato non appartiene a questo cestello" });
        }

        // Format date to YYYY-MM-DD for comparison
        const formattedDate = format(new Date(date), 'yyyy-MM-dd');

        // Check if there's already an operation for this basket on the given date
        const existingOperations = await storage.getOperationsByBasket(basketId);
        const operationOnSameDate = existingOperations.find(op => 
          format(new Date(op.date), 'yyyy-MM-dd') === formattedDate
        );

        if (operationOnSameDate) {
          return res.status(400).json({ 
            message: `Esiste già un'operazione per questo cestello in data ${formattedDate}` 
          });
        }
      }

      // If it's a "prima-attivazione" operation, check if it's the first operation in the cycle
      if (type === 'prima-attivazione') {
        const cycleOperations = await storage.getOperationsByCycle(cycleId);
        if (cycleOperations.length > 0) {
          return res.status(400).json({ 
            message: "Prima attivazione must be the first operation in a cycle" 
          });
        }
      }

      // If it's a cycle-closing operation (vendita or selezione-vendita), check if the cycle is already closed
      if (type === 'vendita' || type === 'selezione-vendita') {
        if (cycle.state === 'closed') {
          return res.status(400).json({ message: "Cannot add closing operation to an already closed cycle" });
        }
      }

      // Create the operation
      const newOperation = await storage.createOperation(parsedData.data);
      res.status(201).json(newOperation);
    } catch (error) {
      console.error("Error creating operation:", error);
      res.status(500).json({ message: "Failed to create operation" });
    }
  });

  // === Cycle routes ===
  app.get("/api/cycles", async (req, res) => {
    try {
      const cycles = await storage.getCycles();
      
      // Fetch baskets for each cycle
      const cyclesWithBaskets = await Promise.all(
        cycles.map(async (cycle) => {
          const basket = await storage.getBasket(cycle.basketId);
          return { ...cycle, basket };
        })
      );
      
      res.json(cyclesWithBaskets);
    } catch (error) {
      console.error("Error fetching cycles:", error);
      res.status(500).json({ message: "Failed to fetch cycles" });
    }
  });

  app.get("/api/cycles/active", async (req, res) => {
    try {
      const cycles = await storage.getActiveCycles();
      
      // Fetch baskets and latest operation for each cycle
      const activeCyclesWithDetails = await Promise.all(
        cycles.map(async (cycle) => {
          const basket = await storage.getBasket(cycle.basketId);
          const operations = await storage.getOperationsByCycle(cycle.id);
          
          // Sort operations by date (newest first) and get the latest one
          operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latestOperation = operations.length > 0 ? operations[0] : null;
          
          // Get the size from the latest operation
          let currentSize = null;
          if (latestOperation && latestOperation.sizeId) {
            currentSize = await storage.getSize(latestOperation.sizeId);
          }
          
          // Get the SGR from the latest operation
          let currentSgr = null;
          if (latestOperation && latestOperation.sgrId) {
            currentSgr = await storage.getSgr(latestOperation.sgrId);
          }
          
          return { 
            ...cycle, 
            basket, 
            latestOperation, 
            currentSize,
            currentSgr
          };
        })
      );
      
      res.json(activeCyclesWithDetails);
    } catch (error) {
      console.error("Error fetching active cycles:", error);
      res.status(500).json({ message: "Failed to fetch active cycles" });
    }
  });

  app.get("/api/cycles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      const cycle = await storage.getCycle(id);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }

      // Fetch related entities
      const basket = await storage.getBasket(cycle.basketId);
      const operations = await storage.getOperationsByCycle(id);
      
      res.json({
        ...cycle,
        basket,
        operations
      });
    } catch (error) {
      console.error("Error fetching cycle:", error);
      res.status(500).json({ message: "Failed to fetch cycle" });
    }
  });

  app.get("/api/cycles/basket/:basketId", async (req, res) => {
    try {
      const basketId = parseInt(req.params.basketId);
      if (isNaN(basketId)) {
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      const cycles = await storage.getCyclesByBasket(basketId);
      res.json(cycles);
    } catch (error) {
      console.error("Error fetching cycles by basket:", error);
      res.status(500).json({ message: "Failed to fetch cycles by basket" });
    }
  });

  app.post("/api/cycles", async (req, res) => {
    try {
      const parsedData = cycleSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const { basketId } = parsedData.data;

      // Check if the basket exists
      const basket = await storage.getBasket(basketId);
      if (!basket) {
        return res.status(404).json({ message: "Basket not found" });
      }

      // Check if the basket already has an active cycle
      if (basket.currentCycleId !== null) {
        return res.status(400).json({ 
          message: "This basket already has an active cycle. Close the current cycle before starting a new one." 
        });
      }

      // Create the cycle
      const newCycle = await storage.createCycle(parsedData.data);
      
      // Create prima-attivazione operation automatically
      const primaAttivazioneOperation = {
        date: parsedData.data.startDate,
        type: 'prima-attivazione' as typeof operationTypes[number],
        basketId,
        cycleId: newCycle.id,
        animalCount: null,
        totalWeight: null,
        animalsPerKg: null,
        sizeId: null,
        sgrId: null,
        lotId: null,
        notes: "Automatic prima attivazione operation"
      };
      
      await storage.createOperation(primaAttivazioneOperation);
      
      res.status(201).json(newCycle);
    } catch (error) {
      console.error("Error creating cycle:", error);
      res.status(500).json({ message: "Failed to create cycle" });
    }
  });

  app.post("/api/cycles/:id/close", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      const endDateSchema = z.object({
        endDate: z.coerce.date()
      });

      const parsedData = endDateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if the cycle exists
      const cycle = await storage.getCycle(id);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }

      // Check if the cycle is already closed
      if (cycle.state === 'closed') {
        return res.status(400).json({ message: "Cycle is already closed" });
      }

      // Close the cycle
      const updatedCycle = await storage.closeCycle(id, parsedData.data.endDate);
      
      // Also update the basket state
      if (updatedCycle) {
        await storage.updateBasket(updatedCycle.basketId, {
          state: "available",
          currentCycleId: null,
          nfcData: null
        });
      }
      
      res.json(updatedCycle);
    } catch (error) {
      console.error("Error closing cycle:", error);
      res.status(500).json({ message: "Failed to close cycle" });
    }
  });

  // === Size routes ===
  app.get("/api/sizes", async (req, res) => {
    try {
      const sizes = await storage.getSizes();
      res.json(sizes);
    } catch (error) {
      console.error("Error fetching sizes:", error);
      res.status(500).json({ message: "Failed to fetch sizes" });
    }
  });

  app.get("/api/sizes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }

      const size = await storage.getSize(id);
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.json(size);
    } catch (error) {
      console.error("Error fetching size:", error);
      res.status(500).json({ message: "Failed to fetch size" });
    }
  });

  app.post("/api/sizes", async (req, res) => {
    try {
      const parsedData = insertSizeSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if a size with the same code already exists
      const existingSize = await storage.getSizeByCode(parsedData.data.code);
      if (existingSize) {
        return res.status(400).json({ message: "A size with this code already exists" });
      }

      const newSize = await storage.createSize(parsedData.data);
      res.status(201).json(newSize);
    } catch (error) {
      console.error("Error creating size:", error);
      res.status(500).json({ message: "Failed to create size" });
    }
  });

  // === SGR routes ===
  app.get("/api/sgr", async (req, res) => {
    try {
      const sgrs = await storage.getSgrs();
      res.json(sgrs);
    } catch (error) {
      console.error("Error fetching SGRs:", error);
      res.status(500).json({ message: "Failed to fetch SGRs" });
    }
  });

  app.get("/api/sgr/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR ID" });
      }

      const sgr = await storage.getSgr(id);
      if (!sgr) {
        return res.status(404).json({ message: "SGR not found" });
      }

      res.json(sgr);
    } catch (error) {
      console.error("Error fetching SGR:", error);
      res.status(500).json({ message: "Failed to fetch SGR" });
    }
  });

  app.post("/api/sgr", async (req, res) => {
    try {
      const parsedData = insertSgrSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if a SGR for the same month already exists
      const existingSgr = await storage.getSgrByMonth(parsedData.data.month);
      if (existingSgr) {
        return res.status(400).json({ message: "A SGR entry for this month already exists" });
      }

      const newSgr = await storage.createSgr(parsedData.data);
      res.status(201).json(newSgr);
    } catch (error) {
      console.error("Error creating SGR:", error);
      res.status(500).json({ message: "Failed to create SGR" });
    }
  });

  // === Lot routes ===
  app.get("/api/lots", async (req, res) => {
    try {
      const lots = await storage.getLots();
      
      // Fetch size for each lot
      const lotsWithSizes = await Promise.all(
        lots.map(async (lot) => {
          const size = lot.sizeId ? await storage.getSize(lot.sizeId) : null;
          return { ...lot, size };
        })
      );
      
      res.json(lotsWithSizes);
    } catch (error) {
      console.error("Error fetching lots:", error);
      res.status(500).json({ message: "Failed to fetch lots" });
    }
  });

  app.get("/api/lots/active", async (req, res) => {
    try {
      const lots = await storage.getActiveLots();
      
      // Fetch size for each lot
      const lotsWithSizes = await Promise.all(
        lots.map(async (lot) => {
          const size = lot.sizeId ? await storage.getSize(lot.sizeId) : null;
          return { ...lot, size };
        })
      );
      
      res.json(lotsWithSizes);
    } catch (error) {
      console.error("Error fetching active lots:", error);
      res.status(500).json({ message: "Failed to fetch active lots" });
    }
  });

  app.get("/api/lots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      const lot = await storage.getLot(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      // Fetch related entities
      const size = lot.sizeId ? await storage.getSize(lot.sizeId) : null;
      
      res.json({
        ...lot,
        size
      });
    } catch (error) {
      console.error("Error fetching lot:", error);
      res.status(500).json({ message: "Failed to fetch lot" });
    }
  });

  app.post("/api/lots", async (req, res) => {
    try {
      const parsedData = lotSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if the size exists (if provided)
      if (parsedData.data.sizeId) {
        const size = await storage.getSize(parsedData.data.sizeId);
        if (!size) {
          return res.status(404).json({ message: "Size not found" });
        }
      }

      const newLot = await storage.createLot(parsedData.data);
      res.status(201).json(newLot);
    } catch (error) {
      console.error("Error creating lot:", error);
      res.status(500).json({ message: "Failed to create lot" });
    }
  });

  app.patch("/api/lots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lot ID" });
      }

      // Check if the lot exists
      const lot = await storage.getLot(id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }

      // Update the lot
      const updatedLot = await storage.updateLot(id, req.body);
      res.json(updatedLot);
    } catch (error) {
      console.error("Error updating lot:", error);
      res.status(500).json({ message: "Failed to update lot" });
    }
  });

  // === Statistics routes ===
  app.get("/api/statistics/growth/:cycleId", async (req, res) => {
    try {
      const cycleId = parseInt(req.params.cycleId);
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "Invalid cycle ID" });
      }

      // Check if the cycle exists
      const cycle = await storage.getCycle(cycleId);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }

      // Get all operations for this cycle
      const operations = await storage.getOperationsByCycle(cycleId);
      
      // Filter to only include 'misura' operations
      const measureOperations = operations.filter(op => op.type === 'misura');
      
      // Sort by date
      measureOperations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Format the growth data
      const growthData = measureOperations.map(op => ({
        date: format(new Date(op.date), 'yyyy-MM-dd'),
        animalCount: op.animalCount,
        totalWeight: op.totalWeight,
        averageWeight: op.averageWeight,
        animalsPerKg: op.animalsPerKg
      }));
      
      res.json({
        cycleId,
        growthData
      });
    } catch (error) {
      console.error("Error fetching growth statistics:", error);
      res.status(500).json({ message: "Failed to fetch growth statistics" });
    }
  });

  app.get("/api/statistics/cycles/comparison", async (req, res) => {
    try {
      // Get query parameters for cycle IDs to compare
      const cycleIdsParam = req.query.cycleIds as string;
      if (!cycleIdsParam) {
        return res.status(400).json({ message: "No cycle IDs provided for comparison" });
      }
      
      // Parse cycle IDs
      const cycleIds = cycleIdsParam.split(',').map(id => parseInt(id));
      if (cycleIds.some(isNaN)) {
        return res.status(400).json({ message: "Invalid cycle ID format" });
      }
      
      // Get comparison data for each cycle
      const comparisonData = await Promise.all(
        cycleIds.map(async (cycleId) => {
          // Check if the cycle exists
          const cycle = await storage.getCycle(cycleId);
          if (!cycle) {
            return null;
          }
          
          // Get all operations for this cycle
          const operations = await storage.getOperationsByCycle(cycleId);
          
          // Filter to only include 'misura' operations and sort by date
          const measureOperations = operations
            .filter(op => op.type === 'misura')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Calculate cycle duration (if closed)
          let duration = null;
          if (cycle.endDate) {
            const startDate = new Date(cycle.startDate);
            const endDate = new Date(cycle.endDate);
            duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          // Get growth data points
          const growthData = measureOperations.map(op => ({
            date: format(new Date(op.date), 'yyyy-MM-dd'),
            averageWeight: op.averageWeight,
            daysFromStart: Math.floor((new Date(op.date).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24))
          }));
          
          return {
            cycleId,
            startDate: format(new Date(cycle.startDate), 'yyyy-MM-dd'),
            endDate: cycle.endDate ? format(new Date(cycle.endDate), 'yyyy-MM-dd') : null,
            state: cycle.state,
            duration,
            growthData
          };
        })
      );
      
      // Filter out null entries (cycles that don't exist)
      const validComparisonData = comparisonData.filter(data => data !== null);
      
      res.json(validComparisonData);
    } catch (error) {
      console.error("Error fetching cycle comparison:", error);
      res.status(500).json({ message: "Failed to fetch cycle comparison" });
    }
  });

  // === FLUPSY routes ===
  app.get("/api/flupsys", async (req, res) => {
    try {
      const flupsys = await storage.getFlupsys();
      res.json(flupsys);
    } catch (error) {
      console.error("Error fetching FLUPSY units:", error);
      res.status(500).json({ message: "Failed to fetch FLUPSY units" });
    }
  });

  app.get("/api/flupsys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY not found" });
      }

      res.json(flupsy);
    } catch (error) {
      console.error("Error fetching FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch FLUPSY" });
    }
  });

  app.post("/api/flupsys", async (req, res) => {
    try {
      const parsedData = insertFlupsySchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if a FLUPSY with the same name already exists
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
  });

  app.get("/api/flupsys/:id/baskets", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      // Check if the FLUPSY exists
      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY not found" });
      }

      const baskets = await storage.getBasketsByFlupsy(id);
      res.json(baskets);
    } catch (error) {
      console.error("Error fetching baskets for FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch baskets for FLUPSY" });
    }
  });

  app.get("/api/flupsys/:id/cycles", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid FLUPSY ID" });
      }

      // Check if the FLUPSY exists
      const flupsy = await storage.getFlupsy(id);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY not found" });
      }

      const cycles = await storage.getCyclesByFlupsy(id);
      
      // Fetch baskets for each cycle
      const cyclesWithDetails = await Promise.all(
        cycles.map(async (cycle) => {
          const basket = await storage.getBasket(cycle.basketId);
          return { ...cycle, basket };
        })
      );
      
      res.json(cyclesWithDetails);
    } catch (error) {
      console.error("Error fetching cycles for FLUPSY:", error);
      res.status(500).json({ message: "Failed to fetch cycles for FLUPSY" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
