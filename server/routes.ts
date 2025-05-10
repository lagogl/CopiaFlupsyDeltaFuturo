import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from 'path';
import fs from 'fs';
import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { 
  selections, 
  selectionSourceBaskets,
  selectionDestinationBaskets,
  insertUserSchema
} from "../shared/schema";
import { 
  getNotificationSettings, 
  updateNotificationSetting
} from "./controllers/notification-settings-controller";
import { 
  checkCyclesForTP3000 
} from "./controllers/growth-notification-handler";

// Importazione dei controller
import * as SelectionController from "./controllers/selection-controller";
import * as ScreeningController from "./controllers/screening-controller";
// WhatsApp controller rimosso
import * as EmailController from "./controllers/email-controller";
import * as TelegramController from "./controllers/telegram-controller";
import * as NotificationController from "./controllers/notification-controller";
import * as LotInventoryController from "./controllers/lot-inventory-controller";
import { EcoImpactController } from "./controllers/eco-impact-controller";
import * as SequenceController from "./controllers/sequence-controller";

// Importazione del router per le API esterne
// API esterne disabilitate
// import { registerExternalApiRoutes } from "./external-api-routes";
import { execFile } from 'child_process';
import { format, subDays } from 'date-fns';
import { 
  createDatabaseBackup, 
  restoreDatabaseFromBackup, 
  getAvailableBackups,
  getBackupFilePath,
  generateFullDatabaseDump,
  restoreDatabaseFromUploadedFile,
  deleteBackup
} from './database-service';
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
  operationTypes,
  mortalityRateSchema,
  insertMortalityRateSchema,
  targetSizeAnnotationSchema,
  insertTargetSizeAnnotationSchema,
  // Schemi per il modulo di vagliatura
  insertScreeningOperationSchema,
  insertScreeningSourceBasketSchema,
  insertScreeningDestinationBasketSchema,
  insertScreeningBasketHistorySchema,
  insertScreeningLotReferenceSchema,
  ScreeningOperation,
  ScreeningSourceBasket,
  ScreeningDestinationBasket,
  ScreeningBasketHistory,
  ScreeningLotReference,
  // Schemi per il modulo di selezione
  insertSelectionSchema,
  insertSelectionSourceBasketSchema,
  insertSelectionDestinationBasketSchema,
  insertSelectionBasketHistorySchema,
  insertSelectionLotReferenceSchema,
  Selection,
  SelectionSourceBasket,
  SelectionDestinationBasket,
  SelectionBasketHistory,
  SelectionLotReference
} from "@shared/schema";
import { addDays } from "date-fns";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import configureWebSocketServer from "./websocket";
import { implementDirectOperationRoute } from "./direct-operations";
import { implementSelectionRoutes } from "./selectionCancelHandler";
import { 
  getSelections, 
  getSelectionById, 
  createSelection, 
  getAvailablePositions, 
  getAllAvailablePositions,
  getSelectionStats,
  addSourceBaskets,
  addDestinationBaskets,
  getAvailableBaskets,
  removeSourceBasket,
  removeDestinationBasket,
  completeSelection
} from "./controllers/selection-controller";

