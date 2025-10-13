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
  
  // Test email Gmail
  app.post('/api/email/test', async (req, res) => {
    try {
      const { sendGmailEmail, getEmailRecipients } = await import('../../services/gmail-service');
      const recipients = await getEmailRecipients();
      
      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nessun destinatario configurato'
        });
      }
      
      await sendGmailEmail({
        to: recipients,
        subject: '🧪 Test Email Sistema FLUPSY',
        html: `
          <h2>Test Email</h2>
          <p>Questa è un'email di test inviata dal Sistema FLUPSY.</p>
          <p>Data/ora: ${new Date().toLocaleString('it-IT')}</p>
          <p>Se ricevi questo messaggio, l'integrazione Gmail funziona correttamente! ✅</p>
        `
      });
      
      res.json({
        success: true,
        message: 'Email di test inviata correttamente',
        recipients: recipients.length
      });
    } catch (error: any) {
      console.error('❌ Errore test email:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Errore sconosciuto',
        details: error.stack
      });
    }
  });

  // ===== TELEGRAM INTEGRATION =====
  // Invia messaggio Telegram con diario
  app.post('/api/telegram/send-diario', TelegramController.sendTelegramDiario);
  
  // Configurazione Telegram
  app.get('/api/telegram/config', TelegramController.getTelegramConfiguration);
  app.post('/api/telegram/config', TelegramController.saveTelegramConfiguration);

  console.log('✅ Modulo INTEGRATIONS registrato su /api/email e /api/telegram');
}
