import { Router } from "express";
import { GrowthVariabilityService } from "./growth-variability.service";

const router = Router();

/**
 * POST /api/growth-variability/analyze
 * Esegue analisi completa variabilità crescita
 */
router.post("/analyze", async (req, res) => {
  try {
    const { dateFrom, dateTo, flupsyIds, analysisTypes } = req.body;
    
    const results = await GrowthVariabilityService.runComprehensiveAnalysis({
      dateFrom,
      dateTo,
      flupsyIds,
      analysisTypes
    });
    
    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error("Errore analisi variabilità:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/growth-variability/runs
 * Lista analisi eseguite
 */
router.get("/runs", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const runs = await GrowthVariabilityService.getAnalysisRuns(limit);
    
    res.json({
      success: true,
      runs
    });
  } catch (error) {
    console.error("Errore recupero runs:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/growth-variability/runs/:id
 * Dettaglio singola analisi
 */
router.get("/runs/:id", async (req, res) => {
  try {
    const runId = parseInt(req.params.id);
    
    const run = await GrowthVariabilityService.getAnalysisRunById(runId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Analisi non trovata"
      });
    }
    
    res.json({
      success: true,
      run
    });
  } catch (error) {
    console.error("Errore recupero run:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
