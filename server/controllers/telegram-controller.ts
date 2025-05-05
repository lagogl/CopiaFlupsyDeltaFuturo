import TelegramBot from 'node-telegram-bot-api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Request, Response } from 'express';
import { db } from '../db';
import { emailConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Inizializza il bot Telegram se c'è un token disponibile
 */
function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log('Token Telegram non configurato. Bot non inizializzato.');
    return null;
  }
  
  try {
    // Crea il bot con l'opzione polling: false per evitare di ricevere messaggi
    // Useremo il bot solo per inviare messaggi, non per riceverli
    const bot = new TelegramBot(token, { polling: false });
    console.log('Bot Telegram inizializzato con successo');
    return bot;
  } catch (error) {
    console.error('Errore nell\'inizializzazione del bot Telegram:', error);
    return null;
  }
}

// Inizializza il bot all'avvio
const telegramBot = initTelegramBot();

/**
 * Ottiene le configurazioni di Telegram dal database
 */
async function getTelegramConfig() {
  try {
    const configRows = await db.select().from(emailConfig);
    
    if (configRows.length > 0) {
      // Recupera i valori specifici dalla configurazione
      const getConfigValue = (key: string, defaultValue: string = '') => {
        const row = configRows.find(row => row.key === key);
        return row ? row.value : defaultValue;
      };
      
      return {
        // Telegram config
        telegram_chat_ids: getConfigValue('telegram_chat_ids', ''),
        telegram_send_time: getConfigValue('telegram_send_time', '20:00'),
        auto_telegram_enabled: getConfigValue('auto_telegram_enabled', 'false')
      };
    } else {
      // Configurazione predefinita se non esiste
      return {
        telegram_chat_ids: '',
        telegram_send_time: '20:00',
        auto_telegram_enabled: 'false'
      };
    }
  } catch (error) {
    console.error("Errore nel recupero della configurazione Telegram:", error);
    throw error;
  }
}

/**
 * Salva la configurazione di Telegram nel database
 */
async function saveTelegramConfig(config: {
  chat_ids?: string;
  send_time?: string;
  auto_enabled?: boolean;
}) {
  try {
    const updates = [];
    
    if (config.chat_ids !== undefined) {
      updates.push(
        db
          .update(emailConfig)
          .set({ value: config.chat_ids, updatedAt: new Date() })
          .where(eq(emailConfig.key, 'telegram_chat_ids'))
      );
    }
    
    if (config.send_time !== undefined) {
      updates.push(
        db
          .update(emailConfig)
          .set({ value: config.send_time, updatedAt: new Date() })
          .where(eq(emailConfig.key, 'telegram_send_time'))
      );
    }
    
    if (config.auto_enabled !== undefined) {
      updates.push(
        db
          .update(emailConfig)
          .set({ 
            value: config.auto_enabled.toString(), 
            updatedAt: new Date() 
          })
          .where(eq(emailConfig.key, 'auto_telegram_enabled'))
      );
    }
    
    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error("Errore nel salvataggio della configurazione Telegram:", error);
    throw error;
  }
}

/**
 * Formatta il messaggio per Telegram
 * Utilizza il markdown di Telegram per il formatting
 */
