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
  sgrGiornalieriSchema,
  insertSgrGiornalieriSchema,
  lotSchema, 
  operationTypes
} from "@shared/schema";
import { format, addDays } from "date-fns";
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
          startDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
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
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            await storage.closeBasketPositionHistory(id, formattedDate);
          }
          
          // Create a new position history entry
          await storage.createBasketPositionHistory({
            basketId: id,
            flupsyId: flupsyId,
            row: parsedData.data.row,
            position: parsedData.data.position,
            startDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
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
      // Controlla se c'è un filtro per cycleId
      const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
      
      // Recupera le operazioni in base ai filtri
      let operations;
      if (cycleId) {
        console.log(`Ricerca operazioni per ciclo ID: ${cycleId}`);
        operations = await storage.getOperationsByCycle(cycleId);
      } else {
        operations = await storage.getOperations();
      }
      
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
        console.log("Elaborazione prima-attivazione");
        
        // Per prima-attivazione utilizziamo un validator senza controllo su cycleId
        const primaAttivSchema = z.object({
          date: z.coerce.date(),
          type: z.literal('prima-attivazione'),
          basketId: z.number(),
          sizeId: z.number().nullable().optional(),
          sgrId: z.number().nullable().optional(),
          lotId: z.number().nullable().optional(),
          animalCount: z.number().nullable().optional(),
          totalWeight: z.number().nullable().optional(),
          animalsPerKg: z.number().nullable().optional(),
          notes: z.string().nullable().optional()
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
        
        // Verifica che il cestello non abbia già un ciclo in corso
        if (basket.currentCycleId !== null) {
          return res.status(400).json({ message: "Il cestello ha già un ciclo in corso. Non è possibile registrare una nuova Prima Attivazione." });
        }
        
        // Crea un nuovo ciclo per questa cesta
        console.log("Creazione nuovo ciclo per prima-attivazione");
        
        // Formatta il codice del ciclo secondo le specifiche: cesta+flupsy+YYMM
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear().toString().substring(2);
        const cycleCode = `${basket.physicalNumber}-${basket.flupsyId}-${year}${month}`;
        console.log("Generato cycleCode:", cycleCode);
        
        const formattedDate = format(date, 'yyyy-MM-dd');
        const newCycle = await storage.createCycle({
          basketId: basketId,
          startDate: formattedDate,
        });
        
        console.log("Ciclo creato:", newCycle);
        
        // Aggiorna lo stato del cestello e il codice ciclo
        await storage.updateBasket(basketId, {
          state: 'active',
          currentCycleId: newCycle.id,
          cycleCode: cycleCode
        });
        
        // Crea l'operazione con il ciclo appena creato
        // Formatta la data nel formato corretto per il database
        const operationData = {
          ...primaAttivSchema.data,
          cycleId: newCycle.id,
          date: format(primaAttivSchema.data.date, 'yyyy-MM-dd')
        };
        
        console.log("Creazione operazione con dati:", operationData);
        
        const operation = await storage.createOperation(operationData);
        return res.status(201).json(operation);
      } else {
        // Per le altre operazioni utilizziamo il validator completo
        const parsedData = operationSchema.safeParse(req.body);
        if (!parsedData.success) {
          const errorMessage = fromZodError(parsedData.error).message;
          console.error("Validation error for standard operation:", errorMessage);
          return res.status(400).json({ message: errorMessage });
        }

        const opData = parsedData.data;
        const { basketId, cycleId, date, type } = opData;
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
          // Include the existing operation type in the error message
          const existingType = operationOnSameDate.type;
          const existingTypeLabel = existingType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Semplice messaggio di errore con solo l'informazione essenziale
          let message = `Non è possibile registrare più di un'operazione al giorno per lo stesso cestello.`;
          
          return res.status(400).json({ message });
        }
        // Se siamo arrivati qui, questa è un'operazione standard
        // Regole per le operazioni standard
          
        // If it's a "prima-attivazione" operation, check if it's the first operation in the cycle
        if (type === 'prima-attivazione') {
          const cycleOperations = await storage.getOperationsByCycle(cycleId);
          if (cycleOperations.length > 0) {
            return res.status(400).json({ 
              message: "Prima attivazione deve essere la prima operazione in un ciclo" 
            });
          }
        }

        // If it's a cycle-closing operation (vendita, selezione-vendita or cessazione), handle cycle closure
        if (type === 'vendita' || type === 'selezione-vendita' || type === 'cessazione') {
          const closingCycle = await storage.getCycle(cycleId);
          if (closingCycle && closingCycle.state === 'closed') {
            return res.status(400).json({ message: "Non è possibile aggiungere un'operazione di chiusura a un ciclo già chiuso" });
          }
          
          // Create the operation first
          const operationData = {
            ...parsedData.data,
            date: format(parsedData.data.date, 'yyyy-MM-dd')
          };
          const newOperation = await storage.createOperation(operationData);
          
          // Then close the cycle
          await storage.closeCycle(cycleId, format(date, 'yyyy-MM-dd'));
          
          // Update the basket state
          await storage.updateBasket(basketId, {
            state: 'available',
            currentCycleId: null,
            cycleCode: null
          });
          
          return res.status(201).json(newOperation);
        }

        // Create the operation - Formatta la data nel formato corretto per il database
        const operationData = {
          ...parsedData.data,
          date: format(parsedData.data.date, 'yyyy-MM-dd')
        };
        const newOperation = await storage.createOperation(operationData);
        res.status(201).json(newOperation);
      }
    } catch (error) {
      console.error("Error creating operation:", error);
      res.status(500).json({ message: "Failed to create operation" });
    }
  });

  app.delete("/api/operations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid operation ID" });
      }

      // Check if the operation exists
      const operation = await storage.getOperation(id);
      if (!operation) {
        return res.status(404).json({ message: "Operation not found" });
      }

      // Delete the operation
      const success = await storage.deleteOperation(id);
      if (success) {
        return res.status(200).json({ message: "Operation deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete operation" });
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      res.status(500).json({ message: "Failed to delete operation" });
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
    // Disabilitata la creazione manuale dei cicli
    return res.status(400).json({ 
      message: "La creazione manuale dei cicli è stata disabilitata. I cicli vengono creati automaticamente tramite le operazioni di 'prima-attivazione'." 
    });
  });

  app.post("/api/cycles/:id/close", async (req, res) => {
    // Disabilitata la chiusura manuale dei cicli
    return res.status(400).json({ 
      message: "La chiusura manuale dei cicli è stata disabilitata. I cicli vengono chiusi automaticamente tramite le operazioni di 'vendita', 'selezione per vendita' o 'cessazione'." 
    });
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
  
  app.patch("/api/sgr/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR ID" });
      }

      // Verify the SGR exists
      const sgr = await storage.getSgr(id);
      if (!sgr) {
        return res.status(404).json({ message: "SGR not found" });
      }
      
      // Parse and validate the update data
      const updateSchema = z.object({
        percentage: z.number().optional(),
        dailyPercentage: z.number().nullable().optional(),
        calculatedFromReal: z.boolean().nullable().optional()
      });

      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const updatedSgr = await storage.updateSgr(id, parsedData.data);
      res.json(updatedSgr);
    } catch (error) {
      console.error("Error updating SGR:", error);
      res.status(500).json({ message: "Failed to update SGR" });
    }
  });
  
  // === SGR Giornalieri routes ===
  app.get("/api/sgr-giornalieri", async (req, res) => {
    try {
      const sgrGiornalieri = await storage.getSgrGiornalieri();
      res.json(sgrGiornalieri);
    } catch (error) {
      console.error("Error fetching SGR giornalieri:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornalieri" });
    }
  });
  
  // Route per recuperare un record specifico di SgrGiornaliero per ID
  app.get("/api/sgr-giornalieri/by-id/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      const sgrGiornaliero = await storage.getSgrGiornaliero(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }

      res.json(sgrGiornaliero);
    } catch (error) {
      console.error("Error fetching SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornaliero" });
    }
  });
  
  // Route con parametro specifico "date-range"
  app.get("/api/sgr-giornalieri/date-range", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Both startDate and endDate are required" });
      }
      
      const sgrGiornalieri = await storage.getSgrGiornalieriByDateRange(
        new Date(startDate), 
        new Date(endDate)
      );
      
      res.json(sgrGiornalieri);
    } catch (error) {
      console.error("Error fetching SGR giornalieri by date range:", error);
      res.status(500).json({ message: "Failed to fetch SGR giornalieri by date range" });
    }
  });
  
  app.post("/api/sgr-giornalieri", async (req, res) => {
    try {
      const parsedData = sgrGiornalieriSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const newSgrGiornaliero = await storage.createSgrGiornaliero(parsedData.data);
      res.status(201).json(newSgrGiornaliero);
    } catch (error) {
      console.error("Error creating SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to create SGR giornaliero" });
    }
  });
  
  app.patch("/api/sgr-giornalieri/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      // Verify the SGR giornaliero exists
      const sgrGiornaliero = await storage.getSgrGiornaliero(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }
      
      // Parse and validate the update data
      const updateSchema = z.object({
        recordDate: z.coerce.date().optional(),
        temperature: z.number().nullable().optional(),
        pH: z.number().nullable().optional(),
        ammonia: z.number().nullable().optional(),
        oxygen: z.number().nullable().optional(),
        salinity: z.number().nullable().optional(),
        notes: z.string().nullable().optional()
      });

      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const updatedSgrGiornaliero = await storage.updateSgrGiornaliero(id, parsedData.data);
      res.json(updatedSgrGiornaliero);
    } catch (error) {
      console.error("Error updating SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to update SGR giornaliero" });
    }
  });
  
  app.delete("/api/sgr-giornalieri/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid SGR giornaliero ID" });
      }

      // Verify the SGR giornaliero exists
      const sgrGiornaliero = await storage.getSgrGiornaliero(id);
      if (!sgrGiornaliero) {
        return res.status(404).json({ message: "SGR giornaliero not found" });
      }
      
      const result = await storage.deleteSgrGiornaliero(id);
      if (result) {
        res.status(200).json({ message: "SGR giornaliero deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete SGR giornaliero" });
      }
    } catch (error) {
      console.error("Error deleting SGR giornaliero:", error);
      res.status(500).json({ message: "Failed to delete SGR giornaliero" });
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

      // Converti la data di arrivo nel formato corretto per PostgreSQL (YYYY-MM-DD)
      const arrivalDate = parsedData.data.arrivalDate instanceof Date 
        ? parsedData.data.arrivalDate
        : new Date(parsedData.data.arrivalDate);
      
      const formattedDate = arrivalDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
      const lotData = {
        ...parsedData.data,
        arrivalDate: formattedDate
      };
      const newLot = await storage.createLot(lotData);
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

  // Endpoint per le proiezioni di crescita
  app.get("/api/growth-prediction", async (req, res) => {
    try {
      const currentWeight = Number(req.query.currentWeight);
      const sgrPercentage = Number(req.query.sgrPercentage);
      const days = Number(req.query.days) || 60;
      const bestVariation = Number(req.query.bestVariation) || 20;
      const worstVariation = Number(req.query.worstVariation) || 30;
      
      if (isNaN(currentWeight) || isNaN(sgrPercentage)) {
        return res.status(400).json({ message: "currentWeight e sgrPercentage sono richiesti e devono essere numeri validi" });
      }
      
      const measurementDate = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const projections = await storage.calculateGrowthPrediction(
        currentWeight,
        measurementDate,
        days,
        sgrPercentage,
        { best: bestVariation, worst: worstVariation }
      );
      
      res.json(projections);
    } catch (error) {
      console.error("Error calculating growth prediction:", error);
      res.status(500).json({ message: "Failed to calculate growth prediction" });
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

  // Growth prediction endpoint - Generic version
  app.get("/api/growth-prediction", async (req, res) => {
    try {
      const currentWeight = parseInt(req.query.currentWeight as string);
      const sgrPercentage = parseFloat(req.query.sgrPercentage as string);
      const days = parseInt(req.query.days as string) || 60; // Default 60 days
      const bestVariation = parseFloat(req.query.bestVariation as string) || 20; // Default +20%
      const worstVariation = parseFloat(req.query.worstVariation as string) || 30; // Default -30%

      if (isNaN(currentWeight) || isNaN(sgrPercentage)) {
        return res.status(400).json({ 
          message: "currentWeight e sgrPercentage sono obbligatori e devono essere numeri validi" 
        });
      }

      // Genera i dati di previsione
      const today = new Date();
      const dataPoints = [];
      const dailySgr = sgrPercentage; // SGR è già un valore giornaliero percentuale
      
      // Aggiunta del punto iniziale
      dataPoints.push({
        date: today,
        weight: currentWeight,
        theoretical: currentWeight,
        best: currentWeight,
        worst: currentWeight
      });
      
      // Genera punti per ogni giorno nella proiezione
      for (let i = 1; i <= days; i++) {
        const date = addDays(today, i);
        
        // Calcolo pesi per i diversi scenari
        const dailyGrowthFactor = dailySgr / 100;
        const theoreticalWeight = currentWeight * Math.pow(1 + dailyGrowthFactor, i);
        const bestWeight = currentWeight * Math.pow(1 + dailyGrowthFactor * (1 + bestVariation/100), i);
        const worstWeight = currentWeight * Math.pow(1 + dailyGrowthFactor * (1 - worstVariation/100), i);
        
        dataPoints.push({
          date: date,
          weight: null, // Dato reale non disponibile per date future
          theoretical: Math.round(theoreticalWeight),
          best: Math.round(bestWeight),
          worst: Math.round(worstWeight)
        });
      }
      
      // Calcolo pesi finali per report
      const finalTheoreticalWeight = dataPoints[dataPoints.length - 1].theoretical;
      const finalBestWeight = dataPoints[dataPoints.length - 1].best;
      const finalWorstWeight = dataPoints[dataPoints.length - 1].worst;
      
      res.json({
        currentWeight,
        sgrPercentage,
        days,
        dailySgr,
        data: dataPoints,
        summary: {
          initialWeight: currentWeight,
          finalTheoreticalWeight,
          finalBestWeight,
          finalWorstWeight,
          theoreticalGrowthPercent: ((finalTheoreticalWeight - currentWeight) / currentWeight) * 100,
          bestGrowthPercent: ((finalBestWeight - currentWeight) / currentWeight) * 100,
          worstGrowthPercent: ((finalWorstWeight - currentWeight) / currentWeight) * 100
        }
      });
    } catch (error) {
      console.error("Errore nel calcolo delle previsioni di crescita:", error);
      res.status(500).json({ message: "Errore nel calcolo delle previsioni di crescita" });
    }
  });
  
  // Growth prediction endpoint for cycle - Uses actual cycle operations to calculate predictions
  app.get("/api/cycles/:id/growth-prediction", async (req, res) => {
    try {
      const cycleId = parseInt(req.params.id);
      if (isNaN(cycleId)) {
        return res.status(400).json({ message: "ID ciclo non valido" });
      }
      
      const days = parseInt(req.query.days as string) || 60; // Default 60 days
      const bestVariation = parseFloat(req.query.bestVariation as string) || 20; // Default +20%
      const worstVariation = parseFloat(req.query.worstVariation as string) || 30; // Default -30%
      
      // Recupera il ciclo
      const cycle = await storage.getCycle(cycleId);
      if (!cycle) {
        return res.status(404).json({ message: "Ciclo non trovato" });
      }
      
      // Ottieni le operazioni di tipo "Misura" per questo ciclo, ordinate per data
      const operations = await storage.getOperationsByCycle(cycleId);
      
      console.log(`DEBUG: Ciclo ID ${cycleId}, numero operazioni trovate: ${operations.length}`);
      operations.forEach(op => {
        console.log(`DEBUG: Operazione ID ${op.id}, tipo: ${op.type}, animalsPerKg: ${op.animalsPerKg}, date: ${op.date}`);
      });
      
      // Se non ci sono operazioni di misura, includiamo anche 'prima-attivazione'
      let measureOperations = operations
        .filter(op => op.type === "misura" && op.animalsPerKg !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      console.log(`DEBUG: Operazioni di misura trovate: ${measureOperations.length}`);
      
      // Se non ci sono operazioni di misura, usiamo la prima attivazione
      if (measureOperations.length === 0) {
        // Proviamo a usare la prima attivazione se disponibile
        const primaAttivazione = operations.find(op => op.type === "prima-attivazione" && op.animalsPerKg !== null);
        
        if (primaAttivazione) {
          console.log(`DEBUG: Nessuna misura trovata, uso prima-attivazione ID ${primaAttivazione.id}`);
          measureOperations = [primaAttivazione];
        } else {
          return res.status(400).json({ 
            message: "Nessuna operazione di misura o di prima attivazione trovata con dati validi per questo ciclo" 
          });
        }
      }
      
      // Calcola SGR attuale in base alle misurazioni reali
      const actualSgr = await storage.calculateActualSgr(measureOperations);
      
      // Ottieni l'ultima misurazione
      const lastMeasurement = measureOperations[measureOperations.length - 1];
      
      // Se non c'è un animalsPerKg, non possiamo fare previsioni
      if (!lastMeasurement.animalsPerKg) {
        return res.status(400).json({ 
          message: "L'ultima misurazione non ha un valore valido per animalsPerKg" 
        });
      }
      
      // Calcola il peso medio attuale
      // È preferibile utilizzare il campo averageWeight già calcolato dal database,
      // ma se non è disponibile, facciamo il calcolo basato su animalsPerKg
      let currentWeight = 0;
      
      if (lastMeasurement.averageWeight) {
        // Usa il campo averageWeight se disponibile (soluzione migliore)
        currentWeight = Math.round(lastMeasurement.averageWeight);
        console.log(`DEBUG: Usando campo averageWeight esistente: ${currentWeight} mg`);
      } else if (lastMeasurement.animalsPerKg && lastMeasurement.animalsPerKg > 0) {
        // Calcola da animalsPerKg come fallback
        currentWeight = Math.round(1000 / Number(lastMeasurement.animalsPerKg));
        console.log(`DEBUG: Calcolato peso da animalsPerKg: ${currentWeight} mg`);
      } else {
        console.log(`DEBUG: Nessun dato valido per calcolare il peso, impossibile fare previsioni accurate`);
      }
      
      // Ottiene l'SGR mensile corretto per il periodo (prende quello del database o usa quello calcolato)
      let sgrPercentage;
      const lastMeasurementDate = new Date(lastMeasurement.date);
      const month = format(lastMeasurementDate, 'MMMM').toLowerCase();
      
      // Cerca l'SGR per il mese dalla tabella SGR
      const monthSgr = await storage.getSgrByMonth(month);
      
      if (actualSgr !== null) {
        // Usa SGR reale calcolato
        sgrPercentage = actualSgr;
      } else if (monthSgr) {
        // Usa SGR teorico dal database
        sgrPercentage = monthSgr.percentage;
      } else {
        // Usa un valore predefinito
        sgrPercentage = 1; // 1% giornaliero
      }
      
      // Ottieni dati previsionali usando il storage
      const predictionData = await storage.calculateGrowthPrediction(
        currentWeight,
        lastMeasurementDate,
        days,
        sgrPercentage,
        { best: bestVariation, worst: worstVariation }
      );
      
      // Estendi con dati aggiuntivi
      predictionData.cycleInfo = {
        id: cycle.id,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        state: cycle.state
      };
      
      predictionData.measurements = measureOperations.map(op => ({
        date: op.date,
        animalsPerKg: op.animalsPerKg,
        averageWeight: op.animalsPerKg ? Math.round(1000 / op.animalsPerKg) : null
      }));
      
      res.json(predictionData);
    } catch (error) {
      console.error("Errore nel calcolo delle previsioni di crescita per il ciclo:", error);
      res.status(500).json({ message: "Errore nel calcolo delle previsioni di crescita per il ciclo" });
    }
  });

  // Route per azzerare operazioni e cicli
  app.post("/api/reset-operations", async (req, res) => {
    try {
      // Importiamo direttamente il client postgres invece di usare drizzle
      const { queryClient } = await import("./db");
      
      // Esegui le operazioni in una singola transazione
      await queryClient.query('BEGIN');
      
      try {
        // 1. Aggiorna i cestelli per rimuovere i cicli attivi
        await queryClient.query(`
          UPDATE baskets 
          SET current_cycle_id = NULL, 
              cycle_code = NULL, 
              state = 'available' 
          WHERE current_cycle_id IS NOT NULL
        `);
        
        // 2. Elimina le operazioni
        await queryClient.query('DELETE FROM operations');
        
        // 3. Elimina i cicli
        await queryClient.query('DELETE FROM cycles');
        
        // 4. Elimina la cronologia delle posizioni dei cestelli
        await queryClient.query('DELETE FROM basket_position_history');
        
        // 5. Resettiamo le sequenze degli ID
        await queryClient.query('ALTER SEQUENCE IF EXISTS operations_id_seq RESTART WITH 1');
        await queryClient.query('ALTER SEQUENCE IF EXISTS cycles_id_seq RESTART WITH 1');
        await queryClient.query('ALTER SEQUENCE IF EXISTS basket_position_history_id_seq RESTART WITH 1');
        
        // Commit della transazione
        await queryClient.query('COMMIT');
        
        res.status(200).json({ 
          success: true,
          message: "Dati azzerati con successo. Operazioni, cicli e posizioni eliminati."
        });
      } catch (error) {
        // Rollback in caso di errore
        await queryClient.query('ROLLBACK');
        console.error("Errore durante l'azzeramento dei dati:", error);
        throw error;
      }
    } catch (error) {
      console.error("Errore durante l'azzeramento dei dati operativi:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante l'azzeramento dei dati operativi",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
