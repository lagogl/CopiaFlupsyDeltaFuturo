import type { Request, Response } from "express";
import * as NotificationController from "../../../controllers/notification-controller";
import { getNotificationSettings, updateNotificationSetting } from "../../../controllers/notification-settings-controller";
import { checkCyclesForTP3000 } from "../../../controllers/growth-notification-handler";

export class NotificationsController {
  getNotifications = NotificationController.getNotifications;
  createNotification = NotificationController.createNotification;
  markNotificationAsRead = NotificationController.markNotificationAsRead;
  markAllNotificationsAsRead = NotificationController.markAllNotificationsAsRead;

  async getSettings(req: Request, res: Response) {
    return await getNotificationSettings(req, res);
  }

  async updateSettings(req: Request, res: Response) {
    return await updateNotificationSetting(req, res);
  }

  async testGrowthNotifications(req: Request, res: Response) {
    try {
      console.log("🧪 Test notifiche di crescita avviato manualmente");
      const notificationsCreated = await checkCyclesForTP3000();
      
      return res.status(200).json({
        success: true,
        message: `Test completato. ${notificationsCreated} notifiche create.`,
        notificationsCreated
      });
    } catch (error) {
      console.error("Errore durante il test delle notifiche di crescita:", error);
      return res.status(500).json({
        success: false,
        error: "Errore durante il test delle notifiche di crescita"
      });
    }
  }
}

export const notificationsController = new NotificationsController();
