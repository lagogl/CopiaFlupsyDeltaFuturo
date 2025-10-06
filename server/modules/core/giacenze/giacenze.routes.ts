import { Router } from "express";
import { giacenzeController } from "./giacenze.controller";

const router = Router();

router.get("/giacenze/range", (req, res) => giacenzeController.getRange(req, res));
router.get("/giacenze/summary", (req, res) => giacenzeController.getSummary(req, res));

export default router;
