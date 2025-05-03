/**
 * Router per le API esterne
 * 
 * Questo file gestisce tutte le rotte API dedicate a integrazioni con applicazioni esterne,
 * mantenendo la logica separata dal resto dell'applicazione per facilità di manutenzione.
 */

import express, { Router } from "express";
import * as ExternalSalesController from "./controllers/external-sales-controller";

// Crea un router dedicato
const externalApiRouter = Router();

// Middleware per verificare l'API key su tutte le rotte
externalApiRouter.use(ExternalSalesController.verifyApiKey);

// === Rotte per le operazioni di vendita esterne ===

// Ottieni cestelli disponibili per la vendita
externalApiRouter.get("/sales/available-baskets", ExternalSalesController.getAvailableBasketsForSale);

// Crea un'operazione di vendita
externalApiRouter.post("/sales/create", ExternalSalesController.createExternalSaleOperation);

// Ottieni storico delle vendite esterne
externalApiRouter.get("/sales/history", ExternalSalesController.getExternalSaleHistory);

// Ottieni dettagli di un lotto specifico
externalApiRouter.get("/lots/:id", ExternalSalesController.getLotDetail);

/**
 * Registra le rotte API esterne nell'app Express principale
 * @param app - App Express principale
 */
export function registerExternalApiRoutes(app: express.Express) {
  // Monta il router sotto il percorso /api/external
  app.use("/api/external", externalApiRouter);
  
  console.log("API esterne registrate sotto il percorso /api/external");
  
  // Una rotta semplice per verificare lo stato dell'API
  app.get("/api/external/status", (req, res) => {
    res.json({
      status: "online",
      message: "API esterne disponibili",
      timestamp: new Date().toISOString(),
    });
  });
}