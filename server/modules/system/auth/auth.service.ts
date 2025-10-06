import { storage } from "../../../storage";

export class AuthService {
  /**
   * Validate user credentials
   */
  async validateUser(username: string, password: string) {
    return await storage.validateUser(username, password);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string) {
    return await storage.getUserByUsername(username);
  }

  /**
   * Create new user
   */
  async createUser(userData: any) {
    return await storage.createUser(userData);
  }

  /**
   * Sanitize user data for response (remove password)
   */
  sanitizeUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      language: user.language,
      lastLogin: user.lastLogin
    };
  }
}

export const authService = new AuthService();
