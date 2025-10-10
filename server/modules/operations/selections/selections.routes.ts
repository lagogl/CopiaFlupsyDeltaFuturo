import { Router } from "express";
import { selectionsController } from "./selections.controller";

const router = Router();

// ========== GET Routes ==========
router.get("/selections", (req, res) => selectionsController.getAll(req, res));
router.get("/selections/statistics", (req, res) => selectionsController.getStats(req, res));
router.get("/selections/available-positions/:flupsyId", (req, res) => selectionsController.getAvailablePositions(req, res));
router.get("/selections/:id", (req, res) => selectionsController.getById(req, res));
router.get("/selections/:id/report.pdf", (req, res) => selectionsController.generatePDFReport(req, res));
router.get("/selections/:id/source-baskets", (req, res) => selectionsController.getSourceBaskets(req, res));
router.get("/selections/:id/destination-baskets", (req, res) => selectionsController.getDestinationBaskets(req, res));

// Special endpoint for all available positions
router.get("/flupsy/available-positions", (req, res) => selectionsController.getAllAvailablePositions(req, res));

// ========== POST Routes ==========
router.post("/selections", (req, res) => selectionsController.create(req, res));
router.post("/selections/:id/source-baskets", (req, res) => selectionsController.addSourceBaskets(req, res));
router.post("/selections/:id/destination-baskets", (req, res) => selectionsController.addDestinationBaskets(req, res));
router.post("/selections/:id/complete", (req, res) => selectionsController.complete(req, res));
router.post("/selections/migrate-basket-lot-data", (req, res) => selectionsController.migrateData(req, res));

// ========== DELETE Routes ==========
router.delete("/selections/:id/source-baskets/:sourceBasketId", (req, res) => selectionsController.removeSourceBasket(req, res));
router.delete("/selections/:id/destination-baskets/:destinationBasketId", (req, res) => selectionsController.removeDestinationBasket(req, res));

export default router;