// Preparazione per la gestione dei file di backup
const getBackupUploadDir = () => {
  const uploadDir = path.join(process.cwd(), 'uploads/backups');
  
  // Assicurati che la directory esista
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return uploadDir;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API esterne disabilitate - Aggiungi solo una risposta di status per evitare errori 401
  app.all("/api/external/*", (req, res) => {
    return res.status(503).json({
      success: false,
      message: "Le API esterne sono temporaneamente disabilitate per manutenzione",
      status: "maintenance",
      timestamp: new Date().toISOString(),
    });
  });
  
  // === Autenticazione routes ===
  app.post("/api/login", async (req, res) => {
    try {
      let { username, password } = req.body;
      
      // Pulizia dei dati di input
      if (username) username = username.trim();
      if (password) password = password.trim();
      
      // Log per debug
      console.log(`Tentativo di login - Username: '${username}', Password: ${password ? '******' : 'undefined'}`);
      
      if (!username || !password) {
        console.log("Login fallito: username o password mancanti");
        return res.status(400).json({ 
          success: false, 
          message: "Username e password sono richiesti" 
        });
      }
      
      // Verifica se l'utente esiste nel database
      console.log(`Verifica utente: '${username}'`);
      const foundUser = await storage.getUserByUsername(username);
      
      if (!foundUser) {
        console.log(`Utente '${username}' non trovato nel database`);
        return res.status(401).json({
          success: false,
          message: "Credenziali non valide"
        });
      }
      
      console.log(`Utente '${username}' trovato, verifico password`);
      console.log(`Password inserita: ${password.length} caratteri`);
      console.log(`Password nel DB: ${foundUser.password.length} caratteri`);
      
      // Verifica diretta della password per debugging
      if (foundUser.password === password) {
        console.log("Password corretta!");
        
        // Aggiorna ultimo login
        await storage.updateUserLastLogin(foundUser.id);
        
        // Crea un oggetto user senza la password per la risposta
        const userResponse = {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          language: foundUser.language,
          lastLogin: foundUser.lastLogin
        };
        
        console.log(`Login riuscito per l'utente: ${username}`);
        return res.json({
          success: true,
          user: userResponse
        });
      } else {
        console.log(`Password errata per l'utente: ${username}`);
        console.log(`Confronto diretto: '${password}' vs '${foundUser.password}'`);
        return res.status(401).json({
          success: false,
          message: "Credenziali non valide"
        });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante l'autenticazione"
      });
    }
  });
  
  // Endpoint per il logout
  app.post("/api/logout", async (req, res) => {
    try {
      // Qui potresti aggiungere logica per gestire la sessione se necessario
      return res.status(200).json({
        success: true,
        message: "Logout effettuato con successo"
      });
    } catch (error) {
      console.error("Errore durante il logout:", error);
      return res.status(500).json({
        success: false,
        message: "Errore durante il logout"
      });
    }
  });
  
  app.post("/api/register", async (req, res) => {
    try {
      // Validazione dei dati dell'utente
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: "Dati non validi",
          errors: validationResult.error.errors
        });
      }
      
      // Verifica se l'utente esiste già
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username già in uso"
        });
      }
      
      // Crea il nuovo utente
      const newUser = await storage.createUser(req.body);
      
      // Crea un oggetto user senza la password per la risposta
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        language: newUser.language
      };
      
      res.status(201).json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante la registrazione"
      });
    }
  });
  
  app.get("/api/users/current", async (req, res) => {
    // In una implementazione reale, qui dovresti verificare l'autenticazione
    // e restituire i dati dell'utente basandosi su session/JWT
    
    // Per questa versione semplificata, simuliamo la risposta
    res.json({
      success: false,
      message: "Non autenticato"
    });
  });
  
  // Registra la route diretta per le operazioni
  implementDirectOperationRoute(app);
  
  // === Sequence reset routes ===
  app.post("/api/sequences/reset", SequenceController.resetSequence);
  app.get("/api/sequences/info", SequenceController.getSequencesInfo);
  
  // === Basket routes ===
  app.get("/api/baskets", async (req, res) => {
    try {
      const baskets = await storage.getBaskets();
      
      // Ottieni i dettagli completi per ogni cesta
      const basketsWithDetails = await Promise.all(baskets.map(async (basket) => {
        // Ottieni il FLUPSY associato
        const flupsy = await storage.getFlupsy(basket.flupsyId);
        
        // Ottieni tutte le operazioni del cestello
        const operations = await storage.getOperationsByBasket(basket.id);
        
        // Ordina le operazioni per data (la più recente prima)
        const sortedOperations = operations.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        // Ultima operazione è la prima dopo l'ordinamento
        const lastOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
        
        // Ottieni la taglia corrente se presente nell'ultima operazione
        let size = null;
        if (lastOperation && lastOperation.sizeId) {
          size = await storage.getSize(lastOperation.sizeId);
        }
        
        // Ottieni il ciclo corrente se presente
        let currentCycle = null;
        if (basket.currentCycleId) {
          currentCycle = await storage.getCycle(basket.currentCycleId);
        }
        
        return {
          ...basket,
          flupsy: flupsy || null,
          flupsyName: flupsy ? flupsy.name : null,
          lastOperation: lastOperation ? {
            ...lastOperation,
            type: lastOperation.type, // Causale dell'operazione
            date: lastOperation.date, // Data dell'operazione
          } : null,
          size: size, // Taglia attuale
          currentCycle: currentCycle ? {
            ...currentCycle,
            startDate: currentCycle.startDate // Data di attivazione
          } : null
        };
      }));
      
      res.json(basketsWithDetails);
    } catch (error) {
      console.error("Error fetching baskets with details:", error);
      res.status(500).json({ message: "Failed to fetch baskets with details" });
    }
  });
  
  // Endpoint per ottenere ceste con dettagli completi dei FLUPSY
  app.get("/api/baskets/with-flupsy-details", async (req, res) => {
    try {
      const baskets = await storage.getBaskets();
      const flupsys = await storage.getFlupsys();
      
      // Arricchisce le ceste con i dettagli del FLUPSY
      const basketsWithFlupsyDetails = baskets.map(basket => {
        const flupsy = flupsys.find(f => f.id === basket.flupsyId);
        return {
          ...basket,
          flupsyDetails: flupsy || null
        };
      });
      
      res.json(basketsWithFlupsyDetails);
    } catch (error) {
      console.error("Error fetching baskets with flupsy details:", error);
      res.status(500).json({ message: "Failed to fetch baskets with flupsy details" });
    }
  });
  
  // Endpoint per ottenere tutti i dettagli di un cestello incluse le informazioni correlate
  app.get("/api/baskets/details/:id?", async (req, res) => {
    try {
      // Se viene fornito un ID nei parametri, utilizzalo
      let basketId: number | undefined;
      
      if (req.params.id) {
        basketId = parseInt(req.params.id);
      } else if (req.query.id) {
        // Altrimenti cerca l'ID nella query string
        basketId = parseInt(req.query.id as string);
      }
      
      // Se nessun ID è stato fornito, restituisci un errore
      if (!basketId || isNaN(basketId)) {
        return res.status(400).json({ message: "ID cestello non valido o mancante" });
      }
      
      // Ottieni il cestello di base
      const basket = await storage.getBasket(basketId);
      if (!basket) {
        return res.status(404).json({ message: "Cestello non trovato" });
      }
      
      // Ottieni il flupsy associato
      const flupsy = await storage.getFlupsy(basket.flupsyId);
      
      // Ottieni tutte le operazioni del cestello
      const operations = await storage.getOperationsByBasket(basketId);
      
      // Ordina le operazioni per data (la più recente prima)
      const sortedOperations = operations.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // Ultima operazione è la prima dopo l'ordinamento
      const lastOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
      
      // Ottieni il ciclo corrente se presente
      let currentCycle = null;
      if (basket.currentCycleId) {
        currentCycle = await storage.getCycle(basket.currentCycleId);
      }
      
      // Calcola la durata del ciclo in giorni
      let cycleDuration = null;
      if (currentCycle) {
        const startDate = new Date(currentCycle.startDate);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        cycleDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      // Ottieni la taglia corrente se presente nell'ultima operazione
      let size = null;
      if (lastOperation && lastOperation.sizeId) {
        size = await storage.getSize(lastOperation.sizeId);
      }
      
      // Ottieni il lotto associato all'ultima operazione se presente
      let lot = null;
      if (lastOperation && lastOperation.lotId) {
        lot = await storage.getLot(lastOperation.lotId);
      }
      
      // Calcola il tasso di crescita (SGR) se ci sono almeno due operazioni con misurazioni
      let growthRate = null;
      if (sortedOperations.length >= 2) {
        // Filtra le operazioni che hanno dati di peso
        const measurementOperations = sortedOperations.filter(op => 
          op.animalsPerKg !== null && op.averageWeight !== null
        );
        
        if (measurementOperations.length >= 2) {
          // Calcola lo SGR effettivo
          growthRate = await storage.calculateActualSgr(measurementOperations);
        }
      }
      
      // Ottieni la posizione corrente
      const currentPosition = await storage.getCurrentBasketPosition(basketId);
      
      // Componi i dati completi del cestello
      const basketDetails = {
        ...basket,
        flupsy,
        lastOperation,
        currentCycle,
        cycleDuration,
        size,
        lot,
        growthRate,
        operations: sortedOperations,
        currentPosition
      };
      
      res.json(basketDetails);
    } catch (error) {
      console.error("Error fetching basket details:", error);
      res.status(500).json({ message: "Errore nel recupero dei dettagli del cestello" });
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
        const basketState = existingBasket.state === 'active' ? 'attiva' : 'disponibile';
        
        return res.json({
          positionTaken: true,
          basket: existingBasket,
          message: `La posizione ${row}-${position} in ${flupsyName} è già occupata dalla cesta #${existingBasket.physicalNumber} (${basketState})`
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
  
  // Endpoint per ottenere la prima posizione libera in un FLUPSY
  app.get("/api/baskets/next-position/:flupsyId", async (req, res) => {
    try {
      const flupsyId = parseInt(req.params.flupsyId);
      const row = req.query.row as string; // Può essere "DX" o "SX"
      
      if (isNaN(flupsyId)) {
        return res.status(400).json({ message: "ID FLUPSY non valido" });
      }
      
      if (row && row !== "DX" && row !== "SX") {
        return res.status(400).json({ message: "Fila non valida. Utilizzare 'DX' o 'SX'" });
      }
      
      // Verifica se il FLUPSY esiste
      const flupsy = await storage.getFlupsy(flupsyId);
      if (!flupsy) {
        return res.status(404).json({ message: "FLUPSY non trovato" });
      }
      
      // Ottieni il numero massimo di posizioni per questo FLUPSY
      const maxPositions = flupsy.maxPositions || 10; // Default a 10 se non specificato
      
      // Ottieni tutte le ceste per questo FLUPSY
      // IMPORTANTE: dobbiamo considerare tutte le ceste esistenti nel FLUPSY, indipendentemente dal loro stato
      // perché occupano fisicamente una posizione anche se non sono attive
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      
      // Se è specificata una fila, filtra solo per quella fila
      const filteredBaskets = row 
        ? flupsyBaskets.filter(basket => basket.row === row)
        : flupsyBaskets;
      
      // Crea un array di posizioni occupate
      const occupiedPositions = new Map<string, number[]>();
      
      // Inizializza le posizioni occupate per entrambe le file o solo quella richiesta
      if (row) {
        occupiedPositions.set(row, []);
      } else {
        occupiedPositions.set("DX", []);
        occupiedPositions.set("SX", []);
      }
      
      // Popola le posizioni occupate
      filteredBaskets.forEach(basket => {
        if (basket.row && basket.position) {
          const positions = occupiedPositions.get(basket.row) || [];
          positions.push(basket.position);
          occupiedPositions.set(basket.row, positions);
        }
      });
      
      // Trova la prima posizione disponibile per ogni fila
      const availablePositions: { [key: string]: number } = {};
      
      for (const [currentRow, positions] of occupiedPositions.entries()) {
        let nextPosition = 1;
        while (positions.includes(nextPosition) && nextPosition <= maxPositions) {
          nextPosition++;
        }
        
        // Se abbiamo superato il massimo, non ci sono posizioni disponibili
        if (nextPosition > maxPositions) {
          availablePositions[currentRow] = -1; // -1 indica che non ci sono posizioni disponibili
        } else {
          availablePositions[currentRow] = nextPosition;
        }
      }
      
      res.json({ 
        maxPositions, 
        availablePositions
      });
    } catch (error) {
      console.error("Error getting next available position:", error);
      res.status(500).json({ message: "Errore nel calcolo della prossima posizione disponibile" });
    }
  });

  // Ottieni ceste disponibili per la selezione (IMPORTANTE: questa rotta deve venire prima di /api/baskets/:id)
  app.get("/api/baskets/available", getAvailableBaskets);

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

      const { flupsyId, physicalNumber, row, position } = parsedData.data;

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
      
      // Verifica se esiste già una cesta nella stessa posizione (se fornita)
      if (row && position) {
        const existingBasket = flupsyBaskets.find(basket => 
          basket.row === row && 
          basket.position === position
        );
        
        if (existingBasket) {
          const basketState = existingBasket.state === 'active' ? 'attiva' : 'disponibile';
          
          return res.status(400).json({
            message: `La posizione ${row}-${position} è già occupata dalla cesta #${existingBasket.physicalNumber} (${basketState})`,
            positionTaken: true,
            basket: existingBasket
          });
        }
      }

      // Create the basket
      const newBasket = await storage.createBasket(parsedData.data);
      
      // If basket has position data, record it in the position history
      if (parsedData.data.row && parsedData.data.position) {
        console.log("createBasketPositionHistory - Creo nuovo record:", {
          basketId: newBasket.id,
          flupsyId: newBasket.flupsyId,
          row: parsedData.data.row,
          position: parsedData.data.position,
          startDate: new Date().toISOString().split('T')[0],
          operationId: null
        });
        
        await storage.createBasketPositionHistory({
          basketId: newBasket.id,
          flupsyId: newBasket.flupsyId,
          row: parsedData.data.row,
          position: parsedData.data.position,
          startDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
          operationId: null
        });
      }
      
      // Broadcast basket creation event via WebSockets
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('basket_created', {
          basket: newBasket,
          message: `Nuovo cestello ${newBasket.physicalNumber} creato`
        });
      }
      
      res.status(201).json(newBasket);
    } catch (error) {
      console.error("Error creating basket:", error);
      res.status(500).json({ message: "Failed to create basket" });
    }
  });
  
  // Endpoint dedicato per lo spostamento dei cestelli
  app.post("/api/baskets/:id/move", async (req, res) => {
    try {
      console.log("===== ENDPOINT MOVE BASKET - INIZIO =====");
      console.log("Request body:", JSON.stringify(req.body));
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.log("ID cesta non valido:", req.params.id);
        return res.status(400).json({ message: "Invalid basket ID" });
      }

      console.log("Verifica esistenza cestello ID:", id);
      // Verify the basket exists
      const basket = await storage.getBasket(id);
      if (!basket) {
        console.log("Cestello non trovato con ID:", id);
        return res.status(404).json({ message: "Basket not found" });
      }
      console.log("Cestello trovato:", JSON.stringify(basket));
      
      // Parse and validate the update data
      const moveSchema = z.object({
        flupsyId: z.number(),
        row: z.string(),
        position: z.number(),
      });

      console.log("Validazione dati spostamento...");
      const parsedData = moveSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        console.log("Validazione fallita:", errorMessage);
        return res.status(400).json({ message: errorMessage });
      }
      
      const { flupsyId, row, position } = parsedData.data;
      
      console.log(`API - SPOSTAMENTO CESTELLO ${id} in flupsyId=${flupsyId}, row=${row}, position=${position}`);
      
      // Get all baskets for this FLUPSY
      console.log("Verifica conflitto posizione - recupero cestelli per FLUPSY:", flupsyId);
      const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
      console.log(`Trovati ${flupsyBaskets.length} cestelli nel FLUPSY ${flupsyId}`);
      
      // Check if there's already a different basket at this position
      const basketAtPosition = flupsyBaskets.find(b => 
        b.id !== id && 
        b.row === row && 
        b.position === position
      );
      
      if (basketAtPosition) {
        console.log("Posizione già occupata dal cestello:", basketAtPosition);
        // Returning information about the occupying basket to allow for a potential switch
        return res.status(200).json({
          positionOccupied: true,
          basketAtPosition: {
            id: basketAtPosition.id,
            physicalNumber: basketAtPosition.physicalNumber,
            flupsyId: basketAtPosition.flupsyId,
            row: basketAtPosition.row,
            position: basketAtPosition.position
          },
          message: `Esiste già una cesta (numero ${basketAtPosition.physicalNumber}) in questa posizione`
        });
      }
      
      console.log("Posizione libera, procedo con lo spostamento...");
      
      // Esegui l'intera operazione in una transazione
      try {
        // 1. Chiusura della posizione corrente se esiste
        console.log("Recupero posizione attuale per cestello:", id);
        const currentPosition = await storage.getCurrentBasketPosition(id);
        if (currentPosition) {
          console.log("Chiusura posizione corrente:", JSON.stringify(currentPosition));
          const currentDate = new Date();
          const formattedDate = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
          
          try {
            await storage.closeBasketPositionHistory(id, formattedDate);
            console.log("Posizione precedente chiusa con successo");
          } catch (closeError) {
            console.error("Errore durante la chiusura della posizione corrente:", closeError);
            throw new Error(`Errore durante la chiusura della posizione: ${(closeError as Error).message}`);
          }
        } else {
          console.log("Nessuna posizione attuale trovata per il cestello", id);
        }
        
        // 2. Creazione della nuova entry nella cronologia posizioni
        console.log("Creazione nuova posizione:", { basketId: id, flupsyId, row, position });
        let newPosition;
        try {
          newPosition = await storage.createBasketPositionHistory({
            basketId: id,
            flupsyId: flupsyId,
            row: row,
            position: position,
            startDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
            operationId: null
          });
          console.log("Nuova posizione creata:", JSON.stringify(newPosition));
        } catch (createPosError) {
          console.error("Errore durante la creazione della nuova posizione:", createPosError);
          throw new Error(`Errore durante la creazione della nuova posizione: ${(createPosError as Error).message}`);
        }
        
        // 3. Aggiornamento del record nel cestello
        const updateData = {
          flupsyId,
          row,
          position
        };
        
        let updatedBasket;
        try {
          console.log("Aggiornamento record cestello con nuova posizione:", JSON.stringify(updateData));
          updatedBasket = await storage.updateBasket(id, updateData);
          console.log("Cestello aggiornato (dati parziali):", updatedBasket ? JSON.stringify(updatedBasket) : "no data");
        } catch (updateError) {
          console.error("Errore durante l'aggiornamento del cestello:", updateError);
          throw new Error(`Errore durante l'aggiornamento del cestello: ${(updateError as Error).message}`);
        }
        
        // 4. Recupero del cestello completo aggiornato
        let completeBasket;
        try {
          console.log("Recupero dati completi cestello aggiornato...");
          completeBasket = await storage.getBasket(id);
          console.log("Basket spostato, dati completi:", completeBasket ? JSON.stringify(completeBasket) : "not found");
        } catch (getBasketError) {
          console.error("Errore durante il recupero del cestello aggiornato:", getBasketError);
          // Non fare fallire l'operazione, abbiamo già i dati parziali
          completeBasket = null;
        }
        
        // 5. Notifica WebSocket
        if (typeof (global as any).broadcastUpdate === 'function' && (completeBasket || updatedBasket)) {
          console.log("Invio notifica WebSocket per aggiornamento cestello");
          const basketForBroadcast = completeBasket || updatedBasket;
          (global as any).broadcastUpdate('basket_updated', {
            basket: basketForBroadcast,
            message: `Cestello ${basketForBroadcast.physicalNumber} spostato`
          });
        }
        
        // 6. Risposta al client
        const finalBasket = completeBasket || updatedBasket;
        console.log("Invio risposta al client con cestello aggiornato");
        if (!finalBasket) {
          // Se per qualche motivo abbiamo perso il cestello, invia comunque una risposta di successo
          return res.json({ 
            success: true, 
            message: "Cestello spostato con successo ma i dati completi non sono disponibili",
            basketId: id,
            flupsyId,
            row,
            position
          });
        }
        
        res.json(finalBasket);
        console.log("===== ENDPOINT MOVE BASKET - COMPLETATO CON SUCCESSO =====");
      } catch (dbError) {
        console.error("Database error during basket move:", dbError);
        console.log("===== ENDPOINT MOVE BASKET - FALLITO (DB ERROR) =====");
        throw new Error(`Errore durante l'aggiornamento del database: ${(dbError as Error).message}`);
      }
    } catch (error) {
      console.error("Error moving basket:", error);
      console.log("===== ENDPOINT MOVE BASKET - FALLITO (GENERAL ERROR) =====");
      res.status(500).json({ message: `Failed to move basket: ${(error as Error).message}` });
    }
  });
  
  // Endpoint per lo scambio di posizione tra cestelli
  app.post("/api/baskets/switch-positions", async (req, res) => {
    try {
      // Parse and validate the update data
      const switchSchema = z.object({
        basket1Id: z.number(),
        basket2Id: z.number(),
        flupsyId1: z.number(),  // FLUPSY ID per il cestello 1
        flupsyId2: z.number(),  // FLUPSY ID per il cestello 2
        position1Row: z.string(),
        position1Number: z.number(),
        position2Row: z.string(),
        position2Number: z.number()
      });

      const parsedData = switchSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const { 
        basket1Id, 
        basket2Id, 
        flupsyId1,  // Usa FLUPSY ID separati per ogni cestello
        flupsyId2, 
        position1Row, 
        position1Number, 
        position2Row, 
        position2Number 
      } = parsedData.data;
      
      console.log(`API - SWITCH CESTELLI: Cestello ${basket1Id} (FLUPSY ${flupsyId1}) <-> Cestello ${basket2Id} (FLUPSY ${flupsyId2})`);
      
      // Verifica che entrambi i cestelli esistano
      const basket1 = await storage.getBasket(basket1Id);
      if (!basket1) {
        return res.status(404).json({ message: "Basket 1 not found" });
      }
      
      const basket2 = await storage.getBasket(basket2Id);
      if (!basket2) {
        return res.status(404).json({ message: "Basket 2 not found" });
      }
      
      // STEP 1: Sposta il cestello 2 in una posizione temporanea (null)
      // Prima chiudi la cronologia di posizione attuale
      const currentPosition2 = await storage.getCurrentBasketPosition(basket2Id);
      if (currentPosition2) {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        await storage.closeBasketPositionHistory(basket2Id, formattedDate);
      }
      
      // Aggiorna il cestello 2 con posizione temporanea null ma mantieni il flupsyId originale
      await storage.updateBasket(basket2Id, {
        row: null,
        position: null
      });
      
      // STEP 2: Sposta il cestello 1 nella posizione che era del cestello 2
      // Prima chiudi la cronologia di posizione attuale
      const currentPosition1 = await storage.getCurrentBasketPosition(basket1Id);
      if (currentPosition1) {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        await storage.closeBasketPositionHistory(basket1Id, formattedDate);
      }
      
      // Crea una nuova voce di cronologia posizione per il cestello 1
      await storage.createBasketPositionHistory({
        basketId: basket1Id,
        flupsyId: flupsyId2,  // Usa il FLUPSY ID del cestello 2
        row: position2Row,
        position: position2Number,
        startDate: new Date().toISOString().split('T')[0],
        operationId: null
      });
      
      // Aggiorna il cestello 1 con la posizione e il FLUPSY del cestello 2
      await storage.updateBasket(basket1Id, {
        flupsyId: flupsyId2,  // Usa il FLUPSY ID del cestello 2
        row: position2Row,
        position: position2Number
      });
      
      // STEP 3: Sposta il cestello 2 nella posizione originale del cestello 1
      // Crea una nuova voce di cronologia posizione per il cestello 2
      await storage.createBasketPositionHistory({
        basketId: basket2Id,
        flupsyId: flupsyId1,  // Usa il FLUPSY ID del cestello 1
        row: position1Row,
        position: position1Number,
        startDate: new Date().toISOString().split('T')[0],
        operationId: null
      });
      
      // Aggiorna il cestello 2 con la posizione e il FLUPSY originali del cestello 1
      await storage.updateBasket(basket2Id, {
        flupsyId: flupsyId1,  // Usa il FLUPSY ID del cestello 1
        row: position1Row,
        position: position1Number
      });
      
      // Ottieni i cestelli aggiornati completi
      const updatedBasket1 = await storage.getBasket(basket1Id);
      const updatedBasket2 = await storage.getBasket(basket2Id);
      
      console.log("Switch completato con successo:", {
        basket1: updatedBasket1,
        basket2: updatedBasket2
      });
      
      // Broadcast basket update events via WebSockets
      if (typeof (global as any).broadcastUpdate === 'function') {
        if (updatedBasket1) {
          (global as any).broadcastUpdate('basket_updated', {
            basket: updatedBasket1,
            message: `Cestello ${updatedBasket1.physicalNumber} spostato`
          });
        }
        
        if (updatedBasket2) {
          (global as any).broadcastUpdate('basket_updated', {
            basket: updatedBasket2,
            message: `Cestello ${updatedBasket2.physicalNumber} spostato`
          });
        }
      }
      
      // Restituisci i cestelli completi al client
      res.json({
        basket1: updatedBasket1,
        basket2: updatedBasket2,
        message: "Switch completato con successo"
      });
      
    } catch (error) {
      console.error("Error switching basket positions:", error);
      res.status(500).json({ message: "Failed to switch basket positions" });
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
      
      // Verifica se il cestello ha un ciclo attivo
      const hasActiveCycle = basket.currentCycleId !== null;
      
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
      
      // Se il cestello non è attivo e si sta cercando di cambiare la posizione
      if (!hasActiveCycle && 
          ((parsedData.data.row !== undefined && parsedData.data.row !== basket.row) || 
           (parsedData.data.position !== undefined && parsedData.data.position !== basket.position))) {
        return res.status(400).json({ 
          message: "Impossibile cambiare la posizione di un cestello non attivo. Solo i cestelli con ciclo attivo possono essere riposizionati." 
        });
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
            // Se viene richiesta un'operazione da frontend, restituiamo informazioni
            // sul cestello occupante per consentire uno switch
            return res.status(200).json({
              positionOccupied: true,
              basketAtPosition: {
                id: basketAtPosition.id,
                physicalNumber: basketAtPosition.physicalNumber,
                flupsyId: basketAtPosition.flupsyId,
                row: basketAtPosition.row,
                position: basketAtPosition.position
              },
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
      
      // Assicuriamoci che vengano aggiornati tutti i dati di posizione e flupsyId
      // quando vengono specificati entrambi row e position
      const updateData = { ...parsedData.data };
      
      // Se è un'operazione di spostamento e flupsyId è nel corpo della richiesta,
      // assicuriamoci che venga impostato nel database
      if (parsedData.data.row && parsedData.data.position && parsedData.data.flupsyId) {
        console.log(`Aggiornamento basket ${id} con flupsyId ${parsedData.data.flupsyId}, posizione: ${parsedData.data.row}-${parsedData.data.position}`);
      }
      
      // Update the basket
      const updatedBasket = await storage.updateBasket(id, updateData);
      
      // Ottieni il cestello aggiornato completo per assicurarci di avere tutti i dati
      const completeBasket = await storage.getBasket(id);
      
      // Logging aggiuntivo per debug
      console.log("Basket aggiornato:", completeBasket);
      
      // Broadcast basket update event via WebSockets
      if (typeof (global as any).broadcastUpdate === 'function' && completeBasket) {
        (global as any).broadcastUpdate('basket_updated', {
          basket: completeBasket,
          message: `Cestello ${completeBasket.physicalNumber} aggiornato`
        });
      }
      
      // Restituisci il cestello completo al client
      res.json(completeBasket || updatedBasket);
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
      
      // Importa le utilità di Drizzle e le tabelle dello schema
      const { selectionLotReferences } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      // Fetch related entities
      const operationsWithDetails = await Promise.all(
        operations.map(async (op) => {
          const basket = await storage.getBasket(op.basketId);
          const cycle = await storage.getCycle(op.cycleId);
          const size = op.sizeId ? await storage.getSize(op.sizeId) : null;
          const sgr = op.sgrId ? await storage.getSgr(op.sgrId) : null;
          const lot = op.lotId ? await storage.getLot(op.lotId) : null;
          
          // Per operazioni di tipo "prima-attivazione-da-vagliatura", controlla se hanno lotti multipli
          let additionalLots = [];
          let hasMultipleLots = false;
          
          if (op.type === 'prima-attivazione-da-vagliatura' && op.basketId) {
            try {
              // Cerca riferimenti ai lotti nella tabella selectionLotReferences
              const lotRefs = await db.select().from(selectionLotReferences)
                .where(eq(selectionLotReferences.destinationBasketId, op.basketId));
              
              if (lotRefs && lotRefs.length > 1) {
                hasMultipleLots = true;
                // Per ogni riferimento, escludi quello già rappresentato dal lotId principale
                for (const ref of lotRefs) {
                  if (ref.lotId && (!op.lotId || ref.lotId !== op.lotId)) {
                    const additionalLot = await storage.getLot(ref.lotId);
                    if (additionalLot) {
                      additionalLots.push(additionalLot);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Errore nel recupero dei riferimenti ai lotti per operazione ${op.id}:`, error);
            }
          }
          
          return {
            ...op,
            basket,
            cycle,
            size,
            sgr,
            lot,
            // Aggiungi informazioni sui lotti multipli
            hasMultipleLots,
            additionalLots: additionalLots.length > 0 ? additionalLots : undefined
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
      console.log("===== INIZIO ENDPOINT POST /api/operations =====");
      console.log("POST /api/operations - Request Body:", JSON.stringify(req.body, null, 2));

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
          averageWeight: z.number().nullable().optional(),
          notes: z.string().nullable().optional()
        }).safeParse(req.body);
        
        console.log("VALIDAZIONE PRIMA ATTIVAZIONE - parsed:", JSON.stringify(primaAttivSchema, null, 2));

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
        
        console.log("CREAZIONE OPERAZIONE PRIMA-ATTIVAZIONE - Dati:", JSON.stringify(operationData, null, 2));
        
        try {
          const operation = await storage.createOperation(operationData);
          console.log("OPERAZIONE PRIMA-ATTIVAZIONE CREATA CON SUCCESSO:", JSON.stringify(operation, null, 2));
          
          // Broadcast operation created event via WebSockets
          if (typeof (global as any).broadcastUpdate === 'function') {
            console.log("Invio notifica WebSocket per nuova operazione");
            (global as any).broadcastUpdate('operation_created', {
              operation: operation,
              message: `Nuova operazione di tipo ${operation.type} registrata`
            });
            
            (global as any).broadcastUpdate('cycle_created', {
              cycle: newCycle,
              basketId: basketId,
              message: `Nuovo ciclo ${newCycle.id} creato per il cestello ${basketId}`
            });
          }
          
          console.log("===== FINE ENDPOINT POST /api/operations (prima-attivazione) - SUCCESSO =====");
          return res.status(201).json(operation);
        } catch (error) {
          console.error("ERRORE DURANTE CREAZIONE OPERAZIONE PRIMA-ATTIVAZIONE:", error);
          return res.status(500).json({ 
            message: `Errore durante la creazione dell'operazione di prima attivazione: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
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
          
          // Messaggio di errore dettagliato per operazioni nella stessa data
          let message = `Per ogni cesta è consentita una sola operazione al giorno. Per la data selezionata esiste già un'operazione registrata.`;
          
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
            date: format(parsedData.data.date, 'yyyy-MM-dd'),
            // Manteniamo il conteggio originale degli animali (inclusi i morti)
            animalCount: parsedData.data.animalCount
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
          
          // Broadcast operation and cycle closure events via WebSockets
          if (typeof (global as any).broadcastUpdate === 'function') {
            (global as any).broadcastUpdate('operation_created', {
              operation: newOperation,
              message: `Nuova operazione di tipo ${newOperation.type} registrata`
            });
            
            (global as any).broadcastUpdate('cycle_closed', {
              cycleId,
              basketId,
              message: `Ciclo ${cycleId} chiuso per il cestello ${basketId}`
            });
          }
          
          return res.status(201).json(newOperation);
        }

        // Create the operation - Formatta la data nel formato corretto per il database
        const operationData = {
          ...parsedData.data,
          date: format(parsedData.data.date, 'yyyy-MM-dd'),
          // Manteniamo il conteggio originale degli animali (inclusi i morti)
          animalCount: parsedData.data.animalCount
        };
        
        console.log("CREAZIONE OPERAZIONE STANDARD - Dati:", JSON.stringify(operationData, null, 2));
        
        try {
          const newOperation = await storage.createOperation(operationData);
          console.log("OPERAZIONE CREATA CON SUCCESSO:", JSON.stringify(newOperation, null, 2));
          
          // Broadcast operation created event via WebSockets
          if (typeof (global as any).broadcastUpdate === 'function') {
            console.log("Invio notifica WebSocket per nuova operazione");
            (global as any).broadcastUpdate('operation_created', {
              operation: newOperation,
              message: `Nuova operazione di tipo ${newOperation.type} registrata`
            });
          }
          
          console.log("===== FINE ENDPOINT POST /api/operations - SUCCESSO =====");
          return res.status(201).json(newOperation);
        } catch (error) {
          console.error("ERRORE DURANTE CREAZIONE OPERAZIONE:", error);
          return res.status(500).json({ 
            message: `Errore durante la creazione dell'operazione: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
      }
    } catch (error) {
      console.error("Error creating operation:", error);
      res.status(500).json({ message: "Failed to create operation" });
    }
  });

  app.patch("/api/operations/:id", async (req, res) => {
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

      // Assicurati che tutti i campi numerici siano numeri
      const updateData = { ...req.body };
      
      if (updateData.animalCount) updateData.animalCount = Number(updateData.animalCount);
      if (updateData.totalWeight) updateData.totalWeight = Number(updateData.totalWeight);
      if (updateData.animalsPerKg) updateData.animalsPerKg = Number(updateData.animalsPerKg);
      if (updateData.deadCount) updateData.deadCount = Number(updateData.deadCount);
      if (updateData.mortalityRate) updateData.mortalityRate = Number(updateData.mortalityRate);
      
      // Conserva il tipo originale dell'operazione
      const operationType = operation.type;
      
      // Verifica speciale per operazioni di prima-attivazione
      if (operationType === 'prima-attivazione') {
        console.log("Verifica delle protezioni per modifiche a operazione di prima-attivazione");
        
        // Protezione campi critici per prima-attivazione
        const protectedFields = ['type', 'basketId', 'cycleId', 'lotId'];
        const changedProtectedFields = [];
        
        // Verifica se ci sono tentativi di modifica di campi protetti
        for (const field of protectedFields) {
          if (updateData[field] !== undefined && updateData[field] !== operation[field]) {
            changedProtectedFields.push(field);
            // Ripristina il valore originale per garantire l'integrità
            updateData[field] = operation[field];
            console.log(`Protetto campo ${field} da modifica non consentita (tentativo di cambio da ${operation[field]} a ${updateData[field]})`);
          }
        }
        
        // Se ci sono stati tentativi di modifica di campi protetti, avvisa l'utente
        if (changedProtectedFields.length > 0) {
          console.warn(`Tentativo di modifica di campi protetti in un'operazione di prima-attivazione: ${changedProtectedFields.join(', ')}`);
          // Continua comunque l'aggiornamento con i campi protetti ripristinati ai valori originali
        }
      } else {
        // Per altri tipi di operazione, solamente proteggi il tipo
        if (updateData.type !== undefined && updateData.type !== operationType) {
          console.warn(`Tentativo di modifica del tipo operazione da ${operationType} a ${updateData.type} - Non permesso`);
          updateData.type = operationType;
        }
      }
      
      // Prevenzione errore di vincolo not-null per cycleId
      if (updateData.cycleId === null && operation.cycleId) {
        console.log(`Mantengo il cycleId originale (${operation.cycleId}) per prevenire violazione di vincolo not-null`);
        updateData.cycleId = operation.cycleId;
      }
      
      // Log dei dati di aggiornamento
      console.log(`Aggiornamento operazione ${id} di tipo ${operationType}:`, JSON.stringify(updateData, null, 2));
      
      // Update the operation
      const updatedOperation = await storage.updateOperation(id, updateData);
      
      // Broadcast operation update event via WebSockets
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('operation_updated', {
          operation: updatedOperation,
          message: `Operazione ${id} aggiornata`
        });
      }
      
      res.json(updatedOperation);
    } catch (error) {
      console.error("Error updating operation:", error);
      res.status(500).json({ message: `Failed to update operation: ${error instanceof Error ? error.message : String(error)}` });
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

      console.log(`Richiesta eliminazione operazione ID: ${id}, tipo: ${operation.type}`);
      
      // Verifica se è un'operazione di prima-attivazione
      if (operation.type === 'prima-attivazione') {
        console.log(`ATTENZIONE: L'operazione ID: ${id} è una prima-attivazione`);
        console.log(`La cancellazione di questa operazione comporterà l'eliminazione del ciclo associato ID: ${operation.cycleId}`);
        console.log(`e di tutte le operazioni correlate a questo ciclo.`);
      }

      // Delete the operation con cascade handling
      const success = await storage.deleteOperation(id);
      
      if (success) {
        if (operation.type === 'prima-attivazione') {
          // Notifica il frontend che c'è stata una cancellazione a cascata
          if (req.app.locals.webSocketServer) {
            req.app.locals.webSocketServer.broadcastMessage('operation-cascade-delete', {
              operationId: id,
              cycleId: operation.cycleId,
              type: operation.type,
              message: "Operazione e ciclo associato eliminati con successo"
            });
          }
          return res.status(200).json({
            message: "Operazione e ciclo associato eliminati con successo",
            cascadeDelete: true,
            operationType: operation.type,
            cycleId: operation.cycleId
          });
        } else {
          // Notifica il frontend che c'è stata una cancellazione
          if (req.app.locals.webSocketServer) {
            req.app.locals.webSocketServer.broadcastMessage('operation-delete', {
              operationId: id,
              type: operation.type
            });
          }
          return res.status(200).json({ message: "Operation deleted successfully" });
        }
      } else {
        return res.status(500).json({ message: "Failed to delete operation" });
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      res.status(500).json({ 
        message: "Failed to delete operation", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // === Diario di Bordo API routes ===
  
  // API - Ottieni giacenza alla data (totale fino al giorno precedente alla data richiesta)
  app.get("/api/diario/giacenza", async (req, res) => {
    try {
      const date = req.query.date as string;
      
      console.log('API giacenza - Data richiesta:', date);
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      // La data richiesta è la data per cui vogliamo calcolare la giacenza
      const requestDate = date;
            
      // Approccio ottimizzato in JavaScript invece che in SQL
      // Prima otteniamo i cicli attivi alla data richiesta
      const cicliAttiviQuery = await db.execute(sql`
        SELECT id AS cycle_id
        FROM cycles
        WHERE start_date <= ${requestDate}
        AND (
          (state = 'active' AND (end_date IS NULL OR end_date > ${requestDate}))
          OR (state = 'closed' AND end_date = ${requestDate})
        )
      `);
      
      console.log(`Cicli attivi trovati: ${cicliAttiviQuery.length}`);
      
      // Creiamo un oggetto per tenere traccia dei totali per taglia
      const totaliPerTaglia = {};
      
      // Per ogni ciclo, otteniamo l'ultima operazione
      for (const ciclo of cicliAttiviQuery) {
        const cycleId = ciclo.cycle_id;
        
        // Query l'ultima operazione per questo ciclo
        const operazioneQuery = await db.execute(sql`
          SELECT o.animal_count, o.size_id, s.code AS size_code
          FROM operations o
          LEFT JOIN sizes s ON o.size_id = s.id
          WHERE o.cycle_id = ${cycleId}
            AND o.date <= ${requestDate}
            AND o.animal_count IS NOT NULL
          ORDER BY o.date DESC, o.id DESC
          LIMIT 1
        `);
        
        if (operazioneQuery.length > 0) {
          const operazione = operazioneQuery[0];
          const animalCount = parseInt(operazione.animal_count);
          
          // Determina la taglia
          let sizeCode = operazione.size_code;
          
          // Se l'operazione non ha una taglia specificata (size_id è NULL)
          if (!operazione.size_id) {
            // Trova operazioni precedenti con taglia specificata nello stesso ciclo
            const tagliaQuery = await db.execute(sql`
              SELECT s.code
              FROM operations o
              JOIN sizes s ON o.size_id = s.id
              WHERE o.cycle_id = ${cycleId}
                AND o.date <= ${requestDate}
                AND o.size_id IS NOT NULL
              ORDER BY o.date DESC, o.id DESC
              LIMIT 1
            `);
            
            if (tagliaQuery.length > 0) {
              sizeCode = tagliaQuery[0].code;
            } else {
              sizeCode = 'Non specificata';
            }
          }
          
          // Se siamo arrivati qui, aggiungiamo al conteggio per questa taglia
          if (!sizeCode) sizeCode = 'Non specificata';
          
          if (!totaliPerTaglia[sizeCode]) {
            totaliPerTaglia[sizeCode] = 0;
          }
          
          totaliPerTaglia[sizeCode] += animalCount;
        }
      }
      
      // Trasforma i dati nel formato di risposta
      const dettaglioTaglie = [];
      let totaleGiacenza = 0;
      
      for (const [taglia, quantita] of Object.entries(totaliPerTaglia)) {
        const quantitaNum = parseInt(String(quantita));
        totaleGiacenza += quantitaNum;
        dettaglioTaglie.push({
          taglia,
          quantita: quantitaNum
        });
      }
      
      const risultato = {
        totale_giacenza: totaleGiacenza,
        dettaglio_taglie: dettaglioTaglie
      };
      
      console.log('API giacenza - Risultati:', risultato);
      
      return res.json(risultato);
    } catch (error) {
      console.error('Errore nell\'API giacenza:', error);
      return res.status(500).json({ error: 'Errore nel calcolo della giacenza' });
    }
  });
  
  // API - Ottieni operazioni per data
  app.get("/api/diario/operations-by-date", async (req, res) => {
    try {
      const date = req.query.date as string;
      
      console.log('API operazioni per data - Data richiesta:', date);
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      // Query completa con join per ottenere tutti i dettagli delle operazioni per una data specifica
      // e con gestione delle taglie ereditate dalle operazioni precedenti
      const operations = await db.execute(sql`
        WITH ops AS (
          SELECT 
            o.id, o.date, o.type, o.notes, o.basket_id, o.cycle_id, o.size_id, 
            o.animal_count, o.animals_per_kg,
            b.physical_number AS basket_number, b.flupsy_id,
            f.name AS flupsy_name,
            CASE 
              WHEN o.size_id IS NOT NULL THEN s.code
              ELSE NULL
            END AS direct_size_code,
            s.name AS size_name
          FROM operations o
          LEFT JOIN baskets b ON o.basket_id = b.id
          LEFT JOIN flupsys f ON b.flupsy_id = f.id
          LEFT JOIN sizes s ON o.size_id = s.id
          WHERE o.date::text = ${date}
        )
        SELECT 
          ops.*,
          COALESCE(
            ops.direct_size_code,
            (
              SELECT s.code
              FROM operations o
              JOIN sizes s ON o.size_id = s.id
              WHERE o.cycle_id = ops.cycle_id
                AND o.date <= ops.date
                AND o.size_id IS NOT NULL
                AND o.id < ops.id
              ORDER BY o.date DESC, o.id DESC
              LIMIT 1
            ),
            'Non specificata'
          ) AS size_code
        FROM ops
        ORDER BY ops.id DESC
      `);
      
      console.log('API operazioni per data - Risultati:', operations.length);
      
      return res.json(operations);
    } catch (error) {
      console.error('Errore nell\'API operazioni per data:', error);
      return res.status(500).json({ error: 'Errore nel recupero delle operazioni' });
    }
  });

  // API - Ottieni statistiche per taglia
  app.get("/api/diario/size-stats", async (req, res) => {
    try {
      const date = req.query.date as string;
      
      console.log('API statistiche per taglia - Data richiesta:', date);
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      // Query per ottenere statistiche raggruppate per taglia
      const stats = await db.execute(sql`
        SELECT 
          COALESCE(s.code, 'Non specificata') AS taglia,
          SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
              THEN o.animal_count ELSE 0 END) AS entrate,
          SUM(CASE WHEN o.type = 'vendita' THEN o.animal_count ELSE 0 END) AS uscite,
          COUNT(o.id) AS num_operazioni
        FROM operations o
        LEFT JOIN sizes s ON o.size_id = s.id
        WHERE o.date::text = ${date}
        GROUP BY s.code
        ORDER BY s.code
      `);
      
      console.log('API statistiche per taglia - Risultati:', stats.length);
      
      return res.json(stats);
    } catch (error) {
      console.error('Errore nell\'API statistiche per taglia:', error);
      return res.status(500).json({ error: 'Errore nel recupero delle statistiche per taglia' });
    }
  });

  // API - Ottieni totali giornalieri
  app.get("/api/diario/daily-totals", async (req, res) => {
    try {
      const date = req.query.date as string;
      
      console.log('API totali giornalieri - Data richiesta:', date);
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      // Query per ottenere i totali giornalieri
      // Includere le operazioni di cessazione come uscite
      const [totals] = await db.execute(sql`
        SELECT
          SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
              THEN o.animal_count ELSE 0 END) AS totale_entrate,
          SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS totale_uscite,
          SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
              THEN o.animal_count ELSE 0 END) - 
          SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS bilancio_netto,
          COUNT(DISTINCT o.id) AS numero_operazioni
        FROM operations o
        WHERE o.date::text = ${date}
      `);
      
      console.log('API totali giornalieri - Risultati:', totals);
      
      return res.json(totals);
    } catch (error) {
      console.error('Errore nell\'API totali giornalieri:', error);
      return res.status(500).json({ error: 'Errore nel recupero dei totali giornalieri' });
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
  
  // New endpoint for screening module
  app.get("/api/cycles/active-with-details", async (req, res) => {
    try {
      const cycles = await storage.getActiveCycles();
      
      // Fetch complete details for each cycle including basket, flupsy, lot and size
      const activeCyclesWithDetails = await Promise.all(
        cycles.map(async (cycle) => {
          // Get basket details
          const basket = await storage.getBasket(cycle.basketId);
          if (!basket) {
            throw new Error(`Basket not found for cycle ${cycle.id}`);
          }
          
          // Get operations for the cycle
          const operations = await storage.getOperationsByCycle(cycle.id);
          
          // Sort operations by date (newest first) and get the latest one
          operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const lastOperation = operations.length > 0 ? operations[0] : null;
          
          // Get flupsy details
          let flupsy = null;
          if (basket.flupsyId) {
            flupsy = await storage.getFlupsy(basket.flupsyId);
          }
          
          // Get size from the latest operation
          let size = null;
          if (lastOperation && lastOperation.sizeId) {
            size = await storage.getSize(lastOperation.sizeId);
          }
          
          // Get lot information if available
          // Find the first operation (seeding or activation) that might have lot information
          const firstOperation = operations
            .filter(op => op.type === "prima-attivazione")
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          
          let lot = null;
          if (firstOperation && firstOperation.lotId) {
            lot = await storage.getLot(firstOperation.lotId);
          }
          
          return {
            id: cycle.id,
            basketId: cycle.basketId,
            startDate: cycle.startDate,
            endDate: cycle.endDate,
            state: cycle.state,
            basket,
            flupsy,
            size,
            lot,
            lastOperation
          };
        })
      );
      
      res.json(activeCyclesWithDetails);
    } catch (error) {
      console.error("Error fetching active cycles with details:", error);
      res.status(400).json({ message: error.message || "Error fetching active cycles with details" });
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
      
      // Mappa di colori per le taglie se il colore manca nel database
      const colorMap = {
        'TP-180': '#a78bfa', // violet-400
        'TP-200': '#818cf8', // indigo-400
        'TP-315': '#60a5fa', // blue-400
        'TP-450': '#2dd4bf', // teal-400
        'TP-500': '#8b5cf6', // purple-500
        'TP-600': '#4ade80', // green-400
        'TP-700': '#a3e635', // lime-400
        'TP-800': '#facc15', // yellow-400
        'TP-1000': '#fb923c', // orange-400
        'TP-1140': '#f87171', // red-400
        'TP-1260': '#f472b6', // pink-400
        'TP-1500': '#e879f9', // fuchsia-400
        'TP-1800': '#c084fc', // purple-400
        'TP-1900': '#93c5fd', // blue-300
        'TP-2000': '#67e8f9', // cyan-400
        'TP-2200': '#86efac', // green-300
        'TP-2500': '#fde047', // yellow-300
        'TP-2800': '#fdba74', // orange-300
        'TP-3000': '#fca5a5', // red-300
        'TP-3500': '#f9a8d4', // pink-300
        'TP-4000': '#d8b4fe', // purple-300
        'TP-5000': '#bfdbfe', // blue-200
        'TP-6000': '#a5f3fc', // cyan-200
        'TP-7000': '#bbf7d0', // green-200
        'TP-8000': '#fef08a', // yellow-200
        'TP-9000': '#fed7aa', // orange-200
        'TP-10000': '#fecaca', // red-200
      };
      
      // Assicura che ogni taglia abbia un colore
      const sizesWithColors = sizes.map(size => ({
        ...size,
        color: size.color || colorMap[size.code] || '#6366f1' // indigo-500 (default)
      }));
      
      res.json(sizesWithColors);
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
      
      // Mappa di colori per le taglie se il colore manca
      const colorMap = {
        'TP-180': '#a78bfa', // violet-400
        'TP-200': '#818cf8', // indigo-400
        'TP-315': '#60a5fa', // blue-400
        'TP-450': '#2dd4bf', // teal-400
        'TP-500': '#8b5cf6', // purple-500
        'TP-600': '#4ade80', // green-400
        'TP-700': '#a3e635', // lime-400
        'TP-800': '#facc15', // yellow-400
        'TP-1000': '#fb923c', // orange-400
        'TP-1140': '#f87171', // red-400
        'TP-1260': '#f472b6', // pink-400
        'TP-1500': '#e879f9', // fuchsia-400
        'TP-1800': '#c084fc', // purple-400
        'TP-1900': '#93c5fd', // blue-300
        'TP-2000': '#67e8f9', // cyan-400
        'TP-2200': '#86efac', // green-300
        'TP-2500': '#fde047', // yellow-300
        'TP-2800': '#fdba74', // orange-300
        'TP-3000': '#fca5a5', // red-300
        'TP-3500': '#f9a8d4', // pink-300
        'TP-4000': '#d8b4fe', // purple-300
        'TP-5000': '#bfdbfe', // blue-200
        'TP-6000': '#a5f3fc', // cyan-200
        'TP-7000': '#bbf7d0', // green-200
        'TP-8000': '#fef08a', // yellow-200
        'TP-9000': '#fed7aa', // orange-200
        'TP-10000': '#fecaca', // red-200
      };
      
      // Assicura che la taglia abbia un colore
      const sizeWithColor = {
        ...size,
        color: size.color || colorMap[size.code] || '#6366f1' // indigo-500 (default)
      };

      res.json(sizeWithColor);
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

  // === Mortality Rate routes ===
  app.get("/api/mortality-rates", async (req, res) => {
    try {
      const mortalityRates = await storage.getMortalityRates();
      
      // Aggiungi informazioni sulla taglia
      const mortalityRatesWithSizes = await Promise.all(
        mortalityRates.map(async (rate) => {
          const size = rate.sizeId ? await storage.getSize(rate.sizeId) : null;
          return { ...rate, size };
        })
      );
      
      res.json(mortalityRatesWithSizes);
    } catch (error) {
      console.error("Error fetching mortality rates:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates" });
    }
  });

  // Prima le rotte specifiche con path fissi
  app.get("/api/mortality-rates/by-month-and-size", async (req, res) => {
    try {
      const month = req.query.month as string;
      const sizeIdStr = req.query.sizeId as string;
      
      if (!month || !sizeIdStr) {
        return res.status(400).json({ 
          message: "Both month and sizeId are required parameters" 
        });
      }
      
      const sizeId = parseInt(sizeIdStr);
      if (isNaN(sizeId)) {
        return res.status(400).json({ 
          message: "sizeId must be a valid number" 
        });
      }
      
      // Normalizza il mese per la ricerca (tutto minuscolo)
      const normalizedMonth = month.toLowerCase();
      
      const mortalityRate = await storage.getMortalityRateByMonthAndSize(normalizedMonth, sizeId);
      if (!mortalityRate) {
        return res.status(404).json({ 
          message: `No mortality rate found for month ${normalizedMonth} and size ID ${sizeId}` 
        });
      }
      
      // Includi informazioni sulla taglia
      const size = await storage.getSize(sizeId);
      
      res.json({ ...mortalityRate, size });
    } catch (error) {
      console.error("Error fetching mortality rate by month and size:", error);
      res.status(500).json({ message: "Failed to fetch mortality rate by month and size" });
    }
  });
  
  app.get("/api/mortality-rates/by-month/:month", async (req, res) => {
    try {
      const month = req.params.month;
      const mortalityRates = await storage.getMortalityRatesByMonth(month);
      
      // Aggiungi informazioni sulla taglia
      const mortalityRatesWithSizes = await Promise.all(
        mortalityRates.map(async (rate) => {
          const size = rate.sizeId ? await storage.getSize(rate.sizeId) : null;
          return { ...rate, size };
        })
      );
      
      res.json(mortalityRatesWithSizes);
    } catch (error) {
      console.error("Error fetching mortality rates by month:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates by month" });
    }
  });
  
  app.get("/api/mortality-rates/by-size/:sizeId", async (req, res) => {
    try {
      const sizeId = parseInt(req.params.sizeId);
      if (isNaN(sizeId)) {
        return res.status(400).json({ message: "Invalid size ID" });
      }
      
      const mortalityRates = await storage.getMortalityRatesBySize(sizeId);
      
      // Aggiungi informazioni sulla taglia
      const size = await storage.getSize(sizeId);
      const mortalityRatesWithSize = mortalityRates.map(rate => ({ ...rate, size }));
      
      res.json(mortalityRatesWithSize);
    } catch (error) {
      console.error("Error fetching mortality rates by size:", error);
      res.status(500).json({ message: "Failed to fetch mortality rates by size" });
    }
  });
  
  // Dopo le rotte con percorsi specifici, metti la rotta parametrizzata che può causare conflitti
  app.get("/api/mortality-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid mortality rate ID" });
      }

      const mortalityRate = await storage.getMortalityRate(id);
      if (!mortalityRate) {
        return res.status(404).json({ message: "Mortality rate not found" });
      }

      // Includi informazioni sulla taglia
      const size = mortalityRate.sizeId ? await storage.getSize(mortalityRate.sizeId) : null;
      
      res.json({ ...mortalityRate, size });
    } catch (error) {
      console.error("Error fetching mortality rate:", error);
      res.status(500).json({ message: "Failed to fetch mortality rate" });
    }
  });
  
  app.post("/api/mortality-rates", async (req, res) => {
    try {
      const parsedData = mortalityRateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Verifica se esiste già un tasso di mortalità per questa combinazione mese/taglia
      const existingRate = await storage.getMortalityRateByMonthAndSize(
        parsedData.data.month, 
        parsedData.data.sizeId
      );
      
      if (existingRate) {
        return res.status(409).json({ 
          message: "Un tasso di mortalità per questa combinazione mese/taglia esiste già",
          existingRate
        });
      }
      
      const mortalityRate = await storage.createMortalityRate(parsedData.data);
      
      // Aggiungi informazioni sulla taglia nella risposta
      const size = mortalityRate.sizeId ? await storage.getSize(mortalityRate.sizeId) : null;
      
      res.status(201).json({ ...mortalityRate, size });
    } catch (error) {
      console.error("Error creating mortality rate:", error);
      res.status(500).json({ message: "Failed to create mortality rate" });
    }
  });
  
  app.patch("/api/mortality-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid mortality rate ID" });
      }
      
      // Verifica che il tasso di mortalità esista
      const mortalityRate = await storage.getMortalityRate(id);
      if (!mortalityRate) {
        return res.status(404).json({ message: "Mortality rate not found" });
      }
      
      // Parse e valida i dati di aggiornamento
      const updateSchema = z.object({
        month: z.string().optional(),
        sizeId: z.number().optional(),
        percentage: z.number().optional(),
        notes: z.string().nullable().optional()
      });
      
      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Se si sta aggiornando mese o taglia, verifica che non esista già un altro record con la stessa combinazione
      if (parsedData.data.month || parsedData.data.sizeId) {
        const month = parsedData.data.month || mortalityRate.month;
        const sizeId = parsedData.data.sizeId || mortalityRate.sizeId;
        
        const existingRate = await storage.getMortalityRateByMonthAndSize(month, sizeId);
        if (existingRate && existingRate.id !== id) {
          return res.status(409).json({
            message: "Un tasso di mortalità per questa combinazione mese/taglia esiste già",
            existingRate
          });
        }
      }
      
      const updatedMortalityRate = await storage.updateMortalityRate(id, parsedData.data);
      
      // Includi informazioni sulla taglia nella risposta
      const size = updatedMortalityRate?.sizeId ? await storage.getSize(updatedMortalityRate.sizeId) : null;
      
      res.json({ ...updatedMortalityRate, size });
    } catch (error) {
      console.error("Error updating mortality rate:", error);
      res.status(500).json({ message: "Failed to update mortality rate" });
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
  
  app.delete("/api/lots/:id", async (req, res) => {
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
      
      // Prima di eliminare il lotto, si potrebbe verificare che non sia usato in cestini attivi
      // ...

      // Elimina il lotto
      const result = await storage.deleteLot(id);
      if (result) {
        res.status(200).json({ success: true, message: "Lot deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete lot" });
      }
    } catch (error) {
      console.error("Error deleting lot:", error);
      res.status(500).json({ message: "Failed to delete lot" });
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
  
  // Update an existing FLUPSY
  app.patch("/api/flupsys/:id", async (req, res) => {
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
      
      // Validate the update data
      const updateData = req.body;
      
      // If name is being updated, check for uniqueness
      if (updateData.name && updateData.name !== flupsy.name) {
        const existingFlupsy = await storage.getFlupsyByName(updateData.name);
        if (existingFlupsy && existingFlupsy.id !== id) {
          return res.status(400).json({ message: "A FLUPSY with this name already exists" });
        }
      }
      
      // Update the FLUPSY
      const updatedFlupsy = await storage.updateFlupsy(id, updateData);
      
      // Broadcast update if WebSocket is configured
      if (typeof (global as any).broadcastUpdate === 'function') {
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
  });
  
  // Delete a FLUPSY and all its baskets
  app.delete("/api/flupsys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "ID FLUPSY non valido" });
      }
      
      console.log(`Richiesta di eliminazione FLUPSY ID: ${id}`);
      
      // Controllo del ruolo utente (solo admin può eliminare FLUPSY)
      // Nota: i ruoli vengono verificati client-side, il controllo è ulteriore precauzione
      
      // Usa la funzione di storage per eliminare il FLUPSY
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

  // === Growth Prediction Endpoints ===
  // === Growth Prediction Endpoints ===
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

  // Route per azzerare operazioni, cicli e cestelli
  app.post("/api/reset-operations", async (req, res) => {
    try {
      // Verifica la password
      const { password } = req.body;
      
      if (password !== "Gianluigi") {
        return res.status(401).json({
          success: false,
          message: "Password non valida. Operazione non autorizzata."
        });
      }
      
      // Importiamo il queryClient dal modulo db
      const { queryClient } = await import("./db.js");
      
      // Usiamo il metodo corretto per le transazioni
      await queryClient.begin(async sql => {
        try {
          // 1. Elimina la cronologia delle posizioni dei cestelli
          await sql`DELETE FROM basket_position_history`;
          
          // 2. Elimina le operazioni
          await sql`DELETE FROM operations`;
          
          // 3. Elimina i cicli
          await sql`DELETE FROM cycles`;
          
          // 4. Elimina i cestelli
          await sql`DELETE FROM baskets`;
          
          // 5. Resettiamo le sequenze degli ID
          await sql`ALTER SEQUENCE IF EXISTS operations_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS cycles_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS basket_position_history_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS baskets_id_seq RESTART WITH 1`;
          
          return true; // Successo - commit implicito
        } catch (error) {
          console.error("Errore durante l'azzeramento dei dati:", error);
          throw error; // Rollback implicito
        }
      });
      
      res.status(200).json({ 
        success: true,
        message: "Dati azzerati con successo. Operazioni, cicli, cestelli e posizioni eliminati."
      });
    } catch (error) {
      console.error("Errore durante l'azzeramento dei dati operativi:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante l'azzeramento dei dati operativi",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  // Route per azzerare i dati delle vagliature
  app.post("/api/reset-screening", async (req, res) => {
    try {
      // Verifica la password
      const { password } = req.body;
      
      if (password !== "Gianluigi") {
        return res.status(401).json({
          success: false,
          message: "Password non valida. Operazione non autorizzata."
        });
      }
      
      // Importiamo il queryClient dal modulo db
      const { queryClient } = await import("./db.js");
      
      // Usiamo il metodo corretto per le transazioni
      await queryClient.begin(async sql => {
        try {
          // 1. Elimina i riferimenti ai lotti per le ceste di destinazione
          await sql`DELETE FROM screening_lot_references`;
          
          // 2. Elimina lo storico delle relazioni tra ceste di origine e destinazione
          await sql`DELETE FROM screening_basket_history`;
          
          // 3. Elimina le ceste di destinazione
          await sql`DELETE FROM screening_destination_baskets`;
          
          // 4. Elimina le ceste di origine
          await sql`DELETE FROM screening_source_baskets`;
          
          // 5. Elimina le operazioni di vagliatura
          await sql`DELETE FROM screening_operations`;
          
          // 6. Resettiamo le sequenze degli ID
          await sql`ALTER SEQUENCE IF EXISTS screening_lot_references_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS screening_basket_history_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS screening_destination_baskets_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS screening_source_baskets_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS screening_operations_id_seq RESTART WITH 1`;
          
          return true; // Successo - commit implicito
        } catch (error) {
          console.error("Errore durante l'azzeramento dei dati di vagliatura:", error);
          throw error; // Rollback implicito
        }
      });
      
      res.status(200).json({ 
        success: true,
        message: "Dati di vagliatura azzerati con successo. Tutte le operazioni di vagliatura e i dati correlati sono stati eliminati."
      });
    } catch (error) {
      console.error("Errore durante l'azzeramento dei dati di vagliatura:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante l'azzeramento dei dati di vagliatura",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });
  
  // Route per azzerare i dati delle selezioni
  app.post("/api/reset-selections", async (req, res) => {
    try {
      // Verifica la password
      const { password } = req.body;
      
      if (password !== "Gianluigi") {
        return res.status(401).json({
          success: false,
          message: "Password non valida. Operazione non autorizzata."
        });
      }
      
      // Importiamo il queryClient dal modulo db
      const { queryClient } = await import("./db.js");
      
      // Usiamo il metodo corretto per le transazioni
      await queryClient.begin(async sql => {
        try {
          console.log("Avvio azzeramento dati selezioni...");
          
          // 1. Elimina i riferimenti ai lotti per le ceste di destinazione
          await sql`DELETE FROM selection_lot_references`;
          console.log("Eliminati riferimenti ai lotti");
          
          // 2. Elimina lo storico delle relazioni tra ceste
          await sql`DELETE FROM selection_basket_history`;
          console.log("Eliminato storico delle relazioni tra ceste");
          
          // 3. Elimina le ceste di destinazione
          await sql`DELETE FROM selection_destination_baskets`;
          console.log("Eliminate ceste di destinazione");
          
          // 4. Elimina le ceste di origine
          await sql`DELETE FROM selection_source_baskets`;
          console.log("Eliminate ceste di origine");
          
          // 5. Elimina le selezioni
          await sql`DELETE FROM selections`;
          console.log("Eliminate selezioni");
          
          // 6. Resettiamo le sequenze degli ID
          await sql`ALTER SEQUENCE IF EXISTS selection_lot_references_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS selection_basket_history_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS selection_destination_baskets_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS selection_source_baskets_id_seq RESTART WITH 1`;
          await sql`ALTER SEQUENCE IF EXISTS selections_id_seq RESTART WITH 1`;
          console.log("Reset delle sequenze ID completato");
          
          return true; // Successo - commit implicito
        } catch (error) {
          console.error("Errore durante l'azzeramento dei dati di selezione:", error);
          throw error; // Rollback implicito
        }
      });
      
      // Invia broadcast WebSocket per notificare i client
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selections_reset', {
          message: "I dati delle selezioni sono stati azzerati."
        });
      }
      
      res.status(200).json({ 
        success: true,
        message: "Dati di selezione azzerati con successo. Tutte le operazioni di selezione e i dati correlati sono stati eliminati."
      });
    } catch (error) {
      console.error("Errore durante l'azzeramento dei dati di selezione:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante l'azzeramento dei dati di selezione",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  // === Target Size Annotations routes ===
  app.get("/api/target-size-annotations", async (req, res) => {
    try {
      // Controlla se ci sono filtri
      const basketId = req.query.basketId ? parseInt(req.query.basketId as string) : null;
      const targetSizeId = req.query.targetSizeId ? parseInt(req.query.targetSizeId as string) : null;
      const status = req.query.status as string || null;
      const withinDays = req.query.withinDays ? parseInt(req.query.withinDays as string) : null;
      
      let annotations;
      
      // Applica i filtri appropriati
      if (basketId) {
        console.log(`Recupero annotazioni per la cesta ID: ${basketId}`);
        annotations = await storage.getTargetSizeAnnotationsByBasket(basketId);
      } else if (targetSizeId && withinDays) {
        console.log(`Recupero annotazioni per la taglia ID: ${targetSizeId} entro ${withinDays} giorni`);
        annotations = await storage.getBasketsPredictedToReachSize(targetSizeId, withinDays);
      } else if (targetSizeId) {
        console.log(`Recupero annotazioni per la taglia ID: ${targetSizeId}`);
        annotations = await storage.getTargetSizeAnnotationsByTargetSize(targetSizeId);
      } else if (status === 'pending') {
        console.log(`Recupero annotazioni con stato: ${status}`);
        annotations = await storage.getPendingTargetSizeAnnotations();
      } else {
        console.log('Recupero tutte le annotazioni');
        annotations = await storage.getTargetSizeAnnotations();
      }
      
      // Arricchisci le annotazioni con dati correlati
      const enrichedAnnotations = await Promise.all(
        annotations.map(async (anno) => {
          const basket = await storage.getBasket(anno.basketId);
          const size = await storage.getSize(anno.targetSizeId);
          
          return {
            ...anno,
            basket,
            targetSize: size
          };
        })
      );
      
      res.json(enrichedAnnotations);
    } catch (error) {
      console.error("Errore nel recupero delle annotazioni di taglia:", error);
      res.status(500).json({ message: "Errore nel recupero delle annotazioni di taglia" });
    }
  });
  
  app.get("/api/target-size-annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      const annotation = await storage.getTargetSizeAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Arricchisci con dati correlati
      const basket = await storage.getBasket(annotation.basketId);
      const size = await storage.getSize(annotation.targetSizeId);
      
      res.json({
        ...annotation,
        basket,
        targetSize: size
      });
    } catch (error) {
      console.error("Errore nel recupero dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nel recupero dell'annotazione di taglia" });
    }
  });
  
  app.post("/api/target-size-annotations", async (req, res) => {
    try {
      const parsedData = insertTargetSizeAnnotationSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Verifica che il cestello esista
      const basket = await storage.getBasket(parsedData.data.basketId);
      if (!basket) {
        return res.status(404).json({ message: "Cestello non trovato" });
      }
      
      // Verifica che la taglia target esista
      const targetSize = await storage.getSize(parsedData.data.targetSizeId);
      if (!targetSize) {
        return res.status(404).json({ message: "Taglia target non trovata" });
      }
      
      // Crea l'annotazione
      const newAnnotation = await storage.createTargetSizeAnnotation(parsedData.data);
      
      // Restituisci il risultato con i dati aggiuntivi
      res.status(201).json({
        ...newAnnotation,
        basket,
        targetSize
      });
    } catch (error) {
      console.error("Errore nella creazione dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nella creazione dell'annotazione di taglia" });
    }
  });
  
  app.patch("/api/target-size-annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      // Controlla se l'annotazione esiste
      const currentAnnotation = await storage.getTargetSizeAnnotation(id);
      if (!currentAnnotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Valida i dati di aggiornamento
      const updateSchema = z.object({
        status: z.enum(['pending', 'reached', 'canceled']).optional(),
        notes: z.string().nullable().optional(),
        predictedDate: z.string().optional(), // Formato ISO YYYY-MM-DD
        reachedDate: z.string().nullable().optional(), // Formato ISO YYYY-MM-DD
      });
      
      const parsedData = updateSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessage = fromZodError(parsedData.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Imposta automaticamente reachedDate quando lo stato viene impostato a "reached"
      if (parsedData.data.status === 'reached' && !parsedData.data.reachedDate) {
        parsedData.data.reachedDate = new Date().toISOString().split('T')[0];
      }
      
      // Aggiorna l'annotazione
      const updatedAnnotation = await storage.updateTargetSizeAnnotation(id, parsedData.data);
      
      // Arricchisci con dati correlati
      const basket = await storage.getBasket(updatedAnnotation!.basketId);
      const size = await storage.getSize(updatedAnnotation!.targetSizeId);
      
      res.json({
        ...updatedAnnotation,
        basket,
        targetSize: size
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nell'aggiornamento dell'annotazione di taglia" });
    }
  });
  
  app.delete("/api/target-size-annotations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID annotazione non valido" });
      }
      
      // Controlla se l'annotazione esiste
      const annotation = await storage.getTargetSizeAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotazione non trovata" });
      }
      
      // Elimina l'annotazione
      const result = await storage.deleteTargetSizeAnnotation(id);
      
      res.json({
        success: result,
        message: result ? "Annotazione eliminata con successo" : "Errore nell'eliminazione dell'annotazione"
      });
    } catch (error) {
      console.error("Errore nell'eliminazione dell'annotazione di taglia:", error);
      res.status(500).json({ message: "Errore nell'eliminazione dell'annotazione di taglia" });
    }
  });
  
  // API per cestelli che raggiungono la taglia TP-3000 entro un certo periodo
  app.get("/api/tp3000-baskets", async (req, res) => {
    try {
      // Trova l'ID della taglia TP-3000
      const tp3000 = await storage.getSizeByCode("TP-3000");
      if (!tp3000) {
        return res.status(404).json({ message: "Taglia TP-3000 non trovata nel database" });
      }
      
      // Parametro per il numero di giorni, default 14 (2 settimane)
      const withinDays = req.query.days ? parseInt(req.query.days as string) : 14;
      
      // Recupera le annotazioni pertinenti
      const annotations = await storage.getBasketsPredictedToReachSize(tp3000.id, withinDays);
      
      // Arricchisci con dati correlati
      const enrichedData = await Promise.all(
        annotations.map(async (anno) => {
          const basket = await storage.getBasket(anno.basketId);
          
          // Se il cestello ha un ciclo attivo, ottieni l'ultima operazione
          let lastOperation = null;
          if (basket && basket.currentCycleId) {
            const operations = await storage.getOperationsByBasket(basket.id);
            if (operations.length > 0) {
              // Ordina per data, più recente prima
              const sortedOps = operations.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              lastOperation = sortedOps[0];
            }
          }
          
          // Calcola i giorni rimanenti
          const today = new Date();
          const predictedDate = new Date(anno.predictedDate);
          const daysRemaining = Math.ceil((predictedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            ...anno,
            basket,
            lastOperation,
            daysRemaining
          };
        })
      );
      
      // Se non ci sono annotazioni esistenti, generiamo dinamicamente previsioni
      // basate sui cicli attivi e sulle operazioni recenti
      if (enrichedData.length === 0) {
        // Recupera tutti i cicli attivi
        const activeCycles = await storage.getActiveCycles();
        
        // Ottieni gli SGR mensili per il calcolo della crescita
        const sgrs = await storage.getSgrs();
        const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toLowerCase();
        
        // Trova l'SGR per il mese corrente o usa la media di tutti gli SGR disponibili
        let sgrDaily = 0.067; // Valore di default: ~2% al mese, circa 0.067% al giorno
        const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
        if (currentSgr) {
          // Usa il valore SGR del database che è già in percentuale giornaliera
          // Esempio: 3.7% è 0.037 come coefficiente di crescita giornaliero
          sgrDaily = currentSgr.percentage / 100;
        } else if (sgrs.length > 0) {
          // Calcola la media degli SGR disponibili (convertendo da percentuale a coefficiente)
          sgrDaily = sgrs.reduce((acc, sgr) => acc + sgr.percentage, 0) / sgrs.length / 100;
        }
        
        // Per ogni ciclo attivo, controlla se il cestello raggiunge TP-3000 entro il periodo specificato
        const dynamicPredictions = await Promise.all(
          activeCycles.map(async (cycle) => {
            // Ottieni il cestello e le sue operazioni
            const basket = await storage.getBasket(cycle.basketId);
            if (!basket) return null;
            
            const operations = await storage.getOperationsByBasket(basket.id);
            if (operations.length === 0) return null;
            
            // Ordina le operazioni per data (più recente prima)
            const sortedOps = operations.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            
            // Prendi l'ultima operazione con misurazione di peso
            const lastOperation = sortedOps.find(op => op.animalsPerKg !== null && op.animalsPerKg > 0);
            if (!lastOperation) return null;
            
            // Calcola il peso attuale in mg
            const currentWeight = lastOperation.animalsPerKg ? 1000000 / lastOperation.animalsPerKg : 0;
            if (currentWeight <= 0) return null;
            
            // Calcola il peso di TP-3000 in mg
            const tp3000Weight = tp3000.minAnimalsPerKg ? 1000000 / tp3000.minAnimalsPerKg : 0;
            if (tp3000Weight <= 0) return null;
            
            // Se il peso è già uguale o superiore a TP-3000, includi subito
            if (currentWeight >= tp3000Weight) {
              return {
                id: -Date.now() - basket.id, // ID temporaneo negativo basato su timestamp e basketId
                basketId: basket.id,
                targetSizeId: tp3000.id,
                status: "pending",
                predictedDate: new Date().toISOString(),
                basket,
                lastOperation,
                daysRemaining: 0
              };
            }
            
            // Altrimenti calcola il tempo necessario per raggiungere TP-3000
            // Usando la formula: daysTaken = ln(finalWeight/initialWeight) / SGR
            const daysToReachSize = Math.ceil(Math.log(tp3000Weight / currentWeight) / sgrDaily);
            
            // Se il numero di giorni è entro il periodo specificato, includi nella previsione
            if (daysToReachSize <= withinDays) {
              // Calcola la data prevista
              const predictedDate = new Date();
              predictedDate.setDate(predictedDate.getDate() + daysToReachSize);
              
              return {
                id: -Date.now() - basket.id, // ID temporaneo negativo
                basketId: basket.id,
                targetSizeId: tp3000.id,
                status: "pending",
                predictedDate: predictedDate.toISOString(),
                basket,
                lastOperation,
                daysRemaining: daysToReachSize
              };
            }
            
            return null;
          })
        );
        
        // Filtra i valori null e restituisci le previsioni valide
        const validPredictions = dynamicPredictions.filter(Boolean);
        return res.json(validPredictions);
      }
      
      res.json(enrichedData);
    } catch (error) {
      console.error("Errore nel recupero delle ceste che raggiungeranno TP-3000:", error);
      res.status(500).json({ message: "Errore nel recupero delle ceste che raggiungeranno TP-3000" });
    }
  });
  
  // Nuovo endpoint per previsioni di crescita verso qualsiasi taglia
  app.get("/api/size-predictions", async (req, res) => {
    try {
      // Parametro per la taglia target (default TP-3000)
      const targetSizeCode = req.query.size ? String(req.query.size) : "TP-3000";
      
      // Parametro per il numero di giorni, default 14 (2 settimane)
      const withinDays = req.query.days ? parseInt(req.query.days as string) : 14;
      
      // Recupera la taglia target
      const targetSize = await storage.getSizeByCode(targetSizeCode);
      if (!targetSize) {
        return res.status(404).json({ 
          message: `Taglia ${targetSizeCode} non trovata nel database` 
        });
      }

      // Recupera tutte le taglie disponibili
      const allSizes = await storage.getSizes();
      
      // Filtriamo le taglie che sono uguali o superiori alla taglia target
      // Le taglie superiori hanno minAnimalsPerKg minore o uguale alla taglia target
      const validSizes = allSizes.filter(size => {
        // Se non abbiamo un valore minAnimalsPerKg, non possiamo fare un confronto
        if (!size.minAnimalsPerKg || !targetSize.minAnimalsPerKg) return false;
        
        // Consideriamo tutte le taglie con minAnimalsPerKg <= alla taglia target
        // (minore numero di animali/kg = maggiore peso individuale = taglia superiore)
        return size.minAnimalsPerKg <= targetSize.minAnimalsPerKg;
      });
      
      if (validSizes.length === 0) {
        return res.json([]);
      }
      
      // Recupera tutti i cicli attivi
      const activeCycles = await storage.getActiveCycles();
      
      // Ottieni gli SGR mensili per il calcolo della crescita
      const sgrs = await storage.getSgrs();
      const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toLowerCase();
      
      // Trova l'SGR per il mese corrente o usa la media di tutti gli SGR disponibili
      let sgrDaily = 0.067; // Valore di default: ~2% al mese, circa 0.067% al giorno
      const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
      if (currentSgr) {
        // Usa il valore SGR del database che è già in percentuale giornaliera
        // Esempio: 3.7% è 0.037 come coefficiente di crescita giornaliero
        sgrDaily = currentSgr.percentage / 100;
      } else if (sgrs.length > 0) {
        // Calcola la media degli SGR disponibili (convertendo da percentuale a coefficiente)
        sgrDaily = sgrs.reduce((acc, sgr) => acc + sgr.percentage, 0) / sgrs.length / 100;
      }
      
      // Per ogni ciclo attivo, controlla se il cestello raggiunge la taglia target entro il periodo specificato
      const predictions = await Promise.all(
        activeCycles.map(async (cycle) => {
          // Ottieni il cestello e le sue operazioni
          const basket = await storage.getBasket(cycle.basketId);
          if (!basket) return null;
          
          const operations = await storage.getOperationsByBasket(basket.id);
          if (operations.length === 0) return null;
          
          // Ordina le operazioni per data (più recente prima)
          const sortedOps = operations.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          // Prendi l'ultima operazione con misurazione di peso
          const lastOperation = sortedOps.find(op => op.animalsPerKg !== null && op.animalsPerKg > 0);
          if (!lastOperation) return null;
          
          // Calcola il peso attuale in mg
          const currentWeight = lastOperation.animalsPerKg ? 1000000 / lastOperation.animalsPerKg : 0;
          if (currentWeight <= 0) return null;
          
          // Calcola il peso della taglia target in mg
          const targetWeight = targetSize.minAnimalsPerKg ? 1000000 / targetSize.minAnimalsPerKg : 0;
          if (targetWeight <= 0) return null;
          
          // Se il peso è già uguale o superiore alla taglia target, includi subito
          if (currentWeight >= targetWeight) {
            return {
              id: -Date.now() - basket.id, // ID temporaneo negativo
              basketId: basket.id,
              targetSizeId: targetSize.id,
              status: "pending",
              predictedDate: new Date().toISOString(),
              basket,
              lastOperation,
              daysRemaining: 0,
              currentWeight,
              targetWeight
            };
          }
          
          // Altrimenti calcola il tempo necessario per raggiungere la taglia target
          // Usando la formula: daysTaken = ln(finalWeight/initialWeight) / SGR
          const daysToReachSize = Math.ceil(Math.log(targetWeight / currentWeight) / sgrDaily);
          
          // Se il numero di giorni è entro il periodo specificato, includi nella previsione
          if (daysToReachSize <= withinDays) {
            // Calcola la data prevista
            const predictedDate = new Date();
            predictedDate.setDate(predictedDate.getDate() + daysToReachSize);
            
            return {
              id: -Date.now() - basket.id, // ID temporaneo negativo
              basketId: basket.id,
              targetSizeId: targetSize.id,
              status: "pending",
              predictedDate: predictedDate.toISOString(),
              basket,
              lastOperation,
              daysRemaining: daysToReachSize,
              currentWeight,
              targetWeight
            };
          }
          
          // Se non ha raggiunto la taglia target, controllo se raggiunge una taglia superiore
          // entro il periodo specificato
          for (const size of validSizes) {
            // Salta la taglia target, già controllata
            if (size.id === targetSize.id) continue;
            
            // Calcola il peso della taglia superiore in mg
            const sizeWeight = size.minAnimalsPerKg ? 1000000 / size.minAnimalsPerKg : 0;
            if (sizeWeight <= 0) continue;
            
            // Salta questa taglia se il suo peso è minore del target 
            // (ovvero se è una taglia inferiore con più animali/kg)
            if (sizeWeight < targetWeight) continue;
            
            // Se il peso è già uguale o superiore a questa taglia, la cesta è già in questa taglia
            if (currentWeight >= sizeWeight) {
              return {
                id: -Date.now() - basket.id - size.id, // ID temporaneo negativo
                basketId: basket.id,
                targetSizeId: size.id,
                status: "pending",
                predictedDate: new Date().toISOString(),
                basket,
                lastOperation,
                daysRemaining: 0,
                currentWeight,
                targetWeight: sizeWeight,
                actualSize: size,
                requestedSize: targetSize
              };
            }
            
            // Calcola il tempo necessario per raggiungere questa taglia superiore
            const daysToReachThisSize = Math.ceil(Math.log(sizeWeight / currentWeight) / sgrDaily);
            
            // Se il numero di giorni è entro il periodo specificato, includi nella previsione
            if (daysToReachThisSize <= withinDays) {
              // Calcola la data prevista
              const predictedDate = new Date();
              predictedDate.setDate(predictedDate.getDate() + daysToReachThisSize);
              
              return {
                id: -Date.now() - basket.id - size.id, // ID temporaneo negativo
                basketId: basket.id,
                targetSizeId: size.id,
                status: "pending",
                predictedDate: predictedDate.toISOString(),
                basket,
                lastOperation,
                daysRemaining: daysToReachThisSize,
                currentWeight,
                targetWeight: sizeWeight,
                actualSize: size,
                requestedSize: targetSize
              };
            }
          }
          
          return null;
        })
      );
      
      // Filtra i valori null e restituisci le previsioni valide
      const validPredictions = predictions.filter(Boolean);
      
      // Ordina prima per giorni rimanenti (urgenza)
      // L'operatore "!" assicura TypeScript che a e b non sono null
      // (li abbiamo già filtrati con filter(Boolean))
      validPredictions.sort((a, b) => a!.daysRemaining - b!.daysRemaining);
      
      res.json(validPredictions);
    } catch (error) {
      console.error("Errore nel calcolo delle previsioni di crescita:", error);
      res.status(500).json({ message: "Errore nel calcolo delle previsioni di crescita" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // API routes for the screening (vagliatura) module
  app.get("/api/screening/operations", async (req, res) => {
    try {
      const status = req.query.status as string;
      let operations: ScreeningOperation[];
      
      if (status) {
        operations = await storage.getScreeningOperationsByStatus(status);
      } else {
        operations = await storage.getScreeningOperations();
      }
      
      // Aggiungi dettagli sulla taglia di riferimento per ogni operazione
      const operationsWithDetails = await Promise.all(operations.map(async (op) => {
        if (op.referenceSizeId) {
          const size = await storage.getSize(op.referenceSizeId);
          return { ...op, referenceSize: size };
        }
        return op;
      }));
      
      res.json(operationsWithDetails);
    } catch (error) {
      console.error("Error fetching screening operations:", error);
      res.status(500).json({ error: "Failed to fetch screening operations" });
    }
  });
  
  // Route per ottenere il prossimo numero di vagliatura disponibile
  app.get("/api/screening/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextScreeningNumber();
      res.json({ nextNumber });
    } catch (error) {
      console.error("Error getting next screening number:", error);
      res.status(500).json({ error: "Failed to get next screening number" });
    }
  });
  
  app.get("/api/screening/operations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const operation = await storage.getScreeningOperation(id);
      if (!operation) {
        return res.status(404).json({ error: "Screening operation not found" });
      }
      
      // Aggiungi dettagli sulla taglia di riferimento
      let operationWithDetails = { ...operation };
      
      if (operation.referenceSizeId) {
        const size = await storage.getSize(operation.referenceSizeId);
        operationWithDetails = { ...operationWithDetails, referenceSize: size };
      }
      
      res.json(operationWithDetails);
    } catch (error) {
      console.error("Error fetching screening operation:", error);
      res.status(500).json({ error: "Failed to fetch screening operation" });
    }
  });
  
  app.post("/api/screening/operations", async (req, res) => {
    try {
      const validatedData = insertScreeningOperationSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const operation = await storage.createScreeningOperation(validatedData.data);
      res.status(201).json(operation);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_operation_created", operation);
    } catch (error) {
      console.error("Error creating screening operation:", error);
      res.status(500).json({ error: "Failed to create screening operation" });
    }
  });
  
  app.patch("/api/screening/operations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const operation = await storage.getScreeningOperation(id);
      if (!operation) {
        return res.status(404).json({ error: "Screening operation not found" });
      }
      
      const updatedOperation = await storage.updateScreeningOperation(id, req.body);
      res.json(updatedOperation);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_operation_updated", updatedOperation);
    } catch (error) {
      console.error("Error updating screening operation:", error);
      res.status(500).json({ error: "Failed to update screening operation" });
    }
  });
  
  app.post("/api/screening/operations/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const operation = await storage.getScreeningOperation(id);
      if (!operation) {
        return res.status(404).json({ error: "Screening operation not found" });
      }
      
      try {
        const completedOperation = await storage.completeScreeningOperation(id);
        res.json(completedOperation);
        
        // Broadcast update
        (global as any).broadcastUpdate("screening_operation_completed", completedOperation);
      } catch (error: any) {
        // Gestire eventuali errori specifici durante il completamento
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error completing screening operation:", error);
      res.status(500).json({ error: "Failed to complete screening operation" });
    }
  });
  
  app.post("/api/screening/operations/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const operation = await storage.getScreeningOperation(id);
      if (!operation) {
        return res.status(404).json({ error: "Screening operation not found" });
      }
      
      // Verifica se l'operazione è in stato "draft"
      const isDraft = operation.status === 'draft';
      
      const cancelledOperation = await storage.cancelScreeningOperation(id);
      res.json(cancelledOperation);
      
      // Log e broadcast con dettagli diversi a seconda dell'operazione eseguita
      if (isDraft) {
        console.log(`Operazione di vagliatura ID ${id} completamente eliminata dal sistema`);
        // Broadcast update
        (global as any).broadcastUpdate("screening_operation_deleted", cancelledOperation);
      } else {
        console.log(`Operazione di vagliatura ID ${id} contrassegnata come annullata`);
        // Broadcast update
        (global as any).broadcastUpdate("screening_operation_cancelled", cancelledOperation);
      }
    } catch (error) {
      console.error("Error cancelling screening operation:", error);
      res.status(500).json({ error: "Failed to cancel screening operation" });
    }
  });
  
  // Source Baskets API
  app.get("/api/screening/source-baskets/:screeningId", async (req, res) => {
    try {
      const screeningId = parseInt(req.params.screeningId, 10);
      if (isNaN(screeningId)) {
        return res.status(400).json({ error: "Invalid screening ID format" });
      }
      
      const sourceBaskets = await storage.getScreeningSourceBasketsByScreening(screeningId);
      
      // Aggiungi dettagli aggiuntivi per ogni cesta di origine
      const sourceBasketDetails = await Promise.all(sourceBaskets.map(async (sb) => {
        const basket = await storage.getBasket(sb.basketId);
        const cycle = sb.cycleId ? await storage.getCycle(sb.cycleId) : null;
        
        // Ottieni l'ultima operazione per determinare il peso medio
        let lastOperation = null;
        if (sb.cycleId) {
          const operations = await storage.getOperationsByCycle(sb.cycleId);
          if (operations.length > 0) {
            // Ordinamento per data (dalla più recente)
            operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            lastOperation = operations[0];
          }
        }
        
        return {
          ...sb,
          basket,
          cycle,
          lastOperation
        };
      }));
      
      res.json(sourceBasketDetails);
    } catch (error) {
      console.error("Error fetching screening source baskets:", error);
      res.status(500).json({ error: "Failed to fetch screening source baskets" });
    }
  });
  
  app.post("/api/screening/source-baskets", async (req, res) => {
    try {
      const validatedData = insertScreeningSourceBasketSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const sourceBasket = await storage.addScreeningSourceBasket(validatedData.data);
      
      // Aggiungi dettagli basket e ciclo
      const basket = await storage.getBasket(sourceBasket.basketId);
      const cycle = sourceBasket.cycleId ? await storage.getCycle(sourceBasket.cycleId) : null;
      
      const sourceBasketWithDetails = {
        ...sourceBasket,
        basket,
        cycle
      };
      
      res.status(201).json(sourceBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_source_basket_added", sourceBasketWithDetails);
    } catch (error) {
      console.error("Error adding screening source basket:", error);
      res.status(500).json({ error: "Failed to add screening source basket" });
    }
  });
  
  app.patch("/api/screening/source-baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const updatedSourceBasket = await storage.updateScreeningSourceBasket(id, req.body);
      if (!updatedSourceBasket) {
        return res.status(404).json({ error: "Screening source basket not found" });
      }
      
      // Aggiungi dettagli basket e ciclo
      const basket = await storage.getBasket(updatedSourceBasket.basketId);
      const cycle = updatedSourceBasket.cycleId ? await storage.getCycle(updatedSourceBasket.cycleId) : null;
      
      const sourceBasketWithDetails = {
        ...updatedSourceBasket,
        basket,
        cycle
      };
      
      res.json(sourceBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_source_basket_updated", sourceBasketWithDetails);
    } catch (error) {
      console.error("Error updating screening source basket:", error);
      res.status(500).json({ error: "Failed to update screening source basket" });
    }
  });
  
  app.post("/api/screening/source-baskets/:id/dismiss", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const dismissedSourceBasket = await storage.dismissScreeningSourceBasket(id);
      if (!dismissedSourceBasket) {
        return res.status(404).json({ error: "Screening source basket not found" });
      }
      
      // Aggiungi dettagli basket e ciclo
      const basket = await storage.getBasket(dismissedSourceBasket.basketId);
      
      const sourceBasketWithDetails = {
        ...dismissedSourceBasket,
        basket
      };
      
      res.json(sourceBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_source_basket_dismissed", sourceBasketWithDetails);
    } catch (error) {
      console.error("Error dismissing screening source basket:", error);
      res.status(500).json({ error: "Failed to dismiss screening source basket" });
    }
  });
  
  app.delete("/api/screening/source-baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.removeScreeningSourceBasket(id);
      if (!result) {
        return res.status(404).json({ error: "Screening source basket not found" });
      }
      
      res.json({ success: true, id });
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_source_basket_removed", { id });
    } catch (error) {
      console.error("Error removing screening source basket:", error);
      res.status(500).json({ error: "Failed to remove screening source basket" });
    }
  });
  
  // Destination Baskets API
  app.get("/api/screening/destination-baskets/:screeningId", async (req, res) => {
    try {
      const screeningId = parseInt(req.params.screeningId, 10);
      if (isNaN(screeningId)) {
        return res.status(400).json({ error: "Invalid screening ID format" });
      }
      
      const destinationBaskets = await storage.getScreeningDestinationBasketsByScreening(screeningId);
      
      // Aggiungi dettagli aggiuntivi per ogni cesta di destinazione
      const destinationBasketDetails = await Promise.all(destinationBaskets.map(async (db) => {
        const basket = await storage.getBasket(db.basketId);
        
        // Ottieni lo storico e i riferimenti ai lotti
        const history = await storage.getScreeningBasketHistoryByDestination(db.id);
        const lotReferences = await storage.getScreeningLotReferencesByDestination(db.id);
        
        // Arricchisci i dati dello storico con i dettagli dei cicli di origine
        const historyWithDetails = await Promise.all(history.map(async (h) => {
          if (h.sourceCycleId) {
            const cycle = await storage.getCycle(h.sourceCycleId);
            return { ...h, cycle };
          }
          return h;
        }));
        
        // Arricchisci i riferimenti ai lotti con i dettagli dei lotti
        const lotReferencesWithDetails = await Promise.all(lotReferences.map(async (lr) => {
          if (lr.lotId) {
            const lot = await storage.getLot(lr.lotId);
            return { ...lr, lot };
          }
          return lr;
        }));
        
        return {
          ...db,
          basket,
          history: historyWithDetails,
          lotReferences: lotReferencesWithDetails
        };
      }));
      
      res.json(destinationBasketDetails);
    } catch (error) {
      console.error("Error fetching screening destination baskets:", error);
      res.status(500).json({ error: "Failed to fetch screening destination baskets" });
    }
  });
  
  app.post("/api/screening/destination-baskets", async (req, res) => {
    try {
      const validatedData = insertScreeningDestinationBasketSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const destinationBasket = await storage.addScreeningDestinationBasket(validatedData.data);
      
      // Aggiungi dettagli basket
      const basket = await storage.getBasket(destinationBasket.basketId);
      
      const destinationBasketWithDetails = {
        ...destinationBasket,
        basket
      };
      
      res.status(201).json(destinationBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_destination_basket_added", destinationBasketWithDetails);
    } catch (error) {
      console.error("Error adding screening destination basket:", error);
      res.status(500).json({ error: "Failed to add screening destination basket" });
    }
  });
  
  app.patch("/api/screening/destination-baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const updatedDestinationBasket = await storage.updateScreeningDestinationBasket(id, req.body);
      if (!updatedDestinationBasket) {
        return res.status(404).json({ error: "Screening destination basket not found" });
      }
      
      // Aggiungi dettagli basket
      const basket = await storage.getBasket(updatedDestinationBasket.basketId);
      
      const destinationBasketWithDetails = {
        ...updatedDestinationBasket,
        basket
      };
      
      res.json(destinationBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_destination_basket_updated", destinationBasketWithDetails);
    } catch (error) {
      console.error("Error updating screening destination basket:", error);
      res.status(500).json({ error: "Failed to update screening destination basket" });
    }
  });
  
  app.post("/api/screening/destination-baskets/:id/assign-position", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const { flupsyId, row, position } = req.body;
      
      if (!flupsyId || !row || isNaN(position)) {
        return res.status(400).json({ error: "Missing or invalid position data" });
      }
      
      // Verifica se la posizione è disponibile
      const isAvailable = await storage.isPositionAvailable(flupsyId, row, position);
      if (!isAvailable) {
        return res.status(400).json({ error: "Position is already occupied" });
      }
      
      const destinationBasket = await storage.assignPositionToDestinationBasket(id, flupsyId, row, position);
      if (!destinationBasket) {
        return res.status(404).json({ error: "Screening destination basket not found" });
      }
      
      // Aggiungi dettagli basket
      const basket = await storage.getBasket(destinationBasket.basketId);
      
      const destinationBasketWithDetails = {
        ...destinationBasket,
        basket
      };
      
      res.json(destinationBasketWithDetails);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_destination_basket_position_assigned", destinationBasketWithDetails);
    } catch (error) {
      console.error("Error assigning position to screening destination basket:", error);
      res.status(500).json({ error: "Failed to assign position to screening destination basket" });
    }
  });
  
  app.delete("/api/screening/destination-baskets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const result = await storage.removeScreeningDestinationBasket(id);
      if (!result) {
        return res.status(404).json({ error: "Screening destination basket not found" });
      }
      
      res.json({ success: true, id });
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_destination_basket_removed", { id });
    } catch (error) {
      console.error("Error removing screening destination basket:", error);
      res.status(500).json({ error: "Failed to remove screening destination basket" });
    }
  });
  
  // Screening History API
  app.post("/api/screening/history", async (req, res) => {
    try {
      const validatedData = insertScreeningBasketHistorySchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const history = await storage.createScreeningBasketHistory(validatedData.data);
      res.status(201).json(history);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_history_created", history);
    } catch (error) {
      console.error("Error creating screening history:", error);
      res.status(500).json({ error: "Failed to create screening history" });
    }
  });
  
  // Screening Lot Reference API
  app.post("/api/screening/lot-references", async (req, res) => {
    try {
      const validatedData = insertScreeningLotReferenceSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const lotReference = await storage.createScreeningLotReference(validatedData.data);
      res.status(201).json(lotReference);
      
      // Broadcast update
      (global as any).broadcastUpdate("screening_lot_reference_created", lotReference);
    } catch (error) {
      console.error("Error creating screening lot reference:", error);
      res.status(500).json({ error: "Failed to create screening lot reference" });
    }
  });

  // Endpoint per l'esportazione delle giacenze
  app.get("/api/export/giacenze", async (req, res) => {
    try {
      // Importa il servizio di esportazione on-demand
      const { generateExportGiacenze } = await import("./export-service");
      
      // Recupera i parametri opzionali dalla query
      const fornitore = req.query.fornitore as string || undefined;
      const dataEsportazione = req.query.data ? new Date(req.query.data as string) : undefined;
      
      // Genera il JSON di esportazione
      const giacenzeJson = await generateExportGiacenze(storage, {
        fornitore,
        dataEsportazione
      });
      
      // Imposta header per il download del file
      const filename = `giacenze_export_${new Date().toISOString().split('T')[0]}.json`;
      
      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/json');
      }
      
      // Invia il JSON formattato
      res.json(giacenzeJson);
    } catch (error) {
      console.error("Errore durante l'esportazione delle giacenze:", error);
      res.status(500).json({ 
        message: "Si è verificato un errore durante l'esportazione delle giacenze",
        error: (error as Error).message
      });
    }
  });
  
  // API per Backup e Ripristino del Database
  // ==============================================================
  
  // Crea un nuovo backup
  app.post("/api/database/backup", async (req, res) => {
    try {
      const backup = await createDatabaseBackup();
      res.json({
        success: true,
        backupId: backup.id,
        timestamp: backup.timestamp,
        size: backup.size
      });
    } catch (error) {
      console.error("Errore durante la creazione del backup:", error);
      res.status(500).json({ success: false, message: "Errore durante la creazione del backup" });
    }
  });
  
  // Lista dei backup disponibili
  app.get("/api/database/backups", (req, res) => {
    try {
      const backups = getAvailableBackups();
      res.json(backups);
    } catch (error) {
      console.error("Errore durante il recupero dei backup:", error);
      res.status(500).json({ message: "Errore durante il recupero dei backup" });
    }
  });
  
  // Ripristina da un backup esistente
  app.post("/api/database/restore/:backupId", async (req, res) => {
    try {
      const backupId = req.params.backupId;
      console.log(`Ricerca backup con ID: ${backupId}`);
      
      // Ottieni la lista dei backup disponibili
      const backups = getAvailableBackups();
      
      // Trova il backup con l'ID fornito
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        console.error(`Backup non trovato con ID: ${backupId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Backup non trovato. Verifica l'ID del backup." 
        });
      }
      
      console.log(`Backup trovato: ${backup.filename}`);
      
      // Ripristina il database dal file di backup
      const result = await restoreDatabaseFromBackup(backup.filename);
      
      if (result) {
        res.json({ success: true, message: "Database ripristinato con successo" });
      } else {
        throw new Error("Errore durante il ripristino del database");
      }
    } catch (error) {
      console.error("Errore durante il ripristino del database:", error);
      res.status(500).json({ success: false, message: "Errore durante il ripristino del database" });
    }
  });
  
  // Endpoint per il ripristino da file caricato (base64)
  app.post("/api/database/restore", async (req, res) => {
    try {
      const { sqlContent, fileName } = req.body;
      
      if (!sqlContent) {
        return res.status(400).json({ success: false, message: "Nessun contenuto SQL fornito" });
      }
      
      // Decodifica il contenuto da base64
      const sqlBuffer = Buffer.from(sqlContent, 'base64');
      
      // Crea una directory temporanea per il file SQL se non esiste
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Crea un nome file unico
      const timestamp = Date.now();
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizza il nome file
      const filePath = path.join(uploadDir, `${timestamp}-${safeName}`);
      
      // Scrivi il file
      fs.writeFileSync(filePath, sqlBuffer);
      
      console.log(`File SQL caricato e salvato in: ${filePath}`);
      
      // Ripristina il database dal file caricato usando la funzione esistente
      const result = await restoreDatabaseFromBackup(filePath);
      
      if (result) {
        // Rimuovi il file temporaneo dopo il ripristino
        try {
          fs.unlinkSync(filePath);
          console.log(`File temporaneo rimosso: ${filePath}`);
        } catch (unlinkError) {
          console.error("Errore durante la rimozione del file temporaneo:", unlinkError);
        }
        
        return res.json({
          success: true,
          message: "Database ripristinato con successo dal file caricato"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Si è verificato un errore durante il ripristino del database"
        });
      }
    } catch (error) {
      console.error("Errore durante il ripristino dal file caricato:", error);
      return res.status(500).json({
        success: false,
        message: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      });
    }
  });
  
  // Scarica un backup
  // Endpoint proxy per i dati delle maree di Venezia (livello attuale)
  app.get("/api/proxy/tide-data", async (req, res) => {
    try {
      const response = await fetch("https://dati.venezia.it/sites/default/files/dataset/opendata/livello.json");
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Errore nel recupero dei dati della marea" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Errore nel proxy per i dati della marea:", error);
      res.status(500).json({ error: "Errore interno nel recupero dei dati della marea" });
    }
  });
  
  // Endpoint proxy per le previsioni delle maree di Venezia
  app.get("/api/proxy/tide-forecast", async (req, res) => {
    try {
      const response = await fetch("https://dati.venezia.it/sites/default/files/dataset/opendata/previsione.json");
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Errore nel recupero delle previsioni della marea" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Errore nel proxy per le previsioni della marea:", error);
      res.status(500).json({ error: "Errore interno nel recupero delle previsioni della marea" });
    }
  });

  app.get("/api/database/download", async (req, res) => {
    try {
      // Genera un nuovo dump completo del database
      const dumpPath = await generateFullDatabaseDump();
      
      // Imposta gli header per il download
      res.setHeader('Content-Disposition', `attachment; filename=database_backup_${new Date().toISOString().split('T')[0]}.sql`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Invia il file
      res.sendFile(dumpPath, (err) => {
        if (err) {
          console.error("Errore durante l'invio del file di backup:", err);
        }
        
        // Elimina il file temporaneo dopo l'invio
        try {
          fs.unlinkSync(dumpPath);
        } catch (err) {
          console.error("Errore durante l'eliminazione del file temporaneo:", err);
        }
      });
    } catch (error) {
      console.error("Errore durante il download del backup:", error);
      res.status(500).json({ message: "Errore durante il download del backup" });
    }
  });
  
  // Carica e ripristina da un file
  app.post("/api/database/restore-file", async (req, res) => {
    // Alternativa a multer per gestire l'upload dei file tramite base64
    try {
      const { sqlContent, fileName } = req.body;
      
      if (!sqlContent || !fileName) {
        return res.status(400).json({
          message: "È necessario fornire sia il contenuto SQL (base64) che il nome del file"
        });
      }
      
      // Verifica che il nome del file abbia l'estensione .sql
      if (!fileName.toLowerCase().endsWith('.sql')) {
        return res.status(400).json({
          message: "Il file deve avere estensione .sql"
        });
      }
      
      // Decodifica il contenuto base64
      const sqlBuffer = Buffer.from(sqlContent, 'base64');
      
      // Crea un nome di file univoco
      const uniqueFilename = `uploaded-${Date.now()}-${Math.round(Math.random() * 1E9)}.sql`;
      const uploadDir = getBackupUploadDir();
      const filePath = path.join(uploadDir, uniqueFilename);
      
      // Salva il file
      fs.writeFileSync(filePath, sqlBuffer);
      
      console.log(`File SQL caricato e salvato in: ${filePath}`);
      
      // Ripristina il database dal file caricato
      // Utilizziamo la funzione dedicata per i file caricati
      const success = await restoreDatabaseFromUploadedFile(filePath);
      
      if (success) {
        // Rimuovi il file temporaneo dopo il ripristino
        try {
          fs.unlinkSync(filePath);
          console.log(`File temporaneo rimosso: ${filePath}`);
        } catch (unlinkError) {
          console.error("Errore durante la rimozione del file temporaneo:", unlinkError);
        }
        
        return res.json({
          success: true,
          message: "Database ripristinato con successo dal file caricato"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Si è verificato un errore durante il ripristino del database"
        });
      }
    } catch (error) {
      console.error("Errore durante il ripristino dal file caricato:", error);
      return res.status(500).json({
        success: false,
        message: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      });
    }
  });
  
  // Elimina un backup
  app.delete("/api/database/backups/:backupId", (req, res) => {
    try {
      const backupId = req.params.backupId;
      const result = deleteBackup(backupId);
      
      if (result) {
        res.json({ success: true, message: "Backup eliminato con successo" });
      } else {
        res.status(404).json({ success: false, message: "Backup non trovato" });
      }
    } catch (error) {
      console.error("Errore durante l'eliminazione del backup:", error);
      res.status(500).json({ success: false, message: "Errore durante l'eliminazione del backup" });
    }
  });
  
  // === Selection Module Routes ===
  
  // Ottieni tutte le selezioni
  app.get("/api/selections", getSelections);
  
  // Ottieni una singola selezione con tutti i dettagli correlati
  app.get("/api/selections/:id", getSelectionById);
  
  // Ottieni statistiche sulle selezioni
  app.get("/api/selections/statistics", getSelectionStats);
  
  // Ottieni posizioni disponibili in un FLUPSY
  app.get("/api/selections/available-positions/:flupsyId", getAvailablePositions);
  
  // Endpoint completamente nuovo per tutte le posizioni disponibili (evita problemi con il parametro ID)
  // Questo è l'unico endpoint che dovrebbe essere usato per ottenere tutte le posizioni disponibili
  app.get("/api/flupsy/available-positions", getAllAvailablePositions);
  
  // Crea una nuova selezione (fase 1)
  app.post("/api/selections", async (req, res) => {
    try {
      // Validazione dei dati di input mediante lo schema Zod
      const validatedData = insertSelectionSchema.parse(req.body);
      
      // Chiama il controller per la creazione
      await createSelection(req, res);
      
    } catch (error) {
      // Gestisci errori di validazione specifici
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: "Errore di validazione",
          errors: validationError.details
        });
      }
      
      // Altri errori
      console.error("Errore durante la creazione della selezione:", error);
      return res.status(500).json({
        success: false,
        message: `Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      });
    }
  });
  
  // Aggiungi ceste di origine alla selezione (fase 2)
  app.post("/api/selections/:id/source-baskets", addSourceBaskets);
  
  // Aggiungi ceste di destinazione e completa la selezione (fase 3)
  app.post("/api/selections/:id/destination-baskets", addDestinationBaskets);

  // Ottieni solo le ceste di origine di una selezione
  app.get("/api/selections/:id/source-baskets", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: "ID selezione non valido" });
      }
      
      // Recupera la selezione
      const selection = await db.select().from(selections)
        .where(eq(selections.id, Number(id)))
        .limit(1);
        
      if (!selection || selection.length === 0) {
        return res.status(404).json({ error: `Selezione con ID ${id} non trovata` });
      }
      
      const { baskets, sizes, flupsys } = await import("../shared/schema");
      
      // Ottieni prima i basic ID delle ceste di origine (per evitare duplicazioni di codice)
      const sourceBasketIds = await db.select({
        id: selectionSourceBaskets.id,
        basketId: selectionSourceBaskets.basketId,
        sizeId: selectionSourceBaskets.sizeId,
      })
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));
      
      // Ottieni tutti i dati pertinenti in un unico passaggio
      const enrichedSourceBaskets = await Promise.all(sourceBasketIds.map(async ({ id, basketId, sizeId }) => {
        // Dati del cestello di origine dalla tabella selectionSourceBaskets
        const [sourceData] = await db.select()
          .from(selectionSourceBaskets)
          .where(eq(selectionSourceBaskets.id, id));
          
        // Dati del cestello fisico
        const [basketData] = await db.select()
          .from(baskets)
          .where(eq(baskets.id, basketId));
          
        // Dati della taglia
        let size = null;
        if (sizeId) {
          const [sizeData] = await db.select()
            .from(sizes)
            .where(eq(sizes.id, sizeId));
          size = sizeData;
        }
        
        // Dati del FLUPSY
        let flupsy = null;
        if (basketData?.flupsyId) {
          const [flupsyData] = await db.select()
            .from(flupsys)
            .where(eq(flupsys.id, basketData.flupsyId));
          flupsy = flupsyData;
        }
        
        // Restituisci un oggetto completo con tutti i dati necessari
        return {
          ...sourceData,                   // Tutti i dati del cestello di origine
          basketId: basketId,              // ID del cestello
          physicalNumber: basketData?.physicalNumber,  // Numero fisico del cestello
          basket: basketData,              // Tutti i dati del cestello
          flupsy: flupsy,                  // Tutti i dati del FLUPSY
          size: size                       // Tutti i dati della taglia
        };
      }));
      
      return res.json(enrichedSourceBaskets);
    } catch (error) {
      console.error("Errore durante il recupero delle ceste di origine:", error);
      return res.status(500).json({ 
        error: `Errore durante il recupero delle ceste di origine: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Ottieni solo le ceste di destinazione di una selezione
  // Route per eliminare una cesta sorgente da una selezione
  app.delete("/api/selections/:id/source-baskets/:sourceBasketId", removeSourceBasket);
  
  app.get("/api/selections/:id/destination-baskets", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: "ID selezione non valido" });
      }
      
      const { baskets, sizes, flupsys } = await import("../shared/schema");
      
      // Ottieni prima i basic ID delle ceste di destinazione (per evitare duplicazioni di codice)
      const destBasketIds = await db.select({
        id: selectionDestinationBaskets.id,
        basketId: selectionDestinationBaskets.basketId,
        sizeId: selectionDestinationBaskets.sizeId,
        flupsyId: selectionDestinationBaskets.flupsyId
      })
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
      
      // Ottieni tutti i dati pertinenti in un unico passaggio
      const enrichedDestinationBaskets = await Promise.all(destBasketIds.map(async ({ id, basketId, sizeId, flupsyId }) => {
        // Dati del cestello di destinazione dalla tabella selectionDestinationBaskets
        const [destData] = await db.select()
          .from(selectionDestinationBaskets)
          .where(eq(selectionDestinationBaskets.id, id));
          
        // Dati del cestello fisico
        const [basketData] = await db.select()
          .from(baskets)
          .where(eq(baskets.id, basketId));
          
        // Dati della taglia
        let size = null;
        if (sizeId) {
          const [sizeData] = await db.select()
            .from(sizes)
            .where(eq(sizes.id, sizeId));
          size = sizeData;
        }
        
        // Dati del FLUPSY
        let flupsy = null;
        if (flupsyId) {
          const [flupsyData] = await db.select()
            .from(flupsys)
            .where(eq(flupsys.id, flupsyId));
          flupsy = flupsyData;
        }
        
        // Restituisci un oggetto completo con tutti i dati necessari
        return {
          ...destData,                    // Tutti i dati del cestello di destinazione
          basketId: basketId,             // ID del cestello
          physicalNumber: basketData?.physicalNumber,  // Numero fisico del cestello
          basket: basketData,             // Tutti i dati del cestello
          flupsy: flupsy,                 // Tutti i dati del FLUPSY
          size: size                      // Tutti i dati della taglia
        };
      }));
      
      return res.json(enrichedDestinationBaskets);
    } catch (error) {
      console.error("Errore durante il recupero delle ceste di destinazione:", error);
      return res.status(500).json({ 
        error: `Errore durante il recupero delle ceste di destinazione: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  // Route per eliminare una cesta di destinazione da una selezione
  app.delete("/api/selections/:id/destination-baskets/:destinationBasketId", removeDestinationBasket);
  
  // Route per completare definitivamente una selezione
  app.post("/api/selections/:id/complete", completeSelection);
  
  // Registra le route per cancellare e completare le selezioni
  implementSelectionRoutes(app, db);
  
  // === Route per operazioni di vagliatura ===
  app.post("/api/screening/prepare", ScreeningController.prepareScreeningOperation);
  app.post("/api/screening/execute", ScreeningController.executeScreeningOperation);
  
  // Configure WebSocket server
  const { 
    broadcastMessage, 
    broadcastOperationNotification, 
    broadcastPositionUpdate,
    broadcastCycleUpdate,
    NOTIFICATION_TYPES
  } = configureWebSocketServer(httpServer);

  // Set up global broadcast function for compatibility with existing code
  (global as any).broadcastUpdate = (type: string, data: any) => {
    broadcastMessage(type, data);
  };

  // === Route per invio email (WhatsApp rimosso) ===
  // Rotta WhatsApp rimossa: app.get("/api/whatsapp/diario")
  
  // API per email - Genera l'email con il diario di bordo
  app.get('/api/email/generate-diario', EmailController.generateEmailDiario);
  
  // API per email - Invia un'email con il diario di bordo
  app.post('/api/email/send-diario', EmailController.sendEmailDiario);
  
  // API per email - Genera e invia automaticamente il diario via email
  app.get('/api/email/auto-send-diario', EmailController.autoSendEmailDiario);
  
  // API per email - Ottiene la configurazione email corrente
  app.get('/api/email/config', EmailController.getEmailConfiguration);
  
  // API per email - Salva la configurazione email
  app.post('/api/email/config', EmailController.saveEmailConfiguration);
  
  // API per Telegram - Invia un messaggio Telegram con il diario di bordo
  app.post('/api/telegram/send-diario', TelegramController.sendTelegramDiario);
  
  // API per Telegram - Ottiene la configurazione Telegram corrente
  app.get('/api/telegram/config', TelegramController.getTelegramConfiguration);
  
  // API per Telegram - Salva la configurazione Telegram
  app.post('/api/telegram/config', TelegramController.saveTelegramConfiguration);
  
  // Rotta WhatsApp rimossa: app.post("/api/whatsapp/send")
  
  // Rotta WhatsApp rimossa: app.get("/api/whatsapp/auto-send-diario")
  
  // Rotta WhatsApp rimossa: app.get("/api/whatsapp/config")
  
  // Rotta WhatsApp rimossa: app.post("/api/whatsapp/config")
  
  // === Route per gestione notifiche ===
  app.get("/api/notifications", NotificationController.getNotifications);
  app.post("/api/notifications", NotificationController.createNotification);
  app.put("/api/notifications/:id/read", NotificationController.markNotificationAsRead);
  app.put("/api/notifications/read-all", NotificationController.markAllNotificationsAsRead);
  
  // === Route per gestione impostazioni notifiche ===
  // Ottieni tutte le impostazioni di notifica
  app.get("/api/notification-settings", async (req, res) => {
    try {
      await getNotificationSettings(req, res);
    } catch (error) {
      console.error("Errore durante il recupero delle impostazioni di notifica:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Errore durante il recupero delle impostazioni di notifica" 
      });
    }
  });
  
  // Aggiorna un'impostazione
  app.put("/api/notification-settings/:type", async (req, res) => {
    try {
      await updateNotificationSetting(req, res);
    } catch (error) {
      console.error(`Errore durante l'aggiornamento dell'impostazione "${req.params.type}":`, error);
      return res.status(500).json({ 
        success: false, 
        message: `Errore durante l'aggiornamento dell'impostazione "${req.params.type}"` 
      });
    }
  });
  
  // Esegui controllo manuale per cicli che hanno raggiunto TP-3000
  app.post("/api/check-growth-notifications", async (req, res) => {
    try {
      const notificationsCreated = await checkCyclesForTP3000();
      return res.json({ 
        success: true, 
        message: `Check completato, create ${notificationsCreated} notifiche` 
      });
    } catch (error) {
      console.error("Errore durante il controllo delle notifiche di crescita:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Errore durante il controllo delle notifiche di crescita" 
      });
    }
  });

  // ===== Inventory Transaction Routes =====
  // Registra una nuova transazione di inventario
  app.post('/api/lot-inventory/:lotId/transaction', LotInventoryController.createTransaction);
  
  // Ottiene la giacenza attuale di un lotto
  app.get('/api/lot-inventory/:lotId/current', LotInventoryController.getCurrentInventory);
  
  // Registra un calcolo di mortalità per un lotto
  app.post('/api/lot-inventory/:lotId/mortality-calculation', LotInventoryController.recordMortalityCalculation);
  
  // Ottiene la cronologia dei calcoli di mortalità per un lotto
  app.get('/api/lot-inventory/:lotId/mortality-history', LotInventoryController.getMortalityHistory);
  
  // Ottiene tutte le transazioni di inventario per un lotto
  app.get('/api/lot-inventory/:lotId/transactions', LotInventoryController.getLotTransactions);
  
  // === Eco-Impact Routes ===
  const ecoImpactController = new EcoImpactController();
  
  // API per categorie di impatto
  app.get("/api/eco-impact/categories", ecoImpactController.getImpactCategories.bind(ecoImpactController));
  app.post("/api/eco-impact/categories", ecoImpactController.createImpactCategory.bind(ecoImpactController));
  
  // API per fattori di impatto
  app.get("/api/eco-impact/factors", ecoImpactController.getImpactFactors.bind(ecoImpactController));
  app.post("/api/eco-impact/factors", ecoImpactController.createImpactFactor.bind(ecoImpactController));
  
  // API per impatto ambientale delle operazioni
  app.get("/api/eco-impact/operations/:operationId/impacts", ecoImpactController.getOperationImpacts.bind(ecoImpactController));
  app.post("/api/eco-impact/operations/:operationId/calculate", ecoImpactController.calculateOperationImpact.bind(ecoImpactController));
  
  // API per punteggio di sostenibilità FLUPSY
  app.get("/api/eco-impact/flupsys/:flupsyId/sustainability", ecoImpactController.calculateFlupsySustainability.bind(ecoImpactController));
  
  // API per obiettivi di sostenibilità
  app.get("/api/eco-impact/goals", ecoImpactController.getSustainabilityGoals.bind(ecoImpactController));
  app.post("/api/eco-impact/goals", ecoImpactController.createSustainabilityGoal.bind(ecoImpactController));
  
  // API per report di sostenibilità
  app.get("/api/eco-impact/reports", ecoImpactController.getSustainabilityReports.bind(ecoImpactController));
  app.post("/api/eco-impact/reports", ecoImpactController.createSustainabilityReport.bind(ecoImpactController));
  
  // API per valori di impatto predefiniti
  app.get("/api/eco-impact/defaults", ecoImpactController.getOperationImpactDefaults.bind(ecoImpactController));
  app.post("/api/eco-impact/defaults", ecoImpactController.createOrUpdateOperationImpactDefault.bind(ecoImpactController));
  app.delete("/api/eco-impact/defaults/:id", ecoImpactController.deleteOperationImpactDefault.bind(ecoImpactController));
  
  // API per gestione sequenze ID database
  app.get("/api/sequences", SequenceController.getSequencesInfo);
  app.post("/api/sequences/reset", SequenceController.resetSequence);
  
  return httpServer;
}
