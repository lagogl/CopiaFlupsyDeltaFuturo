import type { Request, Response } from "express";
import * as NotificationController from "../../../controllers/notification-controller";
import { storage } from "../../../storage";

export class NotificationsController {
  getNotifications = NotificationController.getNotifications;
  createNotification = NotificationController.createNotification;
  markNotificationAsRead = NotificationController.markNotificationAsRead;
  markAllNotificationsAsRead = NotificationController.markAllNotificationsAsRead;

  async getSettings(req: Request, res: Response) {
    try {
      const settings = await storage.getNotificationSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ success: false, message: "Errore durante il recupero delle impostazioni notifiche" });
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { enabled, emailEnabled, pushEnabled } = req.body;
      
      const updatedSettings = await storage.updateNotificationSettings(type, {
        enabled,
        emailEnabled,
        pushEnabled
      });
      
      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ success: false, message: "Errore durante l'aggiornamento delle impostazioni" });
    }
  }
}

export const notificationsController = new NotificationsController();
