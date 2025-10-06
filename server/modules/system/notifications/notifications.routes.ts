import { Router } from "express";
import { notificationsController } from "./notifications.controller";

const router = Router();

router.get("/notifications", (req, res) => notificationsController.getNotifications(req, res));
router.post("/notifications", (req, res) => notificationsController.createNotification(req, res));
router.put("/notifications/:id/read", (req, res) => notificationsController.markNotificationAsRead(req, res));
router.put("/notifications/read-all", (req, res) => notificationsController.markAllNotificationsAsRead(req, res));
router.get("/notification-settings", (req, res) => notificationsController.getSettings(req, res));
router.put("/notification-settings/:type", (req, res) => notificationsController.updateSettings(req, res));

export default router;
