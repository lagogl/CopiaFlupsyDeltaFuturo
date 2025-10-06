import { storage } from "../../../storage";

export class NotificationsService {
  async getNotifications(options: any) {
    return await storage.getNotifications(options);
  }

  async createNotification(data: any) {
    return await storage.createNotification(data);
  }

  async markAsRead(id: number) {
    return await storage.markNotificationAsRead(id);
  }

  async markAllAsRead() {
    return await storage.markAllNotificationsAsRead();
  }

  async getSettings(type?: string) {
    if (type) {
      return await storage.getNotificationSetting(type);
    }
    return await storage.getNotificationSettings();
  }

  async updateSettings(type: string, settings: any) {
    return await storage.updateNotificationSettings(type, settings);
  }
}

export const notificationsService = new NotificationsService();