function formatTelegramMessage(data: any, date: Date): string {
  try {
    console.log('Inizio formattazione messaggio Telegram con data:', date);
    const dateFormatted = format(date, 'dd/MM/yyyy', { locale: it });
    console.log('Data formattata:', dateFormatted);
    
    // Inizia con il titolo
    let text = `*DIARIO DI BORDO - ${dateFormatted}*\n\n`;
    
    // Giacenza alla data corrente
    if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
      text += `*GIACENZA AL ${dateFormatted}*\n`;
      text += `Totale: *${data.giacenza.totale_giacenza.toLocaleString('it-IT')}* animali\n\n`;
      
      // Dettaglio giacenza per taglia
      if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
        text += `*Dettaglio per taglia:*\n`;
        data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
          const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
          text += `- ${tagliaMostrata}: *${taglia.quantita.toLocaleString('it-IT')}*\n`;
        });
        text += '\n';
      }
    }
    
    // Bilancio giornata
    text += `*BILANCIO GIORNALIERO*\n`;
    text += `Entrate: *${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'}* animali\n`;
    text += `Uscite: *${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'}* animali\n`;
    text += `Bilancio netto: *${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'}* animali\n`;
    text += `Totale operazioni: *${data.totals.numero_operazioni}*\n\n`;

    // Bilancio finale
    if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
      const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
      text += `Giacenza + Bilancio netto: *${bilancioFinale.toLocaleString('it-IT')}* animali\n\n`;
    }

    // Se ci sono statistiche per taglia, aggiungiamole
    if (data.sizeStats && data.sizeStats.length > 0) {
      text += `*STATISTICHE PER TAGLIA*\n`;
      data.sizeStats.forEach((stat: any) => {
        const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
        text += `- ${tagliaMostrata}: Entrate: *${stat.entrate || 0}*, Uscite: *${stat.uscite || 0}*\n`;
      });
      text += '\n';
    }

    // Aggiunta di informazioni sulle operazioni (limitate per evitare messaggi troppo lunghi)
    if (data.operations && data.operations.length > 0) {
      const maxOps = Math.min(data.operations.length, 5); // Limita a 5 operazioni per evitare messaggi troppo lunghi
      text += `*OPERAZIONI DEL GIORNO* (${data.operations.length}, mostrando le prime ${maxOps})\n`;
      
      for (let i = 0; i < maxOps; i++) {
        const op = data.operations[i];
        let tipo = 'Operazione';
        try {
          tipo = op.type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        } catch (e) {
          console.error('Errore nella formattazione del tipo operazione:', e);
        }
        
        const cestello = op.basket_number ? `#${op.basket_number}` : '';
        const flupsy = op.flupsy_name ? `in ${op.flupsy_name}` : '';
        const taglia = op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code;
        
        text += `${i + 1}. ${tipo} ${cestello} ${flupsy} - *${op.animal_count || 0}* animali (${taglia || 'Senza taglia'})\n`;
      }
      
      if (data.operations.length > maxOps) {
        text += `_... e altre ${data.operations.length - maxOps} operazioni_\n`;
      }
    }
    
    // Evita caratteri che potrebbero causare problemi con Markdown
    text = text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

    console.log('Messaggio formattato completato. Lunghezza:', text.length);
    return text;
  } catch (error) {
    console.error('Errore nella formattazione del messaggio Telegram:', error);
    return `*ERRORE DI FORMATTAZIONE*\nSi è verificato un errore nella formattazione del messaggio. Controllare i log del server.`;
  }
}

/**
 * Invia il messaggio a tutte le chat configurate
 */
async function sendTelegramMessage(message: string, chatIds: string[]): Promise<boolean> {
  if (!telegramBot) {
    console.error('Bot Telegram non inizializzato. Impossibile inviare messaggio.');
    return false;
  }

  if (!chatIds || chatIds.length === 0) {
    console.error('Nessun ID chat configurato per Telegram.');
    return false;
  }

  try {
    console.log('Tentativo di invio messaggio Telegram con i seguenti parametri:');
    console.log('- Chat IDs:', chatIds);
    console.log('- Lunghezza messaggio:', message.length, 'caratteri');
    console.log('- Primi 100 caratteri del messaggio:', message.substring(0, 100));
    
    // Invia il messaggio a tutti i chat ID configurati
    for (const chatId of chatIds) {
      try {
        console.log(`Invio messaggio a chat ID: ${chatId}`);
        await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`Messaggio inviato con successo a ${chatId}`);
      } catch (chatError) {
        console.error(`Errore nell'invio a chat ID ${chatId}:`, chatError);
        // Continua con gli altri chat ID anche se questo fallisce
      }
    }
    
    console.log(`Processo di invio Telegram completato per ${chatIds.length} chat`);
    return true;
  } catch (error) {
    console.error('Errore nell\'invio del messaggio Telegram:', error);
    return false;
  }
}

/**
 * Handler per l'invio manuale di un messaggio Telegram
 */
