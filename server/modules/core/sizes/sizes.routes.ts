import { Router } from "express";
import { sizesController } from "./sizes.controller";

const router = Router();

// GET routes
router.get("/", (req, res) => sizesController.getAll(req, res));
router.get("/:id", (req, res) => sizesController.getById(req, res));

// POST routes
router.post("/", (req, res) => sizesController.create(req, res));

// PATCH routes
router.patch("/:id", (req, res) => sizesController.update(req, res));

// DELETE routes
router.delete("/:id", (req, res) => sizesController.delete(req, res));

export default router;
