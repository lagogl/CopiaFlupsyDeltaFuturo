import { Router } from "express";
import { mortalityRatesController } from "./mortality-rates.controller";

const router = Router();

router.get("/mortality-rates/by-month-and-size", (req, res) => mortalityRatesController.getByMonthAndSize(req, res));
router.get("/mortality-rates/by-month/:month", (req, res) => mortalityRatesController.getByMonth(req, res));
router.get("/mortality-rates/by-size/:sizeId", (req, res) => mortalityRatesController.getBySize(req, res));
router.get("/mortality-rates/:id", (req, res) => mortalityRatesController.getById(req, res));
router.get("/mortality-rates", (req, res) => mortalityRatesController.getAll(req, res));
router.post("/mortality-rates", (req, res) => mortalityRatesController.create(req, res));
router.patch("/mortality-rates/:id", (req, res) => mortalityRatesController.update(req, res));

export default router;
