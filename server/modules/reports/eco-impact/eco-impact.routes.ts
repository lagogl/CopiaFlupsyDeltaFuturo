/**
 * Modulo per gestione impatto ambientale e sostenibilità
 * Gestisce metriche e report di sostenibilità per FLUPSY
 */
import { Router } from "express";
import { EcoImpactController } from "../../../controllers/eco-impact-controller";

export const ecoImpactRoutes = Router();
const ecoImpactController = new EcoImpactController();

// API per categorie di impatto
ecoImpactRoutes.get("/categories", ecoImpactController.getImpactCategories.bind(ecoImpactController));
ecoImpactRoutes.post("/categories", ecoImpactController.createImpactCategory.bind(ecoImpactController));

// API per fattori di impatto
ecoImpactRoutes.get("/factors", ecoImpactController.getImpactFactors.bind(ecoImpactController));
ecoImpactRoutes.post("/factors", ecoImpactController.createImpactFactor.bind(ecoImpactController));

// API per impatto ambientale delle operazioni
ecoImpactRoutes.get("/operations/:operationId/impacts", ecoImpactController.getOperationImpacts.bind(ecoImpactController));
ecoImpactRoutes.post("/operations/:operationId/calculate", ecoImpactController.calculateOperationImpact.bind(ecoImpactController));

// API per punteggio di sostenibilità FLUPSY
ecoImpactRoutes.get("/flupsys/:flupsyId/sustainability", ecoImpactController.calculateFlupsySustainability.bind(ecoImpactController));

// API per obiettivi di sostenibilità
ecoImpactRoutes.get("/goals", ecoImpactController.getSustainabilityGoals.bind(ecoImpactController));
ecoImpactRoutes.post("/goals", ecoImpactController.createSustainabilityGoal.bind(ecoImpactController));

// API per report di sostenibilità
ecoImpactRoutes.get("/reports", ecoImpactController.getSustainabilityReports.bind(ecoImpactController));
ecoImpactRoutes.post("/reports", ecoImpactController.createSustainabilityReport.bind(ecoImpactController));

// API per valori di impatto predefiniti
ecoImpactRoutes.get("/defaults", ecoImpactController.getOperationImpactDefaults.bind(ecoImpactController));
ecoImpactRoutes.post("/defaults", ecoImpactController.createOrUpdateOperationImpactDefault.bind(ecoImpactController));
ecoImpactRoutes.delete("/defaults/:id", ecoImpactController.deleteOperationImpactDefault.bind(ecoImpactController));