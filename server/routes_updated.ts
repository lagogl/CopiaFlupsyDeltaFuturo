import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from 'path';
import fs from 'fs';
import { db } from "./db";
import { eq, and, isNull, sql, count, inArray } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subDays } from "date-fns";
import { 
  selections, 
  selectionSourceBaskets,
  selectionDestinationBaskets,
  insertUserSchema,
  cycles,
  sizes
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
import { diarioController } from "./controllers/index";
import * as LotInventoryController from "./controllers/lot-inventory-controller";
import { EcoImpactController } from "./controllers/eco-impact-controller";
import * as SequenceController from "./controllers/sequence-controller";

// Il resto delle importazioni rimane invariato...

export async function registerRoutes(app: Express): Promise<Server> {
  // Il resto del codice fino all'endpoint cycles rimane invariato...

  // === Cycle routes ===
  app.get("/api/cycles", async (req, res) => {
    try {
      const cycles = await storage.getCycles();
      
      // Fetch baskets and latest operation for each cycle
      const cyclesWithDetails = await Promise.all(
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
          
          // Get the SGR from the latest operation or use current month default
          let currentSgr = null;
          if (latestOperation && latestOperation.sgrId) {
            currentSgr = await storage.getSgr(latestOperation.sgrId);
          } else if (cycle.state === 'active') {
            // Se il ciclo è attivo ma non ha SGR associato, usa l'SGR predefinito per il mese corrente
            const today = new Date();
            const currentMonth = today.getMonth(); // 0-based (0 = Gennaio, 11 = Dicembre)
            
            // Converti l'indice del mese in nome italiano
            const monthNames = [
              'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
            ];
            
            const currentMonthName = monthNames[currentMonth];
            
            // Prendi l'SGR per il mese corrente
            const sgrs = await storage.getSgrs();
            currentSgr = sgrs.find(s => s.month.toLowerCase() === currentMonthName.toLowerCase());
            
            console.log(`Ciclo ${cycle.id} senza SGR associato. Usato SGR predefinito per ${currentMonthName}: ${currentSgr?.percentage || 'non trovato'}`);
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
      
      res.json(cyclesWithDetails);
    } catch (error) {
      console.error("Error fetching cycles:", error);
      res.status(500).json({ message: "Failed to fetch cycles" });
    }
  });

  // Questo endpoint rimane invariato
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

  // Modificare qui anche l'endpoint active-with-details nello stesso modo se necessario...

  // Il resto del file rimane invariato...
  return createServer(app); // Placeholder per il resto del codice
}