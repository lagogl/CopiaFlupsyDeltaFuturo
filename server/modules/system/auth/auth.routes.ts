import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// POST routes
router.post("/login", (req, res) => authController.login(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));
router.post("/register", (req, res) => authController.register(req, res));

// GET routes
router.get("/users/current", (req, res) => authController.getCurrentUser(req, res));

export default router;