export async function sendTelegramDiario(req: Request, res: Response) {
  try {
    const { data, date } = req.body;
    
    console.log('Richiesta di invio Telegram ricevuta:', {
      dataPresente: !!data,
      dataType: data ? typeof data : 'undefined',
      datePresente: !!date,
      dateValue: date
    });
    
    if (!data || !date) {
      return res.status(400).json({
        success: false,
        error: 'Dati o data mancanti nella richiesta'
      });
    }
    
    // Verifica che il bot sia inizializzato
    if (!telegramBot) {
      console.error('Bot Telegram non inizializzato. Token presente:', !!process.env.TELEGRAM_BOT_TOKEN);
      return res.status(500).json({
        success: false,
        error: 'Bot Telegram non inizializzato. Verifica la configurazione del token.'
      });
    }
    
    // Recupera i chat ID configurati
    const config = await getTelegramConfig();
    console.log('Configurazione Telegram recuperata:', config);
    const chatIds = (config.telegram_chat_ids || '').split(',').map(id => id.trim()).filter(id => id);
    
    if (chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nessun ID chat configurato per Telegram.'
      });
    }
    
    // Formatta e invia il messaggio
    console.log('Formattazione messaggio Telegram con data:', new Date(date));
    const message = formatTelegramMessage(data, new Date(date));
    console.log('Messaggio formattato, inizio invio...');
    
    const success = await sendTelegramMessage(message, chatIds);
    
    if (success) {
      console.log('Invio Telegram completato con successo');
      return res.status(200).json({
        success: true,
        message: `Messaggio Telegram inviato con successo a ${chatIds.length} chat`
      });
    } else {
      console.error('Invio Telegram fallito');
      return res.status(500).json({
        success: false,
        error: 'Errore nell\'invio del messaggio Telegram'
      });
    }
  } catch (error) {
    console.error('Errore nella gestione della richiesta di invio Telegram:', error);
    return res.status(500).json({
      success: false,
      error: `Errore: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Salva la configurazione Telegram
 */
export async function saveTelegramConfiguration(req: Request, res: Response) {
  try {
    const { chat_ids, send_time, auto_enabled } = req.body;
    
    // Aggiorna il database
    await saveTelegramConfig({
      chat_ids,
      send_time,
      auto_enabled
    });
    
    return res.status(200).json({
      success: true,
      message: 'Configurazione Telegram salvata con successo'
    });
  } catch (error) {
    console.error('Errore nel salvataggio della configurazione Telegram:', error);
    return res.status(500).json({
      success: false,
      error: `Errore: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Recupera la configurazione Telegram corrente
 */
export async function getTelegramConfiguration(req: Request, res: Response) {
  try {
    const config = await getTelegramConfig();
    
    return res.status(200).json({
      success: true,
      config: {
        chat_ids: config.telegram_chat_ids,
        send_time: config.telegram_send_time,
        auto_enabled: config.auto_telegram_enabled === 'true'
      }
    });
  } catch (error) {
    console.error("Errore nel recupero della configurazione Telegram:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nel recupero: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Genera e invia automaticamente il diario via Telegram per la data specificata
 */
export async function autoSendTelegramDiario(diarioData: any, date: Date): Promise<boolean> {
  try {
    // Verifica che il bot sia inizializzato
    if (!telegramBot) {
      console.error('Bot Telegram non inizializzato. Impossibile inviare messaggio automatico.');
      return false;
    }
    
    // Recupera i chat ID configurati
    const config = await getTelegramConfig();
    
    // Verifica se l'invio automatico è abilitato
    if (config.auto_telegram_enabled !== 'true') {
      console.log('Invio automatico Telegram non abilitato.');
      return false;
    }
    
    const chatIds = (config.telegram_chat_ids || '').split(',').map(id => id.trim()).filter(id => id);
    
    if (chatIds.length === 0) {
      console.error('Nessun ID chat configurato per Telegram.');
      return false;
    }
    
    // Formatta e invia il messaggio
    const message = formatTelegramMessage(diarioData, date);
    return await sendTelegramMessage(message, chatIds);
    
  } catch (error) {
    console.error('Errore nell\'invio automatico del messaggio Telegram:', error);
    return false;
  }
}