import type { Request, Response } from "express";
import * as NotificationController from "../../../controllers/notification-controller";
import { getNotificationSettings, updateNotificationSetting } from "../../../controllers/notification-settings-controller";

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
}

export const notificationsController = new NotificationsController();
