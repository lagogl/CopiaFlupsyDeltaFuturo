import { Router } from "express";
import { flupsyController } from "./flupsys.controller";

const router = Router();

router.get("/", (req, res) => flupsyController.getAll(req, res));
router.get("/:id", (req, res) => flupsyController.getById(req, res));
router.get("/:id/positions", (req, res) => flupsyController.getPositions(req, res));
router.get("/:id/baskets", (req, res) => flupsyController.getBaskets(req, res));
router.get("/:id/cycles", (req, res) => flupsyController.getCycles(req, res));

router.post("/", (req, res) => flupsyController.create(req, res));
router.post("/refresh-stats", (req, res) => flupsyController.refreshStats(req, res));
router.post("/:id/populate", (req, res) => flupsyController.populate(req, res));

router.patch("/:id", (req, res) => flupsyController.update(req, res));

router.delete("/:id", (req, res) => flupsyController.delete(req, res));

export default router;
