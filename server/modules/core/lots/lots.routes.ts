import { Router } from "express";
import { lotsController } from "./lots.controller";

const router = Router();

// GET routes
router.get("/", (req, res) => lotsController.getAll(req, res));
router.get("/optimized", (req, res) => lotsController.getOptimized(req, res));
router.get("/active", (req, res) => lotsController.getActive(req, res));
router.get("/timeline", (req, res) => lotsController.getTimeline(req, res));
router.get("/:id", (req, res) => lotsController.getById(req, res));
router.get("/:id/stats", (req, res) => lotsController.getStats(req, res));

// POST routes
router.post("/", (req, res) => lotsController.create(req, res));
router.post("/refresh-cache", (req, res) => lotsController.refreshCache(req, res));

// PATCH routes
router.patch("/:id", (req, res) => lotsController.update(req, res));

// DELETE routes
router.delete("/:id", (req, res) => lotsController.delete(req, res));

export default router;
