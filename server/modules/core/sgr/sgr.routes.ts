import { Router } from "express";
import { sgrController } from "./sgr.controller";

const router = Router();

// ========== SGR Mensili (Monthly) Routes ==========
router.get("/sgr", (req, res) => sgrController.getAllSgr(req, res));
router.get("/sgr/:id", (req, res) => sgrController.getSgrById(req, res));
router.post("/sgr", (req, res) => sgrController.createSgr(req, res));
router.patch("/sgr/:id", (req, res) => sgrController.updateSgr(req, res));

// ========== SGR Giornalieri (Daily) Routes ==========
// IMPORTANT: Specific routes MUST come before parameterized routes
router.get("/sgr-giornalieri/date-range", (req, res) => sgrController.getSgrGiornalieriByDateRange(req, res));
router.get("/sgr-giornalieri/by-id/:id", (req, res) => sgrController.getSgrGiornalieroById(req, res));
router.get("/sgr-giornalieri", (req, res) => sgrController.getAllSgrGiornalieri(req, res));
router.post("/sgr-giornalieri", (req, res) => sgrController.createSgrGiornaliero(req, res));
router.patch("/sgr-giornalieri/:id", (req, res) => sgrController.updateSgrGiornaliero(req, res));
router.delete("/sgr-giornalieri/:id", (req, res) => sgrController.deleteSgrGiornaliero(req, res));

// ========== SGR Per Taglia (Calculated SGR) Routes ==========
router.get("/sgr-per-taglia", (req, res) => sgrController.getAllSgrPerTaglia(req, res));
router.post("/sgr-per-taglia/calculate", (req, res) => sgrController.triggerSgrCalculation(req, res));

// Alias route for recalculation (for backward compatibility)
router.post("/sgr-calculation/recalculate", (req, res) => sgrController.triggerSgrCalculation(req, res));

export default router;
