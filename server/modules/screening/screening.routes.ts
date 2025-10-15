import { Express } from 'express';
import { screeningController } from './screening.controller';

/**
 * Registra tutte le route del modulo SCREENING
 * Pattern: Domain-Driven Design con separazione controller/service
 */
export function registerScreeningRoutes(app: Express) {
  // ===== SCREENINGS LIST & DETAIL =====
  // Lista screenings con paginazione
  app.get("/api/screenings", screeningController.getScreenings.bind(screeningController));
  
  // Dettaglio completo screening
  app.get("/api/screenings/:id", screeningController.getScreeningById.bind(screeningController));

  // ===== SCREENING OPERATIONS =====
  // Lista operazioni di screening
  app.get("/api/screening/operations", screeningController.getScreeningOperations.bind(screeningController));
  
  // Dettaglio singola operazione
  app.get("/api/screening/operations/:id", screeningController.getScreeningOperationById.bind(screeningController));
  
  // Prossimo numero di vagliatura
  app.get("/api/screening/next-number", screeningController.getNextScreeningNumber.bind(screeningController));
  
  // Crea operazione di screening
  app.post("/api/screening/operations", screeningController.createScreeningOperation.bind(screeningController));
  
  // Aggiorna operazione di screening
  app.patch("/api/screening/operations/:id", screeningController.updateScreeningOperation.bind(screeningController));
  
  // Completa operazione di screening
  app.post("/api/screening/operations/:id/complete", screeningController.completeScreeningOperation.bind(screeningController));
  
  // Annulla operazione di screening
  app.post("/api/screening/operations/:id/cancel", screeningController.cancelScreeningOperation.bind(screeningController));

  // ===== SOURCE BASKETS =====
  // Lista source baskets per screening
  app.get("/api/screening/source-baskets/:screeningId", screeningController.getSourceBaskets.bind(screeningController));
  
  // Crea source basket
  app.post("/api/screening/source-baskets", screeningController.createSourceBasket.bind(screeningController));
  
  // Aggiorna source basket
  app.patch("/api/screening/source-baskets/:id", screeningController.updateSourceBasket.bind(screeningController));
  
  // Dismiss source basket
  app.post("/api/screening/source-baskets/:id/dismiss", screeningController.dismissSourceBasket.bind(screeningController));
  
  // Elimina source basket
  app.delete("/api/screening/source-baskets/:id", screeningController.deleteSourceBasket.bind(screeningController));

  // ===== DESTINATION BASKETS =====
  // Lista destination baskets per screening
  app.get("/api/screening/destination-baskets/:screeningId", screeningController.getDestinationBaskets.bind(screeningController));
  
  // Crea destination basket
  app.post("/api/screening/destination-baskets", screeningController.createDestinationBasket.bind(screeningController));
  
  // Aggiorna destination basket
  app.patch("/api/screening/destination-baskets/:id", screeningController.updateDestinationBasket.bind(screeningController));
  
  // Assegna posizione a destination basket
  app.post("/api/screening/destination-baskets/:id/assign-position", screeningController.assignPosition.bind(screeningController));
  
  // Elimina destination basket
  app.delete("/api/screening/destination-baskets/:id", screeningController.deleteDestinationBasket.bind(screeningController));

  // ===== HISTORY & LOT REFERENCES =====
  // Crea storico
  app.post("/api/screening/history", screeningController.createHistory.bind(screeningController));
  
  // Crea riferimento lotto
  app.post("/api/screening/lot-references", screeningController.createLotReference.bind(screeningController));

  console.log('✅ Modulo SCREENING registrato su /api/screening* e /api/screenings');
}
