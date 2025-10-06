import { Express } from 'express';
import * as EmailController from '../../controllers/email-controller';
import * as TelegramController from '../../controllers/telegram-controller';

/**
 * Registra tutte le route del modulo INTEGRATIONS
 * Pattern: Riutilizzo controller esistenti per Email e Telegram
 */
export function registerIntegrationsRoutes(app: Express) {
  // ===== EMAIL INTEGRATION =====
  // Genera email diario operazioni
  app.get('/api/email/generate-diario', EmailController.generateEmailDiario);
  
  // Invia email diario
  app.post('/api/email/send-diario', EmailController.sendEmailDiario);
  
  // Auto-invio email diario (scheduler)
  app.get('/api/email/auto-send-diario', EmailController.autoSendEmailDiario);
  
  // Configurazione email
  app.get('/api/email/config', EmailController.getEmailConfiguration);
  app.post('/api/email/config', EmailController.saveEmailConfiguration);

  // ===== TELEGRAM INTEGRATION =====
  // Invia messaggio Telegram con diario
  app.post('/api/telegram/send-diario', TelegramController.sendTelegramDiario);
  
  // Configurazione Telegram
  app.get('/api/telegram/config', TelegramController.getTelegramConfiguration);
  app.post('/api/telegram/config', TelegramController.saveTelegramConfiguration);

  console.log('✅ Modulo INTEGRATIONS registrato su /api/email e /api/telegram');
}
